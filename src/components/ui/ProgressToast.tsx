/**
 * PROGRESS TOAST
 * Shows non-blocking progress indicators for long-running operations.
 * Used for: PDF export, large imports, pagination calculations, etc.
 */

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export interface ProgressToastProps {
    isVisible: boolean;
    message: string;
    progress?: number; // 0-100, undefined = indeterminate
    status?: 'loading' | 'success' | 'error';
    duration?: number; // Auto-hide after N ms (only for success/error)
    onClose?: () => void;
}

export const ProgressToast: React.FC<ProgressToastProps> = ({
    isVisible,
    message,
    progress,
    status = 'loading',
    duration = 3000,
    onClose
}) => {
    const [shouldShow, setShouldShow] = useState(isVisible);

    useEffect(() => {
        if (isVisible) {
            setShouldShow(true);
        } else {
            // Fade out animation
            const timer = setTimeout(() => setShouldShow(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    useEffect(() => {
        if (isVisible && (status === 'success' || status === 'error') && duration > 0) {
            const timer = setTimeout(() => {
                onClose?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, status, duration, onClose]);

    if (!shouldShow) return null;

    const icon = {
        loading: <Loader2 className="w-5 h-5 animate-spin" />,
        success: <CheckCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />
    }[status];

    const colors = {
        loading: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
        success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
        error: 'bg-red-500/10 border-red-500/30 text-red-500'
    }[status];

    return (
        <div 
            className={`
                fixed bottom-6 right-6 z-50 
                transition-all duration-300 ease-out
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
        >
            <div className={`
                ${colors}
                border rounded-xl shadow-2xl backdrop-blur-sm
                px-5 py-4 min-w-[320px] max-w-md
            `}>
                <div className="flex items-start gap-4">
                    <div className="mt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-text-primary mb-1">
                            {message}
                        </div>
                        {progress !== undefined && (
                            <div className="space-y-1">
                                <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-300 ${
                                            status === 'success' ? 'bg-emerald-500' :
                                            status === 'error' ? 'bg-red-500' :
                                            'bg-blue-500'
                                        }`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="text-xs font-mono text-text-secondary">
                                    {progress.toFixed(0)}%
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Hook to manage progress toast state
 */
export const useProgressToast = () => {
    const [state, setState] = useState<Omit<ProgressToastProps, 'isVisible'> & { isVisible: boolean }>({
        isVisible: false,
        message: '',
        progress: undefined,
        status: 'loading'
    });

    const show = (message: string, options?: { progress?: number; status?: 'loading' | 'success' | 'error' }) => {
        setState({
            isVisible: true,
            message,
            progress: options?.progress,
            status: options?.status || 'loading'
        });
    };

    const update = (updates: Partial<Omit<ProgressToastProps, 'isVisible'>>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    const hide = () => {
        setState(prev => ({ ...prev, isVisible: false }));
    };

    return {
        show,
        update,
        hide,
        toastProps: state
    };
};

/**
 * Wrapper component for easy integration
 */
export const ProgressToastContainer: React.FC = () => {
    // Global progress toast singleton
    // Can be controlled via a context or global state manager
    return null; // Implementation depends on your state management
};
