const db = require('../db/connection');

const getExplainPlan = async (sql) => {
    try {
        // We use FORMAT JSON to get a machine-readable execution plan
        // ANALYZE actually runs the query, so the plan includes real timing data.
        const explainQuery = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${sql}`;
        const result = await db.query(explainQuery);

        // The result is an array with one row, one column (QUERY PLAN)
        return result.rows[0]['QUERY PLAN'];
    } catch (error) {
        console.error('Explain Service Error:', error);
        throw error;
    }
};

module.exports = { getExplainPlan };
