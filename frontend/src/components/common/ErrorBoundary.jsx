import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("[Signal Crash]", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-8 text-center font-black">
          <div className="relative group mb-12">
            <div className="absolute inset-0 bg-red-500/20 blur-[100px] animate-pulse rounded-full" />
            <AlertTriangle className="text-red-500 group-hover:scale-110 transition-transform relative z-10" size={120} strokeWidth={1.5} />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500 text-black px-6 py-1 tracking-[0.5em] text-[10px] skew-x-[-20deg]">SIGNAL_LOST // DECODING_ERR</div>
          </div>
          <h1 className="text-4xl lg:text-6xl text-white uppercase tracking-tighter mb-4 max-w-2xl px-4">Neural Buffer Overload</h1>
          <p className="text-brand-text-dim text-lg mb-12 max-w-xl uppercase tracking-widest font-mono opacity-50">
            Internal decrypt signal failed. The dashboard has encountered a critical parity error.
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-10 py-5 bg-white text-black text-sm uppercase tracking-[0.5em] hover:bg-brand-accent transition-all flex items-center gap-4 group"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" /> Reboot Interface
            </button>
            <div className="text-[10px] font-mono text-red-500/50 uppercase tracking-tighter">ERROR: {this.state.error?.message || "UNDEFINED_FRAGMENT"}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
