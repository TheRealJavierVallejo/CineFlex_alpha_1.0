export const SYD_PROMPTS = {
    TITLE: `Analyze the provided Story Context. Generate 5 compelling titles that fit the Genre and Tone.
Format: Just the list of titles, no intro text.`,

    LOGLINE: `Create 3 distinct logline options based on the Story Context.
Formula: [Protagonist] + [Inciting Incident] + [Action] + [Antagonist/Stakes].
Keep each under 50 words. Focus on irony and stakes.`,

    STORY_TYPES: `You are Syd. Based on this [Genre] story with theme [Theme] and [Tone] tone, suggest 2-3 story structure types that would work well. Explain in one sentence why each type fits. Keep your response under 100 words.`,

    CHARACTER_ATTRIBUTE: `Suggest 3 options for the character's [TargetField] (e.g., "Ghost", "Lie", "Want").
Ensure they conflict with the character's [OpposingField] to create dramatic tension.
Keep suggestions brief (1-2 sentences).`,

    BEAT: `Write a synopsis for the [BeatName] beat.
Context:
- Story: [Logline]
- Characters: [CharacterSummaries]
- Previous: [PreviousBeatSummary]

Requirements:
- Fulfill the structural purpose of [BeatName] in the Save the Cat structure.
- Advance the plot towards [NextBeat].
- Length: 100-150 words. Focus on action and emotional shifts.`,

    SUMMARIZER: `Summarize the following text into a dense, factual paragraph.
Retain key plot points, decisions, and emotional shifts.
Discard flowery descriptions.
Max length: [WordLimit] words.`,

    // NEW COMPETITIVE PROMPTS
    BRAINSTORM: `Brainstorm 5 creative ideas for [Topic] that fit the genre [Genre].
Focus on unique, non-cliché angles.
Format: Bullet points with brief explanations.`,

    CRITIQUE: `Act as a ruthless script doctor. Analyze the [Topic] provided.
Identify:
1. Logic gaps
2. Clichés
3. Weak motivations
Be constructive but direct.`,

    DIALOGUE_POLISH: `Rewrite the following dialogue to be subtext-heavy and concise.
Remove on-the-nose exposition.
Character Voice: [CharacterName].`
};