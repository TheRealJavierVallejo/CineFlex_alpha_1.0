/*
 * 🧠 APP CONTROLLER
 * Routing & Entry Point
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { WorkspaceLayout, useWorkspace } from './layouts/WorkspaceLayout';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { LocalLlmProvider } from './context/LocalLlmContext';
import { UpgradeModal } from './components/ui/UpgradeModal'; // IMPORTED
import {
    TimelineView,
    AssetManager,
    ProjectSettings,
    ScriptPage,
    ProductionSpreadsheet,
    ProjectLibrary,
    LazyWrapper
} from './components/features/LazyComponents';
import { SlateScriptEditorTest } from './components/features/SlateScriptEditorTest';

import { getContrastColor, getGlowColor } from './utils/themeUtils';

// ... (Keeping Adapter Components exactly as they were - omitted for brevity in thinking block but will write fully) ...
// To ensure I don't break anything, I will just update the Main App Component block below.

const DashboardPage = () => {
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
            <ErrorBoundary>
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
            </ErrorBoundary>
        </div>
    );
};

const ScriptEditorPage = () => {
    return (
        <ErrorBoundary>
            <LazyWrapper>
                <ScriptPage />
            </LazyWrapper>
        </ErrorBoundary>
    );
};

const TimelinePage = () => {
    const { project, handleUpdateProject, handleEditShot, importScript, showToast } = useWorkspace();
    return (
        <ErrorBoundary>
            <LazyWrapper>
                <TimelineView
                    project={project}
                    onUpdateProject={handleUpdateProject}
                    onEditShot={handleEditShot}
                    importScript={importScript}
                    showToast={showToast}
                />
            </LazyWrapper>
        </ErrorBoundary>
    );
};

const AssetsPage = () => {
    const { project, showToast } = useWorkspace();
    return (
        <div className="absolute inset-0">
            <ErrorBoundary>
                <LazyWrapper>
                    <AssetManager
                        projectId={project.id}
                        projectShots={project.shots}
                        showToast={showToast}
                    />
                </LazyWrapper>
            </ErrorBoundary>
        </div>
    );
};

const SettingsPage = () => {
    const { project, handleUpdateProject, handleUpdateSettings, showToast } = useWorkspace();

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
            <ErrorBoundary>
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
            </ErrorBoundary>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
    useEffect(() => {
        const savedColor = localStorage.getItem('cinesketch_theme_color');
        if (savedColor) {
            const root = document.documentElement;
            root.style.setProperty('--color-primary', savedColor);
            root.style.setProperty('--color-primary-hover', savedColor);
            const foreground = getContrastColor(savedColor);
            root.style.setProperty('--color-primary-foreground', foreground);
            try {
                const glow = getGlowColor(savedColor, 0.5);
                root.style.setProperty('--color-primary-glow', glow);
            } catch (e) {
                console.warn("Failed to apply theme glow", e);
            }
        }
        const savedMode = localStorage.getItem('cinesketch_theme_mode');
        if (savedMode === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    }, []);

    return (
        <SubscriptionProvider>
            <LocalLlmProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<ProjectLibrary />} />
                        <Route path="/test-slate-editor" element={<SlateScriptEditorTest />} />
                        <Route path="/project/:projectId" element={<WorkspaceLayout />}>
                            <Route index element={<DashboardPage />} />
                            <Route path="timeline" element={<TimelinePage />} />
                            <Route path="script" element={<ScriptEditorPage />} />
                            <Route path="assets" element={<AssetsPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <UpgradeModal /> {/* Global Modal */}
                </BrowserRouter>
            </LocalLlmProvider>
        </SubscriptionProvider>
    );
};

const WrappedApp = () => (
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

export default WrappedApp;