/*
 * 🧠 SERVICE: SYD CONTEXT (Token Budget Manager)
 * 
 * Manages context selection and token budgets for Syd micro-agents.
 * Each agent type gets only the fields it needs to stay under limits.
 * Now features specialized personas for every field type.
 */

import { PlotDevelopment, CharacterDevelopment, StoryBeat, StoryMetadata, ScriptElement, Character, StoryNote } from '../types';
import { COMMUNICATION_PROTOCOL } from './sydCommunicationProtocol';

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
    | 'story_notes'
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
    // Phase 6: Agent-specific configuration
    temperature: number;
    outputFormat: 'short' | 'medium' | 'detailed';
    enforceLength: boolean;
}

// Agent-specific configuration for temperature and output tuning
export interface AgentConfig {
    temperature: number;        // 0.0 = deterministic, 1.0 = creative
    maxOutputTokens: number;    // Token limit for response
    outputFormat: 'short' | 'medium' | 'detailed';
    enforceLength: boolean;     // Whether to strictly enforce token limits
}

// Default config for unlisted agents
const DEFAULT_AGENT_CONFIG: AgentConfig = {
    temperature: 0.7,
    maxOutputTokens: 200,
    outputFormat: 'medium',
    enforceLength: false
};

// Agent-specific configurations for optimal output (optimized for Claude)
export const AGENT_CONFIGS: Partial<Record<SydAgentType, AgentConfig>> = {
    // Foundation agents - higher creativity for brainstorming
    title: { temperature: 0.9, maxOutputTokens: 300, outputFormat: 'medium', enforceLength: false },
    logline: { temperature: 0.7, maxOutputTokens: 400, outputFormat: 'medium', enforceLength: false },
    story_types: { temperature: 0.6, maxOutputTokens: 300, outputFormat: 'medium', enforceLength: false },
    target_audience: { temperature: 0.6, maxOutputTokens: 300, outputFormat: 'medium', enforceLength: false },
    budget: { temperature: 0.7, maxOutputTokens: 400, outputFormat: 'medium', enforceLength: false },

    // Character agents - balanced creativity with detailed responses
    character_identity: { temperature: 0.8, maxOutputTokens: 250, outputFormat: 'medium', enforceLength: false },
    character_want: { temperature: 0.7, maxOutputTokens: 500, outputFormat: 'detailed', enforceLength: false },
    character_need: { temperature: 0.7, maxOutputTokens: 500, outputFormat: 'detailed', enforceLength: false },
    character_lie: { temperature: 0.7, maxOutputTokens: 500, outputFormat: 'detailed', enforceLength: false },
    character_ghost: { temperature: 0.7, maxOutputTokens: 500, outputFormat: 'detailed', enforceLength: false },
    character_strengths: { temperature: 0.6, maxOutputTokens: 400, outputFormat: 'medium', enforceLength: false },
    character_weaknesses: { temperature: 0.6, maxOutputTokens: 400, outputFormat: 'medium', enforceLength: false },
    character_arc: { temperature: 0.7, maxOutputTokens: 600, outputFormat: 'detailed', enforceLength: false },

    // Beat agents - detailed narrative responses
    beat_opening_image: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_theme_stated: { temperature: 0.7, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_setup: { temperature: 0.7, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_catalyst: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_debate: { temperature: 0.7, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_break_into_two: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_b_story: { temperature: 0.7, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_fun_and_games: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_midpoint: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_bad_guys_close_in: { temperature: 0.7, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_all_is_lost: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_dark_night_of_the_soul: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_break_into_three: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_finale: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
    beat_final_image: { temperature: 0.8, maxOutputTokens: 800, outputFormat: 'detailed', enforceLength: false },
};

// Get configuration for a specific agent type
export function getAgentConfig(agentType: SydAgentType): AgentConfig {
    return AGENT_CONFIGS[agentType] || DEFAULT_AGENT_CONFIG;
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
 * Build comprehensive project context for Claude
 * Assembles all story data into a human-readable format
 */
export function buildFullProjectContext(
    plot?: PlotDevelopment,
    allCharacters?: CharacterDevelopment[],
    allBeats?: StoryBeat[],
    metadata?: StoryMetadata
): string {
    const sections: string[] = [];

    // --- PROJECT OVERVIEW ---
    const overviewLines: string[] = ['# PROJECT OVERVIEW'];
    overviewLines.push(`Title: ${plot?.title || 'Untitled Project'}`);
    overviewLines.push(`Genre: ${plot?.genre || 'Not defined'} | Tone: ${plot?.tone || 'Not defined'} | Setting: ${plot?.setting || 'Not defined'}`);
    overviewLines.push(`Logline: ${plot?.logline || 'Not defined yet'}`);
    overviewLines.push(`Theme: ${plot?.theme || 'Not defined'}`);
    overviewLines.push(`Story Types: ${plot?.storyTypes?.join(', ') || 'Not selected'}`);

    const targetAudience = [plot?.targetAudienceRating, plot?.targetAudienceDescription]
        .filter(Boolean).join(' - ') || 'Not defined';
    overviewLines.push(`Target Audience: ${targetAudience}`);
    overviewLines.push(`Budget: ${plot?.budget || 'Not defined'}`);
    sections.push(overviewLines.join('\n'));

    // --- CHARACTERS ---
    if (allCharacters && allCharacters.length > 0) {
        const charLines: string[] = ['\n# CHARACTERS'];
        for (const char of allCharacters) {
            charLines.push(`\n## ${char.name || 'Unnamed'} - ${char.role || 'Unknown Role'}`);
            charLines.push(`Description: ${char.description || 'Not defined'}`);
            charLines.push(`Want: ${char.want || 'Not defined'}`);
            charLines.push(`Need: ${char.need || 'Not defined'}`);
            charLines.push(`Lie: ${char.lie || 'Not defined'}`);
            charLines.push(`Ghost: ${char.ghost || 'Not defined'}`);
            charLines.push(`Strengths: ${char.strengths || 'Not defined'}`);
            charLines.push(`Weaknesses: ${char.weaknesses || 'Not defined'}`);
            charLines.push(`Arc: ${char.arcSummary || char.characterArc || 'Not defined'}`);
        }
        sections.push(charLines.join('\n'));
    }

    // --- STORY BEATS ---
    if (allBeats && allBeats.length > 0) {
        const beatLines: string[] = ['\n# STORY BEATS (Save the Cat Structure)'];

        // Define beat order for chronological display
        const beatOrder = [
            'Opening Image', 'Theme Stated', 'Setup', 'Catalyst', 'Debate',
            'Break into Two', 'B Story', 'Fun and Games', 'Midpoint',
            'Bad Guys Close In', 'All is Lost', 'Dark Night of the Soul',
            'Break into Three', 'Finale', 'Final Image'
        ];

        for (const beatName of beatOrder) {
            const beat = allBeats.find(b => b.beatName === beatName);
            if (beat) {
                // Trim to first 200 chars if too long
                let content = beat.content || 'Not defined yet';
                if (content.length > 200) {
                    content = content.substring(0, 200) + '...';
                }
                beatLines.push(`\n## ${beatName}`);
                beatLines.push(content);
            }
        }
        sections.push(beatLines.join('\n'));
    }

    // --- PROJECT SUMMARIES ---
    if (metadata) {
        const summaryLines: string[] = ['\n# PROJECT SUMMARIES'];
        if (plot?.foundationSummary) summaryLines.push(`Foundation Summary: ${plot.foundationSummary}`);
        if (plot?.coreSummary) summaryLines.push(`Core Summary: ${plot.coreSummary}`);
        if (metadata?.actOneSummary) summaryLines.push(`Act 1 Summary: ${metadata.actOneSummary}`);
        if (metadata?.actTwoASummary) summaryLines.push(`Act 2A Summary: ${metadata.actTwoASummary}`);
        if (metadata?.actTwoBSummary) summaryLines.push(`Act 2B Summary: ${metadata.actTwoBSummary}`);
        if (metadata?.actThreeSummary) summaryLines.push(`Act 3 Summary: ${metadata.actThreeSummary}`);
        if (summaryLines.length > 1) { // Check if there's more than just the header
            sections.push(summaryLines.join('\n'));
        }
    }

    return sections.join('\n\n');
}

/**
 * Select context fields for a specific micro-agent
 * Strategy: specialized system prompts with relevant data injection.
 */
export function selectContextForAgent(
    agentType: SydAgentType,
    plot?: PlotDevelopment,
    character?: CharacterDevelopment,
    beats?: StoryBeat[],
    metadata?: StoryMetadata,
    allCharacters?: CharacterDevelopment[], // ADD THIS
    storyNotes?: string, // ADD THIS - raw markdown content from Story Notes
    scriptContent?: string, // ADD THIS - formatted script content
    isProMode?: boolean // ADD THIS
): SydContext {
    const contextFields: Record<string, any> = {};
    let systemPrompt = '';
    let maxOutputTokens = 300;

    // Pro Mode: Inject FULL project context for all agents
    if (isProMode) {
        const fullProjectContext = buildFullProjectContext(plot, allCharacters || [], beats || [], metadata);

        contextFields.fullProjectContext = fullProjectContext;

        if (storyNotes && storyNotes.trim().length > 0) {
            contextFields.storyNotes = storyNotes;
        }

        if (scriptContent && scriptContent.trim().length > 0) {
            contextFields.scriptContent = scriptContent;
        }
    }

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

        // Extra story context for character agents
        contextFields.tone = tone;
        contextFields.setting = setting;
        if (title !== "Untitled Project") {
            contextFields.title = title;
        }
        if (logline && logline !== "No logline defined yet") {
            contextFields.logline = logline;
        }
        if (storyTypesStr) {
            contextFields.storyTypes = storyTypesStr;
        }
        if (targetAudience) {
            contextFields.targetAudience = targetAudience;
        }

        // Compact summaries if available (all of these are short by design)
        if (plot?.foundationSummary) {
            contextFields.foundationSummary = plot.foundationSummary;
        }
        if (plot?.coreSummary) {
            contextFields.coreSummary = plot.coreSummary;
        }
        if (metadata?.actOneSummary) {
            contextFields.actOneSummary = metadata.actOneSummary;
        }

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

RESPONSE GUIDELINES:
- Write 2-4 paragraphs naturally (conversational but thorough)
- Reference other parts of the project when relevant
- Include specific examples where helpful
- Ask clarifying questions if the user's request is vague

TASK:
Use the userMessage to decide what they need:
- If they ask for NAME ideas, suggest 3-5 name options that fit the genre and role, explaining the reasoning behind each choice.
- If they ask about AGE, give concrete age or age-range suggestions with reasoning about how age affects their role in the story.
- If they ask for a DESCRIPTION, provide a rich character description covering appearance, personality, mannerisms, and how they fit into the story world.`;
                break;

            case 'want':
                systemPrompt = `You are a professional screenwriter defining a character's external "Want" (plot goal).

CONTEXT:
- Story genre: ${genre} ${tone !== 'Unknown Tone' ? `(${tone} tone)` : ''}
- Story theme: "${theme}"
- Setting: ${setting}
- Title: ${title !== 'Untitled Project' ? `"${title}"` : 'Untitled Project'}
- Logline: ${logline !== 'No logline defined yet' ? logline : 'Not defined yet'}
- Story types: ${storyTypesStr || 'Not selected yet'}
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Want = ${contextFields.currentWant || 'not defined yet'}, Need = ${contextFields.currentNeed || 'not defined yet'}

RESPONSE GUIDELINES:
- Write 2-4 paragraphs naturally (conversational but thorough)
- Reference other parts of the project when relevant (other characters, beats, theme)
- Include specific examples or mini-scenes where helpful
- Ask clarifying questions if the user's request is vague

TASK:
Define ${charName}'s clear, visible external goal. Write 2-3 paragraphs:
1. State the Want clearly and specifically
2. Explain how it creates conflict with other story elements or characters
3. Suggest 1-2 specific scenes where this Want could drive action

Make the Want tangible, hard to achieve, and create compelling conflict.`;
                break;

            case 'need':
                systemPrompt = `You are a professional screenwriter defining a character's internal "Need" (emotional growth).

CONTEXT:
- Story theme: "${theme}"
- Genre: ${genre} ${tone !== 'Unknown Tone' ? `(${tone} tone)` : ''}
- Setting: ${setting}
- Logline: ${logline !== 'No logline defined yet' ? logline : 'Not defined yet'}
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Want = ${contextFields.currentWant || 'not defined yet'}, Need = ${contextFields.currentNeed || 'not defined yet'}, Lie = ${contextFields.currentLie || 'not defined yet'}

RESPONSE GUIDELINES:
- Write 2-4 paragraphs naturally (conversational but thorough)
- Reference other parts of the project when relevant (theme, other characters)
- Include specific examples or mini-scenes where helpful
- Ask clarifying questions if the user's request is vague

TASK:
Define what ${charName} secretly needs to learn, accept, or become. Write 2-3 paragraphs:
1. State the Need clearly and how it differs from their Want
2. Explain the inner conflict this creates, especially regarding the theme
3. Suggest moments in the story where this Need could become visible

Make the Need feel psychologically true and dramatically compelling.`;
                break;

            case 'lie':
                systemPrompt = `You are a professional screenwriter defining "The Lie" a character believes.

CONTEXT:
- Story genre: ${genre}
- Story theme: "${theme}"
- Setting: ${setting}
- Logline: ${logline !== 'No logline defined yet' ? logline : 'Not defined yet'}
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Lie = ${contextFields.currentLie || 'not defined yet'}, Ghost = ${contextFields.currentGhost || 'not defined yet'}

RESPONSE GUIDELINES:
- Write 2-4 paragraphs naturally (conversational but thorough)
- Reference other parts of the project when relevant (Ghost, Need, theme)
- Include specific examples of how this Lie manifests in behavior
- Ask clarifying questions if the user's request is vague

TASK:
Define the core false belief ${charName} holds. Write 2-3 paragraphs:
1. State the Lie clearly (about themselves, others, or the world)
2. Explain why this belief is emotionally understandable given their Ghost
3. Show how this Lie will drive bad decisions and conflict throughout the story

Make the Lie feel psychologically real but clearly wrong from the audience's perspective.`;
                break;

            case 'ghost':
                systemPrompt = `You are a professional screenwriter defining a character's "Ghost" — the past wound that created their Lie.

CONTEXT:
- Story genre: ${genre}
- Setting: ${setting}
- Logline: ${logline !== 'No logline defined yet' ? logline : 'Not defined yet'}
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Lie = ${contextFields.currentLie || 'not defined yet'}, Ghost = ${contextFields.currentGhost || 'not defined yet'}

RESPONSE GUIDELINES:
- Write 2-4 paragraphs naturally (conversational but thorough)
- Reference other parts of the project when relevant (Lie, Want, Need)
- Include vivid details that bring the past wound to life
- Ask clarifying questions if the user's request is vague

TASK:
Define ${charName}'s Ghost (the past wound). Write 2-3 paragraphs:
1. Describe the specific event or situation (who, what, when, where)
2. Explain how this created their Lie and defensive patterns
3. Show how echoes of this wound appear in the present story

Make the Ghost feel like a real formative experience that still haunts them.`;
                break;

            case 'strengths':
                systemPrompt = `You are a professional screenwriter defining the most story-relevant strengths of a character.

CONTEXT:
- Story genre: ${genre} ${tone !== 'Unknown Tone' ? `(${tone} tone)` : ''}
- Logline: ${logline !== 'No logline defined yet' ? logline : 'Not defined yet'}
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Strengths = ${charStrengths || 'not defined yet'}

RESPONSE GUIDELINES:
- Write 2-4 paragraphs naturally (conversational but thorough)
- Reference other parts of the project when relevant (Want, other characters)
- Include examples of how strengths manifest in specific situations
- Ask clarifying questions if the user's request is vague

TASK:
Define ${charName}'s key strengths. Write 2-3 paragraphs:
1. List 3-5 strengths, skills, or resources with brief explanations
2. Show how each strength helps them pursue their Want
3. Explain how these strengths could also create complications, rivalries, or moral dilemmas

Choose strengths that are dramatically useful but also have a shadow side.`;
                break;

            case 'weaknesses':
                systemPrompt = `You are a professional screenwriter defining a character's most dramatic weaknesses and flaws.

CONTEXT:
- Story genre: ${genre} ${tone !== 'Unknown Tone' ? `(${tone} tone)` : ''}
- Story theme: "${theme}"
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Existing notes: Weaknesses = ${charWeaknesses || 'not defined yet'}, Lie = ${contextFields.currentLie || 'not defined yet'}, Ghost = ${contextFields.currentGhost || 'not defined yet'}

RESPONSE GUIDELINES:
- Write 2-4 paragraphs naturally (conversational but thorough)
- Reference other parts of the project when relevant (Lie, Ghost, relationships)
- Include examples of how weaknesses manifest in behavior
- Ask clarifying questions if the user's request is vague

TASK:
Define ${charName}'s key weaknesses. Write 2-3 paragraphs:
1. List 3-5 weaknesses, flaws, or vulnerabilities with explanations
2. Connect each flaw to their Lie and Ghost for psychological consistency
3. Show how these weaknesses interfere with their Want and relationships

Make the flaws feel like natural consequences of their backstory.`;
                break;

            case 'arc':
                systemPrompt = `You are a professional screenwriter summarizing a character arc for a beat sheet.

CONTEXT:
- Story genre: ${genre}
- Story theme: "${theme}"
- Logline: ${logline !== 'No logline defined yet' ? logline : 'Not defined yet'}
- Character: ${charName}, the ${charRole}${charArchetype ? ` (${charArchetype} archetype)` : ''}
- Notes: Want = ${contextFields.currentWant || 'not defined yet'}, Need = ${contextFields.currentNeed || 'not defined yet'}, Lie = ${contextFields.currentLie || 'not defined yet'}, Ghost = ${contextFields.currentGhost || 'not defined yet'}, Strengths = ${charStrengths || 'not defined yet'}, Weaknesses = ${charWeaknesses || 'not defined yet'}, Arc Summary = ${charArcSummary || 'not defined yet'}

RESPONSE GUIDELINES:
- Write 2-4 paragraphs naturally (conversational but thorough)
- Reference other parts of the project when relevant (all character elements, beats)
- Include specific moments that could mark key transformation points
- Ask clarifying questions if the user's request is vague

TASK:
Define ${charName}'s transformation arc. Write 2-3 paragraphs:
1. Describe who they are at the beginning (Want, Lie, defensive patterns)
2. Explain the collision between Want, Need, Lie, and Ghost that forces change
3. Show who they become by the finale and what they've learned

Make the arc feel earned through story events, not just stated.`;
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

        // --- CONTEXT POPULATION START ---
        contextFields.genre = genre;
        contextFields.theme = theme;
        contextFields.tone = tone;
        contextFields.setting = setting;
        contextFields.logline = logline;
        contextFields.protagonist = character?.name || "the protagonist";

        if (title !== "Untitled Project") {
            contextFields.title = title;
        }
        if (storyTypesStr) {
            contextFields.storyTypes = storyTypesStr;
        }
        // Summaries
        if (plot?.foundationSummary) {
            contextFields.foundationSummary = plot.foundationSummary;
        }
        if (plot?.coreSummary) {
            contextFields.coreSummary = plot.coreSummary;
        }
        if (metadata?.actOneSummary) {
            contextFields.actOneSummary = metadata.actOneSummary;
        }

        // Find previous beat context
        if (beats) {
            const currentBeatIndex = beats.findIndex(b => b.beatName === displayBeatName);
            if (currentBeatIndex > 0) {
                const prevBeat = beats[currentBeatIndex - 1];
                contextFields.previousBeat = `${prevBeat.beatName}: ${prevBeat.content || 'Pending'}`;
            }
        }
        // --- CONTEXT POPULATION END ---

        // Specialized Prompt for Opening Image
        if (displayBeatName === "Opening Image") {
            systemPrompt = `You are a screenplay structure expert focusing on the "Opening Image" beat in the Save the Cat structure.

BEAT:
"Opening Image"

DEFINITION:
${definition}

CONTEXT:
- Genre: ${genre} ${tone !== 'Unknown Tone' ? `(${tone} tone)` : ''}
- Theme: "${theme}"
- Setting: ${setting}
- Title: ${title !== 'Untitled Project' ? `"${title}"` : 'Untitled Project'}
- Logline: ${logline !== 'No logline defined yet' ? logline : 'Not defined yet'}

RESPONSE GUIDELINES:
- If user has existing ideas, REFINE and OPTIMIZE them - don't reinvent
- Ask clarifying questions if the user's request is vague
- Suggest 2-3 strong approaches for this beat
- For each approach, write 2-3 paragraphs explaining:
  • The core visual moment (what we SEE and HEAR)
  • How it establishes the protagonist's "before" state
  • A mini-scene example showing it in action
- Focus on visual storytelling that hints at the coming conflict and theme

TASK:
Help the user develop their Opening Image that visually captures the protagonist's everyday world and flaw, setting up the transformation to come.`;
            maxOutputTokens = 800;
        } else {
            // Generic Prompt for other beats
            systemPrompt = `You are a screenplay structure expert specializing in the Save the Cat 15-beat story template.

BEAT:
"${displayBeatName}"

DEFINITION:
${definition}

CONTEXT:
- Genre: ${genre} ${tone !== 'Unknown Tone' ? `(${tone} tone)` : ''}
- Theme: "${theme}"
- Setting: ${setting}
- Title: ${title !== 'Untitled Project' ? `"${title}"` : 'Untitled Project'}
- Logline: ${logline !== 'No logline defined yet' ? logline : 'Not defined yet'}
- Story types: ${storyTypesStr || 'Not selected yet'}
- Previous beat: ${contextFields.previousBeat || 'None yet'}

RESPONSE GUIDELINES:
- If user has existing ideas, REFINE and OPTIMIZE them - don't reinvent
- Ask clarifying questions if the user's request is vague
- Suggest 2-3 strong approaches for this beat
- For each approach, write 2-3 paragraphs explaining:
  • The core dramatic moment
  • How it connects to the character arc and theme
  • A mini-scene example showing it in action
- Reference earlier beats naturally (e.g., "Building on the Catalyst...")

TASK:
Help the user develop their "${displayBeatName}" beat in ways that move the plot forward and deepen the protagonist's arc.`;
            maxOutputTokens = 800;
        }
    }

    // --------------------------------------------------------
    // 4. STORY NOTES AGENT
    // --------------------------------------------------------
    else if (agentType === 'story_notes') {
        systemPrompt = `You are SYD, a professional screenwriting assistant helping with story development notes.

Your role:
- Help organize and develop story ideas
- Suggest connections between notes
- Assist with research and world-building
- Brainstorm plot points and character arcs
- Provide feedback on story structure

Context available:
- Current note: ${contextFields.currentNoteTitle || 'Untitled'}
- All notes: ${contextFields.allNoteTitles || 'None'}
- Note content: ${contextFields.currentNoteContent || 'Empty'}

Be concise, actionable, and focused on enhancing the story.`;

        maxOutputTokens = 800;
    }

    // Default Fallback
    else {
        systemPrompt = "You are Syd, a helpful screenwriting assistant. Analyze the context and provide concise suggestions.";
    }

    if (isProMode && contextFields.fullProjectContext) {
        const proContextPrefix = `
# FULL PROJECT CONTEXT AVAILABLE

You have access to the complete project context below. Reference this information when providing suggestions.

${contextFields.fullProjectContext}

${contextFields.storyNotes ? `\n# STORY NOTES\n${contextFields.storyNotes}\n` : ''}

${contextFields.scriptContent ? `\n# SCRIPT CONTENT\n${contextFields.scriptContent}\n` : ''}

---

`;

        systemPrompt = proContextPrefix + systemPrompt;
    }

    // Prepend the communication protocol to ALL agent system prompts
    // This ensures every agent follows the listening-first rules
    const enhancedSystemPrompt = COMMUNICATION_PROTOCOL + systemPrompt;

    const estimatedTokens = isProMode
        ? estimateObjectTokens(contextFields) + estimateTokens(enhancedSystemPrompt) + 5000 // Add buffer for full context
        : estimateObjectTokens(contextFields) + estimateTokens(enhancedSystemPrompt);

    // Get agent-specific configuration
    const config = getAgentConfig(agentType);

    return {
        agentType,
        systemPrompt: enhancedSystemPrompt,
        contextFields,
        estimatedTokens,
        maxOutputTokens: isProMode ? 1500 : config.maxOutputTokens, // Increase for Pro with full context
        temperature: config.temperature,
        outputFormat: config.outputFormat,
        enforceLength: config.enforceLength
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