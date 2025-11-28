import React from 'react';
import { Shot, Project, Character, Outfit, Location } from '../../../types';
import { constructPrompt } from '../../../services/promptBuilder';
import { Eye, X, Info, Wand2, Copy } from 'lucide-react';
import Button from '../../ui/Button';

interface PromptPreviewModalProps {
    shot: Shot;
    project: Project;
    activeChars: Character[];
    outfits: Outfit[];
    activeLocation?: Location;
    selectedAspectRatio: string;
    detectedReferenceRatio: string | null;
    isGeneratingPrompt: boolean;
    onClose: () => void;
    onAutoGeneratePrompt: () => void;
    onCopyPrompt: () => void;
}

export const PromptPreviewModal: React.FC<PromptPreviewModalProps> = ({
    shot,
    project,
    activeChars,
    outfits,
    activeLocation,
    selectedAspectRatio,
    detectedReferenceRatio,
    isGeneratingPrompt,
    onClose,
    onAutoGeneratePrompt,
    onCopyPrompt
}) => {
    return (
        <div className="fixed inset-0 z-[70] overlay-dark flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-surface w-full max-w-2xl border border-border rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
                <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-surface-secondary">
                    <span className="font-bold text-text-primary text-sm flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" /> Generated Prompt Preview
                    </span>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Close Preview">
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
                            onClick={onAutoGeneratePrompt}
                            disabled={!shot.description}
                            loading={isGeneratingPrompt}
                        >
                            Auto-Enhance
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<Copy className="w-3 h-3" />}
                            onClick={onCopyPrompt}
                        >
                            Copy to Clipboard
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
