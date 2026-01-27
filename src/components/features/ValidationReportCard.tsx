/**
 * 🔍 VALIDATION REPORT CARD
 * Shows script validation status after import
 * Phase 3: User-facing validation UI
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Wrench, X } from 'lucide-react';
import { ValidationReport } from '../../types';
import { Button } from '../ui/Button';

interface ValidationReportCardProps {
    report: ValidationReport;
    onAutoFix?: () => void;
    onDismiss?: () => void;
    autoFixAvailable?: boolean;
    isLoading?: boolean;
}

export const ValidationReportCard: React.FC<ValidationReportCardProps> = ({
    report,
    onAutoFix,
    onDismiss,
    autoFixAvailable = false,
    isLoading = false
}) => {
    // Calculate confidence percentage
    const confidencePercent = Math.round(report.confidence * 100);
    
    // Determine overall status
    const getStatus = () => {
        if (report.summary.errors > 0) return 'error';
        if (report.summary.warnings > 0) return 'warning';
        return 'success';
    };
    
    const status = getStatus();
    
    // Status-based styling
    const statusStyles = {
        success: {
            bg: 'bg-green-500/10',
            border: 'border-green-500/30',
            text: 'text-green-400',
            icon: CheckCircle2
        },
        warning: {
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/30',
            text: 'text-yellow-400',
            icon: AlertTriangle
        },
        error: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            text: 'text-red-400',
            icon: AlertCircle
        }
    };
    
    const style = statusStyles[status];
    const StatusIcon = style.icon;
    
    return (
        <div 
            className={`
                ${style.bg} ${style.border}
                border rounded-lg p-6 animate-in fade-in slide-in-from-top-2 duration-300
                relative
            `}
        >
            {/* Dismiss Button */}
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 p-1 hover:bg-surface-secondary rounded text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
            
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                <StatusIcon className={`w-6 h-6 ${style.text} shrink-0 mt-1`} />
                
                <div className="flex-1">
                    <h3 className={`font-bold text-lg ${style.text} mb-1`}>
                        {status === 'success' && 'Script Validated Successfully'}
                        {status === 'warning' && 'Script Validated with Warnings'}
                        {status === 'error' && 'Script Has Validation Errors'}
                    </h3>
                    
                    {/* Confidence Score */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="text-text-secondary text-sm">
                            Confidence: 
                            <span className={`font-mono font-bold ml-2 ${style.text}`}>
                                {confidencePercent}%
                            </span>
                        </div>
                        
                        {/* Confidence Bar */}
                        <div className="flex-1 max-w-xs h-2 bg-surface-secondary rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${style.text.replace('text-', 'bg-')} transition-all duration-500`}
                                style={{ width: `${confidencePercent}%` }}
                            />
                        </div>
                    </div>
                    
                    {/* Issue Summary */}
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                        {report.summary.errors > 0 && (
                            <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span>
                                    <strong className="text-red-400">{report.summary.errors}</strong>
                                    {' '}{report.summary.errors === 1 ? 'Error' : 'Errors'}
                                </span>
                            </div>
                        )}
                        
                        {report.summary.warnings > 0 && (
                            <div className="flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                <span>
                                    <strong className="text-yellow-400">{report.summary.warnings}</strong>
                                    {' '}{report.summary.warnings === 1 ? 'Warning' : 'Warnings'}
                                </span>
                            </div>
                        )}
                        
                        {status === 'success' && (
                            <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 font-medium">Production Ready</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Issue List (if any) */}
            {report.issues.length > 0 && (
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {report.issues.slice(0, 10).map((issue, idx) => (
                        <div 
                            key={idx}
                            className="bg-surface/50 rounded p-3 text-sm border border-border/50"
                        >
                            <div className="flex items-start gap-2">
                                {issue.severity === 'error' ? (
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-text-primary">{issue.message}</div>
                                    {issue.elementId && (
                                        <div className="text-text-tertiary text-xs mt-1 font-mono">
                                            Code: {issue.code}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {report.issues.length > 10 && (
                        <div className="text-center text-text-tertiary text-xs pt-2">
                            + {report.issues.length - 10} more issues
                        </div>
                    )}
                </div>
            )}
            
            {/* Action Buttons */}
            {(autoFixAvailable || onAutoFix) && report.issues.length > 0 && (
                <div className="mt-6 flex items-center gap-3">
                    <Button
                        onClick={onAutoFix}
                        disabled={isLoading || !autoFixAvailable}
                        size="md"
                        variant="primary"
                        className="flex items-center gap-2"
                    >
                        <Wrench className="w-4 h-4" />
                        {isLoading ? 'Fixing...' : 'Auto-Fix Issues'}
                    </Button>
                    
                    <div className="text-xs text-text-tertiary">
                        {autoFixAvailable 
                            ? 'One-click cleanup available'
                            : 'Manual fixes required'
                        }
                    </div>
                </div>
            )}
        </div>
    );
};
