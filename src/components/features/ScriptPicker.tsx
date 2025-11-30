/*
 * 📜 COMPONENT: SCRIPT PICKER
 * "Paper View" - Clean, minimalist selection tool with gutter indicators
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
        // Base text size 16px/12pt standard
        const base = "font-screenplay text-[16px] leading-snug whitespace-pre-wrap relative transition-colors duration-200";
        
        switch (type) {
            case 'scene_heading':
                return {
                    className: `${base} font-bold uppercase text-text-primary mt-6 mb-4`,
                    style: { width: '100%' }
                };
            case 'action':
                return {
                    className: `${base} text-text-primary mt-2 mb-2`,
                    style: { width: '100%' }
                };
            case 'character':
                return {
                    className: `${base} font-bold uppercase text-text-primary mt-4 mb-0`,
                    style: { marginLeft: '37%', width: '60%' } // ~2.2in visual center
                };
            case 'dialogue':
                return {
                    className: `${base} text-text-primary mb-1`,
                    style: { marginLeft: '25%', width: '50%' } // ~1.5in visual block
                };
            case 'parenthetical':
                return {
                    className: `${base} italic text-text-secondary text-sm mb-0`,
                    style: { marginLeft: '31%', width: '40%' } // ~1.9in indent
                };
            case 'transition':
                return {
                    className: `${base} font-bold uppercase text-text-primary text-right mt-4 mb-2`,
                    style: { width: '100%' }
                };
            default:
                return {
                    className: `${base} text-text-primary`,
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
                <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0 z-10">
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
                <div className="flex-1 overflow-y-auto bg-background/50 p-0 flex justify-center custom-scrollbar shadow-inner relative">
                    
                    {/* PAPER AREA */}
                    {/* Padding bottom ensures we can scroll past the end comfortably */}
                    <div className="w-[8.5in] min-h-full bg-background py-16 px-16 shadow-2xl my-8 pb-40">
                        
                        {groups.length > 0 ? (
                            <div className="space-y-1">
                                {groups.map((group, idx) => {
                                    // Check if ANY item in this block is already linked
                                    const isLinked = group.items.some(item => usedElementIds.has(item.id));
                                    const isHeading = group.items[0].type === 'scene_heading';
                                    
                                    return (
                                        <div
                                            key={idx}
                                            className={`
                                                relative group transition-opacity duration-200
                                                ${isHeading ? 'pointer-events-none mb-6' : 'cursor-pointer'}
                                                ${isLinked ? 'opacity-40 pointer-events-none grayscale' : 'hover:opacity-100'} 
                                            `}
                                            onClick={() => !isHeading && !isLinked && onSelect(group.items)}
                                        >
                                            {/* Hover Arrow Indicator (Floating in Left Gutter) */}
                                            {!isHeading && !isLinked && (
                                                <div className="absolute -left-16 top-1/2 -translate-y-1/2 text-primary opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0 duration-200">
                                                    <ChevronRight className="w-6 h-6" strokeWidth={3} />
                                                </div>
                                            )}

                                            {/* Render Items */}
                                            {group.items.map(item => {
                                                const { className, style } = getElementStyle(item.type);
                                                return (
                                                    <div key={item.id} className={className} style={style}>
                                                        {item.content}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-32 flex flex-col items-center opacity-50">
                                <Type className="w-16 h-16 text-text-tertiary mb-6 opacity-20" />
                                <p className="font-mono text-sm uppercase tracking-widest text-text-secondary">Scene is Empty</p>
                                <p className="text-xs text-text-muted mt-2 max-w-xs mx-auto leading-relaxed">
                                    There is no text in this scene yet. Go to the Script Editor to write your screenplay.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};