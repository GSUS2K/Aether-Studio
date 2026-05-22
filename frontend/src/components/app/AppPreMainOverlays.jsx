export function AppPreMainOverlays(props) {
  const {
  AlertTriangle, AnimatePresence, RefreshCw, X, activeLyricIndex, applyStoragePolicy, author, canUseUpdater,
  clearAllDownloadedTracks, closeTipsOverlay, confirmed, cookieAssuranceLine, cookieStatusLabel, cookieStatusTone, cookieSummaryLine, currentTrack,
  diagnosticPathBlockClass, diagnostics, diagnosticsApiBase, diagnosticsTopOffset, dismissRuntimeIssuePrompt, downloadLabelById, e, engineStatus,
  event, ffmpegDetailLine, ffmpegStatusLabel, ffmpegStatusTone, flashLastAdded, formatBytes, formatDiagTime, handleAttemptFixes,
  handleCopyDiagnosticsValue, handleImportCookies, handleRepairEnvironment, handleResetPlaybackEngine, handleRunInstaller, handleRunRuntimeRepair, handleUpdateAction, idx,
  isAudioBuffering, isAutoScrollPaused, isDiagnosticsOpen, isMacPlatform, isOfflineDownloadsBusy, isOfflineRemovalBusy, isPlaying, isRuntimeRepairing,
  isStandalone, isStorageBusy, isTipsOverlayOpen, isUpdateBusy, item, lyricOffsetMs, meta, motion,
  offlineDownloads, openDiagnosticsPage, openShortcutSettings, parseInt, parsed, playbackModeLabel, prev, queue,
  queuePollDisplay, queuePollTime, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats, removeDownloadedById, repairActionLabel, repairResult,
  requestDestructiveConfirmation, resetConfirmationSkipPrefs, runStorageOptimize, runtimeIssuePrompt, setIsDiagnosticsOpen, setSkipEvents, setStoragePolicy, setTipsDontShowAgain,
  shortcuts, skipEvents, storageEstimate, storagePolicy, storageStats, systemStats, tipsDontShowAgain, title,
  toReadableShortcut, updateActionLabel, updateInfo, workspaceModeLabel, ytDlpDetailLine, ytDlpStatusLabel, ytDlpStatusTone,
  } = props;

  return <><AnimatePresence>
          {isTipsOverlayOpen && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[310] flex items-center justify-center p-4" onClick={closeTipsOverlay}>
        
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div initial={{
        scale: 0.96,
        y: 14
      }} animate={{
        scale: 1,
        y: 0
      }} exit={{
        scale: 0.96,
        y: 10
      }} className="relative z-10 w-[min(94vw,860px)] max-h-[88vh] overflow-y-auto rounded-3xl border border-brand-accent/25 bg-[#090b0f]/95 p-5 md:p-7 shadow-[0_0_90px_rgba(0,255,191,0.15)]" onClick={e => e.stopPropagation()}>
          
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">First-run Guide</div>
                    <div className="text-2xl md:text-3xl font-black text-brand-accent uppercase tracking-tight">Welcome to Aether</div>
                    <div className="text-white/55 mt-2 text-sm">Quick controls and feature map so you can use everything in under a minute.</div>
                  </div>
                  <button onClick={closeTipsOverlay} className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.03] text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close tips">
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Command Shortcuts</div>
                    <ul className="mt-3 space-y-2 text-white/75">
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.playPause, isMacPlatform)}</span> — Play / Pause</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.previous, isMacPlatform)}</span> — Previous</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.next, isMacPlatform)}</span> — Next</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.volumeUp, isMacPlatform)}</span> — Volume up</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.volumeDown, isMacPlatform)}</span> — Volume down</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.mute, isMacPlatform)}</span> — Mute / Unmute</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.clearQueue, isMacPlatform)}</span> — Clear queue</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.focusSearch, isMacPlatform)}</span> — Focus search</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.shortcutSettings, isMacPlatform)}</span> — Shortcut settings</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.studioLibrary, isMacPlatform)}</span> — Studio Library</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.experienceCenter, isMacPlatform)}</span> — Experience Center</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.auraStage, isMacPlatform)}</span> — Aura Stage</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.focusMode, isMacPlatform)}</span> — Toggle focus view</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.miniPlayer, isMacPlatform)}</span> — Toggle mini player</li>
                      <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.diagnostics, isMacPlatform)}</span> — Diagnostics page</li>
                    </ul>
                    <div className="mt-3 text-[11px] text-white/45">Tip: media keys may be managed by your OS. App shortcuts above always work while Aether is focused.</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Main Buttons</div>
                    <ul className="mt-3 space-y-2 text-white/75">
                      <li><span className="text-brand-accent font-black">Search bar</span> — find songs quickly</li>
                      <li><span className="text-brand-accent font-black">Studio / Stack</span> — switch workspace layout</li>
                      <li><span className="text-brand-accent font-black">Focus</span> — hide side panels for a cleaner stage</li>
                      <li><span className="text-brand-accent font-black">Diagnostics</span> — debug network/playback issues</li>
                      <li><span className="text-brand-accent font-black">Vault overlay</span> — save/import/export playlists</li>
                      <li><span className="text-brand-accent font-black">Smart Mix</span> — generate instant context playlist</li>
                      <li><span className="text-brand-accent font-black">Sleep Timer</span> — auto-stop playback later</li>
                    </ul>
                  </div>
                </div>

                <label className="mt-5 flex items-center gap-3 text-sm text-white/70 select-none cursor-pointer">
                  <input type="checkbox" checked={tipsDontShowAgain} onChange={e => setTipsDontShowAgain(e.target.checked)} className="w-4 h-4 accent-brand-accent" />
            
                  Don’t show this again on app startup
                </label>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button onClick={() => {
            closeTipsOverlay();
            openShortcutSettings();
          }} className="px-4 py-2 rounded-xl border border-brand-accent/35 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-all">
              
                    Customize Shortcuts
                  </button>
                  <button onClick={closeTipsOverlay} className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 hover:border-brand-accent/40 hover:text-brand-accent transition-all">
              
                    Got it
                  </button>
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence><AnimatePresence>
          {runtimeIssuePrompt && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[330] flex items-center justify-center p-4" onClick={dismissRuntimeIssuePrompt}>
        
              <div className="absolute inset-0 bg-black/78 backdrop-blur-md" />
              <motion.div initial={{
        scale: 0.96,
        y: 12
      }} animate={{
        scale: 1,
        y: 0
      }} exit={{
        scale: 0.96,
        y: 10
      }} className="relative z-10 w-[min(94vw,560px)] rounded-3xl border border-yellow-300/25 bg-[#0b0d10]/96 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)]" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={runtimeIssuePrompt.title}>
          
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-yellow-300/25 bg-yellow-300/10 text-yellow-200">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-200/70">Runtime Repair</div>
                      <div className="mt-1 text-2xl font-black uppercase tracking-tight text-white">{runtimeIssuePrompt.title}</div>
                      <div className="mt-2 text-sm leading-6 text-white/55">{runtimeIssuePrompt.message}</div>
                    </div>
                  </div>
                  <button onClick={dismissRuntimeIssuePrompt} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-white/45 transition-all hover:border-red-500/40 hover:text-red-300" title="Dismiss">
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button onClick={() => {
            dismissRuntimeIssuePrompt();
            openDiagnosticsPage();
          }} className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/62 transition-all hover:border-brand-accent/35 hover:text-brand-accent">
              
                    Open Diagnostics
                  </button>
                  <button onClick={handleRunInstaller} className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/62 transition-all hover:border-brand-accent/35 hover:text-brand-accent">
              
                    Open Installer
                  </button>
                  <button onClick={handleRunRuntimeRepair} disabled={isRuntimeRepairing} className="rounded-2xl border border-brand-accent/40 bg-brand-accent/15 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60">
              
                    {isRuntimeRepairing ? 'Repairing...' : runtimeIssuePrompt.actionLabel || 'Repair Runtime'}
                  </button>
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence><AnimatePresence>
          {Boolean(window.__AETHER_LEGACY_DIAGNOSTICS__) && isDiagnosticsOpen && <motion.div initial={{
      opacity: 0,
      y: -8,
      scale: 0.98
    }} animate={{
      opacity: 1,
      y: 0,
      scale: 1
    }} exit={{
      opacity: 0,
      y: -6,
      scale: 0.98
    }} className="fixed right-4 md:right-6 z-[240] w-[min(92vw,420px)] overflow-y-auto custom-scrollbar glass-card bg-[#07090c]/90 border border-white/10 backdrop-blur-2xl rounded-3xl p-4 md:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]" style={{
      top: diagnosticsTopOffset,
      maxHeight: `calc(100vh - ${diagnosticsTopOffset + 16}px)`
    }}>
        
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] tracking-[0.24em] uppercase font-black text-brand-accent">Diagnostics</div>
                <button onClick={() => setIsDiagnosticsOpen(false)} className="text-white/40 hover:text-brand-accent transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button onClick={handleResetPlaybackEngine} className="px-3 py-1.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent text-[10px] font-black uppercase tracking-[0.16em] hover:bg-brand-accent/20 transition-all">
            
                  Reset Engine
                </button>
                {isStandalone && <button onClick={handleRunRuntimeRepair} disabled={isRuntimeRepairing} className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 text-[10px] font-black uppercase tracking-[0.16em] hover:border-brand-accent/35 hover:text-brand-accent transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            
                    {repairActionLabel}
                  </button>}
                <button onClick={async () => {
          const confirmed = await requestDestructiveConfirmation({
            title: 'Clear diagnostic events?',
            message: 'Aether will clear the current skip and transport event log from this session.',
            detail: 'This only clears diagnostics shown here. Your music library is not changed.',
            confirmLabel: 'Clear Events',
            allowDontAskAgain: true,
            preferenceKey: 'diagnostics.clearEvents'
          });
          if (confirmed) setSkipEvents([]);
        }} className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 text-[10px] font-black uppercase tracking-[0.16em] hover:border-white/30 transition-all">
            
                  Clear Events
                </button>
                <button onClick={() => {
          resetConfirmationSkipPrefs();
          flashLastAdded('Confirmation prompts reset', 2200, 'success');
        }} className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 text-[10px] font-black uppercase tracking-[0.16em] hover:border-brand-accent/35 hover:text-brand-accent transition-all" title="Show skipped confirmation dialogs again">
            
                  Reset Prompts
                </button>
                {canUseUpdater && updateInfo?.enabled && <button onClick={handleUpdateAction} disabled={isUpdateBusy || updateInfo?.status === 'checking' || updateInfo?.status === 'downloading'} className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:opacity-60 disabled:cursor-not-allowed ${updateInfo?.downloaded ? 'bg-brand-accent border-brand-dark text-brand-dark shadow-neon-strong' : updateInfo?.available ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent hover:bg-brand-accent/20' : 'border-white/15 bg-white/[0.03] text-white/70 hover:border-white/30'}`} title={updateInfo?.message || 'Check for updates'}>
            
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw size={11} className={`${updateInfo?.status === 'checking' || updateInfo?.status === 'downloading' ? 'animate-spin' : ''}`} />
                      {updateActionLabel}
                    </span>
                  </button>}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-white/40 uppercase mb-1">Transport</div>
                  <div className={`font-black ${isAudioBuffering ? 'text-yellow-400' : isPlaying ? 'text-brand-accent' : 'text-white/70'}`}>
                    {isAudioBuffering ? 'BUFFERING' : isPlaying ? 'PLAYING' : 'PAUSED'}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-white/40 uppercase mb-1">Queue</div>
                  <div className="font-black text-brand-accent">{Math.max(0, queue.length - 1)} pending</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-white/40 uppercase mb-1">App CPU</div>
                  <div className="font-black text-brand-accent">{systemStats?.appCpu ?? 0}%</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-white/40 uppercase mb-1">App Memory</div>
                  <div className="font-black text-brand-accent">{systemStats?.appMem ?? 0}MB</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                  <div className="text-white/40 uppercase mb-1">Workspace Mode</div>
                  <div className="font-black text-white/80">{workspaceModeLabel} • {playbackModeLabel}</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                  <div className="text-white/40 uppercase mb-1">Current Node</div>
                  <div className="font-black text-white/85 truncate">{currentTrack?.title || '—'}</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-white/40 uppercase mb-1">Queue Poll</div>
                  <div className="font-black text-brand-accent">{queuePollDisplay}</div>
                  <div className="text-white/40 mt-1">{queuePollTime}</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-white/40 uppercase mb-1">System Poll</div>
                  <div className="font-black text-brand-accent">{diagnostics.lastSystemFetchMs ?? '—'}ms</div>
                  <div className="text-white/40 mt-1">{formatDiagTime(diagnostics.lastSystemFetchAt)}</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-white/40 uppercase mb-1">Lyrics Source</div>
                  <div className="font-black text-brand-accent truncate">{diagnostics.lastLyricsSource || '—'}</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-white/40 uppercase mb-1">Song Fetch</div>
                  <div className="font-black text-brand-accent">{diagnostics.lastSongFetchMs ?? '—'}ms</div>
                  <div className="text-white/40 mt-1 truncate">{diagnostics.lastSongSource || '-'}</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                  <div className="text-white/40 uppercase mb-1">Lyrics Fetch</div>
                  <div className="font-black text-brand-accent">{diagnostics.lastLyricsFetchMs ?? '—'}ms</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                  <div className="text-white/40 uppercase mb-1">Sync State</div>
                  <div className="font-black text-white/80">offset {lyricOffsetMs}ms • line {activeLyricIndex >= 0 ? activeLyricIndex + 1 : 0} • {isAutoScrollPaused ? 'manual' : 'auto'}</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                  <div className="text-white/40 uppercase mb-1">Transport Guard</div>
                  <div className="font-black text-white/80">
                    hits {diagnostics.transportGuardHits ?? 0}
                    {diagnostics.lastTransportGuardAction ? ` • last ${diagnostics.lastTransportGuardAction}` : ''}
                    {diagnostics.lastTransportGuardAt ? ` • ${formatDiagTime(diagnostics.lastTransportGuardAt)}` : ''}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                  <div className="text-white/40 uppercase mb-1">API Base</div>
                  <div className="font-black text-white/70">{diagnosticsApiBase}</div>
                  <div className={diagnosticPathBlockClass}>{diagnosticsApiBase}</div>
                  <button onClick={() => handleCopyDiagnosticsValue(diagnosticsApiBase, 'API base copied')} className="mt-2 inline-flex items-center rounded-lg border border-white/12 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent transition-all">
              
                    Copy
                  </button>
                </div>

                {isStandalone && <>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                      <div className="text-white/40 uppercase mb-1">YT-DLP</div>
                      <div className={`font-black ${ytDlpStatusTone}`}>
                        {ytDlpStatusLabel}
                      </div>
                      <div className="text-white/45 mt-1">{ytDlpDetailLine}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={handleRepairEnvironment} className="inline-flex items-center rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent transition-all">
                  
                          {repairResult?.status === 'running' ? 'Repairing…' : 'Repair Environment'}
                        </button>
                        {repairResult?.status === 'done' && <div className="flex items-center gap-2">
                            <div className="text-[11px] font-black text-white/70">{repairResult.result?.ytDlpReady ? 'OK' : 'Issues found'}</div>
                            {!repairResult.result?.ytDlpReady && <button onClick={handleAttemptFixes} className="inline-flex items-center rounded-lg border border-white/12 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent transition-all">
                    
                                Attempt Platform Fixes
                              </button>}
                            {!repairResult?.installerResult?.success && <button onClick={handleRunInstaller} className="inline-flex items-center rounded-lg border border-white/12 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent transition-all">
                    
                                Open Installer / Releases
                              </button>}
                          </div>}
                        {repairResult?.status === 'error' && <div className="text-[11px] font-black text-red-400">{repairResult.error}</div>}
                      </div>
                      <div className={diagnosticPathBlockClass}>{engineStatus?.ytDlpPath || 'bootstrap pending'}</div>
                      {engineStatus?.ytDlpPath && <button onClick={() => handleCopyDiagnosticsValue(engineStatus.ytDlpPath, 'yt-dlp path copied')} className="mt-2 inline-flex items-center rounded-lg border border-white/12 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent transition-all">
                
                          Copy Path
                        </button>}
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                      <div className="text-white/40 uppercase mb-1">FFmpeg</div>
                      <div className={`font-black ${ffmpegStatusTone}`}>
                        {ffmpegStatusLabel}
                      </div>
                      <div className="text-white/45 mt-1">{ffmpegDetailLine}</div>
                      <div className={diagnosticPathBlockClass}>{engineStatus?.ffmpegPath || 'not resolved'}</div>
                      {engineStatus?.ffmpegPath && <button onClick={() => handleCopyDiagnosticsValue(engineStatus.ffmpegPath, 'FFmpeg path copied')} className="mt-2 inline-flex items-center rounded-lg border border-white/12 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent transition-all">
                
                          Copy Path
                        </button>}
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                      <div className="text-white/40 uppercase mb-1">Cookies Session</div>
                      <div className={`font-black ${cookieStatusTone}`}>
                        {cookieStatusLabel}
                      </div>
                      <div className="text-white/45 mt-1">{cookieSummaryLine}</div>
                      <div className="text-[10px] text-white/35 mt-1">{cookieAssuranceLine}</div>
                      {engineStatus?.cookiesPath && <div className={diagnosticPathBlockClass}>{engineStatus.cookiesPath}</div>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={handleImportCookies} className="px-2.5 py-1.5 rounded-lg border border-brand-accent/30 text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 transition-all">
                  
                          Upload Cookies
                        </button>
                        {engineStatus?.cookiesPath && <button onClick={() => handleCopyDiagnosticsValue(engineStatus.cookiesPath, 'Cookie path copied')} className="px-2.5 py-1.5 rounded-lg border border-white/15 text-white/70 bg-white/[0.03] hover:border-brand-accent/30 hover:text-brand-accent transition-all">
                  
                            Copy Path
                          </button>}
                        <button onClick={() => {
                if (isStandalone && window.aether?.openExternal) {
                  window.aether.openExternal('https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies');
                } else {
                  window.open('https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies', '_blank');
                }
              }} className="px-2.5 py-1.5 rounded-lg border border-white/15 text-white/70 bg-white/[0.03] hover:border-white/30 transition-all">
                  
                          Cookie Guide
                        </button>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                      <div className="text-white/40 uppercase mb-1">Storage</div>
                      <div className="font-black text-brand-accent">{formatBytes(storageStats?.totalBytes || 0)}</div>
                      <div className="text-white/45 mt-1">
                        downloads {formatBytes(storageStats?.downloadsBytes || 0)} • cache {formatBytes(storageStats?.cacheBytes || 0)}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2 space-y-2">
                      <div className="text-white/40 uppercase">Storage Policy</div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-white/55">
                          Cache cap (MB)
                          <input type="number" min={256} max={16384} value={storagePolicy.cacheCapMb} onChange={e => {
                  const parsed = parseInt(e.target.value || '2048', 10);
                  setStoragePolicy(prev => ({
                    ...prev,
                    cacheCapMb: Number.isFinite(parsed) ? Math.max(256, parsed) : 2048
                  }));
                }} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white" />
                  
                        </label>
                        <label className="text-white/55">
                          Age cleanup (days)
                          <input type="number" min={1} max={365} value={storagePolicy.maxCacheAgeDays} onChange={e => {
                  const parsed = parseInt(e.target.value || '30', 10);
                  setStoragePolicy(prev => ({
                    ...prev,
                    maxCacheAgeDays: Number.isFinite(parsed) ? Math.max(1, parsed) : 30
                  }));
                }} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white" />
                  
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button disabled={isStorageBusy} onClick={async () => {
                await applyStoragePolicy(storagePolicy);
                await refreshStorageStats();
              }} className="px-2 py-1 rounded-lg border border-brand-accent/30 text-brand-accent bg-brand-accent/10 disabled:opacity-50">
                  
                          Save Policy
                        </button>
                        <button disabled={isStorageBusy} onClick={() => runStorageOptimize('cap')} className="px-2 py-1 rounded-lg border border-white/15 text-white/75 bg-white/[0.03] disabled:opacity-50">
                  
                          Trim to Cap {storageEstimate.cap ? `(${formatBytes(storageEstimate.cap.estimatedBytes)})` : ''}
                        </button>
                        <button disabled={isStorageBusy} onClick={() => runStorageOptimize('age')} className="px-2 py-1 rounded-lg border border-white/15 text-white/75 bg-white/[0.03] disabled:opacity-50">
                  
                          Clean Old Cache {storageEstimate.age ? `(${formatBytes(storageEstimate.age.estimatedBytes)})` : ''}
                        </button>
                        <button disabled={isStorageBusy} onClick={() => runStorageOptimize('downloads-only')} className="px-2 py-1 rounded-lg border border-yellow-500/30 text-yellow-300 bg-yellow-500/10 disabled:opacity-50">
                  
                          Keep Downloaded Only {storageEstimate.downloadsOnly ? `(${formatBytes(storageEstimate.downloadsOnly.estimatedBytes)})` : ''}
                        </button>
                        <button disabled={isStorageBusy} onClick={async () => {
                await refreshStorageStats();
                await refreshStorageEstimate();
              }} className="px-2 py-1 rounded-lg border border-white/15 text-white/60 bg-white/[0.02] disabled:opacity-50">
                  
                          Refresh
                        </button>
                      </div>

                      <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="text-white/55 uppercase text-[11px]">Downloaded Tracks ({offlineDownloads.length})</div>
                          <div className="flex items-center gap-2">
                            <button disabled={isOfflineRemovalBusy || isOfflineDownloadsBusy} onClick={refreshOfflineDownloads} className="px-2 py-1 rounded-lg border border-white/15 text-white/70 bg-white/[0.03] disabled:opacity-50">
                      
                              Refresh List
                            </button>
                            <button disabled={offlineDownloads.length === 0 || isOfflineRemovalBusy || isOfflineDownloadsBusy} onClick={clearAllDownloadedTracks} className="px-2 py-1 rounded-lg border border-red-500/35 text-red-300 bg-red-500/10 disabled:opacity-50">
                      
                              Clear All Downloads
                            </button>
                          </div>
                        </div>

                        <div className="max-h-52 overflow-y-auto pr-1 space-y-1">
                          {offlineDownloads.length === 0 ? <div className="text-white/35 text-xs">No downloaded tracks stored.</div> : offlineDownloads.map(item => {
                  const meta = downloadLabelById.get(item.id);
                  const title = meta?.title || item.id;
                  const author = meta?.author || 'Unknown';
                  return <div key={`download-${item.id}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5">
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] text-white/85 font-black truncate">{title}</div>
                                  <div className="text-[10px] text-white/45 truncate">{author} • {formatBytes(item.bytes || 0)}{item.modifiedAt ? ` • ${new Date(item.modifiedAt).toLocaleString()}` : ''}</div>
                                </div>
                                <button disabled={isOfflineRemovalBusy || isOfflineDownloadsBusy} onClick={() => removeDownloadedById(item.id, title)} className="px-2 py-1 rounded-md border border-red-500/35 text-red-300 bg-red-500/10 disabled:opacity-50" title="Delete downloaded file">
                          
                                  Delete
                                </button>
                              </div>;
                })}
                        </div>
                      </div>
                    </div>
                  </>}

                {(diagnostics.lastQueueError || diagnostics.lastSystemError || diagnostics.lastLyricsError) && <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 col-span-2">
                    <div className="text-red-300 uppercase mb-1">Last Error</div>
                    <div className="font-black text-red-200/90 truncate">{diagnostics.lastQueueError || diagnostics.lastSystemError || diagnostics.lastLyricsError}</div>
                  </div>}

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-white/40 uppercase">Recent Events</div>
                    <div className="text-[10px] text-white/30">{skipEvents.length} / 50</div>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-auto pr-1">
                    {skipEvents.length === 0 ? <div className="text-white/35">No recent events captured yet.</div> : skipEvents.slice(-8).reverse().map((event, idx) => <div key={`${event.at || 0}-${idx}`} className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2 text-white/70">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-brand-accent text-[10px]">{event.at ? new Date(event.at).toLocaleTimeString() : '--:--'}</span>
                            <span className={`text-[9px] uppercase tracking-[0.16em] ${event.tone === 'error' ? 'text-red-300' : event.tone === 'success' ? 'text-brand-accent' : event.tone === 'warning' ? 'text-yellow-300' : 'text-white/35'}`}>
                              {event.tone || 'event'}
                            </span>
                          </div>
                          <div className="mt-1 font-black text-white/85 break-words">{event.label || event.reason || 'event'}</div>
                          <div className="mt-1 text-white/45 break-words">{event.detail || event.title || 'No details'}</div>
                        </div>)}
                  </div>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence></>;
}
