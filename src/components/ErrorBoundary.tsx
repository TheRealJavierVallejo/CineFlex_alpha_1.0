import React from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
        this.setState({ errorInfo });

        // TODO: Send to error tracking service (Sentry)
        // Sentry.captureException(error, { extra: errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleClearAndReload = () => {
        // eslint-disable-next-line no-restricted-globals
        if (confirm('This will clear all local data. Continue?')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '2rem',
                    textAlign: 'center',
                    backgroundColor: '#f5f5f5',
                    color: '#1a202c' // Ensure text is visible on light bg
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#e53e3e' }}>
                        Something went wrong
                    </h1>
                    <p style={{ marginBottom: '2rem', color: '#4a5568', maxWidth: '500px' }}>
                        CineFlex encountered an unexpected error. Try reloading the app.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                backgroundColor: '#3182ce',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer'
                            }}
                        >
                            Reload App
                        </button>

                        <button
                            onClick={this.handleClearAndReload}
                            style={{
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                backgroundColor: '#718096',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer'
                            }}
                        >
                            Clear Cache & Reload
                        </button>
                    </div>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '600px', width: '100%' }}>
                            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem', color: '#2d3748' }}>
                                Error Details (Dev Only)
                            </summary>
                            <pre style={{
                                backgroundColor: '#2d3748',
                                color: '#f7fafc',
                                padding: '1rem',
                                borderRadius: '0.375rem',
                                overflow: 'auto',
                                fontSize: '0.875rem',
                                maxHeight: '400px'
                            }}>
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
