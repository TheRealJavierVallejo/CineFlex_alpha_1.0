/*
 * 🎞️ COMPONENT: TIMELINE VIEW
 * Commercial Quality Update: Teal Theme & Studio Classes
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, Shot, Scene, ShowToastFn, ScriptElement, ImageLibraryItem, Location } from '../../types';
import Button from '../ui/Button';
import { TimelineHeader } from './TimelineHeader';
import { SceneList } from './SceneList';
import { ScriptPicker } from './ScriptPicker';
import { ImageSelectorModal } from './ImageSelectorModal';
import { generateStoryboardPDF } from '../../services/pdfExport';
import { getLocations } from '../../services/storage';
import { EmptyProjectState } from './EmptyProjectState';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';
import { Hash, Search } from 'lucide-react';
// IMPORT CONTEXT
import { useSubscription } from '../../context/SubscriptionContext';

interface TimelineViewProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onEditShot: (shot: Shot) => void;
  importScript: (file: File) => Promise<void>;
  showToast: ShowToastFn;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ project, onUpdateProject, onEditShot, showToast }) => {
  const { tier } = useSubscription(); // GET TIER
  const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmDeleteScene, setConfirmDeleteScene] = useState<{ id: string; name: string } | null>(null);
  const [sceneSearch, setSceneSearch] = useState('');

  // Unified Modal State
  const [imageModalState, setImageModalState] = useState<{
    isOpen: boolean;
    sceneId: string | null;
    updateShotId: string | null;
  }>({ isOpen: false, sceneId: null, updateShotId: null });

  const [pickerState, setPickerState] = useState<{
    isOpen: boolean;
    shotId: string | null;
    type: 'action' | 'dialogue' | 'script' | null;
    sceneId: string | null;
  }>({ isOpen: false, shotId: null, type: null, sceneId: null });

  useEffect(() => {
    if (project.scriptElements) setScriptElements(project.scriptElements);
  }, [project]);

  useEffect(() => {
    if (project.id) getLocations(project.id).then(setLocations);
  }, [project.id]);

  const scrollToScene = useCallback((id: string) => {
    const el = document.getElementById(`scene-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // --- HANDLERS (Same as before) ---
  const handleExportPDF = async () => {
    if (project.scenes.length === 0) {
      showToast("Add scenes before exporting", 'warning');
      return;
    }
    setIsExporting(true);
    showToast("Generating PDF...", 'info');
    try {
      // PASS TIER HERE
      await generateStoryboardPDF(project, tier);
      showToast("PDF Downloaded", 'success');
    } catch (e) {
      console.error(e);
      showToast("Export failed", 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddScene = () => {
    const newSceneId = crypto.randomUUID();
    const newScene: Scene = { id: newSceneId, sequence: project.scenes.length + 1, heading: 'INT. NEW SCENE - DAY', actionNotes: '' };
    const newScriptEl: ScriptElement = {
      id: crypto.randomUUID(), type: 'scene_heading', content: newScene.heading, sceneId: newSceneId, sequence: (project.scriptElements?.length || 0) + 1
    };
    onUpdateProject({ ...project, scenes: [...project.scenes, newScene], scriptElements: [...(project.scriptElements || []), newScriptEl] });
    showToast("Scene added", 'success');
  };

  const handleUpdateScene = (sceneId: string, updates: Partial<Scene>) => {
    const updatedScenes = project.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s);
    let updatedScriptElements = project.scriptElements || [];
    if (updates.heading) {
      updatedScriptElements = updatedScriptElements.map(el => {
        if (el.sceneId === sceneId && el.type === 'scene_heading') return { ...el, content: updates.heading! };
        return el;
      });
    }
    onUpdateProject({ ...project, scenes: updatedScenes, scriptElements: updatedScriptElements });
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
          ...s, generatedImage: selectedImage.url, generationCandidates: [selectedImage.url], description: selectedImage.prompt || s.description, model: selectedImage.model || s.model, aspectRatio: selectedImage.aspectRatio || s.aspectRatio
        } : s);
        onUpdateProject({ ...project, shots: updatedShots });
        showToast("Shot visual updated", 'success');
      } else {
        const shot = project.shots.find(s => s.id === updateShotId);
        if (shot) onEditShot(shot);
      }
    } else if (sceneId) {
      const sceneShots = project.shots.filter(s => s.sceneId === sceneId);
      const maxSeq = sceneShots.length > 0 ? Math.max(...sceneShots.map(s => s.sequence)) : 0;
      const scene = project.scenes.find(s => s.id === sceneId);
      const newShot: Shot = {
        id: crypto.randomUUID(), sceneId: sceneId, sequence: maxSeq + 1, description: selectedImage ? (selectedImage.prompt || '') : '', notes: '', characterIds: [], shotType: 'Wide Shot', aspectRatio: selectedImage?.aspectRatio || project.settings.aspectRatio, dialogue: '', generatedImage: selectedImage ? selectedImage.url : undefined, generationCandidates: selectedImage ? [selectedImage.url] : [], model: selectedImage?.model, locationId: scene?.locationId
      };
      onUpdateProject({ ...project, shots: [...project.shots, newShot] });
      selectedImage ? showToast("Shot added from library", 'success') : (showToast("New shot created", 'success'), onEditShot(newShot));
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
    const updatedElements = scriptElements.map(el => ({ ...el, associatedShotIds: el.associatedShotIds?.filter(id => id !== shotId) }));
    onUpdateProject({ ...project, shots: updatedShots, scriptElements: updatedElements });
    setScriptElements(updatedElements);
    showToast("Shot deleted", 'info', { label: "Undo", onClick: () => { onUpdateProject({ ...project, shots: [...updatedShots, shotToDelete], scriptElements: project.scriptElements }); setScriptElements(project.scriptElements || []); showToast("Shot restored", 'success'); } });
  };

  const handleOpenPicker = (shotId: string, type: 'action' | 'dialogue' | 'script') => {
    const shot = project.shots.find(s => s.id === shotId);
    if (!shot) return;
    const sceneId = shot.sceneId || project.scenes[0]?.id;
    if (!sceneId) return;
    setPickerState({ isOpen: true, shotId, type, sceneId });
  };

  const handleSelectScriptElement = (elements: ScriptElement[]) => {
    if (!pickerState.shotId) return;

    // Auto-generate description from selected elements if one doesn't exist
    const contentText = elements.map(e => {
      if (e.type === 'character') return e.content.toUpperCase();
      if (e.type === 'parenthetical') return `(${e.content})`;
      return e.content;
    }).join('\n');

    const idsToAdd = elements.map(e => e.id);

    const updatedShots = project.shots.map(s => {
      if (s.id === pickerState.shotId) {
        const currentIds = s.linkedElementIds || [];
        // Merge without duplicates
        const newIds = Array.from(new Set([...currentIds, ...idsToAdd]));

        return {
          ...s,
          linkedElementIds: newIds,
          description: s.description || contentText // Only set if empty
        };
      }
      return s;
    });
    onUpdateProject({ ...project, shots: updatedShots });
  };

  const handleUnlinkElement = useCallback((shotId: string, elementId: string) => {
    const updatedShots = project.shots.map(s => s.id === shotId ? { ...s, linkedElementIds: s.linkedElementIds?.filter(id => id !== elementId) || [] } : s);
    onUpdateProject({ ...project, shots: updatedShots });
  }, [project, onUpdateProject]);

  const handleCreateAndLinkShot = async (sceneId: string) => {
    const scene = project.scenes.find(s => s.id === sceneId);
    const newShot: Shot = { id: crypto.randomUUID(), sceneId: sceneId, sequence: project.shots.length + 1, description: '', notes: '', characterIds: [], shotType: 'Wide Shot', aspectRatio: project.settings.aspectRatio, dialogue: '', locationId: scene?.locationId };
    onUpdateProject({ ...project, shots: [...project.shots, newShot] });
    setTimeout(() => handleOpenPicker(newShot.id, 'script'), 100);
  };

  // --- TOOL RAIL CONTENT ---
  // Memoize filtered scenes to prevent recalculation on every render
  const filteredScenes = useMemo(() => {
    return project.scenes.filter(s => s.heading.toLowerCase().includes(sceneSearch.toLowerCase()));
  }, [project.scenes, sceneSearch]);

  const tools: Tool[] = [
    {
      id: 'navigator',
      label: 'Scene Navigator',
      icon: <Hash className="w-5 h-5" />,
      content: (
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={sceneSearch}
              onChange={e => setSceneSearch(e.target.value)}
              placeholder="Search scenes..."
              className="w-full bg-surface-secondary border border-border rounded-sm py-1.5 pl-8 pr-2 text-xs text-text-primary outline-none focus:border-primary placeholder:text-text-muted"
            />
          </div>

          <div className="space-y-1">
            {filteredScenes.length === 0 ? (
              <div className="text-[10px] text-text-muted italic text-center py-4">No scenes found</div>
            ) : (
              filteredScenes.map(scene => (
                <button
                  key={scene.id}
                  onClick={() => scrollToScene(scene.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-sm hover:bg-surface-secondary text-left group transition-colors"
                >
                  <span className="text-[10px] font-mono font-bold text-text-muted w-6 group-hover:text-primary">{String(scene.sequence).padStart(2, '0')}</span>
                  <span className="text-xs text-text-secondary font-medium truncate flex-1 group-hover:text-text-primary">{scene.heading}</span>
                  {project.shots.filter(s => s.sceneId === scene.id).length > 0 && (
                    <span className="text-[9px] bg-background border border-border text-text-muted px-1.5 rounded-sm">{project.shots.filter(s => s.sceneId === scene.id).length}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )
    }
  ];

  const hasContent = project.scenes.length > 0;

  if (!hasContent) {
    return (
      <EmptyProjectState
        title="Empty Timeline"
        description="No scenes found. Please go to the Dashboard to set up your project or add a scene manually."
        onCreate={handleAddScene}
        // Removed onImport here to enforce Dashboard workflow
      />
    );
  }

  return (
    <PageWithToolRail tools={tools} defaultTool={null}>
      <div className="h-full bg-background overflow-y-auto font-sans relative">
        <TimelineHeader
          isUploadingScript={false}
          onImportScript={() => {}}
          onAddScene={handleAddScene}
          onExportPDF={handleExportPDF}
          isExporting={isExporting}
        />

        <div className="max-w-[1600px] mx-auto pb-20 pl-10 pt-6">
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

        <ImageSelectorModal
          isOpen={imageModalState.isOpen}
          onClose={() => setImageModalState({ isOpen: false, sceneId: null, updateShotId: null })}
          onSelect={handleConfirmImageSelection}
          projectId={project.id}
        />

        <ScriptPicker
          isOpen={pickerState.isOpen}
          onClose={() => setPickerState({ isOpen: false, shotId: null, type: null, sceneId: null })}
          sceneId={pickerState.sceneId}
          scriptElements={scriptElements}
          usedElementIds={new Set(project.shots.flatMap(s => s.linkedElementIds || []))}
          onSelect={handleSelectScriptElement}
        />

        {confirmDeleteScene && (
          <div className="fixed inset-0 overlay-dark flex items-center justify-center z-50 animate-in fade-in" onClick={() => setConfirmDeleteScene(null)}>
            <div className="bg-surface border border-border rounded-lg p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-text-primary mb-2">Delete Scene?</h3>
              <p className="text-text-secondary text-sm mb-4">
                Are you sure you want to permanently delete "{confirmDeleteScene.name}"? This will also delete all shots in this scene.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteScene(null)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={confirmSceneDeletion} className="bg-red-600 hover:bg-red-700">Delete</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWithToolRail>
  );
};