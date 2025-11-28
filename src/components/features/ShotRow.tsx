import React, { useState } from 'react';
import { Shot, ScriptElement } from '../../types';
import { Film, Trash2, Plus, MessageSquare, Type, X, Image as ImageIcon, Eraser, MoreHorizontal, AlertTriangle, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

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

export const ShotRow: React.FC<ShotRowProps> = ({
    shot,
    linkedElements,
    onUpdateShot,
    onDeleteShot,
    onLinkElement,
    onUnlinkElement,
    onEditShot,
    onAddVisual
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Helper to get script style based on type
    const getScriptStyle = (type: ScriptElement['type']) => {
        const base = "font-mono text-sm leading-relaxed text-zinc-300";
        switch (type) {
            case 'scene_heading': return `${base} font-bold uppercase text-white`;
            case 'character': return `${base} font-bold uppercase text-zinc-400`;
            case 'dialogue': return `${base} text-white`;
            case 'parenthetical': return `${base} italic text-zinc-500`;
            case 'transition': return `${base} font-bold uppercase text-right text-zinc-500`;
            default: return `${base}`; // Action
        }
    };

    const handleDeleteStill = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateShot(shot.id, { 
            generatedImage: undefined,
            generationCandidates: []
        });
    };

    return (
        <>
            <div
                className="group/row flex border-b border-zinc-900 hover:bg-[#0a0a0a] transition-colors relative min-h-[120px]"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* 1. VISUAL COLUMN */}
                <div className="w-[240px] p-3 border-r border-zinc-900 flex flex-col gap-2 shrink-0 bg-[#050505]">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-zinc-500">SHOT {String(shot.sequence).padStart(2, '0')}</span>
                        <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                             <button 
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                                className="text-zinc-600 hover:text-red-500 transition-colors"
                                title="Delete Shot"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <div
                        className="aspect-video w-full bg-black border border-zinc-800 relative group/visual cursor-pointer hover:border-primary transition-colors overflow-hidden"
                        onClick={() => {
                            if (shot.generatedImage) {
                                onEditShot(shot);
                            } else {
                                onAddVisual(shot.id);
                            }
                        }}
                    >
                        {shot.generatedImage ? (
                            <>
                                <img src={shot.generatedImage} className="w-full h-full object-cover" alt={`Shot ${shot.sequence}`} />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/visual:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-white tracking-widest border border-white px-2 py-1">Edit Visual</span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-700 group-hover/visual:text-zinc-500 transition-colors">
                                <Plus className="w-6 h-6" />
                                <span className="text-[9px] uppercase tracking-widest">Empty Frame</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between text-[9px] font-mono text-zinc-600 uppercase">
                        <span>{shot.shotType}</span>
                        <span>{shot.aspectRatio || '16:9'}</span>
                    </div>
                </div>

                {/* 2. SCRIPT / CONTENT COLUMN */}
                <div className="flex-1 p-4 flex flex-col justify-center">
                    {/* Description Input (if no linked script) */}
                    {linkedElements.length === 0 && (
                        <div className="mb-2">
                           <textarea 
                              value={shot.description}
                              onChange={(e) => onUpdateShot(shot.id, { description: e.target.value })}
                              placeholder="// Describe shot action..."
                              className="w-full bg-transparent text-sm text-zinc-300 placeholder-zinc-700 outline-none resize-none font-mono h-full"
                              rows={2}
                           />
                        </div>
                    )}

                    {/* Linked Script Elements */}
                    <div className="space-y-3">
                        {linkedElements.map(el => (
                            <div key={el.id} className="relative group/element pl-3 border-l-2 border-primary/20 hover:border-primary transition-colors">
                                <div className={getScriptStyle(el.type)}>
                                    {el.character && <div className="font-bold uppercase text-xs mb-0.5 text-primary/70">{el.character}</div>}
                                    <div className="whitespace-pre-wrap">{el.content}</div>
                                </div>
                                <button
                                    onClick={() => onUnlinkElement(shot.id, el.id)}
                                    className="absolute top-0 right-0 text-zinc-700 hover:text-red-500 opacity-0 group-hover/element:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Link Button */}
                    <div className="mt-4 pt-2 border-t border-zinc-900/50 flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                         <button 
                            onClick={() => onLinkElement(shot.id, 'script')}
                            className="text-[10px] uppercase font-bold text-zinc-600 hover:text-primary flex items-center gap-1 transition-colors"
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
                        <div className="text-zinc-400 text-sm">
                            <p>Are you sure you want to delete <strong>Shot #{shot.sequence}</strong>?</p>
                            <p className="text-xs mt-2 text-zinc-600">This action cannot be undone.</p>
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
};