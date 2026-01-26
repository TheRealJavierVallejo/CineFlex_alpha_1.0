import { SYD_PROMPTS } from './prompts';

export type SydAgentType = 'title' | 'logline' | 'story_types' | 'target_audience' | 'character' | 'beat' | 'summary';

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
    target_audience: {
        type: 'target_audience',
        systemPrompt: SYD_PROMPTS.TARGET_AUDIENCE,
        requiredContext: ['genre', 'theme', 'tone', 'storyTypes'],
        maxTokens: 200
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
        const placeholder = `[${key}]`;
        prompt = prompt.split(placeholder).join(value);
    });

    return prompt;
};

/**
 * Validates that all required context fields are present.
 * Throws an error if any required fields are missing.
 * 
 * @param agentType - The agent type to validate
 * @param context - The context object with field values
 * @throws Error if required fields are missing
 */
export const validateRequiredContext = (
    agentType: SydAgentType,
    context: Record<string, string | undefined>
): void => {
    const agent = SYD_AGENTS[agentType];
    const missing: string[] = [];

    for (const field of agent.requiredContext) {
        if (!context[field] || context[field]?.trim() === '') {
            missing.push(field);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `Agent "${agentType}" missing required context: ${missing.join(', ')}. ` +
            `Please provide these fields before calling this agent.`
        );
    }
};