'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType, Panel } from '@xyflow/react';
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

const getStatusColor = (state: string, isOverdue?: boolean) => {
  if (isOverdue) return { bg: '#fef2f2', border: '#fca5a5', text: '#ef4444' };
  switch (state) {
    case 'BACKLOG': return { bg: '#fef2f2', border: '#fca5a5', text: '#ef4444' };
    case 'TODO': return { bg: '#e2e8f0', border: '#94a3b8', text: '#334155' };
    case 'IN_PROGRESS': return { bg: '#fefce8', border: '#eab308', text: '#854d0e' };
    case 'REVIEW': return { bg: '#fef3c7', border: '#fcd34d', text: '#b45309' };
    case 'DONE': return { bg: '#d1fae5', border: '#6ee7b7', text: '#047857' };
    case 'CANCELED': return { bg: '#fef2f2', border: '#fca5a5', text: '#ef4444' };
    default: return { bg: '#ffffff', border: '#e2e8f0', text: '#0f172a' };
  }
};

export default function GraphPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

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

  const { data: cpmResults, isLoading: cpmLoading } = useQuery({
    queryKey: ['cpmResults', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/cpm/results`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch CPM results');
      }
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
      queryClient.invalidateQueries({ queryKey: ['cpmResults', projectId] });
      alert('CPM Calculation triggered! Results updated.');
    }
  });

  useEffect(() => {
    if (tasksLoading || depsLoading || cpmLoading) return;

    const taskDetails = cpmResults?.details?.taskDetails || {};
    const criticalPath = cpmResults?.criticalPath || [];

    const initialNodes = tasks.map((t: any) => {
      const details = taskDetails[t.id];
      const isCritical = details?.isCritical || false;
      const opacity = showCriticalOnly && !isCritical ? 0.2 : 1;
      const isOverdue = t.state === 'BACKLOG' || (t.state !== 'DONE' && t.endDate && new Date(t.endDate) < new Date());
      const statusColors = getStatusColor(t.state, isOverdue);
      
      return {
        id: t.id,
        data: { 
          label: (
            <div title={
              details 
                ? `Task: ${t.title}\nDuration: ${t.duration}d\nES: ${details.es} | EF: ${details.ef}\nLS: ${details.ls} | LF: ${details.lf}\nSlack: ${details.slack}\nCritical: ${isCritical ? 'Yes' : 'No'}`
                : `Task: ${t.title}\nDuration: ${t.duration}d\nCritical: No`
            }>
              <div className="font-semibold truncate">{t.title}</div>
              <div className="text-xs mt-1 font-medium px-1.5 py-0.5 rounded inline-block bg-white/50 border border-black/5">
                {isOverdue ? `OVERDUE ${t.state !== 'BACKLOG' ? `(${t.state})` : ''}` : t.state}
              </div>
              <div className="text-[10px] opacity-80 mt-1">
                {t.duration}d {details ? `| Slack: ${details.slack}` : ''}
              </div>
            </div>
          )
        },
        style: {
          background: statusColors.bg,
          border: isCritical ? '2px solid #ef4444' : `1px solid ${statusColors.border}`,
          borderRadius: '8px',
          width: nodeWidth,
          padding: '10px',
          fontSize: '12px',
          fontWeight: '500',
          color: statusColors.text,
          boxShadow: isCritical ? '0 0 0 4px rgba(239, 68, 68, 0.2)' : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          opacity,
          transition: 'all 0.3s ease'
        }
      };
    });

    const initialEdges = dependencies.map((d: any) => {
      const sourceIsCritical = criticalPath.includes(d.predecessorTaskId);
      const targetIsCritical = criticalPath.includes(d.successorTaskId);
      const isCriticalEdge = sourceIsCritical && targetIsCritical;
      const opacity = showCriticalOnly && !isCriticalEdge ? 0.1 : 1;

      return {
        id: d.id,
        source: d.predecessorTaskId,
        target: d.successorTaskId,
        animated: false,
        label: d.dependencyType?.toUpperCase() === 'FS' ? undefined : d.dependencyType,
        labelBgStyle: { fill: isCriticalEdge ? '#fee2e2' : '#f8fafc' },
        labelStyle: { fill: isCriticalEdge ? '#ef4444' : '#64748b', fontWeight: isCriticalEdge ? 600 : 400 },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: isCriticalEdge ? '#ef4444' : '#94a3b8',
          width: isCriticalEdge ? 10 : 15,
          height: isCriticalEdge ? 10 : 15
        },
        style: { 
          stroke: isCriticalEdge ? '#ef4444' : '#94a3b8', 
          strokeWidth: isCriticalEdge ? 3 : 1.5,
          opacity,
          transition: 'all 0.3s ease'
        }
      };
    });

    const layouted = getLayoutedElements(initialNodes, initialEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [tasks, dependencies, cpmResults, tasksLoading, depsLoading, cpmLoading, showCriticalOnly, setNodes, setEdges]);

  if (tasksLoading || depsLoading) {
    return <div className="p-8 text-slate-500">Generating graph...</div>;
  }

  return (
    <div className="h-full flex flex-col relative bg-slate-50">
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={() => runCpm.mutate()}
          disabled={runCpm.isPending}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black/90 transition-colors shadow-sm disabled:opacity-50"
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
          
          <Panel position="bottom-left" className="bg-white/90 p-4 rounded-xl shadow-lg border border-slate-200 text-sm backdrop-blur-sm">
            <h4 className="font-semibold text-slate-800 mb-3">Graph Legend</h4>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 mb-4 text-xs border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#fef2f2] border border-[#fca5a5]"></div><span className="text-slate-600">Overdue</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#e2e8f0] border border-[#94a3b8]"></div><span className="text-slate-600">Todo</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#fefce8] border border-[#eab308]"></div><span className="text-slate-600">In Progress</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#fef3c7] border border-[#fcd34d]"></div><span className="text-slate-600">Review</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#d1fae5] border border-[#6ee7b7]"></div><span className="text-slate-600">Done</span></div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-100 border border-slate-300 shadow-sm" />
                <span className="text-slate-600">Normal Task</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-100 border-2 border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]" />
                <span className="text-slate-900 font-medium">Critical Task (Red Ring)</span>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                <div className="w-6 h-0.5 bg-slate-400" />
                <span className="text-slate-600">Normal Dependency</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-red-500 rounded-full" />
                <span className="text-slate-900 font-medium">Critical Dependency</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showCriticalOnly}
                  onChange={(e) => setShowCriticalOnly(e.target.checked)}
                  className="rounded text-black focus:ring-black"
                />
                <span className="text-slate-700 font-medium text-sm">Show Critical Path Only</span>
              </label>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
