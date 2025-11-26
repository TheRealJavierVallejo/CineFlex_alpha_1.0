/*
 * 🎞️ COMPONENT: TIMELINE VIEW
 * Commercial Quality Update: Teal Theme & Studio Classes
 */

import React, { useState } from 'react';
import { Project, Shot, Scene, ShowToastFn, ImageLibraryItem } from '../../types';
import Button from '../ui/Button';
import { TimelineHeader } from './TimelineHeader';
import { SceneList } from './SceneList';
import { ImageSelectorModal } from './ImageSelectorModal';
import { ScriptImporter } from './ScriptImporter';

interface TimelineViewProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onEditShot: (shot: Shot) => void;
  showToast: ShowToastFn;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ project, onUpdateProject, onEditShot, showToast }) => {
  const [confirmDeleteScene, setConfirmDeleteScene] = useState<{ id: string; name: string } | null>(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Unified Modal State
  const [imageModalState, setImageModalState] = useState<{
    isOpen: boolean;
    sceneId: string | null;
    updateShotId: string | null;
  }>({
    isOpen: false,
    sceneId: null,
    updateShotId: null
  });

  // --- HANDLERS ---

  const handleAddScene = () => {
    const newScene: Scene = { id: crypto.randomUUID(), sequence: project.scenes.length + 1, heading: 'INT. NEW SCENE - DAY', actionNotes: '' };
    onUpdateProject({ ...project, scenes: [...project.scenes, newScene] });
    showToast("Scene added", 'success');
  };

  const handleUpdateScene = (sceneId: string, updates: Partial<Scene>) => {
    const updatedScenes = project.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s);
    onUpdateProject({ ...project, scenes: updatedScenes });
  };

  const handleDeleteScene = (sceneId: string) => {
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    setConfirmDeleteScene({ id: sceneId, name: scene.heading });
  };

  const confirmSceneDeletion = () => {
    if (!confirmDeleteScene) return;
    const updatedShots = project.shots.filter(s => s.sceneId !== confirmDeleteScene.id);
    const updatedScenes = project.scenes.filter(s => s.id !== confirmDeleteScene.id);
    onUpdateProject({ ...project, scenes: updatedScenes, shots: updatedShots });
    showToast("Scene deleted", 'info');
    setConfirmDeleteScene(null);
  };

  const handleMoveScene = (index: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && index === 0) || (dir === 'down' && index === project.scenes.length - 1)) return;
    const newScenes = [...project.scenes];
    const target = dir === 'up' ? index - 1 : index + 1;
    [newScenes[index], newScenes[target]] = [newScenes[target], newScenes[index]];
    newScenes.forEach((s, i) => s.sequence = i + 1);
    onUpdateProject({ ...project, scenes: newScenes });
  };

  const handleTriggerAddShot = (sceneId: string) => {
    setImageModalState({ isOpen: true, sceneId, updateShotId: null });
  };

  const handleTriggerAddVisual = (shotId: string) => {
    const shot = project.shots.find(s => s.id === shotId);
    if (!shot) return;
    setImageModalState({ isOpen: true, sceneId: shot.sceneId || null, updateShotId: shotId });
  };

  const handleConfirmImageSelection = (selectedImage: ImageLibraryItem | null) => {
    const { sceneId, updateShotId } = imageModalState;
    
    if (updateShotId) {
      if (selectedImage) {
        const updatedShots = project.shots.map(s => s.id === updateShotId ? {
           ...s,
           generatedImage: selectedImage.url,
           generationCandidates: [selectedImage.url],
           description: selectedImage.prompt || s.description,
           model: selectedImage.model || s.model,
           aspectRatio: selectedImage.aspectRatio || s.aspectRatio
        } : s);
        onUpdateProject({ ...project, shots: updatedShots });
        showToast("Shot visual updated", 'success');
      } else {
        const shot = project.shots.find(s => s.id === updateShotId);
        if (shot) onEditShot(shot);
      }
    } 
    else if (sceneId) {
      const sceneShots = project.shots.filter(s => s.sceneId === sceneId);
      const maxSeq = sceneShots.length > 0 ? Math.max(...sceneShots.map(s => s.sequence)) : 0;
      
      const newShot: Shot = {
        id: crypto.randomUUID(),
        sceneId: sceneId,
        sequence: maxSeq + 1,
        description: selectedImage ? (selectedImage.prompt || '') : '',
        notes: '',
        characterIds: [],
        shotType: 'Wide Shot',
        aspectRatio: selectedImage?.aspectRatio || project.settings.aspectRatio,
        dialogue: '',
        generatedImage: selectedImage ? selectedImage.url : undefined,
        generationCandidates: selectedImage ? [selectedImage.url] : [],
        model: selectedImage?.model
      };

      onUpdateProject({ ...project, shots: [...project.shots, newShot] });
      
      if (selectedImage) {
        showToast("Shot added from library", 'success');
      } else {
        showToast("New shot created", 'success');
        onEditShot(newShot);
      }
    }

    setImageModalState({ isOpen: false, sceneId: null, updateShotId: null });
  };

  const handleUpdateShot = (id: string, updates: Partial<Shot>) => {
    const updatedShots = project.shots.map(s => s.id === id ? { ...s, ...updates } : s);
    onUpdateProject({ ...project, shots: updatedShots });
  };

  const handleDeleteShot = (shotId: string) => {
    const shotToDelete = project.shots.find(s => s.id === shotId);
    if (!shotToDelete) return;

    const updatedShots = project.shots.filter(s => s.id !== shotId);

    onUpdateProject({ ...project, shots: updatedShots });

    showToast("Shot deleted", 'info', {
      label: "Undo",
      onClick: () => {
        onUpdateProject({ ...project, shots: [...updatedShots, shotToDelete] });
        showToast("Shot restored", 'success');
      }
    });
  };

  return (
    <div className="h-full bg-background overflow-y-auto font-sans relative">
      <div className="max-w-[1600px] mx-auto pb-20">

        <TimelineHeader
          onAddScene={handleAddScene}
          onImportScript={() => setIsImporterOpen(true)}
        />

        <SceneList
          scenes={project.scenes}
          shots={project.shots}
          projectSettings={project.settings}
          onUpdateScene={handleUpdateScene}
          onDeleteScene={handleDeleteScene}
          onMoveScene={handleMoveScene}
          onAddShot={handleTriggerAddShot}
          onUpdateShot={handleUpdateShot}
          onDeleteShot={handleDeleteShot}
          onEditShot={onEditShot}
          onAddVisual={handleTriggerAddVisual}
        />

      </div>

      <ImageSelectorModal 
        isOpen={imageModalState.isOpen}
        onClose={() => setImageModalState({ isOpen: false, sceneId: null, updateShotId: null })}
        onSelect={handleConfirmImageSelection}
        projectId={project.id}
      />

      <ScriptImporter 
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        project={project}
        onUpdateProject={onUpdateProject}
        showToast={showToast}
      />

      {confirmDeleteScene && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in" onClick={() => setConfirmDeleteScene(null)}>
          <div className="bg-surface border border-border rounded-lg p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">Delete Scene?</h3>
            <p className="text-text-secondary text-sm mb-4">
              Are you sure you want to permanently delete "{confirmDeleteScene.name}"? This will also delete all shots in this scene. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteScene(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmSceneDeletion}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};