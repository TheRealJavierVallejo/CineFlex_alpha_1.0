import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Button from './Button';

interface ErrorFallbackProps {
    error: Error;
    errorInfo?: React.ErrorInfo;
    resetErrorBoundary?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
    error,
    errorInfo,
    resetErrorBoundary
}) => {
    const isDevelopment = import.meta.env.DEV;

    const handleReload = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        window.location.href = '/';
    };

    const handleCopyError = () => {
        const errorDetails = `
Error: ${error.message}
Stack: ${error.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
    `.trim();

        navigator.clipboard.writeText(errorDetails);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                {/* Error Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-red-900/20 border-2 border-red-500/50 flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                </div>

                {/* Error Message */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-text-primary mb-3">
                        Something went wrong
                    </h1>
                    <p className="text-text-secondary text-lg">
                        We encountered an unexpected error. Don't worry, your data is safe.
                    </p>
                </div>

                {/* Error Details (Development only) */}
                {isDevelopment && (
                    <div className="mb-6 bg-surface border border-border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                            <Bug className="w-4 h-4 text-red-400" />
                            <h3 className="font-mono text-sm font-bold text-red-400">
                                Development Error Details
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs font-semibold text-text-muted mb-1">
                                    Error Message:
                                </div>
                                <pre className="text-xs text-red-400 font-mono bg-background p-2 rounded overflow-x-auto">
                                    {error.message}
                                </pre>
                            </div>
                            {error.stack && (
                                <div>
                                    <div className="text-xs font-semibold text-text-muted mb-1">
                                        Stack Trace:
                                    </div>
                                    <pre className="text-xs text-text-secondary font-mono bg-background p-2 rounded overflow-x-auto max-h-[120px]">
                                        {error.stack}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {resetErrorBoundary && (
                        <Button
                            variant="primary"
                            icon={<RefreshCw className="w-4 h-4" />}
                            onClick={resetErrorBoundary}
                        >
                            Try Again
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        icon={<RefreshCw className="w-4 h-4" />}
                        onClick={handleReload}
                    >
                        Reload Page
                    </Button>
                    <Button
                        variant="ghost"
                        icon={<Home className="w-4 h-4" />}
                        onClick={handleGoHome}
                    >
                        Go Home
                    </Button>
                </div>

                {/* Copy Error Button (Development) */}
                {isDevelopment && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={handleCopyError}
                            className="text-xs text-text-muted hover:text-text-secondary underline"
                        >
                            Copy error details to clipboard
                        </button>
                    </div>
                )}

                {/* Help Text */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-text-muted">
                        If this problem persists, try clearing your browser cache or{' '}
                        <a
                            href="mailto:support@cineflex.app"
                            className="text-primary hover:underline"
                        >
                            contact support
                        </a>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ErrorFallback;
