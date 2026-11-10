'use client';

import React from 'react';
import {
    Zap as ZapIcon,
    Users,
    AlertOctagon,
    AlertTriangle,
    Check,
    ShieldCheck,
    TrendingUp,
    Timer,
    Activity
} from 'lucide-react';
import styles from '../app/page.module.css';
import { DbStats, SlowQuery, AnalyticsData } from './types';

interface TelemetryGridProps {
    view: 'dashboard' | 'analytics';
    isStatsLoading: boolean;
    dbStats: DbStats | null;
    slowQueries: SlowQuery[];
    analyticsData: AnalyticsData | null;
}

const TelemetryGrid: React.FC<TelemetryGridProps> = ({
    view,
    isStatsLoading,
    dbStats,
    slowQueries,
    analyticsData
}) => {

    // Helper to format seconds into a readable string
    const formatUptime = (seconds?: number) => {
        if (!seconds) return 'Calculating...';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    if (view === 'dashboard') {
        return (
            <div className={styles.moduleContainer}>
                <div className={styles.moduleHeader}>
                    <h2 className={styles.moduleTitle}>Dashboard Overview</h2>
                    <p className={styles.moduleDesc}>Live overview of your database performance.</p>
                </div>

                <div className={styles.heroCards}>
                    <div className={`${styles.statCard} ${isStatsLoading ? styles.skeleton : ''}`}>
                        <ZapIcon size={32} />
                        <div>
                            <span className={styles.statValue}>{dbStats?.qps || '0.00'}</span>
                            <span className={styles.statLabel}>Queries / Sec</span>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${isStatsLoading ? styles.skeleton : ''}`}>
                        <Timer size={32} />
                        <div>
                            <span className={styles.statValue}>{dbStats?.p95 || '0.0ms'}</span>
                            <span className={styles.statLabel}>P95 Latency</span>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${isStatsLoading ? styles.skeleton : ''}`}>
                        <Users size={32} />
                        <div>
                            <span className={styles.statValue}>{dbStats?.connections || '0'}</span>
                            <span className={styles.statLabel}>
                                {dbStats?.poolStats
                                    ? `Pool Active (${dbStats.poolStats.total} total)`
                                    : 'Pool Active'}
                            </span>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${isStatsLoading ? styles.skeleton : ''}`}>
                        <AlertOctagon size={32} />
                        <div>
                            <span className={styles.statValue}>{dbStats?.slowQueries || '0'}</span>
                            <span className={styles.statLabel}>Slow (250ms+)</span>
                        </div>
                    </div>
                </div>

                <div className={styles.workspaceLayout} style={{ padding: 0 }}>
                    <div className={styles.workspaceLeft}>
                        <div className={styles.sideCard} style={{ width: '100%', minHeight: 400 }}>
                            <h4 className={styles.sideTitle}>Recent Slow Queries (250ms+)</h4>
                            <div className={styles.statsFeed}>
                                {slowQueries.length > 0 ? slowQueries.map((q, i) => (
                                    <div key={i} className={styles.statsFeedItem}>
                                        <div className={styles.statsFeedDot}></div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className={styles.statsFeedSQL} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.query}</div>
                                            <div className={styles.statsFeedMeta}>{q.time}ms • {q.date}</div>
                                        </div>
                                    </div>
                                )) : <div className={styles.cleanState}>
                                    <Check size={40} color="var(--neon-green)" style={{ opacity: 0.5 }} />
                                    <p>No high-latency queries detected lately.</p>
                                </div>}
                            </div>
                        </div>
                    </div>
                    <div className={styles.workspaceRight} style={{ top: 0 }}>
                        <div className={styles.sideCard}>
                            <h4 className={styles.sideTitle}>Health Status</h4>
                            <div className={styles.historyList}>
                                <div className={styles.historyItem} style={{ borderLeft: `3px solid ${slowQueries.length > 2 ? 'var(--warning)' : 'var(--success)'}` }}>
                                    {slowQueries.length > 2 ? <AlertTriangle size={14} color="var(--warning)" /> : <Check size={14} color="var(--success)" />}
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Thread Latency</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{dbStats?.p95} average processing</div>
                                    </div>
                                </div>
                                <div className={styles.historyItem} style={{ borderLeft: '1px solid var(--border)' }}>
                                    <Activity size={14} color="var(--brand-accent)" />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Backend Uptime</div>
                                        <div style={{ fontSize: '0.73rem', color: 'var(--brand-accent)', fontWeight: 700 }}>
                                            {formatUptime(Number(dbStats?.uptime))}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.historyItem} style={{ borderLeft: '3px solid var(--success)' }}>
                                    <ShieldCheck size={14} color="var(--success)" />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Pool &amp; Schema Isolation</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                            {dbStats?.poolStats
                                                ? `${dbStats.poolStats.idle} idle · ${dbStats.poolStats.waiting} queued · SET LOCAL search_path`
                                                : 'Transactional schema isolation active'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const trendBars = analyticsData?.throughputTrend || Array(12).fill(0);
    const trendCounts = analyticsData?.throughputCounts || Array(12).fill(0);
    const trendLabels = analyticsData?.throughputLabels || [];
    const explainedQueries = analyticsData?.explainedQueries || 0;
    const seqScanQueries = analyticsData?.seqScanQueries || 0;
    const totalHitBlocks = analyticsData?.totalHitBlocks || 0;
    const totalReadBlocks = analyticsData?.totalReadBlocks || 0;
    const hasBufferStats = totalHitBlocks + totalReadBlocks > 0;

    // Analytics View
    return (
        <div className={styles.moduleContainer}>
            <div className={styles.moduleHeader}>
                <h2 className={styles.moduleTitle}>Performance Analytics</h2>
                <p className={styles.moduleDesc}>Real per-user query throughput, index plan efficiency, and buffer pool cache I/O.</p>
            </div>

            <div className={styles.sideCard} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <h4 className={styles.sideTitle} style={{ marginBottom: 0 }}>
                        <TrendingUp size={14} /> Throughput Trend (Last 60m · 5m buckets)
                    </h4>
                    <span style={{ fontSize: '0.75rem', opacity: 0.65 }}>
                        {analyticsData?.totalQueries ?? 0} total recorded queries
                    </span>
                </div>
                <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '20px 0 8px' }}>
                    {trendBars.map((h: number, i: number) => {
                        const count = trendCounts[i] ?? 0;
                        const label = trendLabels[i] ? `${trendLabels[i]} — ` : '';
                        return (
                            <div
                                key={i}
                                title={`${label}${count} ${count === 1 ? 'query' : 'queries'}`}
                                style={{
                                    flex: 1,
                                    height: `${Math.max(h, 3)}%`,
                                    background: count > 0 ? 'var(--brand-accent)' : 'var(--border)',
                                    opacity: count > 0 ? 0.45 + (h / 180) : 0.35,
                                    borderRadius: '4px',
                                    transition: 'height 0.3s ease'
                                }}
                            />
                        );
                    })}
                </div>
                {trendLabels.length === 12 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', opacity: 0.55 }}>
                        <span>{trendLabels[0]}</span>
                        <span>{trendLabels[6]}</span>
                        <span>{trendLabels[11]}</span>
                    </div>
                )}
            </div>

            <div className={styles.workspaceLayout} style={{ padding: 0 }}>
                <div className={styles.workspaceLeft}>
                    <div className={styles.sideCard}>
                        <h4 className={styles.sideTitle}>Index Plan Efficiency</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', border: '8px solid var(--brand-accent)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                                {explainedQueries > 0 ? `${analyticsData?.indexHitRate ?? 0}%` : 'N/A'}
                            </div>
                            <p style={{ opacity: 0.72, fontSize: '0.85rem', lineHeight: 1.5 }}>
                                {explainedQueries === 0
                                    ? 'No EXPLAIN ANALYZE plans recorded yet. Run a SELECT query in Workbench to measure real index vs sequential scan usage.'
                                    : seqScanQueries > 0
                                        ? `${seqScanQueries} of ${explainedQueries} explained queries triggered a Sequential Scan. Add targeted indexes to improve plan efficiency.`
                                        : `All ${explainedQueries} explained queries executed without full-table sequential scans.`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className={styles.workspaceRight} style={{ top: 0 }}>
                    <div className={styles.sideCard}>
                        <h4 className={styles.sideTitle}>Buffer Pool &amp; System Health</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8rem', opacity: 0.85 }}>
                            <div>
                                <strong>Buffer Cache Hit Rate:</strong>{' '}
                                {hasBufferStats && analyticsData?.bufferHitRate !== null && analyticsData?.bufferHitRate !== undefined
                                    ? `${analyticsData.bufferHitRate}% (${totalHitBlocks} hit / ${totalReadBlocks} disk reads)`
                                    : 'No 8KB page reads recorded yet'}
                            </div>
                            <div>
                                <strong>Server Uptime:</strong> {formatUptime(Number(dbStats?.uptime))}
                            </div>
                            {dbStats?.poolStats && (
                                <div>
                                    <strong>pg.Pool:</strong> {dbStats.poolStats.active} active · {dbStats.poolStats.idle} idle · {dbStats.poolStats.waiting} waiting
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {slowQueries.length > 0 && (
                <div className={styles.sideCard} style={{ marginTop: 24 }}>
                    <h4 className={styles.sideTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertOctagon size={16} color="#F59E0B" /> Detailed Latency Breakdown
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles.logsTable} style={{ marginTop: 16 }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '120px' }}>Timestamp</th>
                                    <th style={{ width: '120px' }}>Latency</th>
                                    <th>Query Statement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slowQueries.map((q, i) => (
                                    <tr key={i}>
                                        <td style={{ opacity: 0.6 }}>{q.date}</td>
                                        <td style={{ color: '#F59E0B', fontWeight: 700 }}>{q.time} ms</td>
                                        <td>
                                            <code style={{ fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--bg-page)', padding: '6px 12px', borderRadius: '8px', display: 'block', border: '1px solid var(--border)', maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {q.query}
                                            </code>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TelemetryGrid;
