import { Descendant } from 'slate';
import { ScriptElement } from '../../../types';

/**
 * INDUSTRY STANDARD: Auto-compute (CONT'D) for characters
 * Matches Final Draft behavior: same character within ~10 elements with intervening dialogue = continued
 * 
 * This is the PROVEN pattern used by:
 * - Final Draft
 * - Arc Studio Pro
 * - WriterDuet
 * 
 * Logic:
 * 1. Track last occurrence of each character name (cleaned, uppercase)
 * 2. If same character appears within 10 elements AND has intervening dialogue from DIFFERENT characters → mark continued
 * 3. Preserve any `isContinued: true` flags from import (parser detected (CONT'D) in original script)
 * 4. RESET tracking on Scene Headings (new scene = new conversation context)
 */
function computeContinuedFlags(elements: ScriptElement[]): ScriptElement[] {
    if (!elements || elements.length === 0) return elements;
    
    // Track character indices
    const characterLastSeen = new Map<string, number>();
    
    return elements.map((el, i) => {
        // RESET Logic: If we hit a Scene Heading, clear the tracking map.
        // In standard screenwriting, (CONT'D) does not typically carry over scene boundaries
        // unless explicitly marked (which we'd handle via import preservation).
        if (el.type === 'scene_heading') {
            characterLastSeen.clear();
            return el;
        }

        if (el.type !== 'character') return el;
        
        // Clean character name: Remove extensions like (V.O.), (O.S.), (CONT'D), etc.
        // This ensures "PARKER (V.O.)" matches "PARKER"
        const cleanName = el.content.toUpperCase().replace(/\s*\(.*?\)\s*/g, '').trim();
        
        // Check if we've seen this character before
        const lastIndex = characterLastSeen.get(cleanName);
        
        // If character already has isContinued from import, preserve it
        if (el.isContinued) {
            characterLastSeen.set(cleanName, i);
            return el;
        }
        
        // Check if same character spoke recently (within 10 elements, not consecutive)
        if (lastIndex !== undefined && i - lastIndex < 10 && i - lastIndex > 1) {
            // Verify there's intervening dialogue from OTHER DIFFERENT characters
            // This prevents marking as continued if it's just the same character repeating
            let hasInterveningDialogue = false;
            for (let j = lastIndex + 1; j < i; j++) {
                if (elements[j].type === 'character') {
                    // Clean the intervening character name
                    const interveningCleanName = elements[j].content.toUpperCase().replace(/\s*\(.*?\)\s*/g, '').trim();
                    
                    // Only mark as intervening if it's a DIFFERENT character
                    if (interveningCleanName !== cleanName) {
                        hasInterveningDialogue = true;
                        break;
                    }
                }
            }
            
            if (hasInterveningDialogue) {
                characterLastSeen.set(cleanName, i);
                return { ...el, isContinued: true };
            }
        }
        
        // Update last seen index for this character
        characterLastSeen.set(cleanName, i);
        return el;
    });
}

/**
 * Converts ScriptElement[] from app format to Slate nodes
 * Preserves IDs for element tracking and SmartType learning
 * NEW: Computes continuation metadata (isContinued) BEFORE rendering
 * Called once on initial load and when script changes externally
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

    // CRITICAL: Compute (CONT'D) flags BEFORE converting to Slate
    // This ensures the editor shows continuation markers in real-time
    const enriched = computeContinuedFlags(elements);

    return enriched.map(el => {
        const node: any = {
            type: el.type,
            id: el.id, // Preserve original ID
            children: [{ text: el.content || '' }]
        };
        
        // CRITICAL: Preserve continuation metadata (now computed!)
        if (el.isContinued) node.isContinued = true;
        if (el.continuesNext) node.continuesNext = true;
        if (el.dual) node.dual = el.dual;
        
        return node;
    });
}

/**
 * Converts Slate nodes back to ScriptElement[] format
 * Preserves IDs from Slate nodes (critical for SmartType)
 * NEW: Recomputes continuation metadata to ensure accuracy
 * Called on debounced onChange (500ms after last edit)
 */
export function slateToScriptElements(nodes: Descendant[]): ScriptElement[] {
    if (!nodes || nodes.length === 0) {
        return [];
    }

    // First pass: Convert Slate nodes to ScriptElements
    const rawElements = nodes.map((node, index) => {
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
        
        // Preserve dual dialogue metadata
        const nodeAny = node as any;
        if (nodeAny.dual) element.dual = nodeAny.dual;
        if (nodeAny.continuesNext) element.continuesNext = true;
        
        return element;
    }).filter((el): el is ScriptElement => el !== null);
    
    // Second pass: Recompute (CONT'D) flags based on current state
    // This ensures accuracy even after edits/reordering
    return computeContinuedFlags(rawElements);
}
