'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import {
  Play, Loader2, Copy, Check,
  FileCode2, User,
  Table2, GitBranch, Lightbulb,
  AlertCircle, History,
  AlertTriangle, Info,
  ArrowRight, Sparkles, ChevronRight, LogOut,
  Database, Search, Gauge, Zap, Layers, Clock
} from 'lucide-react';
import styles from './page.module.css';

type Suggestion = {
  type: string;
  message: string;
  improvement: string;
  fix?: string;
};

type AiResult = {
  rating?: string;
  summary?: string;
  tips?: { title: string; detail: string; fix?: string }[];
  optimizedQuery?: string | null;
  error?: string;
};

type QueryResult = {
  results: Record<string, unknown>[];
  rowCount: number;
  executionTime: string;
  explainPlan: any;
  suggestions: Suggestion[];
};

const TEMPLATES = [
  { label: 'Show Tables', query: 'SHOW TABLES;', icon: '📋' },
  { label: 'Create Table', query: "CREATE TABLE employees (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  salary INT,\n  department VARCHAR(50)\n);", icon: '🏗️' },
  { label: 'Insert Data', query: "INSERT INTO employees (name, salary, department) VALUES\n  ('Alice', 55000, 'Engineering'),\n  ('Bob', 42000, 'Marketing'),\n  ('Charlie', 68000, 'Engineering'),\n  ('Diana', 95000, 'Management');", icon: '📝' },
  { label: 'Select All', query: 'SELECT * FROM employees;', icon: '👥' },
  { label: 'High Salary', query: 'SELECT * FROM employees WHERE salary > 50000;', icon: '💰' },
  { label: 'Describe', query: 'DESCRIBE employees;', icon: '🔍' },
];

export default function Home() {
  const [query, setQuery] = useState('SHOW TABLES;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'plan' | 'suggestions'>('results');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [copied, setCopied] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const editorRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('sqlens_token');
    if (!savedToken) {
      router.push('/login');
    } else {
      setToken(savedToken);
      setIsVerifying(false);
    }
  }, [router]);

  const handleRun = useCallback(async () => {
    const finalQuery = editorRef.current ? editorRef.current.getValue() : query;
    if (!finalQuery.trim() || isExecuting || !token) return;

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

      if (res.status === 401) {
        localStorage.removeItem('sqlens_token');
        router.push('/login');
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Query execution failed');
      setResult(data);
      setHistory(prev => [finalQuery, ...prev.filter(q => q !== finalQuery)].slice(0, 10));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecuting(false);
    }
  }, [query, token, isExecuting, router]);

  const handleLogout = () => {
    localStorage.removeItem('sqlens_token');
    router.push('/login');
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });
  };

  const loadTemplate = (sql: string) => {
    editorRef.current?.setValue(sql);
    setQuery(sql);
  };

  const handleAiOptimize = async () => {
    if (!result || isAiLoading) return;
    setIsAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/query/ai-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          query: editorRef.current?.getValue() || query,
          explainPlan: result.explainPlan,
          suggestions: result.suggestions,
        }),
      });
      const data = await res.json();
      setAiResult(data);
    } catch (err: any) {
      setAiResult({ error: err.message });
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyResults = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result.results, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isVerifying) {
    return (
      <div className={styles.loaderScreen}>
        <Image src="/SQLens.png" alt="SQLens" width={64} height={64} className={styles.loaderLogo} />
        <div className={styles.loaderBar}><div className={styles.loaderFill}></div></div>
        <p>Loading your workspace…</p>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      {/* ─── NAVBAR ─── */}
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.logoWrap}>
            <Image src="/SQLens.png" alt="SQLens" width={38} height={38} priority className={styles.logoImg} />
            <div className={styles.logoText}>
              <span className={styles.brandName}>SQLens</span>
              <span className={styles.brandTag}>MySQL Analyzer</span>
            </div>
          </div>
          <div className={styles.navRight}>
            <div className={styles.statusPill}>
              <span className={styles.statusDot}></span> Connected
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
              <LogOut size={16} />
            </button>
            <div className={styles.avatarCircle}><User size={16} /></div>
          </div>
        </div>
        <div className={styles.gradientBar}></div>
      </nav>

      <div className={styles.main}>
        {/* ─── HERO SECTION ─── */}
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <h1 className={styles.heroTitle}>
              <span className="gradient-text">Analyze.</span> Optimize. Ship faster.
            </h1>
            <p className={styles.heroDesc}>
              Write MySQL queries in a VS Code-powered editor. Get real-time execution plans and intelligent optimization tips.
            </p>
          </div>
          <div className={styles.heroCards}>
            <div className={styles.statCard}>
              <Zap size={20} />
              <div>
                <span className={styles.statValue}>{result?.executionTime || '—'}</span>
                <span className={styles.statLabel}>Exec Time</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <Layers size={20} />
              <div>
                <span className={styles.statValue}>{result?.rowCount ?? '—'}</span>
                <span className={styles.statLabel}>Rows</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <Gauge size={20} />
              <div>
                <span className={`${styles.statValue} ${error ? styles.statusFail : styles.statusOk}`}>
                  {isExecuting ? '…' : error ? 'Error' : result ? 'OK' : 'Idle'}
                </span>
                <span className={styles.statLabel}>Status</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── QUICK START TEMPLATES ─── */}
        <section className={styles.templates}>
          <div className={styles.templatesLabel}><Database size={14} /> Quick Start</div>
          <div className={styles.templateRow}>
            {TEMPLATES.map((t, i) => (
              <button key={i} className={styles.templateCard} onClick={() => loadTemplate(t.query)}>
                <span className={styles.templateEmoji}>{t.icon}</span>
                <span className={styles.templateText}>{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ─── EDITOR ─── */}
        <section className={styles.editorSection}>
          <div className={styles.editorTopBar}>
            <div className={styles.editorTabs}>
              <div className={styles.tabFile}>
                <FileCode2 size={14} /> query.sql
              </div>
            </div>
            <button
              className={`${styles.runBtn} ${isExecuting ? styles.btnLoading : ''}`}
              onClick={handleRun}
              disabled={isExecuting}
            >
              {isExecuting
                ? <><Loader2 size={16} className={styles.spin} /> Analyzing…</>
                : <><Play size={14} fill="white" /> Run Query</>}
              {!isExecuting && <span className={styles.kbd}>⌘ ↵</span>}
            </button>
          </div>
          <div className={styles.monacoWrap}>
            <Editor
              height="220px"
              defaultLanguage="mysql"
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

        {/* ─── RESULTS ─── */}
        <section className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.tabRow}>
              <button className={`${styles.tabBtn} ${activeTab === 'results' ? styles.tabActive : ''}`} onClick={() => setActiveTab('results')}>
                <Table2 size={15} /> Results
                {result && <span className={styles.tabBadge}>{result.rowCount}</span>}
              </button>
              <button className={`${styles.tabBtn} ${activeTab === 'plan' ? styles.tabActive : ''}`} onClick={() => setActiveTab('plan')}>
                <GitBranch size={15} /> Plan
              </button>
              <button className={`${styles.tabBtn} ${activeTab === 'suggestions' ? styles.tabActive : ''}`} onClick={() => setActiveTab('suggestions')}>
                <Lightbulb size={15} /> Tips
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
            {isExecuting && (
              <div className={styles.centeredState}>
                <div className={styles.pulseRing}></div>
                <p>Analyzing query performance…</p>
              </div>
            )}

            {error && !isExecuting && (
              <div className={styles.errorBox}>
                <AlertCircle size={24} />
                <div>
                  <strong>Query Failed</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {!result && !error && !isExecuting && (
              <div className={styles.centeredState}>
                <div className={styles.emptyVisual}>
                  <Sparkles size={48} />
                </div>
                <h2 className="gradient-text">Your results will appear here</h2>
                <p className={styles.emptyHint}>Hit <strong>Run Query</strong> or press <code>Ctrl + Enter</code> to analyze</p>
              </div>
            )}

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
                ) : <p className={styles.noRows}>Query executed. No rows returned.</p>}
              </div>
            )}

            {result && !isExecuting && activeTab === 'plan' && (
              <div className={styles.planBox}>
                {result.explainPlan ? (
                  <pre className={styles.planCode}>{JSON.stringify(result.explainPlan, null, 2)}</pre>
                ) : <p className={styles.noRows}>Plans are available for SELECT queries.</p>}
              </div>
            )}

            {result && !isExecuting && activeTab === 'suggestions' && (
              <div className={styles.suggestList}>
                {/* Rule-based suggestions */}
                {result.suggestions.length > 0 ? result.suggestions.map((s, i) => (
                  <div key={i} className={`${styles.suggestCard} ${s.type === 'CRITICAL' ? styles.suggestCritical : s.type === 'WARNING' ? styles.suggestWarning : styles.suggestInfo}`}>
                    <div className={styles.suggestIcon}>
                      {s.type === 'CRITICAL' ? <AlertTriangle size={20} /> : s.type === 'WARNING' ? <AlertCircle size={20} /> : <Info size={20} />}
                    </div>
                    <div className={styles.suggestContent}>
                      <div className={styles.suggestTop}>
                        <span className={styles.suggestLabel}>{s.type}</span>
                        <h5>{s.message}</h5>
                      </div>
                      <p>{s.improvement}</p>
                      {s.fix && (
                        <button className={styles.suggestAction} onClick={() => editorRef.current?.setValue(s.fix!)}>
                          Apply Fix <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )) : <p className={styles.noRows}>No issues detected — your query looks clean!</p>}

                {/* AI Optimize Button */}
                <div className={styles.aiSection}>
                  <button className={styles.aiBtn} onClick={handleAiOptimize} disabled={isAiLoading}>
                    {isAiLoading ? <><Loader2 size={16} className={styles.spin} /> Analyzing with AI…</> : <><Sparkles size={16} /> AI Deep Analysis</>}
                  </button>
                </div>

                {/* AI Results */}
                {aiResult && !aiResult.error && (
                  <div className={styles.aiCard}>
                    <div className={styles.aiHeader}>
                      <Sparkles size={16} />
                      <span>AI Analysis</span>
                      {aiResult.rating && <span className={styles.aiBadge}>{aiResult.rating}</span>}
                    </div>
                    {aiResult.summary && <p className={styles.aiSummary}>{aiResult.summary}</p>}
                    {aiResult.tips?.map((tip, i) => (
                      <div key={i} className={styles.aiTip}>
                        <strong>{tip.title}</strong>
                        <p>{tip.detail}</p>
                        {tip.fix && (
                          <pre className={styles.aiCode}>{tip.fix}</pre>
                        )}
                      </div>
                    ))}
                    {aiResult.optimizedQuery && (
                      <div className={styles.aiOptimized}>
                        <strong>Optimized Query:</strong>
                        <pre className={styles.aiCode}>{aiResult.optimizedQuery}</pre>
                        <button className={styles.suggestAction} onClick={() => editorRef.current?.setValue(aiResult.optimizedQuery!)}>
                          Use This Query <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {aiResult?.error && (
                  <div className={styles.errorBox}><AlertCircle size={18} /> AI analysis failed: {aiResult.error}</div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ─── HISTORY ─── */}
        {history.length > 0 && (
          <section className={styles.historySection}>
            <div className={styles.historyLabel}><Clock size={14} /> Recent Queries</div>
            <div className={styles.historyChips}>
              {history.map((h, i) => (
                <button key={i} className={styles.chip} onClick={() => loadTemplate(h)}>
                  <Search size={11} /> {h.slice(0, 45)}{h.length > 45 ? '…' : ''}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
