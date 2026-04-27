'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    BookOpen,
    Zap,
    Database,
    ShieldCheck,
    Cpu,
    Network,
    Code2,
    Info,
    GitBranch,
    Search,
    ChevronRight,
    Terminal
} from 'lucide-react';
import styles from '../docs-styles.module.css';

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('intro');

    // Simple scroll spy behavior
    useEffect(() => {
        const handleScroll = () => {
            const sections = ['intro', 'bridge', 'optimization', 'visualizer', 'telemetry'];
            for (const id of sections.reverse()) {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top < 200) {
                    setActiveSection(id);
                    break;
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={styles.docsContainer}>
            <div className={styles.docsLayout}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <Link href="/" className={styles.backLink}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>

                    <nav className={styles.navGroup}>
                        <div className={styles.navTitle}>Platform Overview</div>
                        <a href="#intro" className={`${styles.navItem} ${activeSection === 'intro' ? styles.navItemActive : ''}`}>
                            Getting Started
                        </a>
                        <a href="#bridge" className={`${styles.navItem} ${activeSection === 'bridge' ? styles.navItemActive : ''}`}>
                            Syntax Bridge (MySQL → PG)
                        </a>
                        <a href="#optimization" className={`${styles.navItem} ${activeSection === 'optimization' ? styles.navItemActive : ''}`}>
                            Optimization Engine
                        </a>
                        <a href="#visualizer" className={`${styles.navItem} ${activeSection === 'visualizer' ? styles.navItemActive : ''}`}>
                            Execution Visualizer
                        </a>
                        <a href="#telemetry" className={`${styles.navItem} ${activeSection === 'telemetry' ? styles.navItemActive : ''}`}>
                            Real-time Telemetry
                        </a>
                    </nav>

                    <div className={styles.navGroup}>
                        <div className={styles.navTitle}>Security</div>
                        <div className={styles.navItem}>Schema Isolation</div>
                        <div className={styles.navItem}>Query Sanitization</div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className={styles.content}>
                    {/* Hero Section */}
                    <header id="intro" className={styles.hero}>
                        <div className={styles.badge}>Documentation</div>
                        <h1>Master your SQL performance.</h1>
                        <p>
                            SQLens is a comprehensive performance analyzer designed to bridge the gap between
                            MySQL development and PostgreSQL infrastructure. Learn how to leverage our AI-driven
                            tools to build faster, more efficient queries.
                        </p>
                    </header>

                    {/* Section: Syntax Bridge */}
                    <section id="bridge" className={styles.section}>
                        <h2><Network size={28} color="var(--brand-pink)" /> The Syntax Bridge</h2>
                        <p className={styles.sectionText}>
                            SQLens allows you to write standard MySQL queries which are then translated in real-time
                            to PostgreSQL. This is powered by a dual-layer translation engine.
                        </p>

                        <div className={styles.card}>
                            <div className={styles.cardIcon}><Code2 size={20} /></div>
                            <h3>Robust AST Parsing</h3>
                            <p>
                                Every query is parsed into an Abstract Syntax Tree (AST) using <strong>node-sql-parser</strong>.
                                This ensures that structural elements like <strong>CTEs (WITH clauses)</strong>, nested subqueries,
                                and complex joins are correctly mapped to their PostgreSQL equivalents without breaking integrity.
                            </p>
                        </div>

                        <div className={styles.codeBlock}>
                            <span className={styles.codeLabel}>Translation Example</span>
                            <pre>
                                <span className={styles.highlight}>-- Original MySQL</span><br />
                                SELECT * FROM users LIMIT 10, 5;<br /><br />
                                <span className={styles.highlight}>-- Translated PostgreSQL</span><br />
                                SELECT * FROM "users" LIMIT 5 OFFSET 10;
                            </pre>
                        </div>

                        <div className={styles.featureGrid}>
                            <div className={styles.card}>
                                <h3>Data Types</h3>
                                <p>Automatically maps <code>AUTO_INCREMENT</code> to <code>SERIAL</code>, <code>TINYINT(1)</code> to <code>BOOLEAN</code>, and handles <code>NOW()</code> vs <code>CURRENT_TIMESTAMP</code>.</p>
                            </div>
                            <div className={styles.card}>
                                <h3>Quoting</h3>
                                <p>Converts MySQL backticks (<code>`</code>) to PostgreSQL double quotes (<code>"</code>) to ensure identifier safety.</p>
                            </div>
                        </div>
                    </section>

                    {/* Section: Optimization */}
                    <section id="optimization" className={styles.section}>
                        <h2><Zap size={28} color="#F59E0B" /> Optimization Engine</h2>
                        <p className={styles.sectionText}>
                            Performance analysis in SQLens happens at two distinct layers, providing both instant
                            feedback and deep structural advice.
                        </p>

                        <div className={styles.featureGrid}>
                            <div className={styles.card}>
                                <div className={styles.cardIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                                    <ShieldCheck size={20} />
                                </div>
                                <h3>Layer 1: Rule-Based</h3>
                                <p>
                                    Runs on every query. Detects anti-patterns like <code>SELECT *</code>,
                                    missing <code>WHERE</code> clauses on deletes, and leading wildcards in <code>LIKE</code>.
                                </p>
                            </div>
                            <div className={styles.card}>
                                <div className={styles.cardIcon}>
                                    <Cpu size={20} />
                                </div>
                                <h3>Layer 2: AI Deep Analysis</h3>
                                <p>
                                    On-demand analysis powered by LLMs. It correlates your SQL text with the
                                    actual <strong>EXPLAIN ANALYZE</strong> plan from the database.
                                </p>
                            </div>
                        </div>
                        <br></br>
                        <div className={styles.infoBox}>
                            <Info size={20} />
                            <div>
                                <strong>Optimization Tip:</strong> Sequential scans (Full Table Scans) are the #1 cause of slow queries.
                                SQLens detects them automatically and suggests the exact <code>CREATE INDEX</code> command to fix them.
                            </div>
                        </div>
                    </section>

                    {/* Section: Visualizer */}
                    <section id="visualizer" className={styles.section}>
                        <h2><GitBranch size={28} color="var(--neon-green)" /> Execution Visualizer</h2>
                        <p className={styles.sectionText}>
                            Forget reading raw JSON explain plans. SQLens generates a high-fidelity visual tree for every SELECT query.
                        </p>

                        <div className={styles.card}>
                            <h3>How to read the tree:</h3>
                            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', fontSize: '0.92rem' }}>
                                <li>
                                    <span className={styles.highlight}>Nodes:</span> Each step represents an operation like a <strong>Hash Join</strong> or <strong>Index Scan</strong>.
                                </li>
                                <li>
                                    <span className={styles.highlight}>Color Coding:</span> Pink nodes are bottlenecks (High Cost), Green nodes are efficient.
                                </li>
                                <li>
                                    <span className={styles.highlight}>Cost Impact:</span> Subtle bars show exactly what % of the query's total time was spent in that branch.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Section: Telemetry */}
                    <section id="telemetry" className={styles.section}>
                        <h2><Terminal size={28} color="#00E4FF" /> Real-time Telemetry</h2>
                        <p className={styles.sectionText}>
                            SQLens doesn't just analyze queries; it watches your database health in real-time.
                        </p>

                        <div className={styles.featureGrid}>
                            <div className={styles.card}>
                                <h3>SSE Streaming</h3>
                                <p>Uses Server-Sent Events to push database metrics (CPU, Connections, Throughput) to the UI without refreshing.</p>
                            </div>
                            <div className={styles.card}>
                                <h3>Slow Query Log</h3>
                                <p>Automatically captures and highlights queries exceeding the 100ms threshold for immediate triage.</p>
                            </div>
                        </div>
                    </section>

                    <footer style={{ padding: '60px 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            &copy; 2026 SQLens Performance Engine. Built for builders.
                        </p>
                    </footer>
                </main>
            </div>
        </div>
    );
}
