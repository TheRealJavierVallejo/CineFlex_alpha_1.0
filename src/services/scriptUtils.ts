/**
 * 🛠️ UTILITY: SCRIPT UTILS (Phase 3 - Validation Aware)
 * 
 * Provides transformation logic between Fountain, ProseMirror/Slate, and Scenes.
 * 
 * Changes:
 * - Removed manual auto-correction from import (moved to scriptParser)
 * - Added support for Title Page extraction integration
 * - Improved robustness of Scene/Shot reconciliation
 */

import { Project, Scene, ScriptElement, Shot } from '../types';
import { ScriptModel } from './scriptModel';

/**
 * Converts Fountain tokens to our internal ScriptElement format.
 * No longer performs aggressive auto-fix; relies on scriptParser/autoFix.ts for that.
 */
export const convertFountainToElements = (tokens: any[]): ScriptElement[] => {
    let sequence = 1;

    return tokens
        .filter(t => t.type !== 'boneyard') // Ignore comments for now
        .map(t => {
            let type: ScriptElement['type'] = 'action';

            switch (t.type) {
                case 'scene_heading':
                    type = 'scene_heading';
                    break;
                case 'action':
                    // Basic heuristic: Uppercase with colon might be transition
                    if (t.text.match(/^[A-Z\s]+:$/)) {
                        type = 'transition';
                    } else {
                        type = 'action';
                    }
                    break;
                case 'character':
                    type = 'character';
                    break;
                case 'dialogue':
                    type = 'dialogue';
                    break;
                case 'parenthetical':
                    type = 'parenthetical';
                    break;
                case 'transition':
                    type = 'transition';
                    break;
                case 'centered':
                    type = 'action'; // Treat centered as action for now
                    break;
                default:
                    type = 'action';
            }

            // Fountain parser often keeps parentheses in text
            let content = t.text || '';
            if (type === 'parenthetical') {
                if (!content.startsWith('(')) content = `(${content})`;
            }

            // Handle dual dialogue flag from token
            const dual = t.dual ? t.dual : undefined;

            return {
                id: crypto.randomUUID(),
                type,
                content,
                sequence: sequence++,
                sceneNumber: t.scene_number || undefined,
                dual // Pass through dual dialogue flag
            };
        });
};

/**
 * RECONCILIATION ENGINE
 * Syncs the linear script (Source of Truth) to the hierarchical Scene/Shot model.
 * 
 * Logic:
 * 1. Scenes are defined by 'scene_heading' elements.
 * 2. Everything between two scene headings belongs to the first one.
 * 3. Existing shots are preserved if possible.
 * 4. New shots are generated for unassigned content.
 */
export const syncScriptToScenes = (project: Project): Project => {
    if (!project.scriptElements || project.scriptElements.length === 0) {
        return project;
    }

    const scriptModel = ScriptModel.create(project.scriptElements, project.titlePage, { strict: false });
    const validation = scriptModel.getValidationReport();
    
    // Log validation warnings but proceed (soft failure)
    if (!validation.valid) {
        console.warn('Syncing script with validation issues:', validation.summary);
    }

    const elements = project.scriptElements;
    const newScenes: Scene[] = [];
    let currentScene: Scene | null = null;
    let sceneSequence = 1;

    // Helper: Find existing scene by ID or Fuzzy Match
    // We prefer ID match (persistence), then Content match (if renamed/moved)
    const findExistingScene = (heading: string, existingScenes: Scene[]) => {
        // Try exact content match first to preserve IDs across imports if possible
        return existingScenes.find(s => s.heading === heading);
    };

    // 1. Group Elements into Scenes
    elements.forEach(el => {
        if (el.type === 'scene_heading') {
            // Start new scene
            const existing = findExistingScene(el.content, project.scenes);
            
            currentScene = {
                id: existing ? existing.id : crypto.randomUUID(),
                projectId: project.id,
                sequence: sceneSequence++,
                heading: el.content,
                actionNotes: [],
                shots: [], // Will populate later
                scriptElements: [el], // Contains itself + children
                locationId: existing?.locationId // Preserve location
            };
            newScenes.push(currentScene);
        } else {
            // Add to current scene (or create "orphan" scene if none exists)
            if (!currentScene) {
                currentScene = {
                    id: crypto.randomUUID(),
                    projectId: project.id,
                    sequence: sceneSequence++,
                    heading: 'UNNAMED SCENE',
                    actionNotes: [],
                    shots: [],
                    scriptElements: []
                };
                newScenes.push(currentScene);
            }
            currentScene.scriptElements.push(el);
        }
    });

    // 2. Reconcile Shots for Each Scene
    const allShots: Shot[] = [];
    
    newScenes.forEach(scene => {
        // Find existing shots for this scene ID
        const existingShots = project.shots.filter(s => s.sceneId === scene.id);
        
        // If we have existing shots, keep them! 
        // We only create new shots if the scene is BRAND NEW (no shots).
        // Future: Smart diffing to add shots for new script chunks.
        
        if (existingShots.length > 0) {
            allShots.push(...existingShots);
        } else {
            // Create default Master Shot for new scene
            const masterShot: Shot = {
                id: crypto.randomUUID(),
                sceneId: scene.id,
                sequence: 1,
                shotType: 'Master Shot',
                description: `Master covering: ${scene.heading}`,
                dialogue: '',
                characterIds: [],
                generationCandidates: [],
                aspectRatio: project.settings.aspectRatio
            };
            allShots.push(masterShot);
        }
    });

    return {
        ...project,
        scenes: newScenes,
        shots: allShots,
        lastModified: Date.now()
    };
};
