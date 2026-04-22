/**
 * Analyzes the PostgreSQL Explain Plan and returns human-readable optimization suggestions.
 */
exports.generateSuggestions = (plan) => {
    const suggestions = [];

    // Postgres returns the plan as an array containing one object
    const mainPlan = plan[0].Plan;

    // Helper function to recursively search for issues in the plan tree
    const traversePlan = (node) => {
        // 1. Detect Sequential Scans (The #1 enemy of performance)
        if (node['Node Type'] === 'Seq Scan') {
            const tableName = node['Relation Name'];
            const filter = node['Filter'];

            let suggestion = {
                type: 'CRITICAL',
                message: `Sequential Scan detected on table "${tableName}".`,
                improvement: `This table is being read row-by-row. Consider adding an INDEX on the columns used in your WHERE clause.`
            };

            if (filter) {
                suggestion.improvement = `Consider adding an INDEX on the columns involved in: ${filter}`;
            }

            suggestions.push(suggestion);
        }

        // 2. Detect high cost operations
        if (node['Total Cost'] > 1000) {
            suggestions.push({
                type: 'WARNING',
                message: `High cost operation detected (${node['Node Type']}).`,
                improvement: `Total cost is ${node['Total Cost']}. Check if you can pre-filter data or simplify joins.`
            });
        }

        // 3. Check for specific expensive joins
        if (node['Node Type'] === 'Nested Loop' && node['Actual Rows'] > 100) {
            suggestions.push({
                type: 'INFO',
                message: 'Nested Loop Join with many rows.',
                improvement: 'This can be slow. Ensure columns used for joining are indexed.'
            });
        }

        // Walk down the tree (Parallel Plans / Subplans)
        if (node.Plans) {
            node.Plans.forEach(traversePlan);
        }
    };

    traversePlan(mainPlan);

    // If everything looks grand
    if (suggestions.length === 0) {
        suggestions.push({
            type: 'SUCCESS',
            message: 'Query plan looks efficient!',
            improvement: 'No major bottlenecks detected.'
        });
    }

    return suggestions;
};
