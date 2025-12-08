import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * Lazy-loaded feature components
 * These components are code-split to reduce initial bundle size
 */

export const ShotEditor = lazy(() => import('./ShotEditor').then(m => ({ default: m.ShotEditor })));
export const AssetManager = lazy(() => import('./AssetManager').then(m => ({ default: m.AssetManager })));
export const TimelineView = lazy(() => import('./TimelineView').then(m => ({ default: m.TimelineView })));
export const ProjectLibrary = lazy(() => import('./ProjectLibrary').then(m => ({ default: m.ProjectLibrary })));
export const ProjectSettings = lazy(() => import('./ProjectSettings').then(m => ({ default: m.ProjectSettings })));
export const ShotList = lazy(() => import('./ShotList').then(m => ({ default: m.ShotList })));
export const ScriptPage = lazy(() => import('./ScriptPage').then(m => ({ default: m.ScriptPage })));
export const ProductionSpreadsheet = lazy(() => import('./ProductionSpreadsheet').then(m => ({ default: m.ProductionSpreadsheet })));
export const StoryNotesEditor = lazy(() => import('./StoryNotesEditor').then(m => ({ default: m.StoryNotesEditor })));

/**
 * Loading fallback wrapper for lazy-loaded components
 */
export const LazyWrapper: React.FC<{ children: React.ReactNode; fullHeight?: boolean }> = ({
    children,
    fullHeight = true
}) => (
    <Suspense
        fallback={
            <div className={`flex items-center justify-center bg-background ${fullHeight ? 'h-full' : 'min-h-[200px]'}`}>
                <div className="flex flex-col items-center gap-4">
                    <LoadingSpinner size="lg" />
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-mono animate-pulse">Loading Module...</span>
                </div>
            </div>
        }
    >
        {children}
    </Suspense>
);