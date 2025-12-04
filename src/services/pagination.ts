import { ScriptElement } from '../types';

/*
 * 📏 PAGINATION ENGINE (FinalDraft-Compliant)
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
 * 
 * KEEP-TOGETHER RULES (FinalDraft Standard):
 * - Character + minimum 2 lines of dialogue
 * - Scene Heading + minimum 2 lines of content
 * - Action blocks < 4 lines try to stay together
 * - Transitions prefer bottom of page
 */

const PAGE_LINES = 54; // Safe printable area for 8.5x11

// Actual widths in characters (Courier is monospaced at ~10 chars/inch)
const LINE_WIDTHS = {
    scene_heading: 60,   // 6.0 inches
    action: 60,          // 6.0 inches
    character: 35,       // 3.5 inches (centered, but width limited)
    dialogue: 35,        // 3.5 inches
    parenthetical: 25,   // 2.5 inches
    transition: 20       // 2.0 inches (right-aligned)
};

interface PageBreakMap {
    [elementId: string]: number; // Maps element ID to the Page Number it STARTS on
}

/**
 * Calculate how many lines an element will occupy, accounting for word wrapping
 */
const calculateElementLines = (el: ScriptElement): number => {
    const content = el.content || '';
    if (content.length === 0) return 1;

    const maxChars = LINE_WIDTHS[el.type] || LINE_WIDTHS.action;

    // Word-wrap aware calculation
    const words = content.split(/\s+/);
    let lines = 1;
    let currentLineLength = 0;

    for (const word of words) {
        const wordLength = word.length;

        // If word itself is longer than line, it will wrap mid-word
        if (wordLength > maxChars) {
            lines += Math.ceil(wordLength / maxChars);
            currentLineLength = wordLength % maxChars;
        }
        // If adding this word would overflow, wrap to next line
        else if (currentLineLength + wordLength + 1 > maxChars) {
            lines++;
            currentLineLength = wordLength;
        }
        // Word fits on current line
        else {
            currentLineLength += wordLength + (currentLineLength > 0 ? 1 : 0);
        }
    }

    return lines;
};

/**
 * Calculate the total height of an element including spacing
 */
const calculateElementHeight = (el: ScriptElement, isFirstOnPage: boolean): number => {
    const textLines = calculateElementLines(el);
    let spacingBefore = 0;

    // Spacing rules (collapse to 0 if first on page)
    if (!isFirstOnPage) {
        switch (el.type) {
            case 'scene_heading':
                spacingBefore = 2;
                break;
            case 'action':
            case 'character':
            case 'transition':
                spacingBefore = 1;
                break;
            case 'dialogue':
            case 'parenthetical':
                spacingBefore = 0;
                break;
        }
    }

    return spacingBefore + textLines;
};

/**
 * Main pagination calculation function
 * Returns a map of element IDs to page numbers
 */
export const calculatePagination = (elements: ScriptElement[], projectId?: string): PageBreakMap => {
    const map: PageBreakMap = {};
    let currentLine = 1;
    let currentPage = 1;

    // console.log(`[Pagination] Starting calculation for ${elements.length} elements`);

    // Filter out empty/invalid elements that shouldn't be paginated
    // This prevents phantom empty lines from creating unnecessary pages
    const validElements = elements.filter(el => {
        // Must have valid type
        if (!el.type) return false;
        // Must have ID
        if (!el.id) return false;
        
        // Empty scene headings/transitions/characters can stay (they imply structure)
        // But empty action/dialogue should be filtered as they are usually just newlines
        if (el.type === 'action' || el.type === 'dialogue') {
            if (!el.content || el.content.trim().length === 0) {
                return false;
            }
        }
        return true;
    });

    const elementsToProcess = validElements;

    // Clear previous pagination metadata (on the original objects, though note this mutates refs)
    elements.forEach(el => {
        delete el.isContinued;
        delete el.continuesNext;
        delete el.keptTogether;
    });

    for (let i = 0; i < elementsToProcess.length; i++) {
        const el = elementsToProcess[i];
        const isFirstOnPage = currentLine === 1;
        const totalElementHeight = calculateElementHeight(el, isFirstOnPage);

        let forceBreak = false;
        let keepTogetherReason = '';

        // ═══════════════════════════════════════════════════════════
        // KEEP-TOGETHER RULES (FinalDraft Standards)
        // ═══════════════════════════════════════════════════════════

        // Rule 1: CHARACTER + minimum 2 lines of DIALOGUE must stay together
        if (el.type === 'character' && i + 1 < elementsToProcess.length) {
            const dialogueBlock: ScriptElement[] = [];
            let j = i + 1;

            // Gather the full dialogue block (parenthetical + dialogue)
            while (j < elementsToProcess.length &&
                (elementsToProcess[j].type === 'parenthetical' || elementsToProcess[j].type === 'dialogue')) {
                dialogueBlock.push(elementsToProcess[j]);
                j++;
            }

            if (dialogueBlock.length > 0) {
                // Calculate height of character + first 2 lines of dialogue
                let blockHeight = totalElementHeight; // Character
                let dialogueLines = 0;

                for (const dialogueEl of dialogueBlock) {
                    const elHeight = calculateElementHeight(dialogueEl, false);
                    blockHeight += elHeight;
                    dialogueLines += elHeight;

                    // Need at least 2 lines of dialogue content
                    if (dialogueLines >= 2) break;
                }

                // If character + 2 dialogue lines won't fit, break now
                if (currentLine + blockHeight > PAGE_LINES) {
                    forceBreak = true;
                    keepTogetherReason = 'character-dialogue';
                }
            }
        }

        // Rule 2: SCENE HEADING + minimum 2 lines of following content
        if (el.type === 'scene_heading' && i + 1 < elementsToProcess.length) {
            const nextEl = elementsToProcess[i + 1];

            // Exception: Establishing shots (scene heading followed by another scene heading)
            const isEstablishing = nextEl.type === 'scene_heading';

            if (!isEstablishing) {
                // Need heading + at least 2 lines of following content
                const nextHeight = calculateElementHeight(nextEl, false);
                const minFollowingLines = Math.min(nextHeight, 2);

                if (currentLine + totalElementHeight + minFollowingLines > PAGE_LINES) {
                    forceBreak = true;
                    keepTogetherReason = 'scene-heading-content';
                }
            }
        }

        // Rule 3: Short ACTION blocks (< 4 lines) try to stay together
        if (el.type === 'action') {
            const actionLines = calculateElementLines(el);

            // If action is short and would create orphan at bottom, keep together
            if (actionLines <= 3 && actionLines > 1) {
                // Would this create an orphan (1 line at bottom)?
                if (currentLine + totalElementHeight > PAGE_LINES &&
                    currentLine + totalElementHeight <= PAGE_LINES + 1) {
                    forceBreak = true;
                    keepTogetherReason = 'action-orphan';
                }
            }
        }

        // Rule 4: TRANSITIONS prefer bottom of page (don't orphan at top)
        if (el.type === 'transition') {
            // If transition would be first or second line on new page, keep it on previous
            if (currentLine > PAGE_LINES - 2 && currentLine <= PAGE_LINES) {
                // Let it stay at bottom of current page
            } else if (currentLine + totalElementHeight > PAGE_LINES) {
                // Would overflow to next page
                forceBreak = true;
            }
        }

        // ═══════════════════════════════════════════════════════════
        // PAGE BREAK LOGIC
        // ═══════════════════════════════════════════════════════════

        // Basic overflow check
        if (!forceBreak && currentLine + totalElementHeight > PAGE_LINES) {
            forceBreak = true;
        }

        // Apply page break if needed
        if (forceBreak) {
            currentPage++;
            currentLine = 1;
            
            // console.log(`[Pagination] Page Break at Element ${i} (${el.type}). Reason: ${keepTogetherReason || 'Overflow'}. Page: ${currentPage}`);

            // Mark elements as kept together for visual feedback
            if (keepTogetherReason) {
                el.keptTogether = true;
            }
        }

        // Map this element to its page
        map[el.id] = currentPage;

        // Advance the line counter
        // Recalculate height since we might be first on page now
        const actualHeight = calculateElementHeight(el, currentLine === 1);
        currentLine += actualHeight;
    }

    // console.log(`[Pagination] Finished. Total Pages: ${currentPage}`);
    return map;
};