import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
    message?: string;
    variant?: 'inline' | 'fullscreen' | 'section';
    showProgress?: boolean;
    progress?: number;
    size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    message = 'Loading...',
    variant = 'inline',
    showProgress = false,
    progress,
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    const textSizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    };

    // Fullscreen variant for page-level loading
    if (variant === 'fullscreen') {
        return (
            <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className={`${sizeClasses.lg} animate-spin text-primary`} />
                    <div className={`${textSizeClasses.lg} text-text-primary font-medium`}>
                        {message}
                    </div>
                    {showProgress && progress !== undefined && (
                        <div className="w-64 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Section variant for component-level loading
    if (variant === 'section') {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mb-3`} />
                <div className={`${textSizeClasses[size]} text-text-secondary`}>
                    {message}
                </div>
                {showProgress && progress !== undefined && (
                    <div className="w-48 h-1 bg-surface-secondary rounded-full overflow-hidden mt-3">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Inline variant for inline loading indicators
    return (
        <div className="inline-flex items-center gap-2">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
            <span className={`${textSizeClasses[size]} text-text-secondary`}>
                {message}
            </span>
        </div>
    );
};

export default LoadingState;
