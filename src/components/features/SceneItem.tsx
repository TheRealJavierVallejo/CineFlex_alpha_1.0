import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Type, ChevronDown, MapPin, GripVertical } from 'lucide-react';
import { Scene, Shot, ScriptElement, Project, Location } from '../../types';
import Button from '../ui/Button';
import { ShotRow } from './ShotRow';

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
    onLinkElement: (shotId: string, type: 'action' | 'dialogue' | 'script') => void;
    onUnlinkElement: (shotId: string, elementId: string) => void;
    onEditShot: (shot: Shot) => void;
    onCreateAndLinkShot: (sceneId: string) => void;
    onAddVisual: (shotId: string) => void; 
}

export const SceneItem: React.FC<SceneItemProps> = ({
    scene,
    index,
    totalScenes,
    shots,
    scriptElements,
    locations,
    onUpdateScene,
    onDeleteScene,
    onMoveScene,
    onAddShot,
    onUpdateShot,
    onDeleteShot,
    onLinkElement,
    onUnlinkElement,
    onEditShot,
    onCreateAndLinkShot,
    onAddVisual
}) => {
    // Default to open for first scene, closed for others to save performance
    const [isExpanded, setIsExpanded] = useState(index === 0 || shots.length === 0);

    return (
        <div className="studio-card overflow-hidden group/scene mb-6 shadow-sm border-border hover:border-border-focus/30 transition-colors">
            {/* SCENE HEADER (Modern Production Style) */}
            <div 
                className={`
                    p-3 pr-4 flex items-center gap-4 cursor-pointer select-none transition-all border-l-4
                    ${isExpanded 
                        ? 'bg-surface-secondary/80 border-b border-border border-l-primary' 
                        : 'bg-surface hover:bg-surface-secondary border-l-border/50'}
                `}
                onClick={(e) => {
                    // Don't toggle if clicking an input/button
                    if (['INPUT', 'BUTTON', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                        return;
                    }
                    setIsExpanded(!isExpanded);
                }}
            >
                {/* Drag Handle / Expand */}
                <div className="flex items-center gap-2 text-text-tertiary">
                    <GripVertical className="w-4 h-4 opacity-50" />
                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>

                {/* Sequence Number */}
                <div className="flex flex-col items-center justify-center gap-0 w-8">
                    <button onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'up'); }} disabled={index === 0} className="text-text-tertiary hover:text-primary disabled:opacity-0 -mb-1"><ArrowUp className="w-3 h-3" /></button>
                    <span className="font-mono text-sm font-bold text-text-secondary">{index + 1}</span>
                    <button onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'down'); }} disabled={index === totalScenes - 1} className="text-text-tertiary hover:text-primary disabled:opacity-0 -mt-1"><ArrowDown className="w-3 h-3" /></button>
                </div>

                {/* Heading & Metadata */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                    <input
                        value={scene.heading}
                        onChange={(e) => onUpdateScene(scene.id, { heading: e.target.value.toUpperCase() })}
                        className="bg-transparent text-text-primary font-bold text-lg font-mono outline-none placeholder-text-tertiary w-full tracking-wide truncate focus:text-primary transition-colors"
                        placeholder="INT. SCENE HEADING - DAY"
                        aria-label="Scene Heading"
                        onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className="flex items-center gap-4 mt-1">
                            {/* Location Selector */}
                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <MapPin className={`w-3 h-3 ${scene.locationId ? 'text-primary' : 'text-text-tertiary'}`} />
                            <div className="relative group/loc">
                                <select
                                    value={scene.locationId || ''}
                                    onChange={(e) => onUpdateScene(scene.id, { locationId: e.target.value || undefined })}
                                    className="bg-transparent text-[11px] text-text-secondary hover:text-text-primary border-none outline-none cursor-pointer appearance-none pr-4 font-medium transition-colors"
                                >
                                    <option value="">No Location</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            </div>

                            {/* Collapsed Preview Info */}
                            {!isExpanded && (
                            <div className="text-[11px] text-text-tertiary flex items-center gap-3 opacity-70">
                                <span className="bg-surface border border-border px-1.5 rounded-sm">{shots.length} Shots</span>
                                <span className="truncate max-w-[300px]">{scene.actionNotes?.substring(0, 80) || "No description"}</span>
                            </div>
                            )}
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover/scene:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id); }} 
                        className="text-text-tertiary hover:text-error hover:bg-error/10 p-2 rounded transition-colors"
                        title="Delete Scene"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* SHOT LIST (Lego Blocks) - Only render if expanded */}
            {isExpanded && (
                <div className="bg-surface-secondary min-h-[100px] animate-in slide-in-from-top-1 fade-in duration-200 border-t border-border">
                    {shots.length > 0 ? (
                        <div className="flex flex-col">
                            {shots.map(shot => (
                                <ShotRow
                                    key={shot.id}
                                    shot={shot}
                                    linkedElements={scriptElements.filter(el => shot.linkedElementIds?.includes(el.id))}
                                    onUpdateShot={onUpdateShot}
                                    onDeleteShot={onDeleteShot}
                                    onLinkElement={onLinkElement}
                                    onUnlinkElement={onUnlinkElement}
                                    onEditShot={onEditShot}
                                    onAddVisual={onAddVisual}
                                />
                            ))}

                            {/* Add Shot Button - Always at bottom */}
                            <div className="p-3 flex justify-center border-t border-border/10 bg-surface/50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={<Plus className="w-3 h-3" />}
                                    onClick={() => onAddShot(scene.id)}
                                >
                                    Add Shot to Scene
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // Empty Scene - Show default shot box with Link Script
                        <div className="grid grid-cols-2">
                            {/* LEFT: Visual Box with Add Shot on Hover */}
                            <div className="p-6 border-r border-border/10 flex flex-col gap-3 items-center justify-center">
                                <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">No Shots Yet</span>
                                <div className="w-64 aspect-video bg-surface border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 relative group/visual hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onAddShot(scene.id)}>
                                    <Plus className="w-6 h-6 text-text-tertiary group-hover/visual:text-primary transition-colors" />
                                    <span className="text-xs text-text-secondary group-hover/visual:text-text-primary">Create First Shot</span>
                                </div>
                            </div>

                            {/* RIGHT: Link Script Button */}
                            <div className="p-6 flex flex-col items-center justify-center bg-surface/20">
                                <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-3">Optional</p>
                                <button
                                    onClick={() => onCreateAndLinkShot(scene.id)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-surface border border-border text-xs text-text-secondary hover:border-primary hover:text-primary transition-all shadow-sm"
                                >
                                    <Type className="w-3 h-3" /> Auto-Create from Script
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};