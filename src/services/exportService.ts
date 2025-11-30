import { Project, ScriptElement } from '../types';
import jsPDF from 'jspdf';
import { generateFountainText } from './scriptUtils';
import { calculatePagination } from './pagination';

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

    let cursorY = marginTop;
    let currentPdfPage = 1;

    const addPage = (pageNum: number) => {
        doc.addPage();
        currentPdfPage = pageNum;
        cursorY = marginTop;
        // Add Page Number
        doc.setFont(fontName, 'normal');
        doc.setFontSize(12);
        doc.text(`${pageNum}.`, 7.5, 0.5, { align: 'right' });
    };

    // Initial Page Number
    doc.setFont(fontName, 'normal');
    doc.setFontSize(12);
    doc.text(`${currentPdfPage}.`, 7.5, 0.5, { align: 'right' });

    const elements = project.scriptElements || [];

    // Use unified pagination calculation
    const pageMap = calculatePagination(elements);

    // Track dual dialogue state
    let dualBufferY = 0; // Where the left side started

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const elementPage = pageMap[el.id] || 1;

        // If element is on a new page, add page break
        if (elementPage > currentPdfPage) {
            addPage(elementPage);
            dualBufferY = 0; // Reset buffer on new page
        }

        // --- DUAL DIALOGUE LOGIC ---
        const isDualRight = el.dual;
        const dualWidth = 2.8;
        const leftColOffset = marginLeft;
        const rightColOffset = marginLeft + 3.0;

        // --- RENDER ---
        doc.setFont(fontName, 'normal');
        doc.setFontSize(fontSize);

        let xOffset = marginLeft;
        let maxWidth = 6.0;
        let text = el.content;
        let isUppercase = false;

        // Check if next element is dual (for left column detection)
        const nextIsDual = i + 1 < elements.length && elements[i + 1].dual && elements[i + 1].type === 'character';

        // Determine layout based on type
        switch (el.type) {
            case 'scene_heading':
                xOffset = marginLeft;
                maxWidth = 6.0;
                isUppercase = true;
                // Add spacing before (only if not first on page)
                if (cursorY > marginTop) {
                    cursorY += lineHeight * 2;
                }
                break;
            case 'action':
                xOffset = marginLeft;
                maxWidth = 6.0;
                // Add spacing before
                if (cursorY > marginTop) {
                    cursorY += lineHeight;
                }
                break;
            case 'character':
                if (isDualRight) {
                    // RIGHT COLUMN
                    cursorY = dualBufferY;
                    xOffset = rightColOffset + 0.5;
                    maxWidth = dualWidth;
                } else if (nextIsDual) {
                    // LEFT COLUMN
                    dualBufferY = cursorY + lineHeight;
                    xOffset = leftColOffset + 0.5;
                    maxWidth = dualWidth;
                    if (cursorY > marginTop) {
                        cursorY += lineHeight;
                    }
                } else {
                    // STANDARD
                    xOffset = marginLeft + 2.0;
                    maxWidth = 3.5;
                    if (cursorY > marginTop) {
                        cursorY += lineHeight;
                    }
                }
                isUppercase = true;

                // Add (CONT'D) if dialogue continues from previous page
                if (el.isContinued) {
                    text = text + " (CONT'D)";
                }
                break;
            case 'dialogue':
                if (isDualRight) {
                    xOffset = rightColOffset;
                    maxWidth = dualWidth;
                } else if (dualBufferY > 0) {
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
                if (cursorY > marginTop) {
                    cursorY += lineHeight;
                }
                break;
        }

        if (isUppercase) text = text.toUpperCase();

        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, xOffset, cursorY);
        const blockHeight = lines.length * lineHeight;

        cursorY += blockHeight;

        // Render (MORE) marker if dialogue continues to next page
        if (el.continuesNext && (el.type === 'dialogue' || el.type === 'character')) {
            cursorY += lineHeight * 0.5;
            doc.text('(MORE)', marginLeft + 3.0, cursorY);
            cursorY += lineHeight * 0.5;
        }

        // Handle dual dialogue buffer reset
        if (isDualRight) {
            dualBufferY = 0;
        }
    }

    doc.save(`${project.name.replace(/\s+/g, '_')}_script.pdf`);
};