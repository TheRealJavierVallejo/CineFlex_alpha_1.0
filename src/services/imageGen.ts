import { generateShotImage } from './gemini'; // The Pro Engine
import { Shot, Project, Character, Outfit, Location } from '../types';
import { enhancePromptForFreeTier } from './promptBuilder';

/**
 * Helper: Fetch URL and convert to Base64 Data URI
 * This prevents "broken images" by ensuring we have the actual image data
 * before updating the UI.
 */
async function fetchPollinationsImage(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Generation failed (Server ${response.status})`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Validate result
            if (result && result.startsWith('data:image')) {
                resolve(result);
            } else {
                reject(new Error("Invalid image data received"));
            }
        };
        reader.onerror = () => reject(new Error("Failed to process image data"));
        reader.readAsDataURL(blob);
    });
}

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
    // If user is PRO, we trust their selection.
    const effectiveModel = tier === 'free' ? 'pollinations' : options.model;

    // 2. ROUTING LOGIC

    // --- CASE A: GEMINI (PRO) ---
    // Only use Gemini if explicitly requested AND not using the fallback "pollinations" ID
    if (effectiveModel !== 'pollinations' && !effectiveModel.includes('Student')) {
        return await generateShotImage(shot, project, characters, outfits, location, options);
    }

    // --- CASE B: POLLINATIONS (BASE / FREE) ---
    
    // A. Aspect Ratio Logic (Calculate Integer Dimensions - Multiples of 16 for Flux stability)
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
            
            // Round to nearest 16
            width = Math.round((wRatio * scale) / 16) * 16;
            height = Math.round((hRatio * scale) / 16) * 16;
        }
    }

    // B. Construct Prompt using the Smart Enhancer
    const fullPrompt = enhancePromptForFreeTier(shot, project, characters, outfits, location);
    
    // C. Safety Truncation (Pollinations URL limit safety)
    const safePrompt = fullPrompt.slice(0, 800); // reduced to 800 to be safe
    const encodedPrompt = encodeURIComponent(safePrompt);
    
    // D. Append negative prompt
    const negativeParam = shot.negativePrompt 
        ? `&negative=${encodeURIComponent(shot.negativePrompt.slice(0, 200))}` 
        : "";
    
    // E. Add randomness (Seed)
    const seed = Math.floor(Math.random() * 1000000);
    
    // F. Construct URL
    // Using 'flux' model. Ensure nologo=true.
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux${negativeParam}`;

    // G. FETCH AND CONVERT
    // We do NOT return the URL directly anymore. We fetch the image data.
    return await fetchPollinationsImage(url);
};