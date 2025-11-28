import { generateShotImage } from './gemini'; // The Pro Engine
import { Shot, Project, Character, Outfit, Location } from '../types';

// --- CINEMATIC BOOSTERS (Smart-Dumb Logic) ---
// These mappings force the basic model to understand film grammar
const SHOT_TYPE_KEYWORDS: Record<string, string> = {
    "Extreme Wide Shot": "extreme wide shot, massive scale, panoramic view, establishing shot, tiny subject in vast environment",
    "Wide Shot": "wide angle lens, 35mm, full body shot, environmental context",
    "Medium Shot": "medium shot, waist up, 50mm lens, conversational distance",
    "Close-Up": "close up, 85mm lens, shallow depth of field, bokeh background, emotional focus",
    "Extreme Close-Up": "macro lens, extreme detail, tight framing, intense focus, eyes or object detail",
    "Dutch Angle": "dutch angle, tilted camera, dynamic tension, diagonal composition",
    "Over the Shoulder": "over the shoulder shot, foreground shoulder blur, conversational perspective",
    "Birds Eye View": "birds eye view, top down drone shot, high angle, map-like perspective"
};

const STYLE_KEYWORDS: Record<string, string> = {
    "Film Noir": "high contrast, chiaroscuro, shadows, black and white photography, mystery",
    "Cyberpunk": "neon lights, rain, wet streets, futuristic, tech noir, purple and teal lighting",
    "Wes Anderson": "flat composition, symmetry, pastel colors, whimsy, direct angle",
    "Hollywood Blockbuster": "teal and orange grading, volumetric lighting, epic scale, sharp focus",
    "Vintage": "film grain, sepia tone, 1970s aesthetic, kodak portra",
    "Anime": "anime style, makoto shinkai style, vibrant colors, detailed clouds",
    "Realistic": "raw photo, documentary style, natural lighting, 4k texture"
};

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

    // 2. FREE TIER: Smart-Dumb Generator (Pollinations.ai)
    // Limitation: Ignores specific reference photos.
    // Optimization: Injects "Cinematic Boosters" to force quality.
    
    // A. Extract Core Description
    const coreDescription = shot.description || "A cinematic scene";

    // B. Get Booster Keywords
    const shotKeywords = SHOT_TYPE_KEYWORDS[shot.shotType] || "cinematic shot";
    const styleKeywords = STYLE_KEYWORDS[project.settings.cinematicStyle] || `${project.settings.cinematicStyle} style`;
    const lightingKeywords = project.settings.lighting ? `, ${project.settings.lighting} lighting` : '';
    
    // C. Construct "Smart" Prompt
    // Structure: [Subject] + [Camera Config] + [Art Direction] + [Quality Assertions]
    const enhancedPrompt = [
        coreDescription,
        `(${shotKeywords})`,
        `style of ${styleKeywords}`,
        lightingKeywords,
        "masterpiece, 8k, highly detailed, movie still, color graded, sharp focus, professional photography"
    ].join(', ');
    
    // D. Encode
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    // E. Add randomness to ensure the URL changes if they click "Regenerate"
    const seed = Math.floor(Math.random() * 1000000);
    
    // F. Construct URL
    // We strictly force 16:9 (1280x720) for free tier to ensure consistency and speed
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${seed}&model=flux`;

    return url;
};