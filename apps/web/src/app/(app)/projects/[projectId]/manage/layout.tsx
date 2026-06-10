'use client';

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const subTabs = [
  { name: 'Team', key: 'team' },
  { name: 'Roles', key: 'roles' },
  { name: 'Collaboration', key: 'collaboration' },
  { name: 'Settings', key: 'settings' }
];

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;

  const activeSubTab = subTabs.find((t) => pathname.endsWith(`/manage/${t.key}`) || pathname.includes(`/manage/${t.key}/`))?.key || 'team';

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8">
      {/* Sub-tabs Selection */}
      <div className="flex gap-2 border-b border-[#e6e6e6] mb-8 px-4 py-1 bg-white rounded-lg border shadow-xs">
        {subTabs.map((tab) => {
          const href = `/projects/${projectId}/manage/${tab.key}`;
          const isActive = activeSubTab === tab.key;

          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "px-4 py-2.5 text-[14px] font-[600] border-b-2 transition-colors cursor-pointer",
                isActive ? "border-black text-black" : "border-transparent text-[#a39e98] hover:text-black"
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
