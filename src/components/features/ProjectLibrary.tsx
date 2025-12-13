/*
 * 📂 COMPONENT: PROJECT LIBRARY (Data Table)
 * ONYX Edition - Themed
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectMetadata, ShowToastFn, ToastNotification } from '../../types';
import { getProjectsList, createNewProject, deleteProject, exportProjectToJSON, importProjectFromJSON } from '../../services/storage';
import { Plus, Trash2, Download, Upload, FileText, Loader2, Film, Settings, LogIn, User } from 'lucide-react';
import { ToastContainer } from '../features/Toast';
import { AppSettings } from './AppSettings';
import { supabase } from '../../supabaseClient';

export const ProjectLibrary: React.FC = () => {
   const navigate = useNavigate();
   const [projects, setProjects] = useState<ProjectMetadata[]>([]);
   const [isCreating, setIsCreating] = useState(false);
   const [newProjectName, setNewProjectName] = useState('');
   const [selection, setSelection] = useState<string | null>(null);
   const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
   const [showSettings, setShowSettings] = useState(false);
   const [toasts, setToasts] = useState<ToastNotification[]>([]);
   const [user, setUser] = useState<any>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      loadProjects();
      checkUser();

      // Apply theme on load for the landing page
      const savedColor = localStorage.getItem('cinesketch_theme_color');
      if (savedColor) {
         document.documentElement.style.setProperty('--color-primary', savedColor);
         const r = parseInt(savedColor.slice(1, 3), 16);
         const g = parseInt(savedColor.slice(3, 5), 16);
         const b = parseInt(savedColor.slice(5, 7), 16);
         document.documentElement.style.setProperty('--color-primary-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
      }
   }, []);

   const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
   };

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
      <div className="h-screen w-screen bg-background text-text-primary flex flex-col font-sans">
         <ToastContainer toasts={toasts} onClose={closeToast} />

         {showSettings && <AppSettings onClose={() => setShowSettings(false)} showToast={showToast} />}

         {/* Toolbar */}
         <div className="h-14 border-b border-border flex items-center justify-between px-8 bg-background shrink-0 z-10">
            <div className="flex items-center gap-8">

               {/* CINEFLEX BRANDING */}
               <div className="flex items-center gap-3 select-none group cursor-default">
                  <div className="w-8 h-8 bg-surface border border-border group-hover:border-primary/50 flex items-center justify-center relative overflow-hidden rounded-full transition-colors duration-300">
                     <Film className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-xl tracking-tight font-bold text-text-primary">CineFlex</span>
               </div>

               <div className="h-8 w-[1px] bg-border" />

               <form onSubmit={handleCreate} className="flex items-center gap-0 group/create">
                  <input
                     className="w-64 h-9 bg-surface border border-border border-r-0 rounded-l-sm px-3 text-sm focus:border-primary outline-none transition-colors text-text-primary placeholder:text-text-muted group-hover/create:border-r-primary"
                     placeholder="New Project Name..."
                     value={newProjectName}
                     onChange={e => setNewProjectName(e.target.value)}
                  />
                  <button
                     type="submit"
                     disabled={!newProjectName.trim() || isCreating}
                     className="h-9 px-4 rounded-r-sm bg-surface-secondary border border-border group-hover/create:border-l-primary hover:bg-primary hover:text-white hover:border-primary text-text-secondary text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
                  </button>
               </form>
            </div>

            <div className="flex items-center gap-3">
               <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-4 rounded-sm bg-surface border border-border hover:border-primary text-text-secondary hover:text-primary text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all"
               >
                  <Upload className="w-3.5 h-3.5" /> Import
               </button>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

               <div className="h-8 w-[1px] bg-border mx-2" />

               {user ? (
                  <button
                     onClick={() => setShowSettings(true)}
                     className="h-9 px-3 rounded-sm bg-surface border border-border hover:border-primary text-text-secondary hover:text-primary text-xs font-bold flex items-center gap-2 transition-all"
                     title="Account Settings"
                  >
                     <User className="w-3.5 h-3.5" />
                     <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
                  </button>
               ) : (
                  <button
                     onClick={() => navigate('/auth')}
                     className="h-9 px-4 rounded-sm bg-primary text-white hover:bg-primary-hover text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-glow"
                  >
                     <LogIn className="w-3.5 h-3.5" /> Sign In
                  </button>
               )}

               <button
                  onClick={() => setShowSettings(true)}
                  className="h-9 w-9 rounded-sm bg-surface border border-border hover:border-primary text-text-secondary hover:text-primary flex items-center justify-center transition-all"
                  title="App Settings"
               >
                  <Settings className="w-4 h-4" />
               </button>
            </div>
         </div>

         {/* Data Table Header */}
         <div className="flex items-center px-8 h-10 bg-surface border-b border-border text-[10px] font-bold text-text-secondary uppercase tracking-widest select-none shrink-0">
            <div className="flex-[2] pl-2">Project Name</div>
            <div className="flex-1">Shots</div>
            <div className="flex-1">Cast</div>
            <div className="flex-1">Last Modified</div>
            <div className="w-24 text-center">Actions</div>
         </div>

         {/* Table Body */}
         <div className="flex-1 overflow-y-auto bg-background p-0">
            <div className="w-full">
               {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-text-muted">
                     <div className="w-20 h-20 bg-surface rounded-sm flex items-center justify-center mb-6 border border-border">
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
                        ${selection === proj.id ? 'bg-primary/5 text-text-primary' : 'hover:bg-surface text-text-secondary hover:text-text-primary'}
                        `}
                        >
                           <div className="flex-[2] pl-2 font-medium flex items-center gap-4 truncate">
                              {/* Selection Indicator - Now glows with primary color */}
                              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${selection === proj.id ? 'bg-primary shadow-[0_0_8px_var(--color-primary)] scale-110' : 'bg-border group-hover:bg-primary/50'}`} />
                              <span className={`font-mono transition-colors ${selection === proj.id ? 'text-primary font-bold' : ''}`}>{proj.name}</span>
                           </div>
                           <div className="flex-1 opacity-60 group-hover:opacity-100 transition-opacity text-xs font-mono">{proj.shotCount} shots</div>
                           <div className="flex-1 opacity-60 group-hover:opacity-100 transition-opacity text-xs font-mono">{proj.characterCount || 0} characters</div>
                           <div className="flex-1 opacity-40 group-hover:opacity-100 transition-opacity font-mono text-[10px]">
                              {new Date(proj.lastModified).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                           </div>
                           <div className="w-24 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => handleExport(proj.id, proj.name, e)} className="p-1.5 hover:bg-surface-secondary rounded-sm text-text-secondary hover:text-text-primary transition-colors" title="Export JSON">
                                 <Download className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => handleDelete(proj.id, proj.name, e)} className="p-1.5 hover:bg-red-500/20 rounded-sm text-text-secondary hover:text-red-500 transition-colors" title="Delete Project">
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
         <div className="h-8 bg-background border-t border-border text-[9px] flex items-center px-8 font-mono select-none text-text-secondary uppercase tracking-widest justify-between shrink-0">
            <span>CINEFLEX SYSTEM v3.1</span>
            <span>{projects.length} PROJECTS INDEXED</span>
         </div>

         {/* Delete Confirmation Modal */}
         {confirmDelete && (
            <div className="fixed inset-0 modal-bg-dark flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setConfirmDelete(null)}>
               <div className="bg-surface border border-border rounded-sm p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Trash2 className="w-4 h-4 text-red-500" /> Confirm Deletion
                  </h3>
                  <p className="text-text-secondary text-xs mb-8 leading-relaxed font-mono">
                     Permanently delete project <strong className="text-text-primary">"{confirmDelete.name}"</strong>? <br />
                     This action is irreversible.
                  </p>
                  <div className="flex gap-3 justify-end">
                     <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-4 py-2 rounded-sm border border-border text-text-secondary hover:text-text-primary hover:border-text-muted text-xs uppercase font-bold tracking-wide transition-colors"
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