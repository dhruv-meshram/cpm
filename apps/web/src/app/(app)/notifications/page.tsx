'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  FolderKanban,
  CheckSquare,
  Edit2,
  Shield,
  Clock,
  ArrowRight,
  Sparkles,
  Megaphone,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { ButtonPrimary, ButtonSecondary } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const formatTime = (dateString: string) => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'PROJECT_INVITATION':
      return <FolderKanban size={16} className="text-black" />;
    case 'TASK_ASSIGNED':
      return <CheckSquare size={16} className="text-black" />;
    case 'TASK_MODIFICATION':
      return <Edit2 size={16} className="text-black" />;
    case 'ROLE_MODIFICATION':
      return <Shield size={16} className="text-black" />;
    case 'ANNOUNCEMENT':
      return <Megaphone size={16} className="text-black" />;
    case 'TASK_STATUS_CHANGE':
      return <RefreshCw size={16} className="text-black" />;
    default:
      return <Bell size={16} className="text-black" />;
  }
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/v1/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async ({ id, all }: { id?: string; all?: boolean }) => {
      const res = await fetch('/api/v1/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, all }),
      });
      if (!res.ok) throw new Error('Failed to update notification');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-[1000px] mx-auto px-8 py-8 space-y-8 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-[#000000]"
            style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.23, letterSpacing: '-0.625px' }}
          >
            Notification Center
          </h1>
          <p className="text-[14px] text-[#615d59] mt-0.5 leading-[1.43]">
            Stay updated with invitations, tasks, and role modifications
          </p>
        </div>
        {unreadCount > 0 && (
          <ButtonSecondary
            onClick={() => markReadMutation.mutate({ all: true })}
            disabled={markReadMutation.isPending}
            size="sm"
            className="flex items-center gap-2"
          >
            <Check size={14} />
            Mark all as read
          </ButtonSecondary>
        )}
      </div>

      {/* ── Tabs Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#e6e6e6] pb-px">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2.5 text-[13px] font-[600] border-b-2 transition-all cursor-pointer relative',
            filter === 'all'
              ? 'border-black text-black'
              : 'border-transparent text-[#a39e98] hover:text-[#615d59]'
          )}
        >
          All Notifications
          {notifications.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[#f6f5f4] border border-[#e6e6e6] text-[#615d59] font-bold">
              {notifications.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-4 py-2.5 text-[13px] font-[600] border-b-2 transition-all cursor-pointer relative',
            filter === 'unread'
              ? 'border-black text-black'
              : 'border-transparent text-[#a39e98] hover:text-[#615d59]'
          )}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-black text-white font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Notifications List ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-white border border-[#e6e6e6] rounded-[12px] animate-pulse" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} className="text-[#a39e98]" />}
          title="All caught up!"
          description={
            filter === 'unread'
              ? 'You have no unread notifications.'
              : 'No notifications found. You will receive updates here as activity occurs.'
          }
        />
      ) : (
        <div className="bg-white rounded-[12px] border border-[#e6e6e6] divide-y divide-[#e6e6e6] overflow-hidden">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.isRead) {
                  markReadMutation.mutate({ id: n.id });
                }
              }}
              className={cn(
                'p-4 flex items-start gap-4 transition-colors duration-150 relative group',
                !n.isRead ? 'bg-[#faf9f8] hover:bg-[#f3f2f0] cursor-pointer' : 'hover:bg-[#f6f5f4]'
              )}
            >
              {/* Unread indicator */}
              {!n.isRead && (
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-black" />
              )}

              {/* Icon */}
              <div className="w-8 h-8 rounded-full bg-[#f6f5f4] border border-[#e6e6e6] flex items-center justify-center shrink-0 mt-0.5">
                {getNotificationIcon(n.type)}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className={cn('text-[14px] leading-tight text-[#000000]', !n.isRead ? 'font-[600]' : 'font-[500]')}>
                    {n.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-[#a39e98] shrink-0 font-[500]">
                    <Clock size={11} />
                    {formatTime(n.createdAt)}
                  </div>
                </div>
                <p className="text-[13px] text-[#615d59] mt-1 leading-[1.45] font-[400]">
                  {n.content}
                </p>

                {/* Link Action */}
                {n.projectId && (
                  <div className="mt-2.5 flex items-center">
                    <Link
                      href={
                        n.taskId
                          ? `/projects/${n.projectId}/tasks?task=${n.taskId}`
                          : `/projects/${n.projectId}/overview`
                      }
                      className="inline-flex items-center gap-1 text-[12px] font-[600] text-black hover:underline group-hover:translate-x-0.5 transition-transform"
                    >
                      {n.taskId ? 'View task' : 'Go to project'}
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {!n.isRead && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0 ml-2">
                  <span className="text-[11px] font-[600] text-black bg-white border border-[#e6e6e6] rounded-[6px] px-2 py-1 flex items-center gap-1 shadow-xs">
                    <Check size={11} />
                    Mark Read
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
