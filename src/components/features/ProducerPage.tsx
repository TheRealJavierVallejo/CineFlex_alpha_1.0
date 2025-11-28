import React, { useState } from 'react';
import { useStudio } from '../../layouts/StudioLayout';
import { DashboardController } from './DashboardController';
import { AssetManager } from './AssetManager';
import { ShotEditor } from './ShotEditor';
import { Shot } from '../../types';
import { LayoutGrid, Users } from 'lucide-react';
import { LazyWrapper } from './LazyComponents';

type ProducerTab = 'shots' | 'assets';

export const ProducerPage: React.FC = () => {
    const { 
        project, 
        handleUpdateShot, 
        handleBulkUpdateShots, 
        handleDeleteShot, 
        handleDuplicateShot, 
        showToast 
    } = useStudio();

    const [activeTab, setActiveTab] = useState<ProducerTab>('shots');
    const [editingShot, setEditingShot] = useState<Shot | null>(null);

    // Wrapper to open the modal editor
    const handleEditShot = (shot: Shot) => {
        setEditingShot(shot);
    };

    // Wrapper to create a shot manually
    const handleAddShot = () => {
        if (project.scenes.length === 0) {
            showToast("Please create a scene in the Timeline first.", 'warning');
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
            dialogue: '',
            generationCandidates: [],
            generationInProgress: false
        };
        
        handleUpdateShot(newShot);
        setEditingShot(newShot);
    };

    return (
        <div className="flex flex-col h-full w-full bg-background relative">
            
            {/* FLAT TOOLBAR HEADER */}
            <div className="h-10 border-b border-border flex items-center px-2 bg-surface gap-px shrink-0">
                <button
                    onClick={() => setActiveTab('shots')}
                    className={`
                        h-full px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors
                        ${activeTab === 'shots' 
                            ? 'border-primary text-primary bg-primary/5' 
                            : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/5'}
                    `}
                >
                    <LayoutGrid className="w-3.5 h-3.5" /> Production Board
                </button>
                <button
                    onClick={() => setActiveTab('assets')}
                    className={`
                        h-full px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors
                        ${activeTab === 'assets' 
                            ? 'border-primary text-primary bg-primary/5' 
                            : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/5'}
                    `}
                >
                    <Users className="w-3.5 h-3.5" /> Assets & Cast
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

            {/* MODAL EDITOR */}
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