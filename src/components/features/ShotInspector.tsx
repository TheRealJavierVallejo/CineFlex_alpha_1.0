import React, { useState, useEffect, useRef } from 'react';
import { Shot, Project, Character, Outfit, Location, ShowToastFn } from '../../types';
import { generateShotImage, generateBatchShotImages, analyzeSketch } from '../../services/gemini';
import { SHOT_TYPES, MODEL_OPTIONS, ASPECT_RATIOS } from '../../constants';
import { Wand2, Upload, Loader2, Camera, MapPin, Users, Settings, Download, X } from 'lucide-react';
import { getCharacters, getOutfits, addToImageLibrary, addBatchToImageLibrary, getLocations } from '../../services/storage';
import Button from '../ui/Button';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { VariationPicker } from '../features/VariationPicker';

interface ShotInspectorProps {
    project: Project;
    shot: Shot;
    onUpdateShot: (id: string, updates: Partial<Shot>) => void;
    showToast: ShowToastFn;
    onClose?: () => void; // Optional close if we use it in mobile/overlay
}

const LOADING_MESSAGES = [
    "Calibrating...", "Lighting...", "Directing...", "Rendering...", "Developing..."
];

export const ShotInspector: React.FC<ShotInspectorProps> = ({ project, shot, onUpdateShot, showToast, onClose }) => {
    // Assets
    const [characters, setCharacters] = useState<Character[]>([]);
    const [outfits, setOutfits] = useState<Outfit[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);

    // State
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Batch Generation
    const [showVariationPicker, setShowVariationPicker] = useState(false);
    const [currentCandidates, setCurrentCandidates] = useState<string[]>(shot.generationCandidates || []);
    const [variationCount, setVariationCount] = useState<number>(project.settings.variationCount || 1);

    // Derived
    const activeChars = characters.filter(c => shot.characterIds.includes(c.id));
    const activeLocation = locations.find(l => l.id === shot.locationId);

    useEffect(() => {
        Promise.all([
            getCharacters(project.id),
            getOutfits(project.id),
            getLocations(project.id)
        ]).then(([c, o, l]) => {
            setCharacters(c);
            setOutfits(o);
            setLocations(l);
        });
    }, [project.id]);

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            interval = setInterval(() => {
                setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Handlers
    const update = (updates: Partial<Shot>) => onUpdateShot(shot.id, updates);

    const handleGenerate = async () => {
        if (!shot.description?.trim() && !shot.sketchImage) {
            showToast("Add description first", 'warning');
            return;
        }

        setIsGenerating(true);
        try {
            if (variationCount > 1) {
                const images = await generateBatchShotImages(
                    shot, project, activeChars, outfits, activeLocation,
                    { model: shot.model || MODEL_OPTIONS[0].value, aspectRatio: shot.aspectRatio || '16:9', imageSize: '1K' },
                    variationCount
                );
                
                // Save to library
                 const newItems = images.map(img => ({
                    id: crypto.randomUUID(),
                    projectId: project.id,
                    url: img,
                    createdAt: Date.now(),
                    shotId: shot.id,
                    prompt: shot.description, 
                    model: shot.model,
                    aspectRatio: shot.aspectRatio
                }));
                await addBatchToImageLibrary(project.id, newItems);

                setCurrentCandidates(images);
                update({ generationCandidates: images });
                setShowVariationPicker(true);
            } else {
                const img = await generateShotImage(
                    shot, project, activeChars, outfits, activeLocation,
                    { model: shot.model || MODEL_OPTIONS[0].value, aspectRatio: shot.aspectRatio || '16:9', imageSize: '1K' }
                );
                
                await addToImageLibrary(project.id, {
                    id: crypto.randomUUID(), projectId: project.id, url: img, createdAt: Date.now(),
                    shotId: shot.id, prompt: shot.description, model: shot.model, aspectRatio: shot.aspectRatio, isFavorite: true
                });

                update({ generatedImage: img, generationCandidates: [img, ...(shot.generationCandidates || [])] });
            }
            showToast("Render complete", 'success');
        } catch (e) {
            console.error(e);
            showToast("Render failed", 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSketchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            update({ sketchImage: base64 });
            setIsAnalyzing(true);
            const analysis = await analyzeSketch(base64);
            if (analysis) update({ description: (shot.description ? shot.description + " " : "") + analysis });
            setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="h-full flex flex-col bg-surface border-l border-border w-[380px] shrink-0 z-10">
            {/* VARIATION PICKER OVERLAY */}
            {showVariationPicker && (
                <VariationPicker
                    candidates={currentCandidates}
                    onSelect={(img) => {
                        update({ generatedImage: img });
                        setShowVariationPicker(false);
                    }}
                    onCancel={() => setShowVariationPicker(false)}
                    onGenerateMore={handleGenerate}
                    onRegenerateSlot={() => {}} 
                    isGeneratingMore={isGenerating}
                    generatingSlotIndex={null}
                />
            )}

            {/* HEADER */}
            <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-surface-secondary shrink-0">
                <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Shot Inspector</span>
                     <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono text-[10px]">#{shot.sequence}</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-text-tertiary hover:text-white"><X className="w-4 h-4" /></button>
                )}
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* PREVIEW AREA (Sticky Top) */}
                <div className="bg-black aspect-video relative group border-b border-border shrink-0">
                    {shot.generatedImage ? (
                        <img src={shot.generatedImage} className="w-full h-full object-contain" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary">
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                    <span className="text-[10px] font-mono">{loadingMsg}</span>
                                </>
                            ) : (
                                <span className="text-xs">No Image Generated</span>
                            )}
                        </div>
                    )}
                    
                    {/* Toolbar Overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         {shot.generatedImage && (
                            <a href={shot.generatedImage} download={`shot_${shot.sequence}.png`} className="p-1.5 bg-black/50 hover:bg-primary text-white rounded backdrop-blur">
                                <Download className="w-3 h-3" />
                            </a>
                         )}
                    </div>
                </div>

                {/* GENERATE BUTTON BAR */}
                <div className="p-3 border-b border-border bg-[#121212]">
                     <Button 
                        variant="primary" 
                        className="w-full justify-center h-9"
                        icon={isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        onClick={handleGenerate}
                        disabled={isGenerating}
                    >
                        {isGenerating ? 'Rendering...' : 'Generate Frame'}
                    </Button>
                </div>

                {/* CONTROLS */}
                <div className="p-4 space-y-1">
                    
                    {/* 1. PROMPT */}
                    <CollapsibleSection title="Prompt & Description" defaultOpen>
                        <textarea 
                            value={shot.description}
                            onChange={(e) => update({ description: e.target.value })}
                            className="studio-input h-24 resize-none leading-relaxed text-xs"
                            placeholder="Describe the shot..."
                        />
                        <div className="mt-2 flex gap-2">
                             <div 
                                className="w-12 h-12 bg-surface border border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-primary shrink-0 relative overflow-hidden"
                                onClick={() => document.getElementById('inspector-sketch')?.click()}
                                title="Upload Sketch"
                             >
                                {shot.sketchImage ? <img src={shot.sketchImage} className="w-full h-full object-cover" /> : <Upload className="w-4 h-4 text-text-tertiary" />}
                                <input id="inspector-sketch" type="file" className="hidden" onChange={handleSketchUpload} />
                             </div>
                             {isAnalyzing && <span className="text-[10px] text-primary self-center animate-pulse">Analyzing sketch...</span>}
                        </div>
                    </CollapsibleSection>

                    {/* 2. CAMERA */}
                    <CollapsibleSection title="Camera Settings" icon={<Camera className="w-3 h-3" />} defaultOpen>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] uppercase text-text-tertiary font-bold mb-1 block">Shot Type</label>
                                <select 
                                    value={shot.shotType}
                                    onChange={(e) => update({ shotType: e.target.value })}
                                    className="studio-input"
                                >
                                    {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] uppercase text-text-tertiary font-bold mb-1 block">Aspect Ratio</label>
                                <select 
                                    value={shot.aspectRatio || '16:9'}
                                    onChange={(e) => update({ aspectRatio: e.target.value })}
                                    className="studio-input"
                                >
                                    {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="text-[9px] uppercase text-text-tertiary font-bold mb-1 block">Variations</label>
                            <div className="flex bg-surface border border-border rounded p-0.5">
                                {[1, 2, 4].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setVariationCount(n)}
                                        className={`flex-1 py-1 text-xs font-medium rounded-sm ${variationCount === n ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
                                    >
                                        {n}x
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* 3. ASSETS */}
                    <CollapsibleSection title="Cast & Location" icon={<Users className="w-3 h-3" />}>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] uppercase text-text-tertiary font-bold mb-1 block">Characters</label>
                                <div className="space-y-1">
                                    {characters.map(char => (
                                        <div 
                                            key={char.id}
                                            onClick={() => {
                                                const ids = shot.characterIds.includes(char.id) 
                                                    ? shot.characterIds.filter(id => id !== char.id)
                                                    : [...shot.characterIds, char.id];
                                                update({ characterIds: ids });
                                            }}
                                            className={`
                                                flex items-center gap-2 p-1.5 rounded-sm cursor-pointer border
                                                ${shot.characterIds.includes(char.id) ? 'bg-primary/10 border-primary text-text-primary' : 'bg-surface border-border text-text-secondary hover:border-text-tertiary'}
                                            `}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${shot.characterIds.includes(char.id) ? 'bg-primary' : 'bg-border'}`} />
                                            <span className="text-xs font-medium">{char.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] uppercase text-text-tertiary font-bold mb-1 block">Location Override</label>
                                <div className="relative">
                                    <select 
                                        value={shot.locationId || ''}
                                        onChange={(e) => update({ locationId: e.target.value || undefined })}
                                        className="studio-input pl-7"
                                    >
                                        <option value="">None (Use Scene Default)</option>
                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                    <MapPin className="absolute left-2 top-2 w-3 h-3 text-text-tertiary" />
                                </div>
                            </div>
                        </div>
                    </CollapsibleSection>
                    
                    {/* 4. ADVANCED */}
                    <CollapsibleSection title="Advanced" icon={<Settings className="w-3 h-3" />}>
                        <div className="space-y-2">
                             <label className="text-[9px] uppercase text-text-tertiary font-bold mb-1 block">Negative Prompt</label>
                             <input 
                                value={shot.negativePrompt || ''}
                                onChange={(e) => update({ negativePrompt: e.target.value })}
                                className="studio-input"
                                placeholder="blurry, bad quality..."
                             />
                        </div>
                    </CollapsibleSection>
                </div>
            </div>
        </div>
    );
};