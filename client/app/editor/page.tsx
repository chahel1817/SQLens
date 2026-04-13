'use client';

import React from 'react';
import SqlEditor from '@/components/SqlEditor';
import { useRouter } from 'next/navigation';

export default function EditorPage() {
    const router = useRouter();

    const handleAnalyze = (sql: string) => {
        // In a multi-page setup, we might persist the query to local storage or a state manager
        // and then navigate to the result page.
        localStorage.setItem('current_query', sql);
        router.push('/result');
    };

    return (
        <div className="p-8 h-[calc(100vh-64px)] flex flex-col">
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold">SQL Editor</h2>
                <p className="text-gray-400 text-sm">Write your PostgreSQL query to begin analysis.</p>
            </div>
            <div className="flex-1">
                <SqlEditor onAnalyze={handleAnalyze} isLoading={false} />
            </div>
        </div>
    );
}
