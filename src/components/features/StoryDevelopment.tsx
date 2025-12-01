/*
 * 📖 COMPONENT: STORY DEVELOPMENT (Main View)
 * Progressive disclosure interface for plot, character arcs, and story beats
 * Uses Syd micro-agents for assistance
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Lock, Check } from 'lucide-react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { useLocalLlm } from '../../context/LocalLlmContext';
import { useSubscription } from '../../context/SubscriptionContext';
import {
    getPlotDevelopment,
    savePlotDevelopment,
    getCharacterDevelopments,
    saveCharacterDevelopments,
    getStoryBeats,
    saveStoryBeats,
    getStoryMetadata,
    saveStoryMetadata
} from '../../services/storage';
import { selectContextForAgent, SydAgentType, SydContext } from '../../services/sydContext';
import type { PlotDevelopment, CharacterDevelopment, StoryBeat, StoryMetadata } from '../../types';
import { CollapsibleSection } from './story/CollapsibleSection';
import { FieldWithSyd } from './story/FieldWithSyd';
import { CharacterCard } from './story/CharacterCard';
import { BeatCard } from './story/BeatCard';
import { SydPopoutPanel } from './SydPopoutPanel';
import { useStoryProgress } from '../../hooks/useStoryProgress';
import { summarizer } from '../../services/syd/summarizer';

// Save the Cat beat names
const STORY_BEAT_NAMES = [
    'Opening Image', 'Theme Stated', 'Setup', 'Catalyst', 'Debate',
    'Break into Two', 'B Story', 'Fun and Games', 'Midpoint',
    'Bad Guys Close In', 'All Is Lost', 'Dark Night of the Soul',
    'Break into Three', 'Finale', 'Final Image'
];

const BEAT_AGENT_TYPES: SydAgentType[] = [
    'beat_opening_image', 'beat_theme_stated', 'beat_setup', 'beat_catalyst', 'beat_debate',
    'beat_break_into_two', 'beat_b_story', 'beat_fun_and_games', 'beat_midpoint',
    'beat_bad_guys_close_in', 'beat_all_is_lost', 'beat_dark_night_of_the_soul',
    'beat_break_into_three', 'beat_finale', 'beat_final_image'
];

export const StoryDevelopment: React.FC = () => {
    const { project, showToast } = useWorkspace();
    const { isReady, generateMicroAgent, initModel, isModelCached } = useLocalLlm();
    const { tier } = useSubscription();

    // Data State
    const [plot, setPlot] = useState<PlotDevelopment>({});
    const [characters, setCharacters] = useState<CharacterDevelopment[]>([]);
    const [beats, setBeats] = useState<StoryBeat[]>([]);
    const [metadata, setMetadata] = useState<StoryMetadata>({ lastUpdated: Date.now() });
    const [isLoading, setIsLoading] = useState(false);

    // Syd State
    const [activeSydField, setActiveSydField] = useState<string | null>(null);
    const [sydContext, setSydContext] = useState<SydContext | null>(null);
    const [sydAnchor, setSydAnchor] = useState<HTMLElement | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Progressive Disclosure
    const progress = useStoryProgress(plot, characters, beats);

    // Load Data
    useEffect(() => {
        if (!project) return;

        setIsLoading(true);
        Promise.all([
            getPlotDevelopment(project.id),
            getCharacterDevelopments(project.id),
            getStoryBeats(project.id),
            getStoryMetadata(project.id)
        ]).then(([plotData, charData, beatData, metaData]) => {
            setPlot(plotData || {});
            setCharacters(charData);

            if (beatData.length === 0) {
                const initialBeats: StoryBeat[] = STORY_BEAT_NAMES.map((name, i) => ({
                    id: crypto.randomUUID(),
                    beatName: name,
                    sequence: i + 1,
                    content: '',
                    isComplete: false
                }));
                setBeats(initialBeats);
            } else {
                setBeats(beatData);
            }

            setMetadata(metaData);
            setIsLoading(false);
        });
    }, [project]);

    // Save Handlers
    const handlePlotChange = async (updates: Partial<PlotDevelopment>) => {
        const newPlot = { ...plot, ...updates };
        setPlot(newPlot);
        await savePlotDevelopment(project.id, newPlot);
    };

    const handleCharacterChange = async (charId: string, updates: Partial<CharacterDevelopment>) => {
        const newChars = characters.map(c => c.id === charId ? { ...c, ...updates } : c);
        setCharacters(newChars);
        await saveCharacterDevelopments(project.id, newChars);
    };

    const handleAddCharacter = async (role: 'protagonist' | 'antagonist' | 'supporting') => {
        const newChar: CharacterDevelopment = {
            id: crypto.randomUUID(),
            name: `New ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            role,
        };
        const newChars = [...characters, newChar];
        setCharacters(newChars);
        await saveCharacterDevelopments(project.id, newChars);
    };

    const handleDeleteCharacter = async (charId: string) => {
        const newChars = characters.filter(c => c.id !== charId);
        setCharacters(newChars);
        await saveCharacterDevelopments(project.id, newChars);
    };

    const handleBeatChange = async (beatId: string, updates: Partial<StoryBeat>) => {
        const newBeats = beats.map(b => b.id === beatId ? { ...b, ...updates } : b);
        setBeats(newBeats);
        await saveStoryBeats(project.id, newBeats);
    };

    // Syd Interaction
    const handleRequestSyd = async (agentType: SydAgentType, fieldId: string, anchorEl: HTMLElement, charId?: string) => {
        // If clicking same field, close it
        if (activeSydField === fieldId) {
            handleCloseSyd();
            return;
        }

        // Initialize model if needed
        if (!isReady && tier === 'free') {
            if (isModelCached) {
                await initModel();
            } else {
                showToast('Download Syd Jr. first from Settings', 'info');
                return;
            }
        }

        const character = charId ? characters.find(c => c.id === charId) : undefined;

        const context = selectContextForAgent(
            agentType,
            plot,
            character,
            beats,
            metadata
        );

        setSydContext(context);
        setSydAnchor(anchorEl);
        setActiveSydField(fieldId);
    };

    const handleCloseSyd = () => {
        setActiveSydField(null);
        setSydContext(null);
        setSydAnchor(null);
    };

    const handleSydMessage = async (message: string): Promise<string> => {
        if (!sydContext) return '';

        return await generateMicroAgent(
            sydContext.systemPrompt,
            { ...sydContext.contextFields, userMessage: message },
            sydContext.maxOutputTokens
        );
    };

    if (!project) {
        return <div className="p-8 text-text-secondary">No project loaded</div>;
    }

    return (
        <>
            <div ref={scrollContainerRef} className="h-full overflow-y-auto bg-background pb-32">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-surface border-b border-border px-6 py-4 shadow-sm">
                    <h1 className="text-lg font-bold text-text-primary uppercase tracking-wider">Story Development</h1>
                    <p className="text-xs text-text-secondary mt-1">Define the soul of your story. Syd Jr. is ready to help.</p>
                </div>

                <div className="p-6 space-y-6 max-w-4xl mx-auto">

                    {/* Plot Foundation */}
                    <CollapsibleSection
                        title="Plot Foundation"
                        defaultExpanded={true}
                        rightElement={progress.foundationComplete ? <Check className="w-4 h-4 text-green-500" /> : null}
                    >
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-text-secondary">Genre</label>
                                    <input
                                        value={plot.genre || ''}
                                        onChange={(e) => handlePlotChange({ genre: e.target.value })}
                                        className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm focus:border-primary focus:outline-none"
                                        placeholder="e.g. Sci-Fi"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-text-secondary">Theme</label>
                                    <input
                                        value={plot.theme || ''}
                                        onChange={(e) => handlePlotChange({ theme: e.target.value })}
                                        className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm focus:border-primary focus:outline-none"
                                        placeholder="e.g. Hope"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-text-secondary">Tone</label>
                                    <input
                                        value={plot.tone || ''}
                                        onChange={(e) => handlePlotChange({ tone: e.target.value })}
                                        className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm focus:border-primary focus:outline-none"
                                        placeholder="e.g. Dark"
                                    />
                                </div>
                            </div>

                            <FieldWithSyd
                                id="title"
                                label="Title"
                                value={plot.title || ''}
                                onChange={(val) => handlePlotChange({ title: val })}
                                disabled={!progress.foundationComplete}
                                onRequestSyd={(el) => handleRequestSyd('title', 'title', el)}
                                isActiveSyd={activeSydField === 'title'}
                                placeholder="Working Title"
                            />

                            <FieldWithSyd
                                id="logline"
                                label="Logline"
                                value={plot.logline || ''}
                                onChange={(val) => handlePlotChange({ logline: val })}
                                disabled={!progress.foundationComplete}
                                multiline={true}
                                onRequestSyd={(el) => handleRequestSyd('logline', 'logline', el)}
                                isActiveSyd={activeSydField === 'logline'}
                                placeholder="A protagonist must [goal] or else [stakes]..."
                            />
                        </div>
                    </CollapsibleSection>

                    {/* Characters */}
                    <CollapsibleSection
                        title="Characters & Arcs"
                        rightElement={
                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddCharacter('protagonist'); }}
                                    className="text-[10px] px-2 py-1 bg-surface-secondary border border-border rounded hover:bg-surface hover:text-primary transition-colors"
                                >
                                    + PROTAG
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddCharacter('antagonist'); }}
                                    className="text-[10px] px-2 py-1 bg-surface-secondary border border-border rounded hover:bg-surface hover:text-primary transition-colors"
                                >
                                    + ANTAG
                                </button>
                            </div>
                        }
                        isLocked={!progress.coreComplete}
                    >
                        <div className="space-y-3 pt-2">
                            {characters.length === 0 && (
                                <div className="text-center py-4 text-text-secondary text-xs italic bg-surface-secondary/50 rounded border border-border/50 border-dashed">
                                    No characters added yet. Define a Protagonist to unlock beats.
                                </div>
                            )}
                            {characters.map(char => (
                                <CharacterCard
                                    key={char.id}
                                    character={char}
                                    onChange={(updates) => handleCharacterChange(char.id, updates)}
                                    onDelete={() => handleDeleteCharacter(char.id)}
                                    onRequestSyd={(fieldSuffix, el) => handleRequestSyd(`character_${fieldSuffix}` as SydAgentType, `char-${char.id}-${fieldSuffix}`, el, char.id)}
                                    activeSydField={activeSydField?.startsWith(`char-${char.id}`) ? activeSydField.split('-').pop() || null : null}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>

                    {/* Story Beats */}
                    <CollapsibleSection
                        title="Story Beats (Save the Cat)"
                        isLocked={!progress.charactersComplete}
                    >
                        <div className="space-y-3 pt-2">
                            {beats.map(beat => (
                                <BeatCard
                                    key={beat.id}
                                    beat={beat}
                                    onChange={(updates) => handleBeatChange(beat.id, updates)}
                                    onRequestSyd={(el) => handleRequestSyd(BEAT_AGENT_TYPES[beat.sequence - 1] || 'beat_opening_image', `beat-${beat.id}`, el)}
                                    isActiveSyd={activeSydField === `beat-${beat.id}`}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>
                </div>
            </div>

            {/* Inline Syd Popout - Z-INDEX 60 (Highest Overlay) */}
            <SydPopoutPanel
                isOpen={!!activeSydField}
                context={sydContext}
                anchorElement={sydAnchor}
                scrollContainer={scrollContainerRef.current}
                onClose={handleCloseSyd}
                onSendMessage={handleSydMessage}
            />
        </>
    );
};