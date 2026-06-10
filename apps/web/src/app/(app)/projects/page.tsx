'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  UploadCloud,
  LayoutGrid,
  List as ListIcon,
  Clock,
  FolderKanban,
  Edit2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ImportProjectModal } from '@/components/ImportProjectModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ButtonPrimary, ButtonSecondary, ButtonUtility, IconButton } from '@/components/ui/Button';
import { StatusBadge, HealthDot, ProgressBar } from '@/components/ui/Badge';
import { SearchBar } from '@/components/ui/Input';
import { EmptyState, SkeletonCard } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const normalizeProjectData = (p: any) => {
  const formatEnum = (str: string) => {
    if (!str) return '';
    return str.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };
  return {
    ...p,
    status: formatEnum(p.status) || 'Draft',
    health: formatEnum(p.health) || 'Healthy',
    tasksCount: p.tasksCount || p.totalTasks || 0,
    dependenciesCount: p.dependenciesCount || 0,
    completionPercent: p.completionPercent || 0,
    durationDays: p.durationDays || 0,
    owner: p.owner || 'Unassigned',
  };
};

const healthBg: Record<string, string> = {
  Healthy: 'bg-[#1aae39]',
  Warning: 'bg-[#dd5b00]',
  'At Risk': 'bg-[#f64932]',
};

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/v1/projects');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete project');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleDelete = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteMutation.mutateAsync(projectId);
      } catch (err) {
        alert('Failed to delete project');
      }
    }
  };

  const projects = (data?.data?.map(normalizeProjectData) || []).filter((p: any) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-8 animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-[#000000]"
            style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.23, letterSpacing: '-0.625px' }}
          >
            Projects
          </h1>
          <p className="text-[14px] text-[#615d59] mt-0.5 leading-[1.43]">
            Manage and monitor all CPM projects
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

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white rounded-[12px] border border-[#e6e6e6] p-3">
        <div className="flex items-center flex-1 gap-3">
          <SearchBar
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="flex-1 max-w-xs"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 border-l border-[#e6e6e6] pl-3 ml-auto">
          <IconButton
            variant={viewMode === 'cards' ? 'outline' : 'ghost'}
            onClick={() => setViewMode('cards')}
            title="Card view"
          >
            <LayoutGrid size={16} />
          </IconButton>
          <IconButton
            variant={viewMode === 'list' ? 'outline' : 'ghost'}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <ListIcon size={16} />
          </IconButton>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title="No projects found"
          description={
            searchQuery
              ? `No projects match "${searchQuery}". Try a different search.`
              : 'Your workspace is empty. Create a new project or import an existing schedule to get started.'
          }
          action={
            <div className="flex gap-3">
              {searchQuery ? (
                <ButtonUtility onClick={() => setSearchQuery('')}>Clear search</ButtonUtility>
              ) : (
                <>
                  <ButtonUtility onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2">
                    <UploadCloud size={15} /> Import XML
                  </ButtonUtility>
                  <ButtonPrimary onClick={() => setIsCreateModalOpen(true)} size="sm" className="flex items-center gap-2">
                    <Plus size={15} /> New Project
                  </ButtonPrimary>
                </>
              )}
            </div>
          }
        />
      ) : viewMode === 'cards' ? (
        /* ── Cards Grid ─────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project: any) => (
            <div
              key={project.id}
              className="group bg-white rounded-[12px] border border-[#e6e6e6] flex flex-col relative overflow-hidden hover:shadow-[rgba(0,0,0,0.01)_0_0.175px_1.041px,rgba(0,0,0,0.02)_0_0.8px_2.925px,rgba(0,0,0,0.027)_0_2.025px_7.847px,rgba(0,0,0,0.04)_0_4px_18px] transition-shadow duration-200"
            >
              {/* Health strip */}
              <div className={cn('absolute top-0 left-0 w-full h-[3px]', healthBg[project.health] || 'bg-[#a39e98]')} />

              <div className="p-5 pt-6 flex-1">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-[#f6f5f4] border border-[#e6e6e6] rounded-[8px] flex items-center justify-center shrink-0">
                      <FolderKanban size={18} className="text-[#615d59]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects/${project.id}/overview`}
                        className="text-[15px] font-[600] text-[#000000] hover:text-[#31302e] hover:underline transition-colors leading-[1.33] block truncate"
                      >
                        {project.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-[#a39e98]">{project.identifier}</span>
                        <HealthDot health={project.health} showLabel />
                      </div>
                    </div>
                  </div>
                  {project.status && project.status.toLowerCase() !== 'draft' && (
                    <StatusBadge status={project.status} />
                  )}
                </div>

                {/* Description */}
                <p className="text-[13px] text-[#a39e98] leading-[1.5] line-clamp-2 mb-4 min-h-[2.6em]">
                  {project.description || 'No description provided.'}
                </p>

                {/* Mini metrics grid */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-[#f6f5f4] rounded-[8px] border border-[#e6e6e6] mb-4">
                  {[
                    { label: 'Tasks', value: project.tasksCount },
                    { label: 'Deps', value: project.dependenciesCount },
                    { label: 'Progress', value: `${project.completionPercent}%` },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="text-[10px] text-[#a39e98] mb-0.5 leading-[1.33]">{m.label}</div>
                      <div className="text-[12px] font-[700] leading-[1] text-[#000000]">
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CPM details */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#a39e98]">Duration</span>
                    <span className="font-[600] text-[#000000]">{project.durationDays} days</span>
                  </div>
                </div>

                {/* Progress bar */}
                <ProgressBar value={project.completionPercent} size="xs" />
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-[#e6e6e6] bg-[#f6f5f4] group-hover:bg-white transition-colors flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-[#a39e98]">
                  <Clock size={12} />
                  {new Date(project.latestActivityTime || project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/projects/${project.id}/overview`}>
                    <IconButton variant="ghost" size="sm" title="Edit">
                      <Edit2 size={13} />
                    </IconButton>
                  </Link>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    title="Delete"
                    className="hover:text-[#f64932] hover:bg-red-50"
                    onClick={() => handleDelete(project.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── List / Table View ───────────────────────────────────────────────── */
        <div className="bg-white rounded-[12px] border border-[#e6e6e6] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f6f5f4] border-b border-[#e6e6e6]">
                {['Project', 'Status', 'Health', 'Tasks', 'Progress', 'Duration', 'Updated'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11px] font-[600] text-[#615d59] uppercase tracking-[0.125px] leading-[1.33] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e6e6]">
              {projects.map((project: any) => (
                <tr key={project.id} className="hover:bg-[#f6f5f4] transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project.id}/overview`} className="text-[14px] font-[600] text-[#000000] hover:text-[#31302e] hover:underline transition-colors">
                      {project.name}
                    </Link>
                    <div className="text-[11px] font-mono text-[#a39e98] mt-0.5">{project.identifier}</div>
                  </td>
                  <td className="px-4 py-3">
                    {project.status && project.status.toLowerCase() !== 'draft' && (
                      <StatusBadge status={project.status} />
                    )}
                  </td>
                  <td className="px-4 py-3"><HealthDot health={project.health} showLabel /></td>
                  <td className="px-4 py-3 text-[13px] font-[600] text-[#000000]">{project.tasksCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <ProgressBar value={project.completionPercent} size="xs" />
                      </div>
                      <span className="text-[12px] text-[#615d59]">{project.completionPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-[600] text-[#000000]">{project.durationDays}d</td>
                  <td className="px-4 py-3 text-[12px] text-[#a39e98]">
                    {new Date(project.latestActivityTime || project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ImportProjectModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
