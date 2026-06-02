'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Clock, MoreVertical } from 'lucide-react';

const COLUMNS = [
  { id: 'BACKLOG', label: 'Backlog', color: 'bg-slate-200' },
  { id: 'TODO', label: 'To Do', color: 'bg-blue-100' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-100' },
  { id: 'REVIEW', label: 'Review', color: 'bg-purple-100' },
  { id: 'DONE', label: 'Done', color: 'bg-emerald-100' },
];

export default function TasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(1);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    }
  });

  const createTask = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newTaskTitle, 
          duration: newTaskDuration,
          state: 'BACKLOG' 
        })
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setIsCreating(false);
      setNewTaskTitle('');
      setNewTaskDuration(1);
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

  // Drag and Drop Handlers
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
      // Find the task to see if it's actually moving
      const task = tasks.find((t: any) => t.id === draggedTaskId);
      if (task && task.state !== state) {
        updateTaskState.mutate({ taskId: draggedTaskId, state });
      }
    }
    setDraggedTaskId(null);
  };

  if (isLoading) return <div className="p-8 text-slate-500">Loading board...</div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Task Board</h2>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {isCreating && (
        <form onSubmit={(e) => createTask.mutate(e)} className="mb-8 p-4 bg-white rounded-xl shadow-sm border border-slate-200 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Task Title</label>
            <input 
              autoFocus
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Design database schema"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-slate-500 mb-1">Duration (days)</label>
            <input 
              type="number"
              min="0.5"
              step="0.5"
              required
              value={newTaskDuration}
              onChange={(e) => setNewTaskDuration(Number(e.target.value))}
              className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button 
            type="submit" 
            disabled={createTask.isPending}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Save
          </button>
          <button 
            type="button" 
            onClick={() => setIsCreating(false)}
            className="text-slate-500 text-sm font-medium hover:text-slate-800 px-2"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter((t: any) => t.state === col.id);
          
          return (
            <div 
              key={col.id} 
              className="flex-shrink-0 w-80 bg-slate-100 rounded-xl p-4 flex flex-col border border-slate-200/60"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-semibold text-slate-700 text-sm">{col.label}</h3>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-[200px]">
                {colTasks.map((task: any) => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-slate-900 text-sm">{task.title}</h4>
                      <button className="text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center text-xs text-slate-400 font-medium mt-3 pt-3 border-t border-slate-50">
                      <Clock size={12} className="mr-1" />
                      {task.duration} {task.duration === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
