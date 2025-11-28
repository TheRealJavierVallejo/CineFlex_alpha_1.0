/*
 * ⚙️ COMPONENT: PROJECT SETTINGS
 * Commercial Quality Update
 */

import React, { useState, useEffect } from 'react';
import { Project, WorldSettings, ShowToastFn } from '../../types';
import { CustomSelect } from '../features/CustomSelect';
import { ERAS, CINEMATIC_STYLES, LIGHTING_STYLES } from '../../constants';
import { Key, Eye, EyeOff, Save, Settings, Sliders, Server } from 'lucide-react';
import Button from '../ui/Button';
import { PageWithSidebar } from '../layout/PageWithSidebar';

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
  const [activeSection, setActiveSection] = useState('general');

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

  const SidebarContent = (
      <div className="space-y-1">
          <button onClick={() => setActiveSection('general')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-colors ${activeSection === 'general' ? 'bg-primary text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#18181b]'}`}>
             <Sliders className="w-3.5 h-3.5" /> General
          </button>
          <button onClick={() => setActiveSection('api')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-colors ${activeSection === 'api' ? 'bg-primary text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#18181b]'}`}>
             <Server className="w-3.5 h-3.5" /> API & Keys
          </button>
      </div>
  );

  return (
    <PageWithSidebar sidebarContent={SidebarContent} icon={<Settings className="w-4 h-4" />} title="Config">
        <div className="flex flex-col h-full bg-black p-10 overflow-y-auto pl-16">
            <div className="max-w-3xl w-full mx-auto">
                <h2 className="text-xl font-bold text-white mb-8 border-b border-zinc-800 pb-4 flex items-center gap-3">
                   {activeSection === 'general' ? <Sliders className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                   {activeSection === 'general' ? 'General Settings' : 'API Configuration'}
                </h2>

                {activeSection === 'general' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
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
                )}

                {activeSection === 'api' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wide flex items-center gap-2">
                                <Key className="w-3 h-3 text-primary" /> Gemini API Key
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                <input 
                                    type={showKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="studio-input pr-10"
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
                                Save Key
                                </Button>
                            </div>
                            <p className="text-[10px] text-text-tertiary">
                                Your key is stored locally in your browser and never sent to our servers. 
                                Required if you haven't set up a .env file.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </PageWithSidebar>
  );
};