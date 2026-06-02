'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/v1/projects');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const createProject = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: '' })
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreating(false);
      setNewProjectName('');
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject.mutate(newProjectName);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Workspaces</h1>
          <p className="text-slate-500 mt-1">Manage and access all your CPM projects.</p>
        </div>
        
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <FolderPlus size={18} />
          New Project
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="mb-8 p-6 bg-white border border-blue-100 rounded-xl shadow-sm flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
            <input 
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Q3 Software Release"
            />
          </div>
          <button 
            type="submit" 
            disabled={createProject.isPending}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {createProject.isPending ? 'Creating...' : 'Create'}
          </button>
          <button 
            type="button"
            onClick={() => setIsCreating(false)}
            className="px-6 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-slate-500">Loading projects...</div>
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <FolderPlus size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No projects found</h3>
          <p className="text-slate-500 mt-1">Create your first workspace to start planning.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.data?.map((project: any) => (
            <Link href={`/projects/${project.id}/tasks`} key={project.id} className="group bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all block">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-lg flex items-center justify-center transition-colors">
                  <FolderPlus size={20} />
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">
                  {project.identifier}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{project.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-6">
                {project.description || 'No description provided.'}
              </p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center text-xs text-slate-400">
                  <Clock size={14} className="mr-1" />
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
