'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  duration: number;
  state: string;
  startDate?: string;
  endDate?: string;
}

interface Dependency {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: string;
  lag: number;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  taskToEdit?: Task | null;
}

export function TaskModal({ isOpen, onClose, projectId, taskToEdit }: TaskModalProps) {
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number | ''>(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [blockedBy, setBlockedBy] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  
  const [searchBlockedBy, setSearchBlockedBy] = useState('');
  const [searchBlocks, setSearchBlocks] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    enabled: isOpen
  });

  const { data: dependencies = [] } = useQuery<Dependency[]>({
    queryKey: ['dependencies', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/dependencies`);
      if (!res.ok) throw new Error('Failed to fetch dependencies');
      return res.json();
    },
    enabled: isOpen
  });

  useEffect(() => {
    if (taskToEdit && isOpen) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setDuration(taskToEdit.duration);
      setStartDate(taskToEdit.startDate ? new Date(taskToEdit.startDate).toISOString().split('T')[0] : '');
      setEndDate(taskToEdit.endDate ? new Date(taskToEdit.endDate).toISOString().split('T')[0] : '');
      
      const incoming = dependencies.filter(d => d.successorTaskId === taskToEdit.id).map(d => d.predecessorTaskId);
      const outgoing = dependencies.filter(d => d.predecessorTaskId === taskToEdit.id).map(d => d.successorTaskId);
      
      setBlockedBy(incoming);
      setBlocks(outgoing);
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setDuration(1);
      setStartDate('');
      setEndDate('');
      setBlockedBy([]);
      setBlocks([]);
    }
    setError(null);
  }, [taskToEdit, isOpen, dependencies]);

  const saveTask = useMutation({
    mutationFn: async () => {
      if (!title) throw new Error('Task name is required');
      if (duration === '' || Number(duration) < 0) throw new Error('Valid duration is required');
      if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        throw new Error('End Date cannot be before Start Date');
      }

      const duplicateDeps = blockedBy.filter(id => blocks.includes(id));
      if (duplicateDeps.length > 0) throw new Error('A task cannot both block and be blocked by the same task');

      let currentTaskId = taskToEdit?.id;

      // Create or update task
      const method = taskToEdit ? 'PUT' : 'POST';
      const url = taskToEdit 
        ? `/api/v1/projects/${projectId}/tasks/${taskToEdit.id}`
        : `/api/v1/projects/${projectId}/tasks`;

      const taskRes = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          description: description || undefined, 
          duration: Number(duration),
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        })
      });

      if (!taskRes.ok) throw new Error(`Failed to ${taskToEdit ? 'update' : 'create'} task`);
      const savedTask = await taskRes.json();
      currentTaskId = savedTask.id;

      // Handle dependencies if editing
      if (taskToEdit) {
        // Delete all old dependencies connected to this task
        const depsToDelete = dependencies.filter(d => d.predecessorTaskId === currentTaskId || d.successorTaskId === currentTaskId);
        await Promise.all(depsToDelete.map(d => 
          fetch(`/api/v1/projects/${projectId}/dependencies/${d.id}`, { method: 'DELETE' })
        ));
      }

      // Create incoming dependencies (Blocked By)
      await Promise.all(blockedBy.map(predId => 
        fetch(`/api/v1/projects/${projectId}/dependencies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            predecessorTaskId: predId,
            successorTaskId: currentTaskId,
            type: 'FS'
          })
        })
      ));

      // Create outgoing dependencies (Blocks)
      await Promise.all(blocks.map(succId => 
        fetch(`/api/v1/projects/${projectId}/dependencies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            predecessorTaskId: currentTaskId,
            successorTaskId: succId,
            type: 'FS'
          })
        })
      ));
      
      // Optionally run CPM calculation here if needed
      // await fetch(`/api/v1/projects/${projectId}/cpm/run`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
      queryClient.invalidateQueries({ queryKey: ['cpm', projectId] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'An error occurred while saving the task.');
    }
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const availableTasksForBlockedBy = tasks.filter(t => 
    t.id !== taskToEdit?.id && 
    !blocks.includes(t.id) &&
    t.title.toLowerCase().includes(searchBlockedBy.toLowerCase())
  );

  const availableTasksForBlocks = tasks.filter(t => 
    t.id !== taskToEdit?.id && 
    !blockedBy.includes(t.id) &&
    t.title.toLowerCase().includes(searchBlocks.toLowerCase())
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-full flex flex-col my-auto relative">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">
            {taskToEdit ? 'Edit Task' : 'Create Task'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-8">
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <section className="space-y-4">
            <h3 className="font-medium text-slate-800 text-lg border-b pb-2">Basic Information</h3>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Task Name *</label>
              <input 
                type="text" 
                required 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                placeholder="E.g., Design Database Schema"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                rows={3}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all resize-y"
                placeholder="Provide task details..."
              />
            </div>

            <div className="space-y-1 w-1/2">
              <label className="text-sm font-medium text-slate-700">Duration (Days) *</label>
              <input 
                type="number" 
                required
                min="0"
                step="0.1"
                value={duration} 
                onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))} 
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
              />
            </div>
          </section>

          {/* Scheduling */}
          <section className="space-y-4">
            <h3 className="font-medium text-slate-800 text-lg border-b pb-2">Scheduling</h3>
            <div className="flex gap-4">
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium text-slate-700">Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium text-slate-700">End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Dependencies */}
          <section className="space-y-6">
            <h3 className="font-medium text-slate-800 text-lg border-b pb-2">Dependencies</h3>
            
            {/* Blocked By */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">Blocked By (Predecessors)</label>
              
              <div className="flex flex-wrap gap-2 mb-2">
                {blockedBy.map(id => {
                  const t = tasks.find(t => t.id === id);
                  return t ? (
                    <div key={id} className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium border border-red-200">
                      <span>{t.title} ({t.duration}d)</span>
                      <button type="button" onClick={() => setBlockedBy(prev => prev.filter(p => p !== id))} className="hover:text-red-900 ml-1">
                        <X size={12} />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchBlockedBy}
                  onChange={e => setSearchBlockedBy(e.target.value)}
                  placeholder="Search tasks..." 
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                />
                {searchBlockedBy && availableTasksForBlockedBy.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {availableTasksForBlockedBy.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => {
                          setBlockedBy(prev => [...prev, t.id]);
                          setSearchBlockedBy('');
                        }}
                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0 border-slate-100 flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-700">{t.title}</span>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{t.duration} days - {t.state}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Blocks */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">Blocks (Successors)</label>
              
              <div className="flex flex-wrap gap-2 mb-2">
                {blocks.map(id => {
                  const t = tasks.find(t => t.id === id);
                  return t ? (
                    <div key={id} className="flex items-center gap-1.5 bg-[#f6f5f4] text-black px-2.5 py-1 rounded-full text-xs font-medium border border-[#e6e6e6]">
                      <span>{t.title} ({t.duration}d)</span>
                      <button type="button" onClick={() => setBlocks(prev => prev.filter(p => p !== id))} className="hover:text-black/80 ml-1">
                        <X size={12} />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchBlocks}
                  onChange={e => setSearchBlocks(e.target.value)}
                  placeholder="Search tasks..." 
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                />
                {searchBlocks && availableTasksForBlocks.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {availableTasksForBlocks.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => {
                          setBlocks(prev => [...prev, t.id]);
                          setSearchBlocks('');
                        }}
                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0 border-slate-100 flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-700">{t.title}</span>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{t.duration} days - {t.state}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => saveTask.mutate()}
            disabled={saveTask.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-black hover:bg-black/90 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {saveTask.isPending ? 'Saving...' : (taskToEdit ? 'Save Changes' : 'Create Task')}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
