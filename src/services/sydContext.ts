/*
 * 🧠 SERVICE: SYD CONTEXT (Token Budget Manager)
 * 
 * Manages context selection and token budgets for Syd micro-agents.
 * Each agent type gets only the fields it needs to stay under 1,500 tokens.
 */

import { PlotDevelopment, CharacterDevelopment, StoryBeat, StoryMetadata } from '../types';

// All micro-agent types
export type SydAgentType =
    | 'title'
    | 'logline'
    | 'story_types' // Added
    | 'character_identity'
    | 'character_want'
    | 'character_need'
    | 'character_lie'
    | 'character_ghost'
    | 'character_arc'
    | 'beat_opening_image'
    | 'beat_theme_stated'
    | 'beat_setup'
    | 'beat_catalyst'
    | 'beat_debate'
    | 'beat_break_into_two'
    | 'beat_b_story'
    | 'beat_fun_and_games'
    | 'beat_midpoint'
    | 'beat_bad_guys_close_in'
    | 'beat_all_is_lost'
    | 'beat_dark_night_of_the_soul'
    | 'beat_break_into_three'
    | 'beat_finale'
    | 'beat_final_image';

export interface SydContext {
    agentType: SydAgentType;
    systemPrompt: string;
    contextFields: Record<string, any>;
    estimatedTokens: number;
    maxOutputTokens: number;
}

import { SYD_AGENTS, constructSystemPrompt } from './syd/agents';

// Token estimation (rough heuristic: 1 token ≈ 4 characters)
const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
};

const estimateObjectTokens = (obj: any): number => {
    return estimateTokens(JSON.stringify(obj));
};

/**
 * Select context fields for a specific micro-agent
 * Strategy: Only include what's needed, compress where possible
 */
export function selectContextForAgent(
    agentType: SydAgentType,
    plot?: PlotDevelopment,
    character?: CharacterDevelopment,
    beats?: StoryBeat[],
    metadata?: StoryMetadata
): SydContext {
    const contextFields: Record<string, any> = {};
    let systemPrompt = '';
    let maxOutputTokens = 500;

    // Map specific UI agent types to generic Agent Configs
    let configType = agentType as string;
    if (agentType.startsWith('beat_')) configType = 'beat';
    if (agentType.startsWith('character_')) configType = 'character';
    if (agentType === 'title' || agentType === 'logline' || agentType === 'story_types') configType = agentType;

    // 1. Build Context Fields based on Agent Type
    switch (configType) {
        case 'title':
            if (plot) {
                contextFields.genre = plot.genre || '';
                contextFields.theme = plot.theme || '';
                contextFields.tone = plot.tone || '';
            }
            systemPrompt = constructSystemPrompt('title');
            maxOutputTokens = SYD_AGENTS.title.maxTokens;
            break;

        case 'logline':
            if (plot) {
                contextFields.genre = plot.genre || '';
                contextFields.theme = plot.theme || '';
                contextFields.title = plot.title || '';
            }
            systemPrompt = constructSystemPrompt('logline');
            maxOutputTokens = SYD_AGENTS.logline.maxTokens;
            break;

        case 'story_types':
            if (plot) {
                // Syd needs these to make a recommendation
                contextFields.genre = plot.genre || 'Unknown Genre';
                contextFields.theme = plot.theme || 'Unknown Theme';
                contextFields.tone = plot.tone || 'Unknown Tone';
            }
            systemPrompt = constructSystemPrompt('story_types', {
                Genre: contextFields.genre,
                Theme: contextFields.theme,
                Tone: contextFields.tone
            });
            maxOutputTokens = SYD_AGENTS.story_types.maxTokens;
            break;

        case 'character':
            // Specific character field logic
            const field = agentType.replace('character_', ''); // e.g., 'want', 'ghost'

            if (character) {
                contextFields.name = character.name;
                contextFields.role = character.role;
                // Add specific fields if they exist
                if (character.want) contextFields.want = character.want;
                if (character.need) contextFields.need = character.need;
                if (character.ghost) contextFields.ghost = character.ghost;
            }
            if (plot) {
                contextFields.logline = plot.logline || '';
                contextFields.theme = plot.theme || '';
            }

            // Determine opposing field for conflict (simple logic)
            let opposingField = 'Goal';
            if (field === 'want') opposingField = 'Need';
            if (field === 'need') opposingField = 'Want';
            if (field === 'lie') opposingField = 'Truth';

            systemPrompt = constructSystemPrompt('character', {
                TargetField: field.charAt(0).toUpperCase() + field.slice(1),
                OpposingField: opposingField
            });
            maxOutputTokens = SYD_AGENTS.character.maxTokens;
            break;

        case 'beat':
            const beatName = agentType.replace('beat_', '').replace(/_/g, ' ');
            const beatNum = getBeatNumber(agentType);

            // Context: Logline, Theme
            if (plot) {
                contextFields.logline = plot.logline || '';
                contextFields.theme = plot.theme || '';
            }

            // Context: Previous Beat Summary
            // Ideally we'd have a summary of the immediate previous beat, 
            // but for now let's use the content of the previous beat if available
            if (beats && beatNum > 1) {
                const prevBeat = beats.find(b => b.sequence === beatNum - 1);
                if (prevBeat) {
                    contextFields.previousBeatSummary = prevBeat.summary || prevBeat.content || 'N/A';
                }
            }

            // Context: Character Summaries (Protagonist)
            if (metadata && metadata.characterProfiles) {
                // Just take the first few for context
                contextFields.characterSummaries = Object.values(metadata.characterProfiles).join('\n').slice(0, 500);
            }

            systemPrompt = constructSystemPrompt('beat', {
                BeatName: beatName,
                NextBeat: 'the next story beat' // Generic for now
            });
            maxOutputTokens = SYD_AGENTS.beat.maxTokens;
            break;

        default:
            systemPrompt = "You are Syd.";
            break;
    }

    const estimatedTokens = estimateObjectTokens(contextFields) + estimateTokens(systemPrompt);

    return {
        agentType,
        systemPrompt,
        contextFields,
        estimatedTokens,
        maxOutputTokens
    };
}

// Helper: Map beat agent type to beat number
function getBeatNumber(agentType: SydAgentType): number {
    const beatMap: Record<string, number> = {
        'beat_opening_image': 1,
        'beat_theme_stated': 2,
        'beat_setup': 3,
        'beat_catalyst': 4,
        'beat_debate': 5,
        'beat_break_into_two': 6,
        'beat_b_story': 7,
        'beat_fun_and_games': 8,
        'beat_midpoint': 9,
        'beat_bad_guys_close_in': 10,
        'beat_all_is_lost': 11,
        'beat_dark_night_of_the_soul': 12,
        'beat_break_into_three': 13,
        'beat_finale': 14,
        'beat_final_image': 15
    };
    return beatMap[agentType] || 0;
}

// Helper: Validate total token budget
export function validateTokenBudget(context: SydContext, userInput: string): boolean {
    const userTokens = estimateTokens(userInput);
    const total = context.estimatedTokens + userTokens + context.maxOutputTokens;
    return total <= 2048; // Updated limit based on plan
}