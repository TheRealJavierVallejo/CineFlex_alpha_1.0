import React from 'react';
import { Shot } from '../../../types';
import { MODEL_OPTIONS } from '../../../constants';
import { Eye, X, Maximize2, Upload, Loader2, Wand2, ImageIcon, GraduationCap, Zap, Lock } from 'lucide-react';
import Button from '../../ui/Button';

interface ShotPreviewProps {
    shot: Shot;
    setShot: React.Dispatch<React.SetStateAction<Shot>>;
    isGenerating: boolean;
    loadingMsgIndex: number;
    loadingMessages: string[];
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    variationCount: number;
    setVariationCount: (value: number) => void;
    onShowPromptPreview: () => void;
    onClose: () => void;
    onSave: () => void;
    onGenerate: () => void;
    setIsFullscreen: (value: boolean) => void;
    getAspectRatioStyle: (ratio: string) => React.CSSProperties;
    selectedAspectRatio: string;
    tier: 'free' | 'pro'; // RECEIVED TIER
    viewMode: 'base' | 'pro'; // RECEIVED VIEW MODE
}

export const ShotPreview: React.FC<ShotPreviewProps> = ({
    shot,
    setShot,
    isGenerating,
    loadingMsgIndex,
    loadingMessages,
    selectedModel,
    setSelectedModel,
    variationCount,
    setVariationCount,
    onShowPromptPreview,
    onClose,
    onSave,
    onGenerate,
    setIsFullscreen,
    getAspectRatioStyle,
    selectedAspectRatio,
    tier,
    viewMode
}) => {
    // Determine if the "Generate" action is locked (User is Free AND looking at Pro View)
    const isLocked = tier === 'free' && viewMode === 'pro';

    return (
        <div className="flex-1 media-bg flex flex-col relative">
            {/* HEADER */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-surface">
                <div className="flex items-center gap-4">

                    {/* PRO TIER CONTROLS */}
                    {tier === 'pro' && (
                        <>
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
                            <div className="h-4 w-[1px] bg-border" />
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
                        </>
                    )}

                    {/* FREE TIER BADGE */}
                    {tier === 'free' && (
                        <>
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-3.5 h-3.5 text-text-muted" />
                                <span className="text-xs font-bold text-text-secondary">Student Mode</span>
                            </div>
                            <div className="h-4 w-[1px] bg-border" />
                        </>
                    )}

                    <button
                        onClick={onShowPromptPreview}
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

            {/* MAIN VIEWPORT */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden media-bg">
                {/* Main Image */}
                <div className="relative w-full max-w-5xl flex items-center justify-center flex-1" style={{ maxHeight: '100%' }}>
                    <div className="relative media-bg group rounded-md overflow-hidden border border-border dark:border-white/10 shadow-2xl" style={{ ...getAspectRatioStyle(selectedAspectRatio), width: '100%', maxHeight: '65vh' }}>
                        {shot.generatedImage ? (
                            <img src={shot.generatedImage} className="block w-full h-full object-contain border-none outline-none m-0 p-0 bg-transparent transform scale-[1.01]" alt="Rendered Shot" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary">
                                {isGenerating ? (
                                    <div className="flex flex-col items-center gap-4 animate-pulse">
                                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                        <div className="text-sm font-mono text-primary animate-pulse tracking-wide">{loadingMessages[loadingMsgIndex]}</div>
                                    </div>
                                ) : (
                                    <>
                                        <ImageIcon className="w-20 h-20 mb-6 text-text-muted opacity-40" />
                                        <div className="text-sm font-mono text-text-secondary uppercase tracking-widest">Viewport Empty</div>
                                        <div className="text-xs text-text-tertiary mt-2">Enter prompt and click Generate</div>
                                    </>
                                )}
                            </div>
                        )}

                        {shot.generatedImage && (
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                    onClick={() => setIsFullscreen(true)}
                                    className="p-2 media-control hover:bg-primary text-white rounded backdrop-blur-sm transition-colors border border-white/10"
                                    aria-label="Maximize"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                                <a href={shot.generatedImage} download={`shot_${shot.sequence}.png`} className="p-2 media-control hover:bg-primary text-white rounded backdrop-blur-sm transition-colors border border-white/10" aria-label="Download Image">
                                    <Upload className="w-4 h-4 rotate-180" />
                                </a>
                            </div>
                        )}

                        {/* Free Tier Watermark (Optional Visual Aid) */}
                        {tier === 'free' && shot.generatedImage && (
                            <div className="absolute bottom-4 right-4 pointer-events-none opacity-50">
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/50 px-2 py-1 rounded border border-white/20">Student Preview</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Version History (Only show if multiple exist) */}
                {shot.generationCandidates && shot.generationCandidates.length > 0 && (
                    <div className="w-full max-w-5xl h-24 mt-6 flex gap-3 overflow-x-auto p-3 bg-surface border border-border rounded-lg shrink-0 shadow-lg">
                        {shot.generationCandidates.map((url, idx) => (
                            <div
                                key={idx}
                                onClick={() => setShot(prev => ({ ...prev, generatedImage: url }))}
                                className={`
                           h-full aspect-video media-bg rounded cursor-pointer border-2 transition-all relative group/thumb
                           ${shot.generatedImage === url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'}
                        `}
                            >
                                <img src={url} className="w-full h-full object-cover opacity-70 group-hover/thumb:opacity-100 transition-opacity" />
                                <div className="absolute bottom-1 right-1 media-control px-1 rounded text-[8px] text-white font-mono">v{idx + 1}</div>
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
                    onClick={onSave}
                >
                    Save Draft
                </Button>

                {tier === 'pro' ? (
                    <Button
                        variant="primary"
                        icon={<Wand2 className="w-4 h-4" />}
                        onClick={onGenerate}
                        loading={isGenerating}
                        disabled={!shot.description && !shot.sketchImage}
                        className="px-8 shadow-lg shadow-blue-900/20"
                    >
                        {shot.generatedImage ? 'Regenerate' : 'Generate Shot'}
                    </Button>
                ) : (
                    <Button
                        variant={isLocked ? "secondary" : "primary"}
                        icon={isLocked ? <Lock className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        onClick={onGenerate}
                        loading={isGenerating}
                        disabled={(!shot.description && !shot.sketchImage) || isLocked}
                        className={`px-8 ${isLocked ? 'opacity-70 cursor-not-allowed' : 'bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-600'}`}
                    >
                        {isLocked ? 'Unlock Pro to Render' : (shot.generatedImage ? 'Regenerate (Fast)' : 'Fast Generate')}
                    </Button>
                )}
            </div>
        </div>
    );
};