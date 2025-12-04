import { Editor, Transforms, Range, Element as SlateElement, Node, Path } from 'slate';
import { CustomEditor, CustomElement } from './slateConfig';
import { getNextElementType, cycleElementType, shouldUppercase } from './slateFormatting';

/**
 * Handles Enter key: splits current element and creates new element with appropriate type
 * Matches behavior from ScriptPage.tsx lines 184-215
 */
export function handleEnterKey(editor: CustomEditor): boolean {
    const { selection } = editor;

    if (!selection || !Range.isCollapsed(selection)) {
        return false;
    }

    // Get the parent element node, not the text node
    const elementEntry = Editor.above(editor, {
        match: n => SlateElement.isElement(n),
    });

    if (!elementEntry) {
        return false;
    }

    const [currentElement, currentPath] = elementEntry;
    const nextType = getNextElementType((currentElement as CustomElement).type);

    // Split the current node at cursor position
    Transforms.splitNodes(editor, { always: true });

    // Set the type of the newly created node
    const nextPath = Path.next(currentPath);
    Transforms.setNodes(
        editor,
        {
            type: nextType,
            id: crypto.randomUUID() // New element gets new ID
        },
        { at: nextPath }
    );

    // Move cursor to the new element
    Transforms.select(editor, Editor.start(editor, nextPath));

    return true;
}

/**
 * Handles Tab key: cycles through element types using smart tab order
 * Matches behavior from ScriptPage.tsx lines 242-258
 */
export function handleTabKey(editor: CustomEditor, shiftKey: boolean = false): boolean {
    const { selection } = editor;

    if (!selection) {
        return false;
    }

    // Get the parent element node
    const elementEntry = Editor.above(editor, {
        match: n => SlateElement.isElement(n),
    });

    if (!elementEntry) {
        return false;
    }

    const [currentElement, currentPath] = elementEntry;
    const nextType = cycleElementType((currentElement as CustomElement).type, shiftKey);
    const text = Node.string(currentElement);

    // If next type should be uppercase, transform the content
    const newText = shouldUppercase(nextType) ? text.toUpperCase() : text;

    // Update element type
    Transforms.setNodes(
        editor,
        { type: nextType },
        { at: currentPath }
    );

    // Update text if needed (uppercase transformation)
    if (shouldUppercase(nextType) && text.length > 0) {
        for (const [child, childPath] of Node.children(editor, currentPath)) {
            if ('text' in child) {
                Transforms.setNodes(
                    editor,
                    { text: child.text.toUpperCase() },
                    { at: childPath }
                );
            }
        }
    }

    return true;
}

/**
 * Handles Backspace at start of element: merges with previous element
 * Matches behavior from ScriptPage.tsx lines 217-240
 */
export function handleBackspaceAtStart(editor: CustomEditor): boolean {
    const { selection } = editor;

    if (!selection || !Range.isCollapsed(selection)) {
        return false;
    }

    // Get the parent element node
    const elementEntry = Editor.above(editor, {
        match: n => SlateElement.isElement(n),
    });

    if (!elementEntry) {
        return false;
    }

    const [currentElement, currentPath] = elementEntry;
    const start = Editor.start(editor, currentPath);

    if (!Range.equals(selection, { anchor: start, focus: start })) {
        return false; // Not at start, let default behavior handle it
    }

    // Check if this is the first element (can't merge with nothing)
    if (currentPath[0] === 0) {
        return true; // Prevent default but don't do anything
    }

    // Merge with previous element
    const previousPath = Path.previous(currentPath.slice(0, 1));
    const previousNode = Node.get(editor, previousPath);

    if (!SlateElement.isElement(previousNode)) {
        return false;
    }

    // Get the end point of previous element (where cursor will be after merge)
    const previousEnd = Editor.end(editor, previousPath);

    // Merge the blocks
    Transforms.mergeNodes(editor, { at: currentPath.slice(0, 1) });

    // Move cursor to the merge point
    Transforms.select(editor, previousEnd);

    return true;
}

/**
 * Handles Cmd/Ctrl + 1-6 shortcuts for quick type changes
 * Matches behavior from ScriptBlock.tsx lines 160-175
 */
export function handleCmdShortcut(editor: CustomEditor, key: string): boolean {
    const typeMap: Record<string, CustomElement['type']> = {
        '1': 'scene_heading',
        '2': 'action',
        '3': 'character',
        '4': 'dialogue',
        '5': 'parenthetical',
        '6': 'transition'
    };

    const newType = typeMap[key];
    if (!newType) {
        return false;
    }

    const { selection } = editor;
    if (!selection) {
        return false;
    }

    // Get the parent element node
    const elementEntry = Editor.above(editor, {
        match: n => SlateElement.isElement(n),
    });

    if (!elementEntry) {
        return false;
    }

    const [currentElement, currentPath] = elementEntry;
    const text = Node.string(currentElement);

    // If new type should be uppercase, transform the content
    const newText = shouldUppercase(newType) ? text.toUpperCase() : text;

    // Update element type
    Transforms.setNodes(
        editor,
        { type: newType },
        { at: currentPath }
    );

    // Update text if needed
    if (newText !== text && text.length > 0) {
        Transforms.delete(editor, {
            at: {
                anchor: Editor.start(editor, currentPath),
                focus: Editor.end(editor, currentPath)
            }
        });
        Transforms.insertText(editor, newText);
    }

    return true;
}
