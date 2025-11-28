import React, { RefObject } from 'react';
import { Shot, Project, Character, Location } from '../../../types';
import { SHOT_TYPES, TIMES_OF_DAY, ASPECT_RATIOS, IMAGE_RESOLUTIONS } from '../../../constants';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { FileText, MapPin, Info, Camera, Users, Ban, Settings, Upload, Loader2, Trash2, RotateCcw } from 'lucide-react';
import Button from '../../ui/Button';

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
    setSelectedResolution
}) => {
    return (
        <div className="w-[400px] flex flex-col border-r border-border bg-surface">
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0">
                <div>
                    <h2 className="text-text-primary font-bold text-base flex items-center gap-2">
                        <span className="text-text-tertiary text-xs font-normal">SHOT #{shot.sequence}</span>
                        <span>Editor</span>
                    </h2>
                </div>
                <div className="text-xs text-text-muted font-mono">{shot.id.substring(0, 6)}</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface">
                {/* Shot Details Section */}
                <CollapsibleSection title="Shot Details" icon={<FileText className="w-4 h-4 text-primary" />} defaultOpen={true}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Prompt / Description</label>
                            <textarea
                                ref={descriptionRef}
                                value={shot.description}
                                onChange={e => setShot(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-primary resize-none h-32 leading-relaxed text-text-primary placeholder:text-text-muted"
                                placeholder="Describe the action, subject, camera angle, and lighting..."
                            />
                        </div>

                        {/* Location Selection */}
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Location / Set</label>
                            <div className="relative">
                                <select
                                    value={shot.locationId || ''}
                                    onChange={(e) => setShot(prev => ({ ...prev, locationId: e.target.value || undefined }))}
                                    className="studio-input appearance-none pr-8 cursor-pointer"
                                >
                                    <option value="">No specific location (Use Prompt)</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                                <MapPin className="absolute right-3 top-2.5 w-4 h-4 text-text-muted pointer-events-none" />
                            </div>
                            {activeLocation && (
                                <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded text-xs text-text-secondary flex items-start gap-2">
                                    <Info className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                                    <div>
                                        <span className="font-semibold text-primary block">Using Reference:</span>
                                        <span className="opacity-80">{activeLocation.description}</span>
                                        {activeLocation.referencePhotos && activeLocation.referencePhotos.length > 0 && (
                                            <div className="mt-1 text-[10px] text-text-tertiary">{activeLocation.referencePhotos.length} reference photos active</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Notes</label>
                            <input
                                value={shot.notes}
                                onChange={e => setShot(prev => ({ ...prev, notes: e.target.value }))}
                                className="studio-input"
                                placeholder="Director's notes (optional)..."
                            />
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Camera & Style Section */}
                <CollapsibleSection title="Camera & Style" icon={<Camera className="w-4 h-4 text-primary" />} defaultOpen={true}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary mb-2">Aspect Ratio</label>
                                <select
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
                                    value={selectedResolution}
                                    onChange={(e) => setSelectedResolution(e.target.value)}
                                    className="studio-input"
                                >
                                    {IMAGE_RESOLUTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2">Shot Type</label>
                            <div className="flex flex-wrap gap-2">
                                {SHOT_TYPES.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setShot(prev => ({ ...prev, shotType: t }))}
                                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all border ${shot.shotType === t
                                            ? 'bg-primary text-white border-primary shadow-md'
                                            : 'bg-surface-secondary border-border text-text-secondary hover:border-text-primary'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2">Time of Day</label>
                            <select
                                value={shot.timeOfDay || ''}
                                onChange={(e) => setShot(prev => ({ ...prev, timeOfDay: e.target.value === '' ? undefined : e.target.value }))}
                                className="studio-input"
                            >
                                <option value="">Use Project Default ({project.settings.timeOfDay})</option>
                                {TIMES_OF_DAY.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-semibold text-text-secondary">Style Strength</label>
                                <span className="text-xs font-mono text-primary font-bold">{shot.styleStrength ?? 100}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={shot.styleStrength ?? 100}
                                onChange={(e) => setShot(prev => ({ ...prev, styleStrength: parseInt(e.target.value) }))}
                                className="w-full h-1.5 bg-surface-secondary border border-border rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Cast Section */}
                <CollapsibleSection title="Cast" icon={<Users className="w-4 h-4 text-primary" />} defaultOpen={false}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-border">
                            <div className="flex items-center gap-2">
                                <Ban className="w-4 h-4 text-text-secondary" />
                                <span className="text-sm font-medium text-text-secondary">No Characters</span>
                            </div>
                            <button
                                onClick={() => setNoCharacters(!noCharacters)}
                                className={`w-10 h-5 rounded-full relative transition-colors ${noCharacters ? 'bg-primary' : 'bg-border'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${noCharacters ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className={`space-y-2 transition-opacity ${noCharacters ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="text-xs text-text-secondary mb-2">Select characters to include in the scene.</div>
                            {characters.length === 0 ? (
                                <div className="text-center text-text-muted py-4 text-sm border border-dashed border-border rounded">No characters in project</div>
                            ) : (
                                characters.map(char => (
                                    <div
                                        key={char.id}
                                        onClick={() => {
                                            const ids = shot.characterIds.includes(char.id)
                                                ? shot.characterIds.filter(id => id !== char.id)
                                                : [...shot.characterIds, char.id];
                                            setShot(prev => ({ ...prev, characterIds: ids }));
                                        }}
                                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${shot.characterIds.includes(char.id)
                                            ? 'bg-primary/10 border-primary'
                                            : 'bg-surface-secondary border-border hover:border-text-muted'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${shot.characterIds.includes(char.id) ? 'border-primary bg-primary' : 'border-text-muted'
                                            }`}>
                                            {shot.characterIds.includes(char.id) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <span className={`font-medium text-sm ${shot.characterIds.includes(char.id) ? 'text-text-primary' : 'text-text-secondary'
                                            }`}>{char.name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Advanced Section */}
                <CollapsibleSection title="Advanced" icon={<Settings className="w-4 h-4 text-primary" />} defaultOpen={false}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2">Negative Prompt</label>
                            <input
                                value={shot.negativePrompt || ''}
                                onChange={e => setShot(prev => ({ ...prev, negativePrompt: e.target.value }))}
                                className="studio-input"
                                placeholder="e.g., blurry, low quality, text"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2">Sketch Reference</label>
                            <div className="flex gap-3">
                                <div
                                    className="w-20 h-20 bg-surface-secondary border-2 border-dashed border-border rounded-lg flex items-center justify-center relative group hover:border-primary transition-colors cursor-pointer overflow-hidden"
                                    onClick={() => document.getElementById('sketch-upload')?.click()}
                                >
                                    {shot.sketchImage ? (
                                        <img src={shot.sketchImage} className="w-full h-full object-contain p-1" alt="Sketch" />
                                    ) : <Upload className="w-5 h-5 text-text-muted" />}
                                    <input id="sketch-upload" type="file" onChange={handleSketchUpload} className="hidden" />
                                </div>
                                <div className="flex-1 text-xs text-text-tertiary py-1">
                                    <p className="mb-1">Upload a rough sketch or storyboard frame.</p>
                                    {isAnalyzing && <div className="flex items-center gap-2 text-primary"><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</div>}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2">Reference Image (ControlNet)</label>
                            <div className="flex gap-3">
                                <div className="w-20 h-20 bg-surface-secondary border-2 border-dashed border-border rounded-lg flex items-center justify-center relative group hover:border-primary transition-colors overflow-hidden">
                                    {shot.referenceImage ? (
                                        <>
                                            <img src={shot.referenceImage} className="w-full h-full object-cover" alt="Reference" />
                                            <button onClick={() => setShot(prev => ({ ...prev, referenceImage: undefined }))} className="absolute inset-0 media-control opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><Trash2 className="w-4 h-4" /></button>
                                        </>
                                    ) : <Upload className="w-4 h-4 text-text-muted" />}
                                    <input type="file" onChange={handleReferenceUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex bg-surface-secondary rounded p-0.5 border border-border w-fit">
                                        {['depth', 'canny'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setShot(prev => ({ ...prev, controlType: t as any }))}
                                                className={`px-2 py-0.5 text-[10px] uppercase rounded ${shot.controlType === t ? 'bg-primary text-white' : 'text-text-tertiary'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="range"
                                        value={shot.referenceStrength || 50}
                                        onChange={(e) => setShot(prev => ({ ...prev, referenceStrength: parseInt(e.target.value) }))}
                                        className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={<RotateCcw className="w-3 h-3" />}
                                onClick={handleResetDefaults}
                            >
                                Reset Defaults
                            </Button>
                        </div>
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
};
