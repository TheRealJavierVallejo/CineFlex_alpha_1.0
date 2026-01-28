/*
 * 📋 SERVICE: SCRIPT PARSER (Enhanced with Dual Dialogue Detection)
 * 
 * Handles parsing of .fountain, .txt, .fdx (Final Draft), and .pdf files.
 * 
 * NEW: Dual dialogue detection for PDF imports using X-position clustering
 * NEW: (CONT'D) detection and metadata storage (industry standard)
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

/**
 * CRITICAL HELPER: Detect and extract (CONT'D) from character names
 * Returns clean character name + continuation flag
 */
function parseCharacterName(rawText: string): { character: string; isContinued: boolean } {
  // Match various (CONT'D) patterns: (CONT'D), (CONT.), (CONTD), (cont'd), etc.
  const contdPattern = /\s*\(CONT['']?D?\.?\)\s*$/i;
  const match = rawText.match(contdPattern);
  
  if (match) {
    return {
      character: rawText.replace(contdPattern, '').trim(),
      isContinued: true
    };
  }
  
  return {
    character: rawText.trim(),
    isContinued: false
  };
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
  let hadFixableIssues = false;
  
  // First validate WITHOUT auto-fix to check if issues exist
  const preFixModel = ScriptModel.create(elements, titlePage, { strict: false });
  const preFixReport = preFixModel.getValidationReport();
  
  // Check if there are fixable issues
  hadFixableIssues = preFixReport.issues.some(
    issue => ['CHARACTER_NOT_UPPERCASE', 'PARENTHETICAL_FORMAT', 'EMPTY_CONTENT', 
               'DUAL_DIALOGUE_UNPAIRED', 'SEQUENCE_GAPS'].includes(issue.code)
  );
  
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
  
  // Auto-fix is available if we didn't auto-fix AND there are fixable issues
  const autoFixAvailable = !shouldAutoFix && hadFixableIssues;
  
  // Silent validation (no console spam unless errors)
  if (validationReport.summary.errors > 0) {
    console.log(`[Phase 3] ⚠️ Validation: ${validationReport.summary.errors} errors, ${validationReport.summary.warnings} warnings (Confidence: ${(validationReport.confidence * 100).toFixed(1)}%)`);
  } else {
    console.log(`[Phase 3] ✅ Script validated and cleaned (Confidence: ${(validationReport.confidence * 100).toFixed(1)}%)`);
  }
  
  // STRICT MODE: Throw if validation fails
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
  let elements = convertFountainToElements(output.tokens);
  
  // Post-process: Detect (CONT'D) in character names
  elements = elements.map(el => {
    if (el.type === 'character') {
      const { character, isContinued } = parseCharacterName(el.content);
      return {
        ...el,
        content: character,
        isContinued: isContinued || undefined // Only set if true
      };
    }
    return el;
  });
  
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
  const paragraphs = Array.from(doc.querySelectorAll('Content > Paragraph'));
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
    
    // FDX SPECIFIC: Detect (CONT'D) in character names
    if (type === 'character') {
      const { character, isContinued } = parseCharacterName(content);
      element.content = character;
      if (isContinued) element.isContinued = true;
    }
    
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
  const titlePageContent = doc.querySelector('TitlePage > Content');
  
  if (titlePageContent) {
    const titlePageParagraphs = Array.from(titlePageContent.querySelectorAll('Paragraph'));
    
    titlePageParagraphs.forEach(p => {
      const type = p.getAttribute('Type');
      const textNodes = p.querySelectorAll('Text');
      const text = Array.from(textNodes).map(n => n.textContent).join('').trim();
      
      if (!text) return;
      
      switch (type) {
        case 'Title':
          titlePage.title = text;
          break;
        case 'Credit':
          titlePage.credit = text;
          break;
        case 'Author':
        case 'Authors':
          if (!titlePage.authors) titlePage.authors = [];
          titlePage.authors.push(text);
          break;
        case 'Source':
          titlePage.source = text;
          break;
        case 'Draft Date':
        case 'Date':
          titlePage.draftDate = text;
          break;
        case 'Contact':
          titlePage.contact = text;
          break;
        case 'Copyright':
          titlePage.copyright = text;
          break;
      }
    });
  }
  
  const title = titlePage.title || 'Imported FDX Script';

  return createValidatedResult(elements, titlePage, title, options);
}

// --- 3. PDF PARSER (Enhanced with Dual Dialogue Detection) ---

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

      // Ignore Headers/Footers (Expanded margin to 1 inch / 72pt)
      if (y > pageHeight - 72 || y < 72) return;

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

  // --- TITLE PAGE DETECTION ---
  const titlePage: TitlePageData = {};
  let startPage = 1;
  let detectedTitle = 'Imported PDF Script';

  const page1Lines = allLines.filter(l => l.page === 1);
  const hasSceneHeadingOnPage1 = page1Lines.some(l => 
    /^(INT\.|EXT\.|INT |EXT |I\/E)/i.test(l.text.trim())
  );

  if (page1Lines.length > 0 && !hasSceneHeadingOnPage1) {
    console.log('[PDF Parser] Detected potential Title Page on Page 1');
    startPage = 2;
    
    for (let i = 0; i < page1Lines.length; i++) {
        const text = page1Lines[i].text.trim();
        const lower = text.toLowerCase();
        
        if (lower.includes('written by')) {
            titlePage.credit = 'Written by';
            if (page1Lines[i+1]) titlePage.authors = [page1Lines[i+1].text.trim()];
        }
        else if (lower.includes('story by')) {
             if (page1Lines[i+1]) {
                 titlePage.authors = [...(titlePage.authors || []), page1Lines[i+1].text.trim()];
             }
        }
        else if (lower.includes('draft') || /\d{4}/.test(text)) {
            titlePage.draftDate = text;
        }
        else if (lower.includes('contact') || lower.includes('@') || /\d{3}-\d{3}/.test(text)) {
            titlePage.contact = text;
        }
    }
    
    const firstLines = page1Lines.slice(0, 5).map(l => l.text.trim()).filter(t => t.length > 0);
    if (firstLines.length > 0 && !titlePage.title) {
        if (!/written by|screenplay by/i.test(firstLines[0])) {
            titlePage.title = firstLines[0];
            detectedTitle = firstLines[0];
        }
    }
  }

  // 3. DETECT DUAL DIALOGUE COLUMNS
  const detectDualDialogueBlocks = (lines: typeof allLines): Set<number> => {
    const dualLines = new Set<number>();
    
    for (let i = 0; i < lines.length - 1; i++) {
      const curr = lines[i];
      const next = lines[i + 1];
      
      // Same Y (or very close) = side-by-side
      if (Math.abs(curr.y - next.y) < 4 && curr.page === next.page) {
        // Check if X positions suggest two columns
        const xDiff = Math.abs(curr.x - next.x);
        if (xDiff > 150 && xDiff < 400) { // Typical dual dialogue spacing
          dualLines.add(i);
          dualLines.add(i + 1);
        }
      }
    }
    
    return dualLines;
  };
  
  const dualLineIndices = detectDualDialogueBlocks(allLines);

  // 4. CLASSIFY & MERGE ELEMENTS
  const elements: ScriptElement[] = [];
  let sequence = 1;
  let lastY = 0;
  let lastPage = 0;
  let dualColumn: 'left' | 'right' | undefined = undefined;

  allLines.forEach((line, index) => {
    // SKIP PAGE 1 if we detected a title page
    if (line.page < startPage) return;

    let text = line.text.trim();
    if (!text) return;
    
    const x = line.x;
    const y = line.y;
    const page = line.page;
    const offset = x - baseX;
    
    // Filter artifacts
    if (offset > 200 && /^[\d.]+$/.test(text)) return;
    if (/^\(MORE\)$/i.test(text)) return;
    if (/^\(CONT['']?D\)$/i.test(text)) return;
    
    let type: ScriptElement['type'] = 'action';
    const upper = text.toUpperCase();
    const isUppercase = text === upper && /[A-Z]/.test(text);
    
    // Determine if this line is part of dual dialogue
    const isDual = dualLineIndices.has(index);
    if (isDual) {
      const sibling = allLines.find((l, idx) => 
        idx !== index && 
        Math.abs(l.y - y) < 4 && 
        l.page === page && 
        dualLineIndices.has(idx)
      );
      
      if (sibling) {
        dualColumn = x < sibling.x ? 'left' : 'right';
      }
    } else {
      dualColumn = undefined;
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

    if (lastElement && lastElement.type === type && page === lastPage && !isDual) {
      const distance = lastY - y;
      const isConsecutive = distance > 0 && distance < 24;

      if (isConsecutive && type !== 'scene_heading' && type !== 'character') {
        const separator = (/[a-zA-Z0-9.,?!"]$/.test(lastElement.content) && /^[a-zA-Z0-9]/.test(text)) ? ' ' : ' ';
        lastElement.content += separator + text;
        merged = true;
      }
    }

    if (!merged) {
      const element: ScriptElement = {
        id: crypto.randomUUID(),
        type,
        content: text,
        sequence: sequence++
      };
      
      // PDF SPECIFIC: Detect and extract (CONT'D) from character names
      if (type === 'character') {
        const { character, isContinued } = parseCharacterName(text);
        element.content = character;
        if (isContinued) element.isContinued = true;
      }
      
      if (dualColumn) {
        element.dual = dualColumn;
      }
      
      elements.push(element);
    }

    lastY = y;
    lastPage = page;
  });

  return createValidatedResult(elements, titlePage, detectedTitle, options);
}
