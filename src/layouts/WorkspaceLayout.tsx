import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Project, Shot, WorldSettings, ShowToastFn, ToastNotification, ScriptElement, TitlePageData, ScriptDraft } from '../types';
import { getProjectData, saveProjectData, setActiveProjectId, saveProjectDataDebounced, updateDraftMetadata } from '../services/storage';
import { ToastContainer } from '../components/features/Toast';
import { CommandPalette } from '../components/CommandPalette';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { useAutoSave } from '../hooks/useAutoSave';
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

/**
 * Global workspace context provided to all project sub-routes.
 * Facilitates single-source-of-truth project state and standardized operations.
 */
export interface WorkspaceContextType {
    /** The current state of the active movie project */
    project: Project;
    /** Updates the entire project object and triggers an auto-save */
    handleUpdateProject: (updated: Project) => void;
    /** updates a single field in the world settings */
    handleUpdateSettings: <K extends keyof WorldSettings>(key: K, value: WorldSettings[K]) => void;
    /** Adds a new shot to the first scene of the project */
    handleAddShot: () => void;
    /** Opens the editor for a specific shot */
    handleEditShot: (shot: Shot) => void;
    /** Updates or creates a shot in the project state */
    handleUpdateShot: (shot: Shot) => void;
    /** Performs a high-performance update of multiple shots at once */
    handleBulkUpdateShots: (shots: Shot[]) => void;
    /** Safely deletes a shot and its script associations with undo support */
    handleDeleteShot: (shotId: string) => void;
    /** Clones a shot and inserts it immediately after the original */
    handleDuplicateShot: (shotId: string) => void;
    /** Handles script file parsing and project synchronization */
    importScript: (file: File) => Promise<void>;
    /** Creates a snapshot of the current script as a named draft */
    handleCreateDraft: (name?: string) => void;
    /** Switches to a different script version */
    handleSwitchDraft: (draftId: string) => Promise<void>;
    /** Deletes a script version */
    handleDeleteDraft: (draftId: string) => void;
    /** Renames a script version */
    handleRenameDraft: (draftId: string, name: string) => Promise<void>;
    /** Direct manual update of the script element array */
    updateScriptElements: (elements: ScriptElement[]) => void;
    /** Global toast trigger for the workspace */
    showToast: ShowToastFn;
    /** Force an immediate save to the database bypassing debounce */
    saveNow: () => Promise<void>;
}

/**
 * WORKSPACE LAYOUT
 * The main controller for the project editing environment.
 * Manages project state hydration, auto-save infrastructure, routing,
 * and provides the context for all sub-pages (Dashboard, Timeline, etc).
 */
export const WorkspaceLayout: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingShot, setEditingShot] = useState<Shot | null>(null);


    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    // const { setSaving, setSaved, setError } = useSaveStatus(); // Handled by useAutoSave hook now

    // Split View State
    const [sydOpen, setSydOpen] = useState(false);
    const [sydWidth, setSydWidth] = useState(() => {
        const saved = localStorage.getItem('cinesketch_syd_width');
        return saved ? parseInt(saved) : 50;
    });

    // Save width to localStorage
    useEffect(() => {
        localStorage.setItem('cinesketch_syd_width', sydWidth.toString());
    }, [sydWidth]);


    // Move showToast definition BEFORE useAutoSave
    const showToast: ShowToastFn = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', action?: { label: string, onClick: () => void }) => {
        const id = Date.now() + Math.random(); // Unique even within same millisecond
        setToasts((prev: ToastNotification[]) => [...prev, { id, message, type, action }]);
    }, []);

    const { saveStatus, lastSavedAt, saveNow } = useAutoSave(
        project,
        useCallback((data: Project | null) => {
            if (data?.id) {
                // Remove double-debounce: call saveProjectData directly
                saveProjectData(data.id, data);
            }
        }, []),
        {
            delay: 1000,
            onError: (error) => {
                showToast('Failed to auto-save project', 'error');
                console.error('Auto-save error:', error);
            }
        }
    );

    useKeyboardShortcut({
        key: 'k',
        meta: true,
        callback: (e) => { e.preventDefault(); setShowCommandPalette(true); },
        description: 'Open Command Palette',
    });

    useKeyboardShortcut({
        key: '?',
        callback: () => setShowCommandPalette(true),
        description: 'Open Command Palette',
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
        if (!projectId) {
            navigate('/');
            return;
        }
        loadProject(projectId);
    }, [projectId]);

    const loadProject = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await getProjectData(id);
            if (data) {
                // Backward Compatibility: If drafts is missing or empty, treat current scriptElements as first draft
                if (!data.drafts || data.drafts.length === 0) {
                    const initialDraft: ScriptDraft = {
                        id: 'initial-draft',
                        name: 'Draft 1', // RENAMED FROM "Initial Script"
                        content: data.scriptElements || [],
                        updatedAt: data.lastModified || Date.now()
                    };
                    data.drafts = [initialDraft];
                    data.activeDraftId = initialDraft.id;
                    data.scriptElements = initialDraft.content;
                }
                setProject(data);
                setActiveProjectId(id);
            } else {
                showToast("Project not found", 'error');
                navigate('/');
            }
        } catch (error) {
            showToast("Load failed", 'error');
            navigate('/');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateProject = useCallback((updated: Project) => {
        // Use functional update to avoid stale closures
        setProject((prev: Project | null) => {
            // Merge updates to handle partial updates
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

            // Extract Title Page from parsed metadata
            const titlePage: TitlePageData = {
                title: parsed.metadata.title || project.name,
                authors: parsed.metadata.author ? [parsed.metadata.author] : [],
                credit: 'Written by',
                draftDate: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                ...(parsed.titlePage || {})
            };

            const timestamp = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            const draftName = `Imported: ${file.name} - ${timestamp}`;
            const newDraft: ScriptDraft = {
                id: crypto.randomUUID(),
                name: draftName,
                content: parsed.elements,
                updatedAt: Date.now()
            };

            const updatedProject: Project = {
                ...project,
                drafts: [...(project.drafts || []), newDraft],
                activeDraftId: newDraft.id,
                scriptElements: newDraft.content, // Keep editor working
                scriptFile: {
                    name: file.name,
                    uploadedAt: Date.now(),
                    format: file.name.endsWith('.fountain') ? 'fountain' : 'txt'
                },
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

        // Cancel any pending auto-saves to prevent overwrite
        saveProjectDataDebounced.cancel();

        // FIXED: Better naming convention (Draft 1, Draft 2, etc.)
        const draftCount = project.drafts.length;
        const draftName = name || `Draft ${draftCount + 1}`;
        
        const newDraft: ScriptDraft = {
            id: crypto.randomUUID(),
            name: draftName,
            content: project.scriptElements || [],
            updatedAt: Date.now()
        };

        const updatedProject = {
            ...project,
            drafts: [...(project.drafts || []), newDraft],
            lastModified: Date.now()
        };

        setProject(updatedProject);
        await saveProjectData(updatedProject.id, updatedProject);
        showToast(`Snapshot saved: ${draftName}`, 'success');
    }, [project, showToast]);

    const handleSwitchDraft = useCallback(async (draftId: string) => {
        if (!project) return;

        // Cancel any pending auto-saves to prevent overwrite
        saveProjectDataDebounced.cancel();

        const draft = project.drafts.find((d: ScriptDraft) => d.id === draftId);
        if (!draft) {
            showToast("Draft not found", 'error');
            return;
        }

        // 1. Sync current elements into the *currently active* draft first
        const updatedDrafts = project.drafts.map((d: ScriptDraft) =>
            d.id === project.activeDraftId
                ? { ...d, content: project.scriptElements || [], updatedAt: Date.now() }
                : d
        );

        // 2. Prepare the new project state
        const updatedProject: Project = {
            ...project,
            drafts: updatedDrafts,
            activeDraftId: draftId,
            scriptElements: draft.content, // Load draft content into editor
            lastModified: Date.now()
        };

        // 3. Sync & Store
        const syncedProject = syncScriptToScenes(updatedProject);
        setProject(syncedProject);
        await saveProjectData(syncedProject.id, syncedProject);
        showToast(`Switched to: ${draft.name}`, 'success');
    }, [project, showToast]);

    const handleDeleteDraft = useCallback(async (draftId: string) => {
        if (!project) return;

        if (project.activeDraftId === draftId) {
            showToast("Cannot delete the active draft", 'warning');
            return;
        }

        // Cancel any pending auto-saves to prevent overwrite
        saveProjectDataDebounced.cancel();

        let updatedDrafts = project.drafts.filter((d: ScriptDraft) => d.id !== draftId);
        let activeId = project.activeDraftId;
        let elements = project.scriptElements;

        // Fallback if deleting last draft (shouldn't happen with UI checks, but safe to keep)
        if (updatedDrafts.length === 0) {
            const defaultDraft: ScriptDraft = {
                id: crypto.randomUUID(),
                name: 'Draft 1',
                content: [],
                updatedAt: Date.now()
            };
            updatedDrafts = [defaultDraft];
            activeId = defaultDraft.id;
            elements = [];
        }

        const updatedProject = {
            ...project,
            drafts: updatedDrafts,
            activeDraftId: activeId,
            scriptElements: elements,
            lastModified: Date.now()
        };

        setProject(updatedProject);
        await saveProjectData(updatedProject.id, updatedProject);
        showToast("Draft deleted", 'info');
    }, [project, showToast]);

    const handleRenameDraft = useCallback(async (draftId: string, name: string) => {
        if (!project) return;

        // Optimistic update
        const updatedDrafts = project.drafts.map((d: ScriptDraft) =>
            d.id === draftId ? { ...d, name, updatedAt: Date.now() } : d
        );
        const updatedProject = { ...project, drafts: updatedDrafts }; // Don't update lastModified to avoid triggering full save logic elsewhere unnecessarily

        setProject(updatedProject);
        
        // Use the new lightweight metadata update
        try {
            await updateDraftMetadata(project.id, updatedDrafts);
            // Optional: Success toast or silent
        } catch (e) {
            showToast("Failed to save rename", 'error');
            // Revert state if needed, but for now we trust optimistic UI
        }
    }, [project, showToast]);

    // 🔥 CRITICAL FIX: Functional update to prevent "Zombie Closure" race conditions
    // This ensures we always merge new script elements into the LATEST project state,
    // not the state captured when the debounce started.
    const updateScriptElements = useCallback((elements: ScriptElement[]) => {
        setProject(prev => {
            if (!prev) return null;

            // 1. Update project state with new elements
            const tempProject = { ...prev, scriptElements: elements, lastModified: Date.now() };

            // 2. Sync scenes
            const syncedProject = syncScriptToScenes(tempProject);

            // 3. Persist elements INTO the active draft object inside project.drafts
            // We use the *fresh* prev.drafts array, so if a draft was deleted, it's already gone here.
            const updatedDrafts = syncedProject.drafts.map((d: ScriptDraft) =>
                d.id === syncedProject.activeDraftId
                    ? { ...d, content: elements, updatedAt: Date.now() }
                    : d
            );

            return { ...syncedProject, drafts: updatedDrafts };
        });
    }, []); // No dependencies means this function never recreates, preventing stale closures

    const handleAddShot = useCallback(() => {
        if (project && project.scenes.length > 0) {
            const newShot: Shot = {
                id: crypto.randomUUID(),
                sceneId: project.scenes[0].id,
                sequence: project.shots.length + 1,
                description: '', notes: '', characterIds: [],
                shotType: 'Wide Shot',
                aspectRatio: project.settings.aspectRatio,
                dialogue: '',
                generationCandidates: [],
                generationInProgress: false
            };
            setEditingShot(newShot);
            setIsEditorOpen(true);
        } else {
            showToast("Create a scene first", 'error');
        }
    }, [project, showToast]);

    const handleUpdateShot = useCallback((shot: Shot) => {
        if (!project) return;
        const exists = project.shots.find((s: Shot) => s.id === shot.id);
        const newShots = exists ? project.shots.map((s: Shot) => s.id === shot.id ? shot : s) : [...project.shots, shot];
        handleUpdateProject({ ...project, shots: newShots });
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
            ...el,
            associatedShotIds: el.associatedShotIds?.filter((id: string) => id !== shotId)
        }));

        const updatedProject = { ...project, shots: updatedShots, scriptElements: updatedElements || project.scriptElements };
        handleUpdateProject(updatedProject);

        showToast("Shot deleted", 'info', {
            label: "Undo",
            onClick: () => {
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
            ...original,
            id: crypto.randomUUID(),
            sequence: original.sequence + 1,
            generatedImage: undefined,
            generationCandidates: [],
            description: original.description + " (Copy)"
        };
        const newShots = [...project.shots];
        newShots.splice(index + 1, 0, newShot);
        newShots.forEach((s, i) => s.sequence = i + 1);
        handleUpdateProject({ ...project, shots: newShots });
        showToast("Shot duplicated", 'success');
    }, [project, handleUpdateProject, showToast]);

    const handleEditShot = useCallback((shot: Shot) => {
        setEditingShot(shot);
        setIsEditorOpen(true);
    }, []);

    const contextValue: WorkspaceContextType = useMemo(() => ({
        project: project!,
        handleUpdateProject, handleUpdateSettings, handleAddShot, handleEditShot,
        handleUpdateShot, handleBulkUpdateShots, handleDeleteShot, handleDuplicateShot,
        importScript, handleCreateDraft, handleSwitchDraft, handleDeleteDraft, handleRenameDraft,
        updateScriptElements, showToast, saveNow
    }), [project, handleUpdateProject, handleUpdateSettings, handleAddShot, handleEditShot,
        handleUpdateShot, handleBulkUpdateShots, handleDeleteShot, handleDuplicateShot,
        importScript, handleCreateDraft, handleSwitchDraft, handleDeleteDraft, handleRenameDraft,
        updateScriptElements, showToast, saveNow]);

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

            {/* SIDEBAR */}
            <Sidebar
                onSydClick={() => setSydOpen(!sydOpen)}
                sydOpen={sydOpen}
            />

            {/* SPLIT CONTAINER */}
            <div className="flex flex-row flex-1 overflow-hidden" style={{ flexDirection: 'row' }}>

                {/* LEFT: Main Editor Area */}
                <div
                    className="flex flex-col transition-all duration-300 overflow-hidden"
                    style={{
                        width: sydOpen ? `${100 - sydWidth}%` : '100%',
                        flexShrink: 0,
                        order: 1
                    }}
                >
                    {/* Status Bar (Minimal Header) */}
                    <Header projectName={project.name} />

                    {/* Content */}
                    <main className="flex-1 bg-background relative overflow-hidden">
                        {/* Subtle gradient for depth */}
                        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 to-transparent pointer-events-none z-10" />
                        <ErrorBoundary>
                            <Outlet context={contextValue} />
                        </ErrorBoundary>
                    </main>

                    {/* Editor Overlay for Inspector */}
                    {isEditorOpen && project && (
                        <LazyWrapper fullHeight={false}>
                            <ShotEditor
                                project={project}
                                activeShot={editingShot}
                                onClose={() => setIsEditorOpen(false)}
                                onUpdateShot={handleUpdateShot}
                                showToast={showToast}
                            />
                        </LazyWrapper>
                    )}
                </div>

                {/* RESIZER - Only show when Syd is open */}
                {sydOpen && (
                    <div style={{ order: 2, display: 'flex' }}>
                        <ResizableDivider
                            onResize={(newPercent: number) => {
                                const clamped = Math.min(70, Math.max(30, newPercent));
                                setSydWidth(clamped);
                            }}
                        />
                    </div>
                )}

                {/* RIGHT: Syd Panel - Only show when open */}
                {sydOpen && (
                    <div
                        className="flex flex-col border-l border-border bg-surface overflow-hidden"
                        style={{
                            width: `${sydWidth}%`,
                            flexShrink: 0,
                            order: 3
                        }}
                    >
                        <ScriptChat onClose={() => setSydOpen(false)} />
                    </div>
                )}

            </div>

            <CommandPalette
                isOpen={showCommandPalette}
                onClose={() => setShowCommandPalette(false)}
                project={project}
                onAddShot={handleAddShot}
                onSave={saveNow}
                toggleTheme={toggleTheme}
            />
        </div>
    );
};

/**
 * Custom hook to safely access the Workspace context.
 */
export function useWorkspace(): WorkspaceContextType {
    const context = useOutletContext<WorkspaceContextType>();
    if (!context) {
        throw new Error("useWorkspace must be used within a WorkspaceLayout outlet context");
    }
    return context;
}
