import React, { useState, memo } from 'react';
import { Shot, ScriptElement } from '../../types';
import { Plus, Type, X, Edit2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { LazyImage } from '../ui/LazyImage';
import { DebouncedTextarea } from '../ui/DebouncedTextarea';

interface ShotRowProps {
    shot: Shot;
    linkedElements: ScriptElement[];
    onUpdateShot: (id: string, updates: Partial<Shot>) => void;
    onDeleteShot: (id: string) => void;
    onLinkElement: (shotId: string, type: 'action' | 'dialogue' | 'script') => void;
    onUnlinkElement: (shotId: string, elementId: string) => void;
    onEditShot: (shot: Shot) => void;
    onAddVisual: (shotId: string) => void;
}

// Memoized Component
export const ShotRow: React.FC<ShotRowProps> = memo(({
    shot,
    linkedElements,
    onUpdateShot,
    onDeleteShot,
    onLinkElement,
    onUnlinkElement,
    onEditShot,
    onAddVisual
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    return (
        <>
            <div className="group/row flex border-b border-border hover:bg-surface-secondary transition-colors relative min-h-[120px]">
                {/* 1. VISUAL COLUMN */}
                <div className="w-[240px] p-3 border-r border-border flex flex-col gap-2 shrink-0 bg-surface">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-text-secondary">SHOT {String(shot.sequence).padStart(2, '0')}</span>
                        <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                                className="text-text-muted hover:text-red-500 transition-colors"
                                title="Delete Shot"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <div
                        className="aspect-video w-full border border-border relative group/visual cursor-pointer hover:border-primary transition-colors rounded-sm overflow-hidden bg-background"
                        onClick={() => {
                            if (shot.generatedImage) {
                                onEditShot(shot);
                            } else {
                                onAddVisual(shot.id);
                            }
                        }}
                    >
                        <LazyImage 
                            src={shot.generatedImage} 
                            className="w-full h-full"
                            placeholder={
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-text-muted group-hover/visual:text-text-secondary transition-colors">
                                    <Plus className="w-6 h-6" />
                                    <span className="text-[9px] uppercase tracking-widest">Empty Frame</span>
                                </div>
                            }
                        />

                        {shot.generatedImage && (
                            <div className="absolute inset-0 media-control opacity-0 group-hover/visual:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <span className="text-[10px] uppercase font-bold text-white tracking-widest border border-white px-2 py-1 flex items-center gap-2">
                                    <Edit2 className="w-3 h-3"/> Edit
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between text-[9px] font-mono text-text-muted uppercase">
                        <span>{shot.shotType}</span>
                        <span>{shot.aspectRatio || '16:9'}</span>
                    </div>
                </div>

                {/* 2. SCRIPT / CONTENT COLUMN */}
                <div className="flex-1 p-4 flex flex-col justify-center">
                    {/* Description Input (if no linked script) */}
                    {linkedElements.length === 0 && (
                        <div className="mb-2 h-full">
                            <DebouncedTextarea
                                value={shot.description}
                                onChange={(val) => onUpdateShot(shot.id, { description: val })}
                                placeholder="// Describe shot action..."
                                className="w-full bg-transparent text-sm text-text-secondary placeholder:text-text-muted outline-none resize-none font-mono h-full min-h-[60px]"
                            />
                        </div>
                    )}

                    {/* Linked Script Elements */}
                    <div className="space-y-3">
                        {linkedElements.map(el => (
                            <div key={el.id} className="relative group/element pl-3 border-l-2 border-primary/20 hover:border-primary transition-colors">
                                <div className="font-mono text-sm leading-relaxed text-text-secondary">
                                    {el.character && <div className="font-bold uppercase text-xs mb-0.5 text-primary/70">{el.character}</div>}
                                    <div className="whitespace-pre-wrap">{el.content}</div>
                                </div>
                                <button
                                    onClick={() => onUnlinkElement(shot.id, el.id)}
                                    className="absolute top-0 right-0 text-text-muted hover:text-red-500 opacity-0 group-hover/element:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Link Button */}
                    <div className="mt-4 pt-2 border-t border-border/20 flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                            onClick={() => onLinkElement(shot.id, 'script')}
                            className="text-[10px] uppercase font-bold text-text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                        >
                            <Type className="w-3 h-3" /> Link Script Element
                        </button>
                    </div>
                </div>
            </div>

            {/* CONFIRMATION MODAL */}
            {showDeleteConfirm && (
                <Modal
                    isOpen={true}
                    onClose={() => setShowDeleteConfirm(false)}
                    title="Delete Shot"
                    size="sm"
                >
                    <div className="space-y-6">
                        <div className="text-text-secondary text-sm">
                            <p>Are you sure you want to delete <strong>Shot #{shot.sequence}</strong>?</p>
                            <p className="text-xs mt-2 text-text-muted">This action cannot be undone.</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    onDeleteShot(shot.id);
                                    setShowDeleteConfirm(false);
                                }}
                            >
                                Confirm Delete
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}, (prev, next) => {
    // Custom comparison function for performance
    return (
        prev.shot.id === next.shot.id &&
        prev.shot.description === next.shot.description &&
        prev.shot.generatedImage === next.shot.generatedImage &&
        prev.shot.sequence === next.shot.sequence &&
        prev.linkedElements.length === next.linkedElements.length &&
        prev.linkedElements.every((el, i) => el.id === next.linkedElements[i].id)
    );
});