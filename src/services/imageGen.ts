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
    // Convert string ratio (e.g. "16:9" or "2.39:1") to pixels
    let width = 1280;
    let height = 720;
    
    if (options.aspectRatio) {
        const parts = options.aspectRatio.split(':').map(Number);
        
        // Handle standard "W:H" and decimal "2.39:1"
        const wRatio = parts[0];
        const hRatio = parts.length > 1 ? parts[1] : 1;

        if (!isNaN(wRatio) && !isNaN(hRatio)) {
            // Target roughly 1 Megapixel (1,000,000 pixels) for fast generation
            // Formula: Scale = sqrt(TargetPixels / (W * H))
            const targetPixels = 1000000; 
            const scale = Math.sqrt(targetPixels / (wRatio * hRatio));
            
            width = Math.round(wRatio * scale);
            height = Math.round(hRatio * scale);
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
    // We explicitly set 'nologo=true' to keep it clean (though 'Student Preview' is added by UI)
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux${negativeParam}`;

    return url;
};