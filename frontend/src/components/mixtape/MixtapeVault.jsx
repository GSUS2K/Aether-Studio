import { memo } from 'react';
import { Link2, Pause, Play, Volume2 } from 'lucide-react';

const getAssetUrl = (assetPath) => `${import.meta.env.BASE_URL || '/'}${assetPath}`;

// --- Memoized Mixtape subcomponents to reduce App re-renders ---
const MixtapeLeft = memo(function MixtapeLeft({ cassetteSide, mixtapePulse, mixtapePulseReadout, mixtapeSpectrum, clamp01, isPlaying }) {
  const isSideB = cassetteSide === 'B';

  const renderVisualizer = () => {
    const numBars = 48;
    return (
      <div className="absolute flex items-end justify-center gap-[2px] lg:gap-[3px] overflow-hidden pointer-events-none z-20 px-1" style={{
        left: '15%', right: '15%', bottom: '33.25%', height: '10%', borderRadius: '2px'
      }}>
        {Array.from({ length: numBars }).map((_, i) => {
          let val = 0;
          if (isPlaying && mixtapeSpectrum && mixtapeSpectrum.length > 0) {
            // With 48 bars sampled logarithmically, we map directly 1:1
            const binIdx = Math.min(i, mixtapeSpectrum.length - 1);
            let rawVal = mixtapeSpectrum[binIdx] || 0;

            // Use pure raw value to prevent flat ceilings (blocks) from artificial boosting
            val = clamp01(rawVal);
          }

          // Ensure a minimum height and snappier reactive scale
          const scaleY = isPlaying ? clamp01(0.08 + val * 0.92) : 0.08;
          const isActive = isPlaying && val > 0.15;

          return (
            <div key={i} className="flex-1 rounded-[1px] origin-bottom transition-transform duration-[60ms] ease-out"
              style={{
                height: '100%',
                transform: `scaleY(${scaleY})`,
                opacity: isActive ? 0.9 : 0.4,
                background: 'var(--neon-mint)',
                boxShadow: isActive ? `0 0 12px rgba(22,247,198, ${0.4 + val * 0.5})` : 'none'
              }} />
          );
        })}
      </div>
    );
  };

  return (
    <div className="vault-panel px-6 pb-6 pt-10 lg:px-8 lg:pb-8 lg:pt-14 flex flex-col justify-between relative overflow-hidden h-full min-w-0">
      <div className="flex-1 flex items-center justify-center w-full relative perspective-[1200px] mb-6 min-h-0">

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          {/* Subtle ambient lighting removed, using pure cassette-glow */}
        </div>

        <div className="relative z-10 w-full max-w-[420px] 2xl:max-w-[540px] mx-auto">
          <div className="w-full relative transition-transform duration-[1.2s] ease-[cubic-bezier(0.2,0.8,0.2,1)]" style={{ transformStyle: 'preserve-3d', transform: isSideB ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

            <div className="w-full relative" style={{ backfaceVisibility: 'hidden' }}>
              <img src={getAssetUrl('cassette_a.png')} className="w-full h-auto block cassette-glow" alt="Cassette Side A" />
              {renderVisualizer()}
            </div>

            <div className="absolute inset-0 w-full h-full" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <img src={getAssetUrl('cassette_b.png')} className="w-full h-full object-contain block cassette-glow" alt="Cassette Side B" />
              {renderVisualizer()}
            </div>

          </div>
        </div>
      </div>

      <div className="text-center mb-6 shrink-0 relative z-20">
        <div className="flex items-center justify-center gap-6 mb-1">
          <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-[#0A8F78]"></div>
          <div className="text-[14px] font-black uppercase tracking-[0.3em] analog-text">Analog Session</div>
          <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-[#0A8F78]"></div>
        </div>
        <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">Side {cassetteSide} Active</div>
      </div>

      <div className="grid grid-cols-3 gap-3 shrink-0 relative z-20">
        <div className="rounded-2xl bg-black/40 border border-white/5 p-3 lg:p-4 text-center">
          <div className="text-[8px] lg:text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1 lg:mb-2">Bass</div>
          <div className="font-mono text-[18px] lg:text-[20px] font-black" style={{ color: 'var(--neon-mint)', textShadow: '0 0 10px rgba(22,247,198,0.5)' }}>{Math.round(clamp01(mixtapePulse.bass) * 100)}</div>
        </div>
        <div className="rounded-2xl bg-black/40 border border-white/5 p-3 lg:p-4 text-center">
          <div className="text-[8px] lg:text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1 lg:mb-2">Mids</div>
          <div className="font-mono text-[18px] lg:text-[20px] font-black" style={{ color: 'var(--neon-mint)', textShadow: '0 0 10px rgba(22,247,198,0.5)' }}>{Math.round(clamp01(mixtapePulse.mids) * 100)}</div>
        </div>
        <div className="rounded-2xl bg-black/40 border border-white/5 p-3 lg:p-4 text-center">
          <div className="text-[8px] lg:text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1 lg:mb-2">Highs</div>
          <div className="font-mono text-[18px] lg:text-[20px] font-black" style={{ color: 'var(--neon-mint)', textShadow: '0 0 10px rgba(22,247,198,0.5)' }}>{Math.round(clamp01(mixtapePulse.highs) * 100)}</div>
        </div>
      </div>
    </div>
  );
});

const MixtapeRight = memo(function MixtapeRight({ currentTrack, isPlaying, handleControl, mixtapePositionMs, mixtapeDurationMs, mixtapeProgressPct, handleSeek, formatTime, volume, setVolume, mixtapeLiveLyric, nextLyric, mixtapePulseReadout, mixtapeEnergyPct, mixtapeSpectrum, copyVaultSceneEmbed }) {

  const renderPulseGraph = () => {
    if (!isPlaying || !mixtapeSpectrum || mixtapeSpectrum.length === 0) {
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <path d="M 0 20 L 100 20" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-30" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    const d = "M 0 20 L 10 20 L 13 14 L 17 32 L 22 8 L 26 24 L 29 20 L 42 20 L 45 14 L 49 32 L 54 8 L 58 24 L 61 20 L 74 20 L 77 14 L 81 32 L 86 8 L 90 24 L 93 20 L 100 20";
    const scaleY = Math.max(0.2, (mixtapeEnergyPct / 100) * 1.3);

    return (
      <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_8px_rgba(0,255,191,0.6)] transition-transform duration-[120ms] origin-center"
          style={{ transform: `scaleY(${scaleY})` }}
        />
      </svg>
    );
  };

  return (
    <div className="vault-panel p-6 lg:p-8 flex flex-col justify-between h-full min-w-0">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--neon-mint)', opacity: 0.8 }}>Now Playing</div>
        <div className="mb-8 overflow-hidden w-full">
          {String(currentTrack?.title || 'Aether Secret Session').length > 25 ? (
            <div className="overlay-marquee mt-1 text-xl lg:text-2xl font-black uppercase tracking-tight text-white leading-tight mb-2">
              <div className="overlay-marquee-track">
                <span>{currentTrack?.title || 'Aether Secret Session'}</span>
                <span aria-hidden="true">{currentTrack?.title || 'Aether Secret Session'}</span>
                <span aria-hidden="true">{currentTrack?.title || 'Aether Secret Session'}</span>
                <span aria-hidden="true">{currentTrack?.title || 'Aether Secret Session'}</span>
              </div>
            </div>
          ) : (
            <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-white leading-tight mb-2 truncate">{currentTrack?.title || 'Aether Secret Session'}</h3>
          )}
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-brand-accent/80 truncate">{currentTrack?.author || 'Unknown Artist'}</p>
        </div>
      </div>

      <div className="mb-8 flex items-center gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-mono text-white/50 w-9 text-right">{formatTime(mixtapePositionMs)}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 relative cursor-pointer group/slider" 
                 onPointerDown={(e) => {
                   if (!mixtapeDurationMs) return;
                   e.currentTarget.setPointerCapture(e.pointerId);
                   const rect = e.currentTarget.getBoundingClientRect();
                   const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                   handleSeek(pct * mixtapeDurationMs);
                 }}
                 onPointerMove={(e) => {
                   if (!mixtapeDurationMs || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
                   const rect = e.currentTarget.getBoundingClientRect();
                   const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                   handleSeek(pct * mixtapeDurationMs);
                 }}
                 onPointerUp={(e) => {
                   e.currentTarget.releasePointerCapture(e.pointerId);
                 }}>
              <div className="h-full transition-[width] duration-200 relative" style={{ width: `${Math.min(100, Math.max(isPlaying ? 1 : 0, mixtapeProgressPct))}%`, background: 'var(--neon-mint)', boxShadow: '0 0 12px rgba(22,247,198,0.5)' }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/slider:opacity-100 transition-opacity" style={{ boxShadow: '0 0 10px rgba(22,247,198,0.8)' }} />
              </div>
            </div>
            <span className="text-[11px] font-mono text-white/50 w-9 text-left">{mixtapeDurationMs ? formatTime(mixtapeDurationMs) : '--:--'}</span>
          </div>

          <div className="flex items-center gap-4">
            <Volume2 size={16} className="text-white/40 ml-1 shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-white/10 relative cursor-pointer group/slider" 
                 onPointerDown={(e) => {
                   e.currentTarget.setPointerCapture(e.pointerId);
                   const rect = e.currentTarget.getBoundingClientRect();
                   const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                   setVolume(pct);
                 }}
                 onPointerMove={(e) => {
                   if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                   const rect = e.currentTarget.getBoundingClientRect();
                   const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                   setVolume(pct);
                 }}
                 onPointerUp={(e) => {
                   e.currentTarget.releasePointerCapture(e.pointerId);
                 }}>
              <div className="h-full transition-[width] relative" style={{ width: `${Math.round(volume * 100)}%`, background: 'var(--neon-mint)', boxShadow: '0 0 12px rgba(22,247,198,0.5)' }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/slider:opacity-100 transition-opacity" style={{ boxShadow: '0 0 10px rgba(22,247,198,0.8)' }} />
              </div>
            </div>
            <span className="text-[11px] font-mono text-white/50 w-9 text-left">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        <button onClick={() => handleControl(isPlaying ? 'pause' : 'resume')} className="h-[72px] w-[72px] shrink-0 rounded-full flex items-center justify-center bg-transparent border shadow-[0_0_20px_rgba(22,247,198,0.15)] transition-all hover:scale-105 active:scale-95" style={{ color: 'var(--neon-mint)', borderColor: 'rgba(22,247,198,0.4)', hover: { backgroundColor: 'rgba(22,247,198,0.1)', borderColor: 'rgba(22,247,198,0.7)', boxShadow: '0 0 25px rgba(22,247,198,0.3)' } }}>
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1.5" />}
        </button>
      </div>

      <div className="grid gap-4 grid-cols-2 mb-6">
        <div className="rounded-[1.25rem] border border-white/5 bg-black/40 p-5 flex flex-col justify-between h-[124px]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--neon-mint)', opacity: 0.8 }}>Lyrics</div>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--neon-mint)', boxShadow: '0 0 10px rgba(22,247,198,0.8)' }} />
          </div>
          <div className="space-y-1.5">
            <div className="text-[13px] font-medium leading-snug text-white line-clamp-2 break-words">{mixtapeLiveLyric || 'Instrumental Sequence'}</div>
            <div className="text-[11px] font-medium leading-snug text-white/40 line-clamp-1 truncate">{nextLyric || '...'}</div>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-white/5 bg-black/40 p-5 flex flex-col justify-between h-[124px]">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--neon-mint)', opacity: 0.8 }}>Pulse</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-[28px] w-[54px] shrink-0" style={{ color: 'var(--neon-mint)' }}>
              {renderPulseGraph()}
            </div>
            <div>
              <div className="text-[22px] font-black text-white leading-none tracking-tight">{mixtapeEnergyPct}%</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mt-1.5">Steady</div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={copyVaultSceneEmbed} className="w-full h-[56px] rounded-[1.25rem] bg-black/40 text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-black/60 active:scale-[0.98] flex items-center justify-center gap-2 neon-border" style={{ color: 'var(--neon-mint)' }}>
        <Link2 size={16} /> Copy Live Scene Link
      </button>
    </div>
  );
});

export const MixtapeVaultContent = memo(function MixtapeVaultContent(props) {
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch h-full min-h-0">
      <MixtapeLeft cassetteSide={props.cassetteSide} mixtapePulse={props.mixtapePulse} mixtapePulseReadout={props.mixtapePulseReadout} mixtapeSpectrum={props.mixtapeSpectrum} clamp01={props.clamp01} isPlaying={props.isPlaying} />
      <MixtapeRight currentTrack={props.currentTrack} isPlaying={props.isPlaying} handleControl={props.handleControl} mixtapePositionMs={props.mixtapePositionMs} mixtapeDurationMs={props.mixtapeDurationMs} mixtapeProgressPct={props.mixtapeProgressPct} handleSeek={props.handleSeek} formatTime={props.formatTime} volume={props.volume} setVolume={props.setVolume} mixtapeLiveLyric={props.mixtapeLiveLyric} nextLyric={props.nextLyric} mixtapePulseReadout={props.mixtapePulseReadout} mixtapeEnergyPct={props.mixtapeEnergyPct} mixtapeSpectrum={props.mixtapeSpectrum} copyVaultSceneEmbed={props.copyVaultSceneEmbed} />
    </div>
  );
});
