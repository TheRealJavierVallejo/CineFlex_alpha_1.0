import { generateShotImage } from './gemini'; // The Pro Engine
import { Shot, Project, Character, Outfit, Location } from '../types';
// IMPORT THE NEW ENHANCER
import { enhancePromptForFreeTier } from './promptBuilder';

/**
 * THE HYBRID ENGINE
 * Routes requests based on user tier.
 */
export const generateHybridImage = async (
    tier: 'free' | 'pro',
    shot: Shot,
    project: Project,
    characters: Character[],
    outfits: Outfit[],
    location: Location | undefined,
    options: { model: string; aspectRatio: string; imageSize?: string }
): Promise<string> => {

    // 1. PRO TIER: Use the high-end Gemini API (Cost: Credits or BYOK)
    if (tier === 'pro') {
        return await generateShotImage(shot, project, characters, outfits, location, options);
    }

    // 2. FREE TIER: Pure Text-to-Image (Pollinations.ai)
    
    // A. Aspect Ratio Logic
    let width = 1280;
    let height = 720;
    
    if (options.aspectRatio) {
        const parts = options.aspectRatio.split(':').map(Number);
        const wRatio = parts[0];
        const hRatio = parts.length > 1 ? parts[1] : 1;

        if (!isNaN(wRatio) && !isNaN(hRatio)) {
            const targetPixels = 1000000; 
            const scale = Math.sqrt(targetPixels / (wRatio * hRatio));
            width = Math.round(wRatio * scale);
            height = Math.round(hRatio * scale);
        }
    }

    // B. Construct Prompt using the Smart Enhancer
    // This replaces the old simple logic with the context-aware builder
    const fullPrompt = enhancePromptForFreeTier(shot, project, characters, outfits, location);
    
    // Append negative prompt if exists
    const negativeParam = shot.negativePrompt ? `&negative=${encodeURIComponent(shot.negativePrompt)}` : "";
    
    // C. Add randomness
    const seed = Math.floor(Math.random() * 1000000);
    
    // D. Construct URL
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux${negativeParam}`;

    return url;
};