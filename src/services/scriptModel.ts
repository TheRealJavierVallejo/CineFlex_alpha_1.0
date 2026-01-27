/**
 * SCRIPT MODEL
 * 
 * The "Safe Container" - wraps script data and enforces validation.
 * All script modifications should go through this class.
 * 
 * Think of this like a vault:
 * - Data goes in through validation
 * - Data comes out validated
 * - Mutations are controlled and tracked
 * - Format consistency is guaranteed
 * 
 * Usage:
 *   const model = ScriptModel.create(elements, titlePage);
 *   model.insertElement(5, newElement); // Validated insertion
 *   const validated = model.getElements(); // Always valid
 */

import { ScriptElement, TitlePageData } from '../types';
import {
  validateScriptElements,
  validateScriptElement,
  validateTitlePage,
  ValidScriptElement,
  ValidationReport,
  formatReportForConsole
} from './validation/scriptValidator';

/**
 * Options for creating a ScriptModel
 */
export interface ScriptModelOptions {
  strict?: boolean; // If true, throws on validation errors. If false, filters invalid elements.
  logValidation?: boolean; // If true, logs validation report to console
}

/**
 * Immutable script data model with validation
 */
export class ScriptModel {
  private readonly elements: ReadonlyArray<ValidScriptElement>;
  private readonly titlePage: Readonly<TitlePageData>;
  private readonly validationReport: ValidationReport;
  private readonly version: string = '1.0';

  private constructor(
    elements: ValidScriptElement[],
    titlePage: TitlePageData,
    validationReport: ValidationReport
  ) {
    this.elements = Object.freeze([...elements]);
    this.titlePage = Object.freeze({ ...titlePage });
    this.validationReport = validationReport;
  }

  // ═══════════════════════════════════════════════════════════
  // FACTORY METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Create a ScriptModel from raw script elements
   * Validates and sanitizes input
   */
  static create(
    elements: ScriptElement[],
    titlePage?: TitlePageData,
    options: ScriptModelOptions = {}
  ): ScriptModel {
    const { strict = false, logValidation = false } = options;

    // Validate elements
    const report = validateScriptElements(elements);

    if (logValidation) {
      console.log(formatReportForConsole(report));
    }

    if (strict && !report.valid) {
      throw new Error(
        `Script validation failed: ${report.summary.errors} errors found. ` +
        `Set strict: false to filter invalid elements instead.`
      );
    }

    // Filter out only valid elements
    const validElements: ValidScriptElement[] = [];
    for (const element of elements) {
      const result = validateScriptElement(element);
      if (result.valid && result.element) {
        validElements.push(result.element);
      }
    }

    // Validate title page
    const titlePageResult = validateTitlePage(titlePage);
    const validTitlePage: TitlePageData = titlePage || {};

    return new ScriptModel(validElements, validTitlePage, report);
  }

  /**
   * Create an empty ScriptModel
   */
  static createEmpty(): ScriptModel {
    return ScriptModel.create([], {});
  }

  // ═══════════════════════════════════════════════════════════
  // IMMUTABLE GETTERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Get all elements (immutable)
   */
  getElements(): ReadonlyArray<ValidScriptElement> {
    return this.elements;
  }

  /**
   * Get title page (immutable)
   */
  getTitlePage(): Readonly<TitlePageData> {
    return this.titlePage;
  }

  /**
   * Get validation report
   */
  getValidationReport(): ValidationReport {
    return this.validationReport;
  }

  /**
   * Get element by ID
   */
  getElementById(id: string): ValidScriptElement | undefined {
    return this.elements.find(el => el.id === id);
  }

  /**
   * Get element by sequence number
   */
  getElementBySequence(sequence: number): ValidScriptElement | undefined {
    return this.elements.find(el => el.sequence === sequence);
  }

  /**
   * Get elements by type
   */
  getElementsByType(type: ValidScriptElement['type']): ValidScriptElement[] {
    return this.elements.filter(el => el.type === type);
  }

  /**
   * Get total element count
   */
  getElementCount(): number {
    return this.elements.length;
  }

  /**
   * Check if model is valid (no errors)
   */
  isValid(): boolean {
    return this.validationReport.valid;
  }

  /**
   * Get confidence score (0.0 to 1.0)
   */
  getConfidence(): number {
    return this.validationReport.confidence;
  }

  // ═══════════════════════════════════════════════════════════
  // MUTATIONS (return new ScriptModel)
  // ═══════════════════════════════════════════════════════════

  /**
   * Insert element at specific index
   * Returns new ScriptModel (immutable)
   */
  insertElement(
    index: number,
    element: ScriptElement,
    options?: ScriptModelOptions
  ): ScriptModel {
    const newElements = [...this.elements];
    newElements.splice(index, 0, element as ValidScriptElement);
    
    // Re-sequence
    this.resequenceElements(newElements);
    
    return ScriptModel.create(newElements as ScriptElement[], this.titlePage as TitlePageData, options);
  }

  /**
   * Update element by ID
   * Returns new ScriptModel (immutable)
   */
  updateElement(
    id: string,
    changes: Partial<ScriptElement>,
    options?: ScriptModelOptions
  ): ScriptModel {
    const newElements = this.elements.map(el => {
      if (el.id === id) {
        return { ...el, ...changes };
      }
      return el;
    });
    
    return ScriptModel.create(newElements as ScriptElement[], this.titlePage as TitlePageData, options);
  }

  /**
   * Delete element by ID
   * Returns new ScriptModel (immutable)
   */
  deleteElement(id: string, options?: ScriptModelOptions): ScriptModel {
    const newElements = this.elements.filter(el => el.id !== id);
    
    // Re-sequence
    this.resequenceElements(newElements as ValidScriptElement[]);
    
    return ScriptModel.create(newElements as ScriptElement[], this.titlePage as TitlePageData, options);
  }

  /**
   * Replace all elements
   * Returns new ScriptModel (immutable)
   */
  replaceElements(
    elements: ScriptElement[],
    options?: ScriptModelOptions
  ): ScriptModel {
    return ScriptModel.create(elements, this.titlePage as TitlePageData, options);
  }

  /**
   * Update title page
   * Returns new ScriptModel (immutable)
   */
  updateTitlePage(
    changes: Partial<TitlePageData>,
    options?: ScriptModelOptions
  ): ScriptModel {
    const newTitlePage = { ...this.titlePage, ...changes };
    return ScriptModel.create(this.elements as ScriptElement[], newTitlePage, options);
  }

  // ═══════════════════════════════════════════════════════════
  // SERIALIZATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Convert to plain object for storage
   */
  toJSON(): {
    elements: ScriptElement[];
    titlePage: TitlePageData;
    version: string;
    validationReport: ValidationReport;
  } {
    return {
      elements: [...this.elements] as ScriptElement[],
      titlePage: { ...this.titlePage },
      version: this.version,
      validationReport: this.validationReport
    };
  }

  /**
   * Create from stored JSON
   */
  static fromJSON(json: ReturnType<ScriptModel['toJSON']>, options?: ScriptModelOptions): ScriptModel {
    return ScriptModel.create(json.elements, json.titlePage, options);
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Re-sequence elements to be sequential starting from 1
   * Mutates array in place for performance
   */
  private resequenceElements(elements: ValidScriptElement[]): void {
    elements.forEach((el, index) => {
      (el as any).sequence = index + 1;
    });
  }
}
