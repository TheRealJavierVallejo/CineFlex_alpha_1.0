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

    // Helper to determine aspect ratio class or style
    const aspectRatioStyle = useMemo(() => {
        if (!shot.aspectRatio || shot.aspectRatio === 'Match Reference') return { aspectRatio: '16/9' };
        const [w, h] = shot.aspectRatio.split(':').map(Number);
        if (isNaN(w) || isNaN(h)) return { aspectRatio: '16/9' };
        return { aspectRatio: `${w}/${h}` };
    }, [shot.aspectRatio]);

    // Screenplay Standard Formatting Logic (Matching ScriptPage exactly)
    const getElementStyle = (type: ScriptElement['type']) => {
        const base = "font-screenplay text-[16px] leading-snug text-text-primary whitespace-pre-wrap relative";
        
        // Using standard screenplay indentations (approximate for web display)
        // 1 inch approx 96px or 6rem
        switch (type) {
            case 'scene_heading':
                return {
                    className: `${base} font-bold uppercase mt-4 mb-2`,
                    style: { width: '100%' }
                };
            case 'action':
                return {
                    className: `${base} mt-2 mb-2`,
                    style: { width: '100%' }
                };
            case 'character':
                return {
                    className: `${base} font-bold uppercase mt-4 mb-0`,
                    style: { marginLeft: '35%', width: '60%' } // Approx 2.0in visual center
                };
            case 'dialogue':
                return {
                    className: `${base} mb-1`,
                    style: { marginLeft: '15%', width: '70%' } // Approx 1.0in visual block
                };
            case 'parenthetical':
                return {
                    className: `${base} italic text-sm mb-0`,
                    style: { marginLeft: '25%', width: '50%' } // Approx 1.6in indent
                };
            case 'transition':
                return {
                    className: `${base} font-bold uppercase text-right mt-4 mb-2`,
                    style: { width: '100%' }
                };
            default:
                return {
                    className: `${base}`,
                    style: {}
                };
        }
    };

    return (
        <>
            <div className="group/row grid grid-cols-2 border-b border-border hover:bg-surface-secondary transition-colors relative min-h-[220px]">
                
                {/* 1. VISUAL COLUMN (50% Width) */}
                <div className="p-6 border-r border-border flex flex-col gap-4 bg-surface justify-center relative">
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
                                maxHeight: '400px'
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
                                className="w-full h-full object-contain" 
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
                <div className="p-8 flex flex-col justify-center relative bg-surface/50">
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

                    {/* Linked Script Elements - Clean Page Format */}
                    {sortedElements.length > 0 && (
                        <div className="flex flex-col w-full max-w-[600px] mx-auto">
                            {sortedElements.map((el) => {
                                const { className, style } = getElementStyle(el.type);
                                
                                return (
                                    <div key={el.id} className="relative group/element">
                                        <div className={className} style={style}>
                                            {el.content}
                                        </div>
                                        
                                        {/* Subtle Unlink on Hover */}
                                        <button
                                            onClick={() => onUnlinkElement(shot.id, el.id)}
                                            className="absolute -left-6 top-1 text-text-muted hover:text-red-500 opacity-0 group-hover/element:opacity-100 transition-opacity p-1"
                                            title="Unlink"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Link Button */}
                    <div className="mt-8 pt-4 border-t border-border/10 flex items-center justify-between opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                            onClick={() => onLinkElement(shot.id, 'script')}
                            className="text-[10px] uppercase font-bold text-text-secondary hover:text-primary flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-surface border border-transparent hover:border-border"
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