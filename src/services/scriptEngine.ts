/*
 * 🧠 SERVICE: SCRIPT ENGINE (The Left Brain)
 * 
 * This service handles the ingestion of screenplay files (FDX/XML).
 * It parses the text, breaks it into "Atoms", and synchronizes it 
 * with the Visual Engine (Scenes/Shots).
 */

import { Project, ScriptDocument, ScriptAtom, ScriptAtomType, Scene, SyncStatus } from '../types';

// --- PARSING LOGIC (FDX / XML) ---

const parseFDX = (xmlContent: string): ScriptAtom[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
    const paragraphs = xmlDoc.getElementsByTagName("Paragraph");
    
    const atoms: ScriptAtom[] = [];
    let currentSceneId = "START"; // Placeholder until first slugline
    let globalSequence = 0;

    Array.from(paragraphs).forEach((p) => {
        const typeRaw = p.getAttribute("Type") || "General";
        const textRaw = p.textContent || "";
        
        // Clean text
        const text = textRaw.replace(/\s+/g, ' ').trim();
        if (!text) return;

        // Map FDX types to our internal types
        let type: ScriptAtomType = 'general';
        if (typeRaw === 'Scene Heading') type = 'slugline';
        else if (typeRaw === 'Action') type = 'action';
        else if (typeRaw === 'Character') type = 'character';
        else if (typeRaw === 'Dialogue') type = 'dialogue';
        else if (typeRaw === 'Parenthetical') type = 'parenthetical';
        else if (typeRaw === 'Transition') type = 'transition';

        // Generate ID (In a real app, we'd try to use stable IDs if FDX provided them, 
        // but for now we hash content + sequence to try and keep stability)
        const id = `atom_${globalSequence}_${text.substring(0, 10).replace(/\W/g, '')}`;

        if (type === 'slugline') {
            currentSceneId = id; // This slugline starts a new scene scope
        }

        atoms.push({
            id,
            type,
            text,
            sceneId: currentSceneId,
            sequence: globalSequence++
        });
    });

    return atoms;
};

// --- SYNC LOGIC (The Brain Link) ---

export interface SyncResult {
    project: Project;
    stats: {
        newScenes: number;
        updatedScenes: number;
        orphanedScenes: number;
    };
}

export const syncScriptToProject = (
    project: Project, 
    fileContent: string, 
    filename: string
): SyncResult => {
    
    // 1. Parse the new script
    // We assume FDX format for Scrite exports
    const newAtoms = parseFDX(fileContent);
    const now = Date.now();

    // 2. Update the Script Document (Left Brain)
    const updatedScript: ScriptDocument = {
        metadata: {
            title: filename.replace('.fdx', ''),
            author: project.script?.metadata.author || 'Unknown',
            sourceApp: 'scrite', // We assume input is from Scrite/FDX
            lastSync: now,
            version: (project.script?.metadata.version || 0) + 1
        },
        atoms: newAtoms
    };

    // 3. Reconcile with Visual Scenes (Right Brain)
    // We need to look at the "Slugline" atoms and ensure we have matching Visual Scenes.
    
    const newVisualScenes = [...project.scenes];
    let newScenesCount = 0;
    let updatedScenesCount = 0;
    
    // Group atoms by their sceneId (which is the ID of the slugline)
    const scriptScenes = new Map<string, ScriptAtom>(); // Map<SluglineID, Atom>
    
    newAtoms.forEach(atom => {
        if (atom.type === 'slugline') {
            scriptScenes.set(atom.id, atom);
        }
    });

    // A. Match existing Visual Scenes to Script Scenes
    // We try to match by exact Heading text first if ID link is missing
    newVisualScenes.forEach(vScene => {
        let match: ScriptAtom | undefined;

        // Try ID match
        if (vScene.scriptSceneId) {
            match = scriptScenes.get(vScene.scriptSceneId);
        }

        // Try Text match (Fallback)
        if (!match) {
            // Find a slugline with matching text
            for (const [id, atom] of scriptScenes) {
                if (atom.text.toUpperCase() === vScene.heading.toUpperCase()) {
                    match = atom;
                    break;
                }
            }
        }

        if (match) {
            // FOUND: Link them up
            if (vScene.scriptSceneId !== match.id) {
                vScene.scriptSceneId = match.id;
                updatedScenesCount++;
            }
            vScene.syncStatus = 'synced';
            
            // Remove from map so we don't double-process
            scriptScenes.delete(match.id);
        } else {
            // LOST: This visual scene no longer exists in the script
            // We flag it, but we NEVER auto-delete user work
            vScene.syncStatus = 'orphaned'; 
        }
    });

    // B. Create NEW Visual Scenes for remaining Script Scenes
    // Any slugline left in the map is new
    scriptScenes.forEach((slugAtom) => {
        newVisualScenes.push({
            id: crypto.randomUUID(),
            sequence: newVisualScenes.length + 1, // Append to end
            heading: slugAtom.text,
            actionNotes: '', // Will be filled by Showrunner later
            scriptSceneId: slugAtom.id,
            syncStatus: 'pending' // Pending AI Analysis
        });
        newScenesCount++;
    });

    // Re-sort scenes based on Script Sequence? 
    // For now, let's keep visual order unless explicitly requested, 
    // or we might mess up the user's storyboard flow.
    // Ideally, we'd sort based on the index of the slugAtom in newAtoms.

    const stats = {
        newScenes: newScenesCount,
        updatedScenes: updatedScenesCount,
        orphanedScenes: newVisualScenes.filter(s => s.syncStatus === 'orphaned').length
    };

    return {
        project: {
            ...project,
            script: updatedScript,
            scenes: newVisualScenes
        },
        stats
    };
};