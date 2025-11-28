/*
 * 📂 COMPONENT: PROJECT LIBRARY (Data Table)
 * Premium Desktop UI - High Density Table & Sharp Corners
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectMetadata, ShowToastFn, ToastNotification } from '../../types';
import { getProjectsList, createNewProject, deleteProject, exportProjectToJSON, importProjectFromJSON } from '../../services/storage';
import { Plus, Trash2, Download, Upload, FileText, Loader2 } from 'lucide-react';
import { ToastContainer } from '../features/Toast';

export const ProjectLibrary: React.FC = () => {
   const navigate = useNavigate();
   const [projects, setProjects] = useState<ProjectMetadata[]>([]);
   const [isCreating, setIsCreating] = useState(false);
   const [newProjectName, setNewProjectName] = useState('');
   const [selection, setSelection] = useState<string | null>(null);
   const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
   const [toasts, setToasts] = useState<ToastNotification[]>([]);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      loadProjects();
   }, []);

   const showToast: ShowToastFn = (message, type = 'info', action) => {
       const id = Date.now();
       setToasts(prev => [...prev, { id, message, type, action }]);
   };
   const closeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

   const loadProjects = () => {
      const list = getProjectsList();
      setProjects(list);
   };

   const openProject = (id: string) => {
       navigate(`/project/${id}`);
   };

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProjectName.trim()) return;
      setIsCreating(true);
      try {
         const id = await createNewProject(newProjectName);
         setNewProjectName('');
         openProject(id);
      } catch (error) {
         showToast("Failed to create project", 'error');
      } finally {
         setIsCreating(false);
      }
   };

   const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setConfirmDelete({ id, name });
   };

   const confirmDeletion = async () => {
      if (!confirmDelete) return;
      await deleteProject(confirmDelete.id);
      loadProjects();
      showToast("Project deleted", 'info');
      setConfirmDelete(null);
   };

   const handleExport = async (id: string, name: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
         const json = await exportProjectToJSON(id);
         const blob = new Blob([json], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `${name.replace(/\s+/g, '_')}.json`;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
         showToast("Exported", 'success');
      } catch (error) {
         showToast("Export failed", 'error');
      }
   };

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
         try {
            await importProjectFromJSON(event.target?.result as string);
            loadProjects();
            showToast("Imported", 'success');
         } catch (error) {
            showToast("Import failed", 'error');
         } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
         }
      };
      reader.readAsText(file);
   };

   return (
      <div className="h-screen w-screen bg-background text-text-primary flex flex-col font-sans selection:bg-primary/30 selection:text-white">
         <ToastContainer toasts={toasts} onClose={closeToast} />

         {/* Toolbar */}
         <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0 z-10">
            <div className="flex items-center gap-6">
               <div className="font-bold text-text-primary text-sm tracking-wide flex items-center gap-3">
                  {/* Sharper Logo Icon */}
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-700 rounded-md flex items-center justify-center shadow-lg shadow-blue-900/20">
                     <div className="w-3 h-3 bg-white rounded-[1px]" />
                  </div>
                  <span className="text-base tracking-tight font-semibold">CineSketch Studio</span>
               </div>
               
               <div className="h-5 w-[1px] bg-border" />
               
               <form onSubmit={handleCreate} className="flex items-center gap-2">
                  <input
                     className="studio-input w-64 h-8 bg-background focus:bg-surface-secondary transition-colors"
                     placeholder="New Project Name..."
                     value={newProjectName}
                     onChange={e => setNewProjectName(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={!newProjectName.trim() || isCreating} 
                    className="h-8 px-4 rounded bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:shadow-none"
                  >
                     {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
                  </button>
               </form>
            </div>

            <div className="flex items-center gap-3">
               <button onClick={() => fileInputRef.current?.click()} className="h-8 px-3 rounded bg-surface-secondary hover:bg-surface hover:text-white border border-border text-text-secondary text-xs font-medium flex items-center gap-2 transition-all">
                  <Upload className="w-3.5 h-3.5" /> Import Project
               </button>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
         </div>

         {/* Data Table Header */}
         <div className="flex items-center px-6 h-9 bg-surface-secondary border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider select-none shrink-0">
            <div className="flex-[2] pl-2">Project Name</div>
            <div className="flex-1">Shots</div>
            <div className="flex-1">Cast</div>
            <div className="flex-1">Last Modified</div>
            <div className="w-24 text-center">Actions</div>
         </div>

         {/* Table Body */}
         <div className="flex-1 overflow-y-auto bg-background p-6">
            <div className="max-w-[1920px] mx-auto">
                {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-text-muted">
                    <div className="w-16 h-16 bg-surface-secondary rounded-lg flex items-center justify-center mb-4 border border-border">
                        <FileText className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm">No projects found</p>
                    <p className="text-xs mt-2 opacity-50">Create one above to get started</p>
                </div>
                ) : (
                <div className="flex flex-col rounded-md border border-border overflow-hidden bg-surface shadow-sm">
                    {projects.map(proj => (
                        <div
                            key={proj.id}
                            onClick={() => setSelection(proj.id)}
                            onDoubleClick={() => openProject(proj.id)}
                            className={`
                        group flex items-center px-6 h-10 border-b border-border last:border-0 cursor-default text-sm transition-all
                        ${selection === proj.id ? 'bg-primary/10 text-text-primary' : 'hover:bg-surface-secondary/50 text-text-secondary hover:text-text-primary'}
                        `}
                        >
                            <div className="flex-[2] pl-2 font-medium flex items-center gap-3 truncate">
                            <div className={`p-1 rounded-sm ${selection === proj.id ? 'bg-primary/20 text-primary' : 'bg-surface-secondary text-text-tertiary group-hover:text-text-primary'}`}>
                                <FileText className="w-3.5 h-3.5" />
                            </div>
                            {proj.name}
                            </div>
                            <div className="flex-1 opacity-70 group-hover:opacity-100 transition-opacity text-xs">{proj.shotCount} shots</div>
                            <div className="flex-1 opacity-70 group-hover:opacity-100 transition-opacity text-xs">{proj.characterCount || 0} characters</div>
                            <div className="flex-1 opacity-50 group-hover:opacity-100 transition-opacity font-mono text-[10px]">
                            {new Date(proj.lastModified).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="w-24 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => handleExport(proj.id, proj.name, e)} className="p-1.5 hover:bg-background rounded text-text-tertiary hover:text-text-primary transition-colors" title="Export JSON">
                                <Download className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => handleDelete(proj.id, proj.name, e)} className="p-1.5 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors" title="Delete Project">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>
         </div>

         {/* Status Footer */}
         <div className="h-7 bg-surface border-t border-border text-[10px] flex items-center px-6 font-medium select-none text-text-tertiary justify-between shrink-0">
            <span>v3.0.0 (Pro Studio)</span>
            <span>{projects.length} Projects Loaded</span>
         </div>

         {/* Delete Confirmation Modal */}
         {confirmDelete && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in" onClick={() => setConfirmDelete(null)}>
               <div className="bg-surface border border-border rounded-lg p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-base font-bold text-text-primary mb-2">Delete Project?</h3>
                  <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                     Are you sure you want to permanently delete <strong className="text-text-primary">{confirmDelete.name}</strong>? This action cannot be undone.
                  </p>
                  <div className="flex gap-2 justify-end">
                     <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-4 py-2 rounded bg-surface-secondary hover:bg-surface border border-border text-text-primary text-xs uppercase font-bold tracking-wide transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={confirmDeletion}
                        className="px-4 py-2 rounded bg-error hover:bg-error/90 text-white text-xs uppercase font-bold tracking-wide transition-colors shadow-lg shadow-red-900/20"
                     >
                        Delete Project
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};