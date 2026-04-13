/**
 * Transforms the nested PostgreSQL EXPLAIN JSON into a cleaner structure 
 * suitable for visualization (e.g., in React Flow or D3).
 */
const parsePlan = (rawPlan) => {
    if (!rawPlan || !rawPlan[0]) return null;

    const rootNode = rawPlan[0].Plan;

    const transformNode = (node) => {
        const newNode = {
            type: node['Node Type'],
            relation: node['Relation Name'] || null,
            alias: node['Alias'] || null,
            startupCost: node['Startup Cost'],
            totalCost: node['Total Cost'],
            rows: node['Plan Rows'],
            width: node['Plan Width'],
            actualRows: node['Actual Rows'],
            actualLoops: node['Actual Loops'],
            totalTime: node['Actual Total Time'],
            strategy: node['Join Type'] || node['Scan Direction'] || null,
            filter: node['Filter'] || null,
            indexName: node['Index Name'] || null,
            children: []
        };

        if (node.Plans) {
            newNode.children = node.Plans.map(child => transformNode(child));
        }

        return newNode;
    };

    return {
        query: rawPlan[0]['Query Text'] || 'N/A',
        executionPlan: transformNode(rootNode),
        summary: {
            planningTime: rawPlan[0]['Planning Time'],
            executionTime: rawPlan[0]['Execution Time'],
            totalTime: rawPlan[0]['Planning Time'] + rawPlan[0]['Execution Time']
        }
    };
};

module.exports = { parsePlan };
