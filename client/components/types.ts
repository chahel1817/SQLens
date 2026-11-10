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

export type ExplainPlanNode = {
    'Node Type': string;
    'Relation Name'?: string;
    Alias?: string;
    'Actual Rows'?: number;
    'Plan Rows'?: number;
    'Total Cost': number;
    'Actual Total Time'?: number;
    'Plan Width'?: number;
    'Parallel Aware'?: boolean;
    Filter?: string;
    'Index Name'?: string;
    'Shared Hit Blocks'?: number;
    'Shared Read Blocks'?: number;
    'Shared Dirtied Blocks'?: number;
    'Shared Written Blocks'?: number;
    Plans?: ExplainPlanNode[];
};

export type ExplainPlanWrapper = {
    Plan: ExplainPlanNode;
    'Planning Time'?: number;
    'Execution Time'?: number;
};

export type JoinAlgorithmInfo = {
    nodeType: string;
    strategy: string;
    cost: number;
    actualTimeMs: number | null;
    rows: number;
};

export type ScanMethodInfo = {
    nodeType: string;
    relation: string | null;
    indexName: string | null;
    rows: number;
    cost: number;
};

export type RowMisestimation = {
    nodeType: string;
    relation: string | null;
    planRows: number;
    actualRows: number;
    ratio: number;
    direction: 'underestimated' | 'overestimated';
};

export type PlanMetrics = {
    planningTimeMs: number | null;
    executionTimeMs: number | null;
    sharedHitBlocks: number;
    sharedReadBlocks: number;
    sharedDirtiedBlocks: number;
    sharedWrittenBlocks: number;
    bufferHitRate: number | null;
    usedIndex: boolean;
    seqScanCount: number;
    indexScanCount: number;
    joinAlgorithms?: JoinAlgorithmInfo[];
    scanMethods?: ScanMethodInfo[];
    misestimations?: RowMisestimation[];
};

export type PipelineStageInfo = {
    rawQuery: string;
    translatedQuery: string;
    ast: unknown;
    astMode: 'ast' | 'regex-fallback' | 'meta';
    parseError: string | null;
    statementTypes: string[];
    tables: string[];
    dialectTransforms: string[];
};

export type QueryResult = {
    results: Record<string, unknown>[];
    rowCount: number | null;
    executionTime: string;
    explainPlan: ExplainPlanWrapper[] | null;
    metrics?: PlanMetrics | null;
    pipeline?: PipelineStageInfo | null;
    suggestions: Suggestion[];
};

export type PoolStats = {
    total: number;
    idle: number;
    waiting: number;
    active: number;
};

export type DbStats = {
    qps: string;
    connections: string;
    poolStats?: PoolStats;
    slowQueries: string;
    p95?: string;
    uptime?: string | number;
};

export type SlowQuery = {
    query: string;
    time: number;
    date: string;
};

export type AnalyticsData = {
    throughputTrend: number[];
    throughputCounts?: number[];
    throughputLabels?: string[];
    indexHitRate: number;
    bufferHitRate?: number | null;
    totalQueries?: number;
    explainedQueries?: number;
    seqScanQueries?: number;
    totalHitBlocks?: number;
    totalReadBlocks?: number;
};

export type UserLog = {
    time: string;
    event: string;
    detail: string;
    status: 'SUCCESS' | 'WARNING' | 'SLOW' | 'FAILED';
};
