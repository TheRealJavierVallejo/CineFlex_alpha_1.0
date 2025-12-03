import React, { useMemo, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { createEditor, Descendant, Editor, Element as SlateElement, Transforms, Node, Path } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import { ScriptElement } from '../../../types';
import { CustomEditor, CustomElement, renderScriptElement } from './slateConfig';
import { scriptElementsToSlate, slateToScriptElements } from './slateConversion';
import { handleEnterKey, handleTabKey, handleBackspaceAtStart, handleCmdShortcut } from './slateKeyboardHandlers';
import { debounce } from '../../../utils/debounce';
import { useSlateSmartType } from './useSlateSmartType';
import { AutocompleteMenu } from './AutocompleteMenu';
import { decorateWithPlaceholders } from './slatePlaceholders';

export interface SlateScriptEditorProps {
    initialElements: ScriptElement[];
    onChange: (elements: ScriptElement[]) => void;
    isLightMode: boolean;
    projectId: string;
    onUndoRedoChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface SlateScriptEditorRef {
    undo: () => void;
    redo: () => void;
}

/**
 * Custom Slate plugin that enforces flat structure and screenplay-specific behavior
 */
const withScriptEditor = (editor: CustomEditor): CustomEditor => {
    const { normalizeNode } = editor;

    editor.normalizeNode = (entry) => {
        const [node, path] = entry;

        // Enforce flat structure: all elements must be top-level (path length === 1)
        if (SlateElement.isElement(node) && path.length > 1) {
            // This element is nested inside another element - unwrap it
            Transforms.unwrapNodes(editor, { at: path });
            return;
        }

        // Ensure elements only have text children (no nested elements)
        if (SlateElement.isElement(node) && path.length === 1) {
            const hasNestedElement = node.children.some(child => SlateElement.isElement(child));
            if (hasNestedElement) {
                // Flatten any nested elements
                Transforms.unwrapNodes(editor, {
                    at: path,
                    match: n => SlateElement.isElement(n) && (n as any).type !== undefined
                });
                return;
            }
        }

        // Ensure every element has at least one text child
        if (SlateElement.isElement(node) && path.length === 1 && node.children.length === 0) {
            Transforms.insertNodes(
                editor,
                { text: '' },
                { at: [...path, 0] }
            );
            return;
        }

        // Prevent empty editor state
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

/**
 * Production-ready Slate.js screenplay editor
 * Replaces individual textarea elements with single unified editor
 */
export const SlateScriptEditor = forwardRef<SlateScriptEditorRef, SlateScriptEditorProps>(({
    initialElements,
    onChange,
    isLightMode,
    projectId,
    onUndoRedoChange
}, ref) => {
    // Create Slate editor instance with plugins
    const editor = useMemo(
        () => withScriptEditor(withHistory(withReact(createEditor() as CustomEditor))),
        []
    );

    // Initialize value from props (only once)
    const [value, setValue] = useState<Descendant[]>(() =>
        scriptElementsToSlate(initialElements)
    );

    // Expose Undo/Redo to parent via Ref
    useImperativeHandle(ref, () => ({
        undo: () => editor.undo(),
        redo: () => editor.redo()
    }));

    // Monitor History State Changes
    useEffect(() => {
        if (onUndoRedoChange) {
            const { history } = editor;
            const canUndo = history.undos.length > 0;
            const canRedo = history.redos.length > 0;
            onUndoRedoChange(canUndo, canRedo);
        }
    }, [editor.operations, onUndoRedoChange, editor]);

    // SmartType Integration
    const {
        showMenu,
        suggestions,
        selectedIndex,
        menuPosition,
        handleKeyDown: handleSmartTypeKeyDown,
        selectSuggestion
    } = useSlateSmartType({
        editor,
        projectId,
        isActive: true // Always active for now
    });

    // Debounced onChange handler (500ms for ALL changes)
    const debouncedOnChange = useMemo(
        () => debounce((nodes: Descendant[]) => {
            const elements = slateToScriptElements(nodes);
            onChange(elements);
        }, 500),
        [onChange]
    );

    // Handle Slate value changes
    const handleChange = useCallback((newValue: Descendant[]) => {
        setValue(newValue);

        // Only trigger onChange if content actually changed (not just selection)
        const isContentChange = editor.operations.some(
            op => op.type !== 'set_selection'
        );

        if (isContentChange) {
            debouncedOnChange(newValue);
        }
    }, [editor, debouncedOnChange]);

    // Handle keyboard events
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        // Let SmartType handle first (ArrowUp/Down/Enter/Escape) (MUST BE FIRST)
        const smartTypeHandled = handleSmartTypeKeyDown(event);
        if (smartTypeHandled) {
            return;
        }

        // Cmd/Ctrl + Z/Shift+Z for undo/redo (handled by withHistory)
        if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
            // Let Slate's history plugin handle this
            return;
        }

        // Cmd/Ctrl + 1-6 for quick type changes
        if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
            if (['1', '2', '3', '4', '5', '6'].includes(event.key)) {
                event.preventDefault();
                handleCmdShortcut(editor, event.key);
                return;
            }
        }

        // Enter key: split and create new element
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleEnterKey(editor);
            return;
        }

        // Tab key: cycle element types
        if (event.key === 'Tab') {
            event.preventDefault();
            handleTabKey(editor);
            return;
        }

        // Backspace at start: merge with previous
        if (event.key === 'Backspace') {
            const handled = handleBackspaceAtStart(editor);
            if (handled) {
                event.preventDefault();
            }
            return;
        }
    }, [editor, handleSmartTypeKeyDown]);

    // Render individual elements
    const renderElement = useCallback((props: RenderElementProps) => {
        // Determine if this is the first element on the page
        // For now, we consider the very first element of the document as first on page
        const isFirstOnPage = props.element === value[0];

        return renderScriptElement(props, isLightMode, isFirstOnPage);
    }, [isLightMode, value]);

    // Render leaf nodes with placeholder support
    const renderLeaf = useCallback((props: RenderLeafProps) => {
        const { attributes, children, leaf } = props;
        const leafWithPlaceholder = leaf as any;

        // If this leaf has a placeholder decoration AND the text is truly empty
        if (leafWithPlaceholder.placeholder && leaf.text === '') {
            // Determine if parent element is a transition (needs right-alignment)
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
                            // For transitions, we need to position the placeholder to align right
                            ...(isTransition ? { right: 0, left: 'auto', width: '100%', textAlign: 'right' } : {})
                        }}
                    >
                        {leafWithPlaceholder.placeholder}
                    </span>
                    {children}
                </span>
            );
        }

        // Normal leaf rendering (no placeholder)
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
            {showMenu && menuPosition && createPortal(
                <AutocompleteMenu
                    suggestions={suggestions}
                    selectedIndex={selectedIndex}
                    onSelect={selectSuggestion}
                    position={menuPosition}
                />,
                document.body
            )}
        </>
    );
});

SlateScriptEditor.displayName = 'SlateScriptEditor';