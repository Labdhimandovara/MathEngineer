/**
 * Global Application Error Boundary
 * 
 * Catches unhandled React component tree exceptions to prevent blank-screen crashes.
 * Displays a calm, recoverable fallback UI while preserving application state and navigation.
 * Never exposes sensitive secrets, tokens, or raw payloads.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * Sanitizes error messages to prevent leaking API keys or sensitive data in UI
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return 'An unexpected error occurred.';
  return message
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/data:image\/[a-zA-Z]+;base64,[^"\s]+/g, '[IMAGE_BASE64_DATA]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
}

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Safe client-side logging without secrets
    console.error(
      '[AppErrorBoundary] Uncaught rendering exception:',
      sanitizeErrorMessage(error?.message || 'Unknown error'),
      errorInfo?.componentStack
    );
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleGoHome = () => {
    this.handleReset();
    window.location.hash = '';
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = Boolean(
        typeof import.meta !== 'undefined' &&
          (import.meta as any).env &&
          (import.meta as any).env.DEV
      );

      const safeMessage = sanitizeErrorMessage(
        this.state.error?.message || 'MathEngineer encountered an unexpected error.'
      );

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-bg-primary text-charcoal flex flex-col items-center justify-center p-6 animate-fadeIn font-sans"
        >
          <div className="max-w-lg w-full bg-bg-surface border border-border-soft rounded-me-lg shadow-card p-6 sm:p-8 space-y-6 text-center">
            {/* Visual Icon */}
            <div className="w-12 h-12 rounded-full bg-status-error-bg text-status-error flex items-center justify-center mx-auto border border-status-error/30">
              <AlertTriangle className="w-6 h-6" />
            </div>

            {/* Headline and Description */}
            <div className="space-y-2">
              <h1 className="text-xl font-serif font-bold text-charcoal tracking-tight">
                Something went wrong
              </h1>
              <p className="text-xs text-charcoal-muted leading-relaxed max-w-sm mx-auto">
                MathEngineer encountered an unexpected display issue. Your underlying numerical progress and course data remain safe.
              </p>
            </div>

            {/* Sanitized Summary */}
            <div className="p-3.5 bg-bg-primary/80 border border-border-soft rounded-me text-left text-xs space-y-1">
              <span className="font-semibold text-charcoal text-[11px] uppercase tracking-wider block">
                Notice
              </span>
              <p className="text-charcoal-muted font-mono text-[11px] break-words">
                {safeMessage}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-lavender-deep hover:bg-lavender-deep/90 text-white rounded-me text-xs font-semibold shadow-subtle transition-calm focus-ring"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-bg-surface border border-border-soft hover:bg-bg-primary text-charcoal rounded-me text-xs font-semibold transition-calm focus-ring"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Home</span>
              </button>
            </div>

            {/* Technical details in development mode only */}
            {isDev && this.state.errorInfo && (
              <div className="pt-4 border-t border-border-soft text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center justify-between w-full text-[11px] text-charcoal-muted hover:text-charcoal transition-calm"
                >
                  <span>Development Diagnostics</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {this.state.showDetails && (
                  <pre className="mt-2 p-3 bg-black/90 text-status-warning rounded text-[10px] overflow-x-auto max-h-48 leading-relaxed font-mono">
                    {sanitizeErrorMessage(this.state.error?.stack || '')}
                    {'\n\nComponent Stack:\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
