'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, UploadCloud, Search, Filter, LayoutGrid, List as ListIcon, 
  MoreHorizontal, Clock, Activity, AlertTriangle, TrendingUp, CheckCircle2, 
  FolderKanban, FolderOpen, Edit2, Copy, Trash2, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// Normalize project data from API to ensure UI elements have safe fallbacks
const normalizeProjectData = (p: any) => {
  // Convert backend ENUMs (e.g. "AT_RISK") to display format ("At Risk")
  const formatEnum = (str: string) => {
    if (!str) return '';
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  return {
    ...p,
    status: formatEnum(p.status) || 'Draft',
    health: formatEnum(p.health) || 'Healthy',
    tasksCount: p.tasksCount || p.totalTasks || 0,
    dependenciesCount: p.dependenciesCount || 0,
    criticalTasksCount: p.criticalTasksCount || 0,
    completionPercent: p.completionPercent || 0,
    durationDays: p.durationDays || 0,
    criticalPathLength: p.criticalPathLength || 0,
    criticalPathDuration: p.criticalPathDuration || 0,
    owner: p.owner || 'Unassigned',
  };
};

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Future state placeholders
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/v1/projects');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const projects = data?.data?.map(normalizeProjectData) || [];
  const stats = data?.portfolioStats || {
    totalProjects: 0,
    activeProjects: 0,
    globalTasks: 0,
    globalCriticalTasks: 0,
    portfolioCompletionPercent: 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Completed': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Delayed': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Draft': return 'text-slate-700 bg-slate-100 border-slate-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getHealthDot = (health: string) => {
    switch (health) {
      case 'Healthy': return 'bg-emerald-500';
      case 'Warning': return 'bg-amber-500';
      case 'At Risk': return 'bg-red-500';
      default: return 'bg-slate-300';
    }
  };

  return (
    <div className="p-8 w-full max-w-none bg-slate-50 min-h-full space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and monitor all CPM projects</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2">
            <UploadCloud size={16} />
            Import Project
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* 2. Project Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Projects</p>
            <FolderKanban size={16} className="text-slate-400" />
          </div>
          <div className="flex justify-between items-end">
            <h3 className="text-2xl font-bold text-slate-900">{stats.totalProjects || '-'}</h3>
            <span className="text-xs text-slate-500 mb-1">Active: {stats.activeProjects}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Project Health</p>
            <Activity size={16} className="text-slate-400" />
          </div>
          <div className="flex justify-between items-end">
            <h3 className="text-2xl font-bold text-slate-900">{projects.filter((p:any) => p.health === 'Healthy').length} <span className="text-sm font-normal text-slate-500">healthy</span></h3>
            <span className="text-xs text-rose-600 mb-1">{projects.filter((p:any) => p.health === 'At Risk').length} at risk</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Global Tasks</p>
            <CheckCircle2 size={16} className="text-slate-400" />
          </div>
          <div className="flex justify-between items-end">
            <h3 className="text-2xl font-bold text-slate-900">{stats.globalTasks || '-'}</h3>
            <span className="text-xs text-slate-500 mb-1">{stats.globalCriticalTasks} critical</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Portfolio Completion</p>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900">{stats.portfolioCompletionPercent}%</h3>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">On Track</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center flex-1 gap-2">
          {/* Search */}
          <div className="flex items-center bg-slate-50 px-3 py-2 rounded-md w-full md:w-80 focus-within:ring-2 focus-within:ring-blue-500/20 border border-slate-200 focus-within:border-blue-500 transition-all">
            <Search size={16} className="text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>
          
          {/* Filters */}
          <button className="px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2">
            <Filter size={14} /> Status
          </button>
          <button className="px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2">
            Sort By
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <button 
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>

      {/* 4. Projects Grid / List View */}
      {isLoading ? (
        <div className="text-slate-500 p-8 text-center bg-white rounded-lg border border-slate-200 shadow-sm">Loading projects workspace...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-dashed border-slate-300 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <FolderKanban size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No projects found</h3>
          <p className="text-slate-500 mt-1 max-w-sm mb-6">Your workspace is empty. Create a new project or import an existing schedule to get started.</p>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
            <Plus size={16} />
            Create Project
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <div key={project.id} className="group bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden">
              
              {/* Health Indicator Strip */}
              <div className={`absolute top-0 left-0 w-full h-1 ${getHealthDot(project.health)}`} />
              
              <div className="p-5 flex-1">
                {/* Top Section */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center border border-slate-200 shrink-0">
                      <FolderKanban size={18} />
                    </div>
                    <div>
                      <Link href={`/projects/${project.id}/overview`} className="text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors leading-tight block line-clamp-1">
                        {project.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-slate-500">{project.identifier}</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${getHealthDot(project.health)}`} />
                          <span className="text-[10px] font-medium text-slate-500">{project.health}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-2 h-8 mb-4">
                  {project.description || 'No description provided.'}
                </p>

                {/* Mini Metrics Row */}
                <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-slate-50 rounded-md border border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Tasks</div>
                    <div className="text-xs font-semibold text-slate-900">{project.tasksCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Deps</div>
                    <div className="text-xs font-semibold text-slate-900">{project.dependenciesCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Critical</div>
                    <div className="text-xs font-semibold text-red-600">{project.criticalTasksCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Progress</div>
                    <div className="text-xs font-semibold text-slate-900">{project.completionPercent}%</div>
                  </div>
                </div>

                {/* CPM Indicators */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Project Duration</span>
                    <span className="font-medium text-slate-900">{project.durationDays} days</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Critical Path</span>
                    <span className="font-medium text-slate-900">{project.criticalPathLength} tasks ({project.criticalPathDuration}d)</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1 overflow-hidden">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${project.completionPercent}%` }}></div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between group-hover:bg-white transition-colors">
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <Clock size={12} />
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>
                
                {/* Quick Actions - Visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100" title="Duplicate">
                    <Copy size={14} />
                  </button>
                  <button className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                    <Trash2 size={14} />
                  </button>
                  <Link href={`/projects/${project.id}/overview`} className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 ml-1" title="Open Project">
                    <FolderOpen size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-8 text-center">
                  <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Health</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Tasks</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Critical</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Duration</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Updated</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project: any) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project.id}/overview`} className="font-medium text-slate-900 hover:text-blue-600 text-sm">
                      {project.name}
                    </Link>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">{project.identifier}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${getHealthDot(project.health)}`} />
                      <span className="text-xs text-slate-600">{project.health}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-900 text-right">{project.tasksCount}</td>
                  <td className="px-4 py-3 text-xs font-medium text-red-600 text-right">{project.criticalTasksCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${project.completionPercent}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-slate-600">{project.completionPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-900 text-right">{project.durationDays}d</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(project.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-200"><MoreHorizontal size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. CPM Portfolio Insights */}
      {!isLoading && projects.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mt-8">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-semibold text-slate-900 text-sm">Portfolio Insights</h2>
            <Activity size={16} className="text-slate-400" />
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-slate-50 rounded-md border border-slate-100 flex flex-col justify-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Total Critical Tasks</div>
                <div className="text-xl font-bold text-red-600">{projects.reduce((acc: number, p: any) => acc + p.criticalTasksCount, 0)}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-md border border-slate-100 flex flex-col justify-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Longest Critical Path</div>
                <div className="text-xl font-bold text-slate-900">{Math.max(...projects.map((p:any) => p.criticalPathDuration)) || 0} <span className="text-xs font-normal text-slate-500">days</span></div>
              </div>
              <div className="p-4 bg-slate-50 rounded-md border border-slate-100 flex flex-col justify-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Avg Project Duration</div>
                <div className="text-xl font-bold text-slate-900">{Math.round(projects.reduce((acc: number, p: any) => acc + p.durationDays, 0) / (projects.length || 1))} <span className="text-xs font-normal text-slate-500">days</span></div>
              </div>
              <div className="p-4 bg-rose-50 rounded-md border border-rose-100 flex flex-col justify-center">
                <div className="text-[10px] text-rose-600 uppercase font-semibold tracking-wider mb-1">Projects At Risk</div>
                <div className="text-xl font-bold text-rose-700">{projects.filter((p:any) => p.health === 'At Risk').length}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-md border border-slate-100 flex flex-col justify-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Total Dependencies</div>
                <div className="text-xl font-bold text-slate-900">{projects.reduce((acc: number, p: any) => acc + p.dependenciesCount, 0)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
