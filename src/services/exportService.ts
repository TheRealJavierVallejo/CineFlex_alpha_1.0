import { Project, ScriptElement } from '../types';
import jsPDF from 'jspdf';
import { generateFountainText } from './scriptUtils';
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

/**
 * EXPORT SERVICE
 * Handles conversion of script data to various industry formats.
 */

/**
 * EXPORT SERVICE
 * Handles conversion of script data to various industry formats.
 */

export interface ExportOptions {
    format: 'pdf' | 'fdx' | 'fountain' | 'txt';
    includeTitlePage: boolean;
    includeSceneNumbers: boolean;
    watermark?: string;
    openInNewTab?: boolean;
}

// --- 1. FOUNTAIN (TXT) EXPORT ---
export const exportToFountain = (project: Project, options?: Partial<ExportOptions>): string => {
    const tp = project.titlePage;
    let output = '';

    if (options?.includeTitlePage !== false && tp) {
        if (tp.title) output += `Title: ${tp.title}\n`;
        if (tp.credit) output += `Credit: ${tp.credit}\n`;
        if (tp.authors && tp.authors.length > 0) {
            tp.authors.forEach(auth => {
                if (auth) output += `Author: ${auth}\n`;
            });
        }
        if (tp.source) output += `Source: ${tp.source}\n`;
        if (tp.draftDate) output += `Draft date: ${tp.draftDate}\n`;
        if (tp.contact) output += `Contact: ${tp.contact}\n`;
        if (tp.copyright) output += `Copyright: ${tp.copyright}\n`;
        if (tp.additionalInfo) output += `Notes: ${tp.additionalInfo}\n`;
        output += `\n`; // End title page
    }

    if (project.scriptElements) {
        output += generateFountainText(project.scriptElements);
    }

    return output;
};

// --- 2. FINAL DRAFT (FDX) EXPORT ---
export const exportToFDX = (project: Project, options?: Partial<ExportOptions>): string => {
    const escapeXML = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const tp = project.titlePage;

    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n';
    xml += '<FinalDraft DocumentType="Script" Template="No" Version="4">\n';

    if (options?.includeTitlePage !== false && tp) {
        xml += '  <TitlePage>\n';
        xml += '    <Header><Paragraph Type="General"><Text>Header</Text></Paragraph></Header>\n';
        xml += '    <Footer><Paragraph Type="General"><Text>Footer</Text></Paragraph></Footer>\n';

        const addField = (tag: string, value?: string) => {
            if (value) {
                xml += `    <${tag}>\n`;
                value.split('\n').forEach(line => {
                    xml += `      <Paragraph Type="General" Alignment="Center"><Text>${escapeXML(line)}</Text></Paragraph>\n`;
                });
                xml += `    </${tag}>\n`;
            }
        };

        addField('Title', tp.title);
        addField('Credit', tp.credit);
        addField('Author', tp.authors?.join(', '));
        addField('Source', tp.source);
        addField('Date', tp.draftDate);
        addField('Contact', tp.contact);
        addField('Copyright', tp.copyright);
        xml += '  </TitlePage>\n';
    }

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

        const dualAttr = el.dual ? ' Dual="Yes"' : '';
        const sceneNumAttr = (options?.includeSceneNumbers && el.type === 'scene_heading' && el.sceneNumber) ? ` Number="${el.sceneNumber}"` : '';

        xml += `    <Paragraph Type="${type}"${dualAttr}${sceneNumAttr}>\n`;
        xml += `      <Text>${escapeXML(el.content)}</Text>\n`;
        xml += `    </Paragraph>\n`;
    });

    xml += '  </Content>\n';
    xml += '</FinalDraft>';
    return xml;
};

// --- 3. PDF EXPORT (Industry Standard) ---
export const exportToPDF = (project: Project, options: ExportOptions) => {
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

    // Helper for Watermark
    const renderWatermark = () => {
        if (!options.watermark) return;
        const savedColor = doc.getTextColor();
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(60);
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.text(options.watermark, pageWidth / 2, 5.5, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();
        doc.setTextColor(savedColor); // Restore
        doc.setFontSize(fontSize);
    };

    // --- TITLE PAGE ---
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

    // --- SCRIPT CONTENT ---
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

    const elements = project.scriptElements || [];
    const pageMap = calculatePagination(elements);
    let cursorY = marginTop;
    let dualBufferY = 0;

    for (let i = 0; i < elements.length; i++) {
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

    const filename = `${project.name.replace(/\s+/g, '_')}_script.pdf`;

    if (options.openInNewTab) {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    } else {
        doc.save(filename);
    }
};

// Legacy support (defaults to PDF standard)
export const exportScript = (project: Project, options: ExportOptions) => {
    switch (options.format) {
        case 'pdf': exportToPDF(project, options); break;
        case 'fdx': {
            const xml = exportToFDX(project, options);
            downloadFile(xml, `${project.name}.fdx`, 'text/xml');
            break;
        }
        case 'fountain': {
            const text = exportToFountain(project, options);
            downloadFile(text, `${project.name}.fountain`, 'text/plain');
            break;
        }
        case 'txt': {
            const text = exportToFountain(project, options);
            downloadFile(text, `${project.name}.txt`, 'text/plain');
            break;
        }
    }
};

const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};