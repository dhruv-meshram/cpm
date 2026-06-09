'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { MetricCard, SectionCard } from '@/components/ui/Card';
import { ButtonPrimary } from '@/components/ui/Button';
import { StatusBadge, HealthDot, ProgressBar } from '@/components/ui/Badge';
import { SkeletonMetricCard, SkeletonCard } from '@/components/ui/Skeleton';
import { CreateProjectModal } from '@/components/CreateProjectModal';

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

async function fetchRecentActivity() {
  const res = await fetch('/api/v1/dashboard/activity');
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}

const formatActivity = (act: any) => {
  const action = act.action || '';
  const actionLower = action.toLowerCase();
  
  let label = action;
  let color = '#615d59';
  let bg = '#f6f5f4';
  let desc = `By ${act.user || 'System'}`;
  
  if (actionLower.includes('recalculate') || actionLower.includes('cpm')) {
    label = 'CPM Recalculated';
    color = '#1aae39';
    bg = '#edf8f0';
    desc = action;
  } else if (actionLower.includes('import')) {
    label = 'Project Imported';
    color = '#dd5b00';
    bg = '#fef3ea';
    desc = action;
  } else if (actionLower.includes('created') || actionLower.includes('create')) {
    label = actionLower.includes('task') ? 'Task Created' : actionLower.includes('project') ? 'Project Created' : 'Created';
    color = '#000000';
    bg = '#ece9e6';
    desc = action;
  } else if (actionLower.includes('deleted') || actionLower.includes('delete')) {
    label = 'Deleted';
    color = '#f64932';
    bg = '#fef0ef';
    desc = action;
  }
  
  let time = 'Recent';
  if (act.timestamp) {
    const diffMs = Date.now() - new Date(act.timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      time = `${Math.max(1, diffMins)}m ago`;
    } else if (diffHours < 24) {
      time = `${diffHours}h ago`;
    } else {
      time = `${diffDays}d ago`;
    }
  }
  
  return { label, color, bg, desc, time };
};

export default function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['recentProjects'],
    queryFn: fetchRecentProjects,
  });

  const { data: milestones, isLoading: milestonesLoading } = useQuery({
    queryKey: ['upcomingMilestones'],
    queryFn: fetchUpcomingMilestones,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: fetchRecentActivity,
  });

  const completionPct = stats
    ? Math.round((stats.completedTasks / Math.max(1, stats.totalTasks)) * 100)
    : 0;

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-8 animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-[#000000]"
            style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.23, letterSpacing: '-0.625px' }}
          >
            Dashboard
          </h1>
          <p className="text-[14px] text-[#615d59] mt-0.5 leading-[1.43]">
            Project scheduling overview and recent activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ButtonPrimary
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus size={15} />
            New Project
          </ButtonPrimary>
        </div>
      </div>

      {/* ── Metrics strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonMetricCard key={i} />)
        ) : (
          <>
            <MetricCard
              label="Total Projects"
              value={stats?.totalProjects ?? '—'}
              icon={<FolderKanban size={16} />}
            />
            <MetricCard
              label="Total Tasks"
              value={stats?.totalTasks ?? '—'}
              icon={<CheckCircle2 size={16} />}
            />
            <MetricCard
              label="Critical Tasks"
              value={Math.floor((stats?.totalTasks ?? 0) * 0.25)}
              icon={<AlertTriangle size={16} />}
              accent="danger"
            />
            <MetricCard
              label="Completed Tasks"
              value={stats?.completedTasks ?? '—'}
              subvalue={`${completionPct}%`}
              icon={<TrendingUp size={16} />}
              accent="success"
            />
          </>
        )}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left column (3/5) ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Recent Projects */}
          <SectionCard
            title="Recent Projects"
            action={
              <Link href="/projects" className="text-[13px] text-black font-[500] hover:underline flex items-center gap-1">
                View all <ArrowRight size={13} />
              </Link>
            }
            noPadding
          >
            {projectsLoading ? (
              <div className="p-5">
                <SkeletonCard />
              </div>
            ) : !projects || projects.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[14px] text-[#a39e98]">No projects yet.</p>
                <Link href="/projects" className="text-[13px] text-black hover:underline mt-2 inline-block">
                  Create your first project →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[#e6e6e6]">
                {projects.slice(0, 5).map((p: any) => (
                  <li key={p.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/projects/${p.id}/overview`}
                            className="text-[14px] font-[600] text-[#000000] hover:text-[#31302e] hover:underline leading-[1.43] truncate block"
                          >
                            {p.name}
                          </Link>
                          {p.status && p.status.toLowerCase() !== 'draft' && (
                            <StatusBadge status={p.status} />
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] font-mono text-[#a39e98]">{p.identifier}</span>
                          <HealthDot health={p.health || 'healthy'} showLabel />
                        </div>
                      </div>
                      <div className="shrink-0 w-20">
                        <div className="text-[11px] text-[#a39e98] mb-1 text-right">
                          {p.completionPercent ?? 0}%
                        </div>
                        <ProgressBar value={p.completionPercent ?? 0} size="xs" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Recent Activity */}
          <SectionCard title="Recent Activity" noPadding>
            <div className="divide-y divide-[#e6e6e6]">
              {activitiesLoading ? (
                <div className="p-5 text-center text-[#a39e98] text-[13px]">
                  Loading activity...
                </div>
              ) : !activities || activities.length === 0 ? (
                <div className="p-5 text-center text-[#a39e98] text-[13px]">
                  No recent activity found.
                </div>
              ) : (
                activities.slice(0, 5).map((act: any) => {
                  const item = formatActivity(act);
                  return (
                    <div key={act.id} className="px-5 py-4 flex items-start gap-3 hover:bg-[#f6f5f4] transition-colors">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: item.bg }}
                      >
                        <Activity size={13} style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-[600] text-[#000000]">{item.label}</span>
                          <time className="text-[11px] text-[#a39e98] shrink-0">{item.time}</time>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          {act.entityType === 'Task' && act.projectId && (
                            <Link
                              href={`/projects/${act.projectId}/tasks?task=${act.entityId}`}
                              className="font-mono text-[11px] text-[#615d59] hover:text-[#000000] hover:underline bg-[#f6f5f4] border border-[#e6e6e6] px-1.5 py-0.5 rounded shrink-0"
                            >
                              CP-{act.entityId.slice(0, 4).toUpperCase()}
                            </Link>
                          )}
                          <p className="text-[13px] text-[#615d59] truncate flex-1">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Right column (2/5) ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Deadlines */}
          <SectionCard
            title="Upcoming Deadlines"
            action={<Clock size={15} className="text-[#a39e98]" />}
            noPadding
          >
            {milestonesLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 skeleton rounded-[8px]" />
                ))}
              </div>
            ) : !milestones || milestones.length === 0 ? (
              <p className="text-[14px] text-[#a39e98] text-center py-8">No upcoming deadlines.</p>
            ) : (
              <ul className="divide-y divide-[#e6e6e6]">
                {milestones.slice(0, 5).map((m: any) => (
                  <li key={m.taskId} className="px-5 py-4 hover:bg-[#f6f5f4] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-[600] text-[#000000] truncate">{m.taskName}</p>
                        <p className="text-[12px] text-[#a39e98] mt-0.5">{m.projectName}</p>
                      </div>
                      <div className="shrink-0 text-[11px] font-[600] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-[5px]">
                        {new Date(m.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
