import React, { useState } from 'react';
import { useStudio } from '../../layouts/StudioLayout';
import { DashboardController } from './DashboardController';
import { AssetManager } from './AssetManager';
import { ShotEditor } from './ShotEditor';
import { Shot } from '../../types';
import { LayoutGrid, Users, FileSpreadsheet } from 'lucide-react';
import { LazyWrapper } from './LazyComponents';

type ProducerTab = 'shots' | 'assets';

export const ProducerPage: React.FC = () => {
    const { 
        project, 
        handleUpdateShot, 
        handleBulkUpdateShots, 
        handleDeleteShot, 
        handleDuplicateShot, 
        handleAddShot: contextAddShot,
        showToast 
    } = useStudio();

    const [activeTab, setActiveTab] = useState<ProducerTab>('shots');
    const [editingShot, setEditingShot] = useState<Shot | null>(null);

    // Wrapper to open the modal editor
    const handleEditShot = (shot: Shot) => {
        setEditingShot(shot);
    };

    // Wrapper to create a shot and immediately edit it
    const handleAddShot = () => {
        // We need a scene to add a shot. If no scenes, warn.
        if (project.scenes.length === 0) {
            showToast("Please create a scene in the Timeline first.", 'warning');
            return;
        }
        
        // Create shot logic (duplicated from StudioLayout for local control if needed, 
        // or we can use contextAddShot if we update StudioLayout to return the new shot)
        // For now, let's create it manually to open the editor immediately.
        const newShot: Shot = {
            id: crypto.randomUUID(),
            sceneId: project.scenes[0].id,
            sequence: project.shots.length + 1,
            description: '',
            notes: '',
            characterIds: [],
            shotType: 'Wide Shot',
            aspectRatio: project.settings.aspectRatio,
            dialogue: '',
            generationCandidates: [],
            generationInProgress: false
        };
        
        handleUpdateShot(newShot);
        setEditingShot(newShot);
    };

    return (
        <div className="flex flex-col h-full w-full bg-background relative">
            
            {/* SUB-NAVIGATION HEADER */}
            <div className="h-12 border-b border-border flex items-center px-4 bg-surface shrink-0 gap-1">
                <button
                    onClick={() => setActiveTab('shots')}
                    className={`
                        h-8 px-4 rounded-md text-xs font-bold flex items-center gap-2 transition-all
                        ${activeTab === 'shots' 
                            ? 'bg-surface-secondary text-primary shadow-sm border border-border' 
                            : 'text-text-muted hover:text-text-primary hover:bg-white/5'}
                    `}
                >
                    <LayoutGrid className="w-4 h-4" /> Production Board
                </button>
                <button
                    onClick={() => setActiveTab('assets')}
                    className={`
                        h-8 px-4 rounded-md text-xs font-bold flex items-center gap-2 transition-all
                        ${activeTab === 'assets' 
                            ? 'bg-surface-secondary text-primary shadow-sm border border-border' 
                            : 'text-text-muted hover:text-text-primary hover:bg-white/5'}
                    `}
                >
                    <Users className="w-4 h-4" /> Assets & Cast
                </button>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'shots' ? (
                    <DashboardController 
                        project={project}
                        onUpdateShot={handleUpdateShot}
                        onEditShot={handleEditShot}
                        onDeleteShot={handleDeleteShot}
                        onDuplicateShot={handleDuplicateShot}
                        onBulkUpdateShots={handleBulkUpdateShots}
                        showToast={showToast}
                        handleAddShot={handleAddShot}
                    />
                ) : (
                    <AssetManager
                        projectId={project.id}
                        projectShots={project.shots}
                        showToast={showToast}
                    />
                )}
            </div>

            {/* MODAL EDITOR (For quick edits in Producer View) */}
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