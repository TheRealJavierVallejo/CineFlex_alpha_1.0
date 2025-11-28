/*
 * 📜 COMPONENT: SCRIPT PICKER
 * Selection Modal for linking script lines to shots
 * Theme: White Paper / Standard Screenplay Format
 */

import React, { useMemo } from 'react';
import { Type, X, Plus, ArrowRight } from 'lucide-react';
import { ScriptElement } from '../../types';

interface ScriptPickerProps {
    isOpen: boolean;
    onClose: () => void;
    sceneId: string | null;
    scriptElements: ScriptElement[];
    usedElementIds: Set<string>;
    onSelect: (elements: ScriptElement[]) => void;
}

// Helper to group elements (Character -> Parenthetical -> Dialogue)
const groupElements = (elements: ScriptElement[]) => {
    const groups: { type: 'single' | 'block'; items: ScriptElement[] }[] = [];
    let i = 0;
    while (i < elements.length) {
        const el = elements[i];
        
        // Start a dialogue block
        if (el.type === 'character') {
            const block = [el];
            let j = i + 1;
            // Look ahead for dialogue parts
            while (j < elements.length) {
                const next = elements[j];
                if (next.type === 'parenthetical' || next.type === 'dialogue') {
                    block.push(next);
                    j++;
                } else {
                    break;
                }
            }
            groups.push({ type: 'block', items: block });
            i = j;
        } else {
            // Normal separate elements (Action, Scene Heading, Transition)
            groups.push({ type: 'single', items: [el] });
            i++;
        }
    }
    return groups;
};

export const ScriptPicker: React.FC<ScriptPickerProps> = ({
    isOpen,
    onClose,
    sceneId,
    scriptElements,
    usedElementIds,
    onSelect
}) => {
    if (!isOpen || !sceneId) return null;

    // Filter elements for this scene and group them
    const groups = useMemo(() => {
        const sceneEls = scriptElements
            .filter(el => el.sceneId === sceneId)
            .sort((a, b) => a.sequence - b.sequence);
        return groupElements(sceneEls);
    }, [scriptElements, sceneId]);

    const getElementClasses = (type: ScriptElement['type']) => {
        // Strict screenplay formatting styles
        const base = "font-screenplay text-base leading-relaxed text-black transition-colors";
        
        switch (type) {
            case 'scene_heading':
                return `${base} font-bold uppercase py-6 mb-6 mt-4 border-b border-black/5 block w-full`;
            case 'action':
                return `${base} text-left mb-4 block w-full`;
            case 'character':
                return `${base} font-bold uppercase text-center mt-6 w-[60%] mx-auto tracking-widest block`;
            case 'dialogue':
                return `${base} text-center w-[70%] mx-auto mb-4 block`;
            case 'parenthetical':
                return `${base} italic text-center w-[50%] mx-auto -mt-0 mb-0 block`;
            case 'transition':
                return `${base} font-bold uppercase text-right mt-4 mb-4 block`;
            default:
                return `${base}`;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-zinc-100 w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative rounded-sm overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-12 border-b border-zinc-300 flex items-center justify-between px-8 bg-zinc-200 shrink-0">
                    <h3 className="font-bold text-zinc-700 flex items-center gap-2 text-xs uppercase tracking-widest font-sans">
                        <Type className="w-4 h-4 text-zinc-600" />
                        Select Script Element
                    </h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-black transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - The "White Page" */}
                <div className="overflow-y-auto p-12 flex-1 bg-white font-screenplay shadow-inner custom-scrollbar-light">
                    {groups.length > 0 ? (
                        <div className="max-w-3xl mx-auto pl-20 pr-12 min-h-full bg-white relative">
                            {groups.map((group, idx) => {
                                // Check if *all* items in block are used, or *any*? Usually if the dialogue is used, the whole block is 'linked'.
                                // We'll say if ANY part of the block is linked, show linked status.
                                const isLinked = group.items.some(item => usedElementIds.has(item.id));
                                const isHeading = group.items[0].type === 'scene_heading';

                                return (
                                    <div 
                                        key={idx}
                                        className={`
                                            relative group transition-opacity duration-200
                                            ${isHeading ? 'pointer-events-none' : 'cursor-pointer'}
                                            ${isLinked ? 'opacity-40 grayscale' : 'hover:text-blue-900'}
                                        `}
                                        onClick={() => !isLinked && !isHeading && onSelect(group.items)}
                                    >
                                        {/* Render items in the group */}
                                        {group.items.map(item => (
                                            <div key={item.id} className={getElementClasses(item.type)}>
                                                {item.content}
                                            </div>
                                        ))}

                                        {/* Hover Arrow (Left Margin) */}
                                        {!isLinked && !isHeading && (
                                            <div className="absolute -left-24 top-0 bottom-0 flex items-center justify-end w-20 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-1 text-blue-600 font-sans font-bold text-[10px] uppercase tracking-wider bg-white/0">
                                                    Add <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Linked Label (Left Margin) */}
                                        {isLinked && (
                                            <div className="absolute -left-24 top-0 bottom-0 flex items-center justify-end w-20 pr-4">
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