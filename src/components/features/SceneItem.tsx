import React from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, FileText } from 'lucide-react';
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
    onAutoDraft?: (sceneId: string) => void;
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
        <div className="studio-card overflow-hidden group/scene mb-12 transition-colors border-l-4 border-l-transparent">
            {/* SCENE HEADER */}
            <div className="bg-surface-secondary p-4 flex flex-col border-b border-border/50">

                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-text-tertiary font-bold">SCENE {index + 1}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover/scene:opacity-100 transition-opacity">
                        <button onClick={() => onMoveScene(index, 'up')} disabled={index === 0} className="p-1 hover:bg-surface rounded text-text-tertiary hover:text-primary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onMoveScene(index, 'down')} disabled={index === totalScenes - 1} className="p-1 hover:bg-surface rounded text-text-tertiary hover:text-primary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <div className="w-[1px] h-4 bg-border mx-1" />
                        <button onClick={() => onDeleteScene(scene.id)} className="p-1 hover:bg-surface rounded text-text-tertiary hover:text-error"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Scene Heading */}
                    <div className="flex-1 relative">
                        <input
                            value={scene.heading}
                            onChange={(e) => onUpdateScene(scene.id, { heading: e.target.value.toUpperCase() })}
                            className="bg-transparent text-text-primary font-bold text-lg font-mono outline-none w-full tracking-wide placeholder-text-tertiary"
                            placeholder="INT. SCENE HEADING - DAY"
                        />
                    </div>
                </div>
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
                    // Empty Scene - Standard UI
                    <div className="p-8 flex flex-col items-center justify-center gap-4 border-t border-border/10">
                        <p className="text-sm text-text-tertiary">No shots in this scene yet.</p>
                        <Button
                            variant="primary"
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => onAddShot(scene.id)}
                        >
                            Create Manual Shot
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};