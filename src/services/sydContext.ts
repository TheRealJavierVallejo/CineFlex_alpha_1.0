/*
 * 🧠 SERVICE: SYD CONTEXT (Token Budget Manager)
 * 
 * Manages context selection and token budgets for Syd micro-agents.
 * Each agent type gets only the fields it needs to stay under limits.
 * Now features specialized personas for every field type.
 */

import { PlotDevelopment, CharacterDevelopment, StoryBeat, StoryMetadata } from '../types';

// All micro-agent types
export type SydAgentType =
    | 'title'
    | 'logline'
    | 'story_types'
    | 'target_audience'
    | 'budget'
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

// Beat Definitions for specialized prompts
const BEAT_DEFINITIONS: Record<string, string> = {
    'Opening Image': 'A visual that sets the tone, mood, and style of the movie. Shows the hero\'s starting point "before" the transformation.',
    'Theme Stated': 'A character (usually not the hero) poses a question or statement that is the theme of the movie. The lesson the hero must learn.',
    'Setup': 'Shows the hero\'s "status quo" life and their flaw. Why do they need to change?',
    'Catalyst': 'The life-changing event that disrupts the status quo. The "Inciting Incident".',
    'Debate': 'The hero reacts to the Catalyst. Can I do this? Should I go? A moment of doubt.',
    'Break into Two': 'The hero makes a proactive choice to leave the old world and enter the new world (Act 2).',
    'B Story': 'The introduction of the "relationship character" (love interest, mentor, sidekick) who helps teach the theme.',
    'Fun and Games': 'The "promise of the premise". The trailer moments. The hero explores the new world.',
    'Midpoint': 'The stakes are raised. A "false victory" or "false defeat". The clock starts ticking.',
    'Bad Guys Close In': 'Internal and external forces align against the hero. The plan starts to fail.',
    'All Is Lost': 'The "whiff of death". The hero loses everything. Rock bottom.',
    'Dark Night of the Soul': 'The hero reacts to the loss. A moment of hopelessness before the realization.',
    'Break into Three': 'The "Aha!" moment. The hero realizes the truth (Theme) and finds the solution.',
    'Finale': 'The hero acts on the solution. The final showdown. The hero proves they have changed.',
    'Final Image': 'A visual mirror of the Opening Image, showing how much the hero has changed.'
};

// Heuristic token estimation
const estimateTokens = (text: string): number => Math.ceil((text || '').length / 4);
const estimateObjectTokens = (obj: any): number => estimateTokens(JSON.stringify(obj));

/**
 * Select context fields for a specific micro-agent
 * Strategy: specialized system prompts with relevant data injection.
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
    let maxOutputTokens = 300;

    // Common Context Data
    const genre = plot?.genre || "Unknown Genre";
    const theme = plot?.theme || "Unknown Theme";
    const tone = plot?.tone || "Unknown Tone";
    const setting = plot?.setting || "Unknown Setting";
    const logline = plot?.logline || "No logline defined yet";
    const title = plot?.title || "Untitled Project";
    
    // Construct audience string
    const targetRating = plot?.targetAudienceRating || "";
    const targetDesc = plot?.targetAudienceDescription || "";
    const targetAudience = [targetRating, targetDesc].filter(Boolean).join(" - ") || "";

    const storyTypesStr = plot?.storyTypes?.join(', ') || "";
    
    // --------------------------------------------------------
    // 1. FOUNDATION AGENTS
    // --------------------------------------------------------

    if (agentType === 'story_types') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.tone = tone;
        contextFields.setting = setting;
        
        systemPrompt = `You are a narrative structure expert helping a screenwriter choose the right story structure. The user is writing a ${genre} story with the theme "${theme}" and a ${tone} tone, set in ${setting}.

Suggest 2-3 narrative structures that would work well (e.g., Hero's Journey, Save the Cat, Three-Act Structure, etc.). For each structure, briefly explain WHY it fits this type of story.

Keep your response concise (3-4 sentences per structure). Be encouraging and practical.`;
        
        maxOutputTokens = 250;
    } 
    
    else if (agentType === 'target_audience') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.tone = tone;
        
        systemPrompt = `You are an audience profiling expert helping a screenwriter identify their target audience. The user is writing a ${genre} story with the theme "${theme}" and a ${tone} tone.

Suggest the ideal target audience (age range, demographics, interests). Reference similar films or shows this audience enjoys. Suggest an appropriate MPAA rating (G, PG, PG-13, R, etc.).

Keep your response concise (4-5 sentences). Be specific and practical.`;
        
        maxOutputTokens = 200;
    }

    else if (agentType === 'title') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.tone = tone;
        contextFields.setting = setting;
        if (storyTypesStr) contextFields.storyTypes = storyTypesStr;

        systemPrompt = `You are a title brainstorming expert helping a screenwriter create a compelling working title. The user is writing a ${genre} story with the theme "${theme}", a ${tone} tone, set in ${setting}.${storyTypesStr ? ` They're using the ${storyTypesStr} structure.` : ''}

Suggest 3-5 potential titles that capture the story's essence. For each title, explain in one sentence why it works. Titles should be memorable, marketable, and hint at the genre/theme.

Keep your response concise. Be creative but practical.`;

        maxOutputTokens = 200;
    }

    else if (agentType === 'logline') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.tone = tone;
        contextFields.setting = setting;
        if (title !== "Untitled Project") contextFields.title = title;
        if (storyTypesStr) contextFields.storyTypes = storyTypesStr;
        if (targetAudience) contextFields.targetAudience = targetAudience;
        
        systemPrompt = `You are a logline specialist helping a screenwriter craft a compelling one-sentence pitch. The user is writing a ${genre} story${title !== "Untitled Project" ? ` titled "${title}"` : ''} with the theme "${theme}", set in ${setting}.${storyTypesStr ? ` Using ${storyTypesStr} structure.` : ''}${targetAudience ? ` Target audience: ${targetAudience}.` : ''}

Help them create a logline using this formula: 'When [INCITING INCIDENT] happens, a [PROTAGONIST] must [ACTION] or else [STAKES].'

Ask clarifying questions if they haven't told you about their protagonist or main conflict yet. If they give you details, craft 1-2 logline options.

Be conversational and helpful.`;

        maxOutputTokens = 300;
    }

    else if (agentType === 'budget') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.setting = setting;
        if (logline && logline !== "No logline defined yet") contextFields.logline = logline;
        contextFields.budget = plot?.budget || "Unspecified";

        systemPrompt = `You are a practical filmmaking advisor helping a screenwriter work within budget constraints. The user is writing a ${genre} story set in ${setting}.${logline && logline !== "No logline defined yet" ? ` Logline: ${logline}` : ''}

Give specific, actionable advice for making this story work on their stated budget level (${contextFields.budget}). Suggest:
- Creative ways to achieve expensive elements cheaply
- Similar films that succeeded on low budgets
- What to prioritize vs. what to simplify

Be encouraging and practical. Keep response concise (5-6 sentences).`;

        maxOutputTokens = 250;
    }

    // --------------------------------------------------------
    // 2. CHARACTER AGENTS
    // --------------------------------------------------------

    else if (agentType.startsWith('character_')) {
        const charName = character?.name || "this character";
        const charRole = character?.role || "character";
        const field = agentType.replace('character_', ''); // identity, want, need, etc.

        contextFields.name = charName;
        contextFields.role = charRole;
        contextFields.genre = genre;
        contextFields.theme = theme;
        
        // Add existing arc fields for context
        if (character) {
            if (character.want) contextFields.currentWant = character.want;
            if (character.need) contextFields.currentNeed = character.need;
            if (character.lie) contextFields.currentLie = character.lie;
            if (character.ghost) contextFields.currentGhost = character.ghost;
        }

        switch (field) {
            case 'identity':
                systemPrompt = `You are a character development coach. Help flesh out ${charName}, the ${charRole} in a ${genre} story.
Suggest:
1. A unique personality trait.
2. A distinct visual detail.
3. How they embody or challenge the theme: "${theme}".`;
                break;
            case 'want':
                systemPrompt = `You are a character expert. Define the "External Want" for ${charName} (${charRole}).
This should be a concrete, visible goal they chase throughout the story.
It should be something they *think* will make them happy (but might not).
Context: Genre is ${genre}.`;
                break;
            case 'need':
                systemPrompt = `You are a character expert. Define the "Internal Need" for ${charName} (${charRole}).
This is the spiritual lesson or growth they actually require to be whole.
It usually conflicts with their "Want".
Theme: ${theme}.`;
                break;
            case 'lie':
                systemPrompt = `You are a character expert. Identify "The Lie" that ${charName} believes.
This is a misconception about themselves or the world that holds them back at the start.
It usually stems from their "Ghost" (past trauma).`;
                break;
            case 'ghost':
                systemPrompt = `You are a backstory expert. Create a "Ghost" for ${charName}.
This is a past trauma or event that haunts them and created "The Lie" they believe.
It explains why they are the way they are at the start of the movie.`;
                break;
            case 'arc':
                systemPrompt = `Summarize the Character Arc for ${charName}.
How do they change from the beginning (believing the Lie) to the end (embracing the Need)?`;
                break;
            default:
                systemPrompt = `You are a character consultant. Help develop ${charName}.`;
        }
        
        maxOutputTokens = 400;
    }

    // --------------------------------------------------------
    // 3. BEAT SHEET AGENTS
    // --------------------------------------------------------

    else if (agentType.startsWith('beat_')) {
        const beatKey = agentType.replace('beat_', '');
        // Convert snake_case to Title Case for lookup
        const beatName = beatKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        // Handle special casing for "B Story" or others if needed
        const displayBeatName = beatName === "B Story" ? "B Story" : beatName;
        const definition = BEAT_DEFINITIONS[displayBeatName] || "A key story moment.";

        contextFields.genre = genre;
        contextFields.logline = logline;
        contextFields.protagonist = character?.name || "the protagonist"; // Fallback
        
        // Find previous beat context
        if (beats) {
            const currentBeatIndex = beats.findIndex(b => b.beatName === displayBeatName);
            if (currentBeatIndex > 0) {
                const prevBeat = beats[currentBeatIndex - 1];
                contextFields.previousBeat = `${prevBeat.beatName}: ${prevBeat.content || 'Pending'}`;
            }
        }

        systemPrompt = `You are a screenplay structure expert specializing in Save the Cat.
The user needs help writing the "${displayBeatName}" beat.

DEFINITION: ${definition}

CONTEXT:
- Genre: ${genre}
- Logline: ${logline}

TASK:
Brainstorm 3 ideas for this beat that fit the story. Ensure they advance the plot and character arc.`;
        
        maxOutputTokens = 500;
    }

    // Default Fallback
    else {
        systemPrompt = "You are Syd, a helpful screenwriting assistant. Analyze the context and provide concise suggestions.";
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

/**
 * Helper to check if we are within limits
 */
export function validateTokenBudget(context: SydContext, userInput: string): boolean {
    const userTokens = estimateTokens(userInput);
    // Standard limit for local LLM context window (usually 2048 or 4096)
    // We keep a safety buffer.
    const total = context.estimatedTokens + userTokens + context.maxOutputTokens;
    return total <= 3000; 
}