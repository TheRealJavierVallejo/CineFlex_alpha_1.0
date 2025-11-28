/*
 * ⚙️ COMPONENT: PROJECT SETTINGS
 * Commercial Quality Update
 */

import React from 'react';
import { Project, WorldSettings, ShowToastFn } from '../../types';
import { CustomSelect } from '../features/CustomSelect';
import { ERAS, CINEMATIC_STYLES, LIGHTING_STYLES } from '../../constants';
import { Settings, Sliders } from 'lucide-react';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';

interface ProjectSettingsProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onUpdateSettings: (key: keyof WorldSettings, value: any) => void;
  onAddCustom: (field: 'customEras' | 'customStyles' | 'customTimes' | 'customLighting', value: string) => void;
  onRemoveCustom: (field: 'customEras' | 'customStyles' | 'customTimes' | 'customLighting', value: string) => void;
  showToast: ShowToastFn;
}

// --- REUSABLE PANEL CONTENT ---
export const ProjectSettingsPanel: React.FC<ProjectSettingsProps> = ({ 
  project, 
  onUpdateProject, 
  onUpdateSettings,
  onAddCustom,
  onRemoveCustom
}) => {
  return (
      <div className="p-4 space-y-6">
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Project Name</label>
                  <input 
                    value={project.name}
                    onChange={(e) => onUpdateProject({...project, name: e.target.value})}
                    className="studio-input"
                  />
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
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

// --- FULL PAGE COMPONENT ---
export const ProjectSettings: React.FC<ProjectSettingsProps> = (props) => {
  const tools: Tool[] = [
      {
          id: 'config',
          label: 'Configuration',
          icon: <Sliders className="w-5 h-5" />,
          content: <ProjectSettingsPanel {...props} />
      }
  ];

  return (
    <PageWithToolRail tools={tools} defaultTool="config">
        <div className="flex flex-col h-full bg-black items-center justify-center text-zinc-600">
            <Settings className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-mono uppercase tracking-widest">Global Settings</p>
        </div>
    </PageWithToolRail>
  );
};