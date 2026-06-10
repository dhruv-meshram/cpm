'use client';

import { useState } from 'react';
import { Bell, Search, User, Check, Trash2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export function Header() {
  const [showDropdown, setShowDropdown] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/v1/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    refetchInterval: 15000 // Poll every 15s for updates
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (payload: { id?: string; all?: boolean }) => {
      const res = await fetch('/api/v1/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update notification');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <header className="h-16 bg-white border-b border-[#e6e6e6] flex items-center justify-between px-6 sticky top-0 z-[40] w-full font-sans select-none">
      {/* Search Bar */}
      <div className="flex items-center bg-[#f6f5f4] hover:bg-[#f6f5f4]/85 px-3 py-2 rounded-md w-72 focus-within:ring-1 focus-within:ring-black focus-within:bg-white border border-[#e6e6e6] transition-all">
        <Search size={15} className="text-gray-400 mr-2 shrink-0" />
        <input 
          type="text" 
          placeholder="Search workspace..." 
          className="bg-transparent border-none outline-none text-xs w-full text-black placeholder:text-gray-400 font-medium"
        />
      </div>

      {/* Actions (Notifications Bell, User Profile) */}
      <div className="flex items-center gap-5 relative">
        
        {/* Notification Bell Button */}
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="text-gray-500 hover:text-black transition-colors relative p-1.5 rounded-full hover:bg-[#f6f5f4] cursor-pointer"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-black rounded-full border-2 border-white animate-pulse" />
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#e6e6e6] rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[420px]">
              
              {/* Dropdown Header */}
              <div className="px-4 py-3 border-b border-[#e6e6e6] bg-[#f6f5f4] flex items-center justify-between">
                <span className="font-bold text-black text-[13px]">
                  Notifications ({unreadCount} new)
                </span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markReadMutation.mutate({ all: true })}
                    className="text-[11px] font-semibold text-gray-500 hover:text-black transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#f0efee] scrollbar-thin">
                {notifications.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      if (!item.isRead) markReadMutation.mutate({ id: item.id });
                    }}
                    className={cn(
                      "p-3.5 text-left transition-colors cursor-pointer flex flex-col gap-0.5",
                      !item.isRead ? "bg-[#f6f5f4]/30 hover:bg-[#f6f5f4]/50" : "bg-white hover:bg-[#f6f5f4]/20"
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={cn(
                        "text-[12px] font-bold text-black",
                        !item.isRead && "font-extrabold"
                      )}>
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#615d59] leading-relaxed">
                      {item.content}
                    </p>
                    <span className="text-[10px] text-[#a39e98] mt-1 font-mono">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                ))}

                {notifications.length === 0 && (
                  <div className="py-12 text-center text-[#a39e98] italic text-[12px]">
                    No new notifications.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* User Profile Avatar */}
        <div className="h-8 w-8 bg-[#f6f5f4] border border-[#e6e6e6] text-[#615d59] rounded-full flex items-center justify-center font-bold text-[12px] cursor-pointer hover:bg-gray-200 transition-colors">
          U
        </div>
      </div>
    </header>
  );
}
