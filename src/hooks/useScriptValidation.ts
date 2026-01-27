/**
 * 🔧 SCRIPT VALIDATION HOOK
 * Handles script validation and auto-fix operations
 * Phase 3: Validation UI integration
 */

import { useState, useCallback } from 'react';
import { parseScript } from '../services/scriptParser';
import { ValidationReport, ScriptElement } from '../types';

interface UseScriptValidationResult {
    validationReport: ValidationReport | null;
    autoFixAvailable: boolean;
    isAutoFixing: boolean;
    runAutoFix: (file: File) => Promise<{
        elements: ScriptElement[];
        report: ValidationReport;
    } | null>;
    clearValidation: () => void;
}

/**
 * Hook for managing script validation and auto-fix
 * 
 * @example
 * const { validationReport, autoFixAvailable, runAutoFix } = useScriptValidation();
 * 
 * // After importing a script
 * const result = await parseScript(file);
 * setValidationReport(result.validationReport);
 * 
 * // User clicks auto-fix
 * const fixed = await runAutoFix(file);
 * if (fixed) {
 *   setElements(fixed.elements);
 * }
 */
export const useScriptValidation = (): UseScriptValidationResult => {
    const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
    const [autoFixAvailable, setAutoFixAvailable] = useState(false);
    const [isAutoFixing, setIsAutoFixing] = useState(false);

    /**
     * Run auto-fix on a script file
     */
    const runAutoFix = useCallback(async (file: File) => {
        setIsAutoFixing(true);
        
        try {
            console.log('[Phase 3] Running auto-fix on script:', file.name);
            
            // Re-parse with autoFix enabled
            const result = await parseScript(file, { 
                autoFix: true,
                strict: false // Don't throw errors, just fix them
            });
            
            console.log('[Phase 3] Auto-fix complete. New confidence:', result.validationReport.confidence);
            
            // Update validation state
            setValidationReport(result.validationReport);
            setAutoFixAvailable(result.autoFixAvailable || false);
            
            return {
                elements: result.scriptModel.getElements(),
                report: result.validationReport
            };
        } catch (error) {
            console.error('[Phase 3] Auto-fix failed:', error);
            return null;
        } finally {
            setIsAutoFixing(false);
        }
    }, []);

    /**
     * Clear validation state
     */
    const clearValidation = useCallback(() => {
        setValidationReport(null);
        setAutoFixAvailable(false);
    }, []);

    return {
        validationReport,
        autoFixAvailable,
        isAutoFixing,
        runAutoFix,
        clearValidation
    };
};

/**
 * Update validation state from parse result
 * Helper function to use after parsing a script
 */
export const updateValidationFromParse = (
    parseResult: Awaited<ReturnType<typeof parseScript>>,
    setValidationReport: (report: ValidationReport) => void,
    setAutoFixAvailable: (available: boolean) => void
) => {
    setValidationReport(parseResult.validationReport);
    setAutoFixAvailable(parseResult.autoFixAvailable || false);
    
    console.log('[Phase 3] Validation updated:', {
        confidence: parseResult.validationReport.confidence,
        errors: parseResult.validationReport.summary.errors,
        warnings: parseResult.validationReport.summary.warnings,
        autoFixAvailable: parseResult.autoFixAvailable
    });
};
