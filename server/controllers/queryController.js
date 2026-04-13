const { getExplainPlan } = require('../services/explainService');
const { parsePlan } = require('../services/parserService');
const { generateSuggestions } = require('../services/optimizerService');
const { isQuerySafe } = require('../utils/safety');

const analyzeQuery = async (req, res) => {
    const { sql } = req.body;

    if (!sql) {
        return res.status(400).json({ error: 'SQL query is required' });
    }

    // 1. Safety Check
    if (!isQuerySafe(sql)) {
        return res.status(400).json({
            error: 'Security Alert: Only SELECT/READ queries are allowed for analysis.'
        });
    }

    try {
        // 2. Get Plan from DB
        const rawPlan = await getExplainPlan(sql);

        // 3. Parse Plan
        const parsedData = parsePlan(rawPlan);

        // 4. Generate Suggestions
        const suggestions = generateSuggestions(parsedData);

        // 5. Respond
        res.json({
            success: true,
            data: {
                ...parsedData,
                suggestions
            }
        });
    } catch (error) {
        console.error('Controller Error:', error);
        res.status(500).json({
            error: 'Query execution failed',
            details: error.message
        });
    }
};

module.exports = { analyzeQuery };
