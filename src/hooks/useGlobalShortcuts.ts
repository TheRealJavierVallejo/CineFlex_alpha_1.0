import { useEffect } from 'react';
import { Project } from '../types';
import { saveProjectData } from '../services/storage';

interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    action: () => void;
    preventDefault?: boolean;
}

export const useGlobalShortcuts = (
    project: Project | null, 
    handleUpdateProject: (p: Project) => void,
    undo?: () => void,
    redo?: () => void
) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCmd = e.metaKey || e.ctrlKey;
            
            // SAVE (Cmd + S)
            if (isCmd && e.key === 's') {
                e.preventDefault();
                if (project) {
                    saveProjectData(project.id, project);
                    // Force a UI toast if possible, typically handled by the caller
                    const event = new CustomEvent('app-save');
                    window.dispatchEvent(event);
                }
            }

            // UNDO (Cmd + Z)
            if (isCmd && e.key === 'z' && !e.shiftKey) {
                if (undo) {
                    e.preventDefault();
                    undo();
                }
            }

            // REDO (Cmd + Shift + Z)
            if (isCmd && e.shiftKey && e.key === 'z') {
                if (redo) {
                    e.preventDefault();
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [project, handleUpdateProject, undo, redo]);
};