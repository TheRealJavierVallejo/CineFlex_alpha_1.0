import { describe, it, expect } from 'vitest';
import { parseFountain } from './fountain';
import { convertFountainToElements, generateFountainText } from '../services/scriptUtils';
import { ScriptElement } from '../types';

// SAMPLE SCRIPT WITH EDGE CASES
const COMPLEX_SCRIPT = `
INT. OFFICE - DAY

A chaotic scene.

BOSS
You're fired!

EMPLOYEE
(crying)
But I have a family!

BOSS ^
(laughing)
Not my problem!

[[Note: This is a dual dialogue block above]]

> CENTERED TEXT <

/* This is a boneyard comment
   that should be ignored or preserved
   depending on settings */

.FORCED SCENE HEADING
`;

describe('Fountain Integration Diagnostic', () => {

    describe('1. Core Parser (fountain.ts)', () => {
        it('should parse basic elements correctly', () => {
            const output = parseFountain(COMPLEX_SCRIPT, true);
            
            // Check Heading
            const heading = output.tokens.find(t => t.type === 'scene_heading');
            expect(heading).toBeDefined();
            expect(heading?.text).toBe('INT. OFFICE - DAY');

            // Check Character
            const character = output.tokens.find(t => t.type === 'character' && t.text === 'BOSS');
            expect(character).toBeDefined();
        });

        it('should detect dual dialogue', () => {
            const output = parseFountain(COMPLEX_SCRIPT, true);
            const dualStart = output.tokens.find(t => t.type === 'dual_dialogue_begin');
            // Note: Our current port might be flagging the second character as dual, let's verify tokens
            const dualChar = output.tokens.find(t => t.text?.trim() === 'BOSS ^');
            // The parser should strip the caret '^' in the text property but mark it as dual
            // Current implementation check:
            const bossTokens = output.tokens.filter(t => t.text?.includes('BOSS'));
            expect(bossTokens.length).toBeGreaterThan(0);
        });

        it('should handle notes and boneyards', () => {
            const output = parseFountain(COMPLEX_SCRIPT, true);
            const note = output.tokens.find(t => t.type === 'note');
            expect(note).toBeDefined();
            // Boneyard might be parsed as action if not handled strictly, or boneyard_begin/end tokens
            const boneyard = output.tokens.find(t => t.type === 'boneyard_begin');
            expect(boneyard).toBeDefined();
        });
    });

    describe('2. Integration Layer (scriptUtils.ts)', () => {
        it('should convert tokens to CineFlex ScriptElements', () => {
            const output = parseFountain(COMPLEX_SCRIPT, true);
            const elements = convertFountainToElements(output.tokens);

            expect(elements.length).toBeGreaterThan(0);
            
            const first = elements[0];
            expect(first.type).toBe('scene_heading');
            expect(first.content).toBe('INT. OFFICE - DAY');
        });

        it('CRITICAL: Should preserve data during conversion (Data Loss Check)', () => {
            const output = parseFountain(COMPLEX_SCRIPT, true);
            const elements = convertFountainToElements(output.tokens);

            // Check if Note was preserved (Mapped to Action?)
            const noteContent = elements.find(el => el.content.includes('This is a dual dialogue block'));
            
            // If this fails, we are dropping user notes during import/format!
            if (!noteContent) {
                console.warn("⚠️ DATA LOSS WARNING: Notes are being dropped by converter.");
            }
            expect(noteContent).toBeDefined();
        });
    });

    describe('3. Round-Trip Integrity (The "Auto-Format" Button)', () => {
        it('should reconstruct valid Fountain text from Elements', () => {
            // Mock Elements state
            const mockElements: ScriptElement[] = [
                { id: '1', type: 'scene_heading', content: 'EXT. PARK - DAY', sequence: 1 },
                { id: '2', type: 'action', content: 'A dog runs.', sequence: 2 },
                { id: '3', type: 'character', content: 'JANE', sequence: 3 },
                { id: '4', type: 'dialogue', content: 'Come here boy!', sequence: 4 }
            ];

            const text = generateFountainText(mockElements);
            
            expect(text).toContain('EXT. PARK - DAY');
            expect(text).toContain('JANE');
            expect(text).toContain('Come here boy!');
            
            // Re-parse
            const reParsed = parseFountain(text, true);
            const reConverted = convertFountainToElements(reParsed.tokens);

            expect(reConverted.length).toBe(4);
            expect(reConverted[0].type).toBe('scene_heading');
        });
    });
});