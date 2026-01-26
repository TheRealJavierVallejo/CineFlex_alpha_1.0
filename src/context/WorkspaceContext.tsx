import { useOutletContext } from 'react-router-dom';
import { Project, Shot, WorldSettings, ShowToastFn, ScriptElement, ScriptDraft } from '../types';

export interface WorkspaceContextType {
    project: Project;
    handleUpdateProject: (updated: Project) => void;
    handleUpdateSettings: <K extends keyof WorldSettings>(key: K, value: WorldSettings[K]) => void;
    handleAddShot: () => void;
    handleEditShot: (shot: Shot) => void;
    handleUpdateShot: (shot: Shot) => void;
    handleBulkUpdateShots: (shots: Shot[]) => void;
    handleDeleteShot: (shotId: string) => void;
    handleDuplicateShot: (shotId: string) => void;
    importScript: (file: File) => Promise<void>;
    handleCreateDraft: (name?: string) => void;
    handleSwitchDraft: (draftId: string) => Promise<void>;
    handleDeleteDraft: (draftId: string) => void;
    handleRenameDraft: (draftId: string, name: string) => void;
    updateScriptElements: (elements: ScriptElement[]) => void;
    showToast: ShowToastFn;
    saveNow: () => Promise<void>;
}

export function useWorkspace(): WorkspaceContextType {
    const context = useOutletContext<WorkspaceContextType>();
    if (!context) {
        throw new Error("useWorkspace must be used within a WorkspaceLayout outlet context");
    }
    return context;
}
