import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Project, Shot, WorldSettings, ShowToastFn, ToastNotification, ScriptElement, TitlePageData, ScriptDraft } from '../types';
import { saveProjectData, setActiveProjectId, createAutoSave } from '../services/storage'; // Updated import
import { ToastContainer } from '../components/features/Toast';
import { CommandPalette } from '../components/CommandPalette';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
// Removed useAutoSave import (replaced by createAutoSave)
import { useSaveStatus } from '../context/SaveStatusContext';
import { WorkspaceContextType } from '../context/WorkspaceContext'; // NEW IMPORT
import { Loader2 } from 'lucide-react';
import { ShotEditor, LazyWrapper } from '../components/features/LazyComponents';
import ErrorBoundary from '../components/ErrorBoundary';
import { parseScript } from '../services/scriptParser';
import { syncScriptToScenes } from '../services/scriptUtils';
import { StorageWarning } from '../components/ui/StorageWarning';
import { Sidebar } from '../components/layout/Sidebar';
import { ScriptChat } from '../components/features/ScriptChat';
import { ResizableDivider } from '../components/ui/ResizableDivider';
import { Header } from '../components/layout/Header';

// Helper to check if a string is a valid UUID
const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/**
 * Normalizes project drafts and active draft ID to ensure UUID integrity.
 * Repairs legacy IDs like 'initial-draft' or missing objects.
 */
const normalizeDraftsAndActiveId = (project: Project): { project: Project; changed: boolean } => {
    let changed = false;
    let drafts = project.drafts || [];
    let activeId = project.activeDraftId;

    // 1. Ensure every draft has a UUID id
    drafts = drafts.map(d => {
        if (!d.id || !isUUID(d.id)) {
            changed = true;
            const newId = crypto.randomUUID();
            if (activeId === d.id) activeId = newId; // Update activeId if it matched this draft
            return { ...d, id: newId };
        }
        return d;
    });

    // 2. Ensure drafts is not empty
    if (drafts.length === 0) {
        const newId = crypto.randomUUID();
        drafts = [{
            id: newId,
            name: 'Initial Script',
            content: project.scriptElements || [],
            updatedAt: project.lastModified || Date.now()
        }];
        activeId = newId;
        changed = true;
    }

    // 3. Ensure activeDraftId is a UUID and exists in drafts
    if (!activeId || !isUUID(activeId) || !drafts.find(d => d.id === activeId)) {
        activeId = drafts[0].id;
        changed = true;
    }

    if (changed) {
        return {
            project: { ...project, drafts, activeDraftId: activeId, scriptElements: drafts.find(d => d.id === activeId)?.content || project.scriptElements },
            changed: true
        };
    }

    return { project, changed: false };
};

export const WorkspaceLayout: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingShot, setEditingShot] = useState<Shot | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    const [sydOpen, setSydOpen] = useState(false);
    const [sydWidth, setSydWidth] = useState(() => {
        const saved = localStorage.getItem('cinesketch_syd_width');
        return saved ? parseInt(saved) : 50;
    });

    useEffect(() => {
        localStorage.setItem('cinesketch_syd_width', sydWidth.toString());
    }, [sydWidth]);

    const showToast: ShowToastFn = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', action?: { label: string, onClick: () => void }) => {
        const id = Date.now() + Math.random();
        setToasts((prev: ToastNotification[]) => [...prev, { id, message, type, action }]);
    }, []);

    const { status: globalSaveStatus, lastSavedAt: globalLastSavedAt, lastError: globalLastError, setSaving, setSaved, setError } = useSaveStatus();

    // Initialize AutoSave Manager
    const autoSave = useMemo(() => createAutoSave({
        onStatusChange: (s) => {
            if (s.status === 'saving') setSaving();
            if (s.status === 'saved') setSaved();
            if (s.status === 'error' && s.lastError) {
                setError(s.lastError);
                showToast(`Auto-save failed: ${s.lastError}`, 'error');
            }
        }
    }), [setSaving, setSaved, setError, showToast]);

    // Track pending save options to merge into the next auto-save
    const pendingSaveOptions = React.useRef<{ forceImagePersist?: boolean }>({});

    // Trigger auto-save when project changes
    const previousProjectRef = React.useRef<Project | null>(null);
    useEffect(() => {
        if (!project || !project.id) return;

        // Skip first render or if valid check fails
        if (previousProjectRef.current === project) return;
        previousProjectRef.current = project;

        const options = { ...pendingSaveOptions.current };
        pendingSaveOptions.current = {}; // Reset after consuming

        autoSave.save(project.id, project, options);
    }, [project, autoSave]);

    // Handle manual save / flush - ALWAYS force persistence
    const saveNow = useCallback(async () => {
        await autoSave.flush({ forceImagePersist: true });
    }, [autoSave]);

    // Cancel on unmount
    useEffect(() => {
        return () => {
            autoSave.cancel();
        };
    }, [autoSave]);

    // Use keyboard shortcuts
    useKeyboardShortcut({
        key: 's', meta: true, callback: (e) => { e.preventDefault(); saveNow(); }, description: 'Save Project',
    });

    useKeyboardShortcut({
        key: 'k', meta: true, callback: (e) => { e.preventDefault(); setShowCommandPalette(true); }, description: 'Open Command Palette',
    });
    useKeyboardShortcut({
        key: '?', callback: () => setShowCommandPalette(true), description: 'Open Command Palette',
    });

    const closeToast = useCallback((id: number) => {
        setToasts((prev: ToastNotification[]) => prev.filter(t => t.id !== id));
    }, []);

    const toggleTheme = useCallback(() => {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('cinesketch_theme_mode', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('cinesketch_theme_mode', 'dark');
        }
    }, []);



    useEffect(() => {
        if (!projectId) { navigate('/'); return; }
        loadProject(projectId);
    }, [projectId]);

    const loadProject = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await getProjectData(id);
            if (data) {
                const { project: normalized, changed } = normalizeDraftsAndActiveId(data);

                setProject(normalized);
                setActiveProjectId(id);

                if (changed) {
                    console.log("⚠️ Project IDs normalized, persisting migration...");
                    await saveProjectData(normalized.id, normalized);
                }
            } else {
                showToast("Project not found", 'error');
                navigate('/');
            }
        } catch (error) {
            console.error(error);
            showToast("Load failed", 'error');
            navigate('/');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateProject = useCallback((updated: Project, options?: { forceImagePersist?: boolean }) => {
        if (options?.forceImagePersist) {
            pendingSaveOptions.current.forceImagePersist = true;
        }
        setProject((prev: Project | null) => {
            if (!prev) return updated;
            return { ...prev, ...updated };
        });
    }, []);

    const handleUpdateSettings = useCallback(<K extends keyof WorldSettings>(key: K, value: WorldSettings[K]) => {
        setProject(prev => {
            if (!prev) return null;
            return { ...prev, settings: { ...prev.settings, [key]: value } };
        });
    }, []);

    const importScript = useCallback(async (file: File) => {
        if (!project) return;
        try {
            const parsed = await parseScript(file);
            const titlePage: TitlePageData = {
                title: parsed.metadata.title || project.name,
                authors: parsed.metadata.author ? [parsed.metadata.author] : [],
                credit: 'Written by',
                draftDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                ...(parsed.titlePage || {})
            };
            const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const draftName = `Imported: ${file.name} - ${timestamp}`;
            const newDraft: ScriptDraft = {
                id: crypto.randomUUID(), name: draftName, content: parsed.elements, updatedAt: Date.now()
            };
            const updatedProject: Project = {
                ...project,
                drafts: [...(project.drafts || []), newDraft],
                activeDraftId: newDraft.id,
                scriptElements: newDraft.content,
                scriptFile: { name: file.name, uploadedAt: Date.now(), format: file.name.endsWith('.fountain') ? 'fountain' : 'txt' },
                titlePage: titlePage
            };
            const syncedProject = syncScriptToScenes(updatedProject);
            setProject(syncedProject);
            await saveProjectData(syncedProject.id, syncedProject);
            showToast(`Script imported as draft: ${draftName}`, 'success');
        } catch (e: unknown) {
            console.error(e);
            showToast((e as Error).message || "Failed to parse script", 'error');
        }
    }, [project, showToast]);

    const handleCreateDraft = useCallback(async (name?: string) => {
        if (!project) return;
        autoSave.cancel(); // Cancel pending saves before critical operation

        const draftName = name || `Snapshot ${project.drafts.length + 1}`;
        const newDraft: ScriptDraft = {
            id: crypto.randomUUID(), name: draftName, content: project.scriptElements || [], updatedAt: Date.now()
        };
        const updatedProject = {
            ...project, drafts: [...(project.drafts || []), newDraft], lastModified: Date.now()
        };
        setProject(updatedProject);
        await saveProjectData(updatedProject.id, updatedProject);
        showToast(`Snapshot saved: ${draftName}`, 'success');
    }, [project, showToast, cancelAutoSave]);

    const handleSwitchDraft = useCallback(async (draftId: string) => {
        if (!project) return;
        autoSave.cancel();

        // Integrity Check
        const { project: normalized } = normalizeDraftsAndActiveId(project);
        const draft = normalized.drafts.find((d: ScriptDraft) => d.id === draftId);
        if (!draft) { showToast("Draft not found", 'error'); return; }

        const updatedDrafts = normalized.drafts.map((d: ScriptDraft) =>
            d.id === normalized.activeDraftId ? { ...d, content: normalized.scriptElements || [], updatedAt: Date.now() } : d
        );
        const updatedProject: Project = {
            ...normalized, drafts: updatedDrafts, activeDraftId: draftId, scriptElements: draft.content, lastModified: Date.now()
        };
        const syncedProject = syncScriptToScenes(updatedProject);
        setProject(syncedProject);
        await saveProjectData(syncedProject.id, syncedProject);
        showToast(`Switched to: ${draft.name}`, 'success');
    }, [project, showToast, cancelAutoSave]);

    const handleDeleteDraft = useCallback(async (draftId: string) => {
        if (!project) return;

        // Integrity Check
        const { project: normalized } = normalizeDraftsAndActiveId(project);
        if (normalized.activeDraftId === draftId) { showToast("Cannot delete the active draft", 'warning'); return; }

        cancelAutoSave();

        let updatedDrafts = normalized.drafts.filter((d: ScriptDraft) => d.id !== draftId);
        let activeId = normalized.activeDraftId;
        let elements = normalized.scriptElements;

        if (updatedDrafts.length === 0) {
            const defaultDraft: ScriptDraft = { id: crypto.randomUUID(), name: 'Main Draft', content: [], updatedAt: Date.now() };
            updatedDrafts = [defaultDraft];
            activeId = defaultDraft.id;
            elements = [];
        }

        const updatedProject = {
            ...normalized, drafts: updatedDrafts, activeDraftId: activeId, scriptElements: elements, lastModified: Date.now()
        };

        setProject(updatedProject);
        await saveProjectData(updatedProject.id, updatedProject);
        showToast("Version deleted", 'info');
    }, [project, showToast, cancelAutoSave]);

    const handleRenameDraft = useCallback(async (draftId: string, name: string) => {
        if (!project) return;
        const updatedDrafts = project.drafts.map((d: ScriptDraft) =>
            d.id === draftId ? { ...d, name, updatedAt: Date.now() } : d
        );
        const updatedProject = { ...project, drafts: updatedDrafts, lastModified: Date.now() };
        setProject(updatedProject);
        await saveProjectData(updatedProject.id, updatedProject);
    }, [project]);

    const updateScriptElements = useCallback((elements: ScriptElement[]) => {
        setProject(prev => {
            if (!prev) return null;
            const tempProject = { ...prev, scriptElements: elements, lastModified: Date.now() };
            const syncedProject = syncScriptToScenes(tempProject);
            const updatedDrafts = syncedProject.drafts.map((d: ScriptDraft) =>
                d.id === syncedProject.activeDraftId ? { ...d, content: elements, updatedAt: Date.now() } : d
            );
            return { ...syncedProject, drafts: updatedDrafts };
        });
    }, []);

    const handleAddShot = useCallback(() => {
        if (project && project.scenes.length > 0) {
            const newShot: Shot = {
                id: crypto.randomUUID(), sceneId: project.scenes.id, sequence: project.shots.length + 1, description: '', notes: '', characterIds: [], shotType: 'Wide Shot', aspectRatio: project.settings.aspectRatio, dialogue: '', generationCandidates: [], generationInProgress: false
            };
            setEditingShot(newShot); setIsEditorOpen(true);
        } else { showToast("Create a scene first", 'error'); }
    }, [project, showToast]);

    const handleUpdateShot = useCallback((shot: Shot, options?: { forceImagePersist?: boolean }) => {
        if (!project) return;
        const exists = project.shots.find((s: Shot) => s.id === shot.id);
        const newShots = exists ? project.shots.map((s: Shot) => s.id === shot.id ? shot : s) : [...project.shots, shot];
        handleUpdateProject({ ...project, shots: newShots }, options);
    }, [project, handleUpdateProject]);

    const handleBulkUpdateShots = useCallback((updatedShots: Shot[]) => {
        if (!project) return;
        const shotMap = new Map(updatedShots.map(s => [s.id, s]));
        const newShots = project.shots.map(s => shotMap.get(s.id) || s);
        handleUpdateProject({ ...project, shots: newShots });
    }, [project, handleUpdateProject]);

    const handleDeleteShot = useCallback((shotId: string) => {
        if (!project) return;
        const shotToDelete = project.shots.find((s: Shot) => s.id === shotId);
        if (!shotToDelete) return;
        const updatedShots = project.shots.filter((s: Shot) => s.id !== shotId);
        const updatedElements = project.scriptElements?.map((el: ScriptElement) => ({
            ...el, associatedShotIds: el.associatedShotIds?.filter((id: string) => id !== shotId)
        }));
        const updatedProject = { ...project, shots: updatedShots, scriptElements: updatedElements || project.scriptElements };
        handleUpdateProject(updatedProject);
        showToast("Shot deleted", 'info', {
            label: "Undo", onClick: () => {
                const restored = { ...updatedProject, shots: [...updatedShots, shotToDelete].sort((a, b) => a.sequence - b.sequence) };
                handleUpdateProject(restored);
                showToast("Shot restored", 'success');
            }
        });
    }, [project, handleUpdateProject, showToast]);

    const handleDuplicateShot = useCallback((shotId: string) => {
        if (!project) return;
        const index = project.shots.findIndex(s => s.id === shotId);
        if (index === -1) return;
        const original = project.shots[index];
        const newShot: Shot = {
            ...original, id: crypto.randomUUID(), sequence: original.sequence + 1, generatedImage: undefined, generationCandidates: [], description: original.description + " (Copy)"
        };
        const newShots = [...project.shots];
        newShots.splice(index + 1, 0, newShot);
        newShots.forEach((s, i) => s.sequence = i + 1);
        handleUpdateProject({ ...project, shots: newShots });
        showToast("Shot duplicated", 'success');
    }, [project, handleUpdateProject, showToast]);

    const handleEditShot = useCallback((shot: Shot) => { setEditingShot(shot); setIsEditorOpen(true); }, []);

    const contextValue: WorkspaceContextType = useMemo(() => ({
        project: project!, handleUpdateProject, handleUpdateSettings, handleAddShot, handleEditShot, handleUpdateShot, handleBulkUpdateShots, handleDeleteShot, handleDuplicateShot, importScript, handleCreateDraft, handleSwitchDraft, handleDeleteDraft, handleRenameDraft, updateScriptElements, showToast, saveNow,
        saveStatus: globalSaveStatus,
        lastSavedAt: globalLastSavedAt,
        lastError: globalLastError
    }), [project, handleUpdateProject, handleUpdateSettings, handleAddShot, handleEditShot, handleUpdateShot, handleBulkUpdateShots, handleDeleteShot, handleDuplicateShot, importScript, handleCreateDraft, handleSwitchDraft, handleDeleteDraft, handleRenameDraft, updateScriptElements, showToast, saveNow, globalSaveStatus, globalLastSavedAt, globalLastError]);

    if (isLoading || !project) {
        return (
            <div className="h-screen w-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-text-secondary">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm font-mono tracking-widest uppercase">Initializing CineFlex...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-background text-text-primary flex overflow-hidden font-sans selection:bg-primary/30 selection:text-white">
            <ToastContainer toasts={toasts} onClose={closeToast} />
            <StorageWarning />
            <Sidebar onSydClick={() => setSydOpen(!sydOpen)} sydOpen={sydOpen} />
            <div className="flex flex-row flex-1 overflow-hidden" style={{ flexDirection: 'row' }}>
                <div className="flex flex-col transition-all duration-300 overflow-hidden" style={{ width: sydOpen ? `${100 - sydWidth}%` : '100%', flexShrink: 0, order: 1 }}>
                    <Header projectName={project.name} />
                    <main className="flex-1 bg-background relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 to-transparent pointer-events-none z-10" />
                        <ErrorBoundary>
                            <Outlet context={contextValue} />
                        </ErrorBoundary>
                    </main>
                    {isEditorOpen && project && (
                        <LazyWrapper fullHeight={false}>
                            <ShotEditor project={project} activeShot={editingShot} onClose={() => setIsEditorOpen(false)} onUpdateShot={handleUpdateShot} showToast={showToast} />
                        </LazyWrapper>
                    )}
                </div>
                {sydOpen && (
                    <div style={{ order: 2, display: 'flex' }}>
                        <ResizableDivider onResize={(newPercent: number) => { const clamped = Math.min(70, Math.max(30, newPercent)); setSydWidth(clamped); }} />
                    </div>
                )}
                {sydOpen && (
                    <div className="flex flex-col border-l border-border bg-surface overflow-hidden" style={{ width: `${sydWidth}%`, flexShrink: 0, order: 3 }}>
                        <ScriptChat onClose={() => setSydOpen(false)} />
                    </div>
                )}
            </div>
            <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} project={project} onAddShot={handleAddShot} onSave={saveNow} toggleTheme={toggleTheme} />
        </div>
    );
};