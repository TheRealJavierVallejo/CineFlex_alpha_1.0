import React, { useRef } from 'react';
import { Clapperboard, Upload, Plus, Download } from 'lucide-react';
import Button from '../ui/Button';

interface TimelineHeaderProps {
    isUploadingScript: boolean;
    onImportScript: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddScene: () => void;
    onExportPDF: () => void; 
    isExporting?: boolean; 
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    isUploadingScript,
    onImportScript,
    onAddScene,
    onExportPDF,
    isExporting = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="nle-header justify-between z-20">
            {/* Left: Identity */}
            <div className="flex items-center gap-2">
                <div className="p-1 bg-primary/10 rounded-sm">
                    <Clapperboard className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Master Timeline</span>
                <div className="h-3 w-[1px] bg-border mx-2"></div>
                <div className="text-[10px] text-text-tertiary font-mono">SEQ_01</div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".fountain,.txt"
                    onChange={onImportScript}
                    className="hidden"
                />

                <Button
                    variant="ghost"
                    size="sm"
                    icon={<Download className="w-3 h-3" />}
                    onClick={onExportPDF}
                    loading={isExporting}
                    title="Export Storyboard PDF"
                >
                    Export
                </Button>

                <div className="h-3 w-[1px] bg-border mx-1"></div>

                <Button
                    variant="secondary"
                    size="sm"
                    icon={<Upload className="w-3 h-3" />}
                    loading={isUploadingScript}
                    onClick={() => fileInputRef.current?.click()}
                    title="Import Fountain/Text Script"
                >
                    Import Script
                </Button>

                <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={onAddScene}
                >
                    Add Scene
                </Button>
            </div>
        </div>
    );
};