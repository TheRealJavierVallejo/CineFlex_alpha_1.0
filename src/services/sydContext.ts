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
    | 'character_strengths'
    | 'character_weaknesses'
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
    // 1. FOUNDATION AGENTS (Short & Snappy)
    // --------------------------------------------------------

    if (agentType === 'story_types') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.tone = tone;
        contextFields.setting = setting;
        
        systemPrompt = `You are a story structure consultant. The user is writing a ${genre} story with the theme "${theme}", ${tone} tone, set in ${setting}.

Based on this, pick the 1-2 BEST options from their dropdown menu:
• Coming of Age
• Fish Out of Water
• Revenge Story
• Love Story
• Underdog Story
• Redemption Arc

Give a SHORT response (2-3 sentences max). Just tell them which option(s) fit best and why in ONE sentence per option. Then ask: "Want me to explain more about any of these?"

Be brief and decisive.`;
        
        maxOutputTokens = 150;
    } 
    
    else if (agentType === 'target_audience') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.tone = tone;
        contextFields.setting = setting;
        
        systemPrompt = `You are an audience expert. The user is writing a ${genre} story with "${theme}" theme, ${tone} tone, set in ${setting}.

Give a SHORT answer (2-3 sentences):
1. What rating (G/PG/PG-13/R) fits best
2. Who's the core audience (age + demographics)

Then ask: "Want me to suggest similar films they'd enjoy?"

Be brief and specific.`;
        
        maxOutputTokens = 120;
    }

    else if (agentType === 'title') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.tone = tone;
        contextFields.setting = setting;
        if (storyTypesStr) contextFields.storyTypes = storyTypesStr;

        systemPrompt = `You are a title expert. The user is writing a ${genre} story with "${theme}" theme, ${tone} tone, set in ${setting}.${storyTypesStr ? ` Story type: ${storyTypesStr}.` : ''}

Suggest 3 title options in this format:
• **Title One**
• **Title Two**
• **Title Three**

Then ask: "Want me to explain why these work?"

Keep it BRIEF - just the titles.`;

        maxOutputTokens = 100;
    }

    else if (agentType === 'logline') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.tone = tone;
        contextFields.setting = setting;
        if (title !== "Untitled Project") contextFields.title = title;
        if (storyTypesStr) contextFields.storyTypes = storyTypesStr;
        
        systemPrompt = `You are a logline specialist. The user is writing a ${genre} story${title !== "Untitled Project" ? ` titled "${title}"` : ''} with "${theme}" theme, set in ${setting}.${storyTypesStr ? ` Story type: ${storyTypesStr}.` : ''}

A logline is ONE sentence: "When [INCITING INCIDENT] happens, a [PROTAGONIST] must [ACTION] or else [STAKES]."

If the user hasn't told you their protagonist or main conflict yet, ask 2-3 SHORT questions:
• Who's your protagonist?
• What kicks off the story?
• What are the stakes?

If they give you details, write 1 logline option.

Keep responses SHORT (2-3 sentences max).`;

        maxOutputTokens = 150;
    }

    else if (agentType === 'budget') {
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.setting = setting;
        if (logline && logline !== "No logline defined yet") contextFields.logline = logline;

        systemPrompt = `You are a low-budget filmmaking expert. The user is writing a ${genre} story set in ${setting}.${logline && logline !== "No logline defined yet" ? ` Logline: ${logline}` : ''}

Give 2-3 SHORT, specific tips for their budget level:
• One creative cost-saving trick
• One similar low-budget film to study
• One thing to prioritize spending on

Keep it BRIEF (3-4 sentences total). Then ask: "Want more budget tips?"`;

        maxOutputTokens = 150;
    }

    // --------------------------------------------------------
    // 2. CHARACTER AGENTS
    // --------------------------------------------------------

    else if (agentType.startsWith('character_')) {
        const charName = character?.name || "this character";
        const charRole = character?.role || "character";
        const field = agentType.replace('character_', ''); // identity, want, need, etc.

        const charArchetype = character?.archetype || "";
        const charDescription = character?.description || "";
        const charStrengths = character?.strengths || "";
        const charWeaknesses = character?.weaknesses || "";
        const charArcSummary = character?.arcSummary || "";

        contextFields.name = charName;
        contextFields.role = charRole;
        contextFields.genre = genre;
        contextFields.theme = theme;
        
        if (charArchetype) contextFields.archetype = charArchetype;
        if (charDescription) contextFields.description = charDescription;
        if (charStrengths) contextFields.strengths = charStrengths;
        if (charWeaknesses) contextFields.weaknesses = charWeaknesses;
        if (charArcSummary) contextFields.arcSummary = charArcSummary;
        
        // Add existing arc fields for context
        if (character) {
            if (character.want) contextFields.currentWant = character.want;
            if (character.need) contextFields.currentNeed = character.need;
            if (character.lie) contextFields.currentLie = character.lie;
            if (character.ghost) contextFields.currentGhost = character.ghost;
        }

        switch (field) {
            case 'identity':
                systemPrompt = `You are a professional screenwriter helping the user with very short character identity fields: name, age, and a brief description.

CONTEXT:
- Story genre: ${genre}
- Story theme: "${theme}"
- Character role: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}

You will receive a userMessage in the context that tells you what they want.

HARD RULES (IMPORTANT):
- Your entire reply must be a SINGLE short paragraph (no line breaks).
- Maximum 2 sentences.
- Maximum about 35–40 words.
- Do NOT write backstory, mini-scenes, or long emotional monologues.

TASK:
Use the userMessage to decide what they need:
- If they ask for NAME ideas, suggest 3 concise name options that fit the genre and role, in ONE short sentence, separated by commas.
- If they ask about AGE (e.g. "How old should they be?"), give 1–2 concrete age or age-range suggestions plus a very brief reason, in 1–2 short sentences total.
- If they ask for a DESCRIPTION, write 1–2 crisp sentences that could be pasted directly into a “Character Description” field (appearance, personality, and role), staying under about 35–40 words.

Always obey the HARD RULES above.`;
                break;

            case 'want':
                systemPrompt = `You are a professional screenwriter defining a character's external "Want" (plot goal).

CONTEXT:
- Story genre: ${genre}
- Story theme: "${theme}"
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Want = ${contextFields.currentWant || 'not defined yet'}, Need = ${contextFields.currentNeed || 'not defined yet'}

HARD RULES:
- Your entire reply must be ONE short paragraph (no line breaks).
- Maximum 2–3 sentences.
- Maximum about 45–60 words.
- Do NOT write an opening scene, worldbuilding prose, or a long backstory.

TASK:
State ${charName}'s clear, visible external goal in this story, in plain language that fits in a "Want (External Goal)" field.
Make it specific, hard to achieve, and clearly capable of creating conflict with other characters or the world.`;
                break;

            case 'need':
                systemPrompt = `You are a professional screenwriter defining a character's internal "Need" (emotional growth).

CONTEXT:
- Story theme: "${theme}"
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Want = ${contextFields.currentWant || 'not defined yet'}, Need = ${contextFields.currentNeed || 'not defined yet'}, Lie = ${contextFields.currentLie || 'not defined yet'}

HARD RULES:
- Your entire reply must be ONE short paragraph (no line breaks).
- Maximum 2–3 sentences.
- Maximum about 45–60 words.
- Do NOT write an opening scene, worldbuilding prose, or a long backstory.

TASK:
Describe what ${charName} secretly needs to learn, accept, or become in order to be whole.
Make sure this Need is different from their Want and creates inner conflict, especially around the story's theme.`;
                break;

            case 'lie':
                systemPrompt = `You are a professional screenwriter defining "The Lie" a character believes.

CONTEXT:
- Story genre: ${genre}
- Story theme: "${theme}"
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Lie = ${contextFields.currentLie || 'not defined yet'}, Ghost = ${contextFields.currentGhost || 'not defined yet'}

HARD RULES:
- Your entire reply must be ONE short paragraph (no line breaks).
- Maximum 2–3 sentences.
- Maximum about 45–60 words.
- Do NOT write an opening scene, worldbuilding prose, or a long backstory.

TASK:
Describe the core false belief ${charName} holds about themself, other people, or the world that blocks their growth.
Make this Lie emotionally understandable but clearly wrong in a way that will drive bad decisions and conflict throughout the story.`;
                break;

            case 'ghost':
                systemPrompt = `You are a professional screenwriter defining a character's "Ghost" — the past wound that created their Lie.

CONTEXT:
- Story genre: ${genre}
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Lie = ${contextFields.currentLie || 'not defined yet'}, Ghost = ${contextFields.currentGhost || 'not defined yet'}

HARD RULES:
- Your entire reply must be ONE short paragraph (no line breaks).
- Maximum 2–3 sentences.
- Maximum about 45–60 words.
- Do NOT write an opening scene, worldbuilding prose, or a long backstory.

TASK:
Describe one clear past event or situation that explains why ${charName} believes their current Lie.
Make it simple but specific (who, what, where) and show how it echoes into the present story.`;
                break;

            case 'strengths':
                systemPrompt = `You are a professional screenwriter defining the most story-relevant strengths of a character.

CONTEXT:
- Story genre: ${genre}
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Strengths = ${charStrengths || 'not defined yet'}

HARD RULES:
- Your entire reply must be ONE short paragraph (no line breaks).
- Maximum 2–3 sentences.
- Maximum about 45–60 words.
- Do NOT write an opening scene, worldbuilding prose, or a long backstory.

TASK:
Describe 2–4 key strengths, skills, or resources that help ${charName} pursue their Want and navigate the plot.
Choose strengths that can also create complications, rivalries, or moral dilemmas — not just neutral "good" traits.`;
                break;

            case 'weaknesses':
                systemPrompt = `You are a professional screenwriter defining a character's most dramatic weaknesses and flaws.

CONTEXT:
- Story genre: ${genre}
- Story theme: "${theme}"
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Weaknesses = ${charWeaknesses || 'not defined yet'}, Lie = ${contextFields.currentLie || 'not defined yet'}, Ghost = ${contextFields.currentGhost || 'not defined yet'}

HARD RULES:
- Your entire reply must be ONE short paragraph (no line breaks).
- Maximum 2–3 sentences.
- Maximum about 45–60 words.
- Do NOT write an opening scene, worldbuilding prose, or a long backstory.

TASK:
Describe 2–4 key weaknesses, flaws, or vulnerabilities that repeatedly get ${charName} into trouble.
Tie these flaws to their Lie and Ghost so they feel psychologically consistent, and make sure they interfere with their Want and relationships.`;
                break;

            case 'arc':
                systemPrompt = `You are a professional screenwriter summarizing a character arc for a beat sheet.

CONTEXT:
- Story genre: ${genre}
- Story theme: "${theme}"
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Notes: Want = ${contextFields.currentWant || 'not defined yet'}, Need = ${contextFields.currentNeed || 'not defined yet'}, Lie = ${contextFields.currentLie || 'not defined yet'}, Ghost = ${contextFields.currentGhost || 'not defined yet'}, Strengths = ${charStrengths || 'not defined yet'}, Weaknesses = ${charWeaknesses || 'not defined yet'}, Arc Summary = ${charArcSummary || 'not defined yet'}

HARD RULES:
- Your entire reply must be ONE short paragraph (no line breaks).
- Maximum 2–3 sentences.
- Maximum about 45–60 words.
- Do NOT write an opening scene, worldbuilding prose, or a long backstory.

TASK:
Describe how ${charName} changes from the beginning to the end of the story.
Show how their Want, Need, Lie, and Ghost collide to create change, and briefly state how they end up different by the finale.`;
                break;

            default:
                systemPrompt = `You are a character consultant. Help develop ${charName} with concise, conflict-focused suggestions (3–4 sentences max).`;
        }
        
        if (field === 'identity') {
            maxOutputTokens = 80; // very short replies for name/age/description
        } else if (['want', 'need', 'lie', 'ghost', 'strengths', 'weaknesses', 'arc'].includes(field)) {
            maxOutputTokens = 120; // concise 2–3 sentence replies
        } else {
            maxOutputTokens = 200;
        }
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