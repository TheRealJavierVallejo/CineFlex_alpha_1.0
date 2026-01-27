/**
 * SCRIPT VALIDATOR
 * Main validation engine for script data
 * Provides validation, auto-fixing, and detailed reporting
 */

import { ScriptElement, TitlePageData } from '../../types';
import {
  validateScriptElement,
  validateScriptElements,
  validateTitlePage,
  ValidationOptions,
  DEFAULT_VALIDATION_OPTIONS,
  ValidatedScriptElement,
  ValidatedTitlePage,
} from './schemas';
import {
  ValidationReport,
  ValidationReportBuilder,
} from './validationReport';

export interface ValidationResult {
  valid: boolean;
  elements: ValidatedScriptElement[];
  titlePage?: ValidatedTitlePage;
  report: ValidationReport;
}

/**
 * Main validation function for complete scripts
 */
export function validateScript(
  elements: unknown[],
  titlePage?: unknown,
  options: Partial<ValidationOptions> = {}
): ValidationResult {
  const opts: ValidationOptions = {
    ...DEFAULT_VALIDATION_OPTIONS,
    ...options,
  };

  const reportBuilder = new ValidationReportBuilder(opts.context || 'Script Validation');
  reportBuilder.setTotalElements(elements.length);

  // Validate elements
  const validatedElements: ValidatedScriptElement[] = [];
  const fixedElements: ValidatedScriptElement[] = [];

  elements.forEach((el, index) => {
    try {
      let validated = validateScriptElement(el, opts);
      
      // Auto-fix if enabled
      if (opts.autoFix) {
        validated = autoFixElement(validated, reportBuilder, index);
      }
      
      validatedElements.push(validated);
    } catch (error) {
      reportBuilder.addError(
        error instanceof Error ? error.message : String(error),
        (el as any)?.id,
        index,
        undefined,
        'Check element structure and types'
      );
    }
  });

  reportBuilder.setValidElements(validatedElements.length);

  // Validate title page if provided
  let validatedTitlePage: ValidatedTitlePage | undefined;
  if (titlePage) {
    try {
      validatedTitlePage = validateTitlePage(titlePage, opts);
    } catch (error) {
      reportBuilder.addWarning(
        `Title page validation failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        undefined,
        undefined,
        'Review title page data structure'
      );
    }
  }

  // Check for logical issues
  performLogicalValidation(validatedElements, reportBuilder);

  const report = reportBuilder.build();

  return {
    valid: report.valid,
    elements: validatedElements,
    titlePage: validatedTitlePage,
    report,
  };
}

/**
 * Auto-fix common issues in elements
 */
function autoFixElement(
  element: ValidatedScriptElement,
  reportBuilder: ValidationReportBuilder,
  index: number
): ValidatedScriptElement {
  let fixed = { ...element };
  let hadFixes = false;

  // Fix: Remove trailing/leading whitespace from content
  if (fixed.content !== fixed.content.trim()) {
    fixed.content = fixed.content.trim();
    hadFixes = true;
  }

  // Fix: Normalize scene headings to uppercase
  if (fixed.type === 'scene_heading' && fixed.content !== fixed.content.toUpperCase()) {
    fixed.content = fixed.content.toUpperCase();
    hadFixes = true;
  }

  // Fix: Normalize character names to uppercase
  if (fixed.type === 'character' && fixed.content !== fixed.content.toUpperCase()) {
    // But preserve (CONT'D) and other parentheticals
    const parts = fixed.content.split(' ');
    const normalizedParts = parts.map(part => {
      if (part.startsWith('(') && part.endsWith(')')) {
        return part; // Keep parentheticals as-is
      }
      return part.toUpperCase();
    });
    fixed.content = normalizedParts.join(' ');
    hadFixes = true;
  }

  // Fix: Remove dual dialogue caret from content if it exists
  if (fixed.type === 'character' && fixed.content.trim().endsWith('^')) {
    fixed.content = fixed.content.replace(/\s*\^\s*$/, '').trim();
    if (!fixed.dual) {
      fixed.dual = 'left'; // Assume left if caret found but not marked
    }
    hadFixes = true;
  }

  // Fix: Ensure dialogue has character reference
  if ((fixed.type === 'dialogue' || fixed.type === 'parenthetical') && !fixed.character) {
    reportBuilder.addWarning(
      `${fixed.type} element missing character reference`,
      fixed.id,
      index,
      'character',
      'This will be auto-linked when script is processed'
    );
  }

  if (hadFixes) {
    reportBuilder.addInfo(
      `Auto-fixed formatting for ${fixed.type} element`,
      fixed.id,
      index
    );
  }

  return fixed;
}

/**
 * Perform logical validation (structure, relationships)
 */
function performLogicalValidation(
  elements: ValidatedScriptElement[],
  reportBuilder: ValidationReportBuilder
): void {
  let activeCharacter: string | null = null;
  let lastType: string | null = null;
  let dialogueCount = 0;
  let sceneHeadingCount = 0;

  elements.forEach((el, index) => {
    // Track character context
    if (el.type === 'character') {
      activeCharacter = el.content;
      dialogueCount = 0;
    }

    // Check dialogue follows character
    if (el.type === 'dialogue') {
      dialogueCount++;
      if (!activeCharacter && !el.character) {
        reportBuilder.addWarning(
          'Dialogue without preceding character',
          el.id,
          index,
          undefined,
          'Add CHARACTER element before dialogue'
        );
      }
    }

    // Check parenthetical placement
    if (el.type === 'parenthetical') {
      if (lastType !== 'character' && lastType !== 'dialogue') {
        reportBuilder.addWarning(
          'Parenthetical not following character or dialogue',
          el.id,
          index
        );
      }
    }

    // Track scene headings
    if (el.type === 'scene_heading') {
      sceneHeadingCount++;
    }

    // Reset character context on non-dialogue elements
    if (el.type !== 'dialogue' && el.type !== 'parenthetical' && el.type !== 'character') {
      activeCharacter = null;
    }

    lastType = el.type;
  });

  // Overall script checks
  if (sceneHeadingCount === 0) {
    reportBuilder.addWarning(
      'Script contains no scene headings',
      undefined,
      undefined,
      undefined,
      'Add scene headings to structure your script'
    );
  }

  if (elements.length === 0) {
    reportBuilder.addError(
      'Script is empty',
      undefined,
      undefined,
      undefined,
      'Import or create script content'
    );
  }
}

/**
 * Quick validation - just checks if elements are valid, returns boolean
 */
export function quickValidate(elements: unknown[]): boolean {
  try {
    validateScriptElements(elements, { mode: 'strict', autoFix: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and return only valid elements (filters out invalid)
 */
export function validateAndFilter(
  elements: unknown[],
  onInvalid?: (index: number, error: string) => void
): ValidatedScriptElement[] {
  const valid: ValidatedScriptElement[] = [];

  elements.forEach((el, index) => {
    try {
      const validated = validateScriptElement(el, {
        mode: 'lenient',
        autoFix: false,
      });
      valid.push(validated);
    } catch (error) {
      if (onInvalid) {
        onInvalid(index, error instanceof Error ? error.message : String(error));
      }
    }
  });

  return valid;
}
