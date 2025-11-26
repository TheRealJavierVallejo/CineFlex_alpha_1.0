/*
 * 🧠 SERVICE: GEMINI AI (The Artist)
 * 
 * This file handles all the conversations with Google's AI.
 * It's responsible for taking your text descriptions, sketches, and reference photos
 * and sending them to the "Gemini" or "Imagen" models to get a picture back.
 */

import { GoogleGenAI } from "@google/genai";
import { Shot, Project, Character, Outfit } from '../types';

// Helper to check for API Key
export const hasApiKey = () => !!import.meta.env.VITE_GEMINI_API_KEY;

const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  console.log("🔑 API Key Check:", {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    first10: apiKey?.substring(0, 10) || 'NONE'
  });

  if (!apiKey) {
    throw new Error("API Key not found. Please set VITE_GEMINI_API_KEY in your .env.local file and restart the dev server.");
  }
  return new GoogleGenAI({ apiKey });
};

// Detailed Cinematic Mappings
const SHOT_TYPE_PROMPTS: Record<string, string> = {
  "Extreme Wide Shot": "Extreme Wide Shot: Subject is barely visible, emphasizing the vast scale of the environment and landscape.",
  "Wide Shot": "Wide Shot: Subject at a distance showing full body and surrounding environment from head to toe.",
  "Medium Shot": "Medium Shot: Frame subject from waist up, showing upper body and facial expressions.",
  "Close-Up": "Close-Up: Tight framing on subject's face from shoulders to top of head, capturing detailed emotion.",
  "Extreme Close-Up": "Extreme Close-Up: Macro focus on a specific detail (eyes, mouth, or object), filling the frame.",
  "Dutch Angle": "Dutch Angle: Tilted camera axis creating a sense of unease, disorientation, or dynamic tension.",
  "Over the Shoulder": "Over the Shoulder: Camera positioned behind one character, looking past their shoulder at the subject.",
  "Birds Eye View": "Birds Eye View: High-angle shot looking directly down on the subject/scene from above."
};

// --- PROMPT CONSTRUCTOR ---
// Used for both generation and preview
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

// --- GENERATE SINGLE IMAGE ---
export const generateShotImage = async (
  shot: Shot,
  project: Project,
  activeCharacters: Character[],
  activeOutfits: Outfit[],
  options: { model: string; aspectRatio: string; imageSize?: string }
): Promise<string> => {
  const ai = getClient();

  // 1. Construct Prompt using shared logic
  let prompt = constructPrompt(shot, project, activeCharacters, activeOutfits, options.aspectRatio, options.model);

  // --- DEBUG LOGGING ---
  console.group("🎨 GENERATING PROMPT");
  console.log("TEXT PROMPT:", prompt);
  console.log("SETTINGS:", {
    model: options.model,
    aspectRatio: options.aspectRatio,
    styleStrength: shot.styleStrength,
    timeOverride: shot.timeOfDay,
    negative: shot.negativePrompt
  });
  console.groupEnd();

  try {
    const contents: any = { parts: [] };

    // A. Add Character Reference Photos
    activeCharacters.forEach(char => {
      if (char.referencePhotos && char.referencePhotos.length > 0) {
        char.referencePhotos.forEach(photo => {
          const match = photo.match(/^data:(.+);base64,(.+)$/);
          if (match) {
            contents.parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        });
      }
    });

    // B. Add Outfit Reference Photos
    activeOutfits.forEach(outfit => {
      if (outfit.referencePhotos && outfit.referencePhotos.length > 0) {
        outfit.referencePhotos.forEach(photo => {
          const match = photo.match(/^data:(.+);base64,(.+)$/);
          if (match) {
            contents.parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        });
      }
    });

    // C. Add Sketch
    if (shot.sketchImage) {
      const base64Data = shot.sketchImage.split(',')[1] || shot.sketchImage;
      const mimeMatch = shot.sketchImage.match(/^data:(.+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      contents.parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
    }

    // D. Reference Image Control (Depth/Canny)
    if (shot.referenceImage) {
      const refBase64 = shot.referenceImage.split(',')[1] || shot.referenceImage;
      const mimeMatch = shot.referenceImage.match(/^data:(.+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      contents.parts.push({ inlineData: { mimeType: mimeType, data: refBase64 } });
    }

    // Add text prompt
    contents.parts.push({ text: prompt });

    // F. Configuration
    // Gemini only supports: '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'
    const apiAspectRatio = options.aspectRatio === 'Match Reference' ? undefined : options.aspectRatio;
    const imageConfig: any = apiAspectRatio ? { aspectRatio: apiAspectRatio } : {};

    // Pass imageSize if using Pro model which supports it
    if (options.model.includes('gemini-3') && options.imageSize) {
      // Simple config often works better across SDK versions
    }

    console.log('📐 Aspect Ratio Mapping:', {
      requested: options.aspectRatio,
      apiValue: apiAspectRatio,
      inPrompt: prompt.includes(options.aspectRatio)
    });

    const response = await ai.models.generateContent({
      model: options.model,
      contents: contents,
      config: { imageConfig: imageConfig }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated from Gemini.");

  } catch (error: any) {
    console.error("Gemini Image Gen Error:", error);
    if (error.message?.includes('403') || error.status === 403) {
      throw new Error(`Permission Denied. Please try using 'Gemini (Fast)' for this request.`);
    }
    throw error;
  }
};

// --- BATCH GENERATION ---
export const generateBatchShotImages = async (
  shot: Shot,
  project: Project,
  activeCharacters: Character[],
  activeOutfits: Outfit[],
  options: { model: string; aspectRatio: string; imageSize?: string },
  count: number = 1
): Promise<string[]> => {
  const promises = Array(count).fill(null).map(() =>
    generateShotImage(shot, project, activeCharacters, activeOutfits, options)
  );
  try {
    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Batch Generation Error:", error);
    throw error;
  }
};

// --- SKETCH ANALYSIS ---
export const analyzeSketch = async (sketchBase64: string): Promise<string> => {
  const ai = getClient();
  try {
    const base64Data = sketchBase64.split(',')[1] || sketchBase64;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Data } },
          { text: "Analyze this storyboard sketch. Briefly describe the camera angle, subject position, and implied action in 2 sentences." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Sketch Analysis Error", error);
    return "";
  }
};