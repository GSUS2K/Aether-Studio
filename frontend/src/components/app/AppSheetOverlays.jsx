export function AppSheetOverlays(props) {
  const {
  AlertTriangle, AnimatePresence, Check, Clock, Copy, Edit3, Minimize2, MinusCircle,
  PlusCircle, RefreshCw, RotateCcw, Sparkles, ToastPortal, X, Zap, activeLyricIndex,
  activeLyricMax, alphaHex, appendManualLyricsDraftLine, appendStampedManualLyricsLine, copyManualLyricsToClipboard, currentTrack, currentTrackTitle, distance,
  e, event, expandedActiveRef, expandedContainerRef, farLyricMax, formatManualLyricsTimestamp, getActivePlaybackPositionMs, handleCopyPhrase,
  handleDisableLock, handleEnableLock, handleGenerateRecoveryPhrase, handleLyricLineSeek, handleResyncLyrics, handleSaveManualLyrics, handleToggleTouchIdLock, idx,
  immersiveBeatIntensity, index, inferToastTone, isActive, isAuraMode, isAutoScrollPaused, isLockBusy, isLockModalOpen,
  isManualLyricsEditorOpen, isManualLyricsRawEditorOpen, isManualLyricsSaving, isManualLyricsTapMode, isStandalone, lastAdded, line, loadManualLyricsFromRawText,
  lockDisablePassword, lockError, lockIdleMinutes, lockPasswordConfirm, lockPasswordInput, lockRecoveryStatus, lockRecoveryStatusError, lockStatus,
  lockUseTouchId, lyricFontSize, lyricLength, lyricLineLayoutClass, lyricStateClass, lyricText, lyrics, manualLyricsDraft,
  manualLyricsDraftError, manualLyricsRawText, manualLyricsSavedNotice, motion, nearLyricMax, parseInt, parseManualLyricsTimestamp, parsed,
  pasteCurrentLyricsIntoRawEditor, phraseBusy, phraseCopied, phraseGenerated, prev, refreshLockRecoveryStatus, removeManualLyricsDraftLine, sessionRestoreNotice,
  setIsAppLocked, setIsLockModalOpen, setIsLyricsExpanded, setIsManualLyricsEditorOpen, setIsManualLyricsRawEditorOpen, setLockDisablePassword, setLockIdleMinutes, setLockPasswordConfirm,
  setLockPasswordInput, setLockUseTouchId, setManualLyricsRawText, sharedModalCloseButtonClass, showImmersiveLyricsOverlay, skipReasonToast, stampManualLyricsDraftLine, themeColor,
  updateInfo, updateManualLyricsDraftLine, updateToast,
  } = props;

  return <><AnimatePresence>
          {isManualLyricsEditorOpen && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[230] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        
              <div className="absolute inset-0" onClick={() => {
        if (!isManualLyricsSaving) setIsManualLyricsEditorOpen(false);
      }} />
        
              <motion.div initial={{
        opacity: 0,
        y: 12,
        scale: 0.98
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: 8,
        scale: 0.98
      }} className="relative z-10 w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[2rem] border border-white/10 bg-[#07090c]/96 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col">
          
                <div className="flex items-start justify-between gap-4 p-4 md:p-5 border-b border-white/10 bg-black/20">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                        <Edit3 size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.32em] text-brand-accent">Manual Lyrics Editor</div>
                        <div className="mt-1 text-sm md:text-base font-black text-white/90 truncate">
                          {currentTrack?.title || currentTrackTitle || 'Current track'}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/35 truncate">
                          Saved in LRC format • future plays will use this version automatically
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button onClick={() => setIsManualLyricsRawEditorOpen(prev => !prev)} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${isManualLyricsRawEditorOpen ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                  
                        Raw LRC
                      </button>
                      <button onClick={pasteCurrentLyricsIntoRawEditor} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 hover:text-brand-accent hover:border-brand-accent/35 transition-all">
                  
                        Paste from clipboard
                      </button>
                      <button onClick={copyManualLyricsToClipboard} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 hover:text-brand-accent hover:border-brand-accent/35 transition-all">
                  
                        Export LRC
                      </button>
                      <button onClick={appendStampedManualLyricsLine} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${isManualLyricsTapMode ? 'bg-brand-accent text-black border-brand-accent shadow-neon' : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                  
                        {isManualLyricsTapMode ? 'Tap mode on' : 'Tap to stamp'}
                      </button>
                      {manualLyricsSavedNotice && <span className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/80">{manualLyricsSavedNotice}</span>}
                    </div>
                  </div>
                  <button onClick={() => {
            if (!isManualLyricsSaving) setIsManualLyricsEditorOpen(false);
          }} className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close editor">
              
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 custom-scrollbar">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                      Enter one line per row. Use <span className="text-brand-accent">mm:ss.xx</span> timestamps and keep the order sorted before saving.
                    </div>
                    <button onClick={() => appendManualLyricsDraftLine(getActivePlaybackPositionMs())} className="flex items-center gap-1.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent hover:bg-brand-accent/20 transition-all">
                
                      <PlusCircle size={12} /> Add line
                    </button>
                  </div>

                  {isManualLyricsRawEditorOpen && <div className="rounded-[1.5rem] border border-brand-accent/25 bg-brand-accent/5 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Raw LRC import</div>
                          <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/40">Paste timestamped lines, then apply them to the editor below.</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={loadManualLyricsFromRawText} className="rounded-xl border border-brand-accent/30 bg-brand-accent px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-all hover:scale-[1.01]">
                    
                            Apply LRC
                          </button>
                          <button onClick={() => setIsManualLyricsRawEditorOpen(false)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 hover:text-brand-accent hover:border-brand-accent/35 transition-all">
                    
                            Hide raw
                          </button>
                        </div>
                      </div>
                      <textarea value={manualLyricsRawText} onChange={event => setManualLyricsRawText(event.target.value)} placeholder="[00:00.00] Intro\n[00:12.30] First line" className="w-full min-h-[180px] rounded-[1.25rem] border border-white/10 bg-black/35 px-4 py-3 text-[12px] font-mono text-white outline-none transition-colors placeholder:text-white/20 focus:border-brand-accent/40" />
              
                    </div>}

                  {manualLyricsDraft.length === 0 ? <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-white/35">
                      <Sparkles size={26} className="mx-auto text-brand-accent/70" />
                      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.32em]">No lines yet</div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] opacity-70">Add a timestamped lyric row to start building the track.</div>
                    </div> : <div className="space-y-3">
                      {manualLyricsDraft.map((line, index) => <div key={line.id || `manual-lyric-${index}-${line.time || 0}`} className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-start">
                          <div className="space-y-2">
                            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Timestamp</div>
                            <input value={line.timestamp || ''} onChange={event => updateManualLyricsDraftLine(index, {
                  timestamp: event.target.value
                })} placeholder="00:00.00" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[12px] font-mono text-white outline-none transition-colors placeholder:text-white/20 focus:border-brand-accent/40" />
                  
                            <div className="flex items-center gap-2">
                              <button onClick={() => stampManualLyricsDraftLine(index)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/55 hover:border-brand-accent/40 hover:text-brand-accent transition-all">
                      
                                Use current time
                              </button>
                              <div className="text-[9px] font-mono text-white/30 truncate">
                                {formatManualLyricsTimestamp(parseManualLyricsTimestamp(line.timestamp) ?? line.time)}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 min-w-0">
                            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Lyric line</div>
                            <input value={line.text} onChange={event => updateManualLyricsDraftLine(index, {
                  text: event.target.value
                })} placeholder="Write the lyric line here" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-brand-accent/40" />
                  
                          </div>

                          <div className="flex items-start justify-end md:pt-6">
                            <button onClick={() => removeManualLyricsDraftLine(index)} className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/50 hover:border-red-500/40 hover:text-red-400 transition-all" title="Remove line">
                    
                              <MinusCircle size={12} /> Remove
                            </button>
                          </div>
                        </div>)}
                    </div>}
                </div>

                <div className="border-t border-white/10 bg-black/25 p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                      Saved as LRC for this track
                    </div>
                    <div className={`mt-1 text-[10px] font-bold uppercase tracking-[0.18em] ${manualLyricsDraftError ? 'text-red-400' : 'text-white/30'}`}>
                      {manualLyricsDraftError || 'The app will prefer these saved lyrics the next time this song plays.'}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <button onClick={appendStampedManualLyricsLine} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/65 hover:border-brand-accent/40 hover:text-brand-accent transition-all">
                
                      Stamp + Row
                    </button>
                    <button onClick={() => {
              if (!isManualLyricsSaving) setIsManualLyricsEditorOpen(false);
            }} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/65 hover:border-white/25 hover:text-white transition-all disabled:opacity-50" disabled={isManualLyricsSaving}>
                
                      Cancel
                    </button>
                    <button onClick={handleSaveManualLyrics} disabled={isManualLyricsSaving} className="rounded-xl border border-brand-accent/30 bg-brand-accent px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-neon transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">
                
                      {isManualLyricsSaving ? 'Saving…' : 'Save Lyrics'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence>{/* Global Toast Overlay */}<ToastPortal>
          <AnimatePresence>
            {sessionRestoreNotice && <motion.div initial={{
        opacity: 0,
        y: -20,
        scale: 0.96
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -16,
        scale: 0.96
      }} className="fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 text-white font-black rounded-2xl border border-brand-accent/30 backdrop-blur-xl z-[700] flex items-center gap-3">
          
                <Clock size={14} className="text-brand-accent" />
                <span className="text-[10px] uppercase tracking-[0.2em]">{sessionRestoreNotice}</span>
              </motion.div>}

            {updateToast && <motion.div initial={{
        opacity: 0,
        y: -18,
        scale: 0.96
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -12,
        scale: 0.96
      }} className="fixed top-32 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-[#06090d]/90 text-brand-accent font-black rounded-2xl border border-brand-accent/30 backdrop-blur-xl z-[700] flex items-center gap-3">
          
                <RefreshCw size={12} className={`${updateInfo?.status === 'downloading' || updateInfo?.status === 'checking' ? 'animate-spin' : ''}`} />
                <span className="text-[9px] uppercase tracking-[0.18em]">{updateToast}</span>
              </motion.div>}

            {skipReasonToast && <motion.div initial={{
        opacity: 0,
        y: 20,
        scale: 0.96
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: 12,
        scale: 0.96
      }} className="fixed right-5 bottom-24 px-4 py-2 bg-black/70 text-brand-accent font-mono rounded-xl border border-brand-accent/30 backdrop-blur-xl z-[700]">
          
                <span className="text-[10px] uppercase tracking-[0.16em]">skip: {skipReasonToast}</span>
              </motion.div>}

            {lastAdded && <motion.div initial={{
        opacity: 0,
        y: 100
      }} animate={{
        opacity: 1,
        y: -40
      }} exit={{
        opacity: 0,
        y: 100
      }} className={`fixed bottom-0 left-1/2 z-[700] flex -translate-x-1/2 items-center gap-6 whitespace-nowrap rounded-[2rem] border-t-2 px-10 py-5 font-black shadow-neon-strong ${inferToastTone(lastAdded) === 'error' ? 'border-red-200/20 bg-red-400 text-black' : inferToastTone(lastAdded) === 'warning' ? 'border-yellow-100/20 bg-yellow-300 text-black' : 'border-white/20 bg-brand-accent text-brand-dark'}`}>
          
                {inferToastTone(lastAdded) === 'error' ? <AlertTriangle size={24} /> : inferToastTone(lastAdded) === 'warning' ? <AlertTriangle size={24} /> : <Zap size={24} fill="currentColor" />}
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1 font-bold">{inferToastTone(lastAdded) === 'error' ? 'Action Failed' : inferToastTone(lastAdded) === 'warning' ? 'Heads Up' : 'Action Complete'}</span>
                  <span className="text-base tracking-tight truncate uppercase">{lastAdded}</span>
                </div>
              </motion.div>}
          </AnimatePresence>
        </ToastPortal><AnimatePresence>
          {showImmersiveLyricsOverlay && <motion.div initial={{
      opacity: 0,
      scale: 1.1
    }} animate={{
      opacity: 1,
      scale: 1
    }} exit={{
      opacity: 0,
      scale: 1.1
    }} className={`fixed inset-0 z-[280] overflow-hidden backdrop-blur-[28px] ${isAuraMode ? 'bg-[#03100d]/92' : 'bg-[#030506]/96'}`}>
        
              <div className="absolute inset-0 pointer-events-none" style={{
        animation: isAuraMode ? 'aura-liquid-spin 20s linear infinite' : 'none'
      }}>
                <div className={`absolute inset-0 ${isAuraMode ? 'bg-[radial-gradient(circle_at_top,rgba(0,255,191,0.16),transparent_34%)]' : 'bg-[radial-gradient(circle_at_top,rgba(0,255,191,0.08),transparent_38%)]'}`} />
                {isAuraMode && <>
                    <div className="absolute left-[8%] top-[12%] h-44 w-44 rounded-full bg-brand-accent/18 blur-[90px]" />
                    <div className="absolute right-[10%] top-[18%] h-40 w-40 rounded-full bg-emerald-300/12 blur-[90px]" />
                    <div className="absolute bottom-[14%] left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-accent/12 blur-[110px]" />
                  </>}
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-4 z-[315] flex justify-center px-5 md:top-6">
                <div className={`w-full max-w-[min(82vw,980px)] rounded-[2rem] border px-5 py-4 md:px-8 md:py-6 ${isAuraMode ? 'border-brand-accent/25 bg-[#06100d]/62 shadow-[0_18px_70px_rgba(0,255,191,0.12)]' : 'border-white/10 bg-black/20 shadow-[0_16px_40px_rgba(0,0,0,0.3)]'} backdrop-blur-2xl`}>
                  <div className="w-full overflow-hidden" style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)'
          }}>
                    <div className="overlay-marquee-track flex items-center gap-[10vw] text-base font-black uppercase tracking-[0.26em] text-white sm:text-lg md:text-2xl lg:text-3xl">
                      <span>{currentTrack?.title || 'Immersive Output'}</span>
                      <span aria-hidden="true">{currentTrack?.title || 'Immersive Output'}</span>
                      <span aria-hidden="true">{currentTrack?.title || 'Immersive Output'}</span>
                      <span aria-hidden="true">{currentTrack?.title || 'Immersive Output'}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.42em] text-brand-accent/80 md:text-[11px]">
                    {currentTrack?.author || 'Unknown Artist'}
                  </div>
                </div>
              </div>

              <div className="absolute right-4 top-4 z-[320] md:right-6 md:top-6">
                <button onClick={() => setIsLyricsExpanded(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 text-brand-accent shadow-[0_18px_42px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:border-brand-accent/45 hover:bg-brand-accent/10 active:scale-90" title="Return to Studio">
            
                  <Minimize2 size={18} />
                </button>
              </div>

              <div className="relative z-10 flex h-full w-full min-h-0 flex-col">
                <div className="flex-1 overflow-y-scroll overflow-x-hidden flex flex-col px-4 pb-10 pt-32 md:px-10 md:pb-14 md:pt-36 custom-scrollbar-heavy w-full relative" ref={expandedContainerRef} style={{
          minHeight: "0px",
          perspective: '1200px'
        }}>
                  <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full" animate={{
            opacity: 0.15 + immersiveBeatIntensity * 0.4,
            scale: 1 + immersiveBeatIntensity * 0.3
          }} transition={{
            duration: 0.22,
            ease: 'easeOut'
          }} style={{
            width: 'min(84vw, 980px)',
            height: 'min(84vw, 980px)',
            background: `radial-gradient(circle, ${themeColor}${alphaHex(0.2)} 0%, ${themeColor}${alphaHex(0.09)} 35%, transparent 70%)`,
            filter: `blur(${40 + immersiveBeatIntensity * 30}px)`
          }} />
            

                  <div className="flex flex-col gap-16 lg:gap-24 py-[36vh] items-center justify-center text-center w-full max-w-full mx-auto cursor-default px-3 sm:px-5" style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(5deg)'
          }}>
                    {lyrics.map((line, idx) => {
              const isActive = idx === activeLyricIndex;
              const distance = Math.abs(idx - activeLyricIndex);
              const lyricText = String(line.text || '');
              const lyricLength = lyricText.trim().length;
              const lyricLineLayoutClass = 'max-w-[min(84vw,1080px)]';
              const lyricStateClass = isActive ? 'scale-100 opacity-100 text-white/42 drop-shadow-[0_0_34px_rgba(0,255,191,0.64)]' : distance === 1 ? 'scale-100 opacity-60 text-white/58 blur-[0.1px]' : distance === 2 ? 'scale-[0.995] opacity-30 text-white/28 blur-[0.75px]' : 'scale-[0.97] opacity-12 text-white/12 blur-[1.4px]';
              const activeLyricMax = lyricLength > 84 ? '3.35rem' : lyricLength > 64 ? '4.05rem' : lyricLength > 46 ? '4.8rem' : '5.8rem';
              const nearLyricMax = lyricLength > 84 ? '2.45rem' : lyricLength > 64 ? '3rem' : lyricLength > 46 ? '3.65rem' : '4.35rem';
              const farLyricMax = lyricLength > 84 ? '1.9rem' : lyricLength > 64 ? '2.25rem' : '3.2rem';
              const lyricFontSize = isActive ? `clamp(1.95rem, min(${lyricLength > 64 ? '3.8vw' : '4.8vw'}, 7.4vh), ${activeLyricMax})` : distance === 1 ? `clamp(1.55rem, min(${lyricLength > 64 ? '3vw' : '3.8vw'}, 5.6vh), ${nearLyricMax})` : `clamp(1.2rem, min(${lyricLength > 64 ? '2.25vw' : '2.8vw'}, 4.2vh), ${farLyricMax})`;
              return <div key={idx} ref={isActive ? expandedActiveRef : null} onClick={() => handleLyricLineSeek(line.time)} className={`${lyricLineLayoutClass} immersive-lyric-line px-2 md:px-4 font-black cursor-pointer transition-[transform,opacity,filter,text-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu origin-center leading-[1.06] w-full min-w-0 break-words whitespace-normal [overflow-wrap:anywhere] z-20 will-change-[transform,opacity,filter] ${lyricStateClass} hover:scale-[1.015]`} style={{
                fontSize: lyricFontSize,
                maxInlineSize: 'min(84vw, 1080px)',
                transitionDelay: `${Math.min(distance, 3) * 18}ms`,
                '--karaoke-fill': isActive ? '0%' : undefined
              }}>
                    
                          <span className={isActive ? 'immersive-karaoke-text immersive-karaoke-text-active' : 'immersive-karaoke-text'}>
                            {lyricText}
                          </span>
                        </div>;
            })}
                  </div>
                </div>

                {isAutoScrollPaused && <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[250]">
                    <button onClick={handleResyncLyrics} className="flex items-center gap-3 px-8 py-4 bg-brand-accent text-black font-black uppercase tracking-[0.3em] rounded-full shadow-neon scale-110 active:scale-95 transition-all">
              
                      <RotateCcw size={18} /> Re-Sync
                    </button>
                  </div>}

              </div>
            </motion.div>}
        </AnimatePresence><AnimatePresence>
          {isLockModalOpen && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[245] flex items-center justify-center p-4">
        
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !isLockBusy && setIsLockModalOpen(false)} />
              <motion.div initial={{
        y: 12,
        scale: 0.98,
        opacity: 0
      }} animate={{
        y: 0,
        scale: 1,
        opacity: 1
      }} exit={{
        y: 10,
        scale: 0.98,
        opacity: 0
      }} className="relative z-10 flex w-full max-w-lg max-h-[min(88vh,760px)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-accent">App Lock</div>
                    <div className="text-[11px] text-white/45 mt-1">Secure Aether with password and optional Touch ID. Idle auto-lock stays enabled.</div>
                  </div>
                  <button onClick={() => !isLockBusy && setIsLockModalOpen(false)} className={sharedModalCloseButtonClass}>
              
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {lockStatus.enabled ? <>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Status</div>
                        <div className="text-[12px] text-brand-accent font-black">Enabled</div>
                      </div>

                      {lockStatus.touchIdAvailable && <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer">
                          <span className="text-[11px] text-white/70">Use Touch ID</span>
                          <input type="checkbox" checked={lockUseTouchId} onChange={e => handleToggleTouchIdLock(e.target.checked)} className="accent-brand-accent" />
                
                        </label>}

                      <label className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] text-white/70">Idle auto-lock</span>
                          <span className="text-[11px] font-black text-brand-accent">{lockIdleMinutes}m</span>
                        </div>
                        <input type="range" min={1} max={60} step={1} value={lockIdleMinutes} onChange={e => {
                const parsed = parseInt(e.target.value || '5', 10);
                setLockIdleMinutes(Number.isFinite(parsed) ? Math.max(1, parsed) : 5);
              }} className="w-full accent-brand-accent" />
                
                      </label>

                      <input type="password" value={lockDisablePassword} onChange={e => setLockDisablePassword(e.target.value)} placeholder="Enter password to disable lock" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50" />
              
                      <button onClick={handleDisableLock} disabled={isLockBusy || !lockDisablePassword} className="w-full px-5 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 font-black text-sm disabled:opacity-50">
                
                        Disable Lock
                      </button>
                    </> : <>
                      <input type="password" value={lockPasswordInput} onChange={e => setLockPasswordInput(e.target.value)} placeholder="Set password" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50" />
              
                      <input type="password" value={lockPasswordConfirm} onChange={e => setLockPasswordConfirm(e.target.value)} placeholder="Confirm password" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50" />
              
                      {lockStatus.touchIdAvailable && <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer">
                          <span className="text-[11px] text-white/70">Enable Touch ID unlock</span>
                          <input type="checkbox" checked={lockUseTouchId} onChange={e => setLockUseTouchId(e.target.checked)} className="accent-brand-accent" />
                
                        </label>}
                      <button onClick={handleEnableLock} disabled={isLockBusy || !lockPasswordInput || !lockPasswordConfirm} className="w-full px-5 py-2.5 rounded-xl bg-brand-accent text-black font-black text-sm disabled:opacity-50">
                
                        Enable Lock
                      </button>
                    </>}

                  {lockStatus.enabled && <button onClick={() => {
            setIsAppLocked(true);
            setIsLockModalOpen(false);
          }} className="w-full px-5 py-2.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent font-black text-sm">
              
                      Lock Now
                    </button>}

                  {isStandalone && lockStatus.enabled && window.aether?.getLockRecoveryStatus && <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Recovery</div>
                          <div className="mt-1 text-[11px] text-white/55">Set up recovery now so you can reset your lock later.</div>
                        </div>
                        <button type="button" onClick={refreshLockRecoveryStatus} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 hover:border-brand-accent/40 hover:text-brand-accent transition-all" title="Refresh recovery status">
                  
                          Refresh
                        </button>
                      </div>

                      {lockRecoveryStatusError && <div className="mt-2 text-[11px] text-red-400">{lockRecoveryStatusError}</div>}

                      <div className="mt-3 space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3">
                          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Backup Phrase</div>
                          <div className="text-[11px] text-white/55">
                            Status:{' '}
                            {lockRecoveryStatus?.phrase?.enabled ? <span className="text-white/70">Enabled</span> : <span className="text-white/45">Not set</span>}
                          </div>

                          {phraseGenerated && <div className="mt-3 rounded-2xl border border-brand-accent/20 bg-brand-accent/10 px-3 py-2">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/80">Save this phrase now</div>
                                  <div className="mt-2 text-[12px] font-mono text-white/85 break-words select-all cursor-pointer" onClick={handleCopyPhrase} title="Click to copy">{phraseGenerated}</div>
                                </div>
                                <button type="button" onClick={handleCopyPhrase} className={`mt-1 p-2 rounded-xl border transition-all ${phraseCopied ? 'border-brand-accent/40 bg-brand-accent/10 text-brand-accent' : 'border-white/10 bg-white/5 text-white/50 hover:text-brand-accent hover:border-brand-accent/40'}`} title="Copy phrase to clipboard">
                        
                                  {phraseCopied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                              <div className="mt-2 text-[10px] text-white/45 border-t border-white/5 pt-2">It will not be shown again after closing this dialog.</div>
                            </div>}

                          <div className="mt-3 flex items-center gap-2">
                            <button type="button" onClick={handleGenerateRecoveryPhrase} disabled={phraseBusy} className="rounded-xl bg-brand-accent text-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] disabled:opacity-50" title={lockRecoveryStatus?.phrase?.enabled ? 'Generate a new phrase (replaces the old one)' : 'Generate backup phrase'}>
                      
                              {phraseBusy ? 'Generating…' : lockRecoveryStatus?.phrase?.enabled ? 'Regenerate' : 'Generate'}
                            </button>
                            <div className="text-[10px] text-white/35">Use this if you forget your lock password.</div>
                          </div>
                        </div>
                      </div>
                    </div>}

                  {lockError && <div className="text-[11px] text-red-400">{lockError}</div>}
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence></>;
}
