/**
 * SCRIPT MODEL TESTS
 * 
 * Tests for the ScriptModel class to ensure:
 * - Validation works correctly
 * - Immutability is enforced
 * - Mutations return new instances
 * - Invalid data is caught
 */

import { describe, it, expect } from 'vitest';
import { ScriptModel } from '../scriptModel';
import { ScriptElement } from '../../types';

describe('ScriptModel', () => {
  // Sample valid element
  const validElement: ScriptElement = {
    id: crypto.randomUUID(),
    type: 'action',
    content: 'INT. COFFEE SHOP - DAY',
    sequence: 1
  };

  const validElement2: ScriptElement = {
    id: crypto.randomUUID(),
    type: 'dialogue',
    content: 'This is some dialogue.',
    sequence: 2,
    character: 'JOHN'
  };

  describe('Factory Methods', () => {
    it('should create empty model', () => {
      const model = ScriptModel.createEmpty();
      expect(model.getElementCount()).toBe(0);
      expect(model.isValid()).toBe(true);
    });

    it('should create model from valid elements', () => {
      const model = ScriptModel.create([validElement, validElement2]);
      expect(model.getElementCount()).toBe(2);
      expect(model.isValid()).toBe(true);
    });

    it('should filter invalid elements in non-strict mode', () => {
      const invalidElement = {
        // Missing required fields
        type: 'action',
        content: 'Test'
      } as any;

      const model = ScriptModel.create([validElement, invalidElement], undefined, { strict: false });
      expect(model.getElementCount()).toBe(1); // Only valid element
    });

    it('should throw in strict mode with invalid elements', () => {
      const invalidElement = {
        type: 'action',
        content: 'Test'
      } as any;

      expect(() => {
        ScriptModel.create([validElement, invalidElement], undefined, { strict: true });
      }).toThrow();
    });
  });

  describe('Immutability', () => {
    it('should return frozen elements array', () => {
      const model = ScriptModel.create([validElement]);
      const elements = model.getElements();
      
      expect(Object.isFrozen(elements)).toBe(true);
    });

    it('should return frozen title page', () => {
      const titlePage = { title: 'Test Script' };
      const model = ScriptModel.create([], titlePage);
      const tp = model.getTitlePage();
      
      expect(Object.isFrozen(tp)).toBe(true);
    });

    it('should not allow direct mutation of elements', () => {
      const model = ScriptModel.create([validElement]);
      const elements = model.getElements() as any;
      
      // Should not be able to push
      expect(() => {
        elements.push(validElement2);
      }).toThrow();
    });
  });

  describe('Getters', () => {
    it('should get element by ID', () => {
      const model = ScriptModel.create([validElement]);
      const found = model.getElementById(validElement.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(validElement.id);
    });

    it('should get element by sequence', () => {
      const model = ScriptModel.create([validElement]);
      const found = model.getElementBySequence(1);
      
      expect(found).toBeDefined();
      expect(found?.sequence).toBe(1);
    });

    it('should get elements by type', () => {
      const model = ScriptModel.create([validElement, validElement2]);
      const actions = model.getElementsByType('action');
      const dialogues = model.getElementsByType('dialogue');
      
      expect(actions.length).toBe(1);
      expect(dialogues.length).toBe(1);
    });

    it('should return validation report', () => {
      const model = ScriptModel.create([validElement]);
      const report = model.getValidationReport();
      
      expect(report).toBeDefined();
      expect(report.totalElements).toBe(1);
      expect(report.valid).toBe(true);
    });
  });

  describe('Mutations', () => {
    it('should insert element and return new model', () => {
      const model1 = ScriptModel.create([validElement]);
      const model2 = model1.insertElement(1, validElement2);
      
      expect(model1.getElementCount()).toBe(1); // Original unchanged
      expect(model2.getElementCount()).toBe(2); // New model updated
      expect(model1).not.toBe(model2); // Different instances
    });

    it('should update element and return new model', () => {
      const model1 = ScriptModel.create([validElement]);
      const model2 = model1.updateElement(validElement.id, { content: 'Updated content' });
      
      const original = model1.getElementById(validElement.id);
      const updated = model2.getElementById(validElement.id);
      
      expect(original?.content).toBe('INT. COFFEE SHOP - DAY');
      expect(updated?.content).toBe('Updated content');
    });

    it('should delete element and return new model', () => {
      const model1 = ScriptModel.create([validElement, validElement2]);
      const model2 = model1.deleteElement(validElement.id);
      
      expect(model1.getElementCount()).toBe(2);
      expect(model2.getElementCount()).toBe(1);
      expect(model2.getElementById(validElement.id)).toBeUndefined();
    });

    it('should replace all elements', () => {
      const model1 = ScriptModel.create([validElement]);
      const model2 = model1.replaceElements([validElement2]);
      
      expect(model1.getElementCount()).toBe(1);
      expect(model2.getElementCount()).toBe(1);
      expect(model2.getElementById(validElement.id)).toBeUndefined();
      expect(model2.getElementById(validElement2.id)).toBeDefined();
    });

    it('should update title page and return new model', () => {
      const model1 = ScriptModel.create([], { title: 'Original' });
      const model2 = model1.updateTitlePage({ title: 'Updated' });
      
      expect(model1.getTitlePage().title).toBe('Original');
      expect(model2.getTitlePage().title).toBe('Updated');
    });

    it('should re-sequence elements after insertion', () => {
      const model1 = ScriptModel.create([validElement]);
      const model2 = model1.insertElement(0, validElement2);
      
      const elements = model2.getElements();
      expect(elements[0].sequence).toBe(1);
      expect(elements[1].sequence).toBe(2);
    });

    it('should re-sequence elements after deletion', () => {
      const el1 = { ...validElement, sequence: 1 };
      const el2 = { ...validElement2, sequence: 2 };
      const el3 = { ...validElement, id: crypto.randomUUID(), sequence: 3 };
      
      const model1 = ScriptModel.create([el1, el2, el3]);
      const model2 = model1.deleteElement(el2.id);
      
      const elements = model2.getElements();
      expect(elements[0].sequence).toBe(1);
      expect(elements[1].sequence).toBe(2);
    });
  });

  describe('Serialization', () => {
    it('should convert to JSON', () => {
      const titlePage = { title: 'Test' };
      const model = ScriptModel.create([validElement], titlePage);
      const json = model.toJSON();
      
      expect(json.elements).toHaveLength(1);
      expect(json.titlePage.title).toBe('Test');
      expect(json.version).toBeDefined();
      expect(json.validationReport).toBeDefined();
    });

    it('should create from JSON', () => {
      const model1 = ScriptModel.create([validElement], { title: 'Test' });
      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);
      
      expect(model2.getElementCount()).toBe(1);
      expect(model2.getTitlePage().title).toBe('Test');
    });

    it('should round-trip through JSON', () => {
      const original = ScriptModel.create([validElement, validElement2], { title: 'Original' });
      const json = original.toJSON();
      const restored = ScriptModel.fromJSON(json);
      
      expect(restored.getElementCount()).toBe(original.getElementCount());
      expect(restored.getTitlePage().title).toBe(original.getTitlePage().title);
    });
  });

  describe('Validation Detection', () => {
    it('should detect uppercase character warning', () => {
      const lowercaseChar: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'character',
        content: 'john', // Should be JOHN
        sequence: 1
      };
      
      const model = ScriptModel.create([lowercaseChar]);
      const report = model.getValidationReport();
      
      expect(report.summary.warnings).toBeGreaterThan(0);
      expect(report.issues.some(i => i.code === 'CHARACTER_NOT_UPPERCASE')).toBe(true);
    });

    it('should detect empty content warning', () => {
      const emptyElement: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'action',
        content: '', // Empty
        sequence: 1
      };
      
      const model = ScriptModel.create([emptyElement]);
      const report = model.getValidationReport();
      
      expect(report.summary.warnings).toBeGreaterThan(0);
    });

    it('should calculate confidence score', () => {
      const model = ScriptModel.create([validElement]);
      const confidence = model.getConfidence();
      
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });
});
