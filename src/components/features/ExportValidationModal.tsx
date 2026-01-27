/**
 * 🚫 EXPORT VALIDATION MODAL
 * Blocks export if script has validation errors
 * Phase 4: Pre-export validation check
 */

import React from 'react';
import { X, AlertCircle, Wrench } from 'lucide-react';
import { ValidationReport } from '../../types';

interface ExportValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: ValidationReport;
    onAutoFixAndExport: () => void;
    isFixing?: boolean;
    exportFormat: 'PDF' | 'FDX' | 'Fountain';
}

export const ExportValidationModal: React.FC<ExportValidationModalProps> = ({
    isOpen,
    onClose,
    report,
    onAutoFixAndExport,
    isFixing = false,
    exportFormat
}) => {
    if (!isOpen) return null;

    const errorCount = report.summary.errors;
    const warningCount = report.summary.warnings;
    const confidencePercent = Math.round(report.confidence * 100);

    return (
        <div 
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-surface border border-border rounded-xl shadow-2xl max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-border">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-500/10 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary mb-1">
                                Can't Export Yet
                            </h2>
                            <p className="text-sm text-text-secondary">
                                Your script has {errorCount} {errorCount === 1 ? 'error' : 'errors'} that must be fixed before exporting to {exportFormat}.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-surface-secondary rounded-full text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Confidence Score */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-text-secondary">Script Quality</span>
                            <span className="text-sm font-mono font-bold text-red-400">
                                {confidencePercent}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-red-400 transition-all duration-500"
                                style={{ width: `${confidencePercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-text-tertiary mt-2">
                            CineFlex requires 90%+ confidence for clean exports
                        </p>
                    </div>

                    {/* Issues List */}
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-3">
                            Issues Found:
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {report.issues.slice(0, 8).map((issue, idx) => (
                                <div 
                                    key={idx}
                                    className="flex items-start gap-3 p-3 bg-surface-secondary/50 rounded-lg border border-border/50"
                                >
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-text-primary">
                                            {issue.message}
                                        </div>
                                        {issue.elementId && (
                                            <div className="text-xs text-text-tertiary mt-1 font-mono">
                                                {issue.code}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {report.issues.length > 8 && (
                                <div className="text-center text-text-tertiary text-xs pt-2">
                                    + {report.issues.length - 8} more issues
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-surface-secondary/30 rounded-b-xl">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onAutoFixAndExport}
                            disabled={isFixing}
                            className="
                                flex items-center gap-2 px-6 py-3 rounded-lg font-medium
                                bg-primary hover:bg-primary-hover text-white
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-colors
                            "
                        >
                            <Wrench className="w-4 h-4" />
                            {isFixing ? 'Fixing & Exporting...' : 'Auto-Fix & Export'}
                        </button>
                        
                        <button
                            onClick={onClose}
                            className="
                                px-6 py-3 rounded-lg font-medium
                                bg-surface hover:bg-surface-secondary text-text-primary
                                border border-border
                                transition-colors
                            "
                        >
                            Cancel
                        </button>
                        
                        <div className="flex-1" />
                        
                        <div className="text-xs text-text-tertiary text-right max-w-xs">
                            <strong>Auto-fix</strong> will clean your script and export immediately.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
