/*
 * 📜 COMPONENT: SCRIPT PICKER
 * Selection Modal for linking script lines to shots
 */

import React, { useMemo } from 'react';
import { Type, X } from 'lucide-react';
import { ScriptElement } from '../../types';

interface ScriptPickerProps {
    isOpen: boolean;
    onClose: () => void;
    sceneId: string | null;
    scriptElements: ScriptElement[];
    usedElementIds: Set<string>;
    onSelect: (element: ScriptElement) => void;
}

export const ScriptPicker: React.FC<ScriptPickerProps> = ({
    isOpen,
    onClose,
    sceneId,
    scriptElements,
    usedElementIds,
    onSelect
}) => {
    if (!isOpen || !sceneId) return null;

    // Filter elements
    const sceneElements = useMemo(() => {
        return scriptElements
            .filter(el => el.sceneId === sceneId)
            .sort((a, b) => a.sequence - b.sequence);
    }, [scriptElements, sceneId]);

    const getElementClasses = (type: ScriptElement['type']) => {
        const base = "cursor-pointer transition-all duration-200 px-4 py-1 rounded hover:bg-white/5 relative group border border-transparent hover:border-white/10";
        
        switch (type) {
            case 'scene_heading':
                return `${base} font-bold uppercase tracking-wider text-zinc-500 text-center py-4 text-xs select-none pointer-events-none`;
            case 'action':
                return `${base} text-zinc-400 text-center leading-relaxed text-sm`;
            case 'dialogue':
                return `${base} text-zinc-100 text-center max-w-lg mx-auto text-sm`;
            case 'character':
                return `${base} font-bold uppercase text-center text-primary mt-4 tracking-wide text-sm`;
            case 'parenthetical':
                return `${base} italic text-sm text-center text-zinc-500`;
            case 'transition':
                return `${base} font-bold uppercase text-right text-zinc-500 text-xs`;
            default:
                return `${base} text-zinc-400`;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-[#09090b] border border-border w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl relative rounded-sm overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-[#09090b] shrink-0">
                    <h3 className="font-bold text-zinc-100 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <Type className="w-4 h-4 text-white" />
                        Scene Script
                    </h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-8 flex-1 bg-[#050505] font-screenplay">
                    {sceneElements.length > 0 ? (
                        <div className="space-y-1 max-w-3xl mx-auto">
                            {sceneElements.map(el => {
                                const isUsed = usedElementIds.has(el.id);
                                
                                // Skip non-selectable types if desired, or just style them
                                if (el.type === 'scene_heading') return (
                                    <div key={el.id} className={getElementClasses(el.type)}>{el.content}</div>
                                );

                                return (
                                    <div 
                                        key={el.id} 
                                        onClick={() => onSelect(el)}
                                        className={`${getElementClasses(el.type)} ${isUsed ? 'opacity-30' : 'opacity-100'}`}
                                    >
                                        {el.content}
                                        
                                        {/* Hover Indicator */}
                                        {!isUsed && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-sans font-bold bg-primary text-white px-2 py-1 rounded shadow-lg transform translate-x-2 group-hover:translate-x-0 transition-all">
                                                LINK
                                            </div>
                                        )}
                                        {isUsed && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-sans font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                                                LINKED
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-32 text-zinc-600">
                            <p className="mb-2 font-mono text-sm">No script content found for this scene.</p>
                            <p className="text-xs">Add dialogue or action in the Script Editor.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="h-14 px-6 border-t border-border bg-[#09090b] flex items-center justify-end shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 text-xs font-bold uppercase tracking-wide text-zinc-400 hover:text-white transition-colors hover:bg-white/5 rounded-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};