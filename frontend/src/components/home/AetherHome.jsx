import { memo, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  Headphones,
  ListPlus,
  Loader2,
  Maximize2,
  Music2,
  Pause,
  Play,
  Search,
  Sparkles,
  Video,
} from 'lucide-react';

const cx = (...parts) => parts.filter(Boolean).join(' ');

function cleanText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function trackKey(track, index) {
  return cleanText(track?.youtubeId || track?.id || track?.url || track?.actualUrl || `${track?.title || 'track'}-${track?.author || ''}-${index}`);
}

function trackImage(track, getProxyUrl) {
  return getProxyUrl?.(track?.thumbnail) || track?.thumbnail || '';
}

function isVideoLike(track) {
  return /video|official|visualizer|live|mv|performance/i.test(`${track?.title || ''} ${track?.url || ''} ${track?.actualUrl || ''}`);
}

function MediaThumb({ src, className = '', iconSize = 24 }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cx('flex items-center justify-center bg-white/[0.04] text-brand-accent/38', className)}>
        <Music2 size={iconSize} strokeWidth={1.5} />
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setFailed(true)} className={cx('object-cover', className)} />;
}

function StatusPills({ downloaded, saved, video }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {downloaded && <span className="rounded-full border border-brand-accent/35 bg-black/70 px-2 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-brand-accent">Offline</span>}
      {saved && <span className="rounded-full border border-white/15 bg-black/70 px-2 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-white/70">Library</span>}
      {video && <span className="rounded-full border border-cyan-300/25 bg-black/70 px-2 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Video</span>}
    </div>
  );
}

const HomeVideoCard = memo(function HomeVideoCard({ track, getProxyUrl, isDownloaded, isInLibrary, onPlay, onQueue, onInspect, size = 'normal' }) {
  const title = cleanText(track?.title, 'Untitled track');
  const artist = cleanText(track?.author || track?.artist, 'Unknown artist');
  const downloaded = Boolean(isDownloaded?.(track));
  const saved = Boolean(isInLibrary?.(track));
  const video = isVideoLike(track);
  const big = size === 'hero';

  return (
    <article className="group min-w-0">
      <button onClick={() => onPlay?.(track)} className="block w-full min-w-0 text-left">
        <div className={cx('relative overflow-hidden rounded-[1.15rem] border border-white/8 bg-black/45 transition-all duration-200 group-hover:border-brand-accent/40', big ? 'aspect-[16/8.8]' : 'aspect-video')}>
          <MediaThumb src={trackImage(track, getProxyUrl)} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.035]" iconSize={big ? 34 : 24} />
          <div className="absolute inset-x-0 top-0 p-2">
            <StatusPills downloaded={downloaded} saved={saved} video={video} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/35 group-hover:opacity-100">
            <span className={cx('flex items-center justify-center rounded-full bg-brand-accent text-black shadow-[0_0_26px_rgba(0,255,191,0.34)]', big ? 'h-14 w-14' : 'h-11 w-11')}>
              <Play size={big ? 22 : 17} fill="currentColor" />
            </span>
          </div>
        </div>
        <div className={cx('grid min-w-0 grid-cols-[auto_1fr] gap-3', big ? 'mt-4' : 'mt-3')}>
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-brand-accent/70">
            {video ? <Video size={15} /> : <Headphones size={15} />}
          </div>
          <div className="min-w-0">
            <h3 className={cx('line-clamp-2 font-black leading-tight text-white transition-colors group-hover:text-brand-accent', big ? 'text-[18px] tracking-[0.02em]' : 'text-[13px] tracking-[0.03em]')}>
              {title}
            </h3>
            <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/42">{artist}</p>
          </div>
        </div>
      </button>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => onQueue?.(track)} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[8px] font-black uppercase tracking-[0.16em] text-white/52 transition-all hover:border-brand-accent/35 hover:bg-brand-accent/12 hover:text-brand-accent" title="Add to queue">
          <ListPlus size={13} /> Queue
        </button>
        <button onClick={() => onInspect?.(track, 'home')} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/42 transition-all hover:border-brand-accent/35 hover:text-brand-accent" title="Inspect track">
          <Maximize2 size={13} />
        </button>
      </div>
    </article>
  );
});

const ArtistTile = memo(function ArtistTile({ artist, getProxyUrl, onOpenArtist }) {
  if (!artist) return null;
  return (
    <button onClick={() => onOpenArtist?.(artist.name)} className="group flex min-w-[192px] max-w-[240px] items-center gap-3 rounded-[1rem] border border-white/8 bg-white/[0.035] p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-accent/35 hover:bg-brand-accent/[0.055]">
      <MediaThumb src={getProxyUrl?.(artist.thumbnail) || artist.thumbnail} className="h-11 w-11 shrink-0 rounded-full border border-white/10" iconSize={16} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-black uppercase tracking-[0.06em] text-white group-hover:text-brand-accent">{artist.name}</span>
        <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.16em] text-white/36">{artist.trackCount || 0} saved • {artist.video || 0} videos</span>
      </span>
    </button>
  );
});

function NowPlayingDock({ currentTrack, isPlaying, videoMode, getProxyUrl, onReturn }) {
  if (!currentTrack) return null;
  if (videoMode) {
    return (
      <button onClick={onReturn} className="fixed bottom-4 right-4 z-[455] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[1.1rem] border border-brand-accent/25 bg-[#07100f]/95 text-left shadow-[0_18px_55px_rgba(0,0,0,0.48)] backdrop-blur-xl transition-all hover:border-brand-accent/55">
        <div className="relative aspect-video bg-black/60">
          <MediaThumb src={trackImage(currentTrack, getProxyUrl)} className="h-full w-full" iconSize={24} />
          <span className="absolute left-3 top-3 rounded-full border border-black/40 bg-brand-accent px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-black">
            PiP
          </span>
        </div>
        <span className="flex min-w-0 items-center gap-3 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-accent/25 bg-brand-accent/10 text-brand-accent">
            {isPlaying ? <Play size={14} fill="currentColor" /> : <Pause size={14} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-black uppercase tracking-[0.03em] text-white">{currentTrack.title}</span>
            <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/42">{currentTrack.author || 'Unknown artist'}</span>
          </span>
        </span>
      </button>
    );
  }

  return (
    <button onClick={onReturn} className="fixed bottom-4 right-4 z-[455] flex w-[min(360px,calc(100vw-2rem))] items-center gap-3 rounded-[1rem] border border-brand-accent/25 bg-[#07100f]/95 p-2.5 text-left shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all hover:border-brand-accent/55">
      <MediaThumb src={trackImage(currentTrack, getProxyUrl)} className="h-12 w-12 shrink-0 rounded-xl border border-white/10" iconSize={18} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-brand-accent/75">
          {isPlaying ? <Play size={10} fill="currentColor" /> : <Pause size={10} />}
          {videoMode ? 'Video keeps playing' : 'Now playing'}
        </span>
        <span className="mt-1 block truncate text-[13px] font-black uppercase tracking-[0.03em] text-white">{currentTrack.title}</span>
        <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/42">{currentTrack.author || 'Unknown artist'}</span>
      </span>
      <span className="hidden rounded-xl border border-brand-accent/25 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-brand-accent sm:block">Studio</span>
    </button>
  );
}

function EmptyShelf({ loading, message }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-[1.25rem] border border-white/8 bg-white/[0.02] text-center text-white/35">
      {loading ? <Loader2 size={30} className="animate-spin text-brand-accent/80" /> : <Music2 size={32} strokeWidth={1.4} />}
      <div className="max-w-[320px] text-[10px] font-black uppercase tracking-[0.24em]">{loading ? 'Finding music' : message}</div>
    </div>
  );
}

export const AetherHome = memo(function AetherHome({
  open,
  onClose,
  currentTrack,
  isPlaying,
  videoMode,
  homeFeed,
  homeResults,
  homeArtistName,
  homeArtistResults,
  homeLoading,
  homeError,
  homeFilter,
  homeSort,
  setHomeFilter,
  setHomeSort,
  runHomeSearch,
  openHomeArtist,
  clearHomeArtist,
  homeSeedArtists,
  discoveryHome,
  getProxyUrl,
  isHomeTrackDownloaded,
  isHomeTrackInLibrary,
  playHomeTrack,
  queueHomeTrack,
  openTrackInspect,
}) {
  const [query, setQuery] = useState('');
  const showingArtist = Boolean(homeArtistName);
  const signalFallbackTracks = useMemo(() => {
    const seen = new Set();
    const tracks = [];
    const pushTrack = track => {
      const key = trackKey(track, tracks.length);
      if (!track || seen.has(key)) return;
      seen.add(key);
      tracks.push(track);
    };
    (discoveryHome?.recentTracks || []).forEach(pushTrack);
    (discoveryHome?.favoriteTracks || []).forEach(pushTrack);
    return tracks.slice(0, 18);
  }, [discoveryHome]);
  const baseTracks = showingArtist ? homeArtistResults : (homeResults.length ? homeResults : homeFeed.length ? homeFeed : signalFallbackTracks);

  const filteredTracks = useMemo(() => {
    let tracks = [...(baseTracks || [])];
    if (homeFilter === 'downloaded') tracks = tracks.filter(track => isHomeTrackDownloaded?.(track));
    if (homeFilter === 'library') tracks = tracks.filter(track => isHomeTrackInLibrary?.(track));
    if (homeFilter === 'video') tracks = tracks.filter(isVideoLike);
    if (homeSort === 'title') tracks.sort((a, b) => cleanText(a?.title).localeCompare(cleanText(b?.title)));
    if (homeSort === 'artist') tracks.sort((a, b) => cleanText(a?.author || a?.artist).localeCompare(cleanText(b?.author || b?.artist)));
    if (homeSort === 'downloaded') tracks.sort((a, b) => Number(Boolean(isHomeTrackDownloaded?.(b))) - Number(Boolean(isHomeTrackDownloaded?.(a))));
    return tracks;
  }, [baseTracks, homeFilter, homeSort, isHomeTrackDownloaded, isHomeTrackInLibrary]);

  const hasSearch = Boolean(homeResults.length || showingArtist);

  const shelves = useMemo(() => {
    const saved = (homeSeedArtists || []).slice(0, 12);
    return {
      artists: saved,
      quickMixes: saved.slice(0, 6).map(artist => `${artist.name} mix`),
    };
  }, [homeSeedArtists]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = event => {
      const target = event.target;
      const typing = target?.closest?.('input, textarea, [contenteditable="true"]');
      if (event.key === 'Escape' && !event.isComposing && !typing) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const submitSearch = event => {
    event?.preventDefault?.();
    const next = query.trim();
    if (next) runHomeSearch?.(next);
  };
  return (
    <AnimatePresence>
      <motion.main className="aether-depth-stage fixed inset-0 z-[260] flex h-[100dvh] min-h-0 overflow-hidden bg-[#050707] text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-[#070b0c]/92 px-3 py-2.5 backdrop-blur-xl md:gap-3 md:px-5">
            <button onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/62 transition-all hover:border-brand-accent/40 hover:bg-brand-accent/10 hover:text-brand-accent active:scale-95 md:h-12 md:w-12" title="Back to Studio">
              <ArrowLeft size={19} />
            </button>
            <div className="min-w-[104px] md:min-w-[130px]">
              <div className="text-[8px] font-black uppercase tracking-[0.32em] text-brand-accent/75">Aether</div>
              <h1 className="truncate text-[19px] font-black uppercase tracking-tight text-white md:text-[24px]">{showingArtist ? homeArtistName : 'Home'}</h1>
            </div>
            {showingArtist && (
              <button onClick={clearHomeArtist} className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/50 transition-all hover:border-brand-accent/30 hover:text-brand-accent md:block">
                All Home
              </button>
            )}
            <form onSubmit={submitSearch} className="mx-auto flex h-11 min-w-0 max-w-[820px] flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 focus-within:border-brand-accent/45 md:h-12 md:gap-3 md:px-4">
              <Search size={18} className="shrink-0 text-brand-accent/80" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search artists, songs, videos..." className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-white outline-none placeholder:text-white/35 md:text-[14px]" />
              <button type="submit" className="hidden rounded-full bg-brand-accent px-5 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-black transition-all hover:bg-white sm:block">Search</button>
            </form>
          </header>

          <main
            className="custom-scrollbar-heavy min-h-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden px-3 py-3 md:px-5"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}
          >
            <div className="sticky top-0 z-20 -mx-3 mb-4 border-b border-white/6 bg-[#050707]/92 px-3 pb-3 pt-1 backdrop-blur-xl md:-mx-5 md:px-5">
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {[
                  ['all', 'All', Filter],
                  ['video', 'Videos', Video],
                  ['downloaded', 'Ready Offline', Download],
                  ['library', 'In Library', CheckCircle2],
                ].map(([value, label, Icon]) => (
                  <button key={value} onClick={() => setHomeFilter?.(value)} className={cx('flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.16em] transition-all', homeFilter === value ? 'border-brand-accent/45 bg-brand-accent text-black shadow-[0_0_18px_rgba(0,255,191,0.18)]' : 'border-white/10 bg-white/[0.045] text-white/55 hover:border-brand-accent/35 hover:text-brand-accent')}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
                <select value={homeSort} onChange={event => setHomeSort?.(event.target.value)} className="ml-auto h-9 shrink-0 rounded-full border border-white/10 bg-[#101516] px-4 text-[9px] font-black uppercase tracking-[0.14em] text-white/65 outline-none">
                  <option value="relevant">Relevant</option>
                  <option value="downloaded">Downloaded first</option>
                  <option value="title">Title</option>
                  <option value="artist">Artist</option>
                </select>
              </div>
            </div>

            {homeError && <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-red-200/85">{homeError}</div>}

            {!hasSearch && shelves.artists.length > 0 && (
              <section className="mb-4">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  <Sparkles size={14} className="text-brand-accent" /> From your signal
                </div>
                <div className="flex max-w-full gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {shelves.artists.map((artist, index) => <ArtistTile key={artist.id || artist.name || `artist-${index}`} artist={artist} getProxyUrl={getProxyUrl} onOpenArtist={openHomeArtist} />)}
                </div>
              </section>
            )}

            {!hasSearch && shelves.quickMixes.length > 0 && (
              <section className="mb-4">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  <Clock3 size={14} className="text-brand-accent" /> Quick starts
                </div>
                <div className="flex max-w-full gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {shelves.quickMixes.map(label => (
                    <button key={label} onClick={() => runHomeSearch?.(label)} className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                    {showingArtist ? 'Artist videos and songs' : homeResults.length ? 'Search results' : 'Recommended for you'}
                  </div>
                  {showingArtist && <p className="mt-1 text-[12px] font-bold text-white/36">Online results plus badges for tracks already saved or downloaded.</p>}
                </div>
                  {homeLoading && homeFeed.length === 0 && homeResults.length === 0 && signalFallbackTracks.length === 0 && <div className="flex shrink-0 items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent/80"><Loader2 size={13} className="animate-spin" /> Loading</div>}
              </div>

              {filteredTracks.length ? (
                <div className="grid justify-start gap-x-3 gap-y-5 pb-24 md:gap-x-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 190px), 252px))' }}>
                  {filteredTracks.map((track, index) => (
                    <HomeVideoCard key={`grid-${trackKey(track, index)}`} track={track} getProxyUrl={getProxyUrl} isDownloaded={isHomeTrackDownloaded} isInLibrary={isHomeTrackInLibrary} onPlay={playHomeTrack} onQueue={queueHomeTrack} onInspect={openTrackInspect} />
                  ))}
                </div>
              ) : (
                <EmptyShelf loading={homeLoading} message="Search for an artist or play more music to build recommendations." />
              )}
            </section>
          </main>
        </section>

        <NowPlayingDock currentTrack={currentTrack} isPlaying={isPlaying} videoMode={videoMode} getProxyUrl={getProxyUrl} onReturn={onClose} />
      </motion.main>
    </AnimatePresence>
  );
});
