import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, Check, BrainCircuit, Sparkles, Plus, ChevronDown } from 'lucide-react';
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
import { ModelDownloadModal } from '../ui/ModelDownloadModal';
import { STORY_STRUCTURE_TYPES, TARGET_AUDIENCE_RATINGS } from '../../constants';

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

export const StoryPanel: React.FC = () => {
    const { project, showToast } = useWorkspace();
    const { isReady, generateMicroAgent, initModel, isModelCached, isSupported } = useLocalLlm();
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
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [pendingSydRequest, setPendingSydRequest] = useState<{ agentType: SydAgentType, fieldId: string, anchorEl: HTMLElement, charId?: string } | null>(null);

    // Story Type UI State
    const [storyTypeInput, setStoryTypeInput] = useState('');
    const [showStoryTypeDropdown, setShowStoryTypeDropdown] = useState(false);

    // Target Audience UI State
    const [customRatingInput, setCustomRatingInput] = useState('');
    const [isCustomRating, setIsCustomRating] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Progressive Disclosure
    const progress = useStoryProgress(plot, characters, beats);

    // Auto-Summary Logic
    useEffect(() => {
        if (!isReady) return;

        const checkAndSummarize = async () => {
            if (progress.foundationComplete && !plot.foundationSummary) {
                const content = `Genre: ${plot.genre}\nTheme: ${plot.theme}\nTone: ${plot.tone}`;
                const summary = await summarizer.generateSummary(content, 50, generateMicroAgent);
                handlePlotChange({ foundationSummary: summary });
            }
            if (progress.coreComplete && !plot.coreSummary) {
                const content = `Title: ${plot.title}\nLogline: ${plot.logline}`;
                const summary = await summarizer.generateSummary(content, 50, generateMicroAgent);
                handlePlotChange({ coreSummary: summary });
            }
            if (progress.actOneComplete && !metadata.actOneSummary) {
                const act1Content = beats.slice(0, 6).map(b => `${b.beatName}: ${b.content}`).join('\n');
                const summary = await summarizer.generateSummary(act1Content, 100, generateMicroAgent);
                setMetadata(prev => ({ ...prev, actOneSummary: summary }));
                await saveStoryMetadata(project.id, { ...metadata, actOneSummary: summary });
            }
        };

        const timer = setTimeout(checkAndSummarize, 2000);
        return () => clearTimeout(timer);
    }, [progress, isReady, plot, beats, metadata, project?.id, generateMicroAgent]);

    // Load Data
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

            // Handle existing custom ratings
            if (plotData?.targetAudienceRating && !TARGET_AUDIENCE_RATINGS.includes(plotData.targetAudienceRating)) {
                setIsCustomRating(true);
                setCustomRatingInput(plotData.targetAudienceRating);
            }

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
    }, [project]);

    // Retry pending request after download/init
    useEffect(() => {
        if (isReady && pendingSydRequest) {
            handleRequestSyd(pendingSydRequest.agentType, pendingSydRequest.fieldId, pendingSydRequest.anchorEl, pendingSydRequest.charId);
            setPendingSydRequest(null);
        }
    }, [isReady, pendingSydRequest]);

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

    // Story Type Handlers
    const addStoryType = (type: string) => {
        const current = plot.storyTypes || [];
        if (!current.includes(type)) {
            handlePlotChange({ storyTypes: [...current, type] });
        }
        setStoryTypeInput('');
        setShowStoryTypeDropdown(false);
    };

    const removeStoryType = (type: string) => {
        const current = plot.storyTypes || [];
        handlePlotChange({ storyTypes: current.filter(t => t !== type) });
    };

    // Syd Interaction (The Gatekeeper)
    const handleRequestSyd = async (agentType: SydAgentType, fieldId: string, anchorEl: HTMLElement, charId?: string) => {
        if (activeSydField === fieldId) {
            handleCloseSyd();
            return;
        }

        // --- READINESS CHECK ---
        if (tier === 'free') {
            if (!isSupported) {
                showToast("Your browser does not support Local AI (WebGPU).", 'error');
                return;
            }

            if (!isReady) {
                if (isModelCached) {
                    // Cached but cold: Start warming up and proceed to open UI (UI will show "Warming up")
                    initModel(); 
                } else {
                    // Not cached: Must download first. Stop and show modal.
                    setPendingSydRequest({ agentType, fieldId, anchorEl, charId });
                    setShowDownloadModal(true);
                    return;
                }
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

    const handleSydMessage = async (message: string, messageHistory?: Array<{role: string, content: string}>): Promise<string> => {
        if (!sydContext) return '';

        return await generateMicroAgent(
            sydContext.systemPrompt,
            { ...sydContext.contextFields, userMessage: message },
            sydContext.maxOutputTokens,
            messageHistory
        );
    };

    if (!project) {
        return <div className="p-8 text-text-secondary">No project loaded</div>;
    }

    return (
        <>
            <ModelDownloadModal 
                isOpen={showDownloadModal}
                onClose={() => { setShowDownloadModal(false); setPendingSydRequest(null); }}
                onConfirm={() => {
                    initModel();
                    setShowDownloadModal(false);
                    // Pending request will trigger via useEffect when isReady becomes true
                }}
            />

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
                        defaultExpanded={false}
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

                            {/* SETTING FIELD */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Setting / World</label>
                                <input
                                    value={plot.setting || ''}
                                    onChange={(e) => handlePlotChange({ setting: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-surface-secondary border border-border rounded-md text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
                                    placeholder="When and where? (e.g., Modern-day NYC, 1920s Chicago, Dystopian 2050)"
                                />
                            </div>

                            {/* STORY TYPES FIELD */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                        Story Types
                                    </label>
                                    {activeSydField === 'story_types' && (
                                        <span className="text-[10px] text-primary flex items-center gap-1 animate-pulse">
                                            <Sparkles className="w-3 h-3" /> Syd Active
                                        </span>
                                    )}
                                </div>
                                
                                <div className="relative group min-h-[42px] px-3 py-2 bg-surface-secondary border border-border rounded-md focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                                    <div className="flex flex-wrap gap-2 pr-8">
                                        {(plot.storyTypes || []).map(type => (
                                            <span key={type} className="inline-flex items-center gap-1 bg-surface border border-border px-2 py-1 rounded text-xs text-text-primary">
                                                {type}
                                                <button onClick={() => removeStoryType(type)} className="text-text-muted hover:text-red-500">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                        
                                        <div className="relative flex-1 min-w-[120px]">
                                            <input
                                                value={storyTypeInput}
                                                onChange={(e) => {
                                                    setStoryTypeInput(e.target.value);
                                                    setShowStoryTypeDropdown(true);
                                                }}
                                                onFocus={() => setShowStoryTypeDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowStoryTypeDropdown(false), 200)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && storyTypeInput.trim()) {
                                                        addStoryType(storyTypeInput.trim());
                                                    }
                                                }}
                                                className="w-full bg-transparent outline-none text-sm text-text-primary placeholder:text-text-muted/50 h-6"
                                                placeholder={(plot.storyTypes || []).length === 0 ? "Select types (e.g. Hero's Journey)..." : ""}
                                            />
                                            
                                            {showStoryTypeDropdown && (
                                                <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border shadow-xl rounded-md z-20 max-h-48 overflow-y-auto">
                                                    {STORY_STRUCTURE_TYPES
                                                        .filter(t => t.toLowerCase().includes(storyTypeInput.toLowerCase()) && !(plot.storyTypes || []).includes(t))
                                                        .map(type => (
                                                            <button
                                                                key={type}
                                                                onClick={() => addStoryType(type)}
                                                                className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                                                            >
                                                                {type}
                                                            </button>
                                                        ))
                                                    }
                                                    {storyTypeInput && !STORY_STRUCTURE_TYPES.includes(storyTypeInput) && (
                                                        <button
                                                            onClick={() => addStoryType(storyTypeInput)}
                                                            className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-surface-secondary transition-colors flex items-center gap-1"
                                                        >
                                                            <Plus className="w-3 h-3" /> Add "{storyTypeInput}"
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Syd Button - Direct Child of Group Container */}
                                    <button 
                                        onClick={(e) => handleRequestSyd('story_types', 'story_types', e.currentTarget.parentElement as HTMLElement)}
                                        className={`
                                            absolute top-2 right-2 p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm backdrop-blur-sm z-10
                                            opacity-0 group-hover:opacity-100 focus-within:opacity-100
                                            ${activeSydField === 'story_types'
                                                ? 'bg-primary text-white border border-primary opacity-100'
                                                : 'bg-surface/80 border border-border text-text-secondary hover:text-primary hover:border-primary/50'}
                                        `}
                                        title="Ask Syd for story type suggestions"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* TARGET AUDIENCE FIELD */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                        Target Audience
                                    </label>
                                    {/* Rating Dropdown (NO Syd) */}
                                    <div className="relative">
                                        {isCustomRating ? (
                                            <div className="flex gap-1 relative">
                                                <input
                                                    value={customRatingInput}
                                                    onChange={(e) => {
                                                        setCustomRatingInput(e.target.value);
                                                        handlePlotChange({ targetAudienceRating: e.target.value });
                                                    }}
                                                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary text-sm focus:border-primary focus:outline-none pr-10"
                                                    placeholder="Custom rating (e.g. TV-MA)..."
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => {
                                                        setIsCustomRating(false);
                                                        handlePlotChange({ targetAudienceRating: TARGET_AUDIENCE_RATINGS[0] });
                                                    }}
                                                    className="px-2 text-xs text-text-muted hover:text-text-primary border border-border rounded hover:bg-surface-secondary"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <select
                                                    value={plot.targetAudienceRating || ''}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'custom') {
                                                            setIsCustomRating(true);
                                                            setCustomRatingInput('');
                                                            handlePlotChange({ targetAudienceRating: '' });
                                                        } else {
                                                            handlePlotChange({ targetAudienceRating: e.target.value });
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-md text-text-primary text-sm focus:border-primary focus:outline-none appearance-none cursor-pointer pr-10"
                                                >
                                                    <option value="" disabled>Select Rating...</option>
                                                    {TARGET_AUDIENCE_RATINGS.map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                    <option value="custom">Custom...</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-text-muted pointer-events-none" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Description Field (WITH Syd) */}
                                <FieldWithSyd
                                    id="target_audience"
                                    label="Audience Profile"
                                    value={plot.targetAudienceDescription || ''}
                                    onChange={(val) => handlePlotChange({ targetAudienceDescription: val })}
                                    onRequestSyd={(el) => handleRequestSyd('target_audience', 'target_audience', el)}
                                    isActiveSyd={activeSydField === 'target_audience'}
                                    placeholder="Who is this story for? Age, interests, similar movies they enjoy..."
                                    multiline={true}
                                    minHeight="80px"
                                />
                            </div>

                            <FieldWithSyd
                                id="title"
                                label="Working Title"
                                value={plot.title || ''}
                                onChange={(val) => handlePlotChange({ title: val })}
                                onRequestSyd={(el) => handleRequestSyd('title', 'title', el)}
                                isActiveSyd={activeSydField === 'title'}
                                placeholder="Enter title or ask Syd to brainstorm..."
                            />

                            <FieldWithSyd
                                id="logline"
                                label="Logline (The Hook)"
                                value={plot.logline || ''}
                                onChange={(val) => handlePlotChange({ logline: val })}
                                multiline={true}
                                minHeight="60px"
                                onRequestSyd={(el) => handleRequestSyd('logline', 'logline', el)}
                                isActiveSyd={activeSydField === 'logline'}
                                placeholder="When [INCITING INCIDENT] happens, a [PROTAGONIST] must [ACTION] or else [STAKES]..."
                            />

                            <FieldWithSyd
                                id="budget"
                                label="Budget Constraints"
                                value={plot.budget || ''}
                                onChange={(val) => handlePlotChange({ budget: val })}
                                multiline={true}
                                minHeight="60px"
                                onRequestSyd={(el) => handleRequestSyd('budget' as any, 'budget', el)}
                                isActiveSyd={activeSydField === 'budget'}
                                placeholder="Production budget level (e.g., Micro-budget, Low-budget, Studio) and any specific limitations..."
                            />
                        </div>
                    </CollapsibleSection>

                    {/* 2. CHARACTERS */}
                    <CollapsibleSection
                        title="Cast & Character Arcs"
                        defaultExpanded={false}
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
                                    onChange={(updates) => handleCharacterChange(char.id, updates)}
                                    onDelete={() => handleDeleteCharacter(char.id)}
                                    onRequestSyd={(fieldSuffix, el) => handleRequestSyd(`character_${fieldSuffix}` as SydAgentType, `char-${char.id}-${fieldSuffix}`, el, char.id)}
                                    activeSydField={activeSydField?.startsWith(`char-${char.id}`) ? activeSydField.split('-').pop() || null : null}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>

                    {/* 3. STORY STRUCTURE */}
                    <CollapsibleSection
                        title="Beat Sheet (Save the Cat)"
                        defaultExpanded={false}
                    >
                        <div className="space-y-4 pt-4">
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
                    
                    {/* 4. BRAINSTORMING (Free form) */}
                    <CollapsibleSection title="Brainstorming Notes" className="border-none" defaultExpanded={false}>
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
        </>
    );
};