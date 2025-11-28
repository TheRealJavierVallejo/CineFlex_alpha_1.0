import React, { RefObject } from 'react';
import { Shot, Project, Character, Location } from '../../../types';
import { SHOT_TYPES, TIMES_OF_DAY, ASPECT_RATIOS, IMAGE_RESOLUTIONS } from '../../../constants';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { FileText, MapPin, Info, Camera, Users, Ban, Settings, Upload, Loader2, Trash2, RotateCcw } from 'lucide-react';
import Button from '../../ui/Button';
import { FeatureGate } from '../../ui/FeatureGate';

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
                {/* 1. CORE DETAILS (Allowed) */}
                <CollapsibleSection title="Shot Details" icon={<FileText className="w-4 h-4 text-primary" />} defaultOpen={true}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Prompt / Description</label>
                            <textarea
                                ref={descriptionRef}
                                value={shot.description}
                                onChange={e => setShot(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-3 text-sm outline-none focus:border-primary resize-none h-32 leading-relaxed text-text-primary placeholder:text-text-muted"
                                placeholder="Describe the visual..."
                            />
                        </div>

                        {/* Location - GATED */}
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Location / Set</label>
                            <FeatureGate label="Location Management">
                                <div className="relative">
                                    <select
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
                            </FeatureGate>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Notes</label>
                            <input
                                value={shot.notes}
                                onChange={e => setShot(prev => ({ ...prev, notes: e.target.value }))}
                                className="studio-input"
                                placeholder="Director's notes (metadata only)..."
                            />
                        </div>
                    </div>
                </CollapsibleSection>

                {/* 2. CAMERA & STYLE */}
                <CollapsibleSection title="Camera & Style" icon={<Camera className="w-4 h-4 text-primary" />} defaultOpen={true}>
                    <div className="space-y-4">
                        {/* Aspect Ratio - Allowed */}
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

                        {/* Other Camera Controls - GATED */}
                        <FeatureGate label="Pro Camera Tools">
                             <div className="space-y-4 pt-2 opacity-50 pointer-events-none grayscale">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2">Resolution</label>
                                    <select disabled className="studio-input"><option>1024x1024 (Std)</option></select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2">Shot Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {SHOT_TYPES.slice(0, 4).map(t => (
                                            <button key={t} className="px-3 py-1.5 rounded text-xs border border-border bg-surface-secondary">{t}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-2">Time of Day</label>
                                    <select disabled className="studio-input"><option>Default</option></select>
                                </div>
                             </div>
                        </FeatureGate>
                    </div>
                </CollapsibleSection>

                {/* 3. CAST - COMPLETELY GATED */}
                <CollapsibleSection title="Cast" icon={<Users className="w-4 h-4 text-primary" />} defaultOpen={false}>
                    <FeatureGate label="Character Consistency">
                        <div className="p-4 border border-dashed border-border rounded text-center text-xs text-text-muted">
                            Manage cast and maintain face consistency in Pro.
                        </div>
                    </FeatureGate>
                </CollapsibleSection>

                {/* 4. ADVANCED */}
                <CollapsibleSection title="Advanced" icon={<Settings className="w-4 h-4 text-primary" />} defaultOpen={false}>
                    <div className="space-y-4">
                        {/* Negative Prompt - Allowed */}
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2">Negative Prompt</label>
                            <input
                                value={shot.negativePrompt || ''}
                                onChange={e => setShot(prev => ({ ...prev, negativePrompt: e.target.value }))}
                                className="studio-input"
                                placeholder="What to avoid (e.g. text, blur)..."
                            />
                        </div>

                        {/* Sketch & ControlNet - GATED */}
                        <div className="space-y-4">
                            <label className="block text-xs font-semibold text-text-secondary">Image References</label>
                            <FeatureGate label="Sketch & ControlNet">
                                <div className="h-20 bg-surface-secondary border-2 border-dashed border-border rounded flex items-center justify-center">
                                    <span className="text-[10px] text-text-muted">Uploads locked</span>
                                </div>
                            </FeatureGate>
                        </div>
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
};