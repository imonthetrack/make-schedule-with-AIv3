import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Rest Guard ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('jadwal_mvp_schedule_v1');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Tampilan Mengalami Kendala
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Terjadi kesalahan rendering pada komponen visual. Klik tombol di bawah untuk memuat ulang aplikasi dengan aman.
            </p>
            {this.state.error && (
              <div className="bg-slate-950 text-amber-300 font-mono text-[11px] p-3 rounded-lg text-left overflow-x-auto border border-slate-800">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
