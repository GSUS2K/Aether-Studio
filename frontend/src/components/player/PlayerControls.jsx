import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Clapperboard, Columns2, Download, ExternalLink, Eye, FastForward, Heart, ListMusic, Music, Pause, Play, Plus, Repeat, Rewind, Target, Trash2 } from 'lucide-react';
import { ShortcutHint } from '../common/AetherUi';
import { formatTime } from '../../utils/format';
import { clamp01 } from '../../utils/visualMath';

export const PlaybackProgressIsland = memo(function PlaybackProgressIsland({
  durationMs,
  getPositionMs,
  onSeek,
  accent,
  glow,
  barClassName = 'h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/10',
  fillClassName = 'h-full rounded-full',
  timeRowClassName = 'flex items-center justify-between gap-3 text-[10px] font-mono text-white/42',
  durationLabel,
  middleContent = null,
}) {
  const fillRef = useRef(null);
  const [timeLabel, setTimeLabel] = useState('0:00');
  const safeDurationMs = Math.max(0, Number(durationMs) || 0);

  useEffect(() => {
    let raf = 0;
    let lastLabelAt = 0;
    let lastLabel = '';

    const update = (now) => {
      if (typeof document !== 'undefined' && document.hidden) {
        raf = requestAnimationFrame(update);
        return;
      }
      const liveMs = Math.max(0, Math.floor(Number(getPositionMs?.() || 0)));
      const pct = safeDurationMs > 0 ? clamp01(liveMs / safeDurationMs) : 0;
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${pct})`;
      }

      if (now - lastLabelAt > 250) {
        const nextLabel = formatTime(liveMs);
        if (nextLabel !== lastLabel) {
          lastLabel = nextLabel;
          setTimeLabel(nextLabel);
        }
        lastLabelAt = now;
      }

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [getPositionMs, safeDurationMs]);

  const seekFromPointer = useCallback((event) => {
    if (safeDurationMs <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pos = clamp01((event.clientX - rect.left) / Math.max(rect.width, 1));
    onSeek(pos * safeDurationMs);
  }, [onSeek, safeDurationMs]);

  return (
    <div className="space-y-2">
      <div className={barClassName} onClick={seekFromPointer}>
        <div
          ref={fillRef}
          className={fillClassName}
          style={{
            background: accent,
            boxShadow: glow ? `0 0 14px ${glow}` : undefined,
            transform: 'scaleX(0)',
            transformOrigin: 'left center',
            willChange: 'transform',
          }}
        />
      </div>
      <div className={timeRowClassName}>
        <span>{timeLabel}</span>
        {middleContent}
        <span>{durationLabel || formatTime(safeDurationMs)}</span>
      </div>
    </div>
  );
});

export const PlayerModePill = memo(function PlayerModePill({ videoMode, switchVideoMode, variant = 'main', isOfflineMode = false }) {
  const isCompact = variant === 'dual';
  const activeClass = 'bg-brand-accent text-black shadow-[0_0_12px_rgba(0,255,191,0.34)]';
  const inactiveClass = isCompact ? 'text-white/45 hover:text-white' : 'text-white/40 hover:text-white';
  const buttonClass = isCompact
    ? 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] transition-all'
    : 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all';
  const wrapClass = isCompact
    ? 'flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1'
    : 'flex items-center bg-white/[0.04] border border-white/10 rounded-2xl p-1 gap-1';
  const iconSize = isCompact ? 10 : 11;

  return (
    <div className={wrapClass}>
      <button onClick={() => switchVideoMode(null)} className={`${buttonClass} ${videoMode === null ? activeClass : inactiveClass}`}>
        <Music size={iconSize} /> Audio
      </button>
      <button disabled={isOfflineMode} onClick={() => switchVideoMode('dual')} className={`${buttonClass} ${videoMode === 'dual' ? activeClass : inactiveClass} ${isOfflineMode ? 'opacity-30 cursor-not-allowed' : ''}`} title={isOfflineMode ? 'Dual view needs Online Mode' : 'Dual view'}>
        <Columns2 size={iconSize} /> Dual
      </button>
      <button disabled={isOfflineMode} onClick={() => switchVideoMode('cinema')} className={`${buttonClass} ${videoMode === 'cinema' ? activeClass : inactiveClass} ${isOfflineMode ? 'opacity-30 cursor-not-allowed' : ''}`} title={isOfflineMode ? 'Cinema needs Online Mode' : 'Cinema'}>
        <Clapperboard size={iconSize} /> Cinema
      </button>
    </div>
  );
});

export const PlayerTransportControls = memo(function PlayerTransportControls({
  handleControl,
  isPlaying,
  isAuraMode,
  playButtonRef,
  beatRingsRef,
  trackControlAccent,
  trackControlGlow,
  playPauseShortcutLabel = '',
  showShortcutHints = false,
}) {
  return (
    <div className="flex items-center justify-center w-full mt-2 relative">
      <div className={`flex items-center backdrop-blur-3xl border p-2 rounded-3xl gap-4 relative z-10 ${isAuraMode ? 'bg-white/[0.04] border-white/[0.16] shadow-[0_12px_40px_rgba(0,0,0,0.22)]' : 'bg-white/5 border-white/5'}`}>
        <button onClick={() => handleControl('previous')} className="p-3 hover:text-brand-accent transition-colors active:scale-90"><Rewind size={22} fill="currentColor" /></button>
        <button
          ref={playButtonRef}
          onClick={() => handleControl(isPlaying ? 'pause' : 'resume')}
          className="w-16 h-16 text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
          style={{ background: trackControlAccent, boxShadow: `0 0 32px ${trackControlGlow}` }}
        >
          {isAuraMode && <div ref={beatRingsRef} className="absolute inset-0" />}
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          <ShortcutHint label={playPauseShortcutLabel} className="pointer-events-none absolute -bottom-2 left-1/2 hidden -translate-x-1/2 bg-black/42 text-[8px] text-white/55 md:inline-flex" title="Play / Pause shortcut" visible={showShortcutHints} />
        </button>
        <button onClick={() => handleControl('skip')} className="p-3 hover:text-brand-accent transition-colors active:scale-90"><FastForward size={22} fill="currentColor" /></button>
      </div>
    </div>
  );
});

export const PlayerActionButtons = memo(function PlayerActionButtons({
  canDownloadCurrentTrack,
  canOpenCurrentSource,
  currentTrack,
  currentTrackSourceUrl,
  cycleRepeatMode,
  handleControl,
  handleDownloadCurrentTrack,
  isCurrentTrackFavorite,
  isDownloadingTrack,
  isFocusedMode,
  openLibraryOverlay,
  openTrackInspect,
  queueLength,
  repeatMode,
  repeatModeBadge,
  repeatModeLabel,
  setIsFocusedMode,
  setIsPlayerOverlayOpen,
  toggleFavoriteTrack,
}) {
  return (
    <div className="flex items-center gap-1 no-drag ml-auto">
      <button disabled={queueLength === 0} onClick={() => handleControl('clear')} className="p-2 text-white/20 hover:text-red-500 transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title="Clear Queue"><Trash2 size={14} /></button>
      <button onClick={cycleRepeatMode} className={`relative p-2 transition-colors ${repeatMode === 'off' ? 'text-white/20 hover:text-brand-accent' : 'text-brand-accent'}`} title={repeatModeLabel}>
        <Repeat size={14} />
        {repeatModeBadge && <span className="absolute right-0 top-0 text-[8px] font-black">{repeatModeBadge}</span>}
      </button>
      <button onClick={() => {
        if (!canOpenCurrentSource) return;
        window.aether?.openExternal(currentTrackSourceUrl);
      }} disabled={!canOpenCurrentSource} className="p-2 text-white/20 hover:text-brand-accent transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title="Open Source"><ExternalLink size={14} /></button>
      <button onClick={handleDownloadCurrentTrack} disabled={!canDownloadCurrentTrack || isDownloadingTrack} className="p-2 text-white/20 hover:text-brand-accent transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title={isDownloadingTrack ? 'Exporting...' : 'Export Audio to File'}><Download size={14} className={isDownloadingTrack ? 'animate-pulse' : ''} /></button>
      <button onClick={() => toggleFavoriteTrack(currentTrack)} disabled={!currentTrack} className={`p-2 transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${isCurrentTrackFavorite ? 'text-rose-300' : 'text-white/20 hover:text-rose-300'}`} title={isCurrentTrackFavorite ? 'Remove from Favorites' : 'Add to Favorites'}><Heart size={14} fill={isCurrentTrackFavorite ? 'currentColor' : 'none'} /></button>
      <button onClick={() => openLibraryOverlay({ type: 'track', items: [currentTrack] })} className="p-2 text-white/20 hover:text-brand-accent transition-colors" title="Save to Library Overlay"><Plus size={14} /></button>
      <button onClick={() => openTrackInspect(currentTrack, 'now-playing')} className="p-2 text-white/20 hover:text-brand-accent transition-colors" title="Inspect Track"><Eye size={14} /></button>
      <div className="w-px h-3 bg-white/10 mx-1" />
      <button onClick={() => setIsPlayerOverlayOpen(true)} className="p-2 text-white/40 hover:text-brand-accent transition-colors" title="Open Player Overlay"><ListMusic size={16} /></button>
      <button onClick={() => setIsFocusedMode(!isFocusedMode)} className={`p-2 transition-colors ${isFocusedMode ? 'text-brand-accent' : 'text-white/40 hover:text-brand-accent'}`} title="Toggle Focus Mode"><Target size={16} /></button>
    </div>
  );
});

export const LyricLineIsland = memo(function LyricLineIsland({
  bucket,
  index,
  isActive,
  isDualWorkspaceMode,
  line,
  onSeek,
  setActiveRef,
}) {
  let lyricLineClass = '';
  if (isDualWorkspaceMode) {
    lyricLineClass = 'max-w-[min(92%,760px)] px-3 md:px-5 text-2xl sm:text-3xl lg:text-5xl font-black leading-tight w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere] transition-[transform,opacity,filter,color,text-shadow] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu origin-center will-change-[transform,opacity,filter]';
    if (bucket === 'active') lyricLineClass += ' text-brand-accent scale-[1.06] opacity-100 drop-shadow-[0_0_24px_rgba(0,255,191,0.34)]';
    else if (bucket === 'near') lyricLineClass += ' text-white/52 opacity-68 scale-[1.02]';
    else if (bucket === 'mid') lyricLineClass += ' text-white/30 opacity-34 scale-100 blur-[0.45px]';
    else lyricLineClass += ' text-white/18 opacity-18 scale-[0.985] blur-[0.85px]';
  } else {
    lyricLineClass = 'text-base sm:text-lg lg:text-xl font-bold transition-[transform,opacity,filter,color,text-shadow] duration-380 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu leading-snug py-1.5 relative will-change-[transform,opacity,filter]';
    if (bucket === 'active') lyricLineClass += ' text-brand-accent scale-[1.035] opacity-100 drop-shadow-[0_0_12px_rgba(0,255,191,0.34)]';
    else if (bucket === 'near') lyricLineClass += ' text-white/78 opacity-92';
    else if (bucket === 'mid') lyricLineClass += ' text-white/48 opacity-68 blur-[0.25px]';
    else lyricLineClass += ' text-white/30 opacity-48 blur-[0.7px]';
  }

  const delay = bucket === 'active' ? 0 : bucket === 'near' ? 18 : bucket === 'mid' ? 36 : 54;
  return (
    <div
      ref={isActive ? setActiveRef : null}
      className={`${lyricLineClass} cursor-pointer hover:!opacity-90 hover:!text-white/75 hover:!scale-[1.015] hover:-translate-y-[1px] transition-all`}
      onClick={() => onSeek(line.time)}
      style={isDualWorkspaceMode ? { textWrap: 'balance', transitionDelay: `${delay}ms` } : { transitionDelay: `${Math.min(delay, 42)}ms` }}
    >
      {line.text}
    </div>
  );
}, (prev, next) => (
  prev.bucket === next.bucket
  && prev.index === next.index
  && prev.isActive === next.isActive
  && prev.isDualWorkspaceMode === next.isDualWorkspaceMode
  && prev.line === next.line
  && prev.onSeek === next.onSeek
  && prev.setActiveRef === next.setActiveRef
));
