export function AppBackdropLayer(props) {
  const {
  AnimatePresence, catDoodlePeek, currentTrack, delay, doodleIntensityScale, duration, faceControlStatus, faceVideoRef,
  flashLastAdded, getProxyUrl, handleHeaderDoubleClick, index, isAuraMode, isCameraPreviewVisible, isDoodleMode, isFaceControlEnabled,
  isMacPlatform, isSharedSceneOpen, isStandalone, left, localAudioRef, motion, prev, queue,
  setIsCameraPreviewVisible, setIsFaceControlEnabled, setIsGestureControlEnabled, setIsPlaying, setWebAudioUnlocked, showWindowsTitleStrip, size, top,
  webAudioUnlocked, youtubePlayerRef,
  } = props;

  return <><div className="fixed inset-0 bg-[#050505] z-[-2]" />{/* Background Mesh (Absolute to avoid flex interference) */}<div className="absolute inset-0 bg-mesh pointer-events-none z-[-1]" />{isFaceControlEnabled && <div className="no-drag fixed bottom-4 left-4 z-[360] overflow-hidden rounded-2xl border border-brand-accent/25 bg-[#070b0f]/92 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className={isCameraPreviewVisible ? 'relative h-28 w-40 bg-black' : 'relative h-px w-px opacity-0'}>
              <video ref={faceVideoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
        
              {isCameraPreviewVisible && <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                  <div className="truncate text-[8px] font-black uppercase tracking-[0.16em] text-brand-accent">{faceControlStatus || 'Camera active'}</div>
                </div>}
            </div>
            <div className="flex items-center gap-1.5 border-t border-white/10 bg-black/40 p-1.5">
              <button onClick={() => setIsCameraPreviewVisible(prev => !prev)} className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/62 transition-colors hover:border-brand-accent/35 hover:text-brand-accent" title={isCameraPreviewVisible ? 'Hide camera preview' : 'Show camera preview'}>
          
                {isCameraPreviewVisible ? 'Hide' : 'Preview'}
              </button>
              <button onClick={() => {
        setIsFaceControlEnabled(false);
        flashLastAdded('Camera controls disabled', 1800, 'warning');
      }} className="rounded-lg border border-red-400/25 bg-red-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-red-200 transition-colors hover:bg-red-500/15" title="Turn off camera controls">
          
                Camera Off
              </button>
              <button onClick={() => {
        setIsFaceControlEnabled(false);
        setIsGestureControlEnabled(false);
        flashLastAdded('Gesture controls disabled', 1800, 'warning');
      }} className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/50 transition-colors hover:border-red-400/35 hover:text-red-200" title="Turn off all gesture controls">
          
                All Off
              </button>
            </div>
          </div>}{/* ── WEB AUDIO UNLOCK OVERLAY ─────────────────────────────────────────
                  Browsers block audio.play() without a prior user gesture in the tab.
                  This overlay captures that gesture for normal playback only. Shared
                  scene links render immediately and ask for a gesture only if the
                  visitor chooses Play in browser.
                  ───────────────────────────────────────────────────────────────────── */}<AnimatePresence>
          {!isStandalone && !webAudioUnlocked && !isSharedSceneOpen && queue?.[0] && <motion.div key="web-audio-unlock" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0,
      scale: 0.97
    }} transition={{
      duration: 0.35
    }} className="fixed inset-0 z-[9999] flex items-center justify-center" style={{
      background: 'rgba(5,5,5,0.88)',
      backdropFilter: 'blur(28px)'
    }}>
        
              <motion.div initial={{
        y: 24,
        opacity: 0
      }} animate={{
        y: 0,
        opacity: 1
      }} transition={{
        delay: 0.12,
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1]
      }} className="flex flex-col items-center gap-6 px-8 py-10 rounded-3xl" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,191,0.06) inset',
        maxWidth: 360,
        width: '90vw'
      }}>
          
                {/* Glow ring */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute rounded-full animate-pulse" style={{
            width: 88,
            height: 88,
            background: 'radial-gradient(circle, rgba(0,255,191,0.18) 0%, transparent 70%)',
            filter: 'blur(12px)'
          }} />
            
                  <div className="relative flex items-center justify-center rounded-full" style={{
            width: 72,
            height: 72,
            background: 'rgba(0,255,191,0.08)',
            border: '1px solid rgba(0,255,191,0.22)',
            boxShadow: '0 0 28px rgba(0,255,191,0.14)'
          }}>
              
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18V6l12-2v12" stroke="#00ffbf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="6" cy="18" r="3" stroke="#00ffbf" strokeWidth="1.5" />
                      <circle cx="18" cy="16" r="3" stroke="#00ffbf" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* Text */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="font-black uppercase tracking-[0.18em] text-white" style={{
            fontSize: 13
          }}>
              
                    Aether Studio
                  </div>
                  <div className="font-medium text-center leading-relaxed" style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.44)',
            maxWidth: 240
          }}>
              
                    {queue?.[0]?.title ? <>Ready to play <span style={{
                color: 'rgba(255,255,255,0.75)'
              }}>{queue[0].title}</span></> : 'Tap to activate your audio session'}
                  </div>
                </div>

                {/* CTA button */}
                <motion.button id="web-audio-unlock-btn" whileHover={{
          scale: 1.04
        }} whileTap={{
          scale: 0.96
        }} onClick={() => {
          // This click is the browser gesture that unlocks media playback.
          try {
            youtubePlayerRef.current?.playVideo?.();
          } catch {}
          if (localAudioRef.current) {
            if (localAudioRef.current.src && localAudioRef.current.paused) {
              localAudioRef.current.play().catch(() => {});
            }
          }
          setWebAudioUnlocked(true);
          setIsPlaying(true);
        }} className="flex items-center gap-3 font-black uppercase tracking-widest transition-all" style={{
          background: '#00ffbf',
          color: '#050505',
          border: 'none',
          borderRadius: 16,
          padding: '14px 32px',
          fontSize: 12,
          letterSpacing: '0.16em',
          boxShadow: '0 0 32px rgba(0,255,191,0.35), 0 4px 16px rgba(0,0,0,0.4)',
          cursor: 'pointer'
        }}>
            
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#050505">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Tap to Listen
                </motion.button>

                <div className="font-mono uppercase tracking-widest text-center" style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.18)',
          letterSpacing: '0.25em'
        }}>
            
                  Browser Playback Session · One-Time
                </div>
              </motion.div>
            </motion.div>}
        </AnimatePresence>{showWindowsTitleStrip && <div className="fixed inset-x-0 top-0 z-[260] h-[34px] border-b border-white/8 bg-[#0a0f12]/92 backdrop-blur-3xl drag" onDoubleClick={handleHeaderDoubleClick} title={isStandalone ? 'Double-click header chrome to maximize or restore' : undefined}>
      
            <div className="flex h-full items-center px-4 pr-[140px] select-none">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-accent/65 shadow-[0_0_14px_rgba(0,255,191,0.4)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Aether</span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-[1px] text-[7px] font-black uppercase tracking-[0.2em] text-brand-accent/70">
                  Studio
                </span>
              </div>
            </div>
          </div>}{/* Neural Dynamic Backdrop (NOVA */}<div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {currentTrack?.thumbnail ? <motion.div key={currentTrack.thumbnail} initial={{
        opacity: 0
      }} animate={{
        opacity: 0.15
      }} exit={{
        opacity: 0
      }} transition={{
        duration: 2
      }} className="absolute inset-0 bg-center bg-cover scale-110 blur-[120px]" style={{
        backgroundImage: `url(${getProxyUrl(currentTrack.thumbnail)})`
      }} /> : <motion.div key="standby-backdrop" initial={{
        opacity: 0
      }} animate={{
        opacity: 0.05
      }} exit={{
        opacity: 0
      }} className="absolute inset-0 bg-gradient-to-br from-brand-accent/20 via-transparent to-brand-accent/10 blur-[150px]" />}
          </AnimatePresence>
          <div className={`absolute inset-0 ${isAuraMode ? 'bg-brand-dark/10' : 'bg-brand-dark/20'}`} />
          <div className={`absolute inset-0 ${isAuraMode ? 'bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.30)_100%)]' : 'bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,0.38)_100%)]'}`} />
        </div><div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-accent/5 blur-[100px] rounded-full animate-pulse-glow" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-brand-accent/10 blur-[80px] rounded-full animate-pulse-glow" style={{
      animationDelay: '2s'
    }} />
        </div>{isDoodleMode && <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] doodle-cloud-layer doodle-bg-layer">
            <div className="doodle-soft-blob doodle-soft-blob-a" />
            <div className="doodle-soft-blob doodle-soft-blob-b" />
            <div className="doodle-soft-blob doodle-soft-blob-c" />
            <img src={catDoodlePeek} alt="doodle" className="absolute top-[10%] left-[-16vw] w-[70px] doodle-fly doodle-glide-a" style={{
      opacity: Math.min(0.38, 0.2 * doodleIntensityScale),
      animationDelay: '-7s'
    }} draggable={false} />
            <img src={catDoodlePeek} alt="doodle" className="absolute top-[26%] left-[-16vw] w-[58px] doodle-fly doodle-glide-b" style={{
      opacity: Math.min(0.34, 0.18 * doodleIntensityScale),
      animationDelay: '-13s',
      transform: 'scaleX(-1)'
    }} draggable={false} />
            <img src={catDoodlePeek} alt="doodle" className="absolute top-[42%] left-[-16vw] w-[64px] doodle-fly doodle-glide-c" style={{
      opacity: Math.min(0.36, 0.19 * doodleIntensityScale),
      animationDelay: '-3s'
    }} draggable={false} />
            <img src={catDoodlePeek} alt="doodle" className="absolute top-[58%] left-[-16vw] w-[60px] doodle-fly doodle-glide-a" style={{
      opacity: Math.min(0.34, 0.17 * doodleIntensityScale),
      animationDelay: '-18s',
      transform: 'scaleX(-1)'
    }} draggable={false} />
            <img src={catDoodlePeek} alt="doodle" className="absolute top-[74%] left-[-16vw] w-[68px] doodle-fly doodle-glide-b" style={{
      opacity: Math.min(0.36, 0.2 * doodleIntensityScale),
      animationDelay: '-23s'
    }} draggable={false} />
            <img src={catDoodlePeek} alt="doodle" className="absolute top-[88%] left-[-16vw] w-[62px] doodle-fly doodle-glide-c" style={{
      opacity: Math.min(0.33, 0.17 * doodleIntensityScale),
      animationDelay: '-29s',
      transform: 'scaleX(-1)'
    }} draggable={false} />
          </div>}{/* AURA MODE: Full-screen aura field */}{isAuraMode && <div className={`aura-field fixed pointer-events-none overflow-hidden z-[-1] ${isMacPlatform ? 'inset-0 top-7' : 'inset-0'}`}>
            <div className="aura-field-tone aura-field-tone-left" style={{
      opacity: 'calc(var(--aura-field-flare, 0) * 0.52)'
    }} />
            <div className="aura-field-tone aura-field-tone-right" style={{
      opacity: 'calc(var(--aura-field-flare, 0) * 0.48)'
    }} />
            <div className="aura-field-core aura-field-core-a" style={{
      opacity: 'var(--aura-field-boost, 0)'
    }} />
            <div className="aura-field-core aura-field-core-b" style={{
      opacity: 'calc(var(--aura-field-boost, 0) * 0.82)'
    }} />
            <div className="aura-field-ribbon aura-field-ribbon-a" style={{
      opacity: 'var(--aura-field-flare, 0)'
    }} />
            <div className="aura-field-ribbon aura-field-ribbon-b" style={{
      opacity: 'calc(var(--aura-field-flare, 0) * 0.92)'
    }} />
            <div className="aura-field-orbits">
              {[['18%', '12%', '7s', '1.2s', '16px'], ['72%', '16%', '9s', '3.4s', '12px'], ['48%', '78%', '11s', '0s', '22px'], ['12%', '68%', '13s', '2.2s', '10px'], ['86%', '58%', '10s', '4.1s', '14px']].map(([left, top, duration, delay, size], index) => <span key={`aura-orbit-${index}`} className="aura-field-orbit" style={{
        left,
        top,
        width: size,
        height: size,
        animationDuration: duration,
        animationDelay: delay
      }} />)}
            </div>
            <div className="aura-field-particles">
              {[['9%', '18%', '12s', '0s'], ['24%', '72%', '14s', '2.5s'], ['41%', '24%', '11s', '1.1s'], ['58%', '66%', '16s', '4s'], ['77%', '32%', '13s', '3.1s'], ['91%', '78%', '18s', '0.7s']].map(([left, top, duration, delay], index) => <span key={`aura-particle-${index}`} className="aura-field-particle" style={{
        left,
        top,
        animationDuration: duration,
        animationDelay: delay
      }} />)}
            </div>
          </div>}</>;
}
