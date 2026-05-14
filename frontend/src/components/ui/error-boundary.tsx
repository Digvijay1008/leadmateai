'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to monitoring service in production
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-12 text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-500 max-w-md mb-2">
            {this.state.error?.message ?? 'An unexpected error occurred in this section.'}
          </p>
          <p className="text-xs text-slate-400 mb-8 font-mono max-w-md truncate">
            {this.state.error?.name}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 bg-primary hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
