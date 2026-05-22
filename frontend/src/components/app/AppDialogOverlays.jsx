export function AppDialogOverlays(props) {
  const {
  AnimatePresence, FastForward, Hand, HardDrive, HealthMetricCard, Layers, ListMusic,
  Loader2, MessageSquare, MixtapeVaultContent, Music, Pause, Play, PlaybackProgressIsland, Rewind,
  SecondaryNowPlayingStrip, StudioLibraryOverlayIsland, X, activeLyricIndex, auraPreset, auraStageDurationMs, auraStagePulseScale, canAddPendingToVault,
  cassetteSide, clamp01, closeLibraryOverlay, compactLyric, copySpotifyImportDebugLog, copyVaultSceneEmbed, currentTrack, detail,
  downloadedTracks, draggedPlaylistName, e, fallback, favoriteInspectPlaylist, favoriteTracksList, focusedVaultName, focusedVaultTracks,
  focusedVaultVisibleTracks, formatTime, getActivePlaybackPositionMs, getInspectSourceUrl, getProxyUrl, getTrackAddedMs, getTrackLastListenedMs, getTrackPlayCount,
  handleAdd, handleAddToPlaylist, handleCleanVault, handleControl, handleCopyDiagnosticsValue, handleDeletePlaylist, handleDownloadMissingForVault, handleExportVault,
  handleFavoriteAddAll, handleFavoritePlayAll, handleGenerateSmartMix, handleImportLocalMedia, handleImportSpotifyPlaylist, handleImportVault, handlePlaylistAddAll, handlePlaylistPlayAll,
  handleRemoveTrackEverywhere, handleRemoveTrackFromPlaylist, handleRenamePlaylist, handleSeek, handleVolumeChange, idx, importReview, index,
  inspectDurationMs, inspectPlaylistArtistCount, inspectPlaylistDurationMs, inspectPlaylistName, inspectPlaylistQueuedCount, inspectPlaylistSignal, inspectPlaylistTracklistText, inspectPlaylistTracks,
  inspectPrimaryTrack, inspectQueueIndex, inspectSourceUrl, inspectTarget, inspectTrack, inspectVaultNames, isAuraStageOpen, isDoodleMode,
  isFaceControlEnabled, isGestureControlEnabled, isInspectPlaylistFromVault, isLibraryOverlayOpen, isLocalMediaImporting, isMixtapeVaultContentReady, isMixtapeVaultOpen, isOfflineMode,
  isPlaying, isPlaylistInspect, isRenamingPlaylist, isSharedSceneOpen, isSpotifyImportOpen, isSpotifyImporting, isStandalone, isTrackFavorite,
  isVaultCleaning, isVaultImporting, isViewingFavorites, label, libraryActionTarget, libraryBrowseMode, libraryFilter, libraryInsights,
  libraryModeOptions, libraryOverlayCreateInputRef, libraryPlaylistFilterOptions, libraryPlaylistSortOptions, librarySearchNeedle, librarySearchTerm, librarySongFilter, librarySongFilterOptions,
  librarySongSort, librarySongSortOptions, librarySort, libraryTrackSort, libraryVisiblePlaylistNames, libraryVisibleSongEntries, line, livePulseReadout,
  lyrics, mixtapeDurationMs, mixtapeEnergyPct, mixtapeLiveLyric, mixtapePositionMs, mixtapeProgressPct, mixtapePulse, mixtapePulseReadout,
  mixtapeSpectrum, mixtapeVaultRef, motion, movePlaylist, musicImportProvider, musicImportTheme, name, newPlaylistName,
  nextLyric, normalizeQueueTrack, normalizeTrackIdentity, openFeedbackPanel, openGestureLab, openLibraryOverlay, openTrackInspect,
  pendingLibraryItems, playInspectPlaylist, playlists, prev, provider, queueInspectPlaylist, renameValue,
  reorderPlaylistByDrag, resolveWarmupTrackId, rowSourceUrl, setDraggedPlaylistName, setImportReview, setInspectTarget, setIsAuraStageOpen, setIsCreatingPlaylist,
  setIsManualStop, setIsMixtapeVaultOpen, setIsPlaying, setIsRenamingPlaylist, setIsSharedSceneOpen, setIsSpotifyImportOpen, setLibraryBrowseMode, setLibraryFilter,
  setLibrarySearchTerm, setLibrarySongFilter, setLibrarySongSort, setLibrarySort, setLibraryTrackSort, setMusicImportProvider, setNewPlaylistName, setQueue,
  setRenameValue, setSpotifyImportLogs, setSpotifyImportPlaylistName, setSpotifyImportProgress, setSpotifyImportUrl, setViewingPlaylist, sharedModalCloseButtonClass, sharedScene,
  showFavoriteLibraryCard, spotifyImportLogs, spotifyImportPlaylistName, spotifyImportProgress, spotifyImportUrl, suggestion, toggleFavoriteTrack,
  track, trackControlAccent, trackControlGlow, trackHasSavedLyrics, trackProgressAccent, trackProgressGlow, value, vaultPulse,
  viewingPlaylist, volume,
  } = props;

  return <><AnimatePresence>
          {!isOfflineMode && isSpotifyImportOpen && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[240] flex items-center justify-center p-4">
        
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !(isSpotifyImporting || isLocalMediaImporting) && setIsSpotifyImportOpen(false)} />
              <motion.div initial={{
        y: 16,
        scale: 0.97,
        opacity: 0
      }} animate={{
        y: 0,
        scale: 1,
        opacity: 1
      }} exit={{
        y: 10,
        scale: 0.98,
        opacity: 0
      }} className="relative z-10 flex w-full max-w-xl max-h-[min(88vh,760px)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl" style={{
        '--music-import-accent': musicImportTheme.accent,
        '--music-import-accent-soft': musicImportTheme.accentSoft,
        '--music-import-accent-border': musicImportTheme.accentBorder,
        '--music-import-accent-text': musicImportTheme.accentText,
        '--music-import-accent-shadow': musicImportTheme.accentShadow,
        '--music-import-cta-text': musicImportTheme.ctaText
      }}>
          
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 border-b border-white/5 md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)_auto]">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{
              color: 'var(--music-import-accent-text)'
            }}>Import a Playlist</div>
                    <div className="text-[11px] text-white/45 mt-1">Pick a source, paste a public playlist link, and Aether will match songs into your library.</div>
                  </div>
                  <SecondaryNowPlayingStrip currentTrack={currentTrack} isPlaying={isPlaying} getProxyUrl={getProxyUrl} className="hidden w-full md:flex" />
            
                  <button onClick={() => !(isSpotifyImporting || isLocalMediaImporting) && setIsSpotifyImportOpen(false)} className={sharedModalCloseButtonClass} title="Close">
              
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[['spotify', 'Spotify', 'Public open.spotify.com playlist'], ['apple', 'Apple Music', 'Public music.apple.com playlist'], ['local', 'Local Files', 'Audio, video, playlists, and .lrc lyrics']].map(([provider, label, detail]) => <button key={provider} type="button" disabled={isSpotifyImporting || isLocalMediaImporting} onClick={() => {
              setMusicImportProvider(provider);
              setSpotifyImportUrl('');
              setSpotifyImportPlaylistName('');
              setSpotifyImportProgress({
                stage: 'idle',
                progress: 0,
                message: provider === 'local' ? 'Local import selected. Pick files or folders when ready.' : `${label} selected. Paste a public playlist URL.`
              });
              setSpotifyImportLogs([]);
              setImportReview(null);
            }} className={`no-drag rounded-2xl border px-4 py-4 text-left transition-all ${musicImportProvider === provider ? 'text-white shadow-[0_0_22px_var(--music-import-accent-shadow)]' : 'border-white/10 bg-white/[0.035] text-white/60 hover:text-white'}`} style={musicImportProvider === provider ? {
              borderColor: 'var(--music-import-accent-border)',
              background: 'var(--music-import-accent-soft)'
            } : undefined}>
                
                        <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.18em]">
                          {provider === 'local' ? <HardDrive size={14} /> : <Music size={14} />}
                          <span>{label}</span>
                        </div>
                        <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{detail}</div>
                      </button>)}
                  </div>

                  {musicImportProvider === 'local' ? <div className="rounded-2xl border border-brand-accent/20 bg-brand-accent/[0.055] px-4 py-4">
                      <div className="text-[9px] font-black uppercase tracking-[0.24em] text-brand-accent/80">Local Library Import</div>
                      <div className="mt-2 text-sm font-semibold leading-6 text-white/62">
                        Pick songs, videos, folders, .m3u/.pls playlists, and matching .lrc lyric files. Aether copies playable media into its local library and creates vaults automatically.
                      </div>
                      <div className="mt-4 grid gap-2 text-[11px] leading-5 text-white/50 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-black/22 p-3">
                          <div className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-brand-accent/75">Best names</div>
                          <div><span className="text-white/70">Artist - Song.mp3</span></div>
                          <div><span className="text-white/70">Artist - Video.mp4</span></div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/22 p-3">
                          <div className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-brand-accent/75">Lyrics match</div>
                          <div>Same folder, same filename:</div>
                          <div><span className="text-white/70">Artist - Song.lrc</span></div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/22 p-3">
                          <div className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-brand-accent/75">Playlists</div>
                          <div>Import <span className="text-white/70">.m3u</span>, <span className="text-white/70">.m3u8</span>, or <span className="text-white/70">.pls</span>. The playlist filename becomes the vault name.</div>
                        </div>
                      </div>
                      <button type="button" onClick={handleImportLocalMedia} disabled={isSpotifyImporting || isLocalMediaImporting} className="mt-4 rounded-xl bg-brand-accent px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-black transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100">
                
                        {isLocalMediaImporting ? 'Importing Local Files...' : 'Pick Local Files'}
                      </button>
                    </div> : <div>
                      <label className="block text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">{musicImportProvider ? `${musicImportTheme.label} Playlist Link` : 'Playlist Link'}</label>
                      <input value={spotifyImportUrl} onChange={e => setSpotifyImportUrl(e.target.value)} disabled={isSpotifyImporting || isLocalMediaImporting || !musicImportProvider} placeholder={musicImportTheme.placeholder} className="no-drag w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all disabled:opacity-60" style={{
              '--tw-ring-color': 'var(--music-import-accent)',
              caretColor: 'var(--music-import-accent)'
            }} />
              
                    </div>}

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Save As</label>
                    <input value={spotifyImportPlaylistName} onChange={e => setSpotifyImportPlaylistName(e.target.value)} disabled={isSpotifyImporting || isLocalMediaImporting || !musicImportProvider} placeholder={musicImportProvider === 'local' ? 'Local import vault name (optional)' : musicImportProvider ? `${musicImportTheme.label} playlist name (optional)` : 'Choose a source first'} className="no-drag w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all disabled:opacity-60" style={{
              caretColor: 'var(--music-import-accent)'
            }} />
              
                    <div className="mt-2 text-[10px] text-white/35">Leave blank to use the playlist title Aether finds.</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Progress</span>
                      <span className="text-[10px] font-mono" style={{
                color: 'var(--music-import-accent-text)'
              }}>{Math.max(0, Math.min(100, spotifyImportProgress.progress || 0))}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{
                width: `${Math.max(4, Math.min(100, spotifyImportProgress.progress || 0))}%`,
                background: spotifyImportProgress.stage === 'error' ? '#ff3b4f' : 'var(--music-import-accent)'
              }} />
                
                    </div>
                    <div className="mt-3 text-[11px] text-white/60 min-h-[1.5em]">
                      {spotifyImportProgress.message || (isSpotifyImporting || isLocalMediaImporting ? 'Preparing import…' : 'Ready to import.')}
                    </div>
                  </div>

                  {importReview && <div className="rounded-2xl border border-brand-accent/20 bg-brand-accent/[0.055] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/80">Smart Import Review</div>
                          <div className="mt-1 text-sm font-black uppercase tracking-tight text-white">{importReview.playlistName || importReview.source}</div>
                        </div>
                        <span className="rounded-full border border-brand-accent/25 bg-brand-accent/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent">{importReview.source}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <HealthMetricCard label="Matched" value={importReview.matched} tone="good" />
                        <HealthMetricCard label="Skipped" value={importReview.skipped} tone={importReview.skipped ? 'warn' : 'good'} />
                        <HealthMetricCard label="Dupes" value={importReview.duplicates} tone={importReview.duplicates ? 'warn' : 'good'} />
                        <HealthMetricCard label="Lyrics" value={importReview.lyrics} tone={importReview.lyrics ? 'good' : 'neutral'} />
                      </div>
                      {Array.isArray(importReview.suggestions) && importReview.suggestions.length > 0 && <div className="mt-3 space-y-1">
                          {importReview.suggestions.slice(0, 3).map(suggestion => <div key={suggestion} className="rounded-xl border border-white/8 bg-black/18 px-3 py-2 text-[11px] leading-5 text-white/48">{suggestion}</div>)}
                        </div>}
                    </div>}

                  <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Debug Log</div>
                      <button type="button" onClick={copySpotifyImportDebugLog} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/45 transition-colors hover:text-white">Copy</button>
                    </div>
                    <div className="custom-scrollbar-heavy max-h-28 select-text overflow-auto space-y-1 pr-1">
                      {spotifyImportLogs.length === 0 ? <div className="text-[10px] text-white/35">No logs yet.</div> : spotifyImportLogs.map((line, idx) => <div key={`${line}-${idx}`} className="text-[10px] leading-4 font-mono text-white/55 break-words">{line}</div>)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button onClick={() => {
              if (!(isSpotifyImporting || isLocalMediaImporting)) setIsSpotifyImportOpen(false);
            }} className="no-drag px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20 transition-all text-sm">
                
                      Cancel
                    </button>
                    <button onClick={musicImportProvider === 'local' ? handleImportLocalMedia : handleImportSpotifyPlaylist} disabled={isSpotifyImporting || isLocalMediaImporting || !musicImportProvider || musicImportProvider !== 'local' && !spotifyImportUrl.trim()} className="no-drag px-5 py-2 rounded-xl font-black text-sm hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100" style={{
              background: 'var(--music-import-accent)',
              color: 'var(--music-import-cta-text)'
            }}>
                
                      {isSpotifyImporting || isLocalMediaImporting ? 'Importing...' : musicImportProvider === 'local' ? 'Pick Local Files' : musicImportProvider ? `Match ${musicImportTheme.label} Playlist` : 'Choose a Source'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence><AnimatePresence>
          {isMixtapeVaultOpen && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[320] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setIsMixtapeVaultOpen(false)}>
        
              <motion.div initial={{
        scale: 0.94,
        y: 10
      }} animate={{
        scale: 1,
        y: 0
      }} exit={{
        scale: 0.96,
        y: 8
      }} ref={mixtapeVaultRef} style={{
        '--vault-bass': mixtapePulse.bass,
        '--vault-mids': mixtapePulse.mids,
        '--vault-highs': mixtapePulse.highs,
        '--vault-energy': mixtapePulse.energy,
        '--vault-scale': 1 + mixtapePulse.energy * 0.1,
        '--vault-spin': `${vaultPulse.spin || 0}deg`,
        '--vault-glow': mixtapePulseReadout,
        '--mixtape-progress': mixtapeProgressPct / 100
      }} className="mixtape-vault-shell relative w-[min(94vw,760px)] lg:w-[min(94vw,1360px)] lg:min-h-[clamp(680px,82vh,820px)] lg:aspect-[1.6/1] rounded-[2rem] border border-brand-accent/25 bg-[#07090c]/96 shadow-[0_0_80px_rgba(0,255,191,0.14)] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/70 to-transparent" />

                <div className="p-6 md:p-8 flex-1 flex flex-col min-h-0">
                  <div className="relative mb-8 flex items-center justify-center text-center">
                    <div className="min-w-0 px-14">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-brand-accent/30 bg-brand-accent/10 shadow-[0_0_30px_rgba(0,255,191,0.15)]">
                        <Music size={22} className="text-brand-accent" />
                      </div>
                      <h2 className="text-brand-accent font-black text-2xl md:text-3xl tracking-[0.2em] uppercase leading-none">Mixtape Vault</h2>
                      <span className="mt-3 block text-white/40 text-[10px] font-mono tracking-[0.25em] uppercase">Private Listening Room</span>
                      <div className="mx-auto mt-4 max-w-xl truncate text-sm font-black text-white/90">{currentTrack?.title || 'Aether Secret Session'}</div>
                      <div className="mx-auto mt-1 max-w-sm truncate text-[10px] uppercase tracking-[0.25em] text-brand-accent/80">{currentTrack?.author || 'Unknown Artist'}</div>
                    </div>
                    <button onClick={() => setIsMixtapeVaultOpen(false)} className={`${sharedModalCloseButtonClass} absolute right-0 top-0`}>
                
                      <X size={18} />
                    </button>
                  </div>

                  {!isMixtapeVaultContentReady ? <div className="flex h-[400px] flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-black/40 p-5 text-center">
                      <Loader2 size={32} className="animate-spin text-brand-accent/70" />
                      <div className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Preparing Analog Scene</div>
                    </div> : <MixtapeVaultContent cassetteSide={cassetteSide} mixtapePulse={mixtapePulse} mixtapePulseReadout={mixtapePulseReadout} mixtapeSpectrum={mixtapeSpectrum} clamp01={clamp01} currentTrack={currentTrack} isPlaying={isPlaying} handleControl={handleControl} mixtapePositionMs={mixtapePositionMs} mixtapeDurationMs={mixtapeDurationMs} mixtapeProgressPct={mixtapeProgressPct} handleSeek={handleSeek} formatTime={formatTime} volume={volume} setVolume={handleVolumeChange} mixtapeLiveLyric={mixtapeLiveLyric} nextLyric={nextLyric} mixtapeEnergyPct={mixtapeEnergyPct} copyVaultSceneEmbed={copyVaultSceneEmbed} />}
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence><AnimatePresence>
          {!isOfflineMode && isSharedSceneOpen && sharedScene && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[320] flex items-center justify-center bg-black/78 backdrop-blur-md p-4" onClick={() => setIsSharedSceneOpen(false)}>
        
              <motion.div initial={{
        scale: 0.95,
        y: 12
      }} animate={{
        scale: 1,
        y: 0
      }} exit={{
        scale: 0.96,
        y: 8
      }} className="relative w-[min(94vw,880px)] overflow-hidden rounded-[2rem] border border-brand-accent/30 bg-[#07090c]/95 shadow-[0_0_80px_rgba(0,255,191,0.15)]" onClick={e => e.stopPropagation()}>
          
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/70 to-transparent" />
                <div className="p-6 md:p-8 flex flex-col gap-6">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent mt-1">Aether Shared Scene</div>
                    </div>
                    <button onClick={() => setIsSharedSceneOpen(false)} className={sharedModalCloseButtonClass}>
                
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/35">
                      <img src={sharedScene.thumbnail || (sharedScene.youtubeId ? `https://i.ytimg.com/vi/${sharedScene.youtubeId}/hqdefault.jpg` : null)} alt="scene" className="aspect-square w-full object-cover" onError={e => {
                const fallback = sharedScene.youtubeId ? `https://i.ytimg.com/vi/${sharedScene.youtubeId}/hqdefault.jpg` : '';
                if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
              }} />
                
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent">{sharedScene.state || 'paused'} Scene</div>
                        <div className="mt-1 text-xs font-mono text-white/70">{formatTime(Number(sharedScene.at || 0))} / {formatTime(Number(sharedScene.total || 0))}</div>
                      </div>
                    </div>
                    <div className="min-w-0 rounded-3xl border border-white/10 bg-black/25 p-5 md:p-6">
                      <div className="font-black text-brand-accent text-xl md:text-2xl leading-tight line-clamp-2">{sharedScene.title || 'Aether Scene'}</div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/55 truncate">{sharedScene.author || 'Unknown Artist'}</div>
                      <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-white/80 text-sm leading-relaxed italic break-words">“{sharedScene.lyric || 'No lyric locked yet'}”</div>
                      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[['Pulse', Number(sharedScene?.pulse?.e || 0)], ['Bass', Number(sharedScene?.pulse?.b || 0)], ['Mids', Number(sharedScene?.pulse?.m || 0)], ['Highs', Number(sharedScene?.pulse?.h || 0)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/8 bg-black/30 px-3 py-3">
                            <div className="text-lg font-black text-white">{value}%</div>
                            <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">{label}</div>
                          </div>)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence><AnimatePresence>
          {isAuraStageOpen && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[330] overflow-hidden bg-[#020405]/96 backdrop-blur-2xl">
        
              <div className="absolute inset-0" onClick={() => setIsAuraStageOpen(false)} />
              {currentTrack?.thumbnail && <>
                  <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.18] blur-[54px] scale-110" />
                  <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="aura-stage-parallax absolute left-1/2 top-1/2 h-[min(72vw,72vh)] w-[min(72vw,72vh)] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] object-cover opacity-20 shadow-[0_40px_120px_rgba(0,0,0,0.55)]" />
                </>}
              <div className="aura-stage-rings pointer-events-none absolute inset-0" />
              <div className="aura-stage-grid pointer-events-none absolute inset-0" />

              <motion.div initial={{
        scale: 0.96,
        y: 16
      }} animate={{
        scale: 1,
        y: 0
      }} exit={{
        scale: 0.96,
        y: 16
      }} className="relative z-10 flex h-full flex-col p-4 md:p-8" onClick={e => e.stopPropagation()}>
          
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-accent/30 bg-brand-accent/12 text-brand-accent shadow-[0_0_28px_rgba(0,255,191,0.14)]">
                      <Layers size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-accent">Aura Stage 2.0</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">Depth lyric stage // beat field</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={openGestureLab} className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${isGestureControlEnabled ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/5 text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`} title="Gesture Lab">
                
                      <Hand size={15} />
                    </button>
                    <button onClick={openFeedbackPanel} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/55 transition-all hover:border-brand-accent/35 hover:text-brand-accent" title="Send Feedback">
                
                      <MessageSquare size={15} />
                    </button>
                    <button onClick={() => setIsAuraStageOpen(false)} className={sharedModalCloseButtonClass} title="Close">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="relative flex flex-1 items-center justify-center py-6">
                  <div className="aura-stage-depth-stack w-full max-w-6xl">
                    <div className="grid min-h-[60vh] grid-cols-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="flex items-center justify-center">
                        <motion.div animate={{
                  scale: auraStagePulseScale,
                  rotate: livePulseReadout * 1.8
                }} transition={{
                  duration: 0.16,
                  ease: 'easeOut'
                }} className="aura-stage-art relative aspect-square w-[min(72vw,420px)] overflow-hidden rounded-[2.6rem] border border-white/12 bg-white/[0.03] shadow-[0_36px_110px_rgba(0,0,0,0.48)]">
                    
                          {currentTrack?.thumbnail ? <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-brand-accent/45"><Music size={72} strokeWidth={1.2} /></div>}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/8" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-brand-accent/85">Now Playing</div>
                            <div className="mt-1 truncate text-lg font-black uppercase tracking-tight text-white">{currentTrack?.title || 'No track selected'}</div>
                            <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.24em] text-white/48">{currentTrack?.author || 'Search and queue a track'}</div>
                          </div>
                        </motion.div>
                      </div>

                      <div className="min-w-0 text-center lg:text-left">
                        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                          <span className="rounded-full border border-brand-accent/25 bg-brand-accent/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent">Pulse {Math.round(livePulseReadout * 100)}%</span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/45">{auraPreset}</span>
                          {isGestureControlEnabled && <span className="rounded-full border border-brand-accent/20 bg-brand-accent/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/75">Gesture on</span>}
                          {isFaceControlEnabled && <span className="rounded-full border border-brand-accent/20 bg-brand-accent/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/75">Face on</span>}
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div key={`aura-stage-lyric-${activeLyricIndex}-${compactLyric || 'idle'}`} initial={{
                    opacity: 0,
                    y: 22,
                    filter: 'blur(10px)'
                  }} animate={{
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)'
                  }} exit={{
                    opacity: 0,
                    y: -14,
                    filter: 'blur(8px)'
                  }} transition={{
                    duration: 0.32,
                    ease: 'easeOut'
                  }} className="aura-stage-lyric text-4xl font-black leading-[0.98] tracking-normal text-white sm:text-6xl lg:text-7xl">
                      
                            {compactLyric || currentTrack?.title || 'Aether is standing by'}
                          </motion.div>
                        </AnimatePresence>
                        {nextLyric && <div className="mt-5 text-base font-semibold leading-snug text-white/44 sm:text-xl">
                            {nextLyric}
                          </div>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mx-auto w-full max-w-5xl rounded-[1.6rem] border border-white/10 bg-black/36 px-4 py-4 backdrop-blur-2xl">
                  <PlaybackProgressIsland durationMs={auraStageDurationMs} getPositionMs={getActivePlaybackPositionMs} onSeek={handleSeek} accent={trackProgressAccent} glow={trackProgressGlow} barClassName="mb-3 h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/12" timeRowClassName="flex items-center justify-between gap-4 text-[10px] font-mono text-white/42" middleContent={<div className="flex items-center gap-5">
                        <button onClick={() => handleControl('previous')} className="text-white/55 transition-colors hover:text-brand-accent active:scale-90" title="Previous">
                          <Rewind size={22} fill="currentColor" />
                        </button>
                        <button onClick={() => handleControl(isPlaying ? 'pause' : 'resume')} className="flex h-14 w-14 items-center justify-center rounded-2xl text-black transition-all hover:scale-[1.03] active:scale-95" style={{
              background: trackControlAccent,
              boxShadow: `0 0 28px ${trackControlGlow}`
            }} title={isPlaying ? 'Pause' : 'Play'}>
                  
                          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                        <button onClick={() => handleControl('skip')} className="text-white/55 transition-colors hover:text-brand-accent active:scale-90" title="Next">
                          <FastForward size={22} fill="currentColor" />
                        </button>
                      </div>} />
            
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence><AnimatePresence>
          {(inspectTrack || isPlaylistInspect) && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[340] flex items-center justify-center bg-black/82 p-4 backdrop-blur-xl">
        
              <div className="absolute inset-0" onClick={() => setInspectTarget(null)} />
              <motion.div initial={{
        scale: 0.96,
        y: 18
      }} animate={{
        scale: 1,
        y: 0
      }} exit={{
        scale: 0.96,
        y: 18
      }} className="relative z-10 flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-brand-accent/20 bg-[#080c10]/96 shadow-[0_28px_100px_rgba(0,0,0,0.55)]">
          
                <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/22 p-5">
                  <div className="flex min-w-0 items-center gap-4">
                    {isPlaylistInspect ? <div className="relative h-16 w-16 flex-none overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                        {inspectPlaylistTracks.length > 1 ? <div className="grid h-full w-full grid-cols-2">
                            {inspectPlaylistTracks.slice(0, 4).map((track, index) => track.thumbnail ? <img key={`${inspectPlaylistName}-inspect-cover-${index}`} src={getProxyUrl(track.thumbnail)} alt="" className="h-full w-full object-cover" /> : <div key={`${inspectPlaylistName}-inspect-cover-${index}`} className="flex h-full w-full items-center justify-center bg-brand-accent/10 text-brand-accent"><Music size={12} /></div>)}
                          </div> : inspectPrimaryTrack?.thumbnail ? <img src={getProxyUrl(inspectPrimaryTrack.thumbnail)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-brand-accent"><ListMusic size={18} /></div>}
                        <div className="absolute bottom-1 right-1 rounded-full border border-brand-accent/25 bg-black/76 px-1.5 py-0.5 text-[8px] font-black text-brand-accent">{inspectPlaylistTracks.length}</div>
                      </div> : <img src={getProxyUrl(inspectTrack.thumbnail)} alt="" className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />}
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-accent">{isPlaylistInspect ? 'Inspect Playlist' : 'Inspect Track'}</div>
                      <div className="mt-1 truncate text-xl font-black uppercase tracking-tight text-white">{isPlaylistInspect ? inspectPlaylistName : inspectTrack.title || 'Unknown Track'}</div>
                      <div className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                        {isPlaylistInspect ? `${inspectPlaylistTracks.length} tracks // ${inspectPlaylistArtistCount} artists` : inspectTrack.author || 'Unknown Artist'}
                      </div>
                    </div>
                  </div>
                  <SecondaryNowPlayingStrip currentTrack={currentTrack} isPlaying={isPlaying} getProxyUrl={getProxyUrl} className="ml-auto hidden w-60 md:flex" />
            
                  <button onClick={() => setInspectTarget(null)} className={sharedModalCloseButtonClass} title="Close">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5 md:flex-row">
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar-heavy">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Context</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                        {isPlaylistInspect ? <>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectPlaylistTracks.length}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Tracks</div></div>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectPlaylistQueuedCount}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Queued</div></div>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{formatTime(inspectPlaylistDurationMs)}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Length</div></div>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectPlaylistArtistCount}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Artists</div></div>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectPlaylistSignal.favorites}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Favorites</div></div>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectPlaylistSignal.downloaded}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Downloaded</div></div>
                          </> : <>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectQueueIndex >= 0 ? inspectQueueIndex + 1 : '-'}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Queue</div></div>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{formatTime(inspectDurationMs)}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Length</div></div>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectVaultNames.length}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Vaults</div></div>
                            <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{lyrics.length}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Lyrics</div></div>
                          </>}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      {isPlaylistInspect ? <>
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Playlist Tracks</div>
                            <button disabled={!inspectPlaylistTracklistText} onClick={() => handleCopyDiagnosticsValue(inspectPlaylistTracklistText, 'Tracklist copied')} className="rounded-xl border border-brand-accent/20 bg-brand-accent/8 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent/80 transition-all hover:bg-brand-accent hover:text-black disabled:opacity-35 disabled:hover:bg-brand-accent/8 disabled:hover:text-brand-accent/80">
                      
                              Copy List
                            </button>
                          </div>
                          <div className="mt-3 max-h-[38vh] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                            {inspectPlaylistTracks.map((track, index) => {
                    const rowSourceUrl = getInspectSourceUrl(track);
                    return <div key={`${normalizeTrackIdentity(track)}-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/22 p-3">
                                  <div className="w-5 shrink-0 text-center text-[10px] font-black text-brand-accent">{index + 1}</div>
                                  <img src={getProxyUrl(track.thumbnail)} className="h-10 w-10 shrink-0 rounded-xl border border-white/10 object-cover bg-white/[0.03]" alt="" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[11px] font-black uppercase tracking-widest text-white">{track.title || 'Unknown Track'}</div>
                                    <div className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">{track.author || 'Unknown Artist'}</div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <button onClick={() => handleAdd(track)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/45 transition-all hover:border-brand-accent/30 hover:text-brand-accent">
                              
                                      Queue
                                    </button>
                                    <button onClick={() => openTrackInspect(track, `playlist:${inspectPlaylistName}`)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/45 transition-all hover:border-brand-accent/30 hover:text-brand-accent">
                              
                                      Inspect
                                    </button>
                                    <button disabled={!rowSourceUrl} onClick={() => handleCopyDiagnosticsValue(rowSourceUrl, 'Track URL copied')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/45 transition-all hover:border-brand-accent/30 hover:text-brand-accent disabled:opacity-35">
                              
                                      Copy
                                    </button>
                                  </div>
                                </div>;
                  })}
                          </div>
                        </> : <>
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Source</div>
                            <button disabled={!inspectSourceUrl} onClick={() => handleCopyDiagnosticsValue(inspectSourceUrl, 'Source copied')} className="rounded-xl border border-brand-accent/20 bg-brand-accent/8 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent/80 transition-all hover:bg-brand-accent hover:text-black disabled:opacity-35 disabled:hover:bg-brand-accent/8 disabled:hover:text-brand-accent/80">
                      
                              Copy URL
                            </button>
                          </div>
                          <div className="no-drag mt-3 select-text break-all rounded-xl border border-white/8 bg-black/28 p-3 text-[11px] font-mono leading-5 text-white/62" style={{
                  WebkitUserSelect: 'text',
                  userSelect: 'text'
                }}>
                            {inspectSourceUrl || 'No source URL captured'}
                          </div>
                          {inspectVaultNames.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                              {inspectVaultNames.map(name => <span key={`inspect-vault-${name}`} className="rounded-full border border-brand-accent/20 bg-brand-accent/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent/75">{name}</span>)}
                            </div>}
                        </>}
                    </div>
                  </div>

                  <div className="flex w-full flex-shrink-0 flex-col gap-3 overflow-y-auto custom-scrollbar-heavy md:w-[320px]">
                    <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-brand-accent/8 to-white/[0.02] p-4">
                      <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Actions</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {isPlaylistInspect ? <>
                            <button onClick={() => playInspectPlaylist(false)} className="rounded-xl border border-brand-accent/25 bg-brand-accent/12 px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black">Play Now</button>
                            <button onClick={queueInspectPlaylist} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Add To Queue</button>
                            <button onClick={() => playInspectPlaylist(true)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Shuffle Play</button>
                            {!isInspectPlaylistFromVault && <button onClick={() => openLibraryOverlay({
                    type: 'queue',
                    items: inspectPlaylistTracks
                  })} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Save To Vault</button>}
                            <button onClick={favoriteInspectPlaylist} className="rounded-xl border border-rose-300/15 bg-rose-400/[0.055] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-rose-200/70 transition-all hover:border-rose-300/35 hover:text-rose-200">Favorite All</button>
                          </> : <>
                            <button onClick={() => {
                    setQueue(prev => [normalizeQueueTrack(inspectTrack) || inspectTrack, ...(Array.isArray(prev) ? prev.filter(track => normalizeTrackIdentity(track) !== normalizeTrackIdentity(inspectTrack)) : [])]);
                    setIsManualStop(false);
                    setIsPlaying(true);
                    setInspectTarget(null);
                  }} className="rounded-xl border border-brand-accent/25 bg-brand-accent/12 px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black">Play Now</button>
                            <button onClick={() => handleAdd(inspectTrack)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Queue</button>
                            <button onClick={() => toggleFavoriteTrack(inspectTrack)} className={`rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${isTrackFavorite(inspectTrack) ? 'border-rose-300/30 bg-rose-400/14 text-rose-200' : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-rose-300/35 hover:text-rose-300'}`}>{isTrackFavorite(inspectTrack) ? 'Unfavorite' : 'Favorite'}</button>
                            <button onClick={() => openLibraryOverlay({
                    type: 'track',
                    items: [inspectTrack]
                  })} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Vault</button>
                            <button disabled={!inspectSourceUrl} onClick={() => {
                    if (inspectSourceUrl) {
                      if (isStandalone && window.aether?.openExternal) window.aether.openExternal(inspectSourceUrl);else window.open(inspectSourceUrl, '_blank', 'noopener,noreferrer');
                    }
                  }} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent disabled:opacity-35">Source</button>
                            <button disabled={!inspectSourceUrl} onClick={() => handleCopyDiagnosticsValue(inspectSourceUrl, 'Source copied')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent disabled:opacity-35">Copy URL</button>
                            <button onClick={() => handleCopyDiagnosticsValue(`${inspectTrack.title || 'Unknown Track'}\n${inspectTrack.author || 'Unknown Artist'}${inspectSourceUrl ? `\n${inspectSourceUrl}` : ''}`, 'Track info copied')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Copy Info</button>
                          </>}
                      </div>
                    </div>
                    <div className="flex-1 rounded-2xl border border-white/8 bg-black/24 p-4">
                      {isPlaylistInspect ? <>
                          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Playlist Signal</div>
                          <div className="mt-4 text-xl font-black leading-tight text-white/90">
                            {inspectPlaylistSignal.topArtistCount > 1 ? `${inspectPlaylistSignal.topArtist} leads this vault` : 'Balanced artist spread'}
                          </div>
                          <div className="mt-3 text-sm leading-6 text-white/45">
                            Avg track {formatTime(inspectPlaylistSignal.avgDurationMs)} // {inspectPlaylistSignal.queuedPercent}% already queued // {inspectPlaylistSignal.offlinePercent}% downloaded
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            {[['Duplicates', inspectPlaylistSignal.duplicateTracks], ['Missing Links', inspectPlaylistSignal.missingSources], ['Favorites', inspectPlaylistSignal.favorites], ['Offline Ready', inspectPlaylistSignal.downloaded]].map(([label, value]) => <div key={label} className={`rounded-xl border px-3 py-3 ${value > 0 ? 'border-brand-accent/18 bg-brand-accent/[0.055]' : 'border-white/8 bg-white/[0.03]'}`}>
                                <div className="text-lg font-black text-white">{value}</div>
                                <div className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/32">{label}</div>
                              </div>)}
                          </div>
                          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-accent">Recommended</div>
                            <div className="mt-2 text-[11px] leading-5 text-white/45">
                              {inspectPlaylistSignal.duplicateTracks > 0 ? 'Clean duplicates before exporting or sharing this vault.' : inspectPlaylistSignal.missingSources > 0 ? 'Some tracks do not have source links, so copy URLs may be incomplete.' : inspectPlaylistQueuedCount > 0 ? 'Use Add To Queue to append only when you want these after the current buffer.' : isInspectPlaylistFromVault ? 'Playlist is ready for Play Now, Shuffle Play, or Favorite All.' : 'Playlist is ready for Play Now, Shuffle Play, or saving into a vault.'}
                            </div>
                          </div>
                          <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/32">
                            Opened from {inspectTarget?.source || 'playlist'}{inspectTarget?.openedAt ? ` // ${new Date(inspectTarget.openedAt).toLocaleTimeString()}` : ''}
                          </div>
                        </> : <>
                          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Live Lyric</div>
                          <div className="mt-4 text-2xl font-black leading-tight text-white/90">
                            {compactLyric || 'No synced lyric locked right now.'}
                          </div>
                          <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/32">
                            Opened from {inspectTarget?.source || 'track'}{inspectTarget?.openedAt ? ` // ${new Date(inspectTarget.openedAt).toLocaleTimeString()}` : ''}
                          </div>
                        </>}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence><AnimatePresence>
          {isLibraryOverlayOpen && <StudioLibraryOverlayIsland isOpen={isLibraryOverlayOpen} isStandalone={isStandalone} isVaultCleaning={isVaultCleaning} isVaultImporting={isVaultImporting} libraryActionTarget={libraryActionTarget} currentTrack={currentTrack} isPlaying={isPlaying} getProxyUrl={getProxyUrl} libraryOverlayCreateInputRef={libraryOverlayCreateInputRef} newPlaylistName={newPlaylistName} setNewPlaylistName={setNewPlaylistName} setIsCreatingPlaylist={setIsCreatingPlaylist} handleAddToPlaylist={handleAddToPlaylist} pendingLibraryItems={pendingLibraryItems} canAddPendingToVault={canAddPendingToVault} libraryBrowseMode={libraryBrowseMode} libraryModeOptions={libraryModeOptions} setLibraryBrowseMode={setLibraryBrowseMode} librarySearchTerm={librarySearchTerm} setLibrarySearchTerm={setLibrarySearchTerm} librarySongFilterOptions={librarySongFilterOptions} libraryPlaylistFilterOptions={libraryPlaylistFilterOptions} librarySongFilter={librarySongFilter} setLibrarySongFilter={setLibrarySongFilter} libraryFilter={libraryFilter} setLibraryFilter={setLibraryFilter} librarySongSortOptions={librarySongSortOptions} libraryPlaylistSortOptions={libraryPlaylistSortOptions} librarySongSort={librarySongSort} setLibrarySongSort={setLibrarySongSort} librarySort={librarySort} setLibrarySort={setLibrarySort} librarySearchNeedle={librarySearchNeedle} libraryVisibleSongEntries={libraryVisibleSongEntries} libraryVisiblePlaylistNames={libraryVisiblePlaylistNames} showFavoriteLibraryCard={showFavoriteLibraryCard} favoriteTracksList={favoriteTracksList} viewingPlaylist={viewingPlaylist} setViewingPlaylist={setViewingPlaylist} isRenamingPlaylist={isRenamingPlaylist} setIsRenamingPlaylist={setIsRenamingPlaylist} renameValue={renameValue} setRenameValue={setRenameValue} handleRenamePlaylist={handleRenamePlaylist} movePlaylist={movePlaylist} handlePlaylistAddAll={handlePlaylistAddAll} handleDeletePlaylist={handleDeletePlaylist} handleFavoritePlayAll={handleFavoritePlayAll} handleFavoriteAddAll={handleFavoriteAddAll} handleExportVault={handleExportVault} openTrackInspect={openTrackInspect} handleAdd={handleAdd} toggleFavoriteTrack={toggleFavoriteTrack} isTrackFavorite={isTrackFavorite} handleRemoveTrackEverywhere={handleRemoveTrackEverywhere} draggedPlaylistName={draggedPlaylistName} setDraggedPlaylistName={setDraggedPlaylistName} reorderPlaylistByDrag={reorderPlaylistByDrag} playlists={playlists} libraryTrackSort={libraryTrackSort} setLibraryTrackSort={setLibraryTrackSort} handlePlaylistPlayAll={handlePlaylistPlayAll} handleRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist} focusedVaultName={focusedVaultName} focusedVaultVisibleTracks={focusedVaultVisibleTracks} focusedVaultTracks={focusedVaultTracks} libraryInsights={libraryInsights} isViewingFavorites={isViewingFavorites} getTrackPlayCount={getTrackPlayCount} getTrackLastListenedMs={getTrackLastListenedMs} getTrackAddedMs={getTrackAddedMs} isDoodleMode={isDoodleMode} handleImportVault={handleImportVault} handleGenerateSmartMix={handleGenerateSmartMix} handleCleanVault={handleCleanVault} downloadedTracks={downloadedTracks} resolveWarmupTrackId={resolveWarmupTrackId} trackHasSavedLyrics={trackHasSavedLyrics} onDownloadMissingForVault={handleDownloadMissingForVault} onClose={closeLibraryOverlay} />}
        </AnimatePresence></>;
}
