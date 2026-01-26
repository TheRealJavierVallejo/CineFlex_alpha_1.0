import React, { useState } from 'react';
import { History, Plus, Trash2, Edit2, Check, X, Clock } from 'lucide-react';
import { useWorkspace } from '../../../layouts/WorkspaceLayout';
import Button from '../../ui/Button';

export const VersionsPanel: React.FC = () => {
    const {
        project,
        handleCreateDraft,
        handleSwitchDraft,
        handleDeleteDraft,
        handleRenameDraft,
        showToast
    } = useWorkspace();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);

    const sortedDrafts = [...(project.drafts || [])].sort((a, b) => b.updatedAt - a.updatedAt);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const onStartRename = (id: string, name: string) => {
        setEditingId(id);
        setEditName(name);
    };

    const onSaveRename = (id: string) => {
        if (editName.trim()) {
            handleRenameDraft(id, editName.trim());
        }
        setEditingId(null);
    };

    return (
        <div className="flex flex-col h-full bg-surface border-l border-border animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur sticky top-0 z-10">
                <div>
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Versions
                    </h2>
                    <p className="text-xs text-text-secondary mt-1">Manage script drafts & snapshots</p>
                </div>
                <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => handleCreateDraft()}
                >
                    Snapshot
                </Button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sortedDrafts.map((draft) => {
                    const isActive = draft.id === project.activeDraftId;
                    const isEditing = editingId === draft.id;
                    const isDeleting = confirmDelete === draft.id;
                    const isSwitching = confirmSwitch === draft.id;

                    return (
                        <div
                            key={draft.id}
                            className={`
                                group relative p-4 rounded-xl border transition-all duration-200
                                ${isActive
                                    ? 'bg-primary/5 border-primary shadow-sm'
                                    : 'bg-surface-secondary border-border hover:border-text-muted/30 hover:shadow-md'}
                            `}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                autoFocus
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && onSaveRename(draft.id)}
                                                className="bg-surface border border-primary px-2 py-1 rounded text-sm w-full outline-none"
                                            />
                                            <button onClick={() => onSaveRename(draft.id)} className="text-primary hover:text-primary-hover">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-text-primary">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-sm text-text-primary truncate">
                                                {draft.name}
                                            </h3>
                                            {isActive && (
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] font-bold text-green-500 uppercase tracking-tight">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-[10px] text-text-tertiary font-medium">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(draft.updatedAt)}
                                    </div>
                                </div>

                                {/* Actions */}
                                {!isActive && !isEditing && !isDeleting && !isSwitching && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onStartRename(draft.id, draft.name)}
                                            className="p-1.5 hover:bg-surface rounded-md text-text-muted hover:text-text-primary transition-colors"
                                            title="Rename"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(draft.id)}
                                            className="p-1.5 hover:bg-red-500/10 rounded-md text-text-muted hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Switch Confirmation Overlay */}
                            {isSwitching && (
                                <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20 animate-in fade-in zoom-in-95 duration-200">
                                    <p className="text-xs font-medium text-text-primary mb-2">
                                        Switching will save your current work. Continue?
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                handleSwitchDraft(draft.id);
                                                setConfirmSwitch(null);
                                            }}
                                            className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider transition-colors"
                                        >
                                            Yes, Switch
                                        </button>
                                        <button
                                            onClick={() => setConfirmSwitch(null)}
                                            className="bg-surface border border-border text-text-secondary text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider hover:bg-surface-secondary transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Delete Confirmation Overlay */}
                            {isDeleting && (
                                <div className="mt-4 p-3 bg-red-500/5 rounded-lg border border-red-500/10 animate-in fade-in zoom-in-95 duration-200">
                                    <p className="text-xs font-medium text-text-primary mb-2">
                                        Delete this version? This cannot be undone.
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                handleDeleteDraft(draft.id);
                                                setConfirmDelete(null);
                                            }}
                                            className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider transition-colors shadow-sm"
                                        >
                                            Delete Permanent
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(null)}
                                            className="bg-surface border border-border text-text-secondary text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider hover:bg-surface-secondary transition-colors"
                                        >
                                            Keep it
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Non-Active Switch Trigger Area */}
                            {!isActive && !isEditing && !isDeleting && !isSwitching && (
                                <button
                                    onClick={() => setConfirmSwitch(draft.id)}
                                    className="absolute inset-x-0 bottom-0 top-0 w-full z-0 cursor-pointer"
                                    title="Click to switch version"
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty State Footer */}
            <div className="p-6 border-t border-border bg-surface-secondary/30">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <History className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-tight">Version Control</h4>
                        <p className="text-[10px] text-text-tertiary mt-1 leading-relaxed">
                            Every import and manual snapshot creates a new version. The active version is what you're currently editing.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
