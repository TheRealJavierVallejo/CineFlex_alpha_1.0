import React, { useRef } from 'react';
import { Clapperboard, Upload, Plus } from 'lucide-react';
import Button from '../ui/Button';

interface TimelineHeaderProps {
    isUploadingScript: boolean;
    onImportScript: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddScene: () => void;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    isUploadingScript,
    onImportScript,
    onAddScene
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
                    {isUploadingScript ? 'Parsing Script...' : 'Import Script'}
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
