/**
 * VALIDATION SCHEMAS
 * 
 * Zod schemas that define what "valid" script data looks like.
 * These enforce type safety at runtime and catch corrupted data before it enters the system.
 * 
 * Industry Standard Compliance:
 * - Element types match screenplay format standards
 * - Dual dialogue follows left/right convention
 * - Required fields enforced
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// CORE ELEMENT SCHEMAS
// ═══════════════════════════════════════════════════════════

/**
 * Valid screenplay element types (industry standard)
 */
export const ElementTypeSchema = z.enum([
  'scene_heading',
  'action',
  'character',
  'dialogue',
  'parenthetical',
  'transition'
]);

/**
 * Dual dialogue position (left or right column)
 * Undefined means single-column dialogue
 */
export const DualPositionSchema = z.enum(['left', 'right']).optional();

/**
 * Single Script Element Schema
 * Validates each line/block in a screenplay
 */
export const ScriptElementSchema = z.object({
  id: z.string().uuid('Element ID must be valid UUID'),
  type: ElementTypeSchema,
  content: z.string(),
  sequence: z.number().int().positive('Sequence must be positive integer'),
  
  // Optional fields
  sceneId: z.string().uuid().optional(),
  character: z.string().optional(),
  sceneNumber: z.string().optional(),
  associatedShotIds: z.array(z.string().uuid()).optional(),
  
  // Dual dialogue (standardized as 'left' | 'right' | undefined)
  dual: DualPositionSchema,
  
  // Pagination metadata (added by formatting engine, not user input)
  isContinued: z.boolean().optional(),
  continuesNext: z.boolean().optional(),
  keptTogether: z.boolean().optional()
}).strict(); // Reject unknown fields

/**
 * Array of Script Elements
 */
export const ScriptElementsArraySchema = z.array(ScriptElementSchema);

// ═══════════════════════════════════════════════════════════
// TITLE PAGE SCHEMAS
// ═══════════════════════════════════════════════════════════

/**
 * Title Page Schema (industry standard fields)
 * Matches Final Draft and Fountain specifications
 */
export const TitlePageSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  credit: z.string().optional(),
  authors: z.array(z.string()).optional(),
  source: z.string().optional(),
  draftDate: z.string().optional(),
  draftVersion: z.string().optional(),
  contact: z.string().optional(),
  copyright: z.string().optional(),
  wgaRegistration: z.string().optional(),
  additionalInfo: z.string().optional()
}).strict();

// ═══════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Element Type Guards (for TypeScript type narrowing)
 */
export type ValidElementType = z.infer<typeof ElementTypeSchema>;
export type ValidScriptElement = z.infer<typeof ScriptElementSchema>;
export type ValidTitlePage = z.infer<typeof TitlePageSchema>;

/**
 * Custom validation rules beyond Zod's capabilities
 */
export const customValidationRules = {
  /**
   * Character elements should be uppercase (industry standard)
   */
  characterShouldBeUppercase: (element: ValidScriptElement): boolean => {
    if (element.type !== 'character') return true;
    return element.content === element.content.toUpperCase();
  },

  /**
   * Scene headings should start with INT/EXT/EST/I/E
   */
  sceneHeadingFormat: (element: ValidScriptElement): boolean => {
    if (element.type !== 'scene_heading') return true;
    const pattern = /^(INT\.|EXT\.|EST\.|I\/E|INT |EXT )/i;
    return pattern.test(element.content);
  },

  /**
   * Dual dialogue should come in pairs (left then right)
   */
  dualDialoguePairs: (elements: ValidScriptElement[]): boolean => {
    const dualElements = elements.filter(el => el.dual);
    if (dualElements.length === 0) return true;
    
    // Check alternating left/right pattern
    for (let i = 0; i < dualElements.length - 1; i += 2) {
      const current = dualElements[i];
      const next = dualElements[i + 1];
      
      if (!next) return false; // Odd number, unpaired
      if (current.dual !== 'left' || next.dual !== 'right') return false;
    }
    
    return true;
  },

  /**
   * Parentheticals should be wrapped in ()
   */
  parentheticalFormat: (element: ValidScriptElement): boolean => {
    if (element.type !== 'parenthetical') return true;
    return element.content.startsWith('(') && element.content.endsWith(')');
  },

  /**
   * Sequence numbers should be sequential (no gaps)
   */
  sequentialOrdering: (elements: ValidScriptElement[]): boolean => {
    const sequences = elements.map(el => el.sequence).sort((a, b) => a - b);
    for (let i = 0; i < sequences.length - 1; i++) {
      if (sequences[i + 1] - sequences[i] > 1) return false;
    }
    return true;
  }
};
