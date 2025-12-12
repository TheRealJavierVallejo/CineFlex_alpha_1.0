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
    const words = content.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 1;

    let lines = 1;
    let currentLineLength = 0;

    for (const word of words) {
        const wordLength = word.length;

        // If word itself is longer than line, it will wrap mid-word
        if (wordLength > maxChars) {
            const additionalLines = Math.floor(wordLength / maxChars);
            lines += additionalLines;
            currentLineLength = wordLength % maxChars;
            continue;
        }

        // Calculate space needed (add 1 for space before word, except first word on line)
        const spaceNeeded = currentLineLength === 0 ? wordLength : currentLineLength + 1 + wordLength;

        // If adding this word would overflow, wrap to next line
        if (spaceNeeded > maxChars) {
            lines++;
            currentLineLength = wordLength;
        }
        // Word fits on current line
        else {
            currentLineLength = spaceNeeded;
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

    // Only filter out completely invalid elements (missing type or ID)
    // Keep empty elements as they may represent intentional spacing
    const validElements = elements.filter(el => {
        // Must have valid type
        if (!el.type) return false;
        // Must have ID
        if (!el.id) return false;
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
                // Calculate total height if starting on current page
                let blockHeight = calculateElementHeight(el, isFirstOnPage);
                let dialogueLines = 0;

                for (const dialogueEl of dialogueBlock) {
                    const elHeight = calculateElementHeight(dialogueEl, false);
                    blockHeight += elHeight;
                    dialogueLines += elHeight;

                    // Need at least 2 lines of dialogue content
                    if (dialogueLines >= 2) break;
                }

                // If character + 2 dialogue lines won't fit, break to next page
                if (currentLine + blockHeight > PAGE_LINES) {
                    forceBreak = true;
                    keepTogetherReason = 'character-dialogue';
                }
            }
        }

        // Rule 2: SCENE HEADING + minimum 2 lines of following content
        if (el.type === 'scene_heading' && i + 1 < elementsToProcess.length) {
            const nextEl = elementsToProcess[i + 1];

            // Exception: Multiple scene headings in a row are okay to split
            const isMultipleHeadings = nextEl.type === 'scene_heading';

            if (!isMultipleHeadings) {
                // Calculate heading + minimum 2 lines of next content
                const headingHeight = calculateElementHeight(el, isFirstOnPage);
                const nextHeight = calculateElementHeight(nextEl, false);
                const minFollowingLines = Math.min(nextHeight, 2);

                if (currentLine + headingHeight + minFollowingLines > PAGE_LINES) {
                    forceBreak = true;
                    keepTogetherReason = 'scene-heading-content';
                }
            }
        }

        // Rule 3: Short ACTION blocks (2-3 lines) try to stay together to avoid orphans
        if (el.type === 'action') {
            const actionLines = calculateElementLines(el);
            const actionHeight = calculateElementHeight(el, isFirstOnPage);

            // If action is short and would create orphan, keep it together
            if (actionLines >= 2 && actionLines <= 3) {
                // Would this split across pages with only 1 line at bottom?
                const remainingLines = PAGE_LINES - currentLine + 1;
                if (actionHeight > remainingLines && remainingLines <= 1) {
                    forceBreak = true;
                    keepTogetherReason = 'action-orphan';
                }
            }
        }

        // Rule 4: TRANSITIONS - Simple overflow check (no special positioning)
        if (el.type === 'transition') {
            const transitionHeight = calculateElementHeight(el, isFirstOnPage);
            if (currentLine + transitionHeight > PAGE_LINES) {
                forceBreak = true;
                keepTogetherReason = 'transition-overflow';
            }
        }

        // ═══════════════════════════════════════════════════════════
        // PAGE BREAK LOGIC
        // ═══════════════════════════════════════════════════════════

        // Basic overflow check for all other cases
        if (!forceBreak) {
            const elementHeight = calculateElementHeight(el, isFirstOnPage);
            if (currentLine + elementHeight > PAGE_LINES) {
                forceBreak = true;
            }
        }

        // Apply page break if needed
        if (forceBreak) {
            currentPage++;
            currentLine = 1;

            // console.log(`[Pagination] Page Break at Element ${i} (${el.type}). Reason: ${keepTogetherReason || 'Overflow'}. New Page: ${currentPage}`);

            // Mark elements as kept together for visual feedback
            if (keepTogetherReason) {
                el.keptTogether = true;
            }
        }

        // Map this element to its page
        map[el.id] = currentPage;

        // Advance the line counter (calculate height with UPDATED isFirstOnPage)
        const actualHeight = calculateElementHeight(el, currentLine === 1);
        currentLine += actualHeight;
    }

    // console.log(`[Pagination] Finished. Total Pages: ${currentPage}`);
    return map;
};