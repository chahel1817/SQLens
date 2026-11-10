'use client';

import React, { useState } from 'react';
import {
    Code2,
    ArrowRightLeft,
    Cpu,
    HardDrive,
    AlertTriangle,
    CheckCircle2,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    Zap,
    GitMerge,
    Search
} from 'lucide-react';
import styles from '../app/page.module.css';
import { QueryResult } from './types';

interface PipelineViewProps {
    result: QueryResult | null;
    onRunFix: (sql: string) => void;
}

const PipelineView: React.FC<PipelineViewProps> = ({ result, onRunFix }) => {
    const [showAst, setShowAst] = useState(true);
    const [copiedAst, setCopiedAst] = useState(false);

    if (!result || !result.pipeline) {
        return (
            <div className={styles.emptyStateContainer}>
                <Cpu size={36} opacity={0.3} />
                <p>Run a query to inspect its 4-stage Parser → Planner → Optimizer → Executor pipeline.</p>
            </div>
        );
    }

    const { pipeline, metrics, explainPlan } = result;
    const rootCost = explainPlan?.[0]?.Plan?.['Total Cost'];
    const joins = metrics?.joinAlgorithms || [];
    const scans = metrics?.scanMethods || [];
    const misestimations = metrics?.misestimations || [];

    const totalBlocks = (metrics?.sharedHitBlocks || 0) + (metrics?.sharedReadBlocks || 0);
    const hitPct = metrics?.bufferHitRate ?? (totalBlocks > 0 ? Math.round(((metrics?.sharedHitBlocks || 0) / totalBlocks) * 100) : null);

    const astText = pipeline.ast ? JSON.stringify(pipeline.ast, null, 2) : null;

    const copyAst = () => {
        if (!astText) return;
        navigator.clipboard.writeText(astText);
        setCopiedAst(true);
        setTimeout(() => setCopiedAst(false), 1800);
    };

    const cardBoxStyle: React.CSSProperties = {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 16,
    };

    const stageLabelStyle: React.CSSProperties = {
        fontSize: '0.7rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.7px',
        color: 'var(--brand-accent)',
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 4-Stage Pipeline Summary Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                <div style={cardBoxStyle}>
                    <div style={stageLabelStyle}><Code2 size={13} /> 1. Parser (AST)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {pipeline.astMode === 'ast'
                            ? 'node-sql-parser AST'
                            : pipeline.astMode === 'meta'
                                ? 'Catalog Meta Command'
                                : 'Regex Fallback'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {pipeline.statementTypes.length > 0 ? pipeline.statementTypes.join(', ') : 'SQL'}
                        {pipeline.tables.length > 0 ? ` · ${pipeline.tables.join(', ')}` : ''}
                    </div>
                </div>

                <div style={cardBoxStyle}>
                    <div style={stageLabelStyle}><ArrowRightLeft size={13} /> 2. Translator</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        MySQL → PostgreSQL
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {pipeline.dialectTransforms.length > 0
                            ? `${pipeline.dialectTransforms.length} dialect rewrite${pipeline.dialectTransforms.length > 1 ? 's' : ''}`
                            : '1:1 compatible syntax'}
                    </div>
                </div>

                <div style={cardBoxStyle}>
                    <div style={stageLabelStyle}><Cpu size={13} /> 3. Planner &amp; Optimizer</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {metrics?.planningTimeMs !== null && metrics?.planningTimeMs !== undefined
                            ? `${metrics.planningTimeMs.toFixed(2)}ms`
                            : rootCost !== undefined
                                ? `Cost ${rootCost}`
                                : 'Non-EXPLAIN DDL'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {rootCost !== undefined ? `Estimated Cost: ${rootCost}` : 'Schema / command statement'}
                    </div>
                </div>

                <div style={cardBoxStyle}>
                    <div style={stageLabelStyle}><HardDrive size={13} /> 4. Executor &amp; Buffers</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {metrics?.executionTimeMs !== null && metrics?.executionTimeMs !== undefined
                            ? `${metrics.executionTimeMs.toFixed(2)}ms`
                            : result.executionTime}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {hitPct !== null
                            ? `${hitPct}% RAM buffer hit (${metrics?.sharedHitBlocks || 0} hit · ${metrics?.sharedReadBlocks || 0} disk)`
                            : '0 × 8KB buffer pages recorded'}
                    </div>
                </div>
            </div>

            {/* Row Misestimation (>10x Skew) Alert Section */}
            {misestimations.length > 0 && (
                <div style={{ ...cardBoxStyle, borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F59E0B', fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>
                        <AlertTriangle size={16} /> Cost-Based Optimizer Misestimation (&gt;10× Row Skew)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {misestimations.map((m, idx) => (
                            <div key={idx} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: '0.82rem' }}>
                                <div>
                                    <strong>{m.relation || m.nodeType}</strong>: planner estimated{' '}
                                    <code>{m.planRows}</code> rows, executor saw{' '}
                                    <code>{m.actualRows}</code> rows ({m.ratio}× {m.direction}). Stale <code>pg_statistic</code> histograms can make the planner choose the wrong join or scan.
                                </div>
                                {m.relation && (
                                    <button
                                        className={styles.suggestAction}
                                        onClick={() => onRunFix(`ANALYZE ${m.relation};`)}
                                        style={{ border: '1px solid #F59E0B', padding: '6px 12px' }}
                                    >
                                        <Zap size={13} /> Run ANALYZE {m.relation}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Join Algorithms & Scan Operators */}
            {(joins.length > 0 || scans.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                    <div style={cardBoxStyle}>
                        <div style={stageLabelStyle}><GitMerge size={13} /> Join Algorithms Selected</div>
                        {joins.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {joins.map((j, idx) => (
                                    <div key={idx} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-page)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{j.nodeType}</span>
                                            <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                                                {j.rows} rows · cost {j.cost}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--text-secondary)' }}>{j.strategy}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                No joins in this query plan. Try a JOIN query to inspect Nested Loop vs Hash Join vs Merge Join selection.
                            </p>
                        )}
                    </div>

                    <div style={cardBoxStyle}>
                        <div style={stageLabelStyle}><Search size={13} /> Access / Scan Methods &amp; 8KB Buffer I/O</div>
                        {scans.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {scans.map((s, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                        <div>
                                            <strong style={{ color: s.nodeType === 'Seq Scan' ? '#F59E0B' : '#22C55E' }}>{s.nodeType}</strong>
                                            {s.relation && <span style={{ opacity: 0.8 }}> on {s.relation}</span>}
                                            {s.indexName && <span style={{ opacity: 0.7 }}> ({s.indexName})</span>}
                                        </div>
                                        <span style={{ opacity: 0.7 }}>{s.rows} rows</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                No table scan nodes recorded.
                            </p>
                        )}
                        {totalBlocks > 0 && (
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span>Shared Buffers: {metrics?.sharedHitBlocks} RAM hit ({((metrics?.sharedHitBlocks || 0) * 8)} KB)</span>
                                    <span>{metrics?.sharedReadBlocks} disk read ({((metrics?.sharedReadBlocks || 0) * 8)} KB)</span>
                                </div>
                                <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'rgba(245, 158, 11, 0.25)', overflow: 'hidden' }}>
                                    <div style={{ width: `${hitPct ?? 0}%`, height: '100%', background: '#22C55E' }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Side-by-side Dialect Rewriter Output */}
            <div style={cardBoxStyle}>
                <div style={stageLabelStyle}><ArrowRightLeft size={13} /> Rewriter Output (MySQL Input → Compiled PostgreSQL)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 8 }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.65, marginBottom: 6 }}>Original MySQL Input</div>
                        <pre style={{ margin: 0, padding: 12, borderRadius: 10, background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: '0.78rem', overflowX: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                            {pipeline.rawQuery}
                        </pre>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.65, marginBottom: 6 }}>Compiled PostgreSQL</div>
                        <pre style={{ margin: 0, padding: 12, borderRadius: 10, background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: '0.78rem', overflowX: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                            {pipeline.translatedQuery}
                        </pre>
                    </div>
                </div>
                {pipeline.dialectTransforms.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {pipeline.dialectTransforms.map((t, idx) => (
                            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', padding: '4px 10px', borderRadius: 999, background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                                <CheckCircle2 size={12} /> {t}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Interactive AST Tree Viewer */}
            <div style={cardBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={() => setShowAst(!showAst)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.84rem', padding: 0 }}
                    >
                        {showAst ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        Parsed Abstract Syntax Tree (AST)
                    </button>
                    {astText && (
                        <button type="button" className={styles.copyBtn} onClick={copyAst}>
                            {copiedAst ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                            {copiedAst ? 'Copied AST' : 'Copy AST'}
                        </button>
                    )}
                </div>

                {showAst && (
                    <div style={{ marginTop: 10 }}>
                        {astText ? (
                            <pre style={{ margin: 0, maxHeight: 280, overflow: 'auto', padding: 12, borderRadius: 10, background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: '0.76rem', fontFamily: "'JetBrains Mono', monospace" }}>
                                {astText}
                            </pre>
                        ) : (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {pipeline.parseError
                                    ? `Handled via regex/catalog bridge (${pipeline.parseError}).`
                                    : 'Catalog meta command — translated directly to PostgreSQL information_schema.'}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PipelineView;
