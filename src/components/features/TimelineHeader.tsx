import React, { useRef } from 'react';
import { Clapperboard, Upload, Plus, FileText, Eye } from 'lucide-react';
import Button from '../ui/Button';

interface TimelineHeaderProps {
    isUploadingScript: boolean;
    onImportScript: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddScene: () => void;
    scriptName?: string;
    onViewScript?: () => void; // New Prop
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    isUploadingScript,
    onImportScript,
    onAddScene,
    scriptName,
    onViewScript
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-background/95 backdrop-blur py-4 border-b border-border">
            <h2 className="text-lg font-bold text-text-primary tracking-wide flex items-center gap-3">
                <div className="p-2 bg-surface-secondary rounded border border-border">
                    <Clapperboard className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                SEQUENCE EDITOR
            </h2>

            <div className="flex items-center gap-3">
                {/* Script Loaded Indicator */}
                {scriptName && (
                    <div className="flex items-center gap-1 bg-surface-secondary border border-border rounded-md pl-3 pr-1 py-1 mr-2 group transition-colors hover:border-primary/50">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-text-secondary max-w-[150px] truncate mr-2">
                            {scriptName}
                        </span>
                        
                        {onViewScript && (
                            <button 
                                onClick={onViewScript}
                                className="p-1 hover:bg-background rounded text-text-tertiary hover:text-white transition-colors"
                                title="Read Script"
                            >
                                <Eye className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".fountain,.txt"
                    onChange={onImportScript}
                    className="hidden"
                    id="script-upload"
                />

                <Button
                    variant="secondary"
                    size="md"
                    icon={<Upload className="w-4 h-4" />}
                    loading={isUploadingScript}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isUploadingScript ? 'Parsing...' : (scriptName ? 'Update Script' : 'Import Script')}
                </Button>

                <Button
                    variant="primary"
                    size="md"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={onAddScene}
                >
                    New Scene
                </Button>
            </div>
        </div>
    );
};