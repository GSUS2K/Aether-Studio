import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, Component } from 'react';
import { Play, Pause, SkipForward, Search, Plus, Loader2, ListMusic, Music, Globe, User, UserPlus, BookOpen, Trash2, Rewind, FastForward, ExternalLink, ChevronLeft, ChevronRight, Zap, X, Cpu, HardDrive, Activity, Radio, Signal, Wifi, Clock, Maximize2, Minimize2, RotateCcw, AlertTriangle, RefreshCw, Monitor, Target, AppWindow, Volume2, Shuffle, Timer, Download, Upload, Save, Lock, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { setupDiscordSdk } from './discord';
import axios from 'axios';
import { BUILD_VERSION } from './buildVersion';
import './App.css';

const getApiBase = () => {
  const isElectronStandalone = typeof window !== 'undefined' && !!window.aether;
  if (isElectronStandalone) {
    return 'http://localhost:3333';
  }

  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBase) return configuredBase.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    if (!/^https?:\/\/localhost(?::\d+)?$/i.test(origin) && !/^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)) {
      return origin;
    }
  }

  return 'http://localhost:3333';
};
const API_BASE = getApiBase();
const DEFAULT_GUILD_ID = 'local_studio';
const UX_VERSION = 'AURA-R3.8';
const LYRIC_PRESETS_STORAGE_KEY = 'aether.lyricOffsetPresets.v1';
const SESSION_UI_STORAGE_KEY = 'aether.sessionUi.v1';
const SESSION_PLAYBACK_STORAGE_KEY = 'aether.sessionPlayback.v1';
const SKIP_EVENTS_STORAGE_KEY = 'aether.skipEvents.v1';
const LOCK_PREFS_STORAGE_KEY = 'aether.lockPrefs.v1';

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

const parseLyricOffsetValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const direct = Number(raw);
  if (Number.isFinite(direct)) return Math.trunc(direct);
  const match = raw.match(/-?\d+/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const formatBytes = (bytes) => {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const scaled = value / (1024 ** power);
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[power]}`;
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const alphaHex = (a) => Math.round(clamp01(a) * 255).toString(16).padStart(2, '0');
const AETHER_SHARE_ORIGIN = 'https://aetherstudio.me';
const encodeScenePayload = (payload) => {
  try {
    const json = JSON.stringify(payload);
    const bytes = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
    return btoa(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return null;
  }
};
const decodeScenePayload = (encoded) => {
  try {
    const normalized = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    const raw = atob(normalized + pad);
    const json = decodeURIComponent(Array.from(raw).map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};
const extractSceneYouTubeId = (value) => {
  const text = String(value || '');
  const match = text.match(/(?:v=|\/vi\/|\/v\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || null;
};
const normalizeScenePayload = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const youtubeId = String(raw.youtubeId || raw.y || extractSceneYouTubeId(raw.thumbnail || raw.th || raw.source || ''));
  const thumbnail = String(raw.thumbnail || raw.th || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : ''));
  return {
    title: String(raw.title || raw.t || 'Aether Scene').slice(0, 140),
    author: String(raw.author || raw.a || 'Unknown Artist').slice(0, 100),
    lyric: String(raw.lyric || raw.l || 'No lyric locked yet').slice(0, 180),
    thumbnail,
    youtubeId,
    at: Math.max(0, Number(raw.at || raw.time || 0)),
    total: Math.max(0, Number(raw.total || raw.to || 0)),
    state: String(raw.state || (raw.s === 1 ? 'playing' : 'paused')),
    mode: String(raw.mode || (raw.m === 1 ? 'pulse' : 'bars')),
    pulse: {
      e: Math.max(0, Number(raw?.pulse?.e ?? raw?.p?.[0] ?? 0)),
      b: Math.max(0, Number(raw?.pulse?.b ?? raw?.p?.[1] ?? 0)),
      m: Math.max(0, Number(raw?.pulse?.m ?? raw?.p?.[2] ?? 0)),
      h: Math.max(0, Number(raw?.pulse?.h ?? raw?.p?.[3] ?? 0)),
    },
    theme: String(raw.theme || raw.c || '#00ffbf'),
  };
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
  const [lyricOffsetPresets, setLyricOffsetPresets] = useState({});
  const [isLyricPresetSaved, setIsLyricPresetSaved] = useState(false);
  const [sessionRestoreNotice, setSessionRestoreNotice] = useState('');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState({
    lastQueueFetchMs: null,
    lastQueueFetchAt: null,
    lastQueueError: null,
    lastSystemFetchMs: null,
    lastSystemFetchAt: null,
    lastSystemError: null,
    lastSongFetchMs: null,
    lastSongFetchAt: null,
    lastSongSource: '-',
    lastLyricsSource: '-',
    lastLyricsFetchMs: null,
    lastLyricsFetchAt: null,
    lastLyricsError: null,
  });
  const [lastAdded, setLastAdded] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [uptime, setUptime] = useState("00:00:00");
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [typedBuffer, setTypedBuffer] = useState("");
  const [isMixtapeVaultOpen, setIsMixtapeVaultOpen] = useState(false);
  const [sharedScene, setSharedScene] = useState(null);
  const [isSharedSceneOpen, setIsSharedSceneOpen] = useState(false);
  const [vaultPulse, setVaultPulse] = useState({ bass: 0, mids: 0, highs: 0, energy: 0, spin: 0, stamp: 'AETHER-PULSE' });
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
  const [isSpotifyImportOpen, setIsSpotifyImportOpen] = useState(false);
  const [spotifyImportUrl, setSpotifyImportUrl] = useState('');
  const [spotifyImportProgress, setSpotifyImportProgress] = useState({ stage: 'idle', progress: 0, message: '' });
  const [isSpotifyImporting, setIsSpotifyImporting] = useState(false);
  const [spotifyImportLogs, setSpotifyImportLogs] = useState([]);
  const [isVaultCleaning, setIsVaultCleaning] = useState(false);
  const [skipReasonToast, setSkipReasonToast] = useState('');
  const [skipEvents, setSkipEvents] = useState([]);
  const [lockStatus, setLockStatus] = useState({ enabled: false, touchIdAvailable: false, touchIdEnabled: false });
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [lockPasswordConfirm, setLockPasswordConfirm] = useState('');
  const [lockDisablePassword, setLockDisablePassword] = useState('');
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [lockUseTouchId, setLockUseTouchId] = useState(false);
  const [lockIdleMinutes, setLockIdleMinutes] = useState(5);
  const [isWindowActive, setIsWindowActive] = useState(() => !document.hidden);
  const [lockError, setLockError] = useState('');
  const [isLockBusy, setIsLockBusy] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const [storagePolicy, setStoragePolicy] = useState({ cacheCapMb: 2048, maxCacheAgeDays: 30 });
  const [storageEstimate, setStorageEstimate] = useState({ cap: null, age: null, downloadsOnly: null });
  const [isStorageBusy, setIsStorageBusy] = useState(false);
  
  const fileInputRef = useRef(null);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [isVerticalStack, setIsVerticalStack] = useState(false);
  const [isFocusedMode, setIsFocusedMode] = useState(false);
  const expandedContainerRef = useRef(null);
  const expandedActiveRef = useRef(null);
  const idleStartTimeRef = useRef(null);
  const idlePhraseRef = useRef(null);
  const lastRPCTrackIdRef = useRef(null);
  const sessionReadyRef = useRef(false);
  const pendingResumeTimeRef = useRef(null);


  // Audio Analysis Refs (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const auraEnergyRef = useRef({ bass: 0, mids: 0, highs: 0, phase: 0 });
  const uiPulseRef = useRef(1);
  const mixtapeVaultRef = useRef(null);
  const vaultTelemetryRef = useRef({ lastStateAt: 0 });
  const prevTrackRef = useRef(null); // Neural Memory Ref (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
  const standaloneTrackLoadKeyRef = useRef('');
  const bufferingRescueRef = useRef({ trackKey: '', lastAttemptAt: 0 });
  const skipReasonTimeoutRef = useRef(null);
  const autoBiometricAttemptRef = useRef(false);
  const lastWindowModeChangeRef = useRef(0);
  const prematureEndGuardRef = useRef({ trackId: null, retried: false });
  const isStandalone = !!window.aether;
  const [history, setHistory] = useState([]); // Neural Deep Memory (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN
  const [isManualStop, setIsManualStop] = useState(false);
  const [streamPort, setStreamPort] = useState(3333);
  // --- AETHER STUDIO CORE: NEURAL ENGINE STATE (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
  const currentTrack = queue?.[0];
  const appendSpotifyImportLog = useCallback((line) => {
    const stamp = new Date().toLocaleTimeString();
    const msg = `[${stamp}] ${line}`;
    console.log('[Aether/SpotifyImport]', msg);
    setSpotifyImportLogs(prev => [...prev.slice(-19), msg]);
  }, []);

  const noteSkipReason = useCallback((reason, meta = {}) => {
    console.log('[Aether/SkipReason]', reason, meta);
    setSkipReasonToast(reason);
    const event = {
      at: Date.now(),
      reason,
      source: meta?.source || 'unknown',
      title: meta?.title || currentTrack?.title || 'Unknown',
      trackId: meta?.trackId || currentTrack?.id || null,
    };
    setSkipEvents(prev => [...prev.slice(-29), event]);
    if (skipReasonTimeoutRef.current) clearTimeout(skipReasonTimeoutRef.current);
    skipReasonTimeoutRef.current = setTimeout(() => setSkipReasonToast(''), 2200);
  }, [currentTrack?.id, currentTrack?.title]);

  const copyVaultSceneEmbed = useCallback(async () => {
    const totalDurationMs = currentTrack?.totalDurationMs || currentTrack?.duration || 0;
    const currentMs = Math.max(0, Math.floor(currentTime || 0));
    const lyricLine = (() => {
      if (!Array.isArray(lyrics) || lyrics.length === 0) return 'No lyric locked yet';
      const line = [...lyrics].reverse().find((l) => l.time <= currentMs);
      return line?.text || 'No lyric locked yet';
    })();
    const sceneYouTubeId = currentTrack?.youtubeId || extractSceneYouTubeId(currentTrack?.actualUrl || currentTrack?.url || currentTrack?.thumbnail || '');
    const payload = {
      v: 1,
      t: String(currentTrack?.title || 'Aether Secret Session').slice(0, 120),
      a: String(currentTrack?.author || 'Unknown Artist').slice(0, 72),
      l: String(lyricLine || 'No lyric locked yet').slice(0, 140),
      y: sceneYouTubeId || '',
      th: sceneYouTubeId ? '' : String(currentTrack?.thumbnail || '').slice(0, 220),
      at: currentMs,
      to: totalDurationMs,
      s: isPlaying ? 1 : 0,
      m: visualizerMode === 'pulse' ? 1 : 0,
      p: [
        Math.round(clamp01(vaultPulse.energy) * 100),
        Math.round(clamp01(vaultPulse.bass) * 100),
        Math.round(clamp01(vaultPulse.mids) * 100),
        Math.round(clamp01(vaultPulse.highs) * 100),
      ],
      c: themeColor,
    };
    const encoded = encodeScenePayload(payload);
    if (!encoded) {
      setLastAdded('Scene link unavailable');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const sceneUrl = `${AETHER_SHARE_ORIGIN}/?scene=${encoded}`;
    setSharedScene(normalizeScenePayload(payload));
    setIsSharedSceneOpen(true);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sceneUrl);
      } else {
        const fallback = document.createElement('textarea');
        fallback.value = sceneUrl;
        fallback.style.position = 'fixed';
        fallback.style.left = '-9999px';
        document.body.appendChild(fallback);
        fallback.select();
        document.execCommand('copy');
        fallback.remove();
      }
      setLastAdded('Scene link copied');
      setTimeout(() => setLastAdded(null), 2200);
    } catch (err) {
      console.warn('[Aether/Vault] Failed to copy scene embed', err);
      setLastAdded('Scene link unavailable');
      setTimeout(() => setLastAdded(null), 2200);
    }
  }, [currentTime, currentTrack?.actualUrl, currentTrack?.author, currentTrack?.duration, currentTrack?.thumbnail, currentTrack?.title, currentTrack?.youtubeId, isPlaying, lyrics, themeColor, visualizerMode, vaultPulse.bass, vaultPulse.energy, vaultPulse.highs, vaultPulse.mids]);

  const refreshLockStatus = useCallback(async () => {
    if (!isStandalone || !window.aether?.getLockStatus) return;
    try {
      const status = await window.aether.getLockStatus();
      const normalized = {
        enabled: !!status?.enabled,
        touchIdAvailable: !!status?.touchIdAvailable,
        touchIdEnabled: !!status?.touchIdEnabled,
      };
      setLockStatus(normalized);
      setLockUseTouchId(normalized.touchIdEnabled);
      setIsAppLocked(normalized.enabled);
    } catch (e) {
      console.warn('[Aether/Lock] Failed to load lock status', e);
    }
  }, [isStandalone]);

  const handleUnlockWithPassword = useCallback(async () => {
    if (!window.aether?.verifyAppLockPassword || !unlockPasswordInput) return;
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.verifyAppLockPassword(unlockPasswordInput);
      if (res?.success) {
        setIsAppLocked(false);
        setUnlockPasswordInput('');
      } else {
        setLockError(res?.error || 'Unlock failed.');
      }
    } finally {
      setIsLockBusy(false);
    }
  }, [unlockPasswordInput]);

  const handleUnlockWithBiometric = useCallback(async () => {
    if (!window.aether?.verifyAppLockBiometric) return;
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.verifyAppLockBiometric();
      if (res?.success) {
        setIsAppLocked(false);
      } else {
        setLockError(res?.error || 'Biometric unlock failed.');
      }
    } finally {
      setIsLockBusy(false);
    }
  }, []);

  const handleEnableLock = useCallback(async () => {
    if (!window.aether?.setAppLock) return;
    if (!lockPasswordInput || lockPasswordInput.length < 4) {
      setLockError('Password must be at least 4 characters.');
      return;
    }
    if (lockPasswordInput !== lockPasswordConfirm) {
      setLockError('Passwords do not match.');
      return;
    }
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.setAppLock(lockPasswordInput, !!lockUseTouchId);
      if (!res?.success) {
        setLockError(res?.error || 'Failed to enable lock.');
        return;
      }
      setLockPasswordInput('');
      setLockPasswordConfirm('');
      await refreshLockStatus();
      setIsLockModalOpen(false);
      setLastAdded('App lock enabled');
      setTimeout(() => setLastAdded(null), 2000);
    } finally {
      setIsLockBusy(false);
    }
  }, [lockPasswordConfirm, lockPasswordInput, lockUseTouchId, refreshLockStatus]);

  const handleDisableLock = useCallback(async () => {
    if (!window.aether?.disableAppLock || !lockDisablePassword) {
      setLockError('Enter password to disable lock.');
      return;
    }
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.disableAppLock(lockDisablePassword);
      if (!res?.success) {
        setLockError(res?.error || 'Failed to disable lock.');
        return;
      }
      setLockDisablePassword('');
      await refreshLockStatus();
      setIsAppLocked(false);
      setIsLockModalOpen(false);
      setLastAdded('App lock disabled');
      setTimeout(() => setLastAdded(null), 2000);
    } finally {
      setIsLockBusy(false);
    }
  }, [lockDisablePassword, refreshLockStatus]);

  const handleToggleTouchIdLock = useCallback(async (enabled) => {
    setLockUseTouchId(enabled);
    if (!lockStatus.enabled || !window.aether?.setAppLockTouchId) return;
    const res = await window.aether.setAppLockTouchId(enabled);
    if (res?.success) {
      await refreshLockStatus();
    }
  }, [lockStatus.enabled, refreshLockStatus]);

  useEffect(() => {
    return () => {
      if (skipReasonTimeoutRef.current) clearTimeout(skipReasonTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    refreshLockStatus();
  }, [refreshLockStatus]);

  useEffect(() => {
    const updateActive = () => {
      setIsWindowActive(!document.hidden && document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', updateActive);
    window.addEventListener('focus', updateActive);
    window.addEventListener('blur', updateActive);
    updateActive();
    return () => {
      document.removeEventListener('visibilitychange', updateActive);
      window.removeEventListener('focus', updateActive);
      window.removeEventListener('blur', updateActive);
    };
  }, []);

  useEffect(() => {
    const loadDebugAndLockPrefs = async () => {
      try {
        let savedSkipEvents = null;
        let savedLockPrefs = null;
        if (isStandalone && window.aether?.store?.get) {
          savedSkipEvents = await window.aether.store.get(SKIP_EVENTS_STORAGE_KEY);
          savedLockPrefs = await window.aether.store.get(LOCK_PREFS_STORAGE_KEY);
        } else {
          const rawSkips = localStorage.getItem(SKIP_EVENTS_STORAGE_KEY);
          const rawLockPrefs = localStorage.getItem(LOCK_PREFS_STORAGE_KEY);
          savedSkipEvents = rawSkips ? JSON.parse(rawSkips) : null;
          savedLockPrefs = rawLockPrefs ? JSON.parse(rawLockPrefs) : null;
        }

        if (Array.isArray(savedSkipEvents)) {
          setSkipEvents(savedSkipEvents.slice(-30));
        }
        if (savedLockPrefs && typeof savedLockPrefs === 'object') {
          if (typeof savedLockPrefs.idleMinutes === 'number' && isFinite(savedLockPrefs.idleMinutes)) {
            setLockIdleMinutes(Math.max(1, Math.min(120, savedLockPrefs.idleMinutes)));
          }
        }
      } catch (e) {
        console.warn('[Aether/Prefs] Failed to load skip/lock prefs', e);
      }
    };

    loadDebugAndLockPrefs();
  }, [isStandalone]);

  useEffect(() => {
    try {
      if (isStandalone && window.aether?.store?.set) {
        window.aether.store.set(SKIP_EVENTS_STORAGE_KEY, skipEvents.slice(-30));
      } else {
        localStorage.setItem(SKIP_EVENTS_STORAGE_KEY, JSON.stringify(skipEvents.slice(-30)));
      }
    } catch (e) {
      console.warn('[Aether/Prefs] Failed to persist skip events', e);
    }
  }, [isStandalone, skipEvents]);

  useEffect(() => {
    const payload = { idleMinutes: lockIdleMinutes, savedAt: Date.now() };
    try {
      if (isStandalone && window.aether?.store?.set) {
        window.aether.store.set(LOCK_PREFS_STORAGE_KEY, payload);
      } else {
        localStorage.setItem(LOCK_PREFS_STORAGE_KEY, JSON.stringify(payload));
      }
    } catch (e) {
      console.warn('[Aether/Prefs] Failed to persist lock prefs', e);
    }
  }, [isStandalone, lockIdleMinutes]);

  useEffect(() => {
    if (!lockStatus.enabled) return;

    const lockNow = () => {
      if (!isAppLocked) setIsAppLocked(true);
    };

    const onVisibility = () => {
      if (document.hidden) {
        const elapsed = Date.now() - (lastWindowModeChangeRef.current || 0);
        if (elapsed >= 0 && elapsed < 3000) {
          console.log('[Aether/Lock] Skipping hidden lock during window mode transition', { elapsed });
          return;
        }
        lockNow();
      }
    };

    let idleTimer = null;
    const idleMs = Math.max(1, lockIdleMinutes || 1) * 60 * 1000;
    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (isAppLocked) return;
      idleTimer = setTimeout(() => {
        console.log('[Aether/Lock] Idle timeout lock triggered');
        lockNow();
      }, idleMs);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    document.addEventListener('visibilitychange', onVisibility);
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetIdle, { passive: true }));
    resetIdle();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetIdle));
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [isAppLocked, lockIdleMinutes, lockStatus.enabled]);

  useEffect(() => {
    if (!isStandalone) return;
    if (!isAppLocked || !lockStatus.touchIdAvailable || !lockStatus.touchIdEnabled || !isWindowActive) {
      autoBiometricAttemptRef.current = false;
      return;
    }
    if (autoBiometricAttemptRef.current) return;
    autoBiometricAttemptRef.current = true;
    handleUnlockWithBiometric();
  }, [handleUnlockWithBiometric, isAppLocked, isStandalone, lockStatus.touchIdAvailable, lockStatus.touchIdEnabled, isWindowActive]);

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

  const getEffectiveGuildId = useCallback(() => {
    const guildId = auth?.guild_id || new URLSearchParams(window.location.search).get('guild_id');
    return guildId && guildId !== '0' ? guildId : DEFAULT_GUILD_ID;
  }, [auth]);

  const getTrackPresetKey = useCallback((track) => {
    if (!track) return '';
    if (track.youtubeId) return `yt:${track.youtubeId}`;
    if (track.id) return `id:${track.id}`;
    return `meta:${String(track.title || '').toLowerCase()}|${String(track.author || '').toLowerCase()}`;
  }, []);

  const currentTrackPresetKey = useMemo(() => getTrackPresetKey(currentTrack), [
    getTrackPresetKey,
    currentTrack?.id,
    currentTrack?.youtubeId,
    currentTrack?.title,
    currentTrack?.author,
  ]);

  const persistLyricPresets = useCallback(async (nextPresets) => {
    try {
      if (isStandalone && window.aether?.store?.set) {
        await window.aether.store.set('lyricOffsetPresets', nextPresets);
      } else {
        localStorage.setItem(LYRIC_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
      }
    } catch (e) {
      console.warn('[Aether/Lyrics] Failed to persist lyric presets', e);
    }
  }, [isStandalone]);

  const handleSaveLyricPreset = useCallback(async () => {
    if (!currentTrackPresetKey) return;
    const next = {
      ...lyricOffsetPresets,
      [currentTrackPresetKey]: parseLyricOffsetValue(lyricOffsetMs),
    };
    setLyricOffsetPresets(next);
    setIsLyricPresetSaved(true);
    await persistLyricPresets(next);
  }, [currentTrackPresetKey, lyricOffsetPresets, lyricOffsetMs, persistLyricPresets]);

  const handleResetLyricPreset = useCallback(async () => {
    if (!currentTrackPresetKey) {
      setLyricOffsetMs(0);
      setIsLyricPresetSaved(false);
      return;
    }
    const next = { ...lyricOffsetPresets };
    delete next[currentTrackPresetKey];
    setLyricOffsetPresets(next);
    setLyricOffsetMs(0);
    setIsLyricPresetSaved(false);
    await persistLyricPresets(next);
  }, [currentTrackPresetKey, lyricOffsetPresets, persistLyricPresets]);

  const normalizeTrackIdentity = useCallback((track) => {
    if (!track) return '';
    if (track.youtubeId) return `yt:${track.youtubeId}`;
    if (track.id) return `id:${track.id}`;
    const title = String(track.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const author = String(track.author || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return `meta:${title}|${author}`;
  }, []);

  const hasTrackInList = useCallback((list, target) => {
    const key = normalizeTrackIdentity(target);
    return (list || []).some(item => normalizeTrackIdentity(item) === key);
  }, [normalizeTrackIdentity]);

  const isPlaceholderMetadataTitle = (value) => {
    const title = String(value || '').trim().toLowerCase();
    if (!title) return true;
    return (
      title === 'videoplayback' ||
      title === 'unknown' ||
      title === 'unknown title' ||
      title === 'audio' ||
      title.startsWith('googlevideo') ||
      /^https?:\/\//.test(title)
    );
  };

  const isPlaceholderMetadataAuthor = (value) => {
    const author = String(value || '').trim().toLowerCase();
    if (!author) return true;
    return author === 'unknown' || author === 'unknown artist' || author === 'youtube';
  };

  const mergeTrackMetadata = (baseTrack, meta) => {
    if (!baseTrack || !meta || typeof meta !== 'object') return baseTrack;
    const merged = { ...baseTrack, ...meta };

    const incomingTitle = String(meta.title || '').trim();
    const incomingAuthor = String(meta.author || '').trim();
    const keepBaseTitle = isPlaceholderMetadataTitle(incomingTitle);
    const keepBaseAuthor = isPlaceholderMetadataAuthor(incomingAuthor);

    merged.title = keepBaseTitle
      ? String(baseTrack.title || '').trim()
      : incomingTitle;
    merged.author = keepBaseAuthor
      ? String(baseTrack.author || '').trim()
      : incomingAuthor;
    merged.thumbnail = meta.thumbnail || baseTrack.thumbnail || '';
    merged.id = baseTrack.id;
    merged.youtubeId = baseTrack.youtubeId || meta.youtubeId;
    merged.actualUrl = meta.actualUrl || meta.url || baseTrack.actualUrl || baseTrack.url;
    merged.url = meta.url || meta.actualUrl || baseTrack.url || baseTrack.actualUrl;

    const incomingDuration = Number(meta.totalDurationMs || meta.duration || 0);
    if (Number.isFinite(incomingDuration) && incomingDuration > 0) {
      merged.totalDurationMs = Math.trunc(incomingDuration);
      merged.duration = Math.trunc(incomingDuration);
    }

    return merged;
  };

  const formatDiagTime = useCallback((ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString();
    } catch {
      return '—';
    }
  }, []);

  useEffect(() => {
     if (isStandalone && window.aether?.getLocalIp) {
         window.aether.getLocalIp().then(setLocalIp);
     }
  }, [isStandalone]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get('scene');
      const fromHash = (url.hash || '').startsWith('#scene=') ? url.hash.slice(7) : null;
      const encoded = fromQuery || fromHash;
      if (!encoded) return;
      const decoded = decodeScenePayload(encoded);
      if (!decoded) return;
      const normalized = normalizeScenePayload(decoded);
      if (!normalized) return;
      setSharedScene(normalized);
      setIsSharedSceneOpen(true);
    } catch (e) {
      console.warn('[Aether/Share] Scene parse failed', e);
    }
  }, []);

  useEffect(() => {
    const loadLyricPresets = async () => {
      try {
        let loaded = {};
        if (isStandalone && window.aether?.store?.get) {
          loaded = await window.aether.store.get('lyricOffsetPresets');
        } else {
          const raw = localStorage.getItem(LYRIC_PRESETS_STORAGE_KEY);
          loaded = raw ? JSON.parse(raw) : {};
        }
        if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
          setLyricOffsetPresets(loaded);
        }
      } catch (e) {
        console.warn('[Aether/Lyrics] Failed to load lyric presets', e);
      }
    };
    loadLyricPresets();
  }, [isStandalone]);

  useEffect(() => {
    if (!currentTrackPresetKey) return;
    const hasPreset = Object.prototype.hasOwnProperty.call(lyricOffsetPresets, currentTrackPresetKey);
    const presetValue = hasPreset ? parseLyricOffsetValue(lyricOffsetPresets[currentTrackPresetKey]) : 0;
    setLyricOffsetMs(presetValue);
    setIsLyricPresetSaved(hasPreset);
  }, [currentTrackPresetKey, lyricOffsetPresets]);

  useEffect(() => {
    if (isStandalone || !currentTrack?.title) return;
    const streamStart = performance.now();

    const trackUrl = currentTrack.actualUrl || currentTrack.url;
    if (!trackUrl) {
      console.warn("[Aether/Audio] Web playback skipped: no track URL", {
        title: currentTrack.title,
        author: currentTrack.author,
        id: currentTrack.id,
      });
      return;
    }

    if (!localAudioRef.current) {
      localAudioRef.current = new Audio();
      localAudioRef.current.crossOrigin = "anonymous";
    }

    const audio = localAudioRef.current;
    const streamUrl = `${API_BASE}/stream?url=${encodeURIComponent(trackUrl)}`;

    console.log("[Aether/Audio] Web stream init", {
      title: currentTrack.title,
      author: currentTrack.author,
      trackUrl,
      streamUrl,
      isPlaying,
      volume,
      readyState: audio.readyState,
      networkState: audio.networkState,
    });

    audio.volume = volume;
    audio.onloadedmetadata = () => {
      console.log("[Aether/Audio] Web loadedmetadata", {
        currentTime: audio.currentTime,
        duration: audio.duration,
        readyState: audio.readyState,
      });
    };
    audio.oncanplay = () => {
      console.log("[Aether/Audio] Web canplay", { readyState: audio.readyState });
    };
    audio.onplaying = () => {
      console.log("[Aether/Audio] Web playing", { currentTime: audio.currentTime });
      setIsAudioBuffering(false);
      setDiagnostics(prev => ({
        ...prev,
        lastSongFetchMs: Math.round(performance.now() - streamStart),
        lastSongFetchAt: Date.now(),
        lastSongSource: 'web-stream',
      }));
    };
    audio.ontimeupdate = () => {
      setCurrentTime(Math.floor(audio.currentTime * 1000));
    };
    audio.onwaiting = () => {
      console.log("[Aether/Audio] Web waiting", { currentTime: audio.currentTime, readyState: audio.readyState });
      setIsAudioBuffering(true);
    };
    audio.onstalled = () => {
      console.log("[Aether/Audio] Web stalled", { currentTime: audio.currentTime, readyState: audio.readyState });
      setIsAudioBuffering(true);
    };
    audio.onended = () => {
      console.log("[Aether/Audio] Web ended", { title: currentTrack.title });
      axios.post(`${API_BASE}/api/control/${DEFAULT_GUILD_ID}`, { action: 'skip' })
        .then(() => fetchQueue())
        .catch((err) => console.error("[Aether/Audio] Web skip failed", err));
    };
    audio.onerror = (e) => {
      console.error("[Aether/Audio] Web error", e, {
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState,
        currentTime: audio.currentTime,
        paused: audio.paused,
      });
      setIsAudioBuffering(true);
    };

    if (audio.src !== streamUrl) {
      audio.src = streamUrl;
    }

    if (isPlaying) {
      console.log("[Aether/Audio] Web play() attempt", {
        src: audio.src,
        paused: audio.paused,
        readyState: audio.readyState,
        networkState: audio.networkState,
      });
      audio.play().catch(err => {
        console.error("[Aether/Audio] Web play() failed", err, {
          src: audio.src,
          paused: audio.paused,
          readyState: audio.readyState,
          networkState: audio.networkState,
        });
      });
    } else {
      console.log("[Aether/Audio] Web paused by state", { title: currentTrack.title });
      audio.pause();
    }
  }, [isStandalone, currentTrack?.title, currentTrack?.actualUrl, currentTrack?.url, currentTrack?.id, isPlaying, volume, API_BASE]);

  useEffect(() => {
    if (!sessionReadyRef.current) return;
    const uiPrefs = {
      visualizerMode,
      isVerticalStack,
      isFocusedMode,
      isAutoplayEnabled,
      savedAt: Date.now(),
    };

    try {
      if (isStandalone && window.aether?.store?.set) {
        window.aether.store.set(SESSION_UI_STORAGE_KEY, uiPrefs);
      } else {
        localStorage.setItem(SESSION_UI_STORAGE_KEY, JSON.stringify(uiPrefs));
      }
    } catch (e) {
      console.warn('[Aether/Session] Failed to persist UI prefs', e);
    }
  }, [isStandalone, visualizerMode, isVerticalStack, isFocusedMode, isAutoplayEnabled]);

  useEffect(() => {
    if (!isStandalone || !sessionReadyRef.current) return;

    const playback = {
      queue: Array.isArray(queue) ? queue.slice(0, 120) : [],
      isPlaying: !!isPlaying,
      currentTime: Math.max(0, Math.floor(currentTime || 0)),
      savedAt: Date.now(),
    };

    try {
      window.aether?.store?.set?.(SESSION_PLAYBACK_STORAGE_KEY, playback);
    } catch (e) {
      console.warn('[Aether/Session] Failed to persist playback', e);
    }
  }, [isStandalone, queue, isPlaying, Math.floor((currentTime || 0) / 1000)]);

  useEffect(() => {
    let pollInterval;
    
    if (isStandalone) {
      setAuth({ guild_id: 'LOCAL', user: { id: 'Standalone', username: 'DESKTOP_USER' } });
      setLoading(false);
      setVoiceChannel('Local Speakers');

      // Load persisted state asynchronously
      const loadPersisted = async () => {
        const savedUiPrefs = await window.aether?.store?.get(SESSION_UI_STORAGE_KEY);
        if (savedUiPrefs && typeof savedUiPrefs === 'object') {
          if (typeof savedUiPrefs.visualizerMode === 'string') setVisualizerMode(savedUiPrefs.visualizerMode);
          if (typeof savedUiPrefs.isVerticalStack === 'boolean') setIsVerticalStack(savedUiPrefs.isVerticalStack);
          if (typeof savedUiPrefs.isFocusedMode === 'boolean') setIsFocusedMode(savedUiPrefs.isFocusedMode);
          if (typeof savedUiPrefs.isAutoplayEnabled === 'boolean') setIsAutoplayEnabled(savedUiPrefs.isAutoplayEnabled);
        }

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

        const savedPlayback = await window.aether?.store?.get(SESSION_PLAYBACK_STORAGE_KEY);
        if (savedPlayback && typeof savedPlayback === 'object') {
          let restoredQueueCount = 0;
          if (Array.isArray(savedPlayback.queue) && savedPlayback.queue.length > 0) {
            setQueue(savedPlayback.queue);
            restoredQueueCount = savedPlayback.queue.length;
          }
          if (typeof savedPlayback.isPlaying === 'boolean') {
            setIsPlaying(savedPlayback.isPlaying);
          }
          if (typeof savedPlayback.currentTime === 'number' && savedPlayback.currentTime > 0) {
            const restoredMs = Math.max(0, Math.floor(savedPlayback.currentTime));
            setCurrentTime(restoredMs);
            pendingResumeTimeRef.current = restoredMs;
          }

          if (restoredQueueCount > 0) {
            setSessionRestoreNotice(`Restored session • ${restoredQueueCount} track${restoredQueueCount > 1 ? 's' : ''}`);
            setTimeout(() => setSessionRestoreNotice(''), 3500);
          }
        }

        sessionReadyRef.current = true;
      };
      loadPersisted();
    } else {
      try {
        const rawUiPrefs = localStorage.getItem(SESSION_UI_STORAGE_KEY);
        const savedUiPrefs = rawUiPrefs ? JSON.parse(rawUiPrefs) : null;
        if (savedUiPrefs && typeof savedUiPrefs === 'object') {
          if (typeof savedUiPrefs.visualizerMode === 'string') setVisualizerMode(savedUiPrefs.visualizerMode);
          if (typeof savedUiPrefs.isVerticalStack === 'boolean') setIsVerticalStack(savedUiPrefs.isVerticalStack);
          if (typeof savedUiPrefs.isFocusedMode === 'boolean') setIsFocusedMode(savedUiPrefs.isFocusedMode);
          if (typeof savedUiPrefs.isAutoplayEnabled === 'boolean') setIsAutoplayEnabled(savedUiPrefs.isAutoplayEnabled);
        }
      } catch (e) {
        console.warn('[Aether/Session] Failed to load web UI prefs', e);
      }
      sessionReadyRef.current = true;

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
        lastWindowModeChangeRef.current = Date.now();
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
    const trackUrl = track.actualUrl || track.url;
    const trackLoadKey = track.id || track.youtubeId || `${track.title || ''}|${track.author || ''}|${trackUrl || ''}`;

    console.log("[Aether/Audio] Queue head details", {
      id: track.id,
      title: track.title,
      author: track.author,
      youtubeId: track.youtubeId,
      actualUrl: track.actualUrl,
      url: track.url,
      trackUrl,
      isPlaying,
      downloaded: downloadedTracks.includes(track.id),
    });

    // Pre-warm next queue tracks
    queue.slice(0, 3).forEach((item) => {
      if (!downloadedTracks.includes(item.id) && !warmingTrackIds.has(item.id)) {
        console.log(`[Aether] Warmup pre-download for queued track: ${item.title} (${item.id})`);
        warmupTrack(item.id, item.actualUrl || item.url, item.title);
      }
    });

    
    if (track && standaloneTrackLoadKeyRef.current !== trackLoadKey) {
      standaloneTrackLoadKeyRef.current = trackLoadKey;
        setCurrentTrackTitle(track.title);
        setIsAudioBuffering(true);
        
        if (!localAudioRef.current) {
            localAudioRef.current = new Audio();
            localAudioRef.current.volume = volume;
        }

        const isLocalDownloaded = downloadedTracks.includes(track.id);
        // Reconstruct YouTube URL if we have the ID (avoids expired direct URLs)
        const youtubeUrl = track.youtubeId
          ? `https://www.youtube.com/watch?v=${track.youtubeId}`
          : track.actualUrl || track.url;
        const streamBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
        let didOfflineFallback = false;
        const fallbackToOnlineStream = () => {
          if (!isLocalDownloaded || didOfflineFallback) return;
          didOfflineFallback = true;
          const onlineUrl = `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}`;
          console.warn('[Aether/Audio] Offline source stalled, switching to live stream', {
            trackId: track.id,
            title: track.title,
            onlineUrl,
          });
          localAudioRef.current.src = onlineUrl;
          localAudioRef.current.play().catch(() => {});
        };

        // Neural Flow Bridge (V12.11.1-SOVEREIGN-SOVEREIGN) - High-Fidelity Signal Acquisition
        localAudioRef.current.onloadstart = () => {
            console.log(`[Aether/Audio] loadstart at ${Date.now() - loadStartTime}ms`);
        };
        localAudioRef.current.oncanplay = () => {
            console.log(`[Aether/Audio] canplay after ${Date.now() - loadStartTime}ms`);
          if (pendingResumeTimeRef.current && pendingResumeTimeRef.current > 0) {
            const resumeSec = Math.floor(pendingResumeTimeRef.current / 1000);
            localAudioRef.current.currentTime = resumeSec;
            setCurrentTime(resumeSec * 1000);
            pendingResumeTimeRef.current = null;
          }
        };
        localAudioRef.current.onplaying = () => {
            console.log(`[Aether/Audio] playing after ${Date.now() - loadStartTime}ms`);
            setIsAudioBuffering(false);
            setDiagnostics(prev => ({
              ...prev,
              lastSongFetchMs: Math.max(0, Date.now() - loadStartTime),
              lastSongFetchAt: Date.now(),
              lastSongSource: downloadedTracks.includes(track.id) ? 'offline-cache' : 'local-stream',
            }));
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
          fallbackToOnlineStream();
        };
        localAudioRef.current.onended = () => {
            const advanceQueue = (reason) => {
              noteSkipReason(reason, { trackId: track.id, title: track.title });
              setQueue(prev => {
                const next = prev.slice(1);
                if (next.length === 0) setIsPlaying(false);
                return next;
              });
              setCurrentTime(0);
            };
            const playedMs = Math.floor((localAudioRef.current?.currentTime || 0) * 1000);
            const durationMs = Number(track.totalDurationMs || track.duration || 0);
            const completion = durationMs > 0 ? playedMs / durationMs : 1;
            if (completion > 0 && completion < 0.9 && !prematureEndGuardRef.current.retried) {
                prematureEndGuardRef.current = { trackId: track.id, retried: true };
                const youtubeUrl = track.youtubeId
                  ? `https://www.youtube.com/watch?v=${track.youtubeId}`
                  : track.actualUrl || track.url;
                const streamBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
                const resumeSec = Math.max(0, Math.floor((playedMs - 1500) / 1000));
                const recoveryUrl = `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}${resumeSec > 0 ? `&time=${resumeSec}` : ''}`;
                console.warn('[Aether/Audio] Premature end detected, attempting one recovery play', {
                  title: track.title,
                  playedMs,
                  durationMs,
                  completion,
                  recoveryUrl,
                });
                setIsAudioBuffering(true);
                localAudioRef.current.src = recoveryUrl;
                localAudioRef.current.play().catch((e) => {
                  console.error('[Aether/Audio] Recovery play failed', e);
                  advanceQueue('premature_recover_failed');
                });
                return;
            }
            console.log("[Aether/Audio] Signal Terminated Naturally. Advancing Queue.");
            advanceQueue('natural_end');
        };
        localAudioRef.current.onerror = (e) => {
            // HIGH-FIDELITY FAULT TOLERANCE: Do not skip on initial connection fault
          console.error("[Aether/Audio] Signal Disturbance Detected:", e, {
            src: localAudioRef.current?.src,
            networkState: localAudioRef.current?.networkState,
            readyState: localAudioRef.current?.readyState,
            currentTime: localAudioRef.current?.currentTime,
            paused: localAudioRef.current?.paused,
          });
            console.log("[Aether/Audio] Attempting signal recovery. Skip suppressed.");
            // Maintain buffering state instead of skipping to Standby
            setIsAudioBuffering(true);
            fallbackToOnlineStream();
        };
        
        const streamUrl = isLocalDownloaded
          ? `${streamBase}/offline/${track.id}.m4a`
          : `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}`;
        prematureEndGuardRef.current = { trackId: track.id, retried: false };
        console.log("[Aether/Audio] Initializing Stream:", streamUrl, {
            isLocalDownloaded,
            streamBase,
            youtubeUrl,
            trackId: track.id,
        });
        
        localAudioRef.current.crossOrigin = "anonymous";
        localAudioRef.current.src = streamUrl;
        const startupWatchdog = setTimeout(() => {
          const audio = localAudioRef.current;
          if (!audio) return;
          const stuckAtStart = (audio.currentTime || 0) < 1 && audio.readyState < 2;
          if (stuckAtStart) {
            console.warn('[Aether/Audio] Startup watchdog triggered', {
              trackId: track.id,
              title: track.title,
              src: audio.src,
              readyState: audio.readyState,
              currentTime: audio.currentTime,
            });
            fallbackToOnlineStream();
          }
        }, 12000);
        
        // Trigger background download if not already cached / warming
        if (window.aether?.download && !downloadedTracks.includes(track.id) && !warmingTrackIds.has(track.id)) {
            console.log(`[Aether] Triggering background download for track ${track.id}`);
            warmupTrack(track.id, track.actualUrl || track.url, track.title);
        }
        
        if (isPlaying) {
          console.log("[Aether/Audio] Attempting play()", {
            src: localAudioRef.current?.src,
            readyState: localAudioRef.current?.readyState,
            networkState: localAudioRef.current?.networkState,
          });
            localAudioRef.current.play().catch(e => {
            console.error("[Aether/Audio] Autoplay Blocked or Failed:", e, {
              src: localAudioRef.current?.src,
              readyState: localAudioRef.current?.readyState,
              networkState: localAudioRef.current?.networkState,
              paused: localAudioRef.current?.paused,
            });
                setIsAudioBuffering(true);
            });
        }
        const clearWatchdog = () => clearTimeout(startupWatchdog);
        localAudioRef.current.onplaying = ((orig) => (...args) => {
          clearWatchdog();
          return orig?.(...args);
        })(localAudioRef.current.onplaying);
        localAudioRef.current.onended = ((orig) => (...args) => {
          clearWatchdog();
          return orig?.(...args);
        })(localAudioRef.current.onended);
    }
  }, [queue?.[0]?.title, queue?.[0]?.id, isPlaying, isStandalone, downloadedTracks, warmingTrackIds, streamPort, API_BASE, noteSkipReason]);

  useEffect(() => {
    if (!isStandalone || !isPlaying || !isAudioBuffering || !currentTrack || !localAudioRef.current) return;
    // Rescue only during startup buffering. Mid-song stalls should recover naturally without forced source switch.
    if ((currentTime || 0) > 5000) return;

    const trackKey = currentTrack.id || currentTrack.youtubeId || `${currentTrack.title || ''}|${currentTrack.author || ''}`;
    const timer = setTimeout(() => {
      const audio = localAudioRef.current;
      if (!audio || !isAudioBuffering) return;

      const now = Date.now();
      if (bufferingRescueRef.current.trackKey === trackKey && now - bufferingRescueRef.current.lastAttemptAt < 7000) {
        return;
      }
      bufferingRescueRef.current = { trackKey, lastAttemptAt: now };

      const sourceUrl = currentTrack.youtubeId
        ? `https://www.youtube.com/watch?v=${currentTrack.youtubeId}`
        : currentTrack.actualUrl || currentTrack.url;
      if (!sourceUrl) return;

      const rescueUrl = `http://localhost:${streamPort}/stream?url=${encodeURIComponent(sourceUrl)}`;
      console.warn('[Aether/Audio] Buffering rescue triggered', {
        trackId: currentTrack.id,
        title: currentTrack.title,
        from: audio.src,
        to: rescueUrl,
        readyState: audio.readyState,
        currentTime: audio.currentTime,
      });

      audio.src = rescueUrl;
      audio.play().catch((e) => {
        console.error('[Aether/Audio] Buffering rescue failed; keeping current track in buffering state', e);
      });
    }, 8500);

    return () => clearTimeout(timer);
  }, [isStandalone, isPlaying, isAudioBuffering, currentTime, currentTrack?.id, currentTrack?.youtubeId, currentTrack?.title, currentTrack?.author, currentTrack?.actualUrl, currentTrack?.url, streamPort]);

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

        const bassRaw = (dataArray[1] + dataArray[2] + dataArray[3]) / (3 * 255);
        const midsRaw = dataArray.slice(8, 28).reduce((a, b) => a + b, 0) / (20 * 255);
        const highsRaw = dataArray.slice(30, 70).reduce((a, b) => a + b, 0) / (40 * 255);

        auraEnergyRef.current.bass = lerp(auraEnergyRef.current.bass, bassRaw, 0.22);
        auraEnergyRef.current.mids = lerp(auraEnergyRef.current.mids, midsRaw, 0.18);
        auraEnergyRef.current.highs = lerp(auraEnergyRef.current.highs, highsRaw, 0.14);
        auraEnergyRef.current.phase += 0.01 + auraEnergyRef.current.highs * 0.05;

        const bass = auraEnergyRef.current.bass;
        const mids = auraEnergyRef.current.mids;
        const highs = auraEnergyRef.current.highs;
        const drift = Math.sin(auraEnergyRef.current.phase) * 0.03;
        const auraScale = 0.92 + bass * 0.45 + drift;
        const spinDeg = (auraEnergyRef.current.phase * 180) / Math.PI;
        const energy = clamp01((bass * 0.46) + (mids * 0.34) + (highs * 0.20));

        uiPulseRef.current = visualizerMode === 'pulse' ? auraScale : 1;

        if (mixtapeVaultRef.current) {
          mixtapeVaultRef.current.style.setProperty('--vault-bass', String(bass));
          mixtapeVaultRef.current.style.setProperty('--vault-mids', String(mids));
          mixtapeVaultRef.current.style.setProperty('--vault-highs', String(highs));
          mixtapeVaultRef.current.style.setProperty('--vault-energy', String(energy));
          mixtapeVaultRef.current.style.setProperty('--vault-scale', String(auraScale));
          mixtapeVaultRef.current.style.setProperty('--vault-spin', `${spinDeg}deg`);
          mixtapeVaultRef.current.style.setProperty('--vault-glow', String(clamp01(0.18 + bass * 0.42 + highs * 0.22)));
        }

        const now = performance.now();
        if (isMixtapeVaultOpen && now - vaultTelemetryRef.current.lastStateAt > 120) {
          vaultTelemetryRef.current.lastStateAt = now;
          setVaultPulse({
            bass,
            mids,
            highs,
            energy,
            spin: spinDeg,
            stamp: [
              'AETHER-PULSE',
              currentTrack?.title || 'Aether Secret Session',
              `t=${Math.floor((currentTime || 0) / 1000)}s`,
              `b=${Math.round(bass * 100)}`,
              `m=${Math.round(mids * 100)}`,
              `h=${Math.round(highs * 100)}`,
            ].join(' · '),
          });
        }

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
          const accent = getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim() || themeColor || '#00ffbf';
          const contrast = getComputedStyle(document.documentElement).getPropertyValue('--brand-contrast').trim() || '#ff00ff';

          const centerX = pWidth / 2;
          const centerY = pHeight / 2;
          const baseRadius = Math.min(pWidth, pHeight) * 0.26;

          // Layer 1: soft ambient bloom
          const outer = pCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 2.8 * auraScale);
          outer.addColorStop(0, `${accent}${alphaHex(0.22 + bass * 0.20)}`);
          outer.addColorStop(0.45, `${contrast}${alphaHex(0.10 + mids * 0.14)}`);
          outer.addColorStop(1, 'transparent');
          pCtx.fillStyle = outer;
          pCtx.beginPath();
          pCtx.arc(centerX, centerY, baseRadius * 2.7 * auraScale, 0, Math.PI * 2);
          pCtx.fill();

          // Layer 2: liquid rings
          pCtx.lineCap = 'round';
          for (let ring = 0; ring < 3; ring++) {
            const ringAlpha = 0.55 - ring * 0.15;
            const ringBoost = 1 - ring * 0.2;
            pCtx.beginPath();
            pCtx.strokeStyle = `${ring % 2 === 0 ? accent : contrast}${alphaHex(ringAlpha)}`;
            pCtx.lineWidth = 3 - ring * 0.7;
            pCtx.shadowBlur = 24 + bass * 32;
            pCtx.shadowColor = ring % 2 === 0 ? accent : contrast;

            for (let i = 0; i <= 140; i++) {
              const t = i / 140;
              const angle = t * Math.PI * 2;
              const bin = Math.floor((t * (bufferLength - 1) + ring * 13) % (bufferLength - 1));
              const val = (dataArray[bin] || 0) / 255;
              const ripple = Math.sin(angle * 3 + auraEnergyRef.current.phase * 2) * highs * 9;
              const radius = baseRadius + val * (54 * ringBoost) + ripple;
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              if (i === 0) pCtx.moveTo(x, y); else pCtx.lineTo(x, y);
            }
            pCtx.closePath();
            pCtx.stroke();
          }

          // Layer 3: perimeter ticks
          pCtx.shadowBlur = 0;
          pCtx.lineWidth = 1.6;
          for (let i = 0; i < 56; i += 2) {
            const angle = (i / 56) * Math.PI * 2;
            const val = (dataArray[(i * 2) % bufferLength] || 0) / 255;
            const len = 5 + val * (14 + highs * 10);
            const radius = baseRadius - 12;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius - len);
            const y2 = centerY + Math.sin(angle) * (radius - len);
            pCtx.strokeStyle = `${accent}${alphaHex(0.35 + val * 0.45)}`;
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
  }, [isStandalone, isPlaying, currentTrack, currentTime, visualizerMode, themeColor, isMixtapeVaultOpen]);

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
        if (!hasTrackInList(newPlaylists[name], t)) {
                newPlaylists[name].push(t);
                addedCount++;
            }
        });
        setPlaylists(newPlaylists);
        window.aether?.store?.set('playlists', newPlaylists);
        setLastAdded(`Vaulted ${addedCount} Node(s)`);
        setTimeout(() => setLastAdded(null), 3000);
    } else {
        if (!hasTrackInList(newPlaylists[name], data)) {
          newPlaylists[name].push(data);
          setPlaylists(newPlaylists);
          window.aether?.store?.set('playlists', newPlaylists);
          setLastAdded(`Vaulted: ${data.title}`);
          setTimeout(() => setLastAdded(null), 3000);
        }
    }
    setActiveMenuTrack(null);
  };

  const libraryInsights = useMemo(() => {
    const allTracks = Object.values(playlists).flat();
    const seen = new Map();
    const artistCount = new Map();
    let duplicates = 0;

    allTracks.forEach((track) => {
      const key = normalizeTrackIdentity(track);
      if (seen.has(key)) duplicates += 1;
      else seen.set(key, true);

      const artist = (track?.author || 'Unknown').trim();
      artistCount.set(artist, (artistCount.get(artist) || 0) + 1);
    });

    const topArtists = [...artistCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      total: allTracks.length,
      unique: seen.size,
      duplicates,
      topArtists,
    };
  }, [playlists, normalizeTrackIdentity]);

  const smartMixTracks = useMemo(() => {
    const allTracks = Object.values(playlists).flat();
    if (allTracks.length === 0) return [];
    const unique = [];
    const used = new Set();
    for (const t of allTracks) {
      const key = normalizeTrackIdentity(t);
      if (used.has(key)) continue;
      used.add(key);
      unique.push(t);
      if (unique.length >= 18) break;
    }
    return unique;
  }, [playlists, normalizeTrackIdentity]);

  const handleGenerateSmartMix = useCallback(() => {
    if (!smartMixTracks.length) return;
    const smartName = 'SMART_MIX';
    const next = { ...playlists, [smartName]: smartMixTracks };
    setPlaylists(next);
    window.aether?.store?.set('playlists', next);
    setViewingPlaylist(smartName);
    setLastAdded(`Smart Mix refreshed • ${smartMixTracks.length} tracks`);
    setTimeout(() => setLastAdded(null), 2800);
  }, [playlists, smartMixTracks]);

  const handleCleanVault = useCallback(async () => {
    if (isVaultCleaning) return;
    setIsVaultCleaning(true);
    setLastAdded('Cleaning vault…');

    try {
      const next = {};
      let removedDuplicates = 0;
      let removedUnavailable = 0;
      let normalized = 0;
      const totalTracks = Object.values(playlists).reduce((sum, tracks) => sum + (Array.isArray(tracks) ? tracks.length : 0), 0);
      let processedTracks = 0;

      const withTimeout = (promise, timeoutMs = 2500) => new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(null);
          }
        }, timeoutMs);

        Promise.resolve(promise)
          .then((value) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(value ?? null);
          })
          .catch(() => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(null);
          });
      });

      for (const [name, tracks] of Object.entries(playlists)) {
        const seen = new Set();
        const clean = [];

        for (const original of (tracks || [])) {
          processedTracks += 1;
          if (processedTracks % 18 === 0) {
            setLastAdded(`Cleaning vault… ${processedTracks}/${Math.max(totalTracks, 1)}`);
          }

          const baseUrl = original?.actualUrl || original?.url || (original?.youtubeId ? `https://www.youtube.com/watch?v=${original.youtubeId}` : '');
          let track = baseUrl
            ? {
                ...original,
                id: original?.id || original?.youtubeId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                youtubeId: original?.youtubeId || extractYouTubeId(baseUrl),
                actualUrl: original?.actualUrl || baseUrl,
                url: original?.url || baseUrl,
              }
            : null;
          if (!track) {
            removedUnavailable += 1;
            continue;
          }

          if (isStandalone && window.aether?.getMetadata) {
            const needsHydration = !original?.title || !original?.author || !original?.thumbnail || !track.youtubeId;
            if (needsHydration) {
              const meta = await withTimeout(window.aether.getMetadata(track.actualUrl || track.url), 2500);
              if (meta && (meta.title || meta.author || meta.thumbnail || meta.url || meta.actualUrl)) {
                track = mergeTrackMetadata(track, meta);
              }
            }
          }

          if (!(track.actualUrl || track.url || track.youtubeId)) {
            removedUnavailable += 1;
            continue;
          }

          const key = normalizeTrackIdentity(track);
          if (seen.has(key)) {
            removedDuplicates += 1;
            continue;
          }

          seen.add(key);

          const beforeTitle = String(original?.title || '').trim();
          const beforeAuthor = String(original?.author || '').trim();
          const beforeThumb = String(original?.thumbnail || '').trim();

          const normalizedTrack = {
            ...track,
            title: String(track.title || beforeTitle || 'Unknown Track').trim(),
            author: String(track.author || beforeAuthor || 'Unknown Artist').trim(),
            thumbnail: track.thumbnail || beforeThumb || '',
          };

          if (
            normalizedTrack.title !== beforeTitle ||
            normalizedTrack.author !== beforeAuthor ||
            (normalizedTrack.thumbnail || '') !== beforeThumb
          ) {
            normalized += 1;
          }

          clean.push(normalizedTrack);
        }

        next[name] = clean;
      }

      setPlaylists(next);
      await window.aether?.store?.set?.('playlists', next);
      setLastAdded(`Vault cleaned • deduped ${removedDuplicates}, removed ${removedUnavailable}, normalized ${normalized}`);
      setTimeout(() => setLastAdded(null), 4200);
    } finally {
      setIsVaultCleaning(false);
    }
  }, [isStandalone, isVaultCleaning, normalizeTrackIdentity, playlists]);

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
      const normalized = (tracks || []).map(normalizeQueueTrack).filter(Boolean);
      if (normalized.length === 0) {
        setLastAdded(`No playable tracks in ${name}`);
        setTimeout(() => setLastAdded(null), 2600);
        return;
      }
      setQueue(prev => {
        const next = [...prev, ...normalized];
        if (prev.length === 0) setIsPlaying(true);
        return next;
      });
      setIsManualStop(false);
      setLastAdded(`Queued Entire Vault: ${name} (${normalized.length})`);
      setTimeout(() => setLastAdded(null), 3000);
    }
  };

  const activeLyric = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return null;
    const currentMs = currentTime;
    const line = [...lyrics].reverse().find(l => l.time <= currentMs);
    return line ? line.text : null;
  }, [lyrics, currentTime]);

  const compactLyric = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return null;
    return lyrics[activeLyricIndex]?.text || activeLyric || null;
  }, [lyrics, activeLyricIndex, activeLyric]);

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

  const triggerAutoplay = async (seedTrack = null) => {
    if (!isAutoplayEnabled || !isStandalone) return;
    const seed = seedTrack || currentTrack || history[0];
    if (!seed) return;

    const normalizeTitle = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const seedTitleNorm = normalizeTitle(seed.title);
    const seedId = String(seed.id || seed.youtubeId || '').trim();
    const seedUrl = String(seed.actualUrl || seed.url || '').trim();
    const isSameAsSeed = (candidate) => {
      if (!candidate) return false;
      const candidateId = String(candidate.id || candidate.youtubeId || '').trim();
      const candidateTitleNorm = normalizeTitle(candidate.title);
      const candidateUrl = String(candidate.actualUrl || candidate.url || '').trim();
      return (
        (seedId && candidateId && seedId === candidateId) ||
        (seedUrl && candidateUrl && seedUrl === candidateUrl) ||
        (seedTitleNorm && candidateTitleNorm && seedTitleNorm === candidateTitleNorm)
      );
    };

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
        const filtered = recs.filter(r => !queue.some(q => q.title === r.title) && !isSameAsSeed(r));
        if (filtered.length > 0) {
          handleAdd(filtered[0]);
          return;
        }
      }

      // Fallback Path: Neural Breadth Search (by artist)
      console.log("[Aether] Primary Discovery failed, broadening signal...");
      const fallbackResults = await window.aether.search(seed.author || seed.title.split('-')[0]);
      if (fallbackResults && fallbackResults.length > 0) {
        const candidates = fallbackResults.filter(r => r.title !== seed.title && !isSameAsSeed(r));
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
    if (isStandalone && isAutoplayEnabled && queue.length === 0 && !isManualStop && !isAutoplaySeeking) {
        const seed = currentTrack || history[0] || prevTrackRef.current;
        if (seed) {
          console.log('[Aether/Autoplay] Queue empty, triggering autoplay', {
            seedTitle: seed.title,
            seedId: seed.id,
            from: currentTrack ? 'current' : history[0] ? 'history' : 'previous-ref',
          });
          triggerAutoplay(seed);
        }
    }
  }, [queue.length, isAutoplayEnabled, isStandalone, isManualStop, isAutoplaySeeking, currentTrack, history]);

  useEffect(() => {
    if (!isStandalone || !window.aether?.onSpotifyImportProgress) return;
    const onSpotifyImportProgress = (payload) => {
      appendSpotifyImportLog(`${payload?.stage || 'working'} ${Number.isFinite(payload?.progress) ? `${payload.progress}%` : ''} ${payload?.message || ''}`.trim());
      setSpotifyImportProgress({
        stage: payload?.stage || 'working',
        progress: Number.isFinite(payload?.progress) ? payload.progress : 0,
        message: payload?.message || '',
      });
    };
    const unsubscribe = window.aether.onSpotifyImportProgress(onSpotifyImportProgress);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [appendSpotifyImportLog, isStandalone]);

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
    const startedAt = performance.now();
    try {
      const guildId = getEffectiveGuildId();
      console.log("[Aether/Queue] Fetching queue", { guildId, isStandalone, currentTime, currentTrackTitle });
      const resp = await axios.get(`${API_BASE}/api/queue/${guildId}`);
      console.log("[Aether/Queue] Response", {
        isPlaying: resp.data?.isPlaying,
        currentMs: resp.data?.currentMs,
        queueLength: resp.data?.songs?.length,
        topTrack: resp.data?.songs?.[0]?.title,
      });
      
      // Only pull remote queue if acting as Discord client (Standalone manages its own state)
      if (resp.data.songs && !isStandalone) setQueue(resp.data.songs);

      const queueLength = resp.data?.songs?.length || 0;
      if (!isStandalone && queueLength === 0) {
        setIsPlaying(false);
        setCurrentTime(0);
        setCurrentTrackTitle('');
        if (localAudioRef.current) {
          localAudioRef.current.pause();
          localAudioRef.current.removeAttribute('src');
          localAudioRef.current.load();
        }
      }
      
      const serverMs = resp.data.currentMs || 0;
      if (!isStandalone && queueLength > 0 && (Math.abs(currentTime - serverMs) > 1000 || currentTime === 0)) setCurrentTime(serverMs);
      if (!isStandalone && typeof resp.data.isPlaying === 'boolean') setIsPlaying(resp.data.isPlaying);

      const track = resp.data.songs && resp.data.songs[0];
      if (track && track.title !== currentTrackTitle) {
        console.log("[Aether/Queue] New head track", {
          id: track.id,
          title: track.title,
          author: track.author,
          actualUrl: track.actualUrl,
          url: track.url,
        });
        setCurrentTrackTitle(track.title);
        updateDiscordRichPresence(track, serverMs);

        // --- AETHER: LOCAL PLAYBACK SYNC (V12.11.1-SOVEREIGN-SOVEREIGN-SOVEREIGN ---
        if (isStandalone && track.actualUrl) {
            const loadStartTime = Date.now();
          console.log("[Aether/Audio] Standalone queue fetch stream load", {
            trackId: track.id,
            actualUrl: track.actualUrl,
            url: track.url,
          });
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

      setDiagnostics(prev => ({
        ...prev,
        lastQueueFetchMs: Math.round(performance.now() - startedAt),
        lastQueueFetchAt: Date.now(),
        lastQueueError: null,
      }));
    } catch (err) {
      console.error("[Aether/Queue] Fetch failed", err, {
        apiBase: API_BASE,
        guildId: getEffectiveGuildId(),
      });
      setDiagnostics(prev => ({
        ...prev,
        lastQueueFetchAt: Date.now(),
        lastQueueError: err?.message || 'queue fetch failed',
      }));
    }
  };

  useEffect(() => {
    const SEQUENCE = 'mixtape';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isLyricsExpanded) { setIsLyricsExpanded(false); return; }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      setTypedBuffer(prev => {
        const next = (prev + e.key.toLowerCase()).slice(-SEQUENCE.length);
        if (next === SEQUENCE) {
          setIsMixtapeVaultOpen(true);
          return "";
        }
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLyricsExpanded]);

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
          type: 2,
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
    } catch (err) {
      console.warn("[Discord SDK] setActivity failed:", err.message);
    }
  };

  const fetchSystemStats = async () => {
    const startedAt = performance.now();
    try {
      if (isStandalone) {
          const stats = await window.aether.getStats();
          setSystemStats(stats);
      } else {
          const resp = await axios.get(`${API_BASE}/api/system`);
          setSystemStats(resp.data);
      }
      setDiagnostics(prev => ({
        ...prev,
        lastSystemFetchMs: Math.round(performance.now() - startedAt),
        lastSystemFetchAt: Date.now(),
        lastSystemError: null,
      }));
    } catch (err) {
      setDiagnostics(prev => ({
        ...prev,
        lastSystemFetchAt: Date.now(),
        lastSystemError: err?.message || 'system fetch failed',
      }));
    }
  };

  const refreshStorageStats = useCallback(async () => {
    if (!isStandalone || !window.aether?.getStorageStats) return;
    try {
      const res = await window.aether.getStorageStats();
      if (res?.success) {
        setStorageStats(res);
        if (res?.policy) {
          setStoragePolicy({
            cacheCapMb: res.policy.cacheCapMb || 2048,
            maxCacheAgeDays: res.policy.maxCacheAgeDays || 30,
          });
        }
      }
    } catch (e) {
      console.warn('[Aether/Storage] stats fetch failed', e);
    }
  }, [isStandalone]);

  const applyStoragePolicy = useCallback(async (nextPolicy) => {
    if (!isStandalone || !window.aether?.updateStoragePolicy) return;
    try {
      const res = await window.aether.updateStoragePolicy(nextPolicy);
      if (res?.success && res?.policy) {
        setStoragePolicy({
          cacheCapMb: res.policy.cacheCapMb,
          maxCacheAgeDays: res.policy.maxCacheAgeDays,
        });
      }
    } catch (e) {
      console.warn('[Aether/Storage] policy update failed', e);
    }
  }, [isStandalone]);

  const refreshStorageEstimate = useCallback(async () => {
    if (!isStandalone || !window.aether?.getStorageEstimate) return;
    try {
      const [capRes, ageRes, downloadsRes] = await Promise.all([
        window.aether.getStorageEstimate({ mode: 'cap', cacheCapMb: storagePolicy.cacheCapMb }),
        window.aether.getStorageEstimate({ mode: 'age', maxCacheAgeDays: storagePolicy.maxCacheAgeDays }),
        window.aether.getStorageEstimate({ mode: 'downloads-only' }),
      ]);

      setStorageEstimate({
        cap: capRes?.success ? capRes : null,
        age: ageRes?.success ? ageRes : null,
        downloadsOnly: downloadsRes?.success ? downloadsRes : null,
      });
    } catch (e) {
      console.warn('[Aether/Storage] estimate fetch failed', e);
    }
  }, [isStandalone, storagePolicy.cacheCapMb, storagePolicy.maxCacheAgeDays]);

  const runStorageOptimize = useCallback(async (mode) => {
    if (!isStandalone || !window.aether?.optimizeStorage) return;
    setIsStorageBusy(true);
    try {
      const payload = mode === 'cap'
        ? { mode, cacheCapMb: storagePolicy.cacheCapMb }
        : mode === 'age'
          ? { mode, maxCacheAgeDays: storagePolicy.maxCacheAgeDays }
          : { mode };
      const res = await window.aether.optimizeStorage(payload);
      if (res?.success) {
        setLastAdded(`Storage optimized • ${mode}`);
        setTimeout(() => setLastAdded(null), 2200);
      }
      await refreshStorageStats();
      await refreshStorageEstimate();
    } catch (e) {
      console.warn('[Aether/Storage] optimize failed', e);
    } finally {
      setIsStorageBusy(false);
    }
  }, [isStandalone, refreshStorageEstimate, refreshStorageStats, storagePolicy.cacheCapMb, storagePolicy.maxCacheAgeDays]);



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

  const centerCompactLyrics = useCallback((behavior = 'smooth') => {
    if (!activeLyricRef.current || !lyricsContainerRef.current) return;
    const activeLine = activeLyricRef.current;
    const container = lyricsContainerRef.current;
    const rawTop = activeLine.offsetTop - (container.offsetHeight / 2) + (activeLine.offsetHeight / 2);
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(maxTop, rawTop));
    container.scrollTo({ top: targetTop, behavior });
  }, []);

  const centerImmersiveLyrics = useCallback((behavior = 'smooth') => {
    if (!expandedActiveRef.current || !expandedContainerRef.current) return;
    const activeLine = expandedActiveRef.current;
    const container = expandedContainerRef.current;
    const rawTop = activeLine.offsetTop - (container.offsetHeight / 2) + (activeLine.offsetHeight / 2);
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(maxTop, rawTop));
    container.scrollTo({ top: targetTop, behavior });
  }, []);

  const handleResyncLyrics = useCallback(() => {
    setIsAutoScrollPaused(false);

    // Immediate lock + settle pass.
    requestAnimationFrame(() => {
      centerCompactLyrics('auto');
      centerImmersiveLyrics('auto');
      setTimeout(() => {
        centerImmersiveLyrics('smooth');
      }, 90);
    });
  }, [centerCompactLyrics, centerImmersiveLyrics]);

  useEffect(() => {
    // Immersive mode should stay locked and centered unless user explicitly pauses elsewhere.
    if (isLyricsExpanded) {
      setIsAutoScrollPaused(false);
    }
  }, [isLyricsExpanded]);

  useLayoutEffect(() => {
    let raf1;
    let raf2;

    // Normal Sync (Bounded Scroll)
    if (!isAutoScrollPaused && activeLyricRef.current && lyricsContainerRef.current) {
        centerCompactLyrics('smooth');
    }
    // Expanded Sync (Bounded Scroll with Header Offset)
    if ((!isAutoScrollPaused || isLyricsExpanded) && expandedActiveRef.current && expandedContainerRef.current) {
        // First pass immediately, second pass after animation settles one more frame.
        centerImmersiveLyrics(activeLyricIndex <= 1 ? 'auto' : 'smooth');
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            centerImmersiveLyrics('auto');
          });
        });
    }

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [activeLyricIndex, isAutoScrollPaused, isLyricsExpanded, centerCompactLyrics, centerImmersiveLyrics]);

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
    const startedAt = performance.now();
    setIsLyricsLoading(true);
    try {
      const normalizedTitle = String(trackTitle)
        .replace(/\(official[^)]*\)/gi, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\(lyrics?\)/gi, '')
        .replace(/\(audio\)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      console.log("[Aether/Lyrics] Fetch start", {
        trackTitle,
        normalizedTitle,
        trackAuthor,
        trackDuration,
        trackUrl,
        isStandalone,
      });
      if (isStandalone) {
          const results = await window.aether.getLyrics(trackTitle, trackAuthor, trackDuration, trackTitle, trackUrl);
          // Backend returns { lyrics: Array<{time, text}>, source: string } OR Array directly
          const lyricsArray = Array.isArray(results) ? results : (results?.lyrics || []);
          console.log("[Aether/Lyrics] Standalone result", {
            count: lyricsArray.length,
            source: results?.source,
          });
          setLyrics(lyricsArray);
          setDiagnostics(prev => ({
            ...prev,
            lastLyricsSource: results?.source || 'local',
            lastLyricsFetchMs: Math.round(performance.now() - startedAt),
            lastLyricsFetchAt: Date.now(),
            lastLyricsError: null,
          }));
          setIsLyricsLoading(false);
          return;
      }
      const query = `${normalizedTitle || trackTitle} ${trackAuthor || ''}`.trim();
      const resp = await fetch(`${API_BASE}/api/lyrics?track=${encodeURIComponent(normalizedTitle || trackTitle)}&artist=${encodeURIComponent(trackAuthor || '')}&duration=${(trackDuration || 0)/1000}&url=${encodeURIComponent(trackUrl || '')}&query=${encodeURIComponent(query)}&format=json`);
      const data = await resp.json();
      console.log("[Aether/Lyrics] Web result", {
        ok: resp.ok,
        status: resp.status,
        count: Array.isArray(data) ? data.length : 0,
        sample: Array.isArray(data) ? data[0] : data,
      });
      setLyrics(Array.isArray(data) ? data : []);
      setDiagnostics(prev => ({
        ...prev,
        lastLyricsSource: data?.source || 'api',
        lastLyricsFetchMs: Math.round(performance.now() - startedAt),
        lastLyricsFetchAt: Date.now(),
        lastLyricsError: null,
      }));
      if (trackTitle !== currentTrackTitle) {
        setCurrentTime(0);
        setCurrentTrackTitle(trackTitle);
      }
    } catch (err) {
      console.error("[Aether/Lyrics] Fetch failed", err, {
        trackTitle,
        trackAuthor,
        trackDuration,
        trackUrl,
      });
      setLyrics([]);
      setDiagnostics(prev => ({
        ...prev,
        lastLyricsFetchAt: Date.now(),
        lastLyricsError: err?.message || 'lyrics fetch failed',
      }));
    } finally { setIsLyricsLoading(false); }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && isDiagnosticsOpen) setIsDiagnosticsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDiagnosticsOpen]);

  useEffect(() => {
    if (!isStandalone) return;
    refreshStorageStats();
    refreshStorageEstimate();
  }, [isStandalone, refreshStorageEstimate, refreshStorageStats]);

  useEffect(() => {
    if (!isStandalone || !isDiagnosticsOpen) return;
    refreshStorageStats();
    refreshStorageEstimate();
  }, [isStandalone, isDiagnosticsOpen, refreshStorageEstimate, refreshStorageStats]);

  useEffect(() => {
    if (currentTrack?.title !== currentTrackTitle) {
      if (currentTrackTitle && prevTrackRef.current) {
         setHistory(prev => [prevTrackRef.current, ...prev].slice(0, 20)); // Keep last 20
      }
      setCurrentTime(0);
      setCurrentTrackTitle(currentTrack?.title || "");
      prevTrackRef.current = currentTrack;
    }
    if (currentTrack?.syncedLyrics) setLyrics(currentTrack.syncedLyrics.lyrics || []);
    else if (currentTrack?.title) fetchLyrics(currentTrack.title, currentTrack.author, currentTrack.totalDurationMs || currentTrack.duration, currentTrack.actualUrl || currentTrack.url);
    else setLyrics([]);
  }, [currentTrack?.title]);

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const str = String(url);
    const match = str.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const normalizeQueueTrack = useCallback((track) => {
    if (!track) return null;
    const baseUrl = track.actualUrl || track.url || (track.youtubeId ? `https://www.youtube.com/watch?v=${track.youtubeId}` : '');
    if (!baseUrl) return null;
    const youtubeId = track.youtubeId || extractYouTubeId(baseUrl);
    const stableId = youtubeId || track.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      ...track,
      id: stableId,
      youtubeId,
      actualUrl: track.actualUrl || baseUrl,
      url: track.url || baseUrl,
    };
  }, []);

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
        const newTrack = normalizeQueueTrack(track);
        if (!newTrack) {
          console.warn('[Aether/Queue] Ignored add: track has no playable URL', track);
          return;
        }
        const url = newTrack.actualUrl || newTrack.url;
        const stableId = newTrack.id;
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
              item.id === stableId ? mergeTrackMetadata(item, fullTrack) : item
                ));
            }
        });
        return;
    }

    const effectiveGuildId = getEffectiveGuildId();
    
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      console.log("[Aether/Add] Web add request", {
        effectiveGuildId,
        trackId: track.id,
        title: track.title,
        author: track.author,
        actualUrl: track.actualUrl,
        url: track.url,
      });
      await axios.post(`${API_BASE}/api/add/${effectiveGuildId}`, { track, userId: auth?.user?.id });
      console.log("[Aether/Add] Track posted, sending resume", { effectiveGuildId });
      await axios.post(`${API_BASE}/api/control/${effectiveGuildId}`, { action: 'resume' }).catch(() => {});
      setIsPlaying(true);
      setIsManualStop(false);
      fetchQueue();
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

  const handleImportSpotifyPlaylist = async () => {
      if (!isStandalone || !window.aether?.importSpotifyPlaylist) return;
      const url = spotifyImportUrl.trim();
      if (!url) return;

      setIsSpotifyImporting(true);
      setSpotifyImportLogs([]);
      appendSpotifyImportLog(`start url=${url}`);
      setSpotifyImportProgress({ stage: 'starting', progress: 1, message: 'Preparing import…' });
      try {
        const res = await window.aether.importSpotifyPlaylist(url.trim());
        appendSpotifyImportLog(`result success=${!!res?.success} matched=${res?.matchedTracks ?? 0} total=${res?.totalTracks ?? 0}`);
        if (!res?.success) {
          const debug = res?.debug
            ? ` [id=${res.debug.playlistId || '-'} htmlIds=${res.debug.htmlTrackIdCount ?? '-'} htmlLabels=${res.debug.htmlLabelCount ?? '-'}]`
            : '';
          setSpotifyImportProgress({ stage: 'error', progress: 0, message: `${res?.error || 'Spotify import failed.'}${debug}` });
          appendSpotifyImportLog(`error ${res?.error || 'Spotify import failed.'}${debug}`);
          return;
        }

        if (!Array.isArray(res.tracks) || res.tracks.length === 0) {
          const debugHint = res?.debug
            ? ` (${res.debug.matchedTracks}/${res.debug.searchedTracks} matched${res.debug.missedSamples?.length ? ` • sample misses: ${res.debug.missedSamples.slice(0, 2).join(' | ')}` : ''})`
            : '';
          setSpotifyImportProgress({ stage: 'complete', progress: 100, message: `Imported the shell for “${res.playlistName}”, but no playable matches were found${debugHint}.` });
          return;
        }

        const playlistName = res.playlistName || 'Spotify Playlist';
        const uniquePlaylistName = playlists[playlistName] ? `${playlistName} (Spotify)` : playlistName;
        const nextPlaylists = { ...playlists, [uniquePlaylistName]: res.tracks };
        setPlaylists(nextPlaylists);
        window.aether?.store?.set('playlists', nextPlaylists);
        setLastAdded(`Imported ${res.matchedTracks}/${res.totalTracks} Spotify tracks`);
        setTimeout(() => setLastAdded(null), 3500);
        setIsSpotifyImportOpen(false);
        setSpotifyImportUrl('');
        setSpotifyImportProgress({ stage: 'complete', progress: 100, message: `Imported ${res.matchedTracks}/${res.totalTracks} tracks` });
      } catch (err) {
        const message = err?.message || 'Spotify import failed.';
        appendSpotifyImportLog(`exception ${message}`);
        setSpotifyImportProgress({ stage: 'error', progress: 0, message });
      } finally {
        setIsSpotifyImporting(false);
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
          noteSkipReason('manual_skip', { source: 'transport', title: queue?.[0]?.title });
            setQueue(prev => {
                const next = prev.slice(1);
                if (next.length === 0) {
                    setIsPlaying(false);
              if (isAutoplayEnabled) setTimeout(() => triggerAutoplay(prev[0]), 0); // Force immediate autoplay kick
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
      const effectiveGuildId = getEffectiveGuildId();

      // Web-mode immediate transport sync so UI/audio do not drift while waiting for polling.
      if (action === 'pause') {
        setIsPlaying(false);
        if (localAudioRef.current) localAudioRef.current.pause();
      }
      if (action === 'resume') {
        setIsPlaying(true);
        if (localAudioRef.current) localAudioRef.current.play().catch(() => {});
      }
      if (action === 'skip') {
        setCurrentTime(0);
        if (localAudioRef.current) {
          localAudioRef.current.pause();
        }
      }
      if (action === 'clear' || action === 'stop') {
        setQueue([]);
        setIsPlaying(false);
        setCurrentTime(0);
        if (localAudioRef.current) {
          localAudioRef.current.pause();
          localAudioRef.current.removeAttribute('src');
          localAudioRef.current.load();
        }
      }

      await axios.post(`${API_BASE}/api/control/${effectiveGuildId}`, { action });
      fetchQueue();
    } catch (err) {
      console.error("[Aether/Control] Web control failed", err, {
        action,
        guildId: getEffectiveGuildId(),
      });
    }
  }, [isStandalone, API_BASE, history, isAutoplayEnabled, getEffectiveGuildId, noteSkipReason, queue]);

  const [uiPulse, setUiPulse] = useState(1);
  const [accentColor, setAccentColor] = useState('#00ffbf');

  useEffect(() => {
    if (!isPlaying) {
      setUiPulse(1);
      uiPulseRef.current = 1;
      return;
    }
    let animationFrame;
    const updatePulse = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const lowFreq = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const target = (visualizerMode === 'pulse') ? (1 + (lowFreq / 255) * 0.035) : 1;
        uiPulseRef.current = lerp(uiPulseRef.current, target, 0.22);
        setUiPulse(visualizerMode === 'pulse' ? uiPulseRef.current : 1);
      }
      animationFrame = requestAnimationFrame(updatePulse);
    };
    updatePulse();
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, visualizerMode]);

  const handleSeek = useCallback(async (time) => {
    // Neural Seek Link
    const guildId = getEffectiveGuildId();
    try {
        await axios.post(`${API_BASE}/api/control/${guildId}`, { action: 'seek', time });
    } catch (e) {}
    
    // Remote discord bots support absolute timing updates natively.
    // Natively piping a chunked generic HTTP stream into an <audio> tag does not magically support arbitrary byte manipulation (HTTP 206).
    // Mutating currentTime will forcefully close the stream connection, triggering a fresh 0:00 buffer reload.
    if (!isStandalone) {
        if (localAudioRef.current) localAudioRef.current.currentTime = time / 1000;
        setCurrentTime(time);
    } else {
        if (localAudioRef.current && currentTrack) {
            const timeSec = Math.floor(time / 1000);
            const base = currentTrack.actualUrl || currentTrack.url;
            localAudioRef.current.src = `http://localhost:${streamPort}/stream?url=${encodeURIComponent(base)}&time=${timeSec}`;
            localAudioRef.current.play().catch(()=>{});
        }
        setCurrentTime(time);
    }
  }, [API_BASE, isStandalone, currentTrack, streamPort, getEffectiveGuildId]);

  const handleRemove = useCallback(async (index) => {
    if (isStandalone) {
        setQueue(prev => {
            const next = [...prev];
            next.splice(index, 1);
            return next;
        });
        return;
    }
    const guildId = getEffectiveGuildId();
    try { await axios.post(`${API_BASE}/api/remove/${guildId}/${index}`); fetchQueue(); } catch (err) {}
  }, [isStandalone, API_BASE, getEffectiveGuildId]);

  const handleSync = async (offset) => {
      if (isStandalone) {
          setLyricOffsetMs(prev => prev + offset);
          return;
      }
        const guildId = getEffectiveGuildId();
      await axios.post(`${API_BASE}/api/sync/${guildId}`, { offset });
        fetchQueue();
  }

  const toggleMiniPlayer = useCallback(async () => {
      if (!isStandalone || !window.aether?.resizeWindow) return;
      if (isMiniPlayer) {
          await window.aether.resizeWindow(1100, 750, false);
          setIsMiniPlayer(false);
      } else {
        await window.aether.resizeWindow(420, 190, true);
          setIsMiniPlayer(true);
      }
  }, [isMiniPlayer, isStandalone]);

  const toggleDiagnostics = useCallback(() => {
    setIsDiagnosticsOpen(prev => !prev);
  }, []);

  const toggleWindowMaximize = useCallback(async () => {
    if (!isStandalone || !window.aether?.toggleWindowMaximize) return;
    try {
      await window.aether.toggleWindowMaximize();
    } catch (e) {
      console.warn('[Aether/Window] toggle maximize failed', e);
    }
  }, [isStandalone]);

  const handleResetPlaybackEngine = useCallback(() => {
    const audio = localAudioRef.current;
    if (!audio) return;

    const resumeAt = Number.isFinite(audio.currentTime) ? Math.max(0, audio.currentTime) : 0;
    const sourceUrl = currentTrack?.actualUrl || currentTrack?.url;
    if (!sourceUrl) return;

    console.log('[Aether/Diagnostics] Reset playback engine', {
      title: currentTrack?.title,
      resumeAt,
      isStandalone,
    });

    bufferingRescueRef.current = { trackKey: '', lastAttemptAt: 0 };
    standaloneTrackLoadKeyRef.current = '';

    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    const nextSrc = isStandalone
      ? `http://localhost:${streamPort}/stream?url=${encodeURIComponent(sourceUrl)}&time=${Math.floor(resumeAt)}`
      : `${API_BASE}/stream?url=${encodeURIComponent(sourceUrl)}&time=${Math.floor(resumeAt)}`;

    audio.src = nextSrc;
    audio.currentTime = 0;
    setCurrentTime(Math.floor(resumeAt * 1000));
    setIsAudioBuffering(true);

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('[Aether/Diagnostics] playback reset play failed', err);
      });
    }
  }, [API_BASE, currentTrack?.actualUrl, currentTrack?.title, currentTrack?.url, isPlaying, isStandalone, streamPort]);

  useEffect(() => {
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const onShortcut = (e) => {
      const lowerKey = e.key?.toLowerCase?.() || '';
      const plainMD = !e.metaKey && !e.ctrlKey && !e.altKey && (lowerKey === 'm' || lowerKey === 'd');
      if (isTypingTarget(document.activeElement) && !plainMD) return;

      const isAccelAlt = (e.metaKey || e.ctrlKey) && e.altKey;
      if (isAccelAlt) {
        if (e.code === 'Space') {
          e.preventDefault();
          handleControl(isPlaying ? 'pause' : 'resume');
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleControl('previous');
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleControl('skip');
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setVolume(prev => {
            const next = Math.min(1, prev + 0.08);
            if (localAudioRef.current) localAudioRef.current.volume = next;
            window.aether?.store?.set('volume', next);
            return next;
          });
          setVolumeToast(true);
          setTimeout(() => setVolumeToast(false), 1200);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setVolume(prev => {
            const next = Math.max(0, prev - 0.08);
            if (localAudioRef.current) localAudioRef.current.volume = next;
            window.aether?.store?.set('volume', next);
            return next;
          });
          setVolumeToast(true);
          setTimeout(() => setVolumeToast(false), 1200);
          return;
        }
        if (lowerKey === 'm') {
          e.preventDefault();
          handleControl('mute');
        }
      }

      if (isStandalone && lowerKey === 'm' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleMiniPlayer();
        return;
      }

      if (lowerKey === 'd' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleDiagnostics();
      }
    };

    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [isStandalone, isPlaying, toggleMiniPlayer, toggleDiagnostics, handleControl]);

  if (loading) return (
    <div className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="relative">
        <Loader2 className="animate-spin text-brand-accent" size={48} />
        <div className="absolute inset-0 blur-xl bg-brand-accent/20 animate-pulse" />
      </div>
      <div className="label-caps animate-pulse text-sm">Neural Link Active</div>
    </div>
  );

  if (isStandalone && lockStatus.enabled && isAppLocked) return (
    <div className="h-screen w-full bg-[#050505] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/70 backdrop-blur-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent">
            <Lock size={18} />
          </div>
          <div>
            <div className="text-sm font-black text-brand-accent uppercase tracking-[0.22em]">Aether Locked</div>
            <div className="text-[11px] text-white/45 mt-1">Unlock to access your studio.</div>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={unlockPasswordInput}
            onChange={(e) => setUnlockPasswordInput(e.target.value)}
            placeholder="Enter password"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent/50"
            onKeyDown={(e) => { if (e.key === 'Enter') handleUnlockWithPassword(); }}
          />

          {lockError && <div className="text-[11px] text-red-400">{lockError}</div>}

          <div className="flex items-center gap-2">
            <button
              onClick={handleUnlockWithPassword}
              disabled={isLockBusy || !unlockPasswordInput}
              className="flex-1 rounded-xl bg-brand-accent text-black font-black py-2.5 text-sm disabled:opacity-50"
            >
              Unlock
            </button>
            {lockStatus.touchIdAvailable && lockStatus.touchIdEnabled && (
              <button
                onClick={handleUnlockWithBiometric}
                disabled={isLockBusy}
                className="rounded-xl border border-white/15 bg-white/5 text-white px-3 py-2.5 hover:text-brand-accent transition-colors"
                title="Unlock with Touch ID"
              >
                <Fingerprint size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isMiniPlayer) {
     return (
        <div className="w-[100vw] h-[100vh] bg-[#050505] overflow-hidden drag relative p-3">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/12 via-transparent to-transparent pointer-events-none" />
          <div className="w-full h-full rounded-[22px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl px-3 py-2.5 flex items-center gap-3 relative z-10 shadow-[0_12px_30px_rgba(0,0,0,0.45)] overflow-hidden">
           {currentTrack ? (
            <>
              <img src={getProxyUrl(currentTrack.thumbnail)} className="w-[78px] h-[78px] object-cover rounded-xl shadow-[0_8px_18px_rgba(0,0,0,0.55)] border border-white/10 flex-none" />
              <div className="flex flex-col flex-1 min-w-0 h-full justify-center pr-1">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="overflow-hidden whitespace-nowrap">
                      <div className="animate-marquee-loop flex w-max gap-8 items-center text-[13px] font-semibold text-white/95 leading-tight" style={{ textShadow: `0 0 10px ${themeColor}44` }}>
                        <span>{currentTrack.title}</span>
                        <span aria-hidden="true">{currentTrack.title}</span>
                      </div>
                    </div>
                    <span className="block text-[10px] font-medium text-white/60 truncate leading-tight mt-0.5">{currentTrack.author}</span>
                  </div>
                  <span className="shrink-0 rounded-full border border-brand-accent/20 bg-brand-accent/8 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-brand-accent/70">
                    Mini
                  </span>
                </div>

                <div className="mt-1.25 min-h-[1.7em] border-l-2 border-brand-accent/30 pl-2.5 flex items-center">
                  <div className="w-full text-[clamp(8px,1vw,9px)] font-medium italic text-white/68 leading-snug line-clamp-2">
                    {compactLyric || 'Lyric sync loading…'}
                  </div>
                </div>

                <div
                  className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative no-drag cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    const total = currentTrack.totalDurationMs || currentTrack.duration || 0;
                    handleSeek(pos * total);
                  }}
                >
                  <div className="absolute inset-y-0 left-0 bg-brand-accent shadow-[0_0_10px_rgba(0,255,191,0.55)]" style={{ width: `${(currentTime / (currentTrack.totalDurationMs || currentTrack.duration || 1)) * 100}%` }} />
                </div>

                <div className="flex items-center justify-between mt-1 text-[clamp(7px,1vw,8px)] font-mono text-white/45 tracking-wide">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(currentTrack.totalDurationMs || currentTrack.duration || 0)}</span>
                </div>

                <div className="flex items-center gap-4 mt-1.5 no-drag shrink-0 text-white/50">
                  <button onClick={() => handleControl('previous')} className="hover:text-white transition-colors"><Rewind size={14} fill="currentColor" /></button>
                  <button onClick={() => handleControl(isPlaying ? 'pause' : 'resume')} className="w-8 h-8 rounded-full bg-brand-accent hover:bg-white text-black flex items-center justify-center transition-all shadow-[0_0_14px_rgba(0,255,191,0.25)] hover:scale-105 active:scale-95 border border-brand-accent/40">
                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button onClick={() => handleControl('skip')} className="hover:text-white transition-colors"><FastForward size={14} fill="currentColor" /></button>
                </div>
              </div>
              <button onClick={toggleMiniPlayer} className="absolute top-2 right-2 p-1.5 rounded-lg text-white/35 hover:text-brand-accent no-drag transition-colors active:scale-90" title="Expand"><AppWindow size={13} /></button>
            </>
           ) : (
              <div className="w-full text-center text-xs font-medium text-white/50 tracking-wide flex flex-col items-center justify-center h-full relative z-10">
                 <div className="absolute top-2 right-2 p-1.5 text-white/25 hover:text-brand-accent no-drag cursor-pointer transition-colors" onClick={toggleMiniPlayer}><AppWindow size={13} /></div>
                 <div>No signal detected</div>
              </div>
           )}
          </div>
        </div>
     );
  }

  const isAuraMode = visualizerMode === 'pulse';
  const topHeaderClass = isAuraMode
    ? 'h-16 md:h-16 border-b border-white/[0.12] bg-[#07090c]/70 backdrop-blur-3xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] z-50 px-4 pl-20 flex flex-row items-center justify-between gap-4 compact-header drag flex-none'
    : 'h-16 md:h-16 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-3xl z-50 px-4 pl-20 flex flex-row items-center justify-between gap-4 compact-header drag flex-none';
  const panelGlassClass = isAuraMode
    ? 'bg-white/[0.015] border-white/[0.12] backdrop-blur-[26px] shadow-[0_20px_80px_rgba(0,0,0,0.28)]'
    : 'bg-white/[0.03] border-white/5';
  const panelHeaderClass = isAuraMode
    ? 'bg-white/[0.03]'
    : 'bg-white/[0.02]';
  const panelInteractiveClass = isAuraMode
    ? 'hover:border-brand-accent/35 hover:shadow-[0_18px_60px_rgba(0,255,191,0.08)] hover:-translate-y-[1px]'
    : 'hover:border-brand-accent/20';
  const immersiveBeatIntensity = clamp01((uiPulse - 1) / 0.06);
  const diagnosticsApiBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
  const queuePollDisplay = isStandalone ? 'local' : `${diagnostics.lastQueueFetchMs ?? '—'}ms`;
  const queuePollTime = isStandalone ? 'direct engine' : formatDiagTime(diagnostics.lastQueueFetchAt);

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
        <div className={`absolute inset-0 ${isAuraMode ? 'bg-brand-dark/10' : 'bg-brand-dark/20'}`} />
        <div className={`absolute inset-0 ${isAuraMode ? 'bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.30)_100%)]' : 'bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,0.38)_100%)]'}`} />
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-accent/5 blur-[100px] rounded-full animate-pulse-glow" />
         <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-brand-accent/10 blur-[80px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* APP HEADER */}
      <header className={topHeaderClass}>
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] font-mono text-brand-accent/60 font-black tracking-[0.2em] uppercase">{BUILD_VERSION}</span>
                    <span className="text-[7px] font-mono text-brand-accent/80 font-black tracking-[0.16em] uppercase px-1.5 py-[1px] rounded-full border border-brand-accent/30 bg-brand-accent/10">{UX_VERSION}</span>
                  </div>
                </div>
            </div>
            

            <div className="hidden xl:flex items-center gap-3 pl-4 border-l border-white/5 h-8 no-drag text-[9px]">
               <div className="flex items-center gap-3 border-l border-white/10 pl-3">
                  <button 
                    onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all border text-[8px] ${isStatsExpanded ? 'bg-brand-accent/10 border-brand-accent/30' : 'bg-white/5 border-white/10 hover:border-brand-accent/50 group'}`}
                  >
                    <Activity size={10} className={isStatsExpanded ? 'text-brand-accent animate-pulse' : 'text-brand-text-dim group-hover:text-brand-accent'} />
                    <span className={`font-black uppercase tracking-tighter ${isStatsExpanded ? 'text-brand-accent' : 'text-brand-text-dim'}`}>
                      {isStatsExpanded ? 'HUD' : 'Stats'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isStatsExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.95 }}
                        className="flex items-center gap-3 py-1 px-3 bg-white/[0.03] border border-white/5 rounded-lg text-[7px]"
                      >
                        <div className="flex flex-col">
                           <div className="font-mono text-brand-text-dim uppercase tracking-tighter leading-none mb-0.5">CPU</div>
                           <div className="font-black font-mono text-brand-accent leading-none">{systemStats?.appCpu || '0.0'}%</div>
                        </div>
                        <div className="w-[1px] h-2 bg-white/10" />
                        <div className="flex flex-col">
                           <div className="font-mono text-brand-text-dim uppercase tracking-tighter leading-none mb-0.5">RAM</div>
                            <div className="font-black font-mono text-brand-accent leading-none">{systemStats?.appMem || '0'}MB</div>
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
                className={`w-full rounded-full pl-14 pr-10 h-11 text-sm outline-none transition-all ${isAuraMode ? 'bg-white/[0.035] border border-white/[0.14] focus:border-brand-accent/60 focus:bg-brand-accent/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.2)]' : 'bg-white/5 border border-white/10 focus:border-brand-accent/50 focus:bg-brand-accent/[0.03]'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && <div className="absolute right-5 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-brand-accent" size={16} /></div>}
            </form>
          </div>

          {/* MODES & SUITE */}
          <div className="flex items-center justify-end gap-3 min-w-fit order-3 no-drag">
               {isStandalone && (
                 <button
                   onClick={toggleMiniPlayer}
                   className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all border no-drag ${isMiniPlayer ? 'bg-brand-accent border-brand-dark text-brand-dark shadow-neon-strong' : 'bg-white/5 border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/50'}`}
                   title="Toggle Mini Player (Shift+M)"
                 >
                   <AppWindow size={16} />
                 </button>
               )}

               <button
                 onClick={toggleDiagnostics}
                 className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all border no-drag ${isDiagnosticsOpen ? 'bg-brand-accent border-brand-dark text-brand-dark shadow-neon-strong' : 'bg-white/5 border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/50'}`}
                 title={isDiagnosticsOpen ? 'Hide Diagnostics' : 'Show Diagnostics'}
               >
                 <Monitor size={16} />
               </button>

               {isStandalone && (
                 <button
                   onClick={toggleWindowMaximize}
                   className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all border no-drag ${isMaximized ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : 'bg-white/5 border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/50'}`}
                   title={isMaximized ? 'Restore Window' : 'Maximize Window'}
                 >
                   {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                 </button>
               )}

               {isStandalone && (
                 <button
                   onClick={() => { setLockError(''); setIsLockModalOpen(true); }}
                   className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all border no-drag ${lockStatus.enabled ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : 'bg-white/5 border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/50'}`}
                   title="App Lock"
                 >
                   <Lock size={16} />
                 </button>
               )}

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

      <AnimatePresence>
        {isDiagnosticsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="fixed right-4 md:right-6 top-20 z-[140] w-[min(92vw,420px)] max-h-[78vh] overflow-y-auto glass-card bg-[#07090c]/90 border border-white/10 backdrop-blur-2xl rounded-3xl p-4 md:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-[0.24em] uppercase font-black text-brand-accent">Diagnostics</div>
              <button onClick={() => setIsDiagnosticsOpen(false)} className="text-white/40 hover:text-brand-accent transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleResetPlaybackEngine}
                className="px-3 py-1.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent text-[10px] font-black uppercase tracking-[0.16em] hover:bg-brand-accent/20 transition-all"
              >
                Reset Engine
              </button>
              <button
                onClick={() => setSkipEvents([])}
                className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 text-[10px] font-black uppercase tracking-[0.16em] hover:border-white/30 transition-all"
              >
                Clear Skip Log
              </button>
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
                <div className="text-white/40 uppercase mb-1">API Base</div>
                <div className="font-black text-white/70 truncate">{diagnosticsApiBase}</div>
              </div>

              {isStandalone && (
                <>
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
                        <input
                          type="number"
                          min={256}
                          max={16384}
                          value={storagePolicy.cacheCapMb}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value || '2048', 10);
                            setStoragePolicy(prev => ({ ...prev, cacheCapMb: Number.isFinite(parsed) ? Math.max(256, parsed) : 2048 }));
                          }}
                          className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
                        />
                      </label>
                      <label className="text-white/55">
                        Age cleanup (days)
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={storagePolicy.maxCacheAgeDays}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value || '30', 10);
                            setStoragePolicy(prev => ({ ...prev, maxCacheAgeDays: Number.isFinite(parsed) ? Math.max(1, parsed) : 30 }));
                          }}
                          className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={isStorageBusy}
                        onClick={async () => { await applyStoragePolicy(storagePolicy); await refreshStorageStats(); }}
                        className="px-2 py-1 rounded-lg border border-brand-accent/30 text-brand-accent bg-brand-accent/10 disabled:opacity-50"
                      >
                        Save Policy
                      </button>
                      <button
                        disabled={isStorageBusy}
                        onClick={() => runStorageOptimize('cap')}
                        className="px-2 py-1 rounded-lg border border-white/15 text-white/75 bg-white/[0.03] disabled:opacity-50"
                      >
                        Trim to Cap {storageEstimate.cap ? `(${formatBytes(storageEstimate.cap.estimatedBytes)})` : ''}
                      </button>
                      <button
                        disabled={isStorageBusy}
                        onClick={() => runStorageOptimize('age')}
                        className="px-2 py-1 rounded-lg border border-white/15 text-white/75 bg-white/[0.03] disabled:opacity-50"
                      >
                        Clean Old Cache {storageEstimate.age ? `(${formatBytes(storageEstimate.age.estimatedBytes)})` : ''}
                      </button>
                      <button
                        disabled={isStorageBusy}
                        onClick={() => runStorageOptimize('downloads-only')}
                        className="px-2 py-1 rounded-lg border border-yellow-500/30 text-yellow-300 bg-yellow-500/10 disabled:opacity-50"
                      >
                        Keep Downloaded Only {storageEstimate.downloadsOnly ? `(${formatBytes(storageEstimate.downloadsOnly.estimatedBytes)})` : ''}
                      </button>
                      <button
                        disabled={isStorageBusy}
                        onClick={async () => { await refreshStorageStats(); await refreshStorageEstimate(); }}
                        className="px-2 py-1 rounded-lg border border-white/15 text-white/60 bg-white/[0.02] disabled:opacity-50"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </>
              )}

              {(diagnostics.lastQueueError || diagnostics.lastSystemError || diagnostics.lastLyricsError) && (
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 col-span-2">
                  <div className="text-red-300 uppercase mb-1">Last Error</div>
                  <div className="font-black text-red-200/90 truncate">{diagnostics.lastQueueError || diagnostics.lastSystemError || diagnostics.lastLyricsError}</div>
                </div>
              )}

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                <div className="text-white/40 uppercase mb-1">Recent Skip Events</div>
                <div className="space-y-1 max-h-24 overflow-auto pr-1">
                  {skipEvents.length === 0 ? (
                    <div className="text-white/35">No skip events captured.</div>
                  ) : (
                    skipEvents.slice(-6).reverse().map((event, idx) => (
                      <div key={`${event.at || 0}-${idx}`} className="text-white/70 truncate">
                        <span className="text-brand-accent">{new Date(event.at || Date.now()).toLocaleTimeString()}</span>
                        {' • '}
                        <span>{event.reason}</span>
                        {' • '}
                        <span className="text-white/45">{event.title || 'Unknown'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <motion.main 
        className={`flex-1 relative z-10 w-full mb-0 min-h-0 px-4 md:px-6 py-4 ${isVerticalStack ? '!flex !flex-col !gap-8 overflow-y-auto scroll-smooth pb-20 custom-scrollbar' : 'flex flex-row gap-4 overflow-hidden'}`}
        style={{ scale: isAuraMode ? uiPulse : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        
        {/* PLAYER & LYRICS PILLAR */}
        <div className={`flex flex-col gap-4 min-w-0 overflow-hidden ${isVerticalStack ? '!w-full !max-w-full !flex-none' : (isFocusedMode ? 'w-full px-0' : 'w-[66.666%] h-full')}`}>
          
          {/* PLAYER CARD */}
          <div className={`glass-card flex relative overflow-hidden group shrink-0 transition-all duration-700 p-6 md:p-8 flex-col sm:flex-row gap-8 md:gap-10 min-h-[300px] flex-none rounded-[3.5rem] shadow-2xl transition-all ${isAuraMode ? 'bg-white/[0.015] border-white/[0.14] backdrop-blur-[30px] shadow-[0_24px_90px_rgba(0,0,0,0.32)]' : 'border-white/5'}`}>
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
                    <div className={`w-full flex flex-col gap-2 px-2 p-3 rounded-2xl border ${isAuraMode ? 'bg-white/[0.03] border-white/[0.14] backdrop-blur-xl' : 'bg-white/5 border-white/5'}`}>
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
                             <div className="label-caps mb-0 text-brand-accent/60 text-[9px] flex items-center gap-2 tracking-[0.28em] uppercase font-black">
                              <span className="w-1 h-1 rounded-full bg-brand-accent animate-pulse" />
                               {isAudioBuffering ? "Buffering" : "Now Playing"}
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
                           
                           <div className={`flex items-center backdrop-blur-3xl border p-2 rounded-3xl gap-4 relative z-10 ${isAuraMode ? 'bg-white/[0.04] border-white/[0.16] shadow-[0_12px_40px_rgba(0,0,0,0.22)]' : 'bg-white/5 border-white/5'}`}>
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
          <div className={`glass-card overflow-hidden flex flex-col transition-all duration-300 min-h-0 ${panelGlassClass} ${panelInteractiveClass} ${isVerticalStack ? 'h-[400px] flex-none' : 'flex-1'}`}>
            <div className={`border-b border-white/5 flex items-center justify-between ${panelHeaderClass} ${isVerticalStack ? 'px-3 py-2' : 'px-5 py-4'}`}>
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
                 <button
                   onClick={handleSaveLyricPreset}
                   className={`hidden md:flex items-center gap-1 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${isLyricPresetSaved ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent' : 'bg-white/5 border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/40'}`}
                   title="Save current sync offset for this track"
                 >
                   <Save size={10} /> {isLyricPresetSaved ? 'Saved' : 'Save'}
                 </button>
                 <button
                   onClick={handleResetLyricPreset}
                   className="hidden md:flex items-center gap-1 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all bg-white/5 border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/40"
                   title="Reset sync for this track"
                 >
                   <RotateCcw size={10} /> Reset
                 </button>
                  {!isStandalone && <button onClick={() => {
                    const guildId = getEffectiveGuildId();
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
                  onClick={handleResyncLyrics}
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
            <div className={`${isVerticalStack ? 'h-[400px]' : 'h-[160px]'} flex-none glass-card flex flex-col overflow-hidden transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass}`}>
            <div className={`p-3 border-b border-white/5 flex items-center justify-between ${panelHeaderClass}`}>
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
          <div className={`${isVerticalStack ? 'h-[400px]' : 'h-[160px]'} flex-none glass-card flex flex-col overflow-hidden transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass}`}>
            <div className={`p-3 border-b border-white/5 flex items-center justify-between ${panelHeaderClass}`}>
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
            <div className={`glass-card flex flex-col overflow-hidden studio-vault-container relative shadow-inner library-panel transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass} ${isVerticalStack ? 'min-h-[500px] flex-none' : 'h-full min-h-0'}`}>
            <div className={`p-3 border-b border-white/5 flex items-center justify-between ${panelHeaderClass}`}>
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
                          <button onClick={handleGenerateSmartMix} className="p-1 text-white/40 hover:text-brand-accent transition-colors" title="Generate Smart Mix"><Zap size={14} /></button>
                          <button onClick={handleCleanVault} disabled={isVaultCleaning} className="p-1 text-white/40 hover:text-brand-accent transition-colors disabled:opacity-40" title="Clean Vault (dedupe + remove unavailable + normalize metadata)"><RefreshCw size={14} className={isVaultCleaning ? 'animate-spin' : ''} /></button>
                          <button onClick={() => setIsCreatingPlaylist(true)} className="p-1 hover:text-brand-accent transition-colors" title="Create New Vault"><Plus size={16} /></button>
                            <button onClick={() => { setSpotifyImportUrl(''); setSpotifyImportProgress({ stage: 'idle', progress: 0, message: '' }); setSpotifyImportLogs([]); setIsSpotifyImportOpen(true); }} className="p-1 text-white/40 hover:text-brand-accent transition-colors" title="Import Spotify Playlist"><Music size={14} /></button>
                          <button onClick={handleImportVault} className="p-1 text-white/40 hover:text-brand-accent transition-colors" title="Import Vault (.aether)"><Upload size={14} /></button>
                       </div> 
                    )}
                </div>
            </div>
            <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex flex-wrap items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Nodes</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">{libraryInsights.unique} unique</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">{libraryInsights.total} total</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">{libraryInsights.duplicates} dupes</span>
              {libraryInsights.topArtists.length > 0 && (
                <span className="text-[8px] font-mono text-white/40 ml-1 truncate">Top: {libraryInsights.topArtists.map(([artist]) => artist).join(' • ')}</span>
              )}
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
        {sessionRestoreNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 text-white font-black rounded-2xl border border-brand-accent/30 backdrop-blur-xl z-[210] flex items-center gap-3"
          >
            <Clock size={14} className="text-brand-accent" />
            <span className="text-[10px] uppercase tracking-[0.2em]">{sessionRestoreNotice}</span>
          </motion.div>
        )}

        {skipReasonToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="fixed right-5 bottom-24 px-4 py-2 bg-black/70 text-brand-accent font-mono rounded-xl border border-brand-accent/30 backdrop-blur-xl z-[210]"
          >
            <span className="text-[10px] uppercase tracking-[0.16em]">skip: {skipReasonToast}</span>
          </motion.div>
        )}

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
            className="fixed inset-0 z-[200] bg-brand-dark/95 backdrop-blur-[20px] bg-black/80 flex flex-col p-4 pt-10 md:p-8 overflow-hidden overflow-x-hidden"
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

               <div className="flex-1 overflow-y-scroll overflow-x-hidden flex flex-col px-4 md:px-10 custom-scrollbar-heavy w-full relative" ref={expandedContainerRef} style={{ minHeight: "0px" }}>
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    animate={{
                      opacity: 0.15 + immersiveBeatIntensity * 0.4,
                      scale: 1 + immersiveBeatIntensity * 0.3,
                    }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    style={{
                      width: 'min(84vw, 980px)',
                      height: 'min(84vw, 980px)',
                      background: `radial-gradient(circle, ${themeColor}${alphaHex(0.2)} 0%, ${themeColor}${alphaHex(0.09)} 35%, transparent 70%)`,
                      filter: `blur(${40 + immersiveBeatIntensity * 30}px)`,
                    }}
                  />

                  <div className="flex flex-col gap-24 lg:gap-32 py-[45vh] items-center text-center w-full mx-auto cursor-default">
                    {lyrics.map((line, idx) => {
                      const isActive = idx === activeLyricIndex;
                      const lyricLineLayoutClass = 'text-3xl sm:text-5xl lg:text-6xl max-w-[min(74vw,920px)]';
                      return (
                        <div
                          key={idx} 
                          ref={isActive ? expandedActiveRef : null} 
                          className={`${lyricLineLayoutClass} px-4 md:px-6 font-black transition-all duration-700 transform-gpu origin-center leading-tight w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere] z-20 ${
                            isActive 
                              ? 'scale-125 opacity-100 text-[#00ffbf] drop-shadow-[0_0_40px_rgba(0,255,191,0.8)]'
                              : 'scale-100 opacity-30 text-white/20'
                          }`}
                          style={{ textWrap: 'balance' }}
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
                     onClick={handleResyncLyrics}
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

      <AnimatePresence>
        {isLockModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[245] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !isLockBusy && setIsLockModalOpen(false)} />
            <motion.div
              initial={{ y: 12, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, scale: 0.98, opacity: 0 }}
              className="relative z-10 w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#0a0a0a]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-accent">App Lock</div>
                  <div className="text-[11px] text-white/45 mt-1">Secure Aether with password and optional Touch ID.</div>
                </div>
                <button
                  onClick={() => !isLockBusy && setIsLockModalOpen(false)}
                  className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/40 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {lockStatus.enabled ? (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Status</div>
                      <div className="text-[12px] text-brand-accent font-black">Enabled</div>
                    </div>

                    {lockStatus.touchIdAvailable && (
                      <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer">
                        <span className="text-[11px] text-white/70">Use Touch ID</span>
                        <input
                          type="checkbox"
                          checked={lockUseTouchId}
                          onChange={(e) => handleToggleTouchIdLock(e.target.checked)}
                          className="accent-brand-accent"
                        />
                      </label>
                    )}

                    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-white/70">Idle auto-lock</span>
                        <span className="text-[11px] font-black text-brand-accent">{lockIdleMinutes}m</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={60}
                        step={1}
                        value={lockIdleMinutes}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value || '5', 10);
                          setLockIdleMinutes(Number.isFinite(parsed) ? Math.max(1, parsed) : 5);
                        }}
                        className="w-full accent-brand-accent"
                      />
                    </label>

                    <input
                      type="password"
                      value={lockDisablePassword}
                      onChange={(e) => setLockDisablePassword(e.target.value)}
                      placeholder="Enter password to disable lock"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50"
                    />
                    <button
                      onClick={handleDisableLock}
                      disabled={isLockBusy || !lockDisablePassword}
                      className="w-full px-5 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 font-black text-sm disabled:opacity-50"
                    >
                      Disable Lock
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="password"
                      value={lockPasswordInput}
                      onChange={(e) => setLockPasswordInput(e.target.value)}
                      placeholder="Set password"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50"
                    />
                    <input
                      type="password"
                      value={lockPasswordConfirm}
                      onChange={(e) => setLockPasswordConfirm(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50"
                    />
                    {lockStatus.touchIdAvailable && (
                      <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer">
                        <span className="text-[11px] text-white/70">Enable Touch ID unlock</span>
                        <input
                          type="checkbox"
                          checked={lockUseTouchId}
                          onChange={(e) => setLockUseTouchId(e.target.checked)}
                          className="accent-brand-accent"
                        />
                      </label>
                    )}
                    <button
                      onClick={handleEnableLock}
                      disabled={isLockBusy || !lockPasswordInput || !lockPasswordConfirm}
                      className="w-full px-5 py-2.5 rounded-xl bg-brand-accent text-black font-black text-sm disabled:opacity-50"
                    >
                      Enable Lock
                    </button>
                  </>
                )}

                {lockStatus.enabled && (
                  <button
                    onClick={() => { setIsAppLocked(true); setIsLockModalOpen(false); }}
                    className="w-full px-5 py-2.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent font-black text-sm"
                  >
                    Lock Now
                  </button>
                )}

                {lockError && <div className="text-[11px] text-red-400">{lockError}</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSpotifyImportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[240] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !isSpotifyImporting && setIsSpotifyImportOpen(false)} />
            <motion.div
              initial={{ y: 16, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, scale: 0.98, opacity: 0 }}
              className="relative z-10 w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#0a0a0a]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-accent">Spotify Import</div>
                  <div className="text-[11px] text-white/45 mt-1">Paste a public playlist URL and match it into Aether.</div>
                </div>
                <button
                  onClick={() => !isSpotifyImporting && setIsSpotifyImportOpen(false)}
                  className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/40 transition-all"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Playlist URL</label>
                  <input
                    value={spotifyImportUrl}
                    onChange={(e) => setSpotifyImportUrl(e.target.value)}
                    disabled={isSpotifyImporting}
                    placeholder="https://open.spotify.com/playlist/..."
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50 focus:bg-brand-accent/[0.04] transition-all disabled:opacity-60"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Progress</span>
                    <span className="text-[10px] font-mono text-brand-accent/80">{Math.max(0, Math.min(100, spotifyImportProgress.progress || 0))}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${spotifyImportProgress.stage === 'error' ? 'bg-red-500' : 'bg-brand-accent'}`}
                      style={{ width: `${Math.max(4, Math.min(100, spotifyImportProgress.progress || 0))}%` }}
                    />
                  </div>
                  <div className="mt-3 text-[11px] text-white/60 min-h-[1.5em]">
                    {spotifyImportProgress.message || (isSpotifyImporting ? 'Preparing import…' : 'Ready to import.')}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Debug Log</div>
                  <div className="max-h-28 overflow-auto space-y-1 pr-1">
                    {spotifyImportLogs.length === 0 ? (
                      <div className="text-[10px] text-white/35">No logs yet.</div>
                    ) : spotifyImportLogs.map((line, idx) => (
                      <div key={`${line}-${idx}`} className="text-[10px] leading-4 font-mono text-white/55 break-words">{line}</div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    onClick={() => { if (!isSpotifyImporting) setIsSpotifyImportOpen(false); }}
                    className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportSpotifyPlaylist}
                    disabled={isSpotifyImporting || !spotifyImportUrl.trim()}
                    className="px-5 py-2 rounded-xl bg-brand-accent text-brand-dark font-black text-sm hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isSpotifyImporting ? 'Importing…' : 'Import Playlist'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isMixtapeVaultOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setIsMixtapeVaultOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              ref={mixtapeVaultRef}
              style={{
                '--vault-bass': vaultPulse.bass,
                '--vault-mids': vaultPulse.mids,
                '--vault-highs': vaultPulse.highs,
                '--vault-energy': vaultPulse.energy,
                '--vault-scale': 1 + (vaultPulse.energy * 0.1),
                '--vault-spin': `${vaultPulse.spin}deg`,
                '--vault-glow': vaultPulse.energy,
              }}
              className="relative w-[min(92vw,680px)] rounded-3xl border border-brand-accent/30 bg-[#07090c]/95 shadow-[0_0_70px_rgba(0,255,191,0.15)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsMixtapeVaultOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-brand-accent transition-colors z-50"
              >
                <X size={20} />
              </button>

              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl border border-brand-accent/40 bg-brand-accent/10">
                    <Music size={18} className="text-brand-accent" />
                  </div>
                  <div>
                    <h2 className="text-brand-accent font-black text-xl tracking-[0.18em] uppercase leading-none">Mixtape Vault</h2>
                    <span className="text-white/45 text-[9px] font-mono tracking-[0.2em] uppercase">SECRET_MODE // ANALOG_NIGHT</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5 md:p-6">
                  <div className="flex items-center justify-center mb-6">
                    <motion.div
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="w-40 h-40 rounded-full border border-brand-accent/35 bg-[radial-gradient(circle_at_center,rgba(0,255,191,0.22)_0%,rgba(0,255,191,0.08)_25%,rgba(10,10,10,0.92)_26%,rgba(20,20,20,0.95)_55%,rgba(0,255,191,0.08)_100%)] relative will-change-transform"
                      style={{
                        transform: `rotate(${vaultPulse.spin}deg) scale(${1 + (vaultPulse.energy * 0.14)})`,
                        transition: 'transform 90ms linear, box-shadow 120ms ease',
                        boxShadow: `0 0 ${24 + (vaultPulse.energy * 40)}px rgba(0,255,191,${0.16 + vaultPulse.bass * 0.28})`,
                      }}
                    >
                      <div
                        className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-brand-accent/80"
                        style={{
                          transform: `scale(${1 + (vaultPulse.bass * 0.4) + (vaultPulse.energy * 0.12)})`,
                          boxShadow: `0 0 ${18 + (vaultPulse.highs * 26)}px rgba(0,255,191,${0.45 + vaultPulse.highs * 0.35})`,
                        }}
                      />
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-8 gap-1 items-end h-16 mb-4">
                    {[
                      10 + (vaultPulse.bass * 42),
                      12 + (vaultPulse.mids * 30),
                      14 + (vaultPulse.highs * 36),
                      18 + (vaultPulse.energy * 48),
                      12 + (vaultPulse.bass * 28),
                      24 + (vaultPulse.energy * 54),
                      16 + (vaultPulse.mids * 34),
                      18 + (vaultPulse.highs * 40),
                    ].map((h, idx) => (
                      <motion.div
                        key={idx}
                        animate={{ height: [h * 0.55, h, h * 0.7, h * 0.95] }}
                        transition={{ duration: 0.9 + idx * 0.08, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                        className="rounded-md bg-brand-accent/70"
                        style={{ opacity: 0.55 + vaultPulse.energy * 0.4 }}
                      />
                    ))}
                  </div>

                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">Now Spinning</div>
                    <div className="font-black text-brand-accent mt-1">{currentTrack?.title || 'Aether Secret Session'}</div>
                    <div className="text-[11px] text-white/55 mt-1">Type <span className="text-brand-accent font-black">mixtape</span> to summon this vault.</div>
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          onClick={copyVaultSceneEmbed}
                          className="px-4 py-2 rounded-full border border-brand-accent/30 bg-brand-accent/10 text-[10px] uppercase tracking-[0.24em] text-brand-accent hover:bg-brand-accent hover:text-black transition-all"
                        >
                          Copy Scene Link
                        </button>
                      </div>
                      <div className="text-[10px] text-white/40 font-mono uppercase tracking-[0.18em]">
                        {currentTrack?.title ? `${currentTrack.title} • ${vaultPulse.stamp}` : vaultPulse.stamp}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSharedSceneOpen && sharedScene && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setIsSharedSceneOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="relative w-[min(92vw,760px)] rounded-3xl border border-brand-accent/30 bg-[#07090c]/95 shadow-[0_0_70px_rgba(0,255,191,0.15)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsSharedSceneOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-brand-accent transition-colors z-50"
              >
                <X size={20} />
              </button>
              <div className="p-6 md:p-8">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent mb-4">Aether Shared Scene</div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-5 flex flex-col md:flex-row gap-4 md:gap-5">
                  <img
                    src={getProxyUrl(sharedScene.thumbnail || (sharedScene.youtubeId ? `https://i.ytimg.com/vi/${sharedScene.youtubeId}/hqdefault.jpg` : ''))}
                    alt="scene"
                    className="w-full md:w-40 h-40 rounded-2xl object-cover border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-brand-accent text-lg truncate">{sharedScene.title || 'Aether Scene'}</div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/55 mt-1 truncate">{sharedScene.author || 'Unknown Artist'}</div>
                    <div className="mt-4 text-white/80 text-sm leading-relaxed italic break-words">“{sharedScene.lyric || 'No lyric locked yet'}”</div>
                    <div className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/45">
                      {formatTime(Number(sharedScene.at || 0))} / {formatTime(Number(sharedScene.total || 0))} • {sharedScene.state || 'paused'} • {sharedScene.mode || 'bars'}
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Pulse {Number(sharedScene?.pulse?.e || 0)}% • Bass {Number(sharedScene?.pulse?.b || 0)}% • Mids {Number(sharedScene?.pulse?.m || 0)}% • Highs {Number(sharedScene?.pulse?.h || 0)}%
                    </div>
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
            className={`w-[800px] h-[800px] transition-opacity duration-1000 ${visualizerMode === 'pulse' ? 'opacity-55' : 'opacity-0'}`} 
            />
         </div>
         <div className="absolute inset-0 bg-black/60" />
            </div>
    </div>
  );
}

export default App;