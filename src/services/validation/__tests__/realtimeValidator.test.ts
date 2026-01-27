/**
 * PHASE 5: REALTIME VALIDATION TESTS
 * 
 * Tests for the real-time validation engine that powers
 * live error detection in the script editor.
 */

import { describe, it, expect } from 'vitest';
import {
    validateElementRealtime,
    validateAllElements,
    applyQuickFix,
    getValidationStats
} from '../realtimeValidator';
import { ScriptElement } from '../../../types';

// --- TEST HELPERS ---

const createTestElement = (type: string, content: string, id: string = 'test-1'): ScriptElement => ({
    id,
    type: type as any,
    content,
    sequence: 1
});

// --- TESTS ---

describe('Phase 5: Realtime Validation', () => {

    // --- CHARACTER NAME VALIDATION ---

    describe('Character Name Validation', () => {
        
        it('should flag lowercase character names as errors', () => {
            const element = createTestElement('character', 'john');
            const result = validateElementRealtime(element);
            
            expect(result.isValid).toBe(false);
            expect(result.markers).toHaveLength(1);
            expect(result.markers[0].severity).toBe('error');
            expect(result.markers[0].code).toBe('CHARACTER_NOT_UPPERCASE');
        });
        
        it('should suggest uppercase fix for character names', () => {
            const element = createTestElement('character', 'john doe');
            const result = validateElementRealtime(element);
            
            expect(result.markers[0].suggestedFix).toBe('JOHN DOE');
        });
        
        it('should accept uppercase character names', () => {
            const element = createTestElement('character', 'JOHN');
            const result = validateElementRealtime(element);
            
            expect(result.isValid).toBe(true);
            expect(result.markers).toHaveLength(0);
        });
        
        it('should allow extensions like (V.O.) in character names', () => {
            const element = createTestElement('character', 'JOHN (V.O.)');
            const result = validateElementRealtime(element);
            
            expect(result.isValid).toBe(true);
        });
        
        it('should flag empty character names', () => {
            const element = createTestElement('character', '');
            const result = validateElementRealtime(element);
            
            // Empty elements return valid (edge case)
            expect(result.isValid).toBe(true);
        });
        
        it('should warn about trailing whitespace', () => {
            const element = createTestElement('character', 'JOHN  ');
            const result = validateElementRealtime(element);
            
            const warning = result.markers.find(m => m.code === 'TRAILING_WHITESPACE');
            expect(warning).toBeDefined();
            expect(warning?.severity).toBe('warning');
        });
    });

    // --- PARENTHETICAL VALIDATION ---

    describe('Parenthetical Validation', () => {
        
        it('should flag missing opening parenthesis', () => {
            const element = createTestElement('parenthetical', 'nervous)');
            const result = validateElementRealtime(element);
            
            expect(result.isValid).toBe(false);
            const error = result.markers.find(m => m.code === 'PARENTHETICAL_FORMAT');
            expect(error).toBeDefined();
        });
        
        it('should flag missing closing parenthesis', () => {
            const element = createTestElement('parenthetical', '(nervous');
            const result = validateElementRealtime(element);
            
            expect(result.isValid).toBe(false);
            const error = result.markers.find(m => m.code === 'PARENTHETICAL_FORMAT');
            expect(error).toBeDefined();
        });
        
        it('should suggest proper format for parentheticals', () => {
            const element = createTestElement('parenthetical', 'nervous');
            const result = validateElementRealtime(element);
            
            expect(result.markers[0].suggestedFix).toBe('(nervous)');
        });
        
        it('should accept properly formatted parentheticals', () => {
            const element = createTestElement('parenthetical', '(nervous)');
            const result = validateElementRealtime(element);
            
            expect(result.isValid).toBe(true);
            expect(result.markers).toHaveLength(0);
        });
        
        it('should flag empty parentheticals', () => {
            const element = createTestElement('parenthetical', '()');
            const result = validateElementRealtime(element);
            
            const error = result.markers.find(m => m.code === 'EMPTY_PARENTHETICAL');
            expect(error).toBeDefined();
        });
    });

    // --- DIALOGUE VALIDATION ---

    describe('Dialogue Validation', () => {
        
        it('should accept normal dialogue', () => {
            const element = createTestElement('dialogue', 'Hello world.');
            const result = validateElementRealtime(element);
            
            expect(result.isValid).toBe(true);
        });
        
        it('should warn about excessive whitespace', () => {
            const element = createTestElement('dialogue', 'Hello   world.');
            const result = validateElementRealtime(element);
            
            const warning = result.markers.find(m => m.code === 'EXCESSIVE_WHITESPACE');
            expect(warning).toBeDefined();
            expect(warning?.suggestedFix).toBe('Hello world.');
        });
        
        it('should warn if action lines appear in dialogue', () => {
            const element = createTestElement('dialogue', 'INT. OFFICE - DAY');
            const result = validateElementRealtime(element);
            
            const warning = result.markers.find(m => m.code === 'ACTION_IN_DIALOGUE');
            expect(warning).toBeDefined();
        });
    });

    // --- SCENE HEADING VALIDATION ---

    describe('Scene Heading Validation', () => {
        
        it('should flag invalid scene heading prefix', () => {
            const element = createTestElement('scene_heading', 'OFFICE - DAY');
            const result = validateElementRealtime(element);
            
            const error = result.markers.find(m => m.code === 'INVALID_SCENE_PREFIX');
            expect(error).toBeDefined();
            expect(error?.suggestedFix).toContain('INT.');
        });
        
        it('should accept valid INT. prefix', () => {
            const element = createTestElement('scene_heading', 'INT. OFFICE - DAY');
            const result = validateElementRealtime(element);
            
            expect(result.markers.filter(m => m.code === 'INVALID_SCENE_PREFIX')).toHaveLength(0);
        });
        
        it('should accept valid EXT. prefix', () => {
            const element = createTestElement('scene_heading', 'EXT. PARK - NIGHT');
            const result = validateElementRealtime(element);
            
            expect(result.markers.filter(m => m.code === 'INVALID_SCENE_PREFIX')).toHaveLength(0);
        });
        
        it('should warn about missing time of day', () => {
            const element = createTestElement('scene_heading', 'INT. OFFICE');
            const result = validateElementRealtime(element);
            
            const warning = result.markers.find(m => m.code === 'MISSING_TIME_OF_DAY');
            expect(warning).toBeDefined();
        });
        
        it('should flag non-uppercase scene headings', () => {
            const element = createTestElement('scene_heading', 'int. office - day');
            const result = validateElementRealtime(element);
            
            const error = result.markers.find(m => m.code === 'SCENE_NOT_UPPERCASE');
            expect(error).toBeDefined();
        });
    });

    // --- TRANSITION VALIDATION ---

    describe('Transition Validation', () => {
        
        it('should flag missing colon in transitions', () => {
            const element = createTestElement('transition', 'CUT TO');
            const result = validateElementRealtime(element);
            
            const error = result.markers.find(m => m.code === 'TRANSITION_NO_COLON');
            expect(error).toBeDefined();
            expect(error?.suggestedFix).toBe('CUT TO:');
        });
        
        it('should accept properly formatted transitions', () => {
            const element = createTestElement('transition', 'CUT TO:');
            const result = validateElementRealtime(element);
            
            expect(result.markers.filter(m => m.severity === 'error')).toHaveLength(0);
        });
        
        it('should flag non-uppercase transitions', () => {
            const element = createTestElement('transition', 'cut to:');
            const result = validateElementRealtime(element);
            
            const error = result.markers.find(m => m.code === 'TRANSITION_NOT_UPPERCASE');
            expect(error).toBeDefined();
        });
    });

    // --- SEQUENCE VALIDATION ---

    describe('Element Sequence Validation', () => {
        
        it('should flag dialogue without character', () => {
            const elements: ScriptElement[] = [
                createTestElement('action', 'John walks in.', 'el-1'),
                createTestElement('dialogue', 'Hello world.', 'el-2')
            ];
            
            const results = validateAllElements(elements);
            const dialogueResult = results.get('el-2');
            
            expect(dialogueResult?.isValid).toBe(false);
            const error = dialogueResult?.markers.find(m => m.code === 'DIALOGUE_WITHOUT_CHARACTER');
            expect(error).toBeDefined();
        });
        
        it('should accept dialogue after character', () => {
            const elements: ScriptElement[] = [
                createTestElement('character', 'JOHN', 'el-1'),
                createTestElement('dialogue', 'Hello world.', 'el-2')
            ];
            
            const results = validateAllElements(elements);
            const dialogueResult = results.get('el-2');
            
            expect(dialogueResult?.markers.filter(m => m.code === 'DIALOGUE_WITHOUT_CHARACTER')).toHaveLength(0);
        });
        
        it('should flag orphaned parentheticals', () => {
            const elements: ScriptElement[] = [
                createTestElement('action', 'John walks in.', 'el-1'),
                createTestElement('parenthetical', '(nervous)', 'el-2')
            ];
            
            const results = validateAllElements(elements);
            const parenResult = results.get('el-2');
            
            const error = parenResult?.markers.find(m => m.code === 'ORPHANED_PARENTHETICAL');
            expect(error).toBeDefined();
        });
    });

    // --- QUICK FIX ---

    describe('Quick Fix Application', () => {
        
        it('should apply character name fix', () => {
            const element = createTestElement('character', 'john');
            const result = validateElementRealtime(element);
            const marker = result.markers[0];
            
            const fixed = applyQuickFix(element, marker);
            
            expect(fixed).toBeDefined();
            expect(fixed?.content).toBe('JOHN');
        });
        
        it('should apply parenthetical format fix', () => {
            const element = createTestElement('parenthetical', 'nervous');
            const result = validateElementRealtime(element);
            const marker = result.markers[0];
            
            const fixed = applyQuickFix(element, marker);
            
            expect(fixed).toBeDefined();
            expect(fixed?.content).toBe('(nervous)');
        });
        
        it('should return null if no fix available', () => {
            const element = createTestElement('character', '');
            const marker = {
                elementId: element.id,
                startOffset: 0,
                endOffset: 0,
                severity: 'error' as const,
                code: 'EMPTY_CHARACTER',
                message: 'Test'
            };
            
            const fixed = applyQuickFix(element, marker);
            expect(fixed).toBeNull();
        });
    });

    // --- BATCH VALIDATION ---

    describe('Batch Validation', () => {
        
        it('should validate all elements', () => {
            const elements: ScriptElement[] = [
                createTestElement('character', 'john', 'el-1'),
                createTestElement('dialogue', 'Hello', 'el-2'),
                createTestElement('character', 'SARAH', 'el-3'),
                createTestElement('dialogue', 'Hi', 'el-4')
            ];
            
            const results = validateAllElements(elements);
            
            expect(results.size).toBe(4);
            expect(results.get('el-1')?.isValid).toBe(false); // john (lowercase)
            expect(results.get('el-3')?.isValid).toBe(true);  // SARAH (uppercase)
        });
        
        it('should calculate validation stats', () => {
            const elements: ScriptElement[] = [
                createTestElement('character', 'john', 'el-1'),        // error
                createTestElement('parenthetical', 'nervous', 'el-2'), // error
                createTestElement('scene_heading', 'INT. OFFICE', 'el-3') // warning (no time)
            ];
            
            const results = validateAllElements(elements);
            const stats = getValidationStats(results);
            
            expect(stats.errors).toBeGreaterThan(0);
            expect(stats.warnings).toBeGreaterThan(0);
        });
    });

    // --- PERFORMANCE ---

    describe('Performance', () => {
        
        it('should validate 100 elements quickly', () => {
            const elements: ScriptElement[] = Array.from({ length: 100 }, (_, i) => 
                createTestElement('action', `Action line ${i}`, `el-${i}`)
            );
            
            const startTime = Date.now();
            validateAllElements(elements);
            const endTime = Date.now();
            
            // Should complete in under 100ms
            expect(endTime - startTime).toBeLessThan(100);
        });
    });
});
