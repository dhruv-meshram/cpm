'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Plus, Clock, Activity, ArrowRightLeft,
  LayoutGrid, List, Table, ChevronDown, Minimize2, Tag, X
} from 'lucide-react';
import { TaskSidebar } from '@/components/TaskSidebar';
import { ButtonPrimary, ButtonUtility, IconButton } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const COLUMNS = [
  { id: 'BACKLOG',     label: 'Overdue',     dot: 'bg-red-500' },
  { id: 'TODO',        label: 'To Do',       dot: 'bg-[#615d59]' },
  { id: 'IN_PROGRESS', label: 'In Progress', dot: 'bg-yellow-500' },
  { id: 'REVIEW',      label: 'Review',      dot: 'bg-[#dd5b00]' },
  { id: 'DONE',        label: 'Done',        dot: 'bg-[#1aae39]' },
];

const isTaskOverdue = (task: any) => {
  if (task.state === 'DONE') return false;
  if (task.state === 'BACKLOG') return true;
  if (task.endDate) {
    return new Date(task.endDate) < new Date();
  }
  return false;
};

export default function TasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [sidebarMode, setSidebarMode] = useState<'create' | 'edit' | null>(null);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'table'>('board');
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
  });

  const { data: cpmResults } = useQuery({
    queryKey: ['cpm', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/cpm/results`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['departments', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/departments`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const { data: tags = [] } = useQuery<any[]>({
    queryKey: ['tags', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tags`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const [selectedFilterTagIds, setSelectedFilterTagIds] = useState<string[]>([]);
  const [shouldFocusTags, setShouldFocusTags] = useState(false);

  const updateTaskState = useMutation({
    mutationFn: async ({ taskId, state }: { taskId: string; state: string }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  // Keyboard shortcut — N to create
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'n' || e.key === 'N') && !sidebarMode) {
        e.preventDefault();
        setActiveTask(null);
        setSidebarMode('create');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sidebarMode]);

  // Handle task direct linking via query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const taskId = searchParams.get('task');
      if (taskId && tasks.length > 0) {
        const found = tasks.find((t: any) => t.id === taskId);
        if (found) {
          setActiveTask(found);
          setSidebarMode('edit');
        }
      }
    }
  }, [tasks]);

  const closeSidebar = () => { setSidebarMode(null); setActiveTask(null); setShouldFocusTags(false); };

  const [selectedFilterDeptId, setSelectedFilterDeptId] = useState<string>('ALL');

  const filteredTasks = tasks.filter((t: any) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedFilterDeptId === 'ALL' || (t.departments && t.departments.some((d: any) => d.id === selectedFilterDeptId));
    const matchesTags = selectedFilterTagIds.length === 0 || (t.taskTags && selectedFilterTagIds.every((tagId) => t.taskTags.some((tt: any) => tt.tagId === tagId)));
    return matchesSearch && matchesDept && matchesTags;
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t: any) => t.state === 'DONE').length;
  const inProgTasks = tasks.filter((t: any) => t.state === 'IN_PROGRESS').length;
  const criticalCount = tasks.filter((t: any) =>
    cpmResults?.details?.taskDetails?.[t.id]?.isCritical ?? t.isCritical ?? false
  ).length;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#615d59] gap-2">
        <Activity size={18} className="animate-spin" /> Loading tasks…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f6f5f4] overflow-hidden">

      {/* Toolbar */}
      <div className="bg-white border-b border-[#e6e6e6] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <SearchBar
            id="task-search"
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="w-56"
          />
          <select
            value={selectedFilterDeptId}
            onChange={(e) => setSelectedFilterDeptId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-[#e6e6e6] rounded-lg focus:outline-hidden bg-white text-gray-700"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val && !selectedFilterTagIds.includes(val)) {
                setSelectedFilterTagIds(p => [...p, val]);
              }
            }}
            className="px-3 py-1.5 text-xs font-semibold border border-[#e6e6e6] rounded-lg focus:outline-hidden bg-white text-gray-700"
          >
            <option value="" disabled hidden>Filter by Tags</option>
            {tags.filter((t: any) => !selectedFilterTagIds.includes(t.id)).map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {selectedFilterTagIds.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedFilterTagIds.map(tagId => {
                const tag = tags.find((t: any) => t.id === tagId);
                return tag ? (
                  <span key={tagId} className="flex items-center gap-1 bg-white border border-[#e6e6e6] text-[#615d59] text-xs px-2 py-0.5 rounded-full font-semibold">
                    {tag.name}
                    <button onClick={() => setSelectedFilterTagIds(p => p.filter(id => id !== tagId))} className="hover:text-black cursor-pointer">
                      <X size={10} />
                    </button>
                  </span>
                ) : null;
              })}
              <button
                onClick={() => setSelectedFilterTagIds([])}
                className="text-xs font-semibold text-[#a39e98] hover:text-[#615d59] cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#f6f5f4] p-0.5 rounded-[8px] border border-[#e6e6e6] gap-0.5">
            {([['board', LayoutGrid], ['list', List], ['table', Table]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'p-1.5 rounded-[6px] transition-colors',
                  viewMode === mode ? 'bg-white text-black shadow-sm' : 'text-[#a39e98] hover:text-[#615d59]'
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          <ButtonUtility variant="ghost" className="flex items-center gap-1 !px-2 !py-1.5">
            Group: Status <ChevronDown size={13} />
          </ButtonUtility>
          <ButtonPrimary
            size="sm"
            onClick={() => { setActiveTask(null); setSidebarMode('create'); }}
            className="flex items-center gap-2"
          >
            <Plus size={14} /> Create Task
          </ButtonPrimary>
        </div>
      </div>

      {/* Summary strip */}
      <div className="px-6 pt-4 pb-0 grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: 'Total Tasks', value: totalTasks, color: 'text-black' },
          { label: 'Completed',   value: doneTasks,  color: 'text-[#1aae39]' },
          { label: 'In Progress', value: inProgTasks, color: 'text-black' },
          { label: 'Critical',    value: criticalCount, color: 'text-[#f64932]' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-[12px] border border-[#e6e6e6] px-4 py-3">
            <div className="text-[11px] font-[600] text-[#615d59] uppercase tracking-[0.125px] mb-1">{m.label}</div>
            <div className={cn('text-[22px] font-[700] leading-[1] tracking-[-0.5px]', m.color)}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content Area based on View Mode */}
      {viewMode === 'board' ? (
        <div className="flex-1 flex gap-4 px-6 py-4 items-stretch min-w-0 overflow-hidden">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t: any) => t.state === col.id);
            const isCollapsed = collapsedCols.has(col.id);

            if (isCollapsed) {
              return (
                <div
                  key={col.id}
                  className="shrink-0 w-14 bg-white border border-[#e6e6e6] rounded-[12px] flex flex-col items-center py-4 gap-3 cursor-pointer hover:bg-[#f6f5f4] transition-colors h-full"
                  onClick={() => { const n = new Set(collapsedCols); n.delete(col.id); setCollapsedCols(n); }}
                >
                  <span className="text-[11px] font-[700] text-[#615d59] bg-[#f6f5f4] px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  <div className="text-[12px] font-[600] text-[#615d59]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    {col.label}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={col.id}
                className="flex-1 min-w-0 flex flex-col h-full"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedTaskId) {
                    const t = tasks.find((t: any) => t.id === draggedTaskId);
                    if (t && t.state !== col.id) updateTaskState.mutate({ taskId: draggedTaskId, state: col.id });
                  }
                  setDraggedTaskId(null);
                }}
              >
                {/* Column header */}
                <div className="bg-white border border-[#e6e6e6] rounded-t-[12px] px-4 py-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', col.dot)} />
                    <span className="text-[13px] font-[700] text-black">{col.label}</span>
                    <span className="text-[11px] font-[600] text-[#a39e98] bg-[#f6f5f4] px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton variant="ghost" size="sm" onClick={() => { setActiveTask(null); setSidebarMode('create'); }}>
                      <Plus size={13} />
                    </IconButton>
                    <IconButton
                      variant="ghost" size="sm"
                      onClick={() => { const n = new Set(collapsedCols); n.add(col.id); setCollapsedCols(n); }}
                    >
                      <Minimize2 size={13} />
                    </IconButton>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 bg-[#f6f5f4] border-x border-b border-[#e6e6e6] rounded-b-[12px] p-2 flex flex-col gap-2 overflow-y-auto min-h-0">
                  {colTasks.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-[#e6e6e6] rounded-[8px] bg-white">
                      <p className="text-[13px] font-[500] text-[#a39e98] mb-3">No tasks</p>
                      <ButtonUtility variant="ghost" onClick={() => { setActiveTask(null); setSidebarMode('create'); }} className="text-[12px]">
                        + Create Task
                      </ButtonUtility>
                    </div>
                  )}
                  {colTasks.map((task: any) => {
                    const isCritical = cpmResults?.details?.taskDetails?.[task.id]?.isCritical ?? task.isCritical ?? false;
                    const isInProgress = task.state === 'IN_PROGRESS';
                    const isOverdue = isTaskOverdue(task);

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => { setDraggedTaskId(task.id); e.dataTransfer.effectAllowed = 'move'; }}
                        onClick={() => { setActiveTask(task); setSidebarMode('edit'); setShouldFocusTags(false); }}
                        className={cn(
                          'bg-white rounded-[10px] border p-3 cursor-pointer transition-all duration-150 group',
                          isOverdue
                            ? 'border-l-[3px] border-l-red-500 border-y-[#e6e6e6] border-r-[#e6e6e6] bg-red-50/10'
                            : isCritical
                            ? 'border-l-[3px] border-l-[#f64932] border-y-[#e6e6e6] border-r-[#e6e6e6]'
                            : isInProgress
                            ? 'border-l-[3px] border-l-amber-500 border-y-amber-200 border-r-amber-200 bg-[#fefce8]'
                            : 'border-[#e6e6e6] hover:border-black hover:shadow-sm'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-mono text-[#a39e98]">CP-{task.id.slice(0, 4).toUpperCase()}</span>
                          {isOverdue && (
                            <span className="text-[9px] font-[700] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                              Overdue
                            </span>
                          )}
                          {isCritical && (
                            <span className="text-[9px] font-[700] bg-red-50 text-[#f64932] border border-red-200 px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                              Critical
                            </span>
                          )}
                        </div>

                        <h4 className="text-[14px] font-[600] text-black leading-snug mb-1">{task.title}</h4>

                        {/* Department badges */}
                        {task.departments && task.departments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 mb-2">
                            {task.departments.map((d: any) => (
                              <span
                                key={d.id}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] text-white"
                                style={{ backgroundColor: d.color }}
                              >
                                {d.name}
                              </span>
                            ))}
                          </div>
                        )}



                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-[#f0efee]">
                          <div className="flex items-center gap-2 text-[11px] text-[#a39e98]">
                            <span className="flex items-center gap-1">
                              <Clock size={10} className={isCritical ? 'text-[#f64932]' : ''} />
                              <span className={isCritical ? 'text-[#f64932] font-bold' : ''}>{task.duration}d</span>
                            </span>
                            {task.dependencyCount > 0 && (
                              <span className="flex items-center gap-1">
                                <ArrowRightLeft size={10} />{task.dependencyCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTask(task);
                                setSidebarMode('edit');
                                setShouldFocusTags(true);
                              }}
                              className="p-1 rounded-[4px] hover:bg-black/5 text-[#a39e98] hover:text-black transition-colors"
                              title="Assign tags"
                            >
                              <Tag size={12} />
                            </button>
                            <div className="w-5 h-5 rounded-full bg-[#f6f5f4] text-black flex items-center justify-center text-[9px] font-[700] border border-[#e6e6e6]">
                              JD
                            </div>
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
      ) : (
        <div className="flex-1 px-6 py-4 overflow-y-auto min-h-0 bg-white border border-[#e6e6e6] rounded-[12px] m-6 mt-2 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e6e6e6] text-[#a39e98] text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Department</th>

                <th className="py-3 px-4">Timeline</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task: any) => {
                const isOverdue = isTaskOverdue(task);
                const isCritical = cpmResults?.details?.taskDetails?.[task.id]?.isCritical ?? task.isCritical ?? false;
                return (
                  <tr
                    key={task.id}
                    onClick={() => { setActiveTask(task); setSidebarMode('edit'); }}
                    className="border-b border-[#f0efee] hover:bg-[#f6f5f4] cursor-pointer text-[13px] text-black transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-[#a39e98] text-[11px]">
                      CP-{task.id.slice(0, 4).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      <div className="flex items-center gap-2">
                        {task.title}
                        {isOverdue && (
                          <span className="text-[9px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                            Overdue
                          </span>
                        )}
                        {isCritical && (
                          <span className="text-[9px] font-bold bg-red-50 text-[#f64932] border border-red-200 px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                            Critical
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                        {task.state}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {task.duration}d
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {task.departments && task.departments.map((d: any) => (
                          <span
                            key={d.id}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: d.color }}
                          >
                            {d.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#a39e98] text-[12px]">
                      {task.startDate ? new Date(task.startDate).toLocaleDateString() : '—'}
                      {' to '}
                      {task.endDate ? new Date(task.endDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#a39e98] text-[13px]">
                    No tasks found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Right sidebar */}
      {sidebarMode && (
        <TaskSidebar
          mode={sidebarMode}
          task={activeTask}
          projectId={projectId}
          onClose={closeSidebar}
          onDeleted={closeSidebar}
          shouldFocusTags={shouldFocusTags}
          onSaved={(saved) => {
            closeSidebar();
          }}
        />
      )}
    </div>
  );
}
