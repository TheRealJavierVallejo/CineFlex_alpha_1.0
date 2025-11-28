/*
 * 📊 COMPONENT: PRODUCTION SPREADSHEET (Option 1)
 * High-Density Data View for Bulk Editing
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Project, Shot, ShowToastFn } from '../../types';
import { SHOT_TYPES, ASPECT_RATIOS, TIMES_OF_DAY } from '../../constants';
import { Film, Trash2, Edit2, CheckSquare, Square, Filter, ChevronDown, Layers, Clapperboard, FileText, LayoutGrid, Search, BarChart3, Sliders } from 'lucide-react';
import Button from '../ui/Button';
import { WorkspaceContextType } from '../../layouts/WorkspaceLayout';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';
import { CollapsibleSection } from '../ui/CollapsibleSection';

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
  const navigate = useNavigate();
  const { handleBulkUpdateShots } = useOutletContext<WorkspaceContextType>();
  
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
  }, [project.shots, filterText, filterType, filterScene, filterStatus]);

  const allSelected = filteredShots.length > 0 && selectedIds.size === filteredShots.length;

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
    handleBulkUpdateShots(shotsToUpdate);
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

  // --- TOOL RAIL CONTENT ---
  const tools: Tool[] = [
      {
          id: 'filters',
          label: 'View Options',
          icon: <Sliders className="w-5 h-5" />,
          content: (
            <div className="p-4 space-y-6">
                {/* Search */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Search</label>
                    <div className="relative">
                        <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-zinc-500" />
                        <input 
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                            placeholder="Keywords..."
                            className="w-full bg-[#18181b] border border-border rounded-sm py-1.5 pl-8 pr-2 text-xs text-white outline-none focus:border-primary placeholder:text-zinc-600"
                        />
                    </div>
                </div>

                {/* Filters */}
                <CollapsibleSection title="Filtering" defaultOpen icon={<Filter className="w-3.5 h-3.5" />}>
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-400">By Status</label>
                            <select 
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="w-full bg-[#18181b] border border-border rounded-sm py-1.5 px-2 text-xs text-zinc-300 outline-none focus:border-primary cursor-pointer"
                            >
                                <option value="all">Show All</option>
                                <option value="missing_image">Missing Image</option>
                                <option value="has_image">Has Generated Image</option>
                                <option value="script_linked">Linked to Script</option>
                                <option value="no_script">Unlinked</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-400">By Scene</label>
                            <select 
                                value={filterScene}
                                onChange={e => setFilterScene(e.target.value)}
                                className="w-full bg-[#18181b] border border-border rounded-sm py-1.5 px-2 text-xs text-zinc-300 outline-none focus:border-primary cursor-pointer"
                            >
                                <option value="all">All Scenes</option>
                                {project.scenes.map(s => (
                                    <option key={s.id} value={s.id}>{s.sequence}. {s.heading}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-400">By Shot Type</label>
                            <select 
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                className="w-full bg-[#18181b] border border-border rounded-sm py-1.5 px-2 text-xs text-zinc-300 outline-none focus:border-primary cursor-pointer"
                            >
                                <option value="all">All Types</option>
                                {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Stats */}
                <CollapsibleSection title="Statistics" defaultOpen icon={<BarChart3 className="w-3.5 h-3.5" />}>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="bg-[#18181b] p-2 rounded-sm border border-border text-center">
                            <div className="text-xl font-bold text-white">{project.shots.length}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">Total Shots</div>
                        </div>
                        <div className="bg-[#18181b] p-2 rounded-sm border border-border text-center">
                            <div className="text-xl font-bold text-primary">{project.shots.filter(s => s.generatedImage).length}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">Rendered</div>
                        </div>
                    </div>
                </CollapsibleSection>
            </div>
          )
      }
  ];

  if (project.shots.length === 0) {
      return (
          <div className="flex flex-col h-full items-center justify-center bg-background text-center p-8">
              <div className="w-16 h-16 bg-surface-secondary rounded-lg flex items-center justify-center mb-6 border border-border shadow-inner">
                  <LayoutGrid className="w-8 h-8 text-text-muted" />
              </div>
              <h2 className="text-lg font-bold text-text-primary mb-2">Welcome to your Project</h2>
              <p className="text-text-secondary max-w-md mb-8 leading-relaxed text-sm">
                  Your shot list is currently empty. Start by creating scenes or importing a script.
              </p>
              <div className="flex gap-4">
                  <Button variant="primary" size="lg" icon={<FileText className="w-4 h-4" />} onClick={() => navigate('script')}>Open Script Editor</Button>
                  <Button variant="secondary" size="lg" icon={<Clapperboard className="w-4 h-4" />} onClick={() => navigate('timeline')}>Go to Timeline</Button>
              </div>
          </div>
      );
  }

  return (
    <PageWithToolRail tools={tools} defaultTool="filters">
        <div className="flex flex-col h-full bg-background">
        
        {/* 1. TABLE HEADER */}
        <div className="flex items-center h-8 bg-surface-secondary border-b border-border text-[10px] font-bold text-text-secondary uppercase select-none sticky top-0 z-10 tracking-wider pl-10">
            <div className="w-10 flex justify-center cursor-pointer hover:text-white transition-colors" onClick={toggleAll}>
                {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
            </div>
            <div className="w-16 text-center">ID</div>
            <div className="w-16 text-center">Visual</div>
            <div className="flex-1 px-3 border-l border-border">Scene Assignment</div>
            <div className="w-32 px-2 border-l border-border">Shot Type</div>
            <div className="w-24 px-2 border-l border-border">Aspect</div>
            <div className="w-32 px-2 border-l border-border">Time</div>
            <div className="w-16 text-center border-l border-border">Actions</div>
        </div>

        {/* 2. TABLE BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-background pl-10">
            {filteredShots.map((shot, idx) => {
                const sceneInfo = getSceneInfo(shot.sceneId);
                const isSelected = selectedIds.has(shot.id);
                const idString = `${sceneInfo.sequence}:${shot.sequence}`;
                
                return (
                <div 
                    key={shot.id} 
                    className={`
                        flex items-center h-12 border-b border-border/50 text-xs text-text-primary transition-colors hover:bg-surface-secondary group
                        ${isSelected ? 'bg-primary/10 hover:bg-primary/20' : ''}
                    `}
                >
                    <div className="w-10 flex justify-center cursor-pointer" onClick={() => toggleSelection(shot.id)}>
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-text-muted" />}
                    </div>

                    <div className="w-16 text-center font-mono text-text-secondary text-[11px]">{idString}</div>

                    <div className="w-16 p-1 h-full cursor-pointer relative flex items-center justify-center" onClick={() => onEditShot(shot)}>
                        {shot.generatedImage ? (
                            <img src={shot.generatedImage} className="h-full w-auto object-contain rounded-sm border border-border group-hover:border-text-muted" />
                        ) : (
                            <div className="w-10 h-8 bg-surface rounded-sm border border-border flex items-center justify-center group-hover:border-text-muted">
                            <Film className="w-3 h-3 text-text-muted" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Edit2 className="w-3 h-3" />
                        </div>
                    </div>

                    <div className="flex-1 px-3 border-l border-border/50 h-full flex items-center">
                        <div className="w-full relative group/scene">
                            <select
                                value={shot.sceneId || ''}
                                onChange={(e) => onUpdateShot({ ...shot, sceneId: e.target.value })}
                                className="w-full bg-transparent text-primary font-medium outline-none text-[11px] cursor-pointer hover:text-white appearance-none uppercase tracking-wide"
                            >
                                {project.scenes.map(s => (
                                    <option key={s.id} value={s.id} className="text-black">{s.sequence}. {s.heading}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="w-32 px-2 border-l border-border/50 h-full flex items-center">
                        <select 
                            value={shot.shotType}
                            onChange={(e) => onUpdateShot({ ...shot, shotType: e.target.value })}
                            className="w-full bg-transparent text-text-secondary outline-none text-[11px] cursor-pointer hover:text-text-primary"
                        >
                            {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="w-24 px-2 border-l border-border/50 h-full flex items-center">
                        <select 
                            value={shot.aspectRatio || project.settings.aspectRatio}
                            onChange={(e) => onUpdateShot({ ...shot, aspectRatio: e.target.value })}
                            className="w-full bg-transparent text-text-secondary outline-none text-[11px] cursor-pointer hover:text-text-primary"
                        >
                            {ASPECT_RATIOS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="w-32 px-2 border-l border-border/50 h-full flex items-center">
                        <select 
                            value={shot.timeOfDay || ''}
                            onChange={(e) => onUpdateShot({ ...shot, timeOfDay: e.target.value || undefined })}
                            className="w-full bg-transparent text-text-secondary outline-none text-[11px] cursor-pointer hover:text-text-primary"
                        >
                            <option value="">Default</option>
                            {TIMES_OF_DAY.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="w-16 border-l border-border/50 h-full flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onDuplicateShot(shot.id)} className="p-1 text-text-muted hover:text-white hover:bg-surface rounded-sm" title="Duplicate">
                            <Layers className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeleteShot(shot.id)} className="p-1 text-text-muted hover:text-error hover:bg-error/10 rounded-sm" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                );
            })}
        </div>

        {/* 3. BULK ACTIONS BAR */}
        {selectedIds.size > 0 && (
            <div className="h-12 bg-primary text-white flex items-center justify-between px-4 animate-in slide-in-from-bottom-2 shrink-0 shadow-lg z-20 absolute bottom-0 left-0 right-0">
                <div className="font-bold text-xs flex items-center gap-2 uppercase tracking-wide">
                <CheckSquare className="w-4 h-4" />
                {selectedIds.size} Shots Selected
                </div>
                
                <div className="flex items-center gap-2">
                <div className="h-4 w-[1px] bg-white/30 mx-2" />
                <select 
                    onChange={(e) => handleBulkUpdate('sceneId', e.target.value)}
                    className="bg-black/20 border border-white/20 text-white text-xs h-7 rounded-sm px-2 outline-none cursor-pointer hover:bg-black/30 max-w-[150px]"
                    value="" 
                >
                    <option value="" disabled>Move to Scene...</option>
                    {project.scenes.map(s => <option key={s.id} value={s.id} className="text-black">{s.sequence}. {s.heading}</option>)}
                </select>
                <select 
                    onChange={(e) => handleBulkUpdate('shotType', e.target.value)}
                    className="bg-black/20 border border-white/20 text-white text-xs h-7 rounded-sm px-2 outline-none cursor-pointer hover:bg-black/30"
                    value="" 
                >
                    <option value="" disabled>Set Shot Type...</option>
                    {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="h-4 w-[1px] bg-white/30 mx-2" />
                <button 
                    onClick={handleBulkDelete}
                    className="bg-black/20 hover:bg-red-500 text-white px-3 h-7 rounded-sm text-xs font-bold transition-colors flex items-center gap-2"
                >
                    <Trash2 className="w-3 h-3" /> Delete Selection
                </button>
                </div>
            </div>
        )}
        </div>
    </PageWithToolRail>
  );
};