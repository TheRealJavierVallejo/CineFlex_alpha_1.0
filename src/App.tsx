/*
 * 🧠 APP CONTROLLER
 * Routing & Entry Point
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ProjectLibrary } from './components/features/ProjectLibrary';
import { StudioLayout, useStudio } from './layouts/StudioLayout';
import {
  TimelineView, // Kept for legacy ref if needed, but mostly internal now
  AssetManager,
  ProjectSettings,
  ScriptPage,
  LazyWrapper
} from './components/features/LazyComponents';
import { DirectorPage } from './components/features/DirectorPage';

// --- ADAPTER COMPONENTS ---

const WriterMode = () => {
    return (
        <LazyWrapper>
            <ScriptPage />
        </LazyWrapper>
    );
};

// UPDATED: Now uses the Split Screen DirectorPage
const DirectorMode = () => {
    return (
        <LazyWrapper>
            <DirectorPage />
        </LazyWrapper>
    );
};

const ProducerMode = () => {
    const { project, showToast } = useStudio();
    return (
        <div className="absolute inset-0 pt-16 pb-24 px-8">
            <LazyWrapper>
                <AssetManager
                    projectId={project.id}
                    projectShots={project.shots}
                    showToast={showToast}
                />
            </LazyWrapper>
        </div>
    );
};

const SettingsMode = () => {
    const { project, handleUpdateProject, handleUpdateSettings, showToast } = useStudio();
    
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

    return (
        <div className="absolute inset-0 pt-16 pb-24 px-8 overflow-y-auto">
            <LazyWrapper>
                <ProjectSettings
                    project={project}
                    onUpdateProject={handleUpdateProject}
                    onUpdateSettings={handleUpdateSettings}
                    onAddCustom={addCustomSetting}
                    onRemoveCustom={removeCustomSetting}
                    showToast={showToast}
                />
            </LazyWrapper>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  return (
    <BrowserRouter>
        <Routes>
            {/* Library / Home */}
            <Route path="/" element={<ProjectLibrary />} />

            {/* Studio Console */}
            <Route path="/project/:projectId" element={<StudioLayout />}>
                {/* Redirect root to Writer mode */}
                <Route index element={<Navigate to="script" replace />} />
                
                <Route path="script" element={<WriterMode />} />
                <Route path="director" element={<DirectorMode />} />
                <Route path="producer" element={<ProducerMode />} />
                <Route path="settings" element={<SettingsMode />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </BrowserRouter>
  );
};

const WrappedApp = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default WrappedApp;