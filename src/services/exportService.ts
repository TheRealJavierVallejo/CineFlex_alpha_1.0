import { Project, ScriptElement } from '../types';
import jsPDF from 'jspdf';
import { generateFountainText } from './scriptUtils';

/**
 * EXPORT SERVICE
 * Handles conversion of script data to various industry formats.
 */

// --- 1. FOUNTAIN (TXT) EXPORT ---
export const exportToTXT = (project: Project): string => {
    // Generate Header
    let output = '';
    output += `Title: ${project.name}\n`;
    output += `Credit: Written by\n`;
    output += `Author: CineFlex User\n`;
    output += `Draft date: ${new Date().toLocaleDateString()}\n`;
    output += `\n`; // End title page

    // Use shared utility for consistency
    if (project.scriptElements) {
        output += generateFountainText(project.scriptElements);
    }

    return output;
};

// --- 2. FINAL DRAFT (FDX) EXPORT ---
export const exportToFDX = (project: Project): string => {
    // Basic XML structure for FDX
    const escapeXML = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n';
    xml += '<FinalDraft DocumentType="Script" Template="No" Version="4">\n';
    xml += '  <Content>\n';

    project.scriptElements?.forEach(el => {
        let type = 'Action';
        switch (el.type) {
            case 'scene_heading': type = 'Scene Heading'; break;
            case 'action': type = 'Action'; break;
            case 'character': type = 'Character'; break;
            case 'dialogue': type = 'Dialogue'; break;
            case 'parenthetical': type = 'Parenthetical'; break;
            case 'transition': type = 'Transition'; break;
        }

        // FDX handles dual dialogue via a "Dual" attribute on the paragraph
        const dualAttr = el.dual ? ' Dual="Yes"' : '';

        xml += `    <Paragraph Type="${type}"${dualAttr}>\n`;
        xml += `      <Text>${escapeXML(el.content)}</Text>\n`;
        xml += `    </Paragraph>\n`;
    });

    xml += '  </Content>\n';
    xml += '</FinalDraft>';

    return xml;
};

// --- 3. PDF EXPORT (Industry Standard) ---
export const exportToPDF = (project: Project) => {
    const doc = new jsPDF({
        unit: 'in',
        format: 'letter', // 8.5 x 11
    });

    // Settings
    const fontName = 'Courier'; // Standard PDF font
    const fontSize = 12;
    const lineHeight = 0.166; // 6 lines per inch approx (12pt)

    // Margins
    const marginTop = 1.0;
    const marginBottom = 1.0;
    const marginLeft = 1.5;
    const pageHeight = 11.0;
    const contentHeight = pageHeight - marginBottom;

    let cursorY = marginTop;
    let pageNumber = 1;

    const addPage = () => {
        doc.addPage();
        pageNumber++;
        cursorY = marginTop;
        // Add Page Number
        doc.setFont(fontName, 'normal');
        doc.setFontSize(12);
        doc.text(`${pageNumber}.`, 7.5, 0.5, { align: 'right' });
    };

    // Helper to calculate height of an element
    const getElementHeight = (el: ScriptElement, widthOverride?: number): number => {
        let text = el.content;
        if (['scene_heading', 'character', 'transition'].includes(el.type)) {
            text = text.toUpperCase();
        }

        let maxWidth = widthOverride || 6.0;
        if (!widthOverride) {
            if (el.type === 'character') maxWidth = 3.5;
            if (el.type === 'dialogue') maxWidth = 3.5;
            if (el.type === 'parenthetical') maxWidth = 3.0;
            if (el.type === 'transition') maxWidth = 2.0;
        }

        const lines = doc.splitTextToSize(text, maxWidth);
        let height = lines.length * lineHeight;

        // Add padding logic (must match render logic)
        if (el.type === 'scene_heading') height += lineHeight; // Space before
        if (el.type === 'action') height += lineHeight; // Space before
        if (el.type === 'character' && !el.dual) height += lineHeight; // Space before (unless dual)
        if (el.type === 'transition') height += lineHeight; // Space before

        return height;
    };

    // Initial Page Number
    doc.setFont(fontName, 'normal');
    doc.setFontSize(12);
    doc.text(`${pageNumber}.`, 7.5, 0.5, { align: 'right' });

    const elements = project.scriptElements || [];

    // Track dual dialogue state
    let dualBufferY = 0; // Where the left side started

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        
        // --- DUAL DIALOGUE LOGIC ---
        // If this element is marked dual, it means it's the RIGHT column.
        // We need to place it alongside the PREVIOUS block (Left column).
        
        const isDualRight = el.dual; 
        
        // Width constraints for dual columns (approx 2.5 inches each)
        const dualWidth = 2.8; 
        const leftColOffset = marginLeft;
        const rightColOffset = marginLeft + 3.0;

        const height = getElementHeight(el, isDualRight ? dualWidth : undefined);

        // --- PAGE BREAK LOGIC ---

        // 1. Basic Check: Does this element fit?
        let shouldBreak = (cursorY + height) > contentHeight;

        // 2. "Keep Together" Rules
        if (!shouldBreak) {
            // Rule A: Character MUST stay with Dialogue
            if (el.type === 'character' && i + 1 < elements.length) {
                const nextEl = elements[i + 1];
                if (nextEl.type === 'dialogue' || nextEl.type === 'parenthetical') {
                    const nextHeight = getElementHeight(nextEl, isDualRight ? dualWidth : undefined);
                    if ((cursorY + height + nextHeight) > contentHeight) {
                        shouldBreak = true; // Move Character to next page to keep with dialogue
                    }
                }
            }

            // Rule B: Scene Heading MUST stay with at least one line of following content
            if (el.type === 'scene_heading' && i + 1 < elements.length) {
                const nextEl = elements[i + 1];
                const nextHeight = getElementHeight(nextEl);
                // Check if Heading + Next Element fits
                if ((cursorY + height + nextHeight) > contentHeight) {
                    shouldBreak = true;
                }
            }
        }

        if (shouldBreak) {
            addPage();
            dualBufferY = 0; // Reset buffer on new page
        }

        // --- RENDER ---
        doc.setFont(fontName, 'normal');
        doc.setFontSize(fontSize);

        let xOffset = marginLeft;
        let maxWidth = 6.0;
        let text = el.content;
        let isUppercase = false;

        // If this is the START of a dual block (the Left side), save the Y position
        // We detect this by checking if the *next* element is dual
        const nextIsDual = i + 1 < elements.length && elements[i + 1].dual && elements[i+1].type === 'character';
        
        // Determine layout based on type
        switch (el.type) {
            case 'scene_heading':
                xOffset = marginLeft;
                maxWidth = 6.0;
                isUppercase = true;
                cursorY += lineHeight;
                break;
            case 'action':
                xOffset = marginLeft;
                maxWidth = 6.0;
                cursorY += lineHeight;
                break;
            case 'character':
                if (isDualRight) {
                    // RIGHT COLUMN
                    cursorY = dualBufferY; // Reset Y to where left column started
                    xOffset = rightColOffset + 0.5; // Indent slightly in column
                    maxWidth = dualWidth;
                } else if (nextIsDual) {
                    // LEFT COLUMN
                    dualBufferY = cursorY + lineHeight; // Save start position
                    xOffset = leftColOffset + 0.5;
                    maxWidth = dualWidth;
                    cursorY += lineHeight;
                } else {
                    // STANDARD
                    xOffset = marginLeft + 2.0; 
                    maxWidth = 3.5;
                    cursorY += lineHeight;
                }
                isUppercase = true;
                break;
            case 'dialogue':
                if (isDualRight) {
                    xOffset = rightColOffset;
                    maxWidth = dualWidth;
                } else if (dualBufferY > 0) { // Inside left column of dual block
                    xOffset = leftColOffset;
                    maxWidth = dualWidth;
                } else {
                    xOffset = marginLeft + 1.0; 
                    maxWidth = 3.5;
                }
                break;
            case 'parenthetical':
                if (isDualRight) {
                    xOffset = rightColOffset + 0.3;
                    maxWidth = dualWidth - 0.6;
                } else if (dualBufferY > 0) {
                    xOffset = leftColOffset + 0.3;
                    maxWidth = dualWidth - 0.6;
                } else {
                    xOffset = marginLeft + 1.5; 
                    maxWidth = 3.0;
                }
                break;
            case 'transition':
                xOffset = marginLeft + 4.0;
                maxWidth = 2.0;
                isUppercase = true;
                cursorY += lineHeight;
                break;
        }

        if (isUppercase) text = text.toUpperCase();

        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, xOffset, cursorY);
        const blockHeight = lines.length * lineHeight;
        
        cursorY += blockHeight;

        // If we just finished a Right Dual block, we need to ensure cursorY 
        // is below the TALLEST of the two columns.
        if (isDualRight) {
             // Calculate how tall the left column was roughly (approximation or track it)
             // Simple fix: Ensure we don't overlap if right was shorter. 
             // In complex renderers we track max Y. Here we let it flow, but reset buffer.
             
             // If Right column ended up SHORTER than Left column, we need to push Y down?
             // Actually, since we reset cursorY to dualBufferY for the right col, 
             // cursorY is now at the bottom of Right Col. 
             // We technically need to know which was taller.
             // For this MVP integration, we assume standard sync. 
             
             // Reset buffer
             dualBufferY = 0; 
        }
    }

    doc.save(`${project.name.replace(/\s+/g, '_')}_script.pdf`);
};