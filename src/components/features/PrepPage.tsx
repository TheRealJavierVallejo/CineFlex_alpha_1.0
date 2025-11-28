import React, { useState } from 'react';
import { useStudio } from '../../layouts/StudioLayout';
import { DashboardController } from './DashboardController';
import { AssetManager } from './AssetManager';
import { ProjectSettings } from './ProjectSettings';
import { ShotEditor } from './ShotEditor';
import { Shot } from '../../types';
import { FileSpreadsheet, Users, Settings, Plus } from 'lucide-react';
import { LazyWrapper } from './LazyComponents';
import Button from '../ui/Button';

type PrepTab = 'shotlist' | 'assets' | 'settings';

export const PrepPage: React.FC = () => {
    const { 
        project, 
        handleUpdateProject,
        handleUpdateSettings,
        handleUpdateShot, 
        handleBulkUpdateShots, 
        handleDeleteShot, 
        handleDuplicateShot, 
        showToast 
    } = useStudio();

    const [activeTab, setActiveTab] = useState<PrepTab>('shotlist');
    const [editingShot, setEditingShot] = useState<Shot | null>(null);

    // Helpers for Settings Tab
    const addCustomSetting = (field: any, value: string) => {
        const currentList = (project.settings as any)[field] || [];
        if (!currentList.includes(value)) {
            const map: any = { 'customEras': 'era', 'customStyles': 'cinematicStyle', 'customTimes': 'timeOfDay', 'customLighting': 'lighting' };
            const updated = { ...project, settings: { ...project.settings, [field]: [...currentList, value], [map[field]]: value } };
            handleUpdateProject(updated);
        }
    };

    const removeCustomSetting = (field: any, value: string) => {
        const updated = { ...project, settings: { ...project.settings, [field]: (project.settings as any)[field].filter((i: string) => i !== value) } };
        handleUpdateProject(updated);
    };

    // Helper to create a new shot manually
    const handleAddShot = () => {
        if (project.scenes.length === 0) {
            showToast("Create a scene in the Board first.", 'warning');
            return;
        }
        const newShot: Shot = {
            id: crypto.randomUUID(),
            sceneId: project.scenes[0].id,
            sequence: project.shots.length + 1,
            description: '',
            notes: '',
            characterIds: [],
            shotType: 'Wide Shot',
            aspectRatio: project.settings.aspectRatio,
            generationCandidates: [],
            generationInProgress: false
        };
        handleUpdateShot(newShot);
        setEditingShot(newShot);
    };

    return (
        <div className="flex flex-col h-full w-full bg-background relative">
            
            {/* PREP NAV HEADER */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-surface-secondary shrink-0">
                <div className="flex items-center gap-1 bg-surface p-1 rounded border border-border">
                    <button
                        onClick={() => setActiveTab('shotlist')}
                        className={`
                            px-4 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all
                            ${activeTab === 'shotlist' 
                                ? 'bg-primary text-white shadow-sm' 
                                : 'text-text-muted hover:text-text-primary hover:bg-white/5'}
                        `}
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Shot List
                    </button>
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`
                            px-4 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all
                            ${activeTab === 'assets' 
                                ? 'bg-primary text-white shadow-sm' 
                                : 'text-text-muted hover:text-text-primary hover:bg-white/5'}
                        `}
                    >
                        <Users className="w-3.5 h-3.5" /> Assets & Cast
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`
                            px-4 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all
                            ${activeTab === 'settings' 
                                ? 'bg-primary text-white shadow-sm' 
                                : 'text-text-muted hover:text-text-primary hover:bg-white/5'}
                        `}
                    >
                        <Settings className="w-3.5 h-3.5" /> Project Settings
                    </button>
                </div>

                {activeTab === 'shotlist' && (
                     <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddShot}>
                        New Shot
                     </Button>
                )}
            </div>

            {/* PREP CONTENT */}
            <div className="flex-1 overflow-hidden relative bg-[#0a0a0a]">
                {activeTab === 'shotlist' && (
                    <DashboardController 
                        project={project}
                        onUpdateShot={handleUpdateShot}
                        onEditShot={setEditingShot}
                        onDeleteShot={handleDeleteShot}
                        onDuplicateShot={handleDuplicateShot}
                        onBulkUpdateShots={handleBulkUpdateShots}
                        showToast={showToast}
                        handleAddShot={handleAddShot}
                    />
                )}

                {activeTab === 'assets' && (
                    <AssetManager
                        projectId={project.id}
                        projectShots={project.shots}
                        showToast={showToast}
                    />
                )}

                {activeTab === 'settings' && (
                    <div className="h-full overflow-y-auto p-8 flex justify-center">
                        <div className="w-full max-w-3xl">
                            <ProjectSettings
                                project={project}
                                onUpdateProject={handleUpdateProject}
                                onUpdateSettings={handleUpdateSettings}
                                onAddCustom={addCustomSetting}
                                onRemoveCustom={removeCustomSetting}
                                showToast={showToast}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL EDITOR (For Shot List edits) */}
            {editingShot && (
                <LazyWrapper fullHeight={false}>
                    <ShotEditor
                        project={project}
                        activeShot={editingShot}
                        onClose={() => setEditingShot(null)}
                        onUpdateShot={handleUpdateShot}
                        showToast={showToast}
                    />
                </LazyWrapper>
            )}
        </div>
    );
};