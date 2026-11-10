'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    LogIn,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Check,
    Mail,
    Lock,
    Zap,
    Shield,
    BarChart3,
    Eye,
    EyeOff,
    Server
} from 'lucide-react';
import styles from '../auth.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type AuthPhase = 'idle' | 'authenticating' | 'waking' | 'mounting';
type EngineStatus = 'checking' | 'ready' | 'waking';

const WAIT_TIPS = [
    'Composite B+Tree indexes follow the leftmost-prefix rule — column order in CREATE INDEX determines which queries can use it.',
    'PostgreSQL MVCC keeps readers from blocking writers by checking tuple transaction visibility (xmin/xmax) per snapshot.',
    'Replacing deep OFFSET pagination with keyset (cursor) pagination turns O(N) scans into O(log N) index seeks.',
    'SQLens isolates every user in a dedicated PostgreSQL schema via transactional SET search_path.',
    'Covering indexes enable Index-Only Scans, avoiding extra heap page reads from the buffer pool.',
];

function persistSession(token: string, user?: unknown) {
    localStorage.setItem('sqlens_token', token);
    if (user) {
        localStorage.setItem('sqlens_user', JSON.stringify(user));
    }

    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `sqlens_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=86400${secure}`;
}

async function fetchWithColdStartRetry(url: string, options: RequestInit, onRetry?: () => void): Promise<Response> {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 35000);

        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            window.clearTimeout(timeoutId);

            // Retry transient gateway errors while Render wakes from cold sleep
            if ([502, 503, 504].includes(res.status) && attempt < maxAttempts) {
                onRetry?.();
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue;
            }

            return res;
        } catch (err) {
            window.clearTimeout(timeoutId);
            if (attempt < maxAttempts) {
                onRetry?.();
                await new Promise((resolve) => setTimeout(resolve, 1500));
                continue;
            }
            throw err;
        }
    }

    throw new Error('Server took too long to wake up. Please try again.');
}

function LoginContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [authPhase, setAuthPhase] = useState<AuthPhase>('idle');
    const [engineStatus, setEngineStatus] = useState<EngineStatus>('checking');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [tipIndex, setTipIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const successMsg = searchParams.get('message');

    const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
    const isBusy = authPhase !== 'idle';

    // Pre-warm the backend and prefetch the dashboard route while the user types credentials
    useEffect(() => {
        router.prefetch('/dashboard');

        const controller = new AbortController();
        const slowWakeTimer = window.setTimeout(() => {
            setEngineStatus((prev) => (prev === 'checking' ? 'waking' : prev));
        }, 1200);

        fetch(`${API_URL}/`, { method: 'GET', cache: 'no-store', signal: controller.signal })
            .then((res) => {
                if (res.ok) setEngineStatus('ready');
            })
            .catch(() => {
                // Keep quiet while server wakes or retries on submit
            })
            .finally(() => {
                window.clearTimeout(slowWakeTimer);
            });

        return () => {
            window.clearTimeout(slowWakeTimer);
            controller.abort();
        };
    }, [router]);

    // Track elapsed wait time, cold-start messaging, and rotating tips while waiting
    useEffect(() => {
        if (!isBusy) return;

        const start = Date.now();
        const tick = window.setInterval(() => {
            const secs = Math.floor((Date.now() - start) / 1000);
            setElapsedSeconds(secs);
            if (secs >= 3) {
                setAuthPhase((prev) => (prev === 'authenticating' ? 'waking' : prev));
            }
        }, 250);

        const tipTimer = window.setInterval(() => {
            setTipIndex((prev) => (prev + 1) % WAIT_TIPS.length);
        }, 4000);

        return () => {
            window.clearInterval(tick);
            window.clearInterval(tipTimer);
        };
    }, [isBusy]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailValid || password.length < 1 || isBusy) return;

        setElapsedSeconds(0);
        setAuthPhase(engineStatus === 'waking' ? 'waking' : 'authenticating');
        setError(null);

        try {
            const res = await fetchWithColdStartRetry(
                `${API_URL}/api/auth/login`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                },
                () => setAuthPhase('waking')
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || data.message || 'Invalid email or password');

            setEngineStatus('ready');
            setAuthPhase('mounting');
            persistSession(data.token, data.user);

            // Replace current page directly after persisting cookie so the loading screen
            // stays visible until the dashboard document responds and mounts.
            window.location.replace('/dashboard');
        } catch (err: unknown) {
            setAuthPhase('idle');
            if (err instanceof Error && err.name === 'AbortError') {
                setError('Cloud server cold start timed out. Please click Sign In once more — the engine is now warm.');
            } else {
                setError(err instanceof Error ? err.message : 'Unable to sign in');
            }
        }
    };

    const progressPercent =
        authPhase === 'mounting' ? 92 : authPhase === 'waking' ? Math.min(35 + elapsedSeconds * 4, 80) : 45;

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
                    <div className={styles.enginePill}>
                        <span
                            className={`${styles.engineDot} ${engineStatus === 'ready' ? styles.engineDotOnline : styles.engineDotWaking}`}
                        />
                        <Server size={13} />
                        {engineStatus === 'ready'
                            ? 'SQL Engine Online'
                            : engineStatus === 'waking'
                                ? 'Warming up cloud SQL engine...'
                                : 'Checking SQL engine status...'}
                    </div>

                    <div className={styles.formHeader}>
                        <h2 className={styles.formTitle}>{isBusy ? 'Preparing your workspace' : 'Welcome back'}</h2>
                        <p className={styles.formSub}>
                            {isBusy
                                ? 'Hold tight — we are keeping your session ready while your dashboard loads.'
                                : 'Sign in to continue to your workspace.'}
                        </p>
                    </div>

                    {isBusy ? (
                        <div className={styles.launchCard} aria-live="polite">
                            <div className={styles.launchHeader}>
                                <div className={styles.launchIconWrap}>
                                    <Loader2 className={styles.spinner} size={22} />
                                </div>
                                <div>
                                    <h3 className={styles.launchTitle}>
                                        {authPhase === 'mounting'
                                            ? 'Opening SQLens Dashboard...'
                                            : authPhase === 'waking'
                                                ? 'Waking up SQLens Cloud Engine...'
                                                : 'Verifying credentials...'}
                                    </h3>
                                    <p className={styles.launchSub}>
                                        Elapsed: {elapsedSeconds}s {authPhase === 'mounting' ? '• Redirecting now' : ''}
                                    </p>
                                </div>
                            </div>

                            <div className={styles.launchProgressTrack}>
                                <div className={styles.launchProgressBar} style={{ width: `${progressPercent}%` }} />
                            </div>

                            <div className={styles.launchSteps}>
                                <div
                                    className={`${styles.launchStep} ${authPhase === 'mounting' ? styles.launchStepDone : styles.launchStepActive}`}
                                >
                                    {authPhase === 'mounting' ? <Check size={15} /> : <Loader2 size={15} className={styles.spinner} />}
                                    <span>1. Connect to SQLens API &amp; PostgreSQL pool</span>
                                </div>
                                <div
                                    className={`${styles.launchStep} ${authPhase === 'mounting' ? styles.launchStepDone : authPhase === 'authenticating' ? styles.launchStepActive : ''}`}
                                >
                                    {authPhase === 'mounting' ? <Check size={15} /> : <Loader2 size={15} className={styles.spinner} />}
                                    <span>2. Authenticate &amp; load isolated schema</span>
                                </div>
                                <div className={`${styles.launchStep} ${authPhase === 'mounting' ? styles.launchStepActive : ''}`}>
                                    {authPhase === 'mounting' ? <Loader2 size={15} className={styles.spinner} /> : <span style={{ width: 15 }} />}
                                    <span>3. Launch interactive dashboard &amp; live telemetry</span>
                                </div>
                            </div>

                            {(authPhase === 'waking' || elapsedSeconds >= 3) && authPhase !== 'mounting' && (
                                <div className={styles.launchColdNote}>
                                    Free-tier cloud servers go idle after inactivity. Cold start usually takes 10–25 seconds — please stay on this page while we connect.
                                </div>
                            )}

                            <div className={styles.launchTipBox}>
                                <span className={styles.launchTipLabel}>Database Engineering Note</span>
                                {WAIT_TIPS[tipIndex]}
                            </div>
                        </div>
                    ) : (
                        <>
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
                                            type={showPassword ? 'text' : 'password'}
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

                                <button type="submit" className={styles.submitBtn} disabled={!emailValid || password.length < 1}>
                                    <LogIn size={20} />
                                    Sign In
                                </button>
                            </form>

                            <div className={styles.footer}>
                                Don&apos;t have an account?{' '}
                                <Link href="/signup" className={styles.link}>Create one free</Link>
                            </div>
                        </>
                    )}
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
