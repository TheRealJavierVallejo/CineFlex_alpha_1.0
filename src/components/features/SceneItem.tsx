import React from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { Scene, Shot, Project } from '../../types';
import Button from '../ui/Button';
import { ShotRow } from './ShotRow';

interface SceneItemProps {
    scene: Scene;
    index: number;
    totalScenes: number;
    shots: Shot[];
    projectSettings: Project['settings'];
    onUpdateScene: (id: string, updates: Partial<Scene>) => void;
    onDeleteScene: (id: string) => void;
    onMoveScene: (index: number, dir: 'up' | 'down') => void;
    onAddShot: (sceneId: string) => void;
    onUpdateShot: (id: string, updates: Partial<Shot>) => void;
    onDeleteShot: (id: string) => void;
    onEditShot: (shot: Shot) => void;
    onAddVisual: (shotId: string) => void;
}

export const SceneItem: React.FC<SceneItemProps> = ({
    scene,
    index,
    totalScenes,
    shots,
    projectSettings,
    onUpdateScene,
    onDeleteScene,
    onMoveScene,
    onAddShot,
    onUpdateShot,
    onDeleteShot,
    onEditShot,
    onAddVisual
}) => {
    return (
        <div className="studio-card overflow-hidden group/scene mb-12">
            {/* SCENE HEADER (Sketch Style) */}
            <div className="bg-surface-secondary p-4 flex flex-col border-b-2 border-dashed border-border/30">

                {/* Dashed Line Top */}
                <div className="w-full border-t-2 border-dashed border-border/30 mb-2"></div>

                <div className="flex items-center gap-4">
                    {/* Scene Controls */}
                    <div className="flex flex-col items-center justify-center gap-1">
                        <button onClick={() => onMoveScene(index, 'up')} disabled={index === 0} className="text-text-tertiary hover:text-primary disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                        <span className="font-mono text-xs text-text-secondary font-bold">{index + 1}</span>
                        <button onClick={() => onMoveScene(index, 'down')} disabled={index === totalScenes - 1} className="text-text-tertiary hover:text-primary disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                    </div>

                    {/* Heading Input */}
                    <div className="flex-1">
                        <input
                            value={scene.heading}
                            onChange={(e) => onUpdateScene(scene.id, { heading: e.target.value.toUpperCase() })}
                            className="bg-transparent text-text-primary font-bold text-xl font-mono outline-none placeholder-text-tertiary w-full tracking-wider"
                            placeholder="INT. SCENE HEADING - DAY"
                            aria-label="Scene Heading"
                        />
                    </div>

                    <button onClick={() => onDeleteScene(scene.id)} className="text-text-tertiary hover:text-error p-2"><Trash2 className="w-4 h-4" /></button>
                </div>

                {/* Dashed Line Bottom */}
                <div className="w-full border-b-2 border-dashed border-border/30 mt-2"></div>
            </div>

            {/* SHOT LIST (Lego Blocks) */}
            <div className="bg-[#1a1a1a] min-h-[100px]">
                {shots.length > 0 ? (
                    <div className="flex flex-col">
                        {shots.map(shot => (
                            <ShotRow
                                key={shot.id}
                                shot={shot}
                                onUpdateShot={onUpdateShot}
                                onDeleteShot={onDeleteShot}
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
                    // Empty Scene - Show default shot box
                    <div className="p-8 flex flex-col items-center justify-center gap-4">
                        <p className="text-sm text-text-tertiary">No shots in this scene yet.</p>
                        <Button
                            variant="primary"
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => onAddShot(scene.id)}
                        >
                            Add First Shot
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};