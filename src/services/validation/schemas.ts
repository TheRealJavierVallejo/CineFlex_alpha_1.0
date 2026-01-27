/**
 * VALIDATION SCHEMAS
 * Runtime validation for script data using Zod
 * Ensures data integrity at all system boundaries
 */

import { z } from 'zod';

// --- SCRIPT ELEMENT SCHEMA ---
export const ScriptElementSchema = z.object({
  id: z.string().uuid('Element ID must be valid UUID'),
  type: z.enum(
    ['scene_heading', 'action', 'dialogue', 'character', 'parenthetical', 'transition'],
    { errorMap: () => ({ message: 'Invalid element type' }) }
  ),
  content: z.string().min(0, 'Content cannot be null'),
  sequence: z.number().int().positive('Sequence must be positive integer'),
  sceneId: z.string().uuid().optional(),
  character: z.string().optional(),
  associatedShotIds: z.array(z.string().uuid()).optional(),
  
  // Dual dialogue: must be 'left' or 'right' if present
  dual: z.enum(['left', 'right']).optional(),
  
  // Scene numbers
  sceneNumber: z.string().optional(),
  
  // Pagination metadata (calculated, not user-provided)
  isContinued: z.boolean().optional(),
  continuesNext: z.boolean().optional(),
  keptTogether: z.boolean().optional(),
}).strict(); // Reject unknown fields

export type ValidatedScriptElement = z.infer<typeof ScriptElementSchema>;

// --- TITLE PAGE SCHEMA ---
export const TitlePageSchema = z.object({
  title: z.string().optional(),
  authors: z.array(z.string()).optional(),
  credit: z.string().optional(),
  source: z.string().optional(),
  draftDate: z.string().optional(),
  draftVersion: z.string().optional(),
  contact: z.string().optional(),
  copyright: z.string().optional(),
  wgaRegistration: z.string().optional(),
  additionalInfo: z.string().optional(),
}).strict();

export type ValidatedTitlePage = z.infer<typeof TitlePageSchema>;

// --- VALIDATION OPTIONS ---
export interface ValidationOptions {
  // Strict mode throws on warnings, lenient mode only logs
  mode: 'strict' | 'lenient';
  
  // Auto-fix common issues
  autoFix: boolean;
  
  // Context for better error messages
  context?: string; // e.g., "PDF Import", "Manual Edit"
}

export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  mode: 'lenient',
  autoFix: false,
  context: 'Unknown',
};

// --- VALIDATION HELPERS ---

/**
 * Validates a single script element
 */
export function validateScriptElement(
  element: unknown,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
): ValidatedScriptElement {
  try {
    return ScriptElementSchema.parse(element);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const context = options.context ? `[${options.context}] ` : '';
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`${context}Script element validation failed: ${details}`);
    }
    throw error;
  }
}

/**
 * Validates an array of script elements
 */
export function validateScriptElements(
  elements: unknown[],
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
): ValidatedScriptElement[] {
  const validated: ValidatedScriptElement[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  
  elements.forEach((el, index) => {
    try {
      validated.push(validateScriptElement(el, options));
    } catch (error) {
      errors.push({
        index,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  
  if (errors.length > 0 && options.mode === 'strict') {
    throw new Error(
      `Validation failed for ${errors.length} elements:\n` +
      errors.map(e => `  Element ${e.index}: ${e.error}`).join('\n')
    );
  }
  
  return validated;
}

/**
 * Validates title page
 */
export function validateTitlePage(
  titlePage: unknown,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS
): ValidatedTitlePage {
  try {
    return TitlePageSchema.parse(titlePage || {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      const context = options.context ? `[${options.context}] ` : '';
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`${context}Title page validation failed: ${details}`);
    }
    throw error;
  }
}
