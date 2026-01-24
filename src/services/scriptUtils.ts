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
    let isDualBlock = false; // State tracker for dual dialogue

    // We no longer filter upfront because we need structural tokens like 'dialogue_begin'
    // to determine state, even if we don't save them as elements.

    tokens.forEach(token => {
        // STATE TRACKING
        if (token.type === 'dialogue_begin' && token.dual) {
            isDualBlock = true;
        }
        if (token.type === 'dialogue_end' || token.type === 'dual_dialogue_end') {
            isDualBlock = false;
        }

        // Filter out structural tokens for the final list
        if (['dual_dialogue_begin', 'dual_dialogue_end', 'dialogue_begin', 'dialogue_end', 'boneyard_begin', 'boneyard_end'].includes(token.type)) {
            return;
        }

        // Skip empty text unless it's a page break
        if (!token.text && token.type !== 'page_break') return;

        let content = token.text || '';
        let type: ScriptElement['type'] = 'action';
        let dual = false;
        let sceneNumber: string | undefined = undefined;

        // Map Fountain Types to CineFlex Types
        switch (token.type) {
            case 'scene_heading':
                type = 'scene_heading';
                if (token.scene_number) {
                    sceneNumber = token.scene_number;
                }
                break;
            case 'character':
                type = 'character';
                // Apply dual flag if we are inside a dual block
                if (isDualBlock) dual = true;
                break;
            case 'parenthetical': type = 'parenthetical'; break;
            case 'dialogue': type = 'dialogue'; break;
            case 'transition': type = 'transition'; break;

            // PRESERVE SPECIAL FORMATTING (Mapped to Action)
            case 'note':
                content = `[[${content}]]`;
                type = 'action';
                break;
            case 'centered':
                content = `> ${content} <`;
                type = 'action';
                break;
            case 'section':
                const depth = token.depth || 1;
                content = `${'#'.repeat(depth)} ${content}`;
                type = 'action';
                break;
            case 'synopsis':
                content = `= ${content}`;
                type = 'action';
                break;
            default:
                type = 'action';
                break;
        }

        const element: ScriptElement = {
            id: crypto.randomUUID(),
            type: type,
            content: content,
            sequence: sequence++,
            // sceneId will be assigned by syncScriptToScenes later
        };

        // Only add 'dual' property if true (cleaner JSON)
        if (dual) element.dual = true;
        // Only add 'sceneNumber' if present
        if (sceneNumber) element.sceneNumber = sceneNumber;

        elements.push(element);
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
            output += `\n\n${el.content.toUpperCase()}`;
            // APPEND SCENE NUMBER
            if (el.sceneNumber) {
                output += ` #${el.sceneNumber}#`;
            }
            output += `\n`;
        } else if (el.type === 'action') {
            // Action gets a newline before
            output += `\n${el.content}\n`;
        } else if (el.type === 'character') {
            // Character gets a newline before
            // RESTORE DUAL CARET
            const content = el.content.toUpperCase() + (el.dual ? ' ^' : '');
            output += `\n${content}\n`;
        } else if (el.type === 'dialogue') {
            // Dialogue follows immediately (no extra newline)
            output += `${el.content}\n`;
        } else if (el.type === 'parenthetical') {
            // Parenthetical follows immediately
            output += `${el.content}\n`;
        } else if (el.type === 'transition') {
            // Transitions usually get a newline before
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
            associatedShotIds: el.associatedShotIds,
            dual: el.dual, // Preserve dual property
            sceneNumber: el.sceneNumber // Preserve scene number
        };

        if (cleanEl.type === 'character') {
            // Clean up caret for dual dialogue if present in raw text
            // (This handles manual typing of caret in editor)
            if (cleanEl.content.trim().endsWith('^')) {
                cleanEl.content = cleanEl.content.replace(/\^$/, '').trim();
                cleanEl.dual = true;
            }
            activeCharacterName = cleanEl.content;
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
 * Syncs Scene objects with the text with high stability.
 */
export const syncScriptToScenes = (project: Project): Project => {
    if (!project.scriptElements) return project;

    const enrichedElements = enrichScriptElements(project.scriptElements);
    const newScenes: Scene[] = [];
    const updatedElements: ScriptElement[] = [];

    let currentScene: Scene | null = null;
    let sceneSequence = 1;

    // --- RECONCILIATION STRATEGY ---
    // 1. Create a fingerprint map of existing scenes: "HEADING|OCCURRENCE"
    // This allows us to track "INT. KITCHEN - DAY (1st time)" vs (2nd time).
    const existingScenesByFingerprint = new Map<string, Scene>();
    const headingCounts: Record<string, number> = {};

    project.scenes.forEach(s => {
        const h = s.heading.toUpperCase();
        headingCounts[h] = (headingCounts[h] || 0) + 1;
        const fingerprint = `${h}|${headingCounts[h]}`;
        existingScenesByFingerprint.set(fingerprint, s);
    });

    // Reset counts for the new pass
    const newHeadingCounts: Record<string, number> = {};

    for (let i = 0; i < enrichedElements.length; i++) {
        const el = { ...enrichedElements[i] };

        // CASE A: NEW SCENE HEADING
        if (el.type === 'scene_heading') {
            const h = el.content.toUpperCase();
            newHeadingCounts[h] = (newHeadingCounts[h] || 0) + 1;
            const fingerprint = `${h}|${newHeadingCounts[h]}`;

            // Try to match with an existing scene
            const matchedScene = existingScenesByFingerprint.get(fingerprint);
            
            // Stable ID: reuse matched ID, or use element's sceneId, or generate new one
            const sceneId = matchedScene?.id || el.sceneId || crypto.randomUUID();

            const sceneObj: Scene = {
                id: sceneId,
                sequence: sceneSequence++,
                heading: h,
                actionNotes: '',
                scriptElements: [],
                // Preserve metadata if we matched an existing scene
                locationId: matchedScene?.locationId,
                metadata: matchedScene?.metadata,
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
        // CASE C: ORPHANED CONTENT (Start of script before first heading)
        else {
            const h = 'START OF SCRIPT';
            newHeadingCounts[h] = (newHeadingCounts[h] || 0) + 1;
            const fingerprint = `${h}|${newHeadingCounts[h]}`;
            
            const matchedScene = existingScenesByFingerprint.get(fingerprint);
            
            // Check if we already created a "START OF SCRIPT" scene in this pass
            if (!newScenes.length || newScenes[0].heading !== 'START OF SCRIPT') {
                const sceneId = matchedScene?.id || crypto.randomUUID();
                const sceneObj: Scene = {
                    id: sceneId,
                    sequence: sceneSequence++,
                    heading: h,
                    actionNotes: '',
                    scriptElements: [],
                    locationId: matchedScene?.locationId,
                    metadata: matchedScene?.metadata,
                };
                currentScene = sceneObj;
                newScenes.push(sceneObj);
            } else {
                currentScene = newScenes[0];
            }
            el.sceneId = currentScene.id;

            if (el.type === 'action') {
                currentScene.actionNotes += (currentScene.actionNotes ? '\n' : '') + el.content;
            }
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