import React, { useMemo } from 'react';
import { Type, X } from 'lucide-react';
import Button from '../ui/Button';
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

    // Filter and process elements for this scene
    const sceneElements = useMemo(() => {
        const elements = scriptElements
            .filter(el => {
                if (el.sceneId !== sceneId) return false;
                return el.type === 'action' || el.type === 'dialogue';
            })
            .sort((a, b) => a.sequence - b.sequence);

        const nextAvailableId = elements.find(el => !usedElementIds.has(el.id))?.id;

        return elements.map(el => ({
            ...el,
            isUsed: usedElementIds.has(el.id),
            isNextAvailable: el.id === nextAvailableId
        }));
    }, [scriptElements, sceneId, usedElementIds]);

    const getElementStyle = (type: ScriptElement['type']) => {
        switch (type) {
            case 'scene_heading':
                return 'font-bold uppercase tracking-wider text-white';
            case 'action':
                return 'text-white whitespace-pre-wrap';
            case 'dialogue':
                return 'text-white text-center mx-auto whitespace-pre-wrap';
            case 'character':
                return 'font-bold uppercase text-center text-white';
            case 'parenthetical':
                return 'italic text-sm text-center text-white/80';
            case 'transition':
                return 'font-bold uppercase text-right text-white';
            default:
                return 'text-white';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-surface border border-border rounded-lg shadow-xl w-[800px] max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex justify-between items-center bg-surface-secondary">
                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                        <Type className="w-4 h-4" />
                        Scene Script
                    </h3>
                    <button onClick={onClose} className="text-text-tertiary hover:text-primary"><X className="w-4 h-4" /></button>
                </div>

                <div className="overflow-y-auto p-6 flex-1 bg-[#1a1a1a] font-[family-name:var(--font-family-screenplay)]">
                    {sceneElements.length > 0 ? (
                        <div className="space-y-4 max-w-[600px] mx-auto">
                            {sceneElements.map(el => (
                                <div key={el.id} className="relative group/element">
                                    <div className={`${getElementStyle(el.type)} leading-relaxed transition-opacity ${el.isUsed ? 'opacity-40' : 'opacity-100'}`}>
                                        {el.character && (
                                            <div className="font-bold uppercase text-center mb-1">
                                                {el.character}
                                            </div>
                                        )}
                                        {el.content}
                                    </div>

                                    {/* Add Button - Only on next available */}
                                    {el.isNextAvailable && (
                                        <button
                                            onClick={() => onSelect(el)}
                                            className="absolute -right-16 top-0 flex items-center gap-1 px-2 py-1 rounded bg-primary text-white text-xs font-sans hover:bg-primary/80 transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            Add
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-text-tertiary">
                            <p>No script elements found in this scene.</p>
                            <p className="text-xs mt-2">Import a script to get started.</p>
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-border bg-surface-secondary flex justify-end">
                    <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                </div>
            </div>
        </div>
    );
};
