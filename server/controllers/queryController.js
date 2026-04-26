const db = require('../db/connection');
const optimizer = require('../services/optimizerService');
const MySQLTranslator = require('../services/mysqlTranslator');

exports.runQuery = async (req, res) => {
    const { query } = req.body;
    const { schemaName, id: userId } = req.user;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    const translator = new MySQLTranslator(schemaName);
    const client = await db.pool.connect();

    try {
        // 1. Translate MySQL → PostgreSQL
        const translated = translator.translate(query);

        // 2. Run RULE-BASED analysis on the raw MySQL query (instant, free)
        const querySuggestions = optimizer.analyzeQuery(query);

        // 3. Handle "USE database" (meta command)
        if (translated.isMeta) {
            await client.query(translated.pgQuery);
            await client.query(
                'INSERT INTO public.query_history (user_id, query, execution_time) VALUES ($1, $2, $3)',
                [userId, query, 0]
            );

            return res.json({
                message: translated.message || 'Command executed',
                results: [{ Status: translated.message || 'OK' }],
                rowCount: 0,
                executionTime: '0s',
                explainPlan: null,
                suggestions: querySuggestions
            });
        }

        // 4. DDL without transaction (CREATE/DROP SCHEMA)
        if (translated.noTransaction) {
            await client.query(`SET search_path TO ${schemaName}`);
            const startTime = Date.now();
            const result = await client.query(translated.pgQuery);
            const executionTime = (Date.now() - startTime) / 1000;

            await client.query(
                'INSERT INTO public.query_history (user_id, query, execution_time) VALUES ($1, $2, $3)',
                [userId, query, executionTime]
            );

            return res.json({
                message: 'Query executed successfully',
                results: [{ Status: 'OK', Info: `Executed: ${query.trim().split(/\s+/).slice(0, 3).join(' ')}` }],
                rowCount: result.rowCount || 0,
                executionTime: `${executionTime}s`,
                explainPlan: null,
                suggestions: querySuggestions
            });
        }

        // 5. Standard queries — use transaction
        await client.query('BEGIN');
        await client.query(`SET search_path TO ${schemaName}`);

        const startTime = Date.now();
        const result = await client.query(translated.pgQuery);
        const executionTime = (Date.now() - startTime) / 1000;

        // 6. EXPLAIN for SELECT queries + plan-based suggestions
        let explainPlan = null;
        let planSuggestions = [];

        if (query.trim().toLowerCase().startsWith('select')) {
            try {
                const explainResult = await client.query(`EXPLAIN (FORMAT JSON, ANALYZE) ${translated.pgQuery}`);
                explainPlan = explainResult.rows[0]['QUERY PLAN'];
                planSuggestions = optimizer.analyzePlan(explainPlan);
            } catch (explainErr) {
                console.warn('EXPLAIN failed:', explainErr.message);
            }
        }

        // 7. Merge all suggestions (query-level + plan-level)
        const allSuggestions = [...querySuggestions, ...planSuggestions];

        // 8. Log to history
        await client.query(
            'INSERT INTO public.query_history (user_id, query, execution_time) VALUES ($1, $2, $3)',
            [userId, query, executionTime]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Query executed successfully',
            results: result.rows || [],
            rowCount: result.rowCount,
            executionTime: `${executionTime}s`,
            explainPlan: explainPlan,
            suggestions: allSuggestions
        });

    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) { }
        console.error('Query Error:', error.message);
        try {
            await db.query(
                'INSERT INTO public.query_history (user_id, query, execution_time) VALUES ($1, $2, $3)',
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

// ═══════════════════════════════════════════════════════
//  AI OPTIMIZE ENDPOINT (on-demand, uses OpenRouter)
// ═══════════════════════════════════════════════════════

exports.aiOptimize = async (req, res) => {
    const { query, explainPlan, suggestions } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        const aiResult = await optimizer.aiAnalyze(query, explainPlan, suggestions || []);
        res.json(aiResult);
    } catch (error) {
        console.error('AI Optimize Error:', error.message);
        res.status(500).json({ error: 'AI analysis failed' });
    }
};
