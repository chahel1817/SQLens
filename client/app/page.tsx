'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Editor from '@monaco-editor/react';
import {
  Play, Loader2, Copy, Check,
  FileCode2, User,
  Table2, GitBranch, Lightbulb,
  Rocket, AlertCircle,
  History, Terminal,
  AlertTriangle, Info,
  ArrowRight, Sparkles, ChevronRight
} from 'lucide-react';
import styles from './page.module.css';

type Suggestion = {
  type: string;
  message: string;
  improvement: string;
};

type QueryResult = {
  results: Record<string, unknown>[];
  rowCount: number;
  executionTime: string;
  explainPlan: any;
  suggestions: Suggestion[];
};

export default function Home() {
  const [query, setQuery] = useState('SELECT * FROM employees WHERE salary > 40000;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'plan' | 'suggestions'>('results');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef<any>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('sqlens_token');
    if (savedToken) setToken(savedToken);
  }, []);

  const handleRun = useCallback(async () => {
    const finalQuery = editorRef.current ? editorRef.current.getValue() : query;
    if (!finalQuery.trim() || isExecuting) return;
    setIsExecuting(true);
    setError(null);
    setActiveTab('results');

    try {
      const res = await fetch('http://localhost:5000/api/query/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query: finalQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Query execution failed');
      setResult(data);
      setHistory(prev => [finalQuery, ...prev.filter(q => q !== finalQuery)].slice(0, 10));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecuting(false);
    }
  }, [query, token, isExecuting]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });
  };

  const copyResults = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result.results, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className={styles.page}>
      {/* ─── NAVBAR ─── */}
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.logoWrap}>
            <Image
              src="/SQLens.png"
              alt="SQLens"
              width={42}
              height={42}
              priority
              className={styles.logoImg}
            />
            <div className={styles.logoText}>
              <span className={styles.brandName}>SQLens</span>
              <span className={styles.brandTag}>Query Analyzer</span>
            </div>
          </div>
          <div className={styles.navRight}>
            <div className={styles.statusPill}>
              <span className={styles.statusDot}></span> Connected
            </div>
            <div className={styles.avatarCircle}><User size={16} /></div>
          </div>
        </div>
        <div className={styles.gradientBar}></div>
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <div className={styles.main}>
        {/* Auth */}
        {!token && (
          <div className={styles.authAlert}>
            <Terminal size={16} />
            <span>Connect your sandbox:</span>
            <input
              className={styles.tokenField}
              placeholder="Paste JWT token..."
              onChange={(e) => {
                setToken(e.target.value);
                localStorage.setItem('sqlens_token', e.target.value);
              }}
            />
          </div>
        )}

        {/* ─── EDITOR ─── */}
        <section className={styles.editorSection}>
          <div className={styles.editorTopBar}>
            <div className={styles.tabFile}>
              <FileCode2 size={14} /> <span>query.sql</span>
            </div>
            <button
              className={`${styles.runBtn} ${isExecuting ? styles.btnLoading : ''}`}
              onClick={handleRun}
              disabled={isExecuting || !token}
            >
              {isExecuting
                ? <><Loader2 size={16} className={styles.spin} /> Analyzing...</>
                : <><Play size={14} fill="white" /> Run Query</>}
              {!isExecuting && <span className={styles.kbd}>Ctrl + ↵</span>}
            </button>
          </div>
          <div className={styles.monacoWrap}>
            <Editor
              height="240px"
              defaultLanguage="sql"
              theme="vs-light"
              value={query}
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
              }}
            />
          </div>
        </section>

        {/* ─── METRICS STRIP ─── */}
        <div className={styles.metricsStrip}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Execution</span>
            <span className={styles.metricVal}>{result?.executionTime || '—'}</span>
          </div>
          <div className={styles.metricDivider}></div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Rows</span>
            <span className={styles.metricVal}>{result?.rowCount ?? '—'}</span>
          </div>
          <div className={styles.metricDivider}></div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Status</span>
            <span className={`${styles.metricVal} ${error ? styles.statusFail : styles.statusOk}`}>
              {isExecuting ? 'Running…' : error ? 'Failed' : result ? 'Success' : 'Ready'}
            </span>
          </div>
        </div>

        {/* ─── RESULTS ─── */}
        <section className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.tabRow}>
              <button className={`${styles.tabBtn} ${activeTab === 'results' ? styles.tabActive : ''}`} onClick={() => setActiveTab('results')}>
                <Table2 size={15} /> Results
                {result && <span className={styles.tabBadge}>{result.rowCount}</span>}
              </button>
              <button className={`${styles.tabBtn} ${activeTab === 'plan' ? styles.tabActive : ''}`} onClick={() => setActiveTab('plan')}>
                <GitBranch size={15} /> Execution Plan
              </button>
              <button className={`${styles.tabBtn} ${activeTab === 'suggestions' ? styles.tabActive : ''}`} onClick={() => setActiveTab('suggestions')}>
                <Lightbulb size={15} /> Suggestions
                {result?.suggestions && result.suggestions.length > 0 && (
                  <span className={styles.tabBadgeWarn}>{result.suggestions.length}</span>
                )}
              </button>
            </div>
            {result && (
              <button onClick={copyResults} className={styles.copyBtn}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
              </button>
            )}
          </div>

          <div className={styles.resultsBody}>
            {/* Loading */}
            {isExecuting && (
              <div className={styles.centeredState}>
                <div className={styles.pulseRing}></div>
                <p>Analyzing query performance…</p>
              </div>
            )}

            {/* Error */}
            {error && !isExecuting && (
              <div className={styles.errorBox}>
                <AlertCircle size={24} />
                <div>
                  <strong>Query Failed</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Empty */}
            {!result && !error && !isExecuting && (
              <div className={styles.centeredState}>
                <div className={styles.emptyVisual}>
                  <Sparkles size={48} />
                </div>
                <h2 className="gradient-text">Ready to analyze your query</h2>
                <p className={styles.emptyHint}>Run a <code>SELECT</code> query to see results and performance insights</p>
                <button className={styles.tryBtn} onClick={() => editorRef.current?.setValue('SELECT * FROM employees;')}>
                  Try example query <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Results Tab */}
            {result && !isExecuting && activeTab === 'results' && (
              <div className={styles.tableWrap}>
                {result.results.length > 0 ? (
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>{Object.keys(result.results[0]).map(k => <th key={k}>{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {result.results.map((row, i) => (
                        <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{String(v ?? 'NULL')}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className={styles.noRows}>Query executed successfully. No rows returned.</p>}
              </div>
            )}

            {/* Plan Tab */}
            {result && !isExecuting && activeTab === 'plan' && (
              <div className={styles.planBox}>
                {result.explainPlan ? (
                  <pre className={styles.planCode}>{JSON.stringify(result.explainPlan, null, 2)}</pre>
                ) : <p className={styles.noRows}>Execution plans are only available for SELECT queries.</p>}
              </div>
            )}

            {/* Suggestions Tab */}
            {result && !isExecuting && activeTab === 'suggestions' && (
              <div className={styles.suggestList}>
                {result.suggestions.length > 0 ? result.suggestions.map((s, i) => (
                  <div key={i} className={`${styles.suggestCard} ${s.type === 'CRITICAL' ? styles.suggestCritical : styles.suggestInfo}`}>
                    <div className={styles.suggestIcon}>
                      {s.type === 'CRITICAL' ? <AlertTriangle size={20} /> : <Info size={20} />}
                    </div>
                    <div className={styles.suggestContent}>
                      <div className={styles.suggestTop}>
                        <span className={styles.suggestLabel}>{s.type}</span>
                        <h5>{s.message}</h5>
                      </div>
                      <p>{s.improvement}</p>
                      <button className={styles.suggestAction}>
                        Apply Fix <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )) : <p className={styles.noRows}>No optimization tips. Your query plan looks healthy!</p>}
              </div>
            )}
          </div>
        </section>

        {/* ─── HISTORY ─── */}
        {history.length > 0 && (
          <section className={styles.historySection}>
            <div className={styles.historyLabel}><History size={14} /> Recent Queries</div>
            <div className={styles.historyChips}>
              {history.map((h, i) => (
                <button key={i} className={styles.chip} onClick={() => editorRef.current?.setValue(h)}>
                  <FileCode2 size={12} /> {h.slice(0, 50)}{h.length > 50 ? '…' : ''}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
