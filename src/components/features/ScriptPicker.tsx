/*
 * 📜 COMPONENT: SCRIPT PICKER
 * "Paper View" - Matches Studio Editor Exact Styles
 */

import React, { useMemo } from 'react';
import { Type, X, ChevronRight } from 'lucide-react';
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

    // Precise formatting logic matching standard Screenplay rules
    const getElementStyle = (type: ScriptElement['type']) => {
        const base = "font-screenplay text-[12pt] leading-screenplay whitespace-pre-wrap relative";
        
        switch (type) {
            case 'scene_heading':
                return {
                    className: `${base} font-bold uppercase mt-8 mb-4`,
                    style: { width: '100%' }
                };
            case 'action':
                return {
                    className: `${base} mt-4 mb-0`,
                    style: { width: '100%' }
                };
            case 'character':
                return {
                    className: `${base} font-bold uppercase mt-4 mb-0`,
                    style: { marginLeft: '2.0in', width: '4.0in' } 
                };
            case 'dialogue':
                return {
                    className: `${base} mb-0`,
                    style: { marginLeft: '1.0in', width: '3.5in' }
                };
            case 'parenthetical':
                return {
                    className: `${base} italic text-sm mb-0`,
                    style: { marginLeft: '1.6in', width: '3.0in' }
                };
            case 'transition':
                return {
                    className: `${base} font-bold uppercase text-right mt-4 mb-0`,
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center overlay-dark backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-surface border border-border w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl relative rounded-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0 z-20">
                    <div className="flex items-center gap-3">
                        <Type className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-text-primary text-sm uppercase tracking-widest">
                            Select Script Line
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* SCROLL CONTAINER */}
                <div className="flex-1 overflow-y-auto bg-app p-0 flex justify-center custom-scrollbar relative">
                    
                    {/* PAPER AREA */}
                    {/* Explicitly defining colors to ensure Light Mode works properly */}
                    <div className="w-[8.5in] min-h-full bg-white dark:bg-[#1E1E1E] border-x border-gray-200 dark:border-[#333] shadow-2xl py-16 px-20 text-black dark:text-[#E0E0E0] mb-20 transition-colors duration-300">
                        
                        {groups.length > 0 ? (
                            <div className="space-y-1">
                                {groups.map((group, idx) => {
                                    // Check if ANY item in this block is already linked
                                    const isLinked = group.items.some(item => usedElementIds.has(item.id));
                                    const isHeading = group.items[0].type === 'scene_heading';
                                    
                                    // DETERMINE ARROW TARGET
                                    // For Dialogue Blocks: Target the first 'dialogue' line
                                    // For Action Blocks: Target the first element (Action)
                                    let targetIndex = 0;
                                    if (group.items[0].type === 'character') {
                                        const dialogIdx = group.items.findIndex(i => i.type === 'dialogue');
                                        if (dialogIdx !== -1) targetIndex = dialogIdx;
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            className={`
                                                relative group transition-opacity duration-200 flex flex-col
                                                ${isHeading ? 'pointer-events-none mb-6' : 'cursor-pointer'}
                                                ${isLinked ? 'opacity-30 pointer-events-none select-none grayscale' : 'hover:opacity-100'}
                                            `}
                                            onClick={() => !isHeading && !isLinked && onSelect(group.items)}
                                        >
                                            {/* Render Items */}
                                            {group.items.map((item, itemIdx) => {
                                                const { className, style } = getElementStyle(item.type);
                                                
                                                // Should we show the arrow on this specific line?
                                                const showArrow = !isHeading && !isLinked && itemIdx === targetIndex;

                                                return (
                                                    <div key={item.id} className={className} style={style}>
                                                        {/* Arrow Indicator - Rendered Relative to Text Line */}
                                                        {showArrow && (
                                                            <div className="absolute -left-12 top-[-2px] text-primary opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0 duration-150">
                                                                <ChevronRight className="w-6 h-6" strokeWidth={3} />
                                                            </div>
                                                        )}
                                                        {item.content}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-32 flex flex-col items-center opacity-30">
                                <Type className="w-16 h-16 text-text-tertiary mb-6 opacity-20" />
                                <p className="font-mono text-sm uppercase tracking-widest text-text-secondary">Scene is Empty</p>
                                <p className="text-xs text-text-muted mt-2 max-w-xs mx-auto leading-relaxed">
                                    There is no text in this scene yet. Go to the Script Editor to write your screenplay.
                                </p>
                            </div>
                        )}
                        
                        {/* Massive Bottom Spacer to fix scrolling cut-off */}
                        <div className="h-60 w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};