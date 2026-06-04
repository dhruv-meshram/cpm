'use client';

import { useWorkspaceStore } from '@/store/workspaceStore';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Settings, LogOut, Menu } from 'lucide-react';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useWorkspaceStore();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Projects', icon: FolderKanban, href: '/projects' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ];

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className={`${sidebarOpen ? 'w-[250px]' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col`}>
      <div className="h-16 flex items-center px-4 border-b border-slate-100">
        {sidebarOpen ? (
          <div className="flex-1 overflow-hidden">
            <h1 className="font-bold text-slate-900 text-sm tracking-tight leading-tight">CPM Planner</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Scheduling & Analysis</p>
          </div>
        ) : null}
        <button onClick={toggleSidebar} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors ml-auto flex-shrink-0">
          <Menu size={16} />
        </button>
      </div>

      <div className="flex-1 py-4 flex flex-col gap-6 overflow-y-auto">
        <nav className="flex flex-col gap-1 px-3">
          {sidebarOpen && <div className="px-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace</div>}
          
          <Link href="/dashboard" className={`group flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative ${pathname.startsWith('/dashboard') ? 'bg-blue-50/80 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            {pathname.startsWith('/dashboard') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />}
            <LayoutDashboard size={18} className="shrink-0" />
            {sidebarOpen && <span className="text-sm">Dashboard</span>}
          </Link>

          <Link href="/projects" className={`group flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative ${(pathname.startsWith('/projects') && !pathname.startsWith('/settings')) ? 'bg-blue-50/80 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            {(pathname.startsWith('/projects') && !pathname.startsWith('/settings')) && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />}
            <FolderKanban size={18} className="shrink-0" />
            {sidebarOpen && <span className="text-sm">Projects</span>}
          </Link>
        </nav>

        <nav className="flex flex-col gap-1 px-3">
          {sidebarOpen && <div className="px-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Administration</div>}
          
          <Link href="/settings" className={`group flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative ${pathname.startsWith('/settings') ? 'bg-blue-50/80 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            {pathname.startsWith('/settings') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />}
            <Settings size={18} className="shrink-0" />
            {sidebarOpen && <span className="text-sm">Settings</span>}
          </Link>
        </nav>
      </div>

      <div className="p-3 border-t border-slate-100">
        <nav className="flex flex-col gap-1">
          {sidebarOpen && <div className="px-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</div>}
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </nav>
      </div>
    </aside>
  );
}
