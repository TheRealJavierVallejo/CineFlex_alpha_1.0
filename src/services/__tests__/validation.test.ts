/**
 * VALIDATION TESTS
 * Tests for validation system
 */

import { describe, it, expect } from 'vitest';
import { validateScript, quickValidate, validateAndFilter } from '../validation/scriptValidator';
import { ScriptElement } from '../../types';

describe('Validation System', () => {
  const validElements: ScriptElement[] = [
    {
      id: crypto.randomUUID(),
      type: 'scene_heading',
      content: 'INT. COFFEE SHOP - DAY',
      sequence: 1,
    },
    {
      id: crypto.randomUUID(),
      type: 'action',
      content: 'John enters.',
      sequence: 2,
    },
    {
      id: crypto.randomUUID(),
      type: 'character',
      content: 'JOHN',
      sequence: 3,
    },
    {
      id: crypto.randomUUID(),
      type: 'dialogue',
      content: 'Hello.',
      sequence: 4,
      character: 'JOHN',
    },
  ];

  describe('validateScript', () => {
    it('should validate correct script', () => {
      const result = validateScript(validElements);
      expect(result.valid).toBe(true);
      expect(result.elements.length).toBe(4);
      expect(result.report.confidence).toBeGreaterThan(0.9);
    });

    it('should detect invalid UUID', () => {
      const invalidElements = [
        {
          id: 'not-a-uuid',
          type: 'action',
          content: 'Test',
          sequence: 1,
        },
      ];

      const result = validateScript(invalidElements);
      expect(result.valid).toBe(false);
      expect(result.report.issues.length).toBeGreaterThan(0);
      expect(result.report.issues[0].severity).toBe('error');
    });

    it('should detect invalid element type', () => {
      const invalidElements = [
        {
          id: crypto.randomUUID(),
          type: 'invalid_type',
          content: 'Test',
          sequence: 1,
        },
      ];

      const result = validateScript(invalidElements as any);
      expect(result.valid).toBe(false);
    });

    it('should detect missing content', () => {
      const invalidElements = [
        {
          id: crypto.randomUUID(),
          type: 'action',
          sequence: 1,
        },
      ];

      const result = validateScript(invalidElements as any);
      expect(result.valid).toBe(false);
    });

    it('should warn about dialogue without character', () => {
      const elements = [
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Orphaned dialogue',
          sequence: 1,
        },
      ];

      const result = validateScript(elements as any);
      const warnings = result.report.issues.filter(i => i.severity === 'warning');
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should warn about script with no scene headings', () => {
      const noScenes = [
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: 'Just action',
          sequence: 1,
        },
      ];

      const result = validateScript(noScenes);
      const warnings = result.report.issues.filter(i => 
        i.message.includes('no scene headings')
      );
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should detect empty script', () => {
      const result = validateScript([]);
      expect(result.valid).toBe(false);
      const errors = result.report.issues.filter(i => 
        i.message.includes('empty')
      );
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Auto-fixing', () => {
    it('should auto-fix scene heading case', () => {
      const elements = [
        {
          id: crypto.randomUUID(),
          type: 'scene_heading',
          content: 'int. coffee shop - day', // lowercase
          sequence: 1,
        },
      ];

      const result = validateScript(elements, undefined, { autoFix: true });
      expect(result.elements[0].content).toBe('INT. COFFEE SHOP - DAY');
    });

    it('should auto-fix character name case', () => {
      const elements = [
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'john', // lowercase
          sequence: 1,
        },
      ];

      const result = validateScript(elements, undefined, { autoFix: true });
      expect(result.elements[0].content).toBe('JOHN');
    });

    it('should trim whitespace', () => {
      const elements = [
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: '  Text with spaces  ',
          sequence: 1,
        },
      ];

      const result = validateScript(elements, undefined, { autoFix: true });
      expect(result.elements[0].content).toBe('Text with spaces');
    });

    it('should remove dual dialogue caret from content', () => {
      const elements = [
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'JOHN ^',
          sequence: 1,
        },
      ];

      const result = validateScript(elements, undefined, { autoFix: true });
      expect(result.elements[0].content).toBe('JOHN');
      expect(result.elements[0].dual).toBe('left');
    });
  });

  describe('quickValidate', () => {
    it('should return true for valid elements', () => {
      expect(quickValidate(validElements)).toBe(true);
    });

    it('should return false for invalid elements', () => {
      const invalid = [{ id: 'bad', type: 'bad', content: 'bad', sequence: -1 }];
      expect(quickValidate(invalid as any)).toBe(false);
    });
  });

  describe('validateAndFilter', () => {
    it('should filter out invalid elements', () => {
      const mixed = [
        ...validElements,
        { id: 'bad-uuid', type: 'action', content: 'Bad', sequence: 5 },
      ];

      const valid = validateAndFilter(mixed as any);
      expect(valid.length).toBe(4); // Only valid elements
    });

    it('should call onInvalid callback', () => {
      const invalid = [{ id: 'bad', type: 'action', content: 'Bad', sequence: 1 }];
      let callbackCalled = false;

      validateAndFilter(invalid as any, (index, error) => {
        callbackCalled = true;
        expect(index).toBe(0);
        expect(error).toContain('UUID');
      });

      expect(callbackCalled).toBe(true);
    });
  });

  describe('Validation Report', () => {
    it('should generate detailed report', () => {
      const elements = [
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Orphaned',
          sequence: 1,
        },
        {
          id: 'bad-uuid',
          type: 'action',
          content: 'Bad ID',
          sequence: 2,
        },
      ];

      const result = validateScript(elements as any);
      const report = result.report;

      expect(report).toHaveProperty('valid');
      expect(report).toHaveProperty('confidence');
      expect(report).toHaveProperty('totalElements');
      expect(report).toHaveProperty('validElements');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('timestamp');

      expect(report.issues.length).toBeGreaterThan(0);
    });

    it('should calculate confidence score', () => {
      const result = validateScript(validElements);
      expect(result.report.confidence).toBeGreaterThanOrEqual(0);
      expect(result.report.confidence).toBeLessThanOrEqual(1);
    });

    it('should categorize issues by severity', () => {
      const elements = [
        { id: 'bad', type: 'action', content: 'Bad ID', sequence: 1 },
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'No character',
          sequence: 2,
        },
      ];

      const result = validateScript(elements as any);
      const errors = result.report.issues.filter(i => i.severity === 'error');
      const warnings = result.report.issues.filter(i => i.severity === 'warning');

      expect(errors.length).toBeGreaterThan(0);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Title Page Validation', () => {
    it('should validate title page', () => {
      const titlePage = {
        title: 'Test Script',
        authors: ['John Doe'],
        draftDate: '2026-01-27',
      };

      const result = validateScript(validElements, titlePage);
      expect(result.titlePage).toBeDefined();
      expect(result.titlePage?.title).toBe('Test Script');
    });

    it('should handle missing title page', () => {
      const result = validateScript(validElements);
      expect(result.titlePage).toBeUndefined();
    });

    it('should validate title page structure', () => {
      const invalidTitlePage = {
        title: 123, // Should be string
        authors: 'Not an array', // Should be array
      };

      const result = validateScript(validElements, invalidTitlePage as any);
      const warnings = result.report.issues.filter(i => 
        i.message.includes('Title page')
      );
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Context Tracking', () => {
    it('should track validation context', () => {
      const result = validateScript(validElements, undefined, {
        context: 'PDF Import',
      });

      expect(result.report.context).toBe('PDF Import');
    });
  });
});
