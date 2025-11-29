import { generateShotImage } from './gemini'; // The Pro Engine
import { Shot, Project, Character, Outfit, Location } from '../types';
// IMPORT THE NEW ENHANCER
import { enhancePromptForFreeTier } from './promptBuilder';

/**
 * THE HYBRID ENGINE
 * Routes requests based on user tier AND selected model.
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

    // 1. DETERMINE EFFECTIVE MODEL
    // If user is FREE, they are FORCED to use 'pollinations'.
    // If user is PRO, they can use whatever is in options.model (Gemini OR Pollinations).
    const effectiveModel = tier === 'free' ? 'pollinations' : options.model;

    // 2. ROUTING LOGIC

    // --- CASE A: GEMINI (PRO) ---
    if (effectiveModel !== 'pollinations' && !effectiveModel.includes('Student')) {
        return await generateShotImage(shot, project, characters, outfits, location, options);
    }

    // --- CASE B: POLLINATIONS (BASE / FREE) ---
    
    // A. Aspect Ratio Logic (Calculate Integer Dimensions)
    let width = 1280;
    let height = 720;
    
    if (options.aspectRatio) {
        const parts = options.aspectRatio.split(':').map(Number);
        const wRatio = parts[0];
        const hRatio = parts.length > 1 ? parts[1] : 1;

        if (!isNaN(wRatio) && !isNaN(hRatio)) {
            // Target ~1MP for speed/reliability on free tier
            const targetPixels = 1000000; 
            const scale = Math.sqrt(targetPixels / (wRatio * hRatio));
            width = Math.floor(wRatio * scale);
            height = Math.floor(hRatio * scale);
        }
    }

    // B. Construct Prompt using the Smart Enhancer
    const fullPrompt = enhancePromptForFreeTier(shot, project, characters, outfits, location);
    
    // C. Safety Truncation (Pollinations URL limit safety)
    // URLs generally shouldn't exceed 2000 chars safely across all browsers/proxies.
    // We truncate the prompt to ~1000 chars to leave room for other params.
    const safePrompt = fullPrompt.slice(0, 1000);
    const encodedPrompt = encodeURIComponent(safePrompt);
    
    // D. Append negative prompt if exists
    const negativeParam = shot.negativePrompt 
        ? `&negative=${encodeURIComponent(shot.negativePrompt.slice(0, 200))}` 
        : "";
    
    // E. Add randomness (Seed)
    const seed = Math.floor(Math.random() * 1000000);
    
    // F. Construct URL
    // Using 'flux' model for better quality, or 'turbo' for speed. Flux is current standard.
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux${negativeParam}`;

    // G. Verify URL (Optional Pre-fetch check could go here, but for now we return the URL)
    return url;
};