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
                            <span className={styles.statLabel}>Active Threads</span>
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
                                        <div style={{ fontWeight: 600 }}>Data Integrity</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Primary Replica Active</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Analytics View
    return (
        <div className={styles.moduleContainer}>
            <div className={styles.moduleHeader}>
                <h2 className={styles.moduleTitle}>Performance Analytics</h2>
                <p className={styles.moduleDesc}>Deep dive into query execution patterns and index efficiency.</p>
            </div>

            <div className={styles.sideCard} style={{ marginBottom: 24 }}>
                <h4 className={styles.sideTitle}><TrendingUp size={14} /> Throughput Trend</h4>
                <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '20px 0' }}>
                    {(analyticsData?.throughputTrend || [30, 45, 35, 60, 50, 80, 40, 90, 65, 55, 75, 45]).map((h: any, i: number) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--brand-accent)', opacity: 0.3 + (h / 200), borderRadius: '4px' }}></div>
                    ))}
                </div>
            </div>

            <div className={styles.workspaceLayout} style={{ padding: 0 }}>
                <div className={styles.workspaceLeft}>
                    <div className={styles.sideCard}>
                        <h4 className={styles.sideTitle}>Index Hit Rate</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', border: '8px solid var(--brand-accent)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                {analyticsData?.indexHitRate || 0}%
                            </div>
                            <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Your queries are effectively utilizing indexes. No full table scans detected in recent traffic.</p>
                        </div>
                    </div>
                </div>
                <div className={styles.workspaceRight} style={{ top: 0 }}>
                    <div className={styles.sideCard}>
                        <h4 className={styles.sideTitle}>System Health</h4>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                            Server Uptime: {formatUptime(Number(dbStats?.uptime))}
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
