'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Edit2, Trash2, Calendar, ArrowRightLeft, Search, Plus, GripVertical, ArrowRight
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { ButtonPrimary, IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const addDays = (dateStr: string, days: number): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

const diffDays = (startStr: string, endStr: string): number => {
  if (!startStr || !endStr) return 0;
  const s = new Date(startStr);
  const e = new Date(endStr);
  const diffTime = e.getTime() - s.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

interface TaskSidebarProps {
  mode: 'create' | 'edit';
  task: any | null;
  projectId: string;
  onClose: () => void;
  onDeleted: () => void;
  onSaved: (task: any) => void;
}

export function TaskSidebar({
  mode, task, projectId, onClose, onDeleted, onSaved,
}: TaskSidebarProps) {
  const queryClient = useQueryClient();
  const [width, setWidth] = useState(480);
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number | ''>(1);
  const [taskState, setTaskState] = useState('TODO');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [blockedBy, setBlockedBy] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [searchBlockedBy, setSearchBlockedBy] = useState('');
  const [searchBlocks, setSearchBlocks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  const handleDurationChange = (valStr: string) => {
    const val = valStr === '' ? '' : Math.round(Number(valStr));
    setDuration(val);
    if (typeof val === 'number') {
      if (startDate) {
        setEndDate(addDays(startDate, val));
      } else if (endDate) {
        setStartDate(addDays(endDate, -val));
      }
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val) {
      if (endDate) {
        const diff = diffDays(val, endDate);
        setDuration(diff >= 0 ? diff : 0);
      } else if (typeof duration === 'number') {
        setEndDate(addDays(val, duration));
      }
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (val) {
      if (startDate) {
        const diff = diffDays(startDate, val);
        setDuration(diff >= 0 ? diff : 0);
      } else if (typeof duration === 'number') {
        setStartDate(addDays(val, -duration));
      }
    }
  };

  useEffect(() => { setMounted(true); }, []);

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/v1/projects/${projectId}/tasks`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const { data: deps = [] } = useQuery<any[]>({
    queryKey: ['dependencies', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/v1/projects/${projectId}/dependencies`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['departments', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/v1/projects/${projectId}/departments`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const { data: cpmResults } = useQuery({
    queryKey: ['cpm', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/v1/projects/${projectId}/cpm/results`);
      if (!r.ok) return null;
      return r.json();
    },
  });

  const { data: activityData } = useQuery({
    queryKey: ['taskActivity', projectId, task?.id],
    queryFn: async () => {
      if (!task?.id) return { activities: [] };
      const r = await fetch(`/api/v1/projects/${projectId}/tasks/${task.id}`);
      if (!r.ok) throw new Error('Failed to fetch activity');
      return r.json();
    },
    enabled: mode === 'edit' && !!task?.id,
  });
  const activities = activityData?.activities || [];

  // Populate form when mode/task changes
  useEffect(() => {
    if (mode === 'edit' && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDuration(task.duration);
      setTaskState(task.state);
      setStartDate(task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '');
      setEndDate(task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '');
      setBlockedBy(deps.filter((d: any) => d.successorTaskId === task.id).map((d: any) => d.predecessorTaskId));
      setBlocks(deps.filter((d: any) => d.predecessorTaskId === task.id).map((d: any) => d.successorTaskId));
      setSelectedDeptIds(task.departments ? task.departments.map((d: any) => d.id) : []);
      setFormError(null);
    } else if (mode === 'create') {
      setTitle(''); setDescription(''); setDuration(1); setTaskState('TODO');
      setStartDate(''); setEndDate(''); setBlockedBy([]); setBlocks([]);
      const general = departments.find((d: any) => d.name === 'General');
      setSelectedDeptIds(general ? [general.id] : []);
      setFormError(null);
    }
  }, [mode, task, deps, departments]);

  // Resize logic
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      const w = window.innerWidth - e.clientX;
      if (w >= 360 && w <= 860) setWidth(w);
    };
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [dragging]);

  // Keyboard dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'edit') { onClose(); }
        else { onClose(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, onClose]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Task name is required');
      if (duration === '' || Number(duration) < 0) throw new Error('Valid duration is required');
      if (startDate && endDate && new Date(endDate) < new Date(startDate))
        throw new Error('End date cannot be before start date');

      const method = mode === 'edit' ? 'PUT' : 'POST';
      const url = mode === 'edit'
        ? `/api/v1/projects/${projectId}/tasks/${task.id}`
        : `/api/v1/projects/${projectId}/tasks`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          duration: Number(duration),
          state: taskState,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          departmentIds: selectedDeptIds
        }),
      });
      if (!res.ok) throw new Error(`Failed to ${mode === 'edit' ? 'update' : 'create'} task`);
      const saved = await res.json();

      // Rebuild dependencies on edit
      if (mode === 'edit') {
        const old = deps.filter((d: any) => d.predecessorTaskId === saved.id || d.successorTaskId === saved.id);
        await Promise.all(old.map((d: any) => fetch(`/api/v1/projects/${projectId}/dependencies/${d.id}`, { method: 'DELETE' })));
      }
      await Promise.all([
        ...blockedBy.map(predId => fetch(`/api/v1/projects/${projectId}/dependencies`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predecessorTaskId: predId, successorTaskId: saved.id, type: 'FS' }),
        })),
        ...blocks.map(succId => fetch(`/api/v1/projects/${projectId}/dependencies`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predecessorTaskId: saved.id, successorTaskId: succId, type: 'FS' }),
        })),
      ]);
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
      queryClient.invalidateQueries({ queryKey: ['cpm', projectId] });
      queryClient.invalidateQueries({ queryKey: ['taskActivity', projectId, task?.id] });
      onSaved(saved);
    },
    onError: (err: any) => setFormError(err.message || 'An error occurred'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
      onDeleted();
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks/${task.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'DONE' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['taskActivity', projectId, task?.id] });
      onSaved(saved);
    },
  });

  if (!mounted) return null;

  const cpmTask = task ? cpmResults?.details?.taskDetails?.[task.id] : null;

  const predDeps = task ? deps.filter((d: any) => d.successorTaskId === task.id) : [];
  const succDeps = task ? deps.filter((d: any) => d.predecessorTaskId === task.id) : [];

  const availForBlockedBy = tasks.filter((t: any) =>
    t.id !== task?.id && !blocks.includes(t.id) && !blockedBy.includes(t.id) &&
    t.title.toLowerCase().includes(searchBlockedBy.toLowerCase())
  );
  const availForBlocks = tasks.filter((t: any) =>
    t.id !== task?.id && !blockedBy.includes(t.id) && !blocks.includes(t.id) &&
    t.title.toLowerCase().includes(searchBlocks.toLowerCase())
  );

  return createPortal(
    <>
      {/* Full-screen scrim — clicking closes */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{ background: 'rgba(0,0,0,0.25)' }}
        onClick={() => {
          if (!confirm('Discard unsaved changes?')) return;
          onClose();
        }}
      />

      {/* Sidebar panel */}
      <div
        style={{ width, zIndex: 9999 }}
        className="fixed top-0 right-0 h-screen bg-white shadow-2xl border-l border-[#e6e6e6] flex flex-col select-none"
      >
        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          className={cn(
            'absolute top-0 left-0 h-full w-1.5 cursor-col-resize group flex items-center justify-center',
            dragging && 'bg-black/10'
          )}
          style={{ zIndex: 10000 }}
        >
          <div className="w-[3px] h-12 rounded-full bg-[#d0cdc9] group-hover:bg-black/30 transition-colors" />
        </div>

        {/* ─── CREATE / EDIT MODE ────────────────────────── */}
        {(mode === 'create' || mode === 'edit') && (
          <>
            <div className="flex items-center pl-3 pr-6 py-4 border-b border-[#e6e6e6] bg-[#f6f5f4] shrink-0 gap-2">
              <button
                onClick={onClose}
                className="p-1.5 rounded-[4px] hover:bg-black/5 text-[#615d59] transition-colors flex items-center justify-center"
                title="Collapse sidebar"
              >
                <ArrowRight size={18} />
              </button>
              <h2 className="text-[18px] font-[700] text-black">
                {mode === 'edit' ? 'Edit Task' : 'New Task'}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{formError}</div>
              )}

              {/* Task Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider">Task Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveMutation.mutate()}
                  placeholder="e.g. Design database schema"
                  className="w-full px-3 py-2.5 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all bg-white"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Add details..."
                  className="w-full px-3 py-2.5 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all resize-y bg-white"
                />
              </div>

              {/* Duration + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider">Duration (days) *</label>
                  <input
                    type="number" min="0" step="1" value={duration}
                    onChange={e => handleDurationChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider">Status</label>
                  <select
                    value={taskState} onChange={e => setTaskState(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all bg-white"
                  >
                    <option value="BACKLOG">Overdue</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider">Department *</label>
                <div className="flex flex-wrap gap-1.5">
                  {departments.map((dep: any) => {
                    const isSelected = selectedDeptIds.includes(dep.id);
                    return (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() => {
                          setSelectedDeptIds(prev => {
                            if (prev.includes(dep.id)) {
                              if (prev.length === 1) return prev; // At least one must be selected
                              return prev.filter(id => id !== dep.id);
                            }
                            return [...prev, dep.id];
                          });
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5",
                          isSelected
                            ? "text-white border-transparent"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        )}
                        style={{
                          backgroundColor: isSelected ? dep.color : undefined
                        }}
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? '#ffffff' : dep.color }}
                        />
                        {dep.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider">Scheduling</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#a39e98] mb-1 block">Start Date</label>
                    <input type="date" value={startDate} onChange={e => handleStartDateChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#a39e98] mb-1 block">End Date</label>
                    <input type="date" value={endDate} onChange={e => handleEndDateChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Blocked By */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider">Blocked By (Predecessors)</label>
                {blockedBy.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {blockedBy.map(id => {
                      const t = tasks.find((t: any) => t.id === id);
                      return t ? (
                        <span key={id} className="flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full border border-red-200">
                          {t.title}
                          <button onClick={() => setBlockedBy(p => p.filter(x => x !== id))}><X size={10} /></button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" />
                  <input type="text" value={searchBlockedBy} onChange={e => setSearchBlockedBy(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all bg-white"
                  />
                  {searchBlockedBy && availForBlockedBy.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e6e6] rounded-lg shadow-xl z-[10001] max-h-44 overflow-y-auto">
                      {availForBlockedBy.map((t: any) => (
                        <div key={t.id} onClick={() => { setBlockedBy(p => [...p, t.id]); setSearchBlockedBy(''); }}
                          className="px-3 py-2 hover:bg-[#f6f5f4] cursor-pointer text-sm flex justify-between items-center border-b border-[#f0efee] last:border-0">
                          <span className="font-medium text-black">{t.title}</span>
                          <span className="text-xs text-[#a39e98]">{t.duration}d</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Blocks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider">Blocks (Successors)</label>
                {blocks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {blocks.map(id => {
                      const t = tasks.find((t: any) => t.id === id);
                      return t ? (
                        <span key={id} className="flex items-center gap-1 bg-[#f6f5f4] text-[#615d59] text-xs px-2 py-1 rounded-full border border-[#e6e6e6]">
                          {t.title}
                          <button onClick={() => setBlocks(p => p.filter(x => x !== id))}><X size={10} /></button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" />
                  <input type="text" value={searchBlocks} onChange={e => setSearchBlocks(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all bg-white"
                  />
                  {searchBlocks && availForBlocks.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e6e6] rounded-lg shadow-xl z-[10001] max-h-44 overflow-y-auto">
                      {availForBlocks.map((t: any) => (
                        <div key={t.id} onClick={() => { setBlocks(p => [...p, t.id]); setSearchBlocks(''); }}
                          className="px-3 py-2 hover:bg-[#f6f5f4] cursor-pointer text-sm flex justify-between items-center border-b border-[#f0efee] last:border-0">
                          <span className="font-medium text-black">{t.title}</span>
                          <span className="text-xs text-[#a39e98]">{t.duration}d</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              {mode === 'edit' && (
                <div className="space-y-2 pt-4 border-t border-[#e6e6e6]">
                  <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider block">Recent Activity</label>
                  {activities.length === 0 ? (
                    <p className="text-[12px] text-[#a39e98] italic">No activity logged for this task.</p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {activities.map((act: any) => (
                        <div key={act.id} className="text-xs border-l-2 border-gray-200 pl-2.5 py-0.5">
                          <p className="text-black font-semibold leading-normal">{act.action}</p>
                          <p className="text-[#a39e98] text-[10px] mt-0.5">
                            by <span className="text-[#615d59] font-medium">{act.user}</span> • {new Date(act.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#e6e6e6] bg-[#f6f5f4] flex justify-between items-center shrink-0">
              <div>
                {mode === 'edit' && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this task?')) deleteMutation.mutate();
                    }}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Trash2 size={15} />
                    Delete Task
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || deleteMutation.isPending}
                  className="px-5 py-2 text-sm font-medium text-white bg-black hover:bg-black/80 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
