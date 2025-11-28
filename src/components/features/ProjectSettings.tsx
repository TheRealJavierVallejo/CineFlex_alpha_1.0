/*
 * ⚙️ COMPONENT: PROJECT SETTINGS
 * Commercial Quality Update
 */

import React, { useState, useEffect } from 'react';
import { Project, WorldSettings, ShowToastFn } from '../../types';
import { CustomSelect } from '../features/CustomSelect';
import { ERAS, CINEMATIC_STYLES, LIGHTING_STYLES } from '../../constants';
import { Key, Eye, EyeOff, Save, Settings } from 'lucide-react';
import Button from '../ui/Button';
import { CollapsibleSection } from '../ui/CollapsibleSection';

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
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
     const stored = localStorage.getItem('cinesketch_api_key');
     if (stored) setApiKey(stored);
  }, []);

  const saveApiKey = () => {
     if (apiKey.trim()) {
        localStorage.setItem('cinesketch_api_key', apiKey.trim());
        showToast("API Key saved securely", 'success');
     } else {
        localStorage.removeItem('cinesketch_api_key');
        showToast("API Key removed", 'info');
     }
  };

  return (
    <div className="max-w-3xl mx-auto nle-panel rounded-md">
       <div className="nle-header gap-2">
          <Settings className="w-4 h-4 text-text-secondary" />
          <span className="font-bold text-xs uppercase text-text-secondary">Project Configuration</span>
       </div>
       
       <div className="bg-background">
          {/* 1. IDENTITY */}
          <CollapsibleSection title="General Information" defaultOpen>
             <div className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-text-secondary uppercase mb-1 block">Project Name</label>
                   <input 
                     value={project.name}
                     onChange={(e) => onUpdateProject({...project, name: e.target.value})}
                     className="nle-input"
                   />
                </div>
             </div>
          </CollapsibleSection>

          {/* 2. API CONFIG */}
          <CollapsibleSection title="AI Connection" defaultOpen>
             <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase flex items-center gap-2">
                   <Key className="w-3 h-3 text-primary" /> Gemini API Key
                </label>
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <input 
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="nle-input pr-10"
                        placeholder="Enter your Gemini API Key..."
                      />
                      <button 
                         onClick={() => setShowKey(!showKey)}
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                      >
                         {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                   </div>
                   <Button variant="secondary" onClick={saveApiKey} icon={<Save className="w-4 h-4" />}>
                      Save
                   </Button>
                </div>
                <p className="text-[10px] text-text-tertiary">
                   Your key is stored locally in your browser and never sent to our servers. 
                   Required if you haven't set up a .env file.
                </p>
             </div>
          </CollapsibleSection>

          {/* 3. VISUAL STYLE */}
          <CollapsibleSection title="Global Visual Style" defaultOpen>
             <div className="grid grid-cols-2 gap-6">
                <CustomSelect 
                   label="Era / Time Period"
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
                   label="Default Lighting"
                   value={project.settings.lighting}
                   options={LIGHTING_STYLES}
                   customOptions={project.settings.customLighting}
                   onChange={(val) => onUpdateSettings('lighting', val)}
                   onAddCustom={(val) => onAddCustom('customLighting', val)}
                   onDeleteCustom={(val) => onRemoveCustom('customLighting', val)}
                />
             </div>
          </CollapsibleSection>
       </div>
    </div>
  );
};