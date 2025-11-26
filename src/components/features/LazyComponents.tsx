import React, { lazy, Suspense } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * Lazy-loaded feature components
 * These components are code-split to reduce initial bundle size
 */

// Lazy load heavy feature components
export const ShotEditor = lazy(() => import('./ShotEditor').then(m => ({ default: m.ShotEditor })));
export const AssetManager = lazy(() => import('./AssetManager').then(m => ({ default: m.AssetManager })));
export const TimelineView = lazy(() => import('./TimelineView').then(m => ({ default: m.TimelineView })));
export const ProjectLibrary = lazy(() => import('./ProjectLibrary').then(m => ({ default: m.ProjectLibrary })));
export const ProjectSettings = lazy(() => import('./ProjectSettings').then(m => ({ default: m.ProjectSettings })));

/**
 * Loading fallback wrapper for lazy-loaded components
 */
export const LazyWrapper: React.FC<{ children: React.ReactNode; fullHeight?: boolean }> = ({
    children,
    fullHeight = true
}) => (
    <Suspense
        fallback={
            <div className={`flex items-center justify-center ${fullHeight ? 'h-full' : 'min-h-[200px]'}`}>
                <LoadingSpinner size="lg" />
            </div>
        }
    >
        {children}
    </Suspense>
);
