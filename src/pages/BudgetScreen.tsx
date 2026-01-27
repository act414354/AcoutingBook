import React, { useCallback } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    addEdge,
    Controls,
    Background,
    MarkerType
} from '@xyflow/react';
import type { Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Initial Data Mock
const initialNodes = [
    {
        id: 'income-1',
        type: 'input',
        data: { label: 'Salary +$5,000' },
        position: { x: 150, y: 20 },
        style: { backgroundColor: '#10b981', color: 'white', borderColor: '#059669', borderRadius: '12px', width: 150 }
    },
    {
        id: 'exp-1',
        data: { label: 'Rent -$2,000' },
        position: { x: 20, y: 250 },
        style: { backgroundColor: '#ef4444', color: 'white', borderColor: '#b91c1c', borderRadius: '12px' }
    },
    {
        id: 'exp-2',
        data: { label: 'Food -$800' },
        position: { x: 180, y: 250 },
        style: { backgroundColor: '#ef4444', color: 'white', borderColor: '#b91c1c', borderRadius: '12px' }
    },
    {
        id: 'exp-3',
        data: { label: 'Invest -$1,200' },
        position: { x: 340, y: 250 },
        style: { backgroundColor: '#3b82f6', color: 'white', borderColor: '#2563eb', borderRadius: '12px' }
    },
];

const initialEdges = [
    { id: 'e1-2', source: 'income-1', target: 'exp-1', animated: true, style: { strokeWidth: 8, stroke: '#10b981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } },
    { id: 'e1-3', source: 'income-1', target: 'exp-2', animated: true, style: { strokeWidth: 4, stroke: '#10b981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } },
    { id: 'e1-4', source: 'income-1', target: 'exp-3', animated: true, style: { strokeWidth: 5, stroke: '#3b82f6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
];

export const BudgetScreen: React.FC = () => {
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges],
    );

    return (
        <div className="h-[calc(100vh-200px)] w-full bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl relative">
            <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-gray-700">
                <span className="text-xs text-blue-400 font-mono">Flow Mode</span>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
            >
                <Background color="#374151" gap={16} />
                <Controls className="bg-white/10 border-white/20 text-white fill-white" />
            </ReactFlow>
        </div>
    );
};
