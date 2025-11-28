import React, { useState, useEffect } from 'react';
import { useStudio } from '../../layouts/StudioLayout';
import { TimelineView } from './TimelineView';
import { ShotInspector } from './ShotInspector';
import { Shot } from '../../types';
import { Film } from 'lucide-react';

export const DirectorPage: React.FC = () => {
    const { 
        project, 
        handleUpdateProject, 
        handleUpdateShot, 
        importScript, 
        showToast,
        handleDeleteShot
    } = useStudio();

    const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

    // Auto-select first shot if none selected (optional, but good for UX)
    // useEffect(() => {
    //     if (!selectedShotId && project.shots.length > 0) {
    //         setSelectedShotId(project.shots[0].id);
    //     }
    // }, [project.shots.length]);

    const selectedShot = project.shots.find(s => s.id === selectedShotId);

    // Wrapper to handle selection from Timeline
    const handleEditShot = (shot: Shot) => {
        setSelectedShotId(shot.id);
    };

    return (
        <div className="flex h-full w-full overflow-hidden">
            
            {/* CENTER STAGE: TIMELINE */}
            <div className="flex-1 h-full overflow-hidden relative">
                <TimelineView
                    project={project}
                    onUpdateProject={handleUpdateProject}
                    onEditShot={handleEditShot} // Maps click to selection
                    importScript={importScript}
                    showToast={showToast}
                />
            </div>

            {/* RIGHT RAIL: INSPECTOR */}
            {selectedShot ? (
                <ShotInspector
                    project={project}
                    shot={selectedShot}
                    onUpdateShot={(id, updates) => handleUpdateShot({ ...selectedShot, ...updates })}
                    showToast={showToast}
                />
            ) : (
                <div className="w-[400px] shrink-0 bg-surface-secondary border-l border-border flex flex-col items-center justify-center text-text-tertiary p-8 text-center border-t border-t-transparent">
                     <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
                        <Film className="w-8 h-8 opacity-20" />
                     </div>
                     <h3 className="font-bold text-text-secondary mb-2">No Shot Selected</h3>
                     <p className="text-sm">Select a shot from the timeline to edit settings, cast, and generate visuals.</p>
                </div>
            )}
        </div>
    );
};