'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  sortOrder: number;
  taskCount: number;
  completionPercentage: number;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  taskCount: number;
}

const COLOR_PALETTE = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Slate', hex: '#64748b' }
];

export default function ManageProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'departments' | 'tags'>('departments');

  // Dialog / Modal States for Departments
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);

  // Dialog / Modal States for Tags
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);

  // Form States for Departments
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState(COLOR_PALETTE[0].hex);
  const [formError, setFormError] = useState<string | null>(null);
  const [fallbackDepId, setFallbackDepId] = useState('');

  // Form States for Tags
  const [tagNameInput, setTagNameInput] = useState('');

  // Fetch departments
  const { data: departments = [], isLoading: isDeptsLoading } = useQuery<Department[]>({
    queryKey: ['departments', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/departments`);
      if (!res.ok) throw new Error('Failed to fetch departments');
      return res.json();
    }
  });

  // Fetch tags
  const { data: tags = [], isLoading: isTagsLoading } = useQuery<Tag[]>({
    queryKey: ['tags', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects/${projectId}/tags`);
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    }
  });

  // Create Department mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; color: string }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.name?.[0] || 'Failed to create department');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', projectId] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  // Update Department mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Department> }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.name?.[0] || 'Failed to update department');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', projectId] });
      setEditingDepartment(null);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  // Delete Department mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, fallbackId }: { id: string; fallbackId?: string }) => {
      const url = `/api/v1/projects/${projectId}/departments/${id}${fallbackId ? `?fallbackDepartmentId=${fallbackId}` : ''}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete department');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setDeletingDepartment(null);
      setFallbackDepId('');
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  // Create Tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.name?.[0] || 'Failed to create tag');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', projectId] });
      setShowCreateTagModal(false);
      setTagNameInput('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  // Update Tag mutation
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string } }) => {
      const res = await fetch(`/api/v1/projects/${projectId}/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.name?.[0] || 'Failed to update tag');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setEditingTag(null);
      setTagNameInput('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  // Delete Tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/projects/${projectId}/tags/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete tag');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setDeletingTag(null);
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormColor(COLOR_PALETTE[0].hex);
    setFormError(null);
  };

  const handleOpenEdit = (dep: Department) => {
    setEditingDepartment(dep);
    setFormName(dep.name);
    setFormDesc(dep.description || '');
    setFormColor(dep.color);
    setFormError(null);
  };

  const handleOpenEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagNameInput(tag.name);
    setFormError(null);
  };

  const handleMoveOrder = (dep: Department, direction: 'up' | 'down') => {
    const currentIndex = departments.findIndex(d => d.id === dep.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === departments.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetDep = departments[targetIndex];

    // Swap sortOrder values
    updateMutation.mutate({ id: dep.id, data: { sortOrder: targetDep.sortOrder } });
    updateMutation.mutate({ id: targetDep.id, data: { sortOrder: dep.sortOrder } });
  };

  if (isDeptsLoading || isTagsLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#615d59]">
        Loading settings configuration…
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8 select-none">
      
      {/* Sub-tabs Selection */}
      <div className="flex gap-2 border-b border-[#e6e6e6] mb-8">
        <button
          onClick={() => { setActiveSubTab('departments'); setFormError(null); }}
          className={cn(
            "px-4 py-2.5 text-[14px] font-[600] border-b-2 transition-colors cursor-pointer",
            activeSubTab === 'departments' ? "border-black text-black" : "border-transparent text-[#a39e98] hover:text-black"
          )}
        >
          Departments
        </button>
        <button
          onClick={() => { setActiveSubTab('tags'); setFormError(null); }}
          className={cn(
            "px-4 py-2.5 text-[14px] font-[600] border-b-2 transition-colors cursor-pointer",
            activeSubTab === 'tags' ? "border-black text-black" : "border-transparent text-[#a39e98] hover:text-black"
          )}
        >
          Tags Management
        </button>
      </div>

      {activeSubTab === 'departments' ? (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[20px] font-bold text-black tracking-tight">Project Departments</h2>
              <p className="text-[13px] text-[#a39e98] mt-1">
                Organize project tasks into specific departments for specialized tracking and scheduling.
              </p>
            </div>
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="flex items-center gap-1.5 bg-black hover:bg-black/80 text-white text-[13px] font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} /> Create Department
            </button>
          </div>

          {/* Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dep) => (
              <div
                key={dep.id}
                className={cn(
                  "bg-white border border-[#e6e6e6] rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden",
                  dep.archived && "opacity-60"
                )}
              >
                {/* Department Color Accent Line */}
                <div
                  className="absolute top-0 left-0 right-0 h-[4px]"
                  style={{ backgroundColor: dep.color }}
                />

                <div>
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <h3 className="font-bold text-[16px] text-black flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: dep.color }}
                      />
                      {dep.name}
                      {dep.archived && (
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Archived
                        </span>
                      )}
                    </h3>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 text-[#a39e98]">
                      <button
                        onClick={() => handleMoveOrder(dep, 'up')}
                        className="hover:text-black p-1 transition-colors cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(dep, 'down')}
                        className="hover:text-black p-1 transition-colors cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(dep)}
                        className="hover:text-black p-1 transition-colors ml-1 cursor-pointer"
                        title="Edit Department"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (dep.name === 'General') {
                            alert('The General department cannot be deleted.');
                            return;
                          }
                          setDeletingDepartment(dep);
                          setFallbackDepId('');
                        }}
                        className={cn(
                          "p-1 transition-colors ml-1 cursor-pointer",
                          dep.name === 'General' ? "opacity-30 cursor-not-allowed" : "hover:text-red-600"
                        )}
                        title="Delete Department"
                        disabled={dep.name === 'General'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[13px] text-[#615d59] line-clamp-2 min-h-[40px] mb-4">
                    {dep.description || <span className="italic text-gray-300">No description provided.</span>}
                  </p>
                </div>

                {/* Statistics Section */}
                <div className="border-t border-[#f0f0f0] pt-4 mt-2">
                  <div className="flex justify-between items-center text-[12px] text-[#615d59] mb-1.5">
                    <span>Task Progress</span>
                    <span className="font-semibold">{dep.taskCount} {dep.taskCount === 1 ? 'task' : 'tasks'} ({dep.completionPercentage}% Done)</span>
                  </div>
                  <div className="w-full bg-[#f0f0f0] rounded-full h-[6px] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${dep.completionPercentage}%`,
                        backgroundColor: dep.color
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {departments.length === 0 && (
              <div className="col-span-full bg-white border border-dashed border-[#dcdcdc] rounded-xl p-12 text-center text-[#a39e98]">
                <Info className="mx-auto mb-3" size={24} />
                No departments configured. Click "Create Department" to get started.
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[20px] font-bold text-black tracking-tight">Project Tags Library</h2>
              <p className="text-[13px] text-[#a39e98] mt-1">
                Define and manage tags to categorize tasks. Tags are shared across the entire project.
              </p>
            </div>
            <button
              onClick={() => { setTagNameInput(''); setFormError(null); setShowCreateTagModal(true); }}
              className="flex items-center gap-1.5 bg-black hover:bg-black/80 text-white text-[13px] font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} /> Create Tag
            </button>
          </div>

          {/* Tags Table */}
          <div className="bg-white border border-[#e6e6e6] rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e6e6e6] text-[#a39e98] text-[11px] font-bold uppercase tracking-wider bg-[#f6f5f4]">
                  <th className="py-3.5 px-6">Tag Name</th>
                  <th className="py-3.5 px-6">Tasks Using Tag</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id} className="border-b border-[#f0efee] last:border-0 hover:bg-[#f6f5f4]/50 text-[13px] text-black">
                    <td className="py-4 px-6 font-semibold">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#f6f5f4] text-[#615d59] border border-[#e6e6e6] font-semibold">
                        {tag.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[#615d59] font-medium">
                      {tag.taskCount} {tag.taskCount === 1 ? 'task' : 'tasks'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-3 text-[#a39e98]">
                        <button
                          onClick={() => handleOpenEditTag(tag)}
                          className="hover:text-black p-1 transition-colors cursor-pointer"
                          title="Rename Tag"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingTag(tag)}
                          className="hover:text-red-600 p-1 transition-colors cursor-pointer"
                          title="Delete Tag"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tags.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-[#a39e98] italic bg-white">
                      No tags created yet. Click "Create Tag" to define your project's first tag.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* DEPARTMENT CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px]">Create New Department</h3>
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
                <label className="block text-[12px] font-bold text-black mb-1.5 uppercase tracking-wider">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Brakes, Suspension"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-black mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  placeholder="Optional details about this department's scope..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden resize-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-black mb-2 uppercase tracking-wider">Department Theme Color</label>
                <div className="grid grid-cols-5 gap-2.5">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setFormColor(color.hex)}
                      className={cn(
                        "w-full h-8 rounded-lg transition-transform border border-black/10 flex items-center justify-center cursor-pointer",
                        formColor === color.hex ? "scale-105 ring-2 ring-black" : "hover:scale-102"
                      )}
                      style={{ backgroundColor: color.hex }}
                    >
                      {formColor === color.hex && <CheckCircle size={14} className="text-white drop-shadow-md" />}
                    </button>
                  ))}
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
                onClick={() => createMutation.mutate({ name: formName, description: formDesc, color: formColor })}
                className="px-4 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENT EDIT MODAL */}
      {editingDepartment && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px]">Edit Department</h3>
              <button onClick={() => setEditingDepartment(null)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
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
                <label className="block text-[12px] font-bold text-black mb-1.5 uppercase tracking-wider">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Brakes, Suspension"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden"
                  disabled={editingDepartment.name === 'General'}
                />
                {editingDepartment.name === 'General' && (
                  <p className="text-[10px] text-[#a39e98] mt-1">The name of the General department cannot be edited.</p>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-bold text-black mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  placeholder="Optional details about this department's scope..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden resize-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-black mb-2 uppercase tracking-wider">Department Theme Color</label>
                <div className="grid grid-cols-5 gap-2.5">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setFormColor(color.hex)}
                      className={cn(
                        "w-full h-8 rounded-lg transition-transform border border-black/10 flex items-center justify-center cursor-pointer",
                        formColor === color.hex ? "scale-105 ring-2 ring-black" : "hover:scale-102"
                      )}
                      style={{ backgroundColor: color.hex }}
                    >
                      {formColor === color.hex && <CheckCircle size={14} className="text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="archive-checkbox"
                  checked={editingDepartment.archived}
                  onChange={(e) => setEditingDepartment({ ...editingDepartment, archived: e.target.checked })}
                  className="rounded border-[#dcdcdc] text-black focus:ring-black cursor-pointer"
                />
                <label htmlFor="archive-checkbox" className="text-[13px] font-semibold text-[#615d59] cursor-pointer">
                  Archive this department (hides it from standard views)
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setEditingDepartment(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate({
                  id: editingDepartment.id,
                  data: {
                    name: formName,
                    description: formDesc,
                    color: formColor,
                    archived: editingDepartment.archived
                  }
                })}
                className="px-4 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENT DELETE DIALOG */}
      {deletingDepartment && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px] flex items-center gap-1.5 text-red-600">
                <AlertTriangle size={18} /> Delete Department
              </h3>
              <button onClick={() => setDeletingDepartment(null)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-[#615d59]">
                Are you sure you want to delete <strong className="text-black">"{deletingDepartment.name}"</strong>? This action cannot be undone.
              </p>

              {deletingDepartment.taskCount > 0 ? (
                <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex gap-2">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[12px] font-bold text-red-800 uppercase tracking-wider">Cannot Delete Department</h4>
                      <p className="text-[12px] text-red-700 mt-0.5">
                        Since this department has tasks under it, it cannot be deleted.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-[#a39e98]">
                  This department has no tasks, so it can be safely deleted without affecting schedule paths.
                </p>
              )}
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setDeletingDepartment(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: deletingDepartment.id })}
                className={cn(
                  "px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-colors cursor-pointer",
                  deletingDepartment.taskCount > 0
                    ? "bg-red-300 cursor-not-allowed opacity-50"
                    : "bg-red-600 hover:bg-red-700"
                )}
                disabled={deletingDepartment.taskCount > 0}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAG CREATE MODAL */}
      {showCreateTagModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px]">Create New Tag</h3>
              <button onClick={() => setShowCreateTagModal(false)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
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
                <label className="block text-[12px] font-bold text-black mb-1.5 uppercase tracking-wider">Tag Name</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent, Procurement"
                  value={tagNameInput}
                  onChange={(e) => setTagNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setShowCreateTagModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => createTagMutation.mutate({ name: tagNameInput.trim() })}
                className="px-4 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-colors cursor-pointer"
              >
                Create Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAG EDIT (RENAME) MODAL */}
      {editingTag && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px]">Rename Tag</h3>
              <button onClick={() => setEditingTag(null)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
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
                <label className="block text-[12px] font-bold text-black mb-1.5 uppercase tracking-wider">Tag Name</label>
                <input
                  type="text"
                  value={tagNameInput}
                  onChange={(e) => setTagNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dcdcdc] rounded-lg text-[13px] focus:ring-1 focus:ring-black focus:outline-hidden"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setEditingTag(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => updateTagMutation.mutate({ id: editingTag.id, data: { name: tagNameInput.trim() } })}
                className="px-4 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-black/90 transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAG DELETE DIALOG */}
      {deletingTag && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e6e6e6] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e6e6] flex justify-between items-center bg-[#f6f5f4]">
              <h3 className="font-bold text-black text-[15px] flex items-center gap-1.5 text-red-600">
                <AlertTriangle size={18} /> Delete Tag
              </h3>
              <button onClick={() => setDeletingTag(null)} className="text-[#a39e98] hover:text-black transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-[#615d59]">
                Are you sure you want to delete tag <strong className="text-black">"{deletingTag.name}"</strong>? This will remove the tag from all associated tasks. This action cannot be undone.
              </p>
              {deletingTag.taskCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
                  Warning: This tag is currently used by {deletingTag.taskCount} {deletingTag.taskCount === 1 ? 'task' : 'tasks'}.
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-[#f6f5f4] border-t border-[#e6e6e6] flex justify-end gap-2">
              <button
                onClick={() => setDeletingTag(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#dcdcdc] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTagMutation.mutate(deletingTag.id)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Delete Tag
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
