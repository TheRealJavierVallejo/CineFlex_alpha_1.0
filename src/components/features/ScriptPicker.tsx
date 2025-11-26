import React, { useMemo } from 'react';
import { Type, X, Hash } from 'lucide-react';
import Button from '../ui/Button';
import { ScriptElement, Scene } from '../../types';

interface ScriptPickerProps {
    isOpen: boolean;
    onClose: () => void;
    sceneId: string | null;
    currentSceneHeading?: string; // NEW: Pass the heading to allow fuzzy matching
    scriptElements: ScriptElement[];
    usedElementIds: Set<string>;
    onSelect: (element: ScriptElement) => void;
}

export const ScriptPicker: React.FC<ScriptPickerProps> = ({
    isOpen,
    onClose,
    sceneId,
    currentSceneHeading,
    scriptElements,
    usedElementIds,
    onSelect
}) => {
    if (!isOpen) return null;

    // Filter and process elements for this scene
    const sceneElements = useMemo(() => {
        if (!scriptElements || scriptElements.length === 0) return [];

        // 1. Try to find the matching block in the script
        // We look for a SCENE_HEADING element that matches our current scene's heading text
        let targetSceneId = sceneId;
        
        // Fuzzy Match Strategy
        if (currentSceneHeading) {
            const normalizedTarget = currentSceneHeading.trim().toUpperCase();
            
            // Find the script element that is a scene heading and matches text
            const matchingHeadingEl = scriptElements.find(el => 
                el.type === 'scene_heading' && 
                el.content.trim().toUpperCase() === normalizedTarget
            );

            if (matchingHeadingEl) {
                targetSceneId = matchingHeadingEl.sceneId || null;
            }
        }

        // 2. Filter elements belonging to that "script scene" ID
        const elements = scriptElements
            .filter(el => {
                if (targetSceneId && el.sceneId !== targetSceneId) return false;
                // If we failed to match, show nothing rather than everything
                if (!targetSceneId) return false;
                
                return el.type === 'action' || el.type === 'dialogue';
            })
            .sort((a, b) => a.sequence - b.sequence);

        const nextAvailableId = elements.find(el => !usedElementIds.has(el.id))?.id;

        return elements.map(el => ({
            ...el,
            isUsed: usedElementIds.has(el.id),
            isNextAvailable: el.id === nextAvailableId
        }));
    }, [scriptElements, sceneId, currentSceneHeading, usedElementIds]);

    const getElementStyle = (type: ScriptElement['type']) => {
        switch (type) {
            case 'scene_heading': return 'font-bold uppercase tracking-wider text-white';
            case 'action': return 'text-white whitespace-pre-wrap font-sans text-sm';
            case 'dialogue': return 'text-white text-center mx-auto whitespace-pre-wrap font-sans text-sm italic';
            case 'character': return 'font-bold uppercase text-center text-white';
            default: return 'text-white';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-surface border border-border rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex justify-between items-center bg-surface-secondary">
                    <div>
                        <h3 className="font-bold text-text-primary flex items-center gap-2">
                            <Type className="w-4 h-4 text-primary" />
                            Select Script Line
                        </h3>
                        {currentSceneHeading && (
                             <div className="text-[10px] text-text-tertiary mt-1 flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                Filtering for: <span className="text-primary">{currentSceneHeading}</span>
                             </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-text-tertiary hover:text-primary"><X className="w-4 h-4" /></button>
                </div>

                <div className="overflow-y-auto p-4 flex-1 bg-[#1a1a1a]">
                    {sceneElements.length > 0 ? (
                        <div className="space-y-3">
                            {sceneElements.map(el => (
                                <div 
                                    key={el.id} 
                                    onClick={() => onSelect(el)}
                                    className={`
                                        relative group/element p-3 rounded border border-transparent transition-all cursor-pointer
                                        ${el.isUsed ? 'opacity-50 bg-black/20 hover:opacity-80' : 'bg-[#252526] hover:border-primary hover:bg-[#2a2a2d]'}
                                    `}
                                >
                                    <div className={getElementStyle(el.type)}>
                                        {el.character && (
                                            <div className="font-bold uppercase text-xs text-text-secondary mb-1">
                                                {el.character}
                                            </div>
                                        )}
                                        {el.content}
                                    </div>

                                    {/* Used Indicator */}
                                    {el.isUsed && (
                                        <div className="absolute top-2 right-2 text-[10px] bg-white/10 px-1.5 rounded text-text-tertiary">
                                            Linked
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-text-tertiary flex flex-col items-center">
                            <div className="w-12 h-12 bg-surface-secondary rounded-full flex items-center justify-center mb-3">
                                <Type className="w-6 h-6 opacity-50" />
                            </div>
                            <p className="font-medium">No matching script lines found.</p>
                            <p className="text-xs mt-2 max-w-[250px]">
                                Ensure your Scene Heading in the Timeline matches a heading in your Script exactly.
                            </p>
                            {currentSceneHeading && (
                                <div className="mt-4 p-2 bg-black/30 rounded border border-border/50 text-xs font-mono text-error">
                                    "{currentSceneHeading}"
                                </div>
                            )}
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