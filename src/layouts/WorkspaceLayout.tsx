import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { Project, Shot, WorldSettings, ShowToastFn, ToastNotification, ScriptElement } from '../types';
import { getProjectData, saveProjectData, setActiveProjectId } from '../services/storage';
import { Sidebar } from '../components/features/Sidebar';
import { ToastContainer } from '../components/features/Toast';
import KeyboardShortcutsPanel from '../components/KeyboardShortcutsPanel';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { Command, ChevronRight, Plus, Box, Loader2 } from 'lucide-react';
import { ShotEditor, LazyWrapper } from '../components/features/LazyComponents';
import ErrorBoundary from '../components/ErrorBoundary';
import { parseScript } from '../services/scriptParser';
import { syncScriptToScenes } from '../services/scriptUtils';

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
    const location = useLocation();

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [editingShot, setEditingShot] = useState<Shot | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    useKeyboardShortcut({
        key: 'k',
        meta: true,
        callback: (e) => { e.preventDefault(); setShowShortcutsPanel(true); },
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

    const importScript = async (file: File) => {
        if (!project) return;
        try {
            setSaveStatus('saving');
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
            await handleUpdateProject(syncedProject);
            showToast(`Script imported & synced (${parsed.elements.length} lines)`, 'success');
        } catch (e: any) {
            console.error(e);
            showToast(e.message || "Failed to parse script", 'error');
            setSaveStatus('saved');
        }
    };

    const updateScriptElements = (elements: ScriptElement[]) => {
        if (!project) return;
        const tempProject = { ...project, scriptElements: elements };
        const syncedProject = syncScriptToScenes(tempProject);
        handleUpdateProject(syncedProject);
    };

    const handleAddShot = () => {
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
    };

    const handleUpdateShot = (shot: Shot) => {
        if (!project) return;
        const exists = project.shots.find(s => s.id === shot.id);
        const newShots = exists ? project.shots.map(s => s.id === shot.id ? shot : s) : [...project.shots, shot];
        handleUpdateProject({ ...project, shots: newShots });
    };

    const handleBulkUpdateShots = (updatedShots: Shot[]) => {
        if (!project) return;
        const shotMap = new Map(updatedShots.map(s => [s.id, s]));
        const newShots = project.shots.map(s => shotMap.get(s.id) || s);
        handleUpdateProject({ ...project, shots: newShots });
    };

    const handleDeleteShot = (shotId: string) => {
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
    };

    const handleDuplicateShot = (shotId: string) => {
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
    };

    const handleEditShot = (shot: Shot) => {
        setEditingShot(shot);
        setIsEditorOpen(true);
    };

    if (isLoading || !project) {
        return (
            <div className="h-screen w-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-text-secondary">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm">Loading Project...</span>
                </div>
            </div>
        );
    }

    const contextValue: WorkspaceContextType = {
        project, handleUpdateProject, handleUpdateSettings, handleAddShot, handleEditShot,
        handleUpdateShot, handleBulkUpdateShots, handleDeleteShot, handleDuplicateShot,
        importScript, updateScriptElements, showToast
    };

    return (
        <div className="h-screen w-screen bg-background text-text-primary flex flex-col overflow-hidden font-sans selection:bg-primary/30 selection:text-white">
            <ToastContainer toasts={toasts} onClose={closeToast} />

            {/* 1. GLASS HEADER */}
            <header className="h-12 glass-header flex items-center justify-between px-4 app-region-drag select-none shrink-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-text-primary">
                        <div className="w-6 h-6 bg-gradient-to-br from-primary to-blue-600 rounded flex items-center justify-center shadow-glow">
                            <Command className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-bold tracking-tight">CineSketch</span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <div className="flex items-center gap-1 text-sm text-text-secondary app-no-drag">
                        <button onClick={() => navigate('/')} className="hover:text-text-primary transition-colors">Projects</button>
                        <ChevronRight className="w-3 h-3 text-text-muted" />
                        <span className="text-text-primary font-medium">{project.name}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 app-no-drag">
                    <button onClick={handleAddShot} className="app-btn app-btn-primary h-8 px-4 rounded-full">
                        <Plus className="w-4 h-4" /> <span className="text-xs font-bold">New Shot</span>
                    </button>
                </div>
            </header>

            {/* 2. MAIN WORKSPACE */}
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <main className="flex-1 bg-background relative overflow-hidden shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-10" />
                    <ErrorBoundary key={location.pathname}>
                        <Outlet context={contextValue} />
                    </ErrorBoundary>
                </main>
            </div>

            {/* 3. STATUS BAR */}
            <footer className="h-6 bg-surface border-t border-border flex items-center justify-between px-4 text-[10px] select-none shrink-0 text-text-secondary">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                        <Box className="w-3 h-3 opacity-70" /> Workspace Ready
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {saveStatus === 'saving' ? (
                        <span className="flex items-center gap-1 text-primary"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>
                    ) : (
                        <span className="text-text-muted">Saved</span>
                    )}
                </div>
            </footer>

            {/* FLOATING INSPECTOR */}
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

            <KeyboardShortcutsPanel isOpen={showShortcutsPanel} onClose={() => setShowShortcutsPanel(false)} />
        </div>
    );
};

export function useWorkspace() {
    return useOutletContext<WorkspaceContextType>();
}