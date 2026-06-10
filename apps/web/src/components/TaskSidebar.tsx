'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Edit2, Trash2, Calendar, ArrowRightLeft, Search, Plus, GripVertical, ArrowRight
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { ButtonPrimary, IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ActivityItem } from '@/components/ui/ActivityItem';

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
  shouldFocusTags?: boolean;
}

export function TaskSidebar({
  mode, task, projectId, onClose, onDeleted, onSaved, shouldFocusTags = false,
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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagsInputRef = useRef<HTMLInputElement>(null);

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

  const { data: deps = [], isLoading: isDepsLoading } = useQuery<any[]>({
    queryKey: ['dependencies', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/v1/projects/${projectId}/dependencies`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const { data: departments = [], isLoading: isDeptsLoading } = useQuery<any[]>({
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

  const { data: projectTags = [] } = useQuery<any[]>({
    queryKey: ['tags', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/v1/projects/${projectId}/tags`);
      if (!r.ok) throw new Error('Failed to fetch project tags');
      return r.json();
    }
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const r = await fetch(`/api/v1/projects/${projectId}/members`);
      if (!r.ok) throw new Error('Failed to fetch members');
      return r.json();
    }
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const r = await fetch('/api/v1/users/me');
      if (!r.ok) throw new Error('Failed to fetch current user');
      return r.json();
    }
  });

  const createTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      const res = await fetch(`/api/v1/projects/${projectId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.name?.[0] || 'Failed to create tag');
      }
      return res.json();
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags', projectId] });
      setSelectedTagIds(prev => [...prev, newTag.id]);
      setTagSearchQuery('');
      setIsTagDropdownOpen(false);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to create tag');
    }
  });

  useEffect(() => {
    if (shouldFocusTags && tagsInputRef.current) {
      tagsInputRef.current.focus();
      tagsInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [shouldFocusTags]);

  const initializedRef = useRef<string | null>(null);

  // Reset initialized ref when task or mode changes
  useEffect(() => {
    initializedRef.current = null;
  }, [mode, task?.id]);

  // Populate form when mode/task changes
  useEffect(() => {
    if (isDepsLoading || isDeptsLoading) return;

    const key = `${mode}-${task?.id || 'new'}`;
    if (initializedRef.current === key) return;

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
      setSelectedTagIds(task.taskTags ? task.taskTags.map((tt: any) => tt.tagId) : []);
      setSelectedAssigneeIds(task.assignees ? task.assignees.map((a: any) => a.userId) : []);
      setFormError(null);
      initializedRef.current = key;
    } else if (mode === 'create') {
      setTitle(''); setDescription(''); setDuration(1); setTaskState('TODO');
      setStartDate(''); setEndDate(''); setBlockedBy([]); setBlocks([]);
      const general = departments.find((d: any) => d.name === 'General');
      setSelectedDeptIds(general ? [general.id] : []);
      setSelectedTagIds([]);
      setSelectedAssigneeIds([]);
      setFormError(null);
      initializedRef.current = key;
    }
  }, [mode, task, deps, departments, isDepsLoading, isDeptsLoading]);

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
          departmentIds: selectedDeptIds,
          tagIds: selectedTagIds,
          assigneeIds: selectedAssigneeIds
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

  const submitApprovalMutation = useMutation({
    mutationFn: async (decision: 'APPROVED' | 'REJECTED') => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks/${task.id}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment: reviewComment })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit review');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['taskActivity', projectId, task?.id] });
      setReviewComment('');
      onSaved(data.task);
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const currentMember = currentUser && members.find((m: any) => m.userId === currentUser.id);
  const canReview = currentUser && currentMember && ['PROJECT_ADMIN', 'ADMIN', 'PROJECT MANAGER', 'PROJECT_MANAGER', 'DEPARTMENT_HEAD', 'CAPTAIN'].includes(currentMember.role.toUpperCase().replace(' ', '_'));
  const approvals = activityData?.approvals || [];

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

              {/* Approval Workflow Widget */}
              {(taskState === 'REVIEW' || approvals.length > 0) && (
                <div className="p-4 bg-[#f6f5f4] border border-[#e6e6e6] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black uppercase tracking-wider">Approval Workflow</span>
                    <span className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                      taskState === 'REVIEW'
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    )}>
                      {taskState === 'REVIEW' ? 'Pending Approval' : 'Approved & Closed'}
                    </span>
                  </div>

                  {/* Review Actions for Authorized Roles */}
                  {taskState === 'REVIEW' && canReview && (
                    <div className="space-y-3 pt-2 border-t border-[#e6e6e6]">
                      <p className="text-[12px] text-[#615d59] font-medium">
                        You have permissions to review this task. Please submit your decision:
                      </p>
                      <div>
                        <textarea
                          placeholder="Add review feedback or notes..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 text-xs border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-1 focus:ring-black transition-all bg-white resize-none text-black"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => submitApprovalMutation.mutate('APPROVED')}
                          disabled={submitApprovalMutation.isPending}
                          className="flex-1 bg-black text-white hover:bg-black/90 text-xs font-semibold py-2 rounded-lg border border-black transition-colors cursor-pointer"
                        >
                          Approve & Done
                        </button>
                        <button
                          type="button"
                          onClick={() => submitApprovalMutation.mutate('REJECTED')}
                          disabled={submitApprovalMutation.isPending}
                          className="flex-1 bg-white text-red-600 hover:bg-red-50 text-xs font-semibold py-2 rounded-lg border border-red-200 transition-colors cursor-pointer"
                        >
                          Reject & Rework
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Historic Approvals log */}
                  {approvals.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-[#e6e6e6]">
                      <div className="text-[11px] font-bold text-[#615d59] uppercase tracking-wider">Review History</div>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {approvals.map((app: any) => (
                          <div key={app.id} className="text-xs bg-white p-2 rounded-lg border border-[#e6e6e6] space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-black">{app.reviewer?.name || 'Reviewer'}</span>
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.2 rounded border",
                                app.decision === 'APPROVED' && "bg-emerald-50 border-emerald-200 text-emerald-700",
                                app.decision === 'REJECTED' && "bg-red-50 border-red-200 text-red-700",
                                app.decision === 'SUBMITTED' && "bg-blue-50 border-blue-200 text-blue-700"
                              )}>
                                {app.decision}
                              </span>
                            </div>
                            {app.comment && (
                              <p className="text-[#615d59] italic text-[11px] bg-[#f6f5f4] p-1.5 rounded-sm">
                                "{app.comment}"
                              </p>
                            )}
                            <span className="text-[10px] text-[#a39e98] block">
                              {new Date(app.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {/* Assignees */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider block">Assignees</label>
                
                {/* Assigned Members pills */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedAssigneeIds.map(userId => {
                    const member = members.find((m: any) => m.userId === userId);
                    if (!member) return null;
                    const initials = member.user.name.split(' ').map((n: any) => n[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f6f5f4] text-black border border-[#e6e6e6]"
                      >
                        <span className="w-5 h-5 rounded-full bg-white border border-[#e6e6e6] flex items-center justify-center text-[10px] font-bold text-[#615d59] shrink-0">
                          {initials}
                        </span>
                        {member.user.name}
                        <button
                          type="button"
                          onClick={() => setSelectedAssigneeIds(prev => prev.filter(id => id !== userId))}
                          className="hover:text-black cursor-pointer text-[10px] font-bold text-gray-400"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                  {selectedAssigneeIds.length === 0 && (
                    <span className="text-xs text-[#a39e98] italic py-1">No one assigned yet.</span>
                  )}
                </div>

                {/* Dropdown to assign members */}
                <div className="relative">
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !selectedAssigneeIds.includes(val)) {
                        setSelectedAssigneeIds(prev => [...prev, val]);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all bg-white text-gray-500"
                  >
                    <option value="">+ Assign Team Member...</option>
                    {members
                      .filter((m: any) => !selectedAssigneeIds.includes(m.userId))
                      .map((m: any) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user.name} ({m.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-[#615d59] uppercase tracking-wider block">Tags</label>
                
                {/* Assigned Tags pills */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTagIds.map(tagId => {
                    const tag = projectTags.find((t: any) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <span
                        key={tagId}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f6f5f4] text-[#615d59] border border-[#e6e6e6]"
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => setSelectedTagIds(prev => prev.filter(id => id !== tagId))}
                          className="hover:text-black cursor-pointer text-[10px] font-bold text-gray-400"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                  {selectedTagIds.length === 0 && (
                    <span className="text-xs text-[#a39e98] italic py-1">No tags assigned.</span>
                  )}
                </div>

                {/* Add/Search Dropdown */}
                <div className="relative">
                  <div className="flex items-center border border-[#e6e6e6] rounded-lg bg-white px-3 py-2">
                    <Search size={14} className="text-[#a39e98] mr-2" />
                    <input
                      ref={tagsInputRef}
                      type="text"
                      placeholder="Search or create tags..."
                      value={tagSearchQuery}
                      onChange={(e) => {
                        setTagSearchQuery(e.target.value);
                        setIsTagDropdownOpen(true);
                      }}
                      onFocus={() => setIsTagDropdownOpen(true)}
                      className="text-sm bg-transparent outline-none w-full text-black placeholder-[#a39e98]"
                    />
                    {tagSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTagSearchQuery('')}
                        className="text-xs text-gray-400 hover:text-black cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isTagDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsTagDropdownOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6e6e6] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                        {projectTags
                          .filter((t: any) => !selectedTagIds.includes(t.id) && t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                          .map((t: any) => (
                            <div
                              key={t.id}
                              onClick={() => {
                                setSelectedTagIds(prev => [...prev, t.id]);
                                setTagSearchQuery('');
                                setIsTagDropdownOpen(false);
                              }}
                              className="px-3 py-2 hover:bg-[#f6f5f4] cursor-pointer text-sm font-medium text-black border-b border-[#f0efee] last:border-0 flex justify-between items-center"
                            >
                              <span>{t.name}</span>
                              {t.taskCount > 0 && (
                                <span className="text-xs text-gray-400">{t.taskCount} tasks</span>
                              )}
                            </div>
                          ))}

                        {tagSearchQuery.trim() !== '' && !projectTags.some((t: any) => t.name.toLowerCase() === tagSearchQuery.trim().toLowerCase()) && (
                          <div
                            onClick={() => {
                              createTagMutation.mutate(tagSearchQuery.trim());
                            }}
                            className="px-3 py-2.5 hover:bg-black/5 cursor-pointer text-sm font-semibold text-black bg-gray-50 flex items-center gap-1.5 text-blue-600 border-t border-[#f0efee]"
                          >
                            <Plus size={14} />
                            <span>Create tag "{tagSearchQuery.trim()}"</span>
                          </div>
                        )}

                        {tagSearchQuery.trim() === '' && projectTags.filter((t: any) => !selectedTagIds.includes(t.id)).length === 0 && (
                          <div className="px-3 py-2 text-xs text-[#a39e98] italic text-center">
                            No other tags available.
                          </div>
                        )}
                      </div>
                    </>
                  )}
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
                    <div className="max-h-60 overflow-y-auto border border-[#e6e6e6] rounded-lg divide-y divide-[#e6e6e6] scrollbar-thin">
                      {activities.map((act: any) => (
                        <ActivityItem
                          key={act.id}
                          action={act.action}
                          actor={act.actorName}
                          timestamp={act.createdAt}
                          projectId={projectId}
                          taskId={act.taskId}
                          taskCode={act.taskCode}
                          sourceTaskId={act.sourceTaskId}
                          sourceTaskCode={act.sourceTaskCode}
                          targetTaskId={act.targetTaskId}
                          targetTaskCode={act.targetTaskCode}
                          minimal
                        />
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
