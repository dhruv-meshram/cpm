'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Play, Activity } from 'lucide-react';

const nodeWidth = 172;
const nodeHeight = 56;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: 'left',
      sourcePosition: 'right',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

export default function GraphPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    }
  });

  const { data: dependencies = [], isLoading: depsLoading } = useQuery({
    queryKey: ['dependencies', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/dependencies`);
      if (!res.ok) throw new Error('Failed to fetch deps');
      return res.json();
    }
  });

  const runCpm = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/cpm/run`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run CPM');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      // In a real app, we might wait for WS or poll to fetch updated critical path info.
      alert('CPM Calculation trigger sent!');
    }
  });

  useEffect(() => {
    if (tasksLoading || depsLoading) return;

    const initialNodes = tasks.map((t: any) => ({
      id: t.id,
      data: { label: `${t.title} (${t.duration}d)` },
      style: {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        width: nodeWidth,
        padding: '10px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#0f172a',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
      }
    }));

    const initialEdges = dependencies.map((d: any) => ({
      id: d.id,
      source: d.predecessorTaskId,
      target: d.successorTaskId,
      animated: true,
      label: d.dependencyType,
      labelBgStyle: { fill: '#f8fafc' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      style: { stroke: '#94a3b8', strokeWidth: 1.5 }
    }));

    const layouted = getLayoutedElements(initialNodes, initialEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [tasks, dependencies, tasksLoading, depsLoading, setNodes, setEdges]);

  if (tasksLoading || depsLoading) {
    return <div className="p-8 text-slate-500">Generating graph...</div>;
  }

  return (
    <div className="h-full flex flex-col relative bg-slate-50">
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={() => runCpm.mutate()}
          disabled={runCpm.isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {runCpm.isPending ? <Activity size={16} className="animate-spin" /> : <Play size={16} />}
          Run CPM Engine
        </button>
      </div>
      
      <div className="flex-1 w-full h-full">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange} 
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-right"
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background color="#cbd5e1" gap={16} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
