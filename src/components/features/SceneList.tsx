import React from 'react';
import { Scene, Shot, ScriptElement, Project } from '../../types';
import { SceneItem } from './SceneItem';

interface SceneListProps {
    scenes: Scene[];
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
}

export const SceneList: React.FC<SceneListProps> = ({
    scenes,
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
    onCreateAndLinkShot
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
                        scriptElements={scriptElements}
                        projectSettings={projectSettings}
                        onUpdateScene={onUpdateScene}
                        onDeleteScene={onDeleteScene}
                        onMoveScene={onMoveScene}
                        onAddShot={onAddShot}
                        onUpdateShot={onUpdateShot}
                        onDeleteShot={onDeleteShot}
                        onLinkElement={onLinkElement}
                        onUnlinkElement={onUnlinkElement}
                        onEditShot={onEditShot}
                        onCreateAndLinkShot={onCreateAndLinkShot}
                    />
                );
            })}
        </div>
    );
};
