/**
 * SCRIPT VALIDATOR
 * 
 * The "Bouncer" - validates all script data before it enters the system.
 * Catches corrupted data, malformed elements, and formatting issues.
 * 
 * Usage:
 *   const report = validateScriptElements(elements);
 *   if (!report.valid) {
 *     console.error('Validation failed:', report);
 *   }
 */

import { z } from 'zod';
import { ScriptElement, TitlePageData } from '../../types';
import {
  ScriptElementSchema,
  ScriptElementsArraySchema,
  TitlePageSchema,
  ValidScriptElement,
  customValidationRules
} from './schemas';
import {
  ValidationReport,
  ValidationIssue,
  createEmptyReport,
  createIssue,
  calculateConfidence
} from './validationReport';

// ═══════════════════════════════════════════════════════════
// SINGLE ELEMENT VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate a single script element
 * Returns detailed validation result
 */
export function validateScriptElement(
  element: unknown
): { valid: boolean; element?: ValidScriptElement; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  
  try {
    // Zod schema validation
    const validated = ScriptElementSchema.parse(element);
    
    // Custom validation rules (warnings, not errors)
    if (!customValidationRules.characterShouldBeUppercase(validated)) {
      issues.push(
        createIssue(
          'warning',
          'CHARACTER_NOT_UPPERCASE',
          'Character names should be uppercase',
          validated,
          'Convert to uppercase for industry standard formatting'
        )
      );
    }
    
    if (!customValidationRules.sceneHeadingFormat(validated)) {
      issues.push(
        createIssue(
          'warning',
          'SCENE_HEADING_FORMAT',
          'Scene heading should start with INT./EXT./EST./I/E',
          validated,
          'Check if this is really a scene heading or should be action'
        )
      );
    }
    
    if (!customValidationRules.parentheticalFormat(validated)) {
      issues.push(
        createIssue(
          'warning',
          'PARENTHETICAL_FORMAT',
          'Parenthetical should be wrapped in ()',
          validated,
          'Add parentheses around the text'
        )
      );
    }
    
    // Empty content check (warning)
    if (!validated.content || validated.content.trim().length === 0) {
      issues.push(
        createIssue(
          'warning',
          'EMPTY_CONTENT',
          'Element has no content',
          validated,
          'Remove empty element or add content'
        )
      );
    }
    
    return { valid: true, element: validated, issues };
  } catch (error) {
    // Zod validation failed - this is an error, not warning
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        issues.push({
          severity: 'error',
          code: 'SCHEMA_VALIDATION_FAILED',
          message: issue.message,
          elementId: (element as any)?.id,
          elementSequence: (element as any)?.sequence,
          elementType: (element as any)?.type,
          context: { zodIssue: issue, element }
        });
      }
    } else {
      issues.push({
        severity: 'error',
        code: 'UNKNOWN_VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        context: { error, element }
      });
    }
    
    return { valid: false, issues };
  }
}

// ═══════════════════════════════════════════════════════════
// ARRAY VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate an array of script elements
 * Returns comprehensive validation report
 */
export function validateScriptElements(elements: ScriptElement[]): ValidationReport {
  const report = createEmptyReport();
  report.totalElements = elements.length;
  
  if (elements.length === 0) {
    report.issues.push({
      severity: 'info',
      code: 'EMPTY_SCRIPT',
      message: 'Script has no elements'
    });
    report.summary.info++;
    return report;
  }
  
  const validElements: ValidScriptElement[] = [];
  
  // Validate each element
  for (const element of elements) {
    const result = validateScriptElement(element);
    
    if (result.valid && result.element) {
      validElements.push(result.element);
      report.validElements++;
    }
    
    // Collect issues
    for (const issue of result.issues) {
      report.issues.push(issue);
      report.summary[issue.severity === 'error' ? 'errors' : issue.severity === 'warning' ? 'warnings' : 'info']++;
    }
  }
  
  // Cross-element validation (only if we have valid elements)
  if (validElements.length > 0) {
    // Check dual dialogue pairs
    if (!customValidationRules.dualDialoguePairs(validElements)) {
      report.issues.push({
        severity: 'error',
        code: 'DUAL_DIALOGUE_UNPAIRED',
        message: 'Dual dialogue elements are not properly paired (should be left then right)',
        suggestion: 'Ensure dual dialogue comes in left/right pairs'
      });
      report.summary.errors++;
    }
    
    // Check sequence ordering
    if (!customValidationRules.sequentialOrdering(validElements)) {
      report.issues.push({
        severity: 'warning',
        code: 'SEQUENCE_GAPS',
        message: 'Sequence numbers have gaps (non-sequential)',
        suggestion: 'Re-sequence elements to remove gaps'
      });
      report.summary.warnings++;
    }
    
    // Check for duplicate IDs
    const ids = validElements.map(el => el.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      report.issues.push({
        severity: 'error',
        code: 'DUPLICATE_IDS',
        message: 'Multiple elements share the same ID',
        suggestion: 'Regenerate UUIDs for duplicate elements'
      });
      report.summary.errors++;
    }
  }
  
  // Determine overall validity (errors make it invalid, warnings don't)
  report.valid = report.summary.errors === 0;
  
  // Calculate confidence score
  report.confidence = calculateConfidence(report.issues, report.totalElements);
  
  report.timestamp = Date.now();
  
  return report;
}

// ═══════════════════════════════════════════════════════════
// TITLE PAGE VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate title page data
 */
export function validateTitlePage(
  titlePage: TitlePageData | undefined
): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  
  if (!titlePage) {
    issues.push({
      severity: 'info',
      code: 'NO_TITLE_PAGE',
      message: 'Script has no title page'
    });
    return { valid: true, issues }; // Not an error, just info
  }
  
  try {
    TitlePageSchema.parse(titlePage);
    
    // Warn if missing recommended fields
    if (!titlePage.title) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_TITLE',
        message: 'Title page has no title',
        suggestion: 'Add a title to your script'
      });
    }
    
    if (!titlePage.authors || titlePage.authors.length === 0) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_AUTHORS',
        message: 'Title page has no authors',
        suggestion: 'Add author names'
      });
    }
    
    return { valid: true, issues };
  } catch (error) {
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        issues.push({
          severity: 'error',
          code: 'TITLE_PAGE_SCHEMA_ERROR',
          message: issue.message,
          context: { zodIssue: issue, titlePage }
        });
      }
    }
    return { valid: false, issues };
  }
}

// ═══════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════

export * from './schemas';
export * from './validationReport';
