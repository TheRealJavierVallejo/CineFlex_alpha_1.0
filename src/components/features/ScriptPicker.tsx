/*
 * 📜 COMPONENT: SCRIPT PICKER
 * Selection Modal for linking script lines to shots
 * Theme: White Paper / Standard Screenplay Format
 */

import React, { useMemo } from 'react';
import { Type, X, Plus, MoveRight } from 'lucide-react';
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
        // Base: Courier font, dark text on white, no background hover effects on the box itself
        const base = "relative group cursor-pointer transition-colors duration-200 font-screenplay text-base leading-relaxed selection:bg-blue-100 selection:text-black border border-transparent";
        
        // Standard Screenplay Formatting Margins (approximate for web)
        switch (type) {
            case 'scene_heading':
                return `${base} font-bold uppercase text-black py-6 select-none pointer-events-none border-b border-black/5 mb-6`;
            case 'action':
                return `${base} text-black text-left mb-4`;
            case 'character':
                return `${base} font-bold uppercase text-center text-black mt-6 mb-0 w-[60%] mx-auto tracking-widest`;
            case 'dialogue':
                return `${base} text-black text-center w-[70%] mx-auto mb-4`;
            case 'parenthetical':
                return `${base} text-black italic text-center w-[50%] mx-auto -mt-2 mb-1`;
            case 'transition':
                return `${base} font-bold uppercase text-right text-black mt-4 mb-4`;
            default:
                return `${base} text-black`;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-zinc-100 w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative rounded-sm overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header - Dark strip for UI contrast vs the Page */}
                <div className="h-12 border-b border-zinc-300 flex items-center justify-between px-8 bg-zinc-200 shrink-0">
                    <h3 className="font-bold text-zinc-700 flex items-center gap-2 text-xs uppercase tracking-widest font-sans">
                        <Type className="w-4 h-4 text-zinc-600" />
                        Select Line from Script
                    </h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-black transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - The "White Page" */}
                <div className="overflow-y-auto p-12 flex-1 bg-white font-screenplay shadow-inner custom-scrollbar-light">
                    {sceneElements.length > 0 ? (
                        <div className="max-w-3xl mx-auto pl-20 pr-12 min-h-full bg-white relative">
                            {sceneElements.map(el => {
                                const isUsed = usedElementIds.has(el.id);
                                
                                // Render Scene Heading (Non-interactive)
                                if (el.type === 'scene_heading') return (
                                    <div key={el.id} className={getElementClasses(el.type)}>
                                        {el.content}
                                    </div>
                                );

                                return (
                                    <div 
                                        key={el.id} 
                                        onClick={() => !isUsed && onSelect(el)}
                                        className={`${getElementClasses(el.type)} ${isUsed ? 'opacity-40 grayscale' : ''}`}
                                    >
                                        {el.content}
                                        
                                        {/* Hover Indicator: Floating in the left margin only */}
                                        {!isUsed && (
                                            <div className="absolute -left-20 top-0 bottom-0 flex items-center justify-end w-16 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-1 text-blue-600 font-sans font-bold text-[10px] uppercase tracking-wider bg-white px-1">
                                                    Add <Plus className="w-4 h-4" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Linked Status */}
                                        {isUsed && (
                                            <div className="absolute -left-20 top-0 bottom-0 flex items-center justify-end w-16 pr-4">
                                                 <div className="text-zinc-400 font-sans font-bold text-[9px] uppercase tracking-wider">
                                                    Linked
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-32 text-zinc-400">
                            <p className="mb-2 font-mono text-sm uppercase tracking-widest">Page is Blank</p>
                            <p className="text-xs font-sans text-zinc-500">Add content in the Script Editor to see it here.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="h-14 px-8 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-zinc-400 font-sans uppercase tracking-wider">
                        Click text to link to shot
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 text-xs font-bold uppercase tracking-wide text-zinc-600 hover:text-black transition-colors hover:bg-zinc-200 rounded-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};