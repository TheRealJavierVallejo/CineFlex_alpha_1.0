/**
 * SCRIPT MODEL TESTS
 * Tests for ScriptModel class functionality
 */

import { describe, it, expect } from 'vitest';
import { ScriptModel, createScriptModel, createEmptyScript } from '../scriptModel';
import { ScriptElement } from '../../types';

describe('ScriptModel', () => {
  const sampleElements: ScriptElement[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      type: 'scene_heading',
      content: 'INT. COFFEE SHOP - DAY',
      sequence: 1,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      type: 'action',
      content: 'John enters the coffee shop.',
      sequence: 2,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      type: 'character',
      content: 'JOHN',
      sequence: 3,
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      type: 'dialogue',
      content: 'One coffee, please.',
      sequence: 4,
      character: 'JOHN',
    },
  ];

  describe('Construction', () => {
    it('should create a valid ScriptModel', () => {
      const model = new ScriptModel(sampleElements);
      expect(model.isValid()).toBe(true);
      expect(model.getElementCount()).toBe(4);
    });

    it('should create empty script', () => {
      const model = createEmptyScript();
      expect(model.getElementCount()).toBe(0);
      expect(model.isValid()).toBe(true);
    });

    it('should validate on creation by default', () => {
      const invalidElement = {
        id: 'invalid-uuid',
        type: 'action',
        content: 'Test',
        sequence: 1,
      };

      // Should not throw, but should have validation issues
      const model = new ScriptModel([invalidElement] as any);
      expect(model.getValidationReport().issues.length).toBeGreaterThan(0);
    });

    it('should support skipping validation for performance', () => {
      const model = new ScriptModel(sampleElements, undefined, {
        validateOnCreate: false,
      });
      expect(model.getElementCount()).toBe(4);
    });
  });

  describe('Immutability', () => {
    it('should return new instance on mutation', () => {
      const model1 = createScriptModel(sampleElements);
      const model2 = model1.appendChild({
        id: crypto.randomUUID(),
        type: 'action',
        content: 'New action',
        sequence: 5,
      });

      expect(model1.getElementCount()).toBe(4);
      expect(model2.getElementCount()).toBe(5);
      expect(model1).not.toBe(model2);
    });

    it('should not allow direct modification of elements', () => {
      const model = createScriptModel(sampleElements);
      const elements = model.getElements();

      // This should not compile in TypeScript
      // @ts-expect-error
      expect(() => { elements[0] = {} as any; }).toThrow();
    });
  });

  describe('Getters', () => {
    it('should get element by ID', () => {
      const model = createScriptModel(sampleElements);
      const element = model.getElementById('00000000-0000-0000-0000-000000000001');
      expect(element?.type).toBe('scene_heading');
    });

    it('should get element by index', () => {
      const model = createScriptModel(sampleElements);
      const element = model.getElementByIndex(0);
      expect(element?.type).toBe('scene_heading');
    });

    it('should get elements by type', () => {
      const model = createScriptModel(sampleElements);
      const dialogues = model.getElementsByType('dialogue');
      expect(dialogues.length).toBe(1);
      expect(dialogues[0].content).toBe('One coffee, please.');
    });

    it('should get scene headings', () => {
      const model = createScriptModel(sampleElements);
      const headings = model.getSceneHeadings();
      expect(headings.length).toBe(1);
      expect(headings[0].content).toBe('INT. COFFEE SHOP - DAY');
    });
  });

  describe('Mutations', () => {
    it('should insert element at index', () => {
      const model = createScriptModel(sampleElements);
      const newElement: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'action',
        content: 'Inserted action',
        sequence: 2,
      };

      const newModel = model.insertElement(1, newElement);
      expect(newModel.getElementCount()).toBe(5);
      expect(newModel.getElementByIndex(1)?.content).toBe('Inserted action');
    });

    it('should update element by ID', () => {
      const model = createScriptModel(sampleElements);
      const newModel = model.updateElement(
        '00000000-0000-0000-0000-000000000004',
        { content: 'Two coffees, please.' }
      );

      expect(newModel.getElementById('00000000-0000-0000-0000-000000000004')?.content)
        .toBe('Two coffees, please.');
      expect(model.getElementById('00000000-0000-0000-0000-000000000004')?.content)
        .toBe('One coffee, please.');
    });

    it('should delete element by ID', () => {
      const model = createScriptModel(sampleElements);
      const newModel = model.deleteElement('00000000-0000-0000-0000-000000000002');

      expect(newModel.getElementCount()).toBe(3);
      expect(newModel.getElementById('00000000-0000-0000-0000-000000000002')).toBeUndefined();
    });

    it('should append element', () => {
      const model = createScriptModel(sampleElements);
      const newElement: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'action',
        content: 'The end.',
        sequence: 5,
      };

      const newModel = model.appendChild(newElement);
      expect(newModel.getElementCount()).toBe(5);
      expect(newModel.getElementByIndex(4)?.content).toBe('The end.');
    });

    it('should move element', () => {
      const model = createScriptModel(sampleElements);
      const newModel = model.moveElement(1, 3);

      expect(newModel.getElementByIndex(3)?.type).toBe('action');
      expect(newModel.getElementByIndex(3)?.content).toBe('John enters the coffee shop.');
    });

    it('should re-sequence after mutations', () => {
      const model = createScriptModel(sampleElements);
      const newModel = model.deleteElement('00000000-0000-0000-0000-000000000002');

      const elements = newModel.getElements();
      elements.forEach((el, index) => {
        expect(el.sequence).toBe(index + 1);
      });
    });
  });

  describe('Title Page', () => {
    it('should handle title page', () => {
      const model = createScriptModel(sampleElements, {
        title: 'Test Script',
        authors: ['John Doe'],
      });

      const titlePage = model.getTitlePage();
      expect(titlePage?.title).toBe('Test Script');
      expect(titlePage?.authors).toEqual(['John Doe']);
    });

    it('should update title page', () => {
      const model = createScriptModel(sampleElements, {
        title: 'Original Title',
      });

      const newModel = model.updateTitlePage({
        title: 'Updated Title',
        authors: ['Jane Smith'],
      });

      expect(newModel.getTitlePage()?.title).toBe('Updated Title');
      expect(newModel.getTitlePage()?.authors).toEqual(['Jane Smith']);
      expect(model.getTitlePage()?.title).toBe('Original Title');
    });
  });

  describe('Serialization', () => {
    it('should convert to JSON', () => {
      const model = createScriptModel(sampleElements, {
        title: 'Test Script',
      });

      const json = model.toJSON();
      expect(json.elements.length).toBe(4);
      expect(json.titlePage?.title).toBe('Test Script');
    });

    it('should create from JSON', () => {
      const json = {
        elements: sampleElements,
        titlePage: { title: 'Test Script' },
      };

      const model = ScriptModel.fromJSON(json);
      expect(model.getElementCount()).toBe(4);
      expect(model.getTitlePage()?.title).toBe('Test Script');
    });

    it('should round-trip through JSON', () => {
      const model1 = createScriptModel(sampleElements, {
        title: 'Test Script',
      });

      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);

      expect(model2.getElementCount()).toBe(model1.getElementCount());
      expect(model2.getTitlePage()?.title).toBe(model1.getTitlePage()?.title);
    });
  });

  describe('Stats', () => {
    it('should calculate stats', () => {
      const model = createScriptModel(sampleElements);
      const stats = model.getStats();

      expect(stats.totalElements).toBe(4);
      expect(stats.sceneHeadings).toBe(1);
      expect(stats.dialogue).toBe(1);
      expect(stats.action).toBe(1);
      expect(stats.characters).toBe(1);
      expect(stats.pages).toBeGreaterThan(0);
    });
  });

  describe('Clone', () => {
    it('should clone model', () => {
      const model1 = createScriptModel(sampleElements);
      const model2 = model1.clone();

      expect(model2.getElementCount()).toBe(model1.getElementCount());
      expect(model2).not.toBe(model1);
    });
  });
});
