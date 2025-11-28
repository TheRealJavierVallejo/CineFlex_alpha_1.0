/*
 * 📂 COMPONENT: PROJECT LIBRARY
 * Design Reference: DaVinci Resolve Project Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectMetadata, ShowToastFn, ToastNotification } from '../../types';
import { getProjectsList, createNewProject, deleteProject, importProjectFromJSON } from '../../services/storage';
import { Plus, Trash2, Upload, Search, Film, Clock, Monitor } from 'lucide-react';
import { ToastContainer } from '../features/Toast';
import Button from '../ui/Button';

export const ProjectLibrary: React.FC = () => {
   const navigate = useNavigate();
   const [projects, setProjects] = useState<ProjectMetadata[]>([]);
   const [search, setSearch] = useState('');
   const [isCreating, setIsCreating] = useState(false);
   const [newProjectName, setNewProjectName] = useState('');
   const [selection, setSelection] = useState<string | null>(null);
   const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
   const [toasts, setToasts] = useState<ToastNotification[]>([]);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => { loadProjects(); }, []);

   const showToast: ShowToastFn = (message, type = 'info', action) => {
       const id = Date.now();
       setToasts(prev => [...prev, { id, message, type, action }]);
   };
   const closeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

   const loadProjects = () => {
      const list = getProjectsList();
      setProjects(list.sort((a, b) => b.lastModified - a.lastModified));
   };

   const openProject = (id: string) => navigate(`/project/${id}`);

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProjectName.trim()) return;
      setIsCreating(true);
      try {
         const id = await createNewProject(newProjectName);
         openProject(id);
      } catch (error) {
         showToast("Failed to create project", 'error');
      } finally {
         setIsCreating(false);
      }
   };

   const handleDelete = async () => {
      if (!confirmDelete) return;
      await deleteProject(confirmDelete.id);
      loadProjects();
      setSelection(null);
      setConfirmDelete(null);
      showToast("Project deleted", 'info');
   };

   const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
         try {
            await importProjectFromJSON(event.target?.result as string);
            loadProjects();
            showToast("Project imported", 'success');
         } catch (error) {
            showToast("Import failed", 'error');
         } finally {
             if (fileInputRef.current) fileInputRef.current.value = '';
         }
      };
      reader.readAsText(file);
   };

   // Derived state
   const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

   return (
      <div className="h-screen w-screen bg-[#1c1c1c] text-[#E4E4E7] flex items-center justify-center font-sans overflow-hidden">
         <ToastContainer toasts={toasts} onClose={closeToast} />
         
         {/* WINDOW CONTAINER */}
         <div className="w-full max-w-5xl h-[700px] bg-[#121212] border border-[#333] shadow-2xl flex flex-col rounded-md overflow-hidden animate-in fade-in duration-300">
            
            {/* TITLE BAR */}
            <div className="h-12 bg-[#1f1f1f] border-b border-[#333] flex items-center justify-between px-6 shrink-0 select-none">
                <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" />
                    <span className="font-bold tracking-wide text-sm text-[#eee]">PROJECT MANAGER</span>
                </div>
                <div className="flex items-center gap-4">
                     <span className="text-xs text-text-tertiary">Local Database</span>
                     <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#333]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#333]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#333]"></div>
                     </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* SIDEBAR */}
                <div className="w-64 bg-[#181818] border-r border-[#333] flex flex-col p-4">
                    <div className="mb-6">
                        <div className="text-[10px] font-bold text-text-tertiary uppercase mb-2 px-2">Databases</div>
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/10 text-primary rounded-sm text-xs font-bold border border-primary/20 cursor-default">
                             <Monitor className="w-3.5 h-3.5" />
                             Local DB
                        </div>
                    </div>

                    <div className="flex-1"></div>

                    <div className="space-y-2 border-t border-[#333] pt-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full nle-btn nle-btn-secondary justify-center"
                        >
                            <Upload className="w-3.5 h-3.5" /> Import Project
                            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                        </button>
                    </div>
                </div>

                {/* PROJECT GRID */}
                <div className="flex-1 bg-[#0a0a0a] flex flex-col relative">
                    
                    {/* TOOLBAR */}
                    <div className="h-12 flex items-center justify-between px-6 border-b border-[#27272a] shrink-0">
                        <div className="text-sm font-medium text-[#ccc]">Projects ({filteredProjects.length})</div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                            <input 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search projects..."
                                className="w-full bg-[#181818] border border-[#333] h-8 rounded-sm pl-8 pr-2 text-xs text-white focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* SCROLL AREA */}
                    <div className="flex-1 overflow-y-auto p-6" onClick={() => setSelection(null)}>
                        <div className="grid grid-cols-4 lg:grid-cols-5 gap-4 content-start">
                            
                            {/* Create New Card */}
                            <div 
                                className="aspect-[1.3] border border-[#333] border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-[#151515] transition-all group"
                                onClick={() => document.getElementById('new-proj-input')?.focus()}
                            >
                                <div className="w-10 h-10 rounded-full bg-[#1f1f1f] flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-text-tertiary group-hover:text-text-primary">Create New</span>
                            </div>

                            {/* Project Cards */}
                            {filteredProjects.map(proj => (
                                <div 
                                    key={proj.id}
                                    onClick={(e) => { e.stopPropagation(); setSelection(proj.id); }}
                                    onDoubleClick={() => openProject(proj.id)}
                                    className={`
                                        relative group flex flex-col rounded-md overflow-hidden cursor-pointer border transition-all
                                        ${selection === proj.id 
                                            ? 'border-primary ring-1 ring-primary bg-[#1f1f1f]' 
                                            : 'border-[#27272a] bg-[#121212] hover:bg-[#181818]'}
                                    `}
                                >
                                    {/* Thumbnail Placeholder */}
                                    <div className="aspect-video w-full bg-[#050505] flex items-center justify-center relative overflow-hidden">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center">
                                            <span className="text-xl font-bold text-[#333]">{proj.name.charAt(0)}</span>
                                        </div>
                                        
                                        {/* Overlay Actions */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: proj.id, name: proj.name }); }}
                                                className="p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-sm"
                                             >
                                                <Trash2 className="w-3.5 h-3.5" />
                                             </button>
                                        </div>
                                    </div>

                                    <div className="p-3">
                                        <div className={`font-bold text-xs mb-1 truncate ${selection === proj.id ? 'text-primary' : 'text-gray-300'}`}>
                                            {proj.name}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(proj.lastModified).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* FOOTER INPUT */}
                    <div className="h-16 border-t border-[#333] bg-[#121212] flex items-center px-6 gap-4 shrink-0">
                         <div className="text-xs font-bold text-text-secondary w-24">New Project:</div>
                         <form onSubmit={handleCreate} className="flex-1 flex gap-2">
                             <input 
                                id="new-proj-input"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="nle-input flex-1 h-9"
                                placeholder="Enter project name..."
                             />
                             <Button 
                                type="submit"
                                variant="primary" 
                                disabled={!newProjectName.trim()} 
                                loading={isCreating}
                                className="h-9 px-6"
                             >
                                Create
                             </Button>
                         </form>
                    </div>
                </div>
            </div>
         </div>

         {/* Delete Confirmation Modal */}
         {confirmDelete && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]">
                <div className="bg-[#18181B] border border-[#333] p-6 rounded-md w-96 shadow-xl">
                    <h3 className="font-bold text-white mb-2">Delete Project?</h3>
                    <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                        Are you sure you want to delete <strong className="text-white">{confirmDelete.name}</strong>? 
                        <br/>This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete}>Delete Project</Button>
                    </div>
                </div>
            </div>
         )}
      </div>
   );
};