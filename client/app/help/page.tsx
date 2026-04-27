import React from 'react';
import Link from 'next/link';
import { ArrowLeft, LifeBuoy, Mail, MessageSquare } from 'lucide-react';

export const metadata = {
    title: 'Help Center | SQLens',
    description: 'Get support for SQLens',
};

export default function HelpPage() {
    return (
        <div style={{ minHeight: '100vh', padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--brand-accent)', textDecoration: 'none', marginBottom: '40px', fontWeight: 500 }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            <header style={{ marginBottom: '40px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '20px' }}>
                    <LifeBuoy size={32} color="var(--brand-accent)" />
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>How can we help?</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '500px', margin: '0 auto' }}>
                    Find answers, troubleshooting tips, and contact our support team.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <a href="mailto:support@sqlens.vercel.app" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ padding: '32px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <Mail size={32} color="var(--text-main)" style={{ marginBottom: '16px' }} />
                        <h3 style={{ marginBottom: '12px' }}>Email Support</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Reach out to our engineering team directly for technical inquiries.</p>
                    </div>
                </a>

                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ padding: '32px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <MessageSquare size={32} color="var(--text-main)" style={{ marginBottom: '16px' }} />
                        <h3 style={{ marginBottom: '12px' }}>Community Discord</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Join our community of DB developers and share your knowledge.</p>
                    </div>
                </a>
            </div>

            <div style={{ marginTop: '48px', padding: '32px', background: 'var(--bg-header)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: '24px', fontSize: '1.4rem' }}>Frequently Asked Questions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>Why are my queries taking so long?</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>Use the Workbench and check the 'Explain' tab. SQLens will highlight slow scans and recommend index fixes.</p>
                    </div>
                    <div>
                        <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>Is my data secure?</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>Yes, every account is provisioned a completely isolated database schema. User A cannot access User B's tables.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
