'use client';

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Activity as PerformanceIcon,
  Clock,
  Settings,
  Palette,
  Check,
  Zap as ZapIcon,
  Zap,
  LogOut
} from 'lucide-react';
import styles from './page.module.css';

// Components
import Workbench from '../components/Workbench';
import TelemetryGrid from '../components/TelemetryGrid';
import InsightPanel from '../components/InsightPanel';
import QueryHistory from '../components/QueryHistory';
import { QueryResult, DbStats, SlowQuery, AnalyticsData, UserLog, AiResult } from '../components/types';

const TEMPLATES = [
  { label: 'Show Tables', query: 'SHOW TABLES;', icon: '📋' },
  { label: 'Create Table', query: "CREATE TABLE employees (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  salary INT,\n  department VARCHAR(50)\n);", icon: '🏗️' },
  { label: 'Insert Data', query: "INSERT INTO employees (name, salary, department) VALUES\n  ('Alice', 55000, 'Engineering'),\n  ('Bob', 42000, 'Marketing'),\n  ('Charlie', 68000, 'Engineering'),\n  ('Diana', 95000, 'Management');", icon: '📝' },
  { label: 'Select All', query: 'SELECT * FROM employees;', icon: '👥' },
  { label: 'High Salary', query: 'SELECT * FROM employees WHERE salary > 50000;', icon: '💰' },
  { label: 'Describe', query: 'DESCRIBE employees;', icon: '🔍' },
];

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const [query, setQuery] = useState('SHOW TABLES;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<'results' | 'plan' | 'suggestions'>('results');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'queries' | 'performance' | 'logs'>('dashboard');

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

  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [userLogs, setUserLogs] = useState<UserLog[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [pingMs, setPingMs] = useState<number>(12);

  const editorRef = useRef<any>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleTabChange = (tab: 'dashboard' | 'queries' | 'performance' | 'logs') => {
    setActiveTab(tab);
    sessionStorage.setItem('sqlens_tab', tab);
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

      fetchStats(savedToken);

      const evtSource = new EventSource(`${API_URL}/api/stats/stream?token=${savedToken}`);
      evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.dashboard) setDbStats(data.dashboard);
        if (data.slow) setSlowQueries(data.slow);
        if (data.analytics) setAnalyticsData(data.analytics);
        if (data.logs) setUserLogs(data.logs);
        setIsStatsLoading(false);
      };

      const measurePing = async () => {
        const start = Date.now();
        try {
          await fetch(`${API_URL}/`);
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
        fetch(`${API_URL}/api/stats/dashboard`, { headers: authHeader }),
        fetch(`${API_URL}/api/stats/slow-queries`, { headers: authHeader }),
        fetch(`${API_URL}/api/stats/analytics`, { headers: authHeader }),
        fetch(`${API_URL}/api/stats/logs`, { headers: authHeader })
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
      const res = await fetch(`${API_URL}/api/query/run`, {
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
    editor.updateOptions({
      scrollbar: { alwaysConsumeMouseWheel: true, vertical: 'visible' },
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
    const finalQuery = editorRef.current?.getValue() || query;
    if (!result || isAiLoading || !finalQuery.trim()) return;

    setIsAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API_URL}/api/query/ai-optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          query: finalQuery,
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

  const applyFix = (fix: string) => {
    editorRef.current?.setValue(fix);
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
      <header className={styles.header}>
        <div className={styles.navInner}>
          <div className={styles.logoArea} onClick={() => setActiveTab('dashboard')}>
            <Image src="/SQLens.png" alt="SQLens" width={42} height={42} priority className={styles.logoImg} />
            <div className={styles.logoText}>
              <span className={styles.brandName}>SQLens</span>
              <span className={styles.brandTag}>Performance Analyzer</span>
            </div>
          </div>

          <div className={styles.statusContainer}>
            <div className={styles.statusDot} style={{ background: pingMs > 0 ? 'var(--neon-green)' : '#EF4444' }}></div>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>{pingMs > 0 ? 'Connected' : 'Offline'}</span>
              <span className={styles.statusDivider}></span>
              <span className={styles.latency}>{pingMs > 0 ? `${pingMs}ms` : 'ERR'}</span>
            </div>
          </div>

          <nav className={styles.navigation}>
            <button onClick={() => handleTabChange('dashboard')} className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.navItemActive : ''}`}>
              <LayoutDashboard size={15} strokeWidth={2.2} style={{ marginRight: 8, opacity: 0.8 }} /> <span>Overview</span>
            </button>
            <button onClick={() => handleTabChange('queries')} className={`${styles.navItem} ${activeTab === 'queries' ? styles.navItemActive : ''}`}>
              <Database size={15} strokeWidth={2.2} style={{ marginRight: 8, opacity: 0.8 }} /> <span>Workbench</span>
            </button>
            <button onClick={() => handleTabChange('performance')} className={`${styles.navItem} ${activeTab === 'performance' ? styles.navItemActive : ''}`}>
              <PerformanceIcon size={15} strokeWidth={2.2} style={{ marginRight: 8, opacity: 0.8 }} /> <span>Analytics</span>
            </button>
            <button onClick={() => handleTabChange('logs')} className={`${styles.navItem} ${activeTab === 'logs' ? styles.navItemActive : ''}`}>
              <Clock size={15} strokeWidth={2.2} style={{ marginRight: 8, opacity: 0.8 }} /> <span>Logs</span>
            </button>
          </nav>

          <div className={styles.actionShell}>
            <div className={styles.themeSwitcher}>
              <button className={styles.themeToggle} onClick={() => setShowThemeMenu(!showThemeMenu)} title="Change Theme">
                <Palette size={18} />
              </button>
              {showThemeMenu && (
                <div className={styles.themeMenu}>
                  {THEMES.map((t) => (
                    <button key={t.id} className={`${styles.themeItem} ${theme === t.id ? styles.themeItemActive : ''}`} onClick={() => changeTheme(t.id)}>
                      <div className={styles.themeColor} style={{ background: t.color, border: '1px solid var(--border)' }}></div>
                      {t.name}
                      {theme === t.id && <Check size={14} style={{ marginLeft: 'auto' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className={styles.actionBtn} title="Settings"><Settings size={18} /></button>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Sign Out">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
        <div className={styles.gradientBar}></div>
      </header>

      <div className={styles.main} style={{ maxWidth: activeTab === 'queries' ? 1400 : 1140 }}>
        {activeTab === 'dashboard' ? (
          <TelemetryGrid
            view="dashboard"
            isStatsLoading={isStatsLoading}
            dbStats={dbStats}
            slowQueries={slowQueries}
            analyticsData={analyticsData}
          />
        ) : activeTab === 'performance' ? (
          <TelemetryGrid
            view="analytics"
            isStatsLoading={isStatsLoading}
            dbStats={dbStats}
            slowQueries={slowQueries}
            analyticsData={analyticsData}
          />
        ) : activeTab === 'logs' ? (
          <QueryHistory userLogs={userLogs} />
        ) : (
          <Workbench
            query={query}
            setQuery={setQuery}
            isExecuting={isExecuting}
            handleRun={handleRun}
            theme={theme}
            editorRef={editorRef}
            handleEditorDidMount={handleEditorDidMount}
            result={result}
            error={error}
            activeResultTab={activeResultTab}
            setActiveResultTab={setActiveResultTab}
            copyResults={copyResults}
            copied={copied}
            templates={TEMPLATES}
            loadTemplate={loadTemplate}
            history={history}
            resultsRef={resultsRef}
            renderSuggestions={() => (
              <InsightPanel
                suggestions={result?.suggestions || []}
                isAiLoading={isAiLoading}
                handleAiOptimize={handleAiOptimize}
                aiResult={aiResult}
                applyFix={applyFix}
              />
            )}
          />
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <div className={styles.footerBrand}>
              <Image src="/SQLens.png" alt="SQLens" width={32} height={32} className={styles.footerFavicon} />
              <div className={styles.footerBrandText}><span className={styles.footerBrandName}>SQLens</span></div>
            </div>
            <p className={styles.footerTagline}>The next generation of SQL performance analysis and optimization.</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.linkGroup}>
              <h4>Tool</h4>
              <a href="/">Analyzer</a>
              <a href="/">AI Optimize</a>
              <a href="/">Templates</a>
            </div>
            <div className={styles.linkGroup}>
              <h4>Support</h4>
              <a href="/docs">Documentation</a>
              <a href="/api-docs">API Docs</a>
              <a href="/help">Help Center</a>
            </div>
            <div className={styles.linkGroup}>
              <h4>Connect</h4>
              <a href="https://chaheltanna.vercel.app/" target="_blank" rel="noopener noreferrer">Website</a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom} style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className={styles.footerCopy} style={{ opacity: 0.4 }}>© 2026 SQLens. All rights reserved.</div>
          <div className={styles.footerCredit} style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(to right, #00E4FF, #a626a4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 15px rgba(0, 228, 255, 0.4)' }}>
              <ZapIcon size={14} style={{ color: '#00E4FF' }} /> Built for DB Performance Engineers
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
