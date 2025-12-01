import { SYD_PROMPTS } from './prompts';

export type SydAgentType = 'title' | 'logline' | 'story_types' | 'character' | 'beat' | 'summary';

export interface SydAgentConfig {
    type: SydAgentType;
    systemPrompt: string;
    requiredContext: string[];
    maxTokens: number;
}

export const SYD_AGENTS: Record<SydAgentType, SydAgentConfig> = {
    title: {
        type: 'title',
        systemPrompt: SYD_PROMPTS.TITLE,
        requiredContext: ['genre', 'theme', 'tone'],
        maxTokens: 200
    },
    logline: {
        type: 'logline',
        systemPrompt: SYD_PROMPTS.LOGLINE,
        requiredContext: ['genre', 'theme', 'tone', 'title'],
        maxTokens: 300
    },
    story_types: {
        type: 'story_types',
        systemPrompt: SYD_PROMPTS.STORY_TYPES,
        requiredContext: ['genre', 'theme', 'tone'],
        maxTokens: 250
    },
    character: {
        type: 'character',
        systemPrompt: SYD_PROMPTS.CHARACTER_ATTRIBUTE,
        requiredContext: ['logline', 'role'], // Dynamic fields added at runtime
        maxTokens: 500
    },
    beat: {
        type: 'beat',
        systemPrompt: SYD_PROMPTS.BEAT,
        requiredContext: ['logline', 'characterSummaries', 'previousBeatSummary'],
        maxTokens: 800
    },
    summary: {
        type: 'summary',
        systemPrompt: SYD_PROMPTS.SUMMARIZER,
        requiredContext: ['textToSummarize'],
        maxTokens: 200
    }
};

export const constructSystemPrompt = (agentType: SydAgentType, variables: Record<string, string> = {}): string => {
    let prompt = SYD_AGENTS[agentType].systemPrompt;

    // Replace placeholders like [TargetField]
    Object.entries(variables).forEach(([key, value]) => {
        prompt = prompt.replace(`[${key}]`, value);
    });

    return prompt;
};