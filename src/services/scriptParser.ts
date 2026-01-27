/*
 * 📋 SERVICE: SCRIPT PARSER (Phase 3 - Silent Auto-Fix)
 * 
 * Handles parsing of .fountain, .txt, .fdx (Final Draft), and .pdf files.
 * 
 * Phase 3 Change:
 * - Auto-fix is now ENABLED BY DEFAULT (silent cleanup)
 * - No UI prompts, just clean scripts automatically
 * - Validation still runs (for export checks later)
 */

import { Scene, ScriptElement, TitlePageData } from '../types';
import { parseFountain as parseFountainLib } from '../lib/fountain';
import { convertFountainToElements } from './scriptUtils';
import { ScriptModel } from './scriptModel';
import { autoFixElements } from './validation/autoFix';
import { ValidationReport } from './validation/validationReport';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * PHASE 3: Enhanced parsed script with silent auto-fix
 */
export interface ParsedScript {
  scenes: Scene[];
  elements: ScriptElement[];
  metadata: {
    title?: string;
    author?: string;
  };
  titlePage?: TitlePageData;
  
  // Phase 2/3 fields (kept for export validation):
  scriptModel: ScriptModel;           // Validated, immutable wrapper
  validationReport: ValidationReport; // Quality assessment (for export)
  autoFixAvailable: boolean;          // Can issues be auto-fixed?
  autoFixedElements?: ScriptElement[]; // If auto-fix was applied
}

// --- MAIN PARSER ENTRY ---

export async function parseScript(file: File, options?: {
  autoFix?: boolean; // Default TRUE (Phase 3 change)
  strict?: boolean;  // Reject invalid scripts
}): Promise<ParsedScript> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.fountain') || filename.endsWith('.txt')) {
    const text = await file.text();
    return parseFountain(text, options);
  } 
  else if (filename.endsWith('.fdx')) {
    const text = await file.text();
    return parseFDX(text, options);
  }
  else if (filename.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    return parsePDF(arrayBuffer, options);
  }
  else {
    throw new Error(`Unsupported format: ${filename}. Supported: .fountain, .txt, .pdf, .fdx`);
  }
}

/**
 * HELPER: Wrap parsed elements with validation
 * Phase 3: Auto-fix is now DEFAULT BEHAVIOR
 */
function createValidatedResult(
  elements: ScriptElement[],
  titlePage: TitlePageData | undefined,
  title: string,
  options?: { autoFix?: boolean; strict?: boolean }
): ParsedScript {
  const strict = options?.strict ?? false;
  
  // PHASE 3 CHANGE: Auto-fix is now TRUE by default
  const shouldAutoFix = options?.autoFix ?? true;
  
  let finalElements = elements;
  let autoFixedElements: ScriptElement[] | undefined;
  
  // Auto-fix by default (silent)
  if (shouldAutoFix) {
    const fixResult = autoFixElements(elements);
    finalElements = fixResult.fixed;
    autoFixedElements = fixResult.fixed;
    
    // Only log if fixes were made
    if (fixResult.totalFixed > 0 || fixResult.removed.length > 0) {
      console.log(`[Phase 3] Silently auto-fixed ${fixResult.totalFixed} issues, removed ${fixResult.removed.length} invalid elements`);
    }
  }
  
  // Create validated model
  const scriptModel = ScriptModel.create(finalElements, titlePage, { strict });
  const validationReport = scriptModel.getValidationReport();
  
  // Check if auto-fix is available for remaining issues
  const autoFixAvailable = validationReport.issues.some(
    issue => ['CHARACTER_NOT_UPPERCASE', 'PARENTHETICAL_FORMAT', 'EMPTY_CONTENT', 
               'DUAL_DIALOGUE_UNPAIRED', 'SEQUENCE_GAPS'].includes(issue.code)
  );
  
  // Silent validation (no console spam unless errors)
  if (validationReport.summary.errors > 0) {
    console.log(`[Phase 3] ⚠️ Validation: ${validationReport.summary.errors} errors, ${validationReport.summary.warnings} warnings (Confidence: ${(validationReport.confidence * 100).toFixed(1)}%)`);
  } else {
    console.log(`[Phase 3] ✅ Script validated and cleaned (Confidence: ${(validationReport.confidence * 100).toFixed(1)}%)`);
  }
  
  if (!validationReport.valid && strict) {
    throw new Error(`Script validation failed: ${validationReport.summary.errors} errors found`);
  }
  
  return {
    scenes: [],
    elements: finalElements,
    metadata: { title },
    titlePage,
    scriptModel,
    validationReport,
    autoFixAvailable,
    autoFixedElements
  };
}

// --- 1. FOUNTAIN PARSER ---

function parseFountain(text: string, options?: { autoFix?: boolean; strict?: boolean }): ParsedScript {
  const output = parseFountainLib(text, true);
  const elements = convertFountainToElements(output.tokens);
  
  // Extract Title Page Data
  const titlePage: TitlePageData = {};
  const authors: string[] = [];

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
  
  const title = output.title || titlePage.title || 'Untitled Script';

  return createValidatedResult(elements, titlePage, title, options);
}

// --- 2. FINAL DRAFT (FDX) PARSER ---

function parseFDX(xmlText: string, options?: { autoFix?: boolean; strict?: boolean }): ParsedScript {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  
  // Parse Script Elements
  const paragraphs = Array.from(doc.querySelectorAll('Paragraph'));
  const elements: ScriptElement[] = [];
  let sequence = 1;
  
  // Track dual dialogue blocks
  let dualDialogueBlock: ScriptElement[] = [];
  let inDualDialogue = false;

  paragraphs.forEach(p => {
    const typeRaw = p.getAttribute('Type');
    const textNodes = p.querySelectorAll('Text');
    
    // Combine text nodes
    let content = Array.from(textNodes).map(n => n.textContent).join('');
    if (!content.trim()) return;

    let type: ScriptElement['type'] = 'action';
    const isDual = p.getAttribute('Dual') === 'Yes';

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
    
    const element: ScriptElement = {
      id: crypto.randomUUID(),
      type,
      content,
      sequence: sequence++
    };
    
    // Handle dual dialogue
    if (isDual) {
      if (!inDualDialogue) {
        inDualDialogue = true;
        element.dual = 'left';
        dualDialogueBlock = [element];
      } else {
        element.dual = 'left';
        dualDialogueBlock.push(element);
      }
    } else if (inDualDialogue) {
      inDualDialogue = false;
      dualDialogueBlock = [];
    }

    elements.push(element);
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
  
  const title = titlePage.title || 'Imported FDX Script';

  return createValidatedResult(elements, titlePage, title, options);
}

// --- 3. PDF PARSER (Optimized Heuristic with Line Merging) ---

async function parsePDF(arrayBuffer: ArrayBuffer, options?: { autoFix?: boolean; strict?: boolean }): Promise<ParsedScript> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const allLines: { y: number, x: number, text: string, page: number }[] = [];

  // 1. EXTRACT ALL LINES
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;

    const items = textContent.items as any[];
    const pageLines: { y: number, x: number, text: string, items: any[] }[] = [];

    items.forEach(item => {
      const str = item.str;
      if (!str || !str.trim()) return;

      const y = item.transform[5];
      const x = item.transform[4];

      // Ignore Headers/Footers
      if (y > pageHeight - 60 || y < 60) return;

      const line = pageLines.find(l => Math.abs(l.y - y) < 4);
      if (line) {
        line.items.push({ x, str });
        line.x = Math.min(line.x, x);
      } else {
        pageLines.push({ y, x, text: '', items: [{ x, str }] });
      }
    });

    pageLines.forEach(line => {
      line.items.sort((a, b) => a.x - b.x);
      line.text = line.items.map(i => i.str).join('');
    });

    pageLines.sort((a, b) => b.y - a.y);
    pageLines.forEach(l => allLines.push({ ...l, page: i }));
  }

  // 2. DETECT MARGINS
  const xCounts: Record<number, number> = {};
  allLines.forEach(l => {
    const rx = Math.round(l.x / 5) * 5;
    xCounts[rx] = (xCounts[rx] || 0) + 1;
  });
  
  let baseX = 108;
  let maxCount = 0;
  for (const [xStr, count] of Object.entries(xCounts)) {
    if (count > maxCount) {
      maxCount = count;
      baseX = parseInt(xStr);
    }
  }
  if (baseX < 50) baseX = 72;

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
    const offset = x - baseX;
    
    let type: ScriptElement['type'] = 'action';
    const upper = text.toUpperCase();
    const isUppercase = text === upper && /[A-Z]/.test(text);

    // Filter artifacts
    if (offset > 200 && /^[\d.]+$/.test(text)) {
      return;
    }

    // Classification logic
    if (offset < 36) {
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
        type = 'transition';
      }
    }
    
    if (type === 'dialogue' && text.startsWith('(') && text.endsWith(')')) {
      type = 'parenthetical';
    }

    // Merge logic
    const lastElement = elements[elements.length - 1];
    let merged = false;

    if (lastElement && lastElement.type === type && page === lastPage) {
      const distance = lastY - y;
      const isConsecutive = distance > 0 && distance < 24;

      if (isConsecutive && type !== 'scene_heading' && type !== 'character') {
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

  return createValidatedResult(elements, undefined, 'Imported PDF Script', options);
}
