import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorFallback from './ui/ErrorFallback';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

// Note: React 19 ErrorBoundary must be a class component
// Using explicit type annotations to work around TypeScript inference issues
class ErrorBoundary extends Component<Props, State> {
    // Explicitly declare state to avoid TS inference issues with React 19
    public readonly state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
        this.props.onError?.(error, errorInfo);
    }

    private handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    public render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallback
                    error={this.state.error!}
                    errorInfo={this.state.errorInfo || undefined}
                    resetErrorBoundary={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
