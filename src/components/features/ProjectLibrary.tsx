/*
 * 📂 COMPONENT: PROJECT LIBRARY (Data Table)
 * ONYX Edition: Sharp, Technical, Branding Update
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectMetadata, ShowToastFn, ToastNotification } from '../../types';
import { getProjectsList, createNewProject, deleteProject, exportProjectToJSON, importProjectFromJSON } from '../../services/storage';
import { Plus, Trash2, Download, Upload, FileText, Loader2, Film } from 'lucide-react';
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
      <div className="h-screen w-screen bg-black text-text-primary flex flex-col font-sans selection:bg-primary/30 selection:text-white overflow-hidden">
         <ToastContainer toasts={toasts} onClose={closeToast} />

         {/* Toolbar */}
         <div className="h-14 border-b border-border flex items-center justify-between px-8 bg-[#050505] shrink-0 z-10">
            <div className="flex items-center gap-8">
               
               {/* CINEFLEX BRANDING */}
               <div className="flex items-center gap-3 select-none">
                  {/* Icon: Film Reel */}
                  <div className="w-8 h-8 bg-black border border-zinc-800 flex items-center justify-center relative overflow-hidden rounded-full">
                      <Film className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xl tracking-tight font-bold text-white">CineFlex</span>
               </div>
               
               <div className="h-8 w-[1px] bg-zinc-800" />
               
               <form onSubmit={handleCreate} className="flex items-center gap-0">
                  <input
                     className="w-64 h-9 bg-black border border-border border-r-0 rounded-l-sm px-3 text-sm focus:border-primary outline-none transition-colors"
                     placeholder="New Project Name..."
                     value={newProjectName}
                     onChange={e => setNewProjectName(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={!newProjectName.trim() || isCreating} 
                    className="h-9 px-4 rounded-r-sm bg-zinc-900 border border-border hover:bg-zinc-800 hover:text-white text-zinc-400 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
                  </button>
               </form>
            </div>

            <div className="flex items-center gap-3">
               <button onClick={() => fileInputRef.current?.click()} className="h-9 px-4 rounded-sm bg-black border border-border hover:border-zinc-600 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all">
                  <Upload className="w-3.5 h-3.5" /> Import
               </button>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
         </div>

         {/* Data Table Header */}
         <div className="flex items-center px-8 h-10 bg-[#09090b] border-b border-border text-[10px] font-bold text-zinc-500 uppercase tracking-widest select-none shrink-0">
            <div className="flex-[2] pl-2">Project Name</div>
            <div className="flex-1">Shots</div>
            <div className="flex-1">Cast</div>
            <div className="flex-1">Last Modified</div>
            <div className="w-24 text-center">Actions</div>
         </div>

         {/* Table Body */}
         <div className="flex-1 overflow-y-auto bg-black p-0">
            <div className="w-full">
                {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-zinc-700">
                    <div className="w-20 h-20 bg-[#050505] rounded-sm flex items-center justify-center mb-6 border border-zinc-900">
                        <FileText className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm font-mono uppercase tracking-widest">No projects found</p>
                </div>
                ) : (
                <div className="flex flex-col">
                    {projects.map(proj => (
                        <div
                            key={proj.id}
                            onClick={() => setSelection(proj.id)}
                            onDoubleClick={() => openProject(proj.id)}
                            className={`
                        group flex items-center px-8 h-12 border-b border-border/50 cursor-pointer text-sm transition-colors
                        ${selection === proj.id ? 'bg-primary/5 text-white' : 'hover:bg-[#09090b] text-zinc-400 hover:text-zinc-200'}
                        `}
                        >
                            <div className="flex-[2] pl-2 font-medium flex items-center gap-4 truncate">
                            <div className={`w-2 h-2 rounded-full ${selection === proj.id ? 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-zinc-800 group-hover:bg-zinc-600'}`} />
                            <span className="font-mono">{proj.name}</span>
                            </div>
                            <div className="flex-1 opacity-60 group-hover:opacity-100 transition-opacity text-xs font-mono">{proj.shotCount} shots</div>
                            <div className="flex-1 opacity-60 group-hover:opacity-100 transition-opacity text-xs font-mono">{proj.characterCount || 0} characters</div>
                            <div className="flex-1 opacity-40 group-hover:opacity-100 transition-opacity font-mono text-[10px]">
                            {new Date(proj.lastModified).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="w-24 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => handleExport(proj.id, proj.name, e)} className="p-1.5 hover:bg-white/10 rounded-sm text-zinc-500 hover:text-white transition-colors" title="Export JSON">
                                <Download className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => handleDelete(proj.id, proj.name, e)} className="p-1.5 hover:bg-red-500/20 rounded-sm text-zinc-500 hover:text-red-500 transition-colors" title="Delete Project">
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
         <div className="h-8 bg-[#050505] border-t border-border text-[9px] flex items-center px-8 font-mono select-none text-zinc-600 uppercase tracking-widest justify-between shrink-0">
            <span>CINEFLEX SYSTEM v3.1</span>
            <span>{projects.length} PROJECTS INDEXED</span>
         </div>

         {/* Delete Confirmation Modal */}
         {confirmDelete && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setConfirmDelete(null)}>
               <div className="bg-[#09090b] border border-border rounded-sm p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Trash2 className="w-4 h-4 text-red-500" /> Confirm Deletion
                  </h3>
                  <p className="text-zinc-400 text-xs mb-8 leading-relaxed font-mono">
                     Permanently delete project <strong className="text-white">"{confirmDelete.name}"</strong>? <br/>
                     This action is irreversible.
                  </p>
                  <div className="flex gap-3 justify-end">
                     <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-4 py-2 rounded-sm border border-border text-zinc-400 hover:text-white hover:border-zinc-500 text-xs uppercase font-bold tracking-wide transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={confirmDeletion}
                        className="px-4 py-2 rounded-sm bg-red-900/50 hover:bg-red-900 border border-red-900 hover:border-red-500 text-red-100 text-xs uppercase font-bold tracking-wide transition-colors"
                     >
                        Delete
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};