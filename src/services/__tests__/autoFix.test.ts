/**
 * AUTO-FIX TESTS
 * 
 * Tests for automatic correction of common screenplay formatting issues.
 */

import { describe, it, expect } from 'vitest';
import {
  autoFixElement,
  autoFixElements,
  canAutoFix,
  getAutoFixSuggestion
} from '../validation/autoFix';
import { ScriptElement } from '../../types';
import { ValidationIssue } from '../validation/validationReport';

describe('Auto-Fix Functionality', () => {
  describe('autoFixElement', () => {
    it('should uppercase character names', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'character',
        content: 'john',
        sequence: 1
      };

      const result = autoFixElement(element);

      expect(result.changed).toBe(true);
      expect(result.fixed.content).toBe('JOHN');
      expect(result.changes).toContain('Converted character name to uppercase');
    });

    it('should add parentheses to parentheticals', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'parenthetical',
        content: 'sarcastically',
        sequence: 1
      };

      const result = autoFixElement(element);

      expect(result.changed).toBe(true);
      expect(result.fixed.content).toBe('(sarcastically)');
      expect(result.changes).toContain('Added parentheses to parenthetical');
    });

    it('should trim whitespace', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'action',
        content: '  Extra whitespace  ',
        sequence: 1
      };

      const result = autoFixElement(element);

      expect(result.changed).toBe(true);
      expect(result.fixed.content).toBe('Extra whitespace');
      expect(result.changes).toContain('Trimmed extra whitespace');
    });

    it('should mark empty elements for removal', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'action',
        content: '',
        sequence: 1
      };

      const result = autoFixElement(element);

      expect(result.changed).toBe(true);
      expect(result.fixed.content).toBe('[EMPTY - REMOVE]');
      expect(result.changes).toContain('Marked empty element for removal');
    });

    it('should standardize scene heading format', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'scene_heading',
        content: 'INTERIOR. ROOM - DAY',
        sequence: 1
      };

      const result = autoFixElement(element);

      expect(result.changed).toBe(true);
      expect(result.fixed.content).toBe('INT. ROOM - DAY');
      expect(result.changes).toContain('Standardized scene heading format');
    });

    it('should extract character from dialogue content', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'dialogue',
        content: 'JOHN: Hello there!',
        sequence: 1
      };

      const result = autoFixElement(element);

      expect(result.changed).toBe(true);
      expect(result.fixed.character).toBe('JOHN');
      expect(result.fixed.content).toBe('Hello there!');
      expect(result.changes).toContain('Extracted character name from dialogue');
    });

    it('should not modify already-correct elements', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'action',
        content: 'Perfect action line.',
        sequence: 1
      };

      const result = autoFixElement(element);

      expect(result.changed).toBe(false);
      expect(result.changes).toEqual([]);
    });

    it('should remove pagination metadata', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'dialogue',
        content: 'Hello',
        sequence: 1,
        character: 'JOHN',
        isContinued: true,
        continuesNext: false
      };

      const result = autoFixElement(element);

      expect(result.changed).toBe(true);
      expect(result.fixed.isContinued).toBeUndefined();
      expect(result.fixed.continuesNext).toBeUndefined();
      expect(result.changes).toContain('Removed stale pagination data');
    });
  });

  describe('autoFixElements', () => {
    it('should fix multiple elements', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'john',
          sequence: 1
        },
        {
          id: crypto.randomUUID(),
          type: 'parenthetical',
          content: 'quietly',
          sequence: 2
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: '  Whitespace  ',
          sequence: 3
        }
      ];

      const result = autoFixElements(elements);

      expect(result.totalFixed).toBe(3);
      expect(result.fixed.length).toBe(3);
      expect(result.fixed[0].content).toBe('JOHN');
      expect(result.fixed[1].content).toBe('(quietly)');
      expect(result.fixed[2].content).toBe('Whitespace');
    });

    it('should remove empty elements', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: 'Keep this',
          sequence: 1
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: '',
          sequence: 2
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: 'And this',
          sequence: 3
        }
      ];

      const result = autoFixElements(elements);

      expect(result.fixed.length).toBe(2);
      expect(result.removed.length).toBe(1);
      expect(result.fixed[0].content).toBe('Keep this');
      expect(result.fixed[1].content).toBe('And this');
    });

    it('should re-sequence elements after removal', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: 'Line 1',
          sequence: 1
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: '',
          sequence: 2
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: 'Line 3',
          sequence: 3
        }
      ];

      const result = autoFixElements(elements);

      expect(result.fixed.length).toBe(2);
      expect(result.fixed[0].sequence).toBe(1);
      expect(result.fixed[1].sequence).toBe(2);
    });

    it('should fix dual dialogue pairs', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'JOHN',
          sequence: 1,
          dual: 'right' // Wrong - should be left
        },
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Hello',
          sequence: 2,
          character: 'JOHN',
          dual: 'right'
        },
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'JANE',
          sequence: 3,
          dual: 'left' // Wrong - should be right
        },
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Hi',
          sequence: 4,
          character: 'JANE',
          dual: 'left'
        }
      ];

      const result = autoFixElements(elements);

      expect(result.fixed[0].dual).toBe('left');
      expect(result.fixed[1].dual).toBe('left');
      expect(result.fixed[2].dual).toBe('right');
      expect(result.fixed[3].dual).toBe('right');
    });

    it('should remove unpaired dual dialogue', () => {
      const elements: ScriptElement[] = [
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
          character: 'JOHN',
          dual: 'left'
        }
        // No right side!
      ];

      const result = autoFixElements(elements);

      expect(result.fixed[0].dual).toBeUndefined();
      expect(result.fixed[1].dual).toBeUndefined();
    });
  });

  describe('Auto-fix helpers', () => {
    it('should identify auto-fixable issues', () => {
      const fixable: ValidationIssue = {
        severity: 'warning',
        code: 'CHARACTER_NOT_UPPERCASE',
        message: 'Character should be uppercase'
      };

      const notFixable: ValidationIssue = {
        severity: 'error',
        code: 'INVALID_UUID',
        message: 'Element has invalid ID'
      };

      expect(canAutoFix(fixable)).toBe(true);
      expect(canAutoFix(notFixable)).toBe(false);
    });

    it('should provide fix suggestions', () => {
      const issue: ValidationIssue = {
        severity: 'warning',
        code: 'CHARACTER_NOT_UPPERCASE',
        message: 'Character should be uppercase'
      };

      const suggestion = getAutoFixSuggestion(issue);
      expect(suggestion).toBe('Convert to uppercase automatically');
    });

    it('should return null for non-fixable issues', () => {
      const issue: ValidationIssue = {
        severity: 'error',
        code: 'INVALID_UUID',
        message: 'Bad ID'
      };

      const suggestion = getAutoFixSuggestion(issue);
      expect(suggestion).toBeNull();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple issues in one element', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'character',
        content: '  john  ', // Lowercase + whitespace
        sequence: 1,
        isContinued: true // Stale pagination
      };

      const result = autoFixElement(element);

      expect(result.changed).toBe(true);
      expect(result.fixed.content).toBe('JOHN');
      expect(result.fixed.isContinued).toBeUndefined();
      expect(result.changes.length).toBe(3); // All three fixes
    });

    it('should preserve valid data while fixing issues', () => {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'dialogue',
        content: '  Hello there!  ',
        sequence: 1,
        character: 'JOHN',
        sceneId: 'scene-123'
      };

      const result = autoFixElement(element);

      expect(result.fixed.content).toBe('Hello there!');
      expect(result.fixed.character).toBe('JOHN');
      expect(result.fixed.sceneId).toBe('scene-123');
      expect(result.fixed.id).toBe(element.id);
    });
  });
});
