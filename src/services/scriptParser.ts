/*
 * 📜 SERVICE: SCRIPT PARSER
 * 
 * This file reads screenplay files (specifically .fountain format).
 * It turns text like "INT. HOUSE - DAY" into structured Scene data
 * that the app can understand and turn into shots.
 */

import { Scene, ScriptElement } from '../types';
import { parseFountain as parseFountainLib } from '../lib/fountain';
import { convertFountainToElements } from './scriptUtils';

export interface ParsedScript {
  scenes: Scene[];
  elements: ScriptElement[];
  metadata: {
    title?: string;
    author?: string;
  };
}

// Main entry point
export async function parseScript(file: File): Promise<ParsedScript> {
  const text = await file.text();
  const filename = file.name.toLowerCase();

  // We treat .txt as fountain for flexibility
  if (filename.endsWith('.fountain') || filename.endsWith('.txt')) {
    return parseFountain(text);
  } else {
    throw new Error(`Unsupported format: ${filename}. Only .fountain and .txt are currently supported.`);
  }
}

// 🖋️ FOUNTAIN PARSER IMPLEMENTATION (Now powered by Fountain.js)
function parseFountain(text: string): ParsedScript {
  // 1. Run the heavy lifting via the library
  // IMPORTANT: Pass 'true' for raw mode to avoid HTML tags (<br/>, <span>) in the output text
  const output = parseFountainLib(text, true);

  // 2. Convert tokens to CineFlex elements
  const elements = convertFountainToElements(output.tokens);

  // 3. Metadata Extraction (The library provides 'title', but we might want more)
  // Fountain.js puts raw key-values in title_page array but also gives us a title property.
  const metadata: ParsedScript['metadata'] = {
      title: output.title || 'Untitled Script'
  };

  // 4. Note on Scenes: 
  // We return empty scenes here because the 'syncScriptToScenes' utility in 'WorkspaceLayout'
  // is responsible for generating the Scene objects based on the elements we just parsed.
  // This keeps the source of truth in one place (the elements list).
  
  return {
    scenes: [], 
    elements,
    metadata
  };
}