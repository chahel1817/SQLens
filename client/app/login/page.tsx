'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Loader2, AlertCircle, CheckCircle2, Mail, Lock, Zap, Shield, BarChart3, Eye, EyeOff } from 'lucide-react';
import styles from '../auth.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function LoginContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();

    const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

    useEffect(() => {
        const msg = searchParams.get('message');
        if (msg) setSuccessMsg(msg);
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailValid || password.length < 1) return;

        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Invalid email or password');

            localStorage.setItem('sqlens_token', data.token);
            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.authPage}>
            {/* ── LEFT BRAND PANEL ── */}
            <div className={styles.brandPanel}>
                <div className={styles.brandContent}>
                    <Image src="/SQLens.png" alt="SQLens" width={72} height={72} className={styles.brandLogo} />
                    <h1 className={styles.brandTitle}>
                        See your SQL<br /><span>like never before.</span>
                    </h1>
                    <p className={styles.brandDesc}>
                        Write queries, analyze execution plans, and get intelligent optimization suggestions — all in one workspace.
                    </p>
                    <div className={styles.brandFeatures}>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}><Zap size={18} /></div>
                            Real-time EXPLAIN ANALYZE breakdown
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}><Shield size={18} /></div>
                            Isolated sandbox per user — your data stays private
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}><BarChart3 size={18} /></div>
                            Actionable optimization suggestions
                        </div>
                    </div>
                </div>
            </div>

            {/* ── RIGHT FORM PANEL ── */}
            <div className={styles.formPanel}>
                <div className={styles.formCard}>
                    <div className={styles.formHeader}>
                        <h2 className={styles.formTitle}>Welcome back</h2>
                        <p className={styles.formSub}>Sign in to continue to your workspace.</p>
                    </div>

                    {successMsg && (
                        <div className={styles.alertSuccess}>
                            <CheckCircle2 size={18} /> {successMsg}
                        </div>
                    )}

                    {error && (
                        <div className={styles.alertError}>
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    <form className={styles.form} onSubmit={handleLogin}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Email address</label>
                            <div className={styles.inputWrap}>
                                <input
                                    type="email"
                                    className={`${styles.input} ${email.length > 0 ? (emailValid ? styles.inputValid : styles.inputError) : ''}`}
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <Mail size={16} className={styles.inputIcon} />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Password</label>
                            <div className={styles.inputWrap}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className={styles.input}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <Lock size={16} className={styles.inputIcon} />
                                <button
                                    type="button"
                                    className={styles.eyeBtn}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={isLoading || !emailValid || password.length < 1}>
                            {isLoading ? <Loader2 className={styles.spinner} size={20} /> : <LogIn size={20} />}
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className={styles.link}>Create one free</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Login() {
    return (
        <Suspense fallback={<div className={styles.authPage} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Loader2 className={styles.spinner} size={32} /></div>}>
            <LoginContent />
        </Suspense>
    );
}
