/*
 * 🧠 SERVICE: GEMINI AI (The Artist)
 * 
 * This file handles all the conversations with Google's AI.
 * It's responsible for taking your text descriptions, sketches, and reference photos
 * and sending them to the "Gemini" or "Imagen" models to get a picture back.
 */

import type { GoogleGenAI } from "@google/genai";
import { Shot, Project, Character, Outfit, ScriptElement, Location, StoryNote } from '../types';
import { constructPrompt } from './promptBuilder';

// Helper to check for API Key
export const hasApiKey = () => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  const localKey = localStorage.getItem('cinesketch_api_key');
  return !!(envKey || localKey);
};

// Async Client Getter with Dynamic Import
const getClientAsync = async (): Promise<GoogleGenAI> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('cinesketch_api_key');

  if (!apiKey) {
    throw new Error("API Key not found. Please set VITE_GEMINI_API_KEY in .env or enter it in Project Settings.");
  }

  // Dynamic Import
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey });
};

// --- ERROR CLASSIFICATION SYSTEM ---
export enum GeminiErrorType {
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  INVALID_KEY = 'invalid_key',
  TIMEOUT = 'timeout',
  QUOTA_EXCEEDED = 'quota_exceeded',
  CONTENT_FILTERED = 'content_filtered',
  UNKNOWN = 'unknown'
}

export interface GeminiError {
  type: GeminiErrorType;
  message: string;
  userMessage: string; // User-friendly message
  retryable: boolean;
  retryAfterSeconds?: number;
}

// Helper to classify errors into user-friendly messages
export function classifyGeminiError(error: any): GeminiError {
  // Rate limit (429)
  if (error.status === 429) {
    return {
      type: GeminiErrorType.RATE_LIMIT,
      message: error.message || 'Rate limit exceeded',
      userMessage: 'Too many requests. Please wait 30 seconds and try again.',
      retryable: true,
      retryAfterSeconds: 30
    };
  }

  // Invalid API key (401, 403)
  if (error.status === 401 || error.status === 403) {
    return {
      type: GeminiErrorType.INVALID_KEY,
      message: error.message || 'Authentication failed',
      userMessage: 'API key invalid or expired. Check Project Settings → API Key.',
      retryable: false
    };
  }

  // Quota exceeded
  if (error.message?.toLowerCase().includes('quota')) {
    return {
      type: GeminiErrorType.QUOTA_EXCEEDED,
      message: error.message,
      userMessage: 'Monthly API quota exceeded. Please upgrade your Google AI plan.',
      retryable: false
    };
  }

  // Network errors
  if (error.message?.includes('fetch failed') ||
    error.message?.includes('ECONNRESET') ||
    error.message?.includes('ETIMEDOUT') ||
    error.message?.includes('NetworkError')) {
    return {
      type: GeminiErrorType.NETWORK,
      message: error.message,
      userMessage: 'Network error. Check your internet connection and try again.',
      retryable: true,
      retryAfterSeconds: 5
    };
  }

  // Content filtering
  if (error.message?.toLowerCase().includes('safety') ||
    error.message?.toLowerCase().includes('blocked') ||
    error.message?.toLowerCase().includes('filtered')) {
    return {
      type: GeminiErrorType.CONTENT_FILTERED,
      message: error.message,
      userMessage: 'Content filtered by safety settings. Try rephrasing your request.',
      retryable: false
    };
  }

  // Timeout
  if (error.name === 'TimeoutError' ||
    error.message?.includes('timeout') ||
    error.message?.includes('timed out')) {
    return {
      type: GeminiErrorType.TIMEOUT,
      message: error.message,
      userMessage: 'Request timed out. Please try again.',
      retryable: true,
      retryAfterSeconds: 3
    };
  }

  // Unknown error
  return {
    type: GeminiErrorType.UNKNOWN,
    message: error.message || 'Unknown error',
    userMessage: 'Something went wrong. Please try again.',
    retryable: true,
    retryAfterSeconds: 3
  };
}

// --- RETRY LOGIC WITH TIMEOUT AND JITTER ---
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  initialDelay = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add request timeout (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
      });

      const result = await Promise.race([fn(), timeoutPromise]);
      return result as T;

    } catch (error: any) {
      lastError = error;

      // Classify error
      const classified = classifyGeminiError(error);

      // Don't retry non-retryable errors
      if (!classified.retryable || attempt === retries) {
        throw error;
      }

      // Calculate backoff with jitter (prevents thundering herd)
      const backoff = initialDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // 0-1000ms random
      const delay = Math.min(backoff + jitter, 16000); // Cap at 16 seconds

      console.warn(
        `Attempt ${attempt + 1}/${retries + 1} failed. ` +
        `Retrying in ${Math.round(delay / 1000)}s... ` +
        `Error: ${classified.userMessage}`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// --- GENERATE SINGLE IMAGE ---
export const generateShotImage = async (
  shot: Shot,
  project: Project,
  activeCharacters: Character[],
  activeOutfits: Outfit[],
  activeLocation: Location | undefined, // NEW
  options: { model: string; aspectRatio: string; imageSize?: string }
): Promise<string> => {
  const ai = await getClientAsync();

  // 1. Construct Prompt using shared logic
  let prompt = constructPrompt(shot, project, activeCharacters, activeOutfits, activeLocation);


  const apiCall = async () => {
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

      // C. Add Location Reference Photos (NEW)
      if (activeLocation && activeLocation.referencePhotos && activeLocation.referencePhotos.length > 0) {
        activeLocation.referencePhotos.forEach(photo => {
          const match = photo.match(/^data:(.+);base64,(.+)$/);
          if (match) {
            contents.parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        });
      }

      // D. Add Sketch
      if (shot.sketchImage) {
        const base64Data = shot.sketchImage.split(',')[1] || shot.sketchImage;
        const mimeMatch = shot.sketchImage.match(/^data:(.+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        contents.parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
      }

      // E. Reference Image Control (Depth/Canny)
      if (shot.referenceImage) {
        const refBase64 = shot.referenceImage.split(',')[1] || shot.referenceImage;
        const mimeMatch = shot.referenceImage.match(/^data:(.+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        contents.parts.push({ inlineData: { mimeType: mimeType, data: refBase64 } });
      }

      // F. Add text prompt
      contents.parts.push({ text: prompt });

      // G. Configuration
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
        throw new Error(`Permission Denied. Please check your API Key permissions.`);
      }
      throw error;
    }
  };

  return withRetry(apiCall);
};

// --- BATCH GENERATION ---
export const generateBatchShotImages = async (
  shot: Shot,
  project: Project,
  activeCharacters: Character[],
  activeOutfits: Outfit[],
  activeLocation: Location | undefined, // NEW
  options: { model: string; aspectRatio: string; imageSize?: string },
  count: number = 1
): Promise<string[]> => {
  // Execute serially with individual retries to avoid partial failures failing the whole batch
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const img = await generateShotImage(shot, project, activeCharacters, activeOutfits, activeLocation, options);
      results.push(img);
    } catch (e) {
      console.error(`Batch item ${i} failed`, e);
      // If individual fails, we continue best effort, or rethrow? 
      // For now, let's rethrow to alert user of failure.
      throw e;
    }
  }
  return results;
};

// --- SKETCH ANALYSIS ---
export const analyzeSketch = async (sketchBase64: string): Promise<string> => {
  const ai = await getClientAsync();
  const apiCall = async () => {
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
      throw error;
    }
  };

  // Don't fail hard on analysis, just return empty string on final failure
  try {
    return await withRetry(apiCall);
  } catch (e) {
    return "";
  }
};

// --- SCRIPT ASSISTANT (CHAT) ---
export const chatWithScript = async (
  message: string,
  history: { role: 'user' | 'model'; content: string }[],
  scriptContext: ScriptElement[],
  characters: Character[],
  storyNotes: StoryNote[]
): Promise<string> => {
  const ai = await getClientAsync();

  const apiCall = async () => {
    try {
      // 1. Convert Script Elements to readable text format (Fountain-ish)
      // Limit to last 50 elements to avoid token limits, but prioritize current scene
      const scriptText = scriptContext.slice(-50).map(el => {
        if (el.type === 'scene_heading') return `\n${el.content}`;
        if (el.type === 'character') return `\n${el.content.toUpperCase()}`;
        if (el.type === 'dialogue') return `${el.content}`;
        if (el.type === 'parenthetical') return `(${el.content})`;
        return `${el.content}`;
      }).join('\n');

      const charText = characters.map(c => `${c.name}: ${c.description}`).join('\n');

      const notesText = storyNotes.length > 0
        ? storyNotes.map(note => `
${note.title}
${note.content}
`).join('\n---\n')
        : 'No story notes yet.';

      const systemPrompt = `
        You are **SYD**, a senior story analyst and professional screenwriter's assistant.
        You are knowledgeable, concise, and helpful. You have access to the provided script context.
        
        CONTEXT:
        The script so far (last snippet):
        ---
        ${scriptText}
        ---

        CHARACTERS:
        ${charText}

        STORY NOTES:
        The writer has saved these notes for reference:
        
        ${notesText}

        TASK:
        Answer the user's request. Reference their story notes when relevant to help maintain consistency with their vision. You can suggest dialogue, improve formatting, brainstorm plot points, or provide feedback.
        Keep answers concise and helpful for a writer in the flow. If suggesting dialogue, use standard screenplay format.
        `;

      // 2. Prepare history for API
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] }, // System instruction as first user msg
        ...history.map(h => ({
          role: h.role,
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents as any
      });

      return response.text || "I couldn't generate a response.";
    } catch (error) {
      console.error("Script Chat Error", error);
      throw error;
    }
  };

  try {
    return await withRetry(apiCall);
  } catch (e) {
    return "Sorry, I encountered an error connecting to the AI. Check your API Key.";
  }
};

// --- SCRIPT ASSISTANT (STREAMING CHAT) ---
// Streams responses word-by-word for perceived faster responses
export const chatWithScriptStreaming = async (
  message: string,
  history: { role: 'user' | 'model'; content: string }[],
  systemPrompt: string,
  onChunk: (chunk: string) => void
): Promise<string> => {
  const ai = await getClientAsync();

  try {
    // Prepare history for API
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] }, // System instruction as first user msg
      ...history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    // Use streaming API
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: contents as any
    });

    let fullResponse = '';

    // Stream chunks to callback
    for await (const chunk of response) {
      const text = chunk.text || '';
      if (text) {
        fullResponse += text;
        onChunk(text);
      }
    }

    return fullResponse || "I couldn't generate a response.";
  } catch (error: any) {
    console.error("Script Chat Streaming Error", error);

    // Classify and re-throw with user message
    const classified = classifyGeminiError(error);
    throw new Error(classified.userMessage);
  }
};

// --- TOKEN ESTIMATION UTILITIES ---
// Improved token estimation (approximate but better than simple char/4)
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  // Average: 1 token ≈ 0.75 words in English
  // Also count ~4 chars per token as fallback
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = text.length;

  // Use word count if available, otherwise character count
  const wordBasedEstimate = Math.ceil(wordCount / 0.75);
  const charBasedEstimate = Math.ceil(charCount / 4);

  // Average both approaches for better accuracy
  return Math.ceil((wordBasedEstimate + charBasedEstimate) / 2);
}

export function estimateConversationTokens(
  messages: { role: string; content: string }[],
  systemPrompt: string = ''
): number {
  const systemTokens = estimateTokenCount(systemPrompt);
  const messageTokens = messages.reduce(
    (sum, msg) => sum + estimateTokenCount(msg.content),
    0
  );

  // Add overhead for message formatting (role names, delimiters, etc.)
  const overhead = messages.length * 4;

  return systemTokens + messageTokens + overhead;
}

// --- DURABLE CHAT (LOCAL-FIRST) ---
import { listMessagesForThread, appendMessage } from './sydChatStore';
import { SydMessage } from '../types';

/**
 * Wrapper for chatWithScript that persists history to IndexedDB.
 * Used by the UI to ensure refresh-proof conversations.
 */
export const chatWithScriptDurable = async (
  projectId: string,
  userMessage: string,
  scriptContext: ScriptElement[],
  characters: Character[],
  storyNotes: StoryNote[],
  threadId: string // NEW ARGUMENT
): Promise<{ replyText: string; messages: SydMessage[] }> => {

  // 1. Get Conversation Context
  // const thread = await getOrCreateDefaultThreadForProject(projectId); // REMOVED
  const history = await listMessagesForThread(threadId);

  // 2. Persist User Message
  const savedUserMsg = await appendMessage({
    threadId: threadId,
    role: 'user',
    content: { text: userMessage }
  });

  // 3. Prepare History for LLM
  // Map 'assistant' (DB) -> 'model' (Gemini)
  const apiHistory = history.map(m => ({
    role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
    content: m.content.text
  }));

  // 4. Call LLM
  let replyText = "";
  try {
    replyText = await chatWithScript(userMessage, apiHistory, scriptContext, characters, storyNotes);
  } catch (e: any) {
    // If LLM fails, we still have the user message saved. 
    // We could append an error system message or just throw.
    // For now, let's just throw so UI can show error state, but User msg is preserved.
    throw e;
  }

  // 5. Persist Assistant Reply
  await appendMessage({
    threadId: threadId,
    role: 'assistant',
    content: { text: replyText }
  });

  // 6. Return Cached Full State (re-fetch to be perfectly consistent)
  const finalMessages = await listMessagesForThread(threadId);

  return {
    replyText,
    messages: finalMessages
  };
};

export { constructPrompt };