'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Network, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { name: 'Overview', key: 'overview' },
  { name: 'Tasks', key: 'tasks' },
  { name: 'Gantt', key: 'gantt' },
  { name: 'Graph', key: 'graph' },
  { name: 'Manage', key: 'manage' },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
  });

  const activeTab = tabs.find((t) => pathname.includes(`/${t.key}`))?.key || 'overview';

  return (
    <div className="flex flex-col h-full">
      {/* ── Project Header ────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#e6e6e6] shrink-0">
        <div className="max-w-[1400px] mx-auto px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 pt-5 pb-3">
            <Link
              href="/projects"
              className="text-[13px] text-[#a39e98] hover:text-[#615d59] transition-colors flex items-center gap-1"
            >
              <Network size={13} />
              Projects
            </Link>
            <ChevronRight size={13} className="text-[#a39e98]" />
            <span className="text-[13px] text-[#000000] font-[500]">
              {project ? project.name : '…'}
            </span>
          </div>

          {/* Project identity */}
          <div className="flex items-start justify-between gap-4 pb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1
                  className="text-[#000000] truncate"
                  style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.27, letterSpacing: '-0.25px' }}
                >
                  {project ? project.name : (
                    <span className="skeleton inline-block w-48 h-6 rounded-[4px]" />
                  )}
                </h1>
              </div>
              {project?.identifier && (
                <span className="text-[12px] font-mono text-[#a39e98]">{project.identifier}</span>
              )}
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-1" role="tablist">
            {tabs.map((tab) => {
              const href = `/projects/${projectId}/${tab.key}`;
              const isActive = activeTab === tab.key;

              return (
                <Link
                  key={tab.key}
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    'px-4 py-2.5 text-[14px] font-[500] leading-[1.43]',
                    'border-b-2 transition-colors duration-150',
                    '-mb-px',
                    isActive
                      ? 'border-black text-black'
                      : 'border-transparent text-[#615d59] hover:text-[#000000] hover:border-[#e6e6e6]'
                  )}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-[#f6f5f4] scrollbar-thin">
        {children}
      </div>
    </div>
  );
}
