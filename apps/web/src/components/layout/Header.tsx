'use client';

import { Bell, Search, User } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="flex items-center bg-slate-100/70 hover:bg-slate-100 px-3 py-2 rounded-md w-72 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white border border-transparent focus-within:border-blue-500 transition-all">
        <Search size={16} className="text-slate-400 mr-2" />
        <input 
          type="text" 
          placeholder="Search projects..." 
          className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-5">
        <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="h-8 w-8 bg-slate-100 border border-slate-200 text-slate-600 rounded-full flex items-center justify-center font-medium text-xs cursor-pointer hover:bg-slate-200 transition-colors">
          <User size={14} />
        </div>
      </div>
    </header>
  );
}
