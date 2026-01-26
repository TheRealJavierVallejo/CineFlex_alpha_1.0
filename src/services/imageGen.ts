/*
 * 📸 SERVICE: IMAGE GENERATION (The Artist)
 * 
 * This service handles takes text descriptions, sketches, and reference photos
 * and sends them to Google's Imagen models to get a picture back.
 */

import { Shot, Project, Character, Outfit, Location } from '../types';
import { constructPrompt } from './promptBuilder';
import { supabase } from './supabaseClient';

// --- KEY MANAGEMENT ---

/**
 * Get user's Gemini API key from database
 */
export async function getUserGeminiApiKey(): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching Gemini API key:', error);
            if (error.code === '406') {
                console.error('CRITICAL: 406 Warning - Schema Cache Deadlock. Please reload Dashboard.');
            }
            return null;
        }

        if (!data?.gemini_api_key) return null;
        return data.gemini_api_key;
    } catch (error) {
        console.error('Error fetching Gemini API key:', error);
        return null;
    }
}

/**
 * Helper to check for API Key availability
 */
export const hasApiKey = async () => {
    const key = await getUserGeminiApiKey();
    return !!key;
};

/**
 * Internal helper to get and configure the Google AI client
 */
const getClientAsync = async () => {
    const apiKey = await getUserGeminiApiKey();

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY_MISSING: Please add your Gemini API key in Account Settings for image generation');
    }

    if (!apiKey.startsWith('AIza')) {
        throw new Error('GEMINI_API_KEY_INVALID: Invalid Gemini API key format');
    }

    // Dynamic Import to keep bundle size small when not needed
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
    userMessage: string;
    retryable: boolean;
    retryAfterSeconds?: number;
}

/**
 * Classifies Gemini API errors into actionable, user-friendly messages
 */
export function classifyGeminiError(error: any): GeminiError {
    if (error.status === 429) {
        return {
            type: GeminiErrorType.RATE_LIMIT,
            message: error.message || 'Rate limit exceeded',
            userMessage: 'Too many requests. Please wait 30 seconds and try again.',
            retryable: true,
            retryAfterSeconds: 30
        };
    }

    if (error.status === 401 || error.status === 403) {
        return {
            type: GeminiErrorType.INVALID_KEY,
            message: error.message || 'Authentication failed',
            userMessage: 'API key invalid or expired. Check Account Settings → API Keys.',
            retryable: false
        };
    }

    if (error.message?.toLowerCase().includes('quota')) {
        return {
            type: GeminiErrorType.QUOTA_EXCEEDED,
            message: error.message,
            userMessage: 'Monthly API quota exceeded. Please upgrade your Google AI plan.',
            retryable: false
        };
    }

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

    return {
        type: GeminiErrorType.UNKNOWN,
        message: error.message || 'Unknown error',
        userMessage: 'Something went wrong. Please try again.',
        retryable: true,
        retryAfterSeconds: 3
    };
}

// --- RETRY LOGIC ---
const withRetry = async <T>(
    fn: () => Promise<T>,
    retries = 3,
    initialDelay = 1000
): Promise<T> => {
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
            });

            const result = await Promise.race([fn(), timeoutPromise]);
            return result as T;

        } catch (error: any) {
            lastError = error;
            const classified = classifyGeminiError(error);

            if (!classified.retryable || attempt === retries) {
                throw error;
            }

            const backoff = initialDelay * Math.pow(2, attempt);
            const jitter = Math.random() * 1000;
            const delay = Math.min(backoff + jitter, 16000);

            console.warn(`Attempt ${attempt + 1}/${retries + 1} failed. Retrying in ${Math.round(delay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    const finalClassified = classifyGeminiError(lastError);
    throw new Error(finalClassified.userMessage);
};

// --- CORE GENERATION ---

/**
 * Generates a single storyboard image from a shot definition
 */
export const generateShotImage = async (
    shot: Shot,
    project: Project,
    activeCharacters: Character[],
    activeOutfits: Outfit[],
    activeLocation: Location | undefined,
    options: { model: string; aspectRatio: string; imageSize?: string }
): Promise<string> => {
    const ai = await getClientAsync();
    let prompt = constructPrompt(shot, project, activeCharacters, activeOutfits, activeLocation);

    const apiCall = async () => {
        try {
            const contents: any = { parts: [] };

            // Character References
            activeCharacters.forEach(char => {
                char.referencePhotos?.forEach(photo => {
                    const match = photo.match(/^data:(.+);base64,(.+)$/);
                    if (match) contents.parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
                });
            });

            // Outfit References
            activeOutfits.forEach(outfit => {
                outfit.referencePhotos?.forEach(photo => {
                    const match = photo.match(/^data:(.+);base64,(.+)$/);
                    if (match) contents.parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
                });
            });

            // Location References
            activeLocation?.referencePhotos?.forEach(photo => {
                const match = photo.match(/^data:(.+);base64,(.+)$/);
                if (match) contents.parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
            });

            // Sketch
            if (shot.sketchImage) {
                const base64Data = shot.sketchImage.split(',')[1] || shot.sketchImage;
                const mimeMatch = shot.sketchImage.match(/^data:(.+);base64,/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                contents.parts.push({ inlineData: { mimeType, data: base64Data } });
            }

            // Depth Reference
            if (shot.referenceImage) {
                const refBase64 = shot.referenceImage.split(',')[1] || shot.referenceImage;
                const mimeMatch = shot.referenceImage.match(/^data:(.+);base64,/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                contents.parts.push({ inlineData: { mimeType, data: refBase64 } });
            }

            contents.parts.push({ text: prompt });

            const apiAspectRatio = options.aspectRatio === 'Match Reference' ? undefined : options.aspectRatio;
            const imageConfig: any = apiAspectRatio ? { aspectRatio: apiAspectRatio } : {};

            const response = await (ai as any).models.generateContent({
                model: options.model,
                contents: contents,
                config: { imageConfig: imageConfig }
            });

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
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

/**
 * Generates multiple images in parallel using Promise.allSettled
 */
export const generateBatchShotImages = async (
    shot: Shot,
    project: Project,
    activeCharacters: Character[],
    activeOutfits: Outfit[],
    activeLocation: Location | undefined,
    options: { model: string; aspectRatio: string; imageSize?: string },
    count: number = 1
): Promise<string[]> => {
    const promises = Array.from({ length: count }, () =>
        generateShotImage(shot, project, activeCharacters, activeOutfits, activeLocation, options)
    );

    const outcomes = await Promise.allSettled(promises);
    const results: string[] = [];

    outcomes.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') {
            results.push(outcome.value);
        } else {
            console.error(`Batch item ${index} failed`, outcome.reason);
        }
    });

    if (results.length === 0 && count > 0) {
        throw new Error("Batch generation failed. No images could be generated.");
    }

    return results;
};