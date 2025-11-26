import React from 'react';
import { Scene, Shot, Project } from '../../types';
import { SceneItem } from './SceneItem';

interface SceneListProps {
    scenes: Scene[];
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

export const SceneList: React.FC<SceneListProps> = ({
    scenes,
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
        <div className="space-y-8 px-8">
            {scenes.map((scene, index) => {
                const sceneShots = shots
                    .filter(shot => shot.sceneId === scene.id)
                    .sort((a, b) => a.sequence - b.sequence);

                return (
                    <SceneItem
                        key={scene.id}
                        scene={scene}
                        index={index}
                        totalScenes={scenes.length}
                        shots={sceneShots}
                        projectSettings={projectSettings}
                        onUpdateScene={onUpdateScene}
                        onDeleteScene={onDeleteScene}
                        onMoveScene={onMoveScene}
                        onAddShot={onAddShot}
                        onUpdateShot={onUpdateShot}
                        onDeleteShot={onDeleteShot}
                        onEditShot={onEditShot}
                        onAddVisual={onAddVisual}
                    />
                );
            })}
        </div>
    );
};