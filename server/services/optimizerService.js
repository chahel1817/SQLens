/**
 * SQLens Optimizer Service
 * 
 * Two-layer intelligence:
 *   Layer 1: Rule-based pattern matching (instant, free, runs on EVERY query)
 *   Layer 2: AI-powered deep analysis via OpenRouter (on-demand)
 */

// ═══════════════════════════════════════════════════════
//  LAYER 1: RULE-BASED QUERY ANALYZER
// ═══════════════════════════════════════════════════════

/**
 * Analyzes the raw MySQL query text for common anti-patterns.
 * Works on ALL query types — SELECT, INSERT, UPDATE, DELETE, CREATE, etc.
 */
exports.analyzeQuery = (rawQuery) => {
    const suggestions = [];
    const q = rawQuery.trim();
    const upper = q.toUpperCase();

    // ── SELECT * (bad practice) ──
    if (/\bSELECT\s+\*/i.test(q)) {
        suggestions.push({
            type: 'WARNING',
            message: 'Avoid using SELECT * in production',
            improvement: 'Specify only the columns you need. SELECT * fetches unnecessary data, slows down queries, and breaks if the table schema changes.',
            fix: q.replace(/SELECT\s+\*/i, 'SELECT column1, column2')
        });
    }

    // ── DELETE / UPDATE without WHERE (DANGEROUS) ──
    if (/\b(DELETE\s+FROM|UPDATE\s+\w+\s+SET)\b/i.test(q) && !/\bWHERE\b/i.test(q)) {
        const action = upper.startsWith('DELETE') ? 'DELETE' : 'UPDATE';
        suggestions.push({
            type: 'CRITICAL',
            message: `⚠️ ${action} without WHERE clause — affects ALL rows!`,
            improvement: `This will ${action === 'DELETE' ? 'delete' : 'update'} every row in the table. Always add a WHERE clause to target specific rows.`,
            fix: q + ' WHERE id = <condition>'
        });
    }

    // ── LIKE with leading wildcard ──
    if (/LIKE\s+['"]%/i.test(q)) {
        suggestions.push({
            type: 'WARNING',
            message: 'Leading wildcard in LIKE prevents index usage',
            improvement: "LIKE '%value' forces a full table scan. Consider using LIKE 'value%' (trailing wildcard) which can use indexes, or use a FULLTEXT index for text search."
        });
    }

    // ── SELECT without LIMIT on large queries ──
    if (/\bSELECT\b/i.test(q) && !/\bLIMIT\b/i.test(q) && !/\bCOUNT\s*\(/i.test(q) && !/\bSUM\s*\(/i.test(q) && !/\bAVG\s*\(/i.test(q)) {
        suggestions.push({
            type: 'INFO',
            message: 'Consider adding LIMIT to your SELECT',
            improvement: 'Without LIMIT, you may fetch thousands of rows. Use LIMIT to paginate results and improve performance.',
            fix: q.replace(/;?\s*$/, ' LIMIT 100;')
        });
    }

    // ── ORDER BY without INDEX hint ──
    if (/\bORDER\s+BY\b/i.test(q) && !/\bLIMIT\b/i.test(q)) {
        suggestions.push({
            type: 'INFO',
            message: 'ORDER BY without LIMIT sorts entire result set',
            improvement: 'Sorting large datasets is expensive. Add LIMIT to only sort and return what you need. Also ensure the ORDER BY column has an index.'
        });
    }

    // ── Subquery in WHERE (could be a JOIN) ──
    if (/WHERE\s+\w+\s+IN\s*\(\s*SELECT/i.test(q)) {
        suggestions.push({
            type: 'WARNING',
            message: 'Subquery in WHERE could be replaced with JOIN',
            improvement: 'Subqueries in WHERE clauses are often slower than JOINs. Consider rewriting: SELECT ... FROM a JOIN b ON a.id = b.a_id instead of WHERE id IN (SELECT ...).'
        });
    }

    // ── Multiple INSERT without batch syntax ──
    if (/INSERT\s+INTO/i.test(q)) {
        const insertCount = (q.match(/INSERT\s+INTO/gi) || []).length;
        if (insertCount > 1) {
            suggestions.push({
                type: 'INFO',
                message: 'Use batch INSERT for multiple rows',
                improvement: 'Instead of multiple INSERT statements, use: INSERT INTO table VALUES (...), (...), (...); — this is significantly faster.'
            });
        }
    }

    // ── CREATE TABLE without PRIMARY KEY ──
    if (/CREATE\s+TABLE/i.test(q) && !/PRIMARY\s+KEY/i.test(q)) {
        suggestions.push({
            type: 'WARNING',
            message: 'Table created without PRIMARY KEY',
            improvement: 'Every table should have a PRIMARY KEY. It uniquely identifies rows and dramatically improves query performance.'
        });
    }

    // ── SELECT DISTINCT (may indicate join issue) ──
    if (/\bSELECT\s+DISTINCT\b/i.test(q)) {
        suggestions.push({
            type: 'INFO',
            message: 'SELECT DISTINCT may indicate a join problem',
            improvement: 'If you need DISTINCT, check if your JOINs are producing duplicate rows. Fixing the join is better than adding DISTINCT.'
        });
    }

    // ── != NULL instead of IS NOT NULL ──
    if (/!=\s*NULL|<>\s*NULL/i.test(q)) {
        suggestions.push({
            type: 'CRITICAL',
            message: "Using != NULL won't work — use IS NOT NULL",
            improvement: 'In SQL, NULL is not a value — it\'s the absence of a value. Use IS NULL or IS NOT NULL instead of = NULL or != NULL.',
            fix: q.replace(/!=\s*NULL/gi, 'IS NOT NULL').replace(/<>\s*NULL/gi, 'IS NOT NULL')
        });
    }

    // ── = NULL instead of IS NULL ──
    if (/[^!<>]=\s*NULL/i.test(q) && !/IS\s+(NOT\s+)?NULL/i.test(q)) {
        suggestions.push({
            type: 'CRITICAL',
            message: "Using = NULL won't work — use IS NULL",
            improvement: 'In SQL, you must use IS NULL to check for NULL values. The = operator cannot compare to NULL.',
            fix: q.replace(/=\s*NULL/gi, 'IS NULL')
        });
    }

    // ── Functions on indexed columns in WHERE ──
    if (/WHERE\s+(?:UPPER|LOWER|YEAR|MONTH|DATE|SUBSTRING|TRIM|CONCAT)\s*\(/i.test(q)) {
        suggestions.push({
            type: 'WARNING',
            message: 'Function on column in WHERE prevents index usage',
            improvement: 'Wrapping a column in a function (e.g., UPPER(name)) prevents the database from using indexes. Use computed columns or expression indexes instead.'
        });
    }

    return suggestions;
};


// ═══════════════════════════════════════════════════════
//  LAYER 1B: EXPLAIN PLAN ANALYZER (SELECT only)
// ═══════════════════════════════════════════════════════

/**
 * Analyzes the PostgreSQL EXPLAIN plan for performance issues.
 */
exports.analyzePlan = (plan) => {
    const suggestions = [];

    if (!plan || !plan[0] || !plan[0].Plan) return suggestions;

    const mainPlan = plan[0].Plan;

    const traversePlan = (node) => {
        // Sequential / Full Table Scan
        if (node['Node Type'] === 'Seq Scan') {
            const tableName = node['Relation Name'];
            const filter = node['Filter'];
            const rows = node['Actual Rows'] || node['Plan Rows'] || 0;

            if (rows > 50 || filter) {
                suggestions.push({
                    type: 'CRITICAL',
                    message: `Full Table Scan on "${tableName}" (${rows} rows scanned)`,
                    improvement: filter
                        ? `Add an INDEX on the columns in: ${filter.replace(/\(/g, '').replace(/\)/g, '')}`
                        : `Table "${tableName}" is being scanned row-by-row. Add an index on frequently filtered columns.`,
                    fix: `CREATE INDEX idx_${tableName} ON ${tableName}(<column_name>);`
                });
            }
        }

        // High cost
        if (node['Total Cost'] > 500) {
            suggestions.push({
                type: 'WARNING',
                message: `High-cost operation: ${node['Node Type']} (cost: ${Math.round(node['Total Cost'])})`,
                improvement: 'This operation is expensive. Consider adding indexes, reducing the dataset with WHERE clauses, or simplifying joins.'
            });
        }

        // Sort without index
        if (node['Node Type'] === 'Sort' && node['Actual Rows'] > 100) {
            suggestions.push({
                type: 'WARNING',
                message: `Sorting ${node['Actual Rows']} rows in memory`,
                improvement: 'Large sorts are slow. Add an index on the ORDER BY column to avoid in-memory sorting.'
            });
        }

        // Nested Loop with many rows
        if (node['Node Type'] === 'Nested Loop' && node['Actual Rows'] > 100) {
            suggestions.push({
                type: 'WARNING',
                message: 'Nested Loop Join processing many rows',
                improvement: 'Nested Loops are slow for large datasets. Ensure JOIN columns are indexed, or consider rewriting with a Hash Join.'
            });
        }

        // Hash Join with high cost
        if (node['Node Type'] === 'Hash Join' && node['Total Cost'] > 1000) {
            suggestions.push({
                type: 'INFO',
                message: 'Hash Join with high cost detected',
                improvement: 'Hash Joins are generally efficient, but this one is costly. Verify that the join columns have proper indexes.'
            });
        }

        if (node.Plans) node.Plans.forEach(traversePlan);
    };

    traversePlan(mainPlan);
    return suggestions;
};


// ═══════════════════════════════════════════════════════
//  LAYER 2: AI-POWERED DEEP ANALYSIS (OpenRouter)
// ═══════════════════════════════════════════════════════

/**
 * Sends the query + execution plan to an LLM for deep, contextual optimization advice.
 */
exports.aiAnalyze = async (rawQuery, explainPlan, ruleSuggestions) => {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return { error: 'OpenRouter API key not configured' };
        }

        const systemPrompt = `You are SQLens AI — an expert MySQL query optimizer. 
You receive a MySQL query, its execution plan, and some rule-based suggestions.

Your job:
1. Give 2-4 SPECIFIC, ACTIONABLE optimization tips
2. If you can provide a rewritten/optimized version of the query, do so
3. Rate the query performance: EXCELLENT, GOOD, NEEDS IMPROVEMENT, or POOR
4. Be concise — max 2-3 sentences per tip
5. Use MySQL syntax in any SQL you write (not PostgreSQL)

IMPORTANT: You MUST respond ONLY with a valid JSON object. No markdown formatting, no preamble.

Expected JSON format:
{
  "rating": "GOOD",
  "summary": "One-line summary",
  "tips": [
    { "title": "Title", "detail": "Explanation", "fix": "SQL code" }
  ],
  "optimizedQuery": "SQL or null"
}`;

        const userPrompt = `
MySQL Query:
\`\`\`sql
${rawQuery}
\`\`\`

${explainPlan ? `Execution Plan:\n\`\`\`json\n${JSON.stringify(explainPlan, null, 2)}\n\`\`\`` : 'No execution plan available (non-SELECT query).'}

Rule-based issues found: ${Array.isArray(ruleSuggestions) ? ruleSuggestions.map(s => s.message).join(', ') : 'None'}
`;

        // Add a 30-second timeout to the request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        let response;
        let attempts = 0;
        const maxAttempts = 3;
        const baseDelay = 2000; // 2 seconds

        while (attempts < maxAttempts) {
            response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'SQLens Query Optimizer'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 1500
                }),
                signal: controller.signal
            });

            if (response.status === 429) {
                attempts++;
                if (attempts < maxAttempts) {
                    const delay = baseDelay * Math.pow(2, attempts - 1);
                    console.warn(`AI Rate Limited (429). Retrying in ${delay}ms... (Attempt ${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
            break;
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenRouter API error:', response.status, errorData);

            if (response.status === 429) {
                return { error: "AI Engine is busy (Rate Limit). Please wait a few seconds and try again." };
            }
            return { error: `AI service returned ${response.status}: ${errorData.error?.message || 'Unknown error'}` };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return { error: 'Empty response from AI engine' };
        }

        // Robust JSON extraction
        try {
            // First try direct parse (if AI followed instructions perfectly)
            return JSON.parse(content.trim());
        } catch (e) {
            // If that fails, look for the first { and last }
            const start = content.indexOf('{');
            const end = content.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                try {
                    const jsonStr = content.substring(start, end + 1);
                    return JSON.parse(jsonStr);
                } catch (innerE) {
                    console.error('Failed to parse extracted JSON:', innerE.message, content);
                    return { error: 'AI returned malformed data', raw: content.substring(0, 200) };
                }
            }
            return { error: 'AI response did not contain a valid analysis block', raw: content.substring(0, 200) };
        }

    } catch (err) {
        if (err.name === 'AbortError') {
            return { error: 'AI analysis timed out. Please try again.' };
        }
        console.error('AI Analysis Exception:', err);
        return { error: `Internal Engine Error: ${err.message}` };
    }
};
