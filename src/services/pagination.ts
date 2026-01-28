import { ScriptElement } from '../types';

/*
 * 📏 PAGINATION ENGINE (FinalDraft-Compliant)
 * Aligned with Industry Standards (US Letter / Final Draft)
 * 
 * METRICS:
 * - Font: 12pt Courier
 * - Line Height: ~1 (Strict grid)
 * - Page Height: ~54 lines of printable content (6 lines/inch * 9 inches)
 */

const PAGE_LINES = 54;

// Actual widths in characters (Courier is monospaced at ~10 chars/inch)
const LINE_WIDTHS = {
    scene_heading: 60,
    action: 60,
    character: 35,
    dialogue: 35,
    parenthetical: 25,
    transition: 20
};

export interface PaginatedPage {
    pageNumber: number;
    elements: ScriptElement[];
}

/**
 * Helper: Splits text into lines based on max width
 */
const splitTextIntoLines = (text: string, maxWidth: number): string[] => {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];

    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        if (word.length > maxWidth) {
            // Hard wrap for super long words
            if (currentLine) {
                lines.push(currentLine);
                currentLine = "";
            }
            const chunks = word.match(new RegExp(`.{1,${maxWidth}}`, 'g')) || [];
            if (chunks.length > 0) {
                // Add all but last chunk as lines
                lines.push(...chunks.slice(0, -1));
                // Last chunk becomes start of new line
                currentLine = chunks[chunks.length - 1];
            }
            continue;
        }

        if (currentLine.length + 1 + word.length > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = currentLine ? `${currentLine} ${word}` : word;
        }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
};

/**
 * Calculates how many lines an element occupies
 */
const calculateElementLines = (el: ScriptElement): number => {
    const content = el.content || '';
    if (content.length === 0) return 1;
    const maxChars = LINE_WIDTHS[el.type] || LINE_WIDTHS.action;
    const lines = splitTextIntoLines(content, maxChars);
    return Math.max(1, lines.length);
};

/**
 * Calculates height including spacing before
 */
const calculateElementHeight = (el: ScriptElement, isFirstOnPage: boolean): number => {
    const textLines = calculateElementLines(el);
    let spacingBefore = 0;

    if (!isFirstOnPage) {
        switch (el.type) {
            case 'scene_heading': spacingBefore = 2; break;
            case 'action':
            case 'character':
            case 'transition': spacingBefore = 1; break;
            case 'dialogue':
            case 'parenthetical': spacingBefore = 0; break;
        }
    }
    return spacingBefore + textLines;
};

/**
 * P0: The Dialogue Continuation Engine
 * Takes a raw list of elements and returns a list of elements 
 * with visual splits (MORE/CONT'D) applied.
 */
export const paginateScript = (elements: ScriptElement[]): PaginatedPage[] => {
    const pages: PaginatedPage[] = [];
    let currentPageElements: ScriptElement[] = [];
    let currentLine = 1;
    let pageNumber = 1;

    // Helper to flush current page
    const flushPage = () => {
        pages.push({ pageNumber, elements: [...currentPageElements] });
        pageNumber++;
        currentPageElements = [];
        currentLine = 1;
    };

    // Filter valid elements
    const queue = elements.filter(el => el.type && el.id);

    for (let i = 0; i < queue.length; i++) {
        const el = { ...queue[i] }; // Clone to avoid mutation
        const isFirstOnPage = currentLine === 1;
        const elHeight = calculateElementHeight(el, isFirstOnPage);
        const spacingBefore = calculateElementHeight(el, isFirstOnPage) - calculateElementLines(el);

        // 1. Check if it fits
        if (currentLine + elHeight <= PAGE_LINES) {
            currentPageElements.push(el);
            currentLine += elHeight;
            continue;
        }

        // 2. It doesn't fit. Can we split it?
        // Only Dialogue (and Action, rarely) splits.
        // We prioritize splitting Dialogue.
        
        if (el.type !== 'dialogue') {
            // Force Page Break
            flushPage();
            // Re-evaluate on new page (spacing collapses)
            currentPageElements.push(el);
            currentLine += calculateElementHeight(el, true);
            continue;
        }

        // 3. Dialogue Split Logic
        // We have `currentLine` usage. Max is `PAGE_LINES`.
        // Available lines for text = PAGE_LINES - currentLine - spacingBefore
        const availableLines = PAGE_LINES - currentLine - spacingBefore;

        // Rules:
        // - Need at least 2 lines of dialogue to start on bottom of page
        // - Need at least 2 lines of dialogue to carry over to next page
        
        // Get text lines
        const allLines = splitTextIntoLines(el.content, LINE_WIDTHS.dialogue);
        
        // Check "Widow/Orphan" protection for dialogue
        if (availableLines < 2 || (allLines.length - availableLines) < 2) {
             // Push entire block to next page
             flushPage();
             currentPageElements.push(el);
             currentLine += calculateElementHeight(el, true);
             continue;
        }

        // PERFORM SPLIT
        // Part 1: Fits on current page
        // We need room for (MORE) line? 
        // Standard: (MORE) takes 1 line. So availableLines - 1.
        const splitIndex = availableLines - 1; 
        
        if (splitIndex < 1) {
            // Not enough room for text + (MORE)
            flushPage();
            currentPageElements.push(el);
            currentLine += calculateElementHeight(el, true);
            continue;
        }

        const part1Lines = allLines.slice(0, splitIndex);
        const part2Lines = allLines.slice(splitIndex);

        // Create Element Part 1
        const part1: ScriptElement = {
            ...el,
            id: `${el.id}-part1`,
            content: part1Lines.join(' '),
            notes: '(MORE)' // Render this via CSS/Decorator or explicit node
        };

        currentPageElements.push(part1);
        flushPage(); // BREAK PAGE

        // Create Link (Character CONT'D)
        // Find most recent character
        let characterName = "CHARACTER";
        for (let k = currentPageElements.length - 1; k >= 0; k--) {
             // Look back in previous page? No, we just flushed it.
             // Look back in original queue?
             // Actually, we usually iterate `queue` linearly.
             // Find previous character in `queue`
             // Simple hack: Look at `queue[i-1]`. If parenthetical, look at `queue[i-2]`.
        }
        
        // Robust way: Scan backwards in original list
        for (let k = i - 1; k >= 0; k--) {
            if (queue[k].type === 'character') {
                characterName = queue[k].content;
                break;
            }
        }

        const contdChar: ScriptElement = {
            id: `${el.id}-contd`,
            type: 'character',
            content: `${characterName} (CONT'D)`
        };

        const part2: ScriptElement = {
            ...el, // Keep original ID for the main part? Or new ID?
            // Ideally we want the second part to be editable if possible, but virtual is safer.
            // Let's give it a deterministic ID based on split.
            id: el.id, // Keep original ID on the dominant part if we want editable? 
            // Actually, for a pure "Preview", unique IDs are fine.
            content: part2Lines.join(' ')
        };

        // Add (CONT'D) and Part 2 to new page
        currentPageElements.push(contdChar);
        currentLine += calculateElementHeight(contdChar, true);

        currentPageElements.push(part2);
        currentLine += calculateElementHeight(part2, false);
    }
    
    // Push final page
    if (currentPageElements.length > 0) {
        pages.push({ pageNumber, elements: currentPageElements });
    }

    return pages;
};

/**
 * Legacy support for simple map (used by editor decorations maybe)
 */
export const calculatePagination = (elements: ScriptElement[]): Record<string, number> => {
    // This is an approximation since we don't return the split elements map
    // Just run the detailed one and map original IDs to pages.
    const pages = paginateScript(elements);
    const map: Record<string, number> = {};
    
    pages.forEach(p => {
        p.elements.forEach(el => {
            // formatting: id-part1 is still associated with id?
            const originalId = el.id.split('-part1')[0]; 
            if (!map[originalId]) map[originalId] = p.pageNumber;
        });
    });
    
    return map;
};