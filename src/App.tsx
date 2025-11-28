/*
 * 🧠 APP CONTROLLER
 * Routing & Entry Point
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ProjectLibrary } from './components/features/ProjectLibrary';
import { WorkspaceLayout, useWorkspace } from './layouts/WorkspaceLayout';
import {
  TimelineView,
  AssetManager,
  ProjectSettings,
  ShotList, // Keeping import just in case, though unused in new dashboard
  ScriptPage,
  LazyWrapper
} from './components/features/LazyComponents';
import { ProductionSpreadsheet } from './components/features/ProductionSpreadsheet';

// --- ADAPTER COMPONENTS ---

const DashboardPage = () => {
    // Using the exposed handlers from WorkspaceLayout
    const { 
        project, 
        handleUpdateShot, 
        handleEditShot, 
        handleDeleteShot, 
        handleDuplicateShot, 
        showToast 
    } = useWorkspace();

    return (
        <div className="absolute inset-0 overflow-hidden">
            <LazyWrapper>
                <ProductionSpreadsheet
                    project={project}
                    onUpdateShot={handleUpdateShot}
                    onEditShot={handleEditShot}
                    onDeleteShot={handleDeleteShot}
                    onDuplicateShot={handleDuplicateShot}
                    showToast={showToast}
                />
            </LazyWrapper>
        </div>
    );
};

const ScriptEditorPage = () => {
    return (
        <LazyWrapper>
            <ScriptPage />
        </LazyWrapper>
    );
};

const TimelinePage = () => {
    const { project, handleUpdateProject, handleEditShot, importScript, showToast } = useWorkspace();
    return (
        <LazyWrapper>
            <TimelineView
                project={project}
                onUpdateProject={handleUpdateProject}
                onEditShot={handleEditShot}
                importScript={importScript} // Pass the centralized importer
                showToast={showToast}
            />
        </LazyWrapper>
    );
};

const AssetsPage = () => {
    const { project, showToast } = useWorkspace();
    return (
        <div className="absolute inset-0">
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

const SettingsPage = () => {
    const { project, handleUpdateProject, handleUpdateSettings, showToast } = useWorkspace();
    
    // Helpers for custom settings array manipulation
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
        <div className="absolute inset-0 p-8">
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
  // Apply saved theme on mount
  useEffect(() => {
    const savedColor = localStorage.getItem('cinesketch_theme_color');
    if (savedColor) {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', savedColor);
        root.style.setProperty('--color-primary-hover', savedColor);
        
        // Convert to RGB for glow
        try {
            const r = parseInt(savedColor.slice(1, 3), 16);
            const g = parseInt(savedColor.slice(3, 5), 16);
            const b = parseInt(savedColor.slice(5, 7), 16);
            root.style.setProperty('--color-primary-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
        } catch(e) {
            console.warn("Failed to apply theme glow", e);
        }
    }
  }, []);

  return (
    <BrowserRouter>
        <Routes>
            {/* Project Selection / Library */}
            <Route path="/" element={<ProjectLibrary />} />

            {/* Main Workspace Layout */}
            <Route path="/project/:projectId" element={<WorkspaceLayout />}>
                {/* Dashboard is back as Index, but now it's a Spreadsheet */}
                <Route index element={<DashboardPage />} />
                <Route path="timeline" element={<TimelinePage />} />
                <Route path="script" element={<ScriptEditorPage />} />
                <Route path="assets" element={<AssetsPage />} />
                <Route path="settings" element={<SettingsPage />} />
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