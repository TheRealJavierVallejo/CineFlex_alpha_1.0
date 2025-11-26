/*
 * 🧠 APP CONTROLLER
 * Premium Desktop Layout Shell
 */

import React, { useState, useEffect } from 'react';
import { ViewState, Project, Shot, WorldSettings, ShowToastFn, ToastNotification } from './types';
import { getActiveProjectId, getProjectData, saveProjectData, setActiveProjectId } from './services/storage';
import {
  ShotEditor,
  AssetManager,
  TimelineView,
  ProjectLibrary,
  ProjectSettings,
  LazyWrapper
} from './components/features/LazyComponents';
import { Sidebar } from './components/features/Sidebar';
import { ShotList } from './components/features/ShotList';
import { ToastContainer } from './components/features/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import KeyboardShortcutsPanel from './components/KeyboardShortcutsPanel';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { Plus, ChevronRight, Folder, Loader2, Save, Command, Box } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [project, setProject] = useState<Project | null>(null);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInLibrary, setIsInLibrary] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Keyboard shortcuts
  useKeyboardShortcut({
    key: 'k',
    meta: true,
    callback: () => setShowShortcutsPanel(true),
    description: 'Open keyboard shortcuts',
  });

  useKeyboardShortcut({
    key: '?',
    callback: () => setShowShortcutsPanel(true),
    description: 'Open keyboard shortcuts',
  });

  const showToast: ShowToastFn = (message, type = 'info', action) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, action }]);
  };

  const closeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const init = async () => {
      const activeId = getActiveProjectId();
      if (activeId) await loadProject(activeId);
      else {
        setIsInLibrary(true);
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loadProject = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await getProjectData(id);
      if (data) {
        setProject(data);
        setIsInLibrary(false);
        setActiveProjectId(id);
      } else {
        setActiveProjectId(null);
        setIsInLibrary(true);
      }
    } catch (error) {
      showToast("Load failed", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProject = async (updated: Project) => {
    setSaveStatus('saving');
    setProject(updated);
    if (updated.id) await saveProjectData(updated.id, updated);
    setTimeout(() => setSaveStatus('saved'), 500);
  };

  const handleUpdateSettings = (key: keyof WorldSettings, value: any) => {
    if (!project) return;
    const updated: Project = { ...project, settings: { ...project.settings, [key]: value } };
    handleUpdateProject(updated);
  };

  const addCustomSetting = (field: any, value: string) => {
    if (!project) return;
    const currentList = (project.settings as any)[field] || [];
    if (!currentList.includes(value)) {
      const map: any = { 'customEras': 'era', 'customStyles': 'cinematicStyle', 'customTimes': 'timeOfDay', 'customLighting': 'lighting' };
      const updated: Project = { ...project, settings: { ...project.settings, [field]: [...currentList, value], [map[field]]: value } };
      handleUpdateProject(updated);
    }
  };

  const removeCustomSetting = (field: any, value: string) => {
    if (!project) return;
    const updated: Project = { ...project, settings: { ...project.settings, [field]: (project.settings as any)[field].filter((i: string) => i !== value) } };
    handleUpdateProject(updated);
  };

  const handleAddShot = () => {
    if (project && project.scenes.length > 0) {
      const newShot: Shot = {
        id: crypto.randomUUID(), sceneId: project.scenes[0].id, sequence: project.shots.length + 1,
        description: '', notes: '', characterIds: [], shotType: 'Wide Shot', aspectRatio: project.settings.aspectRatio, dialogue: '', generationCandidates: [], generationInProgress: false
      };
      setEditingShot(newShot);
    } else {
      showToast("Create a scene first", 'error');
      setEditingShot(null);
    }
    setIsEditorOpen(true);
  };

  const handleSaveShot = (shot: Shot) => {
    if (!project) return;
    const exists = project.shots.find(s => s.id === shot.id);
    const newShots = exists ? project.shots.map(s => s.id === shot.id ? shot : s) : [...project.shots, shot];
    handleUpdateProject({ ...project, shots: newShots });
  };

  if (isInLibrary || !project) {
    return (
      <>
        <ToastContainer toasts={toasts} onClose={closeToast} />
        <LazyWrapper fullHeight>
          <ProjectLibrary onOpenProject={loadProject} showToast={showToast} />
        </LazyWrapper>
      </>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#1E1E1E] text-[#CCCCCC] flex flex-col overflow-hidden font-sans">

      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* 1. NATIVE TITLE BAR */}
      <header className="h-9 bg-[#252526] border-b border-[#333] flex items-center justify-between px-3 app-region-drag select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[12px] text-[#CCCCCC]">
            <Command className="w-3.5 h-3.5 text-[#007ACC]" />
            <span className="font-bold">CineSketch</span>
          </div>

          {/* Breadcrumbs */}
          <div className="h-4 w-[1px] bg-[#3E3E42] mx-1" />
          <div className="flex items-center gap-1 text-[12px] text-[#969696] app-no-drag">
            <button onClick={() => { setProject(null); setIsInLibrary(true); }} className="hover:text-white transition-colors">
              Projects
            </button>
            <ChevronRight className="w-3 h-3 text-[#505050]" />
            <span className="text-[#E8E8E8] font-medium">{project.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 app-no-drag">
          <button onClick={handleAddShot} className="app-btn app-btn-primary h-6">
            <Plus className="w-3.5 h-3.5" /> New Shot
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar view={view} setView={setView} project={project} />

        <main className="flex-1 bg-[#18181B] relative overflow-hidden">
          {view === ViewState.DASHBOARD && (
            <div className="absolute inset-0 overflow-y-auto p-6">
              <ShotList project={project} onAddShot={handleAddShot} onEditShot={(s) => { setEditingShot(s); setIsEditorOpen(true); }} showToast={showToast} />
            </div>
          )}
          {view === ViewState.TIMELINE && (
            <LazyWrapper>
              <TimelineView project={project} onUpdateProject={handleUpdateProject} onEditShot={(s) => { setEditingShot(s); setIsEditorOpen(true); }} showToast={showToast} />
            </LazyWrapper>
          )}
          {view === ViewState.ASSETS && (
            <div className="absolute inset-0">
              <LazyWrapper>
                <AssetManager projectId={project.id} projectShots={project.shots} showToast={showToast} />
              </LazyWrapper>
            </div>
          )}
          {view === ViewState.SETTINGS && (
            <div className="absolute inset-0 p-8">
              <LazyWrapper>
                <ProjectSettings project={project} onUpdateProject={handleUpdateProject} onUpdateSettings={handleUpdateSettings} onAddCustom={addCustomSetting} onRemoveCustom={removeCustomSetting} showToast={showToast} />
              </LazyWrapper>
            </div>
          )}
        </main>
      </div>

      {/* 3. STATUS BAR */}
      <footer className="h-[22px] bg-[#007ACC] text-white flex items-center justify-between px-3 text-[11px] select-none shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Box className="w-3 h-3 opacity-70" /> Workspace Ready
          </span>
        </div>
        <div className="flex items-center gap-4">
          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>
          ) : (
            <span>Saved</span>
          )}
          <span>v2.5.0 Pro</span>
        </div>
      </footer>

      {/* FLOATING INSPECTOR (EDITOR) */}
      {isEditorOpen && project && (
        <LazyWrapper fullHeight={false}>
          <ShotEditor project={project} activeShot={editingShot} onClose={() => setIsEditorOpen(false)} onUpdateShot={handleSaveShot} showToast={showToast} />
        </LazyWrapper>
      )}

      {/* KEYBOARD SHORTCUTS PANEL */}
      <KeyboardShortcutsPanel isOpen={showShortcutsPanel} onClose={() => setShowShortcutsPanel(false)} />
    </div>
  );
};

const WrappedApp = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default WrappedApp;