'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { format, differenceInDays, addDays, isSameDay, isWeekend, startOfWeek, endOfWeek, getWeekOfMonth } from 'date-fns';
import { 
  Search, ChevronRight, ChevronDown, Activity, CalendarDays, Flag
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

const getProgressForState = (state: string) => {
  if (state === 'DONE') return 100;
  if (state === 'IN_PROGRESS') return 65;
  if (state === 'REVIEW') return 90;
  return 0;
};

export default function GanttPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [timeScale, setTimeScale] = useState<'days' | 'weeks' | 'months'>('days');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterDeptId, setSelectedFilterDeptId] = useState<string>('ALL');
  const [groupByDept, setGroupByDept] = useState(false);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    }
  });

  const { data: cpmResults, isLoading: cpmLoading } = useQuery({
    queryKey: ['cpmResults', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/cpm/results`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch CPM results');
      }
      return res.json();
    }
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['departments', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/departments`);
      if (!res.ok) throw new Error('Failed to fetch departments');
      return res.json();
    }
  });

  const isLoading = tasksLoading || cpmLoading;

  const getGanttStatusStyle = (state: string, isOverdue: boolean) => {
    if (isOverdue) {
      return {
        backgroundColor: '#fee2e2',
        borderColor: '#f87171',
        color: '#991b1b',
      };
    }
    if (state === 'DONE') {
      return {
        backgroundColor: '#10b981',
        borderColor: '#059669',
        color: '#ffffff',
      };
    }
    if (state === 'BLOCKED') {
      return {
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
        color: '#ffffff',
      };
    }

    switch (state) {
      case 'BACKLOG': 
      case 'TODO': 
        return { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1', color: '#475569' };
      case 'IN_PROGRESS': 
        return { backgroundColor: '#fef9c3', borderColor: '#facc15', color: '#854d0e' };
      case 'REVIEW': 
        return { backgroundColor: '#ffedd5', borderColor: '#fb923c', color: '#9a3412' };
      default: 
        return { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1', color: '#475569' };
    }
  };

  const isTaskOverdue = (task: any) => {
    if (task.state === 'DONE') return false;
    if (task.state === 'BACKLOG') return true;
    if (task.endDate) {
      return new Date(task.endDate) < new Date();
    }
    return false;
  };

  const scheduledTasks = useMemo(() => {
    return tasks.filter((t: any) => t.startDate && t.endDate);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return scheduledTasks.filter((t: any) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      const details = cpmResults?.details?.taskDetails?.[t.id];
      const isCritical = details?.isCritical || false;
      if (showCriticalOnly && !isCritical) return false;

      const matchesDept = selectedFilterDeptId === 'ALL' || (t.departments && t.departments.some((d: any) => d.id === selectedFilterDeptId));
      if (!matchesDept) return false;

      return true;
    });
  }, [scheduledTasks, searchQuery, cpmResults, showCriticalOnly, selectedFilterDeptId]);

  // Group tasks by department or treat as flat
  const taskGroups = useMemo(() => {
    if (!groupByDept) {
      return [{ name: null, color: null, tasks: filteredTasks }];
    }

    const groups: Record<string, { id: string; name: string; color: string; tasks: any[] }> = {};

    filteredTasks.forEach((t: any) => {
      const taskDeps = t.departments && t.departments.length > 0 
        ? t.departments 
        : [{ id: 'general', name: 'General', color: '#7f8c8d' }];

      taskDeps.forEach((d: any) => {
        if (!groups[d.id]) {
          groups[d.id] = { id: d.id, name: d.name, color: d.color, tasks: [] };
        }
        groups[d.id].tasks.push(t);
      });
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTasks, groupByDept]);

  // Flattened row structure for rendering Left Panel and Right Chart synchronously
  const flatRows = useMemo(() => {
    const rows: ({ type: 'group'; id: string; name: string; color: string } | { type: 'task'; task: any })[] = [];
    taskGroups.forEach(g => {
      if (g.name !== null) {
        rows.push({ type: 'group', id: g.id, name: g.name, color: g.color });
      }
      g.tasks.forEach((t: any) => {
        rows.push({ type: 'task', task: t });
      });
    });
    return rows;
  }, [taskGroups]);

  const today = new Date();
  
  const minDate = useMemo(() => {
    if (scheduledTasks.length === 0) return today;
    const times = scheduledTasks.map((t: any) => new Date(t.startDate).getTime());
    return new Date(Math.min(...times, today.getTime() - 2 * 24 * 60 * 60 * 1000));
  }, [scheduledTasks]);

  const maxDate = useMemo(() => {
    if (scheduledTasks.length === 0) return today;
    const times = scheduledTasks.map((t: any) => new Date(t.endDate).getTime());
    return new Date(Math.max(...times, today.getTime() + 10 * 24 * 60 * 60 * 1000));
  }, [scheduledTasks]);
  
  const totalDays = useMemo(() => {
    return Math.max(1, differenceInDays(maxDate, minDate) + 1);
  }, [maxDate, minDate]);

  const dates = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, i) => addDays(minDate, i));
  }, [totalDays, minDate]);

  const dayWidth = timeScale === 'days' ? 48 : timeScale === 'weeks' ? 12 : 4;

  if (isLoading) {
    return (
      <div className="p-8 text-[#615d59] flex items-center justify-center h-full">
        <Activity className="animate-spin mr-2"/> Loading scheduling workspace...
      </div>
    );
  }

  if (scheduledTasks.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-[#f6f5f4]">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-[#e6e6e6] max-w-md w-full flex flex-col items-center">
          <div className="w-16 h-16 bg-[#f6f5f4] text-black rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[#e6e6e6]">
            <CalendarDays size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#000000] mb-2">No Schedule Generated</h3>
          <p className="text-[#615d59] text-sm mb-8 leading-relaxed">
            Generate a CPM Schedule to visualize task timelines. The Gantt chart requires tasks to have start and end dates.
          </p>
        </div>
      </div>
    );
  }

  const criticalCount = tasks.filter((t: any) => 
    cpmResults?.details?.taskDetails?.[t.id]?.isCritical ?? t.isCritical ?? false
  ).length;

  return (
    <div className="h-full flex flex-col bg-[#f6f5f4] overflow-hidden select-none">
      
      {/* 1. Page Header */}
      <div className="bg-white border-b border-[#e6e6e6] px-6 py-4 shrink-0 flex justify-between items-center z-20 sticky top-0 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#000000] flex items-center gap-2">
            Project Timeline
          </h1>
          <p className="text-xs text-[#615d59] mt-1 font-medium flex items-center gap-1.5">
            <Activity size={12} className="text-black" /> Generated by CPM Engine
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-[#f6f5f4] border border-[#e6e6e6] rounded-lg px-3 py-1.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-[#a39e98] uppercase tracking-wider mb-0.5">Tasks</span>
            <span className="text-sm font-semibold text-slate-800">{scheduledTasks.length}</span>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-1.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">Critical</span>
            <span className="text-sm font-semibold text-[#f64932]">{criticalCount}</span>
          </div>
          <div className="bg-[#f6f5f4] border border-[#e6e6e6] rounded-lg px-3 py-1.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-[#a39e98] uppercase tracking-wider mb-0.5">Duration</span>
            <span className="text-sm font-semibold text-slate-800">{cpmResults?.projectDuration || 0}d</span>
          </div>
        </div>
      </div>

      {/* 2. Scheduling Toolbar */}
      <div className="bg-white border-b border-[#e6e6e6] px-4 py-2.5 flex items-center justify-between shrink-0 z-10 shadow-sm gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a39e98]" size={14} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#f6f5f4] border border-[#e6e6e6] rounded text-xs focus:outline-hidden"
            />
          </div>
          
          <select
            value={selectedFilterDeptId}
            onChange={(e) => setSelectedFilterDeptId(e.target.value)}
            className="px-2.5 py-1.5 border border-[#e6e6e6] rounded bg-white text-xs font-semibold text-gray-700"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs font-medium text-[#31302e] bg-[#f6f5f4] border border-[#e6e6e6] px-2.5 py-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer">
            <input 
              type="checkbox" 
              className="rounded border-gray-300 text-black focus:ring-black" 
              checked={groupByDept} 
              onChange={e => setGroupByDept(e.target.checked)}
            />
            Group by Department
          </label>

          <label className="flex items-center gap-1.5 text-xs font-medium text-[#31302e] bg-rose-50/50 border border-rose-100 px-2.5 py-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer">
            <input 
              type="checkbox" 
              className="rounded border-rose-300 text-[#f64932] focus:ring-rose-500" 
              checked={showCriticalOnly} 
              onChange={e => setShowCriticalOnly(e.target.checked)}
            />
            Show Critical Only
          </label>
        </div>

        <div className="flex items-center bg-[#ece9e6] p-0.5 rounded-md border border-[#e6e6e6]">
          {([['days', 'Days'], ['weeks', 'Weeks'], ['months', 'Months']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTimeScale(val)}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${timeScale === val ? 'bg-white shadow-sm text-black' : 'text-[#615d59] hover:text-[#31302e]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Gantt Area */}
      <div className="flex-1 overflow-auto flex relative bg-white">
        
        {/* Left Task Table */}
        <div className="w-[450px] shrink-0 border-r border-[#e6e6e6] bg-white z-20 sticky left-0 flex flex-col shadow-[4px_0_12px_rgba(0,0,0,0.03)]">
          {/* Table Header */}
          <div className="flex bg-[#f6f5f4] border-b border-[#e6e6e6] h-16 shrink-0 sticky top-0 z-30">
            <div className="flex-1 p-3 flex items-center text-xs font-bold text-[#615d59] uppercase tracking-wider">Task Name</div>
            <div className="w-16 p-3 flex items-center text-xs font-bold text-[#615d59] uppercase tracking-wider border-l border-[#e6e6e6] justify-center">Dur</div>
            <div className="w-20 p-3 flex items-center text-xs font-bold text-[#615d59] uppercase tracking-wider border-l border-[#e6e6e6] justify-center">Float</div>
            <div className="w-20 p-3 flex items-center text-xs font-bold text-[#615d59] uppercase tracking-wider border-l border-[#e6e6e6] justify-center">Start</div>
          </div>
          
          {/* Table Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {flatRows.map((row, idx) => {
              if (row.type === 'group') {
                return (
                  <div 
                    key={`group-tbl-${row.id}-${idx}`}
                    className="h-12 bg-[#f6f5f4] border-y border-[#e6e6e6] text-[#000000] flex items-center px-4 shrink-0 font-bold text-xs uppercase tracking-wider select-none"
                  >
                    {row.name}
                  </div>
                );
              }

              const task = row.task;
              const details = cpmResults?.details?.taskDetails?.[task.id];
              const isCritical = details?.isCritical || false;
              
              return (
                <div key={`table-${task.id}-${idx}`} className={`flex h-12 hover:bg-[#f6f5f4]/80 transition-colors group items-stretch ${isCritical ? 'bg-rose-50/30' : ''}`}>
                  <div className="flex-1 p-2 flex items-center gap-2 overflow-hidden pl-4 relative">
                    {isCritical && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#f64932]" />}
                    <span className="text-[10px] font-bold text-[#a39e98] bg-[#ece9e6] px-1.5 py-0.5 rounded border border-[#e6e6e6] shrink-0">
                      CP-{task.id.slice(0,3).toUpperCase()}
                    </span>
                    <span className={`text-sm font-medium truncate ${isCritical ? 'text-rose-900' : 'text-[#31302e]'}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="w-16 flex items-center justify-center border-l border-slate-100 text-xs text-[#615d59] font-medium shrink-0">
                    {task.duration}d
                  </div>
                  <div className="w-20 flex items-center justify-center border-l border-slate-100 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCritical ? 'bg-rose-100 text-[#f64932]' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                      {details?.slack || 0}d
                    </span>
                  </div>
                  <div className="w-20 flex items-center justify-center border-l border-slate-100 text-xs text-[#615d59] shrink-0">
                    {format(new Date(task.startDate), 'MMM d')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Chart Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#f6f5f4]/30" id="gantt-scroll-area">
          
          {/* Chart Header (Dates) */}
          <div className="h-16 flex bg-white border-b border-[#e6e6e6] sticky top-0 z-20 shadow-sm w-max">
            {timeScale === 'days' && dates.map((date, i) => {
              const isToday = isSameDay(date, today);
              const isWknd = isWeekend(date);
              return (
                <div key={`header-${i}`} className={`w-12 flex-shrink-0 border-r border-[#e6e6e6] flex flex-col items-center justify-center ${isWknd ? 'bg-[#f6f5f4]' : 'bg-white'} ${isToday ? 'bg-[#ece9e6]/50' : ''}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-black font-[700]' : 'text-[#a39e98]'}`}>{format(date, 'EEE')}</span>
                  <span className={`text-[13px] font-bold ${isToday ? 'text-white bg-black px-1.5 py-0.5 rounded flex items-center justify-center' : 'text-[#31302e]'}`}>{format(date, 'M/d')}</span>
                </div>
              );
            })}

            {timeScale === 'weeks' && dates.filter(d => d.getDay() === 1 || isSameDay(d, minDate)).map((date, i, arr) => {
              const weekStart = date.getDay() === 1 ? date : startOfWeek(date, { weekStartsOn: 1 });
              const daysInThisCell = i === arr.length - 1 
                ? differenceInDays(maxDate, date) + 1 
                : differenceInDays(arr[i+1], date);
              
              return (
                <div key={`header-wk-${i}`} className="border-r border-[#e6e6e6] flex flex-col items-center justify-center bg-white shrink-0" style={{ width: daysInThisCell * dayWidth }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#31302e]">
                    Week {getWeekOfMonth(weekStart)} {format(weekStart, 'MMMM')}
                  </span>
                </div>
              );
            })}

            {timeScale === 'months' && dates.filter(d => d.getDate() === 1 || isSameDay(d, minDate)).map((date, i, arr) => {
              const daysInThisCell = i === arr.length - 1 
                ? differenceInDays(maxDate, date) + 1 
                : differenceInDays(arr[i+1], date);
                
              return (
                <div key={`header-mo-${i}`} className="border-r border-[#e6e6e6] flex flex-col items-center justify-center bg-white shrink-0" style={{ width: daysInThisCell * dayWidth }}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#31302e]">
                    {format(date, 'MMMM yyyy')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Body */}
          <div className="relative overflow-y-auto h-[calc(100%-4rem)] w-max select-none" style={{ width: totalDays * dayWidth }}>
            
            {/* Background Grid */}
            <div className="absolute inset-y-0 left-0 flex pointer-events-none w-full">
              {dates.map((date, i) => (
                <div key={`grid-${i}`} className={`flex-shrink-0 border-r border-[#e6e6e6]/30 h-full ${isWeekend(date) ? 'bg-[#ece9e6]/20' : ''}`} style={{ width: dayWidth }} />
              ))}
            </div>

            {/* Today Marker */}
            {dates.findIndex(d => isSameDay(d, today)) !== -1 && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-black z-10 pointer-events-none"
                style={{ left: dates.findIndex(d => isSameDay(d, today)) * dayWidth + (dayWidth / 2) }}
              >
                <div className="absolute top-0 -translate-x-1/2 -translate-y-full bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-t">
                  TODAY
                </div>
              </div>
            )}

            {/* Rows rendering */}
            {flatRows.map((row, index) => {
              if (row.type === 'group') {
                return (
                  <div 
                    key={`group-bar-${row.id}-${index}`}
                    className="h-12 bg-[#f6f5f4] border-y border-[#e6e6e6] w-full relative z-0 flex items-center"
                  />
                );
              }

              const task = row.task;
              const taskStart = new Date(task.startDate);
              const taskEnd = new Date(task.endDate);
              const startOffsetDays = differenceInDays(taskStart, minDate);
              const durationDays = differenceInDays(taskEnd, taskStart) + 1;
              const leftOffset = startOffsetDays * dayWidth;
              const width = durationDays * dayWidth;
              const details = cpmResults?.details?.taskDetails?.[task.id];
              const isCritical = details?.isCritical || false;
              const isOverdue = isTaskOverdue(task);
              const progress = getProgressForState(task.state);
              const isMilestone = task.duration === 0;

              const style = getGanttStatusStyle(task.state, isOverdue);

              return (
                <div key={`chart-${task.id}-${index}`} className="h-12 border-b border-[#e6e6e6]/40 relative group w-full flex items-center">
                  <div className="absolute inset-0 bg-[#ece9e6]/0 group-hover:bg-[#ece9e6]/50 transition-colors z-0" />
                  
                  {isMilestone ? (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-800 rotate-45 rounded-sm z-10 cursor-pointer hover:bg-black transition-colors"
                      style={{ left: leftOffset - 10 }}
                      title={`Milestone: ${task.title}`}
                    />
                  ) : (
                    <div 
                      className={cn(
                        "absolute h-7 rounded-[4px] border shadow-xs flex items-center overflow-hidden transition-all duration-200 hover:shadow-xs cursor-pointer z-10",
                        isCritical ? 'ring-2 ring-rose-500 ring-offset-1 ring-offset-white' : ''
                      )}
                      style={{ 
                        left: leftOffset, 
                        width: width > 8 ? width - 4 : width,
                        backgroundColor: style.backgroundColor,
                        borderColor: style.borderColor,
                        color: style.color
                      }}
                      title={`Task: ${task.title}\nDuration: ${task.duration}d\nCritical: ${isCritical ? 'Yes' : 'No'}${isOverdue ? '\nOverdue: Yes' : ''}`}
                    >
                      {/* Progress Fill */}
                      <div className="absolute left-0 top-0 bottom-0 bg-current opacity-10" style={{ width: `${progress}%` }} />
                      
                      {/* Label */}
                      <div className="relative z-10 px-2 truncate text-[11px] font-bold w-full">
                        {task.title}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical Path Legend */}
      <div className="bg-white border-t border-[#e6e6e6] px-6 py-3 shrink-0 flex items-center gap-6 overflow-x-auto shadow-[0_-4px_12px_rgba(0,0,0,0.02)] z-30">
        <div className="text-xs font-bold text-[#a39e98] uppercase tracking-wider shrink-0">Legend</div>
        <div className="h-4 w-px bg-slate-200 shrink-0" />
        <div className="flex items-center gap-5 text-xs shrink-0">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-400" /><span className="text-[#615d59] font-medium">Overdue</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600" /><span className="text-[#615d59] font-medium">Done</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#f64932] border border-rose-600" /><span className="text-[#615d59] font-medium">Blocked</span></div>
        </div>
        <div className="h-4 w-px bg-slate-200 shrink-0" />
        <div className="flex items-center gap-5 text-xs shrink-0">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-rose-500 bg-rose-50/50 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-[#f64932] rounded-full" /></div><span className="text-[#000000] font-bold">Critical Path</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-800 rotate-45 rounded-sm" /><span className="text-[#615d59] font-medium">Milestone</span></div>
          <div className="flex items-center gap-1.5"><div className="w-0.5 h-4 bg-black" /><span className="text-[#615d59] font-medium">Today</span></div>
        </div>
      </div>
    </div>
  );
}
