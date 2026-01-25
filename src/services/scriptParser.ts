/*
 * 📜 SERVICE: SCRIPT PARSER
 * 
 * Handles parsing of .fountain, .txt, .fdx (Final Draft), and .pdf files.
 * Converts raw file data into structured ScriptElements.
 */

import { Scene, ScriptElement, TitlePageData } from '../types';
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
  titlePage?: TitlePageData; // Added field
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
  
  // Extract Title Page Data
  const titlePage: TitlePageData = {};
  const authors: string[] = [];

  // Iterate over tokens to find metadata (usually at the start)
  for (const token of output.tokens) {
      if (token.type === 'title') titlePage.title = token.text;
      if (token.type === 'credit') titlePage.credit = token.text;
      if (token.type === 'author') authors.push(token.text || '');
      if (token.type === 'authors') authors.push(token.text || '');
      if (token.type === 'source') titlePage.source = token.text;
      if (token.type === 'draft_date' || token.type === 'date') titlePage.draftDate = token.text;
      if (token.type === 'contact') titlePage.contact = token.text;
      if (token.type === 'copyright') titlePage.copyright = token.text;
      if (token.type === 'notes') titlePage.additionalInfo = token.text;
  }

  if (authors.length > 0) {
      titlePage.authors = authors;
  }

  return {
    scenes: [],
    elements,
    metadata: {
      title: output.title || titlePage.title || 'Untitled Script'
    },
    titlePage
  };
}

// --- 2. FINAL DRAFT (FDX) PARSER ---

function parseFDX(xmlText: string): ParsedScript {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  
  // Parse Script Elements
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

  // Parse Title Page
  const titlePage: TitlePageData = {};
  const titlePageNode = doc.querySelector('TitlePage');
  
  if (titlePageNode) {
      const getText = (tag: string) => {
          const nodes = titlePageNode.querySelectorAll(tag + ' Paragraph Text');
          return Array.from(nodes).map(n => n.textContent).join('\n').trim();
      };

      const title = getText('Title');
      if (title) titlePage.title = title;

      const credit = getText('Credit');
      if (credit) titlePage.credit = credit;

      const author = getText('Author');
      if (author) titlePage.authors = [author];

      const source = getText('Source');
      if (source) titlePage.source = source;

      const date = getText('Date');
      if (date) titlePage.draftDate = date;
      
      const contact = getText('Contact');
      if (contact) titlePage.contact = contact;
      
      const copyright = getText('Copyright');
      if (copyright) titlePage.copyright = copyright;
  }

  return {
    scenes: [],
    elements,
    metadata: {
      title: titlePage.title || 'Imported FDX Script'
    },
    titlePage
  };
}

// --- 3. PDF PARSER (Optimized Heuristic with Line Merging) ---

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

      const y = item.transform[5]; // Y-coordinate (0 at bottom)
      const x = item.transform[4]; // X-coordinate (0 at left)

      // Ignore Headers/Footers (Top 60pt / Bottom 60pt)
      // Increased buffer to catch page numbers
      if (y > pageHeight - 60 || y < 60) return;

      // Group by Y (4pt tolerance for slight misalignment)
      const line = pageLines.find(l => Math.abs(l.y - y) < 4);
      if (line) {
        line.items.push({ x, str });
        line.x = Math.min(line.x, x);
      } else {
        pageLines.push({ y, x, text: '', items: [{ x, str }] });
      }
    });

    // Construct Text for each line
    pageLines.forEach(line => {
      // Sort items left-to-right
      line.items.sort((a, b) => a.x - b.x);
      
      // Join with simple concatenation
      line.text = line.items.map(i => i.str).join('');
    });

    // Sort Top-to-Bottom (Higher Y is earlier in PDF)
    pageLines.sort((a, b) => b.y - a.y);

    pageLines.forEach(l => allLines.push({ ...l, page: i }));
  }

  // 2. DETECT MARGINS (Global Stats)
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

  // 3. CLASSIFY & MERGE ELEMENTS
  const elements: ScriptElement[] = [];
  let sequence = 1;
  let lastY = 0;
  let lastPage = 0;

  allLines.forEach(line => {
      const text = line.text.trim();
      if (!text) return;
      
      const x = line.x;
      const y = line.y;
      const page = line.page;
      const offset = x - baseX; // Distance from Action Margin
      
      let type: ScriptElement['type'] = 'action';
      const upper = text.toUpperCase();
      const isUppercase = text === upper && /[A-Z]/.test(text);

      // --- FILTER ARTIFACTS ---
      // Ignore isolated numbers on the right (Page/Scene numbers like "2." or "2.2.")
      if (offset > 200 && /^[\d.]+$/.test(text)) {
          return;
      }

      // --- CLASSIFICATION LOGIC ---
      // Action: 0
      // Dialogue: ~72 (1.0") -> 130pt (safe buffer)
      // Parenthetical: ~115 (1.6") -> 190pt
      // Character: ~158 (2.2") -> 240pt
      // Transition: ~288 (4.0") -> 320pt

      if (offset < 36) {
          // Left aligned: Scene Heading or Action
          if (/^(INT\.|EXT\.|INT |EXT |I\/E)/i.test(text)) {
              type = 'scene_heading';
          } else if (isUppercase && !text.endsWith('.')) {
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
              type = 'dialogue';
          }
      }
      else if (offset >= 220) {
          if (text.endsWith('TO:') || text.startsWith('FADE')) {
              type = 'transition';
          } else {
              // Assume transition for right-aligned text that survived artifact filter
              type = 'transition'; 
          }
      }
      
      // Cleanup Heuristics
      if (type === 'dialogue' && text.startsWith('(') && text.endsWith(')')) {
          type = 'parenthetical';
      }

      // --- MERGE LOGIC ---
      // Check if this line continues the previous element block
      const lastElement = elements[elements.length - 1];
      let merged = false;

      if (lastElement && lastElement.type === type && page === lastPage) {
          // Calculate vertical distance (PDF Y grows upwards, so subtract current from last)
          const distance = lastY - y; 
          
          // Standard single line spacing is ~12-14pt
          // Standard double spacing (new paragraph) is ~24pt+
          // We use a looser threshold of 24pt to ensure single paragraphs don't split
          // even if the PDF leading is slightly wide.
          const isConsecutive = distance > 0 && distance < 24;

          // Don't merge Scene Headings (they are distinct lines)
          // Don't merge Characters (rare, but keeps safety)
          if (isConsecutive && type !== 'scene_heading' && type !== 'character') {
              // Add space if needed
              const separator = (/[a-zA-Z0-9.,?!"]$/.test(lastElement.content) && /^[a-zA-Z0-9]/.test(text)) ? ' ' : ' ';
              lastElement.content += separator + text;
              merged = true;
          }
      }

      if (!merged) {
          elements.push({
              id: crypto.randomUUID(),
              type,
              content: text,
              sequence: sequence++
          });
      }

      lastY = y;
      lastPage = page;
  });

  return {
    scenes: [],
    elements,
    metadata: {
      title: 'Imported PDF Script'
    }
  };
}