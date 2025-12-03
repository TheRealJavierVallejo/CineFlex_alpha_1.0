import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor, Transforms, Range, Element as SlateElement, Node } from 'slate';
import { ReactEditor } from 'slate-react';
import { CustomEditor, CustomElement } from './slateConfig';
import { getSuggestions, addSmartTypeEntry, SmartTypeEntry } from '../../../services/smartType';

const SMARTTYPE_DEBUG = true;

interface UseSlateSmartTypeReturn {
    showMenu: boolean;
    suggestions: string[];
    selectedIndex: number;
    menuPosition: { top: number; left: number } | null;
    handleKeyDown: (event: React.KeyboardEvent) => boolean;
    selectSuggestion: (suggestion: string) => void;
}

// Scene Heading Parsing Logic (Same as ScriptBlock.tsx)
const parseSceneHeading = (content: string) => {
    const prefixMatch = content.match(/^(INT\.?\/?\s?EXT\.?|EXT\.?\/?\s?INT\.?|INT\.?|EXT\.?|I\/?E\.?)\s*/i);
    if (!prefixMatch) return { stage: 1, prefix: '', location: content, time: '' };

    const prefix = prefixMatch[0];
    const rest = content.substring(prefix.length);
    const parts = rest.split(/\s+-\s*/);

    if (parts.length > 1) {
        const time = parts[parts.length - 1];
        const location = parts.slice(0, parts.length - 1).join(' - ');
        return { stage: 3, prefix, location, time };
    } else {
        return { stage: 2, prefix, location: rest, time: '' };
    }
};

export const useSlateSmartType = ({
    editor,
    projectId,
    isActive
}: {
    editor: CustomEditor;
    projectId: string;
    isActive: boolean;
}): UseSlateSmartTypeReturn => {
    const [showMenu, setShowMenu] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

    // Track previous selection to detect changes
    const prevSelectionRef = useRef<Range | null>(null);

    // Update menu position based on cursor
    const updateMenuPosition = useCallback(() => {
        const { selection } = editor;
        if (!selection || !Range.isCollapsed(selection)) {
            setMenuPosition(null);
            return;
        }

        try {
            const domRange = ReactEditor.toDOMRange(editor, selection);
            const rect = domRange.getBoundingClientRect();

            // Position below cursor
            const pos = {
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX
            };
            
            if (SMARTTYPE_DEBUG) {
                console.log('[SmartType] Position calculated:', pos);
            }

            setMenuPosition(pos);
        } catch (e) {
            if (SMARTTYPE_DEBUG) {
                console.warn('[SmartType] Failed to calculate position (DOM not ready?)', e);
            }
            // Can fail if selection is not in DOM yet
            setMenuPosition(null);
        }
    }, [editor]);

    // Monitor content changes for suggestions
    useEffect(() => {
        if (SMARTTYPE_DEBUG) {
            console.log('[SmartType] Effect Run. Active:', isActive, 'Project:', projectId, 'Selection:', editor.selection);
        }

        if (!isActive || !projectId) {
            setShowMenu(false);
            return;
        }

        const { selection } = editor;
        if (!selection || !Range.isCollapsed(selection)) {
            setShowMenu(false);
            return;
        }

        // Get current element
        const elementEntry = Editor.above(editor, {
            match: n => SlateElement.isElement(n),
        });

        if (!elementEntry) {
            setShowMenu(false);
            return;
        }

        const [element, path] = elementEntry;
        const content = Node.string(element).toUpperCase();
        const type = (element as CustomElement).type;

        if (SMARTTYPE_DEBUG) {
            console.log('[SmartType] Current Block:', { type, content });
        }

        // Fast exit for types that don't need autocomplete
        if (type === 'action' || type === 'parenthetical' || type === 'dialogue') {
            setShowMenu(false);
            return;
        }

        // Determine debounce time
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
                shouldShow = content.length > 0 && newSuggestions.length > 0;
                if (SMARTTYPE_DEBUG) console.log('[SmartType] Character Suggestions:', newSuggestions);
            }

            if (type === 'scene_heading') {
                const parsed = parseSceneHeading(content);
                if (parsed.stage === 1 && content.trim().length > 0) {
                    newSuggestions = getSuggestions(projectId, 'location', content, 10);
                    shouldShow = newSuggestions.length > 0;
                } else if (parsed.stage === 2 && parsed.location.trim().length > 0) {
                    newSuggestions = getSuggestions(projectId, 'location', parsed.location.trim(), 10);
                    shouldShow = newSuggestions.length > 0;
                } else if (parsed.stage === 3 && parsed.time.trim().length > 0) {
                    newSuggestions = getSuggestions(projectId, 'time_of_day', parsed.time.trim(), 10);
                    shouldShow = newSuggestions.length > 0;
                }
                if (SMARTTYPE_DEBUG) console.log('[SmartType] Heading Suggestions:', newSuggestions);
            }

            if (type === 'transition') {
                newSuggestions = getSuggestions(projectId, 'transition', content, 10);
                shouldShow = content.length > 0 && newSuggestions.length > 0;
                if (SMARTTYPE_DEBUG) console.log('[SmartType] Transition Suggestions:', newSuggestions);
            }

            // Auto-hide if exact match
            // FIX: Ensure we don't call methods on potentially undefined items, though length check helps.
            // Also ensure we compare apples to apples (content is already upper).
            if (newSuggestions.length === 1 && newSuggestions[0] === content) {
                if (SMARTTYPE_DEBUG) console.log('[SmartType] Exact match found, hiding menu.');
                shouldShow = false;
            }

            if (SMARTTYPE_DEBUG) {
                console.log('[SmartType] Setting State -> Show:', shouldShow, 'Suggestions:', newSuggestions.length);
            }

            setSuggestions(newSuggestions);
            setShowMenu(shouldShow);
            setSelectedIndex(0);

            if (shouldShow) {
                updateMenuPosition();
            }
        }, debounceTime);

        return () => clearTimeout(timeoutId);
    }, [editor.children, editor.selection, isActive, projectId, updateMenuPosition]); // Re-run on content/selection change

    // Handle suggestion selection
    const selectSuggestion = useCallback((suggestion: string) => {
        const { selection } = editor;
        if (!selection) return;

        const elementEntry = Editor.above(editor, {
            match: n => SlateElement.isElement(n),
        });

        if (!elementEntry) return;

        const [element, path] = elementEntry;
        const type = (element as CustomElement).type;
        const currentContent = Node.string(element).toUpperCase();

        let newContent = suggestion;

        // Reconstruct scene heading if needed
        if (type === 'scene_heading') {
            const parsed = parseSceneHeading(currentContent);
            if (parsed.stage === 1) newContent = `${suggestion} `;
            else if (parsed.stage === 2) newContent = `${parsed.prefix.trim()} ${suggestion}`;
            else if (parsed.stage === 3) newContent = `${parsed.prefix.trim()} ${parsed.location.trim()} - ${suggestion}`;
        }

        // Apply change
        Transforms.select(editor, path); // Select the whole element
        Transforms.delete(editor, {
            at: {
                anchor: Editor.start(editor, path),
                focus: Editor.end(editor, path)
            }
        });
        Transforms.insertText(editor, newContent);

        // Learn the new entry
        const typeMap: Record<string, SmartTypeEntry['type']> = {
            'character': 'character',
            'scene_heading': 'location',
            'transition': 'transition'
        };

        if (type in typeMap) {
            if (SMARTTYPE_DEBUG) console.log('[SmartType] Learning new entry:', suggestion, 'Type:', typeMap[type]);
            addSmartTypeEntry(projectId, typeMap[type], suggestion, false);
        }

        setShowMenu(false);
        // Focus back to editor is handled by Slate
    }, [editor, projectId]);

    // Keyboard handler
    const handleKeyDown = useCallback((event: React.KeyboardEvent): boolean => {
        if (!showMenu || suggestions.length === 0) return false;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex(prev => (prev + 1) % suggestions.length);
            return true;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
            return true;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            selectSuggestion(suggestions[selectedIndex]);
            return true;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setShowMenu(false);
            return true;
        }

        return false;
    }, [showMenu, suggestions, selectedIndex, selectSuggestion]);

    return {
        showMenu,
        suggestions,
        selectedIndex,
        menuPosition,
        handleKeyDown,
        selectSuggestion
    };
};