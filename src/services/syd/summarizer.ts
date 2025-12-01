import { SYD_AGENTS, constructSystemPrompt } from './agents';

// This service will interact with the LocalLlmContext
// Since we can't import the hook here (not a component), we'll define the interface
// and let the component layer pass the generator function.

export interface SummarizerService {
    generateSummary: (
        content: string,
        limit: number,
        generator: (prompt: string, context: any, maxTokens: number) => Promise<string>
    ) => Promise<string>;
}

export const summarizer: SummarizerService = {
    generateSummary: async (content, limit, generator) => {
        const prompt = constructSystemPrompt('summary', { WordLimit: limit.toString() });

        // We pass the content as context
        const context = {
            textToSummarize: content
        };

        try {
            const summary = await generator(prompt, context, SYD_AGENTS.summary.maxTokens);
            return summary;
        } catch (error) {
            console.error("Summarization failed:", error);
            return content.substring(0, limit * 5) + "..."; // Fallback truncation
        }
    }
};
