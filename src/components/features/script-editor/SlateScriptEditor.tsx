import React, { useMemo, useCallback, useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createEditor, Descendant, Editor, Element as SlateElement, Transforms, Node, Path, Range, NodeEntry, Text } from 'slate';
import { Slate, Editable, withReact, ReactEditor, RenderElementProps, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import { ScriptElement } from '../../../types';
import { CustomEditor, CustomElement, renderScriptElement } from './slateConfig';
import { scriptElementsToSlate, slateToScriptElements } from './slateConversion';
import { handleEnterKey, handleTabKey, handleBackspaceAtStart, handleCmdShortcut } from './slateKeyboardHandlers';
import { debounce } from '../../../utils/debounce';
import { useSlateSmartType } from './useSlateSmartTypeStateMachine';
import { AutocompleteMenu } from './AutocompleteMenu';
import { decorateWithPlaceholders } from './slatePlaceholders';
import { calculatePagination } from '../../../services/pagination';
import { useRealtimeValidation } from '../../../hooks/useRealtimeValidation';
import { ValidationStatus } from './ValidationMarker';
import { LiveValidationMarker } from '../../../services/validation/realtimeValidator';
import { AlertCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';

export interface SlateScriptEditorProps {
    initialElements: ScriptElement[];
    onChange: (elements: ScriptElement[]) => void;
    isLightMode: boolean;
    projectId: string;
    onUndoRedoChange?: (canUndo: boolean, canRedo: boolean) => void;
    onPageChange?: (currentPage: number, totalPages: number) => void;
    readOnly?: boolean;
    enableValidation?: boolean; // NEW: Control real-time validation
}

export interface SlateScriptEditorRef {
    undo: () => void;
    redo: () => void;
}

const withScriptEditor = (editor: CustomEditor): CustomEditor => {
    const { normalizeNode } = editor;

    // Circuit breaker variables
    let normalizeCount = 0;
    const MAX_NORMALIZATIONS = 50; // Industry standard (Notion uses 42, Google Docs uses 50)

    // Wrap editor.apply to reset counter on each operation
    const { apply } = editor;
    editor.apply = (op) => {
        normalizeCount = 0; // Reset counter for each new operation
        apply(op);
    };

    editor.normalizeNode = (entry) => {
        // CIRCUIT BREAKER: Stop after MAX_NORMALIZATIONS attempts
        if (normalizeCount >= MAX_NORMALIZATIONS) {
            console.error('[CineFlex] Normalization limit exceeded - corrupt data detected');
            console.error('[CineFlex] Problematic node:', JSON.stringify(entry, null, 2));
            console.error('[CineFlex] This usually means corrupt data was loaded from Supabase');
            return; // STOP - don't continue trying to fix
        }

        normalizeCount++; // Increment counter
        const [node, path] = entry;

        // KEEP ALL EXISTING NORMALIZATION RULES BELOW (don't change these)

        if (SlateElement.isElement(node) && path.length > 1) {
            Transforms.unwrapNodes(editor, { at: path });
            return;
        }

        if (SlateElement.isElement(node) && path.length === 1) {
            const hasNestedElement = node.children.some(child => SlateElement.isElement(child));
            if (hasNestedElement) {
                Transforms.unwrapNodes(editor, {
                    at: path,
                    match: n => SlateElement.isElement(n) && (n as any).type !== undefined
                });
                return;
            }
        }

        if (SlateElement.isElement(node) && path.length === 1 && node.children.length === 0) {
            Transforms.insertNodes(
                editor,
                { text: '' },
                { at: [...path, 0] }
            );
            return;
        }

        if (editor.children.length === 0) {
            Transforms.insertNodes(editor, {
                type: 'action',
                id: crypto.randomUUID(),
                children: [{ text: '' }]
            });
            return;
        }

        normalizeNode(entry);
    };

    return editor;
};

export const SlateScriptEditor = forwardRef<SlateScriptEditorRef, SlateScriptEditorProps>(({
    initialElements,
    onChange,
    isLightMode,
    projectId,
    onUndoRedoChange,
    onPageChange,
    readOnly = false,
    enableValidation = true // NEW: Enable by default
}, ref) => {
    const editor = useMemo(
        () => withScriptEditor(withHistory(withReact(createEditor() as CustomEditor))),
        []
    );

    const [value, setValue] = useState<Descendant[]>(() =>
        scriptElementsToSlate(initialElements)
    );

    // Pagination State
    const [pageMap, setPageMap] = useState<Record<string, number>>({});
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);

    // Track previous projectId to detect project changes
    const prevProjectIdRef = useRef(projectId);

    // PHASE 5: Real-time Validation
    const scriptElements = useMemo(() => slateToScriptElements(value), [value]);
    const {
        getMarkersForElement,
        applyFix,
        stats,
        isValidating
    } = useRealtimeValidation(scriptElements, {
        enabled: enableValidation && !readOnly,
        debounceMs: 300
    });

    // Store validation markers for tooltip display
    const [activeMarker, setActiveMarker] = useState<{ marker: LiveValidationMarker; element: ScriptElement; position: { x: number; y: number } } | null>(null);

    useImperativeHandle(ref, () => ({
        undo: () => editor.undo(),
        redo: () => editor.redo()
    }));

    // Reset editor when project changes (handles project switch, import, etc.)
    useEffect(() => {
        if (prevProjectIdRef.current !== projectId) {
            const newValue = scriptElementsToSlate(initialElements);

            // Reset editor state
            editor.children = newValue;
            setValue(newValue);

            // Clear undo/redo history for new project
            editor.history = { undos: [], redos: [] };

            // Force a re-render of the editor
            editor.onChange();

            prevProjectIdRef.current = projectId;
        }
    }, [projectId, initialElements, editor]);

    useEffect(() => {
        if (onUndoRedoChange) {
            const { history } = editor;
            const canUndo = history.undos.length > 0;
            const canRedo = history.redos.length > 0;
            onUndoRedoChange(canUndo, canRedo);
        }
    }, [editor.operations, onUndoRedoChange, editor]);

    useEffect(() => {
        return () => {
            // No unmount save here to avoid loops
        };
    }, []);

    // SmartType State Machine
    const {
        state,
        menuPosition,
        handleKeyDown: handleSmartTypeKeyDown,
        getMenuProps,
        getItemProps
    } = useSlateSmartType({
        editor,
        projectId,
        isActive: !readOnly // Disable smart type in read-only mode
    });

    // Pagination Calculation
    const debouncedPagination = useMemo(
        () => debounce((nodes: Descendant[]) => {
            const elements = slateToScriptElements(nodes);
            const result = calculatePagination(elements, projectId);

            setPageMap(result);

            if (Object.keys(result).length === 0) {
                setTotalPages(1);
            } else {
                const pages = Object.values(result).filter(p => typeof p === 'number' && p > 0);
                const maxPage = pages.length > 0 ? Math.max(...pages) : 1;
                setTotalPages(maxPage);
            }
        }, 500),
        [projectId]
    );

    useEffect(() => {
        debouncedPagination(value);
    }, [value, debouncedPagination]);

    // Track Current Page based on Selection
    useEffect(() => {
        if (!editor.selection) return;

        try {
            const [node] = Editor.parent(editor, editor.selection);
            if (SlateElement.isElement(node)) {
                const id = (node as CustomElement).id;
                const page = pageMap[id];
                if (page && page !== currentPage) {
                    setCurrentPage(page);
                }
            }
        } catch (e) {
            // Selection might be invalid transiently
        }
    }, [editor.selection, pageMap, currentPage]);

    useEffect(() => {
        onPageChange?.(currentPage, totalPages);
    }, [currentPage, totalPages, onPageChange]);

    const debouncedOnChange = useMemo(
        () => debounce((nodes: Descendant[]) => {
            const elements = slateToScriptElements(nodes);
            onChange(elements);
        }, 300),
        [onChange]
    );

    // Force immediate save without debounce
    const forceSave = useCallback(() => {
        const elements = slateToScriptElements(value);
        onChange(elements);
    }, [value, onChange]);

    const handleChange = useCallback((newValue: Descendant[]) => {
        setValue(newValue);

        const isContentChange = editor.operations.some(
            op => op.type !== 'set_selection'
        );

        if (isContentChange) {
            debouncedOnChange(newValue);
        }
    }, [editor, debouncedOnChange]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (readOnly) return; // Ignore keys in read-only mode

        const smartTypeHandled = handleSmartTypeKeyDown(event);
        if (smartTypeHandled) return;

        if ((event.metaKey || event.ctrlKey) && event.key === 'z') return;

        if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
            if (['1', '2', '3', '4', '5', '6'].includes(event.key)) {
                event.preventDefault();
                handleCmdShortcut(editor, event.key);
                return;
            }
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            if (state.status === 'showing') return;
            event.preventDefault();
            handleEnterKey(editor);
            return;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            handleTabKey(editor);
            return;
        }

        if (event.key === 'Backspace') {
            const handled = handleBackspaceAtStart(editor);
            if (handled) event.preventDefault();
            return;
        }
    }, [editor, handleSmartTypeKeyDown, state.status, readOnly]);

    // PHASE 5: Apply quick fix
    const handleApplyFix = useCallback((elementId: string, marker: LiveValidationMarker) => {
        const element = scriptElements.find(el => el.id === elementId);
        if (!element) return;

        const fixed = applyFix(element, marker);
        if (!fixed) return;

        // Update the element in Slate
        const newElements = scriptElements.map(el => el.id === elementId ? fixed : el);
        const newValue = scriptElementsToSlate(newElements);
        
        // Update editor
        editor.children = newValue;
        setValue(newValue);
        editor.onChange();
        
        // Save immediately
        onChange(newElements);
        
        // Close tooltip
        setActiveMarker(null);
    }, [scriptElements, applyFix, editor, onChange]);

    // PHASE 5: Decorate with validation markers
    const decorateValidation = useCallback((entry: NodeEntry): Range[] => {
        const [node, path] = entry;
        
        // Only decorate text nodes
        if (!Text.isText(node) || path.length !== 2) {
            return [];
        }

        // Get parent element
        const elementPath = path.slice(0, 1);
        const element = Node.get(editor, elementPath) as CustomElement;
        const elementId = element.id;

        if (!elementId) return [];

        // Get validation markers for this element
        const markers = getMarkersForElement(elementId);
        if (markers.length === 0) return [];

        // Convert markers to Slate ranges
        const ranges: Range[] = [];
        
        for (const marker of markers) {
            const range = {
                anchor: { path, offset: marker.startOffset },
                focus: { path, offset: marker.endOffset },
                validation: marker.severity,
                marker: marker
            } as any;
            ranges.push(range);
        }

        return ranges;
    }, [editor, getMarkersForElement]);

    // Combine decorators
    const decorate = useCallback((entry: NodeEntry): Range[] => {
        const placeholders = decorateWithPlaceholders(editor)(entry);
        const validation = enableValidation ? decorateValidation(entry) : [];
        return [...placeholders, ...validation];
    }, [editor, decorateValidation, enableValidation]);

    const renderElement = useCallback((props: RenderElementProps) => {
        const { element } = props;
        const currentId = element.id;

        // Get page number for this element (default to 1 if not in map yet)
        const pageNum = (currentId && pageMap[currentId]) ? pageMap[currentId] : 1;

        let isFirstOnPage = false;
        let isLastOnPage = false;
        let shouldShowPageBreak = false;

        try {
            const path = ReactEditor.findPath(editor, element);
            const elementIndex = path[0];

            // Determine if this is the first element on its page
            if (elementIndex === 0) {
                // Very first element in document - always first on page 1, never show page break
                isFirstOnPage = true;
                shouldShowPageBreak = false;
            } else {
                // Get previous element to compare pages
                const prevPath = Path.previous(path);
                const prevNode = Node.get(editor, prevPath) as CustomElement;
                const prevPage = (prevNode && prevNode.id && pageMap[prevNode.id]) ? pageMap[prevNode.id] : 1;

                // If this element's page number is greater than previous, it's first on a new page
                if (pageNum > prevPage) {
                    isFirstOnPage = true;
                    // Show page break label for pages 2+
                    shouldShowPageBreak = (pageNum > 1);
                }
            }

            // Determine if this is the last element on its page
            const lastIndex = editor.children.length - 1;
            if (elementIndex === lastIndex) {
                // Last element in document
                isLastOnPage = true;
            } else {
                // Get next element to compare pages
                const nextPath = Path.next(path);
                const nextNode = Node.get(editor, nextPath) as CustomElement;
                const nextPage = (nextNode && nextNode.id && pageMap[nextNode.id]) ? pageMap[nextNode.id] : pageNum;

                // If next element is on a higher page, this is last on current page
                if (nextPage > pageNum) {
                    isLastOnPage = true;
                }
            }
        } catch (e) {
            // If any path operations fail, use safe defaults
            isFirstOnPage = false;
            isLastOnPage = false;
            shouldShowPageBreak = false;
        }

        return renderScriptElement(
            props,
            isLightMode,
            isFirstOnPage,
            isLastOnPage,
            pageNum,
            shouldShowPageBreak
        );
    }, [isLightMode, editor, pageMap]);

    const renderLeaf = useCallback((props: RenderLeafProps) => {
        const { attributes, children, leaf } = props;
        const leafWithPlaceholder = leaf as any;
        const leafWithValidation = leaf as any;

        let renderedChildren = children;

        // PHASE 5: Render validation underlines
        if (leafWithValidation.validation) {
            const underlineClass = 
                leafWithValidation.validation === 'error' ? 'border-b-2 border-red-500' :
                leafWithValidation.validation === 'warning' ? 'border-b-2 border-yellow-500' :
                'border-b-2 border-blue-400';
            
            const marker: LiveValidationMarker = leafWithValidation.marker;
            
            renderedChildren = (
                <span
                    className={`${underlineClass} cursor-pointer hover:bg-opacity-10 ${
                        leafWithValidation.validation === 'error' ? 'hover:bg-red-500' :
                        leafWithValidation.validation === 'warning' ? 'hover:bg-yellow-500' :
                        'hover:bg-blue-400'
                    } transition-all duration-100`}
                    onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const element = scriptElements.find(el => {
                            try {
                                const path = ReactEditor.findPath(editor, leaf as any);
                                if (path.length >= 2) {
                                    const elementPath = path.slice(0, 1);
                                    const slateElement = Node.get(editor, elementPath) as CustomElement;
                                    return slateElement.id === el.id;
                                }
                            } catch (e) {}
                            return false;
                        });
                        
                        if (element) {
                            setActiveMarker({
                                marker,
                                element,
                                position: { x: rect.left, y: rect.top }
                            });
                        }
                    }}
                    onMouseLeave={() => setActiveMarker(null)}
                    onClick={() => {
                        if (marker.suggestedFix && activeMarker) {
                            handleApplyFix(activeMarker.element.id, marker);
                        }
                    }}
                    title={marker.message}
                >
                    {children}
                </span>
            );
        }

        // Render placeholders
        if (leafWithPlaceholder.placeholder && leaf.text === '') {
            const { selection } = editor;
            let isTransition = false;

            if (selection) {
                const elementEntry = Editor.above(editor, {
                    match: n => SlateElement.isElement(n)
                });

                if (elementEntry) {
                    const [element] = elementEntry;
                    isTransition = (element as CustomElement).type === 'transition';
                }
            }

            return (
                <span {...attributes}>
                    <span
                        contentEditable={false}
                        className={isTransition ? 'text-right' : ''}
                        style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            opacity: 0.25,
                            fontStyle: 'italic',
                            color: isLightMode ? '#000000' : '#FFFFFF',
                            ...(isTransition ? { right: 0, left: 'auto', width: '100%', textAlign: 'right' } : {})
                        }}
                    >
                        {leafWithPlaceholder.placeholder}
                    </span>
                    {renderedChildren}
                </span>
            );
        }

        return <span {...attributes}>{renderedChildren}</span>;
    }, [isLightMode, editor, activeMarker, handleApplyFix, scriptElements]);

    return (
        <>
            <Slate editor={editor} initialValue={value} onChange={handleChange}>
                {/* Validation Status Bar */}
                {enableValidation && !readOnly && (stats.errors > 0 || stats.warnings > 0 || stats.infos > 0) && (
                    <div className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-2 flex items-center justify-between">
                        <ValidationStatus
                            errorCount={stats.errors}
                            warningCount={stats.warnings}
                            infoCount={stats.infos}
                        />
                        {isValidating && (
                            <span className="text-xs text-text-muted">Validating...</span>
                        )}
                    </div>
                )}

                {/* Single continuous page - no scroll container here */}
                <div
                    className={`w-full ${isLightMode ? 'bg-white' : 'bg-[#1E1E1E]'}`}
                    style={{
                        paddingTop: '1in',
                        paddingBottom: '2in',
                        paddingLeft: '1.5in',
                        paddingRight: '1in',
                        fontFamily: 'Courier, monospace',
                        fontSize: '12pt',
                        lineHeight: '1.0'
                    }}
                >
                    <div style={{ maxWidth: 'min(6.0in, 100%)', margin: '0 auto', padding: '0 1rem' }}>
                        <Editable
                            readOnly={readOnly}
                            renderElement={renderElement}
                            renderLeaf={renderLeaf}
                            decorate={decorate}
                            onKeyDown={handleKeyDown}
                            onBlur={readOnly ? undefined : forceSave} // No save on blur for read-only
                            placeholder={readOnly ? undefined : "Start writing your screenplay..."}
                            spellCheck={false}
                            className="outline-none"
                        />
                    </div>
                </div>
            </Slate>
            {state.status === 'showing' && menuPosition && !readOnly && createPortal(
                <AutocompleteMenu
                    suggestions={state.suggestions}
                    selectedIndex={state.selectedIndex}
                    position={menuPosition}
                    getMenuProps={getMenuProps}
                    getItemProps={getItemProps}
                />,
                document.body
            )}
            {/* PHASE 5: Validation Tooltip */}
            {activeMarker && createPortal(
                <div
                    className="fixed z-50"
                    style={{
                        left: activeMarker.position.x,
                        top: activeMarker.position.y - 10,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-surface border border-border rounded-lg shadow-lg p-3 max-w-xs">
                        {/* Header */}
                        <div className="flex items-start gap-2 mb-2">
                            {activeMarker.marker.severity === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                            {activeMarker.marker.severity === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                            {activeMarker.marker.severity === 'info' && <Info className="w-3 h-3 text-blue-400" />}
                            <div className="flex-1">
                                <p className="text-xs font-medium text-text-primary">
                                    {activeMarker.marker.message}
                                </p>
                                <p className="text-[10px] text-text-muted mt-0.5">
                                    {activeMarker.marker.code}
                                </p>
                            </div>
                        </div>

                        {/* Quick Fix Button */}
                        {activeMarker.marker.suggestedFix && (
                            <>
                                <button
                                    onClick={() => handleApplyFix(activeMarker.element.id, activeMarker.marker)}
                                    className="
                                        w-full mt-2 px-2 py-1.5
                                        bg-primary hover:bg-primary-hover
                                        text-white text-xs font-medium
                                        rounded flex items-center justify-center gap-1.5
                                        transition-colors duration-100
                                    "
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Apply Quick Fix
                                </button>

                                {/* Preview of fix */}
                                <div className="mt-2 pt-2 border-t border-border">
                                    <p className="text-[10px] text-text-muted mb-1">Will change to:</p>
                                    <p className="text-xs text-text-secondary font-mono bg-surface-secondary px-2 py-1 rounded">
                                        {activeMarker.marker.suggestedFix.length > 50 
                                            ? activeMarker.marker.suggestedFix.substring(0, 50) + '...'
                                            : activeMarker.marker.suggestedFix
                                        }
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    {/* Arrow */}
                    <div 
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ top: '100%' }}
                    >
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border" />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
});

SlateScriptEditor.displayName = 'SlateScriptEditor';