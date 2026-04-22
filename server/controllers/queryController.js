const db = require('../db/connection');
const optimizerService = require('../services/optimizerService');

exports.runQuery = async (req, res) => {
    const { query } = req.body;
    const { schemaName, id: userId } = req.user; // From Auth Middleware

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. SET THE SANDBOX (SCHEMA)
        await client.query(`SET search_path TO ${schemaName}`);

        // 2. RUN THE ACTUAL QUERY
        const startTime = Date.now();
        const result = await client.query(query);
        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000; // in seconds

        // 3. RUN EXPLAIN (if it's a SELECT query)
        let explainPlan = null;
        let suggestions = [];

        if (query.trim().toLowerCase().startsWith('select')) {
            const explainResult = await client.query(`EXPLAIN (FORMAT JSON, ANALYZE) ${query}`);
            explainPlan = explainResult.rows[0]['QUERY PLAN'];

            // 4. GENERATE SUGGESTIONS
            suggestions = optimizerService.generateSuggestions(explainPlan);
        }

        // 5. SAVE TO HISTORY
        await client.query(
            'INSERT INTO public.query_history (user_id, query, execution_time) VALUES ($1, $2, $3)',
            [userId, query, executionTime]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Query executed successfully',
            results: result.rows,
            rowCount: result.rowCount,
            executionTime: `${executionTime}s`,
            explainPlan: explainPlan,
            suggestions: suggestions
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Query Error:', error);
        res.status(500).json({
            error: error.message,
            hint: 'Ensure your SQL syntax is correct for PostgreSQL.'
        });
    } finally {
        client.release();
    }
};
