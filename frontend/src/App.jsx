import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, Component } from 'react';
import { Play, Pause, SkipForward, Search, Plus, Loader2, ListMusic, Music, Globe, User, UserPlus, BookOpen, Trash2, Rewind, FastForward, ExternalLink, ChevronLeft, ChevronRight, Zap, X, Cpu, HardDrive, Activity, Radio, Signal, Wifi, Clock, Maximize2, Minimize2, RotateCcw, AlertTriangle, RefreshCw, Monitor, Target, AppWindow, Volume2, Shuffle, Timer, Download, Upload, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { setupDiscordSdk } from './discord';
import axios from 'axios';
import './App.css';

const getApiBase = () => {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBase) return configuredBase.replace(/\/$/, '');

  // Standalone Electron app keeps using the local Express server.
  return 'http://localhost:3333';
};
const API_BASE = getApiBase();
const DEFAULT_GUILD_ID = 'local_studio';

const IDLE_PHRASES = [
  "Exploring the Neural Vault",
  "Calibrating Sonic Synapses",
  "Organizing the Vibe Buffer",
  "Hunting for Rare Nodes",
  "Defragmenting the Studio",
  "Awaiting the Next Drop",
  "Lost in the Music Nexus",
  "Optimizing Aura Sync",
  "Neural Network Standby",
  "Refining Studio Echoes",
  "Calculating Bass Velocity",
  "Feeding the Rhythm Hamsters",
  "Searching for Perfect Snares",
  "Overclocking the Speakers",
  "Untangling Virtual Cables",
  "Wait, where did the kick go?",
  "Stealing hearts, one beat at a time",
  "Looking hot in the studio spotlight",
  "Is it hot in here or just the bass?",
  "Aether's got a crush on your vibe",
  "Neural connection... established? 😉",
  "Synchronizing heartbeats...",
  "Midnight studio sessions > Anything",
  "Caught in your sonic orbit"
];

const formatTime = (ms) => {
  if (isNaN(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("[Signal Crash]", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-8 text-center font-black">
          <div className="relative group mb-12">
            <div className="absolute inset-0 bg-red-500/20 blur-[100px] animate-pulse rounded-full" />
            <AlertTriangle className="text-red-500 group-hover:scale-110 transition-transform relative z-10" size={120} strokeWidth={1.5} />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500 text-black px-6 py-1 tracking-[0.5em] text-[10px] skew-x-[-20deg]">SIGNAL_LOST // DECODING_ERR</div>
          </div>
          <h1 className="text-4xl lg:text-6xl text-white uppercase tracking-tighter mb-4 max-w-2xl px-4">Neural Buffer Overload</h1>
          <p className="text-brand-text-dim text-lg mb-12 max-w-xl uppercase tracking-widest font-mono opacity-50">
            Internal decrypt signal failed. The dashboard has encountered a critical parity error.
          </p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-10 py-5 bg-white text-black text-sm uppercase tracking-[0.5em] hover:bg-brand-accent transition-all flex items-center gap-4 group"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" /> Reboot Interface
            </button>
            <div className="text-[10px] font-mono text-red-500/50 uppercase tracking-tighter">ERROR: {this.state.error?.message || "UNDEFINED_FRAGMENT"}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [auth, setAuth] = useState(null);
  const discordSdkRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [warmingTrackIds, setWarmingTrackIds] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState('Unknown');
  const [isAudioBuffering, setIsAudioBuffering] = useState(false);
  const [isAutoplaySeeking, setIsAutoplaySeeking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0); 
  const [lyricOffsetMs, setLyricOffsetMs] = useState(0); 
  const [isMaximized, setIsMaximized] = useState(false);
  const [lyrics, setLyrics] = useState([]); 
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [systemStats, setSystemStats] = useState(null);
  const visualizerCanvasRef = useRef(null);
  const pulseCanvasRef = useRef(null); // Dedicated Pulse Layer (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
  const [visualizerMode, setVisualizerMode] = useState('bars'); // 'bars' or 'pulse' (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
  const [themeColor, setThemeColor] = useState('#00ffbf'); // Aether Mint default
  const lyricsContainerRef = useRef(null);
  const activeLyricRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingIds, setAddingIds] = useState(new Set());
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [uptime, setUptime] = useState("00:00:00");
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [typedBuffer, setTypedBuffer] = useState("");
  const [isPacmanOpen, setIsPacmanOpen] = useState(false);
  const [playlists, setPlaylists] = useState({});
  const [viewingPlaylist, setViewingPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [activeMenuTrack, setActiveMenuTrack] = useState(null);
  const [isRenamingPlaylist, setIsRenamingPlaylist] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [volume, setVolume] = useState(0.5);
  const [volumeToast, setVolumeToast] = useState(false);
  const [sleepTimerValue, setSleepTimerValue] = useState(0); // 0, 15, 30, 60, 120
  const [sleepDeadline, setSleepDeadline] = useState(null);
  const [sleepRemainingStr, setSleepRemainingStr] = useState('');
  const [localIp, setLocalIp] = useState('');
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  
  const fileInputRef = useRef(null);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [isVerticalStack, setIsVerticalStack] = useState(false);
  const [isFocusedMode, setIsFocusedMode] = useState(false);
  const expandedContainerRef = useRef(null);
  const expandedActiveRef = useRef(null);
  const idleStartTimeRef = useRef(null);
  const idlePhraseRef = useRef(null);
  const lastRPCTrackIdRef = useRef(null);


  // Audio Analysis Refs (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const prevTrackRef = useRef(null); // Neural Memory Ref (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
  const [isAutoplaySearching, setIsAutoplaySearching] = useState(false);
  const isStandalone = !!window.aether;
  const [history, setHistory] = useState([]); // Neural Deep Memory (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
  const [isManualStop, setIsManualStop] = useState(false);
  const [streamPort, setStreamPort] = useState(3333);
  // --- AETHER STUDIO CORE: NEURAL ENGINE STATE (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
  const currentTrack = queue?.[0];
  const getProxyUrl = (url) => {
    if (!url) return '';
    let processed = url.startsWith('//') ? 'https:' + url : url;
    if (processed.startsWith('http://localhost') || processed.startsWith('http://127.0.0.1')) return processed;
    
    if (isStandalone) {
        return `http://localhost:${streamPort}/api/proxy?url=${encodeURIComponent(processed)}`;
    }
    return `${API_BASE}/api/proxy?url=${encodeURIComponent(processed)}`;
  };

  useEffect(() => {
     if (!isStandalone) return;
     const int = setInterval(() => {
        axios.post(`http://localhost:${streamPort}/api/device/sync`, {
           isPlaying, currentTime, track: currentTrack
        }).catch(()=>{});
     }, 1000);
     return () => clearInterval(int);
  }, [isStandalone, isPlaying, currentTime, currentTrack, streamPort]);
  const localAudioRef = useRef(null);

  useEffect(() => {
     if (isStandalone && window.aether?.getLocalIp) {
         window.aether.getLocalIp().then(setLocalIp);
     }
  }, [isStandalone]);

  useEffect(() => {
    let pollInterval;
    
    if (isStandalone) {
      setAuth({ guild_id: 'LOCAL', user: { id: 'Standalone', username: 'DESKTOP_USER' } });
      setLoading(false);
      setVoiceChannel('Local Speakers');

      // Load persisted state asynchronously
      const loadPersisted = async () => {
        const savedPlaylists = await window.aether?.store?.get('playlists');
        if (savedPlaylists && typeof savedPlaylists === 'object' && !Array.isArray(savedPlaylists)) {
           setPlaylists(savedPlaylists);
        }
        const savedVolume = await window.aether?.store?.get('volume');
        if (savedVolume !== undefined && savedVolume !== null) {
          const v = parseFloat(savedVolume);
          if (isFinite(v)) {
            setVolume(v);
            if (localAudioRef.current) localAudioRef.current.volume = v;
          }
        }
        const savedDownloaded = await window.aether?.getOfflineTracks();
        if (savedDownloaded) {
            console.log(`[Aether] Loaded ${savedDownloaded.length} downloaded tracks:`, savedDownloaded);
            setDownloadedTracks(savedDownloaded);
        }
      };
      loadPersisted();
    } else {
      const initDiscord = async () => {
        try {
          const { sdk, auth: authData } = await setupDiscordSdk();
          discordSdkRef.current = sdk;
          if (sdk) {
            if (authData) setAuth(authData);
            else setAuth({ guild_id: sdk.guildId, user: { id: 'Guest', username: 'GUEST' } });
            
            if (sdk.guildId) {
              fetchQueue(sdk.guildId);
              pollInterval = setInterval(() => fetchQueue(sdk.guildId), 5000);
            }
          }
        } catch (err) {
          setAuth({ guild_id: '0', user: { id: 'Offline', username: 'OFFLINE' } });
        } finally {
          setLoading(false);
        }
      };
      initDiscord();
    }

    fetchSystemStats();
    const statsInterval = setInterval(fetchSystemStats, 10000);
    
    // Maximized State Listener (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN - Fixed bridge + Height fail-safe
    if (window.aether?.onMaximized) {
      window.aether.onMaximized((state) => {
        setIsMaximized(!!state);
      });
    }

    // Library update listener for downloaded tracks
    if (window.aether?.onLibraryUpdate) {
      window.aether.onLibraryUpdate((data) => {
        console.log(`[Aether] Library update received:`, data);
        setDownloadedTracks(data);
      });
    }

    const handleResize = () => {
      // If window is significantly taller than the standard 800px, assume we want elastic mode
      if (window.innerHeight > 820) setIsMaximized(true);
      else if (window.innerHeight <= 800) setIsMaximized(false);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    const uptimeInterval = setInterval(() => {
      const now = new Date();
      setUptime(now.toTimeString().split(' ')[0]);
    }, 1000);

    return () => { 
      if (pollInterval) clearInterval(pollInterval); 
      clearInterval(statsInterval); 
      clearInterval(uptimeInterval);
    };
  }, []);



  // --- AETHER: STANDALONE PLAYBACK LOOP (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
  useEffect(() => {
    console.log("[Aether/Audio] Queue effect fired", { queueLength: queue?.length, currentTrack: queue?.[0]?.title, isPlaying, isStandalone });
    if (!isStandalone || !queue || queue.length === 0) return;
    const track = queue[0];
    const loadStartTime = Date.now();

    // Pre-warm next queue tracks
    queue.slice(0, 3).forEach((item) => {
      if (!downloadedTracks.includes(item.id) && !warmingTrackIds.has(item.id)) {
        console.log(`[Aether] Warmup pre-download for queued track: ${item.title} (${item.id})`);
        warmupTrack(item.id, item.actualUrl || item.url, item.title);
      }
    });

    
    if (track && track.title !== currentTrackTitle) {
        setCurrentTrackTitle(track.title);
        setIsAudioBuffering(true);
        
        if (!localAudioRef.current) {
            localAudioRef.current = new Audio();
            localAudioRef.current.volume = volume;
        }

        // Neural Flow Bridge (V12.11.1-SOVEREIGN-SOVEREIGN) - High-Fidelity Signal Acquisition
        localAudioRef.current.onloadstart = () => {
            console.log(`[Aether/Audio] loadstart at ${Date.now() - loadStartTime}ms`);
        };
        localAudioRef.current.oncanplay = () => {
            console.log(`[Aether/Audio] canplay after ${Date.now() - loadStartTime}ms`);
        };
        localAudioRef.current.onplaying = () => {
            console.log(`[Aether/Audio] playing after ${Date.now() - loadStartTime}ms`);
            setIsAudioBuffering(false);
        };
        localAudioRef.current.onwaiting = () => {
            console.log(`[Aether/Audio] waiting at ${Date.now() - loadStartTime}ms`);
            setIsAudioBuffering(true);
        };
        localAudioRef.current.onstalled = () => {
            console.log(`[Aether/Audio] stalled at ${Date.now() - loadStartTime}ms`);
            setIsAudioBuffering(true);
        };
        localAudioRef.current.onwaiting = () => {
            console.log("[Aether/Audio] Buffer Underrun. Visuals paused.");
            setIsAudioBuffering(true);
        };
        localAudioRef.current.onstalled = () => {
            console.log("[Aether/Audio] Connection Stalled. Maintaining status.");
            setIsAudioBuffering(true);
        };
        localAudioRef.current.onended = () => {
            console.log("[Aether/Audio] Signal Terminated Naturally. Advancing Queue.");
            handleControl('skip');
        };
        localAudioRef.current.onerror = (e) => {
            // HIGH-FIDELITY FAULT TOLERANCE: Do not skip on initial connection fault
            console.error("[Aether/Audio] Signal Disturbance Detected:", e);
            console.log("[Aether/Audio] Attempting signal recovery. Skip suppressed.");
            // Maintain buffering state instead of skipping to Standby
            setIsAudioBuffering(true);
        };
        
        const isLocalDownloaded = downloadedTracks.includes(track.id);
        // Reconstruct YouTube URL if we have the ID (avoids expired direct URLs)
        const youtubeUrl = track.youtubeId 
            ? `https://www.youtube.com/watch?v=${track.youtubeId}`
            : track.actualUrl || track.url;
        const streamUrl = isLocalDownloaded
            ? `http://localhost:${streamPort}/offline/${track.id}.m4a`
            : `http://localhost:${streamPort}/stream?url=${encodeURIComponent(youtubeUrl)}`;
        console.log("[Aether/Audio] Initializing Stream:", streamUrl, { isLocalDownloaded });
        
        localAudioRef.current.crossOrigin = "anonymous";
        localAudioRef.current.src = streamUrl;
        
        // Trigger background download if not already cached / warming
        if (window.aether?.download && !downloadedTracks.includes(track.id) && !warmingTrackIds.has(track.id)) {
            console.log(`[Aether] Triggering background download for track ${track.id}`);
            warmupTrack(track.id, track.actualUrl || track.url, track.title);
        }
        
        if (isPlaying) {
            localAudioRef.current.play().catch(e => {
                console.error("[Aether/Audio] Autoplay Blocked or Failed:", e);
                handleControl('skip');
            });
        }
    }
  }, [queue?.[0]?.title, isPlaying, isStandalone]);

  // --- AETHER: UNIFIED DISCORD RPC ENGINE (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
  useEffect(() => {
    if (!isStandalone || !window.aether?.updateRPC) return;

    let cycleInterval;

    const updateRPC = () => {
        const track = queue?.[0];
        
        if (track) {
            // Only update if it's a new track to avoid resetting the "Elapsed" timer
            if (lastRPCTrackIdRef.current === track.id) return;
            
            lastRPCTrackIdRef.current = track.id;
            idleStartTimeRef.current = null;
            idlePhraseRef.current = null;
            
            window.aether.updateRPC({
                title: track.title,
                artist: track.author,
                thumbnail: track.thumbnail,
                isPlaying: isPlaying,
                url: track.actualUrl || track.url,
                startTime: Date.now() - currentTime,
                endTime: Date.now() + (track.totalDurationMs || track.duration || 0) - currentTime
            });
        } else {
            // Idle Lobby State
            lastRPCTrackIdRef.current = null;
            if (!idleStartTimeRef.current) {
                idleStartTimeRef.current = Date.now();
                idlePhraseRef.current = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)];
            }
            
            window.aether.updateRPC({
                title: "Music Lobby",
                artist: idlePhraseRef.current,
                startTime: idleStartTimeRef.current
            });

            // Start cycler if not already running
            if (!cycleInterval) {
                cycleInterval = setInterval(() => {
                    if (queue && queue.length > 0) return; // Guard for async race
                    
                    let next;
                    do { next = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)]; } while (next === idlePhraseRef.current);
                    idlePhraseRef.current = next;
                    
                    window.aether.updateRPC({
                        title: "Music Lobby",
                        artist: idlePhraseRef.current,
                        startTime: idleStartTimeRef.current
                    });
                }, 20000); 
            }
        }
    };

    updateRPC();

    return () => {
        if (cycleInterval) {
            clearInterval(cycleInterval);
            cycleInterval = null;
        }
    };
  }, [queue, isPlaying, isStandalone]);

  // Combined effect replaced the previous two RPC effects

  // Handle Play/Pause sync
  useEffect(() => {
    if (!isStandalone || !localAudioRef.current) return;
    if (isPlaying) {
       localAudioRef.current.play().catch(() => {});
       if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    } else {
       localAudioRef.current.pause();
    }
  }, [isPlaying, isStandalone]);

  // Audio Visualizer Loop (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
  useEffect(() => {
    if (!isStandalone || !localAudioRef.current) return;

    const setupAudioAnalysis = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (!analyserRef.current) {
          analyserRef.current = audioCtxRef.current.createAnalyser();
          analyserRef.current.fftSize = 256; 
          analyserRef.current.smoothingTimeConstant = 0.85;
        }
        if (!sourceRef.current && localAudioRef.current) {
          sourceRef.current = audioCtxRef.current.createMediaElementSource(localAudioRef.current);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioCtxRef.current.destination);
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (e) {
        console.error("[Aether] Audio API Error:", e.message);
      }
    };

    const runVisualizer = () => {
      if (!analyserRef.current) return;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        
        const canvas = visualizerCanvasRef.current;
        const pulseCanvas = pulseCanvasRef.current;
        if (!canvas && !pulseCanvas) return;

        const ctx = canvas?.getContext('2d');
        const pCtx = pulseCanvas?.getContext('2d');
        
        const width = canvas?.width || 800;
        const height = canvas?.height || 40;
        const pWidth = pulseCanvas?.width || 800;
        const pHeight = pulseCanvas?.height || 400;

        if (ctx) ctx.clearRect(0, 0, width, height);
        if (pCtx) pCtx.clearRect(0, 0, pWidth, pHeight);

        analyserRef.current.getByteFrequencyData(dataArray);

        if (visualizerMode === 'bars' && ctx) {
            const barWidth = (width / bufferLength) * 2.5;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * height;
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand-contrast').trim() || '#ff00ff'; 
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                x += barWidth + 2;
            }
        } else if (visualizerMode === 'pulse' && pCtx) {
            const contrastColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-contrast').trim() || '#ff00ff';
            // --- AETHER: NEON CORE RESONANCE (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
            const centerX = pWidth / 2;
            const centerY = pHeight / 2;
            const baseRadius = Math.min(pWidth, pHeight) * 0.28;
            
            // 1. Core Breathing Aura (Neon Contrast)
            const bassVal = dataArray[2] || 0;
            const auraScale = 0.8 + (bassVal / 255) * 0.4;
            
            const auraGradient = pCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 1.8 * auraScale);
            auraGradient.addColorStop(0, `${contrastColor}55`);
            auraGradient.addColorStop(0.5, `${contrastColor}11`);
            auraGradient.addColorStop(1, 'transparent');
            
            pCtx.fillStyle = auraGradient;
            pCtx.beginPath();
            pCtx.arc(centerX, centerY, baseRadius * 2 * auraScale, 0, Math.PI * 2);
            pCtx.fill();

            // 2. Liquid Resonance Rings (High Contrast Logic)
            
            pCtx.lineCap = 'round';
            for (let rOffset = 0; rOffset < 3; rOffset++) {
                pCtx.beginPath();
                const opacity = (1 - rOffset / 3) * 0.5;
                pCtx.strokeStyle = `${contrastColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
                pCtx.lineWidth = 3 - rOffset;
                pCtx.shadowBlur = 25;
                pCtx.shadowColor = contrastColor;

                for (let i = 0; i < 120; i++) {
                    const angle = (i / 120) * Math.PI * 2;
                    const binIndex = (i + (rOffset * 20)) % 120;
                    const val = dataArray[binIndex] || 0;
                    const radius = baseRadius + (Math.pow(val / 255, 1.2) * (60 - rOffset * 15));
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;
                    
                    if (i === 0) pCtx.moveTo(x, y);
                    else pCtx.bezierCurveTo(centerX + Math.cos(angle-0.05)*radius*1.02, centerY + Math.sin(angle-0.05)*radius*1.02, x, y, x, y);
                }
                pCtx.closePath();
                pCtx.stroke();
            }

            // 3. Neural Pips (Neon Contrast)
            pCtx.strokeStyle = '#ff00ffaa';
            pCtx.lineWidth = 2;
            for (let i = 0; i < 60; i += 2) {
                const angle = (i / 60) * Math.PI * 2;
                const val = dataArray[i*2] || 0;
                const len = 5 + (val/255) * 15;
                const x1 = centerX + Math.cos(angle) * (baseRadius - 10);
                const y1 = centerY + Math.sin(angle) * (baseRadius - 10);
                const x2 = centerX + Math.cos(angle) * (baseRadius - 10 - len);
                const y2 = centerY + Math.sin(angle) * (baseRadius - 10 - len);
                pCtx.beginPath();
                pCtx.moveTo(x1, y1);
                pCtx.lineTo(x2, y2);
                pCtx.stroke();
            }
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    setupAudioAnalysis();
    runVisualizer();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isStandalone, isPlaying, currentTrack, visualizerMode, themeColor]);

  const handleVolumeChange = (val) => {
    const v = parseFloat(val);
    if (!isFinite(v)) return;
    const finalV = Math.max(0, Math.min(1, v));
    setVolume(finalV);
    if (localAudioRef.current) localAudioRef.current.volume = finalV;
    window.aether?.store?.set('volume', finalV);
  };

  const handleAddToPlaylist = (name, data) => {
    if (!data) return;
    const newPlaylists = { ...playlists };
    if (!newPlaylists[name]) newPlaylists[name] = [];
    
    if (Array.isArray(data)) {
        let addedCount = 0;
        data.forEach(t => {
            if (!newPlaylists[name].some(ext => ext.id === t.id)) {
                newPlaylists[name].push(t);
                addedCount++;
            }
        });
        setPlaylists(newPlaylists);
        window.aether?.store?.set('playlists', newPlaylists);
        setLastAdded(`Vaulted ${addedCount} Node(s)`);
        setTimeout(() => setLastAdded(null), 3000);
    } else {
        if (!newPlaylists[name].some(t => t.id === data.id)) {
          newPlaylists[name].push(data);
          setPlaylists(newPlaylists);
          window.aether?.store?.set('playlists', newPlaylists);
          setLastAdded(`Vaulted: ${data.title}`);
          setTimeout(() => setLastAdded(null), 3000);
        }
    }
    setActiveMenuTrack(null);
  };

  const handleRemoveFromPlaylist = (name, index) => {
    const newPlaylists = { ...playlists };
    newPlaylists[name] = [...(newPlaylists[name] || [])]; 
    newPlaylists[name].splice(index, 1);
    setLastAdded(`Purged node from ${name}`);
    setTimeout(() => setLastAdded(null), 2000);
    setPlaylists(newPlaylists);
    window.aether?.store?.set('playlists', newPlaylists);
  };

  const handlePlaylistAddAll = (name) => {
    const tracks = playlists[name];
    if (tracks && tracks.length > 0) {
      setQueue(prev => [...prev, ...tracks]);
      setLastAdded(`Queued Entire Vault: ${name}`);
      setTimeout(() => setLastAdded(null), 3000);
    }
  };

  const activeLyric = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return null;
    const currentMs = currentTime * 1000;
    const line = [...lyrics].reverse().find(l => l.time <= currentMs);
    return line ? line.text : null;
  }, [lyrics, currentTime]);

  const handleRenamePlaylist = (oldName, newName) => {
    if (!newName || oldName === newName) { setIsRenamingPlaylist(null); return; }
    const newPlaylists = { ...playlists };
    newPlaylists[newName] = newPlaylists[oldName];
    delete newPlaylists[oldName];
    setPlaylists(newPlaylists);
    window.aether?.store?.set('playlists', newPlaylists);
    setIsRenamingPlaylist(null);
    if (viewingPlaylist === oldName) setViewingPlaylist(newName);
  };

  const handleDeletePlaylist = (name) => {
    const newPlaylists = { ...playlists };
    delete newPlaylists[name];
    setPlaylists(newPlaylists);
    window.aether?.store?.set('playlists', newPlaylists);
    if (viewingPlaylist === name) setViewingPlaylist(null);
  };

  const triggerAutoplay = async () => {
    if (!isAutoplayEnabled || !isStandalone) return;
    const seed = currentTrack || history[0];
    if (!seed) return;

    try {
      setIsAutoplaySeeking(true);
      
      // Primary Discovery Path: Recommendations
      const fetchPromise = window.aether.getRecommendations({ 
        title: seed.title, 
        author: seed.author, 
        url: seed.actualUrl || seed.url 
      });
      
      // 10s Timeout Guard
      const recs = await Promise.race([
        fetchPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
      ]);

      if (recs && recs.length > 0) {
        const filtered = recs.filter(r => !queue.some(q => q.title === r.title));
        if (filtered.length > 0) {
          handleAdd(filtered[0]);
          return;
        }
      }

      // Fallback Path: Neural Breadth Search (by artist)
      console.log("[Aether] Primary Discovery failed, broadening signal...");
      const fallbackResults = await window.aether.search(seed.author || seed.title.split('-')[0]);
      if (fallbackResults && fallbackResults.length > 0) {
        const candidates = fallbackResults.filter(r => r.title !== seed.title);
        if (candidates.length > 0) {
          handleAdd(candidates[Math.floor(Math.random() * Math.min(3, candidates.length))]);
        }
      }
    } catch (e) {
      console.error("[Aether] Discovery Error:", e);
    } finally {
      setIsAutoplaySeeking(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
        fetchQueue();
        if (isPlaying) {
            // Heartbeat Sync (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
            axios.post(`${API_BASE}/api/heartbeat/${DEFAULT_GUILD_ID}`, { 
                currentTime, 
                isPlaying 
            }).catch(() => {});
        }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentTime, isPlaying, queue.length, isAutoplayEnabled, isStandalone, isManualStop]);

  // Autoplay Trigger Logic
  useEffect(() => {
    if (isStandalone && isAutoplayEnabled && (queue.length === 0) && !isManualStop && !isAutoplaySearching) {
        triggerAutoplay();
    }
  }, [queue.length, isAutoplayEnabled, isStandalone, isManualStop, isAutoplaySearching]);

  // --- AETHER: DYNAMIC THEME SYNC (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
  useEffect(() => {
    if (!currentTrack?.thumbnail) return;
    const updateTheme = async () => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = currentTrack.thumbnail;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width; canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 8000) { 
                r += data[i]; g += data[i+1]; b += data[i+2]; count++;
            }
            const avgR = Math.floor(r / count);
            const avgG = Math.floor(g / count);
            const avgB = Math.floor(b / count);
            const hex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;
            setThemeColor(hex);
            
            // Calculate High-Contrast Accent (Complementary HSL)
            const rNorm = avgR / 255;
            const gNorm = avgG / 255;
            const bNorm = avgB / 255;
            const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
            let h, s, l = (max + min) / 2;
            if (max === min) h = s = 0;
            else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch(max) {
                    case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                    case gNorm: h = (bNorm - rNorm) / d + 2; break;
                    case bNorm: h = (rNorm - gNorm) / d + 4; break;
                }
                h /= 6;
            }
            // Rotate Hue by 180 degrees for maximum contrast
            const contrastH = (h + 0.5) % 1;
            const contrastHex = (function hslToHex(h, s, l) {
                let r, g, b;
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1; if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
                const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
                return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
            })(contrastH, 0.9, 0.6); // High saturation, medium light

            document.documentElement.style.setProperty('--brand-accent', hex);
            document.documentElement.style.setProperty('--brand-contrast', contrastHex);
            document.documentElement.style.setProperty('--brand-glow', `${hex}33`);
        };
    };
    updateTheme();
  }, [currentTrack?.thumbnail]);

  // --- AETHER: HARDWARE MEDIA SESSION BRIDGE (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: currentTrack.author,
            album: 'Aether Studio',
            artwork: [{ src: getProxyUrl(currentTrack.thumbnail), sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => { handleControl('resume'); });
        navigator.mediaSession.setActionHandler('pause', () => { handleControl('pause'); });
        navigator.mediaSession.setActionHandler('nexttrack', () => { handleControl('skip'); });
        navigator.mediaSession.setActionHandler('previoustrack', () => { handleControl('previous'); });
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {}
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (isStandalone && window.aether?.getStreamPort) {
        window.aether.getStreamPort().then(port => {
            console.log('[Aether] Neural Streamer linked to port:', port);
            setStreamPort(port);
        });
    }

    // --- NEURAL WATCHER LISTENER (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
    if (isStandalone && window.aether?.onLibraryUpdate) {
        window.aether.onLibraryUpdate((event) => {
            console.log("[Aether] Neural Sync detected change:", event);
            // Library refresh logic...
        });
    }

    // --- UNIVERSAL CONTROL RECEIVER (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
    if (isStandalone && window.aether?.onControl) {
        window.aether.onControl((action) => {
            console.log("[Aether/Hardware] Action Received:", action);
            if (action === 'volume-up') {
                setVolume(prev => {
                    const nextV = Math.min(1, prev + 0.1);
                    setVolumeToast(true); setTimeout(() => setVolumeToast(false), 2000);
                    if (localAudioRef.current) localAudioRef.current.volume = nextV;
                    window.aether?.store?.set('volume', nextV);
                    return nextV;
                });
            } else if (action === 'volume-down') {
                setVolume(prev => {
                    const nextV = Math.max(0, prev - 0.1);
                    if (localAudioRef.current) localAudioRef.current.volume = nextV;
                    setVolumeToast(true); setTimeout(() => setVolumeToast(false), 2000);
                    window.aether?.store?.set('volume', nextV);
                    return nextV;
                });
            } else if (action === 'mute') {
                setVolume(prev => {
                    const nextV = prev > 0 ? 0 : 0.5;
                    if (localAudioRef.current) localAudioRef.current.volume = nextV;
                    return nextV;
                });
            } else {
                handleControl(action);
            }
        });
    }
  }, [isStandalone]);

  const fetchQueue = async () => {
    try {
      const guildId = DEFAULT_GUILD_ID;
      const resp = await axios.get(`${API_BASE}/api/queue/${guildId}`);
      
      // Only pull remote queue if acting as Discord client (Standalone manages its own state)
      if (resp.data.songs && !isStandalone) setQueue(resp.data.songs);
      
      const serverMs = resp.data.currentMs || 0;
      if (!isStandalone && (Math.abs(currentTime - serverMs) > 1000 || currentTime === 0)) setCurrentTime(serverMs);

      const track = resp.data.songs && resp.data.songs[0];
      if (track && track.title !== currentTrackTitle) {
        setCurrentTrackTitle(track.title);
        updateDiscordRichPresence(track, serverMs);

        // --- AETHER: LOCAL PLAYBACK SYNC (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
        if (isStandalone && track.actualUrl) {
            const loadStartTime = Date.now();
            if (!localAudioRef.current) {
                localAudioRef.current = new Audio();
                localAudioRef.current.volume = 0.5;
            }
            localAudioRef.current.oncanplay = () => {
                console.log(`[Aether/Audio] Can play after ${Date.now() - loadStartTime}ms (fetchQueue)`);
            };
            const streamUrl = `http://localhost:${streamPort}/stream?url=${encodeURIComponent(track.actualUrl || track.url)}`;
            localAudioRef.current.src = streamUrl;
            // Trigger background download if not already cached
            if (window.aether?.download) {
                console.log(`[Aether] Triggering background download for track ${track.id} (fetchQueue)`);
                window.aether.download(track.actualUrl || track.url, track.id).then(result => {
                    console.log(`[Aether] Download result for ${track.id}:`, result);
                }).catch(e => {
                    console.error(`[Aether] Download failed for ${track.id}:`, e);
                });
            }
            localAudioRef.current.play().catch(e => console.error("[Aether] Playback blocked:", e));
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    const SEQUENCE = 'pacman';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isLyricsExpanded) { setIsLyricsExpanded(false); return; }
      // Ignore trigger if user is typing in an input or textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      setTypedBuffer(prev => {
        const next = (prev + e.key.toLowerCase()).slice(-SEQUENCE.length);
        if (next === SEQUENCE) {
          setIsPacmanOpen(true);
          return "";
        }
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const updateDiscordRichPresence = async (track, playbackMs = 0) => {
    if (!discordSdkRef.current) return;
    try {
      if (!track) {
         await discordSdkRef.current.commands.setActivity({
            activity: {
              name: "AH Music",
              type: 0, 
              details: "In Music Lobby",
              state: "Searching for Nodes...",
              assets: { large_image: "https://i.imgur.com/8Q8W8Xn.png", large_text: "Aether // Studio" }
            }
         });
         return;
      }
      await discordSdkRef.current.commands.setActivity({
        activity: {
          name: "AH Music",
          type: 2, // Listening
          details: track.title.slice(0, 127),
          state: `by ${track.author}`.slice(0, 127),
          assets: {
            large_image: track.thumbnail || "https://cdn.discordapp.com/embed/avatars/0.png",
            large_text: `V12.11.1-SOVEREIGN // Q: ${queue.length}`.slice(0, 127)
          },
          timestamps: {
            start: Date.now() - playbackMs
          }
        }
      });
      // Presence Synced
    } catch (err) {
      console.warn("[Discord SDK] setActivity failed:", err.message);
    }
  };

  const fetchSystemStats = async () => {
    try {
      if (isStandalone) {
          const stats = await window.aether.getStats();
          setSystemStats(stats);
      } else {
          const resp = await axios.get(`${API_BASE}/api/system`);
          setSystemStats(resp.data);
      }
    } catch (err) {}
  };



  useEffect(() => {
    let interval;
    if (isPlaying && currentTrack && !isAudioBuffering) {
        interval = setInterval(() => setCurrentTime(prev => prev + 250), 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, isAudioBuffering]);

  useEffect(() => {
    if (!lyrics || lyrics.length === 0) { setActiveLyricIndex(-1); return; }
    const offsetMs = (currentTrack?.introOffsetMs || 0) + (lyricOffsetMs || 0);
    const idx = lyrics.findLastIndex(l => l.time <= (currentTime - offsetMs));
    if (idx !== -1 && idx !== activeLyricIndex) {
      setActiveLyricIndex(idx);
    }
  }, [currentTime, lyrics, lyricOffsetMs]);

  useLayoutEffect(() => {
    // Normal Sync (Bounded Scroll)
    if (activeLyricRef.current && !isAutoScrollPaused && lyricsContainerRef.current) {
        const activeLine = activeLyricRef.current;
        const container = lyricsContainerRef.current;
        const targetScroll = activeLine.offsetTop - (container.offsetHeight / 2) + (activeLine.offsetHeight / 2);
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
    // Expanded Sync (Bounded Scroll with Header Offset)
    if (expandedActiveRef.current && !isAutoScrollPaused && expandedContainerRef.current) {
        const activeLine = expandedActiveRef.current;
        const container = expandedContainerRef.current;
        
        const containerHeight = container.getBoundingClientRect().height;
        const activeRect = activeLine.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
        const targetScroll = relativeTop - (containerHeight / 2) + (activeRect.height / 2);
        
        container.scrollTo({ top: targetScroll, behavior: (isAutoScrollPaused || activeLyricIndex <= 1) ? "auto" : "smooth" });
    }
  }, [activeLyricIndex, isAutoScrollPaused, isLyricsExpanded]);

  const parseLRC = (lrcString) => {
    if (!lrcString) return [];
    const lines = lrcString.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/;
    
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const mins = parseInt(match[1]);
        const secs = parseInt(match[2]);
        const ms = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]);
        const time = (mins * 60 + secs) * 1000 + ms;
        const text = line.replace(timeRegex, '').trim();
        if (text) result.push({ time, text });
      }
    });
    setLyrics(result);
  };

  const fetchLyrics = async (trackTitle, trackAuthor, trackDuration, trackUrl) => {
    if (!trackTitle) return;
    setIsLyricsLoading(true);
    try {
      if (isStandalone) {
          const results = await window.aether.getLyrics(trackTitle, trackAuthor, trackDuration, trackTitle, trackUrl);
          // Backend returns { lyrics: Array<{time, text}>, source: string } OR Array directly
          const lyricsArray = Array.isArray(results) ? results : (results?.lyrics || []);
          setLyrics(lyricsArray);
          setIsLyricsLoading(false);
          return;
      }
      const resp = await fetch(`${API_BASE}/api/lyrics?track=${encodeURIComponent(trackTitle)}&artist=${encodeURIComponent(trackAuthor || '')}&duration=${(trackDuration || 0)/1000}&url=${encodeURIComponent(trackUrl || '')}&format=json`);
      const data = await resp.json();
      setLyrics(Array.isArray(data) ? data : []);
      if (trackTitle !== currentTrackTitle) {
        setCurrentTime(0);
        setCurrentTrackTitle(trackTitle);
      }
    } catch (err) { setLyrics([]); } finally { setIsLyricsLoading(false); }
  };

  useEffect(() => {
    if (currentTrack?.title !== currentTrackTitle) {
      if (currentTrackTitle && prevTrackRef.current) {
         setHistory(prev => [prevTrackRef.current, ...prev].slice(0, 20)); // Keep last 20
      }
      setCurrentTime(0);
      setLyricOffsetMs(0);
      setCurrentTrackTitle(currentTrack?.title || "");
      prevTrackRef.current = currentTrack;
    }
    if (currentTrack?.syncedLyrics) setLyrics(currentTrack.syncedLyrics.lyrics || []);
    else if (currentTrack?.title) fetchLyrics(currentTrack.title, currentTrack.author, currentTrack.totalDurationMs || currentTrack.duration, currentTrack.actualUrl);
    else setLyrics([]);
  }, [currentTrack?.title]);

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const str = String(url);
    const match = str.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      if (isStandalone) {
          const results = await window.aether.search(searchQuery);
          setSearchResults(results);
      } else {
          const resp = await axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(searchQuery)}`);
          setSearchResults(resp.data);
      }
      if (isMobileSearchOpen) setIsMobileSearchOpen(false);
    } catch (err) {
        console.error("[Search] Failed:", err);
        if (isStandalone) {
            alert(`NEURAL SYSTEM ERROR\n- Message: ${err.message}\n- Status: Binary pathing issue or process blocked.\n- Try: Restarting Aether from Applications.`);
        }
    } finally { setIsSearching(false); }
  };

  const warmupTrack = async (id, url, title) => {
    if (!window.aether?.download || !url) return;
    if (downloadedTracks.includes(id)) {
      console.log(`[Aether] Warmup skipped because already downloaded: ${title} (${id})`);
      return;
    }
    setWarmingTrackIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      console.log(`[Aether] Warmup download request for ${title} (${id})`);
      const result = await window.aether.download(url, id);
      console.log(`[Aether] Warmup result for ${id}:`, result);
      if (result?.success) {
        setDownloadedTracks(prev => Array.from(new Set([...prev, id])));
      }
    } catch (err) {
      console.error(`[Aether] Warmup download failed for ${title} (${id})`, err);
    } finally {
      setWarmingTrackIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAdd = async (track) => {
    if (isStandalone) {
        const addStartTime = Date.now();
        const url = track.actualUrl || track.url || track.id;
        const youtubeId = extractYouTubeId(url);
        const stableId = youtubeId || track.id || Date.now().toString();
        const newTrack = { ...track, id: stableId, actualUrl: url, youtubeId };
        console.log(`[Aether] Adding standalone track to queue: ${newTrack.title} (${url}) -> id=${stableId}`);
        setQueue(prev => {
            const next = [...prev, newTrack];
            if (next.length === 1) setIsPlaying(true);
            setIsManualStop(false); // Reset on manual add
            return next;
        });
        console.log(`[Aether] Track queued in ${Date.now() - addStartTime}ms`);
        setLastAdded(track.title);
        setTimeout(() => setLastAdded(null), 3000);

        warmupTrack(stableId, url, track.title);

        // --- AETHER: NEURAL METADATA SYNC (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
        window.aether.getMetadata(track.actualUrl || track.url).then(fullTrack => {
            if (fullTrack) {
                setQueue(current => current.map(item => 
                    item.id === stableId ? { ...item, ...fullTrack, id: stableId } : item
                ));
            }
        });
        return;
    }

    const guildId = auth?.guild_id || new URLSearchParams(window.location.search).get('guild_id');
    if (!guildId || guildId === '0') return alert("Join a server to play music.");
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      await axios.post(`${API_BASE}/api/add/${guildId}`, { track, userId: auth?.user?.id });
      fetchQueue(guildId);
      setLastAdded(track.title);
      setTimeout(() => setLastAdded(null), 3000);
    } catch (err) {} finally {
      setAddingIds(prev => { const next = new Set(prev); next.delete(track.id); return next; });
      setIsAutoplaySeeking(false);
    }
  };
  const handleSleepTimerToggle = () => {
      const cycles = [0, 15, 30, 60, 120];
      const nextIdx = (cycles.indexOf(sleepTimerValue) + 1) % cycles.length;
      const nextVal = cycles[nextIdx];
      setSleepTimerValue(nextVal);
      if (nextVal === 0) {
          setSleepDeadline(null);
          setSleepRemainingStr('');
          if (localAudioRef.current) localAudioRef.current.volume = volume;
      } else {
          setSleepDeadline(Date.now() + nextVal * 60 * 1000);
      }
  };

  useEffect(() => {
      if (!sleepDeadline) return;
      const int = setInterval(() => {
          const remainingMs = sleepDeadline - Date.now();
          if (remainingMs <= 0) {
              setSleepDeadline(null);
              setSleepTimerValue(0);
              setSleepRemainingStr('');
              handleControl('pause');
              if (localAudioRef.current) localAudioRef.current.volume = volume;
          } else if (remainingMs <= 10000) {
              const fadeRatio = remainingMs / 10000;
              if (localAudioRef.current) localAudioRef.current.volume = volume * fadeRatio;
              setSleepRemainingStr('FADING...');
          } else {
              const m = Math.floor(remainingMs / 60000);
              const s = Math.floor((remainingMs % 60000) / 1000);
              setSleepRemainingStr(`${m}:${s.toString().padStart(2, '0')}`);
          }
      }, 1000);
      return () => clearInterval(int);
  }, [sleepDeadline, volume]);

  const handleExportVault = async (playlistName) => {
      if (!isStandalone || !window.aether?.exportVault) return;
      const data = playlists[playlistName] || [];
      const res = await window.aether.exportVault(playlistName, data);
      if (res.success) alert(`Vault Node [${playlistName}] successfully exported.`);
  };

  const handleImportVault = async () => {
      if (!isStandalone || !window.aether?.importVault) return;
      const res = await window.aether.importVault();
      if (res.success && res.data && Array.isArray(res.data)) {
          const p = { ...playlists };
          p[res.name] = res.data;
          setPlaylists(p);
          window.aether?.store?.set('playlists', p);
          alert(`Vault Node [${res.name}] successfully injected.`);
      }
  };


  const handleControl = useCallback(async (action) => {
    console.log("[Aether/Control] Signal Bridge Active:", action);
    console.log("[Aether/Control] Action:", action);
    if (isStandalone) {
        if (action === 'pause') setIsPlaying(false);
        if (action === 'resume') setIsPlaying(true);
        if (action === 'toggle') setIsPlaying(prev => !prev);
        if (action === 'previous') {
            if (currentTime > 3000 || history.length === 0) {
                // Restart current track if > 3s or no history (Prevents Network Standby)
                setCurrentTime(0);
                if (localAudioRef.current) localAudioRef.current.currentTime = 0;
            } else if (history.length > 0) {
                // Go to actual previous track
                const last = history[0];
                if (last) {
                    setHistory(h => h.slice(1));
                    setQueue(q => [last, ...q]);
                    setIsPlaying(true);
                }
            }
            if (currentTime > 3000) {
                // Restart current track if > 3s
                setCurrentTime(0);
                if (localAudioRef.current) localAudioRef.current.currentTime = 0;
            } else if (history.length > 0) {
                // Go to actual previous track
                const prev = history[0];
                setHistory(h => h.slice(1));
                setQueue(q => [prev, ...q]);
                setIsPlaying(true);
            } else {
                setCurrentTime(0);
                if (localAudioRef.current) localAudioRef.current.currentTime = 0;
            }
        }
        if (action === 'skip') {
            setQueue(prev => {
                const next = prev.slice(1);
                if (next.length === 0) {
                    setIsPlaying(false);
                    if (isAutoplayEnabled) triggerAutoplay(prev[0]); // Force immediate autoplay kick
                }
                return next;
            });
            setCurrentTime(0);
        }
        if (action === 'clear' || action === 'stop') {
            setQueue([]);
            setIsPlaying(false);
            setCurrentTime(0);
            setIsManualStop(true); 
        }
        return;
    }

    try { 
      if (action === 'clear' || action === 'stop') setQueue([]); 
      await axios.post(`${API_BASE}/api/control/${guildId}`, { action }); 
      fetchQueue(guildId); 
    } catch (err) {}
  }, [isStandalone, auth, API_BASE, history, isAutoplayEnabled]);

  const [uiPulse, setUiPulse] = useState(1);
  const [accentColor, setAccentColor] = useState('#00ffbf');

  useEffect(() => {
    if (!isPlaying) {
      setUiPulse(1);
      return;
    }
    let animationFrame;
    const updatePulse = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const lowFreq = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        // Neural Vibration (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN Subtle scale pulse based on bass (20-100Hz range)
        const intensity = 0.04;
        const scale = (visualizerMode === 'pulse') ? (1 + (lowFreq / 255) * intensity) : 1;
        setUiPulse(scale);
      }
      animationFrame = requestAnimationFrame(updatePulse);
    };
    updatePulse();
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, visualizerMode]);

  const handleSeek = useCallback(async (time) => {
    // Neural Seek Link
    const guildId = auth?.guild_id || new URLSearchParams(window.location.search).get('guild_id');
    try {
        await axios.post(`${API_BASE}/api/control/${guildId}`, { action: 'seek', time });
    } catch (e) {}
    
    // Remote discord bots support absolute timing updates natively.
    // Natively piping a chunked generic HTTP stream into an <audio> tag does not magically support arbitrary byte manipulation (HTTP 206).
    // Mutating currentTime will forcefully close the stream connection, triggering a fresh 0:00 buffer reload.
    if (!isStandalone) {
        if (localAudioRef.current) localAudioRef.current.currentTime = time / 1000;
        setCurrentTime(time);
        setLyricOffsetMs(0); 
    } else {
        if (localAudioRef.current && currentTrack) {
            const timeSec = Math.floor(time / 1000);
            const base = currentTrack.actualUrl || currentTrack.url;
            localAudioRef.current.src = `http://localhost:${streamPort}/stream?url=${encodeURIComponent(base)}&time=${timeSec}`;
            localAudioRef.current.play().catch(()=>{});
        }
        setCurrentTime(time);
        setLyricOffsetMs(0);
    }
  }, [auth, API_BASE, isStandalone, currentTrack, streamPort]);

  const handleRemove = useCallback(async (index) => {
    if (isStandalone) {
        setQueue(prev => {
            const next = [...prev];
            next.splice(index, 1);
            return next;
        });
        return;
    }
    const guildId = auth?.guild_id || new URLSearchParams(window.location.search).get('guild_id');
    try { await axios.post(`${API_BASE}/api/remove/${guildId}/${index}`); fetchQueue(guildId); } catch (err) {}
  }, [isStandalone, auth, API_BASE]);

  const handleSync = async (offset) => {
      if (isStandalone) {
          setLyricOffsetMs(prev => prev + offset);
          return;
      }
      const guildId = auth?.guild_id || new URLSearchParams(window.location.search).get('guild_id');
      await axios.post(`${API_BASE}/api/sync/${guildId}`, { offset });
      fetchQueue(guildId);
  }

  if (loading) return (
    <div className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="relative">
        <Loader2 className="animate-spin text-brand-accent" size={48} />
        <div className="absolute inset-0 blur-xl bg-brand-accent/20 animate-pulse" />
      </div>
      <div className="label-caps animate-pulse text-sm">Neural Link Active</div>
    </div>
  );

  const toggleMiniPlayer = async () => {
      if (!isStandalone || !window.aether?.resizeWindow) return;
      if (isMiniPlayer) {
          await window.aether.resizeWindow(1100, 750, false);
          setIsMiniPlayer(false);
      } else {
          await window.aether.resizeWindow(360, 160, true);
          setIsMiniPlayer(true);
      }
  };

  if (isMiniPlayer) {
     return (
        <div className="w-[100vw] h-[100vh] bg-[#050505] overflow-hidden flex items-center p-3 drag-region relative">
           <div className="absolute inset-0 bg-brand-accent/5 pointer-events-none" />
           {currentTrack ? (
              <div className="flex w-full h-full items-center gap-4 relative z-10">
                 <img src={getProxyUrl(currentTrack.thumbnail)} className="h-full object-cover aspect-square rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/10" />
                 <div className="flex flex-col flex-1 min-w-0 pr-4 h-full justify-center">
                     <span className="text-[15px] font-black text-white truncate leading-tight uppercase tracking-tighter" style={{ textShadow: `0 0 10px ${themeColor}88` }}>{currentTrack.title}</span>
                     <span className="text-[10px] font-bold text-brand-accent truncate uppercase tracking-widest leading-tight opacity-80">{currentTrack.author}</span>
                     
                     <div className="flex items-center gap-4 mt-4 no-drag shrink-0">
                        <button onClick={() => handleControl('previous')} className="text-white/40 hover:text-white transition-all"><Rewind size={16} fill="currentColor" /></button>
                        <button onClick={() => handleControl(isPlaying ? 'pause' : 'play')} className="w-10 h-10 rounded-full bg-brand-accent hover:bg-white text-black flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,255,191,0.3)] hover:scale-105 active:scale-95 border border-brand-accent/50">
                           {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                        </button>
                        <button onClick={() => handleControl('skip')} className="text-white/40 hover:text-white transition-all"><FastForward size={16} fill="currentColor" /></button>
                     </div>
                 </div>
                 <button onClick={toggleMiniPlayer} className="absolute top-0 right-0 p-2 rounded-lg text-white/20 hover:text-brand-accent no-drag transition-colors active:scale-90"><AppWindow size={14} /></button>
              </div>
           ) : (
              <div className="w-full text-center text-xs font-mono text-white/40 tracking-widest uppercase flex flex-col items-center justify-center h-full relative z-10">
                 <div className="absolute top-0 right-0 p-2 text-white/20 hover:text-brand-accent no-drag cursor-pointer transition-colors" onClick={toggleMiniPlayer}><AppWindow size={14} /></div>
                 <div>NO SIGNAL DETECTED</div>
              </div>
           )}
        </div>
     );
  }

  return (
    <div className={`fixed inset-0 bg-transparent selection:bg-brand-accent selection:text-brand-dark flex flex-col h-screen overflow-hidden relative isolate ${isVerticalStack ? 'vertical-stack-mode' : ''}`}>
      <div className="fixed inset-0 bg-[#050505] z-[-2]" />
      {/* Background Mesh (Absolute to avoid flex interference) */}
      <div className="absolute inset-0 bg-mesh pointer-events-none z-[-1]" />

      {/* Neural Dynamic Backdrop (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {currentTrack?.thumbnail ? (
            <motion.div 
              key={currentTrack.thumbnail}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 bg-center bg-cover scale-110 blur-[120px]"
              style={{ backgroundImage: `url(${getProxyUrl(currentTrack.thumbnail)})` }}
            />
          ) : (
            <motion.div 
              key="standby-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.05 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-brand-accent/20 via-transparent to-brand-accent/10 blur-[150px]"
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-brand-dark/20" />
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-accent/5 blur-[100px] rounded-full animate-pulse-glow" />
         <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-brand-accent/10 blur-[80px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* APP HEADER */}
      <header className="h-16 md:h-16 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-3xl z-50 px-4 pl-20 flex flex-row items-center justify-between gap-4 compact-header drag flex-none">
          {/* TOP ROW: CORE + MINI USER (Horizontal on ALL devices) */}
          <div className="w-full flex items-center justify-between lg:w-auto lg:gap-6 lg:min-w-[240px]">
            {/* NEURAL CORE */}
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 glass-card flex items-center justify-center border-brand-accent/30 relative overflow-hidden group no-drag">
                 <img src="aether-logo.png" alt="Aether" className="w-6 h-6 object-contain group-hover:scale-110 transition-transform" onError={(e) => e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGZmYmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWdvbiBwb2ludHM9IjEzIDIgMyAxNCAxMiAxNCAxMSAyMiAyMSAxMCAxMiAxMCAxMyAyIj48L3BvbHlnb24+PC9zdmc+'} />
                 <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-tighter text-white/90">AETHER</span>
                  <span className="text-[7px] font-mono text-brand-accent/60 font-black tracking-[0.2em] uppercase">V12.11.1-SOVEREIGN</span>
                </div>
            </div>
            

            <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-white/5 h-8 no-drag">
               {localIp && (
                  <div className="flex flex-col no-drag text-right">
                     <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.2em] font-bold">AETHER LINK</span>
                     <span className="text-[10px] font-mono text-brand-accent font-black tracking-tighter">http://{localIp}:{streamPort}</span>
                  </div>
               )}
               <div className="flex flex-col no-drag pl-4 border-l border-white/5">
                  <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.2em] font-bold">NODE_UPTIME</span>
                  <span className="text-[10px] font-mono text-brand-accent font-black tracking-tighter">{uptime}</span>
               </div>
               
               {/* MODULAR STATS TOGGLE */}
               <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
                  <button 
                    onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${isStatsExpanded ? 'bg-brand-accent/10 border-brand-accent/30' : 'bg-white/5 border-white/10 hover:border-brand-accent/50 group'}`}
                  >
                    <Activity size={12} className={isStatsExpanded ? 'text-brand-accent animate-pulse' : 'text-brand-text-dim group-hover:text-brand-accent'} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isStatsExpanded ? 'text-brand-accent' : 'text-brand-text-dim'}`}>
                      {isStatsExpanded ? 'Live HUD' : 'Stats'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isStatsExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.95 }}
                        className="flex items-center gap-4 py-1.5 px-4 bg-white/[0.03] border border-white/5 rounded-xl"
                      >
                        <div className="flex flex-col">
                           <div className="text-[7px] font-mono text-brand-text-dim uppercase tracking-tighter leading-none mb-1">ENGINE CPU</div>
                           <div className="text-[10px] font-black font-mono text-brand-accent leading-none">{systemStats?.appCpu || '0.0'}%</div>
                        </div>
                        <div className="w-[1px] h-3 bg-white/10" />
                        <div className="flex flex-col">
                           <div className="text-[7px] font-mono text-brand-text-dim uppercase tracking-tighter leading-none mb-1">APP RAM</div>
                            <div className="text-[10px] font-black font-mono text-brand-accent leading-none">{systemStats?.appMem || '0'}MB</div>
                         </div>
                       </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </div>
          </div>

          {/* SEARCH ROW: Dedicated full-width row on mobile */}
          <div className="w-full md:flex-1 flex justify-center md:max-w-[600px] md:px-8 order-3 md:order-2 ultra-compact-hide no-drag">
            <form onSubmit={handleSearch} className="relative w-full group no-drag">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text-dim group-focus-within:text-brand-accent z-10 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search music..." 
                className="w-full bg-white/5 border border-white/10 rounded-full pl-14 pr-10 h-11 text-sm outline-none focus:border-brand-accent/50 focus:bg-brand-accent/[0.03] transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && <div className="absolute right-5 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-brand-accent" size={16} /></div>}
            </form>
          </div>

          {/* MODES & SUITE */}
          <div className="flex items-center justify-end gap-3 min-w-fit order-3 no-drag">
               <button 
                 onClick={() => setIsFocusedMode(!isFocusedMode)}
                 className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all border no-drag ${isFocusedMode ? 'bg-brand-accent border-brand-dark text-brand-dark shadow-neon-strong' : 'bg-white/5 border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/50'}`}
                 title={isFocusedMode ? "Full Studio" : "Focused Mode"}
               >
                 <BookOpen size={16} />
               </button>

               <button 
                 onClick={() => setIsVerticalStack(!isVerticalStack)}
                 className={`flex items-center gap-3 px-4 py-2 rounded-2xl transition-all border font-black uppercase tracking-widest text-[10px] no-drag ${isVerticalStack ? 'bg-brand-accent border-brand-dark text-brand-dark shadow-neon-strong' : 'bg-white/5 border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/50 hover:bg-brand-accent/5'}`}
               >
                 <ListMusic size={14} className={isVerticalStack ? 'animate-pulse' : ''} />
                 <span className="hidden sm:inline">{isVerticalStack ? 'Grid View' : 'Vertical Stack'}</span>
               </button>
          </div>
        </header>


      <motion.main 
        className={`flex-1 relative z-10 w-full mb-0 min-h-0 px-4 md:px-6 py-4 ${isVerticalStack ? '!flex !flex-col !gap-8 overflow-y-auto scroll-smooth pb-20 custom-scrollbar' : 'flex flex-row gap-4 overflow-hidden'}`}
        style={{ scale: uiPulse }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        
        {/* PLAYER & LYRICS PILLAR */}
        <div className={`flex flex-col gap-4 min-w-0 overflow-hidden ${isVerticalStack ? '!w-full !max-w-full !flex-none' : (isFocusedMode ? 'w-full px-0' : 'w-[66.666%] h-full')}`}>
          
          {/* PLAYER CARD */}
          <div className="glass-card flex relative overflow-hidden group shrink-0 transition-all duration-700 p-6 md:p-8 flex-col sm:flex-row gap-8 md:gap-10 min-h-[300px] flex-none rounded-[3.5rem] border-white/5 shadow-2xl transition-all">
        {/* TOP BAR / NAVIGATION */}
            {currentTrack && (
              <div className="absolute inset-0 blur-[120px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            
            {/* HIGH-FIDELITY CANVAS VISUALIZER (BTM BAR) */}
            <canvas 
               ref={visualizerCanvasRef} 
               width={800} 
               height={40} 
               className={`absolute bottom-0 left-0 right-0 w-full h-[32px] pointer-events-none z-20 transition-opacity duration-500 ${visualizerMode === 'bars' ? 'opacity-50' : 'opacity-0'}`}
            />

            {currentTrack ? (
                <>
                {/* NEURAL BUFFERING OVERLAY */}
                {isAudioBuffering && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[2.5rem]"
                  >
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-t-2 border-brand-accent rounded-full animate-spin shadow-[0_0_20px_#00ffbf]" />
                        <div className="text-brand-accent font-black text-[10px] tracking-[0.5em] uppercase animate-pulse">Neural Buffering...</div>
                    </div>
                  </motion.div>
                )}
              <div className="flex flex-col md:flex-row gap-8 lg:gap-12 flex-1 relative z-10 w-full">
                 {/* LEFT: THUMBNAIL + VOLUME */}
                 <div className="flex flex-col gap-6 items-center flex-none">
                    <div className="w-48 h-48 md:w-56 md:h-56 lg:w-60 lg:h-60 relative group flex-none">
                        <img src={getProxyUrl(currentTrack.thumbnail)} className="w-full h-full object-cover rounded-[2.5rem] shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-700" alt="" />
                        <div className="absolute inset-0 bg-brand-accent/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center">
                            <Activity className="text-brand-accent animate-pulse" size={32} />
                        </div>
                    </div>

                    {/* COMPACT VOLUME UNIT */}
                    <div className="w-full flex flex-col gap-2 px-2 bg-white/5 p-3 rounded-2xl border border-white/5">
                       <div className="flex items-center justify-between">
                          <button onClick={() => handleControl('mute')} className="hover:text-brand-accent transition-colors active:scale-90">
                            <Volume2 size={12} className={volume === 0 ? 'text-red-500' : 'text-brand-accent/50'} />
                          </button>
                         <span className="text-[9px] font-mono text-brand-accent font-black tracking-widest">{Math.round(volume * 100)}%</span>
                       </div>
                       <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleVolumeChange(e.target.value)} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-accent" />
                    </div>
                 </div>

                 {/* RIGHT: METADATA + SEEKER + TRANSPORT */}
                 <div className="flex flex-col flex-1 min-w-0 py-0">
                    <div className="mb-6">
                        <div className="flex items-center justify-between gap-4 mb-2">
                           <div className="label-caps mb-0 text-brand-accent/50 text-[9px] flex items-center gap-2 tracking-[0.4em] uppercase font-black">
                              <span className="w-1 h-1 rounded-full bg-brand-accent animate-pulse" />
                               {isAudioBuffering ? "Neural Calibration // Buffering // V12.11.1-SOVEREIGN" : "Signal Output // Active // V12.11.1-SOVEREIGN"}
                           </div>
                           <div className="flex items-center gap-1 no-drag ml-auto">
                             <button onClick={() => handleControl('clear')} className="p-2 text-white/20 hover:text-red-500 transition-colors" title="Clear Queue"><Trash2 size={14} /></button>
                             <button onClick={() => {
                                 if (!currentTrack?.actualUrl) return;
                                 if (isStandalone) window.aether?.openExternal(currentTrack.actualUrl);
                             }} className="p-2 text-white/20 hover:text-brand-accent transition-colors" title="Open Source"><ExternalLink size={14} /></button>
                             <button onClick={() => {
                                 if (isStandalone && currentTrack && window.aether?.saveToDisk) {
                                     window.aether.saveToDisk(currentTrack.actualUrl || currentTrack.url, currentTrack.title, currentTrack.author);
                                 }
                             }} className="p-2 text-white/20 hover:text-brand-accent transition-colors" title="Download High-Fidelity Signal"><Download size={14} /></button>
                             <button onClick={() => setActiveMenuTrack(currentTrack)} className="p-2 text-white/20 hover:text-brand-accent transition-colors" title="Save to Vault Overlay"><Plus size={14} /></button>
                             <div className="w-px h-3 bg-white/10 mx-1" />
                             <button onClick={toggleMiniPlayer} className="p-2 text-white/40 hover:text-brand-accent transition-colors" title="Compact Studio Widget"><AppWindow size={16} /></button>
                             <button onClick={() => setIsFocusedMode(!isFocusedMode)} className={`p-2 transition-colors ${isFocusedMode ? 'text-brand-accent' : 'text-white/40 hover:text-brand-accent'}`} title="Toggle Focus Mode"><Target size={16} /></button>
                           </div>
                        </div>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white/95 leading-none uppercase tracking-tighter mb-2 line-clamp-2 transition-all duration-700" style={{ textShadow: visualizerMode === 'pulse' ? `0 0 20px ${themeColor}44` : 'none' }}>{currentTrack.title}</h1>
                        <p className="text-brand-accent text-xs font-black uppercase tracking-[0.3em] opacity-80 transition-all duration-700" style={{ textShadow: visualizerMode === 'pulse' ? `0 0 10px ${themeColor}88` : 'none' }}>{currentTrack.author}</p>
                    </div>

                    <div className="mt-auto space-y-6">
                       <div className="space-y-3">
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative group cursor-pointer" onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const pos = (e.clientX - rect.left) / rect.width;
                              handleSeek(pos * (currentTrack.totalDurationMs || currentTrack.duration || 0));
                          }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${(currentTime / (currentTrack.totalDurationMs || currentTrack.duration || 1)) * 100}%` }} className="absolute inset-0 left-0 bg-brand-accent shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-white/30 font-black tracking-widest uppercase">
                              <span>{formatTime(currentTime)}</span>
                              <span>{formatTime(currentTrack.totalDurationMs || currentTrack.duration || 0)}</span>
                          </div>
                       </div>

                        {/* COMPACT TRANSPORT CLUSTER - CENTERED */}
                        <div className="flex items-center justify-center w-full mt-2 relative">
                           
                           <div className="flex items-center bg-white/5 backdrop-blur-3xl border border-white/5 p-2 rounded-3xl gap-4 relative z-10">
                              <button onClick={() => handleControl('previous')} className="p-3 hover:text-brand-accent transition-colors active:scale-90"><Rewind size={22} fill="currentColor" /></button>
                              <button onClick={() => handleControl(isPlaying ? 'pause' : 'resume')} className="w-16 h-16 bg-brand-accent text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-accent/20">
                                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                              </button>
                              <button onClick={() => handleControl('skip')} className="p-3 hover:text-brand-accent transition-colors active:scale-90"><FastForward size={22} fill="currentColor" /></button>
                            </div>
                         </div>
                      </div>
                   </div>
               </div>
               </>
            ) : (
              <div className="w-full h-64 flex flex-col items-center justify-center gap-6 opacity-10">
                <Music size={80} className="text-brand-text-dim animate-pulse" strokeWidth={1} />
                <div className="label-caps text-xl tracking-[0.5em]">Network Standby</div>
              </div>
            )}
          </div>


          {/* LYRICS PANEL - FLEX-1 TO FILL GAP */}
          <div className={`glass-card overflow-hidden flex flex-col transition-all duration-700 bg-white/[0.03] border-white/5 min-h-0 ${isVerticalStack ? 'h-[400px] flex-none' : 'flex-1'}`}>
            <div className={`border-b border-white/5 flex items-center justify-between bg-white/[0.02] ${isVerticalStack ? 'px-3 py-2' : 'px-5 py-4'}`}>
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <BookOpen size={16} className="text-brand-accent flex-none" />
                <span className="label-caps mb-0 text-[9px] tracking-[0.1em] uppercase truncate shrink">Subtitles // {isPlaying ? (lyrics.length > 0 ? 'SYNCED' : 'DECODING') : 'IDLE'}</span>
              </div>
              <div className="flex items-center gap-1.5 no-drag flex-none shrink-0 ml-2">
                  <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1 group/sync relative overflow-hidden">
                    <button onClick={() => handleSync(-500)} className="p-2 hover:text-brand-accent"><ChevronLeft size={18} /></button>
                    <span className="text-[10px] font-mono text-brand-accent font-black w-14 text-center">{lyricOffsetMs}ms</span>
                    <button onClick={() => handleSync(500)} className="p-2 hover:text-brand-accent"><ChevronRight size={18} /></button>
                 </div>
                  {!isStandalone && <button onClick={() => {
                    const guildId = auth?.guild_id || new URLSearchParams(window.location.search).get('guild_id');
                    axios.post(`${API_BASE}/api/source/${guildId}`).catch(e => console.error('Rotate error:', e));
                  }} className="hidden md:flex px-5 py-2.5 glass-card text-[10px] font-black hover:border-brand-accent transition-all uppercase tracking-widest active:scale-95 border-white/10">Rotate</button>}
                <button 
                  onClick={() => setIsLyricsExpanded(!isLyricsExpanded)}
                  className="flex items-center justify-center p-2 w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-accent transition-all text-brand-accent group active:scale-90 flex-none"
                  title="Immersive Output"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 lg:p-20 scroll-smooth relative" ref={lyricsContainerRef} onWheel={() => setIsAutoScrollPaused(true)} onTouchStart={() => setIsAutoScrollPaused(true)}>
              {isAutoScrollPaused && lyrics.length > 0 && (
                <button 
                  onClick={() => setIsAutoScrollPaused(false)}
                  className="sticky top-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-brand-accent text-black font-black text-[10px] uppercase tracking-widest rounded-full shadow-neon translate-y-4 animate-bounce hover:scale-105 transition-transform"
                >
                  <RotateCcw size={12} /> Resume Sync
                </button>
              )}
              {isLyricsLoading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-brand-accent" size={48} /></div>
              ) : lyrics.length > 0 ? (
                <div className="flex flex-col gap-6 py-4 text-center">
                  {lyrics.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    return (
                      <div 
                        key={idx} 
                        ref={isActive ? activeLyricRef : null} 
                        className={`text-base sm:text-lg lg:text-xl font-bold transition-all duration-700 transform leading-snug py-1.5 ${
                          isActive 
                            ? 'text-brand-accent scale-105 opacity-100 drop-shadow-[0_0_15px_rgba(0,255,191,0.5)]' 
                            : 'text-white/50 opacity-80 hover:opacity-100 transition-opacity cursor-default'
                        }`}
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                   <div className="grid grid-cols-4 gap-4 w-64 opacity-10 mb-12">
                      {[...Array(16)].map((_, i) => <div key={i} className="h-4 bg-brand-accent rounded-sm animate-pulse" style={{ animationDelay: `${i*0.1}s` }} />)}
                   </div>
                   <div className="flex flex-col items-center gap-4 opacity-20">
                      <Signal size={48} className="text-brand-accent animate-pulse" />
                      <div className="text-[12px] font-black uppercase tracking-[0.5em]">SIGNAL_STANDBY</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest opacity-50">awaiting incoming stream decrypt...</div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        {!isFocusedMode && (
          <div className={`flex flex-col gap-4 min-w-0 ${isVerticalStack ? '!w-full !max-w-full !flex-none pb-20' : 'w-[33.333%] h-full overflow-hidden flex-none'}`}>
            {/* QUEUE */}
            <div className={`${isVerticalStack ? 'h-[400px]' : 'h-[160px]'} flex-none glass-card flex flex-col overflow-hidden bg-white/[0.03] border-white/5`}>
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <div className="flex items-center gap-3">
                 <ListMusic size={18} className="text-brand-accent" />
                 <span className="label-caps mb-0 text-[10px]">Queue Buffer</span>
               </div>
               <div className="flex items-center gap-3">
                 <button 
                  onClick={() => { if (queue.length > 0) setActiveMenuTrack(queue); }}
                  className="p-1.5 rounded-lg transition-all flex items-center gap-2 bg-white/5 text-white/50 border border-white/10 hover:bg-brand-accent/20 hover:text-brand-accent"
                  title="Flash Queue to Target Vault"
                 >
                    <Save size={10} />
                 </button>
                 <button
                    onClick={() => {
                        if (queue.length > 1) {
                            setQueue(prev => {
                                const q = [...prev];
                                for (let i = q.length - 1; i > 0; i--) {
                                    const j = Math.floor(Math.random() * (i + 1));
                                    [q[i], q[j]] = [q[j], q[i]];
                                }
                                return q;
                            });
                            setCurrentTime(0);
                            setIsPlaying(true);
                            if (!isStandalone) {
                                axios.post(`${API_BASE}/api/control/${DEFAULT_GUILD_ID}`, { action: 'shuffle' }).catch(()=>{});
                            }
                        }
                    }}
                    className="p-1.5 rounded-lg transition-all flex items-center gap-2 bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                    title="Shuffle Queue & Play Random"
                 >
                    <Shuffle size={10} />
                 </button>
                 <button 
                   onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
                   className={`p-1.5 rounded-lg transition-all flex items-center gap-2 ${isAutoplayEnabled ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30 shadow-neon' : 'bg-white/5 text-white/30 border border-white/10 opacity-50'}`}
                   title="Neural Autoplay"
                 >
                   <Zap size={10} className={isAutoplayEnabled ? 'animate-pulse' : ''} />
                   <span className="text-[8px] font-black uppercase tracking-tighter">{isAutoplayEnabled ? 'AUTO_ON' : 'AUTO_OFF'}</span>
                 </button>
                 <span className="text-[10px] font-mono font-black text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full">{Math.max(0, queue.length - 1)}</span>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-6">
              <AnimatePresence mode="popLayout">
                {queue.length > 1 ? queue.slice(1).map((track, idx) => {
                   const isDownloaded = downloadedTracks.includes(track.id);
                   if (isDownloaded) console.log(`[Aether] Track ${track.id} is downloaded`);
                   return (
                   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key={`${track.id}-${idx}`} className={`group glass-card p-3 flex items-center gap-4 hover:border-brand-accent/30 transition-all border-white/5 ${isDownloaded ? 'bg-red-500/15 border-red-500/30 shadow-[0_0_20px_rgba(255,0,0,0.35)]' : 'bg-white/[0.01]'}`}>
                     <img src={getProxyUrl(track.thumbnail)} className="w-12 h-12 rounded-xl object-cover" alt="" />
                     <div className="flex-1 min-w-0">
                       <div className="text-[12px] font-black truncate group-hover:text-brand-accent transition-colors uppercase tracking-widest">{track.title}</div>
                       <div className="text-[10px] text-brand-text-dim truncate font-bold uppercase opacity-50 mt-1">{track.author}</div>
                     </div>
                     {isDownloaded && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-500/70 px-2 py-1 rounded-full">READY</span>
                     )}
                     <button onClick={() => handleRemove(idx + 1)} className="lg:opacity-0 group-hover:opacity-100 hover:text-white p-2">
                       <Trash2 size={16} className="text-red-500/50 hover:text-red-500" />
                      </button>
                    </motion.div>
                   );
                }) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 py-12 text-[10px] font-black tracking-widest uppercase">Buffer Empty</div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* DISCOVERY */}
          <div className={`${isVerticalStack ? 'h-[400px]' : 'h-[160px]'} flex-none glass-card flex flex-col overflow-hidden bg-white/[0.03] border-white/5`}>
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-brand-accent" />
                <span className="label-caps mb-0 text-[10px]">Neural Discovery</span>
              </div>
              {searchResults.length > 0 && <button onClick={() => setSearchResults([])} className="p-2 px-4 glass-card text-[9px] font-black text-red-500 hover:bg-red-500/10 active:scale-95 transition-all border-red-500/20">FLUSH</button>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-6">
              <AnimatePresence>
                {searchResults.map((t) => (
                   <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} key={t.id} className="glass-card p-4 flex items-center gap-4 hover:border-brand-accent group overflow-hidden relative transition-all active:scale-[0.98] border-white/5">
                     <img src={getProxyUrl(t.thumbnail)} className="w-14 h-14 rounded-2xl object-cover z-10" alt="" />
                     <div className="flex-1 min-w-0 z-10">
                       <div className="text-[13px] font-black truncate group-hover:text-brand-accent transition-colors uppercase tracking-widest">{t.title}</div>
                       <div className="text-[10px] text-brand-text-dim truncate font-bold opacity-50 mt-1 uppercase leading-none">{t.author}</div>
                     </div>
                     <div className="flex items-center gap-2 z-10">
                        <button onClick={() => handleAdd(t)} className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center hover:bg-brand-accent hover:text-brand-dark transition-all border border-brand-accent/20">
                          <Plus size={22} />
                        </button>
                        <button onClick={() => setActiveMenuTrack(t)} className="w-10 h-10 rounded-xl bg-white/5 text-white/30 flex items-center justify-center hover:bg-brand-accent/20 hover:text-brand-accent transition-all border border-white/10">
                          <HardDrive size={18} />
                        </button>
                     </div>
                     <div className="absolute inset-0 bg-brand-accent/[0.05] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    </motion.div>
                ))}
              </AnimatePresence>
              {!isSearching && searchResults.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-10 text-center py-4">
                   <div className="relative">
                      <Search size={32} strokeWidth={1} />
                      <div className="absolute inset-0 blur-xl bg-brand-accent/30 animate-pulse" />
                   </div>
                   <p className="text-[8px] font-black uppercase tracking-[0.4em]">Awaiting Content</p>
                </div>
              )}
            </div>
          </div>

          {/* STUDIO LIBRARY */}
            <div className={`glass-card flex flex-col overflow-hidden studio-vault-container border-white/5 relative bg-white/[0.02] shadow-inner library-panel ${isVerticalStack ? 'min-h-[500px] flex-none' : 'h-full min-h-0'}`}>
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <div className="flex items-center gap-3"><HardDrive size={18} className="text-brand-accent" /><span className="label-caps mb-0 text-[10px] tracking-widest">Studio Library</span></div>
                <div className="flex items-center gap-4">
                    {/* VISUALIZER TOGGLE (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN */}
                    <button 
                        onClick={() => setVisualizerMode(prev => prev === 'bars' ? 'pulse' : 'bars')}
                        className={`p-1 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${visualizerMode === 'pulse' ? 'bg-brand-accent text-brand-dark border-brand-accent shadow-[0_0_15px_rgba(0,255,191,0.4)]' : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'}`}
                    >
                        {visualizerMode === 'bars' ? 'BARS' : 'AURA'}
                    </button>
                   {isCreatingPlaylist ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                         <input autoFocus className="bg-white/5 border border-brand-accent/30 rounded-lg px-3 py-1 text-[10px] outline-none focus:border-brand-accent w-32" placeholder="Playlist name..." value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (newPlaylistName) handleAddToPlaylist(newPlaylistName, currentTrack); setIsCreatingPlaylist(false); setNewPlaylistName(''); } if (e.key === 'Escape') { setIsCreatingPlaylist(false); setNewPlaylistName(''); } }} />
                         <button onClick={() => { setIsCreatingPlaylist(false); setNewPlaylistName(''); }} className="p-1 text-red-500/50 hover:text-red-500"><X size={14} /></button>
                      </div>
                   ) : ( 
                       <div className="flex items-center gap-2">
                          <button onClick={() => setIsCreatingPlaylist(true)} className="p-1 hover:text-brand-accent transition-colors" title="Create New Vault"><Plus size={16} /></button>
                          <button onClick={handleImportVault} className="p-1 text-white/40 hover:text-brand-accent transition-colors" title="Import Vault (.aether)"><Upload size={14} /></button>
                       </div> 
                    )}
                </div>
            </div>
            {/* SAFE SCROLL WRAPPER */}
            <div className={`flex-1 min-h-0 relative ${isVerticalStack ? 'h-[500px]' : ''}`}>
               <div className="absolute inset-0 overflow-y-auto p-4 flex flex-col gap-6 pb-12 studio-vault-container custom-scrollbar">
                  {viewingPlaylist ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 sticky top-0 bg-brand-dark/95 backdrop-blur-2xl z-20 py-4 mb-6 border-b border-white/5 px-2">
                           <button onClick={() => setViewingPlaylist(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-brand-accent/20 text-white/40 hover:text-brand-accent transition-all flex items-center justify-center border border-white/10"><ChevronLeft size={16} /></button>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-0.5">Neural Vault //</span>
                              <span className="text-xl font-black uppercase tracking-tight text-brand-accent truncate drop-shadow-[0_0_15px_rgba(0,255,191,0.3)]">{viewingPlaylist}</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <button onClick={() => handleExportVault(viewingPlaylist)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-brand-accent/20 hover:text-brand-accent transition-all border border-white/10" title={`Export ${viewingPlaylist} to .aether`}><Download size={12} /></button>
                               <div className="text-[9px] font-mono font-black text-brand-accent/30 tracking-tighter mini-hide bg-brand-accent/5 px-2 py-1 rounded-full border border-brand-accent/10">{(playlists[viewingPlaylist] || []).length} NDS</div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                           {(playlists[viewingPlaylist] || []).map((track, tidx) => (
                              <div key={`${viewingPlaylist}-${tidx}`} className="group glass-card p-4 flex items-center gap-4 hover:border-brand-accent/30 bg-white/[0.01] transition-all relative overflow-hidden border-white/5 rounded-2xl">
                                 <div onClick={() => handleAdd(track)} className="flex-1 flex items-center gap-4 cursor-pointer min-w-0">
                                    <img src={getProxyUrl(track.thumbnail)} className="w-12 h-12 rounded-xl object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all" alt="" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[12px] font-black truncate uppercase tracking-widest group-hover:text-brand-accent transition-colors">{track.title}</div>
                                      <div className="text-[10px] font-bold text-white/20 truncate uppercase mt-1">{track.author}</div>
                                    </div>
                                 </div>
                                 <button onClick={(e) => { e.stopPropagation(); handleRemoveFromPlaylist(viewingPlaylist, tidx); }} className="lg:opacity-0 group-hover:opacity-100 p-3 hover:bg-red-500/10 rounded-xl transition-all" title="Purge from Vault">
                                    <Trash2 size={16} className="text-red-500/30 hover:text-red-500" />
                                 </button>
                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                           ))}
                        </div>
                    </div>
                 ) : (
                    <div className="flex flex-col gap-8">
                       {Object.keys(playlists).map(name => (
                          <div key={name} className="flex flex-col gap-3">
                             <div className="flex items-center justify-between px-2 group/pheader">
                                {isRenamingPlaylist === name ? (
                                   <input autoFocus className="bg-white/5 border border-brand-accent/30 rounded-md px-2 py-0.5 text-[9px] font-black text-brand-accent outline-none w-24" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={() => handleRenamePlaylist(name, renameValue)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenamePlaylist(name, renameValue); if (e.key === 'Escape') setIsRenamingPlaylist(null); }} />
                                ) : ( <div onClick={() => setViewingPlaylist(name)} onDoubleClick={() => { setIsRenamingPlaylist(name); setRenameValue(name); }} className="text-[10px] font-black text-brand-accent/50 uppercase tracking-[0.2em] hover:text-brand-accent transition-colors cursor-pointer">{name}</div> )}
                                <div className="flex items-center gap-1">
                                   <button onClick={() => handlePlaylistAddAll(name)} className="text-brand-accent/30 hover:text-brand-accent p-1" title={`Inject ${name} to Queue`}><Plus size={12} /></button>
                                  <button onClick={() => handleDeletePlaylist(name)} className="text-red-500/20 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                                </div>
                             </div>
                             <div className="flex flex-col gap-2">
                                {playlists[name].slice(0, 2).map((track, tidx) => (
                                   <div key={`${name}-${tidx}`} className="group/track glass-card p-2.5 flex items-center gap-3 hover:border-brand-accent/30 bg-white/[0.01] transition-all cursor-pointer border-white/5 relative">
                                      <div onClick={() => handleAdd(track)} className="flex-1 flex items-center gap-3 min-w-0">
                                         <img src={getProxyUrl(track.thumbnail)} className="w-8 h-8 rounded-md object-cover opacity-60 group-hover:opacity-100" alt="" />
                                         <div className="flex-1 min-w-0"><div className="text-[10px] font-bold truncate uppercase tracking-widest group-hover:text-brand-accent">{track.title}</div></div>
                                      </div>
                                      <button onClick={(e) => { e.stopPropagation(); handleRemoveFromPlaylist(name, tidx); }} className="opacity-0 group-hover/track:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg transition-all" title="Purge Node">
                                         <Trash2 size={10} className="text-red-500/40 hover:text-red-500" />
                                      </button>
                                   </div>
                                ))}
                                {playlists[name].length > 2 && ( <button onClick={() => setViewingPlaylist(name)} className="text-[8px] font-black text-white/20 uppercase tracking-widest text-center py-1 hover:text-brand-accent transition-colors">+ {playlists[name].length - 2} more tracks</button> )}
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
      </motion.main>

      {/* Global Toast Overlay */}
      <AnimatePresence>
        {lastAdded && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: -40 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-0 left-1/2 -translate-x-1/2 px-10 py-5 bg-brand-accent text-brand-dark font-black rounded-[2rem] shadow-neon-strong z-[200] flex items-center gap-6 whitespace-nowrap border-t-2 border-white/20">
            <Zap size={24} fill="currentColor" />
            <div className="flex flex-col leading-none">
               <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1 font-bold">Node Initialized</span>
               <span className="text-base tracking-tight truncate uppercase">{lastAdded}</span>
            </div>
           </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isLyricsExpanded && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[200] bg-brand-dark/95 backdrop-blur-[20px] bg-black/80 flex flex-col p-4 pt-10 md:p-8 overflow-hidden"
          >
            {/* Immersive Top Navigation Bar - Perfect Absolute Grid */}
            <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center z-[300] pr-2 md:pr-4 flex-none gap-2">
               {/* Left Spacer Column: Absorbs macOS traffic light area */}
               <div className="w-full h-full pl-16 md:pl-0" />
               
               {/* Center Immersive Pill: Natively true-centered by CSS Grid */}
               <div className="flex justify-center min-w-0">
                 <div className="flex items-center gap-2 md:gap-3 glass-card px-3 md:px-4 py-1.5 border-brand-accent/20 bg-brand-accent/5 backdrop-blur-md shadow-neon overflow-hidden shrink min-w-0 max-w-[200px] md:max-w-[300px]">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse shadow-[0_0_15px_rgba(0,255,191,0.5)] shrink-0" />
                   <span className="label-caps mb-0 text-brand-accent tracking-[0.2em] md:tracking-[0.4em] text-[8px] md:text-[9px] font-black truncate min-w-0">Immersive Output</span>
                 </div>
               </div>
               
               {/* Right Minimize Button: Forced inside bounds via flex-end */}
               <div className="w-full flex justify-end pr-2 sm:pr-4">
                 <button 
                   onClick={() => setIsLyricsExpanded(false)}
                   className="flex-none flex items-center justify-center !w-10 !h-10 md:!w-12 md:!h-12 glass-card hover:border-brand-accent transition-all border-white/20 group active:scale-90 shadow-neon-strong !rounded-full bg-black/40 aspect-square"
                   title="Return to Studio"
                   style={{ minWidth: "40px", maxWidth: "48px" }}
                 >
                   <Minimize2 size={18} className="text-brand-accent transition-transform group-hover:rotate-180" />
                 </button>
               </div>
            </div>

            <div className="w-full flex-1 flex flex-col px-0 md:px-8 mt-6 min-h-0 relative">
               <div className="flex-shrink-0 flex flex-col items-center mb-6 z-50">
                  <div className="w-full px-4 md:px-12 py-6 md:py-10 glass-card border-brand-accent/20 rounded-3xl md:rounded-[3rem] bg-brand-dark/60 shadow-neon-strong relative flex flex-col items-center overflow-hidden">
                    <div className="w-full flex items-center overflow-hidden relative" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
                       <div className="animate-marquee-loop flex gap-[10vw] items-center text-base sm:text-lg md:text-2xl lg:text-4xl font-black uppercase tracking-[0.3em] text-white w-max">
                         <span>{currentTrack?.title}</span>
                         <span>{currentTrack?.title}</span>
                         <span>{currentTrack?.title}</span>
                         <span>{currentTrack?.title}</span>
                       </div>
                    </div>
                    <p className="text-brand-accent font-black tracking-[0.5em] uppercase opacity-70 text-[10px] mt-6">{currentTrack?.author}</p>
                 </div>
               </div>

               <div className="flex-1 overflow-y-scroll flex flex-col px-4 md:px-10 custom-scrollbar-heavy w-full" ref={expandedContainerRef} onWheel={() => setIsAutoScrollPaused(true)} style={{ minHeight: "0px" }}>
                  <div className="flex flex-col gap-24 lg:gap-32 py-[45vh] items-center text-center w-full mx-auto cursor-default">
                    {lyrics.map((line, idx) => {
                      const isActive = idx === activeLyricIndex;
                      return (
                        <div 
                          key={idx} 
                          ref={isActive ? expandedActiveRef : null} 
                          className={`text-2xl sm:text-4xl lg:text-6xl px-4 font-black transition-all duration-700 transform leading-tight w-full max-w-none ${
                            isActive 
                              ? 'text-[#00ffbf] scale-125 opacity-100 drop-shadow-[0_0_40px_rgba(0,255,191,0.8)]' 
                              : 'text-white/20 opacity-40 blur-[2px] transition-all'
                          }`}
                        >
                          {line.text}
                        </div>
                      );
                    })}
                  </div>
               </div>

               {isAutoScrollPaused && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[250]">
                  <button 
                    onClick={() => setIsAutoScrollPaused(false)}
                    className="flex items-center gap-3 px-8 py-4 bg-brand-accent text-black font-black uppercase tracking-[0.3em] rounded-full shadow-neon scale-110 active:scale-95 transition-all"
                  >
                    <RotateCcw size={18} /> Re-Sync
                  </button>
                </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* PAC-MAN EASTER EGG (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN - COLLABRIX SYNC) */}
      <AnimatePresence>
        {isPacmanOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.3s_ease-out]"
            onClick={() => setIsPacmanOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="relative w-[90vw] h-[80vh] max-w-5xl bg-[#111] rounded-2xl border-2 border-yellow-400/50 shadow-[0_0_50px_rgba(250,204,21,0.3)] overflow-hidden animate-[slideInUp_0.4s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsPacmanOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-yellow-500 transition-colors z-50"
              >
                <X size={24} />
              </button>

              {/* Game Viewport */}
              <div className="absolute inset-0 flex items-center justify-center bg-[#000]">
                <iframe 
                  src="https://www.google.com/logos/2010/pacman10-i.html" 
                  className="w-full h-full border-none"
                  title="Neural Ghost V2"
                  allow="autoplay; fullscreen"
                />
              </div>

              {/* Legacy Header Info (Styled to match screenshot) */}
              <div className="absolute top-6 left-8 z-10 pointer-events-none">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-yellow-400/20 rounded-lg border border-yellow-400/40">
                       <Play size={16} className="text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="flex flex-col">
                       <h2 className="text-yellow-400 font-black text-xl tracking-[0.2em] uppercase leading-none">PAC-MAN</h2>
                       <span className="text-white/40 text-[8px] font-mono tracking-widest uppercase mt-1">GHOST_PROTOCOL // LEGACY_SYNC</span>
                        <span className="text-white/40 text-[8px] font-mono tracking-widest uppercase mt-1">GHOST_PROTOCOL // LEGACY_SYNC</span>
                     </div>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeMenuTrack && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-md" onClick={() => setActiveMenuTrack(null)} />
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md glass-card bg-[#0a0a0a] border-brand-accent/20 p-8 relative z-10">
                 <div className="flex items-center gap-4 mb-8">
                    {Array.isArray(activeMenuTrack) ? (
                        <div className="flex-1 min-w-0">
                           <h3 className="text-lg font-black uppercase tracking-tighter truncate text-brand-accent">Queue Buffer</h3>
                           <p className="text-brand-accent text-xs font-bold tracking-widest uppercase opacity-60">FLASH TO VAULT ({activeMenuTrack.length} NODES)</p>
                        </div>
                    ) : (
                        <>
                           <img src={getProxyUrl(activeMenuTrack.thumbnail)} className="w-16 h-16 rounded-2xl object-cover border border-white/10" alt="" />
                           <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-black uppercase tracking-tighter truncate">{activeMenuTrack.title}</h3>
                              <p className="text-brand-accent text-xs font-bold tracking-widest uppercase opacity-60">{activeMenuTrack.author}</p>
                           </div>
                        </>
                    )}
                 </div>
                 <div className="label-caps mb-4 text-[10px] text-white/30">Target Vault Node</div>
                 <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-brand-accent/5 border border-brand-accent/20 focus-within:border-brand-accent/50 focus-within:shadow-[0_0_15px_rgba(0,255,191,0.1)] transition-all">
                     <input 
                        className="bg-transparent border-none outline-none text-[12px] font-black text-brand-accent uppercase tracking-widest placeholder:text-brand-accent/30 w-full px-2 py-2" 
                        placeholder="Create New Vault..." 
                        value={newPlaylistName} 
                        onChange={(e) => setNewPlaylistName(e.target.value)} 
                        onKeyDown={(e) => { 
                            if (e.key === 'Enter' && newPlaylistName.trim()) { 
                                handleAddToPlaylist(newPlaylistName.trim(), activeMenuTrack); 
                                setNewPlaylistName('');
                                setActiveMenuTrack(null); 
                            } 
                        }} 
                     />
                     <button 
                        onClick={() => {
                            if (newPlaylistName.trim()) {
                                handleAddToPlaylist(newPlaylistName.trim(), activeMenuTrack);
                                setNewPlaylistName('');
                                setActiveMenuTrack(null);
                            }
                        }}
                        className="p-2 rounded-lg bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-black transition-all shadow-neon"
                     >
                        <Plus size={16} />
                     </button>
                  </div>
                  <div className="h-[1px] bg-brand-accent/10 my-3" />
                  <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.keys(playlists).map(name => (
                       <button key={name} onClick={() => handleAddToPlaylist(name, activeMenuTrack)} className="flex items-center justify-between p-4 rounded-xl bg-brand-accent/5 hover:bg-brand-accent/20 border border-brand-accent/20 group transition-all">
                          <div className="flex items-center gap-3">
                             <ListMusic size={14} className="text-brand-accent" />
                             <span className="text-sm font-bold uppercase tracking-widest">Vault: {name}</span>
                          </div>
                          <ChevronRight size={14} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                       </button>
                    ))}
                 </div>
                 <button onClick={() => setActiveMenuTrack(null)} className="w-full mt-6 p-4 text-[10px] uppercase tracking-[0.4em] text-white/20 hover:text-white/40 transition-colors">
                    Abort Interface
                 </button>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      
      {/* VOLUME HUD - V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN */}
      <AnimatePresence>
        {volumeToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] bg-brand-dark/95 backdrop-blur-xl border border-brand-accent/30 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(0,255,191,0.2)]"
          >
            <div className="text-brand-accent font-black text-[10px] tracking-widest uppercase">Volume</div>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-brand-accent shadow-[0_0_10px_#00ffbf]" style={{ width: `${volume * 100}%` }} />
            </div>
            <div className="text-white font-mono text-[10px] w-8">{`${Math.round(volume * 100)}%`}</div>
          </motion.div>
        )}
      </AnimatePresence>
    
      {/* GLOBAL BACKGROUND ELEMENTS (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN */}
      <div className="fixed inset-0 pointer-events-none z-[-2] overflow-hidden select-none bg-black">
         {/* Baseline Neural Glow (Optimized) */}
         <div className="absolute inset-0 bg-brand-accent/5 backdrop-blur-[60px] animate-pulse" />
         
         {/* Global Neural Aura (Pulse) - V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN Optimized */}
         <div className="absolute inset-0 flex items-center justify-center scale-150 transform-gpu will-change-transform">
            <canvas 
               ref={pulseCanvasRef} 
               width={400} 
               height={400} 
               className={`w-[800px] h-[800px] transition-opacity duration-1000 ${visualizerMode === 'pulse' ? 'opacity-40' : 'opacity-0'}`} 
            />
         </div>
         <div className="absolute inset-0 bg-black/60" />
            </div>
    </div>
  );
}

export default App;