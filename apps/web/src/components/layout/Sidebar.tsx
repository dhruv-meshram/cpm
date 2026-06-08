'use client';

import { useWorkspaceStore } from '@/store/workspaceStore';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    group: 'Workspace',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Projects', icon: FolderKanban, href: '/projects' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { label: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useWorkspaceStore();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 h-full',
        'bg-white border-r border-[#e6e6e6]',
        'transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-[240px]' : 'w-[64px]'
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'h-[64px] flex items-center border-b border-[#e6e6e6] shrink-0',
          sidebarOpen ? 'px-5 gap-3' : 'justify-center px-0'
        )}
      >
        {/* Icon mark */}
        <div className="w-8 h-8 rounded-[8px] bg-black flex items-center justify-center shrink-0">
          <Network size={16} className="text-white" />
        </div>

        {/* Wordmark */}
        {sidebarOpen && (
          <div className="overflow-hidden min-w-0 animate-fade-in">
            <div className="text-[14px] font-[700] text-[#000000] leading-tight tracking-[-0.25px] whitespace-nowrap">
              CPM Planner
            </div>
            <div className="text-[11px] text-[#a39e98] font-[500] uppercase tracking-[0.125px]">
              Scheduling & Analysis
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {navItems.map((group) => (
          <div key={group.group} className="mb-6">
            {sidebarOpen && (
              <div className="px-4 pb-2 text-[11px] font-[600] text-[#a39e98] uppercase tracking-[0.125px]">
                {group.group}
              </div>
            )}
            <ul className="flex flex-col gap-0.5 px-2">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={!sidebarOpen ? item.label : undefined}
                      className={cn(
                        'relative flex items-center gap-3 transition-colors duration-150',
                        'rounded-[8px]',
                        sidebarOpen ? 'px-3 py-2' : 'justify-center w-10 h-10 mx-auto',
                        active
                          ? 'bg-[#ece9e6] text-[#000000]'
                          : 'text-[#615d59] hover:bg-[#f6f5f4] hover:text-[#000000]'
                      )}
                    >
                      {/* Active indicator strip */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black rounded-r-full" />
                      )}
                      <item.icon
                        size={18}
                        className="shrink-0"
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                      {sidebarOpen && (
                        <span className={cn('text-[14px] leading-[1.43]', active ? 'font-[600]' : 'font-[500]')}>
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="border-t border-[#e6e6e6] p-2 space-y-1">
        {/* Logout */}
        <button
          onClick={handleLogout}
          title={!sidebarOpen ? 'Logout' : undefined}
          className={cn(
            'flex items-center gap-3 transition-colors duration-150 w-full',
            'rounded-[8px] text-[#615d59] hover:bg-red-50 hover:text-red-600',
            sidebarOpen ? 'px-3 py-2' : 'justify-center w-10 h-10 mx-auto'
          )}
        >
          <LogOut size={18} className="shrink-0" strokeWidth={1.8} />
          {sidebarOpen && <span className="text-[14px] font-[500]">Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className={cn(
            'flex items-center gap-3 transition-colors duration-150 w-full',
            'rounded-[8px] text-[#a39e98] hover:bg-[#f6f5f4] hover:text-[#615d59]',
            sidebarOpen ? 'px-3 py-2' : 'justify-center w-10 h-10 mx-auto'
          )}
        >
          {sidebarOpen ? (
            <>
              <ChevronLeft size={18} className="shrink-0" strokeWidth={1.8} />
              <span className="text-[14px] font-[500]">Collapse</span>
            </>
          ) : (
            <ChevronRight size={18} className="shrink-0" strokeWidth={1.8} />
          )}
        </button>
      </div>
    </aside>
  );
}
