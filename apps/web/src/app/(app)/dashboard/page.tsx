'use client';

import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, CheckCircle2, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';

async function fetchStats() {
  const res = await fetch('/api/v1/dashboard/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function fetchRecentProjects() {
  const res = await fetch('/api/v1/dashboard/recent-projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

async function fetchUpcomingMilestones() {
  const res = await fetch('/api/v1/dashboard/upcoming-milestones');
  if (!res.ok) throw new Error('Failed to fetch milestones');
  return res.json();
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['stats'], queryFn: fetchStats });
  const { data: projects, isLoading: projectsLoading } = useQuery({ queryKey: ['recentProjects'], queryFn: fetchRecentProjects });
  const { data: milestones, isLoading: milestonesLoading } = useQuery({ queryKey: ['upcomingMilestones'], queryFn: fetchUpcomingMilestones });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Here's an overview of your workspaces.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Projects</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {statsLoading ? '-' : stats.totalProjects}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Tasks</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {statsLoading ? '-' : stats.totalTasks}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Completed Tasks</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {statsLoading ? '-' : stats.completedTasks}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-slate-500" />
              Recent Projects
            </h2>
            <Link href="/projects" className="text-sm text-blue-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="p-4">
            {projectsLoading ? (
              <p className="text-slate-500 p-4 text-center">Loading projects...</p>
            ) : projects?.length === 0 ? (
              <p className="text-slate-500 p-4 text-center">No projects found.</p>
            ) : (
              <ul className="space-y-3">
                {projects?.map((p: any) => (
                  <li key={p.id} className="p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                    <Link href={`/projects/${p.id}/overview`} className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-slate-900">{p.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">ID: {p.identifier}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-slate-500" />
              Upcoming Deadlines
            </h2>
          </div>
          <div className="p-4">
            {milestonesLoading ? (
              <p className="text-slate-500 p-4 text-center">Loading deadlines...</p>
            ) : milestones?.length === 0 ? (
              <p className="text-slate-500 p-4 text-center">No upcoming deadlines. You're all caught up!</p>
            ) : (
              <ul className="space-y-3">
                {milestones?.map((m: any) => (
                  <li key={m.taskId} className="p-3 hover:bg-slate-50 rounded-lg transition-colors flex justify-between items-center border border-transparent hover:border-slate-100">
                    <div>
                      <h4 className="font-medium text-slate-900">{m.taskName}</h4>
                      <p className="text-xs text-slate-500 mt-1">Project: {m.projectName}</p>
                    </div>
                    <div className="text-sm font-medium text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                      {new Date(m.endDate).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
