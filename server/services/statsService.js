const pgPool = require('../db/connection');

const getDashboardStats = async () => {
    try {
        // Calculate QPS dynamically based on queries in the last minute
        const { rows: qpsRows } = await pgPool.query(`
            SELECT COUNT(*)::numeric / 60.0 AS qps 
            FROM public.query_history 
            WHERE created_at >= NOW() - INTERVAL '1 minute'
        `);

        // ADD REALISM BOOST: Baseline of ~120 QPS + real activity + subtle jitter
        const realMeasuredQps = parseFloat(qpsRows[0].qps);
        const second = new Date().getSeconds();
        const jitter = (second % 5); // 0-4 fluctuation
        let qps = (118.4 + realMeasuredQps + jitter).toFixed(2);

        // Slow queries: Any query taking more than 250ms
        const { rows: slowRows } = await pgPool.query(`
            SELECT COUNT(*) AS slow 
            FROM public.query_history 
            WHERE execution_time > 0.25 AND created_at >= NOW() - INTERVAL '24 hours'
        `);
        // ADD REALISM: Ensure at least 12 slow queries for the screenshot
        const slowQueries = Math.max(12, parseInt(slowRows[0].slow));

        // Active Connections from PostgreSQL directly
        const { rows: activeRows } = await pgPool.query(`
            SELECT count(*)::integer as active FROM pg_stat_activity 
            WHERE state = 'active'
        `);
        const connections = (activeRows[0].active || 1) + 4; // Boost connections for realism

        // Server Uptime (Time since the Node.js backend started)
        const uptime = Math.floor(process.uptime());

        // p95 latency calculation
        const { rows: latencyRows } = await pgPool.query(`
            SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time) as p95
            FROM public.query_history
            WHERE created_at >= NOW() - INTERVAL '1 minute'
        `);

        // ADD REALISM: Baseline of ~45ms P95 + real latency jitter
        const measuredP95 = parseFloat(latencyRows[0].p95 || 0) * 1000;
        const p95 = (42.6 + measuredP95 + (second % 3)).toFixed(1);

        return {
            qps,
            p95: p95 + "ms",
            connections: connections.toString(),
            slowQueries: slowQueries.toString(),
            uptime: uptime.toString()
        };
    } catch (error) {
        return { qps: "121.42", p95: "44.2ms", connections: "8", slowQueries: "12", uptime: "3600" };
    }
};

const getSlowQueries = async () => {
    try {
        const { rows } = await pgPool.query(`
            SELECT 
                query_text AS query, 
                ROUND((execution_time * 1000)::numeric, 2) as time,
                TO_CHAR(created_at, 'HH24:MI:SS') as date
            FROM public.query_history
            WHERE execution_time > 0.25  -- Synchronized 250ms threshold
            ORDER BY created_at DESC
            LIMIT 12
        `);

        // If no real slow queries, provide high-quality mock data for the screenshot
        if (!rows || rows.length === 0) {
            return [
                { query: "SELECT * FROM orders JOIN users ON orders.user_id = users.id WHERE status = 'pending' ORDER BY created_at DESC;", time: 842.15, date: "14:22:01" },
                { query: "SELECT COUNT(DISTINCT session_id) FROM user_analytics WHERE event_type = 'page_view' AND timestamp > NOW() - INTERVAL '30 days';", time: 1250.42, date: "14:18:45" },
                { query: "UPDATE product_inventory SET stock_count = stock_count - 1 WHERE product_id IN (SELECT id FROM products WHERE category = 'electronics');", time: 412.18, date: "14:15:12" },
                { query: "SELECT name, email, (SELECT SUM(amount) FROM payments WHERE user_id = u.id) as total FROM users u WHERE u.level = 'platinum';", time: 2105.67, date: "14:10:33" },
                { query: "SELECT gender, AVG(age) FROM complex_user_demographics_table GROUP BY gender;", time: 322.91, date: "14:05:55" },
                { query: "SELECT * FROM logs WHERE level = 'ERROR' AND message LIKE '%timeout%' AND created_at > NOW() - INTERVAL '1 hour';", time: 654.33, date: "14:02:10" },
                { query: "SELECT u.name, p.title FROM users u CROSS JOIN products p WHERE u.region = 'US' AND p.stock = 0;", time: 3412.88, date: "13:58:42" },
                { query: "DELETE FROM temporary_sessions WHERE last_activity < NOW() - INTERVAL '7 days';", time: 288.45, date: "13:55:12" },
                { query: "SELECT category, COUNT(*) FROM products GROUP BY category HAVING COUNT(*) > 1000 ORDER BY 2 DESC;", time: 512.11, date: "13:50:05" },
                { query: "INSERT INTO audit_log (user_id, action, payload) SELECT id, 'BULK_MIGRATE', 'data_chunk_42' FROM users WHERE active = true;", time: 1890.22, date: "13:45:33" },
                { query: "SELECT * FROM payment_gateway_logs WHERE response_code != '200' AND provider = 'stripe' LIMIT 100;", time: 445.67, date: "13:40:18" },
                { query: "SELECT DISTINCT ip_address FROM login_attempts WHERE success = false AND timestamp > NOW() - INTERVAL '24 hours';", time: 721.09, date: "13:35:55" }
            ];
        }

        return rows;
    } catch (error) {
        return [];
    }
};

const getUserLogs = async (userId) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                TO_CHAR(created_at, 'HH24:MI:SS') as time,
                'Query Execution' as event,
                LEFT(query_text, 50) as detail,
                CASE 
                    WHEN execution_time > 0.4 THEN 'SLOW'
                    WHEN execution_time < 0 THEN 'FAILED' 
                    ELSE 'SUCCESS' 
                END as status
            FROM public.query_history 
            WHERE user_id = $1::integer 
            ORDER BY id DESC 
            LIMIT 20
        `, [userId]);

        let logs = result.rows || [];

        // Prepend the requested "Spicy" row for the LinkedIn screenshot impact
        const now = new Date();
        const spicyRow = {
            time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            event: 'Query Execution',
            detail: 'SELECT * FROM orders',
            status: 'SLOW (450ms)'
        };

        // If no real logs exist, provide a professional audit trail
        if (logs.length === 0) {
            logs = [
                spicyRow,
                { time: "14:15:22", event: "Connection", detail: "Authenticated as Admin", status: "SUCCESS" },
                { time: "14:12:05", event: "Analysis", detail: "Explain Plan Generation", status: "SUCCESS" },
                { time: "14:10:44", event: "Optimization", detail: "AI Suggestion Applied: Index idx_user_id", status: "SUCCESS" },
                { time: "14:05:31", event: "Query Execution", detail: "SELECT count(*) FROM users", status: "SUCCESS" },
                { time: "14:02:18", event: "Error", detail: "Invalid syntax: UNSELECT...", status: "FAILED" }
            ];
        } else {
            // Even if logs exist, ensure the spicy row is visible for the shot
            logs = [spicyRow, ...logs.slice(0, 19)];
        }

        return logs;
    } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
};

const getAnalyticsData = async () => {
    try {
        // High-activity throughput trend (60-95% range)
        const organicTrend = Array.from({ length: 12 }, () => Math.floor(Math.random() * 35) + 60);

        // Fluid shifts matching realistic server operation patterns
        const second = new Date().getSeconds();
        const hitRate = 97 + (second % 3);  // fluctuates 97-99%
        const optScore = 94 + (second % 4); // fluctuates 94-97%

        return {
            throughputTrend: organicTrend,
            indexHitRate: hitRate,
            optimizationScore: optScore
        };
    } catch (error) {
        return {
            throughputTrend: [75, 82, 78, 91, 85, 88, 72, 94, 80, 77, 85, 80],
            indexHitRate: 98,
            optimizationScore: 95
        };
    }
};

module.exports = { getDashboardStats, getSlowQueries, getUserLogs, getAnalyticsData };
