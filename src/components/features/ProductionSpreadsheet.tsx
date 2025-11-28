/*
 * 📊 COMPONENT: PRODUCTION SPREADSHEET (Option 1)
 * High-Density Data View for Bulk Editing
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, Shot, ShowToastFn } from '../../types';
import { SHOT_TYPES, ASPECT_RATIOS, TIMES_OF_DAY } from '../../constants';
import { Film, Trash2, Edit2, CheckSquare, Square, Filter, ChevronDown, Layers, Clapperboard, FileText, LayoutGrid } from 'lucide-react';
import Button from '../ui/Button';

interface ProductionSpreadsheetProps {
  project: Project;
  onUpdateShot: (shot: Shot) => void;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shotId: string) => void;
  onDuplicateShot: (shotId: string) => void;
  onBulkUpdateShots?: (shots: Shot[]) => void; // Optional now
  showToast: ShowToastFn;
  embedded?: boolean; // NEW: If true, hides toolbar
}

export const ProductionSpreadsheet: React.FC<ProductionSpreadsheetProps> = ({
  project,
  onUpdateShot,
  onEditShot,
  onDeleteShot,
  onDuplicateShot,
  onBulkUpdateShots,
  showToast,
  embedded = false
}) => {
  const navigate = useNavigate();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Internal Filters (Only used if NOT embedded)
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

  // --- DERIVED DATA (Internal Filtering) ---
  const filteredShots = useMemo(() => {
    // If embedded, we assume parent has already filtered the shots passed in 'project'
    if (embedded) return project.shots;

    return project.shots.filter(shot => {
      const matchesText = (shot.description || '').toLowerCase().includes(filterText.toLowerCase()) ||
                          (shot.notes || '').toLowerCase().includes(filterText.toLowerCase());
      
      const matchesType = filterType === 'all' || shot.shotType === filterType;
      const matchesScene = filterScene === 'all' || shot.sceneId === filterScene;

      let matchesStatus = true;
      if (filterStatus === 'missing_image') matchesStatus = !shot.generatedImage;
      else if (filterStatus === 'has_image') matchesStatus = !!shot.generatedImage;
      else if (filterStatus === 'script_linked') matchesStatus = (shot.linkedElementIds?.length || 0) > 0;
      else if (filterStatus === 'no_script') matchesStatus = (shot.linkedElementIds?.length || 0) === 0;
      
      return matchesText && matchesType && matchesScene && matchesStatus;
    });
  }, [project.shots, filterText, filterType, filterScene, filterStatus, embedded]);

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
    const shotsToUpdate = project.shots
        .filter(s => selectedIds.has(s.id))
        .map(s => ({ ...s, [field]: value }));

    if (onBulkUpdateShots) {
        onBulkUpdateShots(shotsToUpdate);
        showToast(`Updated ${selectedIds.size} shots`, 'success');
    }
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} shots?`)) {
      selectedIds.forEach(id => onDeleteShot(id));
      setSelectedIds(new Set());
      showToast("Shots deleted", 'info');
    }
  };

  // --- EMPTY STATE CHECK ---
  if (project.shots.length === 0 && !embedded) {
      return (
          <div className="flex flex-col h-full items-center justify-center bg-background text-center p-8">
              <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center mb-6 border border-border shadow-inner">
                  <LayoutGrid className="w-10 h-10 text-text-muted" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Welcome to your Project</h2>
              <p className="text-text-secondary max-w-md mb-8 leading-relaxed">
                  Your shot list is currently empty.
              </p>
              
              <div className="flex gap-4">
                  <Button 
                      variant="primary" 
                      size="lg" 
                      icon={<FileText className="w-4 h-4" />}
                      onClick={() => navigate('script')}
                  >
                      Open Script Editor
                  </Button>
                  <Button 
                      variant="secondary" 
                      size="lg" 
                      icon={<Clapperboard className="w-4 h-4" />}
                      onClick={() => navigate('board')}
                  >
                      Go to Board
                  </Button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      
      {/* 1. TOOLBAR (Only shown if NOT embedded) */}
      {!embedded && (
      <div className="nle-header justify-between">
         <div className="flex items-center gap-3 w-full">
             <div className="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded border border-border text-primary">
                <Filter className="w-4 h-4" />
             </div>

             <div className="relative group">
                <input 
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  placeholder="Search shots..." 
                  className="nle-input w-48"
                />
                {filterText && (
                   <button onClick={() => setFilterText('')} className="absolute right-2 top-1.5 text-text-muted hover:text-text-primary">
                      <Trash2 className="w-3 h-3" />
                   </button>
                )}
             </div>
             
             <div className="h-4 w-[1px] bg-border mx-1" />

             <select value={filterScene} onChange={e => setFilterScene(e.target.value)} className="nle-input w-36">
                 <option value="all">All Scenes</option>
                 {project.scenes.map(s => <option key={s.id} value={s.id}>{s.sequence}. {s.heading}</option>)}
             </select>
             
             <select value={filterType} onChange={e => setFilterType(e.target.value)} className="nle-input w-32">
                 <option value="all">All Types</option>
                 {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
             </select>

             <div className="flex-1" />

             <div className="text-xs font-mono text-text-muted">
                {filteredShots.length} SHOTS
             </div>
         </div>
      </div>
      )}

      {/* 2. TABLE HEADER */}
      <div className="flex items-center h-8 bg-surface-secondary border-b border-border text-[10px] font-bold text-text-tertiary uppercase select-none sticky top-0 z-10 tracking-wider">
         <div className="w-10 flex justify-center cursor-pointer hover:text-white" onClick={toggleAll}>
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
         </div>
         <div className="w-16 text-center border-l border-border">ID</div>
         <div className="w-14 text-center border-l border-border">Still</div>
         <div className="flex-1 px-3 border-l border-border">Scene Assignment</div>
         <div className="w-32 px-2 border-l border-border">Type</div>
         <div className="w-24 px-2 border-l border-border">Aspect</div>
         <div className="w-28 px-2 border-l border-border">Time</div>
         <div className="w-14 text-center border-l border-border">Edit</div>
      </div>

      {/* 3. TABLE BODY */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
         {filteredShots.map((shot, idx) => {
            const sceneInfo = getSceneInfo(shot.sceneId);
            const isSelected = selectedIds.has(shot.id);
            const idString = `${sceneInfo.sequence}:${shot.sequence}`;
            
            return (
               <div 
                  key={shot.id} 
                  className={`
                    flex items-center h-10 border-b border-border text-xs text-text-primary transition-colors hover:bg-white/5 group
                    ${isSelected ? 'bg-primary/10' : ''}
                  `}
               >
                  {/* Checkbox */}
                  <div className="w-10 flex justify-center cursor-pointer" onClick={() => toggleSelection(shot.id)}>
                     {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-text-muted" />}
                  </div>

                  {/* ID */}
                  <div className="w-16 text-center font-mono text-[11px] text-text-secondary border-l border-border/50">{idString}</div>

                  {/* Thumbnail */}
                  <div className="w-14 h-full p-0.5 border-l border-border/50 cursor-pointer" onClick={() => onEditShot(shot)}>
                     {shot.generatedImage ? (
                        <img src={shot.generatedImage} className="w-full h-full object-cover rounded-[1px]" />
                     ) : (
                        <div className="w-full h-full bg-[#151515] flex items-center justify-center">
                           <Film className="w-3 h-3 text-text-muted opacity-30" />
                        </div>
                     )}
                  </div>

                  {/* Scene Dropdown */}
                  <div className="flex-1 px-2 border-l border-border/50 h-full flex items-center min-w-0">
                     <select
                         value={shot.sceneId || ''}
                         onChange={(e) => onUpdateShot({ ...shot, sceneId: e.target.value })}
                         className="w-full bg-transparent text-primary font-medium outline-none text-[11px] cursor-pointer appearance-none uppercase truncate"
                     >
                         {project.scenes.map(s => (
                             <option key={s.id} value={s.id} className="text-black">{s.sequence}. {s.heading}</option>
                         ))}
                     </select>
                  </div>

                  {/* Shot Type */}
                  <div className="w-32 px-2 border-l border-border/50 h-full flex items-center">
                     <select 
                        value={shot.shotType}
                        onChange={(e) => onUpdateShot({ ...shot, shotType: e.target.value })}
                        className="w-full bg-transparent text-text-secondary outline-none text-[11px] cursor-pointer hover:text-white truncate"
                     >
                        {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="w-24 px-2 border-l border-border/50 h-full flex items-center">
                     <select 
                        value={shot.aspectRatio || project.settings.aspectRatio}
                        onChange={(e) => onUpdateShot({ ...shot, aspectRatio: e.target.value })}
                        className="w-full bg-transparent text-text-secondary outline-none text-[11px] cursor-pointer hover:text-white"
                     >
                        {ASPECT_RATIOS.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                  </div>

                  {/* Time of Day */}
                  <div className="w-28 px-2 border-l border-border/50 h-full flex items-center">
                     <select 
                        value={shot.timeOfDay || ''}
                        onChange={(e) => onUpdateShot({ ...shot, timeOfDay: e.target.value || undefined })}
                        className="w-full bg-transparent text-text-secondary outline-none text-[11px] cursor-pointer hover:text-white truncate"
                     >
                        <option value="">Default</option>
                        {TIMES_OF_DAY.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                  </div>

                  {/* Actions */}
                  <div className="w-14 border-l border-border/50 h-full flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onDuplicateShot(shot.id)} className="p-1 hover:text-white"><Layers className="w-3 h-3" /></button>
                      <button onClick={() => onDeleteShot(shot.id)} className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
               </div>
            );
         })}
      </div>

      {/* 4. BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
         <div className="h-10 bg-primary text-white flex items-center justify-between px-4 animate-in slide-in-from-bottom-2 shrink-0 shadow-lg z-20">
            <div className="font-bold text-xs flex items-center gap-2">
               <CheckSquare className="w-3.5 h-3.5" />
               {selectedIds.size} Selected
            </div>
            
            <div className="flex items-center gap-2">
               <div className="h-3 w-[1px] bg-white/30 mx-2" />
               <select onChange={(e) => handleBulkUpdate('sceneId', e.target.value)} className="bg-black/20 border border-white/20 text-white text-[10px] h-6 rounded px-1 outline-none cursor-pointer max-w-[120px]" value="">
                  <option value="" disabled>Move to...</option>
                  {project.scenes.map(s => <option key={s.id} value={s.id} className="text-black">{s.sequence}. {s.heading}</option>)}
               </select>

               <select onChange={(e) => handleBulkUpdate('shotType', e.target.value)} className="bg-black/20 border border-white/20 text-white text-[10px] h-6 rounded px-1 outline-none cursor-pointer" value="">
                  <option value="" disabled>Type...</option>
                  {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
               </select>

               <button onClick={handleBulkDelete} className="bg-black/20 hover:bg-red-600 text-white px-2 h-6 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
               </button>
            </div>
         </div>
      )}
    </div>
  );
};