import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Context label for error reporting (e.g., "Wafer Map", "Defect Table") */
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `ErrorBoundary [${this.props.context ?? 'unknown'}] caught:`,
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          {this.props.context && (
            <p className="text-xs font-mono text-muted-foreground">
              Component: {this.props.context}
            </p>
          )}
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {this.state.error?.message}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <a
              href="/"
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              <Home className="h-4 w-4" />
              Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
