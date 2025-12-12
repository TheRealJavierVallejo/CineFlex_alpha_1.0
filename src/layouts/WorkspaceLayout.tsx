import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Project, Shot, WorldSettings, ShowToastFn, ToastNotification, ScriptElement } from '../types';
import { getProjectData, saveProjectData, setActiveProjectId } from '../services/storage';
import { ToastContainer } from '../components/features/Toast';
import { CommandPalette } from '../components/CommandPalette';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { useAutoSave } from '../hooks/useAutoSave';
import SaveStatusIndicator from '../components/ui/SaveStatusIndicator';
import { Loader2 } from 'lucide-react';
import { ShotEditor, LazyWrapper } from '../components/features/LazyComponents';
import ErrorBoundary from '../components/ErrorBoundary';
import { parseScript } from '../services/scriptParser';
import { syncScriptToScenes } from '../services/scriptUtils';
import { StorageWarning } from '../components/ui/StorageWarning';
import { Sidebar } from '../components/layout/Sidebar';
import { ScriptChat } from '../components/features/ScriptChat';
import { ResizableDivider } from '../components/ui/ResizableDivider';

// Context type for child routes
export interface WorkspaceContextType {
    project: Project;
    handleUpdateProject: (updated: Project) => void;
    handleUpdateSettings: (key: keyof WorldSettings, value: any) => void;
    handleAddShot: () => void;
    handleEditShot: (shot: Shot) => void;
    handleUpdateShot: (shot: Shot) => void;
    handleBulkUpdateShots: (shots: Shot[]) => void;
    handleDeleteShot: (shotId: string) => void;
    handleDuplicateShot: (shotId: string) => void;
    importScript: (file: File) => Promise<void>;
    updateScriptElements: (elements: ScriptElement[]) => void;
    showToast: ShowToastFn;
}

export const WorkspaceLayout: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingShot, setEditingShot] = useState<Shot | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

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

    // Auto-save with debouncing
    const { saveStatus, lastSavedAt, saveNow } = useAutoSave(
        project,
        useCallback(async (data: Project | null) => {
            if (data?.id) {
                await saveProjectData(data.id, data);
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

    const showToast: ShowToastFn = useCallback((message, type = 'info', action) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, action }]);
    }, []);

    const closeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toggleTheme = useCallback(() => {
        const isLight = document.documentElement.classList.contains('light');
        if (isLight) {
            document.documentElement.classList.remove('light');
            localStorage.setItem('cinesketch_theme_mode', 'dark');
        } else {
            document.documentElement.classList.add('light');
            localStorage.setItem('cinesketch_theme_mode', 'light');
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
        setProject(updated);
    }, []);

    const handleUpdateSettings = useCallback((key: keyof WorldSettings, value: any) => {
        if (!project) return;
        const updated: Project = { ...project, settings: { ...project.settings, [key]: value } };
        handleUpdateProject(updated);
    }, [project, handleUpdateProject]);

    const importScript = useCallback(async (file: File) => {
        if (!project) return;
        try {
            const parsed = await parseScript(file);
            const tempProject: Project = {
                ...project,
                scriptElements: parsed.elements,
                scriptFile: {
                    name: file.name,
                    uploadedAt: Date.now(),
                    format: file.name.endsWith('.fountain') ? 'fountain' : 'txt'
                }
            };
            const syncedProject = syncScriptToScenes(tempProject);
            handleUpdateProject(syncedProject);
            showToast(`Script imported & synced (${parsed.elements.length} lines)`, 'success');
        } catch (e: any) {
            console.error(e);
            showToast(e.message || "Failed to parse script", 'error');
        }
    }, [project, handleUpdateProject, showToast]);

    const updateScriptElements = useCallback((elements: ScriptElement[]) => {
        if (!project) return;
        const tempProject = { ...project, scriptElements: elements };
        const syncedProject = syncScriptToScenes(tempProject);
        handleUpdateProject(syncedProject);
    }, [project, handleUpdateProject]);

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
        const exists = project.shots.find(s => s.id === shot.id);
        const newShots = exists ? project.shots.map(s => s.id === shot.id ? shot : s) : [...project.shots, shot];
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
        const shotToDelete = project.shots.find(s => s.id === shotId);
        if (!shotToDelete) return;

        const updatedShots = project.shots.filter(s => s.id !== shotId);
        const updatedElements = project.scriptElements?.map(el => ({
            ...el,
            associatedShotIds: el.associatedShotIds?.filter(id => id !== shotId)
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
        importScript, updateScriptElements, showToast
    }), [project, handleUpdateProject, handleUpdateSettings, handleAddShot, handleEditShot,
        handleUpdateShot, handleBulkUpdateShots, handleDeleteShot, handleDuplicateShot,
        importScript, updateScriptElements, showToast]);

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
                    <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-background shrink-0 z-30">
                        <div className="text-xs font-bold text-text-secondary truncate">{project.name}</div>
                        <div className="flex items-center gap-2">
                            <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
                        </div>
                    </div>

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
                            onResize={(newPercent) => {
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

export function useWorkspace() {
    return useOutletContext<WorkspaceContextType>();
}