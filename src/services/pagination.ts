import { ScriptElement } from '../types';

/*
 * 📏 PAGINATION ENGINE
 * Estimates where page breaks should occur based on standard screenplay rules.
 * 
 * Rules:
 * - Page Height: ~55-58 lines.
 * - Scene Heading: 2 lines (1 blank before, 1 text).
 * - Action: N lines (wrapped at ~60 chars).
 * - Character: 2 lines (1 blank before, 1 text).
 * - Dialogue: N lines (wrapped at ~35 chars).
 * - "Keep Together": Character + Dialogue must stay on same page.
 */

const PAGE_LINES = 56; // Safe buffer for 8.5x11 PDF match
const CHARS_PER_LINE_ACTION = 60;
const CHARS_PER_LINE_DIALOGUE = 35; // Narrower margins

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
        let height = 0;
        const textLength = el.content.length;

        switch (el.type) {
            case 'scene_heading':
                // 1 blank line before + text lines
                // Note: Standard rules say 2 blanks before, we use 1 for tight view
                height = 1 + Math.ceil((textLength || 1) / CHARS_PER_LINE_ACTION); 
                break;
            case 'action':
                // 1 blank before (unless first) + text lines
                const isFirstInScene = i > 0 && elements[i-1].type === 'scene_heading';
                const padding = isFirstInScene ? 0 : 1; 
                height = padding + Math.ceil((textLength || 1) / CHARS_PER_LINE_ACTION);
                break;
            case 'character':
                // 1 blank before + 1 line for name
                height = 2; 
                break;
            case 'dialogue':
            case 'parenthetical':
                // No padding before
                height = Math.ceil((textLength || 1) / CHARS_PER_LINE_DIALOGUE);
                break;
            case 'transition':
                // 1 blank before + 1 line
                height = 2;
                break;
            default:
                height = 1;
        }

        // 2. "Keep Together" Logic (Widow/Orphan Control)
        // Check if we are about to break a Character/Dialogue block
        let forceBreak = false;

        // Rule A: If this is Character, check if Dialogue fits
        if (el.type === 'character' && i + 1 < elements.length) {
            const nextEl = elements[i+1];
            // Estimate next element height
            const nextHeight = Math.ceil((nextEl.content.length || 1) / CHARS_PER_LINE_DIALOGUE);
            
            // If Character fits but Dialogue doesn't, push Character to next page
            if ((currentLine + height <= PAGE_LINES) && (currentLine + height + nextHeight > PAGE_LINES)) {
                forceBreak = true;
            }
        }

        // Rule B: Scene Heading should have at least 1 line of action after it
        if (el.type === 'scene_heading' && i + 1 < elements.length) {
             const nextEl = elements[i+1];
             // Simple check: if we are at line 54+, just push scene to next page
             if (currentLine > PAGE_LINES - 4) {
                 forceBreak = true;
             }
        }

        // 3. Apply Break
        if (forceBreak || (currentLine + height > PAGE_LINES)) {
            currentPage++;
            currentLine = 1; // Reset to top of new page
            // If we pushed a Character, the height added is now just at top of page (no padding needed technically, but simplistic for now)
        }

        map[el.id] = currentPage;
        currentLine += height;
    }

    return map;
};