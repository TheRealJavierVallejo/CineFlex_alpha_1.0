/**
 * PHASE 5: REALTIME VALIDATION HOOK
 * 
 * React hook that integrates real-time validation into the script editor.
 * Handles debouncing, performance optimization, and quick fixes.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    validationResults: Map<string, RealtimeValidationResult>;
    stats: { errors: number; warnings: number; infos: number };
    isValidating: boolean;
    getMarkersForElement: (elementId: string) => LiveValidationMarker[];
    applyQuickFixToElement: (elementId: string, marker: LiveValidationMarker) => void;
    revalidate: () => void;
    clearValidation: () => void;
}

/**
 * Hook for real-time validation in script editor
 */
export const useRealtimeValidation = (
    elements: ScriptElement[],
    onElementUpdate?: (elementId: string, updatedElement: ScriptElement) => void,
    options: UseRealtimeValidationOptions = {}
): UseRealtimeValidationReturn => {
    const {
        enabled = true,
        debounceMs = 300,
        validateOnMount = true
    } = options;

    const [validationResults, setValidationResults] = useState<Map<string, RealtimeValidationResult>>(new Map());
    const [isValidating, setIsValidating] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const previousElementsRef = useRef<ScriptElement[]>(elements);

    // Validate all elements
    const performValidation = useCallback(() => {
        if (!enabled) {
            setValidationResults(new Map());
            return;
        }

        setIsValidating(true);
        
        // Run validation
        const results = validateAllElements(elements);
        
        setValidationResults(results);
        setIsValidating(false);
        
        const stats = getValidationStats(results);
        console.log(
            `[Phase 5] Validated ${elements.length} elements:`,
            `${stats.errors} errors,`,
            `${stats.warnings} warnings,`,
            `${stats.infos} info`
        );
    }, [elements, enabled]);

    // Debounced validation
    useEffect(() => {
        if (!enabled) return;

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Check if elements actually changed
        const hasChanged = elements.length !== previousElementsRef.current.length ||
            elements.some((el, idx) => {
                const prevEl = previousElementsRef.current[idx];
                return !prevEl || el.id !== prevEl.id || el.content !== prevEl.content || el.type !== prevEl.type;
            });

        if (!hasChanged) {
            return;
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            performValidation();
            previousElementsRef.current = elements;
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [elements, enabled, debounceMs, performValidation]);

    // Initial validation on mount
    useEffect(() => {
        if (validateOnMount && enabled && elements.length > 0) {
            performValidation();
        }
    }, []); // Only on mount

    // Get markers for specific element
    const getMarkersForElement = useCallback((elementId: string): LiveValidationMarker[] => {
        const result = validationResults.get(elementId);
        return result?.markers || [];
    }, [validationResults]);

    // Apply quick fix to element
    const applyQuickFixToElement = useCallback((elementId: string, marker: LiveValidationMarker) => {
        const element = elements.find(el => el.id === elementId);
        if (!element || !onElementUpdate) {
            console.warn('[Phase 5] Cannot apply quick fix: element not found or no update handler');
            return;
        }

        const fixedElement = applyQuickFix(element, marker);
        if (fixedElement) {
            console.log(`[Phase 5] Applied quick fix for ${marker.code} on element ${elementId}`);
            onElementUpdate(elementId, fixedElement);
        }
    }, [elements, onElementUpdate]);

    // Manual revalidation
    const revalidate = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        performValidation();
    }, [performValidation]);

    // Clear all validation
    const clearValidation = useCallback(() => {
        setValidationResults(new Map());
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
    }, []);

    // Calculate stats
    const stats = useMemo(() => {
        return getValidationStats(validationResults);
    }, [validationResults]);

    return {
        validationResults,
        stats,
        isValidating,
        getMarkersForElement,
        applyQuickFixToElement,
        revalidate,
        clearValidation
    };
};

/**
 * Hook for single element validation (for standalone element editors)
 */
export const useElementValidation = (
    element: ScriptElement,
    enabled: boolean = true
) => {
    const [markers, setMarkers] = useState<LiveValidationMarker[]>([]);
    const [isValid, setIsValid] = useState(true);

    useEffect(() => {
        if (!enabled) {
            setMarkers([]);
            setIsValid(true);
            return;
        }

        const result = validateElementRealtime(element);
        setMarkers(result.markers);
        setIsValid(result.isValid);
    }, [element, enabled]);

    return {
        markers,
        isValid,
        hasErrors: markers.some(m => m.severity === 'error'),
        hasWarnings: markers.some(m => m.severity === 'warning'),
        errorCount: markers.filter(m => m.severity === 'error').length,
        warningCount: markers.filter(m => m.severity === 'warning').length
    };
};
