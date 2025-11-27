/*
 * 🛠️ SERVICE: SCRIPT UTILS
 * Handles the logic for converting flat script text into structured Scenes.
 */

import { Project, Scene, ScriptElement } from '../types';

/**
 * Re-analyzes the entire scriptElements array.
 * 1. Identifies Scene Headings.
 * 2. Creates/Updates Scene objects in project.scenes.
 * 3. Assigns the correct sceneId to every script element.
 * 4. Preserves existing Scene IDs to keep Shots linked.
 */
export const syncScriptToScenes = (project: Project): Project => {
  if (!project.scriptElements) return project;

  const newScenes: Scene[] = [];
  const updatedElements: ScriptElement[] = [];
  
  let currentScene: Scene | null = null;
  let sceneSequence = 1;

  // 1. Map existing scenes for quick lookup (to preserve IDs if strictly matching)
  // Actually, we rely on the element.sceneId if it exists.
  const existingScenesMap = new Map(project.scenes.map(s => [s.id, s]));

  for (let i = 0; i < project.scriptElements.length; i++) {
    const el = { ...project.scriptElements[i] };
    
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
      el.sceneId = sceneId;
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