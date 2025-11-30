/*
 * 📜 SERVICE: SCRIPT PARSER
 * 
 * Handles parsing of .fountain, .txt, .fdx (Final Draft), and .pdf files.
 * Converts raw file data into structured ScriptElements.
 */

import { Scene, ScriptElement } from '../types';
import { parseFountain as parseFountainLib } from '../lib/fountain';
import { convertFountainToElements } from './scriptUtils';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ParsedScript {
  scenes: Scene[];
  elements: ScriptElement[];
  metadata: {
    title?: string;
    author?: string;
  };
}

// --- MAIN PARSER ENTRY ---

export async function parseScript(file: File): Promise<ParsedScript> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.fountain') || filename.endsWith('.txt')) {
    const text = await file.text();
    return parseFountain(text);
  } 
  else if (filename.endsWith('.fdx')) {
    const text = await file.text();
    return parseFDX(text);
  }
  else if (filename.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    return parsePDF(arrayBuffer);
  }
  else {
    throw new Error(`Unsupported format: ${filename}. Supported: .fountain, .txt, .pdf, .fdx`);
  }
}

// --- 1. FOUNTAIN PARSER ---

function parseFountain(text: string): ParsedScript {
  const output = parseFountainLib(text, true);
  const elements = convertFountainToElements(output.tokens);
  
  return {
    scenes: [],
    elements,
    metadata: {
      title: output.title || 'Untitled Script'
    }
  };
}

// --- 2. FINAL DRAFT (FDX) PARSER ---

function parseFDX(xmlText: string): ParsedScript {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  
  const paragraphs = Array.from(doc.querySelectorAll('Paragraph'));
  const elements: ScriptElement[] = [];
  let sequence = 1;

  paragraphs.forEach(p => {
    const typeRaw = p.getAttribute('Type');
    const textNodes = p.querySelectorAll('Text');
    
    // Combine text nodes
    let content = Array.from(textNodes).map(n => n.textContent).join('');
    if (!content.trim()) return;

    let type: ScriptElement['type'] = 'action';
    let dual = p.getAttribute('Dual') === 'Yes'; 

    switch (typeRaw) {
      case 'Scene Heading': type = 'scene_heading'; break;
      case 'Action': type = 'action'; break;
      case 'Character': type = 'character'; break;
      case 'Dialogue': type = 'dialogue'; break;
      case 'Parenthetical': type = 'parenthetical'; break;
      case 'Transition': type = 'transition'; break;
      case 'General': type = 'action'; break;
      default: type = 'action';
    }

    elements.push({
      id: crypto.randomUUID(),
      type,
      content,
      sequence: sequence++,
      dual: dual ? true : undefined
    });
  });

  return {
    scenes: [],
    elements,
    metadata: {
      title: 'Imported FDX Script'
    }
  };
}

// --- 3. PDF PARSER (Optimized Heuristic) ---

async function parsePDF(arrayBuffer: ArrayBuffer): Promise<ParsedScript> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const allLines: { y: number, x: number, text: string, page: number }[] = [];

  // 1. EXTRACT ALL LINES
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 }); // Standardize to 72DPI
    const pageHeight = viewport.height;

    const items = textContent.items as any[];
    const pageLines: { y: number, x: number, text: string, items: any[] }[] = [];

    items.forEach(item => {
      const str = item.str;
      if (!str || !str.trim()) return;

      const y = item.transform[5];
      const x = item.transform[4];

      // Ignore Headers/Footers (Top 50pt / Bottom 50pt)
      if (y > pageHeight - 50 || y < 50) return;

      // Group by Y (4pt tolerance)
      const line = pageLines.find(l => Math.abs(l.y - y) < 4);
      if (line) {
        line.items.push({ x, str });
        line.x = Math.min(line.x, x);
      } else {
        pageLines.push({ y, x, text: '', items: [{ x, str }] });
      }
    });

    // Construct Text
    pageLines.forEach(line => {
      // Sort items left-to-right
      line.items.sort((a, b) => a.x - b.x);
      // Join with simple concatenation (PDFJS usually handles spacing, or we accept potential merged words for now)
      line.text = line.items.map(i => i.str).join('');
    });

    // Sort Top-to-Bottom
    pageLines.sort((a, b) => b.y - a.y);

    pageLines.forEach(l => allLines.push({ ...l, page: i }));
  }

  // 2. DETECT MARGINS (Global Stats)
  // We look for the most common X coordinate (rounded) to find the "Action" margin.
  const xCounts: Record<number, number> = {};
  allLines.forEach(l => {
      const rx = Math.round(l.x / 5) * 5; // Round to nearest 5
      xCounts[rx] = (xCounts[rx] || 0) + 1;
  });
  
  let baseX = 108; // Default 1.5" (108pt)
  let maxCount = 0;
  for (const [xStr, count] of Object.entries(xCounts)) {
      if (count > maxCount) {
          maxCount = count;
          baseX = parseInt(xStr);
      }
  }
  // Sanity check for BaseX
  if (baseX < 50) baseX = 72; // Assume 1.0" if detected edge is too close

  // 3. CLASSIFY ELEMENTS
  const elements: ScriptElement[] = [];
  let sequence = 1;

  allLines.forEach(line => {
      const text = line.text.trim();
      if (!text) return;
      
      const x = line.x;
      const offset = x - baseX; // Distance from Action Margin
      
      let type: ScriptElement['type'] = 'action';
      const upper = text.toUpperCase();
      const isUppercase = text === upper && /[A-Z]/.test(text);

      // SCREENPLAY GEOMETRY (Points relative to Action Margin)
      // Action: 0
      // Dialogue: ~72 (1.0")
      // Parenthetical: ~115 (1.6")
      // Character: ~158 (2.2")
      // Transition: ~288 (4.0") or Right Aligned

      if (offset < 36) {
          // ACTION or SCENE HEADING
          if (/^(INT|EXT|EST|I\/E)(\.|\s)/i.test(text)) {
              type = 'scene_heading';
          } else if (isUppercase && !text.endsWith('.')) {
              // Uppercase Action -> Could be heading or slugline
              // If it has " - " it's likely a heading
              if (text.includes(' - ')) {
                  type = 'scene_heading';
              } else if (text.endsWith('TO:') || text.startsWith('FADE')) {
                  type = 'transition';
              } else {
                  type = 'action';
              }
          } else {
              type = 'action';
          }
      } 
      else if (offset >= 36 && offset < 93) {
          type = 'dialogue';
      }
      else if (offset >= 93 && offset < 136) {
          if (text.startsWith('(')) {
              type = 'parenthetical';
          } else {
              type = 'dialogue';
          }
      }
      else if (offset >= 136 && offset < 220) {
          if (isUppercase) {
              type = 'character';
          } else {
              type = 'dialogue'; // Weirdly formatted dialogue
          }
      }
      else if (offset >= 220) {
          if (text.endsWith('TO:') || text.startsWith('FADE')) {
              type = 'transition';
          } else {
              type = 'transition'; // Likely right aligned transition
          }
      }
      
      // Cleanup Heuristics
      if (type === 'dialogue' && text.startsWith('(') && text.endsWith(')')) {
          type = 'parenthetical';
      }

      elements.push({
          id: crypto.randomUUID(),
          type,
          content: text,
          sequence: sequence++
      });
  });

  return {
    scenes: [],
    elements,
    metadata: {
      title: 'Imported PDF Script'
    }
  };
}