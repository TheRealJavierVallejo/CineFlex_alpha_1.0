/*
 * 📝 SERVICE: AUTO SUMMARIZE (Token Compression)
 * 
 * Automatically compresses completed story sections to reduce token usage
 * for later Syd micro-agents. Uses local model if available, falls back to
 * simple extraction.
 */

import { StoryBeat, CharacterDevelopment, StoryMetadata } from '../types';

/**
 * Determine if auto-summarization should trigger
 */
export function shouldTriggerSummary(
    beats: StoryBeat[],
    metadata: StoryMetadata
): 'act_one' | 'act_two_a' | 'act_two_b' | 'act_three' | null {
    const completedBeats = beats.filter(b => b.isComplete).sort((a, b) => a.sequence - b.sequence);

    // Act One: Beats 1-5
    if (completedBeats.length >= 5 && !metadata.actOneSummary) {
        const hasBeats1to5 = completedBeats.filter(b => b.sequence >= 1 && b.sequence <= 5).length === 5;
        if (hasBeats1to5) return 'act_one';
    }

    // Act Two A: Beats 6-10
    if (completedBeats.length >= 10 && !metadata.actTwoASummary) {
        const hasBeats6to10 = completedBeats.filter(b => b.sequence >= 6 && b.sequence <= 10).length === 5;
        if (hasBeats6to10) return 'act_two_a';
    }

    // Act Two B: Beats 11-12
    if (completedBeats.length >= 12 && !metadata.actTwoBSummary) {
        const hasBeats11to12 = completedBeats.filter(b => b.sequence >= 11 && b.sequence <= 12).length === 2;
        if (hasBeats11to12) return 'act_two_b';
    }

    // Act Three: Beats 13-15
    if (completedBeats.length >= 15 && !metadata.actThreeSummary) {
        const hasBeats13to15 = completedBeats.filter(b => b.sequence >= 13 && b.sequence <= 15).length === 3;
        if (hasBeats13to15) return 'act_three';
    }

    return null;
}

/**
 * Generate summary of story beats (for a specific act)
 * @param beats - Completed beats to summarize
 * @param generateWithModel - Optional async function to use local model
 */
export async function generateBeatSummary(
    beats: StoryBeat[],
    generateWithModel?: (prompt: string) => Promise<string>
): Promise<string> {
    const combinedContent = beats
        .sort((a, b) => a.sequence - b.sequence)
        .map(b => `${b.beatName}: ${b.content || ''}`)
        .join('\n');

    if (generateWithModel) {
        try {
            const prompt = `Summarize the following story beats in 100 words or less. Keep only the key plot points:

${combinedContent}

Summary:`;

            const summary = await generateWithModel(prompt);
            return truncateToWordLimit(summary, 100);
        } catch (e) {
            console.warn('Model summarization failed, using fallback', e);
        }
    }

    // Fallback: Simple extraction
    return extractKeywordSummary(combinedContent, 100);
}

/**
 * Generate character profile summary
 * @param character - Character with arc fields filled
 * @param generateWithModel - Optional async function to use local model
 */
export async function generateCharacterProfile(
    character: CharacterDevelopment,
    generateWithModel?: (prompt: string) => Promise<string>
): Promise<string> {
    const profile = `${character.name} (${character.role}): ${character.characterArc || ''}
Want: ${character.want || ''}
Need: ${character.need || ''}
Lie: ${character.lie || ''}
Ghost: ${character.ghost || ''}`;

    if (generateWithModel) {
        try {
            const prompt = `Summarize this character profile in 75 words or less:

${profile}

Summary:`;

            const summary = await generateWithModel(prompt);
            return truncateToWordLimit(summary, 75);
        } catch (e) {
            console.warn('Model character summary failed, using fallback', e);
        }
    }

    // Fallback: Extract key info
    return extractKeywordSummary(profile, 75);
}

/**
 * Fallback: Simple keyword extraction when model unavailable
 */
function extractKeywordSummary(text: string, maxWords: number): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length === 0) return '';

    // Strategy: Take first sentence + last sentence, fill middle
    let summary = sentences[0].trim();
    let wordCount = summary.split(/\s+/).length;

    if (sentences.length > 1 && wordCount < maxWords) {
        const lastSentence = sentences[sentences.length - 1].trim();
        const lastWords = lastSentence.split(/\s+/).length;

        if (wordCount + lastWords <= maxWords) {
            summary += '. ' + lastSentence;
            wordCount += lastWords;
        }
    }

    // Add middle sentences if room
    for (let i = 1; i < sentences.length - 1 && wordCount < maxWords; i++) {
        const sentence = sentences[i].trim();
        const words = sentence.split(/\s+/).length;
        if (wordCount + words <= maxWords) {
            summary += '. ' + sentence;
            wordCount += words;
        }
    }

    return truncateToWordLimit(summary, maxWords);
}

/**
 * Ensure text doesn't exceed word limit
 */
function truncateToWordLimit(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text.trim();
    return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Check if character is ready for profile generation
 */
export function isCharacterReadyForProfile(character: CharacterDevelopment): boolean {
    return Boolean(
        character.want &&
        character.need &&
        character.lie &&
        character.ghost &&
        character.characterArc
    );
}
