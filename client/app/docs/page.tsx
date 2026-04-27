import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Zap, Database } from 'lucide-react';

export const metadata = {
    title: 'Documentation | SQLens',
    description: 'Official documentation for SQLens Performance Analyzer',
};

export default function DocsPage() {
    return (
        <div style={{ minHeight: '100vh', padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--brand-accent)', textDecoration: 'none', marginBottom: '40px', fontWeight: 500 }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            <header style={{ marginBottom: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '20px' }}>
                    <BookOpen color="var(--brand-accent)" />
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>Documentation</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Learn how to maximize your database efficiency using SQLens. Our advanced tools help you analyze, optimize, and secure your SQL queries.
                </p>
            </header>

            <div style={{ display: 'grid', gap: '24px' }}>
                <section style={{ padding: '32px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', marginBottom: '16px' }}>
                        <Database size={24} color="var(--brand-accent)" /> Query Sandboxes
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        SQLens automatically provisions an isolated PostgreSQL schema for every user. You can safely run destructive queries (like <code>DROP</code> or <code>DELETE</code>) without impacting other tenants or production data.
                    </p>
                </section>

                <section style={{ padding: '32px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', marginBottom: '16px' }}>
                        <Zap size={24} color="#F59E0B" /> AI Optimization
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Our Deep AI Analysis reads your query execution plans (using <code>EXPLAIN ANALYZE</code>) and suggests performance improvements. It detects full-table scans, missing indexes, and costly aggregations automatically.
                    </p>
                </section>

                <section style={{ padding: '32px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', marginBottom: '16px' }}>
                        <Clock size={24} color="#00E4FF" /> Real-time Telemetry
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Connect safely to your local or remote database node. SQLens streams index hit rates, connections, throughput, and slow queries directly into your dashboard via Server-Sent Events (SSE).
                    </p>
                </section>
            </div>
        </div>
    );
}
