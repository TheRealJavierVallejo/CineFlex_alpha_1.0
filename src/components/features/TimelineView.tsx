/*
 * 🎞️ COMPONENT: TIMELINE VIEW
 * Commercial Quality Update: Teal Theme & Studio Classes
 */

import React, { useState, useEffect } from 'react';
import { Project, Shot, Scene, ShowToastFn, ScriptElement, ImageLibraryItem } from '../../types';
import Button from '../ui/Button';
import { TimelineHeader } from './TimelineHeader';
import { SceneList } from './SceneList';
import { ScriptPicker } from './ScriptPicker';
import { ImageSelectorModal } from './ImageSelectorModal';

interface TimelineViewProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onEditShot: (shot: Shot) => void;
  importScript: (file: File) => Promise<void>; // New Prop
  showToast: ShowToastFn;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ project, onUpdateProject, onEditShot, importScript, showToast }) => {
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [isUploadingScript, setIsUploadingScript] = useState(false);
  const [confirmDeleteScene, setConfirmDeleteScene] = useState<{ id: string; name: string } | null>(null);

  // Unified Modal State for Adding OR Updating Shots
  const [imageModalState, setImageModalState] = useState<{
    isOpen: boolean;
    sceneId: string | null;
    updateShotId: string | null; // If present, we are updating this shot's visual
  }>({
    isOpen: false,
    sceneId: null,
    updateShotId: null
  });

  // State for the "Lego Picker"
  const [pickerState, setPickerState] = useState<{
    isOpen: boolean;
    shotId: string | null;
    type: 'action' | 'dialogue' | 'script' | null;
    sceneId: string | null;
  }>({ isOpen: false, shotId: null, type: null, sceneId: null });

  useEffect(() => {
    if (project.scriptElements) {
      setScriptElements(project.scriptElements);
    }
  }, [project]);

  // --- HANDLERS ---

  const handleScriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingScript(true);
    await importScript(file); // Use central brain
    setIsUploadingScript(false);
  };

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

  // 1. TRIGGER MODAL (ADD NEW)
  const handleTriggerAddShot = (sceneId: string) => {
    setImageModalState({ isOpen: true, sceneId, updateShotId: null });
  };

  // 2. TRIGGER MODAL (UPDATE EXISTING)
  const handleTriggerAddVisual = (shotId: string) => {
    const shot = project.shots.find(s => s.id === shotId);
    if (!shot) return;
    setImageModalState({ isOpen: true, sceneId: shot.sceneId || null, updateShotId: shotId });
  };

  // 3. CONFIRM SELECTION (Callback from Modal)
  const handleConfirmImageSelection = (selectedImage: ImageLibraryItem | null) => {
    const { sceneId, updateShotId } = imageModalState;
    
    // CASE A: UPDATE EXISTING SHOT
    if (updateShotId) {
      if (selectedImage) {
        // Apply image to existing shot
        const updatedShots = project.shots.map(s => s.id === updateShotId ? {
           ...s,
           generatedImage: selectedImage.url,
           generationCandidates: [selectedImage.url],
           description: selectedImage.prompt || s.description, // Update prompt if available
           model: selectedImage.model || s.model,
           aspectRatio: selectedImage.aspectRatio || s.aspectRatio
        } : s);
        onUpdateProject({ ...project, shots: updatedShots });
        showToast("Shot visual updated", 'success');
      } else {
        // User chose "Blank" for existing shot -> Open Editor
        const shot = project.shots.find(s => s.id === updateShotId);
        if (shot) onEditShot(shot);
      }
    } 
    // CASE B: ADD NEW SHOT
    else if (sceneId) {
      // Calculate next sequence
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

    // Reset Modal
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
    const updatedElements = scriptElements.map(el => ({
      ...el,
      associatedShotIds: el.associatedShotIds?.filter(id => id !== shotId)
    }));

    onUpdateProject({ ...project, shots: updatedShots, scriptElements: updatedElements });
    setScriptElements(updatedElements);

    showToast("Shot deleted", 'info', {
      label: "Undo",
      onClick: () => {
        onUpdateProject({ ...project, shots: [...updatedShots, shotToDelete], scriptElements: project.scriptElements });
        setScriptElements(project.scriptElements || []);
        showToast("Shot restored", 'success');
      }
    });
  };

  // --- PICKER LOGIC ---

  const handleOpenPicker = (shotId: string, type: 'action' | 'dialogue' | 'script') => {
    const shot = project.shots.find(s => s.id === shotId);
    if (!shot) return;
    const sceneId = shot.sceneId || project.scenes[0]?.id;
    if (!sceneId) return;
    setPickerState({ isOpen: true, shotId, type, sceneId });
  };

  const handleClosePicker = () => {
    setPickerState({ isOpen: false, shotId: null, type: null, sceneId: null });
  };

  const handleSelectScriptElement = (element: ScriptElement) => {
    if (!pickerState.shotId) return;

    const updatedShots = project.shots.map(s => {
      if (s.id === pickerState.shotId) {
        const currentIds = s.linkedElementIds || [];
        if (currentIds.includes(element.id)) return s;

        return {
          ...s,
          linkedElementIds: [...currentIds, element.id],
          description: s.description || element.content
        };
      }
      return s;
    });

    onUpdateProject({ ...project, shots: updatedShots });
  };

  const handleUnlinkElement = (shotId: string, elementId: string) => {
    const updatedShots = project.shots.map(s =>
      s.id === shotId
        ? { ...s, linkedElementIds: s.linkedElementIds?.filter(id => id !== elementId) || [] }
        : s
    );
    onUpdateProject({ ...project, shots: updatedShots });
  };

  const handleCreateAndLinkShot = async (sceneId: string) => {
    const newShot: Shot = {
      id: crypto.randomUUID(),
      sceneId: sceneId,
      sequence: project.shots.length + 1,
      description: '',
      notes: '',
      characterIds: [],
      shotType: 'Wide Shot',
      aspectRatio: project.settings.aspectRatio,
      dialogue: ''
    };

    onUpdateProject({ ...project, shots: [...project.shots, newShot] });
    setTimeout(() => handleOpenPicker(newShot.id, 'script'), 100);
  };

  return (
    <div className="h-full bg-background overflow-y-auto font-sans relative">
      <div className="max-w-[1600px] mx-auto pb-20">

        <TimelineHeader
          isUploadingScript={isUploadingScript}
          onImportScript={handleScriptUpload}
          onAddScene={handleAddScene}
        />

        <SceneList
          scenes={project.scenes}
          shots={project.shots}
          scriptElements={scriptElements}
          projectSettings={project.settings}
          onUpdateScene={handleUpdateScene}
          onDeleteScene={handleDeleteScene}
          onMoveScene={handleMoveScene}
          onAddShot={handleTriggerAddShot}
          onUpdateShot={handleUpdateShot}
          onDeleteShot={handleDeleteShot}
          onLinkElement={handleOpenPicker}
          onUnlinkElement={handleUnlinkElement}
          onEditShot={onEditShot}
          onCreateAndLinkShot={handleCreateAndLinkShot}
          onAddVisual={handleTriggerAddVisual} // NEW PROP
        />

      </div>

      {/* SHARED IMAGE SELECTOR MODAL */}
      <ImageSelectorModal 
        isOpen={imageModalState.isOpen}
        onClose={() => setImageModalState({ isOpen: false, sceneId: null, updateShotId: null })}
        onSelect={handleConfirmImageSelection}
        projectId={project.id}
      />

      <ScriptPicker
        isOpen={pickerState.isOpen}
        onClose={handleClosePicker}
        sceneId={pickerState.sceneId}
        scriptElements={scriptElements}
        usedElementIds={new Set(project.shots.flatMap(s => s.linkedElementIds || []))}
        onSelect={handleSelectScriptElement}
      />

      {/* Delete Scene Confirmation Modal */}
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