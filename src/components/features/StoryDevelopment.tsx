import React, { useState, useEffect, useRef } from 'react';
import { Check, BrainCircuit, Sparkles, Plus } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSubscription } from '../../context/SubscriptionContext';
import {
    getPlotDevelopment,
    savePlotDevelopment,
    getCharacterDevelopments,
    saveCharacterDevelopments,
    getStoryNotes,
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
    const { tier } = useSubscription();

    // Data State
    const [plot, setPlot] = useState<PlotDevelopment>({});
    const [characters, setCharacters] = useState<CharacterDevelopment[]>([]);
    const [beats, setBeats] = useState<StoryBeat[]>([]);
    const [metadata, setMetadata] = useState<StoryMetadata>({ lastUpdated: Date.now() });

    // Syd State
    const [activeSydField, setActiveSydField] = useState<string | null>(null);
    const [sydContext, setSydContext] = useState<SydContext | null>(null);
    const [sydAnchor, setSydAnchor] = useState<HTMLElement | null>(null);
    const [pendingSydRequest, setPendingSydRequest] = useState<{ agentType: SydAgentType, fieldId: string, anchorEl: HTMLElement, charId?: string } | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Progressive Disclosure
    const progress = useStoryProgress(plot, characters, beats);

    // Load Data
    const [scriptElements, setScriptElements] = useState<any[]>([]);
    const [storyNotes, setStoryNotes] = useState<any[]>([]);

    useEffect(() => {
        if (!project) return;

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
        });

        // Load full context for Pro Tier
        if (project.id && tier === 'pro') {
            setScriptElements(project.scriptElements || []);
            getStoryNotes(project.id).then(data => setStoryNotes(data.notes));
        }
    }, [project, tier]);

    // Retry pending request
    useEffect(() => {
        if (pendingSydRequest) {
            handleRequestSyd(pendingSydRequest.agentType, pendingSydRequest.fieldId, pendingSydRequest.anchorEl, pendingSydRequest.charId);
            setPendingSydRequest(null);
        }
    }, [pendingSydRequest]);

    // Save Handlers
    const handlePlotChange = async (updates: Partial<PlotDevelopment>) => {
        if (!project) return;
        const newPlot = { ...plot, ...updates };
        setPlot(newPlot);
        await savePlotDevelopment(project.id, newPlot);
    };

    const handleCharacterChange = async (charId: string, updates: Partial<CharacterDevelopment>) => {
        if (!project) return;
        const newChars = characters.map(c => c.id === charId ? { ...c, ...updates } : c);
        setCharacters(newChars);
        await saveCharacterDevelopments(project.id, newChars);
    };

    const handleAddCharacter = async (role: 'protagonist' | 'antagonist' | 'supporting') => {
        if (!project) return;
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
        if (!project) return;
        const newChars = characters.filter(c => c.id !== charId);
        setCharacters(newChars);
        await saveCharacterDevelopments(project.id, newChars);
    };

    const handleBeatChange = async (beatId: string, updates: Partial<StoryBeat>) => {
        if (!project) return;
        const newBeats = beats.map(b => b.id === beatId ? { ...b, ...updates } : b);
        setBeats(newBeats);
        await saveStoryBeats(project.id, newBeats);
    };

    // Syd Interaction (The Gatekeeper)
    const handleRequestSyd = async (agentType: SydAgentType, fieldId: string, anchorEl: HTMLElement, charId?: string) => {
        if (activeSydField === fieldId) {
            handleCloseSyd();
            return;
        }

        const character = charId ? characters.find(c => c.id === charId) : undefined;

        // Prepare full context data if Pro
        let notesString = '';
        let scriptString = '';

        if (tier === 'pro') {
            if (storyNotes.length > 0) {
                notesString = storyNotes.map((n: any) => `## ${n.title}\n${n.content}`).join('\n\n---\n\n');
            }
            if (scriptElements.length > 0) {
                scriptString = scriptElements.slice(-50).map((el: any) => {
                    if (el.type === 'scene_heading') return `\n${el.content}`;
                    if (el.type === 'character') return `\n${el.content.toUpperCase()}`;
                    if (el.type === 'dialogue') return `${el.content}`;
                    return el.content;
                }).join('\n');
            }
        }

        const context = selectContextForAgent(
            agentType,
            plot,
            character,
            beats,
            metadata,
            characters,
            notesString,
            scriptString,
            tier === 'pro'
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
        // Deprecated for cloud streaming logic in SydPopoutPanel
        console.warn("handleSydMessage called in StoryDevelopment. This is deprecated for cloud streaming.");
        return "";
    };

    if (!project) {
        return <div className="p-8 text-text-secondary">No project loaded</div>;
    }

    return (
        <div className="h-full flex flex-col overflow-hidden relative">
            <div ref={scrollContainerRef} className="h-full overflow-y-auto bg-background pb-32">
                {/* Header (Native Feel) */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-8 py-6">
                    <h1 className="text-xl font-bold text-text-primary tracking-tight">Story Development</h1>
                    <p className="text-sm text-text-secondary mt-1 max-w-md">
                        Define the soul of your story. Use Syd to brainstorm, refine, and structure your narrative.
                    </p>
                </div>

                <div className="p-8 space-y-12 max-w-3xl mx-auto">

                    {/* 1. FOUNDATION */}
                    <CollapsibleSection
                        title="Plot Foundation"
                        defaultExpanded={true}
                        rightElement={progress.foundationComplete ? <Check className="w-5 h-5 text-green-500" /> : null}
                    >
                        <div className="space-y-8 pt-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Genre</label>
                                    <input
                                        value={plot.genre || ''}
                                        onChange={(e) => handlePlotChange({ genre: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-surface-secondary border border-border rounded-md text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
                                        placeholder="Sci-Fi"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Theme</label>
                                    <input
                                        value={plot.theme || ''}
                                        onChange={(e) => handlePlotChange({ theme: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-surface-secondary border border-border rounded-md text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
                                        placeholder="Hope vs. Fear"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Tone</label>
                                    <input
                                        value={plot.tone || ''}
                                        onChange={(e) => handlePlotChange({ tone: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-surface-secondary border border-border rounded-md text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
                                        placeholder="Dark & Gritty"
                                    />
                                </div>
                            </div>

                            <FieldWithSyd
                                id="title"
                                label="Working Title"
                                value={plot.title || ''}
                                onChange={(val: string) => handlePlotChange({ title: val })}
                                onRequestSyd={(el: HTMLElement) => handleRequestSyd('title', 'title', el)}
                                isActiveSyd={activeSydField === 'title'}
                                placeholder="Enter title or ask Syd to brainstorm..."
                            />

                            <FieldWithSyd
                                id="logline"
                                label="Logline (The Hook)"
                                value={plot.logline || ''}
                                onChange={(val: string) => handlePlotChange({ logline: val })}
                                multiline={true}
                                minHeight="50px"
                                onRequestSyd={(el: HTMLElement) => handleRequestSyd('logline', 'logline', el)}
                                isActiveSyd={activeSydField === 'logline'}
                                placeholder="When [INCITING INCIDENT] happens, a [PROTAGONIST] must [ACTION] or else [STAKES]..."
                            />
                        </div>
                    </CollapsibleSection>

                    {/* 2. CHARACTERS */}
                    <CollapsibleSection
                        title="Cast & Character Arcs"
                        defaultExpanded={true}
                        rightElement={
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddCharacter('protagonist'); }}
                                    className="text-[10px] px-3 py-1.5 bg-surface-secondary border border-border rounded-full hover:bg-surface hover:text-primary transition-colors font-bold uppercase tracking-wide"
                                >
                                    + Protag
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddCharacter('antagonist'); }}
                                    className="text-[10px] px-3 py-1.5 bg-surface-secondary border border-border rounded-full hover:bg-surface hover:text-primary transition-colors font-bold uppercase tracking-wide"
                                >
                                    + Antag
                                </button>
                            </div>
                        }
                    >
                        <div className="space-y-4 pt-4">
                            {characters.length === 0 && (
                                <div className="text-center py-10 text-text-secondary bg-surface-secondary/30 rounded-lg border border-border/50 border-dashed">
                                    <div className="flex justify-center mb-3">
                                        <BrainCircuit className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium">No characters defined</p>
                                    <p className="text-xs text-text-muted mt-1">Add a Protagonist to begin building the emotional core.</p>
                                </div>
                            )}
                            {characters.map(char => (
                                <CharacterCard
                                    key={char.id}
                                    character={char}
                                    onChange={(updates: Partial<CharacterDevelopment>) => handleCharacterChange(char.id, updates)}
                                    onDelete={() => handleDeleteCharacter(char.id)}
                                    onRequestSyd={(fieldSuffix: string, el: HTMLElement) => handleRequestSyd(`character_${fieldSuffix}` as SydAgentType, `char-${char.id}-${fieldSuffix}`, el, char.id)}
                                    activeSydField={activeSydField?.startsWith(`char-${char.id}`) ? activeSydField.split('-').pop() || null : null}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>

                    {/* 3. STORY STRUCTURE */}
                    <CollapsibleSection
                        title="Beat Sheet (Save the Cat)"
                        defaultExpanded={true}
                    >
                        <div className="space-y-4 pt-4">
                            {beats.map(beat => (
                                <BeatCard
                                    key={beat.id}
                                    beat={beat}
                                    onChange={(updates: Partial<StoryBeat>) => handleBeatChange(beat.id, updates)}
                                    onRequestSyd={(el: HTMLElement) => handleRequestSyd(BEAT_AGENT_TYPES[beat.sequence - 1] || 'beat_opening_image', `beat-${beat.id}`, el)}
                                    isActiveSyd={activeSydField === `beat-${beat.id}`}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>

                    {/* 4. BRAINSTORMING (Free form) */}
                    <CollapsibleSection title="Brainstorming Notes" className="border-none">
                        <div className="pt-4">
                            <textarea
                                className="w-full bg-surface-secondary/50 border border-border rounded-lg p-4 min-h-[200px] text-sm text-text-primary focus:border-primary focus:outline-none transition-colors leading-relaxed placeholder:text-text-muted/30"
                                placeholder="Free space for random ideas, dialogue snippets, or notes..."
                                onChange={(e) => handlePlotChange({ notes: e.target.value })}
                                value={plot.notes || ''}
                            />
                        </div>
                    </CollapsibleSection>
                </div>
            </div>

            {/* Inline Syd Popout - Z-INDEX 100 (Highest Overlay) */}
            <SydPopoutPanel
                isOpen={!!activeSydField}
                context={sydContext}
                anchorElement={sydAnchor}
                scrollContainer={scrollContainerRef.current}
                onClose={handleCloseSyd}
                onSendMessage={handleSydMessage}
            />
        </div>
    );
};