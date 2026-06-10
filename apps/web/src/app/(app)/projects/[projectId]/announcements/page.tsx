'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Megaphone, Pin, Plus, X, Calendar, User, AlertCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string; // Normal, Important, Critical
  isPinned: boolean;
  createdAt: string;
  creator: {
    id: string;
    name: string;
  };
}

interface ProjectMember {
  userId: string;
  role: string;
}

export default function AnnouncementsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [isPinned, setIsPinned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch announcements
  const { data: announcements = [], isLoading: isAnnouncementsLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/announcements`);
      if (!res.ok) throw new Error('Failed to fetch announcements');
      return res.json();
    }
  });

  // Fetch project members to check the current user's role
  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/members`);
      if (!res.ok) throw new Error('Failed to fetch members');
      return res.json();
    }
  });

  // Fetch current user details
  const { data: currentUser } = useQuery<any>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const r = await fetch('/api/v1/users/me');
      if (!r.ok) throw new Error('Failed to fetch current user');
      return r.json();
    }
  });

  const currentMember = currentUser && members.find((m: any) => m.userId === currentUser.id);
  const canPost = currentMember && ['PROJECT_ADMIN', 'ADMIN', 'PROJECT MANAGER', 'PROJECT_MANAGER', 'DEPARTMENT_HEAD', 'CAPTAIN'].includes(currentMember.role.toUpperCase().replace(' ', '_'));

  // Post Announcement Mutation
  const postMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; priority: string; isPinned: boolean }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to post announcement');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', projectId] });
      setShowCreateModal(false);
      setTitle('');
      setContent('');
      setPriority('Normal');
      setIsPinned(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  const handlePostSubmit = () => {
    setFormError(null);
    if (!title.trim() || !content.trim()) {
      setFormError('Title and content are required');
      return;
    }
    postMutation.mutate({ title, content, priority, isPinned });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isAnnouncementsLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#615d59] font-sans">
        Loading announcements…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-6 select-none font-sans pb-12">
      <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-4">
        <div>
          <h2 className="text-[20px] font-bold text-black tracking-tight flex items-center gap-2">
            <Megaphone size={22} /> Project Announcements
          </h2>
          <p className="text-[13px] text-[#a39e98] mt-0.5">
            Broadcast important updates and alerts to the project team.
          </p>
        </div>
        {canPost && (
          <button
            onClick={() => { setShowCreateModal(true); setFormError(null); }}
            className="flex items-center gap-1.5 bg-black hover:bg-black/85 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} /> New Announcement
          </button>
        )}
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {announcements.map((item) => (
          <div
            key={item.id}
            className={cn(
              "p-6 bg-white border rounded-xl shadow-xs transition-all relative",
              item.isPinned ? "border-black ring-1 ring-black/5" : "border-[#e6e6e6]"
            )}
          >
            {/* Pin Badge */}
            {item.isPinned && (
              <span className="absolute top-4 right-4 text-black flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider font-mono">
                <Pin size={12} className="fill-black" /> Pinned
              </span>
            )}

            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    item.priority === 'Critical' && "bg-red-50 border-red-200 text-red-700",
                    item.priority === 'Important' && "bg-amber-50 border-amber-200 text-amber-700",
                    item.priority === 'Normal' && "bg-[#f6f5f4] border-[#e6e6e6] text-[#615d59]"
                  )}>
                    {item.priority}
                  </span>
                  <h3 className="font-extrabold text-black text-[16px] tracking-tight truncate">
                    {item.title}
                  </h3>
                </div>

                <p className="text-[13px] text-[#615d59] leading-relaxed whitespace-pre-wrap mb-4">
                  {item.content}
                </p>

                <div className="flex flex-wrap gap-4 text-[11px] text-[#a39e98]">
                  <span className="flex items-center gap-1.5">
                    <User size={12} />
                    Posted by <strong className="text-black font-semibold">{item.creator.name}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Calendar size={12} />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="py-16 text-center border border-dashed border-[#e6e6e6] rounded-xl text-[#a39e98] italic text-[13px]">
            No announcements posted yet for this project.
          </div>
        )}
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px] flex items-center gap-1.5">
                <Megaphone size={16} /> New Announcement
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule baseline finalized for eBAJA 2027"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden text-black font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Announcement Details *</label>
                <textarea
                  placeholder="Provide detailed information..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden text-black resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden bg-white text-black"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                
                <div className="flex flex-col justify-end pb-1.5">
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-black cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="w-4 h-4 accent-black rounded cursor-pointer"
                    />
                    Pin Announcement
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePostSubmit}
                disabled={postMutation.isPending}
                className="px-4 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-colors cursor-pointer flex items-center gap-1"
              >
                {postMutation.isPending ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
