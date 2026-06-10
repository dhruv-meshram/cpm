'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { UserPlus, Edit2, Trash2, X, AlertTriangle, Shield, Calendar, Users, Building } from 'lucide-react';
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
  projectId: string;
  role: string;
  customRoleId: string | null;
  departmentId: string | null;
  createdAt: string;
  user: User;
  department: Department | null;
  customRole: any | null;
}

// Roles are fetched dynamically from the database.

export default function TeamPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  // Dialog / Modal States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<ProjectMember | null>(null);

  // Form States for Inviting
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Form States for Editing Member
  const [editRole, setEditRole] = useState('Member');
  const [editDept, setEditDept] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch project members
  const { data: members = [], isLoading: isMembersLoading } = useQuery<ProjectMember[]>({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/members`);
      if (!res.ok) throw new Error('Failed to fetch members');
      return res.json();
    }
  });

  // Fetch departments (already existing in project API)
  const { data: departments = [], isLoading: isDeptsLoading } = useQuery<Department[]>({
    queryKey: ['departments', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/departments`);
      if (!res.ok) throw new Error('Failed to fetch departments');
      return res.json();
    }
  });

  // Fetch roles dynamically
  const { data: roles = [], isLoading: isRolesLoading } = useQuery<any[]>({
    queryKey: ['roles', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/roles`);
      if (!res.ok) throw new Error('Failed to fetch roles');
      return res.json();
    }
  });

  // Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: { emails: string[]; role: string; customRoleId: string | null; departmentId: string | null }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send invitations');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      setShowInviteModal(false);
      setInviteEmails('');
      setInviteRole('Member');
      setInviteDept('');
      setInviteError(null);
    },
    onError: (err: any) => {
      setInviteError(err.message);
    }
  });

  // Update Member Mutation
  const updateMemberMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string; customRoleId: string | null; departmentId: string | null }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      setEditingMember(null);
      setEditError(null);
    },
    onError: (err: any) => {
      setEditError(err.message);
    }
  });

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/projects/${projectId}/members?userId=${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      setDeletingMember(null);
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const handleOpenEdit = (member: ProjectMember) => {
    setEditingMember(member);
    if (member.customRoleId) {
      setEditRole(`CUSTOM:${member.customRoleId}:${member.role}`);
    } else {
      setEditRole(member.role);
    }
    setEditDept(member.departmentId || '');
    setEditError(null);
  };

  const handleInviteSubmit = () => {
    setInviteError(null);
    const emailList = inviteEmails
      .split(/[\n,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emailList.length === 0) {
      setInviteError('Please enter at least one email address');
      return;
    }

    let selectedRole = inviteRole;
    let selectedCustomRoleId = null;
    if (inviteRole.startsWith('CUSTOM:')) {
      const parts = inviteRole.split(':');
      selectedCustomRoleId = parts[1];
      selectedRole = parts[2];
    }

    inviteMutation.mutate({
      emails: emailList,
      role: selectedRole,
      customRoleId: selectedCustomRoleId,
      departmentId: inviteDept || null
    });
  };

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

  if (isMembersLoading || isDeptsLoading || isRolesLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#615d59] font-sans">
        Loading team configurations…
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e6e6e6] rounded-xl shadow-xs p-6 select-none font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-[18px] font-bold text-black tracking-tight flex items-center gap-2">
            <Users size={20} /> Project Members ({members.length})
          </h2>
          <p className="text-[13px] text-[#a39e98] mt-1">
            Manage your project team roles, departments, and collaborate in real-time.
          </p>
        </div>
        <button
          onClick={() => { setShowInviteModal(true); setInviteError(null); }}
          className="flex items-center gap-1.5 bg-black hover:bg-black/85 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <UserPlus size={16} /> Add / Invite Members
        </button>
      </div>

      {/* Member List Table */}
      <div className="border border-[#e6e6e6] rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e6e6e6] text-[#a39e98] text-[11px] font-bold uppercase tracking-wider bg-[#f6f5f4]">
              <th className="py-3.5 px-6">Member</th>
              <th className="py-3.5 px-6">Department</th>
              <th className="py-3.5 px-6">Project Role</th>
              <th className="py-3.5 px-6">Joined Date</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-b border-[#f0efee] last:border-0 hover:bg-[#f6f5f4]/30 text-[13px] text-black">
                <td className="py-4 px-6 flex items-center gap-3">
                  {/* Initials Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[#f0efee] border border-[#e6e6e6] flex items-center justify-center font-bold text-[13px] text-[#615d59]">
                    {getInitials(member.user.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-black">{member.user.name}</div>
                    <div className="text-[12px] text-[#a39e98]">{member.user.email}</div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {member.department ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border" style={{ borderColor: member.department.color + '30', backgroundColor: member.department.color + '10' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.department.color }} />
                      {member.department.name}
                    </span>
                  ) : (
                    <span className="text-[#a39e98] text-[12px] italic">No Department</span>
                  )}
                </td>
                <td className="py-4 px-6 font-medium">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border",
                    member.customRoleId 
                      ? "bg-black text-white border-black" 
                      : "bg-[#f6f5f4] text-black border-[#e6e6e6]"
                  )}>
                    <Shield size={10} className={member.customRoleId ? "text-white" : "text-[#615d59]"} />
                    {member.role}
                    {member.customRoleId && (
                      <span className="text-[8px] uppercase font-bold tracking-wider opacity-80 pl-1 border-l border-white/30 ml-1">
                        Custom
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-4 px-6 text-[#615d59]">
                  <span className="flex items-center gap-1.5 text-[12px]">
                    <Calendar size={12} className="text-[#a39e98]" />
                    {formatDate(member.createdAt)}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex justify-end gap-3 text-[#a39e98]">
                    <button
                      onClick={() => handleOpenEdit(member)}
                      className="hover:text-black p-1 transition-colors cursor-pointer"
                      title="Edit Member"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingMember(member)}
                      className="hover:text-red-600 p-1 transition-colors cursor-pointer"
                      title="Remove Member"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#a39e98] italic bg-white">
                  No members added to this project.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* INVITE MEMBERS MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px] flex items-center gap-1.5">
                <UserPlus size={16} /> Add / Invite Members
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {inviteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                  {inviteError}
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Email Addresses</label>
                <textarea
                  placeholder="Enter emails separated by commas or new lines&#10;e.g. member1@gmail.com, member2@gmail.com"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden resize-none font-mono"
                />
                <p className="text-[10px] text-[#a39e98] mt-1">
                  Non-existent users will automatically have a temporary skeleton account created for them.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Project Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden bg-white"
                  >
                    <optgroup label="Standard Roles">
                      <option value="Member">Member</option>
                      <option value="Department Head">Department Head</option>
                      <option value="Project Manager">Project Manager</option>
                      <option value="Captain">Captain</option>
                      <option value="Admin">Admin</option>
                    </optgroup>
                    {roles.length > 0 && (
                      <optgroup label="Custom Roles">
                        {roles.map((r: any) => (
                          <option key={r.id} value={`CUSTOM:${r.id}:${r.name}`}>{r.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Department</label>
                  <select
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden bg-white"
                  >
                    <option value="">No Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteSubmit}
                disabled={inviteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-colors cursor-pointer flex items-center gap-1"
              >
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invitations'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MEMBER ROLE / DEPT MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px]">Edit Member Roles</h3>
              <button onClick={() => setEditingMember(null)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                  {editError}
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-[#f6f5f4] rounded-lg border border-[#e6e6e6] mb-2">
                <div className="w-10 h-10 rounded-full bg-white border border-[#e6e6e6] flex items-center justify-center font-bold text-[14px] text-black shrink-0">
                  {getInitials(editingMember.user.name)}
                </div>
                <div>
                  <div className="font-bold text-black">{editingMember.user.name}</div>
                  <div className="text-[12px] text-[#a39e98]">{editingMember.user.email}</div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Project Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden bg-white"
                >
                  <optgroup label="Standard Roles">
                    <option value="Member">Member</option>
                    <option value="Department Head">Department Head</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Captain">Captain</option>
                    <option value="Admin">Admin</option>
                  </optgroup>
                  {roles.length > 0 && (
                    <optgroup label="Custom Roles">
                      {roles.map((r: any) => (
                        <option key={r.id} value={`CUSTOM:${r.id}:${r.name}`}>{r.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Department</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden bg-white"
                >
                  <option value="">No Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  let selectedRole = editRole;
                  let selectedCustomRoleId = null;
                  if (editRole.startsWith('CUSTOM:')) {
                    const parts = editRole.split(':');
                    selectedCustomRoleId = parts[1];
                    selectedRole = parts[2];
                  }
                  updateMemberMutation.mutate({
                    userId: editingMember.userId,
                    role: selectedRole,
                    customRoleId: selectedCustomRoleId,
                    departmentId: editDept || null
                  });
                }}
                disabled={updateMemberMutation.isPending}
                className="px-4 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE MEMBER DIALOG */}
      {deletingMember && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px] flex items-center gap-1.5 text-red-600">
                <AlertTriangle size={18} /> Remove Member
              </h3>
              <button onClick={() => setDeletingMember(null)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-[#615d59]">
                Are you sure you want to remove <strong className="text-black">"{deletingMember.user.name}"</strong> from this project?
              </p>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2.5">
                <div className="flex gap-2.5 text-red-800 text-[12px] font-semibold uppercase tracking-wider items-center">
                  <AlertTriangle size={16} className="text-red-600 shrink-0" />
                  Important Security Warning
                </div>
                <ul className="list-disc pl-5 text-[12px] text-red-700 space-y-1">
                  <li>The member will be instantly unassigned from all project tasks.</li>
                  <li>Their permissions to view, comment, or edit scheduling paths will be revoked.</li>
                  <li>Their past contributions in activity logs are permanently preserved for audit compliance.</li>
                </ul>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => removeMemberMutation.mutate(deletingMember.userId)}
                disabled={removeMemberMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors cursor-pointer"
              >
                {removeMemberMutation.isPending ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
