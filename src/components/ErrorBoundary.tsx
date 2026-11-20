import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    isPermissionError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    let parsedMessage = error.message || 'An unexpected error occurred.';
    let isPermissionError = false;

    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        parsedMessage = `${parsed.operationType?.toUpperCase() || 'OPERATION'} on ${parsed.path || 'database'}: ${parsed.error}`;
        isPermissionError = parsed.error.toLowerCase().includes('permission');
      }
    } catch {
      isPermissionError = parsedMessage.toLowerCase().includes('permission');
    }

    return {
      hasError: true,
      errorMessage: parsedMessage,
      isPermissionError,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-xl font-bold text-slate-900">
                {this.state.isPermissionError ? 'Access Permission Issue' : 'Something went wrong'}
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {this.state.isPermissionError
                ? 'Your request could not be completed due to Firestore security rules. Please verify your sign-in status or mess permissions.'
                : 'Mess Fix encountered an unexpected error while syncing data.'}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 break-words mb-6">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Mess Fix
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
