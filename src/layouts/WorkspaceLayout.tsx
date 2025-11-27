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
    handleUpdateShot: (shot: Shot) => void; // Added this
    handleDeleteShot: (shotId: string) => void;
    handleDuplicateShot: (shotId: string) => void;
    
    // New Centralized Script Functions
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
    
    // Editor State
    const [editingShot, setEditingShot] = useState<Shot | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    
    // UI State
    const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    // --- KEYBOARD SHORTCUTS ---
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

    // --- TOASTS ---
    const showToast: ShowToastFn = (message, type = 'info', action) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, action }]);
    };

    const closeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // --- INITIALIZATION ---
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

    // --- PROJECT ACTIONS ---

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

    // --- CENTRALIZED SCRIPT LOGIC ("THE ONE BRAIN") ---
    
    const importScript = async (file: File) => {
        if (!project) return;
        
        try {
            setSaveStatus('saving');
            const parsed = await parseScript(file);
            
            // 1. Create a temp project state with the new elements
            const tempProject: Project = {
                ...project,
                scriptElements: parsed.elements,
                // If it's a fresh import, we might want to reset scenes or merge. 
                // For a "fresh import" behavior, we typically let syncScriptToScenes regenerate scenes.
                scriptFile: {
                    name: file.name,
                    uploadedAt: Date.now(),
                    format: file.name.endsWith('.fountain') ? 'fountain' : 'txt'
                }
            };
            
            // 2. AUTO-SYNC: Immediately generate/update scenes from the new script
            const syncedProject = syncScriptToScenes(tempProject);
            
            // 3. Save
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
        
        // 1. Update elements
        const tempProject = { ...project, scriptElements: elements };
        
        // 2. AUTO-SYNC: Check if headings changed and update Timeline scenes
        const syncedProject = syncScriptToScenes(tempProject);
        
        // 3. Save
        handleUpdateProject(syncedProject);
    };

    // --- SHOT ACTIONS ---

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
        // 1. Find original
        const index = project.shots.findIndex(s => s.id === shotId);
        if (index === -1) return;
        const original = project.shots[index];

        // 2. Create Clone
        const newShot: Shot = {
            ...original,
            id: crypto.randomUUID(),
            sequence: original.sequence + 1,
            // We clear the image so they can generate a variation
            generatedImage: undefined, 
            generationCandidates: [],
            description: original.description + " (Copy)"
        };

        // 3. Insert and Re-Sequence
        const newShots = [...project.shots];
        // Insert after original
        newShots.splice(index + 1, 0, newShot);
        
        // Re-assign sequences for everyone to keep order clean
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
            <div className="h-screen w-screen bg-[#1E1E1E] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-[#969696]">
                    <Loader2 className="w-8 h-8 animate-spin text-[#007ACC]" />
                    <span className="text-sm">Loading Project...</span>
                </div>
            </div>
        );
    }

    // Prepare context for child routes
    const contextValue: WorkspaceContextType = {
        project,
        handleUpdateProject,
        handleUpdateSettings,
        handleAddShot,
        handleEditShot,
        handleUpdateShot,
        handleDeleteShot,
        handleDuplicateShot,
        importScript,
        updateScriptElements,
        showToast
    };

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
                    <div className="h-4 w-[1px] bg-[#3E3E42] mx-1" />
                    <div className="flex items-center gap-1 text-[12px] text-[#969696] app-no-drag">
                        <button onClick={() => navigate('/')} className="hover:text-white transition-colors">Projects</button>
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
                <Sidebar />
                <main className="flex-1 bg-[#18181B] relative overflow-hidden">
                    <ErrorBoundary key={location.pathname}>
                        <Outlet context={contextValue} />
                    </ErrorBoundary>
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

// Hook Helper
export function useWorkspace() {
    return useOutletContext<WorkspaceContextType>();
}