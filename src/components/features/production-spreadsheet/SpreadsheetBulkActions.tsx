import React from 'react';
import { Project, Shot } from '../../../types';
import { SHOT_TYPES } from '../../../constants';
import { CheckSquare, Trash2 } from 'lucide-react';

interface SpreadsheetBulkActionsProps {
    selectedCount: number;
    project: Project;
    onBulkUpdate: (field: keyof Shot, value: any) => void;
    onBulkDelete: () => void;
}

export const SpreadsheetBulkActions: React.FC<SpreadsheetBulkActionsProps> = ({
    selectedCount,
    project,
    onBulkUpdate,
    onBulkDelete
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="h-12 bg-primary text-white flex items-center justify-between px-4 animate-in slide-in-from-bottom-2 shrink-0 shadow-lg z-20 absolute bottom-0 left-0 right-0">
            <div className="font-bold text-xs flex items-center gap-2 uppercase tracking-wide">
                <CheckSquare className="w-4 h-4" />
                {selectedCount} Shots Selected
            </div>

            <div className="flex items-center gap-2">
                <div className="h-4 w-[1px] bg-white/30 mx-2" />
                <select
                    onChange={(e) => onBulkUpdate('sceneId', e.target.value)}
                    className="input-bg border border-white/20 text-text-primary text-xs h-7 rounded-sm px-2 outline-none cursor-pointer hover:bg-surface-secondary max-w-[150px]"
                    value=""
                >
                    <option value="" disabled>Move to Scene...</option>
                    {project.scenes.map(s => <option key={s.id} value={s.id} className="text-black">{s.sequence}. {s.heading}</option>)}
                </select>
                <select
                    onChange={(e) => onBulkUpdate('shotType', e.target.value)}
                    className="input-bg border border-white/20 text-text-primary text-xs h-7 rounded-sm px-2 outline-none cursor-pointer hover:bg-surface-secondary"
                    value=""
                >
                    <option value="" disabled>Set Shot Type...</option>
                    {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="h-4 w-[1px] bg-white/30 mx-2" />
                <button
                    onClick={onBulkDelete}
                    className="input-bg hover:bg-red-500 text-white px-3 h-7 rounded-sm text-xs font-bold transition-colors flex items-center gap-2"
                >
                    <Trash2 className="w-3 h-3" /> Delete Selection
                </button>
            </div>
        </div>
    );
};
