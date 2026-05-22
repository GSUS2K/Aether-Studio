import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Download, Eye, Globe, HardDrive, Heart, Maximize2, Play, Plus, Search, Shuffle } from 'lucide-react';
import { StudioLibraryPlaylistRow, StudioLibrarySongRow } from './StudioLibraryOverlay';

export const DiscoveryGridSection = memo(function DiscoveryGridSection({
  discoveryItems,
  isSearching,
  searchResults,
  hasCompletedSearch,
  isTrackFavorite,
  openTrackInspect,
  isSearchActive,
  handleAdd,
  toggleFavoriteTrack,
  openLibraryOverlay,
  isDoodleMode,
  catDoodlePeek,
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-6">
      <AnimatePresence>
        {discoveryItems.map((t) => (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} key={t.id} className="performance-list-item glass-card p-4 flex items-center gap-4 hover:border-brand-accent group overflow-hidden relative transition-all active:scale-[0.98] border-white/5">
            <img src={window.__AETHER_PROXY_URL?.(t.thumbnail) || t.thumbnail} className="w-14 h-14 rounded-2xl object-cover z-10" alt="" />
            <div className="flex-1 min-w-0 z-10">
              <div className="text-[13px] font-black truncate group-hover:text-brand-accent transition-colors uppercase tracking-widest">{t.title}</div>
              <div className="text-[10px] text-brand-text-dim truncate font-bold opacity-50 mt-1 uppercase leading-none">{t.author}</div>
            </div>
            <div className="flex items-center gap-2 z-10">
              <button onClick={() => openTrackInspect(t, isSearchActive ? 'discovery' : 'recommendation')} className="w-10 h-10 rounded-xl bg-white/5 text-white/30 flex items-center justify-center hover:bg-brand-accent/20 hover:text-brand-accent transition-all border border-white/10" title="Inspect Track">
                <Eye size={18} />
              </button>
              <button onClick={() => handleAdd(t)} className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center hover:bg-brand-accent hover:text-brand-dark transition-all border border-brand-accent/20">
                <Plus size={22} />
              </button>
              <button onClick={() => toggleFavoriteTrack(t)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${isTrackFavorite(t) ? 'bg-rose-400/15 text-rose-300 border-rose-300/30' : 'bg-white/5 text-white/30 hover:bg-rose-400/15 hover:text-rose-300 border-white/10 hover:border-rose-300/30'}`} title={isTrackFavorite(t) ? 'Remove from Favorites' : 'Add to Favorites'}>
                <Heart size={17} fill={isTrackFavorite(t) ? 'currentColor' : 'none'} />
              </button>
              <button onClick={() => openLibraryOverlay({ type: 'track', items: [t] })} className="w-10 h-10 rounded-xl bg-white/5 text-white/30 flex items-center justify-center hover:bg-brand-accent/20 hover:text-brand-accent transition-all border border-white/10">
                <HardDrive size={18} />
              </button>
            </div>
            <div className="absolute inset-0 bg-brand-accent/[0.05] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </motion.div>
        ))}
      </AnimatePresence>
      {!isSearching && searchResults.length === 0 && window.__AETHER_NEURAL_RECS?.length === 0 && !hasCompletedSearch && (
        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-10 text-center py-4">
          <div className="relative">
            <Search size={32} strokeWidth={1} />
            <div className="absolute inset-0 blur-xl bg-brand-accent/30 animate-pulse" />
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.4em]">Awaiting Content</p>
          {isDoodleMode && <img src={catDoodlePeek} alt="doodle" className="h-10 w-auto opacity-75 select-none pointer-events-none" draggable={false} />}
        </div>
      )}
      {!isSearching && searchResults.length === 0 && hasCompletedSearch && (
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-4 opacity-40">
          <div className="relative text-brand-accent/70">
            <Search size={30} strokeWidth={1.4} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-white/60">No Results Found</p>
            <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.25em] text-white/30 max-w-[220px] mx-auto">
              Try a different title, artist, or fewer words.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export const OfflineAvailablePanel = memo(function OfflineAvailablePanel({
  tracks,
  query,
  getProxyUrl,
  handleAdd,
  openTrackInspect,
  isTrackFavorite,
  toggleFavoriteTrack,
  isDoodleMode,
  catDoodlePeek,
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-6 custom-scrollbar">
      {tracks.length > 0 ? tracks.map((track) => (
        <div key={`offline-${track.offlineKey || track.id}`} className="performance-list-item group glass-card p-3 flex items-center gap-4 border-white/5 hover:border-brand-accent/30 transition-all">
          <img src={getProxyUrl(track.thumbnail)} className="w-12 h-12 rounded-xl object-cover bg-white/[0.04] border border-white/10" alt="" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-black truncate uppercase tracking-widest text-white group-hover:text-brand-accent transition-colors">{track.title || 'Downloaded Track'}</div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35 truncate">{track.author || 'Available Offline'}</div>
            {track.offlineSource && <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-brand-accent/45 truncate">{track.offlineSource}</div>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => handleAdd(track)} className="h-9 w-9 rounded-xl border border-brand-accent/20 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-black transition-all flex items-center justify-center" title="Queue offline track"><Plus size={16} /></button>
            <button onClick={() => toggleFavoriteTrack(track)} className={`h-9 w-9 rounded-xl border transition-all flex items-center justify-center ${isTrackFavorite(track) ? 'bg-rose-400/15 text-rose-300 border-rose-300/30' : 'bg-white/5 text-white/30 border-white/10 hover:text-rose-300 hover:border-rose-300/30'}`} title={isTrackFavorite(track) ? 'Remove from Favorites' : 'Add to Favorites'}><Heart size={15} fill={isTrackFavorite(track) ? 'currentColor' : 'none'} /></button>
            <button onClick={() => openTrackInspect(track, 'offline-library')} className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-white/35 hover:text-brand-accent hover:border-brand-accent/30 transition-all flex items-center justify-center" title="Inspect downloaded track"><Eye size={15} /></button>
          </div>
        </div>
      )) : (
        <div className="h-full flex flex-col items-center justify-center gap-3 py-12 text-center opacity-35">
          <HardDrive size={30} strokeWidth={1.4} />
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">
            {query ? 'No downloaded match' : 'No downloaded tracks'}
          </div>
          <div className="max-w-[240px] text-[8px] font-bold uppercase tracking-[0.2em] text-white/35">
            {query ? 'Try another header search.' : 'Download tracks in Online Mode to make them available offline.'}
          </div>
          {isDoodleMode && <img src={catDoodlePeek} alt="doodle" className="mt-2 h-10 w-auto opacity-70 select-none pointer-events-none" draggable={false} />}
        </div>
      )}
    </div>
  );
});

// ===  LIBRARY CONTENT SECTIONS (Memoized) ===
export const LibrarySongRowsGrid = memo(function LibrarySongRowsGrid({
  libraryVisibleSongEntries,
  getProxyUrl,
  openTrackInspect,
  handleAdd,
  toggleFavoriteTrack,
  isTrackFavorite,
  handleRemoveTrackEverywhere,
  getTrackPlayCount,
  getTrackLastListenedMs,
  getTrackAddedMs,
}) {
  return (
    <div className="space-y-2 flex-1 overflow-y-auto pb-4 custom-scrollbar">
      {libraryVisibleSongEntries.map((entry) => (
        <StudioLibrarySongRow
          key={entry.track.id}
          entry={entry}
          getProxyUrl={getProxyUrl}
          onInspect={openTrackInspect}
          onQueue={handleAdd}
          onToggleFavorite={toggleFavoriteTrack}
          onDelete={handleRemoveTrackEverywhere}
          isFavorite={isTrackFavorite}
          getTrackPlayCount={getTrackPlayCount}
          getTrackLastListenedMs={getTrackLastListenedMs}
          getTrackAddedMs={getTrackAddedMs}
        />
      ))}
    </div>
  );
});

// === LIBRARY PLAYLIST ROWS (Memoized) ===
export const LibraryPlaylistRowsGrid = memo(function LibraryPlaylistRowsGrid({
  libraryVisiblePlaylistNames,
  showFavoriteLibraryCard,
  isRenamingPlaylist,
  renameValue,
  setRenameValue,
  setIsRenamingPlaylist,
  viewingPlaylist,
  handleRenamePlaylist,
  movePlaylist,
  handleExportVault,
  handleDeletePlaylist,
  addPendingToVault,
  currentTrack,
  canAddPendingToVault,
  isStandalone,
  draggedPlaylistName,
  setDraggedPlaylistName,
  reorderPlaylistByDrag,
  playlists,
  clearLibrarySearch,
  updateLibraryFilter,
}) {
  return (
    <div className="space-y-2 flex-1 overflow-y-auto pb-4 custom-scrollbar">
      {showFavoriteLibraryCard && (
        <StudioLibraryPlaylistRow
          name="Favorite Songs"
          isRenaming={false}
          renameValue=""
          setRenameValue={() => { }}
          setIsRenamingPlaylist={() => { }}
          viewingPlaylist={viewingPlaylist}
          onView={() => { }}
          onMove={() => { }}
          onExport={() => { }}
          onDelete={() => { }}
          onAddPendingToVault={addPendingToVault}
          currentTrack={currentTrack}
          onRename={() => { }}
          canAddPendingToVault={canAddPendingToVault}
          isStandalone={isStandalone}
          draggedPlaylistName={draggedPlaylistName}
          setDraggedPlaylistName={setDraggedPlaylistName}
          reorderPlaylistByDrag={reorderPlaylistByDrag}
          playlistCount={0}
        />
      )}
      {libraryVisiblePlaylistNames.map((name, index) => (
        <StudioLibraryPlaylistRow
          key={name || `library-browser-vault-${index}`}
          name={name}
          isRenaming={isRenamingPlaylist === name}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          setIsRenamingPlaylist={setIsRenamingPlaylist}
          viewingPlaylist={viewingPlaylist}
          onView={() => { }}
          onMove={movePlaylist}
          onExport={handleExportVault}
          onDelete={handleDeletePlaylist}
          onAddPendingToVault={addPendingToVault}
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
    </div>
  );
});
