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
  UploadCloud,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { MetricCard, SectionCard } from '@/components/ui/Card';
import { ButtonPrimary, ButtonSecondary } from '@/components/ui/Button';
import { StatusBadge, HealthDot, ProgressBar } from '@/components/ui/Badge';
import { SkeletonMetricCard, SkeletonCard } from '@/components/ui/Skeleton';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ImportProjectModal } from '@/components/ImportProjectModal';

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

import { ActivityItem } from '@/components/ui/ActivityItem';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const removedFrom = searchParams.get('removedFrom');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
      {removedFrom && (
        <div className="bg-[#fef2f2] border border-[#fca5a5] text-red-700 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm transition-all duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600 shrink-0" size={18} />
            <span className="text-[13px] font-medium">
              You were removed from the project space <strong>{removedFrom}</strong>.
            </span>
          </div>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('removedFrom');
              const nextQuery = params.toString();
              router.replace(`/dashboard${nextQuery ? `?${nextQuery}` : ''}`);
            }}
            className="text-red-700 hover:text-red-900 text-[11px] font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

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
          <ButtonSecondary
            onClick={() => setIsImportModalOpen(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <UploadCloud size={15} />
            Import XML
          </ButtonSecondary>
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
              <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <p className="text-[14px] text-[#a39e98]">No projects yet.</p>
                <div className="flex gap-3">
                  <ButtonSecondary
                    onClick={() => setIsImportModalOpen(true)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <UploadCloud size={14} /> Import XML
                  </ButtonSecondary>
                  <ButtonPrimary
                    onClick={() => setIsCreateModalOpen(true)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus size={14} /> New Project
                  </ButtonPrimary>
                </div>
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
                activities.slice(0, 5).map((act: any) => (
                  <ActivityItem
                    key={act.id}
                    action={act.action}
                    actor={act.actorName}
                    project={act.projectName}
                    timestamp={act.createdAt}
                    projectId={act.projectId}
                    taskId={act.taskId}
                    taskCode={act.taskCode}
                    sourceTaskId={act.sourceTaskId}
                    sourceTaskCode={act.sourceTaskCode}
                    targetTaskId={act.targetTaskId}
                    targetTaskCode={act.targetTaskCode}
                  />
                ))
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
      <ImportProjectModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
