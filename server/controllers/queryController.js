const db = require('../db/connection');
const optimizer = require('../services/optimizerService');
const MySQLTranslator = require('../services/mysqlTranslator');

const STATEMENT_TIMEOUT_MS = 8000;

function buildPipelinePayload(rawQuery, translated) {
    let safeAst = translated.ast || null;
    if (safeAst) {
        try {
            if (JSON.stringify(safeAst).length > 32768) {
                safeAst = {
                    truncated: true,
                    statementTypes: translated.statementTypes || [],
                    note: 'AST exceeds 32KB preview limit.'
                };
            }
        } catch (_) {
            safeAst = null;
        }
    }

    return {
        rawQuery: rawQuery.trim(),
        translatedQuery: translated.pgQuery,
        ast: safeAst,
        astMode: translated.astMode || (translated.isMeta ? 'meta' : 'regex-fallback'),
        parseError: translated.parseError || null,
        statementTypes: translated.statementTypes || [],
        tables: translated.tables || [],
        dialectTransforms: translated.dialectTransforms || [],
    };
}

function assertSafeSchemaName(name) {
    if (typeof name !== 'string' || !/^user_\d+(?:_[a-z0-9_]+)?$/i.test(name)) {
        throw new Error('Invalid sandbox schema identifier.');
    }
    return name.toLowerCase();
}

async function recordQueryHistory(executor, { userId, query, executionTime, metrics }) {
    try {
        await executor.query(
            `INSERT INTO public.query_history (
                user_id,
                query_text,
                execution_time,
                planning_time_ms,
                execution_time_ms,
                shared_hit_blocks,
                shared_read_blocks,
                used_index,
                seq_scan_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                userId,
                query,
                executionTime,
                metrics?.planningTimeMs ?? null,
                metrics?.executionTimeMs ?? null,
                metrics?.sharedHitBlocks ?? 0,
                metrics?.sharedReadBlocks ?? 0,
                metrics?.usedIndex ?? false,
                metrics?.seqScanCount ?? 0,
            ]
        );
    } catch (_) {
        // Fallback if telemetry columns are unavailable
        try {
            await executor.query(
                'INSERT INTO public.query_history (user_id, query_text, execution_time) VALUES ($1, $2, $3)',
                [userId, query, executionTime]
            );
        } catch (_) { }
    }
}

exports.runQuery = async (req, res) => {
    const { query } = req.body;
    const { schemaName, id: userId } = req.user;

    if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Query is required' });
    }

    let safeSchema;
    try {
        safeSchema = assertSafeSchemaName(schemaName);
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    await db.ensureTelemetrySchema();

    const translator = new MySQLTranslator(safeSchema);
    const client = await db.pool.connect();
    let inTransaction = false;

    try {
        // 1. Translate MySQL → PostgreSQL
        const translated = translator.translate(query);
        const pipeline = buildPipelinePayload(query, translated);

        // 2. Run RULE-BASED analysis on raw MySQL
        const querySuggestions = optimizer.analyzeQuery(query);

        // Enforce execution timeout to prevent long-running queries from starving the shared pool
        await client.query(`SET statement_timeout = ${STATEMENT_TIMEOUT_MS}`);

        // 3. Meta Commands (USE, etc.)
        if (translated.isMeta) {
            if (translated.targetSchema) {
                const targetSafe = assertSafeSchemaName(translated.targetSchema);
                const existsRes = await client.query(
                    'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
                    [targetSafe]
                );
                if (existsRes.rows.length === 0) {
                    throw new Error(`Unknown database "${targetSafe.replace(`${safeSchema}_`, '')}"`);
                }
            }

            await recordQueryHistory(client, { userId, query, executionTime: 0, metrics: null });

            return res.json({
                message: translated.message || 'Command executed',
                results: [{
                    Status: 'Success',
                    Message: translated.message || 'Command executed successfully'
                }],
                rowCount: 0,
                executionTime: '0s',
                explainPlan: null,
                metrics: null,
                pipeline,
                suggestions: querySuggestions
            });
        }

        // 4. DDL (Non-transactional: CREATE/DROP DATABASE)
        if (translated.noTransaction) {
            await client.query(`SET search_path TO ${safeSchema}`);
            const startTime = Date.now();
            const result = await client.query(translated.pgQuery);
            const executionTime = (Date.now() - startTime) / 1000;

            await recordQueryHistory(client, { userId, query, executionTime, metrics: null });

            return res.json({
                message: 'Query executed successfully',
                results: [{
                    Status: 'Success',
                    Message: `${result.command || 'Query'} executed successfully.`,
                    Operation: query.trim().split(/\s+/).slice(0, 3).join(' ')
                }],
                rowCount: result.rowCount || 0,
                executionTime: `${executionTime}s`,
                explainPlan: null,
                metrics: null,
                pipeline,
                suggestions: querySuggestions
            });
        }

        // 5. Standard Queries (Transaction-based with SET LOCAL search_path for pool safety)
        await client.query('BEGIN');
        inTransaction = true;
        await client.query(`SET LOCAL search_path TO ${safeSchema}`);
        await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);

        const startTime = Date.now();
        const result = await client.query(translated.pgQuery);
        const executionTime = (Date.now() - startTime) / 1000;

        let explainPlan = null;
        let planSuggestions = [];

        // 6. EXPLAIN for SELECTs, WITH (CTEs), and mutations
        const isExplainable = /^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)/i.test(query);

        if (isExplainable) {
            await client.query('SAVEPOINT sqlens_explain');
            try {
                // Mutations use EXPLAIN without ANALYZE so rows are never modified twice.
                // Read queries use EXPLAIN (ANALYZE, BUFFERS) for real buffer cache & timing metrics.
                const isMutation = /^\s*(INSERT|UPDATE|DELETE)/i.test(query);
                const explainCommand = isMutation
                    ? 'EXPLAIN (FORMAT JSON)'
                    : 'EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS)';

                const explainResult = await client.query(`${explainCommand} ${translated.pgQuery}`);
                explainPlan = explainResult.rows[0]['QUERY PLAN'];
                planSuggestions = optimizer.analyzePlan(explainPlan);
                await client.query('RELEASE SAVEPOINT sqlens_explain');
            } catch (explainErr) {
                await client.query('ROLLBACK TO SAVEPOINT sqlens_explain');
                console.warn('EXPLAIN failed:', explainErr.message);
            }
        }

        const planMetrics = optimizer.extractPlanMetrics(explainPlan);
        const allSuggestions = [...querySuggestions, ...planSuggestions];

        // 7. Log history inside the transaction
        await recordQueryHistory(client, { userId, query, executionTime, metrics: planMetrics });

        await client.query('COMMIT');
        inTransaction = false;

        // Better results for non-SELECTs
        let finalResults = result.rows || [];
        if (finalResults.length === 0 && (result.rowCount !== null || result.command)) {
            const command = result.command || 'Query';
            finalResults = [{
                Status: 'Success',
                Message: `${command} executed successfully. ${result.rowCount !== null ? `${result.rowCount} rows affected.` : ''}`
            }];
        }

        res.json({
            message: 'Query executed successfully',
            results: finalResults,
            rowCount: result.rowCount,
            executionTime: `${executionTime}s`,
            explainPlan: explainPlan,
            metrics: planMetrics,
            pipeline,
            suggestions: allSuggestions
        });

    } catch (error) {
        if (inTransaction) {
            try {
                await client.query('ROLLBACK');
                inTransaction = false;
            } catch (_) { }
        }
        console.error('Query Error:', error.message);

        await recordQueryHistory(client, { userId, query, executionTime: -1.0, metrics: null });

        let userMessage = error.message;
        userMessage = userMessage.replace(/relation/gi, 'table');
        userMessage = userMessage.replace(/schema/gi, 'database');

        res.status(500).json({
            error: userMessage,
            hint: 'Ensure your MySQL syntax is correct.'
        });
    } finally {
        if (inTransaction) {
            try { await client.query('ROLLBACK'); } catch (_) { }
        }
        try { await client.query('RESET search_path'); } catch (_) { }
        try { await client.query('RESET statement_timeout'); } catch (_) { }
        client.release();
    }
};

exports.aiOptimize = async (req, res) => {
    const { query, explainPlan, suggestions } = req.body;

    if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Query is required for AI Analysis' });
    }

    try {
        const forwardedProto = req.headers['x-forwarded-proto'];
        const forwardedHost = req.headers['x-forwarded-host'] || req.get('host');
        const siteUrl = req.get('origin')
            || (forwardedHost ? `${forwardedProto || req.protocol}://${forwardedHost}` : undefined);

        const aiResult = await optimizer.aiAnalyze(query, explainPlan, suggestions || [], {
            siteUrl
        });

        // If the service returned an internal error object, we still return 200
        // but the frontend will display the error message nicely.
        res.json(aiResult);
    } catch (error) {
        console.error('CRITICAL: AI Optimize Controller Crash:', error);
        res.status(500).json({
            error: 'The AI engine encountered a critical error.',
            details: error.message
        });
    }
};
