/*
 * 📊 COMPONENT: PRODUCTION SPREADSHEET (Option 1)
 * High-Density Data View for Bulk Editing
 */

import React, { useState, useMemo } from 'react';
import { Project, Shot, ShowToastFn } from '../../types';
import { SHOT_TYPES, ASPECT_RATIOS, TIMES_OF_DAY } from '../../constants';
import { Film, Trash2, Edit2, CheckSquare, Square, Filter, ChevronDown, Image as ImageIcon } from 'lucide-react';
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
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // --- DERIVED DATA ---
  const filteredShots = useMemo(() => {
    return project.shots.filter(shot => {
      const matchesText = (shot.description || '').toLowerCase().includes(filterText.toLowerCase()) ||
                          (shot.notes || '').toLowerCase().includes(filterText.toLowerCase());
      
      const matchesType = filterType === 'all' || shot.shotType === filterType;
      
      return matchesText && matchesType;
    });
  }, [project.shots, filterText, filterType]);

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
    
    // We update each selected shot
    // Note: In a real app with backend, we'd send a batch update. 
    // Here we just loop (it's fast enough for client-side).
    selectedIds.forEach(id => {
      const shot = project.shots.find(s => s.id === id);
      if (shot) {
        onUpdateShot({ ...shot, [field]: value });
      }
    });
    
    showToast(`Updated ${selectedIds.size} shots`, 'success');
    setSelectedIds(new Set()); // Clear selection
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} shots?`)) {
      selectedIds.forEach(id => onDeleteShot(id));
      setSelectedIds(new Set());
      showToast("Shots deleted", 'info');
    }
  };

  // Helper to find Scene Heading for a shot
  const getSceneHeading = (sceneId?: string) => {
    if (!sceneId) return '-';
    const scene = project.scenes.find(s => s.id === sceneId);
    return scene ? scene.heading : 'Unknown Scene';
  };

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E]">
      
      {/* 1. TOOLBAR */}
      <div className="h-12 border-b border-[#333] flex items-center justify-between px-4 bg-[#252526] shrink-0">
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-[#1E1E1E] border border-[#333] rounded-sm px-2 h-7">
                <Filter className="w-3 h-3 text-[#969696]" />
                <input 
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  placeholder="Filter shots..." 
                  className="bg-transparent border-none outline-none text-xs text-[#E8E8E8] w-48 placeholder-[#606060]"
                />
             </div>
             
             <select 
               value={filterType}
               onChange={e => setFilterType(e.target.value)}
               className="h-7 bg-[#1E1E1E] border border-[#333] rounded-sm text-xs text-[#E8E8E8] px-2 outline-none focus:border-[#007ACC]"
             >
                <option value="all">All Types</option>
                {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
             </select>

             <div className="text-xs text-[#969696]">
                {filteredShots.length} shots found
             </div>
         </div>
      </div>

      {/* 2. TABLE HEADER */}
      <div className="flex items-center h-8 bg-[#1E1E1E] border-b border-[#333] text-[11px] font-bold text-[#969696] uppercase select-none sticky top-0 z-10">
         <div className="w-10 flex justify-center cursor-pointer hover:text-white" onClick={toggleAll}>
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#007ACC]" /> : <Square className="w-3.5 h-3.5" />}
         </div>
         <div className="w-12 text-center">Seq</div>
         <div className="w-16 text-center">Visual</div>
         <div className="flex-[2] px-2 border-l border-[#2A2A2A]">Scene / Description</div>
         <div className="w-32 px-2 border-l border-[#2A2A2A]">Shot Type</div>
         <div className="w-24 px-2 border-l border-[#2A2A2A]">Aspect</div>
         <div className="w-32 px-2 border-l border-[#2A2A2A]">Time</div>
         <div className="w-20 text-center border-l border-[#2A2A2A]">Actions</div>
      </div>

      {/* 3. TABLE BODY */}
      <div className="flex-1 overflow-y-auto">
         {filteredShots.map((shot, idx) => (
            <div 
               key={shot.id} 
               className={`
                 flex items-center h-16 border-b border-[#252526] text-[12px] text-[#CCCCCC] transition-colors hover:bg-[#2A2D2E]
                 ${selectedIds.has(shot.id) ? 'bg-[#37373D]' : ''}
               `}
            >
               {/* Checkbox */}
               <div className="w-10 flex justify-center cursor-pointer" onClick={() => toggleSelection(shot.id)}>
                  {selectedIds.has(shot.id) ? <CheckSquare className="w-3.5 h-3.5 text-[#007ACC]" /> : <Square className="w-3.5 h-3.5 text-[#505050]" />}
               </div>

               {/* Seq */}
               <div className="w-12 text-center font-mono text-[#707070]">{shot.sequence}</div>

               {/* Thumbnail */}
               <div className="w-16 p-1 h-full cursor-pointer group relative" onClick={() => onEditShot(shot)}>
                  {shot.generatedImage ? (
                     <img src={shot.generatedImage} className="w-full h-full object-cover rounded-[2px] border border-[#333]" />
                  ) : (
                     <div className="w-full h-full bg-[#18181B] rounded-[2px] border border-[#333] flex items-center justify-center">
                        <Film className="w-4 h-4 text-[#333]" />
                     </div>
                  )}
                  {/* Hover Edit Hint */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                     <Edit2 className="w-3 h-3" />
                  </div>
               </div>

               {/* Description & Scene */}
               <div className="flex-[2] px-3 flex flex-col justify-center gap-0.5 truncate border-l border-[#2A2A2A] h-full">
                  <div className="text-[10px] text-[#007ACC] font-bold uppercase truncate">
                     {getSceneHeading(shot.sceneId)}
                  </div>
                  <div className="truncate text-[#E8E8E8]" title={shot.description}>
                     {shot.description || <span className="text-[#505050] italic">No description</span>}
                  </div>
               </div>

               {/* Shot Type Dropdown */}
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
               <div className="w-20 border-l border-[#2A2A2A] h-full flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                   <button onClick={() => onDuplicateShot(shot.id)} className="text-[#969696] hover:text-white p-1" title="Duplicate"><ImageIcon className="w-3.5 h-3.5" /></button>
                   <button onClick={() => onDeleteShot(shot.id)} className="text-[#969696] hover:text-[#F48771] p-1" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
               </div>
            </div>
         ))}
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
               
               {/* Bulk Type Change */}
               <select 
                  onChange={(e) => handleBulkUpdate('shotType', e.target.value)}
                  className="bg-white/10 border border-white/20 text-white text-xs h-7 rounded px-2 outline-none cursor-pointer hover:bg-white/20"
                  value="" // Always reset
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