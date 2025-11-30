/*
 * 📜 COMPONENT: SCRIPT PICKER
 * Selection Modal for linking script lines to shots
 * Commercial Quality Update: Themed & Formatted
 */

import React, { useMemo } from 'react';
import { Type, X, Check } from 'lucide-react';
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

    // Precise formatting logic matching ShotRow
    const getElementStyle = (type: ScriptElement['type']) => {
        // Base text size 16px/12pt standard
        const base = "font-screenplay text-[16px] leading-snug whitespace-pre-wrap relative transition-colors duration-200";
        
        switch (type) {
            case 'scene_heading':
                return {
                    className: `${base} font-bold uppercase text-text-primary mt-6 mb-2`,
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
                    style: { marginLeft: '35%', width: '60%' } // Approx 2.0in visual center
                };
            case 'dialogue':
                return {
                    className: `${base} text-text-primary mb-1`,
                    style: { marginLeft: '15%', width: '70%' } // Approx 1.0in visual block
                };
            case 'parenthetical':
                return {
                    className: `${base} italic text-text-secondary text-sm mb-0`,
                    style: { marginLeft: '25%', width: '50%' } // Approx 1.6in indent
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
                className="bg-surface border border-border w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl relative rounded-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-surface-secondary shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
                            <Type className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary text-sm uppercase tracking-widest">
                                Select Script Element
                            </h3>
                            <p className="text-[10px] text-text-tertiary">
                                Click a block to link it to the current shot
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-full text-text-secondary hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Script Viewer Container */}
                <div className="flex-1 overflow-y-auto bg-background p-8 flex justify-center custom-scrollbar shadow-inner">
                    <div className="w-full max-w-3xl">
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
                                                relative group transition-all duration-200 rounded-sm -mx-4 px-4 py-2 border-l-4
                                                ${isHeading ? 'pointer-events-none border-transparent' : 'cursor-pointer'}
                                                
                                                /* State: Linked (Active) */
                                                ${isLinked 
                                                    ? 'border-primary bg-primary/5' 
                                                    : 'border-transparent hover:bg-surface-secondary hover:border-text-muted'}
                                            `}
                                            onClick={() => !isLinked && !isHeading && onSelect(group.items)}
                                        >
                                            {/* Linked Indicator Badge */}
                                            {isLinked && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] font-bold text-primary uppercase tracking-wider">
                                                    <Check className="w-3 h-3" /> Linked
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
                                <Type className="w-12 h-12 text-text-tertiary mb-4" />
                                <p className="font-mono text-sm uppercase tracking-widest text-text-secondary">Scene is Empty</p>
                                <p className="text-xs text-text-muted mt-2">Add content in the Script Editor first.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="h-12 px-6 border-t border-border bg-surface flex items-center justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-xs font-bold uppercase tracking-wide text-text-secondary hover:text-text-primary transition-colors hover:bg-surface-secondary rounded-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};