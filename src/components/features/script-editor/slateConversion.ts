import { Descendant } from 'slate';
import { ScriptElement } from '../../../types';

/**
 * Converts ScriptElement[] from app format to Slate nodes
 * Preserves IDs for element tracking and SmartType learning
 * Called once on initial load
 */
export function scriptElementsToSlate(elements: ScriptElement[]): Descendant[] {
    if (!elements || elements.length === 0) {
        // Default: single empty action element
        return [{
            type: 'action',
            id: crypto.randomUUID(),
            children: [{ text: '' }]
        }];
    }

    return elements.map(el => ({
        type: el.type,
        id: el.id, // Preserve original ID
        children: [{ text: el.content || '' }]
    }));
}

/**
 * Converts Slate nodes back to ScriptElement[] format
 * Preserves IDs from Slate nodes (critical for SmartType)
 * Called on debounced onChange (500ms after last edit)
 */
export function slateToScriptElements(nodes: Descendant[]): ScriptElement[] {
    if (!nodes || nodes.length === 0) {
        return [];
    }

    return nodes.map((node, index) => {
        // Type guard: ensure node is an element
        if (!('type' in node) || !('children' in node)) {
            return null;
        }

        // Extract text content from children
        const content = node.children
            .map((child: any) => child.text || '')
            .join('');

        // Preserve ID from Slate node, generate new one if missing
        const id = (node as any).id || crypto.randomUUID();

        return {
            id,
            type: node.type as ScriptElement['type'],
            content,
            sequence: index + 1
        };
    }).filter((el): el is ScriptElement => el !== null);
}
