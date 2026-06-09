'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { format, differenceInDays, addDays, isSameDay, isWeekend, startOfWeek, endOfWeek, getWeekOfMonth } from 'date-fns';
import { 
  Calendar, Search, Filter, Download, Maximize,
  ChevronRight, ChevronDown, Activity, AlertTriangle, CheckCircle2,
  AlertCircle, ChevronLeft, CalendarDays, BarChart2, Users, Target, Flag
} from 'lucide-react';
import { useState, useMemo } from 'react';

const getGanttStatusColor = (state: string, isOverdue: boolean) => {
  if (isOverdue) return 'bg-red-100 text-red-800 border-red-400';
  switch (state) {
    case 'BACKLOG': 
    case 'TODO': return 'bg-slate-200 text-[#31302e] border-slate-300';
    case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-400';
    case 'REVIEW': return 'bg-amber-400 text-amber-900 border-amber-500';
    case 'DONE': return 'bg-emerald-500 text-white border-emerald-600';
    case 'BLOCKED': return 'bg-[#f64932] text-white border-rose-600';
    default: return 'bg-slate-200 text-[#31302e] border-slate-300';
  }
};

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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  const isLoading = tasksLoading || cpmLoading;

  if (isLoading) {
    return <div className="p-8 text-[#615d59] flex items-center justify-center h-full"><Activity className="animate-spin mr-2"/> Loading scheduling workspace...</div>;
  }

  const scheduledTasks = tasks.filter((t: any) => t.startDate && t.endDate);
  
  if (scheduledTasks.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-[#f6f5f4]">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-[#e6e6e6] max-w-md w-full flex flex-col items-center">
          <div className="w-16 h-16 bg-[#f6f5f4] text-black rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[#e6e6e6]">
            <CalendarDays size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#000000] mb-2">No Schedule Generated</h3>
          <p className="text-[#615d59] text-sm mb-8 leading-relaxed">
            Generate a CPM Schedule to visualize task dependencies and timelines. The Gantt chart requires calculated start and end dates.
          </p>
          <button className="bg-black hover:bg-black/90 text-white font-medium py-2.5 px-6 rounded-lg transition-colors w-full flex items-center justify-center gap-2 shadow-sm">
            <Activity size={18} /> Generate Schedule
          </button>
        </div>
      </div>
    );
  }

  const today = new Date();
  // Ensure we cover today in the chart
  let minDate = new Date(Math.min(...scheduledTasks.map((t: any) => new Date(t.startDate).getTime()), today.getTime() - 2 * 24*60*60*1000));
  let maxDate = new Date(Math.max(...scheduledTasks.map((t: any) => new Date(t.endDate).getTime()), today.getTime() + 10 * 24*60*60*1000));
  
  const totalDays = Math.max(1, differenceInDays(maxDate, minDate) + 1);
  const dates = Array.from({ length: totalDays }).map((_, i) => addDays(minDate, i));

  const dayWidth = timeScale === 'days' ? 48 : timeScale === 'weeks' ? 12 : 4;
  
  const toggleRow = (taskId: string) => {
    const next = new Set(expandedRows);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setExpandedRows(next);
  };

  const filteredTasks = scheduledTasks.filter((t: any) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    const details = cpmResults?.details?.taskDetails?.[t.id];
    const isCritical = details?.isCritical || false;
    if (showCriticalOnly && !isCritical) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#f6f5f4] overflow-hidden">
      
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
            <span className="text-sm font-semibold text-[#f64932]">18</span>
          </div>
          <div className="bg-[#f6f5f4] border border-[#e6e6e6] rounded-lg px-3 py-1.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-[#a39e98] uppercase tracking-wider mb-0.5">Duration</span>
            <span className="text-sm font-semibold text-slate-800">{cpmResults?.projectDuration || 45}d</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Progress</span>
            <span className="text-sm font-semibold text-emerald-700">62%</span>
          </div>
        </div>
      </div>

      {/* 2. Scheduling Toolbar */}
      <div className="bg-white border-b border-[#e6e6e6] px-4 py-2.5 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a39e98]" size={14} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#f6f5f4] border border-[#e6e6e6] rounded text-xs focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-[#31302e] bg-rose-50/50 border border-rose-100 px-2.5 py-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer">
            <input type="checkbox" className="rounded border-rose-300 text-[#f64932] focus:ring-rose-500" checked={showCriticalOnly} onChange={e => setShowCriticalOnly(e.target.checked)}/>
            Show Critical Only
          </label>
        </div>

        <div className="flex items-center bg-[#ece9e6] p-0.5 rounded-md border border-[#e6e6e6]">
          <button onClick={() => setTimeScale('days')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${timeScale === 'days' ? 'bg-white shadow-sm text-black' : 'text-[#615d59] hover:text-[#31302e]'}`}>Days</button>
          <button onClick={() => setTimeScale('weeks')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${timeScale === 'weeks' ? 'bg-white shadow-sm text-black' : 'text-[#615d59] hover:text-[#31302e]'}`}>Weeks</button>
          <button onClick={() => setTimeScale('months')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${timeScale === 'months' ? 'bg-white shadow-sm text-black' : 'text-[#615d59] hover:text-[#31302e]'}`}>Months</button>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-xs font-medium text-black bg-[#f6f5f4] border border-[#e6e6e6] rounded hover:bg-[#ece9e6] transition-colors">
            Today
          </button>
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
          <div className="flex-1 overflow-hidden relative">
            {filteredTasks.map((task: any) => {
              const details = cpmResults?.details?.taskDetails?.[task.id];
              const isCritical = details?.isCritical || false;
              const hasChildren = false; // Mock
              const isExpanded = expandedRows.has(task.id);
              
              return (
                <div key={`table-${task.id}`} className={`flex h-12 border-b border-slate-100 hover:bg-[#f6f5f4]/80 transition-colors group ${isCritical ? 'bg-rose-50/30' : ''}`}>
                  <div className="flex-1 p-2 flex items-center gap-2 overflow-hidden pl-4 relative">
                    {/* Critical indicator */}
                    {isCritical && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#f64932]"></div>}
                    
                    {hasChildren ? (
                       <button onClick={() => toggleRow(task.id)} className="p-0.5 hover:bg-slate-200 rounded text-[#a39e98]">
                         {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                       </button>
                    ) : (
                       <div className="w-4"></div>
                    )}
                    <span className="text-[10px] font-bold text-[#a39e98] bg-[#ece9e6] px-1.5 py-0.5 rounded border border-[#e6e6e6]">CP-{task.id.slice(0,3).toUpperCase()}</span>
                    <span className={`text-sm font-medium truncate ${isCritical ? 'text-rose-900' : 'text-[#31302e]'}`}>{task.title}</span>
                  </div>
                  <div className="w-16 flex items-center justify-center border-l border-slate-100 text-xs text-[#615d59] font-medium">
                    {task.duration}d
                  </div>
                  <div className="w-20 flex items-center justify-center border-l border-slate-100">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCritical ? 'bg-rose-100 text-[#f64932]' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                      {details?.slack || 0}d
                    </span>
                  </div>
                  <div className="w-20 flex items-center justify-center border-l border-slate-100 text-xs text-[#615d59]">
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
          <div className="h-16 flex bg-white border-b border-[#e6e6e6] sticky top-0 z-20 shadow-sm relative w-max">
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
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
              const daysInThisCell = i === arr.length - 1 
                ? differenceInDays(maxDate, date) + 1 
                : differenceInDays(arr[i+1], date);
              
              return (
                <div key={`header-wk-${i}`} className="border-r border-[#e6e6e6] flex flex-col items-center justify-center bg-white" style={{ width: daysInThisCell * dayWidth }}>
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
                <div key={`header-mo-${i}`} className="border-r border-[#e6e6e6] flex flex-col items-center justify-center bg-white" style={{ width: daysInThisCell * dayWidth }}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#31302e]">
                    {format(date, 'MMMM yyyy')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Body */}
          <div className="relative" style={{ width: totalDays * dayWidth }}>
            
            {/* Background Grid */}
            <div className="absolute inset-0 flex pointer-events-none">
              {dates.map((date, i) => (
                <div key={`grid-${i}`} className={`flex-shrink-0 border-r border-[#e6e6e6]/50 h-full ${isWeekend(date) ? 'bg-[#ece9e6]/50' : ''}`} style={{ width: dayWidth }}></div>
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

            {/* Tasks */}
            {filteredTasks.map((task: any, index: number) => {
              const taskStart = new Date(task.startDate);
              const taskEnd = new Date(task.endDate);
              const startOffsetDays = differenceInDays(taskStart, minDate);
              const durationDays = differenceInDays(taskEnd, taskStart) + 1;
              const leftOffset = startOffsetDays * dayWidth;
              const width = durationDays * dayWidth;
              const details = cpmResults?.details?.taskDetails?.[task.id];
              const isCritical = details?.isCritical || false;
              const isOverdue = task.state === 'BACKLOG' || (task.state !== 'DONE' && task.endDate && new Date(task.endDate) < new Date());
              const progress = getProgressForState(task.state);
              const isMilestone = task.duration === 0;

              return (
                <div key={`chart-${task.id}`} className="h-12 border-b border-transparent relative group">
                  {/* Hover background for entire row */}
                  <div className="absolute inset-0 bg-[#ece9e6]/0 group-hover:bg-[#ece9e6]/50 transition-colors z-0"></div>
                  
                  {isMilestone ? (
                    <div 
                       className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 rotate-45 rounded-sm z-10 cursor-pointer hover:bg-black transition-colors"
                      style={{ left: leftOffset - 12 }}
                      title={`Milestone: ${task.title}`}
                    />
                  ) : (
                    <div 
                      className={`absolute top-2.5 h-7 rounded shadow-sm flex items-center overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer z-10 ${getGanttStatusColor(task.state, isOverdue)} ${isCritical ? 'ring-2 ring-rose-500 ring-offset-1 ring-offset-white !border-rose-600' : ''}`}
                      style={{ left: leftOffset, width: width > 8 ? width - 4 : width }}
                      title={`Task: ${task.title}\nDuration: ${task.duration}d\nCritical: ${isCritical ? 'Yes' : 'No'}${isOverdue ? '\nOverdue: Yes' : ''}`}
                    >
                      {/* Progress Fill */}
                      <div className="absolute left-0 top-0 bottom-0 bg-black/10" style={{ width: `${progress}%` }}></div>
                      
                      {/* Label */}
                      <div className="relative z-10 px-2 truncate text-[11px] font-semibold text-inherit w-full flex items-center justify-between">
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  )}

                  {/* Resource layer mock below task */}
                  {width > 50 && !isMilestone && (
                    <div className="absolute top-[38px] text-[9px] font-medium text-[#615d59] flex items-center gap-1 z-10" style={{ left: leftOffset }}>
                      <div className="w-3.5 h-3.5 rounded-full bg-[#f6f5f4] text-black flex items-center justify-center font-bold border border-[#e6e6e6]">J</div>
                      John D.
                    </div>
                  )}

                  {/* Mock Dependency Arrow (just one for visual) */}
                  {index === 0 && (
                     <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
                       <path d={`M ${leftOffset + width} 24 L ${leftOffset + width + 15} 24 L ${leftOffset + width + 15} 72 L ${leftOffset + width + dayWidth} 72`} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 2"/>
                       <polygon points={`${leftOffset + width + dayWidth},72 ${leftOffset + width + dayWidth - 6},68 ${leftOffset + width + dayWidth - 6},76`} fill="#cbd5e1"/>
                     </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 13. Critical Path Legend */}
      <div className="bg-white border-t border-[#e6e6e6] px-6 py-3 shrink-0 flex items-center gap-6 overflow-x-auto shadow-[0_-4px_12px_rgba(0,0,0,0.02)] z-30">
        <div className="text-xs font-bold text-[#a39e98] uppercase tracking-wider shrink-0">Legend</div>
        <div className="h-4 w-px bg-slate-200 shrink-0"></div>
        <div className="flex items-center gap-5 text-xs shrink-0">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-400"></div><span className="text-[#615d59] font-medium">Overdue</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></div><span className="text-[#615d59] font-medium">Todo</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-black border border-black"></div><span className="text-[#615d59] font-medium">In Progress</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-400 border border-amber-500"></div><span className="text-[#615d59] font-medium">Review</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600"></div><span className="text-[#615d59] font-medium">Done</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#f64932] border border-rose-600"></div><span className="text-[#615d59] font-medium">Blocked</span></div>
        </div>
        <div className="h-4 w-px bg-slate-200 shrink-0"></div>
        <div className="flex items-center gap-5 text-xs shrink-0">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-rose-500 bg-rose-50/50 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-[#f64932] rounded-full"></div></div><span className="text-[#000000] font-bold">Critical Path</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-800 rotate-45 rounded-sm"></div><span className="text-[#615d59] font-medium">Milestone</span></div>
          <div className="flex items-center gap-1.5"><div className="w-0.5 h-4 bg-black"></div><span className="text-[#615d59] font-medium">Today</span></div>
        </div>
      </div>
    </div>
  );
}
