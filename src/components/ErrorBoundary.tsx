import React, { ErrorInfo } from 'react';

/**
 * Check if error is network-related (temporary) vs code-related (permanent)
 */
function isNetworkError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorString = error.toString().toLowerCase();

    // Common network error patterns
    const networkPatterns = [
        'network',
        'fetch',
        'failed to fetch',
        'networkerror',
        'network request failed',
        'load failed',
        'timeout',
        'offline',
        'no internet',
        'connection',
        'unreachable',
        'err_internet_disconnected',
        'err_network_changed'
    ];

    return networkPatterns.some(pattern =>
        errorMessage.includes(pattern) || errorString.includes(pattern)
    );
}

/**
 * Check if browser is currently online
 */
function isOnline(): boolean {
    return navigator.onLine;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    isNetworkError: boolean;
    isOnline: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            isNetworkError: false,
            isOnline: navigator.onLine
        };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error, isNetworkError: isNetworkError(error), isOnline: isOnline() };
    }

    componentDidMount() {
        // Listen for online/offline events
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
    }

    componentWillUnmount() {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
    }

    handleOnline = () => {
        console.log('App is back online');
        this.setState({ isOnline: true });

        // If error was network-related and we're back online, try to recover
        if (this.state.isNetworkError && this.state.hasError) {
            console.log('Network restored - attempting to recover');
            this.setState({ hasError: false, error: null, errorInfo: null, isNetworkError: false });
        }
    };

    handleOffline = () => {
        console.log('App went offline');
        this.setState({ isOnline: false });
    };

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const networkError = isNetworkError(error);

        console.error('ErrorBoundary caught an error:', {
            error,
            errorInfo,
            isNetworkError: networkError,
            isOnline: isOnline()
        });

        // If it's a network error and we're offline, don't show error screen
        // Just let the app continue (changes will be saved locally)
        if (networkError && !isOnline()) {
            console.warn('Network error while offline - app will continue working');
            // Reset the error state so we don't block the UI
            this.setState({ hasError: false, error: null, errorInfo: null, isNetworkError: false });
            return;
        }

        this.setState({
            errorInfo,
            isNetworkError: networkError,
            isOnline: isOnline()
        });
    }

    render() {
        if (this.state.hasError) {
            const { error, isNetworkError, isOnline } = this.state;

            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Network error: Show friendly "You're offline" message
            if (isNetworkError) {
                return (
                    <div className="min-h-screen bg-background flex items-center justify-center p-4">
                        <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center space-y-6">
                            {/* Icon */}
                            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                                </svg>
                            </div>

                            {/* Title */}
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary mb-2">
                                    {isOnline ? 'Connection Issues' : 'You\'re Offline'}
                                </h1>
                                <p className="text-text-secondary text-sm">
                                    {isOnline
                                        ? 'We\'re having trouble connecting to the server. Your work is saved locally.'
                                        : 'No internet connection detected. Your work is saved locally and will sync when you\'re back online.'}
                                </p>
                            </div>

                            {/* Status Indicator */}
                            <div className={`p-3 rounded-lg border ${isOnline
                                ? 'bg-yellow-500/5 border-yellow-500/20'
                                : 'bg-red-500/5 border-red-500/20'
                                }`}>
                                <div className="flex items-center justify-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-yellow-500' : 'bg-red-500'
                                        } animate-pulse`} />
                                    <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                                        {isOnline ? 'Attempting to reconnect...' : 'Offline Mode'}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => this.setState({ hasError: false, error: null, errorInfo: null, isNetworkError: false })}
                                    className="w-full px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-surface-secondary transition-colors text-sm font-medium"
                                >
                                    Continue Working Offline
                                </button>
                            </div>

                            {/* Help Text */}
                            <p className="text-xs text-text-secondary">
                                💡 Tip: Check your internet connection or try again in a few moments
                            </p>
                        </div>
                    </div>
                );
            }

            // Code error: Show technical error details
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="max-w-2xl w-full bg-surface border border-border rounded-lg p-8 space-y-6">
                        {/* Icon */}
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        {/* Title */}
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary mb-2">Something Went Wrong</h1>
                            <p className="text-text-secondary text-sm">
                                CineFlex encountered an unexpected error. This has been logged and will be fixed.
                            </p>
                        </div>

                        {/* Error Details */}
                        <div className="bg-background border border-border rounded-lg p-4 space-y-2">
                            <p className="text-xs font-mono text-red-400">{error?.toString()}</p>
                            {this.state.errorInfo && (
                                <details className="mt-2">
                                    <summary className="text-xs text-text-secondary cursor-pointer hover:text-text-primary">
                                        Show technical details
                                    </summary>
                                    <pre className="mt-2 text-xs text-text-secondary overflow-auto max-h-48 bg-background p-2 rounded">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                            >
                                Reload App
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex-1 px-4 py-2 bg-surface border border-border text-text-primary rounded-lg hover:bg-surface-secondary transition-colors text-sm font-medium"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
