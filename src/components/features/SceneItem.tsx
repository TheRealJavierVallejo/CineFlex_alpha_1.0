import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Type, ChevronDown, MapPin, MoreHorizontal } from 'lucide-react';
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
        <div className="studio-card overflow-hidden group/scene mb-6 border-l-4 border-l-primary/50">
            {/* SCENE HEADER */}
            <div 
                className="bg-surface-secondary p-4 flex flex-col cursor-pointer select-none transition-colors hover:bg-surface-hover"
                onClick={(e) => {
                    if (['INPUT', 'BUTTON', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
                    setIsExpanded(!isExpanded);
                }}
            >
                <div className="flex items-center gap-4">
                    {/* Expand/Collapse Chevron */}
                    <div className={`transition-transform duration-200 text-text-muted ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown className="w-5 h-5" />
                    </div>

                    {/* Scene Controls */}
                    <div className="flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover/scene:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'up'); }} disabled={index === 0} className="text-text-muted hover:text-primary disabled:opacity-0"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <span className="font-mono text-xs text-text-muted font-bold px-1 bg-surface rounded border border-border">{index + 1}</span>
                        <button onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'down'); }} disabled={index === totalScenes - 1} className="text-text-muted hover:text-primary disabled:opacity-0"><ArrowDown className="w-3.5 h-3.5" /></button>
                    </div>

                    {/* Heading & Metadata */}
                    <div className="flex-1">
                        <input
                            value={scene.heading}
                            onChange={(e) => onUpdateScene(scene.id, { heading: e.target.value.toUpperCase() })}
                            className="bg-transparent text-text-primary font-bold text-lg font-mono outline-none placeholder-text-muted w-full tracking-wider uppercase"
                            placeholder="INT. SCENE HEADING - DAY"
                            onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="flex items-center gap-6 mt-1.5">
                             {/* Location Selector */}
                             <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <MapPin className={`w-3 h-3 ${scene.locationId ? 'text-primary' : 'text-text-muted'}`} />
                                <div className="relative group/loc">
                                    <select
                                        value={scene.locationId || ''}
                                        onChange={(e) => onUpdateScene(scene.id, { locationId: e.target.value || undefined })}
                                        className="bg-transparent text-xs text-text-secondary hover:text-text-primary border-none outline-none cursor-pointer appearance-none pr-4 font-medium transition-colors"
                                    >
                                        <option value="">No Location Set</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                             </div>

                             <div className="text-xs text-text-muted flex items-center gap-2">
                                <div className="w-[1px] h-3 bg-border"></div>
                                <span>{shots.length} Shots</span>
                                <div className="w-[1px] h-3 bg-border"></div>
                                <span className="truncate max-w-[300px] opacity-70">{scene.actionNotes?.substring(0, 60)}...</span>
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); onAddShot(scene.id); }}
                            className="hidden group-hover/scene:flex"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Shot
                        </Button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id); }} 
                            className="text-text-muted hover:text-error p-2 opacity-0 group-hover/scene:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* FILM STRIP VIEW (Horizontal Scroll) */}
            {isExpanded && (
                <div className="bg-[#121212] p-4 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
                    {shots.length > 0 ? (
                        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                            {shots.map(shot => (
                                <div key={shot.id} className="snap-start">
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
                                className="w-32 shrink-0 rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-surface-secondary flex flex-col items-center justify-center gap-2 transition-all group/add snap-start"
                            >
                                <div className="w-8 h-8 rounded-full bg-surface-secondary group-hover/add:bg-primary/20 flex items-center justify-center transition-colors">
                                    <Plus className="w-5 h-5 text-text-muted group-hover/add:text-primary" />
                                </div>
                                <span className="text-xs font-medium text-text-muted group-hover/add:text-text-primary">New Shot</span>
                            </button>
                        </div>
                    ) : (
                        <div className="h-32 flex flex-col items-center justify-center text-text-muted border-2 border-dashed border-border/30 rounded-md">
                            <p className="text-sm mb-3">No shots in this scene yet.</p>
                            <Button
                                variant="primary"
                                size="sm"
                                icon={<Plus className="w-3.5 h-3.5" />}
                                onClick={() => onAddShot(scene.id)}
                            >
                                Create First Shot
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};