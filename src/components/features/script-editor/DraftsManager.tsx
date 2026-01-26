import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../../layouts/WorkspaceLayout';
import { SlateScriptEditor } from './SlateScriptEditor';
import { ScriptDraft } from '../../../types';
import Button from '../../ui/Button';
import { Plus, Download, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';

export const DraftsManager: React.FC = () => {
    const { project, handleCreateDraft, handleSwitchDraft, importScript } = useWorkspace();
    
    // State for which draft is currently being VIEWED (previewed) on the right
    // Default to the active draft initially
    const [selectedPreviewId, setSelectedPreviewId] = useState<string>(project.activeDraftId || '');

    // Ensure we have a valid selection if the active draft changes externally
    useEffect(() => {
        if (!selectedPreviewId && project.activeDraftId) {
            setSelectedPreviewId(project.activeDraftId);
        }
    }, [project.activeDraftId, selectedPreviewId]);

    // Find the actual draft objects
    const previewDraft = project.drafts.find(d => d.id === selectedPreviewId) || project.drafts[0];
    const sortedDrafts = [...(project.drafts || [])].sort((a, b) => b.updatedAt - a.updatedAt);

    // Handler for file import (hidden input)
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await importScript(file);
    };

    return (
        <div className="flex flex-row h-full w-full bg-background overflow-hidden">
            {/* LEFT SIDEBAR: Draft List */}
            <div className="w-[400px] flex flex-col border-r border-border bg-surface-secondary/30 h-full">
                
                {/* Header Section */}
                <div className="p-6 border-b border-border space-y-4">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        Drafts Editor
                    </h2>
                    
                    <div className="flex gap-3">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".pdf,.fountain,.txt,.json" 
                            className="hidden" 
                        />
                        <Button 
                            variant="secondary" 
                            className="flex-1"
                            onClick={handleImportClick}
                            icon={<Download className="w-4 h-4" />}
                        >
                            Import
                        </Button>
                        <Button 
                            variant="primary" 
                            className="flex-1"
                            onClick={() => handleCreateDraft()}
                            icon={<Plus className="w-4 h-4" />}
                        >
                            New Draft
                        </Button>
                    </div>
                </div>

                {/* Drafts List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {sortedDrafts.map((draft) => {
                        const isCurrent = draft.id === project.activeDraftId;
                        const isSelected = draft.id === selectedPreviewId;

                        return (
                            <div 
                                key={draft.id}
                                onClick={() => setSelectedPreviewId(draft.id)}
                                className={`
                                    relative p-4 rounded-xl border transition-all cursor-pointer group
                                    ${isSelected 
                                        ? 'bg-primary/5 border-primary shadow-sm' 
                                        : 'bg-surface border-border hover:border-text-muted hover:bg-surface-secondary'}
                                `}
                            >
                                {/* Header Row: Name + Current Badge */}
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-base ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                                        {draft.name}
                                    </h3>
                                    {isCurrent && (
                                        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Current
                                        </span>
                                    )}
                                </div>

                                {/* Description / Date */}
                                <p className="text-xs text-text-secondary mb-4 line-clamp-2">
                                    Last edited: {format(draft.updatedAt, 'MMM d, yyyy h:mm a')}
                                </p>

                                {/* Action Button */}
                                {!isCurrent && (
                                    <div className="flex justify-end">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Don't trigger selection
                                                handleSwitchDraft(draft.id);
                                            }}
                                            className="text-xs font-bold text-text-muted hover:text-primary border border-border hover:border-primary px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            Make Current
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT CONTENT: Preview Area */}
            <div className="flex-1 h-full bg-background relative overflow-hidden flex flex-col">
                {/* Preview Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-8 bg-surface/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <Eye className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm font-bold text-text-secondary uppercase tracking-widest">
                            Previewing: <span className="text-text-primary">{previewDraft?.name}</span>
                        </span>
                    </div>
                    {previewDraft?.id === project.activeDraftId && (
                         <span className="text-xs font-medium text-emerald-500 flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3" />
                            Active Editing Draft
                         </span>
                    )}
                </div>

                {/* Read-Only Editor */}
                <div className="flex-1 overflow-y-auto w-full">
                    <div className="min-h-full flex justify-center py-10 pb-[20vh]">
                        <div className="w-full max-w-[850px] pointer-events-none select-none opacity-90">
                            {/* We use key to force re-render when preview selection changes */}
                            {previewDraft ? (
                                <SlateScriptEditor
                                    key={`preview-${previewDraft.id}`}
                                    initialElements={previewDraft.content}
                                    readOnly={true} // IMPORTANT: Read-only mode
                                    projectId={project.id}
                                    onChange={() => {}} // No-op
                                />
                            ) : (
                                <div className="text-center text-text-muted mt-20">Select a draft to preview</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
