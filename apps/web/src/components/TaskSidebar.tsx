'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Edit2, Trash2, Calendar, ArrowRightLeft, Search, Plus, GripVertical
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { ButtonPrimary, IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface TaskSidebarProps {
  mode: 'view' | 'create' | 'edit';
  task: any | null;
  projectId: string;
  onClose: () => void;
  onDeleted: () => void;
  onEditRequest: () => void;
  onSaved: (task: any) => void;
}

export function TaskSidebar({
  mode, task, projectId, onClose, onDeleted, onEditRequest, onSaved,
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

  const { data: cpmResults } = useQuery({
    queryKey: ['cpm', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/v1/projects/${projectId}/cpm/results`);
      if (!r.ok) return null;
      return r.json();
    },
  });

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
      setFormError(null);
    } else if (mode === 'create') {
      setTitle(''); setDescription(''); setDuration(1); setTaskState('TODO');
      setStartDate(''); setEndDate(''); setBlockedBy([]); setBlocks([]);
      setFormError(null);
    }
  }, [mode, task, deps]);

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
      {/* Full-screen scrim — clicking closes in view mode */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{ background: mode === 'view' ? 'transparent' : 'rgba(0,0,0,0.25)' }}
        onClick={() => {
          if (mode !== 'view' && !confirm('Discard unsaved changes?')) return;
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

        {/* ─── VIEW MODE ─────────────────────────────────── */}
        {mode === 'view' && task && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e6] bg-[#f6f5f4] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#a39e98] bg-white px-2 py-0.5 rounded border border-[#e6e6e6]">
                  CP-{task.id.slice(0, 4).toUpperCase()}
                </span>
                {task && (
                  (() => {
                    const isOverdue = task.state === 'BACKLOG' || (task.state !== 'DONE' && task.endDate && new Date(task.endDate) < new Date());
                    return isOverdue ? (
                      <>
                        <StatusBadge status="overdue" />
                        {task.state !== 'BACKLOG' && (
                          <span className="text-xs text-[#615d59]">({task.state.replace(/_/g, ' ').toLowerCase()})</span>
                        )}
                      </>
                    ) : (
                      <StatusBadge status={task.state.replace(/_/g, ' ').toLowerCase()} />
                    );
                  })()
                )}
              </div>
              <div className="flex items-center gap-1">
                <IconButton variant="ghost" onClick={onEditRequest}><Edit2 size={15} /></IconButton>
                <IconButton variant="ghost" onClick={() => {
                  if (confirm('Delete this task?')) deleteMutation.mutate();
                }}>
                  <Trash2 size={15} className="text-red-500" />
                </IconButton>
                <IconButton variant="ghost" onClick={onClose}><X size={15} /></IconButton>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h2 className="text-[22px] font-[700] text-black leading-snug tracking-tight">{task.title}</h2>

              {task.description && (
                <div>
                  <p className="text-xs font-bold text-[#a39e98] uppercase tracking-wider mb-2">Description</p>
                  <p className="text-[14px] text-[#615d59] bg-[#f6f5f4] p-3 rounded-[8px] border border-[#e6e6e6] leading-relaxed">
                    {task.description}
                  </p>
                </div>
              )}

              {/* CPM grid */}
              <div>
                <p className="text-xs font-bold text-[#a39e98] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar size={12} /> Scheduling & CPM
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Duration', value: `${task.duration}d`, red: false },
                    { label: 'Float', value: `${cpmTask?.slack ?? '–'}d`, red: cpmTask?.isCritical },
                    { label: 'ES', value: task.startDate ? `${cpmTask?.earlyStart ?? '–'}` : '–' },
                    { label: 'EF', value: task.startDate ? `${cpmTask?.earlyFinish ?? '–'}` : '–' },
                    { label: 'LS', value: task.startDate ? `${cpmTask?.lateStart ?? '–'}` : '–' },
                    { label: 'LF', value: task.startDate ? `${cpmTask?.lateFinish ?? '–'}` : '–' },
                  ].map(d => (
                    <div key={d.label} className="bg-[#f6f5f4] border border-[#e6e6e6] rounded-[8px] p-3">
                      <div className="text-[10px] font-[600] text-[#a39e98] uppercase tracking-wide mb-1">{d.label}</div>
                      <div className={cn('text-[16px] font-[700]', d.red ? 'text-[#f64932]' : 'text-black')}>{d.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dependencies */}
              <div>
                <p className="text-xs font-bold text-[#a39e98] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ArrowRightLeft size={12} /> Dependencies
                </p>
                <div className="space-y-2">
                  {predDeps.map((d: any) => {
                    const pred = tasks.find((t: any) => t.id === d.predecessorTaskId);
                    return pred ? (
                      <div key={d.id} className="flex items-center justify-between bg-white border border-[#e6e6e6] rounded-[8px] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Pred</span>
                          <span className="text-sm text-black">{pred.title}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#1aae39] bg-[#edf8f0] border border-[#c3e8cc] px-1.5 py-0.5 rounded">FS</span>
                      </div>
                    ) : null;
                  })}
                  {succDeps.map((d: any) => {
                    const succ = tasks.find((t: any) => t.id === d.successorTaskId);
                    return succ ? (
                      <div key={d.id} className="flex items-center justify-between bg-white border border-[#e6e6e6] rounded-[8px] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#615d59] bg-[#f6f5f4] border border-[#e6e6e6] px-1.5 py-0.5 rounded">Succ</span>
                          <span className="text-sm text-black">{succ.title}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#1aae39] bg-[#edf8f0] border border-[#c3e8cc] px-1.5 py-0.5 rounded">FS</span>
                      </div>
                    ) : null;
                  })}
                  {predDeps.length === 0 && succDeps.length === 0 && (
                    <p className="text-xs text-[#a39e98] italic">No dependencies defined.</p>
                  )}
                </div>
              </div>
            </div>

            {task.state !== 'DONE' && (
              <div className="p-4 border-t border-[#e6e6e6] bg-[#f6f5f4] shrink-0">
                <ButtonPrimary size="md" className="w-full justify-center" onClick={() => markDoneMutation.mutate()}>
                  Mark as Complete
                </ButtonPrimary>
              </div>
            )}
          </>
        )}

        {/* ─── CREATE / EDIT MODE ────────────────────────── */}
        {(mode === 'create' || mode === 'edit') && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e6] bg-[#f6f5f4] shrink-0">
              <h2 className="text-[18px] font-[700] text-black">
                {mode === 'edit' ? 'Edit Task' : 'New Task'}
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 text-[#615d59] transition-colors">
                <X size={18} />
              </button>
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
                    type="number" min="0" step="0.5" value={duration}
                    onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
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

              {/* Dates */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider">Scheduling</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#a39e98] mb-1 block">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#a39e98] mb-1 block">End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
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
            </div>

            <div className="px-6 py-4 border-t border-[#e6e6e6] bg-[#f6f5f4] flex justify-end gap-2 shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#615d59] hover:text-black hover:bg-[#e6e6e6] rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="px-5 py-2 text-sm font-medium text-white bg-black hover:bg-black/80 rounded-lg transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
