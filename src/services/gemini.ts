/*
 * 🧠 SERVICE: GEMINI AI (The Artist)
 * 
 * This file handles all the conversations with Google's AI.
 * It's responsible for taking your text descriptions, sketches, and reference photos
 * and sending them to the "Gemini" or "Imagen" models to get a picture back.
 */

import { GoogleGenAI } from "@google/genai";
import { Shot, Project, Character, Outfit } from '../types';
import { constructPrompt } from './promptBuilder';

// Helper to check for API Key
export const hasApiKey = () => !!import.meta.env.VITE_GEMINI_API_KEY;

const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key not found. Please set VITE_GEMINI_API_KEY in your .env.local file and restart the dev server.");
  }
  return new GoogleGenAI({ apiKey });
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
    const apiAspectRatio = options.aspectRatio === 'Match Reference' ? undefined : options.aspectRatio;
    const imageConfig: any = apiAspectRatio ? { aspectRatio: apiAspectRatio } : {};

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

// Re-export constructPrompt for convenience, though imports should ideally update
export { constructPrompt };