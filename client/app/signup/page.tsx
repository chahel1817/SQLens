'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2, AlertCircle, Mail, Lock, Check, Zap, Shield, BarChart3, Eye, EyeOff } from 'lucide-react';
import styles from '../auth.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const router = useRouter();

    // ── Live validation rules ──
    const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

    const rules = useMemo(() => [
        { id: 'len', label: 'Min 6 characters', passed: password.length >= 6 },
        { id: 'upper', label: '1 uppercase letter', passed: /[A-Z]/.test(password) },
        { id: 'special', label: '1 special character', passed: /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/]/.test(password) },
        { id: 'number', label: '1 number', passed: /\d/.test(password) },
    ], [password]);

    const allRulesPassed = rules.every(r => r.passed);
    const formValid = emailValid && allRulesPassed && email.length > 0;

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formValid) return;

        setIsLoading(true);
        setError(null);

        try {
            // 1. Create account
            const signupRes = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const signupData = await signupRes.json();
            if (!signupRes.ok) throw new Error(signupData.message || 'Signup failed');

            // 2. Show success and redirect to login
            setIsSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 3000);
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
                        Optimize your SQL.<br /><span>10x faster.</span>
                    </h1>
                    <p className={styles.brandDesc}>
                        Your private SQL sandbox with real-time performance analysis and intelligent optimization suggestions.
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
                        <h2 className={styles.formTitle}>Create your account</h2>
                        <p className={styles.formSub}>Start analyzing query performance in seconds.</p>
                    </div>

                    {isSuccess ? (
                        <div className={styles.alertSuccess} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--neon-green)' }}>
                            <div style={{ background: 'rgba(0, 228, 255, 0.1)', padding: '16px', borderRadius: '50%' }}>
                                <Check size={40} color="var(--neon-green)" />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.2rem' }}>Account Created!</h3>
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontSize: '0.9rem' }}>
                                Your private SQL sandbox is ready. Redirecting to login...
                            </p>
                        </div>
                    ) : (
                    <>
                    {error && (
                        <div className={styles.alertError}>
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    <form className={styles.form} onSubmit={handleSignup}>
                        {/* Email */}
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

                        {/* Password */}
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Password</label>
                            <div className={styles.inputWrap}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className={`${styles.input} ${password.length > 0 ? (allRulesPassed ? styles.inputValid : styles.inputError) : ''}`}
                                    placeholder="Create a strong password"
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

                        {/* Password Rules */}
                        {password.length > 0 && (
                            <div className={styles.rulesBox}>
                                <div className={styles.rulesTitle}>Password Requirements</div>
                                <div className={styles.rulesList}>
                                    {rules.map(r => (
                                        <div key={r.id} className={`${styles.rule} ${r.passed ? styles.rulePassed : ''}`}>
                                            <div className={styles.ruleIcon}>
                                                {r.passed && <Check size={10} strokeWidth={3} />}
                                            </div>
                                            {r.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button type="submit" className={styles.submitBtn} disabled={isLoading || !formValid}>
                            {isLoading ? <Loader2 className={styles.spinner} size={20} /> : <UserPlus size={20} />}
                            {isLoading ? 'Provisioning Sandbox...' : 'Create Account'}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        Already have an account?{' '}
                        <Link href="/login" className={styles.link}>Sign in</Link>
                    </div>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}
