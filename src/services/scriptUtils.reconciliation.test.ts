import { describe, it, expect } from 'vitest';
import { syncScriptToScenes } from './scriptUtils';
import { Project, ScriptElement, Scene } from '../types';

describe('syncScriptToScenes Reconciliation', () => {
    const createProject = (elements: ScriptElement[] = [], scenes: Scene[] = []): Project => ({
        id: 'test-project',
        name: 'Test Project',
        settings: {
            era: '',
            lighting: '',
            cinematicStyle: '',
            aspectRatio: '16:9',
        },
        scenes,
        shots: [],
        createdAt: Date.now(),
        lastModified: Date.now(),
        scriptElements: elements,
    });

    it('should preserve scene IDs when re-syncing the same script', () => {
        const elements: ScriptElement[] = [
            { id: '1', type: 'scene_heading', content: 'INT. KITCHEN - DAY', sequence: 1 },
            { id: '2', type: 'action', content: 'Cooking food.', sequence: 2 },
        ];

        // Initial sync
        const p1 = createProject(elements);
        const p2 = syncScriptToScenes(p1);
        const sceneId = p2.scenes[0].id;

        // Second sync with same elements
        const p3 = syncScriptToScenes(p2);
        expect(p3.scenes[0].id).toBe(sceneId);
        expect(p3.scenes.length).toBe(1);
    });

    it('should NOT change scene ID when adding action text within a scene', () => {
        const p1 = syncScriptToScenes(createProject([
            { id: '1', type: 'scene_heading', content: 'INT. KITCHEN - DAY', sequence: 1 },
        ]));
        const sceneId = p1.scenes[0].id;

        const p2 = {
            ...p1,
            scriptElements: [
                ...p1.scriptElements!,
                { id: '2', type: 'action', content: 'More action.', sequence: 2 }
            ]
        };
        const p3 = syncScriptToScenes(p2);

        expect(p3.scenes[0].id).toBe(sceneId);
        expect(p3.scenes[0].actionNotes).toContain('More action');
    });

    it('should preserve IDs of surrounding scenes when inserting a new scene', () => {
        const p1 = syncScriptToScenes(createProject([
            { id: '1', type: 'scene_heading', content: 'SCENE A', sequence: 1 },
            { id: '2', type: 'scene_heading', content: 'SCENE B', sequence: 2 },
        ]));
        const idA = p1.scenes[0].id;
        const idB = p1.scenes[1].id;

        const p2 = {
            ...p1,
            scriptElements: [
                { id: '1', type: 'scene_heading', content: 'SCENE A', sequence: 1 },
                { id: '3', type: 'scene_heading', content: 'SCENE NEW', sequence: 2 },
                { id: '2', type: 'scene_heading', content: 'SCENE B', sequence: 3 },
            ]
        };
        const p3 = syncScriptToScenes(p2);

        expect(p3.scenes.length).toBe(3);
        expect(p3.scenes[0].id).toBe(idA);
        expect(p3.scenes[2].id).toBe(idB);
        expect(p3.scenes[1].heading).toBe('SCENE NEW');
    });

    it('should preserve metadata like locationId during re-sync', () => {
        const p1 = syncScriptToScenes(createProject([
            { id: '1', type: 'scene_heading', content: 'INT. KITCHEN - DAY', sequence: 1 },
        ]));

        // Manually add metadata
        p1.scenes[0].locationId = 'loc-123';
        p1.scenes[0].metadata = { notes: 'Use a real stove' };

        const p2 = syncScriptToScenes(p1);
        expect(p2.scenes[0].locationId).toBe('loc-123');
        expect(p2.scenes[0].metadata?.notes).toBe('Use a real stove');
    });

    it('should distinguish between multiple occurrences of the same heading', () => {
        const p1 = syncScriptToScenes(createProject([
            { id: '1', type: 'scene_heading', content: 'INT. HALLWAY - NIGHT', sequence: 1 },
            { id: '2', type: 'scene_heading', content: 'INT. HALLWAY - NIGHT', sequence: 2 },
        ]));
        const id1 = p1.scenes[0].id;
        const id2 = p1.scenes[1].id;
        expect(id1).not.toBe(id2);

        const p2 = syncScriptToScenes(p1);
        expect(p2.scenes[0].id).toBe(id1);
        expect(p2.scenes[1].id).toBe(id2);
    });
});
