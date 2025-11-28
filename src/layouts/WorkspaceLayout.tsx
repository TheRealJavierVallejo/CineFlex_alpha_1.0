import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation, useOutletContext, NavLink } from 'react-router-dom';
import { Project, Shot, WorldSettings, ShowToastFn, ToastNotification, ScriptElement } from '../types';
import { getProjectData, saveProjectData, setActiveProjectId } from '../services/storage';
import { ToastContainer } from '../components/features/Toast';
import KeyboardShortcutsPanel from '../components/KeyboardShortcutsPanel';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { Box, Loader2, LayoutGrid, Clapperboard, FileText, Film } from 'lucide-react';
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
            <div className="h-screen w-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-text-secondary">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm font-mono tracking-widest uppercase">Initializing CineFlex...</span>
                </div>
            </div>
        );
    }

    const contextValue: WorkspaceContextType = {
        project, handleUpdateProject, handleUpdateSettings, handleAddShot, handleEditShot,
        handleUpdateShot, handleBulkUpdateShots, handleDeleteShot, handleDuplicateShot,
        importScript, updateScriptElements, showToast
    };

    const NavTab = ({ to, icon: Icon, label, exact = false }: { to: string, icon: any, label: string, exact?: boolean }) => (
        <NavLink 
            to={to} 
            end={exact}
            className={({ isActive }) => `
                h-full px-4 flex items-center gap-2 border-b-2 transition-all text-xs font-bold uppercase tracking-wider
                ${isActive 
                    ? 'border-primary text-white bg-white/5' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-[#18181b]'}
            `}
        >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{label}</span>
        </NavLink>
    );

    return (
        <div className="h-screen w-screen bg-background text-text-primary flex flex-col overflow-hidden font-sans selection:bg-primary/30 selection:text-white">
            <ToastContainer toasts={toasts} onClose={closeToast} />

            {/* 1. HEADER (Command Center) */}
            <header className="h-12 bg-[#050505] border-b border-border flex items-center justify-between px-0 select-none shrink-0 z-30 relative">
                
                {/* LEFT: Branding & Project */}
                <div className="flex items-center h-full px-4 gap-4">
                    <div className="flex items-center gap-3 cursor-pointer group h-full" onClick={() => navigate('/')}>
                         {/* CINEFLEX ICON */}
                        <div className="w-8 h-8 bg-black border border-zinc-800 flex items-center justify-center relative group-hover:border-primary transition-colors rounded-full">
                             <Film className="w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="font-bold tracking-tight text-sm text-zinc-100 group-hover:text-white transition-colors">CineFlex</span>
                    </div>
                    
                    <div className="h-4 w-[1px] bg-zinc-800" />
                    
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className="text-text-primary font-medium truncate max-w-[150px]">{project.name}</span>
                    </div>
                </div>

                {/* CENTER: Navigation Tabs */}
                <nav className="flex items-center h-full absolute left-1/2 -translate-x-1/2">
                    <NavTab to="." exact icon={LayoutGrid} label="Dashboard" />
                    <NavTab to="timeline" icon={Clapperboard} label="Timeline" />
                    <NavTab to="script" icon={FileText} label="Script" />
                </nav>
                
                {/* RIGHT: Status */}
                <div className="flex items-center gap-4 px-4 h-full text-xs text-zinc-500 font-mono">
                    {saveStatus === 'saving' ? (
                        <span className="flex items-center gap-2 text-primary animate-pulse"><div className="w-1.5 h-1.5 bg-primary rounded-full" /> SYNCING</span>
                    ) : (
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" /> READY</span>
                    )}
                </div>
            </header>

            {/* 2. MAIN WORKSPACE */}
            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 bg-black relative overflow-hidden">
                    {/* Subtle gradient for depth */}
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/10 to-transparent pointer-events-none z-10" />
                    <ErrorBoundary key={location.pathname}>
                        <Outlet context={contextValue} />
                    </ErrorBoundary>
                </main>
            </div>

            {/* 3. STATUS BAR (Minimal) */}
            <footer className="h-6 bg-[#050505] border-t border-border flex items-center justify-between px-4 text-[9px] font-mono select-none shrink-0 text-zinc-600 uppercase tracking-wider">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                        <Box className="w-3 h-3 opacity-50" /> v3.1 PRO
                    </span>
                </div>
                <div>
                   RAM: OPTIMAL
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