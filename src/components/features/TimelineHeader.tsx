import React, { useRef } from 'react';
import { Clapperboard, Upload, Plus, Download, FileText } from 'lucide-react';
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
        <div className="h-10 flex items-center justify-between sticky top-0 z-20 bg-surface-secondary border-b border-border px-4 shrink-0">
            <div className="flex items-center gap-2">
                <Clapperboard className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Board Sequence</span>
            </div>

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
                    className="h-7 text-xs"
                    icon={<Download className="w-3 h-3" />}
                    onClick={onExportPDF}
                    loading={isExporting}
                >
                    PDF
                </Button>

                <div className="h-4 w-[1px] bg-border mx-1"></div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    icon={<Upload className="w-3 h-3" />}
                    loading={isUploadingScript}
                    onClick={() => fileInputRef.current?.click()}
                >
                    Import
                </Button>

                <Button
                    variant="primary"
                    size="sm"
                    className="h-7 text-xs ml-1"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={onAddScene}
                >
                    New Scene
                </Button>
            </div>
        </div>
    );
};