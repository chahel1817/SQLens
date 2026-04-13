'use client';

import React, { useMemo, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Panel,
    useNodesState,
    useEdgesState,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface PlanNode {
    type: string;
    relation: string | null;
    totalTime: number;
    totalCost: number;
    rows: number;
    children: PlanNode[];
}

interface PlanTreeProps {
    plan: PlanNode | null;
}

const PlanTree: React.FC<PlanTreeProps> = ({ plan }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (!plan) return;

        const newNodes: any[] = [];
        const newEdges: any[] = [];
        let idCounter = 0;

        const traverse = (node: PlanNode, x = 0, y = 0, parentId: string | null = null) => {
            const currentId = `${idCounter++}`;

            // Determine node color/style based on type
            const isScan = node.type.includes('Scan');
            const isJoin = node.type.includes('Join') || node.type.includes('Loop');

            newNodes.push({
                id: currentId,
                data: {
                    label: (
                        <div className="flex flex-col gap-1">
                            <div className="font-bold text-[11px] uppercase text-gray-400 tracking-wider font-mono">
                                {node.type}
                            </div>
                            {node.relation && (
                                <div className="text-blue-400 font-semibold">{node.relation}</div>
                            )}
                            <div className="flex justify-between gap-4 mt-2 text-[10px] text-gray-500 font-mono">
                                <span>Time: {node.totalTime.toFixed(2)}ms</span>
                                <span>Rows: {node.rows}</span>
                            </div>
                            {/* Cost Progress Bar */}
                            <div className="w-full h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                                <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${Math.min(100, (node.totalTime / 10) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )
                },
                position: { x, y },
                style: {
                    background: '#161b22',
                    color: '#e6edf3',
                    border: '1px solid #30363d',
                    borderRadius: '12px',
                    padding: '12px',
                    width: 220,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
                },
            });

            if (parentId) {
                newEdges.push({
                    id: `e${parentId}-${currentId}`,
                    source: parentId,
                    target: currentId,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#30363d', strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#30363d',
                    },
                });
            }

            if (node.children) {
                node.children.forEach((child, index) => {
                    // Automatic layout - horizontal offset for children
                    const offset = (index - (node.children.length - 1) / 2) * 280;
                    traverse(child, x + offset, y + 150, currentId);
                });
            }
        };

        traverse(plan);
        setNodes(newNodes);
        setEdges(newEdges);
    }, [plan, setNodes, setEdges]);

    if (!plan) {
        return (
            <div className="flex items-center justify-center h-full bg-[#0d1117] rounded-xl border border-gray-800 text-gray-500 italic">
                Run a query to visualize the execution plan
            </div>
        );
    }

    return (
        <div className="h-full bg-[#0d1117] rounded-xl border border-gray-800 overflow-hidden relative shadow-2xl">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background color="#30363d" gap={20} />
                <Controls />
                <Panel position="top-left" className="bg-[#161b22]/80 backdrop-blur-md p-2 rounded-lg border border-gray-800 text-xs text-blue-400 font-bold uppercase tracking-wider">
                    Query Execution Plan
                </Panel>
            </ReactFlow>
        </div>
    );
};

export default PlanTree;
