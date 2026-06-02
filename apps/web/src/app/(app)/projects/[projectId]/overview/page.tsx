'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { CheckCircle2, Clock, Activity, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

export default function OverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project details');
      return res.json();
    }
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    }
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activity', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/activity`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      const data = await res.json();
      return data.data || [];
    }
  });

  if (projectLoading || tasksLoading || activitiesLoading) {
    return <div className="p-8 text-slate-500">Loading overview...</div>;
  }

  const completedTasks = tasks.filter((t: any) => t.state === 'DONE');
  const inProgressTasks = tasks.filter((t: any) => t.state === 'IN_PROGRESS' || t.state === 'REVIEW');
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="p-8 h-full bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900">{tasks.length}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <h3 className="text-2xl font-bold text-slate-900">{completedTasks.length}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">In Progress</p>
              <h3 className="text-2xl font-bold text-slate-900">{inProgressTasks.length}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Progress</p>
              <h3 className="text-2xl font-bold text-slate-900">{progressPercent}%</h3>
            </div>
          </div>
        </div>

        {/* Content Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Project Details</h3>
            <div className="space-y-4">
              <div>
                <span className="block text-sm font-medium text-slate-500 mb-1">Description</span>
                <p className="text-slate-800">{project.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-medium text-slate-500 mb-1">Target Date</span>
                  <p className="text-slate-800">
                    {project.targetDate ? format(new Date(project.targetDate), 'PPP') : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="block text-sm font-medium text-slate-500 mb-1">Last CPM Run</span>
                  <p className="text-slate-800">
                    {project.lastCpmRun ? format(new Date(project.lastCpmRun), 'PPP pp') : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col max-h-[500px]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {activities.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-8">
                  No recent activity found.
                </div>
              ) : (
                activities.map((act: any) => (
                  <div key={act.id} className="flex gap-3 text-sm border-b border-slate-50 pb-3 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
                      {act.user.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-slate-900">
                        <span className="font-medium">{act.user}</span> {act.action}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(act.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
