/*
 * 📖 COMPONENT: STORY DEVELOPMENT (Main View)
 * Progressive disclosure interface for plot, character arcs, and story beats
 * Uses Syd micro-agents for assistance
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Lock, Check, Edit3 } from 'lucide-react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
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
import type { PlotDevelopment, CharacterDevelopment, StoryBeat, StoryMetadata } from '../../types';

// Save the Cat beat names
const STORY_BEAT_NAMES = [
    'Opening Image',
    'Theme Stated',
    'Setup',
    'Catalyst',
    'Debate',
    'Break into Two',
    'B Story',
    'Fun and Games',
    'Midpoint',
    'Bad Guys Close In',
    'All Is Lost',
    'Dark Night of the Soul',
    'Break into Three',
    'Finale',
    'Final Image'
];

export const StoryDevelopment: React.FC = () => {
    const { project, showToast } = useWorkspace();

    // State
    const [plot, setPlot] = useState<PlotDevelopment>({});
    const [characters, setCharacters] = useState<CharacterDevelopment[]>([]);
    const [beats, setBeats] = useState<StoryBeat[]>([]);
    const [metadata, setMetadata] = useState<StoryMetadata>({ lastUpdated: Date.now() });

    // Expansion state
    const [plotExpanded, setPlotExpanded] = useState(true);
    const [charsExpanded, setCharsExpanded] = useState(false);
    const [beatsExpanded, setBeatsExpanded] = useState(false);

    // Load data
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

            // Initialize beats if empty
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

    // Field unlock logic
    const hasFoundation = Boolean(plot.genre && plot.theme && plot.tone);
    const hasTitle = Boolean(plot.title);
    const hasLogline = Boolean(plot.logline);
    const hasProtagonist = characters.some(c => c.role === 'protagonist');

    const canUnlockCharacters = hasLogline;
    const canUnlockBeats = hasProtagonist;

    // Progress calculation
    const totalFields = 25; // Rough estimate
    let completedFields = 0;
    if (hasFoundation) completedFields += 3;
    if (hasTitle) completedFields += 1;
    if (hasLogline) completedFields += 1;
    completedFields += characters.reduce((sum, c) => {
        return sum + [c.want, c.need, c.lie, c.ghost, c.characterArc].filter(Boolean).length;
    }, 0);
    completedFields += beats.filter(b => b.isComplete).length;

    const progress = Math.round((completedFields / totalFields) * 100);

    // Save handlers
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
            name: '',
            role,
        };
        const newChars = [...characters, newChar];
        setCharacters(newChars);
        await saveCharacterDevelopments(project.id, newChars);
    };

    if (!project) {
        return <div className="p-8 text-text-secondary">No project loaded</div>;
    }

    return (
        <div className="h-full overflow-y-auto bg-background">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-surface border-b border-border px-6 py-4">
                <h1 className="text-xl font-bold text-text-primary">Story Development</h1>
                <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 bg-background rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-sm text-text-secondary">{completedFields}/{totalFields} fields</span>
                </div>
            </div>

            <div className="p-6 space-y-4 max-w-4xl">

                {/* Plot Foundation Section */}
                <section className="bg-surface border border-border rounded-lg overflow-hidden">
                    <button
                        onClick={() => setPlotExpanded(!plotExpanded)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-secondary transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {plotExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            <h2 className="text-lg font-semibold text-text-primary">Plot Foundation</h2>
                            {hasFoundation && hasTitle && hasLogline && <Check className="w-5 h-5 text-green-500" />}
                        </div>
                        <span className="text-sm text-text-muted">
                            {[plot.genre, plot.theme, plot.tone, plot.title, plot.logline].filter(Boolean).length}/5
                        </span>
                    </button>

                    {plotExpanded && (
                        <div className="px-6 py-4 space-y-4 border-t border-border">
                            {/* Genre/Theme/Tone */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Genre *</label>
                                    <input
                                        type="text"
                                        value={plot.genre || ''}
                                        onChange={(e) => handlePlotChange({ genre: e.target.value })}
                                        placeholder="e.g., Sci-Fi"
                                        className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Theme *</label>
                                    <input
                                        type="text"
                                        value={plot.theme || ''}
                                        onChange={(e) => handlePlotChange({ theme: e.target.value })}
                                        placeholder="e.g., Hope vs Despair"
                                        className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Tone *</label>
                                    <input
                                        type="text"
                                        value={plot.tone || ''}
                                        onChange={(e) => handlePlotChange({ tone: e.target.value })}
                                        placeholder="e.g., Dark, Serious"
                                        className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary text-sm"
                                    />
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={plot.title || ''}
                                        onChange={(e) => handlePlotChange({ title: e.target.value })}
                                        placeholder="Working title for your screenplay"
                                        disabled={!hasFoundation}
                                        className="flex-1 px-3 py-2 bg-background border border-border rounded text-text-primary text-sm disabled:opacity-50"
                                    />
                                    <button
                                        disabled={!hasFoundation}
                                        className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Ask Syd
                                    </button>
                                </div>
                                {!hasFoundation && (
                                    <p className="mt-1 text-xs text-text-muted flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Complete Genre, Theme, and Tone first
                                    </p>
                                )}
                            </div>

                            {/* Logline */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Logline</label>
                                <div className="flex gap-2">
                                    <textarea
                                        value={plot.logline || ''}
                                        onChange={(e) => handlePlotChange({ logline: e.target.value })}
                                        placeholder="One-sentence story pitch: protagonist + goal + stakes"
                                        disabled={!hasFoundation || !hasTitle}
                                        rows={2}
                                        className="flex-1 px-3 py-2 bg-background border border-border rounded text-text-primary text-sm resize-none disabled:opacity-50"
                                    />
                                    <button
                                        disabled={!hasFoundation || !hasTitle}
                                        className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-fit"
                                    >
                                        Ask Syd
                                    </button>
                                </div>
                                {(!hasFoundation || !hasTitle) && (
                                    <p className="mt-1 text-xs text-text-muted flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Complete Title first
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Character Development Section */}
                <section className="bg-surface border border-border rounded-lg overflow-hidden">
                    <button
                        onClick={() => canUnlockCharacters && setCharsExpanded(!charsExpanded)}
                        className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${canUnlockCharacters ? 'hover:bg-surface-secondary' : 'cursor-not-allowed opacity-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            {canUnlockCharacters ? (
                                charsExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
                            ) : (
                                <Lock className="w-5 h-5" />
                            )}
                            <h2 className="text-lg font-semibold text-text-primary">Character Development</h2>
                        </div>
                        <span className="text-sm text-text-muted">{characters.length} characters</span>
                    </button>

                    {!canUnlockCharacters && (
                        <div className="px-6 py-3 border-t border-border bg-background/50">
                            <p className="text-sm text-text-muted flex items-center gap-2">
                                <Lock className="w-4 h-4" /> Complete Plot Foundation (including logline) to unlock
                            </p>
                        </div>
                    )}

                    {charsExpanded && canUnlockCharacters && (
                        <div className="px-6 py-4 space-y-4 border-t border-border">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAddCharacter('protagonist')}
                                    className="px-3 py-1.5 bg-background border border-border rounded text-sm hover:bg-surface-secondary"
                                >
                                    + Protagonist
                                </button>
                                <button
                                    onClick={() => handleAddCharacter('antagonist')}
                                    className="px-3 py-1.5 bg-background border border-border rounded text-sm hover:bg-surface-secondary"
                                >
                                    + Antagonist
                                </button>
                                <button
                                    onClick={() => handleAddCharacter('supporting')}
                                    className="px-3 py-1.5 bg-background border border-border rounded text-sm hover:bg-surface-secondary"
                                >
                                    + Supporting
                                </button>
                            </div>

                            {characters.map(char => (
                                <div key={char.id} className="p-4 bg-background border border-border rounded space-y-3">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={char.name}
                                            onChange={(e) => handleCharacterChange(char.id, { name: e.target.value })}
                                            placeholder="Character name"
                                            className="flex-1 px-3 py-2 bg-surface border border-border rounded text-text-primary font-medium"
                                        />
                                        <span className="text-sm text-text-muted capitalize">{char.role}</span>
                                    </div>

                                    {/* Character arc fields - simplified for space */}
                                    <div className="text-sm text-text-secondary">
                                        Character arc fields: Want, Need, Lie, Ghost, Arc (to be implemented)
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Story Beats Section */}
                <section className="bg-surface border border-border rounded-lg overflow-hidden">
                    <button
                        onClick={() => canUnlockBeats && setBeatsExpanded(!beatsExpanded)}
                        className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${canUnlockBeats ? 'hover:bg-surface-secondary' : 'cursor-not-allowed opacity-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            {canUnlockBeats ? (
                                beatsExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
                            ) : (
                                <Lock className="w-5 h-5" />
                            )}
                            <h2 className="text-lg font-semibold text-text-primary">Story Beats (Save the Cat)</h2>
                        </div>
                        <span className="text-sm text-text-muted">{beats.filter(b => b.isComplete).length}/15</span>
                    </button>

                    {!canUnlockBeats && (
                        <div className="px-6 py-3 border-t border-border bg-background/50">
                            <p className="text-sm text-text-muted flex items-center gap-2">
                                <Lock className="w-4 h-4" /> Create a protagonist character to unlock
                            </p>
                        </div>
                    )}

                    {beatsExpanded && canUnlockBeats && (
                        <div className="px-6 py-4 space-y-2 border-t border-border">
                            {beats.map(beat => (
                                <div key={beat.id} className="p-3 bg-background border border-border rounded flex items-center gap-3">
                                    <span className="text-xs text-text-muted w-6">{beat.sequence}</span>
                                    <span className="flex-1 text-sm text-text-primary">{beat.beatName}</span>
                                    {beat.isComplete ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Edit3 className="w-4 h-4 text-text-muted" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
