'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Plus, Clock, MoreVertical, Edit2, Search, Filter, Users, Tag, ChevronDown, 
  LayoutGrid, List, Table, Activity, AlertCircle, AlertTriangle, CheckCircle2,
  Calendar, Flag, MoreHorizontal, Maximize2, Minimize2, Copy, Trash2, ArrowRightLeft,
  X, MessageSquare, PlayCircle, BarChart2
} from 'lucide-react';
import { TaskModal } from '@/components/TaskModal';

const COLUMNS = [
  { id: 'BACKLOG', label: 'Backlog', color: 'bg-slate-200', text: 'text-slate-700', wipLimit: null },
  { id: 'TODO', label: 'To Do', color: 'bg-slate-400', text: 'text-slate-800', wipLimit: 20 },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500', text: 'text-blue-700', wipLimit: 15 },
  { id: 'REVIEW', label: 'Review', color: 'bg-amber-400', text: 'text-amber-700', wipLimit: 10 },
  { id: 'DONE', label: 'Done', color: 'bg-emerald-500', text: 'text-emerald-700', wipLimit: null },
];

export default function TasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  
  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'table'>('board');
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    }
  });

  const updateTaskState = useMutation({
    mutationFn: async ({ taskId, state }: { taskId: string, state: string }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setTaskToEdit(null);
        setIsModalOpen(true);
      } else if (e.key === '/' && document.getElementById('task-search')) {
        e.preventDefault();
        document.getElementById('task-search')?.focus();
      } else if (e.key === 'Escape' && selectedTask) {
        setSelectedTask(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTask]);

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, state: string) => {
    e.preventDefault();
    if (draggedTaskId) {
      const task = tasks.find((t: any) => t.id === draggedTaskId);
      if (task && task.state !== state) {
        updateTaskState.mutate({ taskId: draggedTaskId, state });
      }
    }
    setDraggedTaskId(null);
  };

  const toggleColumn = (colId: string) => {
    const newCollapsed = new Set(collapsedCols);
    if (newCollapsed.has(colId)) newCollapsed.delete(colId);
    else newCollapsed.add(colId);
    setCollapsedCols(newCollapsed);
  };

  if (isLoading) return <div className="p-8 text-slate-500 flex items-center justify-center h-full"><Activity className="animate-spin mr-2"/> Loading execution workspace...</div>;

  const filteredTasks = tasks.filter((t: any) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full flex flex-col bg-slate-50/50 relative overflow-hidden">
      
      {/* 1. Task Management Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              id="task-search"
              type="text" 
              placeholder="Search Tasks (Press '/')" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="h-4 w-px bg-slate-200 mx-2"></div>
          <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
            <Users size={14} /> Assignee
          </button>
          <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
            <Flag size={14} /> Priority
          </button>
          <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
            <Filter size={14} /> Status
          </button>
          <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
            <Tag size={14} /> Labels
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-sm ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-sm ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-sm ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <Table size={16} />
            </button>
          </div>
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          <button className="flex items-center gap-1.5 text-sm text-slate-600 font-medium px-2 py-1.5 rounded hover:bg-slate-100 transition-colors">
            Group: Status <ChevronDown size={14} />
          </button>
          <button 
            onClick={() => {
              setTaskToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-all shadow-sm active:scale-95"
          >
            <Plus size={16} /> Create Task
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-6">
        
        {/* 2. Task Summary Section & Workload Visualization & 15. Mini Analytics */}
        <div className="grid grid-cols-12 gap-4 mb-6 shrink-0">
          <div className="col-span-8 flex gap-4">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col justify-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Tasks</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{tasks.length}</span>
                <span className="text-sm text-slate-400">Total</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col justify-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Completed</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600">{tasks.filter((t:any) => t.state === 'DONE').length}</span>
                <span className="text-sm text-emerald-600/70 font-medium">{Math.round((tasks.filter((t:any) => t.state === 'DONE').length / Math.max(tasks.length, 1)) * 100)}%</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col justify-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">In Progress</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-600">{tasks.filter((t:any) => t.state === 'IN_PROGRESS').length}</span>
                <span className="text-sm text-slate-400">Active</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col justify-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Critical Path</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-600">42d</span>
                <span className="text-sm text-rose-600/70 font-medium">Length</span>
              </div>
            </div>
          </div>

          <div className="col-span-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col">
             <div className="flex justify-between items-center mb-2">
               <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Team Workload</span>
               <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">View All</span>
             </div>
             <div className="space-y-2">
               <div className="flex items-center text-xs">
                 <span className="w-12 truncate font-medium text-slate-700">John</span>
                 <div className="flex-1 h-2 bg-slate-100 rounded-full mx-2 overflow-hidden">
                   <div className="h-full bg-blue-500 w-[80%] rounded-full"></div>
                 </div>
                 <span className="w-8 text-right text-slate-500">80%</span>
               </div>
               <div className="flex items-center text-xs">
                 <span className="w-12 truncate font-medium text-slate-700">Sarah</span>
                 <div className="flex-1 h-2 bg-slate-100 rounded-full mx-2 overflow-hidden">
                   <div className="h-full bg-emerald-500 w-[60%] rounded-full"></div>
                 </div>
                 <span className="w-8 text-right text-slate-500">60%</span>
               </div>
             </div>
          </div>
        </div>

        {/* Board Area */}
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start relative">
          
          {COLUMNS.map(col => {
            const colTasks = filteredTasks.filter((t: any) => t.state === col.id);
            const isCollapsed = collapsedCols.has(col.id);
            
            if (isCollapsed) {
              return (
                <div key={col.id} className="flex-shrink-0 w-16 bg-slate-200/50 border border-slate-200 rounded-xl h-full flex flex-col items-center py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => toggleColumn(col.id)}>
                   <div className="flex flex-col items-center gap-4">
                     <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-full shadow-sm">{colTasks.length}</span>
                     <div className="writing-vertical text-sm font-semibold text-slate-600 tracking-wider transform -rotate-180" style={{ writingMode: 'vertical-rl' }}>
                       {col.label}
                     </div>
                   </div>
                </div>
              );
            }

            return (
              <div 
                key={col.id} 
                className="flex-shrink-0 w-[340px] max-h-full flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* 3. Improve Column Headers */}
                <div className="bg-slate-100/80 backdrop-blur-sm border border-slate-200/60 rounded-t-xl p-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <h3 className={`font-bold text-sm ${col.text}`}>{col.label}</h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      {colTasks.length} {col.wipLimit && <span className="text-slate-400 font-normal ml-0.5">• WIP {col.wipLimit}</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <button className="p-1 hover:bg-slate-200 rounded transition-colors" title="Add Task">
                      <Plus size={14} />
                    </button>
                    <button className="p-1 hover:bg-slate-200 rounded transition-colors" onClick={() => toggleColumn(col.id)} title="Collapse Column">
                      <Minimize2 size={14} />
                    </button>
                    <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-100/50 border-x border-b border-slate-200/60 rounded-b-xl p-2 flex flex-col gap-2.5 overflow-y-auto min-h-[150px]">
                  {/* 11. Empty State Improvements */}
                  {colTasks.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                      <p className="text-sm font-medium text-slate-500 mb-1">No Tasks</p>
                      <p className="text-xs text-slate-400 mb-3">Drag tasks here or create a new one</p>
                      <button 
                        onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }}
                        className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        Create Task
                      </button>
                    </div>
                  )}

                  {colTasks.map((task: any, index: number) => {
                    // Mock data for new features
                    const isCritical = index === 0 && col.id !== 'DONE';
                    const progress = task.state === 'DONE' ? 100 : task.state === 'IN_PROGRESS' ? 65 : 0;
                    
                    return (
                      <div 
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => setSelectedTask(task)}
                        className={`bg-white p-3 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing transition-all group relative ${isCritical ? 'border-l-4 border-l-rose-500 border-y-slate-200 border-r-slate-200' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'}`}
                      >
                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm border border-slate-100">
                          <button className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setTaskToEdit(task); setIsModalOpen(true); }}><Edit2 size={12}/></button>
                          <button className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); }}><Copy size={12}/></button>
                          <button className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); }}><Trash2 size={12}/></button>
                        </div>

                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-1.5 pr-16">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">CP-{task.id.slice(0, 4).toUpperCase()}</span>
                            {isCritical && <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Critical Path</span>}
                          </div>
                        </div>
                        
                        <h4 className="font-semibold text-slate-800 text-sm leading-snug mb-2">{task.title}</h4>
                        
                        {/* Progress */}
                        {task.state !== 'BACKLOG' && task.state !== 'DONE' && (
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1">
                              <span>Progress</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${progress > 50 ? 'bg-blue-500' : 'bg-amber-400'}`} style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        )}

                        {/* Footer Details */}
                        <div className="flex items-center justify-between text-xs font-medium mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-3 text-slate-500">
                            <div className="flex items-center gap-1" title="Duration">
                              <Clock size={12} className={isCritical ? 'text-rose-500' : ''} />
                              <span className={isCritical ? 'text-rose-600 font-bold' : ''}>{task.duration}d</span>
                            </div>
                            <div className="flex items-center gap-1" title="Dependencies">
                              <ArrowRightLeft size={12} />
                              <span>2</span>
                            </div>
                            <div className="flex items-center gap-1" title="Comments">
                              <MessageSquare size={12} />
                              <span>4</span>
                            </div>
                          </div>
                          
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold border border-indigo-200 shadow-sm" title="Assignee">
                            JD
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
        </div>
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        taskToEdit={taskToEdit}
      />

      {/* 6. Task Details Drawer */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setSelectedTask(null)} />
          <div className="fixed top-0 right-0 bottom-0 w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">CP-{selectedTask.id.slice(0, 4).toUpperCase()}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  selectedTask.state === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 
                  selectedTask.state === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 
                  'bg-slate-200 text-slate-700'
                }`}>
                  {selectedTask.state.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"><MoreHorizontal size={16}/></button>
                <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors" onClick={() => setSelectedTask(null)}><X size={16}/></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Overview */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedTask.title}</h2>
                <div className="flex items-center gap-4 text-sm mt-4">
                  <div className="flex items-center gap-2 w-1/2">
                    <span className="text-slate-500 w-20">Assignee</span>
                    <div className="flex items-center gap-2 font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">JD</div>
                      John Doe
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-1/2">
                    <span className="text-slate-500 w-20">Priority</span>
                    <span className="font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-100 text-xs flex items-center gap-1">
                      <AlertCircle size={12}/> High
                    </span>
                  </div>
                </div>
              </div>

              {selectedTask.description && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Description</h3>
                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-wrap">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* Scheduling Data */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><Calendar size={16} className="text-blue-500"/> Scheduling & CPM Data</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Duration</span>
                    <div className="text-lg font-semibold text-slate-800">{selectedTask.duration} Days</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Float</span>
                    <div className="text-lg font-semibold text-emerald-600">0 Days <span className="text-[10px] text-rose-500 font-medium ml-1">(Critical)</span></div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Early Start (ES)</span>
                    <div className="font-medium text-slate-700 text-sm mt-0.5">Day 12</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Early Finish (EF)</span>
                    <div className="font-medium text-slate-700 text-sm mt-0.5">Day 15</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Late Start (LS)</span>
                    <div className="font-medium text-slate-700 text-sm mt-0.5">Day 12</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Late Finish (LF)</span>
                    <div className="font-medium text-slate-700 text-sm mt-0.5">Day 15</div>
                  </div>
                </div>
              </div>

              {/* Dependencies */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><ArrowRightLeft size={16} className="text-indigo-500"/> Dependencies</h3>
                <div className="space-y-2">
                  <div className="border border-slate-200 rounded-lg p-2 flex items-center justify-between bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded">Predecessor</span>
                      <span className="text-sm font-medium text-slate-800">Foundation Pour</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">FS</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 flex items-center justify-between bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-1 rounded">Successor</span>
                      <span className="text-sm font-medium text-slate-800">Framing Setup</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">FS</span>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors text-sm">
                Mark as Complete
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
