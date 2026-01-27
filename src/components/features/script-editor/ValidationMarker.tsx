/**
 * PHASE 5: VALIDATION MARKER COMPONENT
 * 
 * Displays real-time validation errors/warnings as underlines
 * with hover tooltips and click-to-fix functionality.
 * 
 * Like Final Draft's live validation, but cleaner.
 */

import React, { useState, useRef, useEffect } from 'react';
import { LiveValidationMarker } from '../../../services/validation/realtimeValidator';
import { AlertCircle, AlertTriangle, Info, Zap } from 'lucide-react';

interface ValidationMarkerProps {
    marker: LiveValidationMarker;
    children: React.ReactNode;
    onQuickFix?: (marker: LiveValidationMarker) => void;
}

/**
 * Renders validation underline with tooltip
 */
export const ValidationMarker: React.FC<ValidationMarkerProps> = ({
    marker,
    children,
    onQuickFix
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const markerRef = useRef<HTMLSpanElement>(null);

    // Get underline color based on severity
    const getUnderlineClass = () => {
        switch (marker.severity) {
            case 'error':
                return 'border-b-2 border-red-500 decoration-wavy';
            case 'warning':
                return 'border-b-2 border-yellow-500 decoration-wavy';
            case 'info':
                return 'border-b-2 border-blue-400 decoration-dotted';
            default:
                return 'border-b-2 border-gray-400';
        }
    };

    // Get icon based on severity
    const getIcon = () => {
        switch (marker.severity) {
            case 'error':
                return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
            case 'info':
                return <Info className="w-3.5 h-3.5 text-blue-400" />;
        }
    };

    const handleQuickFix = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onQuickFix && marker.suggestedFix) {
            onQuickFix(marker);
            setShowTooltip(false);
        }
    };

    return (
        <span
            ref={markerRef}
            className={`
                relative inline cursor-pointer
                ${getUnderlineClass()}
                transition-all duration-150
                hover:bg-opacity-10
                ${
                    marker.severity === 'error' ? 'hover:bg-red-500' :
                    marker.severity === 'warning' ? 'hover:bg-yellow-500' :
                    'hover:bg-blue-400'
                }
            `}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={marker.suggestedFix ? handleQuickFix : undefined}
        >
            {children}
            
            {/* Tooltip */}
            {showTooltip && (
                <div
                    className="
                        absolute left-0 top-full mt-2 z-50
                        min-w-[240px] max-w-[360px]
                        bg-surface border border-border rounded-lg shadow-lg
                        p-3
                        pointer-events-none
                    "
                    style={{
                        transform: 'translateX(-10px)'
                    }}
                >
                    {/* Arrow */}
                    <div className="
                        absolute -top-1.5 left-4
                        w-3 h-3 bg-surface border-l border-t border-border
                        transform rotate-45
                    " />
                    
                    {/* Content */}
                    <div className="relative space-y-2">
                        {/* Header with icon */}
                        <div className="flex items-start gap-2">
                            {getIcon()}
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-text-primary">
                                    {marker.message}
                                </div>
                                <div className="text-[10px] text-text-muted mt-0.5">
                                    Code: {marker.code}
                                </div>
                            </div>
                        </div>

                        {/* Quick Fix Button */}
                        {marker.suggestedFix && onQuickFix && (
                            <button
                                onClick={handleQuickFix}
                                className="
                                    w-full flex items-center gap-2
                                    px-2.5 py-1.5 rounded-md
                                    bg-primary text-white
                                    text-xs font-medium
                                    hover:bg-primary-hover
                                    transition-colors
                                    pointer-events-auto
                                "
                            >
                                <Zap className="w-3.5 h-3.5" />
                                Quick Fix
                            </button>
                        )}

                        {/* Preview of fix */}
                        {marker.suggestedFix && (
                            <div className="pt-2 border-t border-border">
                                <div className="text-[10px] text-text-muted mb-1">Will change to:</div>
                                <div className="text-xs font-mono bg-surface-secondary px-2 py-1 rounded text-text-primary">
                                    {marker.suggestedFix.length > 60 
                                        ? marker.suggestedFix.substring(0, 60) + '...'
                                        : marker.suggestedFix
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </span>
    );
};

/**
 * Validation status indicator (for editor toolbar)
 */
interface ValidationStatusProps {
    errorCount: number;
    warningCount: number;
    infoCount: number;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({
    errorCount,
    warningCount,
    infoCount
}) => {
    if (errorCount === 0 && warningCount === 0 && infoCount === 0) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-500">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium">No Issues</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            {errorCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{errorCount}</span>
                </div>
            )}
            
            {warningCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{warningCount}</span>
                </div>
            )}
            
            {infoCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-400/10 text-blue-400">
                    <Info className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{infoCount}</span>
                </div>
            )}
        </div>
    );
};
