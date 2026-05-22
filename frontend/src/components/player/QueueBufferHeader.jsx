import { createPortal } from 'react-dom';
import { HardDrive, ListMusic, Maximize2, RefreshCw, Save, Shuffle, Zap } from 'lucide-react';
import { AUTOPLAY_MOOD_MODES } from '../../config/aetherConfig';

export function QueueBufferHeader({
  panelHeaderClass,
  queue,
  openLibraryOverlay,
  setIsViewingFullQueue,
  setQueue,
  cleanQueueBuffer,
  playDownloadedOnly,
  isAutoplayEnabled,
  setIsAutoplayEnabled,
  autoplayMoodMode,
  setAutoplayMoodMode,
  isAutoplayMenuOpen,
  setIsAutoplayMenuOpen,
  isOfflineMode,
  autoplayMenuButtonRef,
  autoplayMenuStyle,
  setLastAdded,
}) {
  const queueCount = Math.max(0, queue.length - 1);
  const iconButtonClass = 'flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/50 transition-all hover:bg-brand-accent/20 hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div className={`flex items-center justify-between gap-2 border-b border-white/5 p-3 ${panelHeaderClass}`}>
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <ListMusic size={18} className="shrink-0 text-brand-accent" />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 min-[1280px]:gap-3">
          <button
            onClick={() => { if (queue.length > 0) openLibraryOverlay({ type: 'queue', items: queue.slice() }); }}
            className={iconButtonClass}
            title="Save queue to vault"
          >
            <Save size={10} />
          </button>
          <button
            onClick={() => setIsViewingFullQueue(true)}
            className={iconButtonClass}
            title="View full queue"
          >
            <Maximize2 size={10} />
          </button>
          <button
            onClick={() => {
              if (queue.length > 1) {
                console.log("[Aether/Shuffle] Shuffling buffer...");
                setQueue(prev => {
                  if (!Array.isArray(prev) || prev.length <= 1) return prev;
                  const current = prev[0];
                  const rest = [...prev.slice(1)].sort(() => Math.random() - 0.5);
                  return [current, ...rest];
                });
              }
            }}
            className={iconButtonClass}
            title="Shuffle queue buffer"
          >
            <Shuffle size={10} />
          </button>
          <button
            onClick={cleanQueueBuffer}
            disabled={queue.length <= 1}
            className={iconButtonClass}
            title="Clean queue: remove duplicate upcoming tracks"
          >
            <RefreshCw size={10} />
          </button>
          <button
            onClick={playDownloadedOnly}
            disabled={queue.length === 0}
            className={iconButtonClass}
            title="Play downloaded only"
          >
            <HardDrive size={10} />
          </button>
          <div className="relative shrink-0">
            <button
              ref={autoplayMenuButtonRef}
              onClick={(event) => {
                event.stopPropagation();
                if (isOfflineMode) return;
                setIsAutoplayMenuOpen(prev => !prev);
              }}
              disabled={isOfflineMode}
              className={`flex shrink-0 items-center gap-2 rounded-lg border p-1.5 transition-all ${isAutoplayEnabled ? 'border-brand-accent/30 bg-brand-accent/20 text-brand-accent shadow-neon' : 'border-white/10 bg-white/5 text-white/30 opacity-70'} ${isOfflineMode ? 'cursor-not-allowed opacity-30' : 'hover:bg-brand-accent/10 hover:text-brand-accent'}`}
              title={isOfflineMode ? 'Autoplay needs Online Mode' : 'Neural Autoplay Mode'}
            >
              <Zap size={10} className={isAutoplayEnabled ? 'animate-pulse' : ''} />
              <span className="whitespace-nowrap text-[8px] font-black uppercase tracking-tighter">{isAutoplayEnabled ? 'AUTO_ON' : 'AUTO_OFF'}</span>
              <span className="hidden whitespace-nowrap text-[8px] font-black uppercase tracking-tighter opacity-80 min-[1180px]:inline">{autoplayMoodMode}</span>
            </button>

            {isAutoplayMenuOpen && createPortal(
              <div
                className="fixed z-[560] w-56 rounded-xl border border-white/15 bg-[#0b0f14]/98 p-2 shadow-[0_18px_54px_rgba(0,0,0,0.58)] backdrop-blur-xl"
                style={autoplayMenuStyle}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setIsAutoplayEnabled(prev => !prev);
                    setIsAutoplayMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${isAutoplayEnabled ? 'text-brand-accent bg-brand-accent/10' : 'text-white/70 hover:text-brand-accent hover:bg-white/5'}`}
                >
                  {isAutoplayEnabled ? 'Disable Autoplay' : 'Enable Autoplay'}
                </button>
                <div className="my-1 border-t border-white/10" />
                {AUTOPLAY_MOOD_MODES.map((mode) => (
                  <button
                    key={`autoplay-mode-${mode.id}`}
                    onClick={() => {
                      setAutoplayMoodMode(mode.id);
                      setIsAutoplayMenuOpen(false);
                      setLastAdded(`Autoplay mood • ${mode.label}`);
                      setTimeout(() => setLastAdded(null), 1500);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${autoplayMoodMode === mode.id ? 'text-brand-accent bg-brand-accent/10' : 'text-white/70 hover:text-brand-accent hover:bg-white/5'}`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>,
              document.body,
            )}
          </div>
          <span className="shrink-0 rounded-full bg-brand-accent/10 px-2 py-0.5 text-[10px] font-mono font-black text-brand-accent">{queueCount}</span>
      </div>
    </div>
  );
}
