/*
 * 🛠️ SERVICE: SCRIPT UTILS
 * Handles the logic for converting flat script text into structured Scenes.
 */

import { Project, Scene, ScriptElement } from '../types';

/**
 * INTELLIGENT SCRIPT COMPILER
 * Scans the script top-to-bottom and links dialogue to the active character.
 */
export const enrichScriptElements = (elements: ScriptElement[]): ScriptElement[] => {
  let activeCharacterName = '';

  return elements.map(el => {
    // 1. Found a Character Header? Update active character.
    if (el.type === 'character') {
      activeCharacterName = el.content.trim();
      return el;
    }

    // 2. Found Dialogue or Parenthetical? Link it to the active character.
    if (el.type === 'dialogue' || el.type === 'parenthetical') {
      // Only link if we actually have a character context (skips orphaned dialogue at start)
      if (activeCharacterName) {
        return { ...el, character: activeCharacterName };
      }
    }

    // 3. Found a Scene Heading or Action? Reset active character.
    // (Characters don't usually speak across scene headers or long action blocks without being re-stated)
    if (el.type === 'scene_heading') {
      activeCharacterName = '';
    }

    return el;
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

  // STEP 0: ENRICH (Link Characters to Dialogue)
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