/**
 * PDF EXPORT WEB WORKER
 * Runs PDF generation off the main thread to prevent UI freezing
 * Communicates progress back to main thread
 */

import jsPDF from 'jspdf';
import { Project, ScriptElement } from '../types';
import { ExportOptions } from './exportService';
import { calculatePagination } from './pagination';
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
    const pageMap = calculatePagination(elements);
    const totalElements = elements.length;

    // Stage 3: Render Script Content
    let currentPdfPage = 1;
    const addPage = (pageNum: number) => {
        doc.addPage();
        currentPdfPage = pageNum;
        renderWatermark();
        doc.setFontSize(12);
        doc.text(`${pageNum}.`, pageWidth - PAGE_NUM_RIGHT_IN, PAGE_NUM_TOP_IN, { align: 'right' });
    };

    renderWatermark();
    doc.setFontSize(12);
    doc.text(`${currentPdfPage}.`, pageWidth - PAGE_NUM_RIGHT_IN, PAGE_NUM_TOP_IN, { align: 'right' });

    let cursorY = marginTop;
    let dualBufferY = 0;

    for (let i = 0; i < elements.length; i++) {
        // Report progress every 10 elements
        if (i % 10 === 0) {
            const progress = 10 + Math.floor((i / totalElements) * 80);
            onProgress({
                current: progress,
                total: 100,
                stage: 'rendering',
                message: `Rendering page ${currentPdfPage}... (${i}/${totalElements} elements)`
            });
        }

        const el = elements[i];
        const elementPage = pageMap[el.id] || 1;

        if (elementPage > currentPdfPage) {
            addPage(elementPage);
            cursorY = marginTop;
            dualBufferY = 0;
        }

        let xOffset = marginLeft;
        let maxWidth = 6.0;
        let text = el.content;
        let isUppercase = false;

        const nextIsDual = i + 1 < elements.length && elements[i + 1].dual && elements[i + 1].type === 'character';

        switch (el.type) {
            case 'scene_heading':
                if (options.includeSceneNumbers && el.sceneNumber) {
                    doc.text(el.sceneNumber, marginLeft - 0.4, cursorY + (cursorY > marginTop ? lineHeight * 2 : 0));
                    doc.text(el.sceneNumber, pageWidth - PAGE_NUM_RIGHT_IN, cursorY + (cursorY > marginTop ? lineHeight * 2 : 0), { align: 'right' });
                }
                maxWidth = WIDTH_SCENE_HEADING; isUppercase = true;
                if (cursorY > marginTop) cursorY += lineHeight * 2;
                break;
            case 'action':
                maxWidth = WIDTH_ACTION;
                if (cursorY > marginTop) cursorY += lineHeight;
                break;
            case 'character':
                if (el.dual) { cursorY = dualBufferY; xOffset = marginLeft + 3.5; maxWidth = 2.8; }
                else if (nextIsDual) { dualBufferY = cursorY + (cursorY > marginTop ? lineHeight : 0); xOffset = marginLeft + 0.5; maxWidth = 2.8; if (cursorY > marginTop) cursorY += lineHeight; }
                else { xOffset = marginLeft + INDENT_CHARACTER_IN; maxWidth = WIDTH_CHARACTER; if (cursorY > marginTop) cursorY += lineHeight; }
                isUppercase = true;
                if (el.isContinued) text += " (CONT'D)";
                break;
            case 'dialogue':
                if (el.dual) { xOffset = marginLeft + 3.0; maxWidth = 2.8; }
                else if (dualBufferY > 0) { xOffset = marginLeft; maxWidth = 2.8; }
                else { xOffset = marginLeft + INDENT_DIALOGUE_IN; maxWidth = WIDTH_DIALOGUE; }
                break;
            case 'parenthetical':
                if (el.dual) { xOffset = marginLeft + 3.3; maxWidth = 2.2; }
                else if (dualBufferY > 0) { xOffset = marginLeft + 0.3; maxWidth = 2.2; }
                else { xOffset = marginLeft + INDENT_PAREN_IN; maxWidth = WIDTH_PAREN; }
                break;
            case 'transition':
                xOffset = marginLeft + INDENT_TRANSITION_IN; maxWidth = WIDTH_TRANSITION; isUppercase = true;
                if (cursorY > marginTop) cursorY += lineHeight;
                break;
        }

        if (isUppercase) text = text.toUpperCase();
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, xOffset, cursorY);
        cursorY += lines.length * lineHeight;

        if (el.continuesNext && (el.type === 'dialogue' || el.type === 'character')) {
            cursorY += lineHeight * 0.5;
            doc.text('(MORE)', marginLeft + 3.0, cursorY);
            cursorY += lineHeight * 0.5;
        }
        if (el.dual) dualBufferY = 0;
    }

    // Stage 4: Finalize
    onProgress({ current: 95, total: 100, stage: 'finalizing', message: 'Finalizing PDF...' });

    const blob = doc.output('blob');

    onProgress({ current: 100, total: 100, stage: 'finalizing', message: 'Export complete!' });

    return blob;
};
