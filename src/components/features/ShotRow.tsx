import React, { useState } from 'react';
import { Shot, ScriptElement } from '../../types';
import { Film, Trash2, Plus, MessageSquare, Type, X, Image as ImageIcon, Eraser, MoreHorizontal } from 'lucide-react';
import Button from '../ui/Button';

interface ShotRowProps {
    shot: Shot;
    linkedElements: ScriptElement[];
    onUpdateShot: (id: string, updates: Partial<Shot>) => void;
    onDeleteShot: (id: string) => void;
    onLinkElement: (shotId: string, type: 'action' | 'dialogue' | 'script') => void;
    onUnlinkElement: (shotId: string, elementId: string) => void;
    onEditShot: (shot: Shot) => void;
    onAddVisual: (shotId: string) => void; // NEW
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

    // Helper to get script style based on type
    const getScriptStyle = (type: ScriptElement['type']) => {
        const base = "font-[family-name:var(--font-family-screenplay)] text-base leading-relaxed text-text-primary";
        switch (type) {
            case 'scene_heading': return `${base} font-bold uppercase tracking-wider`;
            case 'character': return `${base} font-bold uppercase text-center`;
            case 'dialogue': return `${base} text-center max-w-[350px] mx-auto whitespace-pre-wrap`;
            case 'parenthetical': return `${base} italic text-sm text-center`;
            case 'transition': return `${base} font-bold uppercase text-right`;
            default: return `${base} whitespace-pre-wrap`; // Action
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
        <div
            className="grid grid-cols-2 border-b border-border/10 hover:bg-surface/20 transition-colors group/row"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* LEFT SIDE: VISUAL + DETAILS */}
            <div className="p-4 border-r border-border/10 flex flex-col gap-3 items-center justify-center relative">

                {/* DELETE SHOT BUTTON (Corner) */}
                <button 
                    onClick={() => onDeleteShot(shot.id)}
                    className="absolute top-2 right-2 p-1.5 text-text-tertiary hover:text-error hover:bg-error/10 rounded-sm opacity-0 group-hover/row:opacity-100 transition-opacity"
                    title="Delete entire shot row"
                >
                    <X className="w-3.5 h-3.5" />
                </button>

                {/* SHOT # Tag */}
                <span className="text-[10px] font-mono text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded w-fit self-start">
                    SHOT #{shot.sequence}
                </span>

                {/* Main Visual Box */}
                <div
                    className="flex-1 w-full aspect-video bg-background border-2 border-border/20 rounded-sm overflow-hidden relative group/visual cursor-pointer hover:border-primary/50 transition-colors"
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
                            <img src={shot.generatedImage} className="w-full h-full object-contain" alt={`Shot ${shot.sequence}`} />
                            
                            {/* Overlay Actions (Only if image exists) */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/visual:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<ImageIcon className="w-3 h-3" />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditShot(shot);
                                    }}
                                >
                                    Open
                                </Button>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<Trash2 className="w-3 h-3" />}
                                    onClick={handleDeleteStill}
                                    className="hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50"
                                    title="Delete Still Image"
                                >
                                    Delete Still
                                </Button>
                            </div>
                        </>
                    ) : (
                        // Empty State / Add Visual
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={<Plus className="w-3 h-3" />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddVisual(shot.id);
                                }}
                            >
                                Add Shot
                            </Button>
                        </div>
                    )}
                </div>

                {/* Shot Details (Bottom) */}
                <div className="flex gap-2 text-[10px] text-text-tertiary">
                    <span className="uppercase">{shot.shotType}</span>
                    <span>•</span>
                    <span>{shot.aspectRatio || '16:9'}</span>
                </div>
            </div>

            {/* RIGHT SIDE: LINKED SCRIPT ELEMENTS */}
            <div className="p-4 flex flex-col justify-center gap-3">
                {/* Script Elements Container - Grows with content */}
                <div className="flex flex-col gap-4">
                    {linkedElements.length > 0 && (
                        linkedElements.map(el => (
                            <div key={el.id} className="relative group/element">
                                <div className={`pl-2 border-l-2 border-transparent hover:border-primary/50 transition-colors ${getScriptStyle(el.type)}`}>
                                    {el.character && <span className="font-bold uppercase block mb-1">{el.character}</span>}
                                    <div className="whitespace-pre-wrap">{el.content}</div>
                                </div>
                                <button
                                    onClick={() => onUnlinkElement(shot.id, el.id)}
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-error text-white opacity-0 group-hover/element:opacity-100 transition-opacity flex items-center justify-center hover:bg-error/80"
                                    title="Remove element"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))
                    )}

                    {/* Link Script Button - Always visible, but subtle if elements exist */}
                    <div className={`flex flex-col items-center justify-center gap-3 text-text-tertiary ${linkedElements.length > 0 ? 'mt-2 pt-2 border-t border-border/10 opacity-0 group-hover/row:opacity-100 transition-opacity' : 'flex-1'}`}>
                        {linkedElements.length === 0 && <p className="text-[10px] uppercase tracking-widest">Link Script</p>}
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={<Type className="w-3 h-3" />}
                            onClick={() => onLinkElement(shot.id, 'script')}
                        >
                            {linkedElements.length > 0 ? 'Link More' : 'Link Script'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};