'use client';

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import {
  Play,
  Sparkles,
  Clock,
  Database,
  Activity as PerformanceIcon,
  Trash2,
  ArrowRight,
  AlertTriangle,
  Info,
  AlertCircle,
  Loader2,
  LogOut,
  Palette,
  Check,
  FileCode2,
  User,
  Table2,
  GitBranch,
  Lightbulb,
  Copy,
  Gauge,
  Zap,
  Layers,
  Search,
  History,
  Globe,
  ExternalLink,
  Heart,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Users,
  AlertOctagon,
  Zap as ZapIcon
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
  const [activeResultTab, setActiveResultTab] = useState<'results' | 'plan' | 'suggestions'>('results');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'queries' | 'performance' | 'logs'>('dashboard');

  const handleTabChange = (tab: 'dashboard' | 'queries' | 'performance' | 'logs') => {
    setActiveTab(tab);
    sessionStorage.setItem('sqlens_tab', tab);
  };
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [copied, setCopied] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [theme, setTheme] = useState('one-dark');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const [dbStats, setDbStats] = useState<any>(null);
  const [slowQueries, setSlowQueries] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [pingMs, setPingMs] = useState<number>(12);

  const THEMES = [
    { id: 'one-dark', name: 'One Dark', color: '#282c34' },
    { id: 'one-light', name: 'One Light', color: '#ffffff' },
    { id: 'material', name: 'Material', color: '#263238' },
    { id: 'monokai', name: 'Monokai', color: '#272822' },
    { id: 'oceanic-next', name: 'Oceanic Next', color: '#1b2b34' },
    { id: 'nord', name: 'Nord', color: '#3b4252' },
    { id: 'yeti', name: 'Yeti', color: '#ffffff' },
    { id: 'vscode', name: 'VS Code', color: '#1e1e1e' },
    { id: 'solarized-dark', name: 'Solarized Dark', color: '#002b36' },
    { id: 'solarized-light', name: 'Solarized Light', color: '#fdf6e3' },
    { id: 'twilight', name: 'Twilight', color: '#1e1e1e' },
  ];

  const editorRef = useRef<any>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useLayoutEffect(() => {
    const savedTheme = localStorage.getItem('sqlens_theme');
    const savedTab = sessionStorage.getItem('sqlens_tab') as any;
    const savedQuery = sessionStorage.getItem('sqlens_query');
    const savedResult = sessionStorage.getItem('sqlens_result');
    const savedHistory = sessionStorage.getItem('sqlens_history');

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    if (savedTab) setActiveTab(savedTab);
    if (savedQuery) setQuery(savedQuery);

    if (savedResult) {
      try { setResult(JSON.parse(savedResult)); } catch (e) { }
    }
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('sqlens_token');
    const savedUser = localStorage.getItem('sqlens_user');

    if (!savedToken) {
      router.push('/login');
    } else {
      setToken(savedToken);
      if (savedUser) setUser(JSON.parse(savedUser));
      setIsVerifying(false);

      // Initial load
      fetchStats(savedToken);

      // Real-time Telemetry Connection (SSE / Socket stream)
      const evtSource = new EventSource(`http://localhost:5000/api/stats/stream?token=${savedToken}`);
      evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.dashboard) setDbStats(data.dashboard);
        if (data.slow) setSlowQueries(data.slow);
        if (data.analytics) setAnalyticsData(data.analytics);
        if (data.logs) setUserLogs(data.logs);
        setIsStatsLoading(false);
      };

      // Network Ping Measurement
      const measurePing = async () => {
        const start = Date.now();
        try {
          await fetch('http://localhost:5000/');
          setPingMs(Date.now() - start);
        } catch (e) {
          setPingMs(0);
        }
      };

      measurePing();
      const pingInterval = setInterval(measurePing, 5000);

      return () => {
        evtSource.close();
        clearInterval(pingInterval);
      };
    }
  }, [router]);

  const fetchStats = async (activeToken: string) => {
    try {
      const authHeader = { 'Authorization': `Bearer ${activeToken}` };
      const [statsRes, slowRes, analyticsRes, logsRes] = await Promise.all([
        fetch('http://localhost:5000/api/stats/dashboard', { headers: authHeader }),
        fetch('http://localhost:5000/api/stats/slow-queries', { headers: authHeader }),
        fetch('http://localhost:5000/api/stats/analytics', { headers: authHeader }),
        fetch('http://localhost:5000/api/stats/logs', { headers: authHeader })
      ]);

      if (statsRes.ok) setDbStats(await statsRes.json());
      if (slowRes.ok) setSlowQueries(await slowRes.json());
      if (analyticsRes.ok) setAnalyticsData(await analyticsRes.json());
      if (logsRes.ok) setUserLogs(await logsRes.json());
    } catch (error) {
      console.error("Stats Fetch fail:", error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('sqlens_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    setShowThemeMenu(false);
  };

  const handleRun = useCallback(async () => {
    const finalQuery = editorRef.current ? editorRef.current.getValue() : query;
    if (!finalQuery.trim() || isExecuting || !token) return;

    setIsExecuting(true);
    setError(null);
    setActiveResultTab('results');

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

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('sqlens_token');
        router.push('/login');
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Query execution failed');
      setResult(data);
      sessionStorage.setItem('sqlens_result', JSON.stringify(data));

      setHistory(prev => {
        const newHistory = [finalQuery, ...prev.filter(q => q !== finalQuery)].slice(0, 10);
        sessionStorage.setItem('sqlens_history', JSON.stringify(newHistory));
        return newHistory;
      });
    } catch (err: any) {
      setError(err.message);
      setResult(null);
      sessionStorage.removeItem('sqlens_result');
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
    // Ensure mouse wheel doesn't get trapped if we are at edge of editor
    editor.updateOptions({
      scrollbar: {
        alwaysConsumeMouseWheel: true,
        vertical: 'visible',
      },
      scrollBeyondLastLine: false,
      fixedOverflowWidgets: true,
      mouseWheelScrollSensitivity: 1,
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

  const renderDashboard = () => {
    return (
      <div className={styles.moduleContainer}>
        <div className={styles.moduleHeader}>
          <h2 className={styles.moduleTitle}>Dashboard Overview</h2>
          <p className={styles.moduleDesc}>Live overview of your database performance.</p>
        </div>

        <div className={styles.heroCards} style={{ marginBottom: 40, gap: 24 }}>
          <div className={`${styles.statCard} ${isStatsLoading ? styles.skeleton : ''}`} style={{ flex: 1, padding: 32 }}>
            <ZapIcon size={32} />
            <div style={{ marginTop: 12 }}>
              <span className={styles.statValue} style={{ fontSize: '2rem' }}>{dbStats?.qps || '0.00'}</span>
              <span className={styles.statLabel}>Queries / Sec</span>
            </div>
          </div>
          <div className={`${styles.statCard} ${isStatsLoading ? styles.skeleton : ''}`} style={{ flex: 1, padding: 32 }}>
            <Users size={32} />
            <div style={{ marginTop: 12 }}>
              <span className={styles.statValue} style={{ fontSize: '2rem' }}>{dbStats?.connections || '0'}</span>
              <span className={styles.statLabel}>Active Threads</span>
            </div>
          </div>
          <div className={`${styles.statCard} ${isStatsLoading ? styles.skeleton : ''}`} style={{ flex: 1, padding: 32 }}>
            <AlertOctagon size={32} />
            <div style={{ marginTop: 12 }}>
              <span className={styles.statValue} style={{ fontSize: '2rem' }}>{dbStats?.slowQueries || '0'}</span>
              <span className={styles.statLabel}>Slow Today</span>
            </div>
          </div>
        </div>

        <div className={styles.workspaceLayout} style={{ padding: 0 }}>
          <div className={styles.workspaceLeft}>
            <div className={styles.sideCard} style={{ width: '100%', minHeight: 300 }}>
              <h4 className={styles.sideTitle}>Recent Slow Queries</h4>
              <div className={styles.statsFeed}>
                {slowQueries.length > 0 ? slowQueries.map((q, i) => (
                  <div key={i} className={styles.statsFeedItem}>
                    <div className={styles.statsFeedDot}></div>
                    <div>
                      <div className={styles.statsFeedSQL}>{q.query}</div>
                      <div className={styles.statsFeedMeta}>{q.time}ms • {q.date}</div>
                    </div>
                  </div>
                )) : <p>No slow queries detected.</p>}
              </div>
            </div>
          </div>
          <div className={styles.workspaceRight} style={{ top: 0 }}>
            <div className={styles.sideCard}>
              <h4 className={styles.sideTitle}>System Alerts</h4>
              <div className={styles.historyList}>
                {slowQueries.length > 0 ? (
                  <div className={styles.historyItem} style={{ borderLeft: '3px solid var(--warning)' }}>
                    <AlertTriangle size={14} color="var(--warning)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Performance Warning</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>A query took longer than expected</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.historyItem} style={{ borderLeft: '3px solid var(--success)' }}>
                    <Check size={14} color="var(--success)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>System Healthy</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>No active issues detected</div>
                    </div>
                  </div>
                )}

                <div className={styles.historyItem} style={{ borderLeft: '3px solid var(--success)' }}>
                  <ShieldCheck size={14} color="var(--success)" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Connection Shield</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>SSL/TLS Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => (
    <div className={styles.moduleContainer}>
      <div className={styles.moduleHeader}>
        <h2 className={styles.moduleTitle}>Performance Analytics</h2>
        <p className={styles.moduleDesc}>Deep dive into query execution patterns and index efficiency.</p>
      </div>

      <div className={styles.sideCard} style={{ marginBottom: 24 }}>
        <h4 className={styles.sideTitle}><TrendingUp size={14} /> Throughput Trend</h4>
        <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '20px 0' }}>
          {(analyticsData?.throughputTrend || [30, 45, 35, 60, 50, 80, 40, 90, 65, 55, 75, 45]).map((h: any, i: number) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--brand-accent)', opacity: 0.3 + (h / 200), borderRadius: '4px' }}></div>
          ))}
        </div>
      </div>

      <div className={styles.workspaceLayout} style={{ padding: 0 }}>
        <div className={styles.workspaceLeft}>
          <div className={styles.sideCard}>
            <h4 className={styles.sideTitle}>Index Hit Rate</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: '8px solid var(--brand-accent)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {analyticsData?.indexHitRate || 0}%
              </div>
              <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Your queries are effectively utilizing indexes. No full table scans detected in recent traffic.</p>
            </div>
          </div>
        </div>
        <div className={styles.workspaceRight} style={{ top: 0 }}>
          <div className={styles.sideCard}>
            <h4 className={styles.sideTitle}>System Health</h4>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              {dbStats?.uptime ? `Database active for ${(dbStats.uptime / 3600).toFixed(1)} hours.` : 'No active data.'}
            </div>
          </div>
        </div>
      </div>

      {slowQueries.length > 0 && (
        <div className={styles.sideCard} style={{ marginTop: 24 }}>
          <h4 className={styles.sideTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={16} color="#F59E0B" /> Detailed Threat Breakdown
          </h4>
          <table className={styles.logsTable} style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Timestamp</th>
                <th style={{ width: '120px' }}>Latency</th>
                <th>Query Statement</th>
              </tr>
            </thead>
            <tbody>
              {slowQueries.map((q, i) => (
                <tr key={i}>
                  <td style={{ opacity: 0.6 }}>{q.date}</td>
                  <td style={{ color: '#F59E0B', fontWeight: 700 }}>{q.time} ms</td>
                  <td style={{ maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <code style={{ fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--bg-page)', padding: '6px 12px', borderRadius: '8px', display: 'block', border: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.query}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderLogs = () => (
    <div className={styles.moduleContainer}>
      <div className={styles.moduleHeader}>
        <h2 className={styles.moduleTitle}>System Logs</h2>
        <p className={styles.moduleDesc}>Audit trail for all database activity and analyzer operations.</p>
      </div>

      <table className={styles.logsTable}>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Event</th>
            <th>User</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {userLogs.length > 0 ? userLogs.map((log, i) => (
            <tr key={i}>
              <td style={{ opacity: 0.6 }}>{log.time}</td>
              <td style={{ fontWeight: 600 }}>{log.event}</td>
              <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.detail}>{log.detail}</td>
              <td>
                <span className={`${styles.badge} ${log.status === 'SUCCESS' ? styles.statusOk : styles.statusWarn}`}>
                  {log.status}
                </span>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>No logs available yet. Run some queries!</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );


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
      <header className={styles.header}>
        <div className={styles.navInner}>
          {/* 1. Pro Branding */}
          <div className={styles.logoArea}>
            <Image src="/SQLens.png" alt="SQLens" width={42} height={42} priority className={styles.logoImg} />
            <div className={styles.logoText}>
              <span className={styles.brandName}>SQLens</span>
              <span className={styles.brandTag}>Performance Analyzer</span>
            </div>
          </div>

          {/* 2. Workspace Navigation */}
          <nav className={styles.navigation}>
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.navItemActive : ''}`}
            >
              <LayoutDashboard size={15} strokeWidth={2.2} style={{ marginRight: 8, opacity: 0.8 }} /> Overview
            </button>
            <button
              onClick={() => handleTabChange('queries')}
              className={`${styles.navItem} ${activeTab === 'queries' ? styles.navItemActive : ''}`}
            >
              <Database size={15} strokeWidth={2.2} style={{ marginRight: 8, opacity: 0.8 }} /> Workbench
            </button>
            <button
              onClick={() => handleTabChange('performance')}
              className={`${styles.navItem} ${activeTab === 'performance' ? styles.navItemActive : ''}`}
            >
              <PerformanceIcon size={15} strokeWidth={2.2} style={{ marginRight: 8, opacity: 0.8 }} /> Analytics
            </button>
            <button
              onClick={() => handleTabChange('logs')}
              className={`${styles.navItem} ${activeTab === 'logs' ? styles.navItemActive : ''}`}
            >
              <Clock size={15} strokeWidth={2.2} style={{ marginRight: 8, opacity: 0.8 }} /> Logs
            </button>
          </nav>

          {/* 3. Pro Status Indicators */}
          <div className={styles.statusContainer}>
            <div className={styles.statusDot} style={{ background: pingMs > 0 ? 'var(--neon-green)' : '#EF4444' }}></div>
            <div className={styles.statusText}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)', opacity: 0.95 }}>{pingMs > 0 ? 'Connected' : 'Offline'}</span>
              <span className={styles.statusDivider} style={{ margin: '0 10px' }}></span>
              <span style={{ opacity: 0.95, color: '#fff', fontWeight: 600 }}>Production Node</span>
              <span className={styles.statusDivider} style={{ margin: '0 10px' }}></span>
              <span className={styles.latency} style={{ color: pingMs > 100 ? '#F59E0B' : pingMs > 0 ? 'var(--neon-green)' : '#EF4444', opacity: 0.85, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                {pingMs > 0 ? `${pingMs}ms` : 'ERR'}
              </span>
            </div>
          </div>

          {/* 4. Global Actions Shell */}
          <div className={styles.actionShell}>
            <div className={styles.themeSwitcher}>
              <button
                className={styles.themeToggle}
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                title="Change Theme"
              >
                <Palette size={18} />
              </button>

              {showThemeMenu && (
                <div className={styles.themeMenu}>
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      className={`${styles.themeItem} ${theme === t.id ? styles.themeItemActive : ''}`}
                      onClick={() => changeTheme(t.id)}
                    >
                      <div className={styles.themeColor} style={{ background: t.color, border: '1px solid var(--border)' }}></div>
                      {t.name}
                      {theme === t.id && <Check size={14} style={{ marginLeft: 'auto' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className={styles.actionBtn} title="Settings">
              <Settings size={18} />
            </button>

            <div className={styles.avatarShell}>
              <div className={styles.avatarCircle} title={user?.email || 'User'} onClick={handleLogout}>
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.gradientBar}></div>
      </header>

      <div className={styles.main} style={{ maxWidth: activeTab === 'queries' ? 1400 : 1140 }}>
        {activeTab === 'dashboard' ? (
          renderDashboard()
        ) : activeTab === 'performance' ? (
          renderAnalytics()
        ) : activeTab === 'logs' ? (
          renderLogs()
        ) : (
          <>


            {/* ─── WORKSPACE (Central Analyzer) ─── */}
            <div className={styles.workspaceLayout}>
              <div className={styles.workspaceLeft}>
                <section className={styles.editorSection}>
                  <div className={styles.editorTopBar}>
                    <div className={styles.editorTabs}>
                      <div className={styles.tabFile}><FileCode2 size={14} /> main.sql</div>
                    </div>
                    <div className={styles.editorActions}>
                      <button
                        className={`${styles.runBtn} ${isExecuting ? styles.btnLoading : ''}`}
                        onClick={handleRun}
                        disabled={isExecuting}
                      >
                        {isExecuting ? <Loader2 size={16} className={styles.spin} /> : <Play size={14} fill="currentColor" />}
                        <span>Run Query</span>
                        {!isExecuting && <span className={styles.kbd}>⌘↵</span>}
                      </button>
                    </div>
                  </div>
                  <div className={styles.monacoWrap}>
                    <Editor
                      height="340px"
                      defaultLanguage="mysql"
                      theme={['one-light', 'yeti', 'solarized-light'].includes(theme) ? 'vs-light' : 'vs-dark'}
                      value={query}
                      onChange={(value) => {
                        setQuery(value || '');
                        sessionStorage.setItem('sqlens_query', value || '');
                      }}
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
                      }}
                    />
                  </div>
                </section>

                {/* --- RESULTS SECTION (Docked) --- */}
                <section className={styles.resultsSection} ref={resultsRef}>
                  <div className={styles.resultsHeader}>
                    <div className={styles.tabRow}>
                      <button className={`${styles.tabBtn} ${activeResultTab === 'results' ? styles.tabActive : ''}`} onClick={() => setActiveResultTab('results')}>
                        <Table2 size={15} /> Results {result && <span className={styles.tabBadge}>{result.rowCount}</span>}
                      </button>
                      <button className={`${styles.tabBtn} ${activeResultTab === 'plan' ? styles.tabActive : ''}`} onClick={() => setActiveResultTab('plan')}>
                        <GitBranch size={15} /> Explain
                      </button>
                      <button className={`${styles.tabBtn} ${activeResultTab === 'suggestions' ? styles.tabActive : ''}`} onClick={() => setActiveResultTab('suggestions')}>
                        <Lightbulb size={15} /> Intelligence {result?.suggestions?.length ? <span className={styles.tabBadgeWarn}>{result.suggestions.length}</span> : null}
                      </button>
                    </div>
                    {result && (
                      <button onClick={copyResults} className={styles.copyBtn}>
                        {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Export</>}
                      </button>
                    )}
                  </div>

                  <div className={styles.resultsBody}>
                    {isExecuting && (
                      <div className={styles.centeredState}>
                        <div className={styles.pulseRing}></div>
                        <p>Profiling execution metrics...</p>
                      </div>
                    )}

                    {error && !isExecuting && (
                      <div className={styles.errorBox}>
                        <AlertCircle size={24} />

                        <div className={styles.errorText}>
                          <strong>Execution Error</strong>
                          <p>{error}</p>
                        </div>
                      </div>
                    )}

                    {!result && !error && !isExecuting && (
                      <div className={styles.emptyStateContainer}>
                        <div className={styles.emptyIcon}><Database size={48} /></div>
                        <h3>Ready for Analysis</h3>
                        <p>Enter a MySQL query and click <strong>Run</strong> to see profiling results.</p>
                      </div>
                    )}

                    {result && !isExecuting && activeResultTab === 'results' && (
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
                        ) : <p className={styles.noRows}>Query successful. Empty result set.</p>}
                      </div>
                    )}

                    {result && !isExecuting && activeResultTab === 'plan' && (
                      <div className={styles.planBox}>
                        {result.explainPlan ? (
                          <pre className={styles.planCode}>{JSON.stringify(result.explainPlan, null, 2)}</pre>
                        ) : <p className={styles.noRows}>Execution plans are available for data retrieval (SELECT) queries.</p>}
                      </div>
                    )}

                    {result && !isExecuting && activeResultTab === 'suggestions' && (
                      <div className={styles.suggestList}>
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
                                  Apply Performance Fix <ArrowRight size={14} />
                                </button>
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
                                {tip.fix && <pre className={styles.aiCode}>{tip.fix}</pre>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <aside className={styles.workspaceRight}>
                {/* --- QUICK TEMPLATES --- */}
                <div className={styles.sideCard}>
                  <h4 className={styles.sideTitle}><Database size={14} /> Fast Queries</h4>
                  <div className={styles.templateList}>
                    {TEMPLATES.map((t, i) => (
                      <button key={i} className={styles.templateItem} onClick={() => loadTemplate(t.query)}>
                        <span className={styles.templateIcon}>{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* --- RECENT HISTORY --- */}
                {history.length > 0 && (
                  <div className={styles.sideCard}>
                    <h4 className={styles.sideTitle}><History size={14} /> Session History</h4>
                    <div className={styles.historyList}>
                      {history.map((h, i) => (
                        <div key={i} className={styles.historyItem} onClick={() => loadTemplate(h)}>
                          <Search size={12} />
                          <span>{h.length > 30 ? h.substring(0, 30) + '...' : h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <div className={styles.footerBrand}>
              <Image src="/SQLens.png" alt="SQLens" width={32} height={32} className={styles.footerFavicon} />
              <div className={styles.footerBrandText}>
                <span className={styles.footerBrandName}>SQLens</span>
              </div>
            </div>
            <p className={styles.footerTagline}>The next generation of SQL performance analysis and optimization.</p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.linkGroup}>
              <h4>Tool</h4>
              <a href="#">Analyzer</a>
              <a href="#">AI Optimize</a>
              <a href="#">Templates</a>
            </div>
            <div className={styles.linkGroup}>
              <h4>Support</h4>
              <a href="#">Documentation</a>
              <a href="#">API Docs</a>
              <a href="#">Help Center</a>
            </div>
            <div className={styles.linkGroup}>
              <h4>Connect</h4>
              <a href="#"><Globe size={14} /> Website</a>
              <a href="#"><ExternalLink size={14} /> Discord</a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom} style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className={styles.footerCopy} style={{ opacity: 0.4 }}>
            © 2026 SQLens. All rights reserved.
          </div>
          <div className={styles.footerCredit} style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(to right, #00E4FF, #a626a4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              textShadow: '0 0 15px rgba(0, 228, 255, 0.4)'
            }}>
              <ZapIcon size={14} style={{ color: '#00E4FF' }} /> Built for DB Performance Engineers
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
