/*
 * 🧠 APP CONTROLLER
 * Routing & Entry Point
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// - [x] Hardening types in `src/types.ts`
// - [x] Refactoring `src/utils/debounce.ts` with Generics
// - [x] Hardening `src/services/storage.ts` (Data Transformations)
// - [/] Documenting and typed props for `src/App.tsx`
// - [ ] Refactoring `src/layouts/WorkspaceLayout.tsx`
import ErrorBoundary from './components/ErrorBoundary';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { useWorkspace } from './context/WorkspaceContext';
import { WorldSettings } from './types';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { SaveStatusProvider } from './context/SaveStatusContext';
import { UpgradeModal } from './components/ui/UpgradeModal';
import {
    TimelineView,
    AssetManager,
    ProjectSettings,
    ScriptPage,
    ProductionSpreadsheet,
    ProjectLibrary,
    LazyWrapper,
    StoryNotesEditor
} from './components/features/LazyComponents';
import { ApiKeySettings } from './components/features/ApiKeySettings';
import { SlateScriptEditorTest } from './components/features/SlateScriptEditorTest';
import { AuthPage } from './components/features/AuthPage';
import { ProtectedRoute } from './components/ProtectedRoute'; // IMPORTED
import { WelcomeBanner } from './components/ui/WelcomeBanner';

import { getContrastColor, getGlowColor } from './utils/themeUtils';

// --- ADAPTER COMPONENTS (Hoisted for cleaner Routes) ---

/**
 * DashboardPage: The primary visual overview of the project.
 * Displays the production spreadsheet and welcome banner for new projects.
 */
const DashboardPage = () => {
    const {
        project,
        handleUpdateShot,
        handleEditShot,
        handleDeleteShot,
        handleDuplicateShot,
        importScript,
        showToast
    } = useWorkspace();

    const [showWelcome, setShowWelcome] = React.useState(() => {
        // Check if project is truly empty AND user hasn't dismissed banner
        const dismissed = localStorage.getItem(`welcome_dismissed_${project.id}`);
        const isEmpty = project.scenes.length === 0 &&
            project.shots.length === 0 &&
            (!project.scriptElements || project.scriptElements.length === 0);
        return isEmpty && !dismissed;
    });

    const handleDismissWelcome = () => {
        localStorage.setItem(`welcome_dismissed_${project.id}`, 'true');
        setShowWelcome(false);
    };

    const handleImportScript = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.fountain,.txt,.pdf';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    await importScript(file);
                    showToast('Script imported successfully', 'success');
                    handleDismissWelcome(); // Dismiss banner after import
                } catch (error) {
                    showToast('Failed to import script', 'error');
                }
            }
        };
        input.click();
    };

    return (
        <div className="absolute inset-0 overflow-hidden flex flex-col">
            {/* Welcome banner - only shows when empty and not dismissed */}
            {showWelcome && (
                <WelcomeBanner
                    projectId={project.id}
                    projectName={project.name}
                    onImportScript={handleImportScript}
                    onDismiss={handleDismissWelcome}
                />
            )}

            {/* Dashboard content - always visible */}
            <div className="flex-1 overflow-hidden relative">
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
        </div>
    );
};

/**
 * ScriptEditorPage: Dedicated view for writing and editing the screenplay.
 */
const ScriptEditorPage = () => {
    return (
        <ErrorBoundary>
            <LazyWrapper>
                <ScriptPage />
            </LazyWrapper>
        </ErrorBoundary>
    );
};

/**
 * StoryNotesPage: A space for freeform brainstorming and story development notes.
 */
const StoryNotesPage = () => {
    return (
        <ErrorBoundary>
            <LazyWrapper>
                <StoryNotesEditor />
            </LazyWrapper>
        </ErrorBoundary>
    );
};

/**
 * TimelinePage: Visualizes the project structure across a script timeline.
 */
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

/**
 * AssetsPage: Management interface for Characters, Outfits, and Locations.
 */
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

/**
 * SettingsPage: Project-level configuration view.
 * Handles cinematic styles, eras, and custom generation parameters.
 */
const SettingsPage = () => {
    const { project, handleUpdateProject, handleUpdateSettings, showToast } = useWorkspace();

    const addCustomSetting = (field: keyof WorldSettings, value: string) => {
        const currentList = (project.settings as unknown as Record<string, string[]>)[field as keyof Record<string, string[]>] || [];
        if (!currentList.includes(value)) {
            const map: Partial<Record<keyof WorldSettings, keyof WorldSettings>> = {
                'customEras': 'era',
                'customStyles': 'cinematicStyle',
                'customTimes': 'timeOfDay',
                'customLighting': 'lighting'
            };
            const targetField = map[field];
            const updated = {
                ...project,
                settings: {
                    ...project.settings,
                    [field]: [...currentList, value],
                    ...(targetField ? { [targetField]: value } : {})
                }
            };
            handleUpdateProject(updated);
        }
    };

    const removeCustomSetting = (field: keyof WorldSettings, value: string) => {
        const currentList = (project.settings as unknown as Record<string, string[]>)[field as keyof Record<string, string[]>] || [];
        const updated = {
            ...project,
            settings: {
                ...project.settings,
                [field]: currentList.filter((i: string) => i !== value)
            }
        };
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

/**
 * MAIN APP COMPONENT
 * Handles global theme application, routing infrastructure, and 
 * provider initialization for the entire application.
 */
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
        // Default to DARK if null, or if 'dark'.
        if (savedMode === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
        }
    }, []);

    return (
        <SubscriptionProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<ProjectLibrary />} />
                    <Route path="/auth" element={<AuthPage />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/settings/api-keys" element={<ApiKeySettings />} />
                    </Route>

                    <Route path="/test-slate-editor" element={<SlateScriptEditorTest />} />
                    <Route path="/project/:projectId" element={<WorkspaceLayout />}>
                        <Route index element={<DashboardPage />} />
                        <Route path="timeline" element={<TimelinePage />} />
                        <Route path="script" element={<ScriptEditorPage />} />
                        <Route path="story-notes" element={<StoryNotesPage />} />
                        <Route path="assets" element={<AssetsPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <UpgradeModal /> {/* Global Modal */}
            </BrowserRouter>
        </SubscriptionProvider>
    );
};

const WrappedApp = () => (
    <ErrorBoundary>
        <SaveStatusProvider>
            <App />
        </SaveStatusProvider>
    </ErrorBoundary>
);

export default WrappedApp;