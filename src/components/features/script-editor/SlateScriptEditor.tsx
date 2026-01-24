import React, { useMemo, useCallback, useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createEditor, Descendant, Editor, Element as SlateElement, Transforms, Node, Path } from 'slate';
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

export interface SlateScriptEditorProps {
    initialElements: ScriptElement[];
    onChange: (elements: ScriptElement[]) => void;
    isLightMode: boolean;
    projectId: string;
    onUndoRedoChange?: (canUndo: boolean, canRedo: boolean) => void;
    onPageChange?: (currentPage: number, totalPages: number) => void;
}

export interface SlateScriptEditorRef {
    undo: () => void;
    redo: () => void;
}

const withScriptEditor = (editor: CustomEditor): CustomEditor => {
    const { normalizeNode } = editor;

    editor.normalizeNode = (entry) => {
        const [node, path] = entry;

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
    onPageChange
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

    // 🔥 NEW: Save on unmount
    useEffect(() => {
        return () => {
            if (value && value.length > 0) {
                const elements = slateToScriptElements(value);
                onChange(elements);
            }
        };
    }, [value, onChange]);

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
        isActive: true
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
        }, 300), // 🔥 CHANGED: 500ms -> 300ms
        [onChange]
    );

    // 🔥 NEW: Force immediate save without debounce
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
    }, [editor, handleSmartTypeKeyDown, state.status]);

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
                    {children}
                </span>
            );
        }

        return <span {...attributes}>{children}</span>;
    }, [isLightMode, editor]);

    return (
        <>
            <Slate editor={editor} initialValue={value} onChange={handleChange}>
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
                            renderElement={renderElement}
                            renderLeaf={renderLeaf}
                            decorate={decorateWithPlaceholders(editor)}
                            onKeyDown={handleKeyDown}
                            onBlur={forceSave} // 🔥 NEW: Save on blur
                            placeholder="Start writing your screenplay..."
                            spellCheck={false}
                            className="outline-none"
                        />
                    </div>
                </div>
            </Slate>
            {state.status === 'showing' && menuPosition && createPortal(
                <AutocompleteMenu
                    suggestions={state.suggestions}
                    selectedIndex={state.selectedIndex}
                    position={menuPosition}
                    getMenuProps={getMenuProps}
                    getItemProps={getItemProps}
                />,
                document.body
            )}
        </>
    );
});

SlateScriptEditor.displayName = 'SlateScriptEditor';