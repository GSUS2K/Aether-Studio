import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Music } from 'lucide-react';

export const SecondaryNowPlayingStrip = memo(function SecondaryNowPlayingStrip({
  currentTrack,
  isPlaying,
  getProxyUrl,
  className = '',
}) {
  const title = currentTrack?.title || '';
  const artist = currentTrack?.author || currentTrack?.artist || '';
  const thumbnail = currentTrack?.thumbnail || currentTrack?.artwork || '';
  const imageSrc = thumbnail && getProxyUrl ? getProxyUrl(thumbnail) : thumbnail;

  return (
    <div className={`min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.22)] ${className}`}>
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 text-brand-accent">
        {imageSrc ? (
          <img src={imageSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Music size={14} />
        )}
        <span className={`absolute bottom-1 right-1 h-2 w-2 rounded-full border border-black/70 ${isPlaying ? 'animate-pulse bg-brand-accent' : 'bg-white/35'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[7px] font-black uppercase tracking-[0.18em] text-brand-accent/70">{isPlaying ? 'Playing' : title ? 'Paused' : 'Now'}</span>
          <span className="h-px flex-1 bg-white/8" />
        </div>
        <div className="mt-0.5 truncate text-[11px] font-black uppercase tracking-tight text-white/82">
          {title || 'Nothing playing'}
        </div>
        <div className="truncate text-[8px] font-bold uppercase tracking-[0.14em] text-white/38">
          {artist || (title ? 'Unknown artist' : 'Queue a track to see it here')}
        </div>
      </div>
    </div>
  );
});

export const HealthMetricCard = memo(function HealthMetricCard({ label, value, tone = 'neutral', title = '' }) {
  const toneClass = tone === 'good'
    ? 'border-brand-accent/22 bg-brand-accent/[0.06] text-brand-accent'
    : tone === 'warn'
      ? 'border-amber-300/18 bg-amber-400/[0.055] text-amber-100/85'
      : tone === 'danger'
        ? 'border-red-400/18 bg-red-500/[0.055] text-red-200/85'
        : 'border-white/8 bg-black/22 text-white/78';

  return (
    <div className={`rounded-2xl border p-3 text-center ${toneClass}`} title={title || label}>
      <div className="text-lg font-black">{Number(value || 0).toLocaleString()}</div>
      <div className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/36">{label}</div>
    </div>
  );
});

export const ShortcutHint = memo(function ShortcutHint({ label, className = '', title = '', visible = true }) {
  if (!label || !visible) return null;
  return (
    <kbd
      className={`inline-flex h-6 items-center rounded-lg border border-white/10 bg-black/24 px-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/42 shadow-inner shadow-white/[0.02] ${className}`}
      title={title || label}
    >
      {label}
    </kbd>
  );
});

export const AetherConfirmDialog = memo(function AetherConfirmDialog({ request, onCancel, onConfirm }) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setDontAskAgain(false));
    return () => window.cancelAnimationFrame(id);
  }, [request?.preferenceKey]);

  useEffect(() => {
    if (!request) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      onCancel?.();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel, request]);

  if (!request || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="aether-destructive-confirm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[520] flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <div className="absolute inset-0 bg-black/82 backdrop-blur-xl" />
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.75rem] border border-red-400/25 bg-[#080c10]/96 shadow-[0_28px_90px_rgba(0,0,0,0.65)]"
          onClick={(event) => event.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="aether-confirm-title"
          aria-describedby="aether-confirm-message"
        >
          <div className="border-b border-white/10 bg-red-500/[0.045] px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/10 text-red-200">
                <AlertTriangle size={19} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-red-200/65">Confirm Change</div>
                <div id="aether-confirm-title" className="mt-1 text-xl font-black uppercase tracking-tight text-white">{request.title || 'Confirm action?'}</div>
              </div>
            </div>
          </div>
          <div className="px-5 py-5">
            <div id="aether-confirm-message" className="text-sm leading-6 text-white/68">{request.message}</div>
            {request.detail && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs leading-5 text-white/45">{request.detail}</div>
            )}
            {request.allowDontAskAgain && request.preferenceKey && (
              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold text-white/55 transition-colors hover:border-brand-accent/25 hover:text-white/72">
                <input
                  type="checkbox"
                  checked={dontAskAgain}
                  onChange={(event) => setDontAskAgain(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40 accent-brand-accent"
                />
                <span>Don&apos;t ask again for this action</span>
              </label>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-black/20 px-5 py-4">
            <button
              type="button"
              onClick={onCancel}
              autoFocus
              className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/68 transition-all hover:border-brand-accent/35 hover:text-brand-accent"
            >
              {request.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => onConfirm?.(dontAskAgain)}
              className="rounded-xl border border-red-300/45 bg-red-500/18 px-4 py-2 text-sm font-black text-red-100 transition-all hover:bg-red-400 hover:text-black"
            >
              {request.confirmLabel || 'Confirm'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
});
