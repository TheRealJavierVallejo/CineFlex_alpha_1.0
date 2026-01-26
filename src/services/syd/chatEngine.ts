import { chatWithScriptClaude } from '../scriptClaude';
import { ScriptElement, Character, StoryNote } from '../../types';

export type ChatProvider = 'claude' | 'local';

interface StreamConfig {
    projectId: string;
    userMessage: string;
    // Context for Claude
    scriptElements?: ScriptElement[];
    characters?: Character[];
    storyNotes?: StoryNote[];
    threadId?: string;
    // Context for Local (if needed)
    localContext?: string;
}

/**
 * 🔀 UNIFIED CHAT ENGINE
 * 
 * Abstracts the streaming logic for Syd chat across different providers.
 */
export async function streamSydResponse(
    provider: ChatProvider,
    config: StreamConfig,
    onChunk: (text: string) => void
): Promise<void> {
    if (provider === 'claude') {
        if (!config.threadId || !config.scriptElements) {
            throw new Error("Missing Claude configuration: threadId and scriptElements are required.");
        }

        await chatWithScriptClaude(
            config.projectId,
            config.userMessage,
            config.scriptElements,
            config.characters || [],
            config.storyNotes || [],
            config.threadId,
            onChunk
        );
    } else {
        // Local Logic is currently handled via LocalLlmContext in the UI components
        // to maintain hook integrity. This placeholder is for future unified local streaming.
        throw new Error("Local streaming should be handled via LocalLlmContext for now.");
    }
}
