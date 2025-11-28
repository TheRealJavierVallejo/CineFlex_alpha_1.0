/*
 * 📂 COMPONENT: PROJECT LIBRARY
 * "Startup Window" Design - Clean, Centered, Professional.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectMetadata, ShowToastFn, ToastNotification } from '../../types';
import { getProjectsList, createNewProject, deleteProject, exportProjectToJSON, importProjectFromJSON } from '../../services/storage';
import { Plus, Trash2, Download, Upload, Search, FileText, Film, Users, Clock, MoreHorizontal, Layout, LayoutGrid, X } from 'lucide-react';
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
      // Sort by last modified descending
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

   const handleDelete = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selection) return;
      const proj = projects.find(p => p.id === selection);
      if (proj) setConfirmDelete({ id: proj.id, name: proj.name });
   };

   const confirmDeletion = async () => {
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
      <div className="h-screen w-screen bg-[#050505] text-[#E4E4E7] flex items-center justify-center font-sans">
         <ToastContainer toasts={toasts} onClose={closeToast} />
         
         {/* MAIN WINDOW */}
         <div className="w-[900px] h-[600px] bg-[#121212] border border-[#27272A] rounded-lg shadow-2xl flex overflow-hidden">
            
            {/* SIDEBAR */}
            <div className="w-64 bg-[#18181B] border-r border-[#27272A] flex flex-col p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shadow-glow">
                        <Film className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold tracking-tight text-white leading-none">CINESKETCH</h1>
                        <span className="text-[10px] text-text-tertiary font-mono">STUDIO PRO v2.5</span>
                    </div>
                </div>

                <div className="space-y-6 flex-1">
                    <div>
                        <div className="text-[10px] font-bold text-text-tertiary uppercase mb-2">Create</div>
                        <Button 
                            variant="primary" 
                            className="w-full justify-center" 
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => document.getElementById('new-proj-input')?.focus()}
                        >
                            New Project
                        </Button>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold text-text-tertiary uppercase mb-2">Actions</div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-8 flex items-center gap-2 px-3 rounded hover:bg-white/5 text-sm text-text-secondary hover:text-white transition-colors"
                        >
                            <Upload className="w-4 h-4" /> Import Project
                            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                        </button>
                    </div>
                </div>

                <div className="text-[10px] text-text-tertiary text-center pt-6 border-t border-[#27272A]">
                    Local Storage • No Cloud Sync
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col bg-[#09090b]">
                {/* Header */}
                <div className="h-14 border-b border-[#27272A] flex items-center justify-between px-6 bg-[#121212]">
                    <h2 className="font-semibold">Recent Projects</h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                        <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="bg-[#18181B] border border-[#27272A] rounded h-8 pl-8 pr-3 text-xs text-white focus:border-primary outline-none w-48 transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {filteredProjects.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
                            <FileText className="w-12 h-12 mb-2" />
                            <p className="text-sm">No projects found</p>
                        </div>
                    ) : (
                        filteredProjects.map(proj => (
                            <div 
                                key={proj.id}
                                onClick={() => setSelection(proj.id)}
                                onDoubleClick={() => openProject(proj.id)}
                                className={`
                                    group flex items-center h-12 px-4 rounded border cursor-pointer transition-all
                                    ${selection === proj.id 
                                        ? 'bg-primary/10 border-primary/50' 
                                        : 'bg-[#121212] border-transparent hover:bg-[#18181B] hover:border-[#27272A]'}
                                `}
                            >
                                <div className="flex-1">
                                    <div className={`font-medium text-sm ${selection === proj.id ? 'text-primary' : 'text-gray-200'}`}>
                                        {proj.name}
                                    </div>
                                    <div className="text-[10px] text-text-tertiary flex gap-2">
                                        <span>Modified: {new Date(proj.lastModified).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{proj.shotCount} Shots</span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => openProject(proj.id)}>Open</Button>
                                    <button 
                                        onClick={handleDelete}
                                        className="p-2 text-text-muted hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Input Area */}
                <div className="p-4 bg-[#121212] border-t border-[#27272A]">
                    <form onSubmit={handleCreate} className="flex gap-3">
                         <input 
                            id="new-proj-input"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="flex-1 bg-[#09090B] border border-[#27272A] rounded h-9 px-3 text-sm focus:border-primary outline-none"
                            placeholder="Enter new project name..."
                         />
                         <Button 
                            variant="primary" 
                            disabled={!newProjectName.trim()}
                            loading={isCreating}
                         >
                            Create Project
                         </Button>
                    </form>
                </div>
            </div>
         </div>

         {/* Delete Modal */}
         {confirmDelete && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] animate-in fade-in">
                <div className="bg-[#18181B] border border-[#27272A] p-6 rounded-lg w-96 shadow-xl">
                    <h3 className="font-bold text-white mb-2">Delete Project?</h3>
                    <p className="text-sm text-text-secondary mb-6">
                        Are you sure you want to delete <strong className="text-white">{confirmDelete.name}</strong>? This cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                        <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDeletion}>Delete Forever</Button>
                    </div>
                </div>
            </div>
         )}
      </div>
   );
};