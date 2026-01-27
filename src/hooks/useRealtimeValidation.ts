/**
 * PHASE 5: REAL-TIME VALIDATION HOOK
 * 
 * React hook that provides real-time validation for script elements.
 * Automatically validates on element changes with debouncing.
 * 
 * Usage:
 * ```tsx
 * const { markers, applyFix, stats } = useRealtimeValidation(scriptElements);
 * ```
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ScriptElement } from '../types';
import {
    validateAllElements,
    validateElementRealtime,
    applyQuickFix,
    getValidationStats,
    LiveValidationMarker,
    RealtimeValidationResult
} from '../services/validation/realtimeValidator';

interface UseRealtimeValidationOptions {
    enabled?: boolean;
    debounceMs?: number;
    validateOnMount?: boolean;
}

interface UseRealtimeValidationReturn {
    // Validation results
    markers: Map<string, RealtimeValidationResult>;
    
    // Get markers for specific element
    getMarkersForElement: (elementId: string) => LiveValidationMarker[];
    
    // Apply quick fix
    applyFix: (element: ScriptElement, marker: LiveValidationMarker) => ScriptElement | null;
    
    // Statistics
    stats: {
        errors: number;
        warnings: number;
        infos: number;
    };
    
    // Control
    isValidating: boolean;
    revalidate: () => void;
}

/**
 * Hook for real-time validation of script elements
 */
export const useRealtimeValidation = (
    elements: ScriptElement[],
    options: UseRealtimeValidationOptions = {}
): UseRealtimeValidationReturn => {
    const {
        enabled = true,
        debounceMs = 300,
        validateOnMount = true
    } = options;

    const [markers, setMarkers] = useState<Map<string, RealtimeValidationResult>>(new Map());
    const [isValidating, setIsValidating] = useState(false);

    // Debounced validation
    useEffect(() => {
        if (!enabled) {
            setMarkers(new Map());
            return;
        }

        setIsValidating(true);

        const timer = setTimeout(() => {
            try {
                const results = validateAllElements(elements);
                setMarkers(results);
            } catch (error) {
                console.error('[Phase 5] Validation error:', error);
            } finally {
                setIsValidating(false);
            }
        }, debounceMs);

        return () => {
            clearTimeout(timer);
            setIsValidating(false);
        };
    }, [elements, enabled, debounceMs]);

    // Get markers for specific element
    const getMarkersForElement = useCallback((elementId: string): LiveValidationMarker[] => {
        const result = markers.get(elementId);
        return result?.markers || [];
    }, [markers]);

    // Apply quick fix
    const applyFix = useCallback((element: ScriptElement, marker: LiveValidationMarker) => {
        return applyQuickFix(element, marker);
    }, []);

    // Calculate statistics
    const stats = useMemo(() => {
        return getValidationStats(markers);
    }, [markers]);

    // Manual revalidation
    const revalidate = useCallback(() => {
        if (!enabled) return;

        setIsValidating(true);
        try {
            const results = validateAllElements(elements);
            setMarkers(results);
        } catch (error) {
            console.error('[Phase 5] Revalidation error:', error);
        } finally {
            setIsValidating(false);
        }
    }, [elements, enabled]);

    return {
        markers,
        getMarkersForElement,
        applyFix,
        stats,
        isValidating,
        revalidate
    };
};

/**
 * Hook for validating a single element in real-time
 * Useful for individual element editors
 */
export const useSingleElementValidation = (
    element: ScriptElement,
    enabled: boolean = true,
    debounceMs: number = 300
) => {
    const [markers, setMarkers] = useState<LiveValidationMarker[]>([]);
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setMarkers([]);
            return;
        }

        setIsValidating(true);

        const timer = setTimeout(() => {
            try {
                const result = validateElementRealtime(element);
                setMarkers(result.markers);
            } catch (error) {
                console.error('[Phase 5] Single element validation error:', error);
            } finally {
                setIsValidating(false);
            }
        }, debounceMs);

        return () => {
            clearTimeout(timer);
            setIsValidating(false);
        };
    }, [element, enabled, debounceMs]);

    const hasErrors = markers.some(m => m.severity === 'error');
    const hasWarnings = markers.some(m => m.severity === 'warning');

    return {
        markers,
        isValidating,
        hasErrors,
        hasWarnings,
        isValid: !hasErrors
    };
};
