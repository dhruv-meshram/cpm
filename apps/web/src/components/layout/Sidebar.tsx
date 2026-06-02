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
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {sidebarOpen && <span className="font-bold text-white text-lg tracking-tight">CPM Planner</span>}
        <button onClick={toggleSidebar} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors mx-auto">
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <item.icon size={20} className="shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
        >
          <LogOut size={20} className="shrink-0" />
          {sidebarOpen && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
