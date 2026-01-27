/**
 * VALIDATION SYSTEM TESTS
 * 
 * Tests for the validation layer to ensure:
 * - Valid elements pass validation
 * - Invalid elements are caught
 * - Custom rules are enforced
 * - Reports are accurate
 */

import { describe, it, expect } from 'vitest';
import {
  validateScriptElement,
  validateScriptElements,
  validateTitlePage,
  customValidationRules
} from '../validation/scriptValidator';
import { ScriptElement } from '../../types';

describe('Validation System', () => {
  describe('Single Element Validation', () => {
    it('should validate correct scene heading', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'scene_heading',
        content: 'INT. COFFEE SHOP - DAY',
        sequence: 1
      };

      const result = validateScriptElement(element);
      expect(result.valid).toBe(true);
      expect(result.element).toBeDefined();
    });

    it('should validate correct action', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'action',
        content: 'John walks into the room.',
        sequence: 1
      };

      const result = validateScriptElement(element);
      expect(result.valid).toBe(true);
    });

    it('should validate correct dialogue', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'dialogue',
        content: 'I never saw it coming.',
        sequence: 1,
        character: 'JOHN'
      };

      const result = validateScriptElement(element);
      expect(result.valid).toBe(true);
    });

    it('should reject element without ID', () => {
      const element = {
        type: 'action',
        content: 'Test',
        sequence: 1
      } as any;

      const result = validateScriptElement(element);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should reject element without type', () => {
      const element = {
        id: crypto.randomUUID(),
        content: 'Test',
        sequence: 1
      } as any;

      const result = validateScriptElement(element);
      expect(result.valid).toBe(false);
    });

    it('should reject element with invalid UUID', () => {
      const element = {
        id: 'not-a-uuid',
        type: 'action',
        content: 'Test',
        sequence: 1
      } as any;

      const result = validateScriptElement(element);
      expect(result.valid).toBe(false);
    });

    it('should warn on empty content', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'action',
        content: '',
        sequence: 1
      };

      const result = validateScriptElement(element);
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.issues.some(i => i.code === 'EMPTY_CONTENT')).toBe(true);
    });
  });

  describe('Custom Validation Rules', () => {
    it('should check character name is uppercase', () => {
      const uppercase: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'character',
        content: 'JOHN',
        sequence: 1
      };

      const lowercase: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'character',
        content: 'john',
        sequence: 2
      };

      expect(customValidationRules.characterShouldBeUppercase(uppercase as any)).toBe(true);
      expect(customValidationRules.characterShouldBeUppercase(lowercase as any)).toBe(false);
    });

    it('should check scene heading format', () => {
      const validHeadings = [
        'INT. ROOM - DAY',
        'EXT. STREET - NIGHT',
        'EST. BUILDING - DAY',
        'I/E CAR - MORNING'
      ];

      const invalidHeadings = [
        'This is just action',
        'INSIDE THE ROOM'
      ];

      for (const content of validHeadings) {
        const el: ScriptElement = {
          id: crypto.randomUUID(),
          type: 'scene_heading',
          content,
          sequence: 1
        };
        expect(customValidationRules.sceneHeadingFormat(el as any)).toBe(true);
      }

      for (const content of invalidHeadings) {
        const el: ScriptElement = {
          id: crypto.randomUUID(),
          type: 'scene_heading',
          content,
          sequence: 1
        };
        expect(customValidationRules.sceneHeadingFormat(el as any)).toBe(false);
      }
    });

    it('should check parenthetical format', () => {
      const valid: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'parenthetical',
        content: '(sarcastically)',
        sequence: 1
      };

      const invalid: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'parenthetical',
        content: 'sarcastically',
        sequence: 1
      };

      expect(customValidationRules.parentheticalFormat(valid as any)).toBe(true);
      expect(customValidationRules.parentheticalFormat(invalid as any)).toBe(false);
    });

    it('should check dual dialogue pairs', () => {
      const validPair = [
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'JOHN',
          sequence: 1,
          dual: 'left'
        },
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Hello',
          sequence: 2,
          dual: 'left'
        },
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'JANE',
          sequence: 3,
          dual: 'right'
        },
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Hi',
          sequence: 4,
          dual: 'right'
        }
      ];

      const invalidPair = [
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'JOHN',
          sequence: 1,
          dual: 'left'
        },
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Hello',
          sequence: 2,
          dual: 'left'
        }
        // Missing right side!
      ];

      expect(customValidationRules.dualDialoguePairs(validPair as any)).toBe(true);
      expect(customValidationRules.dualDialoguePairs(invalidPair as any)).toBe(false);
    });
  });

  describe('Array Validation', () => {
    it('should validate array of valid elements', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'scene_heading',
          content: 'INT. ROOM - DAY',
          sequence: 1
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: 'John enters.',
          sequence: 2
        }
      ];

      const report = validateScriptElements(elements);
      expect(report.valid).toBe(true);
      expect(report.totalElements).toBe(2);
      expect(report.validElements).toBe(2);
    });

    it('should detect duplicate IDs', () => {
      const sharedId = crypto.randomUUID();
      const elements: ScriptElement[] = [
        {
          id: sharedId,
          type: 'action',
          content: 'Test 1',
          sequence: 1
        },
        {
          id: sharedId, // Duplicate!
          type: 'action',
          content: 'Test 2',
          sequence: 2
        }
      ];

      const report = validateScriptElements(elements);
      expect(report.valid).toBe(false);
      expect(report.issues.some(i => i.code === 'DUPLICATE_IDS')).toBe(true);
    });

    it('should calculate confidence score', () => {
      const perfectElements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'scene_heading',
          content: 'INT. ROOM - DAY',
          sequence: 1
        }
      ];

      const report = validateScriptElements(perfectElements);
      expect(report.confidence).toBe(1.0);
    });

    it('should handle empty array', () => {
      const report = validateScriptElements([]);
      expect(report.valid).toBe(true);
      expect(report.totalElements).toBe(0);
      expect(report.summary.info).toBe(1); // Empty script info
    });
  });

  describe('Title Page Validation', () => {
    it('should validate title page with all fields', () => {
      const titlePage = {
        title: 'My Script',
        authors: ['John Doe'],
        draftDate: '2026-01-27'
      };

      const result = validateTitlePage(titlePage);
      expect(result.valid).toBe(true);
    });

    it('should warn on missing title', () => {
      const titlePage = {
        authors: ['John Doe']
      };

      const result = validateTitlePage(titlePage);
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.issues.some(i => i.code === 'MISSING_TITLE')).toBe(true);
    });

    it('should warn on missing authors', () => {
      const titlePage = {
        title: 'My Script'
      };

      const result = validateTitlePage(titlePage);
      expect(result.valid).toBe(true);
      expect(result.issues.some(i => i.code === 'MISSING_AUTHORS')).toBe(true);
    });

    it('should handle undefined title page', () => {
      const result = validateTitlePage(undefined);
      expect(result.valid).toBe(true);
      expect(result.issues.some(i => i.code === 'NO_TITLE_PAGE')).toBe(true);
    });
  });
});
