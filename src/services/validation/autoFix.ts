/**
 * AUTO-FIX FUNCTIONALITY
 * 
 * Automatically corrects common screenplay formatting issues.
 * Only fixes issues that have clear, unambiguous solutions.
 * 
 * Usage:
 *   const fixed = autoFixElement(element);
 *   const allFixed = autoFixElements(elements);
 */

import { ScriptElement } from '../../types';
import { ValidScriptElement, customValidationRules } from './schemas';
import { ValidationIssue } from './validationReport';

/**
 * Auto-fix result
 */
export interface AutoFixResult {
  fixed: ScriptElement;
  changed: boolean;
  changes: string[]; // List of what was fixed
}

/**
 * Auto-fix a single element (Isolated checks)
 */
export function autoFixElement(element: ScriptElement): AutoFixResult {
  const fixed = { ...element };
  const changes: string[] = [];
  let changed = false;

  // Fix 1: Uppercase character names
  if (fixed.type === 'character') {
    const uppercase = fixed.content.toUpperCase();
    if (fixed.content !== uppercase) {
      fixed.content = uppercase;
      changes.push('Converted character name to uppercase');
      changed = true;
    }
  }

  // Fix 2: Add parentheses to parentheticals
  if (fixed.type === 'parenthetical') {
    if (!fixed.content.startsWith('(') || !fixed.content.endsWith(')')) {
      const trimmed = fixed.content.replace(/^\(|\)$/g, '').trim();
      fixed.content = `(${trimmed})`;
      changes.push('Added parentheses to parenthetical');
      changed = true;
    }
  }

  // Fix 3: Trim whitespace from all content
  const trimmed = fixed.content.trim();
  if (fixed.content !== trimmed && trimmed.length > 0) {
    fixed.content = trimmed;
    changes.push('Trimmed extra whitespace');
    changed = true;
  }

  // Fix 4: Remove empty content (mark for deletion)
  if (!fixed.content || fixed.content.trim() === '') {
    fixed.content = '[EMPTY - REMOVE]';
    changes.push('Marked empty element for removal');
    changed = true;
  }

  // Fix 5: Standardize scene heading format
  if (fixed.type === 'scene_heading') {
    // Replace common variations
    let heading = fixed.content;
    heading = heading.replace(/^INTERIOR\./i, 'INT.');
    heading = heading.replace(/^EXTERIOR\./i, 'EXT.');
    heading = heading.replace(/^INTERIOR /i, 'INT. ');
    heading = heading.replace(/^EXTERIOR /i, 'EXT. ');
    heading = heading.toUpperCase();
    
    if (heading !== fixed.content) {
      fixed.content = heading;
      changes.push('Standardized scene heading format');
      changed = true;
    }
  }

  // Fix 6: Ensure character field exists for dialogue
  if (fixed.type === 'dialogue' && !fixed.character) {
    // Try to find character from content (if it looks like "JOHN: Hello")
    const match = fixed.content.match(/^([A-Z][A-Z\s]+):\s*(.+)$/);
    if (match) {
      fixed.character = match[1].trim();
      fixed.content = match[2].trim();
      changes.push('Extracted character name from dialogue');
      changed = true;
    }
  }

  // Fix 7: Remove ONLY pagination-specific metadata (continuesNext, keptTogether)
  // PRESERVE isContinued - it's semantic character metadata, not just pagination
  // 
  // WHY:
  // - isContinued = "this character spoke before" (content semantics)
  // - continuesNext = "this element spans pages" (pagination artifact)
  // - keptTogether = "keep with next element" (pagination artifact)
  // 
  // Industry standard: Final Draft preserves isContinued in .fdx files,
  // but recalculates continuesNext based on pagination.
  if (fixed.continuesNext !== undefined || fixed.keptTogether !== undefined) {
    delete fixed.continuesNext;
    delete fixed.keptTogether;
    changes.push('Removed stale pagination data (continuesNext/keptTogether)');
    changed = true;
  }
  
  // NOTE: isContinued is intentionally NOT deleted here
  // It will be recomputed in slateConversion.ts if missing, but preserved if present

  return { fixed, changed, changes };
}

/**
 * Auto-fix an array of elements (Context-aware checks)
 * Returns fixed elements and summary report
 */
export function autoFixElements(elements: ScriptElement[]): {
  fixed: ScriptElement[];
  totalFixed: number;
  changes: Record<string, string[]>; // elementId -> list of changes
  removed: string[]; // IDs of elements marked for removal
} {
  const fixed: ScriptElement[] = [];
  const changes: Record<string, string[]> = {};
  const removed: string[] = [];
  let totalFixed = 0;

  // Phase 1: Individual Fixes
  const tempElements: ScriptElement[] = [];
  for (const element of elements) {
    const result = autoFixElement(element);
    
    if (result.fixed.content === '[EMPTY - REMOVE]') {
      removed.push(element.id);
      continue;
    }
    
    tempElements.push(result.fixed);
    if (result.changed) {
      totalFixed++;
      changes[element.id] = result.changes;
    }
  }

  // Phase 2: Context-Aware Fixes (The "Correctness Gate")
  for (let i = 0; i < tempElements.length; i++) {
    const current = { ...tempElements[i] };
    const prev = i > 0 ? fixed[fixed.length - 1] : null; // Look at confirmed fixed list
    const next = i < tempElements.length - 1 ? tempElements[i + 1] : null;

    let heuristicChanged = false;
    const heuristicChanges: string[] = [];

    // HEURISTIC 1: Floating Dialogue -> Action
    // Dialogue must follow Character or Parenthetical.
    if (current.type === 'dialogue') {
      const validPredecessor = prev && (prev.type === 'character' || prev.type === 'parenthetical');
      if (!validPredecessor) {
        current.type = 'action';
        heuristicChanges.push('Converted floating dialogue to action');
        heuristicChanged = true;
      }
    }

    // HEURISTIC 2: Short Uppercase Action followed by Dialogue -> Character
    if (current.type === 'action') {
      const isUppercase = current.content === current.content.toUpperCase() && /[A-Z]/.test(current.content);
      const isShort = current.content.split(' ').length < 6;
      const followedByDialogue = next && (next.type === 'dialogue' || next.type === 'parenthetical');

      if (isUppercase && isShort && followedByDialogue) {
        current.type = 'character';
        heuristicChanges.push('Converted uppercase action (followed by dialogue) to character');
        heuristicChanged = true;
      }
    }

    // HEURISTIC 3: Action starts with INT./EXT. -> Scene Heading
    if (current.type === 'action') {
      if (/^(INT\.|EXT\.|INT |EXT |I\/E)/i.test(current.content)) {
        current.type = 'scene_heading';
        current.content = current.content.toUpperCase(); // Ensure standard format
        heuristicChanges.push('Converted action with scene prefix to scene heading');
        heuristicChanged = true;
      }
    }

    // HEURISTIC 4: Action wrapped in parens -> Parenthetical
    if (current.type === 'action') {
        const trimmed = current.content.trim();
        if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            // Only if it follows a character or dialogue (or another parenthetical)
            // Parentheticals shouldn't be standalone
            const validPredecessor = prev && (prev.type === 'character' || prev.type === 'dialogue' || prev.type === 'parenthetical');
            if (validPredecessor) {
                current.type = 'parenthetical';
                heuristicChanges.push('Converted parenthesized action to parenthetical');
                heuristicChanged = true;
            }
        }
    }

    if (heuristicChanged) {
        totalFixed++;
        changes[current.id] = [...(changes[current.id] || []), ...heuristicChanges];
    }
    
    fixed.push(current);
  }

  // Phase 3: Dual Dialogue Pairing (Existing)
  const dualFixed = fixDualDialoguePairs(fixed);
  if (dualFixed.changed) {
    Object.assign(changes, dualFixed.changes);
    totalFixed += dualFixed.changedCount;
  }

  // Phase 4: Re-sequence
  fixed.forEach((el, index) => {
    if (el.sequence !== index + 1) {
      el.sequence = index + 1;
    }
  });

  return { fixed, totalFixed, changes, removed };
}

/**
 * Fix dual dialogue pairing issues
 * Ensures left/right blocks are correctly paired
 */
function fixDualDialoguePairs(elements: ScriptElement[]): {
  changed: boolean;
  changedCount: number;
  changes: Record<string, string[]>;
} {
  const changes: Record<string, string[]> = {};
  let changedCount = 0;
  let changed = false;

  // Find all dual dialogue elements
  const dualElements = elements.filter(el => el.dual);
  if (dualElements.length === 0) return { changed: false, changedCount: 0, changes: {} };
  
  // Group into blocks (consecutive elements with same dual position)
  const blocks: { position: 'left' | 'right', elements: ScriptElement[] }[] = [];
  let currentBlock: ScriptElement[] = [];
  let currentPosition: 'left' | 'right' | null = null;
  
  for (const element of dualElements) {
    if (element.dual !== currentPosition) {
      // Starting new block
      if (currentBlock.length > 0 && currentPosition) {
        blocks.push({ position: currentPosition, elements: currentBlock });
      }
      currentBlock = [element];
      currentPosition = element.dual!;
    } else {
      // Continue current block
      currentBlock.push(element);
    }
  }
  
  // Push last block
  if (currentBlock.length > 0 && currentPosition) {
    blocks.push({ position: currentPosition, elements: currentBlock });
  }
  
  // Check if blocks alternate left/right
  // If odd number of blocks, remove dual from last block
  if (blocks.length % 2 !== 0) {
    const lastBlock = blocks[blocks.length - 1];
    for (const element of lastBlock.elements) {
      delete element.dual;
      changes[element.id] = changes[element.id] || [];
      changes[element.id].push('Removed unpaired dual dialogue marker');
      changedCount++;
      changed = true;
    }
    blocks.pop(); // Remove from blocks array
  }
  
  // Fix alternating pattern: should be left, right, left, right, ...
  for (let i = 0; i < blocks.length; i++) {
    const expectedPosition = i % 2 === 0 ? 'left' : 'right';
    const block = blocks[i];
    
    if (block.position !== expectedPosition) {
      // Fix the position
      for (const element of block.elements) {
        element.dual = expectedPosition;
        changes[element.id] = changes[element.id] || [];
        changes[element.id].push(`Fixed dual dialogue position to ${expectedPosition}`);
        changedCount++;
        changed = true;
      }
    }
  }

  return { changed, changedCount, changes };
}

/**
 * Generate a summary report of auto-fix results
 */
export function generateAutoFixSummary(result: ReturnType<typeof autoFixElements>): string {
  const lines: string[] = [];
  
  lines.push('AUTO-FIX SUMMARY');
  lines.push('================');
  lines.push(`Total elements fixed: ${result.totalFixed}`);
  lines.push(`Elements removed: ${result.removed.length}`);
  lines.push(`Final element count: ${result.fixed.length}`);
  
  if (result.totalFixed > 0) {
    lines.push('\nChanges made:');
    for (const [elementId, elementChanges] of Object.entries(result.changes)) {
      lines.push(`  Element ${elementId.slice(0, 8)}...`);
      for (const change of elementChanges) {
        lines.push(`    - ${change}`);
      }
    }
  }
  
  if (result.removed.length > 0) {
    lines.push('\nRemoved elements (empty content):');
    for (const id of result.removed) {
      lines.push(`  - ${id.slice(0, 8)}...`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Check if element can be auto-fixed
 * Some issues require manual intervention
 */
export function canAutoFix(issue: ValidationIssue): boolean {
  const autoFixableCodes = [
    'CHARACTER_NOT_UPPERCASE',
    'PARENTHETICAL_FORMAT',
    'EMPTY_CONTENT',
    'DUAL_DIALOGUE_UNPAIRED',
    'SEQUENCE_GAPS'
  ];
  
  return autoFixableCodes.includes(issue.code);
}

/**
 * Get auto-fix suggestions for a validation issue
 */
export function getAutoFixSuggestion(issue: ValidationIssue): string | null {
  switch (issue.code) {
    case 'CHARACTER_NOT_UPPERCASE':
      return 'Convert to uppercase automatically';
    case 'PARENTHETICAL_FORMAT':
      return 'Add parentheses automatically';
    case 'EMPTY_CONTENT':
      return 'Remove empty elements';
    case 'DUAL_DIALOGUE_UNPAIRED':
      return 'Fix dual dialogue pairing';
    case 'SEQUENCE_GAPS':
      return 'Re-sequence all elements';
    default:
      return null;
  }
}
