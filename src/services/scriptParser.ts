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
// We use unpkg to fetch the worker that matches the installed version to avoid build complexities
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
    scenes: [], // Scenes are synced later by WorkspaceLayout
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
    
    // Combine text nodes (handling formatting like bold/underline which FDX splits)
    let content = Array.from(textNodes).map(n => n.textContent).join('');
    
    if (!content.trim()) return;

    let type: ScriptElement['type'] = 'action';
    let dual = p.getAttribute('Dual') === 'Yes'; // FDX stores dual dialogue in attribute

    // Map FDX types to internal types
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

// --- 3. PDF PARSER (Heuristic) ---

async function parsePDF(arrayBuffer: ArrayBuffer): Promise<ParsedScript> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const elements: ScriptElement[] = [];
  let sequence = 1;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Get viewport to normalize coordinates (72 DPI standard)
    // Most scripts are 8.5" x 11" (612pt x 792pt)
    // Left margin is usually 1.0" or 1.5" (72pt or 108pt)
    
    // Process items
    // We sort by Y (descending, top to bottom) then X (ascending)
    const items = textContent.items as any[];
    
    // Group by line (approximate Y)
    const lines: { y: number, x: number, text: string }[] = [];
    
    items.forEach(item => {
      const y = Math.round(item.transform[5]); // Round Y to group same-line items
      const x = item.transform[4];
      const text = decodeURIComponent(item.str);
      
      if (!text.trim()) return;

      const existingLine = lines.find(l => Math.abs(l.y - y) < 4); // 4pt tolerance
      if (existingLine) {
        existingLine.text += text;
        // Keep smallest X (start of line)
        existingLine.x = Math.min(existingLine.x, x);
      } else {
        lines.push({ y, x, text });
      }
    });

    // Sort lines top to bottom
    lines.sort((a, b) => b.y - a.y);

    // Heuristics for Script Elements based on X indentation (Points)
    // Standard left margin is 108pt (1.5") or 72pt (1.0")
    // Character: ~200pt+ 
    // Dialogue: ~140pt+
    // Parenthetical: ~180pt+
    // Transition: ~350pt+ or Right Aligned
    
    lines.forEach(line => {
      let type: ScriptElement['type'] = 'action';
      const x = line.x;
      const text = line.text.trim();
      const upper = text.toUpperCase();

      // Detection Logic
      if (x < 130) {
        // Left aligned: Scene Heading or Action
        if (text.startsWith('INT') || text.startsWith('EXT') || text.startsWith('I/E') || text === text.toUpperCase()) {
           // Basic guess: If mostly uppercase, it's likely a heading or slugline. 
           // NOTE: Action can be uppercase too, but headings usually start with INT/EXT.
           if (/^(INT\.|EXT\.|INT |EXT |I\/E)/i.test(text)) {
             type = 'scene_heading';
           } else {
             type = 'action';
           }
        } else {
          type = 'action';
        }
      } else if (x >= 130 && x < 190) {
        // Slight indent: Dialogue
        type = 'dialogue';
      } else if (x >= 190 && x < 240) {
        // Medium indent: Parenthetical or Dialogue
        if (text.startsWith('(')) {
          type = 'parenthetical';
        } else {
          // Sometimes dialogue spills here? Or dual dialogue?
          // Let's assume dialogue if not parenthetical.
          type = 'dialogue';
        }
      } else if (x >= 240 && x < 320) {
        // Deep indent: Character
        // Characters are usually uppercase
        if (text === upper && text.length < 50) {
          type = 'character';
        } else {
          // If mixed case, might be parenthetical or weirdly formatted dialogue
          type = 'dialogue';
        }
      } else if (x >= 320) {
        // Far right: Transition or Cut
        if (text.endsWith('TO:') || text.startsWith('FADE')) {
          type = 'transition';
        } else {
          type = 'action'; // Fallback
        }
      }

      elements.push({
        id: crypto.randomUUID(),
        type,
        content: text,
        sequence: sequence++
      });
    });
  }

  return {
    scenes: [],
    elements,
    metadata: {
      title: 'Imported PDF Script'
    }
  };
}