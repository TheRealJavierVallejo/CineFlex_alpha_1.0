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
 * Auto-fix a single element
 * Returns the fixed element and list of changes made
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

  // Fix 7: Remove pagination metadata (will be recalculated)
  if (fixed.isContinued !== undefined || fixed.continuesNext !== undefined || fixed.keptTogether !== undefined) {
    delete fixed.isContinued;
    delete fixed.continuesNext;
    delete fixed.keptTogether;
    changes.push('Removed stale pagination data');
    changed = true;
  }

  return { fixed, changed, changes };
}

/**
 * Auto-fix an array of elements
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

  for (const element of elements) {
    const result = autoFixElement(element);
    
    // Check if marked for removal
    if (result.fixed.content === '[EMPTY - REMOVE]') {
      removed.push(element.id);
      continue; // Don't include in fixed array
    }
    
    fixed.push(result.fixed);
    
    if (result.changed) {
      totalFixed++;
      changes[element.id] = result.changes;
    }
  }

  // Fix dual dialogue pairing
  const dualFixed = fixDualDialoguePairs(fixed);
  if (dualFixed.changed) {
    Object.assign(changes, dualFixed.changes);
    totalFixed += dualFixed.changedCount;
  }

  // Re-sequence elements
  fixed.forEach((el, index) => {
    if (el.sequence !== index + 1) {
      el.sequence = index + 1;
    }
  });

  return { fixed, totalFixed, changes, removed };
}

/**
 * Fix dual dialogue pairing issues
 * Ensures left/right pairs are correct
 */
function fixDualDialoguePairs(elements: ScriptElement[]): {
  changed: boolean;
  changedCount: number;
  changes: Record<string, string[]>;
} {
  const changes: Record<string, string[]> = {};
  let changedCount = 0;
  let changed = false;

  const dualElements = elements.filter(el => el.dual);
  
  // Process in pairs
  for (let i = 0; i < dualElements.length - 1; i += 2) {
    const left = dualElements[i];
    const right = dualElements[i + 1];

    // If unpaired (odd number), remove dual from last one
    if (!right && left.dual) {
      delete left.dual;
      changes[left.id] = ['Removed unpaired dual dialogue marker'];
      changedCount++;
      changed = true;
      continue;
    }

    // Ensure proper left/right order
    if (left.dual !== 'left') {
      left.dual = 'left';
      changes[left.id] = changes[left.id] || [];
      changes[left.id].push('Fixed dual dialogue position to left');
      changedCount++;
      changed = true;
    }

    if (right && right.dual !== 'right') {
      right.dual = 'right';
      changes[right.id] = changes[right.id] || [];
      changes[right.id].push('Fixed dual dialogue position to right');
      changedCount++;
      changed = true;
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