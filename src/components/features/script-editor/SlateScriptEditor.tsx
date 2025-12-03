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

    useImperativeHandle(ref, () => ({
        undo: () => editor.undo(),
        redo: () => editor.redo()
    }));

    useEffect(() => {
        if (onUndoRedoChange) {
            const { history } = editor;
            const canUndo = history.undos.length > 0;
            const canRedo = history.redos.length > 0;
            onUndoRedoChange(canUndo, canRedo);
        }
    }, [editor.operations, onUndoRedoChange, editor]);

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
            const map = calculatePagination(elements);
            
            // Calculate max page with safety checks
            const pages = Object.values(map).filter(p => typeof p === 'number' && p > 0);
            let maxPage = 1;
            if (pages.length > 0) {
                maxPage = Math.max(...pages);
            }

            // DEBUG: Pagination Log
            console.log('[Pagination Debug]', {
                elementCount: elements.length,
                pageMap: map,
                detectedMaxPage: maxPage
            });

            setPageMap(map);
            setTotalPages(maxPage);
        }, 500),
        []
    );

    // Trigger pagination on value change
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

    // Notify Parent of Page Changes
    useEffect(() => {
        onPageChange?.(currentPage, totalPages);
    }, [currentPage, totalPages, onPageChange]);

    const debouncedOnChange = useMemo(
        () => debounce((nodes: Descendant[]) => {
            const elements = slateToScriptElements(nodes);
            onChange(elements);
        }, 500),
        [onChange]
    );

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
        // Let SmartType handle first (MUST BE FIRST)
        const smartTypeHandled = handleSmartTypeKeyDown(event);
        if (smartTypeHandled) {
            return;
        }

        if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
            return;
        }

        if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
            if (['1', '2', '3', '4', '5', '6'].includes(event.key)) {
                event.preventDefault();
                handleCmdShortcut(editor, event.key);
                return;
            }
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            // Prevent splitting if menu is open (double safety)
            if (state.status === 'showing') {
                return;
            }
            
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
            if (handled) {
                event.preventDefault();
            }
            return;
        }
    }, [editor, handleSmartTypeKeyDown, state.status]);

    const renderElement = useCallback((props: RenderElementProps) => {
        const { element } = props;
        const currentId = element.id;
        const pageNum = pageMap[currentId] || 1;
        
        let isFirstOnPage = false;
        
        try {
            const path = ReactEditor.findPath(editor, element);
            
            // First element of the document is always top of Page 1
            if (path[0] === 0) {
                isFirstOnPage = true;
            } else {
                // Check previous element
                const prevPath = Path.previous(path);
                const prevNode = Node.get(editor, prevPath) as CustomElement;
                const prevPage = pageMap[prevNode.id] || 1;
                
                // If page number jumped, we are first on new page
                if (pageNum > prevPage) {
                    isFirstOnPage = true;
                }
            }
        } catch (e) {
            // Safe fallback during concurrent edits
            isFirstOnPage = false;
        }

        return renderScriptElement(props, isLightMode, isFirstOnPage, pageNum);
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
                <Editable
                    renderElement={renderElement}
                    renderLeaf={renderLeaf}
                    decorate={decorateWithPlaceholders(editor)}
                    onKeyDown={handleKeyDown}
                    placeholder="Start writing your screenplay..."
                    spellCheck={false}
                    className="outline-none"
                    style={{
                        minHeight: '11in',
                        width: '100%'
                    }}
                />
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