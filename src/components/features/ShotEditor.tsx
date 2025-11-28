/*
 * 🎨 COMPONENT: SHOT EDITOR (Studio Layout)
 * Commercial Quality Update: Teal Theme & Studio Classes
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shot, Project, Character, Outfit, ShowToastFn, Location } from '../../types';
import { generateShotImage, generateBatchShotImages, analyzeSketch } from '../../services/gemini';
import { constructPrompt } from '../../services/promptBuilder';
import { SHOT_TYPES, MODEL_OPTIONS, ASPECT_RATIOS, IMAGE_RESOLUTIONS, TIMES_OF_DAY } from '../../constants';
import { X, Wand2, RefreshCw, Copy, Eye, Image as ImageIcon, Maximize2, Upload, Loader2, Trash2, RotateCcw, Ban, Info, Camera, Users, Settings, ArrowLeft, MapPin, FileText } from 'lucide-react';
import { getCharacters, getOutfits, addToImageLibrary, addBatchToImageLibrary, toggleImageFavorite, getImageLibrary, getLocations } from '../../services/storage';
import Button from '../ui/Button';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { VariationPicker } from '../features/VariationPicker';

interface ShotEditorProps {
  project: Project;
  onUpdateShot: (shot: Shot) => void;
  onClose: () => void;
  activeShot: Shot | null;
  showToast: ShowToastFn;
}

const LOADING_MESSAGES = [
  "Calibrating lenses...",
  "Setting up lighting...",
  "Directing actors...",
  "Scouting location...",
  "Adjusting aperture...",
  "Applying color grade...",
  "Developing film...",
  "Focusing camera..."
];

export const ShotEditor: React.FC<ShotEditorProps> = ({ project, onUpdateShot, onClose, activeShot, showToast }) => {
  // --- STATE ---
  const [shot, setShot] = useState<Shot>(activeShot || {
    id: crypto.randomUUID(),
    sequence: project.shots.length + 1,
    description: '',
    notes: '',
    characterIds: [],
    shotType: 'Wide Shot',
    aspectRatio: project.settings.aspectRatio || '16:9',
    model: MODEL_OPTIONS[0].value,
    imageSize: '1K',
    generationCandidates: [],
    generationInProgress: false,
    controlType: 'depth',
    referenceStrength: 50,
    timeOfDay: undefined,
    negativePrompt: '',
    styleStrength: 100,
    locationId: undefined // Explicitly init
  });
  
  const [characters, setCharacters] = useState<Character[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [locations, setLocations] = useState<Location[]>([]); // New State

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  const [showVariationPicker, setShowVariationPicker] = useState(false);
  const [currentCandidates, setCurrentCandidates] = useState<string[]>(shot.generationCandidates || []);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [detectedReferenceRatio, setDetectedReferenceRatio] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [noCharacters, setNoCharacters] = useState(false);

  // Local Settings
  const [selectedModel, setSelectedModel] = useState(shot.model || MODEL_OPTIONS[0].value);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(shot.aspectRatio || project.settings.aspectRatio || '16:9');
  const [variationCount, setVariationCount] = useState<number>(project.settings.variationCount || 1);
  const [selectedResolution, setSelectedResolution] = useState<string>(project.settings.imageResolution || '2048x2048');

  const containerRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const activeChars = characters.filter(c => shot.characterIds.includes(c.id));
  const activeLocation = locations.find(l => l.id === shot.locationId);

  // --- KEYBOARD & FOCUS ---
  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPromptPreview) setShowPromptPreview(false);
        else onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPromptPreview]);

  // Loading Message Cycler
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
       interval = setInterval(() => {
          setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
       }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load assets
  useEffect(() => {
    const loadAssets = async () => {
      const [chars, outfs, locs] = await Promise.all([
        getCharacters(project.id),
        getOutfits(project.id),
        getLocations(project.id)
      ]);
      setCharacters(chars);
      setOutfits(outfs);
      setLocations(locs);
    };
    loadAssets();
  }, [project.id]);

  // Sync settings
  useEffect(() => {
    setShot(prev => ({
      ...prev,
      model: selectedModel,
      aspectRatio: selectedAspectRatio,
      imageSize: selectedResolution
    }));
  }, [selectedModel, selectedAspectRatio, selectedResolution]);

  // Aspect Ratio Detection
  const getImageAspectRatio = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = (img.width / img.height).toFixed(2);
        const width = img.width;
        const height = img.height;
        if (Math.abs(Number(ratio) - 1.78) < 0.05) resolve('16:9');
        else if (Math.abs(Number(ratio) - 2.35) < 0.05) resolve('2.35:1');
        else if (Math.abs(Number(ratio) - 2.39) < 0.05) resolve('2.39:1');
        else if (Math.abs(Number(ratio) - 2.33) < 0.05) resolve('21:9');
        else if (Math.abs(Number(ratio) - 1.33) < 0.05) resolve('4:3');
        else if (Math.abs(Number(ratio) - 1.0) < 0.05) resolve('1:1');
        else resolve(`${width}:${height}`);
      };
      img.onerror = () => resolve('Unknown');
      img.src = imageUrl;
    });
  };

  useEffect(() => {
    if (shot.referenceImage && selectedAspectRatio === 'Match Reference') {
      getImageAspectRatio(shot.referenceImage).then(ratio => {
        setDetectedReferenceRatio(ratio);
      });
    } else {
      setDetectedReferenceRatio(null);
    }
  }, [shot.referenceImage, selectedAspectRatio]);

  // --- HANDLERS ---
  const handleSketchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setShot(prev => ({ ...prev, sketchImage: base64 }));
        setIsAnalyzing(true);
        showToast("Analyzing sketch...", 'info');
        const analysis = await analyzeSketch(base64);
        if (analysis) {
          setShot(prev => ({ ...prev, description: prev.description ? prev.description + " " + analysis : analysis }));
          showToast("Sketch analysis added", 'success');
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setShot(prev => ({
          ...prev,
          referenceImage: reader.result as string,
          controlType: prev.controlType || 'depth',
          referenceStrength: prev.referenceStrength || 50
        }));
        showToast("Reference image added", 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetDefaults = () => {
    setShot(prev => ({
      ...prev,
      styleStrength: 100,
      timeOfDay: undefined,
      negativePrompt: ''
    }));
    showToast("Advanced settings reset to defaults", 'success');
  };

  const handleGenerate = async () => {
    if (!shot.description?.trim() && !shot.sketchImage) {
      showToast("Please add a scene description or upload a sketch before rendering.", 'warning');
      return;
    }
    const hasMissingPhotos = activeChars.some(c => !c.referencePhotos || c.referencePhotos.length === 0);
    if (activeChars.length > 0 && hasMissingPhotos) {
      showToast("Warning: Selected characters have no reference photos.", 'warning');
    }

    setIsGenerating(true);
    // Removed toast here to reduce noise, UI has spinner
    
    try {
      // Common Payload Construction
      const effectiveShot = noCharacters ? { ...shot, negativePrompt: (shot.negativePrompt || '') + ', humans, people, characters, faces' } : shot;
      const effectiveChars = noCharacters ? [] : activeChars;

      if (variationCount > 1) {
        const images = await generateBatchShotImages(
          effectiveShot,
          project,
          effectiveChars,
          outfits,
          activeLocation, // NEW
          {
            model: selectedModel,
            aspectRatio: selectedAspectRatio,
            imageSize: selectedResolution
          },
          variationCount
        );

        // Save all candidates to library in a batch to avoid race conditions
        const newItems = images.map(img => ({
            id: crypto.randomUUID(),
            projectId: project.id,
            url: img,
            createdAt: Date.now(),
            shotId: shot.id,
            prompt: constructPrompt(shot, project, effectiveChars, outfits, activeLocation, selectedAspectRatio),
            model: selectedModel,
            aspectRatio: selectedAspectRatio
        }));
        
        await addBatchToImageLibrary(project.id, newItems);

        setCurrentCandidates(images);
        setShowVariationPicker(true);
        onUpdateShot({ ...shot, generationCandidates: images });
        showToast("Batch complete", 'success');
      } else {
        const img = await generateShotImage(
          effectiveShot,
          project,
          effectiveChars,
          outfits,
          activeLocation, // NEW
          {
            model: selectedModel,
            aspectRatio: selectedAspectRatio,
            imageSize: selectedResolution
          }
        );

        // Save to library and mark as selected (since it's being used in a shot)
        const imageId = crypto.randomUUID();
        await addToImageLibrary(project.id, {
          id: imageId,
          projectId: project.id,
          url: img,
          createdAt: Date.now(),
          shotId: shot.id,
          prompt: constructPrompt(shot, project, effectiveChars, outfits, activeLocation, selectedAspectRatio),
          model: selectedModel,
          aspectRatio: selectedAspectRatio,
          isFavorite: true // Auto-mark as selected since it's used in a shot
        });
        const updated = { ...shot, generatedImage: img, generationCandidates: [img, ...(shot.generationCandidates || [])] }; // Add to history
        setShot(updated);
        onUpdateShot(updated);
        showToast("Render successful", 'success');
      }
    } catch (e) {
      showToast("Render failed", 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectVariation = async (image: string) => {
    const updated = { ...shot, generatedImage: image, generationCandidates: currentCandidates };
    setShot(updated);
    onUpdateShot(updated);

    // Auto-mark the selected image as it's now being used in a shot
    const library = await getImageLibrary(project.id);
    const selectedImageItem = library.find(item => item.url === image);
    if (selectedImageItem && !selectedImageItem.isFavorite) {
      await toggleImageFavorite(project.id, selectedImageItem.id);
    }

    setShowVariationPicker(false);
    showToast("Variation selected", 'success');
  };

  const handleSave = () => {
    onUpdateShot(shot);
    onClose();
    showToast("Shot saved", 'success');
  };

  const handleCopyPrompt = () => {
    const txt = constructPrompt(shot, project, activeChars, outfits, activeLocation, selectedAspectRatio);
    navigator.clipboard.writeText(txt);
    showToast("Prompt copied to clipboard", 'success');
  };

  const handleAutoGeneratePrompt = async () => {
    if (!shot.description) {
      showToast("Please add a description first.", 'warning');
      return;
    }
    setIsGeneratingPrompt(true);
    showToast("Enhancing prompt...", 'info');
    try {
      // This is a placeholder for the actual prompt enhancement logic
      // For now, it just appends a generic phrase.
      const enhancedPrompt = shot.description + ", cinematic, highly detailed, 8k, professional photography";
      setShot(prev => ({ ...prev, description: enhancedPrompt }));
      showToast("Prompt enhanced!", 'success');
    } catch (error) {
      showToast("Failed to enhance prompt.", 'error');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const getAspectRatioStyle = (ratio: string) => {
    if (ratio === 'Match Reference' && detectedReferenceRatio) {
      const [w, h] = detectedReferenceRatio.split(':').map(Number);
      if (!isNaN(w) && !isNaN(h)) return { aspectRatio: `${w}/${h}` };
    }
    if (ratio === 'Match Reference' || !ratio) {
      return { aspectRatio: '16/9' };
    }
    const [w, h] = ratio.split(':').map(Number);
    return { aspectRatio: `${w}/${h}` };
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Shot Editor"
    >

      {showVariationPicker && (
        <VariationPicker
          candidates={currentCandidates}
          onSelect={handleSelectVariation}
          onCancel={() => setShowVariationPicker(false)}
          onGenerateMore={handleGenerate}
          onRegenerateSlot={() => { }}
          isGeneratingMore={isGenerating}
          generatingSlotIndex={null}
        />
      )}

      {showPromptPreview && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-surface w-full max-w-2xl border border-border rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-surface-secondary">
              <span className="font-bold text-text-primary text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Generated Prompt Preview
              </span>
              <button onClick={() => setShowPromptPreview(false)} className="text-text-muted hover:text-text-primary" aria-label="Close Preview">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-background">
              {selectedAspectRatio === 'Match Reference' && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md text-xs text-primary flex items-center gap-2">
                  <Info size={14} />
                  {shot.referenceImage
                    ? `Using reference image aspect ratio: ${detectedReferenceRatio || 'detecting...'}`
                    : `Will fall back to project default: ${project.settings.aspectRatio}`
                  }
                </div>
              )}
              <pre className="whitespace-pre-wrap font-mono text-xs text-text-secondary leading-relaxed selection:bg-primary/30 selection:text-white">
                {constructPrompt(shot, project, activeChars, outfits, activeLocation, selectedAspectRatio)}
              </pre>
            </div>
            <div className="p-4 border-t border-border bg-surface-secondary flex justify-end">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Wand2 className="w-3 h-3" />}
                  onClick={handleAutoGeneratePrompt}
                  disabled={!shot.description}
                  loading={isGeneratingPrompt}
                >
                  Auto-Enhance
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Copy className="w-3 h-3" />}
                  onClick={handleCopyPrompt}
                >
                  Copy to Clipboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="bg-surface w-[95vw] max-w-[1400px] h-[90vh] border border-border shadow-2xl rounded-xl flex overflow-hidden"
      >

        {/* LEFT COLUMN: CONTROLS */}
        <div className="w-[400px] flex flex-col border-r border-border bg-surface-secondary">
          <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0">
            <div>
              <h2 className="text-text-primary font-bold text-base flex items-center gap-2">
                <span className="text-text-tertiary text-xs font-normal">SHOT #{shot.sequence}</span>
                <span>Editor</span>
              </h2>
            </div>
            <div className="text-xs text-text-muted font-mono">{shot.id.substring(0, 6)}</div>
          </div>


          <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
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

                {/* Location Selection (NEW) */}
                <div>
                   <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Location / Set</label>
                   <div className="relative">
                      <select 
                        value={shot.locationId || ''} 
                        onChange={(e) => setShot(prev => ({...prev, locationId: e.target.value || undefined}))}
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
                          <button onClick={() => setShot(prev => ({ ...prev, referenceImage: undefined }))} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><Trash2 className="w-4 h-4" /></button>
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

        {/* RIGHT COLUMN: PREVIEW */}
        <div className="flex-1 bg-black flex flex-col relative">
          <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-surface">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wide">Variations:</label>
                <div className="flex bg-surface-secondary rounded border border-border p-0.5">
                  {[1, 2, 4].map(v => (
                    <button
                      key={v}
                      onClick={() => setVariationCount(v)}
                      className={`w-8 h-6 text-xs font-medium rounded transition-colors ${variationCount === v ? 'bg-primary text-white' : 'text-text-tertiary hover:text-text-primary'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wide">Model:</label>
                <select
                  value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-surface-secondary border border-border h-7 text-xs text-text-secondary rounded px-2 outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  {MODEL_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="h-4 w-[1px] bg-border" />
              <button
                onClick={() => setShowPromptPreview(true)}
                className="p-1.5 hover:bg-surface-secondary rounded text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-2 text-xs"
                title="Preview Generated Prompt"
              >
                <Eye className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Prompt</span>
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-secondary rounded-full text-text-tertiary hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden bg-black/50">
            {/* Main Image */}
            <div className="relative w-full max-w-5xl flex items-center justify-center flex-1" style={{ maxHeight: '100%' }}>
              <div className="relative bg-[#050505] group rounded-md overflow-hidden border border-white/5 shadow-2xl" style={{ ...getAspectRatioStyle(selectedAspectRatio), width: '100%', maxHeight: '65vh' }}>
                {shot.generatedImage ? (
                  <img src={shot.generatedImage} className="block w-full h-full object-contain border-none outline-none m-0 p-0 bg-transparent transform scale-[1.01]" alt="Rendered Shot" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <div className="text-sm font-mono text-primary animate-pulse tracking-wide">{LOADING_MESSAGES[loadingMsgIndex]}</div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-20 h-20 mb-6 opacity-20" />
                        <div className="text-sm font-mono opacity-40 uppercase tracking-widest">Viewport Empty</div>
                        <div className="text-xs opacity-30 mt-2">Enter prompt and click Generate</div>
                      </>
                    )}
                  </div>
                )}

                {shot.generatedImage && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="p-2 bg-black/60 hover:bg-primary text-white rounded backdrop-blur-sm transition-colors border border-white/10"
                      aria-label="Maximize"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <a href={shot.generatedImage} download={`shot_${shot.sequence}.png`} className="p-2 bg-black/60 hover:bg-primary text-white rounded backdrop-blur-sm transition-colors border border-white/10" aria-label="Download Image">
                      <Upload className="w-4 h-4 rotate-180" />
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {/* Version History Filmstrip (NEW) */}
            {shot.generationCandidates && shot.generationCandidates.length > 0 && (
               <div className="w-full max-w-5xl h-24 mt-6 flex gap-3 overflow-x-auto p-3 bg-surface border border-border rounded-lg shrink-0 shadow-lg">
                  {shot.generationCandidates.map((url, idx) => (
                     <div 
                        key={idx} 
                        onClick={() => setShot(prev => ({...prev, generatedImage: url}))}
                        className={`
                           h-full aspect-video bg-black rounded cursor-pointer border-2 transition-all relative group/thumb
                           ${shot.generatedImage === url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'}
                        `}
                     >
                        <img src={url} className="w-full h-full object-cover opacity-70 group-hover/thumb:opacity-100 transition-opacity" />
                        <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[8px] text-white font-mono">v{idx + 1}</div>
                     </div>
                  ))}
               </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="h-16 p-4 border-t border-border flex justify-end gap-3 bg-surface z-10 shrink-0">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary"
            >
              Cancel
            </Button>

            <Button
              variant="secondary"
              onClick={handleSave}
            >
              Save Draft
            </Button>

            <Button
              variant="primary"
              icon={<Wand2 className="w-4 h-4" />}
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={!shot.description}
              className="px-8 shadow-lg shadow-blue-900/20"
            >
              {shot.generatedImage ? 'Regenerate' : 'Generate Shot'}
            </Button>
          </div>
        </div>
      </div>

      {/* Fullscreen Overlay */}
      {isFullscreen && shot.generatedImage && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-200">
          <div className="h-16 flex items-center px-6 border-b border-white/10 bg-black/50 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Editor</span>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <img
              src={shot.generatedImage}
              className="max-w-full max-h-full object-contain shadow-2xl"
              alt="Fullscreen Shot"
            />
          </div>
        </div>
      )}
    </div>
  );
};