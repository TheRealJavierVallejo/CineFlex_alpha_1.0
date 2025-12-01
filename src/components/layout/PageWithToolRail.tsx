import React, { useState, ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

export interface Tool {
  id: string;
  icon: ReactNode;
  label: string;
  content: ReactNode;
  width?: string;
  noScroll?: boolean; // If true, the rail won't provide a scroll container (tool must handle it)
}

interface PageWithToolRailProps {
  children: ReactNode;
  tools: Tool[];
  defaultTool?: string | null;
}

export const PageWithToolRail: React.FC<PageWithToolRailProps> = ({
  children,
  tools,
  defaultTool = null
}) => {
  const [activeToolId, setActiveToolId] = useState<string | null>(defaultTool);

  const activeTool = tools.find(t => t.id === activeToolId);
  const sidebarWidth = activeTool?.width || '320px';

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">

      {/* 1. PERSISTENT RAIL (Far Left) - Z-INDEX 50 (Highest Priority Chrome) */}
      <div className="w-[50px] bg-background border-r border-border flex flex-col items-center py-4 gap-4 shrink-0 z-50 relative">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveToolId(activeToolId === tool.id ? null : tool.id)}
            className={`
              w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200 group relative
              ${activeToolId === tool.id
                ? 'bg-primary text-white shadow-glow'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'}
            `}
            title={tool.label}
          >
            {tool.icon}

            {/* Tooltip on Hover */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-surface text-text-primary border border-border text-[10px] font-bold uppercase tracking-wide rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              {tool.label}
            </div>
          </button>
        ))}
      </div>

      {/* 2. SLIDING TOOL PANEL - Z-INDEX 20 (Standard Panel) */}
      <div
        className={`
          relative border-r border-border bg-surface flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-20
          ${activeToolId ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0 overflow-hidden'}
        `}
        style={{ width: activeToolId ? sidebarWidth : '0px' }}
      >
        {activeTool && (
          <>
            <div className="h-10 border-b border-border flex items-center justify-between px-4 shrink-0 bg-surface">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary truncate">
                {activeTool.label}
              </span>
              <button
                onClick={() => setActiveToolId(null)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            {/* Conditional scrolling based on tool config */}
            <div className={`flex-1 flex flex-col min-w-0 ${activeTool.noScroll ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
              {activeTool.content}
            </div>
          </>
        )}
      </div>

      {/* 3. MAIN WORKSPACE AREA - Z-INDEX 10 (Base) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-background z-10">
        {children}
      </div>
    </div>
  );
};
</dyad-file>

<dyad-write path="src/components/features/StoryPanel.tsx" description="Refactoring StoryPanel to be a native sidebar component (removing fixed positioning and modal logic).">
import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
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

// No props needed now - it's embedded in the rail
export const StoryPanel: React.FC = () => {
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

    // Auto-Summary Logic
    useEffect(() => {
        if (!isReady) return;

        const checkAndSummarize = async () => {
            // 1. Foundation Summary (Genre/Theme/Tone)
            if (progress.foundationComplete && !plot.foundationSummary) {
                const content = `Genre: ${plot.genre}\nTheme: ${plot.theme}\nTone: ${plot.tone}`;
                const summary = await summarizer.generateSummary(content, 50, generateMicroAgent);
                handlePlotChange({ foundationSummary: summary });
            }

            // 2. Core Summary (Title/Logline)
            if (progress.coreComplete && !plot.coreSummary) {
                const content = `Title: ${plot.title}\nLogline: ${plot.logline}`;
                const summary = await summarizer.generateSummary(content, 50, generateMicroAgent);
                handlePlotChange({ coreSummary: summary });
            }

            // 3. Act 1 Summary
            if (progress.actOneComplete && !metadata.actOneSummary) {
                const act1Content = beats.slice(0, 6).map(b => `${b.beatName}: ${b.content}`).join('\n');
                const summary = await summarizer.generateSummary(act1Content, 100, generateMicroAgent);
                setMetadata(prev => ({ ...prev, actOneSummary: summary }));
                await saveStoryMetadata(project.id, { ...metadata, actOneSummary: summary });
            }
        };

        // Debounce slightly to avoid rapid firing
        const timer = setTimeout(checkAndSummarize, 2000);
        return () => clearTimeout(timer);
    }, [progress, isReady, plot, beats, metadata, project.id, generateMicroAgent]);

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
    }, [project.id]);

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
        <div className="h-full flex flex-col bg-surface">
            {/* Intro / Empty State */}
            <div className="p-6 pb-2 border-b border-border/50">
                <p className="text-xs text-text-secondary">
                    Define the soul of your story. Syd Jr. is ready to help you brainstorm.
                </p>
            </div>

            {/* Main Content Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-text-secondary">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Loading story data...
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </div>

            {/* Inline Syd Popout - Anchored to active field */}
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