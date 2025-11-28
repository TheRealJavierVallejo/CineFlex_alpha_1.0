import React from 'react';
import { Project } from '../../../types';
import { SHOT_TYPES } from '../../../constants';
import { Search, Filter, BarChart3 } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';

interface SpreadsheetFiltersProps {
    filterText: string;
    setFilterText: (text: string) => void;
    filterType: string;
    setFilterType: (type: string) => void;
    filterScene: string;
    setFilterScene: (scene: string) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    project: Project;
}

export const SpreadsheetFilters: React.FC<SpreadsheetFiltersProps> = ({
    filterText,
    setFilterText,
    filterType,
    setFilterType,
    filterScene,
    setFilterScene,
    filterStatus,
    setFilterStatus,
    project
}) => {
    return (
        <div className="p-4 space-y-6">
            {/* Search */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Search</label>
                <div className="relative">
                    <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-text-muted" />
                    <input
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        placeholder="Keywords..."
                        className="w-full bg-surface-secondary border border-border rounded-sm py-1.5 pl-8 pr-2 text-xs text-text-primary outline-none focus:border-primary placeholder:text-text-muted"
                    />
                </div>
            </div>

            {/* Filters */}
            <CollapsibleSection title="Filtering" defaultOpen icon={<Filter className="w-3.5 h-3.5" />}>
                <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                        <label className="text-[10px] text-text-muted">By Status</label>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full bg-surface-secondary border border-border rounded-sm py-1.5 px-2 text-xs text-text-secondary outline-none focus:border-primary cursor-pointer"
                        >
                            <option value="all">Show All</option>
                            <option value="missing_image">Missing Image</option>
                            <option value="has_image">Has Generated Image</option>
                            <option value="script_linked">Linked to Script</option>
                            <option value="no_script">Unlinked</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-text-muted">By Scene</label>
                        <select
                            value={filterScene}
                            onChange={e => setFilterScene(e.target.value)}
                            className="w-full bg-surface-secondary border border-border rounded-sm py-1.5 px-2 text-xs text-text-secondary outline-none focus:border-primary cursor-pointer"
                        >
                            <option value="all">All Scenes</option>
                            {project.scenes.map(s => (
                                <option key={s.id} value={s.id}>{s.sequence}. {s.heading}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-text-muted">By Shot Type</label>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="w-full bg-surface-secondary border border-border rounded-sm py-1.5 px-2 text-xs text-text-secondary outline-none focus:border-primary cursor-pointer"
                        >
                            <option value="all">All Types</option>
                            {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Stats */}
            <CollapsibleSection title="Statistics" defaultOpen icon={<BarChart3 className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-surface-secondary p-2 rounded-sm border border-border text-center">
                        <div className="text-xl font-bold text-text-primary">{project.shots.length}</div>
                        <div className="text-[9px] text-text-muted uppercase">Total Shots</div>
                    </div>
                    <div className="bg-surface-secondary p-2 rounded-sm border border-border text-center">
                        <div className="text-xl font-bold text-primary">{project.shots.filter(s => s.generatedImage).length}</div>
                        <div className="text-[9px] text-text-muted uppercase">Rendered</div>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
};
