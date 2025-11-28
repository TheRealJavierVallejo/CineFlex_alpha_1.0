import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, Shot, Scene } from '../types';

// Helper to convert Blob URL to Base64 for PDF embedding
const getBase64FromUrl = async (url: string): Promise<string> => {
  const data = await fetch(url);
  const blob = await data.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data);
    };
  });
};

export const generateStoryboardPDF = async (project: Project) => {
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
  // Reset to white background for printability
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setTextColor(0, 0, 0);

  // Iterate Scenes
  for (const scene of project.scenes) {
    // Check for page break
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

    // Filter shots for this scene
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

    // Render Shots in a 2-column grid
    const colWidth = (pageWidth - (margin * 2) - 10) / 2;
    const rowHeight = 70; 

    for (let i = 0; i < sceneShots.length; i += 2) {
      // Check Page Break
      if (cursorY + rowHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }

      const shotA = sceneShots[i];
      const shotB = sceneShots[i+1];

      // Draw Shot A (Left Column)
      await drawShot(doc, shotA, margin, cursorY, colWidth, rowHeight);

      // Draw Shot B (Right Column)
      if (shotB) {
        await drawShot(doc, shotB, margin + colWidth + 10, cursorY, colWidth, rowHeight);
      }

      cursorY += rowHeight + 10;
    }

    cursorY += 10; // Spacing between scenes
  }

  // Footer (Page Numbers)
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  doc.save(`${project.name.replace(/\s+/g, '_')}_Storyboard.pdf`);
};

async function drawShot(doc: jsPDF, shot: Shot, x: number, y: number, w: number, h: number) {
  // Image Box
  const imgHeight = (w * 9) / 16; // 16:9 aspect
  doc.setDrawColor(200, 200, 200);
  doc.rect(x, y, w, imgHeight);

  if (shot.generatedImage) {
    try {
      const base64 = await getBase64FromUrl(shot.generatedImage);
      doc.addImage(base64, 'JPEG', x, y, w, imgHeight, undefined, 'FAST');
    } catch (e) {
      // Fallback if image fails
      doc.setFontSize(8);
      doc.text("Image Error", x + 5, y + 10);
    }
  }

  // Meta Data Box
  const metaY = y + imgHeight + 2;
  
  // Shot Number Badge
  doc.setFillColor(0, 0, 0);
  doc.rect(x, y, 12, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${shot.sequence}`, x + 6, y + 4, { align: 'center' });

  // Type & Specs
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text(`${shot.shotType.toUpperCase()}  |  ${shot.aspectRatio}`, x, metaY + 4);

  // Description (Truncated)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const desc = shot.description || shot.dialogue || "(No description)";
  const splitText = doc.splitTextToSize(desc, w);
  // Limit to 4 lines
  const linesToPrint = splitText.length > 4 ? splitText.slice(0, 4) : splitText;
  
  doc.text(linesToPrint, x, metaY + 10);
}