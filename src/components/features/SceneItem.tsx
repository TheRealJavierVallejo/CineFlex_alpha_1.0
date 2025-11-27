import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Type, ChevronRight, ChevronDown } from 'lucide-react';
import { Scene, Shot, ScriptElement, Project } from '../../types';
import Button from '../ui/Button';
import { ShotRow } from './ShotRow';

interface SceneItemProps {
    scene: Scene;
    index: number;
    totalScenes: number;
    shots: Shot[];
    scriptElements: ScriptElement[];
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
    projectSettings,
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
        <div className="studio-card overflow-hidden group/scene mb-6">
            {/* SCENE HEADER (Sketch Style) */}
            <div 
                className="bg-surface-secondary p-4 flex flex-col border-b-2 border-dashed border-border/30 cursor-pointer select-none"
                onClick={(e) => {
                    // Don't toggle if clicking an input/button
                    if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON') {
                        setIsExpanded(!isExpanded);
                    }
                }}
            >
                {/* Dashed Line Top */}
                <div className="w-full border-t-2 border-dashed border-border/30 mb-2"></div>

                <div className="flex items-center gap-4">
                    {/* Expand/Collapse Chevron */}
                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown className="w-4 h-4 text-text-tertiary" />
                    </div>

                    {/* Scene Controls */}
                    <div className="flex flex-col items-center justify-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'up'); }} disabled={index === 0} className="text-text-tertiary hover:text-primary disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                        <span className="font-mono text-xs text-text-secondary font-bold">{index + 1}</span>
                        <button onClick={(e) => { e.stopPropagation(); onMoveScene(index, 'down'); }} disabled={index === totalScenes - 1} className="text-text-tertiary hover:text-primary disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                    </div>

                    {/* Heading Input */}
                    <div className="flex-1">
                        <input
                            value={scene.heading}
                            onChange={(e) => onUpdateScene(scene.id, { heading: e.target.value.toUpperCase() })}
                            className="bg-transparent text-text-primary font-bold text-xl font-mono outline-none placeholder-text-tertiary w-full tracking-wider"
                            placeholder="INT. SCENE HEADING - DAY"
                            aria-label="Scene Heading"
                            onClick={(e) => e.stopPropagation()}
                        />
                        {!isExpanded && (
                            <div className="text-xs text-text-tertiary mt-1 flex items-center gap-2">
                                <span className="bg-surface border border-border px-1.5 rounded">{shots.length} Shots</span>
                                <span className="truncate max-w-[500px]">{scene.actionNotes?.substring(0, 100)}...</span>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id); }} 
                        className="text-text-tertiary hover:text-error p-2"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Dashed Line Bottom */}
                <div className="w-full border-b-2 border-dashed border-border/30 mt-2"></div>
            </div>

            {/* SHOT LIST (Lego Blocks) - Only render if expanded */}
            {isExpanded && (
                <div className="bg-[#1a1a1a] min-h-[100px] animate-in slide-in-from-top-2 fade-in duration-200">
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
                            <div className="p-4 flex justify-center border-t border-border/10">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={<Plus className="w-3 h-3" />}
                                    onClick={() => onAddShot(scene.id)}
                                >
                                    Add Shot
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // Empty Scene - Show default shot box with Link Script
                        <div className="grid grid-cols-2 border-b border-border/10">
                            {/* LEFT: Visual Box with Add Shot on Hover */}
                            <div className="p-4 border-r border-border/10 flex flex-col gap-3">
                                <span className="text-[10px] font-mono text-text-tertiary opacity-0">SHOT #1</span>
                                <div className="w-full aspect-video bg-background border border-border/10 rounded-sm flex flex-col items-center justify-center gap-2 relative group/visual">
                                    {/* Add Shot Button - Shows on Hover */}
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={<Plus className="w-3 h-3" />}
                                        onClick={() => onAddShot(scene.id)}
                                        className="opacity-0 group-hover/visual:opacity-100 transition-opacity"
                                    >
                                        Add Shot
                                    </Button>
                                </div>
                            </div>

                            {/* RIGHT: Link Script Button */}
                            <div className="p-4 flex flex-col gap-3">
                                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                    <p className="text-[10px] uppercase tracking-widest text-text-tertiary">Link Script</p>
                                    <button
                                        onClick={() => onCreateAndLinkShot(scene.id)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-secondary border border-border/50 text-xs text-text-secondary hover:border-primary hover:text-primary transition-colors"
                                    >
                                        <Type className="w-3 h-3" /> Link Script
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};