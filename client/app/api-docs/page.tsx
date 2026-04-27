import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Code2, Server } from 'lucide-react';

export const metadata = {
    title: 'API Reference | SQLens',
    description: 'API Documentation for SQLens',
};

export default function ApiDocsPage() {
    return (
        <div style={{ minHeight: '100vh', padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--brand-accent)', textDecoration: 'none', marginBottom: '40px', fontWeight: 500 }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            <header style={{ marginBottom: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '20px' }}>
                    <Code2 color="var(--brand-accent)" />
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>API Reference</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Integrate SQLens directly into your CI/CD pipelines or internal tools using our RESTful API.
                </p>
            </header>

            <div style={{ display: 'grid', gap: '24px' }}>
                <div style={{ padding: '32px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.3rem' }}>Execute Query</h3>
                        <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800 }}>POST</span>
                    </div>
                    <code style={{ display: 'block', background: 'var(--bg-header)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                        /api/query/run
                    </code>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Executes a query inside the authenticated user's isolated sandbox and returns the result schema, rows, and execution time.</p>
                </div>

                <div style={{ padding: '32px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.3rem' }}>Deep Optimize</h3>
                        <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800 }}>POST</span>
                    </div>
                    <code style={{ display: 'block', background: 'var(--bg-header)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                        /api/query/ai-optimize
                    </code>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Submits an execution plan to the AI engine for scoring and returns actionable optimizations.</p>
                </div>

                <div style={{ padding: '32px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1.3rem' }}>Telemetry Stream</h3>
                        <span style={{ background: 'rgba(0, 228, 255, 0.1)', color: '#00E4FF', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800 }}>SSE</span>
                    </div>
                    <code style={{ display: 'block', background: 'var(--bg-header)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                        /api/stats/stream
                    </code>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Initializes a Server-Sent Events (SSE) connection streaming real-time statistics including QPS and active threads.</p>
                </div>
            </div>
        </div>
    );
}
