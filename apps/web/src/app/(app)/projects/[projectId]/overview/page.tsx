'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Network,
  Download,
  Play,
} from 'lucide-react';
import { format } from 'date-fns';
import { SectionCard } from '@/components/ui/Card';
import { ButtonPrimary, ButtonUtility } from '@/components/ui/Button';
import { HealthDot, ProgressBar } from '@/components/ui/Badge';
import { SkeletonMetricCard } from '@/components/ui/Skeleton';
import { ActivityItem } from '@/components/ui/ActivityItem';

export default function OverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: overview, isLoading } = useQuery({
    queryKey: ['overview', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/overview`);
      if (!res.ok) throw new Error('Failed to fetch project overview');
      return res.json();
    },
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting || !overview) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/export`);
      if (!res.ok) throw new Error('Failed to export project');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${overview.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-cpm.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export project: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };
  if (isLoading || !overview) {
    return (
      <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {[...Array(8)].map((_, i) => <SkeletonMetricCard key={i} />)}
        </div>
      </div>
    );
  }

  const { project, metrics, schedule, cpmInsights, dependencyStats, activities } = overview;

  const formatEnum = (str: string) => {
    if (!str) return '';
    return str.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const overallHealth = formatEnum(project.health) || 'Healthy';
  const criticalRatio = metrics.totalTasks > 0
    ? Math.round((metrics.criticalTasksCount / metrics.totalTasks) * 100)
    : 0;

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-6 animate-fade-in">
      {/* ── Action bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-[14px] text-[#615d59] leading-[1.43]">
          {project.description || 'Project workspace overview and CPM analysis.'}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <ButtonUtility 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download size={14} /> {isExporting ? 'Exporting...' : 'Export'}
          </ButtonUtility>
          <Link href={`/projects/${projectId}/graph`}>
            <ButtonPrimary size="sm" className="flex items-center gap-2">
              <Play size={14} /> Run CPM
            </ButtonPrimary>
          </Link>
        </div>
      </div>

      {/* ── 8-metric KPI strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Tasks', value: metrics.totalTasks },
          { label: 'Completed', value: metrics.completedTasks },
          { label: 'In Progress', value: metrics.inProgressTasks },
          { label: 'Critical Tasks', value: metrics.criticalTasksCount, accent: 'danger' as const },
          { label: 'Dependencies', value: metrics.dependenciesCount },
          { label: 'Completion', value: `${metrics.progressPercent}%` },
          { label: 'Duration', value: `${metrics.projectDuration}d` },
          { 
            label: 'Variance', 
            value: schedule.daysVariance > 0 ? `+${schedule.daysVariance}d` : `${schedule.daysVariance}d`,
            accent: schedule.daysVariance < 0 ? ('danger' as const) : undefined
          },
        ].map((m) => (
          <div
            key={m.label}
            className={`bg-white rounded-[12px] border p-4 flex flex-col gap-1.5 ${
              m.accent === 'danger' ? 'border-red-100 bg-red-50' : 'border-[#e6e6e6]'
            }`}
          >
            <div className={`text-[10px] font-[600] uppercase tracking-[0.125px] truncate ${
              m.accent === 'danger' ? 'text-red-600' : 'text-[#615d59]'
            }`}>
              {m.label}
            </div>
            <div className={`text-[22px] font-[700] leading-[1] tracking-[-0.5px] ${
              m.accent === 'danger' ? 'text-red-700' : 'text-[#000000]'
            }`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Single Column Stacked Layout ──────────────────────────────────────── */}
      <div className="space-y-6">
        {/* 1. Project Details */}
        <SectionCard title="Project Details">
          <div className="space-y-4">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[13px] font-[500] text-[#000000]">Progress</span>
                <span className="text-[14px] font-[700] text-[#000000]">{metrics.progressPercent}%</span>
              </div>
              <ProgressBar value={metrics.progressPercent} size="sm" />
            </div>

            <div className="space-y-3 pt-4 border-t border-[#e6e6e6]">
              {[
                { label: 'Identifier', value: project.identifier },
                { label: 'Owner', value: project.owner },
                { label: 'Created', value: format(new Date(project.createdAt), 'MMM d, yyyy') },
                { label: 'Last Updated', value: format(new Date(project.updatedAt), 'MMM d, yyyy') },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-start gap-4">
                  <span className="text-[12px] text-[#a39e98] shrink-0">{row.label}</span>
                  <span className="text-[13px] font-[500] text-[#000000] text-right truncate">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* 1.5. Department Breakdown */}
        <SectionCard title="Department Breakdown">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(overview.departments || []).map((d: any) => (
              <div key={d.id} className="bg-white rounded-xl border border-[#e6e6e6] p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm font-bold text-black">{d.name}</span>
                  </div>
                  <div className="text-[11px] text-[#a39e98] mb-4">
                    {d.totalTasks} total tasks • {d.completedTasks} completed
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1 text-[11px] font-semibold text-gray-600">
                      <span>Completion</span>
                      <span>{d.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-[#f6f5f4] rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${d.progressPercent}%`, backgroundColor: d.color }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-[#f0efee] text-[11px] font-medium text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {d.overdueTasksCount} Overdue
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {d.criticalTasksCount} Critical
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {(overview.departments || []).length === 0 && (
              <div className="col-span-full py-6 text-center text-[#a39e98] text-xs">
                No departments configured for this project.
              </div>
            )}
          </div>
        </SectionCard>

        {/* 2. Dependency Overview */}
        <SectionCard title="Dependency Overview" action={<Network size={15} className="text-[#a39e98]" />}>
          <div className="flex items-end gap-3 mb-5">
            <span className="text-[40px] font-[700] text-[#000000] leading-[1] tracking-[-1px]">
              {dependencyStats.total}
            </span>
            <span className="text-[13px] text-[#615d59] pb-1">total dependencies</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Tasks w/ No Dependencies', value: dependencyStats.noDependencies },
              { label: 'Multiple Predecessors', value: dependencyStats.multiplePredecessors },
              { label: 'Multiple Successors', value: dependencyStats.multipleSuccessors },
              { label: 'Potential Bottlenecks', value: Math.min(5, dependencyStats.multiplePredecessors), danger: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[13px] text-[#615d59]">{row.label}</span>
                <span
                  className={`text-[13px] font-[700] px-2 py-0.5 rounded-[5px] ${
                    row.danger
                      ? 'text-red-700 bg-red-50'
                      : 'text-[#000000] bg-[#f6f5f4]'
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 3. Schedule Status */}
        <SectionCard title="Schedule Status" action={<Calendar size={15} className="text-[#a39e98]" />}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Planned Finish', value: schedule.plannedFinish ? format(new Date(schedule.plannedFinish), 'MMM d, yyyy') : 'Not set' },
              { label: 'Forecast Finish', value: schedule.forecastFinish ? format(new Date(schedule.forecastFinish), 'MMM d, yyyy') : 'Unknown' },
            ].map((d) => (
              <div key={d.label} className="p-3 bg-[#f6f5f4] rounded-[8px] border border-[#e6e6e6]">
                <div className="text-[11px] text-[#a39e98] mb-1">{d.label}</div>
                <div className="text-[14px] font-[600] text-[#000000]">{d.value}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3 pt-4 border-t border-[#e6e6e6]">
            {[
              { label: 'Days Ahead / Behind', value: `${schedule.daysVariance} days`, danger: schedule.daysVariance < 0 },
              { label: 'Tasks Due This Week', value: '0' },
              { label: 'Overdue Tasks', value: overview.metrics.overdueTasksCount || 0, danger: (overview.metrics.overdueTasksCount || 0) > 0, success: (overview.metrics.overdueTasksCount || 0) === 0 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[13px] text-[#615d59]">{row.label}</span>
                <span className={`text-[13px] font-[600] ${
                  row.danger ? 'text-[#f64932]' : row.success ? 'text-[#1aae39]' : 'text-[#000000]'
                }`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 4. Project Health */}
        <SectionCard
          title="Project Health"
          action={<HealthDot health={overallHealth} showLabel />}
        >
          <div className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-[#615d59]">Completion</span>
                <span className="text-[14px] font-[700] text-[#000000]">{metrics.progressPercent}%</span>
              </div>
              <ProgressBar value={metrics.progressPercent} size="sm" />
              <div className="flex justify-between text-[11px] text-[#a39e98] mt-1.5">
                <span>{metrics.completedTasks} completed</span>
                <span>{metrics.totalTasks - metrics.completedTasks} remaining</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#e6e6e6] space-y-3">
              {[
                { label: 'Critical Task Ratio', value: `${criticalRatio}%` },
                {
                  label: 'Dependency Density',
                  value: `${metrics.totalTasks > 0 ? (metrics.dependenciesCount / metrics.totalTasks).toFixed(1) : 0} deps/task`,
                },
                {
                  label: 'Schedule Variance',
                  value: `${schedule.daysVariance} days`,
                  danger: schedule.daysVariance < 0,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-[13px] text-[#615d59]">{row.label}</span>
                  <span className={`text-[13px] font-[600] ${row.danger ? 'text-[#f64932]' : 'text-[#000000]'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* 5. Recent Activity */}
        <SectionCard title="Recent Activity" noPadding>
          {!activities || activities.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-[#a39e98]">
              No recent activity.
            </div>
          ) : (
            <div className="divide-y divide-[#e6e6e6] max-h-[350px] overflow-y-auto scrollbar-thin">
              {activities.map((act: any) => (
                <ActivityItem
                  key={act.id}
                  action={act.action}
                  actor={act.actorName}
                  timestamp={act.createdAt}
                  projectId={act.projectId}
                  taskId={act.taskId}
                  taskCode={act.taskCode}
                  sourceTaskId={act.sourceTaskId}
                  sourceTaskCode={act.sourceTaskCode}
                  targetTaskId={act.targetTaskId}
                  targetTaskCode={act.targetTaskCode}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
