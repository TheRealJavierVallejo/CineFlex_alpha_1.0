import React, { useState, memo, useMemo } from 'react';
import { Shot, ScriptElement } from '../../types';
import { Plus, Type, X, Edit2, GraduationCap } from 'lucide-react';
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

    // CRITICAL: Ensure elements are sorted by sequence to correctly detect character headers
    const sortedElements = useMemo(() => {
        return [...linkedElements].sort((a, b) => a.sequence - b.sequence);
    }, [linkedElements]);

    return (
        <>
            <div className="group/row flex border-b border-border hover:bg-surface-secondary/30 transition-colors relative min-h-[140px]">
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

                        {/* Draft Badge */}
                        {shot.generatedImage && shot.model?.includes('Student') && (
                            <div className="absolute top-1 right-1 media-control px-1.5 py-0.5 rounded-[1px] text-[8px] font-bold uppercase text-zinc-300 border border-white/10 z-10 flex items-center gap-1 pointer-events-none">
                                <GraduationCap className="w-2.5 h-2.5" /> Draft
                            </div>
                        )}

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
                <div className="flex-1 p-4 flex flex-col justify-center bg-background/50">
                    {/* Description Input (only if no linked script) */}
                    {sortedElements.length === 0 && (
                        <div className="mb-2 h-full flex items-center">
                            <DebouncedTextarea
                                value={shot.description}
                                onChange={(val) => onUpdateShot(shot.id, { description: val })}
                                placeholder="// Describe shot action..."
                                className="w-full bg-transparent text-sm text-text-secondary placeholder:text-text-muted outline-none resize-none font-mono min-h-[60px]"
                            />
                        </div>
                    )}

                    {/* Linked Script Elements - SCREENPLAY FORMAT */}
                    <div className="space-y-1 w-full max-w-3xl mx-auto">
                        {sortedElements.map((el, index) => {
                            const isCharacter = el.type === 'character';
                            const isDialogue = el.type === 'dialogue';
                            const isParenthetical = el.type === 'parenthetical';
                            const isTransition = el.type === 'transition';
                            const isAction = el.type === 'action';
                            const isHeading = el.type === 'scene_heading';

                            return (
                                <div key={el.id} className="relative group/element hover:bg-white/5 rounded-sm px-4 py-1 transition-colors">
                                    
                                    {/* Remove Button (Hover) */}
                                    <button
                                        onClick={() => onUnlinkElement(shot.id, el.id)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-500 opacity-0 group-hover/element:opacity-100 transition-opacity p-1"
                                        title="Unlink"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>

                                    {/* Action (Left Aligned with Marker) */}
                                    {isAction && (
                                        <div className="text-left pl-3 border-l-2 border-primary/30 text-sm text-text-secondary leading-relaxed font-sans py-1">
                                            {el.content}
                                        </div>
                                    )}

                                    {/* Character (Centered, Bold) */}
                                    {isCharacter && (
                                        <div className="flex justify-center mt-3">
                                            <span className="font-bold text-xs uppercase text-text-primary tracking-widest">{el.content}</span>
                                        </div>
                                    )}

                                    {/* Dialogue (Centered) */}
                                    {isDialogue && (
                                        <div className="flex justify-center">
                                            <span className="text-sm text-text-primary/90 text-center max-w-[85%] font-medium leading-relaxed font-mono">{el.content}</span>
                                        </div>
                                    )}

                                    {/* Parenthetical (Centered, Italic) */}
                                    {isParenthetical && (
                                        <div className="flex justify-center -my-0.5">
                                            <span className="text-xs italic text-text-muted text-center">{el.content}</span>
                                        </div>
                                    )}

                                    {/* Transition (Right Aligned) */}
                                    {isTransition && (
                                        <div className="flex justify-end pr-10 mt-3 mb-2">
                                            <span className="font-bold text-xs uppercase text-text-primary tracking-widest">{el.content}</span>
                                        </div>
                                    )}

                                    {/* Scene Heading (Rare in shots, but supported) */}
                                    {isHeading && (
                                        <div className="font-bold uppercase text-xs text-text-tertiary border-b border-border/30 pb-1 mb-2 mt-2">
                                            {el.content}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Link Button */}
                    <div className="mt-4 pt-2 border-t border-border/20 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                            onClick={() => onLinkElement(shot.id, 'script')}
                            className="text-[10px] uppercase font-bold text-text-secondary hover:text-primary flex items-center gap-1 transition-colors px-3 py-1 rounded hover:bg-surface-secondary"
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