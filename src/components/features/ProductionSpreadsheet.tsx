/*
 * 📊 COMPONENT: PRODUCTION SPREADSHEET (Option 1)
 * High-Density Data View for Bulk Editing
 * Refactored: Split into sub-components for maintainability
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Project, Shot, ShowToastFn, Scene, ScriptElement } from '../../types';
import { FileText, Clapperboard, LayoutGrid, Sliders, Package, Settings, Upload } from 'lucide-react';
import Button from '../ui/Button';
import { WorkspaceContextType } from '../../layouts/WorkspaceLayout';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';
import { ProjectSettingsPanel } from './ProjectSettings';
import { AssetManagerPanel } from './AssetManager';

// Sub-components
import { SpreadsheetFilters } from './production-spreadsheet/SpreadsheetFilters';
import { SpreadsheetTable } from './production-spreadsheet/SpreadsheetTable';
import { SpreadsheetBulkActions } from './production-spreadsheet/SpreadsheetBulkActions';


interface ProductionSpreadsheetProps {
    project: Project;
    onUpdateShot: (shot: Shot) => void;
    onEditShot: (shot: Shot) => void;
    onDeleteShot: (shotId: string) => void;
    onDuplicateShot: (shotId: string) => void;
    showToast: ShowToastFn;
}

export const ProductionSpreadsheet: React.FC<ProductionSpreadsheetProps> = ({
    project,
    onUpdateShot,
    onEditShot,
    onDeleteShot,
    onDuplicateShot,
    showToast
}) => {
    const navigate = useNavigate();
    const { handleBulkUpdateShots, handleUpdateProject, handleUpdateSettings, importScript } = useOutletContext<WorkspaceContextType>();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filters
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterScene, setFilterScene] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');



    // Helpers for Project Settings panel
    const addCustomSetting = useCallback((field: any, value: string) => {
        const currentList = (project.settings as any)[field] || [];
        if (!currentList.includes(value)) {
            const map: any = { 'customEras': 'era', 'customStyles': 'cinematicStyle', 'customTimes': 'timeOfDay', 'customLighting': 'lighting' };
            const updated = { ...project, settings: { ...project.settings, [field]: [...currentList, value], [map[field]]: value } };
            handleUpdateProject(updated);
        }
    }, [project, handleUpdateProject]);

    const removeCustomSetting = useCallback((field: any, value: string) => {
        const updated = { ...project, settings: { ...project.settings, [field]: (project.settings as any)[field].filter((i: string) => i !== value) } };
        handleUpdateProject(updated);
    }, [project, handleUpdateProject]);

    // --- HELPER: Get Scene Info ---
    const getSceneInfo = useCallback((sceneId?: string) => {
        if (!sceneId) return { sequence: '-', heading: 'Unknown' };
        const scene = project.scenes.find(s => s.id === sceneId);
        return scene ? { sequence: scene.sequence, heading: scene.heading } : { sequence: '?', heading: 'Deleted Scene' };
    }, [project.scenes]);



    // --- DERIVED DATA (HOOKS MOVED UP) ---
    const filteredShots = useMemo(() => {
        return project.shots.filter(shot => {
            const matchesText = (shot.description || '').toLowerCase().includes(filterText.toLowerCase()) ||
                (shot.notes || '').toLowerCase().includes(filterText.toLowerCase());
            const matchesType = filterType === 'all' || shot.shotType === filterType;
            const matchesScene = filterScene === 'all' || shot.sceneId === filterScene;
            let matchesStatus = true;
            if (filterStatus === 'missing_image') matchesStatus = !shot.generatedImage;
            else if (filterStatus === 'has_image') matchesStatus = !!shot.generatedImage;
            else if (filterStatus === 'script_linked') matchesStatus = (shot.linkedElementIds?.length || 0) > 0;
            else if (filterStatus === 'no_script') matchesStatus = (shot.linkedElementIds?.length || 0) === 0;

            return matchesText && matchesType && matchesScene && matchesStatus;
        });
    }, [project.shots, filterText, filterType, filterScene, filterStatus]);

    const allSelected = filteredShots.length > 0 && selectedIds.size === filteredShots.length;

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);

    const toggleAll = useCallback(() => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredShots.map(s => s.id)));
        }
    }, [allSelected, filteredShots]);

    const handleBulkUpdate = useCallback((field: keyof Shot, value: any) => {
        if (selectedIds.size === 0) return;
        const shotsToUpdate = project.shots
            .filter(s => selectedIds.has(s.id))
            .map(s => ({ ...s, [field]: value }));
        handleBulkUpdateShots(shotsToUpdate);
        showToast(`Updated ${selectedIds.size} shots`, 'success');
        setSelectedIds(new Set());
    }, [selectedIds, project.shots, handleBulkUpdateShots, showToast]);

    const handleBulkDelete = useCallback(() => {
        if (confirm(`Are you sure you want to delete ${selectedIds.size} shots?`)) {
            selectedIds.forEach(id => onDeleteShot(id));
            setSelectedIds(new Set());
            showToast("Shots deleted", 'info');
        }
    }, [selectedIds, onDeleteShot, showToast]);

    // --- TOOL RAIL CONTENT ---
    const tools: Tool[] = useMemo(() => [
        {
            id: 'filters',
            label: 'View Options',
            icon: <Sliders className="w-5 h-5" />,
            content: (
                <SpreadsheetFilters
                    filterText={filterText}
                    setFilterText={setFilterText}
                    filterType={filterType}
                    setFilterType={setFilterType}
                    filterScene={filterScene}
                    setFilterScene={setFilterScene}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    project={project}
                />
            )
        },
        {
            id: 'assets',
            label: 'Asset Manager',
            icon: <Package className="w-5 h-5" />,
            content: <AssetManagerPanel projectId={project.id} projectShots={project.shots} showToast={showToast} />
        },
        {
            id: 'config',
            label: 'Project Settings',
            icon: <Settings className="w-5 h-5" />,
            content: (
                <ProjectSettingsPanel
                    project={project}
                    onUpdateProject={handleUpdateProject}
                    onUpdateSettings={handleUpdateSettings}
                    onAddCustom={addCustomSetting}
                    onRemoveCustom={removeCustomSetting}
                    showToast={showToast}
                />
            )
        }
    ], [
        filterText, filterType, filterScene, filterStatus, project,
        handleUpdateProject, handleUpdateSettings, addCustomSetting,
        removeCustomSetting, showToast
    ]);



    return (
        <PageWithToolRail tools={tools} defaultTool={null}>
            <div className="flex flex-col h-full bg-background relative">
                <SpreadsheetTable
                    filteredShots={filteredShots}
                    project={project}
                    selectedIds={selectedIds}
                    toggleSelection={toggleSelection}
                    toggleAll={toggleAll}
                    allSelected={allSelected}
                    onUpdateShot={onUpdateShot}
                    onEditShot={onEditShot}
                    onDeleteShot={onDeleteShot}
                    onDuplicateShot={onDuplicateShot}
                    getSceneInfo={getSceneInfo}
                />

                <SpreadsheetBulkActions
                    selectedCount={selectedIds.size}
                    project={project}
                    onBulkUpdate={handleBulkUpdate}
                    onBulkDelete={handleBulkDelete}
                />
            </div>
        </PageWithToolRail>
    );
};