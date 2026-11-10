const db = require('../db/connection');

const getDashboardStats = async (userId) => {
    try {
        await db.ensureTelemetrySchema();

        // Calculate QPS dynamically based on queries in the last minute
        const { rows: qpsRows } = await db.query(`
            SELECT COUNT(*)::numeric / 60.0 AS qps 
            FROM public.query_history 
            WHERE created_at >= NOW() - INTERVAL '1 minute' AND user_id = $1::integer
        `, [userId]);

        const qps = parseFloat(qpsRows[0]?.qps || 0).toFixed(2);

        // Slow queries: Any query taking more than 250ms in the last 24h
        const { rows: slowRows } = await db.query(`
            SELECT COUNT(*) AS slow 
            FROM public.query_history 
            WHERE execution_time > 0.25 AND created_at >= NOW() - INTERVAL '24 hours' AND user_id = $1::integer
        `, [userId]);

        const slowQueries = parseInt(slowRows[0]?.slow || 0, 10);

        // Real Node.js pg.Pool telemetry instead of global Supabase pg_stat_activity
        const poolStats = db.getPoolStats();
        const connections = String(poolStats.active);

        // Server Uptime (Time since the Node.js backend started)
        const uptime = Math.floor(process.uptime());

        // Real user P95 latency over the last 24 hours (prefers PostgreSQL engine Execution Time when measured)
        const { rows: latencyRows } = await db.query(`
            SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (
                ORDER BY COALESCE(execution_time_ms, execution_time * 1000.0)
            ) AS p95
            FROM public.query_history
            WHERE created_at >= NOW() - INTERVAL '24 hours'
              AND execution_time >= 0
              AND user_id = $1::integer
        `, [userId]);

        const measuredP95 = parseFloat(latencyRows[0]?.p95 || 0);
        const p95 = measuredP95.toFixed(1);

        return {
            qps,
            p95: p95 + 'ms',
            connections,
            poolStats,
            slowQueries: slowQueries.toString(),
            uptime: uptime.toString()
        };
    } catch (error) {
        const poolStats = db.getPoolStats();
        return {
            qps: '0.00',
            p95: '0.0ms',
            connections: String(poolStats.active),
            poolStats,
            slowQueries: '0',
            uptime: Math.floor(process.uptime()).toString()
        };
    }
};

const getSlowQueries = async (userId) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                query_text AS query, 
                ROUND((execution_time * 1000)::numeric, 2) as time,
                TO_CHAR(created_at, 'HH24:MI:SS') as date
            FROM public.query_history
            WHERE execution_time > 0.25 AND user_id = $1::integer
            ORDER BY created_at DESC
            LIMIT 12
        `, [userId]);

        return rows || [];
    } catch (error) {
        return [];
    }
};

const getUserLogs = async (userId) => {
    try {
        const result = await db.query(`
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

        return result.rows || [];
    } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
};

const getAnalyticsData = async (userId) => {
    const emptyBuckets = Array(12).fill(0);
    try {
        await db.ensureTelemetrySchema();

        const [{ rows: bucketRows }, { rows: summaryRows }] = await Promise.all([
            db.query(`
                WITH buckets AS (
                    SELECT generate_series(
                        date_trunc('minute', NOW()) - INTERVAL '55 minutes',
                        date_trunc('minute', NOW()),
                        INTERVAL '5 minutes'
                    ) AS bucket_start
                )
                SELECT
                    TO_CHAR(b.bucket_start, 'HH24:MI') AS label,
                    COUNT(q.id)::int AS count
                FROM buckets b
                LEFT JOIN public.query_history q
                    ON q.user_id = $1::integer
                    AND q.created_at >= b.bucket_start
                    AND q.created_at < b.bucket_start + INTERVAL '5 minutes'
                GROUP BY b.bucket_start
                ORDER BY b.bucket_start ASC
            `, [userId]),
            db.query(`
                SELECT
                    COUNT(*)::int AS total_queries,
                    COUNT(*) FILTER (
                        WHERE planning_time_ms IS NOT NULL
                           OR shared_hit_blocks > 0
                           OR shared_read_blocks > 0
                           OR used_index = TRUE
                           OR COALESCE(seq_scan_count, 0) > 0
                    )::int AS explained_queries,
                    COUNT(*) FILTER (
                        WHERE used_index = TRUE
                           OR (
                               (planning_time_ms IS NOT NULL OR shared_hit_blocks > 0 OR shared_read_blocks > 0)
                               AND COALESCE(seq_scan_count, 0) = 0
                           )
                    )::int AS indexed_queries,
                    COUNT(*) FILTER (WHERE COALESCE(seq_scan_count, 0) > 0)::int AS seq_scan_queries,
                    COALESCE(SUM(shared_hit_blocks), 0)::bigint AS total_hit_blocks,
                    COALESCE(SUM(shared_read_blocks), 0)::bigint AS total_read_blocks
                FROM public.query_history
                WHERE user_id = $1::integer AND execution_time >= 0
            `, [userId]),
        ]);

        const counts = bucketRows.map((r) => Number(r.count || 0));
        const labels = bucketRows.map((r) => r.label);
        const maxCount = Math.max(...counts, 0);
        const throughputTrend = maxCount > 0
            ? counts.map((c) => (c === 0 ? 0 : Math.max(8, Math.round((c / maxCount) * 100))))
            : emptyBuckets;

        const summary = summaryRows[0] || {};
        const totalQueries = Number(summary.total_queries || 0);
        const explainedQueries = Number(summary.explained_queries || 0);
        const indexedQueries = Number(summary.indexed_queries || 0);
        const seqScanQueries = Number(summary.seq_scan_queries || 0);
        const totalHitBlocks = Number(summary.total_hit_blocks || 0);
        const totalReadBlocks = Number(summary.total_read_blocks || 0);
        const totalBlocks = totalHitBlocks + totalReadBlocks;

        const indexHitRate = explainedQueries > 0
            ? Math.round((indexedQueries / explainedQueries) * 100)
            : 0;

        const bufferHitRate = totalBlocks > 0
            ? Math.round((totalHitBlocks / totalBlocks) * 1000) / 10
            : null;

        return {
            throughputTrend,
            throughputCounts: counts,
            throughputLabels: labels,
            indexHitRate,
            bufferHitRate,
            totalQueries,
            explainedQueries,
            seqScanQueries,
            totalHitBlocks,
            totalReadBlocks,
        };
    } catch (error) {
        return {
            throughputTrend: emptyBuckets,
            throughputCounts: emptyBuckets,
            throughputLabels: [],
            indexHitRate: 0,
            bufferHitRate: null,
            totalQueries: 0,
            explainedQueries: 0,
            seqScanQueries: 0,
            totalHitBlocks: 0,
            totalReadBlocks: 0,
        };
    }
};

module.exports = { getDashboardStats, getSlowQueries, getUserLogs, getAnalyticsData };
