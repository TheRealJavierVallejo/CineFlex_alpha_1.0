/**
 * EXPORT VALIDATION GATE
 * Prevents users from exporting scripts with critical errors.
 * Final Draft-style quality control before PDF generation.
 */

import React, { useState, useMemo } from 'react';
import { ScriptElement } from '../../types';
import { ScriptModel } from '../../services/scriptModel';
import { AlertTriangle, CheckCircle, XCircle, Info, FileWarning } from 'lucide-react';
import Button from '../ui/Button';

interface ExportValidationGateProps {
    elements: ScriptElement[];
    onProceed: () => void;
    onCancel: () => void;
    isOpen: boolean;
}

export const ExportValidationGate: React.FC<ExportValidationGateProps> = ({
    elements,
    onProceed,
    onCancel,
    isOpen
}) => {
    const [forceExport, setForceExport] = useState(false);

    const validation = useMemo(() => {
        if (!elements || elements.length === 0) {
            return {
                valid: true,
                confidence: 1,
                summary: { errors: 0, warnings: 0, info: 0 },
                issues: []
            };
        }
        const model = ScriptModel.create(elements, undefined, { strict: false });
        return model.getValidationReport();
    }, [elements]);

    if (!isOpen) return null;

    const { valid, confidence, summary, issues } = validation;
    const hasBlockingErrors = summary.errors > 0;
    const hasWarnings = summary.warnings > 0;

    // Categorize issues
    const criticalIssues = issues.filter(i => i.severity === 'error');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    const infoIssues = issues.filter(i => i.severity === 'info');

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-start gap-4">
                        {valid ? (
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                            </div>
                        ) : (
                            <div className="p-3 bg-red-500/10 rounded-xl">
                                <FileWarning className="w-6 h-6 text-red-500" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-text-primary mb-1">
                                {valid ? 'Ready to Export' : 'Export Quality Check'}
                            </h2>
                            <p className="text-sm text-text-secondary">
                                {valid 
                                    ? 'Your script passed all quality checks and is ready for professional use.'
                                    : 'Your script has issues that may affect the exported PDF quality.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Confidence Score */}
                    <div className="bg-surface-secondary/50 rounded-xl p-4 border border-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Confidence Score</span>
                            <span className={`text-2xl font-bold ${
                                confidence >= 0.9 ? 'text-emerald-500' :
                                confidence >= 0.7 ? 'text-yellow-500' :
                                'text-red-500'
                            }`}>
                                {(confidence * 100).toFixed(0)}%
                            </span>
                        </div>
                        <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                            <div 
                                className={`h-full transition-all ${
                                    confidence >= 0.9 ? 'bg-emerald-500' :
                                    confidence >= 0.7 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                }`}
                                style={{ width: `${confidence * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-500">{summary.errors}</div>
                            <div className="text-xs text-text-secondary mt-1">Errors</div>
                        </div>
                        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-yellow-500">{summary.warnings}</div>
                            <div className="text-xs text-text-secondary mt-1">Warnings</div>
                        </div>
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-500">{summary.info}</div>
                            <div className="text-xs text-text-secondary mt-1">Info</div>
                        </div>
                    </div>

                    {/* Issues List */}
                    {(criticalIssues.length > 0 || warningIssues.length > 0) && (
                        <div className="space-y-4">
                            {criticalIssues.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <XCircle className="w-4 h-4" />
                                        Critical Issues ({criticalIssues.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {criticalIssues.slice(0, 5).map((issue, i) => (
                                            <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                                <div className="font-bold text-sm text-text-primary mb-1">{issue.code}</div>
                                                <div className="text-xs text-text-secondary">{issue.message}</div>
                                                {issue.elementId && (
                                                    <div className="text-xs text-text-muted mt-1">Element: {issue.elementId.slice(0, 8)}...</div>
                                                )}
                                            </div>
                                        ))}
                                        {criticalIssues.length > 5 && (
                                            <div className="text-xs text-text-muted text-center py-2">
                                                +{criticalIssues.length - 5} more errors
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {warningIssues.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Warnings ({warningIssues.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {warningIssues.slice(0, 3).map((issue, i) => (
                                            <div key={i} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                                                <div className="font-bold text-sm text-text-primary mb-1">{issue.code}</div>
                                                <div className="text-xs text-text-secondary">{issue.message}</div>
                                            </div>
                                        ))}
                                        {warningIssues.length > 3 && (
                                            <div className="text-xs text-text-muted text-center py-2">
                                                +{warningIssues.length - 3} more warnings
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Force Export Checkbox (only show if errors exist) */}
                    {hasBlockingErrors && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={forceExport}
                                    onChange={(e) => setForceExport(e.target.checked)}
                                    className="mt-1 w-4 h-4 accent-primary cursor-pointer"
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-text-primary mb-1">
                                        I understand the risks
                                    </div>
                                    <div className="text-xs text-text-secondary">
                                        Export anyway with formatting issues. The PDF may not meet professional standards.
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex gap-3 bg-surface-secondary/30">
                    <Button 
                        variant="secondary" 
                        onClick={onCancel}
                        className="flex-1"
                    >
                        Go Back & Fix
                    </Button>
                    <Button 
                        variant="primary"
                        onClick={onProceed}
                        disabled={hasBlockingErrors && !forceExport}
                        className="flex-1"
                    >
                        {valid ? 'Export PDF' : (forceExport ? 'Export Anyway' : 'Fix Errors First')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

/**
 * Hook to check if export should be gated
 * CRITICAL: Memoizes properly to prevent infinite loops
 */
export const useExportValidation = (elements: ScriptElement[]) => {
    return useMemo(() => {
        // Guard: Return safe defaults for empty/null elements
        if (!elements || elements.length === 0) {
            return {
                shouldWarn: false,
                hasBlockingErrors: false,
                validation: {
                    valid: true,
                    confidence: 1,
                    summary: { errors: 0, warnings: 0, info: 0 },
                    issues: []
                }
            };
        }
        
        try {
            const model = ScriptModel.create(elements, undefined, { strict: false });
            const report = model.getValidationReport();
            
            return {
                shouldWarn: !report.valid || report.summary.warnings > 0,
                hasBlockingErrors: report.summary.errors > 0,
                validation: report
            };
        } catch (error) {
            console.error('[useExportValidation] Error validating script:', error);
            return {
                shouldWarn: false,
                hasBlockingErrors: false,
                validation: {
                    valid: true,
                    confidence: 1,
                    summary: { errors: 0, warnings: 0, info: 0 },
                    issues: []
                }
            };
        }
    }, [elements]);
};
