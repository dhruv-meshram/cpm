'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

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
    }
  });

  const tabs = [
    { name: 'Overview', href: `/projects/${projectId}/overview` },
    { name: 'Tasks', href: `/projects/${projectId}/tasks` },
    { name: 'Gantt', href: `/projects/${projectId}/gantt` },
    { name: 'Graph', href: `/projects/${projectId}/graph` },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-8 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {project ? project.name : 'Loading project...'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {project?.description || 'Project Workspace'}
          </p>
        </div>
        
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link 
                key={tab.name}
                href={tab.href}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </header>
      
      <div className="flex-1 overflow-auto bg-slate-50">
        {children}
      </div>
    </div>
  );
}
