/*
 * 📜 SERVICE: SCRIPT PARSER
 * 
 * This file reads screenplay files (specifically .fountain format).
 * It turns text like "INT. HOUSE - DAY" into structured Scene data
 * that the app can understand and turn into shots.
 */

import { Scene, ScriptElement } from '../types';

export interface ParsedScript {
  scenes: Scene[];
  elements: ScriptElement[];
  metadata: {
    title?: string;
    author?: string;
  };
}

// Main entry point for FILES
export async function parseScript(file: File): Promise<ParsedScript> {
  const text = await file.text();
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.fountain') || filename.endsWith('.txt')) {
    return parseFountainString(text);
  } else {
    throw new Error(`Unsupported format: ${filename}. Only .fountain and .txt are currently supported.`);
  }
}

// Helper: Determine if a line is a scene heading
const isSceneHeading = (line: string): boolean => {
  const s = line.trim().toUpperCase();
  return /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|INT\/EXT)(\s+|$)/.test(s) || s.startsWith('.');
};

// Helper: Determine if a line is a character name
const isCharacter = (line: string): boolean => {
  const s = line.trim();
  // Must be all caps, not empty, not a scene heading, and usually centered in PDFs but here just check caps
  // In Fountain, character names are uppercase and precede dialogue
  return s.length > 0 && s === s.toUpperCase() && !isSceneHeading(s) && !s.endsWith('TO:');
};

// Helper: Determine if a line is a transition
const isTransition = (line: string): boolean => {
  const s = line.trim().toUpperCase();
  return s.endsWith('TO:') || s.startsWith('>');
};

// 🖋️ FOUNTAIN PARSER IMPLEMENTATION (Now Exported!)
export function parseFountainString(text: string): ParsedScript {
  const lines = text.split(/\r?\n/);
  const elements: ScriptElement[] = [];
  const scenes: Scene[] = [];

  let currentScene: Scene | null = null;
  let elementSequence = 1;
  let sceneSequence = 1;
  let lastLineWasBlank = true;

  // Metadata
  const metadata: any = {};

  // Parsing Loop
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip initial blank lines but track them
    if (!line) {
      lastLineWasBlank = true;
      continue;
    }

    // Metadata Key-Value pairs at start of file
    if (elementSequence === 1 && line.includes(':') && !isSceneHeading(line) && !isCharacter(line)) {
      const [key, val] = line.split(':').map(s => s.trim());
      if (key && val) {
        metadata[key.toLowerCase()] = val;
        continue;
      }
    }

    // 1. SCENE HEADING
    if (isSceneHeading(line)) {
      const newScene: Scene = {
        id: crypto.randomUUID(),
        sequence: sceneSequence++,
        heading: line.startsWith('.') ? line.substring(1).toUpperCase() : line.toUpperCase(),
        actionNotes: '',
        scriptElements: []
      };
      scenes.push(newScene);
      currentScene = newScene;

      const el: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'scene_heading',
        content: newScene.heading,
        sceneId: newScene.id,
        sequence: elementSequence++
      };
      elements.push(el);
      lastLineWasBlank = false;
      continue;
    }

    // 2. TRANSITIONS
    if (isTransition(line)) {
      const el: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'transition',
        content: line.startsWith('>') ? line.substring(1).trim() : line,
        sceneId: currentScene?.id,
        sequence: elementSequence++
      };
      elements.push(el);
      lastLineWasBlank = false;
      continue;
    }

    // 3. CHARACTER & DIALOGUE (Grouped)
    // If line is uppercase and previous line was blank, it's likely a character
    if (lastLineWasBlank && isCharacter(line)) {
      const characterName = line.replace(/\s*\(CONT'D\)$/, '');

      // Look ahead for dialogue
      let dialogueContent = '';
      let j = i + 1;

      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) break; // End of dialogue block

        // If we hit another character or scene heading, stop
        if (isCharacter(nextLine) || isSceneHeading(nextLine)) break;

        dialogueContent += (dialogueContent ? '\n' : '') + nextLine;
        j++;
      }

      // Advance main loop index
      i = j - 1;

      if (dialogueContent) {
        const el: ScriptElement = {
          id: crypto.randomUUID(),
          type: 'dialogue',
          content: dialogueContent,
          character: characterName,
          sceneId: currentScene?.id,
          sequence: elementSequence++
        };
        elements.push(el);
      }

      lastLineWasBlank = false;
      continue;
    }

    // 4. ACTION (Grouped by Block)
    let actionContent = line;
    let k = i + 1;

    while (k < lines.length) {
      const nextLine = lines[k].trim();
      if (!nextLine) break; // Blank line ends the block
      if (isSceneHeading(nextLine) || isCharacter(nextLine) || isTransition(nextLine)) break;

      actionContent += '\n' + nextLine;
      k++;
    }

    i = k - 1;

    const el: ScriptElement = {
      id: crypto.randomUUID(),
      type: 'action',
      content: actionContent,
      sceneId: currentScene?.id,
      sequence: elementSequence++
    };
    elements.push(el);

    if (currentScene) {
      currentScene.actionNotes += (currentScene.actionNotes ? '\n\n' : '') + actionContent;
    }

    lastLineWasBlank = false;
  }

  return {
    scenes,
    elements,
    metadata
  };
}