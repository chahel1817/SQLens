'use client';

import React, { useState } from 'react';
import { Play, RotateCcw, Copy, Trash2 } from 'lucide-react';

interface SqlEditorProps {
    onAnalyze: (sql: string) => void;
    isLoading: boolean;
}

const SqlEditor: React.FC<SqlEditorProps> = ({ onAnalyze, isLoading }) => {
    const [sql, setSql] = useState('SELECT * FROM users u\nJOIN orders o ON u.id = o.user_id\nWHERE u.id = 1;');

    const handleAnalyze = () => {
        if (sql.trim()) {
            onAnalyze(sql);
        }
    };

    const handleClear = () => setSql('');

    return (
        <div className="flex flex-col h-full bg-[#0d1117] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 mr-4">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs font-mono text-gray-400">query.sql</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleClear}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                        title="Clear Query"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-all shadow-lg shadow-blue-900/20"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Play size={14} fill="currentColor" />
                        )}
                        {isLoading ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                </div>
            </div>

            {/* Code Input Area */}
            <div className="relative flex-1 group">
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#0d1117] border-r border-gray-800/50 flex flex-col items-center py-4 text-gray-600 font-mono text-xs select-none">
                    {sql.split('\n').map((_, i) => (
                        <div key={i} className="h-6 flex items-center">{i + 1}</div>
                    ))}
                </div>
                <textarea
                    value={sql}
                    onChange={(e) => setSql(e.target.value)}
                    spellCheck={false}
                    className="w-full h-full pl-16 pr-4 py-4 bg-transparent text-gray-100 font-mono text-sm resize-none focus:outline-none leading-6 selection:bg-blue-500/30"
                    placeholder="-- Enter your SQL query here..."
                />
            </div>

            {/* Editor Footer */}
            <div className="px-4 py-2 bg-[#161b22] border-t border-gray-800 flex justify-between items-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    PostgreSQL EXPLAIN ANALYZE
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                    UTF-8 | SQL
                </div>
            </div>
        </div>
    );
};

export default SqlEditor;
