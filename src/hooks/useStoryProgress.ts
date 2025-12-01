import { useMemo } from 'react';
import { PlotDevelopment, CharacterDevelopment, StoryBeat, StoryProgress } from '../types';

export const useStoryProgress = (
    plot: PlotDevelopment,
    characters: CharacterDevelopment[],
    beats: StoryBeat[]
): StoryProgress => {
    return useMemo(() => {
        // 1. Foundation: Genre, Theme, Tone
        const foundationComplete = Boolean(
            plot.genre?.trim() &&
            plot.theme?.trim() &&
            plot.tone?.trim()
        );

        // 2. Core: Title, Logline
        const coreComplete = Boolean(
            foundationComplete &&
            plot.title?.trim() &&
            plot.logline?.trim()
        );

        // 3. Characters: At least one protagonist with a name and role
        const protagonist = characters.find(c => c.role === 'protagonist' && c.name?.trim());
        const charactersComplete = Boolean(
            coreComplete &&
            protagonist
        );

        // 4. Act 1: Beats 1-6 (Opening Image to Break into Two)
        // We assume beats are ordered by sequence.
        // Save the Cat Act 1 ends at "Break into Two" (Beat 6)
        const actOneBeats = beats.filter(b => b.sequence <= 6);
        const actOneComplete = Boolean(
            charactersComplete &&
            actOneBeats.length === 6 &&
            actOneBeats.every(b => b.isComplete)
        );

        // 5. Act 2: Beats 7-12 (B Story to Dark Night of the Soul)
        const actTwoBeats = beats.filter(b => b.sequence > 6 && b.sequence <= 12);
        const actTwoComplete = Boolean(
            actOneComplete &&
            actTwoBeats.length === 6 &&
            actTwoBeats.every(b => b.isComplete)
        );

        // 6. Act 3: Beats 13-15 (Break into Three to Final Image)
        const actThreeBeats = beats.filter(b => b.sequence > 12);
        const actThreeComplete = Boolean(
            actTwoComplete &&
            actThreeBeats.length === 3 &&
            actThreeBeats.every(b => b.isComplete)
        );

        return {
            foundationComplete,
            coreComplete,
            charactersComplete,
            actOneComplete,
            actTwoComplete,
            actThreeComplete
        };
    }, [plot, characters, beats]);
};
