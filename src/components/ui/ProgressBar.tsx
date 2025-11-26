import React, { useEffect, useState } from 'react';

export interface ProgressBarProps {
    value?: number; // 0-100 for determinate, undefined for indeterminate
    showPercentage?: boolean;
    estimatedTime?: number; // in seconds
    className?: string;
    variant?: 'default' | 'success' | 'error' | 'warning';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    showPercentage = false,
    estimatedTime,
    className = '',
    variant = 'default',
}) => {
    const [timeRemaining, setTimeRemaining] = useState(estimatedTime);

    useEffect(() => {
        if (estimatedTime && value !== undefined) {
            const remaining = Math.ceil((estimatedTime * (100 - value)) / 100);
            setTimeRemaining(remaining);
        }
    }, [value, estimatedTime]);

    const variants = {
        default: 'bg-accent',
        success: 'bg-status-success',
        error: 'bg-status-error',
        warning: 'bg-status-warning',
    };

    const isIndeterminate = value === undefined;

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <div className="h-1.5 bg-[#2D2D30] rounded-full overflow-hidden">
                {isIndeterminate ? (
                    <div className={`h-full w-1/3 ${variants[variant]} animate-pulse`}
                        style={{
                            animation: 'indeterminate 1.5s ease-in-out infinite',
                            transformOrigin: 'left'
                        }}
                    />
                ) : (
                    <div
                        className={`h-full ${variants[variant]} transition-all duration-300 ease-out`}
                        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                    />
                )}
            </div>
            {(showPercentage || timeRemaining) && !isIndeterminate && (
                <div className="flex items-center justify-between text-xs text-text-muted">
                    {showPercentage && <span>{Math.round(value)}%</span>}
                    {timeRemaining !== undefined && timeRemaining > 0 && (
                        <span className="ml-auto">~{timeRemaining}s remaining</span>
                    )}
                </div>
            )}
            <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(300%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
        </div>
    );
};

export default ProgressBar;
