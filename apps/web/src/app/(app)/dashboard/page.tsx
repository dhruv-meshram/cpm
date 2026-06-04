'use client';

import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, CheckCircle2, Clock, Calendar, Plus, Activity, TrendingUp, AlertTriangle, FolderKanban } from 'lucide-react';
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
    <div className="p-8 w-full max-w-none space-y-8 bg-slate-50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Project scheduling overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/projects/new" className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Plus size={16} />
            New Task
          </Link>
          <Link href="/projects/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
            <Plus size={16} />
            New Project
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Projects</p>
            <FolderKanban size={16} className="text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {statsLoading ? '-' : stats.totalProjects}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tasks</p>
            <CheckCircle2 size={16} className="text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {statsLoading ? '-' : stats.totalTasks}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Critical Tasks</p>
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {statsLoading ? '-' : Math.floor(stats.totalTasks * 0.25)} {/* Mocked for now */}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Tasks</p>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900">
              {statsLoading ? '-' : stats.completedTasks}
            </h3>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {statsLoading ? '0%' : `${Math.round((stats.completedTasks / Math.max(1, stats.totalTasks)) * 100)}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900 text-sm">Recent Projects</h2>
              <Link href="/projects" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</Link>
            </div>
            <div className="p-2">
              {projectsLoading ? (
                <p className="text-slate-500 text-sm p-4 text-center">Loading projects...</p>
              ) : projects?.length === 0 ? (
                <p className="text-slate-500 text-sm p-4 text-center">No projects found.</p>
              ) : (
                <ul className="space-y-1">
                  {projects?.map((p: any) => (
                    <li key={p.id} className="p-3 hover:bg-slate-50 rounded-md transition-colors">
                      <Link href={`/projects/${p.id}/overview`} className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-slate-900 text-sm">{p.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Updated recently</p>
                        </div>
                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {p.identifier}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900 text-sm">Recent Activity</h2>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {/* Mocked activity feed */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-md bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium text-slate-900">Task created</div>
                      <time className="text-[10px] text-slate-500">2h ago</time>
                    </div>
                    <div className="text-xs text-slate-500">Added 'API Gateway Integration' to PRJ-1</div>
                  </div>
                </div>
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-emerald-100 text-emerald-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                  </div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-md bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium text-slate-900">CPM Recalculated</div>
                      <time className="text-[10px] text-slate-500">5h ago</time>
                    </div>
                    <div className="text-xs text-slate-500">Duration updated to 75 days</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-sm">Upcoming Deadlines</h2>
            </div>
            <div className="p-2">
              {milestonesLoading ? (
                <p className="text-slate-500 text-sm p-4 text-center">Loading deadlines...</p>
              ) : milestones?.length === 0 ? (
                <p className="text-slate-500 text-sm p-4 text-center">No upcoming deadlines.</p>
              ) : (
                <ul className="space-y-1">
                  {milestones?.map((m: any) => (
                    <li key={m.taskId} className="p-3 hover:bg-slate-50 rounded-md transition-colors flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-slate-900 text-sm">{m.taskName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{m.projectName}</p>
                      </div>
                      <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded">
                        {new Date(m.endDate).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900 text-sm">CPM Insights</h2>
              <Activity size={16} className="text-slate-400" />
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-md border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">Critical Path Length</div>
                  <div className="text-xl font-semibold text-slate-900">27 <span className="text-xs font-normal text-slate-500">tasks</span></div>
                </div>
                <div className="p-4 bg-slate-50 rounded-md border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">Project Duration</div>
                  <div className="text-xl font-semibold text-slate-900">75 <span className="text-xs font-normal text-slate-500">days</span></div>
                </div>
                <div className="p-4 bg-red-50 rounded-md border border-red-100">
                  <div className="text-xs text-red-600 mb-1">Tasks At Risk</div>
                  <div className="text-xl font-semibold text-red-700">4</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-md border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">Active Dependencies</div>
                  <div className="text-xl font-semibold text-slate-900">231</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
