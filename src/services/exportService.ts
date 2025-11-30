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

        xml += `    <Paragraph Type="${type}">\n`;
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
    const getElementHeight = (el: ScriptElement): number => {
        let text = el.content;
        if (['scene_heading', 'character', 'transition'].includes(el.type)) {
            text = text.toUpperCase();
        }

        let maxWidth = 6.0;
        if (el.type === 'character') maxWidth = 3.5;
        if (el.type === 'dialogue') maxWidth = 3.5;
        if (el.type === 'parenthetical') maxWidth = 3.0;
        if (el.type === 'transition') maxWidth = 2.0;

        const lines = doc.splitTextToSize(text, maxWidth);
        let height = lines.length * lineHeight;

        // Add padding logic (must match render logic)
        if (el.type === 'scene_heading') height += lineHeight; // Space before
        if (el.type === 'action') height += lineHeight; // Space before
        if (el.type === 'character') height += lineHeight; // Space before
        if (el.type === 'transition') height += lineHeight; // Space before

        return height;
    };

    // Initial Page Number
    doc.setFont(fontName, 'normal');
    doc.setFontSize(12);
    doc.text(`${pageNumber}.`, 7.5, 0.5, { align: 'right' });

    const elements = project.scriptElements || [];

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const height = getElementHeight(el);

        // --- PAGE BREAK LOGIC ---

        // 1. Basic Check: Does this element fit?
        let shouldBreak = (cursorY + height) > contentHeight;

        // 2. "Keep Together" Rules
        if (!shouldBreak) {
            // Rule A: Character MUST stay with Dialogue
            if (el.type === 'character' && i + 1 < elements.length) {
                const nextEl = elements[i + 1];
                if (nextEl.type === 'dialogue' || nextEl.type === 'parenthetical') {
                    const nextHeight = getElementHeight(nextEl);
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
        }

        // --- RENDER ---
        doc.setFont(fontName, 'normal');
        doc.setFontSize(fontSize);

        let xOffset = marginLeft;
        let maxWidth = 6.0;
        let text = el.content;
        let isUppercase = false;

        switch (el.type) {
            case 'scene_heading':
                xOffset = marginLeft;
                maxWidth = 6.0;
                isUppercase = true;
                cursorY += lineHeight; // Space before
                break;
            case 'action':
                xOffset = marginLeft;
                maxWidth = 6.0;
                cursorY += lineHeight; // Space before
                break;
            case 'character':
                xOffset = marginLeft + 2.0; // 3.5" from edge
                maxWidth = 3.5;
                isUppercase = true;
                cursorY += lineHeight; // Space before
                break;
            case 'dialogue':
                xOffset = marginLeft + 1.0; // 2.5" from edge
                maxWidth = 3.5;
                break;
            case 'parenthetical':
                xOffset = marginLeft + 1.5; // 3.0" from edge
                maxWidth = 3.0;
                break;
            case 'transition':
                xOffset = marginLeft + 4.0; // 5.5" from edge
                maxWidth = 2.0;
                isUppercase = true;
                cursorY += lineHeight; // Space before
                break;
        }

        if (isUppercase) text = text.toUpperCase();

        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, xOffset, cursorY);
        cursorY += (lines.length * lineHeight);
    }

    doc.save(`${project.name.replace(/\s+/g, '_')}_script.pdf`);
};