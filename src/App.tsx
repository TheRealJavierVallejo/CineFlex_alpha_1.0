/*
 * 🧠 APP CONTROLLER
 * Routing & Entry Point
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ProjectLibrary } from './components/features/ProjectLibrary';
import { WorkspaceLayout, useWorkspace } from './layouts/WorkspaceLayout';
import {
  TimelineView,
  AssetManager,
  ProjectSettings,
  LazyWrapper
} from './components/features/LazyComponents';
import { ShotList } from './components/features/ShotList';

// --- ADAPTER COMPONENTS ---
// These wrappers extract data from the WorkspaceContext and pass it to the legacy feature components.
// This allows us to keep the feature components pure and testable.

const DashboardPage = () => {
    const { project, handleAddShot, handleEditShot, handleDeleteShot, showToast } = useWorkspace();
    return (
        <div className="absolute inset-0 overflow-y-auto p-6">
            <ShotList
                project={project}
                onAddShot={handleAddShot}
                onEditShot={handleEditShot}
                onDeleteShot={handleDeleteShot}
                showToast={showToast}
            />
        </div>
    );
};

const TimelinePage = () => {
    const { project, handleUpdateProject, handleEditShot, showToast } = useWorkspace();
    return (
        <LazyWrapper>
            <TimelineView
                project={project}
                onUpdateProject={handleUpdateProject}
                onEditShot={handleEditShot}
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
  return (
    <BrowserRouter>
        <Routes>
            {/* Project Selection / Library */}
            <Route path="/" element={<ProjectLibrary />} />

            {/* Main Workspace Layout */}
            <Route path="/project/:projectId" element={<WorkspaceLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="timeline" element={<TimelinePage />} />
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