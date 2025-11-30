import { ScriptElement } from '../types';

/*
 * 📏 PAGINATION ENGINE
 * Aligned with Industry Standards (US Letter / Final Draft)
 * 
 * METRICS:
 * - Font: 12pt Courier
 * - Line Height: ~1 (Strict grid)
 * - Page Height: ~54 lines of printable content (6 lines/inch * 9 inches)
 * 
 * ELEMENT SPACING RULES:
 * - Scene Heading: 2 lines before, 1 line text.
 * - Action: 1 line before, N lines text.
 * - Character: 1 line before, 1 line text.
 * - Dialogue: 0 lines before, N lines text.
 * - Parenthetical: 0 lines before, 1 line text.
 * - Transition: 1 line before, 1 line text.
 */

const PAGE_LINES = 54; // Safe printable area for 8.5x11
const CHARS_PER_LINE_ACTION = 60;
const CHARS_PER_LINE_DIALOGUE = 35; 
const CHARS_PER_LINE_TRANSITION = 15; // Usually right aligned, short space

interface PageBreakMap {
    [elementId: string]: number; // Maps element ID to the Page Number it STARTS on
}

export const calculatePagination = (elements: ScriptElement[]): PageBreakMap => {
    const map: PageBreakMap = {};
    let currentLine = 1;
    let currentPage = 1;

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        
        // 1. Calculate Element Height (in lines)
        let spacingBefore = 0;
        let textLines = 1;
        const textLength = el.content.length;

        switch (el.type) {
            case 'scene_heading':
                // Standard: 2 blank lines before a scene header
                // Exception: If it's the very first line of a page, 0 lines before
                spacingBefore = (currentLine === 1) ? 0 : 2;
                textLines = Math.ceil((textLength || 1) / CHARS_PER_LINE_ACTION); 
                break;
            case 'action':
                // Standard: 1 blank line before action blocks
                // Exception: If following a Scene Heading, usually 1 blank line is ALREADY visually there in some formats, 
                // but strictly speaking, Scene Headings have bottom margin.
                // We'll standardise: 1 line before unless first on page.
                const isFirstInScene = i > 0 && elements[i-1].type === 'scene_heading';
                // In our model, Scene Heading includes bottom margin? No, we treat spacing as "margin-top" of current element.
                spacingBefore = (currentLine === 1) ? 0 : 1; 
                textLines = Math.ceil((textLength || 1) / CHARS_PER_LINE_ACTION);
                break;
            case 'character':
                // 1 blank line before character
                spacingBefore = (currentLine === 1) ? 0 : 1;
                textLines = 1; // Names don't wrap usually
                break;
            case 'dialogue':
                // 0 blank lines before (attached to character/parenthetical)
                spacingBefore = 0;
                textLines = Math.ceil((textLength || 1) / CHARS_PER_LINE_DIALOGUE);
                break;
            case 'parenthetical':
                // 0 blank lines before
                spacingBefore = 0;
                textLines = Math.ceil((textLength || 1) / 25); // Parentheticals are narrower
                break;
            case 'transition':
                // 1 blank line before
                spacingBefore = (currentLine === 1) ? 0 : 1;
                textLines = Math.ceil((textLength || 1) / CHARS_PER_LINE_TRANSITION);
                break;
            default:
                spacingBefore = 1;
                textLines = 1;
        }

        const totalElementHeight = spacingBefore + textLines;

        // 2. ORPHAN / WIDOW CONTROL (Keep Together)
        let forceBreak = false;

        // Rule A: CHARACTER + DIALOGUE must stay together
        // If this is Character, and the NEXT element is Dialogue/Paren, check if they fit.
        if (el.type === 'character' && i + 1 < elements.length) {
            const nextEl = elements[i+1];
            // Estimate next element height
            // Note: We don't add spacingBefore for dialogue (it's 0)
            const nextTextLines = Math.ceil((nextEl.content.length || 1) / (nextEl.type === 'parenthetical' ? 25 : CHARS_PER_LINE_DIALOGUE));
            
            // Check if Character + First Line of Dialogue fits
            // We strictly need Char (1) + Dialogue (1) to fit.
            if (currentLine + totalElementHeight + 1 > PAGE_LINES) {
                forceBreak = true;
            }
        }

        // Rule B: SCENE HEADING must have at least 1 line of Action after it
        if (el.type === 'scene_heading' && i + 1 < elements.length) {
             // If we are at the very bottom, push to next page
             if (currentLine + totalElementHeight > PAGE_LINES - 2) {
                 forceBreak = true;
             }
        }

        // 3. APPLY BREAK
        // If the element itself doesn't fit...
        if (forceBreak || (currentLine + totalElementHeight > PAGE_LINES)) {
            currentPage++;
            currentLine = 1; 
            
            // If we moved to top of page, spacingBefore typically collapses to 0
            // But we keep the calculated height for the map logic? 
            // In a visual editor, the margin-top might still exist in CSS, 
            // but effectively it's the start of the page.
            // For the calculation counter, we reset:
            currentLine += (el.type === 'scene_heading' ? 0 : textLines); 
            // Note: Scene Headings at top of page don't need 2 blank lines before them in the counter
        } else {
            currentLine += totalElementHeight;
        }

        map[el.id] = currentPage;
    }

    return map;
};