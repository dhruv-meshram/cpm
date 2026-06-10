'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2, Shield, Info, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

export default function RolesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  // Dialog / Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // Form States
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch roles
  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ['roles', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/roles`);
      if (!res.ok) throw new Error('Failed to fetch roles');
      return res.json();
    }
  });

  // Create Role mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create role');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', projectId] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  // Delete Role mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/projects/${projectId}/roles?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete role');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', projectId] });
      setDeletingRole(null);
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const resetForm = () => {
    setRoleName('');
    setRoleDesc('');
    setFormError(null);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#615d59] font-sans">
        Loading roles configuration…
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e6e6e6] rounded-xl shadow-xs p-6 select-none font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-[18px] font-bold text-black tracking-tight flex items-center gap-2">
            <Shield size={20} /> Project Roles ({roles.length})
          </h2>
          <p className="text-[13px] text-[#a39e98] mt-1">
            Configure access roles for this project. The default role is Project Admin.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-1.5 bg-black hover:bg-black/85 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus size={16} /> Create Custom Role
        </button>
      </div>

      {/* Roles List Table */}
      <div className="border border-[#e6e6e6] rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e6e6e6] text-[#a39e98] text-[11px] font-bold uppercase tracking-wider bg-[#f6f5f4]">
              <th className="py-3.5 px-6">Role Name</th>
              <th className="py-3.5 px-6">Description</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-b border-[#f0efee] last:border-0 hover:bg-[#f6f5f4]/30 text-[13px] text-black">
                <td className="py-4 px-6 font-semibold flex items-center gap-2.5">
                  <Shield size={14} className={cn(role.name === 'Project Admin' ? 'text-black' : 'text-[#a39e98]')} />
                  {role.name}
                  {role.name === 'Project Admin' && (
                    <span className="text-[9px] font-bold bg-[#f6f5f4] text-black border border-[#e6e6e6] px-1.5 py-0.5 rounded-md uppercase">
                      Default
                    </span>
                  )}
                </td>
                <td className="py-4 px-6 text-[#615d59]">
                  {role.description || <span className="italic text-gray-300">No description provided.</span>}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex justify-end gap-3 text-[#a39e98]">
                    <button
                      onClick={() => setDeletingRole(role)}
                      disabled={role.name === 'Project Admin'}
                      className={cn(
                        "p-1 transition-colors cursor-pointer",
                        role.name === 'Project Admin' ? "opacity-20 cursor-not-allowed" : "hover:text-red-600"
                      )}
                      title={role.name === 'Project Admin' ? "Default role cannot be deleted" : "Delete Role"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={3} className="py-12 text-center text-[#a39e98] italic bg-white">
                  No roles configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE ROLE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px]">Create Custom Role</h3>
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
                <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Role Name</label>
                <input
                  type="text"
                  placeholder="e.g. Captain, Lead Engineer"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-black mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  placeholder="Describe the level of permission or responsibility..."
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden resize-none"
                />
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
                onClick={() => createMutation.mutate({ name: roleName, description: roleDesc })}
                className="px-4 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ROLE CONFIRMATION */}
      {deletingRole && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px] flex items-center gap-1.5 text-red-600">
                <AlertTriangle size={18} /> Delete Project Role
              </h3>
              <button onClick={() => setDeletingRole(null)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-[#615d59]">
                Are you sure you want to delete <strong className="text-black">"{deletingRole.name}"</strong>? This will remove this role from the system.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  Deleting a role will not automatically remove members holding it; their assigned role string will remain but the option to assign it to new users will be removed.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingRole.id)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Delete Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
