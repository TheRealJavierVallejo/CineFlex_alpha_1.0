import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { Editor, Transforms, Range, Element as SlateElement, Node } from 'slate';
import { ReactEditor } from 'slate-react';
import { CustomEditor, CustomElement } from './slateConfig';
import { getSuggestions, addSmartTypeEntry, SmartTypeEntry, SCENE_PREFIXES } from '../../../services/smartType';
import { 
    smartTypeReducer, 
    initialSmartTypeState, 
    parseSceneHeading, 
    isExactMatch,
    SmartTypeState 
} from '../../../services/smartTypeStateMachine';

interface UseSlateSmartTypeReturn {
    state: SmartTypeState;
    menuPosition: { top: number; left: number } | null;
    handleKeyDown: (event: React.KeyboardEvent) => boolean;
    handleSelection: (suggestion: string) => void;
    getMenuProps: () => any;
    getItemProps: (index: number) => any;
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
    
    // State machine (single source of truth)
    const [state, dispatch] = useReducer(smartTypeReducer, initialSmartTypeState);
    
    // Menu position
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    
    // Track last element for comparison
    const lastPathRef = useRef<string>('');
    const lastContentRef = useRef<string>('');

    // Monitor content changes and update state machine
    useEffect(() => {
        // Calculate menu position (moved inside to avoid dependency issues)
        const calculateMenuPosition = (): { top: number; left: number } | null => {
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
        };

        if (!isActive || !projectId) {
            dispatch({ type: 'HIDE_MENU' });
            setMenuPosition(null);
            return;
        }

        const { selection } = editor;
        if (!selection || !Range.isCollapsed(selection)) {
            dispatch({ type: 'HIDE_MENU' });
            setMenuPosition(null);
            return;
        }

        const elementEntry = Editor.above(editor, {
            match: n => SlateElement.isElement(n),
        });
        if (!elementEntry) {
            dispatch({ type: 'HIDE_MENU' });
            setMenuPosition(null);
            return;
        }

        const [element, path] = elementEntry;
        const content = Node.string(element).toUpperCase();
        const type = (element as CustomElement).type;
        const currentPathStr = JSON.stringify(path);

        // Reset if user moved to different element
        if (currentPathStr !== lastPathRef.current) {
            dispatch({ type: 'HIDE_MENU' });
            lastPathRef.current = currentPathStr;
            lastContentRef.current = content;
            setMenuPosition(null);
            return;
        }

        // Update content ref
        lastContentRef.current = content;

        // Skip if menu is closed due to exact match
        if (state.status === 'closed_exact_match' && state.lastContent === content) {
            return;
        }

        // Don't show menu for these types
        if (type === 'action' || type === 'parenthetical' || type === 'dialogue') {
            dispatch({ type: 'HIDE_MENU' });
            setMenuPosition(null);
            return;
        }

        // Debounce timing
        let debounceTime = 150;
        if (type === 'character' || type === 'transition') debounceTime = 0;
        if (type === 'scene_heading') {
            const parsed = parseSceneHeading(content);
            if (parsed.stage === 1 || parsed.stage === 3) debounceTime = 0;
            else debounceTime = 50;
        }

        const timeoutId = setTimeout(() => {
            // CHARACTER
            if (type === 'character') {
                // Don't reopen menu if we just selected this character
                if (state.status === 'closed_selection' && state.lastPath === currentPathStr && state.closedMode === 'character') {
                    return;
                }

                const suggestions = getSuggestions(projectId, 'character', content, 10);
                if (content.length > 0 && suggestions.length > 0 && !isExactMatch(suggestions, content)) {
                    const pos = calculateMenuPosition();
                    if (pos) {
                        setMenuPosition(pos);
                        dispatch({ type: 'SHOW_SUGGESTIONS', mode: 'character', suggestions });
                    }
                } else if (isExactMatch(suggestions, content)) {
                    dispatch({ type: 'CLOSE_EXACT_MATCH', content });
                    setMenuPosition(null);
                } else {
                    dispatch({ type: 'HIDE_MENU' });
                    setMenuPosition(null);
                }
                return;
            }

            // SCENE HEADING
            if (type === 'scene_heading') {
                const parsed = parseSceneHeading(content);
                
                // Stage 1: Prefix
                if (parsed.stage === 1) {
                    // Don't show menu on empty content
                    if (content.length === 0) {
                        dispatch({ type: 'HIDE_MENU' });
                        setMenuPosition(null);
                        return;
                    }

                    // Don't reopen menu if we just selected a prefix
                    if (state.status === 'closed_selection' && state.lastPath === currentPathStr && state.closedMode === 'prefix') {
                        return;
                    }

                    const suggestions = SCENE_PREFIXES.filter(p => p.startsWith(content));
                    const isComplete = SCENE_PREFIXES.some(p => p.toUpperCase() === content);
                    
                    if (suggestions.length > 0 && !isComplete) {
                        const pos = calculateMenuPosition();
                        if (pos) {
                            setMenuPosition(pos);
                            dispatch({ type: 'SHOW_SUGGESTIONS', mode: 'prefix', suggestions });
                        }
                    } else {
                        dispatch({ type: 'HIDE_MENU' });
                        setMenuPosition(null);
                    }
                    return;
                }
                
                // Stage 2: Location
                if (parsed.stage === 2) {
                    const locationInput = parsed.location.trim();
                    
                    // Don't reopen menu if we just selected this exact location
                    if (state.status === 'closed_selection' && state.lastPath === currentPathStr && state.closedMode === 'location') {
                        return;
                    }
                    
                    if (locationInput.length > 0) {
                        const suggestions = getSuggestions(projectId, 'location', locationInput, 10);
                        
                        // Don't show if exact match (prevents reopening after selection)
                        if (suggestions.length > 0 && !isExactMatch(suggestions, locationInput)) {
                            const pos = calculateMenuPosition();
                            if (pos) {
                                setMenuPosition(pos);
                                dispatch({ type: 'SHOW_SUGGESTIONS', mode: 'location', suggestions });
                            }
                        } else {
                            dispatch({ type: 'HIDE_MENU' });
                            setMenuPosition(null);
                        }
                    } else {
                        dispatch({ type: 'HIDE_MENU' });
                        setMenuPosition(null);
                    }
                    return;
                }
                
                // Stage 3: Time
                if (parsed.stage === 3) {
                    const timeInput = parsed.time.trim();
                    
                    // Don't show menu on empty time (user just typed " - ")
                    if (timeInput.length === 0) {
                        dispatch({ type: 'HIDE_MENU' });
                        setMenuPosition(null);
                        return;
                    }
                    
                    // Don't reopen if we just selected this time
                    if (state.status === 'closed_selection' && state.lastPath === currentPathStr && state.closedMode === 'time') {
                        return;
                    }
                    
                    const suggestions = getSuggestions(projectId, 'time_of_day', timeInput, 10);
                    
                    if (suggestions.length > 0 && !isExactMatch(suggestions, timeInput)) {
                        const pos = calculateMenuPosition();
                        if (pos) {
                            setMenuPosition(pos);
                            dispatch({ type: 'SHOW_SUGGESTIONS', mode: 'time', suggestions });
                        }
                    } else if (isExactMatch(suggestions, timeInput)) {
                        dispatch({ type: 'CLOSE_EXACT_MATCH', content });
                        setMenuPosition(null);
                    } else {
                        dispatch({ type: 'HIDE_MENU' });
                        setMenuPosition(null);
                    }
                    return;
                }
            }

            // TRANSITION
            if (type === 'transition') {
                // Don't show on empty
                if (content.length === 0) {
                    dispatch({ type: 'HIDE_MENU' });
                    setMenuPosition(null);
                    return;
                }
                
                // Don't reopen if we just selected
                if (state.status === 'closed_selection' && state.lastPath === currentPathStr && state.closedMode === 'transition') {
                    return;
                }
                
                const suggestions = getSuggestions(projectId, 'transition', content, 10);
                if (suggestions.length > 0 && !isExactMatch(suggestions, content)) {
                    const pos = calculateMenuPosition();
                    if (pos) {
                        setMenuPosition(pos);
                        dispatch({ type: 'SHOW_SUGGESTIONS', mode: 'transition', suggestions });
                    }
                } else if (isExactMatch(suggestions, content)) {
                    dispatch({ type: 'CLOSE_EXACT_MATCH', content });
                    setMenuPosition(null);
                } else {
                    dispatch({ type: 'HIDE_MENU' });
                    setMenuPosition(null);
                }
                return;
            }
        }, debounceTime);

        return () => clearTimeout(timeoutId);
    }, [editor.children, editor.selection, isActive, projectId]);

    // Handle selection
    const handleSelection = useCallback((suggestion: string) => {
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

        // Reconstruct scene heading
        if (type === 'scene_heading' && state.status === 'showing') {
            const parsed = parseSceneHeading(currentContent);
            if (state.mode === 'prefix') newContent = `${suggestion} `;
            else if (state.mode === 'location') newContent = `${parsed.prefix.trim()} ${suggestion}`;
            else if (state.mode === 'time') newContent = `${parsed.prefix.trim()} ${parsed.location.trim()} - ${suggestion}`;
        }

        // Apply change - replace text WITHOUT deleting element
        const start = Editor.start(editor, path);
        const end = Editor.end(editor, path);
        
        // Select all text in the element
        Transforms.select(editor, {
            anchor: start,
            focus: end
        });
        
        // Delete only the text content (not the element)
        if (Node.string(element).length > 0) {
            Transforms.delete(editor);
        }
        
        // Insert new text (element type is preserved)
        Transforms.insertText(editor, newContent);

        // Learn entry
        const typeMap: Record<string, SmartTypeEntry['type']> = {
            'character': 'character',
            'scene_heading': 'location',
            'transition': 'transition'
        };
        const entryType = typeMap[type];
        if (entryType) {
            addSmartTypeEntry(projectId, entryType, suggestion, false);
        }

        // Close menu after selection with the mode that was just used
        const pathStr = JSON.stringify(path);
        if (state.status === 'showing') {
            dispatch({ type: 'CLOSE_AFTER_SELECTION', path: pathStr, mode: state.mode });
        }
        setMenuPosition(null);
    }, [editor, projectId, state]);

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
            const selected = state.suggestions[state.selectedIndex];
            handleSelection(selected);
            return true;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            dispatch({ type: 'HIDE_MENU' });
            setMenuPosition(null);
            return true;
        }

        return false;
    }, [state, handleSelection]);

    // Downshift props (for accessibility only)
    const getMenuProps = useCallback(() => ({
        role: 'listbox',
        'aria-label': 'Autocomplete suggestions'
    }), []);

    const getItemProps = useCallback((index: number) => ({
        role: 'option',
        'aria-selected': state.status === 'showing' && state.selectedIndex === index,
        onClick: () => {
            if (state.status === 'showing') {
                handleSelection(state.suggestions[index]);
            }
        }
    }), [state, handleSelection]);

    return {
        state,
        menuPosition,
        handleKeyDown,
        handleSelection,
        getMenuProps,
        getItemProps
    };
};