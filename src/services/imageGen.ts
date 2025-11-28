import { generateShotImage } from './gemini'; // The Pro Engine
import { Shot, Project, Character, Outfit, Location } from '../types';

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
    // Strictly follows user inputs: Description + Aspect Ratio + Negative Prompt
    
    // A. Aspect Ratio Logic
    // Convert string ratio (e.g. "16:9") to pixels
    let width = 1280;
    let height = 720;
    
    if (options.aspectRatio) {
        const [w, h] = options.aspectRatio.split(':').map(Number);
        if (!isNaN(w) && !isNaN(h)) {
            // Normalize to ~1 megapixel max for speed
            const scale = Math.sqrt(1000000 / (w * h));
            width = Math.round(w * scale);
            height = Math.round(h * scale);
        }
    }

    // B. Construct URL-Safe Prompt
    // We append the negative prompt to the description if supported, 
    // or just let the model handle the description.
    // Pollinations usually takes the prompt in the path.
    // We add "cinematic" just to ensure it's not a cartoon, but rely mostly on user text.
    let fullPrompt = shot.description || "cinematic shot";
    
    // Append negative prompt if exists (Pollinations supports ?negative=...)
    const negativeParam = shot.negativePrompt ? `&negative=${encodeURIComponent(shot.negativePrompt)}` : "";
    
    // C. Add randomness
    const seed = Math.floor(Math.random() * 1000000);
    
    // D. Construct URL
    // Model: 'flux' is generally better for cinematic text adherence
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux${negativeParam}`;

    return url;
};