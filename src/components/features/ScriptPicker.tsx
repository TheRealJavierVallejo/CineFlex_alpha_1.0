/*
 * 📜 COMPONENT: SCRIPT PICKER
 * Selection Modal for linking script lines to shots
 */

import React, { useMemo } from 'react';
import { Type, X, Plus } from 'lucide-react';
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
        // Base styles mimicking industry standard screenplay formatting (Courier, margins)
        const base = "relative group cursor-pointer transition-colors duration-200 font-screenplay text-base leading-relaxed selection:bg-primary/30 selection:text-white";
        
        switch (type) {
            case 'scene_heading':
                // Scene headings are usually not linked to specific shots in this context, but we keep the style
                return `${base} font-bold uppercase text-zinc-500 py-6 select-none pointer-events-none`;
            case 'action':
                return `${base} text-zinc-300 text-left mb-4`;
            case 'character':
                // Blue color for characters as requested
                return `${base} font-bold uppercase text-center text-primary mt-6 mb-0 w-[60%] mx-auto tracking-widest`;
            case 'dialogue':
                return `${base} text-white text-center w-[70%] mx-auto mb-4`;
            case 'parenthetical':
                return `${base} text-zinc-500 italic text-center w-[50%] mx-auto -mt-2 mb-1`;
            case 'transition':
                return `${base} font-bold uppercase text-right text-zinc-500 mt-4 mb-4`;
            default:
                return `${base} text-zinc-400`;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-[#050505] border border-zinc-800 w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative rounded-sm overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-8 bg-[#09090b] shrink-0">
                    <h3 className="font-bold text-zinc-200 flex items-center gap-3 text-sm uppercase tracking-widest font-mono">
                        <Type className="w-4 h-4 text-primary" />
                        Select Script Element
                    </h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - The "Page" */}
                <div className="overflow-y-auto p-12 flex-1 bg-[#050505] font-screenplay custom-scrollbar">
                    {sceneElements.length > 0 ? (
                        <div className="max-w-3xl mx-auto pl-16 pr-8 min-h-full">
                            {sceneElements.map(el => {
                                const isUsed = usedElementIds.has(el.id);
                                
                                // Render Scene Heading (Non-interactive generally)
                                if (el.type === 'scene_heading') return (
                                    <div key={el.id} className={getElementClasses(el.type)}>{el.content}</div>
                                );

                                return (
                                    <div 
                                        key={el.id} 
                                        onClick={() => !isUsed && onSelect(el)}
                                        className={`${getElementClasses(el.type)} ${isUsed ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        {/* Hover Indicator (Left Margin) */}
                                        {!isUsed && (
                                            <div className="absolute -left-16 top-0 bottom-0 flex items-center justify-end w-12 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                                <div className="flex items-center gap-1.5 text-primary">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider font-sans">Link</span>
                                                    <Plus className="w-4 h-4" /> 
                                                </div>
                                            </div>
                                        )}

                                        {/* Status Indicator (Already Linked) */}
                                        {isUsed && (
                                            <div className="absolute -left-20 top-0 bottom-0 flex items-center justify-end w-16 pr-2">
                                                <span className="text-[9px] font-bold uppercase tracking-wider font-sans text-zinc-600">Linked</span>
                                            </div>
                                        )}

                                        {/* The Content */}
                                        <span className={!isUsed ? "group-hover:text-primary transition-colors" : ""}>
                                            {el.content}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-32 text-zinc-700">
                            <p className="mb-2 font-mono text-sm uppercase tracking-widest">Scene is empty</p>
                            <p className="text-xs font-mono">Add content in the Script Editor</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="h-14 px-8 border-t border-zinc-800 bg-[#09090b] flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                        Select a line to link it to the current shot
                    </div>
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