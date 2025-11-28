import React, { useState, useMemo } from 'react';
import { Project, Shot, ShowToastFn } from '../../types';
import { ShotList } from './ShotList';
import { ProductionSpreadsheet } from './ProductionSpreadsheet';
import { LayoutGrid, Table, Filter, Search, ChevronDown, Trash2 } from 'lucide-react';
import { SHOT_TYPES, TIMES_OF_DAY } from '../../constants';
import Button from '../ui/Button';

interface DashboardControllerProps {
    project: Project;
    onUpdateShot: (shot: Shot) => void;
    onEditShot: (shot: Shot) => void;
    onDeleteShot: (shotId: string) => void;
    onDuplicateShot: (shotId: string) => void;
    onBulkUpdateShots: (shots: Shot[]) => void;
    showToast: ShowToastFn;
    handleAddShot: () => void; // Added for Empty State
}

export const DashboardController: React.FC<DashboardControllerProps> = ({
    project,
    onUpdateShot,
    onEditShot,
    onDeleteShot,
    onDuplicateShot,
    onBulkUpdateShots,
    showToast,
    handleAddShot
}) => {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    
    // --- FILTER STATE ---
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterScene, setFilterScene] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

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

    return (
        <div className="flex flex-col h-full bg-background">
            
            {/* 1. UNIFIED TOOLBAR */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-surface shrink-0 z-20">
                <div className="flex items-center gap-3 flex-1">
                    
                    {/* View Switcher */}
                    <div className="flex bg-surface-secondary rounded-lg p-1 border border-border">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-primary text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                            title="Spreadsheet View"
                        >
                            <Table className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="h-6 w-[1px] bg-border mx-1" />

                    {/* Search Input */}
                    <div className="relative group max-w-[200px] w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted group-focus-within:text-primary transition-colors" />
                        <input 
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                            placeholder="Search shots..." 
                            className="bg-surface-secondary border border-border rounded-md h-9 pl-8 pr-8 text-xs text-text-primary w-full placeholder-text-muted outline-none focus:border-primary transition-all focus:ring-1 focus:ring-primary/20"
                        />
                        {filterText && (
                            <button onClick={() => setFilterText('')} className="absolute right-2 top-2.5 text-text-muted hover:text-text-primary">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    
                    {/* Scene Filter */}
                    <div className="relative hidden md:block">
                        <select 
                            value={filterScene}
                            onChange={e => setFilterScene(e.target.value)}
                            className="h-9 bg-surface-secondary border border-border rounded-md text-xs text-text-primary pl-3 pr-8 outline-none focus:border-primary appearance-none cursor-pointer min-w-[140px] hover:border-text-muted transition-colors"
                        >
                            <option value="all">All Scenes</option>
                            {project.scenes.map(s => (
                                <option key={s.id} value={s.id}>{s.sequence}. {s.heading}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-text-muted absolute right-2.5 top-3 pointer-events-none" />
                    </div>

                    {/* Filters (Combined for mobile/smaller screens later, mostly desktop optimization now) */}
                    <div className="relative hidden lg:block">
                        <select 
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="h-9 bg-surface-secondary border border-border rounded-md text-xs text-text-primary pl-3 pr-8 outline-none focus:border-primary appearance-none cursor-pointer min-w-[120px] hover:border-text-muted transition-colors"
                        >
                            <option value="all">All Shot Types</option>
                            {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="w-3 h-3 text-text-muted absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                     <span className="text-xs font-mono text-text-muted hidden sm:inline-block">
                        {filteredShots.length} / {project.shots.length} SHOTS
                     </span>
                </div>
            </div>

            {/* 2. CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative bg-background">
                {viewMode === 'grid' ? (
                    <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                         <ShotList 
                             project={{ ...project, shots: filteredShots }} // Pass filtered shots
                             onAddShot={handleAddShot}
                             onEditShot={onEditShot}
                             onDeleteShot={onDeleteShot}
                             onDuplicateShot={onDuplicateShot}
                             showToast={showToast}
                         />
                    </div>
                ) : (
                    <ProductionSpreadsheet 
                        project={{ ...project, shots: filteredShots }} // Pass filtered shots
                        onUpdateShot={onUpdateShot}
                        onEditShot={onEditShot}
                        onDeleteShot={onDeleteShot}
                        onDuplicateShot={onDuplicateShot}
                        onBulkUpdateShots={onBulkUpdateShots} // Pass bulk handler down
                        showToast={showToast}
                        embedded={true} // New prop to hide internal toolbar
                    />
                )}
            </div>
        </div>
    );
};