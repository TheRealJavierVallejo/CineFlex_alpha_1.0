export const SYD_PROMPTS = {
    TITLE: `Analyze the provided Story Context. Generate 5 compelling titles that fit the Genre and Tone.
Format: Just the list of titles, no intro text.`,

    LOGLINE: `Create 3 distinct logline options based on the Story Context.
Formula: [Protagonist] + [Inciting Incident] + [Action] + [Antagonist/Stakes].
Keep each under 50 words.`,

    CHARACTER_ATTRIBUTE: `Suggest 3 options for the character's [TargetField] (e.g., "Ghost", "Lie", "Want").
Ensure they conflict with the character's [OpposingField] to create dramatic tension.
Keep suggestions brief (1-2 sentences).`,

    BEAT: `Write a synopsis for the [BeatName] beat.
Context:
- Story: [Logline]
- Characters: [CharacterSummaries]
- Previous: [PreviousBeatSummary]

Requirements:
- Fulfill the structural purpose of [BeatName].
- Advance the plot towards [NextBeat].
- Length: 100-150 words.`,

    SUMMARIZER: `Summarize the following text into a dense, factual paragraph.
Retain key plot points, decisions, and emotional shifts.
Discard flowery descriptions.
Max length: [WordLimit] words.`
};