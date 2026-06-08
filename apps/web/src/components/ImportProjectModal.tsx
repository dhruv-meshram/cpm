'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, X, CheckCircle2, AlertTriangle, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { parseProjectLibreXML, transformProjectLibreData, CPMTask, TransformMetrics } from '@/lib/projectlibre/parser';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

interface ImportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string; // If importing into an existing project, or we could create a new one
}

export function ImportProjectModal({ isOpen, onClose, projectId }: ImportProjectModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'success'>('upload');
  const [error, setError] = useState<string | null>(null);
  
  const [parsedData, setParsedData] = useState<{ tasks: CPMTask[], metrics: TransformMetrics } | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number, message: string }>({ current: 0, total: 0, message: '' });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      handleAnalyze(selected);
    }
  };

  const handleAnalyze = async (selectedFile: File) => {
    setError(null);
    try {
      const text = await selectedFile.text();
      const parsed = parseProjectLibreXML(text);
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || 'Failed to parse XML');
      }

      const transformed = transformProjectLibreData(parsed.data);
      setParsedData(transformed);
      setStep('preview');
      
      // Auto-expand first level
      const initialExpanded = new Set<string>();
      transformed.tasks.forEach(t => {
        if (!t.parentId) initialExpanded.add(t.id);
      });
      setExpandedNodes(initialExpanded);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const renderTaskTree = (tasks: CPMTask[], parentId?: string, level = 0) => {
    const children = tasks.filter(t => t.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <ul className={`pl-${level === 0 ? '0' : '4'}`}>
        {children.map(task => {
          const hasChildren = tasks.some(t => t.parentId === task.id);
          const isExpanded = expandedNodes.has(task.id);
          return (
            <li key={task.id} className="mt-1">
              <div 
                className={`flex items-center gap-2 py-1 px-2 rounded-md hover:bg-slate-50 cursor-pointer ${level === 0 ? 'bg-slate-50 border border-slate-100 font-medium' : 'text-slate-600 text-sm'}`}
                onClick={() => hasChildren && toggleNode(task.id)}
              >
                {hasChildren ? (
                  isExpanded ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />
                ) : (
                  <span className="w-[14px] shrink-0" />
                )}
                <span className="truncate">{task.name}</span>
                {task.isSummary && <span className="text-[10px] bg-[#f6f5f4] text-black border border-[#e6e6e6] px-1.5 py-0.5 rounded ml-2 shrink-0">Summary</span>}
                {task.isMilestone && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-2 shrink-0">Milestone</span>}
                {task.isCritical && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded ml-2 shrink-0">Critical</span>}
                <span className="text-[10px] text-slate-400 ml-auto shrink-0">{task.durationHours}h</span>
              </div>
              {hasChildren && isExpanded && (
                <div className="ml-2 border-l border-slate-100">
                  {renderTaskTree(tasks, task.id, level + 1)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const executeImport = async () => {
    if (!parsedData) return;
    setStep('importing');
    setError(null);

    try {
      let targetProjectId = projectId;
      
      // If no project ID is provided, create a new project named after the file
      if (!targetProjectId) {
        setImportProgress({ current: 0, total: parsedData.tasks.length, message: 'Creating project...' });
        const projName = file?.name.replace('.xml', '') || 'Imported Project';
        const pRes = await fetch('/api/v1/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projName, description: 'Imported from ProjectLibre' })
        });
        if (!pRes.ok) throw new Error('Failed to create project');
        const pData = await pRes.json();
        targetProjectId = pData.id;
      }

      if (!targetProjectId) throw new Error('No target project ID');

      // 1. Create Tasks (Sequential to map IDs properly for parents, or we can just send flat and map later, but sequential guarantees parent exists if we sort them, but wait, flat list might have parents created later. 
      // Our tree traverse generated them in parent-first order!)
      const tasksToCreate = parsedData.tasks;
      const idMapping = new Map<string, string>(); // cpmId -> new database id
      
      setImportProgress({ current: 0, total: tasksToCreate.length, message: 'Creating tasks...' });
      
      for (let i = 0; i < tasksToCreate.length; i++) {
        const t = tasksToCreate[i];
        
        const mappedParentId = t.parentId ? idMapping.get(t.parentId) : undefined;
        
        // Append Z to make it a valid ISO datetime if it doesn't have timezone info
        const formatIso = (d: string | undefined) => {
          if (!d) return undefined;
          return d.endsWith('Z') || d.includes('+') || d.includes('-') && d.split('T')[1]?.includes('-') ? d : `${d}Z`;
        };

        const res = await fetch(`/api/v1/projects/${targetProjectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: t.name,
            duration: t.durationHours > 0 ? t.durationHours / 24 : 1,
            startDate: formatIso(t.start),
            endDate: formatIso(t.finish),
            parentTaskId: mappedParentId,
            isCritical: t.isCritical
          })
        });
        
        if (!res.ok) {
           console.error('Failed to create task', await res.text());
           // Continue anyway to try others, but add a slightly longer delay
           await new Promise(r => setTimeout(r, 200));
           continue; 
        }
        const created = await res.json();
        idMapping.set(t.id, created.id);
        
        setImportProgress({ current: i + 1, total: tasksToCreate.length, message: `Created task ${i + 1} of ${tasksToCreate.length}` });
        
        // Add a delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      }

      // 2. Create Dependencies
      const dependenciesToCreate = parsedData.tasks.flatMap(t => 
        t.dependencies.map(d => ({ from: d.predecessorId, to: t.id, type: d.type }))
      );

      setImportProgress({ current: 0, total: dependenciesToCreate.length, message: 'Creating dependencies...' });
      
      for (let i = 0; i < dependenciesToCreate.length; i++) {
        const d = dependenciesToCreate[i];
        const newPredId = idMapping.get(d.from);
        const newSuccId = idMapping.get(d.to);
        
        if (newPredId && newSuccId) {
          const depTypeMap: Record<number, string> = { 1: 'FS', 2: 'FF', 3: 'SS', 4: 'SF' };
          
          await fetch(`/api/v1/projects/${targetProjectId}/dependencies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              predecessorTaskId: newPredId,
              successorTaskId: newSuccId,
              type: depTypeMap[d.type] || 'FS'
            })
          });
          // Add a delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 50));
        }
        setImportProgress({ current: i + 1, total: dependenciesToCreate.length, message: `Linked dependency ${i + 1} of ${dependenciesToCreate.length}` });
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setStep('success');

    } catch (err: any) {
      setError(err.message);
      setStep('preview');
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
    setStep('upload');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Import ProjectLibre XML</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3 border border-red-100">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Import Error</h4>
                <p className="text-sm mt-1">{error}</p>
                {step === 'preview' && (
                  <button onClick={handleReset} className="text-xs font-medium underline mt-2 hover:text-red-700">Start Over</button>
                )}
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xml" 
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 bg-[#f6f5f4] text-black border border-[#e6e6e6] rounded-full flex items-center justify-center mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload XML Export</h3>
              <p className="text-slate-500 max-w-md text-sm">
                Select a ProjectLibre XML file. Department nodes will be automatically filtered while preserving WBS structure and dependencies.
              </p>
              <button className="mt-6 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md shadow-sm hover:bg-slate-50 transition-colors">
                Browse Files
              </button>
            </div>
          )}

          {step === 'preview' && parsedData && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">Total Found</div>
                  <div className="text-xl font-bold text-slate-900">{parsedData.metrics.totalDiscovered}</div>
                </div>
                <div className="bg-[#f6f5f4] p-3 rounded-lg border border-[#e6e6e6]">
                  <div className="text-xs text-[#615d59] mb-1">To Import</div>
                  <div className="text-xl font-bold text-black">{parsedData.metrics.tasksToImport}</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <div className="text-xs text-amber-600 mb-1">Ignored Depts</div>
                  <div className="text-xl font-bold text-amber-700">{parsedData.metrics.ignoredNodes.length}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">Dependencies</div>
                  <div className="text-xl font-bold text-slate-900">{parsedData.metrics.dependencyCount}</div>
                </div>
              </div>

              {parsedData.metrics.ignoredNodes.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Filtered Departments</h4>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.metrics.ignoredNodes.map(node => (
                      <span key={node} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded">
                        {node}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {parsedData.metrics.warnings.length > 0 && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} /> Validation Warnings
                  </h4>
                  <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                    {parsedData.metrics.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Target CPM Structure Preview</h4>
                <div className="border border-slate-200 rounded-lg p-4 bg-white max-h-48 overflow-y-auto">
                  {renderTaskTree(parsedData.tasks)}
                </div>
              </div>

            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-black rounded-full animate-spin mb-6"></div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{importProgress.message}</h3>
              <p className="text-slate-500 text-sm mb-6">Please do not close this window.</p>
              
              <div className="w-full max-w-md bg-slate-100 rounded-full h-2 mb-2">
                <div 
                  className="bg-black h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="text-xs text-slate-500">
                {importProgress.current} / {importProgress.total} completed
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Import Successful!</h3>
              <p className="text-slate-500 max-w-md mb-8">
                Your ProjectLibre schedule has been successfully converted and imported into the CPM workspace.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    onClose();
                    router.push('/projects');
                  }}
                  className="px-6 py-2 bg-black text-white font-medium rounded-md hover:bg-black/90 transition-colors"
                >
                  View Projects
                </button>
              </div>
            </div>
          )}

        </div>

        {step === 'preview' && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <button 
              onClick={handleReset}
              className="px-4 py-2 text-slate-600 font-medium text-sm hover:text-slate-900"
            >
              Cancel
            </button>
            <button 
              onClick={executeImport}
              className="px-6 py-2 bg-black text-white font-medium text-sm rounded-md shadow-sm hover:bg-black/90 transition-colors flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              Confirm & Import
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
