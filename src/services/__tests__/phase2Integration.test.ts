/**
 * PHASE 2 INTEGRATION TESTS
 * 
 * Tests that validation is properly integrated into all parsers:
 * - Fountain (.fountain, .txt)
 * - FDX (.fdx)
 * - PDF (.pdf)
 * 
 * Validates:
 * - ScriptModel is returned
 * - Validation reports are generated
 * - Auto-fix works correctly
 * - Confidence scoring works
 * - Edge cases are handled
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseScript } from '../scriptParser';
import type { ParsedScript } from '../scriptParser';

// --- MOCK DATA ---

const mockFountainScript = `Title: TEST SCRIPT
Credit: Written by
Author: Test Author

INT. COFFEE SHOP - DAY

John enters, looking around nervously.

JOHN
Hello?

(beat)
Anyone here?

MARY
Over here!

JOHN^  
What?

MARY
I said over here!
`;

const mockFDXScript = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft>
  <Content>
    <Paragraph Type="Scene Heading">
      <Text>INT. OFFICE - DAY</Text>
    </Paragraph>
    <Paragraph Type="Action">
      <Text>Bob walks in.</Text>
    </Paragraph>
    <Paragraph Type="Character">
      <Text>BOB</Text>
    </Paragraph>
    <Paragraph Type="Dialogue">
      <Text>Hello everyone.</Text>
    </Paragraph>
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Type="Title">
        <Text>TEST FDX SCRIPT</Text>
      </Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`;

const mockInvalidFountainScript = `Title: Invalid Script

INT. TEST - DAY

john
this character is lowercase

(this is wrong
no closing paren

JANE

`;

// --- HELPER FUNCTIONS ---

function createMockFile(content: string, filename: string): File {
  return new File([content], filename, { type: 'text/plain' });
}

// --- TESTS ---

describe('Phase 2: Parser Integration', () => {
  describe('Fountain Parser Integration', () => {
    it('should return ScriptModel with validation report', async () => {
      const file = createMockFile(mockFountainScript, 'test.fountain');
      const result = await parseScript(file);

      // Check structure
      expect(result).toHaveProperty('scriptModel');
      expect(result).toHaveProperty('validationReport');
      expect(result).toHaveProperty('autoFixAvailable');
      expect(result.elements).toBeDefined();
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should include confidence score in validation report', async () => {
      const file = createMockFile(mockFountainScript, 'test.fountain');
      const result = await parseScript(file);

      expect(result.validationReport.confidence).toBeGreaterThanOrEqual(0);
      expect(result.validationReport.confidence).toBeLessThanOrEqual(1);
      expect(result.validationReport).toHaveProperty('valid');
      expect(result.validationReport).toHaveProperty('issues');
      expect(result.validationReport).toHaveProperty('summary');
    });

    it('should detect dual dialogue', async () => {
      const file = createMockFile(mockFountainScript, 'test.fountain');
      const result = await parseScript(file);

      const dualElements = result.elements.filter(e => e.dual);
      expect(dualElements.length).toBeGreaterThan(0);
    });

    it('should auto-fix when option is enabled', async () => {
      const file = createMockFile(mockInvalidFountainScript, 'invalid.fountain');
      const result = await parseScript(file, { autoFix: true });

      expect(result.autoFixedElements).toBeDefined();
      
      // Check that lowercase character was fixed
      const johnElement = result.elements.find(
        e => e.type === 'character' && e.content.includes('JOHN')
      );
      expect(johnElement).toBeDefined();
    });

    it('should provide auto-fix suggestions when not auto-fixed', async () => {
      const file = createMockFile(mockInvalidFountainScript, 'invalid.fountain');
      const result = await parseScript(file, { autoFix: false });

      // Should detect issues
      expect(result.validationReport.issues.length).toBeGreaterThan(0);
      
      // Should indicate auto-fix is available
      expect(result.autoFixAvailable).toBe(true);
    });

    it('should preserve title page data', async () => {
      const file = createMockFile(mockFountainScript, 'test.fountain');
      const result = await parseScript(file);

      expect(result.titlePage).toBeDefined();
      expect(result.titlePage?.title).toBe('TEST SCRIPT');
      expect(result.titlePage?.authors).toContain('Test Author');
    });

    it('should handle strict mode rejection', async () => {
      const badScript = `Title: Bad\n\ncharacter\nlowercase dialogue`;
      const file = createMockFile(badScript, 'bad.fountain');

      // Strict mode should throw on invalid scripts
      await expect(
        parseScript(file, { strict: true, autoFix: false })
      ).rejects.toThrow(/validation failed/i);
    });
  });

  describe('FDX Parser Integration', () => {
    it('should return ScriptModel with validation report', async () => {
      const file = createMockFile(mockFDXScript, 'test.fdx');
      const result = await parseScript(file);

      expect(result).toHaveProperty('scriptModel');
      expect(result).toHaveProperty('validationReport');
      expect(result.elements).toBeDefined();
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should parse FDX structure correctly', async () => {
      const file = createMockFile(mockFDXScript, 'test.fdx');
      const result = await parseScript(file);

      // Check that elements were parsed
      const sceneHeading = result.elements.find(e => e.type === 'scene_heading');
      expect(sceneHeading).toBeDefined();
      expect(sceneHeading?.content).toContain('INT. OFFICE - DAY');

      const character = result.elements.find(e => e.type === 'character');
      expect(character).toBeDefined();
      expect(character?.content).toBe('BOB');

      const dialogue = result.elements.find(e => e.type === 'dialogue');
      expect(dialogue).toBeDefined();
    });

    it('should validate FDX imports', async () => {
      const file = createMockFile(mockFDXScript, 'test.fdx');
      const result = await parseScript(file);

      expect(result.validationReport.valid).toBe(true);
      expect(result.validationReport.confidence).toBeGreaterThan(0.7);
    });

    it('should handle FDX title page', async () => {
      const file = createMockFile(mockFDXScript, 'test.fdx');
      const result = await parseScript(file);

      expect(result.titlePage).toBeDefined();
      expect(result.titlePage?.title).toBe('TEST FDX SCRIPT');
    });
  });

  describe('ScriptModel Integration', () => {
    it('should provide immutable access to elements', async () => {
      const file = createMockFile(mockFountainScript, 'test.fountain');
      const result = await parseScript(file);

      const elements = result.scriptModel.getElements();
      expect(elements.length).toBeGreaterThan(0);

      // Attempting to modify should not affect original
      const elementsCopy = [...elements];
      elementsCopy.push({
        id: 'fake',
        type: 'action',
        content: 'fake',
        sequence: 999
      });

      const elementsAgain = result.scriptModel.getElements();
      expect(elementsAgain.length).toBe(elements.length);
    });

    it('should provide element type filtering', async () => {
      const file = createMockFile(mockFountainScript, 'test.fountain');
      const result = await parseScript(file);

      const characters = result.scriptModel.getElements().filter(e => e.type === 'character');
      const dialogue = result.scriptModel.getElements().filter(e => e.type === 'dialogue');

      expect(characters.length).toBeGreaterThan(0);
      expect(dialogue.length).toBeGreaterThan(0);
    });

    it('should preserve sequence order', async () => {
      const file = createMockFile(mockFountainScript, 'test.fountain');
      const result = await parseScript(file);

      const elements = result.scriptModel.getElements();
      let lastSequence = 0;

      for (const element of elements) {
        expect(element.sequence).toBeGreaterThanOrEqual(lastSequence);
        lastSequence = element.sequence;
      }
    });
  });

  describe('Validation Report Details', () => {
    it('should categorize issues by severity', async () => {
      const file = createMockFile(mockInvalidFountainScript, 'invalid.fountain');
      const result = await parseScript(file, { autoFix: false });

      expect(result.validationReport.summary).toHaveProperty('errors');
      expect(result.validationReport.summary).toHaveProperty('warnings');
      expect(result.validationReport.summary).toHaveProperty('info');
    });

    it('should provide issue codes and messages', async () => {
      const file = createMockFile(mockInvalidFountainScript, 'invalid.fountain');
      const result = await parseScript(file, { autoFix: false });

      if (result.validationReport.issues.length > 0) {
        const issue = result.validationReport.issues[0];
        expect(issue).toHaveProperty('code');
        expect(issue).toHaveProperty('message');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('elementId');
      }
    });

    it('should calculate confidence based on issue severity', async () => {
      const goodFile = createMockFile(mockFountainScript, 'good.fountain');
      const goodResult = await parseScript(goodFile, { autoFix: true });

      const badFile = createMockFile(mockInvalidFountainScript, 'bad.fountain');
      const badResult = await parseScript(badFile, { autoFix: false });

      expect(goodResult.validationReport.confidence).toBeGreaterThan(
        badResult.validationReport.confidence
      );
    });
  });

  describe('Auto-Fix Integration', () => {
    it('should fix character names to uppercase', async () => {
      const script = `INT. TEST - DAY\n\njohn\nHello.`;
      const file = createMockFile(script, 'test.fountain');
      const result = await parseScript(file, { autoFix: true });

      const character = result.elements.find(e => e.type === 'character');
      expect(character?.content).toBe('JOHN');
    });

    it('should fix parenthetical formatting', async () => {
      const script = `INT. TEST - DAY\n\nJOHN\nbeat\nHello.`;
      const file = createMockFile(script, 'test.fountain');
      const result = await parseScript(file, { autoFix: true });

      const paren = result.elements.find(e => e.content.includes('beat'));
      expect(paren?.content).toMatch(/^\(/); // Should start with (
    });

    it('should remove empty elements', async () => {
      const script = `INT. TEST - DAY\n\nJOHN\n\n\nHello.`;
      const file = createMockFile(script, 'test.fountain');
      const result = await parseScript(file, { autoFix: true });

      const emptyElements = result.elements.filter(e => !e.content.trim());
      expect(emptyElements.length).toBe(0);
    });

    it('should log auto-fix actions', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const file = createMockFile(mockInvalidFountainScript, 'invalid.fountain');
      
      await parseScript(file, { autoFix: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Auto-fixed/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scripts', async () => {
      const file = createMockFile('', 'empty.fountain');
      const result = await parseScript(file);

      expect(result.elements).toHaveLength(0);
      expect(result.validationReport.valid).toBe(true); // Empty is technically valid
    });

    it('should handle scripts with only title page', async () => {
      const script = `Title: Title Only\nAuthor: Someone`;
      const file = createMockFile(script, 'titleonly.fountain');
      const result = await parseScript(file);

      expect(result.titlePage).toBeDefined();
      expect(result.titlePage?.title).toBe('Title Only');
    });

    it('should handle malformed dual dialogue', async () => {
      const script = `INT. TEST - DAY\n\nJOHN^\nHello.\n\n(no second character)`;
      const file = createMockFile(script, 'baddual.fountain');
      const result = await parseScript(file, { autoFix: false });

      // Should detect dual dialogue issue
      const dualIssue = result.validationReport.issues.find(
        i => i.code === 'DUAL_DIALOGUE_UNPAIRED'
      );
      expect(dualIssue).toBeDefined();
    });

    it('should handle very long scripts efficiently', async () => {
      // Generate a 500-element script
      let longScript = 'Title: Long Script\n\n';
      for (let i = 0; i < 100; i++) {
        longScript += `INT. SCENE ${i} - DAY\n\nJOHN\nDialogue ${i}.\n\n`;
      }

      const file = createMockFile(longScript, 'long.fountain');
      const startTime = Date.now();
      const result = await parseScript(file);
      const duration = Date.now() - startTime;

      expect(result.elements.length).toBeGreaterThan(300);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Console Logging', () => {
    it('should log validation results', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const file = createMockFile(mockFountainScript, 'test.fountain');
      
      await parseScript(file);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Phase 2 Validation.*Confidence/)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Errors.*Warnings/)
      );

      consoleSpy.mockRestore();
    });
  });
});
