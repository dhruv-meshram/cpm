'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Shield, Clock, Calendar, CheckSquare, Activity, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

interface ProjectMember {
  userId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  department: Department | null;
}

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  user: string;
  role: string | null;
  workspace: string | null;
}

export default function CollaborationPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // Fetch project members for access history
  const { data: members = [], isLoading: isMembersLoading } = useQuery<ProjectMember[]>({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/members`);
      if (!res.ok) throw new Error('Failed to fetch members');
      return res.json();
    }
  });

  // Fetch project activity logs
  const { data: activityData, isLoading: isActivityLoading } = useQuery<{ data: ActivityItem[] }>({
    queryKey: ['activity', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/activity?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch activity logs');
      return res.json();
    }
  });

  const activities = activityData?.data || [];

  // Filter activities to focus on security/team changes
  const collabActivities = activities.filter(act => 
    act.action.toLowerCase().includes('member') || 
    act.action.toLowerCase().includes('role') || 
    act.action.toLowerCase().includes('department') ||
    act.action.toLowerCase().includes('project') ||
    act.action.toLowerCase().includes('owner')
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isMembersLoading || isActivityLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#615d59] font-sans">
        Loading collaboration statistics…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 select-none font-sans">
      
      {/* ACCESS HISTORY / MEMBERS */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white border border-[#e6e6e6] rounded-xl p-6 shadow-xs">
          <h3 className="text-[15px] font-bold text-black mb-1 flex items-center gap-2">
            <Shield size={16} className="text-black" /> Team Access History
          </h3>
          <p className="text-[12px] text-[#a39e98] mb-6">
            Track member enrollment dates and department roles.
          </p>

          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.userId} className="flex items-start justify-between border-b border-[#f6f5f4] pb-3 last:border-0 last:pb-0">
                <div className="flex gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#f6f5f4] border border-[#e6e6e6] flex items-center justify-center font-bold text-[12px] text-[#615d59] shrink-0">
                    {getInitials(member.user.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-black truncate">{member.user.name}</div>
                    <div className="text-[11px] text-[#a39e98] truncate">{member.user.email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-gray-100 text-gray-700 text-[10px] rounded border border-gray-200">
                        {member.role}
                      </span>
                      {member.department && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] rounded border" style={{ borderColor: member.department.color + '30', backgroundColor: member.department.color + '10', color: '#000000' }}>
                          {member.department.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-[#615d59] font-medium flex items-center gap-1 justify-end">
                    <Calendar size={10} className="text-[#a39e98]" />
                    Joined {formatDate(member.createdAt)}
                  </div>
                  <div className="text-[10px] text-[#a39e98] mt-0.5">
                    Last sync: {formatDate(member.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COLLABORATION AUDIT LOG */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-[#e6e6e6] rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-black flex items-center gap-2">
                <Activity size={16} /> Governance & Security Audit Feed
              </h3>
              <p className="text-[12px] text-[#a39e98] mt-0.5">
                Workspace audit logs for Role-Based Access Control and member actions.
              </p>
            </div>
            <span className="text-[11px] font-mono bg-[#f6f5f4] border border-[#e6e6e6] px-2.5 py-1 rounded-full text-[#615d59]">
              {collabActivities.length} security events
            </span>
          </div>

          <div className="space-y-4">
            {collabActivities.map((act) => (
              <div key={act.id} className="p-4 bg-[#f6f5f4]/40 hover:bg-[#f6f5f4]/70 border border-[#e6e6e6] rounded-lg transition-colors flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg border border-[#e6e6e6] text-black shrink-0">
                  <Shield size={16} />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <span className="text-[13px] font-semibold text-black">
                      {act.action}
                    </span>
                    <span className="text-[11px] text-[#a39e98] flex items-center gap-1 shrink-0 font-mono">
                      <Clock size={11} />
                      {formatDate(act.timestamp)} @ {formatTime(act.timestamp)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] text-[#615d59]">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#e6e6e6] rounded">
                      <User size={10} className="text-[#a39e98]" />
                      Actor: {act.user}
                    </span>
                    
                    {act.role && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#e6e6e6] rounded">
                        <Shield size={10} className="text-[#a39e98]" />
                        Role: {act.role}
                      </span>
                    )}

                    {act.workspace && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-[#e6e6e6] rounded">
                        <Building2 size={10} className="text-[#a39e98]" />
                        Workspace: {act.workspace}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {collabActivities.length === 0 && (
              <div className="py-12 border border-dashed border-[#e6e6e6] rounded-lg text-center text-[#a39e98] italic text-[13px]">
                No governance or team updates have been recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
