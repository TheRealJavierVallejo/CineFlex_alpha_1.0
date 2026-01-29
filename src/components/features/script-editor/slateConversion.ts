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
 * 2. If same character appears within 20 elements AND has NO intervening dialogue from DIFFERENT characters → mark continued
 * 3. Preserve any `isContinued: true` flags from import (parser detected (CONT'D) in original script)
 * 4. RESET tracking on Scene Headings (new scene = new conversation context)
 */
function computeContinuedFlags(elements: ScriptElement[]): ScriptElement[] {
    if (!elements || elements.length === 0) return elements;
    
    // Track character indices
    const characterLastSeen = new Map<string, number>();
    
    return elements.map((el, i) => {
        // Safe check for content
        if (!el || !el.content) return el;

        // RESET Logic: If we hit a Scene Heading, clear the tracking map.
        // In standard screenwriting, (CONT'D) does not typically carry over scene boundaries
        if (el.type === 'scene_heading') {
            characterLastSeen.clear();
            return el;
        }

        if (el.type !== 'character') return el;
        
        // Clean character name: Remove extensions like (V.O.), (O.S.), (CONT'D), etc.
        const cleanName = el.content.toUpperCase().replace(/\s*\(.*?\)\s*/g, '').trim();
        
        // Check if we've seen this character before
        const lastIndex = characterLastSeen.get(cleanName);
        
        // If character already has isContinued from import/state, preserve it
        if (el.isContinued) {
            characterLastSeen.set(cleanName, i);
            return el;
        }
        
        // Check if same character spoke recently (within 20 elements)
        // AND there is at least one intervening element (i - lastIndex > 1)
        if (lastIndex !== undefined && i - lastIndex < 20 && i - lastIndex > 1) {
            
            // CRITICAL FIX: (CONT'D) applies when the character resumes AFTER action/parenthetical
            // It does NOT apply if another character spoke in between (that's just a reply)
            
            let hasInterveningOtherDialogue = false;
            
            for (let j = lastIndex + 1; j < i; j++) {
                const intermediate = elements[j];
                // Check if it's a character element
                if (intermediate.type === 'character') {
                    const interveningName = intermediate.content?.toUpperCase().replace(/\s*\(.*?\)\s*/g, '').trim();
                    
                    // If a DIFFERENT character spoke, the chain is broken
                    if (interveningName && interveningName !== cleanName) {
                        hasInterveningOtherDialogue = true;
                        break;
                    }
                }
            }
            
            // ONLY mark continued if NO other character intervened
            if (!hasInterveningOtherDialogue) {
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
 * NEW: STRIPS (CONT'D) text from content to prevent duplicates (since renderer adds it)
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

    try {
        // CRITICAL: Compute (CONT'D) flags BEFORE converting to Slate
        const enriched = computeContinuedFlags(elements);

        return enriched.map(el => {
            let content = el.content || '';
            
            // CRITICAL FIX: Strip existing (CONT'D) from the text content
            // The renderer will re-add it visually if isContinued is true
            // This prevents "PARKER (CONT'D) (CONT'D)"
            if (el.type === 'character') {
                content = content.replace(/\s*\(CONT['']?D\.?\)\s*$/i, '').trim();
            }

            const node: any = {
                type: el.type,
                id: el.id, // Preserve original ID
                children: [{ text: content }]
            };
            
            // Preserve metadata
            if (el.isContinued) node.isContinued = true;
            if (el.continuesNext) node.continuesNext = true;
            if (el.dual) node.dual = el.dual;
            
            return node;
        });
    } catch (error) {
        console.error("Error in scriptElementsToSlate:", error);
        // Fallback to basic conversion if enrichment fails
        return elements.map(el => ({
            type: el.type,
            id: el.id,
            children: [{ text: el.content || '' }]
        }));
    }
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

    try {
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
        return computeContinuedFlags(rawElements);
    } catch (error) {
        console.error("Error in slateToScriptElements:", error);
        return [];
    }
}
