export function AppVisualStageOverlay(props) {
  const {
  AnimatePresence, BookOpen, Clapperboard, Columns2, FastForward, Loader2, Lock, Maximize2,
  Minimize2, Monitor, Pause, Play, PlaybackProgressIsland, Rewind, X, activeLyricIndex,
  chromeTopOffset, currentTrack, dualVisualStageWidth, dualVisualStageZClass, el, exitVideoMode, getActivePlaybackPositionMs, getProxyUrl,
  handleControl, handleSeek, handleVisualStagePointerActivity, isAudioBuffering, isPlaying, isQualityDropdownOpen, isVerticalStack, isVideoReady,
  localVideoRef, motion, p, prev, q, qualityDropdownRef, setIsQualityDropdownOpen, setIsVideoReady,
  setVideoQuality, setVisualControlsPinned, setVisualVideoFit, showVisualLyricOverlay, showVisualStage, switchVideoMode, themeColor, trackControlAccent,
  trackControlGlow, trackProgressAccent, trackProgressGlow, videoMode, videoQuality, visualControlsPinned, visualLyricOverlayBottomClass, visualStageFooterVisible,
  visualStageHeaderVisible, visualStageLyric, visualStageNextLyric, visualStageTitle, visualStageTitleMarquee, visualVideoFit,
  } = props;

  return <>{/* ── DUAL MODE: slide-in video panel ── */}<AnimatePresence>
          {showVisualStage && <motion.div initial={{
      opacity: 0,
      scale: 0.985
    }} animate={{
      opacity: 1,
      scale: 1
    }} exit={{
      opacity: 0,
      scale: 0.985
    }} transition={{
      duration: 0.28,
      ease: 'easeOut'
    }} className={`fixed ${dualVisualStageZClass} pointer-events-none transition-all duration-500 ease-out ${videoMode === 'cinema' ? 'inset-0' : ''}`} style={videoMode === 'cinema' ? undefined : isVerticalStack ? {
      left: 16,
      right: 16,
      bottom: 16,
      height: '40vh'
    } : {
      top: chromeTopOffset,
      right: 16,
      bottom: 16,
      width: dualVisualStageWidth
    }} onMouseMove={handleVisualStagePointerActivity} onPointerDown={handleVisualStagePointerActivity}>
        
              <div className={`absolute inset-0 transition-all duration-700 delay-100 ${videoMode === 'cinema' ? isVideoReady ? 'bg-black/96 backdrop-blur-md' : 'bg-transparent' : 'bg-transparent'}`} />

              <div className="relative h-full w-full pointer-events-auto">
                <div className={`relative flex h-full w-full overflow-hidden transition-all duration-1000 ${!isVideoReady && videoMode ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'} ${videoMode === 'cinema' ? 'rounded-none bg-black' : 'rounded-[2.25rem] border border-white/[0.08] bg-[#06090d]/92 backdrop-blur-[28px] shadow-[0_28px_90px_rgba(0,0,0,0.5)]'}`}>
            
                  <div className={`relative flex-1 min-h-0 ${videoMode === 'cinema' ? '' : 'm-3 rounded-[1.8rem] overflow-hidden border border-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]'}`}>
                    {currentTrack?.thumbnail && <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="absolute inset-0 h-full w-full object-cover scale-110 blur-[40px] opacity-35" />}
                    <div className="absolute inset-0 bg-[#020406]" />
                    <div className="absolute inset-0" style={{
              background: `radial-gradient(120% 120% at 50% 0%, ${themeColor}20 0%, rgba(0,0,0,0) 48%), linear-gradient(180deg, rgba(5,7,10,0.18) 0%, rgba(5,7,10,0.52) 58%, rgba(5,7,10,0.92) 100%)`
            }} />
              

                    <video ref={el => {
              localVideoRef.current = el;
            }} playsInline onCanPlay={() => setIsVideoReady(true)} className={`absolute inset-0 h-full w-full ${visualVideoFit === 'cover' ? 'object-cover' : 'object-contain'}`} />
              

                    {isAudioBuffering && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm">
                        <div className="rounded-full border border-white/10 bg-black/45 p-4 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
                          <Loader2 size={videoMode === 'cinema' ? 34 : 28} className="animate-spin text-brand-accent" />
                        </div>
                      </div>}

                    <motion.div animate={{
              opacity: visualStageHeaderVisible ? 1 : 0,
              y: visualStageHeaderVisible ? 0 : -14
            }} transition={{
              duration: 0.22
            }} className="absolute left-0 right-0 top-0 z-20 p-4 md:p-5" style={{
              pointerEvents: visualStageHeaderVisible ? 'auto' : 'none'
            }}>
                
                      <div className="mx-auto flex w-full flex-col gap-3 rounded-[1.4rem] border border-white/10 bg-black/38 px-3 py-3 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.25)] md:px-4">
                        <div className="flex w-full items-start justify-between gap-2 md:gap-4">
                          <div className="flex min-w-0 flex-1 items-start gap-2 md:gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/12 text-brand-accent shadow-[0_0_20px_rgba(0,255,191,0.15)]">
                              {videoMode === 'cinema' ? <Clapperboard size={15} /> : <Columns2 size={15} />}
                            </div>

                            {videoMode === 'cinema' ? <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em]">
                                  <span className="text-brand-accent/85">Cinema Mode</span>
                                </div>
                                {visualStageTitleMarquee ? <div className="overlay-marquee mt-1 font-black uppercase tracking-tight text-white/95 text-sm md:text-lg max-w-[min(60vw,720px)]">
                                    <div className="overlay-marquee-track">
                                      <span>{visualStageTitle}</span>
                                      <span aria-hidden="true">{visualStageTitle}</span>
                                      <span aria-hidden="true">{visualStageTitle}</span>
                                      <span aria-hidden="true">{visualStageTitle}</span>
                                    </div>
                                  </div> : <div className="mt-1 font-black uppercase tracking-tight text-white/95 line-clamp-2 text-sm md:text-lg max-w-[min(60vw,720px)]">
                                    {visualStageTitle}
                                  </div>}
                                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.26em] text-brand-accent/72 truncate">
                                  {currentTrack.author}
                                </div>
                              </div> : <div className="flex shrink-0 items-center justify-center text-[9px] font-black uppercase tracking-[0.16em] h-9">
                                <span className="text-brand-accent/85">Dual Visual</span>
                              </div>}
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 max-w-[68%]">
                            <button onClick={() => setVisualVideoFit(prev => prev === 'contain' ? 'cover' : 'contain')} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${visualVideoFit === 'contain' ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/5 text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`} title={visualVideoFit === 'contain' ? 'Fill frame' : 'Show full frame'}>
                        
                              <Monitor size={15} />
                            </button>
                            <div className="relative overflow-visible" ref={qualityDropdownRef}>
                              <button onClick={() => setIsQualityDropdownOpen(p => !p)} className={`flex h-10 min-w-16 shrink-0 items-center justify-center rounded-2xl border px-3 transition-all ${isQualityDropdownOpen ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent shadow-[0_0_12px_rgba(0,255,191,0.1)]' : 'border-white/10 bg-white/5 text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`} title="Video Quality">
                          
                                <span className="text-[9px] font-black uppercase tracking-[0.04em]">{videoQuality}p</span>
                              </button>

                              {isQualityDropdownOpen && <div className="absolute right-0 top-full mt-2 w-28 rounded-2xl border border-white/12 bg-[#080c10]/95 backdrop-blur-2xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] z-50">
                                  {['480', '720', '1080'].map(q => <button key={`quality-${q}`} onClick={() => {
                          setVideoQuality(q);
                          setIsQualityDropdownOpen(false);
                        }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all ${videoQuality === q ? 'bg-brand-accent/12 text-brand-accent' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                            
                                      <span className="text-[10px] font-black uppercase tracking-[0.1em]">{q}p</span>
                                      {videoQuality === q && <div className="h-1.5 w-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(0,255,191,0.5)]" />}
                                    </button>)}
                                </div>}
                            </div>
                            {videoMode === 'cinema' && <button onClick={() => setVisualControlsPinned(prev => !prev)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${visualControlsPinned ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/5 text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`} title={visualControlsPinned ? 'Unpin controls' : 'Pin controls'}>
                        
                                <Lock size={15} />
                              </button>}
                            <button onClick={() => switchVideoMode(videoMode === 'cinema' ? 'dual' : 'cinema')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/55 transition-all hover:border-brand-accent/35 hover:text-brand-accent" title={videoMode === 'cinema' ? 'Back to Dual View' : 'Expand to Cinema'}>
                        
                              {videoMode === 'cinema' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button onClick={() => exitVideoMode({
                      reason: 'video_close_button'
                    })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/55 transition-all hover:border-white/25 hover:text-white" title={videoMode === 'cinema' ? 'Exit Cinema (Esc)' : 'Return to Audio'}>
                        
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        {videoMode === 'dual' && visualStageHeaderVisible && <div className="min-w-0 w-full pl-1">
                            {visualStageTitleMarquee ? <div className="overlay-marquee font-black uppercase tracking-tight text-white/95 text-sm md:text-base">
                                <div className="overlay-marquee-track">
                                  <span>{visualStageTitle}</span>
                                  <span aria-hidden="true">{visualStageTitle}</span>
                                  <span aria-hidden="true">{visualStageTitle}</span>
                                  <span aria-hidden="true">{visualStageTitle}</span>
                                </div>
                              </div> : <div className="font-black uppercase tracking-tight text-white/95 line-clamp-2 text-sm md:text-base">
                                {visualStageTitle}
                              </div>}
                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.26em] text-brand-accent/72 truncate">
                              {currentTrack.author}
                            </div>
                          </div>}
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {showVisualLyricOverlay && <motion.div key={`visual-lyric-${activeLyricIndex}-${visualStageLyric}`} initial={{
                opacity: 0,
                y: 18
              }} animate={{
                opacity: 1,
                y: 0
              }} exit={{
                opacity: 0,
                y: 12
              }} transition={{
                duration: 0.24,
                ease: 'easeOut'
              }} className={`pointer-events-none absolute left-0 right-0 z-20 ${visualLyricOverlayBottomClass}`}>
                  
                          <div className={`mx-auto w-full ${videoMode === 'cinema' ? 'px-6 pb-8 md:px-10 md:pb-10' : 'px-4 pb-4'}`}>
                            <div className={`mx-auto ${videoMode === 'cinema' ? 'max-w-[min(84vw,1040px)]' : 'max-w-[92%]'}`}>
                              <div className={`rounded-[2rem] bg-gradient-to-t from-black/52 via-black/14 to-transparent px-5 py-4 ${videoMode === 'cinema' ? 'md:px-8 md:py-6' : 'md:px-6'}`}>
                                <div className={`text-center font-black leading-tight text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.72)] ${videoMode === 'cinema' ? 'text-lg md:text-4xl' : 'text-base md:text-xl'}`}>
                                  {visualStageLyric}
                                </div>
                                {visualStageNextLyric && <div className={`mx-auto mt-2 max-w-3xl text-center font-semibold text-white/58 drop-shadow-[0_4px_16px_rgba(0,0,0,0.58)] line-clamp-2 ${videoMode === 'cinema' ? 'text-sm md:text-lg' : 'text-xs md:text-sm'}`}>
                                    {visualStageNextLyric}
                                  </div>}
                              </div>
                            </div>
                          </div>
                        </motion.div>}
                    </AnimatePresence>

                    <motion.div animate={{
              opacity: visualStageFooterVisible ? 1 : 0,
              y: visualStageFooterVisible ? 0 : 18
            }} transition={{
              duration: 0.22
            }} className="absolute bottom-0 left-0 right-0 z-20" style={{
              pointerEvents: visualStageFooterVisible ? 'auto' : 'none'
            }}>
                
                      <div className={`mx-auto w-full ${videoMode === 'cinema' ? 'px-6 pb-8 pt-20 md:px-10 md:pb-10' : 'px-4 pb-4 pt-20'}`}>
                        <div className="rounded-[1.6rem] border border-white/10 bg-black/40 px-4 py-4 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:px-5">
                          <div>
                            <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
                              <div className="flex items-center gap-2">
                                <BookOpen size={12} className="text-brand-accent/70" />
                                <span>{showVisualLyricOverlay ? 'Lyric overlay' : videoMode === 'dual' ? 'Lyrics on left panel' : 'Visual Stream'}</span>
                              </div>
                              <span className="font-mono tracking-[0.16em]">{videoMode === 'cinema' ? visualControlsPinned ? 'Overlay pinned' : 'Controls fade on idle' : visualVideoFit === 'cover' ? 'Fill frame' : 'Full frame'}</span>
                            </div>

                            <PlaybackProgressIsland durationMs={currentTrack.totalDurationMs || currentTrack.duration || 0} getPositionMs={getActivePlaybackPositionMs} onSeek={handleSeek} accent={trackProgressAccent} glow={trackProgressGlow} barClassName="h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/12" timeRowClassName="mt-2 flex items-center justify-between text-[10px] font-mono text-white/42" />
                      
                          </div>

                          {videoMode === 'cinema' && <div className="flex items-center justify-center gap-5 pt-5">
                              <button onClick={() => handleControl('previous')} className="p-2 text-white/60 transition-colors hover:text-white active:scale-90">
                                <Rewind size={22} fill="currentColor" />
                              </button>
                              <button onClick={() => handleControl(isPlaying ? 'pause' : 'resume')} className="flex h-14 w-14 items-center justify-center rounded-2xl text-black transition-all active:scale-95 hover:scale-105" style={{
                      background: trackControlAccent,
                      boxShadow: `0 0 26px ${trackControlGlow}`
                    }}>
                        
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                              </button>
                              <button onClick={() => handleControl('skip')} className="p-2 text-white/60 transition-colors hover:text-white active:scale-90">
                                <FastForward size={22} fill="currentColor" />
                              </button>
                            </div>}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence></>;
}
