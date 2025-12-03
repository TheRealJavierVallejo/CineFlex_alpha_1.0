import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { Editor, Transforms, Range, Element as SlateElement, Node } from 'slate';
import { ReactEditor } from 'slate-react';
import { CustomEditor, CustomElement } from './slateConfig';
import { getSuggestions, addSmartTypeEntry, SmartTypeEntry, SCENE_PREFIXES } from '../../../services/smartType';
import { smartTypeReducer } from './useSlateSmartTypeReducer';

const SMARTTYPE_DEBUG = false;

interface UseSlateSmartTypeReturn {
    showMenu: boolean;
    suggestions: string[];
    selectedIndex: number;
    menuPosition: { top: number; left: number } | null;
    handleKeyDown: (event: React.KeyboardEvent) => boolean;
    selectSuggestion: (suggestion: string) => void;
}

// Optimized parsing for strict stage detection
const parseSceneHeading = (content: string) => {
    // Stage 1: User is typing the prefix (INT., EXT., I/E)
    // We require a SPACE after the prefix to consider it "complete"
    const prefixMatch = content.match(/^(INT\.|EXT\.|I\/E)\s+/i);

    if (!prefixMatch) {
        // Still in stage 1 (typing prefix)
        return { stage: 1, prefix: '', location: content, time: '' };
    }

    const prefix = prefixMatch[0]; // e.g., "INT. "
    const rest = content.substring(prefix.length); // Everything after prefix

    // Stage 3: Check if location is followed by " - " (time separator)
    // We look for the standard separator " - "
    const parts = rest.split(/\s+-\s+/);

    if (parts.length > 1) {
        // Stage 3: User is typing time (after " - ")
        const location = parts.slice(0, parts.length - 1).join(' - ');
        const time = parts[parts.length - 1];
        return { stage: 3, prefix, location, time };
    } else {
        // Stage 2: User is typing location (after prefix, before " - ")
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
    // Replace all useState with single useReducer
    const [state, dispatch] = useReducer(smartTypeReducer, { status: 'idle' });

    // Track previous selection to detect changes
    const prevSelectionRef = useRef<Range | null>(null);

    // Track if user has interacted with current element (typed anything)
    const hasInteractedRef = useRef(false);
    const lastElementPathRef = useRef<string>('');
    const lastContentRef = useRef('');

    // Track if we just made a selection (prevents menu reopening)
    const justSelectedRef = useRef(false);

    // Calculate menu position based on cursor
    const calculateMenuPosition = useCallback((): { top: number; left: number } | null => {
        const { selection } = editor;
        if (!selection || !Range.isCollapsed(selection)) {
            return null;
        }

        try {
            const domRange = ReactEditor.toDOMRange(editor, selection);
            const rect = domRange.getBoundingClientRect();

            // Position at the END of the selection (where cursor actually is)
            const pos = {
                top: rect.bottom + window.scrollY + 4,
                left: rect.right + window.scrollX
            };

            return pos;
        } catch (e) {
            return null;
        }
    }, [editor]);

    // Monitor content changes for suggestions
    useEffect(() => {
        if (!isActive || !projectId) {
            dispatch({ type: 'HIDE_MENU' });
            return;
        }

        const { selection } = editor;
        if (!selection || !Range.isCollapsed(selection)) {
            dispatch({ type: 'HIDE_MENU' });
            return;
        }

        // Get current element
        const elementEntry = Editor.above(editor, {
            match: n => SlateElement.isElement(n),
        });

        if (!elementEntry) {
            dispatch({ type: 'HIDE_MENU' });
            return;
        }

        const [element, path] = elementEntry;
        const content = Node.string(element).toUpperCase();
        const type = (element as CustomElement).type;

        // Track element path as string for comparison
        const currentPathStr = JSON.stringify(path);

        // If we moved to a different element, reset interaction flag
        if (currentPathStr !== lastElementPathRef.current) {
            hasInteractedRef.current = false;
            lastElementPathRef.current = currentPathStr;
        }

        // If user has typed anything (content length > 0), mark as interacted
        if (content.length > 0) {
            hasInteractedRef.current = true;
        }

        // Reset selection flag if content changed manually (user typed/deleted)
        if (content !== lastContentRef.current) {
            // Note: If change was due to selection, justSelectedRef is already true.
            // We preserve it. If change was due to typing, we could reset it, 
            // but relying on the timeout consumption is safer.
            lastContentRef.current = content;
        }

        // Fast exit for types that don't need autocomplete
        if (type === 'action' || type === 'parenthetical' || type === 'dialogue') {
            dispatch({ type: 'HIDE_MENU' });
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
            // If we just made a selection, don't show menu until user types again
            if (justSelectedRef.current) {
                dispatch({ type: 'HIDE_MENU' });
                justSelectedRef.current = false; // Consume flag
                return;
            }

            let newSuggestions: string[] = [];
            let shouldShow = false;

            if (type === 'character') {
                newSuggestions = getSuggestions(projectId, 'character', content, 10);
                shouldShow = content.length > 0 && newSuggestions.length > 0;
            }

            if (type === 'scene_heading') {
                const parsed = parseSceneHeading(content);
                if (parsed.stage === 1) {
                    const contentUpper = content.toUpperCase();
                    newSuggestions = SCENE_PREFIXES.filter(prefix => 
                        prefix.startsWith(contentUpper)
                    );
                    shouldShow = (hasInteractedRef.current || content.length > 0) && newSuggestions.length > 0;
                    
                } else if (parsed.stage === 2) {
                    newSuggestions = getSuggestions(projectId, 'location', parsed.location.trim(), 10);
                    shouldShow = newSuggestions.length > 0;
                    
                } else if (parsed.stage === 3) {
                    newSuggestions = getSuggestions(projectId, 'time_of_day', parsed.time.trim(), 10);
                    shouldShow = newSuggestions.length > 0;
                }
            }

            if (type === 'transition') {
                newSuggestions = getSuggestions(projectId, 'transition', content, 10);
                shouldShow = (hasInteractedRef.current || content.length > 0) && newSuggestions.length > 0;
            }

            // Auto-hide if user typed exact match for their current stage
            if (type === 'scene_heading' && newSuggestions.length === 1) {
                const parsed = parseSceneHeading(content);
                let partialMatch = '';
                if (parsed.stage === 1) partialMatch = content;
                else if (parsed.stage === 2) partialMatch = parsed.location.trim();
                else if (parsed.stage === 3) partialMatch = parsed.time.trim();
                
                if (newSuggestions[0].toUpperCase() === partialMatch.toUpperCase()) {
                    shouldShow = false;
                }
            } else if (newSuggestions.length === 1 && newSuggestions[0].toUpperCase() === content.toUpperCase()) {
                shouldShow = false;
            }

            // Dispatch state update
            if (shouldShow) {
                const position = calculateMenuPosition();
                if (position) {
                    dispatch({
                        type: 'SHOW_SUGGESTIONS',
                        suggestions: newSuggestions,
                        position
                    });
                } else {
                    dispatch({ type: 'HIDE_MENU' });
                }
            } else {
                dispatch({ type: 'HIDE_MENU' });
            }
        }, debounceTime);

        return () => clearTimeout(timeoutId);
    }, [editor.children, editor.selection, isActive, projectId, calculateMenuPosition]);

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

        const entryType = typeMap[type];
        if (entryType) {
            addSmartTypeEntry(projectId, entryType, suggestion, false);
        }

        // Mark that we just made a selection
        justSelectedRef.current = true;

        // CRITICAL: Hide menu after selection
        dispatch({ type: 'HIDE_MENU' });
    }, [editor, projectId]);

    // Keyboard handler
    const handleKeyDown = useCallback((event: React.KeyboardEvent): boolean => {
        if (state.status !== 'showing') return false;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            dispatch({ type: 'SELECT_NEXT' });
            return true;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            dispatch({ type: 'SELECT_PREVIOUS' });
            return true;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            selectSuggestion(state.suggestions[state.selectedIndex]);
            return true;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            dispatch({ type: 'HIDE_MENU' });
            return true;
        }

        return false;
    }, [state, selectSuggestion]);

    return {
        showMenu: state.status === 'showing',
        suggestions: state.status === 'showing' ? state.suggestions : [],
        selectedIndex: state.status === 'showing' ? state.selectedIndex : 0,
        menuPosition: state.status === 'showing' ? state.menuPosition : null,
        handleKeyDown,
        selectSuggestion
    };
};