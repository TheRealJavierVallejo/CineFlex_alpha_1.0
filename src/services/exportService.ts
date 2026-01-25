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
    const tp = project.titlePage;
    // Generate Header
    let output = '';
    
    if (tp) {
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
    } else {
        // Fallback
        output += `Title: ${project.name}\n`;
        output += `Credit: Written by\n`;
        output += `Draft date: ${new Date().toLocaleDateString()}\n`;
    }
    
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
    const tp = project.titlePage;

    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n';
    xml += '<FinalDraft DocumentType="Script" Template="No" Version="4">\n';
    
    // Add Title Page Section
    if (tp) {
        xml += '  <TitlePage>\n';
        xml += '    <Header>\n';
        xml += '      <Paragraph Type="General"><Text>Header</Text></Paragraph>\n';
        xml += '    </Header>\n';
        xml += '    <Footer>\n';
        xml += '      <Paragraph Type="General"><Text>Footer</Text></Paragraph>\n';
        xml += '    </Footer>\n';
        
        const addField = (tag: string, value?: string) => {
            if (value) {
                xml += `    <${tag}>\n`;
                // FDX title pages often split lines into paragraphs
                value.split('\n').forEach(line => {
                    xml += `      <Paragraph Type="General" Alignment="Center">\n`;
                    xml += `        <Text>${escapeXML(line)}</Text>\n`;
                    xml += `      </Paragraph>\n`;
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
    const pageWidth = 8.5;

    // --- TITLE PAGE RENDER ---
    const tp = project.titlePage;
    if (tp) {
        doc.setFont(fontName, 'normal');
        
        // 1. Title (Centered, ~3.5 inches down)
        let cursorY = 3.5;
        doc.setFontSize(12);
        
        if (tp.title) {
            const titleLines = doc.splitTextToSize(tp.title.toUpperCase(), 6.0);
            titleLines.forEach((line: string) => {
                doc.text(line, pageWidth / 2, cursorY, { align: 'center' });
                cursorY += 0.3; // Double space
            });
        }
        
        cursorY += 0.5;

        // 2. Credit
        if (tp.credit) {
            doc.text(tp.credit, pageWidth / 2, cursorY, { align: 'center' });
            cursorY += 0.3;
        }

        // 3. Authors
        if (tp.authors && tp.authors.length > 0) {
            tp.authors.forEach(auth => {
                if (auth) {
                    doc.text(auth, pageWidth / 2, cursorY, { align: 'center' });
                    cursorY += 0.3;
                }
            });
        }

        // 4. Source
        if (tp.source) {
             cursorY += 0.2;
             doc.text(tp.source, pageWidth / 2, cursorY, { align: 'center' });
        }

        // 5. Contact / Draft Info (Bottom)
        // Split bottom area: Left (Contact) vs Right (Draft/Copyright)
        const bottomY = 9.0;
        const leftX = 1.5; // Left margin
        const rightX = 7.0; // Right margin

        // Bottom Left: Contact
        if (tp.contact) {
            const contactLines = doc.splitTextToSize(tp.contact, 3.5);
            doc.text(contactLines, leftX, bottomY);
        }

        // Bottom Right: Draft Date, Version, Copyright
        let rightCursorY = bottomY;
        
        if (tp.draftVersion) {
            doc.text(tp.draftVersion, rightX, rightCursorY, { align: 'right' });
            rightCursorY += 0.2;
        }

        if (tp.draftDate) {
            doc.text(tp.draftDate, rightX, rightCursorY, { align: 'right' });
            rightCursorY += 0.2;
        }
        
        if (tp.copyright) {
            doc.text(tp.copyright, rightX, rightCursorY, { align: 'right' });
        }
        
        // Add page break for script
        doc.addPage();
    }

    // --- SCRIPT CONTENT ---
    
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

    // Initial Page Number (Page 1)
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