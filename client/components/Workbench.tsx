'use client';

import React, { useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
    ZapIcon,
    Play,
    Database,
    History,
    Copy,
    Check,
    Terminal,
    Settings,
    ChevronRight,
    Search,
    BookOpen
} from 'lucide-react';
import styles from '../app/page.module.css';
import { QueryResult } from './types';
import VisualPlan from './VisualPlan';

interface WorkbenchProps {
    query: string;
    setQuery: (val: string) => void;
    isExecuting: boolean;
    handleRun: () => void;
    theme: string;
    editorRef: React.MutableRefObject<any>;
    handleEditorDidMount: (editor: any, monaco: any) => void;
    result: QueryResult | null;
    error: string | null;
    activeResultTab: 'results' | 'plan' | 'suggestions';
    setActiveResultTab: (tab: 'results' | 'plan' | 'suggestions') => void;
    copyResults: () => void;
    copied: boolean;
    templates: { label: string; query: string; icon: string }[];
    loadTemplate: (sql: string) => void;
    history: string[];
    resultsRef: React.RefObject<HTMLDivElement | null>;
    renderSuggestions: () => React.ReactNode;
}

const Workbench: React.FC<WorkbenchProps> = ({
    query,
    setQuery,
    isExecuting,
    handleRun: onRun,
    theme,
    editorRef,
    handleEditorDidMount,
    result,
    error,
    activeResultTab,
    setActiveResultTab,
    copyResults,
    copied,
    templates,
    loadTemplate,
    history,
    resultsRef,
    renderSuggestions
}) => {

    // Internal handler to sync state before running
    const handleRunClick = useCallback(async () => {
        const finalQuery = editorRef.current ? editorRef.current.getValue() : query;

        // Persist the query to parent state and storage
        setQuery(finalQuery);
        sessionStorage.setItem('sqlens_query', finalQuery);

        if (!finalQuery.trim()) return;
        onRun();
    }, [onRun, editorRef, query, setQuery]);

    const [showFullHistory, setShowFullHistory] = React.useState(false);
    const displayedHistory = showFullHistory ? history : history.slice(0, 3);

    return (
        <div className={styles.workspaceLayout}>
            <div className={styles.workspaceLeft}>
                {/* Section: Templates */}
                <div className={styles.templates}>
                    <div className={styles.templatesLabel}>
                        <Search size={14} /> Quick Templates
                    </div>
                    <div className={styles.templateRow}>
                        {templates.map((t, i) => (
                            <div key={i} className={styles.templateCard} onClick={() => loadTemplate(t.query)}>
                                <span className={styles.templateEmoji}>{t.icon}</span>
                                <span className={styles.templateText}>{t.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Editor */}
                <div className={styles.editorSection}>
                    <div className={styles.editorTopBar}>
                        <div className={styles.editorTabs}>
                            <div className={styles.tabFile}>
                                <Terminal size={14} /> main.sql
                            </div>
                        </div>
                        <button
                            className={`${styles.runBtn} ${isExecuting ? styles.btnLoading : ''}`}
                            onClick={handleRunClick}
                            disabled={isExecuting}
                        >
                            {isExecuting ? (
                                <div className={styles.spin}><Terminal size={16} /></div>
                            ) : (
                                <Play size={16} fill="currentColor" />
                            )}
                            Run Query <span className={styles.kbd}>⌘↵</span>
                        </button>
                    </div>
                    <div className={styles.monacoWrap}>
                        <Editor
                            height="340px"
                            defaultLanguage="mysql"
                            theme={['one-light', 'yeti', 'solarized-light'].includes(theme) ? 'vs-light' : 'vs-dark'}
                            defaultValue={query}
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 15,
                                fontFamily: "'JetBrains Mono', monospace",
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 16 },
                                renderLineHighlight: 'all',
                                cursorBlinking: 'smooth',
                                suggestOnTriggerCharacters: true,
                                scrollbar: {
                                    vertical: 'visible',
                                    horizontal: 'visible',
                                    useShadows: false,
                                    verticalHasArrows: false,
                                    horizontalHasArrows: false,
                                    verticalScrollbarSize: 10,
                                    horizontalScrollbarSize: 10
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Section: Results */}
                <div className={styles.resultsSection} ref={resultsRef}>
                    <div className={styles.resultsHeader}>
                        <div className={styles.tabRow}>
                            <button
                                className={`${styles.tabBtn} ${activeResultTab === 'results' ? styles.tabActive : ''}`}
                                onClick={() => setActiveResultTab('results')}
                            >
                                <Terminal size={15} /> Results
                                {result?.results && <span className={styles.tabBadge}>{result.results.length}</span>}
                            </button>
                            <button
                                className={`${styles.tabBtn} ${activeResultTab === 'plan' ? styles.tabActive : ''}`}
                                onClick={() => setActiveResultTab('plan')}
                            >
                                <Search size={15} /> Execution Plan
                            </button>
                            <button
                                className={`${styles.tabBtn} ${activeResultTab === 'suggestions' ? styles.tabActive : ''}`}
                                onClick={() => setActiveResultTab('suggestions')}
                            >
                                <ZapIcon size={15} /> Intelligence
                                {(result?.suggestions?.length || 0) > 0 && (
                                    <span className={styles.tabBadgeWarn}>{result?.suggestions?.length}</span>
                                )}
                            </button>
                        </div>
                        {result && (
                            <button className={styles.copyBtn} onClick={copyResults}>
                                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        )}
                    </div>

                    <div className={styles.tabContent}>
                        {activeResultTab === 'results' && (
                            <div className={styles.tableWrapper}>
                                {error ? (
                                    <div className={styles.errorState}>
                                        <div className={styles.errorIcon}>⚠️</div>
                                        <div>
                                            <h3>Execution Error</h3>
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                ) : result?.results && result.results.length > 0 ? (
                                    <table className={styles.sqlTable}>
                                        <thead>
                                            <tr>
                                                {Object.keys(result.results[0]).map((key) => (
                                                    <th key={key}>{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.results.map((row, i) => (
                                                <tr key={i}>
                                                    {Object.values(row).map((val: any, j) => (
                                                        <td key={j}>{String(val)}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className={styles.emptyStateContainer}>
                                        <div className={styles.emptyIcon}><Terminal size={40} /></div>
                                        <p>Run a query to see results</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeResultTab === 'plan' && (
                            <div className={styles.planView}>
                                {result?.explainPlan ? (
                                    <VisualPlan plan={result.explainPlan} />
                                ) : (
                                    <div className={styles.emptyStateContainer}>
                                        <p>No execution plan available for this query.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeResultTab === 'suggestions' && renderSuggestions()}
                    </div>
                </div>
            </div>

            {/* Sidebar: History & Health */}
            <div className={styles.workspaceRight}>
                <div className={styles.sideCard}>
                    <h4 className={styles.sideTitle}><History size={14} /> Recent Queries</h4>
                    <div className={styles.historyList}>
                        {displayedHistory.length > 0 ? displayedHistory.map((h, i) => (
                            <button key={i} className={styles.historyItem} onClick={() => loadTemplate(h)}>
                                <span className={styles.historyText}>{h}</span>
                            </button>
                        )) : <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>No history yet.</p>}

                        {history.length > 3 && (
                            <button
                                className={styles.viewMoreBtn}
                                onClick={() => setShowFullHistory(!showFullHistory)}
                            >
                                {showFullHistory ? 'View Less' : `View More (${history.length - 3} more)`}
                            </button>
                        )}
                    </div>
                </div>
                <div className={styles.sideCard}>
                    <h4 className={styles.sideTitle}><Terminal size={14} /> Environment</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span style={{ opacity: 0.6 }}>Engine</span>
                            <span style={{ fontWeight: 700 }}>MySQL 8.0</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span style={{ opacity: 0.6 }}>Driver</span>
                            <span style={{ fontWeight: 700, color: 'var(--neon-green)' }}>Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workbench;
