
import { describe, it, expect } from 'vitest';
import { constructPrompt } from './gemini';
import { Shot, Project, Character, Outfit } from '../types';

// Mock Data
const mockProject: Project = {
    id: 'p1',
    name: 'Test Project',
    createdAt: Date.now(),
    lastModified: Date.now(),
    settings: {
        cinematicStyle: 'Film Noir',
        era: '1940s',
        lighting: 'Chiaroscuro',
        timeOfDay: 'Night',
        aspectRatio: '16:9',
        location: 'City'
    },
    scenes: [],
    shots: []
};

const mockShot: Shot = {
    id: 's1',
    sceneId: 'sc1',
    shotType: 'Medium Shot',
    description: 'A detective smoking a cigarette in the rain.',
    sequence: 1,
    notes: '',
    characterIds: []
};

const mockCharacter: Character = {
    id: 'c1',
    name: 'Detective Jack',
    description: 'A weary private investigator with a trench coat.',
    referencePhotos: []
};

const mockOutfit: Outfit = {
    id: 'o1',
    characterId: 'c1',
    name: 'Detective Outfit',
    description: 'Fedora and trench coat',
    referencePhotos: []
};

describe('Image Prompt Logic Diagnostic', () => {
    it('should generate a basic prompt with defaults', () => {
        const prompt = constructPrompt(mockShot, mockProject, [], [], '16:9');
        console.log('\n--- Basic Prompt ---\n', prompt);
        expect(prompt).toContain('Cinematic movie frame.');
        expect(prompt).toContain('Visual Style: Film Noir');
        expect(prompt).toContain('Time Period/Era: 1940s');
        expect(prompt).toContain('Lighting Setup: Chiaroscuro');
        expect(prompt).toContain('Time of Day: Night');
        expect(prompt).toContain('Medium Shot: Frame subject from waist up');
        expect(prompt).toContain('ACTION/SUBJECT: A detective smoking a cigarette in the rain.');
        expect(prompt).toContain('16:9');
    });

    it('should handle style strength correctly', () => {
        const shots = [0, 25, 50, 75, 100].map(strength => ({ ...mockShot, styleStrength: strength }));

        console.log('\n--- Style Strength Variations ---');
        shots.forEach(s => {
            const prompt = constructPrompt(s, mockProject, [], [], '16:9');
            console.log(`Strength ${s.styleStrength}:`, prompt.match(/Visual Style:.*?\./)?.[0]);
        });
    });

    it('should enforce aspect ratios strictly', () => {
        const ratios = ['16:9', '2.35:1', '9:16', '1:1'];
        console.log('\n--- Aspect Ratio Enforcement ---');
        ratios.forEach(ratio => {
            const prompt = constructPrompt(mockShot, mockProject, [], [], ratio);
            expect(prompt).toContain(`CRITICAL ASPECT RATIO ENFORCEMENT: Generate image in STRICT ${ratio}`);
            console.log(`Ratio ${ratio}: Verified`);
        });
    });

    it('should include character details and positioning', () => {
        const prompt = constructPrompt(mockShot, mockProject, [mockCharacter], [mockOutfit], '16:9');
        console.log('\n--- Character Prompt ---\n', prompt);
        expect(prompt).toContain('CHARACTERS:');
        expect(prompt).toContain('Detective Jack');
        expect(prompt).toContain('wearing Fedora and trench coat');
        expect(prompt).toContain('Position character in the center of the frame');
    });

    it('should handle multiple characters positioning', () => {
        const char2 = { ...mockCharacter, id: 'c2', name: 'Femme Fatale' };
        const prompt = constructPrompt(mockShot, mockProject, [mockCharacter, char2], [mockOutfit], '16:9');
        console.log('\n--- Two Characters Prompt ---\n', prompt);
        expect(prompt).toContain('Position characters with balanced spacing across the frame (left and right)');
    });

    it('should include negative prompts', () => {
        const shotWithNegative = { ...mockShot, negativePrompt: 'blur, distortion' };
        const prompt = constructPrompt(shotWithNegative, mockProject, [], [], '16:9');
        console.log('\n--- Negative Prompt ---\n', prompt);
        expect(prompt).toContain('NEGATIVE PROMPT:');
        expect(prompt).toContain('blur, distortion');
    });

    it('should handle sketch reference', () => {
        const shotWithSketch = { ...mockShot, sketchImage: 'data:image/png;base64,fake' };
        const prompt = constructPrompt(shotWithSketch, mockProject, [], [], '16:9');
        console.log('\n--- Sketch Prompt ---\n', prompt);
        expect(prompt).toContain('SKETCH COMPOSITION REFERENCE');
    });

    it('should handle reference image control types', () => {
        const shotCanny = { ...mockShot, referenceImage: 'data:image/png;base64,fake', controlType: 'canny' as const };
        const promptCanny = constructPrompt(shotCanny, mockProject, [], [], '16:9');
        console.log('\n--- Canny Reference Prompt ---\n', promptCanny);
        expect(promptCanny).toContain('Canny edge map guide');

        const shotDepth = { ...mockShot, referenceImage: 'data:image/png;base64,fake', controlType: 'depth' as const };
        const promptDepth = constructPrompt(shotDepth, mockProject, [], [], '16:9');
        expect(promptDepth).toContain('structural depth map guide');
    });
});
