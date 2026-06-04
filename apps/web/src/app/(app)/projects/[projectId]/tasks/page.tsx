'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Clock, MoreVertical, Edit2 } from 'lucide-react';
import { TaskModal } from '@/components/TaskModal';

const COLUMNS = [
  { id: 'BACKLOG', label: 'Backlog', color: 'bg-slate-200' },
  { id: 'TODO', label: 'To Do', color: 'bg-slate-400' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'REVIEW', label: 'Review', color: 'bg-amber-400' },
  { id: 'DONE', label: 'Done', color: 'bg-emerald-500' },
];

export default function TasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    }
  });

  // createTask is now handled in TaskModal

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
          onClick={() => {
            setTaskToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        taskToEdit={taskToEdit}
      />

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter((t: any) => t.state === col.id);
          
          return (
            <div 
              key={col.id} 
              className="flex-shrink-0 w-80 bg-slate-50/50 rounded-xl p-4 flex flex-col border border-slate-200/60"
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
                      <button 
                        onClick={() => {
                          setTaskToEdit(task);
                          setIsModalOpen(true);
                        }}
                        className="text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 size={14} />
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
