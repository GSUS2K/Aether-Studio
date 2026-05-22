export function AppUtilityOverlays(props) {
  const {
  AnimatePresence, Eye, FullPlaylistOverlay, FullQueueOverlay, Globe, HardDrive, Heart, Loader2,
  PlaybackProgressIsland, Plus, Search, ToastPortal, X, YouTubeAuthOverlay, clearDiscoveryResults, closeHeaderSurfaces,
  compactLyric, currentTrack, discoveryItems, discoveryModeLabel, downloadedTracks, draggedQueueIndex, gestureNotice, getActivePlaybackPositionMs,
  getProxyUrl, handleAdd, handleImportCookies, handleRemoveFromPlaylist, handleSeek, hasCompletedSearch, idx, isFullDiscoveryContentReady,
  isFullPlaylistContentReady, isFullQueueContentReady, isOfflineMode, isPlayerOverlayOpen, isSearchActive, isStandalone, isTrackFavorite, isViewingFullDiscovery,
  isViewingFullPlaylist, isViewingFullQueue, motion, oauthPrompt, openLibraryOverlay, openTrackInspect, playlists, pulseCanvasRef,
  queue, reorderQueueByDrag, requestDestructiveConfirmation, resolveWarmupTrackId, searchResults, seekActivePlaybackTo, setDraggedQueueIndex, setIsPlayerOverlayOpen,
  setIsPlaying, setIsViewingFullDiscovery, setIsViewingFullPlaylist, setIsViewingFullQueue, setOauthPrompt, setQueue, toggleFavoriteTrack, track,
  trackProgressAccent, trackProgressGlow, visualizerMode, volume, volumeToast, youtubeAuthRequiredRef,
  } = props;

  return <>{/* GESTURE NOTICE TOAST */}<ToastPortal>
          <AnimatePresence>
            {gestureNotice && <motion.div key={gestureNotice} initial={{
        opacity: 0,
        y: 30,
        scale: 0.92
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: 16,
        scale: 0.95
      }} transition={{
        type: 'spring',
        stiffness: 420,
        damping: 30
      }} className="fixed bottom-24 left-1/2 z-[700] flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-brand-accent/30 bg-[#06100d]/94 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent shadow-[0_0_28px_rgba(0,255,191,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          
                <span>{gestureNotice}</span>
              </motion.div>}
          </AnimatePresence>
        </ToastPortal><ToastPortal>
          <AnimatePresence>
            {volumeToast && <motion.div initial={{
        opacity: 0,
        y: 50,
        scale: 0.9
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: 20,
        scale: 0.9
      }} className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[700] bg-brand-dark/95 backdrop-blur-xl border border-brand-accent/30 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(0,255,191,0.2)]">
          
                <div className="text-brand-accent font-black text-[10px] tracking-widest uppercase">Volume</div>
                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-accent shadow-[0_0_10px_#00ffbf]" style={{
            width: `${volume * 100}%`
          }} />
                </div>
                <div className="text-white font-mono text-[10px] w-8">{`${Math.round(volume * 100)}%`}</div>
              </motion.div>}
          </AnimatePresence>
        </ToastPortal><AnimatePresence>
          {isPlayerOverlayOpen && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[290] flex items-center justify-center p-4 md:p-6">
        
              <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={() => setIsPlayerOverlayOpen(false)} />
              <motion.div initial={{
        scale: 0.96,
        y: 20
      }} animate={{
        scale: 1,
        y: 0
      }} exit={{
        scale: 0.96,
        y: 20
      }} className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[2rem] border border-brand-accent/20 bg-[#090b0f]/95 shadow-[0_0_90px_rgba(0,255,191,0.14)] relative z-10 flex flex-col">
          
                <div className="p-5 md:p-6 border-b border-white/10 relative">
                  <div className="text-center px-16">
                    <div className="text-[9px] font-black uppercase tracking-[0.32em] text-white/30">Player Overlay</div>
                    {String(currentTrack?.title || 'Nothing Playing').length > 44 ? <div className="overlay-marquee mt-1 text-xl md:text-2xl font-black uppercase tracking-tight text-brand-accent">
                        <div className="overlay-marquee-track">
                          <span>{currentTrack?.title || 'Nothing Playing'}</span>
                          <span aria-hidden="true">{currentTrack?.title || 'Nothing Playing'}</span>
                          <span aria-hidden="true">{currentTrack?.title || 'Nothing Playing'}</span>
                          <span aria-hidden="true">{currentTrack?.title || 'Nothing Playing'}</span>
                        </div>
                      </div> : <div className="mt-1 text-xl md:text-2xl font-black uppercase tracking-tight text-brand-accent truncate">{currentTrack?.title || 'Nothing Playing'}</div>}
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 truncate mt-1">{currentTrack?.author || 'Awaiting signal'}</div>
                  </div>
                  <button onClick={() => setIsPlayerOverlayOpen(false)} className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 md:p-6 overflow-hidden flex-1 min-h-0">
                  <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5 flex flex-col items-center justify-center gap-4 min-h-0 min-w-0 h-full">
                    <img src={getProxyUrl(currentTrack?.thumbnail)} className="w-full max-w-[320px] aspect-square rounded-[1.75rem] object-cover border border-white/10 shadow-[0_0_50px_rgba(0,255,191,0.12)]" alt="" />
              
                    <div className="text-center min-w-0 w-full">
                      <div className="text-[9px] uppercase tracking-[0.28em] text-white/25">Now Playing</div>
                      {String(compactLyric || 'Lyric sync loading…').length > 56 ? <div className="overlay-marquee mt-1 text-lg font-black tracking-tight text-white/95">
                          <div className="overlay-marquee-track">
                            <span>{compactLyric || 'Lyric sync loading…'}</span>
                            <span aria-hidden="true">{compactLyric || 'Lyric sync loading…'}</span>
                            <span aria-hidden="true">{compactLyric || 'Lyric sync loading…'}</span>
                            <span aria-hidden="true">{compactLyric || 'Lyric sync loading…'}</span>
                          </div>
                        </div> : <div className="mt-1 text-lg font-black tracking-tight text-white/95 truncate">{compactLyric || 'Lyric sync loading…'}</div>}
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 truncate mt-1">{currentTrack?.author || 'No source'}</div>
                    </div>
                    <div className="w-full">
                      <PlaybackProgressIsland durationMs={currentTrack?.totalDurationMs || currentTrack?.duration || 0} getPositionMs={getActivePlaybackPositionMs} onSeek={handleSeek} accent={trackProgressAccent} glow={trackProgressGlow} barClassName="h-2 rounded-full bg-white/10 overflow-hidden cursor-pointer" fillClassName="h-full w-full bg-brand-accent shadow-[0_0_10px_#00ffbf]" timeRowClassName="mt-2 flex items-center justify-between text-[10px] font-mono text-white/35" />
                
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence><YouTubeAuthOverlay prompt={oauthPrompt} isStandalone={isStandalone} onImportCookies={handleImportCookies} onDismiss={() => {
    youtubeAuthRequiredRef.current = false;
    setOauthPrompt(null);
  }} />{/* FULL DISCOVERY OVERLAY */}<AnimatePresence>
          {!isOfflineMode && isViewingFullDiscovery && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        
              <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-[20px]" onClick={() => setIsViewingFullDiscovery(false)} />
              <motion.div initial={{
        scale: 0.95,
        y: 20
      }} animate={{
        scale: 1,
        y: 0
      }} exit={{
        scale: 0.95,
        y: 20
      }} className="w-full max-w-2xl max-h-[80vh] glass-card bg-brand-dark/60 border-brand-accent/20 rounded-3xl flex flex-col overflow-hidden relative z-10">
          
                <div className="flex items-center justify-between p-6 border-b border-brand-accent/10">
                  <div className="flex items-center gap-3">
                    <Globe size={20} className="text-brand-accent" />
                    <div>
                      <h2 className="text-lg font-black uppercase tracking-tighter text-white">Neural Discovery</h2>
                      <p className="text-brand-accent text-xs font-bold tracking-widest uppercase opacity-60">{discoveryItems.length} {discoveryModeLabel}{discoveryItems.length !== 1 ? 'S' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(searchResults.length > 0 || hasCompletedSearch) && <button onClick={clearDiscoveryResults} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-[0.22em] text-white/50 hover:text-red-400 transition-all">
                
                        Flush
                      </button>}
                    <button onClick={() => setIsViewingFullDiscovery(false)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-all">
                
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  <div className="flex flex-col gap-2">
                    {!isFullDiscoveryContentReady ? <div className="h-40 flex flex-col items-center justify-center gap-3 text-center opacity-40">
                        <Loader2 size={26} className="animate-spin text-brand-accent/60" />
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">Preparing Discovery</div>
                      </div> : discoveryItems.length > 0 ? discoveryItems.map((track, idx) => <motion.div key={`discovery-full-${track.id}-${idx}`} className="performance-list-item group glass-card p-4 flex items-center gap-4 rounded-xl transition-all bg-white/5 border border-white/10 hover:border-brand-accent/30 hover:bg-brand-accent/5">
                
                        <div className="text-brand-accent font-black text-sm w-6">{idx + 1}</div>
                        <img src={getProxyUrl(track.thumbnail)} className="w-10 h-10 rounded-lg object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-black truncate uppercase tracking-widest">{track.title}</div>
                          <div className="text-[10px] font-bold text-white/40 truncate uppercase mt-1">{track.author}</div>
                        </div>
                        <button onClick={() => openTrackInspect(track, isSearchActive ? 'discovery' : 'recommendation')} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/5 hover:bg-brand-accent/20 hover:text-brand-accent text-white/45 transition-all" title="Inspect Track">
                  
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleAdd(track)} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-accent transition-all" title="Add to Queue">
                  
                          <Plus size={14} />
                        </button>
                        <button onClick={() => toggleFavoriteTrack(track)} className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all ${isTrackFavorite(track) ? 'bg-rose-400/15 text-rose-300' : 'bg-white/5 hover:bg-rose-400/15 hover:text-rose-300 text-white/45'}`} title={isTrackFavorite(track) ? 'Remove from Favorites' : 'Add to Favorites'}>
                  
                          <Heart size={14} fill={isTrackFavorite(track) ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={() => openLibraryOverlay({
                type: 'track',
                items: [track]
              })} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/5 hover:bg-brand-accent/20 hover:text-brand-accent text-white/45 transition-all" title="Save to Vault">
                  
                          <HardDrive size={14} />
                        </button>
                      </motion.div>) : hasCompletedSearch ? <div className="h-40 flex flex-col items-center justify-center gap-3 text-center">
                        <Search size={28} className="text-brand-accent/60" strokeWidth={1.4} />
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/55">No Results Found</div>
                          <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">Flush discovery to return to the default panel state.</div>
                        </div>
                      </div> : <div className="h-40 flex flex-col items-center justify-center gap-3 text-center opacity-40">
                        <Search size={28} className="text-white/30" strokeWidth={1.2} />
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">Awaiting Content</div>
                      </div>}
                  </div>
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence><FullQueueOverlay open={isViewingFullQueue} queue={queue} downloadedTracks={downloadedTracks} draggedQueueIndex={draggedQueueIndex} isContentReady={isFullQueueContentReady} getProxyUrl={getProxyUrl} resolveWarmupTrackId={resolveWarmupTrackId} requestDestructiveConfirmation={requestDestructiveConfirmation} reorderQueueByDrag={reorderQueueByDrag} setDraggedQueueIndex={setDraggedQueueIndex} setIsViewingFullQueue={setIsViewingFullQueue} setQueue={setQueue} /><FullPlaylistOverlay openName={isViewingFullPlaylist} playlists={playlists} isContentReady={isFullPlaylistContentReady} getProxyUrl={getProxyUrl} closeHeaderSurfaces={closeHeaderSurfaces} handleAdd={handleAdd} handleRemoveFromPlaylist={handleRemoveFromPlaylist} seekActivePlaybackTo={seekActivePlaybackTo} setIsPlaying={setIsPlaying} setIsViewingFullPlaylist={setIsViewingFullPlaylist} setQueue={setQueue} /><div className="fixed inset-0 pointer-events-none z-[-2] overflow-hidden select-none bg-black">
          {/* Baseline Neural Glow (Optimized) */}
          <div className="absolute inset-0 bg-brand-accent/5 backdrop-blur-[60px] animate-pulse" />

          {/* Global Neural Aura (Pulse) - NOVA Optimized */}
          <div className="absolute inset-0 flex items-center justify-center scale-150 transform-gpu will-change-transform">
            <canvas ref={pulseCanvasRef} width={400} height={400} className={`aether-visualizer-canvas w-[800px] h-[800px] transition-opacity duration-1000 ${visualizerMode === 'pulse' ? 'opacity-55' : 'opacity-0'}`} />
        
          </div>
          <div className="absolute inset-0 bg-black/60" />
        </div></>;
}
