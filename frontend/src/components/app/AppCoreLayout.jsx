export function AppCoreLayout(props) {
  const {
  Activity, AnimatePresence, BookOpen, ChevronLeft, ChevronRight, DiscoveryGridSection, Download, Edit3,
  Eye, FAVORITES_PLAYLIST_ID, FAVORITES_PLAYLIST_NAME, FastForward, Globe, HardDrive, Heart, ListMusic,
  Loader2, Maximize2, Music, OfflineAvailablePanel, Pause, Play, PlaybackProgressIsland, PlayerActionButtons,
  PlayerModePill, PlayerTransportControls, Plus, QueueBufferHeader, RefreshCw, Repeat, Rewind, RotateCcw,
  Save, Shuffle, Signal, Trash2, Upload, Volume2, Zap, alphaHex,
  artist, auraCardBorder, auraCardShadow, auraPanelBorder, auraPanelShadow, autoplayMenuButtonRef, autoplayMenuStyle, autoplayMoodMode,
  beatRingsRef, canDownloadCurrentTrack, canOpenCurrentSource, catDoodlePeek, cleanQueueBuffer, clearDiscoveryResults, closeHeaderSurfaces, currentManualLyricsLines,
  currentTrack, currentTrackSourceUrl, currentTrackTitle, cycleRepeatMode, discoveryItems, downloadedTracks, dualVisualStageWidth, e,
  favoriteTracksList, featuredTrack, getActivePlaybackPositionMs, getProxyUrl, handleAdd, handleCleanVault, handleControl, handleDeletePlaylist,
  handleDownloadCurrentTrack, handleExportVault, handleFavoriteAddAll, handleFavoritePlayAll, handleGenerateSmartMix, handleImportVault, handlePlaylistAddAll, handleRemove,
  handleRenamePlaylist, handleResetLyricPreset, handleResyncLyrics, handleSaveLyricPreset, handleSeek, handleSync, handleVolumeChange, hasCompletedSearch,
  hasLyricPreset, i, idx, immersiveBeatIntensity, index, isAudioBuffering, isAuraMode, isAutoScrollPaused,
  isAutoplayEnabled, isAutoplayMenuOpen, isDoodleMode, isDownloaded, isDownloadingTrack, isDualVisualMode, isDualWorkspaceMode, isFocusedMode,
  isImmersiveLyricsLocked, isLyricPresetSaved, isLyricsExpanded, isLyricsLoading, isOfflineMode, isPlaying, isRenamingPlaylist, isSearchActive,
  isSearching, isStandalone, isTrackFavorite, isVaultCleaning, isVaultImporting, isVerticalStack, leftWorkspaceClass, libraryInsights,
  lyricOffsetMs, lyricPresetActionLabel, lyrics, lyricsContainerRef, lyricsHeaderEyebrow, lyricsListClass, lyricsPanelHeightClass, lyricsViewportClass,
  memoizedLyricsContent, motion, movePlaylist, name, offlineAvailableTracks, offlineLibrarySearchTerm, offlineVisibleTracks, openLibraryOverlay,
  openManualLyricsEditor, openMusicImport, openPlaylistInspect, openTrackInspect, orderedPlaylistNames, panelGlassClass, panelHeaderClass, panelInteractiveClass,
  playButtonRef, playDownloadedOnly, playerCardClass, playerTitleClass, playlists, prev, previewTracks, queue,
  renameValue, repeatMode, repeatModeBadge, repeatModeLabel, resolveWarmupTrackId, searchResults, seekActivePlaybackTo, setAutoplayMoodMode,
  setIsAutoScrollPaused, setIsAutoplayEnabled, setIsAutoplayMenuOpen, setIsFocusedMode, setIsLyricsExpanded, setIsPlayerOverlayOpen, setIsPlaying, setIsRenamingPlaylist,
  setIsViewingFullDiscovery, setIsViewingFullPlaylist, setIsViewingFullQueue, setLastAdded, setOfflineLibrarySearchTerm, setQueue, setRenameValue, setViewingPlaylist,
  shortcutLabel, showSecondaryColumn, showShortcutHints, shuffled, switchVideoMode, themeColor, tidx, toggleFavoriteTrack,
  track, trackControlAccent, trackControlGlow, trackProgressAccent, trackProgressGlow, vaultTracks, videoMode, visualizerCanvasRef,
  visualizerMode, volume, warmupId,
  } = props;

  return <><main className={`aether-depth-stage flex-1 relative z-10 w-full mb-0 min-h-0 px-4 md:px-6 py-4 ${isVerticalStack ? '!flex !flex-col !gap-8 overflow-y-auto scroll-smooth pb-20 custom-scrollbar' : 'flex flex-row gap-4 overflow-hidden'}`} style={{
    scale: 1,
    paddingRight: isDualVisualMode && !isVerticalStack ? `calc(${dualVisualStageWidth} + 1.25rem)` : undefined
  }}>
      

          {/* PLAYER & LYRICS PILLAR */}
          <div className={`performance-island flex flex-col gap-4 min-w-0 overflow-hidden ${leftWorkspaceClass}`}>

            {/* PLAYER CARD */}
            {isDualWorkspaceMode ? <div className={`performance-island glass-card relative overflow-hidden shrink-0 rounded-[2.35rem] border border-white/[0.08] px-4 py-4 md:px-5 md:py-4 transition-all duration-500 ${isAuraMode ? 'bg-white/[0.02] border-white/[0.14] backdrop-blur-[28px] shadow-[0_20px_70px_rgba(0,0,0,0.26)]' : 'bg-[#080b10]/88'}`} style={isAuraMode ? {
        boxShadow: auraPanelShadow,
        borderColor: auraPanelBorder
      } : undefined}>
          
                {currentTrack ? <div className="relative z-10 flex flex-col gap-3">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="label-caps mb-0 text-brand-accent/75 text-[9px] tracking-[0.24em]">Dual Stage</span>
                          <span className="rounded-full border border-brand-accent/20 bg-brand-accent/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-brand-accent/80">
                            Main Player
                          </span>
                        </div>
                        <div className="mt-1 text-lg md:text-xl font-black text-white/95 leading-tight uppercase tracking-tight line-clamp-2">{currentTrack.title}</div>
                        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.26em] text-brand-accent/70 truncate">{currentTrack.author}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={cycleRepeatMode} className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border transition-all active:scale-95 ${repeatMode === 'off' ? 'border-white/10 bg-white/[0.04] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent' : 'border-brand-accent/30 bg-brand-accent/12 text-brand-accent shadow-[0_0_16px_rgba(0,255,191,0.16)]'}`} title={repeatModeLabel}>
                  
                          <Repeat size={16} />
                          {repeatModeBadge && <span className="absolute right-1.5 top-1.5 text-[8px] font-black leading-none">{repeatModeBadge}</span>}
                        </button>
                        <button onClick={() => handleControl('previous')} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-brand-accent/30 hover:text-brand-accent active:scale-95" title="Previous">
                          <Rewind size={18} fill="currentColor" />
                        </button>
                        <button onClick={() => handleControl(isPlaying ? 'pause' : 'resume')} className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] text-black transition-all hover:scale-[1.03] active:scale-95" style={{
                background: trackControlAccent,
                boxShadow: `0 0 22px ${trackControlGlow}`
              }} title={isPlaying ? 'Pause' : 'Play'}>
                          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                        </button>
                        <button onClick={() => handleControl('skip')} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-brand-accent/30 hover:text-brand-accent active:scale-95" title="Next">
                          <FastForward size={18} fill="currentColor" />
                        </button>
                      </div>
                    </div>

                    <PlaybackProgressIsland durationMs={currentTrack.totalDurationMs || currentTrack.duration || 0} getPositionMs={getActivePlaybackPositionMs} onSeek={handleSeek} accent={trackProgressAccent} glow={trackProgressGlow} middleContent={<PlayerModePill videoMode={videoMode} switchVideoMode={switchVideoMode} variant="dual" isOfflineMode={isOfflineMode} />} />
            
                  </div> : <div className="flex h-28 items-center justify-center text-white/25">Standby</div>}
              </div> : <div className={`performance-island glass-card flex relative overflow-hidden group shrink-0 transition-all duration-700 flex-col sm:flex-row flex-none rounded-[3.5rem] shadow-2xl transition-all ${playerCardClass} ${isAuraMode ? 'bg-white/[0.015] border-white/[0.14] backdrop-blur-[30px] shadow-[0_24px_90px_rgba(0,0,0,0.32)]' : 'border-white/5'}`} style={isAuraMode ? {
        boxShadow: auraCardShadow,
        borderColor: auraCardBorder,
        transition: 'box-shadow 80ms linear, border-color 80ms linear'
      } : undefined}>
          
                {isAuraMode && <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(120% 85% at 50% 0%, rgba(0,255,191,${0.06 + immersiveBeatIntensity * 0.16}) 0%, rgba(0,255,191,0) 72%)`,
          opacity: 0.85
        }} />}
                {/* TOP BAR / NAVIGATION */}
                {currentTrack && <div className="absolute inset-0 blur-[120px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                    <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="w-full h-full object-cover" />
                  </div>}

                {/* HIGH-FIDELITY CANVAS VISUALIZER (BTM BAR) */}
                <canvas ref={visualizerCanvasRef} width={800} height={40} className={`aether-visualizer-canvas absolute bottom-0 left-0 right-0 w-full h-[32px] pointer-events-none z-20 transition-opacity duration-500 ${visualizerMode === 'bars' ? 'opacity-50' : 'opacity-0'}`} />
          

                {currentTrack ? <>
                    {/* NEURAL BUFFERING OVERLAY */}
                    {isAudioBuffering && <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[2.5rem]">
              
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-t-2 border-brand-accent rounded-full animate-spin shadow-[0_0_20px_#00ffbf]" />
                          <div className="text-brand-accent font-black text-[10px] tracking-[0.5em] uppercase animate-pulse">Neural Buffering...</div>
                        </div>
                      </motion.div>}
                    <div className="flex flex-col md:flex-row gap-8 lg:gap-12 flex-1 relative z-10 w-full">
                      {/* LEFT: THUMBNAIL + VOLUME */}
                      <div className="flex flex-col gap-6 items-center flex-none transition-all duration-500">
                
                        <div className="w-48 h-48 md:w-56 md:h-56 lg:w-60 lg:h-60 relative group flex-none rounded-[2.5rem] overflow-hidden drop-shadow-2xl">
                          <img src={getProxyUrl(currentTrack.thumbnail)} className="absolute inset-0 w-full h-full object-cover shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-700" alt="" />
                          <div className="absolute inset-0 bg-brand-accent/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center">
                            <Activity className="text-brand-accent animate-pulse" size={32} />
                          </div>
                        </div>

                        {/* COMPACT VOLUME UNIT */}
                        <div className={`w-full flex flex-col gap-2 px-2 p-3 rounded-2xl border ${isAuraMode ? 'bg-white/[0.03] border-white/[0.14] backdrop-blur-xl' : 'bg-white/5 border-white/5'}`}>
                          <div className="flex items-center justify-between">
                            <button onClick={() => handleControl('mute')} className="hover:text-brand-accent transition-colors active:scale-90">
                              <Volume2 size={12} className={volume === 0 ? 'text-red-500' : 'text-brand-accent/50'} />
                            </button>
                            <span className="text-[9px] font-mono text-brand-accent font-black tracking-widest">{Math.round(volume * 100)}%</span>
                          </div>
                          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => handleVolumeChange(e.target.value)} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-accent" />
                        </div>
                      </div>

                      {/* RIGHT: METADATA + SEEKER + TRANSPORT */}
                      <div className="flex flex-col flex-1 min-w-0 py-0">
                        <div className="mb-6">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="label-caps mb-0 text-brand-accent/60 text-[9px] flex items-center gap-2 tracking-[0.28em] uppercase font-black">
                              <span className="w-1 h-1 rounded-full bg-brand-accent animate-pulse" />
                              {isAudioBuffering ? "Buffering" : "Now Playing"}
                            </div>
                            <PlayerActionButtons canDownloadCurrentTrack={canDownloadCurrentTrack} canOpenCurrentSource={canOpenCurrentSource} currentTrack={currentTrack} currentTrackSourceUrl={currentTrackSourceUrl} cycleRepeatMode={cycleRepeatMode} handleControl={handleControl} handleDownloadCurrentTrack={handleDownloadCurrentTrack} isCurrentTrackFavorite={isTrackFavorite(currentTrack)} isDownloadingTrack={isDownloadingTrack} isFocusedMode={isFocusedMode} openLibraryOverlay={openLibraryOverlay} openTrackInspect={openTrackInspect} queueLength={queue.length} repeatMode={repeatMode} repeatModeBadge={repeatModeBadge} repeatModeLabel={repeatModeLabel} setIsFocusedMode={setIsFocusedMode} setIsPlayerOverlayOpen={setIsPlayerOverlayOpen} toggleFavoriteTrack={toggleFavoriteTrack} />
                    
                          </div>
                          <h1 className={`${playerTitleClass} font-black text-white/95 leading-none uppercase tracking-tighter mb-2 line-clamp-2 transition-all duration-700`} style={{
                  textShadow: visualizerMode === 'pulse' ? `0 0 20px ${themeColor}44` : 'none'
                }}>{currentTrack.title}</h1>
                          <p className="text-brand-accent text-xs font-black uppercase tracking-[0.3em] opacity-80 transition-all duration-700" style={{
                  textShadow: visualizerMode === 'pulse' ? `0 0 10px ${themeColor}88` : 'none'
                }}>{currentTrack.author}</p>
                        </div>

                        <div className="mt-auto space-y-6">
                          <PlaybackProgressIsland durationMs={currentTrack.totalDurationMs || currentTrack.duration || 0} getPositionMs={getActivePlaybackPositionMs} onSeek={handleSeek} accent={trackProgressAccent} glow={trackProgressGlow} barClassName="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative group cursor-pointer" fillClassName="absolute inset-0 left-0 w-full" timeRowClassName="flex justify-between text-[10px] font-mono text-white/30 font-black tracking-widest uppercase" />
                  

                          {/* COMPACT TRANSPORT CLUSTER - CENTERED */}
                          <PlayerTransportControls beatRingsRef={beatRingsRef} handleControl={handleControl} isAuraMode={isAuraMode} isPlaying={isPlaying} playButtonRef={playButtonRef} playPauseShortcutLabel={shortcutLabel('playPause')} trackControlAccent={trackControlAccent} trackControlGlow={trackControlGlow} showShortcutHints={showShortcutHints} />
                  

                          {/* VIDEO MODE TOGGLE PILL */}
                          {currentTrack && isStandalone && <div className="flex items-center justify-center mt-4">
                              <PlayerModePill videoMode={videoMode} switchVideoMode={switchVideoMode} isOfflineMode={isOfflineMode} />
                            </div>}
                        </div>
                      </div>
                    </div>
                  </> : <div className="w-full h-64 flex flex-col items-center justify-center gap-6 opacity-10">
                    <Music size={80} className="text-brand-text-dim animate-pulse" strokeWidth={1} />
                    <div className="label-caps text-xl tracking-[0.5em]">Network Standby</div>
                  </div>}
              </div>}


            {/* LYRICS PANEL - FLEX-1 TO FILL GAP */}
            <div className={`performance-island glass-card overflow-hidden flex flex-col transition-all duration-300 min-h-0 ${panelGlassClass} ${panelInteractiveClass} ${lyricsPanelHeightClass}`} style={{
        ...(isAuraMode ? {
          boxShadow: auraPanelShadow,
          borderColor: auraPanelBorder,
          transition: 'box-shadow 80ms linear, border-color 80ms linear'
        } : {})
      }}>
          
              <div className={`border-b border-white/5 ${panelHeaderClass} ${isVerticalStack ? 'px-3 py-2' : 'px-5 py-4'}`}>
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="flex items-start gap-3 min-w-0 flex-1 overflow-hidden">
                    <div className="w-9 h-9 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent flex-none shadow-[0_0_18px_rgba(0,255,191,0.15)]">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="label-caps mb-0 text-[9px] tracking-[0.1em] uppercase truncate shrink">{lyricsHeaderEyebrow}</span>
                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.18em] border ${currentManualLyricsLines.length > 0 ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent' : isLyricsLoading ? 'bg-white/5 border-white/10 text-white/50' : isPlaying ? lyrics.length > 0 ? 'bg-white/5 border-white/10 text-white/65' : 'bg-white/5 border-white/10 text-white/45' : 'bg-white/5 border-white/10 text-white/45'}`}>
                          {currentManualLyricsLines.length > 0 ? 'Manual' : isLyricsLoading ? 'Fetching' : isPlaying ? lyrics.length > 0 ? 'Synced' : 'Decoding' : lyrics.length > 0 ? 'Ready' : 'Idle'}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/35 truncate">
                        {currentManualLyricsLines.length > 0 ? `${currentManualLyricsLines.length} saved line${currentManualLyricsLines.length === 1 ? '' : 's'} for ${currentTrack?.title || currentTrackTitle || 'this track'}` : currentTrack?.title ? currentTrack.title : 'No track selected'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 no-drag flex-none shrink-0 ml-2 flex-wrap justify-end">
                    <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1 group/sync relative overflow-hidden">
                      <button onClick={() => handleSync(-500)} className="p-2 hover:text-brand-accent" title="Shift lyrics backward 500ms"><ChevronLeft size={18} /></button>
                      <span className="text-[10px] font-mono text-brand-accent font-black w-14 text-center">{lyricOffsetMs}ms</span>
                      <button onClick={() => handleSync(500)} className="p-2 hover:text-brand-accent" title="Shift lyrics forward 500ms"><ChevronRight size={18} /></button>
                    </div>
                    <button onClick={openManualLyricsEditor} className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${currentManualLyricsLines.length > 0 ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent' : 'bg-white/5 border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/40'}`} title={currentManualLyricsLines.length > 0 ? 'Edit saved manual lyrics' : 'Add manual lyrics for this track'}>
                  
                      <Edit3 size={10} /> {currentManualLyricsLines.length > 0 ? 'Edit' : 'Add'}
                    </button>
                    <button onClick={handleSaveLyricPreset} className={`hidden md:flex items-center gap-1 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${isLyricPresetSaved ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent' : 'bg-white/5 border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/40'}`} title={hasLyricPreset ? 'Update saved sync offset for this track' : 'Save current sync offset for this track'}>
                  
                      <Save size={10} /> {lyricPresetActionLabel}
                    </button>
                    <button onClick={handleResetLyricPreset} className="hidden md:flex items-center gap-1 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all bg-white/5 border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/40" title="Reset sync for this track">
                  
                      <RotateCcw size={10} /> Reset
                    </button>
                    <button onClick={() => {
                if (isImmersiveLyricsLocked) return;
                if (!isLyricsExpanded) closeHeaderSurfaces();
                setIsLyricsExpanded(prev => !prev);
              }} disabled={isImmersiveLyricsLocked} className={`flex items-center justify-center p-2 w-8 h-8 rounded-xl border transition-all text-brand-accent group flex-none ${isImmersiveLyricsLocked ? 'bg-brand-accent/12 border-brand-accent/30 text-brand-accent/80 cursor-default' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-brand-accent active:scale-90'}`} title={isImmersiveLyricsLocked ? 'Immersive lyrics are unavailable while the visual stage is active' : 'Immersive Output'}>
                  
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto scroll-smooth relative ${lyricsViewportClass}`} ref={lyricsContainerRef} onWheel={() => setIsAutoScrollPaused(true)} onTouchStart={() => setIsAutoScrollPaused(true)}>
                {isDualWorkspaceMode && <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full" animate={{
            opacity: 0.12 + immersiveBeatIntensity * 0.34,
            scale: 1 + immersiveBeatIntensity * 0.22
          }} transition={{
            duration: 0.22,
            ease: 'easeOut'
          }} style={{
            width: 'min(72vw, 760px)',
            height: 'min(72vw, 760px)',
            background: `radial-gradient(circle, ${themeColor}${alphaHex(0.18)} 0%, ${themeColor}${alphaHex(0.07)} 36%, transparent 72%)`,
            filter: `blur(${30 + immersiveBeatIntensity * 22}px)`,
            willChange: 'transform, opacity, filter'
          }} />}
                {isAutoScrollPaused && lyrics.length > 0 && <button onClick={handleResyncLyrics} className="sticky top-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-brand-accent text-black font-black text-[10px] uppercase tracking-widest rounded-full shadow-neon translate-y-4 animate-bounce hover:scale-105 transition-transform">
              
                    <RotateCcw size={12} /> Resume Sync
                  </button>}
                {isLyricsLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-brand-accent" size={48} /></div> : lyrics.length > 0 ? <div className={lyricsListClass}>
                    {memoizedLyricsContent}
                  </div> : <div className="h-full flex flex-col items-center justify-center text-center p-12">
                    <div className="grid grid-cols-4 gap-4 w-64 opacity-10 mb-12">
                      {[...Array(16)].map((_, i) => <div key={i} className="h-4 bg-brand-accent rounded-sm animate-pulse" style={{
                animationDelay: `${i * 0.1}s`
              }} />)}
                    </div>
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Signal size={48} className="text-brand-accent animate-pulse" />
                      <div className="text-[12px] font-black uppercase tracking-[0.5em]">SIGNAL_STANDBY</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest opacity-50">awaiting incoming stream decrypt...</div>
                    </div>
                  </div>}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          {showSecondaryColumn && <div className={`performance-island flex flex-col gap-4 min-w-0 ${isVerticalStack ? '!w-full !max-w-full !flex-none pb-20' : `w-[33.333%] h-full ${isAutoplayMenuOpen ? 'overflow-visible' : 'overflow-hidden'} flex-none`}`}>
              {/* QUEUE */}
              <div className={`performance-island ${isVerticalStack ? 'h-[400px]' : 'h-[160px]'} flex-none glass-card flex flex-col ${isAutoplayMenuOpen ? 'overflow-visible z-[340]' : 'overflow-hidden'} transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass}`} style={isAuraMode ? {
        boxShadow: auraPanelShadow,
        borderColor: auraPanelBorder,
        transition: 'box-shadow 80ms linear, border-color 80ms linear'
      } : undefined}>
          
                <QueueBufferHeader panelHeaderClass={panelHeaderClass} queue={queue} openLibraryOverlay={openLibraryOverlay} setIsViewingFullQueue={setIsViewingFullQueue} setQueue={setQueue} cleanQueueBuffer={cleanQueueBuffer} playDownloadedOnly={playDownloadedOnly} isAutoplayEnabled={isAutoplayEnabled} setIsAutoplayEnabled={setIsAutoplayEnabled} autoplayMoodMode={autoplayMoodMode} setAutoplayMoodMode={setAutoplayMoodMode} isAutoplayMenuOpen={isAutoplayMenuOpen} setIsAutoplayMenuOpen={setIsAutoplayMenuOpen} isOfflineMode={isOfflineMode} autoplayMenuButtonRef={autoplayMenuButtonRef} autoplayMenuStyle={autoplayMenuStyle} setLastAdded={setLastAdded} />
          
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-6">
                  <AnimatePresence mode="popLayout">
                    {queue.length > 1 ? queue.slice(1).map((track, idx) => {
              const warmupId = resolveWarmupTrackId(track);
              const isDownloaded = warmupId ? downloadedTracks.includes(warmupId) : downloadedTracks.includes(track.id);
              return <motion.div initial={{
                opacity: 0,
                x: 20
              }} animate={{
                opacity: 1,
                x: 0
              }} exit={{
                opacity: 0,
                x: -20
              }} key={`${track.id}-${idx}`} className={`performance-list-item group glass-card p-3 flex items-center gap-4 hover:border-brand-accent/30 transition-all border-white/5 ${isDownloaded ? 'bg-red-500/15 border-red-500/30 shadow-[0_0_20px_rgba(255,0,0,0.35)]' : 'bg-white/[0.01]'}`}>
                          <img src={getProxyUrl(track.thumbnail)} className="w-12 h-12 rounded-xl object-cover" alt="" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-black truncate group-hover:text-brand-accent transition-colors uppercase tracking-widest">{track.title}</div>
                            <div className="text-[10px] text-brand-text-dim truncate font-bold uppercase opacity-50 mt-1">{track.author}</div>
                          </div>
                          {isDownloaded && <span className="text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-500/70 px-2 py-1 rounded-full">READY</span>}
                          <button onClick={() => openTrackInspect(track, 'queue')} className="lg:opacity-0 group-hover:opacity-100 hover:text-brand-accent p-2" title="Inspect Track">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => handleRemove(idx + 1)} className="lg:opacity-0 group-hover:opacity-100 hover:text-white p-2">
                            <Trash2 size={16} className="text-red-500/50 hover:text-red-500" />
                          </button>
                        </motion.div>;
            }) : <div className="h-full flex flex-col items-center justify-center opacity-10 py-12 text-[10px] font-black tracking-widest uppercase">
                        Buffer Empty
                        {isDoodleMode && <img src={catDoodlePeek} alt="doodle" className="mt-3 h-10 w-auto opacity-70 select-none pointer-events-none" draggable={false} />}
                      </div>}
                  </AnimatePresence>
                </div>
              </div>

              {isOfflineMode ? <div className={`performance-island glass-card flex flex-col overflow-hidden transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass} ${isVerticalStack ? 'min-h-[500px] flex-none' : 'h-full min-h-0'}`} style={isAuraMode ? {
        boxShadow: auraPanelShadow,
        borderColor: auraPanelBorder,
        transition: 'box-shadow 80ms linear, border-color 80ms linear'
      } : undefined}>
          
                  <div className={`px-3 py-3 border-b border-white/5 flex items-center justify-between gap-2 ${panelHeaderClass}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <HardDrive size={16} className="text-brand-accent shrink-0" />
                      <div className="min-w-0">
                        <span className="label-caps mb-0 text-[10px] tracking-widest truncate block">Available Downloads</span>
                        <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-white/28">{offlineVisibleTracks.length}/{offlineAvailableTracks.length} ready</span>
                      </div>
                    </div>
                    {offlineLibrarySearchTerm && <button onClick={() => setOfflineLibrarySearchTerm('')} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/45 hover:border-brand-accent/30 hover:text-brand-accent transition-colors">
                        Clear
                      </button>}
                  </div>
                  <OfflineAvailablePanel tracks={offlineVisibleTracks} query={offlineLibrarySearchTerm} getProxyUrl={getProxyUrl} handleAdd={handleAdd} openTrackInspect={openTrackInspect} isTrackFavorite={isTrackFavorite} toggleFavoriteTrack={toggleFavoriteTrack} isDoodleMode={isDoodleMode} catDoodlePeek={catDoodlePeek} />
          
                </div> : <>
                  {/* DISCOVERY */}
                  <div className={`performance-island ${isVerticalStack ? 'h-[400px]' : 'h-[160px]'} flex-none glass-card flex flex-col overflow-hidden transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass}`} style={isAuraMode ? {
          boxShadow: auraPanelShadow,
          borderColor: auraPanelBorder,
          transition: 'box-shadow 80ms linear, border-color 80ms linear'
        } : undefined}>
            
                    <div className={`p-3 border-b border-white/5 flex items-center justify-between ${panelHeaderClass}`}>
                      <div className="flex items-center gap-3">
                        <Globe size={18} className="text-brand-accent" />
                        <span className="label-caps mb-0 text-[10px]">Neural Discovery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsViewingFullDiscovery(true)} className="p-1.5 rounded-lg transition-all flex items-center gap-2 bg-white/5 text-white/50 border border-white/10 hover:bg-brand-accent/20 hover:text-brand-accent" title="View Full Discovery">
                  
                          <Maximize2 size={10} />
                        </button>
                        {(searchResults.length > 0 || hasCompletedSearch) && <button onClick={clearDiscoveryResults} className="p-2 px-4 glass-card text-[9px] font-black text-red-500 hover:bg-red-500/10 active:scale-95 transition-all border-red-500/20">FLUSH</button>}
                      </div>
                    </div>
                    <DiscoveryGridSection discoveryItems={discoveryItems} isSearching={isSearching} searchResults={searchResults} hasCompletedSearch={hasCompletedSearch} isTrackFavorite={isTrackFavorite} openTrackInspect={openTrackInspect} isSearchActive={isSearchActive} handleAdd={handleAdd} toggleFavoriteTrack={toggleFavoriteTrack} openLibraryOverlay={openLibraryOverlay} isDoodleMode={isDoodleMode} catDoodlePeek={catDoodlePeek} />
            
                  </div>

                  {/* STUDIO LIBRARY */}
                  <div className={`performance-island glass-card flex flex-col overflow-hidden studio-vault-container relative shadow-inner library-panel transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass} ${isVerticalStack ? 'min-h-[500px] flex-none' : 'h-full min-h-0'}`} style={isAuraMode ? {
          boxShadow: auraPanelShadow,
          borderColor: auraPanelBorder,
          transition: 'box-shadow 80ms linear, border-color 80ms linear'
        } : undefined}>
            
                <div className={`px-2.5 py-2 border-b border-white/5 flex items-center justify-between gap-1.5 ${panelHeaderClass}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <HardDrive size={16} className="text-brand-accent shrink-0" />
                    <span className="label-caps mb-0 text-[10px] tracking-widest truncate">Studio Library</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={handleGenerateSmartMix} className="w-6 h-6 rounded-md bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors flex items-center justify-center" title="Generate Smart Mix"><Zap size={10} /></button>
                    <button onClick={handleCleanVault} disabled={isVaultCleaning} className="w-6 h-6 rounded-md bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors disabled:opacity-40 flex items-center justify-center" title="Playlist Health Scan"><RefreshCw size={10} className={isVaultCleaning ? 'animate-spin' : ''} /></button>
                    <button onClick={() => openLibraryOverlay(null)} className="w-6 h-6 rounded-md bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors flex items-center justify-center" title="Open Vault Overlay"><ListMusic size={10} /></button>
                    {isStandalone && <>
                <button onClick={openMusicImport} className="w-7 h-7 rounded-lg bg-white/5 text-white/45 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors flex items-center justify-center no-drag" title="Import Music Playlist"><Music size={11} /></button>
                        <button onClick={handleImportVault} disabled={isVaultImporting} className="w-6 h-6 rounded-md bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors flex items-center justify-center disabled:opacity-50" title="Import Vault (.aether)">{isVaultImporting ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}</button>
                      </>}
                  </div>
                </div>
                <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex flex-col items-center">
                  <div className="flex min-w-0 items-center justify-center gap-2 overflow-hidden">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Nodes</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">{libraryInsights.unique} unique</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">{libraryInsights.total} total</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">{libraryInsights.duplicates} dupes</span>
                  </div>
                  {libraryInsights.topArtists.length > 0 && <div className="mt-1 text-[8px] font-mono text-white/40 text-center truncate w-full">Top: {libraryInsights.topArtists.map(([artist]) => artist).join(' • ')}</div>}
                </div>
                {/* SAFE SCROLL WRAPPER */}
                <div className={`flex-1 min-h-0 relative ${isVerticalStack ? 'h-[500px]' : ''}`}>
                  <div className="absolute inset-0 overflow-y-auto p-4 flex flex-col gap-6 pb-12 studio-vault-container custom-scrollbar">
                    <div className="vault-project-grid">
                      <div className="vault-project-card group/vault border-rose-300/20 bg-rose-400/[0.035]">
                        <div className="vault-project-art" onClick={() => {
                    setViewingPlaylist(FAVORITES_PLAYLIST_ID);
                    openLibraryOverlay(null);
                  }}>
                          {favoriteTracksList.length > 0 ? favoriteTracksList.slice(0, 4).map((track, tidx) => <img key={`favorites-cover-${tidx}`} src={getProxyUrl(track.thumbnail)} className="vault-project-cover" alt="" style={{
                      '--cover-index': tidx
                    }} />) : <div className="vault-project-empty text-rose-300"><Heart size={20} /></div>}
                          <div className="vault-project-sheen" />
                          <div className="vault-project-count">{favoriteTracksList.length}</div>
                        </div>
                        <div className="min-w-0">
                          <button onClick={() => {
                      setViewingPlaylist(FAVORITES_PLAYLIST_ID);
                      openLibraryOverlay(null);
                    }} className="w-full text-left text-[12px] font-black text-white/88 uppercase tracking-tight truncate group-hover/vault:text-rose-300 transition-colors" title={FAVORITES_PLAYLIST_NAME}>
                            {FAVORITES_PLAYLIST_NAME}
                          </button>
                          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/30 truncate">
                            Built-in favorites
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          <button onClick={() => handleFavoritePlayAll(false)} className="vault-project-tool favorite-play" title="Play Favorites"><Play size={11} /></button>
                          <button onClick={() => handleFavoritePlayAll(true)} className="vault-project-tool favorite-play" title="Shuffle Favorites"><Shuffle size={11} /></button>
                          <button onClick={handleFavoriteAddAll} className="vault-project-tool" title="Queue Favorites"><Plus size={11} /></button>
                          {isStandalone && <button onClick={() => handleExportVault(FAVORITES_PLAYLIST_ID)} className="vault-project-tool" title="Export Favorites"><Download size={11} /></button>}
                          <button onClick={() => {
                      setViewingPlaylist(FAVORITES_PLAYLIST_ID);
                      openLibraryOverlay(null);
                    }} className="vault-project-tool" title="View Favorites"><Maximize2 size={11} /></button>
                        </div>
                        {favoriteTracksList.length > 0 && <button onClick={() => openPlaylistInspect(FAVORITES_PLAYLIST_NAME, favoriteTracksList, 'vault:favorites')} className="vault-project-inspect">
                            <Eye size={11} /> Inspect favorites
                          </button>}
                      </div>
                      {orderedPlaylistNames.map((name, index) => {
                  const vaultTracks = playlists[name] || [];
                  const previewTracks = vaultTracks.slice(0, 4);
                  const featuredTrack = previewTracks[0];
                  return <div key={name || `vault-project-${index}`} className="vault-project-card group/vault">
                            <div className="vault-project-art" onClick={() => setViewingPlaylist(name)}>
                              {previewTracks.length > 0 ? previewTracks.map((track, tidx) => <img key={`${name}-cover-${tidx}`} src={getProxyUrl(track.thumbnail)} className="vault-project-cover" alt="" style={{
                        '--cover-index': tidx
                      }} />) : <div className="vault-project-empty"><HardDrive size={20} /></div>}
                              <div className="vault-project-sheen" />
                              <div className="vault-project-count">{vaultTracks.length}</div>
                            </div>
                            <div className="min-w-0">
                              {isRenamingPlaylist === name ? <input autoFocus className="w-full bg-white/5 border border-brand-accent/30 rounded-md px-2 py-1 text-[10px] font-black text-brand-accent outline-none" value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={e => handleRenamePlaylist(name, e.target.value)} onKeyDown={e => {
                        if (e.key === 'Enter') handleRenamePlaylist(name, e.currentTarget.value);
                        if (e.key === 'Escape') setIsRenamingPlaylist(null);
                      }} /> : <button draggable={false} onPointerDown={e => {
                        e.stopPropagation();
                      }} onDoubleClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsRenamingPlaylist(name);
                        setRenameValue(name);
                      }} onClick={e => {
                        if (e.detail > 1) return;
                        setViewingPlaylist(name);
                      }} className="w-full text-left text-[12px] font-black text-white/88 uppercase tracking-tight truncate group-hover/vault:text-brand-accent transition-colors" title={name}>
                            
                                  {name}
                                </button>}
                              <div className="mt-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/30 truncate">
                                {featuredTrack?.author || 'Empty vault'} {featuredTrack ? 'signal' : ''}
                              </div>
                            </div>
                            <div className="grid grid-cols-6 gap-1.5">
                              <button onClick={() => movePlaylist(name, -1)} className="vault-project-tool" title={`Move ${name} up`}><ChevronLeft size={11} /></button>
                              <button onClick={() => movePlaylist(name, 1)} className="vault-project-tool" title={`Move ${name} down`}><ChevronRight size={11} /></button>
                              <button onClick={() => handlePlaylistAddAll(name)} className="vault-project-tool" title={`Inject ${name} to Queue`}><Plus size={11} /></button>
                              <button onClick={() => {
                        const shuffled = [...vaultTracks].sort(() => Math.random() - 0.5);
                        setQueue(shuffled);
                        seekActivePlaybackTo(0);
                        setIsPlaying(shuffled.length > 0);
                        closeHeaderSurfaces();
                      }} className="vault-project-tool" title={`Shuffle & Play ${name}`}><Shuffle size={11} /></button>
                              <button onClick={() => setIsViewingFullPlaylist(name)} className="vault-project-tool" title={`View ${name} Fullscreen`}><Maximize2 size={11} /></button>
                              <button onClick={() => handleDeletePlaylist(name)} className="vault-project-tool danger" title={`Delete ${name}`}><Trash2 size={11} /></button>
                            </div>
                            {vaultTracks.length > 0 && <button onClick={() => openPlaylistInspect(name, vaultTracks, `vault:${name}`)} className="vault-project-inspect">
                                <Eye size={11} /> Inspect playlist
                              </button>}
                          </div>;
                })}
                    </div>
                  </div>
                </div>
              </div>
                </>}
            </div>}
        </main></>;
}
