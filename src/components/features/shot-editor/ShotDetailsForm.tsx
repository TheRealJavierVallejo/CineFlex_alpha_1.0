import React, { RefObject } from 'react';
import { Shot, Project, Character, Location } from '../../../types';
import { SHOT_TYPES, TIMES_OF_DAY, ASPECT_RATIOS, IMAGE_RESOLUTIONS } from '../../../constants';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { FileText, MapPin, Info, Camera, Users, Ban, Settings, Upload, Loader2, Trash2, RotateCcw, Lock, Sparkles, GraduationCap } from 'lucide-react';
import Button from '../../ui/Button';
import { FeatureGate } from '../../ui/FeatureGate';
import { DebouncedTextarea } from '../../ui/DebouncedTextarea';
import { DebouncedInput } from '../../ui/DebouncedInput';

interface ShotDetailsFormProps {
    shot: Shot;
    setShot: React.Dispatch<React.SetStateAction<Shot>>;
    project: Project;
    characters: Character[];
    locations: Location[];
    activeLocation?: Location;
    descriptionRef: RefObject<HTMLTextAreaElement>;
    noCharacters: boolean;
    setNoCharacters: (value: boolean) => void;
    isAnalyzing: boolean;
    handleSketchUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleReferenceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleResetDefaults: () => void;
    selectedAspectRatio: string;
    setSelectedAspectRatio: (value: string) => void;
    selectedResolution: string;
    setSelectedResolution: (value: string) => void;
    viewMode: 'base' | 'pro';
    setViewMode: (mode: 'base' | 'pro') => void;
    tier: 'free' | 'pro';
}

export const ShotDetailsForm: React.FC<ShotDetailsFormProps> = ({
    shot,
    setShot,
    project,
    characters,
    locations,
    activeLocation,
    descriptionRef,
    noCharacters,
    setNoCharacters,
    isAnalyzing,
    handleSketchUpload,
    handleReferenceUpload,
    handleResetDefaults,
    selectedAspectRatio,
    setSelectedAspectRatio,
    selectedResolution,
    setSelectedResolution,
    viewMode,
    setViewMode,
    tier
}) => {
    return (
        <div className="w-[400px] flex flex-col border-r border-border bg-surface relative">
            {/* Header with Mode Toggle */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-surface shrink-0 z-20">
                <div className="flex bg-surface-secondary rounded-lg p-1 border border-border w-full">
                    <button
                        onClick={() => setViewMode('base')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-colors flex items-center justify-center gap-2 ${viewMode === 'base' ? 'bg-background text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        {tier === 'free' && <GraduationCap className="w-3 h-3" />} Base
                    </button>
                    <button
                        onClick={() => setViewMode('pro')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-colors flex items-center justify-center gap-2 ${viewMode === 'pro' ? 'bg-background text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Pro {tier === 'free' && <Lock className="w-3 h-3 text-text-muted" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface relative">

                {/* === BASE MODE (FREE FEATURES ONLY) === */}
                {viewMode === 'base' && (
                    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-left-2 duration-200">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Description</label>
                            <DebouncedTextarea
                                textareaRef={descriptionRef}
                                value={shot.description}
                                onChange={val => setShot(prev => ({ ...prev, description: val }))}
                                className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-primary resize-none h-40 leading-relaxed text-text-primary placeholder:text-text-muted"
                                placeholder="Describe the visual..."
                            />
                            <p className="text-[10px] text-text-muted mt-2">
                                Tip: Be specific about subject, action, and lighting.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Aspect Ratio</label>
                            <select
                                aria-label="Aspect Ratio"
                                value={selectedAspectRatio}
                                onChange={(e) => setSelectedAspectRatio(e.target.value)}
                                className="studio-input"
                            >
                                {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Negative Prompt</label>
                            <DebouncedInput
                                value={shot.negativePrompt || ''}
                                onChange={val => setShot(prev => ({ ...prev, negativePrompt: val }))}
                                className="studio-input"
                                placeholder="What to avoid (e.g. text, blur)..."
                            />
                        </div>
                    </div>
                )}


                {/* === PRO MODE (FULL STUDIO) === */}
                {viewMode === 'pro' && (
                    <div className={`relative ${tier === 'free' ? 'opacity-30 pointer-events-none select-none filter blur-[1px] overflow-hidden h-full' : ''}`}>

                        {/* 1. CORE DETAILS */}
                        <CollapsibleSection title="Shot Details" icon={<FileText className="w-4 h-4 text-primary" />} defaultOpen={true}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Prompt / Description</label>
                                    <DebouncedTextarea
                                        value={shot.description}
                                        onChange={val => setShot(prev => ({ ...prev, description: val }))}
                                        className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-primary resize-none h-32 leading-relaxed text-text-primary placeholder:text-text-muted"
                                        placeholder="Describe the visual..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Location / Set</label>
                                    <div className="relative">
                                        <select
                                            aria-label="Location"
                                            value={shot.locationId || ''}
                                            onChange={(e) => setShot(prev => ({ ...prev, locationId: e.target.value || undefined }))}
                                            className="studio-input appearance-none pr-8 cursor-pointer"
                                        >
                                            <option value="">No specific location</option>
                                            {locations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                            ))}
                                        </select>
                                        <MapPin className="absolute right-3 top-2.5 w-4 h-4 text-text-muted pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* 2. CAMERA & STYLE */}
                        <CollapsibleSection title="Camera & Style" icon={<Camera className="w-4 h-4 text-primary" />} defaultOpen={true}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2">Aspect Ratio</label>
                                    <select
                                        aria-label="Aspect Ratio"
                                        value={selectedAspectRatio}
                                        onChange={(e) => setSelectedAspectRatio(e.target.value)}
                                        className="studio-input"
                                    >
                                        {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2">Resolution</label>
                                    <select
                                        aria-label="Resolution"
                                        value={selectedResolution}
                                        onChange={(e) => setSelectedResolution(e.target.value)}
                                        className="studio-input"
                                    >
                                        {IMAGE_RESOLUTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2">Shot Type</label>
                                    <select
                                        aria-label="Shot Type"
                                        value={shot.shotType}
                                        onChange={(e) => setShot(prev => ({ ...prev, shotType: e.target.value }))}
                                        className="studio-input"
                                    >
                                        {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2">Time of Day</label>
                                    <select
                                        aria-label="Time of Day"
                                        value={shot.timeOfDay || ''}
                                        onChange={(e) => setShot(prev => ({ ...prev, timeOfDay: e.target.value || undefined }))}
                                        className="studio-input"
                                    >
                                        <option value="">Use Project Default</option>
                                        {TIMES_OF_DAY.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* 3. CAST */}
                        <CollapsibleSection title="Cast" icon={<Users className="w-4 h-4 text-primary" />} defaultOpen={true}>
                            <div className="p-4 bg-surface-secondary border border-border rounded text-xs text-text-secondary space-y-2">
                                {characters.length === 0 ? (
                                    <div className="text-center text-text-muted italic">No characters in project</div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {characters.map(char => (
                                            <label key={char.id} className="flex items-center gap-2 p-2 bg-background border border-border rounded cursor-pointer hover:border-primary">
                                                <input
                                                    type="checkbox"
                                                    checked={shot.characterIds.includes(char.id)}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked
                                                            ? [...shot.characterIds, char.id]
                                                            : shot.characterIds.filter(id => id !== char.id);
                                                        setShot(prev => ({ ...prev, characterIds: newIds }));
                                                    }}
                                                    className="accent-primary"
                                                />
                                                <span className="truncate">{char.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CollapsibleSection>

                        {/* 4. ADVANCED */}
                        <CollapsibleSection title="Advanced" icon={<Settings className="w-4 h-4 text-primary" />} defaultOpen={false}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2">Negative Prompt</label>
                                    <DebouncedInput
                                        value={shot.negativePrompt || ''}
                                        onChange={val => setShot(prev => ({ ...prev, negativePrompt: val }))}
                                        className="studio-input"
                                        placeholder="What to avoid (e.g. text, blur)..."
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-xs font-semibold text-text-secondary">Sketch Reference</label>
                                    <div className="relative border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors text-center cursor-pointer bg-surface-secondary">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleSketchUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center gap-2 text-text-muted pointer-events-none">
                                            {shot.sketchImage ? (
                                                <img src={shot.sketchImage} className="max-h-20 rounded" />
                                            ) : (
                                                <>
                                                    {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                    <span className="text-[10px] uppercase font-bold tracking-wide">Upload Sketch</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CollapsibleSection>
                    </div>
                )}

                {/* PAYWALL OVERLAY */}
                {viewMode === 'pro' && tier === 'free' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                        <div className="w-20 h-20 bg-surface border border-border rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-3">Pro Studio Locked</h3>
                        <p className="text-sm text-text-secondary mb-8 leading-relaxed max-w-[280px]">
                            Upgrade to unlock persistent characters, locations, consistent style control, and sketches.
                        </p>
                        <Button variant="primary" className="w-full shadow-lg shadow-primary/20">Upgrade to Pro</Button>
                    </div>
                )}

            </div>
        </div>
    );
};