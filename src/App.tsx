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

import { getContrastColor, getGlowColor } from './utils/themeUtils';

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
    // Apply saved theme on mount
    useEffect(() => {
        // 1. Accent Color
        const savedColor = localStorage.getItem('cinesketch_theme_color');
        if (savedColor) {
            const root = document.documentElement;
            root.style.setProperty('--color-primary', savedColor);
            root.style.setProperty('--color-primary-hover', savedColor); // Ideally darken this slightly

            // Use smart contrast utility
            const foreground = getContrastColor(savedColor);
            root.style.setProperty('--color-primary-foreground', foreground);

            // Apply glow
            try {
                const glow = getGlowColor(savedColor, 0.5);
                root.style.setProperty('--color-primary-glow', glow);
            } catch (e) {
                console.warn("Failed to apply theme glow", e);
            }
        }

        // 2. Light/Dark Mode
        const savedMode = localStorage.getItem('cinesketch_theme_mode');
        if (savedMode === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
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