import React, { memo } from 'react';
import { Project, Shot } from '../../../types';
import { SHOT_TYPES, ASPECT_RATIOS, TIMES_OF_DAY } from '../../../constants';
import { CheckSquare, Square, Film, Edit2, Layers, Trash2 } from 'lucide-react';
import * as ReactWindow from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Defensive import resolution for react-window in Vite
const List = ReactWindow.FixedSizeList || (ReactWindow as any).default?.FixedSizeList || (ReactWindow as any).default;
const areEqual = ReactWindow.areEqual || (ReactWindow as any).default?.areEqual;

interface SpreadsheetTableProps {
    filteredShots: Shot[];
    project: Project;
    selectedIds: Set<string>;
    toggleSelection: (id: string) => void;
    toggleAll: () => void;
    allSelected: boolean;
    onUpdateShot: (shot: Shot) => void;
    onEditShot: (shot: Shot) => void;
    onDeleteShot: (id: string) => void;
    onDuplicateShot: (id: string) => void;
    getSceneInfo: (sceneId?: string) => { sequence: string | number; heading: string };
}

// Row Component for react-window
// Memoized to prevent unnecessary re-renders of individual rows
const Row = memo(({ index, style, data }: ListChildComponentProps<SpreadsheetTableProps>) => {
    const {
        filteredShots,
        project,
        selectedIds,
        toggleSelection,
        onUpdateShot,
        onEditShot,
        onDeleteShot,
        onDuplicateShot,
        getSceneInfo
    } = data;

    const shot = filteredShots[index];
    const sceneInfo = getSceneInfo(shot.sceneId);
    const isSelected = selectedIds.has(shot.id);
    const idString = `${sceneInfo.sequence}:${shot.sequence}`;

    return (
        <div
            style={style}
            className={`
                flex items-center border-b border-border/50 text-xs text-text-primary transition-colors hover:bg-surface-secondary group
                ${isSelected ? 'bg-primary/10 hover:bg-primary/20' : ''}
            `}
        >
            <div className="w-10 flex justify-center cursor-pointer h-full items-center" onClick={() => toggleSelection(shot.id)}>
                {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-text-muted" />}
            </div>

            <div className="w-16 text-center font-mono text-text-secondary text-[11px] h-full flex items-center justify-center">{idString}</div>

            <div className="w-16 p-1 h-full cursor-pointer relative flex items-center justify-center" onClick={() => onEditShot(shot)}>
                {shot.generatedImage ? (
                    <img src={shot.generatedImage} className="h-full w-auto object-contain rounded-sm border border-border group-hover:border-text-muted" alt="Shot" />
                ) : (
                    <div className="w-10 h-8 bg-surface rounded-sm border border-border flex items-center justify-center group-hover:border-text-muted">
                        <Film className="w-3 h-3 text-text-muted" />
                    </div>
                )}
                <div className="absolute inset-0 media-control opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Edit2 className="w-3 h-3" />
                </div>
            </div>

            <div className="flex-1 px-3 border-l border-border/50 h-full flex items-center">
                <div className="w-full relative group/scene">
                    <select
                        value={shot.sceneId || ''}
                        onChange={(e) => onUpdateShot({ ...shot, sceneId: e.target.value })}
                        className="w-full bg-transparent text-text-primary font-medium outline-none text-[11px] cursor-pointer hover:text-text-secondary appearance-none uppercase tracking-wide"
                    >
                        {project.scenes.map(s => (
                            <option key={s.id} value={s.id} className="text-black">{s.sequence}. {s.heading}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="w-32 px-2 border-l border-border/50 h-full flex items-center">
                <select
                    value={shot.shotType}
                    onChange={(e) => onUpdateShot({ ...shot, shotType: e.target.value })}
                    className="w-full bg-transparent text-text-secondary outline-none text-[11px] cursor-pointer hover:text-text-primary"
                >
                    {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="w-24 px-2 border-l border-border/50 h-full flex items-center">
                <select
                    value={shot.aspectRatio || project.settings.aspectRatio}
                    onChange={(e) => onUpdateShot({ ...shot, aspectRatio: e.target.value })}
                    className="w-full bg-transparent text-text-secondary outline-none text-[11px] cursor-pointer hover:text-text-primary"
                >
                    {ASPECT_RATIOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="w-32 px-2 border-l border-border/50 h-full flex items-center">
                <select
                    value={shot.timeOfDay || ''}
                    onChange={(e) => onUpdateShot({ ...shot, timeOfDay: e.target.value || undefined })}
                    className="w-full bg-transparent text-text-secondary outline-none text-[11px] cursor-pointer hover:text-text-primary"
                >
                    <option value="">Default</option>
                    {TIMES_OF_DAY.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="w-16 border-l border-border/50 h-full flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onDuplicateShot(shot.id)} className="p-1 text-text-muted hover:text-text-primary hover:bg-surface rounded-sm" title="Duplicate">
                    <Layers className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDeleteShot(shot.id)} className="p-1 text-text-muted hover:text-error hover:bg-error/10 rounded-sm" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}, areEqual);

export const SpreadsheetTable: React.FC<SpreadsheetTableProps> = (props) => {
    const {
        filteredShots,
        allSelected,
        toggleAll
    } = props;

    // Safety check for List component
    if (!List) {
        return (
            <div className="flex items-center justify-center h-full text-red-500 font-mono text-xs">
                Error loading virtualized list component. Please restart the app.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* TABLE HEADER */}
            <div className="flex items-center h-8 bg-surface-secondary border-b border-border text-[10px] font-bold text-text-secondary uppercase select-none sticky top-0 z-10 tracking-wider pl-10 shrink-0">
                <div className="w-10 flex justify-center cursor-pointer hover:text-text-primary transition-colors" onClick={toggleAll}>
                    {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
                </div>
                <div className="w-16 text-center">ID</div>
                <div className="w-16 text-center">Visual</div>
                <div className="flex-1 px-3 border-l border-border">Scene Assignment</div>
                <div className="w-32 px-2 border-l border-border">Shot Type</div>
                <div className="w-24 px-2 border-l border-border">Aspect</div>
                <div className="w-32 px-2 border-l border-border">Time</div>
                <div className="w-16 text-center border-l border-border">Actions</div>
            </div>

            {/* TABLE BODY (Virtualized) */}
            <div className="flex-1 pl-10">
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            height={height}
                            itemCount={filteredShots.length}
                            itemSize={48} // Fixed row height
                            width={width}
                            itemData={props}
                        >
                            {Row}
                        </List>
                    )}
                </AutoSizer>
            </div>
        </div>
    );
};