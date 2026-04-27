'use client';

import React from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Code2,
    Server,
    Terminal,
    Key,
    Activity,
    Lock,
    Globe,
    Cpu
} from 'lucide-react';
import styles from '../docs-styles.module.css';

export default function ApiDocsPage() {
    return (
        <div className={styles.docsContainer}>
            <div className={styles.docsLayout}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <Link href="/" className={styles.backLink}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>

                    <nav className={styles.navGroup}>
                        <div className={styles.navTitle}>Reference</div>
                        <a href="#auth" className={styles.navItem}>Authentication</a>
                        <a href="#query" className={styles.navItem}>Query Endpoints</a>
                        <a href="#stats" className={styles.navItem}>Telemetry Endpoints</a>
                    </nav>

                    <div className={styles.navGroup}>
                        <div className={styles.navTitle}>SDKs</div>
                        <div className={styles.navItem}>Node.js Client</div>
                        <div className={styles.navItem}>Python Wrapper</div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className={styles.content}>
                    <header className={styles.hero}>
                        <div className={styles.badge}>Developer Hub</div>
                        <h1>API Reference.</h1>
                        <p>
                            Integrate SQLens directly into your infrastructure. Our RESTful API allows you to
                            programmatically analyze queries and pull real-time database health metrics.
                        </p>
                    </header>

                    {/* Section: Auth */}
                    <section id="auth" className={styles.section}>
                        <h2><Lock size={28} color="var(--brand-pink)" /> Authentication</h2>
                        <p className={styles.sectionText}>
                            SQLens uses JWT-based Bearer tokens for all API requests. You must include your token
                            in the <code>Authorization</code> header.
                        </p>

                        <div className={styles.codeBlock}>
                            <span className={styles.codeLabel}>Header Example</span>
                            <pre>
                                Authorization: <span className={styles.highlight}>Bearer &lt;your_jwt_token&gt;</span>
                            </pre>
                        </div>
                    </section>

                    {/* Section: Query Endpoints */}
                    <section id="query" className={styles.section}>
                        <h2><Terminal size={28} color="#F59E0B" /> Query Endpoints</h2>

                        <div className={styles.card} style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0 }}>Execute & Analyze</h3>
                                <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>POST</span>
                            </div>
                            <div className={styles.codeLabel}>Endpoint</div>
                            <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>/api/query/run</pre>
                            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                                Submits a MySQL query for translation and execution. Returns raw results,
                                execution time, and initial rule-based suggestions.
                            </p>
                        </div>

                        <div className={styles.card}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0 }}>AI Deep Optimization</h3>
                                <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>POST</span>
                            </div>
                            <div className={styles.codeLabel}>Endpoint</div>
                            <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>/api/query/ai-optimize</pre>
                            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                                Forwards the execution plan to the AI layer. Returns a JSON object with scores,
                                improvement tips, and optimized SQL code.
                            </p>
                        </div>
                    </section>

                    {/* Section: Telemetry */}
                    <section id="stats" className={styles.section}>
                        <h2><Activity size={28} color="#00E4FF" /> Telemetry Endpoints</h2>

                        <div className={styles.infoBox} style={{ marginBottom: '24px' }}>
                            <Globe size={20} />
                            <div>
                                <strong>Streaming Node:</strong> The Telemetry Stream uses Server-Sent Events (SSE)
                                for low-latency updates.
                            </div>
                        </div>

                        <div className={styles.card}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0 }}>Stats Stream</h3>
                                <span style={{ background: 'rgba(0, 228, 255, 0.1)', color: '#00E4FF', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>SSE</span>
                            </div>
                            <div className={styles.codeLabel}>Endpoint</div>
                            <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>/api/stats/stream</pre>
                            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                                Opens a persistent connection that streams database throughput, average latency,
                                and connection pool status every 2 seconds.
                            </p>
                        </div>
                    </section>

                    <footer style={{ padding: '60px 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            &copy; 2026 SQLens Developer Platform.
                        </p>
                    </footer>
                </main>
            </div>
        </div>
    );
}
