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
        !['dual_dialogue_begin', 'dual_dialogue_end', 'dialogue_begin', 'dialogue_end', 'boneyard_begin', 'boneyard_end'].includes(t.type)
    );

    // Map Fountain Types to CineFlex Types
    const mapType = (ft: FountainToken['type']): ScriptElement['type'] => {
        switch (ft) {
            case 'scene_heading': return 'scene_heading';
            case 'character': return 'character';
            case 'parenthetical': return 'parenthetical';
            case 'dialogue': return 'dialogue';
            case 'transition': return 'transition';
            // Map everything else to action to preserve it in the editor
            default: return 'action';
        }
    };

    validTokens.forEach(token => {
        // Skip empty text unless it's a page break
        if (!token.text && token.type !== 'page_break') return;

        let content = token.text || '';
        let type = mapType(token.type);

        // PRESERVE SPECIAL FORMATTING
        // Since our Editor doesn't have dedicated 'note' or 'centered' blocks yet,
        // we encode them into the text so they aren't lost and can be re-parsed.
        
        if (token.type === 'note') {
            content = `[[${content}]]`;
            type = 'action'; // Render as action, but visually distinct via brackets
        } 
        else if (token.type === 'centered') {
            content = `> ${content} <`;
            type = 'action';
        }
        else if (token.type === 'section') {
            const depth = token.depth || 1;
            content = `${'#'.repeat(depth)} ${content}`;
            type = 'action';
        }
        else if (token.type === 'synopsis') {
            content = `= ${content}`;
            type = 'action';
        }

        elements.push({
            id: crypto.randomUUID(),
            type: type,
            content: content,
            sequence: sequence++,
            // sceneId will be assigned by syncScriptToScenes later
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
        // Add spacing rules based on types
        if (el.type === 'scene_heading') {
            // Always 2 newlines before a scene heading
            output += `\n\n${el.content.toUpperCase()}\n`;
        } else if (el.type === 'action') {
            // Action gets a newline before
            output += `\n${el.content}\n`;
        } else if (el.type === 'character') {
            // Character gets a newline before
            output += `\n${el.content.toUpperCase()}\n`;
        } else if (el.type === 'dialogue') {
            // Dialogue follows immediately (no extra newline)
            output += `${el.content}\n`;
        } else if (el.type === 'parenthetical') {
            // Parenthetical follows immediately
            output += `${el.content}\n`;
        } else if (el.type === 'transition') {
            // Transitions usually get a newline before and align right (in formatting), 
            // but in raw text they just need separation.
            output += `\n${el.content.toUpperCase()}\n`;
        } else {
            // Fallback
            output += `\n${el.content}\n`;
        }
    });

    return output.trim();
};

/**
 * INTELLIGENT SCRIPT COMPILER
 * Scans the script top-to-bottom and links dialogue to the active character.
 */
export const enrichScriptElements = (elements: ScriptElement[]): ScriptElement[] => {
  let activeCharacterName = '';

  return elements.map(el => {
    const cleanEl: ScriptElement = {
        id: el.id,
        type: el.type,
        content: el.content,
        sequence: el.sequence,
        sceneId: el.sceneId,
        associatedShotIds: el.associatedShotIds
    };

    if (cleanEl.type === 'character') {
      // Clean up carat for dual dialogue if present
      activeCharacterName = cleanEl.content.replace(/\^$/, '').trim();
      return cleanEl;
    }

    if (cleanEl.type === 'dialogue' || cleanEl.type === 'parenthetical') {
      if (activeCharacterName) {
        cleanEl.character = activeCharacterName;
      }
      return cleanEl;
    }

    activeCharacterName = '';
    return cleanEl;
  });
};

/**
 * Re-analyzes the entire scriptElements array.
 * Syncs Scene objects with the text.
 */
export const syncScriptToScenes = (project: Project): Project => {
  if (!project.scriptElements) return project;

  const enrichedElements = enrichScriptElements(project.scriptElements);

  const newScenes: Scene[] = [];
  const updatedElements: ScriptElement[] = [];
  
  let currentScene: Scene | null = null;
  let sceneSequence = 1;

  const existingScenesMap = new Map(project.scenes.map(s => [s.id, s]));

  for (let i = 0; i < enrichedElements.length; i++) {
    const el = { ...enrichedElements[i] };
    
    // CASE A: NEW SCENE HEADING
    if (el.type === 'scene_heading') {
      let sceneId = el.sceneId;

      if (!sceneId || !existingScenesMap.has(sceneId)) {
         sceneId = sceneId || crypto.randomUUID(); 
      }

      const sceneObj: Scene = {
        id: sceneId,
        sequence: sceneSequence++,
        heading: el.content.toUpperCase(),
        actionNotes: '', 
        scriptElements: [] 
      };

      currentScene = sceneObj;
      newScenes.push(sceneObj);
      
      el.sceneId = sceneId;
    } 
    // CASE B: CONTENT WITHIN SCENE
    else if (currentScene) {
      el.sceneId = currentScene.id;
      
      if (el.type === 'action') {
        currentScene.actionNotes += (currentScene.actionNotes ? '\n' : '') + el.content;
      }
    } 
    // CASE C: ORPHANED CONTENT
    else {
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

export const generateScriptFromScenes = (scenes: Scene[]): ScriptElement[] => {
    const elements: ScriptElement[] = [];
    let seq = 1;
    const sortedScenes = [...scenes].sort((a, b) => a.sequence - b.sequence);

    sortedScenes.forEach(scene => {
        elements.push({
            id: crypto.randomUUID(),
            type: 'scene_heading',
            content: scene.heading || 'INT. UNTITLED SCENE - DAY',
            sceneId: scene.id,
            sequence: seq++
        });

        if (scene.actionNotes && scene.actionNotes.trim()) {
            elements.push({
                id: crypto.randomUUID(),
                type: 'action',
                content: scene.actionNotes,
                sceneId: scene.id,
                sequence: seq++
            });
        }
        
        if (scene.scriptElements && scene.scriptElements.length > 0) {
            scene.scriptElements.forEach(el => {
                if (el.type !== 'scene_heading') {
                    elements.push({
                        ...el,
                        id: crypto.randomUUID(), 
                        sceneId: scene.id,
                        sequence: seq++
                    });
                }
            });
        }
    });

    return elements;
};