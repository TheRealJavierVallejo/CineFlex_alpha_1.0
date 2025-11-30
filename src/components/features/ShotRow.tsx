import React, { useState, memo, useMemo } from 'react';
import { Shot, ScriptElement } from '../../types';
import { Plus, Type, X, Edit2, GraduationCap, Maximize2 } from 'lucide-react';
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

    // Helper to determine aspect ratio class or style
    const aspectRatioStyle = useMemo(() => {
        if (!shot.aspectRatio || shot.aspectRatio === 'Match Reference') return { aspectRatio: '16/9' };
        const [w, h] = shot.aspectRatio.split(':').map(Number);
        if (isNaN(w) || isNaN(h)) return { aspectRatio: '16/9' };
        return { aspectRatio: `${w}/${h}` };
    }, [shot.aspectRatio]);

    return (
        <>
            <div className="group/row grid grid-cols-2 border-b border-border hover:bg-surface-secondary transition-colors relative min-h-[220px]">
                
                {/* 1. VISUAL COLUMN (50% Width) */}
                <div className="p-4 border-r border-border flex flex-col gap-3 bg-surface justify-center relative">
                    {/* Header: Shot Number & Meta */}
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-bold text-text-secondary bg-surface-secondary px-1.5 py-0.5 rounded border border-border">
                                SHOT {String(shot.sequence).padStart(2, '0')}
                            </span>
                            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                                {shot.shotType} • {shot.aspectRatio || '16:9'}
                            </span>
                        </div>
                        
                        <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                                className="text-text-muted hover:text-red-500 transition-colors p-1"
                                title="Delete Shot"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Image Stage */}
                    <div className="w-full flex items-center justify-center">
                        <div
                            className="w-full relative group/visual cursor-pointer hover:border-primary transition-all duration-200 rounded-sm overflow-hidden bg-[#050505] border border-border shadow-sm"
                            style={{ 
                                ...aspectRatioStyle, 
                                maxHeight: '400px' // Prevent extremely tall vertical shots from breaking flow
                            }}
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
                                className="w-full h-full object-contain" // Changed to object-contain to show full image without cropping
                                placeholder={
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-text-muted group-hover/visual:text-text-secondary transition-colors bg-surface-secondary/20">
                                        <Plus className="w-8 h-8 opacity-50" />
                                        <span className="text-[9px] uppercase tracking-widest font-bold opacity-70">Add Visual</span>
                                    </div>
                                }
                            />

                            {/* Draft Badge */}
                            {shot.generatedImage && shot.model?.includes('Student') && (
                                <div className="absolute top-2 right-2 media-control px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase text-zinc-300 border border-white/10 z-10 flex items-center gap-1 pointer-events-none">
                                    <GraduationCap className="w-3 h-3" /> Draft
                                </div>
                            )}

                            {/* Hover Overlay */}
                            {shot.generatedImage && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/visual:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                    <span className="text-[10px] uppercase font-bold text-white tracking-widest border border-white/30 bg-black/50 px-3 py-1.5 rounded-sm flex items-center gap-2 hover:bg-primary hover:border-primary transition-colors">
                                        <Edit2 className="w-3 h-3"/> Edit Shot
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. SCRIPT / CONTENT COLUMN (50% Width) */}
                <div className="p-8 flex flex-col justify-center relative">
                    {/* Description Input (if no linked script) */}
                    {sortedElements.length === 0 && (
                        <div className="h-full flex flex-col">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Visual Description</label>
                            <DebouncedTextarea
                                value={shot.description}
                                onChange={(val) => onUpdateShot(shot.id, { description: val })}
                                placeholder="// Describe the action, lighting, and camera movement..."
                                className="w-full bg-transparent text-sm text-text-secondary placeholder:text-text-muted/50 outline-none resize-none font-mono h-full min-h-[100px] leading-relaxed"
                            />
                        </div>
                    )}

                    {/* Linked Script Elements */}
                    <div className="space-y-4">
                        {sortedElements.map((el, index) => {
                            // Smart Display Logic
                            const prevEl = index > 0 ? sortedElements[index - 1] : null;
                            const isContinuation = prevEl && prevEl.type === 'character' && prevEl.content === el.character;
                            const showLabel = el.character && !isContinuation;

                            return (
                                <div key={el.id} className="relative group/element pl-4 border-l-2 border-primary/20 hover:border-primary transition-colors py-1">
                                    <div className="font-mono text-base leading-relaxed text-text-primary">
                                        {showLabel && (
                                            <div className="font-bold uppercase text-xs mb-1 text-primary tracking-wide">{el.character}</div>
                                        )}
                                        <div className="whitespace-pre-wrap">{el.content}</div>
                                    </div>
                                    <button
                                        onClick={() => onUnlinkElement(shot.id, el.id)}
                                        className="absolute top-1 right-0 text-text-muted hover:text-red-500 opacity-0 group-hover/element:opacity-100 transition-opacity p-1"
                                        title="Unlink"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Link Button */}
                    <div className="mt-6 pt-4 border-t border-border/20 flex items-center justify-between opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                            onClick={() => onLinkElement(shot.id, 'script')}
                            className="text-[10px] uppercase font-bold text-text-secondary hover:text-primary flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-surface"
                        >
                            <Type className="w-3 h-3" /> Link Script Line
                        </button>
                        
                        {sortedElements.length > 0 && (
                             <span className="text-[9px] text-text-muted font-mono">{sortedElements.length} lines linked</span>
                        )}
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
        prev.shot.aspectRatio === next.shot.aspectRatio && 
        prev.linkedElements.length === next.linkedElements.length &&
        prev.linkedElements.every((el, i) => el.id === next.linkedElements[i].id)
    );
});