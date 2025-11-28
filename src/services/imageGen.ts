import { generateShotImage } from './gemini'; // The Pro Engine
import { Shot, Project, Character, Outfit, Location } from '../types';
import { constructPrompt } from './promptBuilder';

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

    // 2. FREE TIER: Use Pollinations.ai (Cost: $0)
    // Limitation: Ignores sketch, reference photos, and complex control nets.
    // It creates a pure text-to-image result.
    
    // Construct a simpler prompt for the dumb model
    const basePrompt = constructPrompt(shot, project, characters, outfits, location, options.aspectRatio);
    
    // Clean up prompt for URL (Pollinations handles raw text, but shorter is often safer)
    // We add "cinematic, movie still, 4k" to force quality on the free model.
    const enhancedPrompt = `${shot.description} ${project.settings.cinematicStyle} style, cinematic lighting, photorealistic, 4k, movie frame`;
    
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    // Pollinations URL structure
    // We append a random seed to ensure it regenerates if clicked again
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${seed}`;

    // Return the URL directly. The app handles URLs same as Base64.
    return url;
};