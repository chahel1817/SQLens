'use client';

import React from 'react';
import {
    AlertTriangle,
    AlertCircle,
    Info,
    ArrowRight,
    Check,
    Sparkles,
    Loader2,
    Zap
} from 'lucide-react';
import styles from '../app/page.module.css';
import { AiResult, Suggestion } from './types';

interface InsightPanelProps {
    suggestions: Suggestion[];
    isAiLoading: boolean;
    handleAiOptimize: () => void;
    aiResult: AiResult | null;
    applyFix: (fix: string) => void;
}

const InsightPanel: React.FC<InsightPanelProps> = ({
    suggestions,
    isAiLoading,
    handleAiOptimize,
    aiResult,
    applyFix
}) => {
    return (
        <div className={styles.suggestList}>
            {suggestions.length > 0 ? suggestions.map((s, i) => (
                <div key={i} className={`${styles.suggestCard} ${s.type === 'CRITICAL' ? styles.suggestCritical : s.type === 'WARNING' ? styles.suggestWarning : styles.suggestInfo}`}>
                    <div className={styles.suggestIcon}>
                        {s.type === 'CRITICAL' ? <AlertTriangle size={20} /> : s.type === 'WARNING' ? <AlertCircle size={20} /> : <Info size={20} />}
                    </div>
                    <div className={styles.suggestContent}>
                        <div className={styles.suggestTop}>
                            <span className={styles.suggestLabel}>{s.type}</span>
                            <h5>{s.message}</h5>
                        </div>
                        {aiResult ? (
                            <>
                                <p>{s.improvement}</p>
                                {s.fix && (
                                    <button
                                        className={styles.suggestAction}
                                        onClick={() => applyFix(s.fix!)}
                                        style={{ border: '1px solid var(--brand-pink)' }}
                                    >
                                        <Zap size={14} style={{ fill: 'currentColor' }} />
                                        {/CREATE|ALTER|INDEX/i.test(s.fix) ? 'Auto-Execute Index Fix' : 'Auto-Rewrite Query'}
                                        <ArrowRight size={14} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className={styles.lockedText}>
                                <Sparkles size={12} style={{ marginRight: 4 }} />
                                Analysis identifies a {s.type.toLowerCase()} issue. Run <strong>Deep AI Analysis</strong> to unlock the fix.
                            </p>
                        )}
                    </div>
                </div>
            )) : (
                <div className={styles.cleanState}>
                    <Check size={32} color="#22C55E" />
                    <p>No optimization issues detected. This query is performing at peak efficiency.</p>
                </div>
            )}

            <div className={styles.aiSection}>
                <button className={styles.aiBtn} onClick={handleAiOptimize} disabled={isAiLoading}>
                    {isAiLoading ? <><Loader2 size={16} className={styles.spin} /> AI Engine Active...</> : <><Sparkles size={16} /> Deep AI Analysis</>}
                </button>
            </div>

            {aiResult && !aiResult.error && (
                <div className={styles.aiCard}>
                    <div className={styles.aiHeader}>
                        <Sparkles size={16} /> Analysis Rating: <span>{aiResult.rating || 'Optimized'}</span>
                    </div>
                    {aiResult.summary && <p className={styles.aiSummary}>{aiResult.summary}</p>}
                    {aiResult.tips?.map((tip, i) => (
                        <div key={i} className={styles.aiTip}>
                            <strong>{tip.title}</strong>
                            <p>{tip.detail}</p>
                            {tip.fix && (
                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <pre className={styles.aiCode}>{tip.fix}</pre>
                                    <button
                                        className={styles.suggestAction}
                                        onClick={() => applyFix(tip.fix!)}
                                        style={{ width: 'fit-content', border: '1px solid var(--neon-green)', background: 'rgba(34, 197, 94, 0.05)' }}
                                    >
                                        <Zap size={14} style={{ fill: 'currentColor', color: 'var(--neon-green)' }} />
                                        Apply AI Suggestion
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {aiResult?.error && (
                <div className={styles.aiError}>
                    <AlertCircle size={16} />
                    <span>{aiResult.error}</span>
                </div>
            )}
        </div>
    );
};

export default InsightPanel;
