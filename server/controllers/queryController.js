const db = require('../db/connection');
const optimizer = require('../services/optimizerService');
const MySQLTranslator = require('../services/mysqlTranslator');

exports.runQuery = async (req, res) => {
    const { query } = req.body;
    const { schemaName, id: userId } = req.user;

    if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Query is required' });
    }

    const translator = new MySQLTranslator(schemaName);
    const client = await db.pool.connect();

    try {
        // 1. Translate MySQL → PostgreSQL
        const translated = translator.translate(query);

        // 2. Run RULE-BASED analysis on raw MySQL
        const querySuggestions = optimizer.analyzeQuery(query);

        // 3. Meta Commands (USE, SHOW, etc.)
        if (translated.isMeta) {
            await client.query(translated.pgQuery);

            // Log with silent failure on FK issues
            try {
                await client.query(
                    'INSERT INTO public.query_history (user_id, query_text, execution_time) VALUES ($1, $2, $3)',
                    [userId, query, 0]
                );
            } catch (err) { }

            return res.json({
                message: translated.message || 'Command executed',
                results: [{
                    Status: 'Success',
                    Message: translated.message || 'Command executed successfully'
                }],
                rowCount: 0,
                executionTime: '0s',
                explainPlan: null,
                suggestions: querySuggestions
            });
        }

        // 4. DDL (Non-transactional)
        if (translated.noTransaction) {
            await client.query(`SET search_path TO ${schemaName}`);
            const startTime = Date.now();
            const result = await client.query(translated.pgQuery);
            const executionTime = (Date.now() - startTime) / 1000;

            try {
                await client.query(
                    'INSERT INTO public.query_history (user_id, query_text, execution_time) VALUES ($1, $2, $3)',
                    [userId, query, executionTime]
                );
            } catch (err) { }

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
                suggestions: querySuggestions
            });
        }

        // 5. Standard Queries (Transaction-based)
        await client.query('BEGIN');
        await client.query(`SET search_path TO ${schemaName}`);

        const startTime = Date.now();
        const result = await client.query(translated.pgQuery);
        const executionTime = (Date.now() - startTime) / 1000;

        let explainPlan = null;
        let planSuggestions = [];

        // 6. EXPLAIN for SELECTs, WITH (CTEs), and mutations
        const isExplainable = /^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)/i.test(query);

        if (isExplainable) {
            try {
                const explainResult = await client.query(`EXPLAIN (FORMAT JSON, ANALYZE) ${translated.pgQuery}`);
                explainPlan = explainResult.rows[0]['QUERY PLAN'];
                planSuggestions = optimizer.analyzePlan(explainPlan);
            } catch (explainErr) {
                console.warn('EXPLAIN failed:', explainErr.message);
            }
        }

        const allSuggestions = [...querySuggestions, ...planSuggestions];

        // 7. Log history
        try {
            await client.query(
                'INSERT INTO public.query_history (user_id, query_text, execution_time) VALUES ($1, $2, $3)',
                [userId, query, executionTime]
            );
        } catch (err) { }

        await client.query('COMMIT');

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
            suggestions: allSuggestions
        });

    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) { }
        console.error('Query Error:', error.message);

        // Attempt logging error state if FK allows
        try {
            await db.query(
                'INSERT INTO public.query_history (user_id, query_text, execution_time) VALUES ($1, $2, $3)',
                [userId, query, -1.0]
            );
        } catch (logErr) { }

        let userMessage = error.message;
        userMessage = userMessage.replace(/relation/gi, 'table');
        userMessage = userMessage.replace(/schema/gi, 'database');

        res.status(500).json({
            error: userMessage,
            hint: 'Ensure your MySQL syntax is correct.'
        });
    } finally {
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
