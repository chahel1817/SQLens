export type Suggestion = {
    type: string;
    message: string;
    improvement: string;
    fix?: string;
};

export type AiResult = {
    rating?: string;
    summary?: string;
    tips?: { title: string; detail: string; fix?: string }[];
    optimizedQuery?: string | null;
    error?: string;
};

export type QueryResult = {
    results: Record<string, unknown>[];
    rowCount: number;
    executionTime: string;
    explainPlan: any;
    suggestions: Suggestion[];
};

export type DbStats = {
    qps: string;
    connections: string;
    slowQueries: string;
    p95?: string;
    uptime?: number;
};

export type SlowQuery = {
    query: string;
    time: number;
    date: string;
};

export type AnalyticsData = {
    throughputTrend: number[];
    indexHitRate: number;
};

export type UserLog = {
    time: string;
    event: string;
    detail: string;
    status: 'SUCCESS' | 'WARNING';
};
