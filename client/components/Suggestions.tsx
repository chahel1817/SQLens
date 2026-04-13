'use client';

import React from 'react';
import { AlertCircle, Zap, ShieldCheck, Microscope } from 'lucide-react';

interface Suggestion {
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    recommendation: string;
    impact: string;
}

interface SuggestionsProps {
    suggestions: Suggestion[];
}

const Suggestions: React.FC<SuggestionsProps> = ({ suggestions }) => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'PERFORMANCE': return <Zap className="text-yellow-400" size={18} />;
            case 'STATISTICS': return <Microscope className="text-blue-400" size={18} />;
            case 'JOIN_OPTIMIZATION': return <ShieldCheck className="text-green-400" size={18} />;
            default: return <AlertCircle className="text-gray-400" size={18} />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'HIGH': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} className="text-yellow-500" />
                Optimizer Insights
            </h3>

            <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                {suggestions.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-600 text-sm">
                        No suggestions yet. Run a query!
                    </div>
                ) : (
                    suggestions.map((s, i) => (
                        <div
                            key={i}
                            className="group bg-[#161b22] border border-gray-800 p-4 rounded-xl hover:border-blue-500/50 transition-all duration-300 shadow-lg"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {getIcon(s.type)}
                                    <span className="text-xs font-bold text-gray-300 uppercase tracking-tight">{s.type.replace('_', ' ')}</span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getSeverityColor(s.severity)}`}>
                                    {s.severity}
                                </span>
                            </div>

                            <p className="text-sm text-gray-200 font-semibold mb-1">{s.message}</p>
                            <p className="text-xs text-gray-400 leading-relaxed mb-3">{s.recommendation}</p>

                            <div className="pt-3 border-t border-gray-800/50 flex items-center justify-between">
                                <span className="text-[10px] text-gray-500 font-medium">POTENTIAL IMPACT</span>
                                <span className="text-[10px] text-blue-400 font-bold uppercase">{s.impact}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Suggestions;
