/*
 * 🎞️ COMPONENT: TIMELINE VIEW
 * Layout: Full-width list with sticky headers.
 */

import React, { useState, useEffect } from 'react';
import { Project, Shot, Scene, ShowToastFn, ScriptElement, ImageLibraryItem, Location } from '../../types';
import Button from '../ui/Button';
import { TimelineHeader } from './TimelineHeader';
import { SceneList } from './SceneList';
import { ScriptPicker } from './ScriptPicker';
import { ImageSelectorModal } from './ImageSelectorModal';
import { generateStoryboardPDF } from '../../services/pdfExport';
import { getLocations } from '../../services/storage';
import { EmptyProjectState } from './EmptyProjectState';

interface TimelineViewProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onEditShot: (shot: Shot) => void;
  importScript: (file: File) => Promise<void>;
  showToast: ShowToastFn;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ project, onUpdateProject, onEditShot, importScript, showToast }) => {
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isUploadingScript, setIsUploadingScript] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmDeleteScene, setConfirmDeleteScene] = useState<{ id: string; name: string } | null>(null);

  // Modal States
  const [imageModalState, setImageModalState] = useState<{ isOpen: boolean; sceneId: string | null; updateShotId: string | null; }>({ isOpen: false, sceneId: null, updateShotId: null });
  const [pickerState, setPickerState] = useState<{ isOpen: boolean; shotId: string | null; type: 'action' | 'dialogue' | 'script' | null; sceneId: string | null; }>({ isOpen: false, shotId: null, type: null, sceneId: null });

  useEffect(() => { if (project.scriptElements) setScriptElements(project.scriptElements); }, [project]);
  useEffect(() => { if (project.id) getLocations(project.id).then(setLocations); }, [project.id]);

  // --- HANDLERS (Simplified for brevity, logic identical to previous) ---
  const handleScriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingScript(true);
    await importScript(file);
    setIsUploadingScript(false);
  };

  const handleExportPDF = async () => {
    if (project.scenes.length === 0) { showToast("Add scenes before exporting", 'warning'); return; }
    setIsExporting(true);
    try { await generateStoryboardPDF(project); showToast("PDF Downloaded", 'success'); } 
    catch (e) { showToast("Export failed", 'error'); } 
    finally { setIsExporting(false); }
  };

  const handleAddScene = () => {
    const newSceneId = crypto.randomUUID();
    const newScene: Scene = { id: newSceneId, sequence: project.scenes.length + 1, heading: 'INT. NEW SCENE - DAY', actionNotes: '' };
    const newScriptEl: ScriptElement = { id: crypto.randomUUID(), type: 'scene_heading', content: newScene.heading, sceneId: newSceneId, sequence: (project.scriptElements?.length || 0) + 1 };
    onUpdateProject({ ...project, scenes: [...project.scenes, newScene], scriptElements: [...(project.scriptElements || []), newScriptEl] });
    showToast("Scene added", 'success');
  };

  const handleUpdateScene = (sceneId: string, updates: Partial<Scene>) => {
    const updatedScenes = project.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s);
    let updatedScriptElements = project.scriptElements || [];
    if (updates.heading) {
        updatedScriptElements = updatedScriptElements.map(el => (el.sceneId === sceneId && el.type === 'scene_heading') ? { ...el, content: updates.heading! } : el);
    }
    onUpdateProject({ ...project, scenes: updatedScenes, scriptElements: updatedScriptElements });
  };

  const handleDeleteScene = (sceneId: string) => {
    const scene = project.scenes.find(s => s.id === sceneId);
    if (scene) setConfirmDeleteScene({ id: sceneId, name: scene.heading });
  };

  const confirmSceneDeletion = () => {
    if (!confirmDeleteScene) return;
    const updatedShots = project.shots.filter(s => s.sceneId !== confirmDeleteScene.id);
    const updatedScenes = project.scenes.filter(s => s.id !== confirmDeleteScene.id);
    const updatedScriptElements = (project.scriptElements || []).filter(el => el.sceneId !== confirmDeleteScene.id);
    onUpdateProject({ ...project, scenes: updatedScenes, shots: updatedShots, scriptElements: updatedScriptElements });
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

  // Image & Script Pickers
  const handleTriggerAddShot = (sceneId: string) => setImageModalState({ isOpen: true, sceneId, updateShotId: null });
  const handleTriggerAddVisual = (shotId: string) => {
    const shot = project.shots.find(s => s.id === shotId);
    if (shot) setImageModalState({ isOpen: true, sceneId: shot.sceneId || null, updateShotId: shotId });
  };

  const handleConfirmImageSelection = (selectedImage: ImageLibraryItem | null) => {
    const { sceneId, updateShotId } = imageModalState;
    if (updateShotId) {
      if (selectedImage) {
        const updatedShots = project.shots.map(s => s.id === updateShotId ? { ...s, generatedImage: selectedImage.url, generationCandidates: [selectedImage.url], description: selectedImage.prompt || s.description, model: selectedImage.model || s.model, aspectRatio: selectedImage.aspectRatio || s.aspectRatio } : s);
        onUpdateProject({ ...project, shots: updatedShots });
      } else {
        const shot = project.shots.find(s => s.id === updateShotId);
        if (shot) onEditShot(shot);
      }
    } else if (sceneId) {
      const sceneShots = project.shots.filter(s => s.sceneId === sceneId);
      const maxSeq = sceneShots.length > 0 ? Math.max(...sceneShots.map(s => s.sequence)) : 0;
      const scene = project.scenes.find(s => s.id === sceneId);
      const newShot: Shot = { id: crypto.randomUUID(), sceneId: sceneId, sequence: maxSeq + 1, description: selectedImage?.prompt || '', notes: '', characterIds: [], shotType: 'Wide Shot', aspectRatio: selectedImage?.aspectRatio || project.settings.aspectRatio, generatedImage: selectedImage?.url, generationCandidates: selectedImage ? [selectedImage.url] : [], model: selectedImage?.model, locationId: scene?.locationId };
      onUpdateProject({ ...project, shots: [...project.shots, newShot] });
      if (!selectedImage) onEditShot(newShot);
    }
    setImageModalState({ isOpen: false, sceneId: null, updateShotId: null });
  };

  const handleUpdateShot = (id: string, updates: Partial<Shot>) => onUpdateProject({ ...project, shots: project.shots.map(s => s.id === id ? { ...s, ...updates } : s) });
  
  const handleDeleteShot = (shotId: string) => {
    const shotToDelete = project.shots.find(s => s.id === shotId);
    if (!shotToDelete) return;
    const updatedShots = project.shots.filter(s => s.id !== shotId);
    const updatedElements = scriptElements.map(el => ({ ...el, associatedShotIds: el.associatedShotIds?.filter(id => id !== shotId) }));
    onUpdateProject({ ...project, shots: updatedShots, scriptElements: updatedElements });
    setScriptElements(updatedElements);
    showToast("Shot deleted", 'info', { label: "Undo", onClick: () => { onUpdateProject({ ...project, shots: [...updatedShots, shotToDelete], scriptElements: project.scriptElements }); setScriptElements(project.scriptElements || []); showToast("Shot restored", 'success'); } });
  };

  const handleOpenPicker = (shotId: string, type: 'action' | 'dialogue' | 'script') => {
    const shot = project.shots.find(s => s.id === shotId);
    if (shot) setPickerState({ isOpen: true, shotId, type, sceneId: shot.sceneId || project.scenes[0]?.id });
  };

  const handleSelectScriptElement = (element: ScriptElement) => {
    if (!pickerState.shotId) return;
    onUpdateProject({ ...project, shots: project.shots.map(s => s.id === pickerState.shotId ? { ...s, linkedElementIds: [...(s.linkedElementIds || []), element.id], description: s.description || element.content } : s) });
  };

  const handleUnlinkElement = (shotId: string, elementId: string) => {
    onUpdateProject({ ...project, shots: project.shots.map(s => s.id === shotId ? { ...s, linkedElementIds: s.linkedElementIds?.filter(id => id !== elementId) || [] } : s) });
  };

  const handleCreateAndLinkShot = async (sceneId: string) => {
    const newShot: Shot = { id: crypto.randomUUID(), sceneId: sceneId, sequence: project.shots.length + 1, description: '', notes: '', characterIds: [], shotType: 'Wide Shot', aspectRatio: project.settings.aspectRatio, dialogue: '' };
    onUpdateProject({ ...project, shots: [...project.shots, newShot] });
    setTimeout(() => handleOpenPicker(newShot.id, 'script'), 100);
  };

  const hasContent = project.scenes.length > 0;

  return (
    <div className="h-full bg-background overflow-hidden relative flex flex-col">
      {hasContent ? (
        <>
           <TimelineHeader isUploadingScript={isUploadingScript} onImportScript={handleScriptUpload} onAddScene={handleAddScene} onExportPDF={handleExportPDF} isExporting={isExporting} />
           
           <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
               {/* SCENE LIST CONTAINER */}
               <div className="w-full pb-32">
                  <SceneList
                    scenes={project.scenes}
                    shots={project.shots}
                    scriptElements={scriptElements}
                    locations={locations}
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
                    onAddVisual={handleTriggerAddVisual}
                  />
               </div>
           </div>
        </>
      ) : (
        <EmptyProjectState title="Empty Board" description="Start by adding a scene." onImport={handleScriptUpload} onCreate={handleAddScene} isImporting={isUploadingScript} />
      )}

      {/* Modals & Pickers */}
      <ImageSelectorModal isOpen={imageModalState.isOpen} onClose={() => setImageModalState({ isOpen: false, sceneId: null, updateShotId: null })} onSelect={handleConfirmImageSelection} projectId={project.id} />
      <ScriptPicker isOpen={pickerState.isOpen} onClose={() => setPickerState({ isOpen: false, shotId: null, type: null, sceneId: null })} sceneId={pickerState.sceneId} scriptElements={scriptElements} usedElementIds={new Set(project.shots.flatMap(s => s.linkedElementIds || []))} onSelect={handleSelectScriptElement} />
      
      {confirmDeleteScene && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] animate-in fade-in" onClick={() => setConfirmDeleteScene(null)}>
          <div className="bg-surface border border-border rounded-lg p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-2">Delete Scene?</h3>
            <p className="text-text-secondary text-sm mb-4">Are you sure? This will delete all shots in this scene.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteScene(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={confirmSceneDeletion} className="bg-red-600 hover:bg-red-700">Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};