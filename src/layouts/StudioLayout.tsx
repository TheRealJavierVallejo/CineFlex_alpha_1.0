import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { Project, Shot, WorldSettings, ShowToastFn, ToastNotification, ScriptElement } from '../types';
import { getProjectData, saveProjectData, setActiveProjectId } from '../services/storage';
import { Dock } from '../components/layout/Dock';
import { ToastContainer } from '../components/features/Toast';
import KeyboardShortcutsPanel from '../components/KeyboardShortcutsPanel';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { Loader2, ArrowLeft, Share, Save } from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';
import { parseScript } from '../services/scriptParser';
import { syncScriptToScenes } from '../services/scriptUtils';

// Context type for child routes
export interface StudioContextType {
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

export const StudioLayout: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    // Keyboard Shortcuts (Panel Toggle)
    useKeyboardShortcut({
        key: 'k', meta: true, callback: (e) => { e.preventDefault(); setShowShortcutsPanel(true); }
    });

    // Global Shortcuts (Save/Undo logic - Note: Undo is page-specific usually, but Save is global)
    useGlobalShortcuts(project, (p) => handleUpdateProject(p));

    // Listen for manual save events from hook
    useEffect(() => {
        const onManualSave = () => {
            setSaveStatus('saving');
            showToast("Project saved", 'success');
            setTimeout(() => setSaveStatus('saved'), 500);
        };
        window.addEventListener('app-save', onManualSave);
        return () => window.removeEventListener('app-save', onManualSave);
    }, []);

    const showToast: ShowToastFn = (message, type = 'info', action) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, action }]);
    };

    const closeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Load Project
    useEffect(() => {
        if (!projectId) { navigate('/'); return; }
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

    // --- DATA HANDLERS ---
    
    const handleUpdateProject = async (updated: Project) => {
        setSaveStatus('saving');
        setProject(updated);
        // Fire-and-forget save to IDB
        if (updated.id) await saveProjectData(updated.id, updated);
        // Visual feedback delay
        setTimeout(() => setSaveStatus('saved'), 800);
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

    // --- SHOT LOGIC ---

    const handleAddShot = () => {
        // Placeholder for now, specific views handle this differently
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
        const updatedShots = project.shots.filter(s => s.id !== shotId);
        handleUpdateProject({ ...project, shots: updatedShots });
    };

    const handleDuplicateShot = (shotId: string) => {
        if (!project) return;
        const sourceShot = project.shots.find(s => s.id === shotId);
        if (!sourceShot) return;
        
        // Find max sequence in that scene
        const sceneShots = project.shots.filter(s => s.sceneId === sourceShot.sceneId);
        const maxSeq = Math.max(...sceneShots.map(s => s.sequence));

        const newShot: Shot = {
            ...sourceShot,
            id: crypto.randomUUID(),
            sequence: maxSeq + 1,
            generatedImage: undefined, // Don't dup the image, it's a new shot
            generationCandidates: [],
            description: `${sourceShot.description} (Copy)`
        };
        
        handleUpdateProject({ ...project, shots: [...project.shots, newShot] });
        showToast("Shot duplicated", 'success');
    };

    // This is passed to child components to handle local UI state (like opening the Inspector)
    const handleEditShot = (shot: Shot) => {
         // In the new layout, this will be handled by the Director view locally
    };


    if (isLoading || !project) {
        return (
            <div className="h-screen w-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const contextValue: StudioContextType = {
        project, handleUpdateProject, handleUpdateSettings, handleAddShot, handleEditShot,
        handleUpdateShot, handleBulkUpdateShots, handleDeleteShot, handleDuplicateShot,
        importScript, updateScriptElements, showToast
    };

    return (
        <div className="h-screen w-screen bg-black text-text-primary flex flex-col overflow-hidden font-sans">
            <ToastContainer toasts={toasts} onClose={closeToast} />

            {/* MINIMAL TOP BAR (Project Context) */}
            <div className="h-12 flex items-center justify-between px-6 z-40 bg-background border-b border-border shrink-0 select-none">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/')} 
                        className="text-text-tertiary hover:text-white transition-colors"
                        title="Back to Projects"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-sm font-bold text-white/90 tracking-wide">{project.name}</h1>
                        <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${saveStatus === 'saving' ? 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.8)]' : 'bg-green-500'}`} />
                             <span className="text-[10px] uppercase font-mono text-text-tertiary transition-opacity">
                                {saveStatus === 'saving' ? 'SAVING...' : 'SYNCED'}
                             </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-[10px] text-text-tertiary font-mono hidden md:block">
                        CMD+K for Shortcuts
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs font-bold transition-colors">
                        <Share className="w-3 h-3" /> Export
                    </button>
                </div>
            </div>

            {/* MAIN STAGE */}
            <main className="flex-1 relative z-0 overflow-hidden">
                <ErrorBoundary key={location.pathname}>
                    <Outlet context={contextValue} />
                </ErrorBoundary>
            </main>

            {/* FLOATING DOCK */}
            <Dock />

            <KeyboardShortcutsPanel isOpen={showShortcutsPanel} onClose={() => setShowShortcutsPanel(false)} />
        </div>
    );
};

export function useStudio() {
    return useOutletContext<StudioContextType>();
}