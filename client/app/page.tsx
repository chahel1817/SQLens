'use client';

import React, { useState } from 'react';
import SqlEditor from '@/components/SqlEditor';
import PlanTree from '@/components/PlanTree';
import Suggestions from '@/components/Suggestions';
import QueryHistory from '@/components/QueryHistory';
import { analyzeQuery } from '@/lib/api';
import { Database, Search, Cpu, Activity, Info } from 'lucide-react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (sql: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyzeQuery(sql);
      const data = response.data;
      setResult(data);

      // Update history
      const newHistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        sql,
        timestamp: new Date().toISOString(),
        time: data.summary.executionTime
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#010409] text-gray-100 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Premium Navbar */}
      <header className="h-16 border-b border-gray-800 bg-[#0d1117]/80 backdrop-blur-xl sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
            <Cpu className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              SQLLens <span className="text-blue-500 font-black">AI</span>
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Query Optimizer Visualizer</p>
          </div>
        </div>

        <nav className="flex items-center gap-6">
          <div className="flex items-center gap-4 py-1 px-4 bg-gray-900/50 rounded-full border border-gray-800/50">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Database size={12} className="text-blue-500" />
              <span className="font-mono">localhost:5432</span>
            </div>
            <div className="w-[1px] h-4 bg-gray-800" />
            <div className="flex items-center gap-2 text-xs text-green-500">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span>Connected</span>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Info size={18} />
          </button>
        </nav>
      </header>

      {/* Main Content Dashboard */}
      <div className="flex-1 p-6 grid grid-cols-12 gap-6 max-w-[1920px] mx-auto w-full">

        {/* Left Column: Editor & History */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="flex-1 min-h-[400px]">
            <SqlEditor onAnalyze={handleAnalyze} isLoading={loading} />
          </div>
          <div className="bg-[#0d1117] rounded-xl border border-gray-800 p-4 h-[300px] shadow-xl">
            <QueryHistory history={history} onSelect={handleAnalyze} />
          </div>
        </div>

        {/* Right Column: Visualizer & Suggestions */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Plan Visualization */}
          <div className="flex-1 min-h-[500px]">
            <PlanTree plan={result?.executionPlan} />
          </div>

          {/* Bottom Row: Stats & Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[300px]">
            {/* Quick Stats Panel */}
            <div className="lg:col-span-1 bg-[#0d1117] rounded-xl border border-gray-800 p-6 shadow-xl flex flex-col justify-between">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Activity size={14} className="text-green-500" />
                Performance Metrics
              </h3>

              <div className="space-y-4">
                <MetricItem
                  label="Planning Time"
                  value={`${result?.summary.planningTime?.toFixed(3) || '0.000'} ms`}
                  color="text-blue-400"
                />
                <MetricItem
                  label="Execution Time"
                  value={`${result?.summary.executionTime?.toFixed(3) || '0.000'} ms`}
                  color="text-green-400"
                />
                <MetricItem
                  label="Total Time"
                  value={`${result?.summary.totalTime?.toFixed(3) || '0.000'} ms`}
                  color="text-white"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-black tracking-tighter">
                  <span>Engine: PostgreSQL 16</span>
                  <span className="text-blue-500/50">OPTIMIZED</span>
                </div>
              </div>
            </div>

            {/* Suggestions Panel */}
            <div className="lg:col-span-2 bg-[#0d1117] rounded-xl border border-gray-800 p-6 shadow-xl overflow-hidden">
              <Suggestions suggestions={result?.suggestions || []} />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #484f58;
        }
      `}</style>
    </main>
  );
}

function MetricItem({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{label}</span>
      <span className={`text-2xl font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function AlertCircle({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
