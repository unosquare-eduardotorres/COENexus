import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen gradient-subtle glass-gradient-bg p-6 flex items-center justify-center">
        <div className="glass-panel max-w-2xl w-full rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-primary mb-3">Something went wrong</h1>
          <p className="text-secondary mb-6">
            {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <button type="button" onClick={this.handleRetry} className="glass-button px-4 py-2 text-primary font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }
}
