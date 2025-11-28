import React from 'react';
import { Clapperboard, Download, Plus } from 'lucide-react';
import Button from '../ui/Button';

interface TimelineHeaderProps {
    onAddScene: () => void;
    onExportPDF: () => void;
    isExporting?: boolean;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    onAddScene,
    onExportPDF,
    isExporting = false
}) => {
    return (
        <div className="flex items-center justify-between mb-0 sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-border h-14 px-6">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-background border border-border flex items-center justify-center">
                    <Clapperboard className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest">Timeline Sequence</h2>
                    <p className="text-[10px] text-text-secondary font-mono">MASTER_EDIT_V01</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<Download className="w-3 h-3" />}
                    onClick={onExportPDF}
                    loading={isExporting}
                >
                    Export PDF
                </Button>

                <div className="h-4 w-[1px] bg-border mx-2"></div>

                <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={onAddScene}
                >
                    New Scene
                </Button>
            </div>
        </div>
    );
};