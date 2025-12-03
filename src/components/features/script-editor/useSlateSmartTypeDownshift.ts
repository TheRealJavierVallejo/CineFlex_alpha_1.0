import { useCombobox } from 'downshift';
import { useEffect, useState, useCallback } from 'react';
import { Editor, Transforms, Range, Element as SlateElement, Node } from 'slate';
import { ReactEditor } from 'slate-react';
import { CustomEditor, CustomElement } from './slateConfig';
import { getSuggestions, addSmartTypeEntry, SmartTypeEntry, SCENE_PREFIXES } from '../../../services/smartType';

// Stage detection logic
const parseSceneHeading = (content: string) => {
    const prefixMatch = content.match(/^(INT\.|EXT\.|I\/E)\s+/i);
    if (!prefixMatch) {
        return { stage: 1, prefix: '', location: content, time: '' };
    }
    const prefix = prefixMatch[0];
    const rest = content.substring(prefix.length);
    const parts = rest.split(/\s+-\s+/);
    if (parts.length > 1) {
        const location = parts.slice(0, parts.length - 1).join(' - ');
        const time = parts[parts.length - 1];
        return { stage: 3, prefix, location, time };
    } else {
        return { stage: 2, prefix, location: rest, time: '' };
    }
};

interface UseSlateSmartTypeReturn {
    showMenu: boolean;
    suggestions: string[];
    selectedIndex: number;
    menuPosition: { top: number; left: number } | null;
    getMenuProps: () => any;
    getItemProps: (options: { item: string; index: number }) => any;
}

export const useSlateSmartType = ({
    editor,
    projectId,
    isActive
}: {
    editor: CustomEditor;
    projectId: string;
    isActive: boolean;
}): UseSlateSmartTypeReturn => {
    
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

    // Calculate menu position
    const calculateMenuPosition = useCallback((): { top: number; left: number } | null => {
        const { selection } = editor;
        if (!selection || !Range.isCollapsed(selection)) return null;
        
        try {
            const domRange = ReactEditor.toDOMRange(editor, selection);
            const rect = domRange.getBoundingClientRect();
            return {
                top: rect.bottom + window.scrollY + 4,
                left: rect.right + window.scrollX
            };
        } catch (e) {
            return null;
        }
    }, [editor]);

    // Downshift hook
    const {
        isOpen,
        getMenuProps,
        getItemProps,
        highlightedIndex,
        selectItem,
        closeMenu
    } = useCombobox({
        items: suggestions,
        itemToString: (item) => item || '',
        onSelectedItemChange: ({ selectedItem }) => {
            if (!selectedItem) return;
            
            const { selection } = editor;
            if (!selection) return;

            const elementEntry = Editor.above(editor, {
                match: n => SlateElement.isElement(n),
            });
            if (!elementEntry) return;

            const [element, path] = elementEntry;
            const type = (element as CustomElement).type;
            const currentContent = Node.string(element).toUpperCase();

            let newContent = selectedItem;

            // Reconstruct scene heading
            if (type === 'scene_heading') {
                const parsed = parseSceneHeading(currentContent);
                if (parsed.stage === 1) newContent = `${selectedItem} `;
                else if (parsed.stage === 2) newContent = `${parsed.prefix.trim()} ${selectedItem}`;
                else if (parsed.stage === 3) newContent = `${parsed.prefix.trim()} ${parsed.location.trim()} - ${selectedItem}`;
            }

            // Apply change
            Transforms.select(editor, path);
            Transforms.delete(editor, {
                at: {
                    anchor: Editor.start(editor, path),
                    focus: Editor.end(editor, path)
                }
            });
            Transforms.insertText(editor, newContent);

            // Learn entry
            const typeMap: Record<string, SmartTypeEntry['type']> = {
                'character': 'character',
                'scene_heading': 'location',
                'transition': 'transition'
            };
            const entryType = typeMap[type];
            if (entryType) {
                addSmartTypeEntry(projectId, entryType, selectedItem, false);
            }

            // Clear suggestions to close menu
            setSuggestions([]);
            closeMenu();
        }
    });

    // Monitor content changes
    useEffect(() => {
        if (!isActive || !projectId) {
            setSuggestions([]);
            return;
        }

        const { selection } = editor;
        if (!selection || !Range.isCollapsed(selection)) {
            setSuggestions([]);
            return;
        }

        const elementEntry = Editor.above(editor, {
            match: n => SlateElement.isElement(n),
        });
        if (!elementEntry) {
            setSuggestions([]);
            return;
        }

        const [element] = elementEntry;
        const content = Node.string(element).toUpperCase();
        const type = (element as CustomElement).type;

        if (type === 'action' || type === 'parenthetical' || type === 'dialogue') {
            setSuggestions([]);
            return;
        }

        let debounceTime = 150;
        if (type === 'character' || type === 'transition') debounceTime = 0;
        if (type === 'scene_heading') {
            const parsed = parseSceneHeading(content);
            if (parsed.stage === 1 || parsed.stage === 3) debounceTime = 0;
            else debounceTime = 50;
        }

        const timeoutId = setTimeout(() => {
            let newSuggestions: string[] = [];
            let shouldShow = false;

            if (type === 'character') {
                newSuggestions = getSuggestions(projectId, 'character', content, 10);
                // Show only if typing AND has suggestions AND not exact match
                const isExactMatch = newSuggestions.length === 1 && 
                    newSuggestions[0].toUpperCase() === content.toUpperCase();
                shouldShow = content.length > 0 && newSuggestions.length > 0 && !isExactMatch;
            }

            if (type === 'scene_heading') {
                const parsed = parseSceneHeading(content);
                
                if (parsed.stage === 1) {
                    const contentUpper = content.toUpperCase();
                    newSuggestions = SCENE_PREFIXES.filter(prefix => 
                        prefix.startsWith(contentUpper)
                    );
                    const isCompletePrefix = SCENE_PREFIXES.some(p => 
                        contentUpper === p.toUpperCase()
                    );
                    shouldShow = newSuggestions.length > 0 && !isCompletePrefix;
                    
                } else if (parsed.stage === 2) {
                    const locationInput = parsed.location.trim();
                    newSuggestions = getSuggestions(projectId, 'location', locationInput, 10);
                    shouldShow = locationInput.length > 0 && newSuggestions.length > 0;
                    
                } else if (parsed.stage === 3) {
                    const timeInput = parsed.time.trim();
                    newSuggestions = getSuggestions(projectId, 'time_of_day', timeInput, 10);
                    const isExactMatch = newSuggestions.length === 1 && 
                        newSuggestions[0].toUpperCase() === timeInput.toUpperCase();
                    shouldShow = newSuggestions.length > 0 && !isExactMatch;
                }
            }

            if (type === 'transition') {
                newSuggestions = getSuggestions(projectId, 'transition', content, 10);
                const isExactMatch = newSuggestions.length === 1 && 
                    newSuggestions[0].toUpperCase() === content.toUpperCase();
                shouldShow = newSuggestions.length > 0 && !isExactMatch;
            }

            if (shouldShow) {
                const position = calculateMenuPosition();
                if (position) {
                    setSuggestions(newSuggestions);
                    setMenuPosition(position);
                } else {
                    setSuggestions([]);
                }
            } else {
                setSuggestions([]);
            }
        }, debounceTime);

        return () => clearTimeout(timeoutId);
    }, [editor.children, editor.selection, isActive, projectId, calculateMenuPosition]);

    return {
        showMenu: isOpen && suggestions.length > 0,
        suggestions,
        selectedIndex: highlightedIndex,
        menuPosition,
        getMenuProps,
        getItemProps
    };
};