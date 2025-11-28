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

// Main entry point
export async function parseScript(file: File): Promise<ParsedScript> {
  const text = await file.text();
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.fountain') || filename.endsWith('.txt')) {
    return parseFountain(text);
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

// Helper: Determine if a line is a parenthetical
const isParenthetical = (line: string): boolean => {
  const s = line.trim();
  return s.startsWith('(') && s.endsWith(')');
};

// 🖋️ FOUNTAIN PARSER IMPLEMENTATION
function parseFountain(text: string): ParsedScript {
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

    // 3. CHARACTER & DIALOGUE (Grouped logic, but split elements)
    if (lastLineWasBlank && isCharacter(line)) {
      const characterName = line.replace(/\s*\(CONT'D\)$/, '');

      // A. Create Character Element
      const charEl: ScriptElement = {
        id: crypto.randomUUID(),
        type: 'character',
        content: characterName,
        sceneId: currentScene?.id,
        sequence: elementSequence++
      };
      elements.push(charEl);

      // B. Look ahead for Dialogue / Parentheticals
      let j = i + 1;
      let currentDialogueBuffer = '';

      // Helper to flush dialogue buffer
      const flushDialogue = () => {
        if (currentDialogueBuffer) {
           elements.push({
             id: crypto.randomUUID(),
             type: 'dialogue',
             content: currentDialogueBuffer,
             character: characterName,
             sceneId: currentScene?.id,
             sequence: elementSequence++
           });
           currentDialogueBuffer = '';
        }
      };

      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
           // Blank line ends the dialogue block
           break; 
        }

        // If we hit another element type, stop
        if (isCharacter(nextLine) || isSceneHeading(nextLine) || isTransition(nextLine)) break;

        // Check for Parenthetical
        if (isParenthetical(nextLine)) {
           flushDialogue(); // Push previous dialogue first
           
           // Push Parenthetical
           elements.push({
              id: crypto.randomUUID(),
              type: 'parenthetical',
              content: nextLine.replace(/[()]/g, ''), // Store without parens for clean editing
              character: characterName,
              sceneId: currentScene?.id,
              sequence: elementSequence++
           });
        } else {
           // Accumulate Dialogue
           currentDialogueBuffer += (currentDialogueBuffer ? '\n' : '') + nextLine;
        }
        j++;
      }

      flushDialogue(); // Flush any remaining dialogue

      // Advance main loop index
      i = j - 1;
      lastLineWasBlank = false;
      continue;
    }

    // 4. ACTION (Grouped by Block)
    let actionContent = line;
    let k = i + 1;

    while (k < lines.length) {
      const nextLine = lines[k].trim();
      if (!nextLine) break; // Blank line ends the block

      // Check if next line is start of something else
      if (isSceneHeading(nextLine) || isCharacter(nextLine) || isTransition(nextLine)) break;

      actionContent += '\n' + nextLine;
      k++;
    }

    // Advance main loop index
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