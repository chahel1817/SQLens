'use client';

import React, { useEffect, useState } from 'react';
import PlanTree from '@/components/PlanTree';
import Suggestions from '@/components/Suggestions';
import { analyzeQuery } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function ResultPage() {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const sql = localStorage.getItem('current_query');
        if (!sql) {
            router.push('/editor');
            return;
        }

        const runAnalysis = async () => {
            try {
                const response = await analyzeQuery(sql);
                setResult(response.data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        runAnalysis();
    }, [router]);

    return (
        <div className="p-8 h-[calc(100vh-64px)] flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.push('/editor')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Editor</span>
                </button>
                <h2 className="text-2xl font-bold">Analysis Results</h2>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                <div className="col-span-12 lg:col-span-8">
                    <PlanTree plan={result?.executionPlan} />
                </div>
                <div className="col-span-12 lg:col-span-4 bg-[#0d1117] rounded-xl border border-gray-800 p-6 overflow-hidden flex flex-col shadow-xl">
                    <Suggestions suggestions={result?.suggestions || []} />
                </div>
            </div>
        </div>
    );
}
