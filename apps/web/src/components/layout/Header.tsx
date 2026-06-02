'use client';

import { Bell, Search, User } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-lg w-64 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
        <Search size={18} className="text-slate-400 mr-2" />
        <input 
          type="text" 
          placeholder="Search projects..." 
          className="bg-transparent border-none outline-none text-sm w-full"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="h-8 w-8 bg-gradient-to-tr from-blue-600 to-violet-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm cursor-pointer">
          <User size={16} />
        </div>
      </div>
    </header>
  );
}
