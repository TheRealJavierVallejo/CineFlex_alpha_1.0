import React, { memo, useState } from 'react';
import { Undo, Redo, Moon, Sun, Download, FileText, Sparkles } from 'lucide-react';
import Button from '../../ui/Button';
import { ExportDialog } from './ExportDialog';
import { Project } from '../../../types';

interface ScriptPageToolbarProps {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    isPaperWhite: boolean;
    onTogglePaper: () => void;
    saveStatus: 'idle' | 'saving' | 'saved';
    currentPage: number;
    totalPages: number;
    sydOpen: boolean;
    onToggleSyd: () => void;
    project: Project;
}

export const ScriptPageToolbar: React.FC<ScriptPageToolbarProps> = memo(({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    isPaperWhite,
    onTogglePaper,
    saveStatus,
    currentPage,
    totalPages,
    sydOpen,
    onToggleSyd,
    project
}: ScriptPageToolbarProps) => {
    const [isExportOpen, setIsExportOpen] = useState(false);

    return (
        <div className="h-12 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10">
            {/* Left side: Title + Save status */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold">Script Editor</h2>
                </div>

                <div className="h-4 w-[1px] bg-border" />

                {saveStatus === 'saving' && (
                    <span className="text-xs text-text-muted animate-pulse">Saving...</span>
                )}
                {saveStatus === 'saved' && (
                    <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                        ✓ Saved
                    </span>
                )}
            </div>

            {/* Center: Page indicator */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
                <div className="text-xs font-mono text-text-muted bg-surface-secondary px-3 py-1 rounded-full border border-border">
                    Page {currentPage} of {totalPages}
                </div>
            </div>

            {/* Right side: Actions */}
            <div className="flex items-center gap-2">
                <div className="flex items-center bg-surface-secondary rounded-md p-0.5 border border-border mr-2">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="p-1.5 hover:bg-surface rounded-sm disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-3 bg-border mx-0.5" />
                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="p-1.5 hover:bg-surface rounded-sm disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo className="w-3.5 h-3.5" />
                    </button>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onTogglePaper}
                    icon={isPaperWhite ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    title={isPaperWhite ? "Switch to Dark Mode" : "Switch to Paper Mode"}
                />

                <Button
                    variant={sydOpen ? "primary" : "ghost"}
                    size="sm"
                    onClick={onToggleSyd}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    title={sydOpen ? "Close Syd" : "Open Syd"}
                >
                    Syd
                </Button>

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsExportOpen(true)}
                    icon={<Download className="w-3.5 h-3.5" />}
                >
                    Export
                </Button>

                <ExportDialog
                    isOpen={isExportOpen}
                    onClose={() => setIsExportOpen(false)}
                    project={project}
                />
            </div>
        </div>
    );
});
