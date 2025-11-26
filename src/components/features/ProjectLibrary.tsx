
/*
 * 📂 COMPONENT: PROJECT LIBRARY (Data Table)
 * Premium Desktop UI - High Density Table
 */

import React, { useState, useEffect, useRef } from 'react';
import { ProjectMetadata, ShowToastFn } from '../../types';
import { getProjectsList, createNewProject, deleteProject, exportProjectToJSON, importProjectFromJSON } from '../../services/storage';
import { Plus, Trash2, Download, Upload, Search, FileText, Film, Users, Clock, MoreHorizontal } from 'lucide-react';

interface ProjectLibraryProps {
   onOpenProject: (projectId: string) => void;
   showToast: ShowToastFn;
}

export const ProjectLibrary: React.FC<ProjectLibraryProps> = ({ onOpenProject, showToast }) => {
   const [projects, setProjects] = useState<ProjectMetadata[]>([]);
   const [isCreating, setIsCreating] = useState(false);
   const [newProjectName, setNewProjectName] = useState('');
   const [isLoading, setIsLoading] = useState(true);
   const [selection, setSelection] = useState<string | null>(null);
   const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      loadProjects();
   }, []);

   const loadProjects = () => {
      const list = getProjectsList();
      setProjects(list);
      setIsLoading(false);
   };

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProjectName.trim()) return;
      setIsCreating(true);
      try {
         const id = await createNewProject(newProjectName);
         setNewProjectName('');
         onOpenProject(id);
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
      <div className="h-screen w-screen bg-[#1E1E1E] text-[#CCCCCC] flex flex-col font-sans">

         {/* Toolbar */}
         <div className="h-12 border-b border-[#333] flex items-center justify-between px-4 bg-[#252526]">
            <div className="flex items-center gap-4">
               <div className="font-bold text-[#E8E8E8] text-sm tracking-wide flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#007ACC] rounded-sm" /> CINESKETCH
               </div>
               <div className="h-4 w-[1px] bg-[#333]" />
               <form onSubmit={handleCreate} className="flex items-center gap-2">
                  <input
                     className="app-input w-48"
                     placeholder="New Project Name..."
                     value={newProjectName}
                     onChange={e => setNewProjectName(e.target.value)}
                  />
                  <button type="submit" disabled={!newProjectName.trim()} className="app-btn app-btn-primary">
                     <Plus className="w-3.5 h-3.5" /> Create
                  </button>
               </form>
            </div>

            <div className="flex items-center gap-2">
               <button onClick={() => fileInputRef.current?.click()} className="app-btn app-btn-secondary">
                  <Upload className="w-3.5 h-3.5" /> Import
               </button>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
         </div>

         {/* Data Table Header */}
         <div className="flex items-center px-4 h-8 bg-[#1E1E1E] border-b border-[#333] text-xs font-bold text-[#969696] uppercase tracking-wider select-none">
            <div className="flex-[2] pl-2">Project Name</div>
            <div className="flex-1">Shots</div>
            <div className="flex-1">Cast</div>
            <div className="flex-1">Last Modified</div>
            <div className="w-20 text-center">Actions</div>
         </div>

         {/* Table Body */}
         <div className="flex-1 overflow-y-auto bg-[#18181B]">
            {projects.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-[#505050]">
                  <FileText className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">No projects found</p>
               </div>
            ) : (
               <div className="flex flex-col">
                  {projects.map(proj => (
                     <div
                        key={proj.id}
                        onClick={() => setSelection(proj.id)}
                        onDoubleClick={() => onOpenProject(proj.id)}
                        className={`
                       group flex items-center px-4 h-9 border-b border-[#252526] cursor-default text-[13px] transition-colors
                       ${selection === proj.id ? 'bg-[#094771] text-white' : 'hover:bg-[#2A2D2E] text-[#CCCCCC]'}
                    `}
                     >
                        <div className="flex-[2] pl-2 font-medium flex items-center gap-2 truncate">
                           <FileText className={`w-3.5 h-3.5 ${selection === proj.id ? 'text-white' : 'text-[#007ACC]'}`} />
                           {proj.name}
                        </div>
                        <div className="flex-1 text-[#969696] group-hover:text-[#CCCCCC]">{proj.shotCount}</div>
                        <div className="flex-1 text-[#969696] group-hover:text-[#CCCCCC]">{proj.characterCount || 0}</div>
                        <div className="flex-1 text-[#969696] group-hover:text-[#CCCCCC] font-mono text-xs">
                           {new Date(proj.lastModified).toLocaleDateString()}
                        </div>
                        <div className="w-20 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                           <button onClick={(e) => handleExport(proj.id, proj.name, e)} className="p-1 hover:bg-white/10 rounded" title="Export">
                              <Download className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={(e) => handleDelete(proj.id, proj.name, e)} className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

         {/* Status Footer */}
         <div className="h-6 bg-[#007ACC] text-white text-[11px] flex items-center px-3 font-medium select-none">
            {projects.length} Projects Loaded
         </div>

         {/* Delete Confirmation Modal */}
         {confirmDelete && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in" onClick={() => setConfirmDelete(null)}>
               <div className="bg-[#252526] border border-[#333] rounded-lg p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-white mb-2">Delete Project?</h3>
                  <p className="text-[#CCCCCC] text-sm mb-4">
                     Are you sure you want to permanently delete "{confirmDelete.name}"? This action cannot be undone.
                  </p>
                  <div className="flex gap-2 justify-end">
                     <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-4 py-2 rounded bg-[#3C3C3C] hover:bg-[#505050] text-white text-sm transition-colors"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={confirmDeletion}
                        className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
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
