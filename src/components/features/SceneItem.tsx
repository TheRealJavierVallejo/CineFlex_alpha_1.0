import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, ChevronRight, MapPin, MoreHorizontal } from 'lucide-react';
import { Scene, Shot, ScriptElement, Project, Location } from '../../types';
import Button from '../ui/Button';
import { ShotCard } from './ShotCard';

interface SceneItemProps {
    scene: Scene;
    index: number;
    totalScenes: number;
    shots: Shot[];
    scriptElements: ScriptElement[];
    locations: Location[];
    projectSettings: Project['settings'];
    onUpdateScene: (id: string, updates: Partial<Scene>) => void;
    onDeleteScene: (id: string) => void;
    onMoveScene: (index: number, dir: 'up' | 'down') => void;
    onAddShot: (sceneId: string) => void;
    onUpdateShot: (id: string, updates: Partial<Shot>) => void;
    onDeleteShot: (id: string) => void;
    onEditShot: (shot: Shot) => void;
    onLinkElement?: (shotId: string, type: 'action' | 'dialogue' | 'script') => void;
    onUnlinkElement?: (shotId: string, elementId: string) => void;
    onCreateAndLinkShot?: (sceneId: string) => void;
    onAddVisual?: (shotId: string) => void; 
}

export const SceneItem: React.FC<SceneItemProps> = ({
    scene,
    index,
    totalScenes,
    shots,
    locations,
    onUpdateScene,
    onDeleteScene,
    onMoveScene,
    onAddShot,
    onDeleteShot,
    onEditShot,
}) => {
    // Default to open for first scene
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="flex flex-col border border-border bg-surface rounded-sm overflow-hidden mb-1">
            {/* TRACK HEADER */}
            <div 
                className="flex items-center h-10 px-2 bg-surface-secondary border-b border-border hover:bg-[#27272a] transition-colors cursor-pointer group select-none"
                onClick={(e) => {
                    if (['INPUT', 'BUTTON', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
                    setIsExpanded(!isExpanded);
                }}
            >
                {/* 1. EXPAND CONTROL */}
                <div className="w-6 flex justify-center text-text-tertiary">
                     <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {/* 2. SEQUENCE NUMBER */}
                <div className="font-mono text-[10px] font-bold text-primary w-8 text-center mr-2 bg-primary/10 border border-primary/20 rounded-sm px-1">
                    {index + 1}
                </div>

                {/* 3. HEADING INPUT */}
                <div className="flex-1 mr-4">
                    <input
                        value={scene.heading}
                        onChange={(e) => onUpdateScene(scene.id, { heading: e.target.value.toUpperCase() })}
                        className="bg-transparent text-text-primary font-bold text-xs font-mono outline-none placeholder-text-muted w-full tracking-wide uppercase border-none focus:ring-0 p-0"
                        placeholder="INT. SCENE HEADING - DAY"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                {/* 4. METADATA & LOCATION */}
                <div className="flex items-center gap-4 mr-4 text-[10px] text-text-tertiary">
                     <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <MapPin className={`w-3 h-3 ${scene.locationId ? 'text-text-secondary' : 'text-text-muted opacity-50'}`} />
                        <div className="relative">
                            <select
                                value={scene.locationId || ''}
                                onChange={(e) => onUpdateScene(scene.id, { locationId: e.target.value || undefined })}
                                className="bg-transparent text-text-secondary border-none outline-none cursor-pointer appearance-none hover:text-white transition-colors max-w-[120px] truncate py-0"
                            >
                                <option value="">No Loc</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                     </div>
                     
                     <div className="w-px h-3 bg-border"></div>
                     <span className="font-mono">{shots.length} SHOTS</span>
                </div>

                {/* 5. ACTIONS */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'up'); }} 
                        disabled={index === 0} 
                        className="p-1 hover:bg-white/10 rounded-sm text-text-muted hover:text-white disabled:opacity-0"
                    >
                        <ArrowUp className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'down'); }} 
                        disabled={index === totalScenes - 1} 
                        className="p-1 hover:bg-white/10 rounded-sm text-text-muted hover:text-white disabled:opacity-0"
                    >
                        <ArrowDown className="w-3 h-3" />
                    </button>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id); }} 
                        className="p-1 hover:bg-red-900/50 hover:text-red-400 rounded-sm text-text-muted transition-colors ml-1"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                    
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); onAddShot(scene.id); }}
                        className="ml-2 h-6 px-2"
                        icon={<Plus className="w-3 h-3" />}
                    >
                        Shot
                    </Button>
                </div>
            </div>

            {/* EXPANDED TRACK CONTENT */}
            {isExpanded && (
                <div className="bg-[#101012] p-2 pl-10 border-t border-border/50">
                    {shots.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x items-start">
                            {shots.map(shot => (
                                <div key={shot.id} className="snap-start shrink-0">
                                    <ShotCard
                                        shot={shot}
                                        onClick={() => onEditShot(shot)}
                                        onDelete={(e) => { e.stopPropagation(); onDeleteShot(shot.id); }}
                                    />
                                </div>
                            ))}
                            
                            {/* "Add Shot" Ghost Card */}
                            <button
                                onClick={() => onAddShot(scene.id)}
                                className="w-32 h-[120px] shrink-0 rounded-sm border border-dashed border-border hover:border-primary/50 hover:bg-white/5 flex flex-col items-center justify-center gap-2 transition-all group/add snap-start"
                            >
                                <Plus className="w-6 h-6 text-text-muted group-hover/add:text-primary transition-colors" />
                                <span className="text-[10px] font-bold text-text-muted group-hover/add:text-primary">NEW SHOT</span>
                            </button>
                        </div>
                    ) : (
                        <div className="h-16 flex items-center justify-center text-text-muted/50 border border-dashed border-border/30 rounded-sm">
                            <button 
                                onClick={() => onAddShot(scene.id)}
                                className="flex items-center gap-2 hover:text-primary transition-colors text-xs"
                            >
                                <Plus className="w-3.5 h-3.5" /> Empty Scene - Add Shot
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};