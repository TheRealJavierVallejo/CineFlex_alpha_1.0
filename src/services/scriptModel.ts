/**
 * SCRIPT MODEL
 * Safe wrapper for script data with validation and immutability
 * Single source of truth for script manipulation
 */

import { ScriptElement, TitlePageData } from '../types';
import {
  validateScript,
  ValidationResult,
  quickValidate,
} from './validation/scriptValidator';
import {
  ValidatedScriptElement,
  ValidatedTitlePage,
  ValidationOptions,
} from './validation/schemas';
import { ValidationReport } from './validation/validationReport';

export interface ScriptModelOptions {
  validateOnCreate?: boolean;
  validateOnMutate?: boolean;
  autoFix?: boolean;
  context?: string;
}

const DEFAULT_OPTIONS: ScriptModelOptions = {
  validateOnCreate: true,
  validateOnMutate: true,
  autoFix: true,
  context: 'ScriptModel',
};

/**
 * ScriptModel: Immutable container for script data
 * All mutations return new instances
 */
export class ScriptModel {
  private readonly _elements: ReadonlyArray<ValidatedScriptElement>;
  private readonly _titlePage: Readonly<ValidatedTitlePage> | undefined;
  private readonly _validationReport: ValidationReport;
  private readonly _version: string = '1.0';
  private readonly _options: ScriptModelOptions;

  constructor(
    elements: ScriptElement[],
    titlePage?: TitlePageData,
    options: ScriptModelOptions = {}
  ) {
    this._options = { ...DEFAULT_OPTIONS, ...options };

    if (this._options.validateOnCreate) {
      // Validate and store
      const result = validateScript(
        elements,
        titlePage,
        {
          mode: 'lenient',
          autoFix: this._options.autoFix ?? true,
          context: this._options.context,
        }
      );

      this._elements = Object.freeze(result.elements);
      this._titlePage = result.titlePage ? Object.freeze(result.titlePage) : undefined;
      this._validationReport = result.report;

      // Log validation issues if any
      if (result.report.issues.length > 0) {
        console.warn(
          `[ScriptModel] Validation issues found:`,
          result.report.issues
        );
      }
    } else {
      // Skip validation (for performance in trusted contexts)
      this._elements = Object.freeze(elements as ValidatedScriptElement[]);
      this._titlePage = titlePage ? Object.freeze(titlePage as ValidatedTitlePage) : undefined;
      this._validationReport = {
        valid: true,
        confidence: 1.0,
        totalElements: elements.length,
        validElements: elements.length,
        issues: [],
        context: 'Unvalidated',
        timestamp: Date.now(),
      };
    }
  }

  // --- GETTERS (Immutable) ---

  getElements(): ReadonlyArray<ValidatedScriptElement> {
    return this._elements;
  }

  getTitlePage(): Readonly<ValidatedTitlePage> | undefined {
    return this._titlePage;
  }

  getValidationReport(): ValidationReport {
    return this._validationReport;
  }

  getVersion(): string {
    return this._version;
  }

  isValid(): boolean {
    return this._validationReport.valid;
  }

  getConfidence(): number {
    return this._validationReport.confidence;
  }

  getElementCount(): number {
    return this._elements.length;
  }

  getElementById(id: string): ValidatedScriptElement | undefined {
    return this._elements.find(el => el.id === id);
  }

  getElementByIndex(index: number): ValidatedScriptElement | undefined {
    return this._elements[index];
  }

  getElementsByType(type: ScriptElement['type']): ValidatedScriptElement[] {
    return this._elements.filter(el => el.type === type);
  }

  getSceneHeadings(): ValidatedScriptElement[] {
    return this.getElementsByType('scene_heading');
  }

  // --- MUTATIONS (Return new instances) ---

  /**
   * Insert element at specific index
   */
  insertElement(index: number, element: ScriptElement): ScriptModel {
    const newElements = [...this._elements];
    newElements.splice(index, 0, element as ValidatedScriptElement);
    
    // Re-sequence
    this.resequence(newElements);
    
    return new ScriptModel(newElements, this._titlePage, this._options);
  }

  /**
   * Update element by ID
   */
  updateElement(id: string, changes: Partial<ScriptElement>): ScriptModel {
    const newElements = this._elements.map(el => {
      if (el.id === id) {
        return { ...el, ...changes };
      }
      return el;
    });

    return new ScriptModel(newElements, this._titlePage, this._options);
  }

  /**
   * Update element by index
   */
  updateElementByIndex(index: number, changes: Partial<ScriptElement>): ScriptModel {
    const newElements = [...this._elements];
    if (index >= 0 && index < newElements.length) {
      newElements[index] = { ...newElements[index], ...changes };
    }

    return new ScriptModel(newElements, this._titlePage, this._options);
  }

  /**
   * Delete element by ID
   */
  deleteElement(id: string): ScriptModel {
    const newElements = this._elements.filter(el => el.id !== id);
    this.resequence(newElements);

    return new ScriptModel(newElements, this._titlePage, this._options);
  }

  /**
   * Delete element by index
   */
  deleteElementByIndex(index: number): ScriptModel {
    const newElements = this._elements.filter((_, i) => i !== index);
    this.resequence(newElements);

    return new ScriptModel(newElements, this._titlePage, this._options);
  }

  /**
   * Append element to end
   */
  appendChild(element: ScriptElement): ScriptModel {
    const newElements = [...this._elements, element as ValidatedScriptElement];
    this.resequence(newElements);

    return new ScriptModel(newElements, this._titlePage, this._options);
  }

  /**
   * Replace all elements
   */
  replaceElements(elements: ScriptElement[]): ScriptModel {
    return new ScriptModel(elements, this._titlePage, this._options);
  }

  /**
   * Update title page
   */
  updateTitlePage(titlePage: Partial<TitlePageData>): ScriptModel {
    const merged = { ...this._titlePage, ...titlePage };
    return new ScriptModel(this._elements as ScriptElement[], merged, this._options);
  }

  /**
   * Move element from one index to another
   */
  moveElement(fromIndex: number, toIndex: number): ScriptModel {
    const newElements = [...this._elements];
    const [removed] = newElements.splice(fromIndex, 1);
    newElements.splice(toIndex, 0, removed);
    this.resequence(newElements);

    return new ScriptModel(newElements, this._titlePage, this._options);
  }

  // --- HELPERS ---

  private resequence(elements: any[]): void {
    elements.forEach((el, index) => {
      el.sequence = index + 1;
    });
  }

  /**
   * Convert back to plain objects (for storage/export)
   */
  toJSON(): { elements: ScriptElement[]; titlePage?: TitlePageData } {
    return {
      elements: this._elements.map(el => ({ ...el })),
      titlePage: this._titlePage ? { ...this._titlePage } : undefined,
    };
  }

  /**
   * Create from JSON (for loading)
   */
  static fromJSON(
    data: { elements: ScriptElement[]; titlePage?: TitlePageData },
    options?: ScriptModelOptions
  ): ScriptModel {
    return new ScriptModel(data.elements, data.titlePage, options);
  }

  /**
   * Clone with same validation settings
   */
  clone(): ScriptModel {
    return new ScriptModel(
      this._elements as ScriptElement[],
      this._titlePage,
      this._options
    );
  }

  /**
   * Get summary stats
   */
  getStats(): {
    totalElements: number;
    sceneHeadings: number;
    dialogue: number;
    action: number;
    characters: number;
    pages: number; // Estimate
  } {
    const sceneHeadings = this._elements.filter(el => el.type === 'scene_heading').length;
    const dialogue = this._elements.filter(el => el.type === 'dialogue').length;
    const action = this._elements.filter(el => el.type === 'action').length;
    const characters = this._elements.filter(el => el.type === 'character').length;
    
    // Rough estimate: 54 lines per page, avg 2 lines per element
    const estimatedPages = Math.ceil((this._elements.length * 2) / 54);

    return {
      totalElements: this._elements.length,
      sceneHeadings,
      dialogue,
      action,
      characters,
      pages: estimatedPages,
    };
  }
}

/**
 * Factory function for common use cases
 */
export function createScriptModel(
  elements: ScriptElement[],
  titlePage?: TitlePageData,
  options?: ScriptModelOptions
): ScriptModel {
  return new ScriptModel(elements, titlePage, options);
}

/**
 * Create empty script
 */
export function createEmptyScript(): ScriptModel {
  return new ScriptModel([], undefined, { validateOnCreate: false });
}
