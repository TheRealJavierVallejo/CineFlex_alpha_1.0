
/*
 * ⚙️ COMPONENT: PROJECT SETTINGS
 * Commercial Quality Update
 */

import React from 'react';
import { Project, WorldSettings, ShowToastFn } from '../../types';
import { CustomSelect } from '../features/CustomSelect';
import { ERAS, CINEMATIC_STYLES, LIGHTING_STYLES } from '../../constants';

interface ProjectSettingsProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onUpdateSettings: (key: keyof WorldSettings, value: any) => void;
  onAddCustom: (field: 'customEras' | 'customStyles' | 'customTimes' | 'customLighting', value: string) => void;
  onRemoveCustom: (field: 'customEras' | 'customStyles' | 'customTimes' | 'customLighting', value: string) => void;
  showToast: ShowToastFn;
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({ 
  project, 
  onUpdateProject, 
  onUpdateSettings,
  onAddCustom,
  onRemoveCustom,
  showToast 
}) => {
  return (
    <div className="max-w-3xl mx-auto studio-card">
       <div className="p-4 border-b border-border bg-surface-secondary">
          <h3 className="text-base font-bold text-text-primary">Project Configuration</h3>
       </div>
       <div className="p-8 space-y-8 bg-surface">
          {/* Project Name */}
          <div className="space-y-2">
             <label className="text-xs font-bold text-text-secondary uppercase tracking-wide">Project Name</label>
             <input 
               value={project.name}
               onChange={(e) => onUpdateProject({...project, name: e.target.value})}
               className="studio-input"
             />
          </div>

          {/* Visual Settings */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border">
             <CustomSelect 
                label="Era"
                value={project.settings.era}
                options={ERAS}
                customOptions={project.settings.customEras}
                onChange={(val) => onUpdateSettings('era', val)}
                onAddCustom={(val) => onAddCustom('customEras', val)}
                onDeleteCustom={(val) => onRemoveCustom('customEras', val)}
             />

             <CustomSelect 
                label="Cinematic Style"
                value={project.settings.cinematicStyle}
                options={CINEMATIC_STYLES}
                customOptions={project.settings.customStyles}
                onChange={(val) => onUpdateSettings('cinematicStyle', val)}
                onAddCustom={(val) => onAddCustom('customStyles', val)}
                onDeleteCustom={(val) => onRemoveCustom('customStyles', val)}
             />

             <CustomSelect 
                label="Lighting"
                value={project.settings.lighting}
                options={LIGHTING_STYLES}
                customOptions={project.settings.customLighting}
                onChange={(val) => onUpdateSettings('lighting', val)}
                onAddCustom={(val) => onAddCustom('customLighting', val)}
                onDeleteCustom={(val) => onRemoveCustom('customLighting', val)}
             />
          </div>
       </div>
    </div>
  );
};
