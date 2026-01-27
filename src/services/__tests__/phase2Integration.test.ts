/**
 * PHASE 2 INTEGRATION TESTS
 * 
 * Tests that all parsers (Fountain, FDX, PDF) correctly integrate
 * with the Phase 1 validation system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseScript } from '../scriptParser';
import { ScriptElement } from '../../types';

// --- MOCK FILE HELPERS ---

function createMockFile(content: string, filename: string): File {
    const blob = new Blob([content], { type: 'text/plain' });
    return new File([blob], filename);
}

// --- TEST DATA ---

const VALID_FOUNTAIN = `Title: Test Script
Author: Test Author

INT. COFFEE SHOP - DAY

JOHN sits at a table.

JOHN
Hello world.

(nervous)
This is great.`;

const INVALID_FOUNTAIN = `INT. COFFEE SHOP - DAY

john
Hello world.

(( bad parenthetical
More dialogue.`;

const VALID_FDX = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft>
  <Content>
    <Paragraph Type="Scene Heading">
      <Text>INT. COFFEE SHOP - DAY</Text>
    </Paragraph>
    <Paragraph Type="Character">
      <Text>JOHN</Text>
    </Paragraph>
    <Paragraph Type="Dialogue">
      <Text>Hello world.</Text>
    </Paragraph>
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Type="Title">
        <Text>Test Script</Text>
      </Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`;

const INVALID_FDX = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft>
  <Content>
    <Paragraph Type="Character">
      <Text>john</Text>
    </Paragraph>
    <Paragraph Type="Dialogue">
      <Text></Text>
    </Paragraph>
  </Content>
</FinalDraft>`;

// --- TESTS ---

describe('Phase 2: Parser Integration', () => {
    
    // --- 1. FOUNTAIN PARSER ---
    
    describe('Fountain Parser Integration', () => {
        
        it('should return ScriptModel from Fountain parser', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            expect(result.scriptModel).toBeDefined();
            expect(result.scriptModel.getElements).toBeDefined();
            expect(result.scriptModel.getValidationReport).toBeDefined();
        });
        
        it('should return validation report from Fountain parser', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            expect(result.validationReport).toBeDefined();
            expect(result.validationReport.valid).toBeDefined();
            expect(result.validationReport.confidence).toBeGreaterThan(0);
            expect(result.validationReport.summary).toBeDefined();
        });
        
        it('should detect issues in invalid Fountain scripts', async () => {
            const file = createMockFile(INVALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            expect(result.validationReport.valid).toBe(false);
            expect(result.validationReport.issues.length).toBeGreaterThan(0);
            expect(result.validationReport.confidence).toBeLessThan(1.0);
        });
        
        it('should preserve backward compatibility (elements array)', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            // Old code should still work
            expect(result.elements).toBeDefined();
            expect(Array.isArray(result.elements)).toBe(true);
            expect(result.metadata).toBeDefined();
        });
        
        it('should extract title page from Fountain', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            expect(result.titlePage).toBeDefined();
            expect(result.titlePage?.title).toBe('Test Script');
            expect(result.titlePage?.authors).toContain('Test Author');
        });
    });
    
    // --- 2. FDX PARSER ---
    
    describe('FDX Parser Integration', () => {
        
        it('should return ScriptModel from FDX parser', async () => {
            const file = createMockFile(VALID_FDX, 'test.fdx');
            const result = await parseScript(file);
            
            expect(result.scriptModel).toBeDefined();
            expect(result.scriptModel.getElements().length).toBeGreaterThan(0);
        });
        
        it('should return validation report from FDX parser', async () => {
            const file = createMockFile(VALID_FDX, 'test.fdx');
            const result = await parseScript(file);
            
            expect(result.validationReport).toBeDefined();
            expect(result.validationReport.confidence).toBeGreaterThan(0);
        });
        
        it('should detect issues in invalid FDX scripts', async () => {
            const file = createMockFile(INVALID_FDX, 'test.fdx');
            const result = await parseScript(file);
            
            expect(result.validationReport.valid).toBe(false);
            expect(result.validationReport.issues.length).toBeGreaterThan(0);
        });
        
        it('should extract title page from FDX', async () => {
            const file = createMockFile(VALID_FDX, 'test.fdx');
            const result = await parseScript(file);
            
            expect(result.titlePage).toBeDefined();
            expect(result.titlePage?.title).toBe('Test Script');
        });
    });
    
    // --- 3. AUTO-FIX INTEGRATION ---
    
    describe('Auto-Fix Integration', () => {
        
        it('should auto-fix issues when autoFix option is true', async () => {
            const file = createMockFile(INVALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file, { autoFix: true });
            
            expect(result.autoFixedElements).toBeDefined();
            expect(result.validationReport.confidence).toBeGreaterThan(0.5);
        });
        
        it('should indicate when auto-fix is available', async () => {
            const file = createMockFile(INVALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file, { autoFix: false });
            
            expect(result.autoFixAvailable).toBe(true);
        });
        
        it('should not auto-fix when option is false', async () => {
            const file = createMockFile(INVALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file, { autoFix: false });
            
            expect(result.autoFixedElements).toBeUndefined();
        });
        
        it('should improve confidence score after auto-fix', async () => {
            const file = createMockFile(INVALID_FOUNTAIN, 'test.fountain');
            
            const withoutFix = await parseScript(file, { autoFix: false });
            const withFix = await parseScript(file, { autoFix: true });
            
            expect(withFix.validationReport.confidence).toBeGreaterThanOrEqual(
                withoutFix.validationReport.confidence
            );
        });
    });
    
    // --- 4. STRICT MODE ---
    
    describe('Strict Mode', () => {
        
        it('should throw error in strict mode for invalid scripts', async () => {
            const file = createMockFile(INVALID_FOUNTAIN, 'test.fountain');
            
            await expect(async () => {
                await parseScript(file, { strict: true });
            }).rejects.toThrow('Script validation failed');
        });
        
        it('should not throw error in strict mode for valid scripts', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            
            await expect(async () => {
                await parseScript(file, { strict: true });
            }).resolves.toBeDefined();
        });
    });
    
    // --- 5. VALIDATION REPORT DETAILS ---
    
    describe('Validation Report Details', () => {
        
        it('should include error and warning counts', async () => {
            const file = createMockFile(INVALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            expect(result.validationReport.summary).toBeDefined();
            expect(result.validationReport.summary.errors).toBeGreaterThanOrEqual(0);
            expect(result.validationReport.summary.warnings).toBeGreaterThanOrEqual(0);
        });
        
        it('should provide issue details with codes and messages', async () => {
            const file = createMockFile(INVALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            if (result.validationReport.issues.length > 0) {
                const issue = result.validationReport.issues[0];
                expect(issue.code).toBeDefined();
                expect(issue.message).toBeDefined();
                expect(issue.severity).toBeDefined();
            }
        });
        
        it('should calculate confidence score between 0 and 1', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            expect(result.validationReport.confidence).toBeGreaterThanOrEqual(0);
            expect(result.validationReport.confidence).toBeLessThanOrEqual(1);
        });
    });
    
    // --- 6. EDGE CASES ---
    
    describe('Edge Cases', () => {
        
        it('should handle empty scripts gracefully', async () => {
            const file = createMockFile('', 'empty.fountain');
            const result = await parseScript(file);
            
            expect(result.scriptModel).toBeDefined();
            expect(result.validationReport).toBeDefined();
        });
        
        it('should handle scripts with only title page', async () => {
            const titleOnly = 'Title: Just A Title\nAuthor: Me';
            const file = createMockFile(titleOnly, 'title.fountain');
            const result = await parseScript(file);
            
            expect(result.titlePage).toBeDefined();
            expect(result.scriptModel.getElements().length).toBeGreaterThanOrEqual(0);
        });
        
        it('should reject unsupported file formats', async () => {
            const file = createMockFile('test', 'invalid.xyz');
            
            await expect(async () => {
                await parseScript(file);
            }).rejects.toThrow('Unsupported format');
        });
        
        it('should handle .txt files as Fountain', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.txt');
            const result = await parseScript(file);
            
            expect(result.scriptModel).toBeDefined();
            expect(result.validationReport).toBeDefined();
        });
    });
    
    // --- 7. CONSOLE LOGGING ---
    
    describe('Console Logging', () => {
        
        it('should log validation results to console', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            await parseScript(file);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Phase 2 Validation] Confidence:')
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Phase 2 Validation] Errors:')
            );
            
            consoleSpy.mockRestore();
        });
    });
    
    // --- 8. SCRIPTMODEL METHODS ---
    
    describe('ScriptModel Integration', () => {
        
        it('should allow getting elements from ScriptModel', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            const elements = result.scriptModel.getElements();
            expect(Array.isArray(elements)).toBe(true);
            expect(elements.length).toBeGreaterThan(0);
        });
        
        it('should allow getting validation report from ScriptModel', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            const report = result.scriptModel.getValidationReport();
            expect(report).toBeDefined();
            expect(report.valid).toBeDefined();
        });
        
        it('should make ScriptModel immutable', async () => {
            const file = createMockFile(VALID_FOUNTAIN, 'test.fountain');
            const result = await parseScript(file);
            
            const elements = result.scriptModel.getElements();
            const originalLength = elements.length;
            
            // Try to mutate (should not affect original)
            elements.push({
                id: 'test',
                type: 'action',
                content: 'hacked',
                sequence: 999
            });
            
            // Get elements again - should be unchanged
            const elementsAgain = result.scriptModel.getElements();
            expect(elementsAgain.length).toBe(originalLength);
        });
    });
});
