/*
 * 📊 COMPONENT: PRODUCTION SPREADSHEET (Option 1)
 * High-Density Data View for Bulk Editing
 */

import React, { useState, useMemo } from 'react';
import { Project, Shot, ShowToastFn } from '../../types';
import { SHOT_TYPES, ASPECT_RATIOS, TIMES_OF_DAY } from '../../constants';
import { Film, Trash2, Edit2, CheckSquare, Square, Filter, ChevronDown, Image as ImageIcon, Link as LinkIcon, Clapperboard, Layers, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

interface ProductionSpreadsheetProps {
  project: Project;
  onUpdateShot: (shot: Shot) => void;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shotId: string) => void;
  onDuplicateShot: (shotId: string) => void;
  showToast: ShowToastFn;
}

export const ProductionSpreadsheet: React.FC<ProductionSpreadsheetProps> = ({
  project,
  onUpdateShot,
  onEditShot,
  onDeleteShot,
  onDuplicateShot,
  showToast
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filters
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterScene, setFilterScene] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // --- HELPER: Get Scene Info ---
  const getSceneInfo = (sceneId?: string) => {
    if (!sceneId) return { sequence: '-', heading: 'Unknown' };
    const scene = project.scenes.find(s => s.id === sceneId);
    return scene ? { sequence: scene.sequence, heading: scene.heading } : { sequence: '?', heading: 'Deleted Scene' };
  };

  // --- DERIVED DATA ---
  const filteredShots = useMemo(() => {
    return project.shots.filter(shot => {
      // 1. Text Search
      const matchesText = (shot.description || '').toLowerCase().includes(filterText.toLowerCase()) ||
                          (shot.notes || '').toLowerCase().includes(filterText.toLowerCase());
      
      // 2. Type Filter
      const matchesType = filterType === 'all' || shot.shotType === filterType;

      // 3. Scene Filter
      const matchesScene = filterScene === 'all' || shot.sceneId === filterScene;

      // 4. Status Filter
      let matchesStatus = true;
      if (filterStatus === 'missing_image') matchesStatus = !shot.generatedImage;
      else if (filterStatus === 'has_image') matchesStatus = !!shot.generatedImage;
      else if (filterStatus === 'script_linked') matchesStatus = (shot.linkedElementIds?.length || 0) > 0;
      else if (filterStatus === 'no_script') matchesStatus = (shot.linkedElementIds?.length || 0) === 0;
      
      return matchesText && matchesType && matchesScene && matchesStatus;
    });
  }, [project.shots, filterText, filterType, filterScene, filterStatus]);

  const allSelected = filteredShots.length > 0 && selectedIds.size === filteredShots.length;

  // --- HANDLERS ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredShots.map(s => s.id)));
    }
  };

  const handleBulkUpdate = (field: keyof Shot, value: any) => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach(id => {
      const shot = project.shots.find(s => s.id === id);
      if (shot) onUpdateShot({ ...shot, [field]: value });
    });
    showToast(`Updated ${selectedIds.size} shots`, 'success');
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} shots?`)) {
      selectedIds.forEach(id => onDeleteShot(id));
      setSelectedIds(new Set());
      showToast("Shots deleted", 'info');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E]">
      
      {/* 1. TOOLBAR */}
      <div className="h-14 border-b border-[#333] flex items-center justify-between px-4 bg-[#252526] shrink-0">
         <div className="flex items-center gap-3 w-full">
             
             {/* Filter Icon */}
             <div className="w-8 h-8 flex items-center justify-center bg-[#1E1E1E] rounded-md border border-[#333]">
                <Filter className="w-4 h-4 text-[#007ACC]" />
             </div>

             {/* Search Input */}
             <div className="relative group">
                <input 
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  placeholder="Search shots..." 
                  className="bg-[#1E1E1E] border border-[#333] rounded-md h-8 pl-3 pr-8 text-xs text-[#E8E8E8] w-48 placeholder-[#606060] outline-none focus:border-[#007ACC] transition-all"
                />
                {filterText && (
                   <button onClick={() => setFilterText('')} className="absolute right-2 top-2 text-[#606060] hover:text-white">
                      <Trash2 className="w-3 h-3" />
                   </button>
                )}
             </div>
             
             <div className="h-6 w-[1px] bg-[#3E3E42] mx-1" />

             {/* Scene Filter */}
             <div className="relative">
                <select 
                  value={filterScene}
                  onChange={e => setFilterScene(e.target.value)}
                  className="h-8 bg-[#1E1E1E] border border-[#333] rounded-md text-xs text-[#E8E8E8] pl-2 pr-8 outline-none focus:border-[#007ACC] appearance-none cursor-pointer min-w-[140px]"
                >
                   <option value="all">All Scenes</option>
                   {project.scenes.map(s => (
                      <option key={s.id} value={s.id}>{s.sequence}. {s.heading}</option>
                   ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#969696] absolute right-2 top-2.5 pointer-events-none" />
             </div>

             {/* Shot Type Filter */}
             <div className="relative">
                <select 
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="h-8 bg-[#1E1E1E] border border-[#333] rounded-md text-xs text-[#E8E8E8] pl-2 pr-8 outline-none focus:border-[#007ACC] appearance-none cursor-pointer min-w-[120px]"
                >
                   <option value="all">All Shot Types</option>
                   {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-[#969696] absolute right-2 top-2.5 pointer-events-none" />
             </div>

             {/* Status Filter */}
             <div className="relative">
                <select 
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="h-8 bg-[#1E1E1E] border border-[#333] rounded-md text-xs text-[#E8E8E8] pl-2 pr-8 outline-none focus:border-[#007ACC] appearance-none cursor-pointer min-w-[130px]"
                >
                   <option value="all">All Status</option>
                   <option value="missing_image">Missing Image</option>
                   <option value="has_image">Has Image</option>
                   <option value="script_linked">Script Linked</option>
                   <option value="no_script">Unlinked</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#969696] absolute right-2 top-2.5 pointer-events-none" />
             </div>

             <div className="flex-1" />

             <div className="text-xs font-mono text-[#707070]">
                {filteredShots.length} / {project.shots.length} SHOTS
             </div>
         </div>
      </div>

      {/* 2. TABLE HEADER */}
      <div className="flex items-center h-9 bg-[#1E1E1E] border-b border-[#333] text-[10px] font-bold text-[#969696] uppercase select-none sticky top-0 z-10 tracking-wider">
         <div className="w-10 flex justify-center cursor-pointer hover:text-white" onClick={toggleAll}>
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#007ACC]" /> : <Square className="w-3.5 h-3.5" />}
         </div>
         <div className="w-10 text-center text-[#E8E8E8]">Sce</div>
         <div className="w-10 text-center">#</div>
         <div className="w-16 text-center">Still</div>
         <div className="flex-[2] px-3 border-l border-[#2A2A2A]">Description / Script</div>
         <div className="w-40 px-3 border-l border-[#2A2A2A]">Scene Assignment</div>
         <div className="w-32 px-2 border-l border-[#2A2A2A]">Shot Type</div>
         <div className="w-24 px-2 border-l border-[#2A2A2A]">Aspect</div>
         <div className="w-32 px-2 border-l border-[#2A2A2A]">Time</div>
         <div className="w-16 text-center border-l border-[#2A2A2A]">Edit</div>
      </div>

      {/* 3. TABLE BODY */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         {filteredShots.map((shot, idx) => {
            const sceneInfo = getSceneInfo(shot.sceneId);
            const isSelected = selectedIds.has(shot.id);
            
            return (
               <div 
                  key={shot.id} 
                  className={`
                    flex items-center h-[72px] border-b border-[#252526] text-[12px] text-[#CCCCCC] transition-colors hover:bg-[#2A2D2E] group
                    ${isSelected ? 'bg-[#2A3744] hover:bg-[#303F4F]' : ''}
                  `}
               >
                  {/* Checkbox */}
                  <div className="w-10 flex justify-center cursor-pointer" onClick={() => toggleSelection(shot.id)}>
                     {isSelected ? <CheckSquare className="w-4 h-4 text-[#007ACC]" /> : <Square className="w-4 h-4 text-[#505050]" />}
                  </div>

                  {/* Scene Number (Sce) */}
                  <div className="w-10 text-center font-bold text-white text-[13px]">{sceneInfo.sequence}</div>

                  {/* Shot Number (#) */}
                  <div className="w-10 text-center font-mono text-[#707070] text-[11px]">{shot.sequence}</div>

                  {/* Visual / Thumbnail */}
                  <div className="w-16 p-1.5 h-full cursor-pointer relative" onClick={() => onEditShot(shot)}>
                     {shot.generatedImage ? (
                        <img src={shot.generatedImage} className="w-full h-full object-cover rounded-[2px] border border-[#333] group-hover:border-[#505050]" />
                     ) : (
                        <div className="w-full h-full bg-[#18181B] rounded-[2px] border border-[#333] flex items-center justify-center group-hover:border-[#505050]">
                           <Film className="w-4 h-4 text-[#333]" />
                        </div>
                     )}
                     {!shot.generatedImage && (
                        <div className="absolute top-0 right-0 p-0.5">
                           <AlertCircle className="w-3 h-3 text-[#E5B557]" />
                        </div>
                     )}
                  </div>

                  {/* Description & Script */}
                  <div className="flex-[2] px-3 flex flex-col justify-center gap-1 border-l border-[#2A2A2A] h-full min-w-0">
                     <div className="flex items-center gap-2">
                         {shot.linkedElementIds && shot.linkedElementIds.length > 0 ? (
                             <div className="flex items-center gap-1 text-[10px] bg-[#007ACC]/20 text-[#007ACC] px-1.5 py-0.5 rounded-sm font-medium shrink-0">
                                <LinkIcon className="w-2.5 h-2.5" />
                                <span>LINKED</span>
                             </div>
                         ) : (
                             <div className="flex items-center gap-1 text-[10px] text-[#505050] px-1.5 py-0.5 border border-[#333] rounded-sm shrink-0">
                                <LinkIcon className="w-2.5 h-2.5" />
                                <span>UNLINKED</span>
                             </div>
                         )}
                         <div className="text-[10px] text-[#707070] font-mono truncate">
                            {shot.id.substring(0,8)}
                         </div>
                     </div>
                     <div className="truncate text-[#E8E8E8] text-[13px] font-medium" title={shot.description}>
                        {shot.description || <span className="text-[#505050] italic">No description</span>}
                     </div>
                     {shot.notes && <div className="truncate text-[#707070] text-[11px] italic">{shot.notes}</div>}
                  </div>

                  {/* Scene Dropdown (Assignment) */}
                  <div className="w-40 px-3 border-l border-[#2A2A2A] h-full flex items-center">
                     <div className="w-full relative group/scene">
                         <select
                             value={shot.sceneId || ''}
                             onChange={(e) => onUpdateShot({ ...shot, sceneId: e.target.value })}
                             className="w-full bg-transparent text-[#969696] group-hover:text-white font-medium outline-none text-[11px] cursor-pointer appearance-none uppercase transition-colors pr-4"
                         >
                             {project.scenes.map(s => (
                                 <option key={s.id} value={s.id} className="text-black">{s.sequence}. {s.heading.substring(0, 20)}...</option>
                             ))}
                         </select>
                         <ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-[#505050] pointer-events-none" />
                     </div>
                  </div>

                  {/* Shot Type */}
                  <div className="w-32 px-2 border-l border-[#2A2A2A] h-full flex items-center">
                     <select 
                        value={shot.shotType}
                        onChange={(e) => onUpdateShot({ ...shot, shotType: e.target.value })}
                        className="w-full bg-transparent text-[#CCCCCC] outline-none text-[12px] cursor-pointer hover:text-white"
                     >
                        {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="w-24 px-2 border-l border-[#2A2A2A] h-full flex items-center">
                     <select 
                        value={shot.aspectRatio || project.settings.aspectRatio}
                        onChange={(e) => onUpdateShot({ ...shot, aspectRatio: e.target.value })}
                        className="w-full bg-transparent text-[#CCCCCC] outline-none text-[12px] cursor-pointer hover:text-white"
                     >
                        {ASPECT_RATIOS.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                  </div>

                  {/* Time of Day */}
                  <div className="w-32 px-2 border-l border-[#2A2A2A] h-full flex items-center">
                     <select 
                        value={shot.timeOfDay || ''}
                        onChange={(e) => onUpdateShot({ ...shot, timeOfDay: e.target.value || undefined })}
                        className="w-full bg-transparent text-[#CCCCCC] outline-none text-[12px] cursor-pointer hover:text-white"
                     >
                        <option value="">Default</option>
                        {TIMES_OF_DAY.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                  </div>

                  {/* Actions */}
                  <div className="w-16 border-l border-[#2A2A2A] h-full flex items-center justify-center gap-1">
                      <button onClick={() => onDuplicateShot(shot.id)} className="p-1.5 text-[#707070] hover:text-white hover:bg-[#333] rounded" title="Duplicate">
                         <Layers className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteShot(shot.id)} className="p-1.5 text-[#707070] hover:text-[#F48771] hover:bg-[#3E1A1A] rounded" title="Delete">
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                  </div>
               </div>
            );
         })}
      </div>

      {/* 4. BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
         <div className="h-12 bg-[#007ACC] text-white flex items-center justify-between px-4 animate-in slide-in-from-bottom-2 shrink-0 shadow-lg z-20">
            <div className="font-bold text-sm flex items-center gap-2">
               <CheckSquare className="w-4 h-4" />
               {selectedIds.size} Shots Selected
            </div>
            
            <div className="flex items-center gap-2">
               <div className="h-4 w-[1px] bg-white/30 mx-2" />
               
               {/* Bulk Scene Move */}
               <select 
                  onChange={(e) => handleBulkUpdate('sceneId', e.target.value)}
                  className="bg-white/10 border border-white/20 text-white text-xs h-7 rounded px-2 outline-none cursor-pointer hover:bg-white/20 max-w-[150px]"
                  value="" 
               >
                  <option value="" disabled>Move to Scene...</option>
                  {project.scenes.map(s => <option key={s.id} value={s.id} className="text-black">{s.sequence}. {s.heading}</option>)}
               </select>

               {/* Bulk Type Change */}
               <select 
                  onChange={(e) => handleBulkUpdate('shotType', e.target.value)}
                  className="bg-white/10 border border-white/20 text-white text-xs h-7 rounded px-2 outline-none cursor-pointer hover:bg-white/20"
                  value="" 
               >
                  <option value="" disabled>Set Shot Type...</option>
                  {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
               </select>

               {/* Bulk Time Change */}
               <select 
                  onChange={(e) => handleBulkUpdate('timeOfDay', e.target.value)}
                  className="bg-white/10 border border-white/20 text-white text-xs h-7 rounded px-2 outline-none cursor-pointer hover:bg-white/20"
                  value=""
               >
                  <option value="" disabled>Set Time...</option>
                  {TIMES_OF_DAY.map(t => <option key={t} value={t}>{t}</option>)}
               </select>

               <div className="h-4 w-[1px] bg-white/30 mx-2" />
               
               <button 
                  onClick={handleBulkDelete}
                  className="bg-white/10 hover:bg-red-500 text-white px-3 h-7 rounded text-xs font-bold transition-colors flex items-center gap-2"
               >
                  <Trash2 className="w-3 h-3" /> Delete Selection
               </button>
            </div>
         </div>
      )}
    </div>
  );
};