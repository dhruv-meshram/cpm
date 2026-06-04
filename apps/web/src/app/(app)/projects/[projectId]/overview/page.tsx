'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, Clock, Activity, BarChart3, AlertTriangle, TrendingUp, 
  Calendar, Network, Play, Download, Edit2, ListTodo, Route, 
  FileText, Users, Briefcase, Zap, AlertCircle, ArrowRight, Plus
} from 'lucide-react';
import { format } from 'date-fns';

export default function OverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: overview, isLoading } = useQuery({
    queryKey: ['overview', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/overview`);
      if (!res.ok) throw new Error('Failed to fetch project overview');
      return res.json();
    }
  });

  if (isLoading || !overview) {
    return <div className="p-8 text-slate-500 bg-slate-50 min-h-full">Loading project overview...</div>;
  }

  const { project, metrics, schedule, cpmInsights, dependencyStats, activities } = overview;

  // Format ENUMs
  const formatEnum = (str: string) => {
    if (!str) return '';
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };
  const projectStatus = formatEnum(project.status) || 'Draft';
  const overallHealth = formatEnum(project.health) || 'Healthy';

  const healthDotColor = overallHealth === 'Healthy' ? 'bg-emerald-500' : 
                         overallHealth === 'Warning' ? 'bg-amber-500' : 'bg-rose-500';
  const healthTextColor = overallHealth === 'Healthy' ? 'text-emerald-700' : 
                          overallHealth === 'Warning' ? 'text-amber-700' : 'text-rose-700';

  return (
    <div className="p-8 w-full max-w-none bg-slate-50 min-h-full space-y-8">
      
      {/* 1. Project Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border text-blue-700 bg-blue-50 border-blue-200 uppercase tracking-wider">
              {projectStatus}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">{project.identifier}</span>
            <span>Managed by {project.owner}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <Edit2 size={14} /> Edit Project
          </button>
          <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <Download size={14} /> Export
          </button>
          <Link href={`/projects/${projectId}/tasks`} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <Plus size={14} /> Add Task
          </Link>
          <Link href={`/projects/${projectId}/graph`} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm ml-2">
            <Play size={14} /> Run CPM
          </Link>
        </div>
      </div>

      {/* 2. Summary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: 'Total Tasks', value: metrics.totalTasks },
          { label: 'Completed', value: metrics.completedTasks },
          { label: 'In Progress', value: metrics.inProgressTasks },
          { label: 'Critical Tasks', value: metrics.criticalTasksCount, highlight: true },
          { label: 'Dependencies', value: metrics.dependenciesCount },
          { label: 'Completion %', value: `${metrics.progressPercent}%` },
          { label: 'Duration', value: `${metrics.projectDuration}d` },
          { label: 'Remaining', value: `${Math.max(0, metrics.projectDuration - 10)}d` } // mocked elapsed
        ].map((metric, idx) => (
          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 truncate">{metric.label}</div>
            <div className={`text-xl font-bold ${metric.highlight ? 'text-rose-600' : 'text-slate-900'}`}>{metric.value}</div>
          </div>
        ))}
      </div>

      {/* 3. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPM Insights Card */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Activity size={16} className="text-blue-600" /> CPM Insights
                </h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Critical Path Length</p>
                    <p className="text-lg font-semibold text-slate-900">{cpmInsights.criticalPathLength} <span className="text-xs font-normal text-slate-500">Tasks</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Critical Path Duration</p>
                    <p className="text-lg font-semibold text-slate-900">{cpmInsights.criticalPathDuration} <span className="text-xs font-normal text-slate-500">Days</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Float Available</p>
                    <p className="text-lg font-semibold text-slate-900">{cpmInsights.totalFloatAvailable} <span className="text-xs font-normal text-slate-500">Days</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Longest Dep. Chain</p>
                    <p className="text-lg font-semibold text-slate-900">{cpmInsights.longestDependencyChain} <span className="text-xs font-normal text-slate-500">Levels</span></p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    CPM Last Run: {cpmInsights.lastRunAt ? format(new Date(cpmInsights.lastRunAt), 'MMM d, h:mm a') : 'Never'}
                  </span>
                  <Link href={`/projects/${projectId}/graph`} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    View Network Graph <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Project Health Card */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Activity size={16} className="text-emerald-600" /> Project Health
                </h2>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5 p-3 rounded-md border bg-slate-50 border-slate-100">
                  <div className={`w-3 h-3 rounded-full ${healthDotColor}`} />
                  <div>
                    <p className="text-xs text-slate-500">Overall Health</p>
                    <p className={`text-sm font-semibold ${healthTextColor}`}>
                      {overallHealth}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Completion Rate</span>
                    <span className="text-sm font-medium text-slate-900">{metrics.progressPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Critical Task Ratio</span>
                    <span className="text-sm font-medium text-slate-900">
                      {metrics.totalTasks > 0 ? Math.round((metrics.criticalTasksCount / metrics.totalTasks) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Dependency Density</span>
                    <span className="text-sm font-medium text-slate-900">
                      {metrics.totalTasks > 0 ? (metrics.dependenciesCount / metrics.totalTasks).toFixed(1) : 0} deps/task
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Schedule Variance</span>
                    <span className={`text-sm font-medium ${schedule.daysVariance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {schedule.daysVariance} days
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dependency Overview */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Network size={16} className="text-indigo-600" /> Dependency Overview
                </h2>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-3xl font-bold text-slate-900">{dependencyStats.total}</div>
                  <div className="text-xs text-slate-500 leading-tight">Total active<br/>dependencies</div>
                </div>
                
                <ul className="space-y-3">
                  <li className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Tasks with No Dependencies</span>
                    <span className="text-sm font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">{dependencyStats.noDependencies}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Multiple Predecessors</span>
                    <span className="text-sm font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">{dependencyStats.multiplePredecessors}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Multiple Successors</span>
                    <span className="text-sm font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">{dependencyStats.multipleSuccessors}</span>
                  </li>
                  <li className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-sm text-slate-600 font-medium">Potential Bottlenecks</span>
                    <span className="text-sm font-medium bg-rose-100 text-rose-700 px-2 py-0.5 rounded">{dependencyStats.multiplePredecessors > 5 ? 5 : dependencyStats.multiplePredecessors}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Schedule Status */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-amber-600" /> Schedule Status
                </h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Planned Finish</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {schedule.plannedFinish ? format(new Date(schedule.plannedFinish), 'MMM d, yyyy') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Forecast Finish</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {schedule.forecastFinish ? format(new Date(schedule.forecastFinish), 'MMM d, yyyy') : 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Days Ahead / Behind</span>
                    <span className={`text-sm font-medium ${schedule.daysVariance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {schedule.daysVariance} Days
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Tasks Due This Week</span>
                    <span className="text-sm font-medium text-slate-900">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Overdue Tasks</span>
                    <span className="text-sm font-medium text-emerald-600">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Milestones Section */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-slate-600" /> Upcoming Milestones
              </h2>
            </div>
            <div className="p-5">
              <div className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                No upcoming milestones defined.
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          
          {/* Project Details & Progress */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 text-sm">Project Details</h2>
            </div>
            <div className="p-5 space-y-5">
              
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-slate-700">Project Progress</span>
                  <span className="text-sm font-bold text-slate-900">{metrics.progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${metrics.progressPercent}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{metrics.completedTasks} Completed</span>
                  <span>{metrics.totalTasks - metrics.completedTasks} Remaining</span>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Description</span>
                  <span className="text-xs font-medium text-slate-900 text-right max-w-[150px] truncate">{project.description || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Created Date</span>
                  <span className="text-xs font-medium text-slate-900">{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Last Updated</span>
                  <span className="text-xs font-medium text-slate-900">{format(new Date(project.updatedAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Owner</span>
                  <span className="text-xs font-medium text-slate-900">{project.owner}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation Panel */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 text-sm">Quick Navigation</h2>
            </div>
            <div className="p-2 flex flex-col gap-1">
              <Link href={`/projects/${projectId}/tasks`} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-md transition-colors group">
                <div className="flex items-center gap-3 text-slate-700">
                  <ListTodo size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-sm font-medium">Task Board</span>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
              </Link>
              <Link href={`/projects/${projectId}/gantt`} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-md transition-colors group">
                <div className="flex items-center gap-3 text-slate-700">
                  <Activity size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-sm font-medium">Gantt Chart</span>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
              </Link>
              <Link href={`/projects/${projectId}/graph`} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-md transition-colors group">
                <div className="flex items-center gap-3 text-slate-700">
                  <Route size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-sm font-medium">Network Graph</span>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
              </Link>
              <div className="flex items-center justify-between p-3 rounded-md opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3 text-slate-700">
                  <FileText size={16} className="text-slate-400" />
                  <span className="text-sm font-medium">Reports (Coming Soon)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h2 className="font-semibold text-slate-900 text-sm">Recent Activity</h2>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              {activities.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-8">
                  No recent activity found.
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((act: any) => (
                    <div key={act.id} className="flex gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 font-bold border border-slate-200">
                        {act.user.charAt(0).toUpperCase()}
                      </div>
                      <div className="pb-4 border-b border-slate-100 last:border-0 last:pb-0 flex-1">
                        <p className="text-slate-900 text-xs">
                          <span className="font-semibold">{act.user}</span> {act.action}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {format(new Date(act.timestamp), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Future-Ready Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-100/50 rounded-lg border border-dashed border-slate-200 p-4 text-center">
              <Users size={20} className="mx-auto text-slate-400 mb-2" />
              <div className="text-xs font-semibold text-slate-600">Resource Utilization</div>
              <div className="text-[10px] text-slate-400 mt-1">Coming Soon</div>
            </div>
            <div className="bg-slate-100/50 rounded-lg border border-dashed border-slate-200 p-4 text-center">
              <Briefcase size={20} className="mx-auto text-slate-400 mb-2" />
              <div className="text-xs font-semibold text-slate-600">Cost Tracking</div>
              <div className="text-[10px] text-slate-400 mt-1">Coming Soon</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
