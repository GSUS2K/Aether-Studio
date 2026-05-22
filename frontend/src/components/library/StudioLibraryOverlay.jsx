import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Edit3, Eye, HardDrive, Heart, Maximize2, Music, Play, Plus, RefreshCw, Search, Shuffle, Trash2, Upload, X, Zap } from 'lucide-react';
import { FAVORITES_PLAYLIST_ID, FAVORITES_PLAYLIST_NAME } from '../../config/aetherConfig';
import catDoodlePeek from '../../assets/cat-doodle-peek.svg';
import { HealthMetricCard, SecondaryNowPlayingStrip } from '../common/AetherUi';

export const StudioLibrarySongRow = memo(function StudioLibrarySongRow({
  entry,
  getProxyUrl,
  onInspect,
  onQueue,
  onToggleFavorite,
  onDelete,
  isFavorite,
  getTrackPlayCount,
  getTrackLastListenedMs,
  getTrackAddedMs,
}) {
  const track = entry.track;
  return (
    <div
      onClick={() => onInspect(track)}
      className="performance-list-item group rounded-2xl border border-white/8 bg-black/20 p-3 transition-all cursor-pointer hover:border-brand-accent/30 hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-3">
        <img src={getProxyUrl(track.thumbnail)} className="h-12 w-12 rounded-xl border border-white/10 object-cover bg-white/[0.03]" alt="" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black uppercase tracking-widest text-white truncate group-hover:text-brand-accent transition-colors">{track.title || 'Unknown Track'}</div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/30 truncate">{track.author || 'Unknown Artist'}</div>
          <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-white/22 truncate">{entry.playlists.slice(0, 2).join(' / ')}{entry.playlists.length > 2 ? ` +${entry.playlists.length - 2}` : ''}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onQueue(track); }} className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent/70 hover:text-brand-accent hover:bg-brand-accent/20 transition-all" title="Add to queue"><Plus size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(track); }} className={`p-2 rounded-lg transition-all ${isFavorite(track) ? 'bg-rose-400/12 text-rose-300' : 'bg-white/5 text-white/35 hover:text-rose-300'}`} title={isFavorite(track) ? 'Remove from Favorites' : 'Add to Favorites'}><Heart size={12} fill={isFavorite(track) ? 'currentColor' : 'none'} /></button>
          <button onClick={(e) => { e.stopPropagation(); onInspect(track); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title="Inspect"><Eye size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(track); }} className="p-2 rounded-lg bg-white/5 text-red-400/50 hover:text-red-400 transition-all" title="Delete from every vault"><Trash2 size={12} /></button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[8px] uppercase tracking-[0.18em] text-white/25">
        <span>{getTrackPlayCount(track)} plays</span>
        <span>{getTrackLastListenedMs(track) ? 'Recently played' : getTrackAddedMs(track) ? 'Added' : 'Indexed'}</span>
      </div>
    </div>
  );
});

const StudioLibrarySearchIsland = memo(function StudioLibrarySearchIsland({
  isOpen,
  librarySearchTerm,
  setLibrarySearchTerm,
  libraryBrowseMode,
}) {
  const [draft, setDraft] = useState(() => librarySearchTerm || '');
  const commitRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    startTransition(() => setDraft(librarySearchTerm || ''));
  }, [isOpen, librarySearchTerm]);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (draft === (librarySearchTerm || '')) return undefined;
    window.clearTimeout(commitRef.current);
    commitRef.current = window.setTimeout(() => {
      startTransition(() => setLibrarySearchTerm(draft));
    }, 140);
    return () => window.clearTimeout(commitRef.current);
  }, [draft, isOpen, librarySearchTerm, setLibrarySearchTerm]);

  const clear = useCallback(() => {
    setDraft('');
    startTransition(() => setLibrarySearchTerm(''));
  }, [setLibrarySearchTerm]);

  return (
    <div className="relative">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={libraryBrowseMode === 'songs' ? 'Search songs, artists, vaults...' : 'Search vaults, songs, artists...'}
        className="no-drag w-full rounded-2xl border border-white/10 bg-white/[0.035] py-2.5 pl-9 pr-9 text-[12px] font-bold text-white outline-none transition-colors placeholder:text-white/25 focus:border-brand-accent/35 focus:bg-brand-accent/[0.045]"
      />
      {draft && (
        <button
          onClick={clear}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-white/35 transition-colors hover:text-brand-accent"
          title="Clear library search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
});

export const StudioLibraryPlaylistRow = memo(function StudioLibraryPlaylistRow({
  name,
  isRenaming,
  renameValue,
  setRenameValue,
  setIsRenamingPlaylist,
  viewingPlaylist,
  onView,
  onMove,
  onExport,
  onDelete,
  onAddPending,
  onRename,
  canAddPendingToVault,
  isStandalone,
  draggedPlaylistName,
  setDraggedPlaylistName,
  reorderPlaylistByDrag,
  playlistCount,
  currentTrack,
}) {
  const isFocused = viewingPlaylist === name;
  const isDragging = draggedPlaylistName === name;
  const isDragEnabled = !isRenaming;
  const beginRename = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setIsRenamingPlaylist(name);
    setRenameValue(name);
  }, [name, setIsRenamingPlaylist, setRenameValue]);
  return (
    <div
      key={name}
      draggable={isDragEnabled}
      onClick={(e) => {
        if (isRenaming || e.detail > 1) return;
        onView(name);
      }}
      onDragStart={(e) => {
        if (!isDragEnabled) return;
        setDraggedPlaylistName(name);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', name);
      }}
      onDragEnd={() => setDraggedPlaylistName(null)}
      onDragOver={(e) => {
        if (!isDragEnabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        if (!isDragEnabled) return;
        e.preventDefault();
        const droppedName = e.dataTransfer.getData('text/plain');
        reorderPlaylistByDrag(name, droppedName || draggedPlaylistName);
      }}
      className={`performance-list-item group rounded-2xl border p-3 transition-all cursor-pointer ${isDragging ? 'border-brand-accent/40 bg-brand-accent/12 shadow-[0_0_18px_rgba(0,255,191,0.08)]' : (isFocused ? 'border-brand-accent/35 bg-brand-accent/10 shadow-[0_0_18px_rgba(0,255,191,0.09)]' : 'border-white/8 bg-black/20 hover:border-brand-accent/30 hover:bg-white/[0.03]')}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.26em] text-white/25">Vault Node</div>
          {isRenaming ? (
            <input
              autoFocus
              className="no-drag w-full rounded-md border border-brand-accent/30 bg-white/5 px-2 py-1 text-[11px] font-black uppercase tracking-tight text-brand-accent outline-none"
              value={renameValue}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={(e) => onRename(name, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRename(name, e.currentTarget.value);
                if (e.key === 'Escape') setIsRenamingPlaylist(null);
              }}
            />
          ) : (
            <div
              draggable={false}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onDoubleClick={beginRename}
              className="font-black uppercase tracking-tight truncate group-hover:text-brand-accent transition-colors cursor-default"
              title="Double-click to rename"
            >
              {name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isFocused && (
            <span className="px-2 py-1 rounded-md bg-brand-accent/12 border border-brand-accent/25 text-brand-accent text-[8px] font-black uppercase tracking-[0.2em]">Focused</span>
          )}
          <button onClick={(e) => { e.stopPropagation(); onAddPending(name); }} disabled={!canAddPendingToVault && !currentTrack} className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent/70 hover:text-brand-accent hover:bg-brand-accent/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title={`Add pending context to ${name}`}><Plus size={12} /></button>
          <button onClick={beginRename} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title={`Rename ${name}`}><Edit3 size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); onMove(name, -1); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title="Move up"><ChevronLeft size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); onMove(name, 1); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title="Move down"><ChevronRight size={12} /></button>
          {isStandalone && <button onClick={(e) => { e.stopPropagation(); onExport(name); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title={`Export ${name} to .aether`}><Download size={12} /></button>}
          <button onClick={(e) => { e.stopPropagation(); onDelete(name); }} className="p-2 rounded-lg bg-white/5 text-red-400/60 hover:text-red-400 transition-all" title={`Delete ${name}`}><Trash2 size={12} /></button>
        </div>
      </div>
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/30">
        <span>{playlistCount} nodes</span>
        <span>{playlistCount > 0 ? 'Ready' : 'Empty'}</span>
      </div>
    </div>
  );
});

const StudioLibraryFocusedTrackRow = memo(function StudioLibraryFocusedTrackRow({
  track,
  getProxyUrl,
  onQueue,
  onToggleFavorite,
  onRemove,
  isFavorite,
}) {
  return (
    <div className="performance-list-item group rounded-2xl border border-white/8 bg-black/20 p-3 flex items-center gap-3 hover:border-brand-accent/30 hover:bg-white/[0.03] transition-all">
      <img src={getProxyUrl(track.thumbnail)} className="w-11 h-11 rounded-xl object-cover border border-white/10" alt="" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-black uppercase tracking-widest truncate group-hover:text-brand-accent transition-colors">{track.title}</div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-white/30 truncate mt-1">{track.author}</div>
      </div>
      <button onClick={() => onQueue(track)} className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-black transition-all" title="Add to queue"><Plus size={12} /></button>
      <button onClick={() => onToggleFavorite(track)} className={`p-2 rounded-lg transition-all ${isFavorite(track) ? 'bg-rose-400/12 text-rose-300' : 'bg-white/5 text-white/35 hover:text-rose-300'}`} title={isFavorite(track) ? 'Remove from Favorites' : 'Add to Favorites'}><Heart size={12} fill={isFavorite(track) ? 'currentColor' : 'none'} /></button>
      <button onClick={() => onRemove(track)} className="p-2 rounded-lg bg-white/5 text-red-400/50 hover:text-red-400 transition-all" title="Remove"><Trash2 size={12} /></button>
    </div>
  );
});

export const StudioLibraryOverlayIsland = memo(function StudioLibraryOverlayIsland({
  isOpen,
  isStandalone,
  isVaultCleaning,
  isVaultImporting,
  libraryActionTarget,
  currentTrack,
  isPlaying,
  getProxyUrl,
  libraryOverlayCreateInputRef,
  newPlaylistName,
  setNewPlaylistName,
  setIsCreatingPlaylist,
  handleAddToPlaylist,
  pendingLibraryItems,
  canAddPendingToVault,
  libraryBrowseMode,
  libraryModeOptions,
  setLibraryBrowseMode,
  librarySearchTerm,
  setLibrarySearchTerm,
  librarySongFilterOptions,
  libraryPlaylistFilterOptions,
  librarySongFilter,
  setLibrarySongFilter,
  libraryFilter,
  setLibraryFilter,
  librarySongSortOptions,
  libraryPlaylistSortOptions,
  librarySongSort,
  setLibrarySongSort,
  librarySort,
  setLibrarySort,
  librarySearchNeedle,
  libraryVisibleSongEntries,
  libraryVisiblePlaylistNames,
  showFavoriteLibraryCard,
  favoriteTracksList,
  viewingPlaylist,
  setViewingPlaylist,
  isRenamingPlaylist,
  setIsRenamingPlaylist,
  renameValue,
  setRenameValue,
  handleRenamePlaylist,
  movePlaylist,
  handlePlaylistAddAll,
  handleDeletePlaylist,
  handleFavoritePlayAll,
  handleFavoriteAddAll,
  handleExportVault,
  openTrackInspect,
  handleAdd,
  toggleFavoriteTrack,
  isTrackFavorite,
  handleRemoveTrackEverywhere,
  draggedPlaylistName,
  setDraggedPlaylistName,
  reorderPlaylistByDrag,
  playlists,
  libraryTrackSort,
  setLibraryTrackSort,
  handlePlaylistPlayAll,
  handleRemoveTrackFromPlaylist,
  focusedVaultName,
  focusedVaultVisibleTracks,
  focusedVaultTracks,
  libraryInsights,
  isViewingFavorites,
  getTrackPlayCount,
  getTrackLastListenedMs,
  getTrackAddedMs,
  isDoodleMode,
  handleImportVault,
  handleGenerateSmartMix,
  handleCleanVault,
  downloadedTracks,
  resolveWarmupTrackId,
  trackHasSavedLyrics,
  onDownloadMissingForVault,
  onClose,
}) {
  const clearLibrarySearch = useCallback(() => {
    startTransition(() => setLibrarySearchTerm(''));
  }, [setLibrarySearchTerm]);

  const inspectLibraryTrack = useCallback((track) => {
    openTrackInspect(track, 'studio-library');
  }, [openTrackInspect]);

  const queueLibraryTrack = useCallback((track) => {
    handleAdd(track);
  }, [handleAdd]);

  const toggleLibraryFavorite = useCallback((track) => {
    toggleFavoriteTrack(track);
  }, [toggleFavoriteTrack]);

  const deleteLibraryTrack = useCallback((track) => {
    handleRemoveTrackEverywhere(track);
  }, [handleRemoveTrackEverywhere]);

  const addPendingToVault = useCallback((name) => {
    const itemsToAdd = (pendingLibraryItems && pendingLibraryItems.length > 0) ? pendingLibraryItems : (currentTrack ? [currentTrack] : []);
    if (!itemsToAdd || itemsToAdd.length === 0) return;
    handleAddToPlaylist(name, itemsToAdd);
    // If there were no explicit pending items and we used the focused `currentTrack`,
    // also add it to the playback queue so the UX is convenient.
    if ((!pendingLibraryItems || pendingLibraryItems.length === 0) && currentTrack) {
      try {
        handleAdd(currentTrack);
      } catch (e) {
        // ignore
      }
    }
  }, [handleAddToPlaylist, pendingLibraryItems, currentTrack, handleAdd]);

  const removeFocusedTrack = useCallback((track, index) => {
    handleRemoveTrackFromPlaylist(viewingPlaylist, track, index);
  }, [handleRemoveTrackFromPlaylist, viewingPlaylist]);

  const focusedVaultHealth = useMemo(() => {
    const tracks = Array.isArray(focusedVaultTracks) ? focusedVaultTracks : [];
    const downloadedSet = new Set((downloadedTracks || []).map((id) => String(id)));
    const seen = new Set();
    let duplicates = 0;
    let missingLinks = 0;
    let weakMetadata = 0;
    let noLyrics = 0;
    let downloaded = 0;

    tracks.forEach((track) => {
      const key = `${String(track?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${String(track?.author || track?.artist || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${track?.youtubeId || track?.id || ''}`;
      if (seen.has(key)) duplicates += 1;
      else seen.add(key);

      if (!(track?.actualUrl || track?.url || track?.youtubeId)) missingLinks += 1;
      const title = String(track?.title || '').trim().toLowerCase();
      const artist = String(track?.author || track?.artist || '').trim().toLowerCase();
      if (!title || !artist || title === 'unknown track' || artist === 'unknown artist' || !track?.thumbnail) weakMetadata += 1;
      if (!trackHasSavedLyrics?.(track)) noLyrics += 1;

      const id = resolveWarmupTrackId?.(track) || track?.id || track?.youtubeId;
      if (id && (downloadedSet.has(String(id)) || downloadedSet.has(String(track?.id || '')))) downloaded += 1;
    });

    const missingDownloads = Math.max(0, tracks.length - downloaded);
    const issueWeight = duplicates + missingLinks + weakMetadata + noLyrics * 0.35 + missingDownloads * 0.6;
    const score = tracks.length === 0 ? 100 : Math.max(0, Math.round(100 - (issueWeight / Math.max(1, tracks.length)) * 100));
    return { total: tracks.length, duplicates, missingLinks, weakMetadata, noLyrics, downloaded, missingDownloads, offlineReady: tracks.length > 0 && missingDownloads === 0, score };
  }, [downloadedTracks, focusedVaultTracks, resolveWarmupTrackId, trackHasSavedLyrics]);

  const updateBrowseMode = useCallback((mode) => {
    startTransition(() => setLibraryBrowseMode(mode));
  }, [setLibraryBrowseMode]);

  const updateLibraryFilter = useCallback((value) => {
    startTransition(() => setLibraryFilter(value));
  }, [setLibraryFilter]);

  const updateLibrarySongFilter = useCallback((value) => {
    startTransition(() => setLibrarySongFilter(value));
  }, [setLibrarySongFilter]);

  const updateLibrarySort = useCallback((value) => {
    startTransition(() => setLibrarySort(value));
  }, [setLibrarySort]);

  const updateLibrarySongSort = useCallback((value) => {
    startTransition(() => setLibrarySongSort(value));
  }, [setLibrarySongSort]);

  const updateLibraryTrackSort = useCallback((value) => {
    startTransition(() => setLibraryTrackSort(value));
  }, [setLibraryTrackSort]);

  const updateViewingPlaylist = useCallback((value) => {
    startTransition(() => setViewingPlaylist(value));
  }, [setViewingPlaylist]);

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="studio-library-shell fixed inset-0 z-[300] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/78 backdrop-blur-[24px]" onClick={onClose} />
      <div className="studio-library-backdrop absolute inset-0 pointer-events-none overflow-hidden" />
      <motion.div initial={{ scale: 0.965, y: 18 }} animate={{ scale: 1, y: 0 }} className="studio-library-modal w-full max-w-[1540px] h-[92vh] bg-[#070a0d]/86 border border-white/10 rounded-[2.25rem] relative z-10 overflow-hidden flex flex-col shadow-[0_32px_110px_rgba(0,0,0,0.62)]">
        <div className="studio-library-glow-line absolute inset-x-0 top-0 h-px" />
        <div className="studio-library-topbar flex items-center justify-between gap-4 p-5 md:p-6 border-b border-white/8">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-brand-accent/10 border border-brand-accent/25 flex items-center justify-center shrink-0">
              <HardDrive size={18} className="text-brand-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.32em] text-white/30">Neural Library Overlay</div>
              <div className="text-xl md:text-2xl font-black uppercase tracking-tight text-brand-accent truncate">Studio Library</div>
            </div>
          </div>
          <SecondaryNowPlayingStrip
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            getProxyUrl={getProxyUrl}
            className="hidden max-w-sm flex-1 xl:flex"
          />
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isStandalone && <button onClick={handleImportVault} disabled={isVaultImporting} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-brand-accent hover:border-brand-accent/40 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50" title="Import Vault (.aether)">{isVaultImporting ? 'Importing...' : 'Import'}</button>}
            <button onClick={handleGenerateSmartMix} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-brand-accent hover:border-brand-accent/40 text-[10px] font-black uppercase tracking-widest transition-all" title="Generate Smart Mix">Smart Mix</button>
            <button onClick={handleCleanVault} disabled={isVaultCleaning} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-brand-accent hover:border-brand-accent/40 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40" title="Playlist Health: remove duplicates, repair weak metadata, and remove unavailable entries">{isVaultCleaning ? 'Scanning...' : 'Health'}</button>
            <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="studio-library-workspace flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(380px,0.92fr)_minmax(520px,1.38fr)] gap-4 p-3 md:p-5 overflow-hidden">
          <div className="studio-library-column studio-library-left border border-white/8 rounded-[1.75rem] overflow-hidden flex flex-col min-h-0 h-full">
            <div className="px-4 py-4 border-b border-white/8 flex items-center justify-between bg-black/20">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/30">Library Desk</div>
                <div className="text-[12px] font-black uppercase tracking-widest text-brand-accent">Vault Actions</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/40 transition-all" title="Close Overlay">
                  <X size={14} />
                </button>
                <button onClick={() => { setIsCreatingPlaylist(true); setNewPlaylistName((prev) => prev || ''); }} className="p-2 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-black transition-all shadow-[0_0_18px_rgba(0,255,191,0.14)]" title="Create New Vault">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="studio-library-action-dock shrink-0 min-h-0 p-3 space-y-2">
              <div className="flex items-center gap-3 rounded-2xl bg-black/18 border border-brand-accent/18 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                {libraryActionTarget?.type === 'queue' ? (
                  <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-black text-[10px]">Q</div>
                ) : (
                  <img src={getProxyUrl(libraryActionTarget?.items?.[0]?.thumbnail || currentTrack?.thumbnail)} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
                )}
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/35">Ready to Save</div>
                  <div className="font-black uppercase tracking-tight text-white truncate">
                    {libraryActionTarget?.type === 'queue'
                      ? `Queue Buffer (${libraryActionTarget.items.length})`
                      : (libraryActionTarget?.items?.[0]?.title || currentTrack?.title || 'Create Empty Vault')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/28 border border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <input
                  ref={libraryOverlayCreateInputRef}
                  className="bg-transparent border-none outline-none text-[12px] font-black text-brand-accent uppercase tracking-widest placeholder:text-brand-accent/30 w-full px-2 py-2"
                  placeholder="New vault name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPlaylistName.trim()) {
                      handleAddToPlaylist(newPlaylistName.trim(), pendingLibraryItems);
                      setNewPlaylistName('');
                      setIsCreatingPlaylist(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newPlaylistName.trim()) {
                      handleAddToPlaylist(newPlaylistName.trim(), pendingLibraryItems);
                      setNewPlaylistName('');
                      setIsCreatingPlaylist(false);
                    }
                  }}
                  disabled={!newPlaylistName.trim()}
                  className="p-2 rounded-lg bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-black transition-all shadow-neon disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                </button>
              </div>
              {!libraryActionTarget && !currentTrack && (
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/28">No active track. Creates an empty vault.</div>
              )}
            </div>

            <div className="studio-library-controls shrink-0 border-y border-white/8 bg-black/28 p-4 space-y-3">
              <StudioLibrarySearchIsland
                isOpen={isOpen}
                librarySearchTerm={librarySearchTerm}
                setLibrarySearchTerm={setLibrarySearchTerm}
                libraryBrowseMode={libraryBrowseMode}
              />
              <div className="grid grid-cols-2 rounded-2xl border border-white/8 bg-black/28 p-1">
                {libraryModeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateBrowseMode(option.id)}
                    className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${libraryBrowseMode === option.id ? 'bg-brand-accent text-black shadow-[0_0_18px_rgba(0,255,191,0.18)]' : 'text-white/42 hover:text-brand-accent'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-[8px] font-black uppercase tracking-[0.2em] text-white/24">
                  <span>Filter</span>
                  <span>{libraryBrowseMode === 'songs' ? 'Track View' : 'Vault View'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(libraryBrowseMode === 'songs' ? librarySongFilterOptions : libraryPlaylistFilterOptions).map((option) => {
                    const active = libraryBrowseMode === 'songs' ? librarySongFilter === option.id : libraryFilter === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => libraryBrowseMode === 'songs' ? updateLibrarySongFilter(option.id) : updateLibraryFilter(option.id)}
                        className={`rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${active ? 'border-brand-accent/45 bg-brand-accent/15 text-brand-accent' : 'border-white/8 bg-white/[0.025] text-white/42 hover:border-brand-accent/25 hover:text-brand-accent'}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 text-[8px] font-black uppercase tracking-[0.2em] text-white/24">
                  <span>Sort</span>
                  <span>{libraryBrowseMode === 'songs' ? libraryVisibleSongEntries.length : libraryVisiblePlaylistNames.length + (showFavoriteLibraryCard ? 1 : 0)} shown</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(libraryBrowseMode === 'songs' ? librarySongSortOptions : libraryPlaylistSortOptions).map((option) => {
                    const active = libraryBrowseMode === 'songs' ? librarySongSort === option.id : librarySort === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => libraryBrowseMode === 'songs' ? updateLibrarySongSort(option.id) : updateLibrarySort(option.id)}
                        className={`rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${active ? 'border-brand-accent/45 bg-brand-accent/15 text-brand-accent' : 'border-white/8 bg-white/[0.025] text-white/42 hover:border-brand-accent/25 hover:text-brand-accent'}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/28">
                <span>{libraryBrowseMode === 'songs' ? `${libraryVisibleSongEntries.length} songs` : `${libraryVisiblePlaylistNames.length + (showFavoriteLibraryCard ? 1 : 0)} vaults`}</span>
                <span>{librarySearchNeedle ? 'Filtered' : libraryBrowseMode === 'songs' ? 'Song Index' : 'Browse'}</span>
              </div>
            </div>

            <div className="studio-library-list flex-1 min-h-0 overflow-y-auto custom-scrollbar-heavy overscroll-contain p-4 space-y-3 pb-10">
              {libraryBrowseMode === 'songs' ? (
                <>
                  {libraryVisibleSongEntries.map((entry) => (
                    <StudioLibrarySongRow
                      key={`library-song-${entry.key}`}
                      entry={entry}
                      getProxyUrl={getProxyUrl}
                      onInspect={inspectLibraryTrack}
                      onQueue={queueLibraryTrack}
                      onToggleFavorite={toggleLibraryFavorite}
                      onDelete={deleteLibraryTrack}
                      isFavorite={isTrackFavorite}
                      getTrackPlayCount={getTrackPlayCount}
                      getTrackLastListenedMs={getTrackLastListenedMs}
                      getTrackAddedMs={getTrackAddedMs}
                    />
                  ))}
                  {libraryVisibleSongEntries.length === 0 && (
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-5 text-center">
                      <Search size={22} className="mx-auto text-white/25" />
                      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">No songs match</div>
                      <button onClick={() => { clearLibrarySearch(); updateLibrarySongFilter('all'); }} className="mt-3 rounded-xl border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent transition-colors hover:bg-brand-accent hover:text-black">Reset songs</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {showFavoriteLibraryCard && (
                    <div
                      onClick={() => updateViewingPlaylist(FAVORITES_PLAYLIST_ID)}
                      className={`performance-list-item group rounded-2xl border p-3 transition-all cursor-pointer ${viewingPlaylist === FAVORITES_PLAYLIST_ID ? 'border-rose-300/40 bg-rose-400/12 shadow-[0_0_18px_rgba(251,113,133,0.09)]' : 'border-rose-300/15 bg-rose-400/[0.035] hover:border-rose-300/35 hover:bg-rose-400/[0.06]'}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="text-[9px] font-black uppercase tracking-[0.26em] text-rose-200/45">Built-in Vault</div>
                          <div className="font-black uppercase tracking-tight truncate group-hover:text-rose-300 transition-colors">{FAVORITES_PLAYLIST_NAME}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {viewingPlaylist === FAVORITES_PLAYLIST_ID && (
                            <span className="px-2 py-1 rounded-md bg-rose-400/12 border border-rose-300/25 text-rose-200 text-[8px] font-black uppercase tracking-[0.2em]">Focused</span>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleFavoritePlayAll(false); }} className="p-2 rounded-lg bg-rose-400/10 text-rose-200/80 hover:text-rose-100 hover:bg-rose-400/20 transition-all" title="Play Favorites"><Play size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleFavoritePlayAll(true); }} className="p-2 rounded-lg bg-rose-400/10 text-rose-200/80 hover:text-rose-100 hover:bg-rose-400/20 transition-all" title="Shuffle Favorites"><Shuffle size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleFavoriteAddAll(); }} className="p-2 rounded-lg bg-white/5 text-rose-200/70 hover:text-rose-100 hover:bg-rose-400/20 transition-all" title="Add Favorites to Queue"><Plus size={12} /></button>
                          {isStandalone && <button onClick={(e) => { e.stopPropagation(); handleExportVault(FAVORITES_PLAYLIST_ID); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-rose-200 transition-all" title="Export Favorites"><Download size={12} /></button>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/30">
                        <span>{favoriteTracksList.length} nodes</span>
                        <span>{favoriteTracksList.length > 0 ? 'Ready' : 'Empty'}</span>
                      </div>
                    </div>
                  )}
                  {libraryVisiblePlaylistNames.map((name, index) => (
                    <StudioLibraryPlaylistRow
                      key={name || `library-vault-${index}`}
                      name={name}
                      isRenaming={isRenamingPlaylist === name}
                      renameValue={renameValue}
                      setRenameValue={setRenameValue}
                      setIsRenamingPlaylist={setIsRenamingPlaylist}
                      viewingPlaylist={viewingPlaylist}
                      onView={updateViewingPlaylist}
                      onMove={movePlaylist}
                      onExport={handleExportVault}
                      onDelete={handleDeletePlaylist}
                      onAddPending={addPendingToVault}
                      currentTrack={currentTrack}
                      onRename={handleRenamePlaylist}
                      canAddPendingToVault={canAddPendingToVault}
                      isStandalone={isStandalone}
                      draggedPlaylistName={draggedPlaylistName}
                      setDraggedPlaylistName={setDraggedPlaylistName}
                      reorderPlaylistByDrag={reorderPlaylistByDrag}
                      playlistCount={(playlists[name] || []).length}
                    />
                  ))}
                  {!showFavoriteLibraryCard && libraryVisiblePlaylistNames.length === 0 && (
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-5 text-center">
                      <Search size={22} className="mx-auto text-white/25" />
                      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">No vault matches</div>
                      <button onClick={() => { clearLibrarySearch(); updateLibraryFilter('all'); }} className="mt-3 rounded-xl border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent transition-colors hover:bg-brand-accent hover:text-black">Reset filters</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="studio-library-column studio-library-focus border border-white/8 rounded-[1.75rem] overflow-hidden flex flex-col min-h-0 h-full">
            {viewingPlaylist ? (
              <div key={viewingPlaylist} className="flex flex-col min-h-0 flex-1">
                <div className="px-4 py-4 border-b border-white/8 flex items-center justify-between bg-black/20">
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/30">Focused Vault</div>
                    {isRenamingPlaylist === viewingPlaylist && !isViewingFavorites ? (
                      <input
                        autoFocus
                        className="no-drag mt-1 w-full max-w-sm rounded-xl border border-brand-accent/35 bg-black/35 px-3 py-2 text-lg font-black uppercase tracking-tight text-brand-accent outline-none"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={(e) => handleRenamePlaylist(viewingPlaylist, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenamePlaylist(viewingPlaylist, e.currentTarget.value);
                          if (e.key === 'Escape') setIsRenamingPlaylist(null);
                        }}
                      />
                    ) : (
                      <div
                        onDoubleClick={(e) => {
                          if (isViewingFavorites) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setIsRenamingPlaylist(viewingPlaylist);
                          setRenameValue(viewingPlaylist);
                        }}
                        className={`text-lg font-black uppercase tracking-tight truncate cursor-default ${isViewingFavorites ? 'text-rose-300' : 'text-brand-accent hover:opacity-80 transition-opacity'}`}
                        title={isViewingFavorites ? focusedVaultName : 'Double-click to rename'}
                      >
                        {focusedVaultName}
                      </div>
                    )}
                    <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/35">{focusedVaultVisibleTracks.length}/{focusedVaultTracks.length} tracks</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <select
                      value={libraryTrackSort}
                      onChange={(e) => updateLibraryTrackSort(e.target.value)}
                      className="no-drag rounded-lg border border-white/10 bg-[#0b0f12] px-2 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/55 outline-none focus:border-brand-accent/35"
                      title="Sort tracks"
                    >
                      <option value="original">Original</option>
                      <option value="title">Title</option>
                      <option value="artist">Artist</option>
                      <option value="listened-desc">Recently Played</option>
                      <option value="added-desc">Recently Added</option>
                      <option value="plays-desc">Most Played</option>
                      <option value="duration-desc">Longest</option>
                      <option value="duration-asc">Shortest</option>
                    </select>
                    <button onClick={() => handlePlaylistPlayAll(viewingPlaylist, false)} className={`p-2 rounded-lg transition-all ${isViewingFavorites ? 'bg-rose-400/10 text-rose-200/80 hover:bg-rose-400/20' : 'bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-black'}`} title={`Play ${focusedVaultName}`}><Play size={12} /></button>
                    <button onClick={() => handlePlaylistPlayAll(viewingPlaylist, true)} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-brand-accent transition-all" title={`Shuffle ${focusedVaultName}`}><Shuffle size={12} /></button>
                    <button onClick={() => handlePlaylistAddAll(viewingPlaylist)} className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-black transition-all" title={`Add all tracks from ${focusedVaultName} to queue`}><Plus size={12} /></button>
                    <span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${focusedVaultHealth.offlineReady ? 'border-brand-accent/35 bg-brand-accent/12 text-brand-accent' : 'border-amber-300/18 bg-amber-400/[0.06] text-amber-100/80'}`} title={focusedVaultHealth.offlineReady ? 'Every track in this vault has a downloaded copy' : `${focusedVaultHealth.missingDownloads} tracks need download for offline playback`}>
                      {focusedVaultHealth.offlineReady ? 'Ready Offline' : `${focusedVaultHealth.missingDownloads} Missing`}
                    </span>
                    {isStandalone && !focusedVaultHealth.offlineReady && (
                      <button onClick={() => onDownloadMissingForVault?.(focusedVaultTracks, focusedVaultName)} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-brand-accent transition-all" title={`Download missing tracks for ${focusedVaultName}`}><HardDrive size={12} /></button>
                    )}
                    {isStandalone && <button onClick={() => handleExportVault(viewingPlaylist)} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title={`Export ${focusedVaultName} to .aether`}><Download size={12} /></button>}
                    <button onClick={() => handleDeletePlaylist(viewingPlaylist)} className="p-2 rounded-lg bg-white/5 text-red-400/60 hover:text-red-400 transition-all" title={isViewingFavorites ? 'Clear Favorites' : `Delete ${viewingPlaylist}`}><Trash2 size={12} /></button>
                    <button onClick={() => updateViewingPlaylist(null)} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-red-400 transition-all" title="Back"><ChevronLeft size={12} /></button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-3 bg-gradient-to-b from-brand-accent/5 to-transparent overscroll-contain">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.24em] text-brand-accent">Playlist Health</div>
                        <div className="mt-1 text-[11px] leading-5 text-white/42">Duplicates, missing links, metadata, lyrics, and offline readiness.</div>
                      </div>
                      <div className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${focusedVaultHealth.score >= 80 ? 'border-brand-accent/35 bg-brand-accent/12 text-brand-accent' : focusedVaultHealth.score >= 55 ? 'border-amber-300/20 bg-amber-400/[0.06] text-amber-100/85' : 'border-red-400/20 bg-red-500/[0.06] text-red-200/85'}`}>
                        {focusedVaultHealth.score}% Health
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                      <HealthMetricCard label="Dupes" value={focusedVaultHealth.duplicates} tone={focusedVaultHealth.duplicates ? 'warn' : 'good'} />
                      <HealthMetricCard label="Links" value={focusedVaultHealth.missingLinks} tone={focusedVaultHealth.missingLinks ? 'danger' : 'good'} title="Tracks without a usable source link" />
                      <HealthMetricCard label="Metadata" value={focusedVaultHealth.weakMetadata} tone={focusedVaultHealth.weakMetadata ? 'warn' : 'good'} title="Tracks with weak title, artist, or artwork" />
                      <HealthMetricCard label="No Lyrics" value={focusedVaultHealth.noLyrics} tone={focusedVaultHealth.noLyrics ? 'neutral' : 'good'} />
                      <HealthMetricCard label="Offline" value={focusedVaultHealth.downloaded} tone={focusedVaultHealth.offlineReady ? 'good' : 'warn'} title={`${focusedVaultHealth.downloaded}/${focusedVaultHealth.total} downloaded`} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={handleCleanVault} disabled={isVaultCleaning} className="rounded-xl border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black disabled:opacity-45" title="Run the safe health fix across saved vaults">{isVaultCleaning ? 'Scanning...' : 'Fix Safe Issues'}</button>
                      {isStandalone && !focusedVaultHealth.offlineReady && (
                        <button onClick={() => onDownloadMissingForVault?.(focusedVaultTracks, focusedVaultName)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/56 transition-all hover:border-brand-accent/35 hover:text-brand-accent" title="Download tracks that are missing from offline storage">Download Missing</button>
                      )}
                    </div>
                  </div>
                  {focusedVaultVisibleTracks.map((track, tidx) => (
                    <StudioLibraryFocusedTrackRow
                      key={`${viewingPlaylist}-${tidx}`}
                      track={track}
                      getProxyUrl={getProxyUrl}
                      onQueue={queueLibraryTrack}
                      onToggleFavorite={toggleLibraryFavorite}
                      onRemove={() => removeFocusedTrack(track, tidx)}
                      isFavorite={isTrackFavorite}
                    />
                  ))}
                  {focusedVaultVisibleTracks.length === 0 && (
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-8 text-center">
                      <Search size={24} className="mx-auto text-white/25" />
                      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">No tracks match this search</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 pb-24 flex flex-col gap-3 bg-gradient-to-b from-brand-accent/5 to-transparent overscroll-contain">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/30">Library Health</div>
                      <div className="mt-1 text-[11px] leading-5 text-white/38">Aether checks duplicates, broken sources, weak metadata, missing lyrics, and offline coverage.</div>
                    </div>
                    <button onClick={handleCleanVault} disabled={isVaultCleaning} className="rounded-xl border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black disabled:opacity-45" title="Run Playlist Health">{isVaultCleaning ? 'Scanning...' : 'Run Health'}</button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-white/5 border border-white/8 p-3"><div className="text-brand-accent font-black text-lg">{libraryInsights.unique}</div><div className="text-[8px] uppercase tracking-[0.24em] text-white/30">Unique</div></div>
                    <div className="rounded-xl bg-white/5 border border-white/8 p-3"><div className="text-brand-accent font-black text-lg">{libraryInsights.total}</div><div className="text-[8px] uppercase tracking-[0.24em] text-white/30">Total</div></div>
                    <div className="rounded-xl bg-white/5 border border-white/8 p-3"><div className="text-brand-accent font-black text-lg">{libraryInsights.duplicates}</div><div className="text-[8px] uppercase tracking-[0.24em] text-white/30">Dupes</div></div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <HealthMetricCard label="Missing Links" value={libraryInsights.missingLinks} tone={libraryInsights.missingLinks ? 'danger' : 'good'} />
                    <HealthMetricCard label="Weak Meta" value={libraryInsights.weakMetadata} tone={libraryInsights.weakMetadata ? 'warn' : 'good'} />
                    <HealthMetricCard label="No Lyrics" value={libraryInsights.noLyrics} tone={libraryInsights.noLyrics ? 'neutral' : 'good'} />
                    <HealthMetricCard label="Not Offline" value={libraryInsights.notDownloaded} tone={libraryInsights.notDownloaded ? 'warn' : 'good'} />
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 text-center">Select a vault node to focus it here.</div>
                {isDoodleMode && (
                  <div className="flex items-center justify-center gap-2 opacity-70">
                    <img src={catDoodlePeek} alt="doodle" className="h-8 w-auto select-none pointer-events-none" draggable={false} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});
