/**
 * Analyzes the execution plan and suggests optimizations.
 */
const generateSuggestions = (planData) => {
    const suggestions = [];

    const analyzeNode = (node) => {
        // 1. Check for Sequential Scans on large tables
        if (node.type === 'Seq Scan' && node.rows > 1000) {
            suggestions.push({
                type: 'PERFORMANCE',
                severity: 'HIGH',
                message: `Sequential Scan detected on ${node.relation}.`,
                recommendation: `Consider adding an index to ${node.relation} if this table is large and queried frequently.`,
                impact: 'Reduces I/O and speeds up row lookup.'
            });
        }

        // 2. Check for Nested Loops with high cost
        if (node.type === 'Nested Loop' && node.totalTime > 100) {
            suggestions.push({
                type: 'JOIN_OPTIMIZATION',
                severity: 'MEDIUM',
                message: 'Nested Loop join taking significant time.',
                recommendation: 'Check if join columns are indexed. Analyze if a Hash Join or Merge Join would be more efficient by updating table statistics.',
                impact: 'Optimizes how tables are merged.'
            });
        }

        // 3. High Row mismatch (Estimates vs Reality)
        const discrepancy = Math.abs(node.rows - node.actualRows);
        if (discrepancy > node.rows * 2 && node.rows > 10) {
            suggestions.push({
                type: 'STATISTICS',
                severity: 'LOW',
                message: `Plan estimates vs actual rows are wildly different for ${node.type}.`,
                recommendation: `Run 'ANALYZE ${node.relation || ''}' to update table statistics for better query planning.`,
                impact: 'Helps the query planner make better decisions.'
            });
        }

        // Recurse
        if (node.children) {
            node.children.forEach(analyzeNode);
        }
    };

    analyzeNode(planData.executionPlan);

    // Default suggestion if nothing found
    if (suggestions.length === 0) {
        suggestions.push({
            type: 'INFO',
            severity: 'LOW',
            message: 'Query is performing well based on current statistics.',
            recommendation: 'Keep monitoring as data grows.',
            impact: 'N/A'
        });
    }

    return suggestions;
};

module.exports = { generateSuggestions };
