import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './ui/Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-app flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-app-panel border border-border rounded-md p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-status-error mx-auto mb-4" />
                        <h1 className="text-xl font-semibold text-text-primary mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-sm text-text-secondary mb-4">
                            We're sorry, but something unexpected happened. Please try refreshing the page.
                        </p>
                        {this.state.error && (
                            <details className="text-left mb-4">
                                <summary className="text-sm text-text-muted cursor-pointer hover:text-text-secondary">
                                    Error details
                                </summary>
                                <pre className="mt-2 p-2 bg-app rounded text-xs text-status-error overflow-auto selectable">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                        <div className="flex gap-2 justify-center">
                            <Button variant="primary" onClick={this.handleReset}>
                                Try Again
                            </Button>
                            <Button variant="secondary" onClick={() => window.location.reload()}>
                                Refresh Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
