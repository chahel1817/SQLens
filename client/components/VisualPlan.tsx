'use client';

import React, { useState } from 'react';
import {
    Layers,
    Search,
    ArrowRightLeft,
    GitMerge,
    Filter,
    Zap,
    Database,
    Clock,
    Activity,
    ChevronDown,
    ChevronRight,
    Cpu,
    HardDrive,
    TrendingUp,
    Info
} from 'lucide-react';
import styles from '../app/page.module.css';

interface PlanNodeProps {
    node: any;
    depth?: number;
    totalRootCost: number;
    totalRootTime?: number;
}

const PlanNode: React.FC<PlanNodeProps> = ({ node, depth = 0, totalRootCost, totalRootTime }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!node) return null;

    const nodeType = node['Node Type'];
    const relationName = node['Relation Name'];
    const alias = node['Alias'];
    const actualRows = node['Actual Rows'];
    const planRows = node['Plan Rows'];
    const totalCost = node['Total Cost'];
    const actualTotalTime = node['Actual Total Time'];
    const children = node.Plans || [];

    // Calculate percentages
    const costPercentage = totalRootCost > 0 ? (totalCost / totalRootCost) * 100 : 0;
    const timePercentage = totalRootTime && totalRootTime > 0 ? (actualTotalTime / totalRootTime) * 100 : 0;

    // Choose icon based on node type
    const getIcon = () => {
        if (nodeType.includes('Scan')) return <Search size={16} />;
        if (nodeType.includes('Join')) return <GitMerge size={16} />;
        if (nodeType === 'Sort') return <Layers size={16} />;
        if (nodeType === 'Aggregate') return <Activity size={16} />;
        if (nodeType === 'Filter') return <Filter size={16} />;
        if (nodeType === 'Limit') return <Clock size={16} />;
        if (nodeType.includes('Parallel')) return <Cpu size={16} />;
        return <Zap size={16} />;
    };

    // Determine color/severity based on percentages
    const getNodeVariant = () => {
        if (costPercentage > 40 || (timePercentage > 40)) return styles.nodeCritical;
        if (costPercentage > 15 || (timePercentage > 15)) return styles.nodeWarning;
        return styles.nodeDefault;
    };

    return (
        <div className={styles.planNodeWrapper} style={{ marginLeft: depth > 0 ? 32 : 0 }}>
            {depth > 0 && <div className={styles.nodeConnector} />}

            <div className={`${styles.planNode} ${getNodeVariant()}`}>
                <div className={styles.nodeHeader} onClick={() => setIsExpanded(!isExpanded)}>
                    <div className={styles.nodeExpander}>
                        {children.length > 0 ? (
                            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                        ) : (
                            <div style={{ width: 14 }} />
                        )}
                    </div>
                    <div className={styles.nodeIcon}>{getIcon()}</div>
                    <div className={styles.nodeContent}>
                        <div className={styles.nodeTypeLine}>
                            <span className={styles.nodeType}>{nodeType}</span>
                            {node['Parallel Aware'] && <span className={styles.parallelBadge}>Parallel</span>}
                        </div>
                        {relationName && (
                            <div className={styles.nodeRelation}>
                                <HardDrive size={10} />
                                <span>{relationName} <strong>{alias && alias !== relationName ? `as ${alias}` : ''}</strong></span>
                            </div>
                        )}
                    </div>
                    <div className={styles.nodePercentageBadge}>
                        {Math.round(costPercentage)}% Cost
                    </div>
                </div>

                <div className={styles.nodeImpactBar}>
                    <div
                        className={styles.impactFill}
                        style={{
                            width: `${costPercentage}%`,
                            background: costPercentage > 40 ? 'var(--neon-pink)' : costPercentage > 15 ? '#F59E0B' : 'var(--neon-green)'
                        }}
                    />
                </div>

                <div className={styles.nodeGrid}>
                    <div className={styles.gridItem}>
                        <div className={styles.gridLabel}>Rows</div>
                        <div className={styles.gridValue}>{actualRows ?? planRows}</div>
                    </div>
                    <div className={styles.gridItem}>
                        <div className={styles.gridLabel}>Total Cost</div>
                        <div className={styles.gridValue}>{totalCost}</div>
                    </div>
                    {actualTotalTime !== undefined && (
                        <div className={styles.gridItem}>
                            <div className={styles.gridLabel}>Actual Time</div>
                            <div className={styles.gridValue}>{actualTotalTime}ms</div>
                        </div>
                    )}
                    <div className={styles.gridItem}>
                        <div className={styles.gridLabel}>Width</div>
                        <div className={styles.gridValue}>{node['Plan Width']}B</div>
                    </div>
                </div>

                {node.Filter && (
                    <div className={styles.nodeMeta}>
                        <Filter size={10} /> <span>{node.Filter}</span>
                    </div>
                )}
                {node['Index Name'] && (
                    <div className={`${styles.nodeMeta} ${styles.indexInfo}`}>
                        <TrendingUp size={10} /> <span>Index: {node['Index Name']}</span>
                    </div>
                )}
            </div>

            {isExpanded && children.length > 0 && (
                <div className={styles.childPlans}>
                    {children.map((subPlan: any, i: number) => (
                        <PlanNode
                            key={i}
                            node={subPlan}
                            depth={depth + 1}
                            totalRootCost={totalRootCost}
                            totalRootTime={totalRootTime}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const VisualPlan: React.FC<{ plan: any }> = ({ plan }) => {
    if (!plan || !plan[0] || !plan[0].Plan) {
        return (
            <div className={styles.emptyPlan}>
                <Database size={40} opacity={0.2} />
                <p>No execution plan available.</p>
            </div>
        );
    }

    const rootNode = plan[0].Plan;
    const totalCost = rootNode['Total Cost'];
    const totalTime = rootNode['Actual Total Time'];

    return (
        <div className={styles.visualPlanContainer}>
            <div className={styles.visualPlanHeader}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerTitle}>
                        <Activity size={18} color="var(--brand-pink)" />
                        <h3>Query Insights Tree</h3>
                    </div>
                    <p>Interactive tree representing the engine's execution path.</p>
                </div>
                <div className={styles.headerStats}>
                    <div className={styles.headerStatBox}>
                        <span>Total Cost</span>
                        <strong>{totalCost}</strong>
                    </div>
                    {totalTime && (
                        <div className={styles.headerStatBox}>
                            <span>Total Time</span>
                            <strong>{totalTime}ms</strong>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.planTreeScroll}>
                <div className={styles.planTree}>
                    <PlanNode
                        node={rootNode}
                        totalRootCost={totalCost}
                        totalRootTime={totalTime}
                    />
                </div>
            </div>
        </div>
    );
};

export default VisualPlan;
