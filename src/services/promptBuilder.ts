/*
 * 🎨 SERVICE: PROMPT BUILDER
 * 
 * This file handles the "Creative" logic. It takes raw data (Shot, Project, Characters)
 * and turns it into a detailed text description for the AI.
 */

import { Shot, Project, Character, Outfit } from '../types';

// Detailed Cinematic Mappings
export const SHOT_TYPE_PROMPTS: Record<string, string> = {
  "Extreme Wide Shot": "Extreme Wide Shot: Subject is barely visible, emphasizing the vast scale of the environment and landscape.",
  "Wide Shot": "Wide Shot: Subject at a distance showing full body and surrounding environment from head to toe.",
  "Medium Shot": "Medium Shot: Frame subject from waist up, showing upper body and facial expressions.",
  "Close-Up": "Close-Up: Tight framing on subject's face from shoulders to top of head, capturing detailed emotion.",
  "Extreme Close-Up": "Extreme Close-Up: Macro focus on a specific detail (eyes, mouth, or object), filling the frame.",
  "Dutch Angle": "Dutch Angle: Tilted camera axis creating a sense of unease, disorientation, or dynamic tension.",
  "Over the Shoulder": "Over the Shoulder: Camera positioned behind one character, looking past their shoulder at the subject.",
  "Birds Eye View": "Birds Eye View: High-angle shot looking directly down on the subject/scene from above."
};

export const constructPrompt = (
  shot: Shot,
  project: Project,
  activeCharacters: Character[],
  activeOutfits: Outfit[],
  aspectRatio: string,
  model: string = 'gemini-2.5-flash-image'
): string => {
  const isPro = model.includes('pro') || model.includes('ultra');
  const sections: string[] = [];

  // 1. ROLE & CONTEXT
  sections.push("ROLE: You are an expert cinematic concept artist and cinematographer. Your goal is to generate a photorealistic, high-fidelity movie frame.");

  // 2. TECHNICAL SPECS
  const shotInstruction = SHOT_TYPE_PROMPTS[shot.shotType] || `Camera Shot: ${shot.shotType}`;
  const techSpecs = [
    `SHOT TYPE: ${shotInstruction}`,
    `LIGHTING: ${project.settings.lighting}`,
    `TIME OF DAY: ${shot.timeOfDay && shot.timeOfDay !== 'Use Project Default' ? shot.timeOfDay : project.settings.timeOfDay}`,
    `ERA/PERIOD: ${project.settings.era}`,
    `QUALITY: 8K, photorealistic, cinematic lighting, highly detailed, sharp focus, film grain`
  ];
  sections.push(`TECHNICAL SPECS:\n- ${techSpecs.join('\n- ')}`);

  // 3. SCENE & ACTION (The Core)
  let sceneDesc = shot.description || "A cinematic shot matching the style.";
  if (shot.dialogue) {
    sceneDesc += `\n(CONTEXT: Characters are saying: "${shot.dialogue}". Capture the implied emotion and expression.)`;
  }
  if (shot.notes) {
    sceneDesc += `\n(DIRECTOR'S NOTES: ${shot.notes})`;
  }
  sections.push(`SCENE DESCRIPTION:\n${sceneDesc}`);

  // 4. CHARACTERS
  if (activeCharacters.length > 0) {
    const charDetails = activeCharacters.map(char => {
      const outfit = activeOutfits.find(o => o.characterId === char.id);
      let desc = `• ${char.name}: ${char.description}`;
      
      // Clothing Logic
      if (outfit) {
        desc += `\n  - WEARING: ${outfit.description}`;
      } else {
        desc += `\n  - WEARING: Era-appropriate attire`;
      }

      // Identity specific instruction - DISSOCIATE STYLE FROM REFERENCE
      if (char.referencePhotos?.length) {
        desc += `\n  - [FACE SOURCE]: Use the attached character images for FACIAL LIKENESS ONLY. Ignore lighting, style, and clothing of these photos.`;
      }
      
      // Outfit specific instruction
      if (outfit?.referencePhotos?.length) {
         desc += `\n  - [CLOTHING SOURCE]: Use the attached outfit images for clothing design ONLY.`;
      }

      return desc;
    });
    sections.push(`CHARACTERS:\n${charDetails.join('\n')}`);

    // Positioning
    let positioning = "";
    if (activeCharacters.length === 1) positioning = "Position character centrally or according to the rule of thirds.";
    else if (activeCharacters.length === 2) positioning = "Position characters with balanced composition.";
    else positioning = "Ensure all characters are visible and compositionally balanced.";
    sections.push(`COMPOSITION GUIDE: ${positioning}`);
  }

  // 5. STYLE & ATMOSPHERE
  const styleStrength = shot.styleStrength ?? 100;
  let styleInstruction = "";
  if (styleStrength >= 100) styleInstruction = "Strictly follow the project style.";
  else if (styleStrength >= 50) styleInstruction = "Follow the project style with moderate influence.";
  else styleInstruction = "Loose style influence, prioritize realism.";

  sections.push(`STYLE:\n- Visual Style: ${project.settings.cinematicStyle}\n- Instruction: ${styleInstruction}`);

  // 6. ASPECT RATIO (Critical)
  let finalAspectRatio = aspectRatio;
  if (aspectRatio === 'Match Reference' && !shot.referenceImage) {
    finalAspectRatio = project.settings.aspectRatio;
  }

  if (aspectRatio !== 'Match Reference' || !shot.referenceImage) {
    sections.push(`ASPECT RATIO: ${finalAspectRatio} (Ensure the composition fits this frame perfectly).`);
  }

  // 7. NEGATIVE PROMPT
  let negative = "text, watermarks, blur, distortion, low quality, ugly, deformed, bad anatomy";
  if (shot.negativePrompt) negative += `, ${shot.negativePrompt}`;
  sections.push(`NEGATIVE PROMPT: ${negative}`);

  // 8. REFERENCE PROTOCOL (The Guardrails)
  // This section explicitly prevents "Style Bleeding" from uploaded selfies/refs
  const hasCharRefs = activeCharacters.some(c => c.referencePhotos?.length);
  const hasOutfitRefs = activeOutfits.some(o => o.referencePhotos?.length);

  if (hasCharRefs || hasOutfitRefs) {
      sections.push(`REFERENCE IMAGE PROTOCOL (STRICT COMPLIANCE):
1. **IDENTITY ISOLATION**: Treat Character Reference Images as anatomical diagrams. Extract ONLY facial features (bone structure, eyes, nose, mouth).
2. **STYLE BLOCKING**: DO NOT copy the lighting, color grading, background, resolution, or camera quality from the reference photos. The generated image MUST match the cinematic style described in "TECHNICAL SPECS" (${project.settings.cinematicStyle}, ${project.settings.lighting}).
3. **LIGHTING DOMINANCE**: Completely ignore the lighting in the reference photos. Re-light the character's 3D facial structure using the "${project.settings.lighting}" lighting defined in the prompt.
4. **CLOTHING**: Ignore clothing in Character Reference Images. Use the text description or Outfit Reference Images instead.`);
  }

  // 9. MODEL SPECIFIC INSTRUCTION
  if (isPro) {
    sections.push("INSTRUCTION: Focus on subtle details, texture, and emotional depth. Create a rich, atmospheric composition.");
  } else {
    sections.push("INSTRUCTION: Focus on clarity, accurate subject depiction, and strong lighting.");
  }

  return sections.join('\n\n');
};