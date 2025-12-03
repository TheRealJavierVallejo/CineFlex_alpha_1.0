import { NodeEntry, Text, Element as SlateElement, Range, Editor } from 'slate';
import { CustomElement, ScriptElementType } from './slateConfig';

/**
 * Placeholder text for each screenplay element type
 * Matches Final Draft and Arc Studio industry standards
 */
const PLACEHOLDER_TEXT: Record<ScriptElementType, string> = {
    scene_heading: 'INT. LOCATION - TIME',
    action: 'Action line...',
    character: 'CHARACTER NAME',
    dialogue: 'Dialogue...',
    parenthetical: '(parenthetical)',
    transition: 'CUT TO:'
};

/**
 * Custom text type with optional placeholder property
 */
export interface PlaceholderText extends Text {
    placeholder?: string;
}

/**
 * Checks if an element is truly empty (has only one child that's an empty Text node)
 */
function isElementEmpty(element: CustomElement): boolean {
    // Element must have exactly one child
    if (element.children.length !== 1) {
        return false;
    }

    const child = element.children[0];

    // Child must be a Text node with empty text
    return Text.isText(child) && child.text === '';
}

/**
 * Slate decorate function that adds placeholder decorations to empty elements
 * This is the industry standard approach used by Final Draft and Arc Studio
 * 
 * IMPORTANT: Only shows placeholder on the currently focused/selected element
 * This matches Final Draft's behavior where placeholder guides "where you are"
 * 
 * @param editor - Slate editor instance (needed to check selection/focus)
 * @param entry - Node entry from Slate editor
 * @returns Array of ranges with placeholder decorations
 */
export function decorateWithPlaceholders(editor: Editor) {
    return ([node, path]: NodeEntry): Range[] => {
        // Only decorate elements (not text nodes)
        if (!SlateElement.isElement(node)) {
            return [];
        }

        const element = node as CustomElement;

        // Check if element is empty
        if (!isElementEmpty(element)) {
            return [];
        }

        // Get placeholder text for this element type
        const placeholderText = PLACEHOLDER_TEXT[element.type];

        if (!placeholderText) {
            return [];
        }

        // CRITICAL: Only show placeholder if this element contains the cursor
        // This matches Final Draft: placeholder appears only on focused element
        const { selection } = editor;
        if (!selection) {
            return [];
        }

        // Check if selection is within this element
        const [start] = Range.edges(selection);
        const elementPath = path;

        // Selection must be inside this element (path must match or be child of element)
        const isInElement = start.path.length >= elementPath.length &&
            elementPath.every((val, idx) => val === start.path[idx]);

        if (!isInElement) {
            return [];
        }

        // Return a decoration range for the empty text node
        // The decoration covers the entire text node (which is empty)
        return [
            {
                anchor: { path: [...path, 0], offset: 0 },
                focus: { path: [...path, 0], offset: 0 },
                placeholder: placeholderText
            } as Range & { placeholder: string }
        ];
    };
}

