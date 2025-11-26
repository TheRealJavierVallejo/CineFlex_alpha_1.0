import React from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Link, Link2Off, AlertCircle, FileText, Wand2 } from 'lucide-react';
import { Scene, Shot, Project, SyncStatus } from '../../types';
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
    onAddVisual,
    onAutoDraft
}) => {
    
    const getStatusColor = (status?: SyncStatus) => {
        switch (status) {
            case 'synced': return 'border-l-4 border-l-success';
            case 'orphaned': return 'border-l-4 border-l-error bg-error/5';
            case 'pending': return 'border-l-4 border-l-warning bg-warning/5';
            case 'visual_only': return 'border-l-4 border-l-accent';
            default: return 'border-l-4 border-l-transparent';
        }
    };

    const StatusBadge = ({ status }: { status?: SyncStatus }) => {
        if (!status || status === 'visual_only') return null;
        
        if (status === 'synced') {
            return (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success rounded text-[10px] font-medium border border-success/20" title="Synced with Script">
                    <Link className="w-3 h-3" />
                    <span>Synced</span>
                </div>
            );
        }
        if (status === 'orphaned') {
            return (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-error/10 text-error rounded text-[10px] font-medium border border-error/20" title="Scene deleted in script">
                    <Link2Off className="w-3 h-3" />
                    <span>Orphaned</span>
                </div>
            );
        }
        if (status === 'pending') {
            return (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning rounded text-[10px] font-medium border border-warning/20" title="New from script">
                    <AlertCircle className="w-3 h-3" />
                    <span>New Scene</span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`studio-card overflow-hidden group/scene mb-12 transition-colors ${getStatusColor(scene.syncStatus)}`}>
            {/* SCENE HEADER */}
            <div className="bg-surface-secondary p-4 flex flex-col border-b border-border/50">

                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-text-tertiary font-bold">SCENE {index + 1}</span>
                        <StatusBadge status={scene.syncStatus} />
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
                        {scene.syncStatus === 'synced' && (
                            <FileText className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary opacity-50" />
                        )}
                        <input
                            value={scene.heading}
                            onChange={(e) => onUpdateScene(scene.id, { heading: e.target.value.toUpperCase() })}
                            readOnly={scene.syncStatus === 'synced'}
                            className={`
                                bg-transparent text-text-primary font-bold text-lg font-mono outline-none w-full tracking-wide
                                ${scene.syncStatus === 'synced' ? 'pl-6 cursor-default text-text-secondary' : 'placeholder-text-tertiary'}
                            `}
                            placeholder="INT. SCENE HEADING - DAY"
                            title={scene.syncStatus === 'synced' ? "Managed by Script Sync" : "Editable Heading"}
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
                    // Empty Scene - Show default shot box OR Auto-Draft
                    <div className="p-8 flex flex-col items-center justify-center gap-4 border-t border-border/10">
                        {onAutoDraft && scene.syncStatus === 'synced' && (
                             <div className="mb-4 text-center animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-sm text-text-primary mb-3">Script content available.</p>
                                <Button
                                    variant="primary"
                                    icon={<Wand2 className="w-4 h-4" />}
                                    onClick={() => onAutoDraft(scene.id)}
                                    className="shadow-lg shadow-primary/20"
                                >
                                    Auto-Draft Shots from Script
                                </Button>
                                <div className="text-[10px] text-text-tertiary mt-2">
                                    Generates separate shots for Action and Dialogue blocks.
                                </div>
                             </div>
                        )}
                        
                        {!onAutoDraft || scene.syncStatus !== 'synced' ? (
                             <p className="text-sm text-text-tertiary">No shots in this scene yet.</p>
                        ) : (
                            <div className="w-full border-t border-border/20 my-2" />
                        )}

                        <Button
                            variant={onAutoDraft && scene.syncStatus === 'synced' ? "secondary" : "primary"}
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