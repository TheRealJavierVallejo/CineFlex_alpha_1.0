import { Shot, Project, Character, Outfit, Location } from '../types';

/**
 * SMART PROMPT ENHANCER (Free Tier Optimization)
 * 
 * Free users cannot use the sophisticated prompt engineering features (Cast, ControlNet).
 * This function bridges the gap by injecting cinematic keywords based on their
 * Project Settings (Era, Style) into the prompt invisibly.
 */
export const enhancePromptForFreeTier = (
    shot: Shot,
    project: Project,
    characters: Character[],
    outfits: Outfit[],
    location?: Location
): string => {
    // 1. Base Description (The user's raw input)
    let prompt = shot.description || "";
    
    // 2. Shot Type Injection
    if (shot.shotType) {
        const shotKeywords: Record<string, string> = {
            'Close-up': '85mm lens, shallow depth of field, bokeh, detailed facial features',
            'Medium Shot': '50mm lens, waist up, standard composition',
            'Wide Shot': '24mm lens, establishing shot, environment focused',
            'Extreme Wide': '16mm lens, panoramic, massive scale, tiny subject',
            'Low Angle': 'heroic angle, looking up, imposing',
            'High Angle': 'looking down, vulnerable perspective',
        };
        const keyword = shotKeywords[shot.shotType];
        if (keyword) prompt += `, ${keyword}`;
    }

    // 3. Cinematic Style (Global Project Setting)
    if (project.settings.cinematicStyle) {
        prompt += `, ${project.settings.cinematicStyle} style`;
    }

    // 4. Lighting (Global Project Setting)
    if (project.settings.lighting) {
        prompt += `, ${project.settings.lighting} lighting`;
    }

    // 5. Era (Global Project Setting)
    if (project.settings.era && project.settings.era !== 'Modern') {
        prompt += `, set in ${project.settings.era}`;
    }

    // 6. Quality Boosters (Always applied)
    prompt += ", cinematic lighting, detailed texture, movie still, 4k, high resolution";

    return prompt;
};

// Legacy helper for the Pro Tier (Cloud) prompt construction
export const constructPrompt = (
  shot: Shot, 
  project: Project, 
  characters: Character[],
  outfits: Outfit[],
  location?: Location
): string => {
  // ... existing Pro logic ...
  let prompt = `Cinematic shot. ${shot.description}.`;
  
  if (shot.shotType) prompt += ` Shot type: ${shot.shotType}.`;
  
  if (project.settings.cinematicStyle) prompt += ` Style: ${project.settings.cinematicStyle}.`;
  if (project.settings.era) prompt += ` Era: ${project.settings.era}.`;
  if (project.settings.lighting) prompt += ` Lighting: ${project.settings.lighting}.`;

  // Add character details if referenced in description
  const mentionedChars = characters.filter(c => shot.description.toLowerCase().includes(c.name.toLowerCase()));
  if (mentionedChars.length > 0) {
      prompt += " Characters: " + mentionedChars.map(c => {
          const outfit = outfits.find(o => o.characterId === c.id);
          return `${c.name} (${c.description}${outfit ? `, wearing ${outfit.description}` : ''})`;
      }).join(", ") + ".";
  }

  if (location) {
      prompt += ` Location: ${location.name} (${location.description}).`;
  }

  return prompt;
};