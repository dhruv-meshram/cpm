'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2, Shield, Info, X, AlertTriangle, CheckCircle, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  description: string | null;
  approveTasks: boolean;
  changeTaskStatus: boolean;
  addTasks: boolean;
  modifyTasks: 'ALL' | 'ASSIGNED' | 'NONE';
  addDepartments: boolean;
  manageTags: boolean;
  makeAnnouncements: boolean;
  manageTeam: boolean;
  manageRoles: boolean;
}

export default function RolesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  // Dialog / Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // Form States
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [approveTasks, setApproveTasks] = useState(false);
  const [changeTaskStatus, setChangeTaskStatus] = useState(false);
  const [addTasks, setAddTasks] = useState(false);
  const [modifyTasks, setModifyTasks] = useState<'ALL' | 'ASSIGNED' | 'NONE'>('ALL');
  const [addDepartments, setAddDepartments] = useState(false);
  const [manageTags, setManageTags] = useState(false);
  const [makeAnnouncements, setMakeAnnouncements] = useState(false);
  const [manageTeam, setManageTeam] = useState(false);
  const [manageRoles, setManageRoles] = useState(false);
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

  // Create or Update Role mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingRole 
        ? `/api/v1/projects/${projectId}/roles?id=${editingRole.id}`
        : `/api/v1/projects/${projectId}/roles`;
      
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save role');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', projectId] });
      setShowModal(false);
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

  const openCreateModal = () => {
    setEditingRole(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setApproveTasks(role.approveTasks);
    setChangeTaskStatus(role.changeTaskStatus);
    setAddTasks(role.addTasks);
    setModifyTasks(role.modifyTasks);
    setAddDepartments(role.addDepartments);
    setManageTags(role.manageTags);
    setMakeAnnouncements(role.makeAnnouncements);
    setManageTeam(role.manageTeam);
    setManageRoles(role.manageRoles);
    setFormError(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setRoleName('');
    setRoleDesc('');
    setApproveTasks(false);
    setChangeTaskStatus(false);
    setAddTasks(false);
    setModifyTasks('ALL');
    setAddDepartments(false);
    setManageTags(false);
    setMakeAnnouncements(false);
    setManageTeam(false);
    setManageRoles(false);
    setFormError(null);
  };

  const handleSave = () => {
    if (!roleName || roleName.trim() === '') {
      setFormError('Role name is required');
      return;
    }
    saveMutation.mutate({
      name: roleName,
      description: roleDesc,
      approveTasks,
      changeTaskStatus,
      addTasks,
      modifyTasks,
      addDepartments,
      manageTags,
      makeAnnouncements,
      manageTeam,
      manageRoles
    });
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
            Configure access roles for this project. Assign custom permission levels for team members.
          </p>
        </div>
        <button
          onClick={openCreateModal}
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
              <th className="py-3.5 px-6">Allowed Permissions</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const activePerms = [];
              if (role.approveTasks) activePerms.push('Approve Tasks');
              if (role.changeTaskStatus) activePerms.push('Change Task Status');
              if (role.addTasks) activePerms.push('Add Tasks');
              if (role.modifyTasks !== 'NONE') activePerms.push(`Modify Tasks (${role.modifyTasks})`);
              if (role.addDepartments) activePerms.push('Add Departments');
              if (role.manageTags) activePerms.push('Manage Tags');
              if (role.makeAnnouncements) activePerms.push('Announcements');
              if (role.manageTeam) activePerms.push('Manage Team');
              if (role.manageRoles) activePerms.push('Manage Roles');

              return (
                <tr key={role.id} className="border-b border-[#f0efee] last:border-0 hover:bg-[#f6f5f4]/30 text-[13px] text-black">
                  <td className="py-4 px-6 font-semibold">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-[#a39e98]" />
                        <span>{role.name}</span>
                      </div>
                      {role.description && (
                        <span className="text-[11px] font-normal text-[#615d59] mt-0.5 pl-6">{role.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1 max-w-xl">
                      {activePerms.length > 0 ? (
                        activePerms.map((perm) => (
                          <span
                            key={perm}
                            className="bg-[#f6f5f4] border border-[#e6e6e6] text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          >
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-300 italic text-[12px]">No permissions enabled (Read-Only)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-3 text-[#a39e98]">
                      <button
                        onClick={() => openEditModal(role)}
                        className="p-1 hover:text-black transition-colors cursor-pointer"
                        title="Edit Permissions"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingRole(role)}
                        className="p-1 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete Role"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {roles.length === 0 && (
              <tr>
                <td colSpan={3} className="py-12 text-center text-[#a39e98] italic bg-white">
                  No custom roles configured. Click "Create Custom Role" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT ROLE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px]">
                {editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom Role'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                  {formError}
                </div>
              )}
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-black mb-1.5 uppercase tracking-wider">Role Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Engineer, Auditor"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-black mb-1.5 uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of the role's target"
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Slabs of Control */}
              <div className="border-t border-[#e6e6e6] pt-4">
                <h4 className="font-bold text-black text-[12px] uppercase tracking-wider mb-3">Permissions (Slabs of Control)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1 */}
                  <label className="flex items-start gap-3 p-3 border border-[#e6e6e6] hover:border-black rounded-lg transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approveTasks}
                      onChange={(e) => setApproveTasks(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-black">Task Review Approval</span>
                      <span className="text-[11px] text-[#615d59] mt-0.5">Allow approving and declining task review items.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-[#e6e6e6] hover:border-black rounded-lg transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={changeTaskStatus}
                      onChange={(e) => setChangeTaskStatus(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-black">Change Task Status</span>
                      <span className="text-[11px] text-[#615d59] mt-0.5">Allow moving tasks across state columns.</span>
                    </div>
                  </label>

                  {/* Row 2 */}
                  <label className="flex items-start gap-3 p-3 border border-[#e6e6e6] hover:border-black rounded-lg transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addTasks}
                      onChange={(e) => setAddTasks(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-black">Addition of Tasks</span>
                      <span className="text-[11px] text-[#615d59] mt-0.5">Allow creating and appending new tasks to schedule.</span>
                    </div>
                  </label>

                  <div className="flex flex-col p-3 border border-[#e6e6e6] rounded-lg">
                    <span className="text-[13px] font-semibold text-black mb-1">Which Tasks Can They Modify?</span>
                    <select
                      value={modifyTasks}
                      onChange={(e: any) => setModifyTasks(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 border border-[#dcdcdc] rounded-md text-[12px] bg-white focus:outline-hidden"
                    >
                      <option value="ALL">All Project Tasks</option>
                      <option value="ASSIGNED">Only Tasks Assigned to Them</option>
                      <option value="NONE">None (Read Only)</option>
                    </select>
                  </div>

                  {/* Row 3 */}
                  <label className="flex items-start gap-3 p-3 border border-[#e6e6e6] hover:border-black rounded-lg transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addDepartments}
                      onChange={(e) => setAddDepartments(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-black">Addition of Departments</span>
                      <span className="text-[11px] text-[#615d59] mt-0.5">Allow creating project departments.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-[#e6e6e6] hover:border-black rounded-lg transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manageTags}
                      onChange={(e) => setManageTags(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-black">Tags Management</span>
                      <span className="text-[11px] text-[#615d59] mt-0.5">Allow creating and modifying task tagging categories.</span>
                    </div>
                  </label>

                  {/* Row 4 */}
                  <label className="flex items-start gap-3 p-3 border border-[#e6e6e6] hover:border-black rounded-lg transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={makeAnnouncements}
                      onChange={(e) => setMakeAnnouncements(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-black">Making Announcements</span>
                      <span className="text-[11px] text-[#615d59] mt-0.5">Allow broadcasting global announcements.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-[#e6e6e6] hover:border-black rounded-lg transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manageTeam}
                      onChange={(e) => setManageTeam(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-black">Team Management</span>
                      <span className="text-[11px] text-[#615d59] mt-0.5">Allow inviting, updating roles, and removing members.</span>
                    </div>
                  </label>

                  {/* Row 5 */}
                  <label className="flex items-start gap-3 p-3 border border-[#e6e6e6] hover:border-black rounded-lg transition-colors cursor-pointer md:col-span-2">
                    <input
                      type="checkbox"
                      checked={manageRoles}
                      onChange={(e) => setManageRoles(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-black">Role Management</span>
                      <span className="text-[11px] text-[#615d59] mt-0.5">Allow creating and configuring custom roles and privileges.</span>
                    </div>
                  </label>

                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-4 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {editingRole ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deletingRole && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px] flex items-center gap-1.5 text-red-600">
                <AlertTriangle size={18} /> Delete Custom Role
              </h3>
              <button onClick={() => setDeletingRole(null)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-[#615d59]">
                Are you sure you want to delete <strong className="text-black">"{deletingRole.name}"</strong>? Members with this role will automatically fall back to standard Member rights.
              </p>
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
