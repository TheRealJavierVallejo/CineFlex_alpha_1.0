/*
 * 🛠️ SERVICE: SCRIPT UTILS
 * Handles the logic for converting flat script text into structured Scenes.
 */

import { Project, Scene, ScriptElement } from '../types';
import { FountainToken } from '../lib/fountain'; // IMPORTED

/**
 * BRIDGE: Converts Fountain Tokens to CineFlex ScriptElements
 */
export const convertFountainToElements = (tokens: FountainToken[]): ScriptElement[] => {
    const elements: ScriptElement[] = [];
    let sequence = 1;

    // Filter out irrelevant tokens (structural HTML helpers)
    const validTokens = tokens.filter(t => 
        !['dual_dialogue_begin', 'dual_dialogue_end', 'dialogue_begin', 'dialogue_end'].includes(t.type)
    );

    // Map Fountain Types to CineFlex Types
    const mapType = (ft: FountainToken['type']): ScriptElement['type'] => {
        switch (ft) {
            case 'scene_heading': return 'scene_heading';
            case 'character': return 'character';
            case 'parenthetical': return 'parenthetical';
            case 'dialogue': return 'dialogue';
            case 'transition': return 'transition';
            case 'action': 
            case 'centered': 
            case 'note':
                return 'action'; // Map miscellaneous text to Action for now
            default: return 'action';
        }
    };

    validTokens.forEach(token => {
        // Skip empty text unless it's a page break or something specific
        if (!token.text && token.type !== 'page_break') return;

        // Clean text (remove HTML comments from notes if present, though parser handles some)
        let content = token.text || '';
        
        elements.push({
            id: crypto.randomUUID(),
            type: mapType(token.type),
            content: content,
            sequence: sequence++,
            // sceneId will be assigned by syncScriptToScenes later
            // associatedShotIds are empty for new imports
        });
    });

    return elements;
};

/**
 * REVERSE BRIDGE: Converts ScriptElements back to Fountain Text
 * Used for "Auto-Format" feature and Exports
 */
export const generateFountainText = (elements: ScriptElement[]): string => {
    let output = '';
    
    elements.forEach((el, index) => {
        const prev = elements[index - 1];
        
        // Add spacing rules based on types
        if (el.type === 'scene_heading') {
            output += `\n\n${el.content.toUpperCase()}\n`;
        } else if (el.type === 'action') {
            output += `\n${el.content}\n`;
        } else if (el.type === 'character') {
            output += `\n${el.content.toUpperCase()}\n`;
        } else if (el.type === 'dialogue') {
            output += `${el.content}\n`;
        } else if (el.type === 'parenthetical') {
            output += `${el.content}\n`;
        } else if (el.type === 'transition') {
            output += `\n${el.content.toUpperCase()}\n`;
        } else {
            output += `\n${el.content}\n`;
        }
    });

    return output.trim();
};

/**
 * INTELLIGENT SCRIPT COMPILER
 * Scans the script top-to-bottom and links dialogue to the active character.
 * NOW WITH SANITIZATION: Removes stale character tags from non-dialogue elements.
 */
export const enrichScriptElements = (elements: ScriptElement[]): ScriptElement[] => {
  let activeCharacterName = '';

  return elements.map(el => {
    // 1. Create a clean copy to ensure no stale properties (like 'character' on an Action line) persist
    const cleanEl: ScriptElement = {
        id: el.id,
        type: el.type,
        content: el.content,
        sequence: el.sequence,
        sceneId: el.sceneId,
        associatedShotIds: el.associatedShotIds
    };

    // 2. Found a Character Header? Update active character.
    if (cleanEl.type === 'character') {
      activeCharacterName = cleanEl.content.trim();
      return cleanEl;
    }

    // 3. Found Dialogue or Parenthetical? Link it to the active character.
    if (cleanEl.type === 'dialogue' || cleanEl.type === 'parenthetical') {
      // Only link if we actually have a character context (skips orphaned dialogue at start)
      if (activeCharacterName) {
        cleanEl.character = activeCharacterName;
      }
      return cleanEl;
    }

    // 4. Found a Scene Heading, Action, or Transition? 
    // Reset active character context.
    activeCharacterName = '';
    return cleanEl;
  });
};

/**
 * Re-analyzes the entire scriptElements array.
 * 1. Identifies Scene Headings.
 * 2. Creates/Updates Scene objects in project.scenes.
 * 3. Assigns the correct sceneId to every script element.
 * 4. Preserves existing Scene IDs to keep Shots linked.
 */
export const syncScriptToScenes = (project: Project): Project => {
  if (!project.scriptElements) return project;

  // STEP 0: ENRICH (Link Characters to Dialogue & Sanitize)
  const enrichedElements = enrichScriptElements(project.scriptElements);

  const newScenes: Scene[] = [];
  const updatedElements: ScriptElement[] = [];
  
  let currentScene: Scene | null = null;
  let sceneSequence = 1;

  // 1. Map existing scenes for quick lookup (to preserve IDs if strictly matching)
  const existingScenesMap = new Map(project.scenes.map(s => [s.id, s]));

  for (let i = 0; i < enrichedElements.length; i++) {
    const el = { ...enrichedElements[i] };
    
    // CASE A: NEW SCENE HEADING
    if (el.type === 'scene_heading') {
      let sceneId = el.sceneId;

      // If this heading doesn't point to a valid existing scene, create a new one
      if (!sceneId || !existingScenesMap.has(sceneId)) {
         // Reuse ID if valid, else new
         sceneId = sceneId || crypto.randomUUID(); 
      }

      // Create/Update the Scene Object
      // We assume the heading text is the source of truth
      const sceneObj: Scene = {
        id: sceneId,
        sequence: sceneSequence++,
        heading: el.content.toUpperCase(),
        actionNotes: '', // Will populate below
        scriptElements: [] // Will populate below
      };

      currentScene = sceneObj;
      newScenes.push(sceneObj);
      
      // Update the element to link to this scene
      el.sceneId = sceneId;
    } 
    // CASE B: CONTENT WITHIN SCENE
    else if (currentScene) {
      el.sceneId = currentScene.id;
      
      // Append Action to scene notes for quick view
      if (el.type === 'action') {
        currentScene.actionNotes += (currentScene.actionNotes ? '\n' : '') + el.content;
      }
    } 
    // CASE C: ORPHANED CONTENT (Before first heading)
    else {
      // Create a default "Start" scene if none exists
      if (!currentScene) {
          const sceneId = crypto.randomUUID();
          const sceneObj: Scene = {
             id: sceneId,
             sequence: sceneSequence++,
             heading: 'START OF SCRIPT',
             actionNotes: '',
             scriptElements: []
          };
          currentScene = sceneObj;
          newScenes.push(sceneObj);
      }
      el.sceneId = currentScene.id;
    }

    updatedElements.push(el);
  }

  return {
    ...project,
    scenes: newScenes,
    scriptElements: updatedElements,
    lastModified: Date.now()
  };
};

/**
 * REVERSE SYNC: Generates a basic script from Scene data.
 * Used when the user creates scenes manually in the Timeline but hasn't written a script.
 */
export const generateScriptFromScenes = (scenes: Scene[]): ScriptElement[] => {
    const elements: ScriptElement[] = [];
    let seq = 1;

    // Sort by sequence to ensure script order matches timeline order
    const sortedScenes = [...scenes].sort((a, b) => a.sequence - b.sequence);

    sortedScenes.forEach(scene => {
        // 1. Create Scene Heading
        elements.push({
            id: crypto.randomUUID(),
            type: 'scene_heading',
            content: scene.heading || 'INT. UNTITLED SCENE - DAY',
            sceneId: scene.id,
            sequence: seq++
        });

        // 2. Create Action Line if notes exist
        if (scene.actionNotes && scene.actionNotes.trim()) {
            elements.push({
                id: crypto.randomUUID(),
                type: 'action',
                content: scene.actionNotes,
                sceneId: scene.id,
                sequence: seq++
            });
        }
        
        // 3. Keep existing elements if they are stored on the scene (fallback)
        if (scene.scriptElements && scene.scriptElements.length > 0) {
            scene.scriptElements.forEach(el => {
                // Avoid duplicating the heading if it was stored
                if (el.type !== 'scene_heading') {
                    elements.push({
                        ...el,
                        id: crypto.randomUUID(), // New IDs to avoid conflicts
                        sceneId: scene.id,
                        sequence: seq++
                    });
                }
            });
        }
    });

    return elements;
};