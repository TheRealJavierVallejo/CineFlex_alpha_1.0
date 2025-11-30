/*
 * 📜 COMPONENT: SCRIPT PICKER
 * Selection Modal for linking script lines to shots
 * Theme: Dark Mode / Professional Screenplay Format
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

    const getElementStyles = (type: ScriptElement['type']) => {
        // Precise margin matching with ScriptBlock.tsx
        // Using padding-left to simulate standard screenplay tabs
        // Font size 12pt is approx 16px
        const base = "font-screenplay text-[12pt] leading-snug transition-colors duration-200";

        switch (type) {
            case 'scene_heading':
                return {
                    className: `${base} font-bold uppercase text-text-primary pt-6 pb-2`,
                    style: { paddingLeft: '0in', maxWidth: '6.0in' }
                };
            case 'action':
                return {
                    className: `${base} text-text-secondary pb-4`,
                    style: { paddingLeft: '0in', maxWidth: '6.0in' }
                };
            case 'character':
                return {
                    className: `${base} font-bold uppercase text-text-primary pt-4`,
                    style: { paddingLeft: '2.0in', maxWidth: '5.5in' }
                };
            case 'dialogue':
                return {
                    className: `${base} text-text-secondary`,
                    style: { paddingLeft: '1.0in', maxWidth: '4.5in' }
                };
            case 'parenthetical':
                return {
                    className: `${base} italic text-text-muted text-sm`,
                    style: { paddingLeft: '1.5in', maxWidth: '3.5in' }
                };
            case 'transition':
                return {
                    className: `${base} font-bold uppercase text-text-primary text-right pr-4 pt-4`,
                    style: { paddingLeft: '4.0in', maxWidth: '6.0in' }
                };
            default:
                return {
                    className: `${base} text-text-secondary`,
                    style: { paddingLeft: '0in', maxWidth: '6.0in' }
                };
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overlay-dark backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-surface border border-border w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative rounded-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-12 border-b border-border flex items-center justify-between px-8 bg-surface-secondary shrink-0">
                    <h3 className="font-bold text-text-primary flex items-center gap-2 text-xs uppercase tracking-widest font-sans">
                        <Type className="w-4 h-4 text-primary" />
                        Select Script Element
                    </h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Dark Editor Look (MATCHING METRICS OF SCRIPT PAGE) */}
                <div className="overflow-y-auto p-8 flex-1 bg-[#0C0C0E] font-screenplay shadow-inner flex justify-center">
                    {groups.length > 0 ? (
                        <div className="w-full max-w-[850px] pl-[1.5in] pr-[1.0in] pt-[0.5in] pb-[0.5in] bg-[#121212] border border-[#222] relative shadow-2xl min-h-full">
                            {groups.map((group, idx) => {
                                const isLinked = group.items.some(item => usedElementIds.has(item.id));
                                const isHeading = group.items[0].type === 'scene_heading';

                                return (
                                    <div
                                        key={idx}
                                        className={`
                                            relative group transition-opacity duration-200 -mx-4 px-4
                                            ${isHeading ? 'pointer-events-none' : 'cursor-pointer'}
                                            ${isLinked ? 'opacity-30 grayscale' : 'hover:bg-white/5 rounded-sm'}
                                        `}
                                        onClick={() => !isLinked && !isHeading && onSelect(group.items)}
                                    >
                                        {/* Render items in the group */}
                                        {group.items.map(item => {
                                            const { className, style } = getElementStyles(item.type);
                                            return (
                                                <div key={item.id} className={className} style={style}>
                                                    {item.content}
                                                </div>
                                            );
                                        })}

                                        {/* Hover Arrow (Left Margin) */}
                                        {!isLinked && !isHeading && (
                                            <div className="absolute -left-8 top-0 bottom-0 flex items-center justify-end w-16 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-1 text-primary font-sans font-bold text-[10px] uppercase tracking-wider">
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Linked Label (Left Margin) */}
                                        {isLinked && (
                                            <div className="absolute -left-12 top-0 bottom-0 flex items-center justify-end w-20 pr-4">
                                                <div className="text-text-muted font-sans font-bold text-[9px] uppercase tracking-wider">
                                                    Linked
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-32 text-text-muted">
                            <p className="mb-2 font-mono text-sm uppercase tracking-widest text-text-secondary">Page is Blank</p>
                            <p className="text-xs font-sans text-text-muted">Add content in the Script Editor to see it here.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="h-14 px-8 border-t border-border bg-surface-secondary flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-text-secondary font-sans uppercase tracking-wider">
                        Click text to link to shot
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-xs font-bold uppercase tracking-wide text-text-muted hover:text-white transition-colors hover:bg-white/5 rounded-sm border border-transparent hover:border-border"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};