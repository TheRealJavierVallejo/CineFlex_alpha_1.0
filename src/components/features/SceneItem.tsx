import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, ChevronRight, MapPin } from 'lucide-react';
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
    // New props required for the updated logic
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
        <div className="flex flex-col border-b border-border bg-surface">
            {/* SCENE HEADER STRIP */}
            <div 
                className="flex items-center h-12 px-4 hover:bg-white/5 transition-colors cursor-pointer group"
                onClick={(e) => {
                    if (['INPUT', 'BUTTON', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
                    setIsExpanded(!isExpanded);
                }}
            >
                {/* 1. EXPAND CONTROL */}
                <div className="w-8 flex justify-center text-text-tertiary">
                     <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {/* 2. SEQUENCE NUMBER */}
                <div className="w-10 text-center font-mono text-xs font-bold text-primary mr-4 border border-primary/20 bg-primary/10 rounded px-1 py-0.5">
                    {index + 1}
                </div>

                {/* 3. HEADING INPUT */}
                <div className="flex-1 mr-4">
                    <input
                        value={scene.heading}
                        onChange={(e) => onUpdateScene(scene.id, { heading: e.target.value.toUpperCase() })}
                        className="bg-transparent text-text-primary font-bold text-sm font-mono outline-none placeholder-text-muted w-full tracking-wider uppercase"
                        placeholder="INT. SCENE HEADING - DAY"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                {/* 4. METADATA & LOCATION */}
                <div className="flex items-center gap-6 mr-6 text-xs text-text-tertiary">
                     <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <MapPin className={`w-3.5 h-3.5 ${scene.locationId ? 'text-text-secondary' : 'text-text-muted opacity-50'}`} />
                        <div className="relative">
                            <select
                                value={scene.locationId || ''}
                                onChange={(e) => onUpdateScene(scene.id, { locationId: e.target.value || undefined })}
                                className="bg-transparent text-text-secondary border-none outline-none cursor-pointer appearance-none pr-4 hover:text-white transition-colors max-w-[150px] truncate"
                            >
                                <option value="">No Location</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                     </div>
                     
                     <div className="w-[1px] h-4 bg-border"></div>
                     <span className="font-mono">{shots.length} SHOTS</span>
                </div>

                {/* 5. ACTIONS */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'up'); }} 
                        disabled={index === 0} 
                        className="p-1.5 hover:bg-white/10 rounded text-text-muted hover:text-white disabled:opacity-0"
                    >
                        <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'down'); }} 
                        disabled={index === totalScenes - 1} 
                        className="p-1.5 hover:bg-white/10 rounded text-text-muted hover:text-white disabled:opacity-0"
                    >
                        <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="w-[1px] h-4 bg-border mx-1"></div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id); }} 
                        className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded text-text-muted transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); onAddShot(scene.id); }}
                        className="ml-2 h-7"
                    >
                        <Plus className="w-3.5 h-3.5" /> Shot
                    </Button>
                </div>
            </div>

            {/* EXPANDED TRACK CONTENT */}
            {isExpanded && (
                <div className="bg-[#0f0f10] border-t border-border/50 p-2 pl-12">
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
                                className="w-32 h-[120px] shrink-0 rounded border border-dashed border-border hover:border-primary/50 hover:bg-white/5 flex flex-col items-center justify-center gap-2 transition-all group/add snap-start"
                            >
                                <Plus className="w-6 h-6 text-text-muted group-hover/add:text-primary transition-colors" />
                            </button>
                        </div>
                    ) : (
                        <div className="h-24 flex items-center justify-center text-text-muted border border-dashed border-border/30 rounded">
                            <button 
                                onClick={() => onAddShot(scene.id)}
                                className="flex items-center gap-2 hover:text-primary transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Create First Shot
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};