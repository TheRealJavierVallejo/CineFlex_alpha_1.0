/**
 * PHASE 5: VALIDATION MARKER COMPONENT
 * 
 * Displays validation errors/warnings as underlines with tooltips.
 * Clicking applies quick-fix if available.
 * 
 * Like Final Draft's inline validation, but cleaner.
 */

import React, { useState, useRef, useEffect } from 'react';
import { LiveValidationMarker } from '../../../services/validation/realtimeValidator';
import { AlertCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';

interface ValidationMarkerProps {
    marker: LiveValidationMarker;
    onApplyFix?: () => void;
    children: React.ReactNode;
}

export const ValidationMarker: React.FC<ValidationMarkerProps> = ({
    marker,
    onApplyFix,
    children
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const markerRef = useRef<HTMLSpanElement>(null);

    // Get underline color based on severity
    const getUnderlineClass = () => {
        switch (marker.severity) {
            case 'error':
                return 'border-b-2 border-red-500';
            case 'warning':
                return 'border-b-2 border-yellow-500';
            case 'info':
                return 'border-b-2 border-blue-400';
            default:
                return '';
        }
    };

    // Get icon based on severity
    const getIcon = () => {
        switch (marker.severity) {
            case 'error':
                return <AlertCircle className="w-3 h-3 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
            case 'info':
                return <Info className="w-3 h-3 text-blue-400" />;
        }
    };

    const handleClick = () => {
        if (marker.suggestedFix && onApplyFix) {
            onApplyFix();
        }
    };

    return (
        <span
            ref={markerRef}
            className={`
                relative inline
                ${getUnderlineClass()}
                ${marker.suggestedFix ? 'cursor-pointer hover:bg-opacity-10 hover:bg-yellow-500' : 'cursor-help'}
                transition-all duration-100
            `}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={handleClick}
            title={marker.message}
        >
            {children}

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute z-50 bottom-full left-0 mb-2 w-max max-w-xs">
                    <div className="bg-surface border border-border rounded-lg shadow-lg p-3">
                        {/* Header */}
                        <div className="flex items-start gap-2 mb-2">
                            {getIcon()}
                            <div className="flex-1">
                                <p className="text-xs font-medium text-text-primary">
                                    {marker.message}
                                </p>
                                <p className="text-[10px] text-text-muted mt-0.5">
                                    {marker.code}
                                </p>
                            </div>
                        </div>

                        {/* Quick Fix Button */}
                        {marker.suggestedFix && onApplyFix && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onApplyFix();
                                }}
                                className="
                                    w-full mt-2 px-2 py-1.5
                                    bg-primary hover:bg-primary-hover
                                    text-white text-xs font-medium
                                    rounded flex items-center justify-center gap-1.5
                                    transition-colors duration-100
                                "
                            >
                                <Sparkles className="w-3 h-3" />
                                Apply Quick Fix
                            </button>
                        )}

                        {/* Preview of fix */}
                        {marker.suggestedFix && (
                            <div className="mt-2 pt-2 border-t border-border">
                                <p className="text-[10px] text-text-muted mb-1">Will change to:</p>
                                <p className="text-xs text-text-secondary font-mono bg-surface-secondary px-2 py-1 rounded">
                                    {marker.suggestedFix.length > 50 
                                        ? marker.suggestedFix.substring(0, 50) + '...'
                                        : marker.suggestedFix
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border" />
                </div>
            )}
        </span>
    );
};

/**
 * Wrapper for element content with validation markers
 */
interface ValidationMarkedContentProps {
    content: string;
    markers: LiveValidationMarker[];
    onApplyFix: (marker: LiveValidationMarker) => void;
}

export const ValidationMarkedContent: React.FC<ValidationMarkedContentProps> = ({
    content,
    markers,
    onApplyFix
}) => {
    // If no markers, render plain content
    if (markers.length === 0) {
        return <>{content}</>;
    }

    // Sort markers by start offset
    const sortedMarkers = [...markers].sort((a, b) => a.startOffset - b.startOffset);

    // Build segments
    const segments: React.ReactNode[] = [];
    let lastOffset = 0;

    sortedMarkers.forEach((marker, index) => {
        // Add text before marker
        if (marker.startOffset > lastOffset) {
            segments.push(
                <span key={`text-${index}`}>
                    {content.substring(lastOffset, marker.startOffset)}
                </span>
            );
        }

        // Add marked text
        const markedText = content.substring(marker.startOffset, marker.endOffset);
        segments.push(
            <ValidationMarker
                key={`marker-${index}`}
                marker={marker}
                onApplyFix={() => onApplyFix(marker)}
            >
                {markedText}
            </ValidationMarker>
        );

        lastOffset = marker.endOffset;
    });

    // Add remaining text
    if (lastOffset < content.length) {
        segments.push(
            <span key="text-end">
                {content.substring(lastOffset)}
            </span>
        );
    }

    return <>{segments}</>;
};

/**
 * Validation status indicator
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
        return null;
    }

    return (
        <div className="flex items-center gap-3 text-xs">
            {errorCount > 0 && (
                <div className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
                </div>
            )}
            {warningCount > 0 && (
                <div className="flex items-center gap-1 text-yellow-500">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
                </div>
            )}
            {infoCount > 0 && (
                <div className="flex items-center gap-1 text-blue-400">
                    <Info className="w-3 h-3" />
                    <span>{infoCount} suggestion{infoCount !== 1 ? 's' : ''}</span>
                </div>
            )}
        </div>
    );
};
