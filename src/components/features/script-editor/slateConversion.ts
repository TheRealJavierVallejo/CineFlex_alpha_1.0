import { Descendant } from 'slate';
import { ScriptElement } from '../../../types';

/**
 * Converts ScriptElement[] from app format to Slate nodes
 * Preserves IDs for element tracking and SmartType learning
 * NEW: Preserves continuation metadata (isContinued, continuesNext)
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

    return elements.map(el => {
        const node: any = {
            type: el.type,
            id: el.id, // Preserve original ID
            children: [{ text: el.content || '' }]
        };
        
        // CRITICAL: Preserve continuation metadata
        if (el.isContinued) node.isContinued = true;
        if (el.continuesNext) node.continuesNext = true;
        if (el.dual) node.dual = el.dual;
        
        return node;
    });
}

/**
 * Converts Slate nodes back to ScriptElement[] format
 * Preserves IDs from Slate nodes (critical for SmartType)
 * NEW: Preserves continuation metadata
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

        const element: ScriptElement = {
            id,
            type: node.type as ScriptElement['type'],
            content,
            sequence: index + 1
        };
        
        // CRITICAL: Preserve continuation metadata
        const nodeAny = node as any;
        if (nodeAny.isContinued) element.isContinued = true;
        if (nodeAny.continuesNext) element.continuesNext = true;
        if (nodeAny.dual) element.dual = nodeAny.dual;
        
        return element;
    }).filter((el): el is ScriptElement => el !== null);
}
