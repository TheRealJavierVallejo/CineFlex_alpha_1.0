import jsPDF from 'jspdf';
import { Project, Shot } from '../types';

/*
 * 🏗️ PDF WORKER
 * Handles CPU-intensive PDF generation in a background thread.
 */

// Helper to resolve blob URLs if passed (Note: Workers can fetch blob URLs from same origin)
// If images are Base64, they work as is.
const resolveImage = async (url: string): Promise<string> => {
    if (!url) return '';
    
    try {
        // If it's a blob URL (from IndexedDB hydration), we need to fetch it to get base64
        if (url.startsWith('blob:')) {
             const response = await fetch(url);
             const blob = await response.blob();
             return new Promise((resolve) => {
                 const reader = new FileReader();
                 reader.onloadend = () => resolve(reader.result as string);
                 reader.readAsDataURL(blob);
             });
        }
        return url; // Assume Base64
    } catch (e) {
        console.error("Worker failed to resolve image:", e);
        return '';
    }
};

self.onmessage = async (e: MessageEvent) => {
    const { project } = e.data as { project: Project };

    if (!project) {
        self.postMessage({ type: 'ERROR', error: 'No project data received' });
        return;
    }

    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let cursorY = margin;

        // --- TITLE PAGE ---
        doc.setFillColor(24, 24, 27); // Dark background
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(project.name.toUpperCase(), pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`STORYBOARD EXPORT`, pageWidth / 2, pageHeight / 2 + 5, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight / 2 + 12, { align: 'center' });
        
        doc.addPage();

        // --- CONTENT PAGES ---
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setTextColor(0, 0, 0);

        for (const scene of project.scenes) {
            // Check Page Break
            if (cursorY > pageHeight - 40) {
                doc.addPage();
                cursorY = margin;
            }

            // SCENE HEADER
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, cursorY, pageWidth - (margin * 2), 10, 'F');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`${scene.sequence}. ${scene.heading}`, margin + 2, cursorY + 6.5);
            cursorY += 15;

            const sceneShots = project.shots
                .filter(s => s.sceneId === scene.id)
                .sort((a, b) => a.sequence - b.sequence);

            if (sceneShots.length === 0) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text("(No shots in this scene)", margin, cursorY);
                cursorY += 10;
                continue;
            }

            // Render Shots in Grid
            const colWidth = (pageWidth - (margin * 2) - 10) / 2;
            const rowHeight = 70; 

            for (let i = 0; i < sceneShots.length; i += 2) {
                if (cursorY + rowHeight > pageHeight - margin) {
                    doc.addPage();
                    cursorY = margin;
                }

                const shotA = sceneShots[i];
                const shotB = sceneShots[i+1];

                // Pre-resolve images before drawing to ensure we don't stall heavily inside the draw loop
                const imgA = shotA.generatedImage ? await resolveImage(shotA.generatedImage) : null;
                const imgB = shotB && shotB.generatedImage ? await resolveImage(shotB.generatedImage) : null;

                // Draw Left
                drawShot(doc, shotA, imgA, margin, cursorY, colWidth, rowHeight);

                // Draw Right
                if (shotB) {
                    drawShot(doc, shotB, imgB, margin + colWidth + 10, cursorY, colWidth, rowHeight);
                }

                cursorY += rowHeight + 10;
            }
            cursorY += 10;
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }

        const blob = doc.output('blob');
        self.postMessage({ type: 'SUCCESS', payload: blob });

    } catch (e: any) {
        console.error("Worker PDF Error:", e);
        self.postMessage({ type: 'ERROR', error: e.message || 'Unknown error' });
    }
};

function drawShot(doc: jsPDF, shot: Shot, imgData: string | null, x: number, y: number, w: number, h: number) {
  const imgHeight = (w * 9) / 16;
  doc.setDrawColor(200, 200, 200);
  doc.rect(x, y, w, imgHeight);

  if (imgData) {
    try {
      doc.addImage(imgData, 'JPEG', x, y, w, imgHeight, undefined, 'FAST');
    } catch (e) {
      doc.setFontSize(8);
      doc.text("Image Error", x + 5, y + 10);
    }
  }

  const metaY = y + imgHeight + 2;
  
  // Badge
  doc.setFillColor(0, 0, 0);
  doc.rect(x, y, 12, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${shot.sequence}`, x + 6, y + 4, { align: 'center' });

  // Specs
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text(`${shot.shotType.toUpperCase()}  |  ${shot.aspectRatio}`, x, metaY + 4);

  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const desc = shot.description || shot.dialogue || "(No description)";
  const splitText = doc.splitTextToSize(desc, w);
  const linesToPrint = splitText.length > 4 ? splitText.slice(0, 4) : splitText;
  
  doc.text(linesToPrint, x, metaY + 10);
}