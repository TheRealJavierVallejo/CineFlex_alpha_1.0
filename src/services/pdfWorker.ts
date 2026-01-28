/**
 * PDF EXPORT WEB WORKER
 * Runs PDF generation off the main thread to prevent UI freezing
 * Communicates progress back to main thread
 * 
 * CRITICAL: (CONT'D) is stored as METADATA (isContinued: true), NOT text
 * This ensures proper " (CONT'D)" spacing and prevents user editing
 */

import jsPDF from 'jspdf';
import { Project, ScriptElement } from '../types';
import { ExportOptions } from './exportService';
import { paginateScript } from './pagination';
import {
    PAGE_WIDTH_IN,
    PAGE_HEIGHT_IN,
    MARGIN_TOP_IN,
    MARGIN_LEFT_IN,
    FONT_SIZE_PT,
    LINE_HEIGHT_IN,
    WIDTH_SCENE_HEADING,
    WIDTH_ACTION,
    WIDTH_CHARACTER,
    WIDTH_DIALOGUE,
    WIDTH_PAREN,
    WIDTH_TRANSITION,
    INDENT_CHARACTER_IN,
    INDENT_DIALOGUE_IN,
    INDENT_PAREN_IN,
    INDENT_TRANSITION_IN,
    PAGE_NUM_TOP_IN,
    PAGE_NUM_RIGHT_IN
} from './screenplayLayout';

export interface PDFWorkerMessage {
    type: 'generate' | 'progress' | 'complete' | 'error';
    payload?: any;
}

export interface PDFProgressPayload {
    current: number;
    total: number;
    stage: 'pagination' | 'rendering' | 'finalizing';
    message: string;
}

/**
 * Generate PDF with progress callbacks
 * This runs in the Web Worker context
 */
export const generatePDFWithProgress = (
    project: Project,
    options: ExportOptions,
    onProgress: (progress: PDFProgressPayload) => void
): Blob => {
    const doc = new jsPDF({
        unit: 'in',
        format: 'letter',
    });

    const fontName = 'Courier';
    const fontSize = FONT_SIZE_PT;
    const lineHeight = LINE_HEIGHT_IN;
    const marginTop = MARGIN_TOP_IN;
    const marginLeft = MARGIN_LEFT_IN;
    const pageWidth = PAGE_WIDTH_IN;

    const renderWatermark = () => {
        if (!options.watermark) return;
        const savedColor = doc.getTextColor();
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(60);
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.text(options.watermark, pageWidth / 2, 5.5, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();
        doc.setTextColor(savedColor);
        doc.setFontSize(fontSize);
    };

    // Stage 1: Title Page
    onProgress({ current: 0, total: 100, stage: 'rendering', message: 'Rendering title page...' });

    const tp = project.titlePage;
    if (options.includeTitlePage && tp) {
        doc.setFont(fontName, 'normal');
        let cursorY = 3.5;
        if (tp.title) {
            const titleLines = doc.splitTextToSize(tp.title.toUpperCase(), WIDTH_SCENE_HEADING);
            titleLines.forEach((line: string) => {
                doc.text(line, pageWidth / 2, cursorY, { align: 'center' });
                cursorY += 0.3;
            });
        }
        cursorY += 0.5;
        if (tp.credit) {
            doc.text(tp.credit, pageWidth / 2, cursorY, { align: 'center' });
            cursorY += 0.3;
        }
        if (tp.authors?.length) {
            tp.authors.forEach(auth => {
                if (auth) { doc.text(auth, pageWidth / 2, cursorY, { align: 'center' }); cursorY += 0.3; }
            });
        }
        if (tp.source) { cursorY += 0.2; doc.text(tp.source, pageWidth / 2, cursorY, { align: 'center' }); }

        const bottomY = 9.0;
        if (tp.contact) doc.text(doc.splitTextToSize(tp.contact, 3.5), 1.5, bottomY);

        let rightCursorY = bottomY;
        if (tp.draftVersion) { doc.text(tp.draftVersion, 7.0, rightCursorY, { align: 'right' }); rightCursorY += 0.2; }
        if (tp.draftDate) { doc.text(tp.draftDate, 7.0, rightCursorY, { align: 'right' }); rightCursorY += 0.2; }
        if (tp.copyright) doc.text(tp.copyright, 7.0, rightCursorY, { align: 'right' });

        doc.addPage();
    }

    // Stage 2: Calculate Pagination
    onProgress({ current: 10, total: 100, stage: 'pagination', message: 'Calculating page breaks...' });

    const elements = project.scriptElements || [];
    
    // 🔥 CRITICAL UPGRADE: Use the new pagination engine
    const paginatedPages = paginateScript(elements);
    const totalPages = paginatedPages.length;

    // Stage 3: Render Script Content
    let currentPdfPage = 1;
    
    // Setup Page 1
    renderWatermark();
    doc.setFontSize(12);
    doc.text(`${currentPdfPage}.`, pageWidth - PAGE_NUM_RIGHT_IN, PAGE_NUM_TOP_IN, { align: 'right' });

    for (let pIdx = 0; pIdx < paginatedPages.length; pIdx++) {
        const pageData = paginatedPages[pIdx];
        
        // Report progress
        const progress = 20 + Math.floor((pIdx / totalPages) * 70);
        onProgress({
            current: progress,
            total: 100,
            stage: 'rendering',
            message: `Rendering page ${pageData.pageNumber}...`
        });

        if (pIdx > 0) {
            doc.addPage();
            currentPdfPage++;
            renderWatermark();
            doc.text(`${currentPdfPage}.`, pageWidth - PAGE_NUM_RIGHT_IN, PAGE_NUM_TOP_IN, { align: 'right' });
        }

        let cursorY = marginTop;
        let dualLeftStart = 0; // Track start Y of left dual column
        let maxDualBottom = 0; // Track max bottom Y across dual columns

        // Render elements for THIS page
        for (let i = 0; i < pageData.elements.length; i++) {
            const el = pageData.elements[i];
            
            let xOffset = marginLeft;
            let maxWidth = 6.0;
            let text = el.content;
            let isUppercase = false;

            // Look ahead for dual dialogue (simple check)
            const nextIsDual = i + 1 < pageData.elements.length && 
                               pageData.elements[i + 1].dual && 
                               pageData.elements[i + 1].type === 'character';

            switch (el.type) {
                case 'scene_heading':
                    // Scene Number Rendering
                    if (options.includeSceneNumbers && el.sceneNumber) {
                        const numY = cursorY + (cursorY > marginTop ? lineHeight * 2 : 0);
                        doc.text(el.sceneNumber, marginLeft - 0.4, numY);
                        doc.text(el.sceneNumber, pageWidth - PAGE_NUM_RIGHT_IN, numY, { align: 'right' });
                    }
                    maxWidth = WIDTH_SCENE_HEADING; isUppercase = true;
                    // Add spacing before scene heading (unless top of page)
                    if (cursorY > marginTop) cursorY += lineHeight * 2;
                    break;
                    
                case 'action':
                    maxWidth = WIDTH_ACTION;
                    if (cursorY > marginTop) cursorY += lineHeight;
                    break;
                    
                case 'character':
                    if (el.dual === 'right') { 
                        // Right column of dual dialogue - reset to top of dual block
                        cursorY = dualLeftStart; 
                        xOffset = marginLeft + 3.5; 
                        maxWidth = 2.8; 
                    }
                    else if (el.dual === 'left' || nextIsDual) { 
                        // Left column OR start of dual block
                        if (cursorY > marginTop) cursorY += lineHeight;
                        dualLeftStart = cursorY; // Mark start of dual block
                        xOffset = marginLeft + 0.5; 
                        maxWidth = 2.8; 
                    }
                    else { 
                        // Standard character
                        xOffset = marginLeft + INDENT_CHARACTER_IN; 
                        maxWidth = WIDTH_CHARACTER; 
                        if (cursorY > marginTop) cursorY += lineHeight; 
                    }
                    isUppercase = true;
                    
                    // 🔥 CRITICAL FIX: Use metadata with PROPER SPACING
                    // Content is CLEAN character name. Metadata flag indicates continuation.
                    if (el.isContinued) {
                        text = text.trim() + " (CONT'D)"; // EXPLICIT SPACE BEFORE PAREN
                    }
                    break;
                    
                case 'dialogue':
                    if (el.dual === 'right') { 
                        xOffset = marginLeft + 3.0; 
                        maxWidth = 2.8; 
                    }
                    else if (el.dual === 'left') { 
                        xOffset = marginLeft; 
                        maxWidth = 2.8; 
                    }
                    else { 
                        xOffset = marginLeft + INDENT_DIALOGUE_IN; 
                        maxWidth = WIDTH_DIALOGUE; 
                    }
                    break;
                    
                case 'parenthetical':
                    if (el.dual === 'right') { 
                        xOffset = marginLeft + 3.3; 
                        maxWidth = 2.2; 
                    }
                    else if (el.dual === 'left') { 
                        xOffset = marginLeft + 0.3; 
                        maxWidth = 2.2; 
                    }
                    else { 
                        xOffset = marginLeft + INDENT_PAREN_IN; 
                        maxWidth = WIDTH_PAREN; 
                    }
                    break;
                    
                case 'transition':
                    xOffset = marginLeft + INDENT_TRANSITION_IN; 
                    maxWidth = WIDTH_TRANSITION; 
                    isUppercase = true;
                    if (cursorY > marginTop) cursorY += lineHeight;
                    break;
            }

            if (isUppercase) text = text.toUpperCase();
            
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, xOffset, cursorY);
            
            // Advance cursor
            const blockHeight = lines.length * lineHeight;
            cursorY += blockHeight;
            
            // Track dual dialogue column bottoms
            if (el.dual === 'left') {
                maxDualBottom = Math.max(maxDualBottom, cursorY);
            }
            else if (el.dual === 'right') {
                maxDualBottom = Math.max(maxDualBottom, cursorY);
                // After right column, reset cursor to max of both columns
                cursorY = maxDualBottom;
            }
            else if (maxDualBottom > 0) {
                // First non-dual element after dual block - ensure we're below both columns
                cursorY = Math.max(cursorY, maxDualBottom);
                maxDualBottom = 0; // Reset tracker
            }
            
            // 🔥 UPDATED: Render (MORE) using continuesNext metadata
            if (el.continuesNext) {
                cursorY += lineHeight * 0.5; // half line spacing
                doc.text('(MORE)', xOffset + (maxWidth / 2), cursorY, { align: 'center' });
                cursorY += lineHeight;
            }
        }
    }

    // Stage 4: Finalize
    onProgress({ current: 95, total: 100, stage: 'finalizing', message: 'Finalizing PDF...' });

    const blob = doc.output('blob');

    onProgress({ current: 100, total: 100, stage: 'finalizing', message: 'Export complete!' });

    return blob;
};