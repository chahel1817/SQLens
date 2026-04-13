'use client';

import React from 'react';
import { History, Database, Clock, ChevronRight } from 'lucide-react';

interface HistoryItem {
    id: string;
    sql: string;
    timestamp: string;
    time: number;
}

interface QueryHistoryProps {
    history: HistoryItem[];
    onSelect: (sql: string) => void;
}

const QueryHistory: React.FC<QueryHistoryProps> = ({ history, onSelect }) => {
    return (
        <div className="flex flex-col gap-4 h-full">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
                <History size={14} className="text-blue-500" />
                Recent Queries
            </h3>

            <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                {history.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-600 text-xs italic">
                        No history yet
                    </div>
                ) : (
                    history.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item.sql)}
                            className="group text-left p-3 rounded-lg hover:bg-blue-500/5 border border-transparent hover:border-blue-500/20 transition-all"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                    <Database size={10} />
                                    <span>POSTGRES</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <Clock size={10} />
                                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-300 font-mono line-clamp-2 mb-2 group-hover:text-blue-400 transition-colors">
                                {item.sql}
                            </p>

                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-600 uppercase">EXEC TIME: {item.time.toFixed(2)}ms</span>
                                <ChevronRight size={12} className="text-gray-700 group-hover:text-blue-500 transition-colors" />
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

export default QueryHistory;
