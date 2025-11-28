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

    const getElementClasses = (type: ScriptElement['type']) => {
        // Strict screenplay formatting styles - DARK MODE MATCH
        const base = "font-screenplay text-[17px] leading-relaxed transition-colors duration-200";

        switch (type) {
            case 'scene_heading':
                return `${base} font-bold uppercase pt-8 pb-4 border-b border-white/5 mb-4 block w-full text-text-primary text-left`;
            case 'action':
                return `${base} text-left mb-4 block w-full text-text-secondary`;
            case 'character':
                return `${base} font-bold uppercase text-center mt-4 w-full max-w-[22rem] mx-auto tracking-widest block text-text-primary`;
            case 'dialogue':
                return `${base} text-left w-full max-w-[34rem] mx-auto mb-2 block text-text-secondary`;
            case 'parenthetical':
                return `${base} italic text-left w-full max-w-[20rem] mx-auto mb-0 block text-text-muted text-sm`;
            case 'transition':
                return `${base} font-bold uppercase text-right mt-4 mb-4 block text-text-primary pr-12`;
            default:
                return `${base} text-text-secondary`;
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

                {/* Content - Dark Editor Look */}
                <div className="overflow-y-auto p-12 flex-1 bg-background font-screenplay shadow-inner">
                    {groups.length > 0 ? (
                        <div className="max-w-[850px] mx-auto pl-20 pr-12 min-h-full bg-surface border border-border relative p-[100px] shadow-2xl">
                            {groups.map((group, idx) => {
                                const isLinked = group.items.some(item => usedElementIds.has(item.id));
                                const isHeading = group.items[0].type === 'scene_heading';

                                return (
                                    <div
                                        key={idx}
                                        className={`
                                            relative group transition-opacity duration-200
                                            ${isHeading ? 'pointer-events-none' : 'cursor-pointer'}
                                            ${isLinked ? 'opacity-30 grayscale' : 'hover:bg-white/5 rounded-sm -mx-4 px-4'}
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
                                            <div className="absolute -left-20 top-0 bottom-0 flex items-center justify-end w-16 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-1 text-primary font-sans font-bold text-[10px] uppercase tracking-wider">
                                                    Link <ArrowRight className="w-3 h-3" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Linked Label (Left Margin) */}
                                        {isLinked && (
                                            <div className="absolute -left-24 top-0 bottom-0 flex items-center justify-end w-20 pr-4">
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