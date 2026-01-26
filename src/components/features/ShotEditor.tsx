/*
 * 🎨 COMPONENT: SHOT EDITOR (Studio Layout)
 * Commercial Quality Update: Teal Theme & Studio Classes
 * Refactored: Split into sub-components for maintainability
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Shot, Project, Character, Outfit, ShowToastFn, Location } from '../../types';
import { generateShotImage } from '../../services/imageGen';
import { constructPrompt } from '../../services/promptBuilder';
import { MODEL_OPTIONS } from '../../constants';
import { getCharacters, getOutfits, addToImageLibrary, toggleImageFavorite, getImageLibrary, getLocations } from '../../services/storage';
import { VariationPicker } from '../features/VariationPicker';
import { useSubscription } from '../../context/SubscriptionContext';

// Sub-components
import { ShotDetailsForm } from './shot-editor/ShotDetailsForm';
import { ShotPreview } from './shot-editor/ShotPreview';
import { PromptPreviewModal } from './shot-editor/PromptPreviewModal';
import { FullscreenOverlay } from './shot-editor/FullscreenOverlay';

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
  const { tier, isPro } = useSubscription();

  // --- STATE ---
  const [viewMode, setViewMode] = useState<'base' | 'pro'>(isPro ? 'pro' : 'base');

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
    locationId: undefined
  });

  const [characters, setCharacters] = useState<Character[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

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
  // Force reset if tier changes (Safety Mechanism)
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].value);



  const [selectedAspectRatio, setSelectedAspectRatio] = useState(shot.aspectRatio || project.settings.aspectRatio || '16:9');
  const [variationCount, setVariationCount] = useState<number>(project.settings.variationCount || 1);
  const [selectedResolution, setSelectedResolution] = useState<string>(project.settings.imageResolution || '2048x2048');

  const containerRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Memoize active characters and location
  const activeChars = useMemo(() => {
    return characters.filter(c => shot.characterIds.includes(c.id));
  }, [characters, shot.characterIds]);

  const activeLocation = useMemo(() => {
    return locations.find(l => l.id === shot.locationId);
  }, [locations, shot.locationId]);

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
        // Deprecated: analyzeSketch was removed from gemini.ts in Phase 2
        /*
        const analysis = await analyzeSketch(base64);
        if (analysis) {
          setShot(prev => ({ ...prev, description: prev.description ? prev.description + " " + analysis : analysis }));
          showToast("Sketch analysis added", 'success');
        }
        */
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

  const handleResetDefaults = useCallback(() => {
    setShot(prev => ({
      ...prev,
      styleStrength: 100,
      timeOfDay: undefined,
      negativePrompt: ''
    }));
    showToast("Advanced settings reset to defaults", 'success');
  }, [showToast]);

  const handleGenerate = async () => {


    if (!shot.description?.trim() && !shot.sketchImage) {
      showToast("Please add a scene description or upload a sketch before rendering.", 'warning');
      return;
    }

    setIsGenerating(true);

    try {
      const effectiveShot = noCharacters ? { ...shot, negativePrompt: (shot.negativePrompt || '') + ', humans, people, characters, faces' } : shot;
      const effectiveChars = noCharacters ? [] : activeChars;

      // Use Gemini Generator
      const img = await generateShotImage(
        effectiveShot,
        project,
        effectiveChars,
        outfits,
        activeLocation,
        {
          model: selectedModel,
          aspectRatio: selectedAspectRatio,
          imageSize: selectedResolution
        }
      );

      const finalModelName = selectedModel;

      const imageId = crypto.randomUUID();
      await addToImageLibrary(project.id, img, shot.description);

      const updated = {
        ...shot,
        generatedImage: img,
        generationCandidates: [img, ...(shot.generationCandidates || [])],
        model: finalModelName // Update shot model too
      };

      setShot(updated);
      onUpdateShot(updated);
      showToast("Render successful", 'success');

    } catch (error: any) {
      let errorMessage = "Failed to generate image. Please try again.";

      if (error.message?.includes('GEMINI_API_KEY_MISSING')) {
        errorMessage = "⚠️ Gemini API key not found. Please add your Gemini API key in Settings → API Keys to generate images.";
      } else if (error.message?.includes('GEMINI_API_KEY_INVALID')) {
        errorMessage = "⚠️ Invalid Gemini API key. Please update your key in Settings → API Keys.";
      }

      console.error('Image generation error:', error);
      showToast(errorMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectVariation = async (image: string) => {
    const updated = { ...shot, generatedImage: image, generationCandidates: currentCandidates };
    setShot(updated);
    onUpdateShot(updated);

    const library = await getImageLibrary(project.id);
    const selectedImageItem = library.find(item => item.url === image);
    if (selectedImageItem && !selectedImageItem.isFavorite) {
      await toggleImageFavorite(project.id, selectedImageItem.id, true);
    }

    setShowVariationPicker(false);
    showToast("Variation selected", 'success');
  };

  const handleSave = () => {
    onUpdateShot(shot);
    onClose();
    showToast("Shot saved", 'success');
  };

  const handleCopyPrompt = useCallback(() => {
    const txt = constructPrompt(shot, project, activeChars, outfits, activeLocation);
    navigator.clipboard.writeText(txt);
    showToast("Prompt copied to clipboard", 'success');
  }, [shot, project, activeChars, outfits, activeLocation, selectedAspectRatio, showToast]);

  const handleAutoGeneratePrompt = async () => {
    if (!shot.description) {
      showToast("Please add a description first.", 'warning');
      return;
    }
    setIsGeneratingPrompt(true);
    showToast("Enhancing prompt...", 'info');
    try {
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
        <PromptPreviewModal
          shot={shot}
          project={project}
          activeChars={activeChars}
          outfits={outfits}
          activeLocation={activeLocation}
          selectedAspectRatio={selectedAspectRatio}
          detectedReferenceRatio={detectedReferenceRatio}
          isGeneratingPrompt={isGeneratingPrompt}
          onClose={() => setShowPromptPreview(false)}
          onAutoGeneratePrompt={handleAutoGeneratePrompt}
          onCopyPrompt={handleCopyPrompt}
        />
      )}

      <div
        ref={containerRef}
        className="bg-surface w-[95vw] max-w-[1400px] h-[90vh] border border-border shadow-2xl rounded-xl flex overflow-hidden"
      >
        <ShotDetailsForm
          shot={shot}
          setShot={setShot}
          project={project}
          characters={characters}
          locations={locations}
          activeLocation={activeLocation}
          descriptionRef={descriptionRef}
          noCharacters={noCharacters}
          setNoCharacters={setNoCharacters}
          isAnalyzing={isAnalyzing}
          handleSketchUpload={handleSketchUpload}
          handleReferenceUpload={handleReferenceUpload}
          handleResetDefaults={handleResetDefaults}
          selectedAspectRatio={selectedAspectRatio}
          setSelectedAspectRatio={setSelectedAspectRatio}
          selectedResolution={selectedResolution}
          setSelectedResolution={setSelectedResolution}
          viewMode={viewMode}
          setViewMode={setViewMode}
          tier={tier}
        />

        <ShotPreview
          shot={shot}
          setShot={setShot}
          isGenerating={isGenerating}
          loadingMsgIndex={loadingMsgIndex}
          loadingMessages={LOADING_MESSAGES}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          variationCount={variationCount}
          setVariationCount={setVariationCount}
          onShowPromptPreview={() => setShowPromptPreview(true)}
          onClose={onClose}
          onSave={handleSave}
          onGenerate={handleGenerate}
          setIsFullscreen={setIsFullscreen}
          getAspectRatioStyle={getAspectRatioStyle}
          selectedAspectRatio={selectedAspectRatio}
          tier={tier}
          viewMode={viewMode}
        />
      </div>

      {isFullscreen && shot.generatedImage && (
        <FullscreenOverlay
          image={shot.generatedImage}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
};