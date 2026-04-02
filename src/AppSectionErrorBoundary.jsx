/**
 * Error boundary for the large page sections rendered from App.jsx.
 * Keeps the outer shell usable if Overview or Collection crashes.
 * `resetKey` lets us clear the fallback automatically when context changes.
 */
import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export class AppSectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AppSectionErrorBoundary] Section crashed:', error, errorInfo);
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  renderFallback() {
    const {
      title = 'Khu vực này đang gặp lỗi',
      description = 'Phần còn lại của app vẫn hoạt động. Hãy thử lại hoặc đổi tab để tải lại khu vực này.',
      className = '',
      fallbackMessage,
    } = this.props;
    const { error, errorInfo } = this.state;
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    const stack = errorInfo?.componentStack?.trim();

    return (
      <section
        role="alert"
        aria-live="assertive"
        className={`rounded-[var(--tt-r-panel,1.75rem)] border border-rose-900/40 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950 p-6 md:p-8 ${className}`}
        style={{ boxShadow: 'var(--tt-shadow-panel)' }}
      >
        <div className="flex flex-col gap-5 max-w-3xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-900/40 bg-rose-950/40 text-rose-300">
              <AlertTriangle size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-heading font-bold text-rose-100">{title}</h2>
              <p className="mt-1 text-sm text-slate-300">{fallbackMessage || description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={this.resetErrorBoundary}
              className="tt-kbd-focus inline-flex items-center gap-2 rounded-xl border border-amber-700/50 bg-amber-700/15 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-700/25"
            >
              <RotateCcw size={16} />
              Thử lại phần này
            </button>
            <span className="text-xs uppercase tracking-widest text-slate-500">
              App vẫn có thể tiếp tục dùng
            </span>
          </div>

          <details className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-400">
              Chi tiết lỗi
            </summary>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              <p className="break-words font-mono text-rose-200/90">{errorMessage}</p>
              {stack && (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-400">
                  {stack}
                </pre>
              )}
            </div>
          </details>
        </div>
      </section>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}
