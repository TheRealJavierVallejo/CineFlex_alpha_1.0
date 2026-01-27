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

export interface ExportOptions {
    format: 'pdf' | 'fdx' | 'fountain' | 'txt';
    includeTitlePage: boolean;
    includeSceneNumbers: boolean;
    watermark?: string;
    openInNewTab?: boolean;
}

export type ProgressCallback = (progress: number) => void;

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
        output += `\n`;
    }

    if (project.scriptElements) {
        output += generateFountainText(project.scriptElements);
    }

    return output;
};

// --- 2. FINAL DRAFT (FDX) EXPORT - PRODUCTION GRADE ---
export const exportToFDX = (project: Project, options?: Partial<ExportOptions>): string => {
    // Production-grade XML escaping with full unicode support
    const escapeXML = (str: string): string => {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')
            // Preserve unicode characters (emojis, international chars)
            .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // Remove control chars
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
    };

    const tp = project.titlePage;

    // Final Draft FDX Version 5 (industry standard)
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<!DOCTYPE FinalDraft SYSTEM "http://www.finaldraft.com/FinalDraft/FinalDraft.dtd">\n';
    xml += '<FinalDraft DocumentType="Script" Template="No" Version="5">\n';

    // Content structure
    xml += '  <Content>\n';

    // Title Page (if enabled)
    if (options?.includeTitlePage !== false && tp) {
        xml += '    <Paragraph Type="Title">\n';
        xml += `      <Text>${escapeXML(tp.title || project.name || 'Untitled')}</Text>\n`;
        xml += '    </Paragraph>\n';

        if (tp.credit) {
            xml += '    <Paragraph Type="Credit">\n';
            xml += `      <Text>${escapeXML(tp.credit)}</Text>\n`;
            xml += '    </Paragraph>\n';
        }

        if (tp.authors && tp.authors.length > 0) {
            tp.authors.forEach(author => {
                if (author) {
                    xml += '    <Paragraph Type="Author">\n';
                    xml += `      <Text>${escapeXML(author)}</Text>\n`;
                    xml += '    </Paragraph>\n';
                }
            });
        }

        if (tp.source) {
            xml += '    <Paragraph Type="Source">\n';
            xml += `      <Text>${escapeXML(tp.source)}</Text>\n`;
            xml += '    </Paragraph>\n';
        }

        if (tp.draftDate) {
            xml += '    <Paragraph Type="Draft Date">\n';
            xml += `      <Text>${escapeXML(tp.draftDate)}</Text>\n`;
            xml += '    </Paragraph>\n';
        }

        if (tp.contact) {
            // Split multi-line contact into separate lines
            const contactLines = tp.contact.split('\n');
            contactLines.forEach(line => {
                if (line.trim()) {
                    xml += '    <Paragraph Type="Contact">\n';
                    xml += `      <Text>${escapeXML(line)}</Text>\n`;
                    xml += '    </Paragraph>\n';
                }
            });
        }

        if (tp.copyright) {
            xml += '    <Paragraph Type="Copyright">\n';
            xml += `      <Text>${escapeXML(tp.copyright)}</Text>\n`;
            xml += '    </Paragraph>\n';
        }

        // Page break after title page
        xml += '    <Paragraph Type="Action">\n';
        xml += '      <PageBreak/>\n';
        xml += '    </Paragraph>\n';
    }

    // Script Content with proper dual dialogue support
    const elements = project.scriptElements || [];
    let inDualDialogue = false;

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const nextEl = elements[i + 1];
        
        // Determine element type
        let type = 'Action';
        switch (el.type) {
            case 'scene_heading': type = 'Scene Heading'; break;
            case 'action': type = 'Action'; break;
            case 'character': type = 'Character'; break;
            case 'dialogue': type = 'Dialogue'; break;
            case 'parenthetical': type = 'Parenthetical'; break;
            case 'transition': type = 'Transition'; break;
            case 'shot': type = 'Shot'; break;
        }

        // Handle dual dialogue properly
        const isDualChar = el.type === 'character' && el.dual;
        const nextIsDualChar = nextEl?.type === 'character' && nextEl.dual;
        
        // Start dual dialogue block
        if (el.type === 'character' && nextIsDualChar && !inDualDialogue) {
            xml += '    <DualDialogue>\n';
            inDualDialogue = true;
        }

        // Build paragraph attributes
        const attrs: string[] = [`Type="${type}"`];
        
        // Scene numbers
        if (options?.includeSceneNumbers && el.type === 'scene_heading' && el.sceneNumber) {
            attrs.push(`Number="${escapeXML(el.sceneNumber)}"`);
        }

        // Continued character
        if (el.type === 'character' && el.isContinued) {
            // Character name with (CONT'D) is handled in text content
        }

        xml += `    <Paragraph ${attrs.join(' ')}>\n`;
        
        // Text content with unicode support
        let textContent = escapeXML(el.content || '');
        
        // Add (CONT'D) to character name if continued
        if (el.type === 'character' && el.isContinued) {
            textContent += " (CONT'D)";
        }

        xml += `      <Text>${textContent}</Text>\n`;
        xml += '    </Paragraph>\n';

        // Close dual dialogue block after second character's dialogue ends
        if (inDualDialogue && el.type === 'dialogue' && !nextEl?.dual) {
            xml += '    </DualDialogue>\n';
            inDualDialogue = false;
        }
    }

    xml += '  </Content>\n';
    xml += '</FinalDraft>';
    return xml;
};

// --- 3. PDF EXPORT (Industry Standard) with Progress Tracking ---
export const exportToPDF = async (
    project: Project,
    options: ExportOptions,
    onProgress?: ProgressCallback
): Promise<void> => {
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

    // Safe Filename Generation
    const baseName = (project.name || project.titlePage?.title || 'Untitled').trim();
    const safeName = baseName.replace(/\s+/g, '_');

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
        doc.setTextColor(savedColor);
        doc.setFontSize(fontSize);
    };

    // Report initial progress
    onProgress?.(5);

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

    onProgress?.(15);

    // --- SCRIPT CONTENT with Chunked Processing and Dual Dialogue ---
    const elements = project.scriptElements || [];
    const pageMap = calculatePagination(elements);
    
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
    let dualLeftY = 0;  // Track Y position for left dual column
    let dualRightY = 0; // Track Y position for right dual column
    let inDualDialogue = false;

    // Dual dialogue column dimensions (industry standard)
    const DUAL_LEFT_CHAR_INDENT = 0.5;  // Left character indent
    const DUAL_LEFT_DIALOGUE_INDENT = 0.0;  // Left dialogue starts at left margin
    const DUAL_RIGHT_CHAR_INDENT = 3.5;  // Right character indent
    const DUAL_RIGHT_DIALOGUE_INDENT = 3.0;  // Right dialogue indent
    const DUAL_COLUMN_WIDTH = 2.8;  // Width for each dual column

    // Process elements in chunks to allow UI updates
    const CHUNK_SIZE = 50;
    const totalChunks = Math.ceil(elements.length / CHUNK_SIZE);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, elements.length);
        const chunk = elements.slice(start, end);

        for (let localIdx = 0; localIdx < chunk.length; localIdx++) {
            const i = start + localIdx;
            const el = elements[i];
            const nextEl = elements[i + 1];
            const elementPage = pageMap[el.id] || 1;

            if (elementPage > currentPdfPage) {
                addPage(elementPage);
                cursorY = marginTop;
                inDualDialogue = false;
                dualLeftY = 0;
                dualRightY = 0;
            }

            let xOffset = marginLeft;
            let maxWidth = 6.0;
            let text = el.content;
            let isUppercase = false;
            let isDualLeft = false;
            let isDualRight = false;

            // Check if this starts dual dialogue
            const nextIsDual = nextEl?.type === 'character' && nextEl.dual;
            
            // Determine dual dialogue positioning
            if (el.type === 'character') {
                if (nextIsDual && !inDualDialogue) {
                    // First character in dual dialogue (left column)
                    inDualDialogue = true;
                    isDualLeft = true;
                    dualLeftY = cursorY + (cursorY > marginTop ? lineHeight : 0);
                    xOffset = marginLeft + DUAL_LEFT_CHAR_INDENT;
                    maxWidth = DUAL_COLUMN_WIDTH;
                } else if (el.dual && inDualDialogue) {
                    // Second character in dual dialogue (right column)
                    isDualRight = true;
                    cursorY = dualLeftY; // Start at same Y as left column
                    dualRightY = cursorY;
                    xOffset = marginLeft + DUAL_RIGHT_CHAR_INDENT;
                    maxWidth = DUAL_COLUMN_WIDTH;
                } else {
                    // Regular single character
                    xOffset = marginLeft + INDENT_CHARACTER_IN;
                    maxWidth = WIDTH_CHARACTER;
                    if (cursorY > marginTop) cursorY += lineHeight;
                }
                isUppercase = true;
                if (el.isContinued) text += " (CONT'D)";
            } else if (el.type === 'dialogue') {
                if (inDualDialogue && !el.dual) {
                    // Left column dialogue
                    xOffset = marginLeft + DUAL_LEFT_DIALOGUE_INDENT;
                    maxWidth = DUAL_COLUMN_WIDTH;
                    cursorY = dualLeftY;
                } else if (el.dual && inDualDialogue) {
                    // Right column dialogue
                    xOffset = marginLeft + DUAL_RIGHT_DIALOGUE_INDENT;
                    maxWidth = DUAL_COLUMN_WIDTH;
                    cursorY = dualRightY;
                } else {
                    // Regular dialogue
                    xOffset = marginLeft + INDENT_DIALOGUE_IN;
                    maxWidth = WIDTH_DIALOGUE;
                }
            } else if (el.type === 'parenthetical') {
                if (inDualDialogue && !el.dual) {
                    // Left column parenthetical
                    xOffset = marginLeft + DUAL_LEFT_DIALOGUE_INDENT + 0.3;
                    maxWidth = DUAL_COLUMN_WIDTH - 0.6;
                    cursorY = dualLeftY;
                } else if (el.dual && inDualDialogue) {
                    // Right column parenthetical
                    xOffset = marginLeft + DUAL_RIGHT_DIALOGUE_INDENT + 0.3;
                    maxWidth = DUAL_COLUMN_WIDTH - 0.6;
                    cursorY = dualRightY;
                } else {
                    // Regular parenthetical
                    xOffset = marginLeft + INDENT_PAREN_IN;
                    maxWidth = WIDTH_PAREN;
                }
            } else {
                // Non-dialogue elements end dual dialogue mode
                if (inDualDialogue && el.type !== 'character' && !el.dual) {
                    // Resume at the lower of the two columns
                    cursorY = Math.max(dualLeftY, dualRightY);
                    inDualDialogue = false;
                    dualLeftY = 0;
                    dualRightY = 0;
                }

                // Regular element spacing and positioning
                switch (el.type) {
                    case 'scene_heading':
                        if (options.includeSceneNumbers && el.sceneNumber) {
                            doc.text(el.sceneNumber, marginLeft - 0.4, cursorY + (cursorY > marginTop ? lineHeight * 2 : 0));
                            doc.text(el.sceneNumber, pageWidth - PAGE_NUM_RIGHT_IN, cursorY + (cursorY > marginTop ? lineHeight * 2 : 0), { align: 'right' });
                        }
                        maxWidth = WIDTH_SCENE_HEADING;
                        isUppercase = true;
                        if (cursorY > marginTop) cursorY += lineHeight * 2;
                        break;
                    case 'action':
                        maxWidth = WIDTH_ACTION;
                        if (cursorY > marginTop) cursorY += lineHeight;
                        break;
                    case 'transition':
                        xOffset = marginLeft + INDENT_TRANSITION_IN;
                        maxWidth = WIDTH_TRANSITION;
                        isUppercase = true;
                        if (cursorY > marginTop) cursorY += lineHeight;
                        break;
                }
            }

            if (isUppercase) text = text.toUpperCase();
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, xOffset, cursorY);
            
            const lineCount = lines.length * lineHeight;
            
            // Update cursor positions based on dual dialogue state
            if (isDualLeft || (inDualDialogue && !el.dual && el.type !== 'character')) {
                dualLeftY += lineCount;
            } else if (isDualRight || (el.dual && inDualDialogue)) {
                dualRightY += lineCount;
            } else {
                cursorY += lineCount;
            }

            // Handle MORE indicators
            if (el.continuesNext && (el.type === 'dialogue' || el.type === 'character')) {
                if (inDualDialogue) {
                    const moreY = el.dual ? dualRightY : dualLeftY;
                    const moreX = el.dual ? marginLeft + DUAL_RIGHT_DIALOGUE_INDENT + 1.0 : marginLeft + DUAL_LEFT_DIALOGUE_INDENT + 1.0;
                    doc.text('(MORE)', moreX, moreY + lineHeight * 0.5);
                    if (el.dual) {
                        dualRightY += lineHeight;
                    } else {
                        dualLeftY += lineHeight;
                    }
                } else {
                    cursorY += lineHeight * 0.5;
                    doc.text('(MORE)', marginLeft + 3.0, cursorY);
                    cursorY += lineHeight * 0.5;
                }
            }
        }

        // Update progress after each chunk
        const progress = 15 + Math.round((chunkIndex + 1) / totalChunks * 75);
        onProgress?.(progress);

        // Yield to UI thread between chunks
        if (chunkIndex < totalChunks - 1) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    onProgress?.(95);

    // Generate and download/open PDF
    const filename = `${safeName}_script.pdf`;

    if (options.openInNewTab) {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');

        if (!newTab) {
            doc.save(filename);
            URL.revokeObjectURL(url);
            throw new Error('Popup blocked. Please allow popups for this site or the file will be downloaded instead.');
        }

        setTimeout(() => URL.revokeObjectURL(url), 30000);
    } else {
        doc.save(filename);
    }

    onProgress?.(100);
};

// Main export function with progress support
export const exportScript = async (
    project: Project,
    options: ExportOptions,
    onProgress?: ProgressCallback
): Promise<void> => {
    const baseName = (project.name || project.titlePage?.title || 'Untitled').trim();
    const safeName = baseName.replace(/\s+/g, '_');

    switch (options.format) {
        case 'pdf':
            await exportToPDF(project, options, onProgress);
            break;
        case 'fdx': {
            onProgress?.(50);
            const xml = exportToFDX(project, options);
            downloadFile(xml, `${safeName}.fdx`, 'application/xml; charset=utf-8');
            onProgress?.(100);
            break;
        }
        case 'fountain': {
            onProgress?.(50);
            const text = exportToFountain(project, options);
            downloadFile(text, `${safeName}.fountain`, 'text/plain; charset=utf-8');
            onProgress?.(100);
            break;
        }
        case 'txt': {
            onProgress?.(50);
            const text = exportToFountain(project, options);
            downloadFile(text, `${safeName}.txt`, 'text/plain; charset=utf-8');
            onProgress?.(100);
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
