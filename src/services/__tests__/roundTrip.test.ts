/**
 * ROUND-TRIP FIDELITY TESTS
 * 
 * These tests verify that script data doesn't get corrupted when:
 * 1. Importing → Creating ScriptModel → Exporting (same format)
 * 2. Importing → Editing → Exporting
 * 3. Converting between formats
 * 
 * CRITICAL: These tests prove the system preserves data integrity.
 */

import { describe, it, expect } from 'vitest';
import { ScriptModel } from '../scriptModel';
import { ScriptElement, TitlePageData } from '../../types';

describe('Round-Trip Fidelity', () => {
  describe('ScriptModel JSON Serialization', () => {
    it('should preserve all elements through JSON round-trip', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'scene_heading',
          content: 'INT. COFFEE SHOP - DAY',
          sequence: 1,
          sceneNumber: '1'
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: 'John enters and looks around.',
          sequence: 2
        },
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'JOHN',
          sequence: 3
        },
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Anyone here?',
          sequence: 4,
          character: 'JOHN'
        }
      ];

      const titlePage: TitlePageData = {
        title: 'Test Script',
        authors: ['John Doe'],
        draftDate: '2026-01-27'
      };

      // Create model
      const model1 = ScriptModel.create(elements, titlePage);

      // Serialize to JSON
      const json = model1.toJSON();

      // Deserialize back
      const model2 = ScriptModel.fromJSON(json);

      // Verify everything matches
      expect(model2.getElementCount()).toBe(model1.getElementCount());
      expect(model2.getTitlePage()).toEqual(model1.getTitlePage());

      const elements1 = model1.getElements();
      const elements2 = model2.getElements();

      for (let i = 0; i < elements1.length; i++) {
        expect(elements2[i].id).toBe(elements1[i].id);
        expect(elements2[i].type).toBe(elements1[i].type);
        expect(elements2[i].content).toBe(elements1[i].content);
        expect(elements2[i].sequence).toBe(elements1[i].sequence);
      }
    });

    it('should preserve title page fields through round-trip', () => {
      const titlePage: TitlePageData = {
        title: 'My Amazing Script',
        authors: ['Jane Smith', 'John Doe'],
        credit: 'Written by',
        source: 'Based on the novel',
        draftDate: 'January 27, 2026',
        draftVersion: 'First Draft',
        contact: 'contact@example.com',
        copyright: '© 2026',
        wgaRegistration: 'WGA1234567'
      };

      const model1 = ScriptModel.create([], titlePage);
      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);

      const tp = model2.getTitlePage();
      expect(tp.title).toBe(titlePage.title);
      expect(tp.authors).toEqual(titlePage.authors);
      expect(tp.credit).toBe(titlePage.credit);
      expect(tp.source).toBe(titlePage.source);
      expect(tp.draftDate).toBe(titlePage.draftDate);
      expect(tp.draftVersion).toBe(titlePage.draftVersion);
      expect(tp.contact).toBe(titlePage.contact);
      expect(tp.copyright).toBe(titlePage.copyright);
      expect(tp.wgaRegistration).toBe(titlePage.wgaRegistration);
    });

    it('should preserve scene numbers through round-trip', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'scene_heading',
          content: 'INT. ROOM - DAY',
          sequence: 1,
          sceneNumber: '1'
        },
        {
          id: crypto.randomUUID(),
          type: 'scene_heading',
          content: 'EXT. STREET - NIGHT',
          sequence: 2,
          sceneNumber: '2A'
        },
        {
          id: crypto.randomUUID(),
          type: 'scene_heading',
          content: 'INT. CAR - NIGHT',
          sequence: 3,
          sceneNumber: '2B'
        }
      ];

      const model1 = ScriptModel.create(elements);
      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);

      const restoredElements = model2.getElements();
      expect(restoredElements[0].sceneNumber).toBe('1');
      expect(restoredElements[1].sceneNumber).toBe('2A');
      expect(restoredElements[2].sceneNumber).toBe('2B');
    });
  });

  describe('Dual Dialogue Preservation', () => {
    it('should preserve dual dialogue left/right through round-trip', () => {
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
          content: 'Hello!',
          sequence: 2,
          character: 'JOHN',
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
          content: 'Hi there!',
          sequence: 4,
          character: 'JANE',
          dual: 'right'
        }
      ];

      const model1 = ScriptModel.create(elements);
      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);

      const restored = model2.getElements();
      expect(restored[0].dual).toBe('left');
      expect(restored[1].dual).toBe('left');
      expect(restored[2].dual).toBe('right');
      expect(restored[3].dual).toBe('right');
    });

    it('should preserve single-column dialogue (undefined dual)', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'JOHN',
          sequence: 1
        },
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Normal dialogue.',
          sequence: 2,
          character: 'JOHN'
        }
      ];

      const model1 = ScriptModel.create(elements);
      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);

      const restored = model2.getElements();
      expect(restored[0].dual).toBeUndefined();
      expect(restored[1].dual).toBeUndefined();
    });
  });

  describe('Edit Preservation', () => {
    it('should preserve unchanged elements after editing one', () => {
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
          content: 'Line 2',
          sequence: 2
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: 'Line 3',
          sequence: 3
        }
      ];

      const model1 = ScriptModel.create(elements);
      const targetId = elements[1].id;

      // Edit only the middle element
      const model2 = model1.updateElement(targetId, { content: 'Line 2 EDITED' });

      const result = model2.getElements();

      // First element unchanged
      expect(result[0].content).toBe('Line 1');
      expect(result[0].id).toBe(elements[0].id);

      // Middle element changed
      expect(result[1].content).toBe('Line 2 EDITED');
      expect(result[1].id).toBe(targetId);

      // Last element unchanged
      expect(result[2].content).toBe('Line 3');
      expect(result[2].id).toBe(elements[2].id);
    });

    it('should maintain sequence after insertion', () => {
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
          content: 'Line 3',
          sequence: 2
        }
      ];

      const model1 = ScriptModel.create(elements);

      const newElement: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'action',
        content: 'Line 2 (inserted)',
        sequence: 999 // Will be corrected
      };

      const model2 = model1.insertElement(1, newElement);

      const result = model2.getElements();

      // Sequences should be 1, 2, 3
      expect(result[0].sequence).toBe(1);
      expect(result[1].sequence).toBe(2);
      expect(result[2].sequence).toBe(3);

      // Content in right order
      expect(result[0].content).toBe('Line 1');
      expect(result[1].content).toBe('Line 2 (inserted)');
      expect(result[2].content).toBe('Line 3');
    });

    it('should maintain sequence after deletion', () => {
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
          content: 'Line 2 (delete this)',
          sequence: 2
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: 'Line 3',
          sequence: 3
        }
      ];

      const model1 = ScriptModel.create(elements);
      const deleteId = elements[1].id;

      const model2 = model1.deleteElement(deleteId);

      const result = model2.getElements();

      // Should have 2 elements with sequences 1, 2
      expect(result.length).toBe(2);
      expect(result[0].sequence).toBe(1);
      expect(result[1].sequence).toBe(2);

      // Correct content preserved
      expect(result[0].content).toBe('Line 1');
      expect(result[1].content).toBe('Line 3');
    });
  });

  describe('Special Character Preservation', () => {
    it('should preserve Unicode characters', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'Hola! ¿Cómo estás? 你好',
          sequence: 1,
          character: 'MARIA'
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          content: '🎬 Camera pans left.',
          sequence: 2
        }
      ];

      const model1 = ScriptModel.create(elements);
      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);

      const restored = model2.getElements();
      expect(restored[0].content).toBe('Hola! ¿Cómo estás? 你好');
      expect(restored[1].content).toBe('🎬 Camera pans left.');
    });

    it('should preserve special screenplay characters', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: 'He said, "What?!" and left...',
          sequence: 1,
          character: 'JOHN'
        },
        {
          id: crypto.randomUUID(),
          type: 'parenthetical',
          content: '(beat; then, quietly)',
          sequence: 2
        }
      ];

      const model1 = ScriptModel.create(elements);
      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);

      const restored = model2.getElements();
      expect(restored[0].content).toBe('He said, "What?!" and left...');
      expect(restored[1].content).toBe('(beat; then, quietly)');
    });
  });

  describe('Large Script Stress Test', () => {
    it('should handle 500-element script without data loss', () => {
      const elements: ScriptElement[] = [];

      // Generate 500 elements
      for (let i = 0; i < 500; i++) {
        elements.push({
          id: crypto.randomUUID(),
          type: i % 4 === 0 ? 'scene_heading' : i % 2 === 0 ? 'action' : 'dialogue',
          content: `Element ${i + 1}`,
          sequence: i + 1,
          character: i % 2 !== 0 ? 'CHARACTER' : undefined
        });
      }

      const model1 = ScriptModel.create(elements);
      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);

      expect(model2.getElementCount()).toBe(500);

      // Spot check a few elements
      const restored = model2.getElements();
      expect(restored[0].content).toBe('Element 1');
      expect(restored[249].content).toBe('Element 250');
      expect(restored[499].content).toBe('Element 500');
    });
  });

  describe('Validation Report Preservation', () => {
    it('should preserve validation report through serialization', () => {
      const elements: ScriptElement[] = [
        {
          id: crypto.randomUUID(),
          type: 'character',
          content: 'john', // Lowercase - will trigger warning
          sequence: 1
        }
      ];

      const model1 = ScriptModel.create(elements);
      const report1 = model1.getValidationReport();

      const json = model1.toJSON();
      const model2 = ScriptModel.fromJSON(json);
      const report2 = model2.getValidationReport();

      // Reports should match
      expect(report2.valid).toBe(report1.valid);
      expect(report2.confidence).toBeCloseTo(report1.confidence, 2);
      expect(report2.issues.length).toBe(report1.issues.length);
    });
  });
});
