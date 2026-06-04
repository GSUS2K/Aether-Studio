import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, startTransition, memo, forwardRef, useImperativeHandle, Profiler } from 'react';
import { Play, Pause, SkipForward, Search, Plus, Loader2, ListMusic, Music, Globe, User, UserPlus, BookOpen, Trash2, Rewind, FastForward, ExternalLink, ChevronLeft, ChevronRight, Zap, X, HardDrive, Activity, Radio, Signal, Wifi, Clock, Maximize2, Minimize2, RotateCcw, AlertTriangle, RefreshCw, Monitor, Target, AppWindow, Volume2, VolumeX, Shuffle, Download, Upload, Save, Lock, Fingerprint, Keyboard, Edit3, PlusCircle, MinusCircle, Sparkles, Clapperboard, Columns2, Repeat, MessageSquare, Send, Layers, Eye, EyeOff, Hand, MousePointer2, Camera, Copy, Check, Heart, Link2, Users, SlidersHorizontal, Home } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { setupDiscordSdk } from '../discord';
import axios from 'axios';
import { APP_VERSION, BUILD_VERSION, UX_VERSION } from '../buildVersion';
import { buildLibrarySearchIndex, persistLibraryIndexSnapshot } from '../libraryIndex';
import { AetherConfirmDialog, HealthMetricCard, SecondaryNowPlayingStrip, ShortcutHint } from '../components/common/AetherUi';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { ToastPortal } from '../components/common/ToastPortal';
import { CommandPalette } from '../components/common/CommandPalette';
import { QueueBufferHeader } from '../components/player/QueueBufferHeader';
import { MixtapeVaultContent } from '../components/mixtape/MixtapeVault';
import { HeaderSearchBox, HeaderSleepTimerControls, HeaderVisualControls } from '../components/header/HeaderControls';
import { ExperienceCenterShell } from '../components/experience/ExperienceCenter';
import { StudioLibraryOverlayIsland } from '../components/library/StudioLibraryOverlay';
import { AetherHome } from '../components/home/AetherHome';
import { LyricLineIsland, PlaybackProgressIsland, PlayerActionButtons, PlayerModePill, PlayerTransportControls } from '../components/player/PlayerControls';
import { FullPlaylistOverlay, FullQueueOverlay } from '../components/player/QueuePlaylistOverlays';
import { AppLockSettingsIsland, FeedbackIsland, GestureLabIsland, SignalLedgerIsland } from '../components/tools/ToolIslands';
import { DiscoveryGridSection, LibraryPlaylistRowsGrid, LibrarySongRowsGrid, OfflineAvailablePanel } from '../components/library/LibraryPanels';
import { YouTubeAuthOverlay } from '../components/overlays/YouTubeAuthOverlay';
import { AETHER_PROFILE_API_BASE, AETHER_PROFILE_STORAGE_KEY, AETHER_SHARE_ORIGIN, API_BASE, AURA_PRESETS, AURA_PRESETS_MAP, AUTOPLAY_MOOD_MODES, DEFAULT_FEEDBACK_DRAFT, DEFAULT_GUILD_ID, DOODLE_PRESETS, FAVORITES_PLAYLIST_ID, FAVORITES_PLAYLIST_NAME, FAVORITES_STORAGE_KEY, FEEDBACK_ISSUE_URL, FEEDBACK_STORAGE_KEY, GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, IDLE_PHRASES, LOCK_PREFS_STORAGE_KEY, LYRIC_PRESETS_STORAGE_KEY, MANUAL_LYRICS_STORAGE_KEY, PERFORMANCE_MODES, PLAYBACK_GENRE_SIGNALS, PLAYBACK_LEDGER_STORAGE_KEY, PLAYLIST_ORDER_STORAGE_KEY, SESSION_PLAYBACK_STORAGE_KEY, SESSION_UI_STORAGE_KEY, SHORTCUTS_STORAGE_KEY, SKIP_EVENTS_STORAGE_KEY } from '../config/aetherConfig';
import { buildCanonicalShortcutCombo, DEFAULT_SHORTCUTS, getCommandPaletteShortcutLabel, getEventKeyToken, getKeyboardEventElement, getReservedShortcutCombos, isNativeKeyboardTarget, isParsedShortcutEventMatch, isShortcutEventMatch, parseShortcutCombo, sanitizeShortcutMap, SHORTCUT_FIELDS, toReadableShortcut } from '../utils/shortcuts';
import { formatBytes, formatTime, parseLyricOffsetValue } from '../utils/format';
import { formatManualLyricsTimestamp, manualLyricsLinesToLrc, parseManualLyricsLrcText, parseManualLyricsTimestamp, sortManualLyricsLines } from '../utils/manualLyrics';
import { decodeScenePayload, encodeScenePayload, extractSceneYouTubeId, normalizeScenePayload } from '../utils/sceneShare';
import { alphaHex, buildTrackPaletteFromRgb, clamp01, DEFAULT_TRACK_PALETTE, deriveFallbackPulse, hashStringToUnit, hslToRgb, lerp } from '../utils/visualMath';
import { loadYouTubeIframeApi } from '../utils/youtubeIframe';
import { extractYouTubeId } from '../utils/youtube';
import { clearSearchHistoryScope, normalizeSearchHistoryItem, pushSearchHistoryItem, readSearchHistory, removeSearchHistoryItem } from '../utils/searchHistory';
import { blobToDataUrl, createProfileShareCardBlob, downloadBlob, ensureAetherProfileCredentials, getProfileLink, readAetherProfile, resizeImageFileToDataUrl, sanitizeAetherProfile } from '../utils/profile';
import { createPlaybackLedgerData, getLocalDateKey, normalizePlaybackLedgerData, scoreLedgerPayload } from '../utils/playbackLedger';
import { readConfirmationSkipPrefs, resetConfirmationSkipPrefs, setConfirmationSkipPref } from '../utils/confirmationPrefs';
import { buildUniquePlaylistName } from '../utils/playlists';
import { inferToastTone } from '../utils/toast';
import { buildArtistCatalog, buildDiscoveryHome, buildSearchSuggestions, filterArtistTracks } from '../utils/discovery';
import catDoodlePeek from '../assets/cat-doodle-peek.svg';
import PartyMode from '../PartyMode';
import { buildAetherViewProps } from './buildAetherViewProps';
import { useSimpleVideoEngine } from './controllerEffects/useSimpleVideoEngine';
import { useWebYoutubePlayback } from './controllerEffects/useWebYoutubePlayback';
import { useStandaloneSessionBoot } from './controllerEffects/useStandaloneSessionBoot';
import { useStandalonePlaybackLoop } from './controllerEffects/useStandalonePlaybackLoop';
import { useAudioVisualizerLoop } from './controllerEffects/useAudioVisualizerLoop';
import { useDynamicThemeSync } from './controllerEffects/useDynamicThemeSync';
import { useFaceControlLoop } from './controllerEffects/useFaceControlLoop';
import { useGestureControlLoop } from './controllerEffects/useGestureControlLoop';
import { useKeyboardShortcutLayer } from './controllerEffects/useKeyboardShortcutLayer';
import { useVideoQueueResolver } from './controllerEffects/useVideoQueueResolver';
import { useStandaloneTeardownPersist } from './controllerEffects/useStandaloneTeardownPersist';
import { useBufferingRescue } from './controllerEffects/useBufferingRescue';
import { useDiscordActivitySync } from './controllerEffects/useDiscordActivitySync';
import { useDiscordQueueBridge } from './controllerEffects/useDiscordQueueBridge';
import { useCommandPaletteCommands } from './controllerSelectors/useCommandPaletteCommands';
import { useSoundLedgerView } from './controllerSelectors/useSoundLedgerView';
import { useLibraryVisibleSongEntries } from './controllerSelectors/useLibraryVisibleSongEntries';
import { useLibraryVisiblePlaylistNames } from './controllerSelectors/useLibraryVisiblePlaylistNames';
import { useInspectPlaylistSignal } from './controllerSelectors/useInspectPlaylistSignal';
import { useLibraryInsights } from './controllerSelectors/useLibraryInsights';
import { useOfflineAvailableTracks } from './controllerSelectors/useOfflineAvailableTracks';
import { useProfileStats } from './controllerSelectors/useProfileStats';
import { useLibrarySongEntries } from './controllerSelectors/useLibrarySongEntries';
import { useCloseTopmostOverlay } from './controllerActions/useCloseTopmostOverlay';
import { useAetherHandleControl } from './controllerActions/useAetherHandleControl';
import { createTriggerAutoplay } from './controllerActions/createTriggerAutoplay';
import { createImportLocalMediaAction } from './controllerActions/createImportLocalMediaAction';
import { useRunRuntimeRepairAction } from './controllerActions/useRunRuntimeRepairAction';
import { useUpdateAction } from './controllerActions/useUpdateAction';
import { useCopyProfileShareCardAction } from './controllerActions/useCopyProfileShareCardAction';
import { useEnableLockAction } from './controllerActions/useEnableLockAction';
import { useDisableLockAction } from './controllerActions/useDisableLockAction';
import { usePlaylistAddAllAction } from './controllerActions/usePlaylistAddAllAction';
import { useRemoveFromPlaylistAction } from './controllerActions/useRemoveFromPlaylistAction';
import { useDeletePlaylistAction } from './controllerActions/useDeletePlaylistAction';
import { useRenamePlaylistAction } from './controllerActions/useRenamePlaylistAction';
import { useClearAllDownloadedTracksAction } from './controllerActions/useClearAllDownloadedTracksAction';
import { useRemoveTrackEverywhereAction } from './controllerActions/useRemoveTrackEverywhereAction';
import { useStorageOptimizeAction } from './controllerActions/useStorageOptimizeAction';
import { useImportCookiesAction } from './controllerActions/useImportCookiesAction';
import { useAttemptFixesAction } from './controllerActions/useAttemptFixesAction';
import { useRemoveDownloadedByIdAction } from './controllerActions/useRemoveDownloadedByIdAction';
import { createUpdateDiscordRichPresenceAction } from './controllerActions/createUpdateDiscordRichPresenceAction';
import { createSearchAction } from './controllerActions/createSearchAction';
import { createImportVaultAction } from './controllerActions/createImportVaultAction';
import { createFetchQueueAction } from './controllerActions/createFetchQueueAction';
import { createWarmupTrackAction } from './controllerActions/createWarmupTrackAction';
import { createHandleAddAction } from './controllerActions/createHandleAddAction';
import { createFetchLyricsAction } from './controllerActions/createFetchLyricsAction';
import { useAddToPlaylistAction } from './controllerActions/useAddToPlaylistAction';
import { useSaveShortcutSettingsAction } from './controllerActions/useSaveShortcutSettingsAction';
import { usePersistHideFirstRunTipsAction } from './controllerActions/usePersistHideFirstRunTipsAction';
import { useSeekActivePlaybackAction } from './controllerActions/useSeekActivePlaybackAction';
import { usePublishAetherProfileAction } from './controllerActions/usePublishAetherProfileAction';
import { useResetPasswordFromRecoveryAction } from './controllerActions/useResetPasswordFromRecoveryAction';
import { useAdvanceQueueAction } from './controllerActions/useAdvanceQueueAction';
import { useSaveManualLyricsAction } from './controllerActions/useSaveManualLyricsAction';
import { useSwitchVideoModeAction } from './controllerActions/useSwitchVideoModeAction';
import { useResetPlaybackEngineAction } from './controllerActions/useResetPlaybackEngineAction';
import { useCopyVaultSceneEmbedAction } from './controllerActions/useCopyVaultSceneEmbedAction';
import { useExitVideoModeAction } from './controllerActions/useExitVideoModeAction';
import { useWebPlaybackFallbackAction } from './controllerActions/useWebPlaybackFallbackAction';
import { useSubmitFeedbackAction } from './controllerActions/useSubmitFeedbackAction';
import { createImportSpotifyPlaylistAction } from './controllerActions/createImportSpotifyPlaylistAction';
import { useLogSoundCapsulePlayback } from './controllerActions/useLogSoundCapsulePlayback';
import { useCleanVaultAction } from './controllerActions/useCleanVaultAction';
export function useAetherController() {
  // --- AETHER DEV PROFILER ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const measureLag = e => {
      if (!window.AETHER_DEV_PROFILE) return;
      const start = performance.now();
      requestAnimationFrame(() => {
        const lag = performance.now() - start;
        if (lag > 22) {
          console.warn(`[Aether Profiler] Input lag spike detected on ${e.type}: ${lag.toFixed(2)}ms render cycle delay.`, e.target);
        }
      });
    };
    window.addEventListener('mousedown', measureLag, {
      passive: true
    });
    window.addEventListener('keydown', measureLag, {
      passive: true
    });
    return () => {
      window.removeEventListener('mousedown', measureLag);
      window.removeEventListener('keydown', measureLag);
    };
  }, []);

  // React Profiler callback for tracking render performance
  const handleProfilerData = useCallback((id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    if (!window.AETHER_DEV_PROFILE) return;
    // Only log slow renders (>5ms)
    if (actualDuration > 5) {
      console.log(`[Aether React Profiler] ${id} (${phase}): ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`);
    }
  }, []);

  // --- App Lock Recovery (Electron only) ---
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [userError, setUserError] = useState('');
  const [lockRecoveryStatus, setLockRecoveryStatus] = useState({
    phrase: {
      enabled: false,
      createdAt: null
    }
  });
  const [lockRecoveryStatusError, setLockRecoveryStatusError] = useState('');
  const [recoverySetupError, setRecoverySetupError] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryNewPasswordConfirm, setRecoveryNewPasswordConfirm] = useState('');
  const [recoveryResetBusy, setRecoveryResetBusy] = useState(false);
  const [phraseBusy, setPhraseBusy] = useState(false);
  const [phraseGenerated, setPhraseGenerated] = useState('');
  const [phraseCopied, setPhraseCopied] = useState(false);

  // Clear ephemeral recovery state when modals close
  useEffect(() => {
    if (!isLockModalOpen) {
      setPhraseGenerated('');
      setPhraseCopied(false);
    }
  }, [isLockModalOpen]);
  const refreshLockRecoveryStatus = useCallback(async () => {
    if (!window.aether?.getLockRecoveryStatus) return;
    setLockRecoveryStatusError('');
    try {
      const res = await window.aether.getLockRecoveryStatus();
      if (res?.success) {
        setLockRecoveryStatus({
          phrase: res.phrase || {
            enabled: false,
            createdAt: null
          }
        });
      } else {
        setLockRecoveryStatusError(res?.error || 'Failed to load recovery status.');
      }
    } catch (e) {
      setLockRecoveryStatusError(e?.message || 'Failed to load recovery status.');
    }
  }, []);
  useEffect(() => {
    if (!window.aether?.getLockRecoveryStatus) return;
    refreshLockRecoveryStatus();
  }, [refreshLockRecoveryStatus]);
  const [auth, setAuth] = useState(null);
  const [aetherProfile, setAetherProfileState] = useState(readAetherProfile);
  const [isProfilePublishing, setIsProfilePublishing] = useState(false);
  const avatarFileInputRef = useRef(null);
  const setAetherProfile = useCallback(valueOrUpdater => {
    setAetherProfileState(prev => {
      const rawNext = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      const next = sanitizeAetherProfile(rawNext);
      try {
        localStorage.setItem(AETHER_PROFILE_STORAGE_KEY, JSON.stringify(next));
      } catch {/* ignore */}
      return next;
    });
  }, []);
  const discordSdkRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [warmingTrackIds, setWarmingTrackIds] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState('Unknown');
  const [isAudioBuffering, setIsAudioBuffering] = useState(false);
  const [isAutoplaySeeking, setIsAutoplaySeeking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [lyricOffsetMs, setLyricOffsetMs] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [manualLyricsStore, setManualLyricsStore] = useState({});
  const manualLyricsStoreRef = useRef({});
  const [isManualLyricsEditorOpen, setIsManualLyricsEditorOpen] = useState(false);
  const [manualLyricsDraft, setManualLyricsDraft] = useState([]);
  const [manualLyricsDraftError, setManualLyricsDraftError] = useState('');
  const [isManualLyricsSaving, setIsManualLyricsSaving] = useState(false);
  const [manualLyricsRawText, setManualLyricsRawText] = useState('');
  const [isManualLyricsRawEditorOpen, setIsManualLyricsRawEditorOpen] = useState(false);
  const [isManualLyricsTapMode, setIsManualLyricsTapMode] = useState(false);
  const [manualLyricsSavedNotice, setManualLyricsSavedNotice] = useState('');
  const [systemStats, setSystemStats] = useState(null);
  const visualizerCanvasRef = useRef(null);
  const pulseCanvasRef = useRef(null);
  const [visualizerMode, setVisualizerMode] = useState('bars');
  const [themeColor, setThemeColor] = useState(DEFAULT_TRACK_PALETTE.accent);
  const [trackPalette, setTrackPalette] = useState(DEFAULT_TRACK_PALETTE);
  const trackPaletteCacheRef = useRef(new Map());
  const lyricsContainerRef = useRef(null);
  const activeLyricRef = useRef(null);
  const lyricsFetchRequestRef = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const headerSearchInputRef = useRef(null);
  const [searchResults, setSearchResults] = useState([]);
  const [neuralRecommendations, setNeuralRecommendations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
  const [isHomeOpen, setIsHomeOpen] = useState(false);
  const [homeFeed, setHomeFeed] = useState([]);
  const [homeResults, setHomeResults] = useState([]);
  const [homeArtistName, setHomeArtistName] = useState('');
  const [homeArtistResults, setHomeArtistResults] = useState([]);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState('');
  const [homeFilter, setHomeFilter] = useState('all');
  const [homeSort, setHomeSort] = useState('relevant');
  const homeFetchIdRef = useRef(0);
  const homeFeedSeedRef = useRef('');
  const autoplayRequestRef = useRef(false);
  const [selectedArtistName, setSelectedArtistName] = useState('');
  const [artistFilter, setArtistFilter] = useState('all');
  const [artistSort, setArtistSort] = useState('popular');
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
    transportGuardHits: 0,
    lastTransportGuardAt: null,
    lastTransportGuardAction: null
  });
  const [repairResult, setRepairResult] = useState(null);
  const [runtimeIssuePrompt, setRuntimeIssuePrompt] = useState(null);
  const runtimeIssueDismissedRef = useRef(false);
  const [lastAdded, setLastAdded] = useState(null);
  const [lastAddedTone, setLastAddedTone] = useState('success');
  const flashLastAdded = useCallback((message, delay = 1600, tone = '') => {
    setLastAddedTone(tone || inferToastTone(message));
    setLastAdded(message);
    window.setTimeout(() => setLastAdded(null), delay);
  }, []);
  const [currentTrackTitle, setCurrentTrackTitle] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isDoodleMode, setIsDoodleMode] = useState(true);
  const [doodleIntensity, setDoodleIntensity] = useState('medium');
  const [performanceMode, setPerformanceMode] = useState('high');
  const [auraPreset, setAuraPreset] = useState('balanced');
  const [isLooksPanelOpen, setIsLooksPanelOpen] = useState(false);
  const [isAuraStageOpen, setIsAuraStageOpen] = useState(false);
  const [isDepthMotionEnabled, setIsDepthMotionEnabled] = useState(true);
  const headerControlsRef = useRef(null);
  const sleepTimerControlsRef = useRef(null);
  const soundCapsuleRef = useRef(null);
  const feedbackRef = useRef(null);
  const gestureLabRef = useRef(null);
  const appLockSettingsRef = useRef(null);
  const [isGestureLabOpen, setIsGestureLabOpen] = useState(false);
  const [isGestureControlEnabled, setIsGestureControlEnabled] = useState(false);
  const [isFaceControlEnabled, setIsFaceControlEnabled] = useState(false);
  const [faceControlStatus, setFaceControlStatus] = useState('Camera off');
  const [faceControlSignal, setFaceControlSignal] = useState({
    x: 0,
    y: 0,
    confidence: 0,
    source: 'idle'
  });
  const [cameraHandSignal, setCameraHandSignal] = useState({
    x: 0,
    y: 0,
    motion: 0,
    last: 'idle'
  });
  const [isCameraPreviewVisible, setIsCameraPreviewVisible] = useState(true);
  const [gestureNotice, setGestureNotice] = useState('');
  const [inspectTarget, setInspectTarget] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState(DEFAULT_FEEDBACK_DRAFT);
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [isFeedbackSending, setIsFeedbackSending] = useState(false);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const typedBufferRef = useRef('');
  const [isMixtapeVaultOpen, setIsMixtapeVaultOpen] = useState(false);
  const [isPartyModeOpen, setIsPartyModeOpen] = useState(false);
  const [isExperienceCenterOpen, setIsExperienceCenterOpen] = useState(false);
  const [experienceCenterInitialPage, setExperienceCenterInitialPage] = useState('home');
  const [showShortcutHints, setShowShortcutHints] = useState(() => {
    try {
      if (!localStorage.getItem('aether.shortcutHintsDefaultOffMigrated')) {
        localStorage.setItem('aether.shortcutHintsDefaultOffMigrated', 'true');
        localStorage.setItem('aether.showShortcutHints', 'false');
        return false;
      }
      return JSON.parse(localStorage.getItem('aether.showShortcutHints') ?? 'false');
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('aether.showShortcutHints', JSON.stringify(showShortcutHints));
    } catch {/* ignore */}
  }, [showShortcutHints]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [partyInfo, setPartyInfo] = useState(null);
  const [discordPrivate, setDiscordPrivate] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aether.discordPrivate')) ?? false;
    } catch {
      return false;
    }
  });
  const [cassetteSide, setCassetteSide] = useState('A');
  // Sync private mode to main process on startup
  useEffect(() => {
    if (discordPrivate) window.aether?.setDiscordPrivate?.(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const prevCassetteTrackIdRef = useRef(null);
  useEffect(() => {
    const trackId = queue?.[0]?.id || queue?.[0]?.youtubeId;
    if (trackId && trackId !== prevCassetteTrackIdRef.current) {
      if (prevCassetteTrackIdRef.current !== null) {
        setCassetteSide(prev => prev === 'A' ? 'B' : 'A');
      }
      prevCassetteTrackIdRef.current = trackId;
    }
  }, [queue]);
  const [sharedScene, setSharedScene] = useState(null);
  const [sharedSceneEncoded, setSharedSceneEncoded] = useState('');
  const [isSharedSceneOpen, setIsSharedSceneOpen] = useState(false);
  const [vaultPulse, setVaultPulse] = useState({
    bass: 0,
    mids: 0,
    highs: 0,
    energy: 0,
    spin: 0,
    stamp: 'AETHER-PULSE'
  });
  const vaultPulseRef = useRef(vaultPulse);
  const lastVaultStateUpdateRef = useRef(0);
  const [vaultSpectrum, setVaultSpectrum] = useState(() => Array(48).fill(0.12));
  const [playlists, setPlaylists] = useState({});
  const [playlistOrder, setPlaylistOrder] = useState([]);
  const [favoriteTracks, setFavoriteTracks] = useState({});
  const playlistOrderHydratedRef = useRef(false);
  const [viewingPlaylist, setViewingPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isViewingFullQueue, setIsViewingFullQueue] = useState(false);
  const [isViewingFullDiscovery, setIsViewingFullDiscovery] = useState(false);
  const [isViewingFullPlaylist, setIsViewingFullPlaylist] = useState(null);
  const [isFullQueueContentReady, setIsFullQueueContentReady] = useState(false);
  const [isFullDiscoveryContentReady, setIsFullDiscoveryContentReady] = useState(false);
  const [isFullPlaylistContentReady, setIsFullPlaylistContentReady] = useState(false);
  const [isMixtapeVaultContentReady, setIsMixtapeVaultContentReady] = useState(false);
  const [isLibraryOverlayContentReady, setIsLibraryOverlayContentReady] = useState(false);
  const [isLibraryOverlayOpen, setIsLibraryOverlayOpen] = useState(false);
  const [isSoundCapsuleOpen, setIsSoundCapsuleOpen] = useState(false);
  const [soundCapsuleData, setSoundCapsuleData] = useState(null);
  const [libraryActionTarget, setLibraryActionTarget] = useState(null);
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const [libraryBrowseMode, setLibraryBrowseMode] = useState('playlists');
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [librarySort, setLibrarySort] = useState('manual');
  const [librarySongFilter, setLibrarySongFilter] = useState('all');
  const [librarySongSort, setLibrarySongSort] = useState('title');
  const [libraryTrackSort, setLibraryTrackSort] = useState('title');
  const [isPlayerOverlayOpen, setIsPlayerOverlayOpen] = useState(false);
  const [isShortcutSettingsOpen, setIsShortcutSettingsOpen] = useState(false);
  const [shortcutSettingsError, setShortcutSettingsError] = useState('');
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [shortcutDraft, setShortcutDraft] = useState(DEFAULT_SHORTCUTS);
  const [globalMediaShortcutsEnabled, setGlobalMediaShortcutsEnabled] = useState(false);
  const [isTipsOverlayOpen, setIsTipsOverlayOpen] = useState(false);
  const looksPanelRef = useRef(null);
  const gestureStateRef = useRef({
    pointerDown: null,
    lastActionAt: 0,
    noticeTimer: null,
    lastTapAt: 0
  });
  const gestureRuntimeRef = useRef({
    handleControl: null,
    appendRecentEvent: null
  });
  const touchGestureRef = useRef({
    touches: {},
    pinchStartDist: 0,
    twoFingerStart: null,
    active: false
  });
  const faceVideoRef = useRef(null);
  const faceStreamRef = useRef(null);
  const faceLoopRef = useRef(0);
  const faceActionRef = useRef({
    lastActionAt: 0,
    lastZone: 'center',
    centeredFrames: 0
  });
  const cameraMotionRef = useRef({
    prevLuma: null,
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startAt: 0,
    lastSeenAt: 0,
    lastActionAt: 0
  });
  const cameraUiUpdateRef = useRef({
    faceAt: 0,
    handAt: 0,
    status: ''
  });
  const [hideFirstRunTips, setHideFirstRunTips] = useState(false);
  const [tipsDontShowAgain, setTipsDontShowAgain] = useState(false);
  const firstRunTipsTimerRef = useRef(null);
  const [draggedPlaylistName, setDraggedPlaylistName] = useState(null);
  const [draggedQueueIndex, setDraggedQueueIndex] = useState(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [activeMenuTrack, setActiveMenuTrack] = useState(null);
  const [isRenamingPlaylist, setIsRenamingPlaylist] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [volume, setVolume] = useState(0.5);
  const [volumeToast, setVolumeToast] = useState(false);
  const [isDownloadingTrack, setIsDownloadingTrack] = useState(false);
  const [sleepTimerValue, setSleepTimerValue] = useState(0); // 0, 15, 30, 60, 120
  const [sleepDeadline, setSleepDeadline] = useState(null);
  const [sleepRemainingStr, setSleepRemainingStr] = useState('');
  const [isSleepTimerMenuOpen, setIsSleepTimerMenuOpen] = useState(false);
  const [isSleepTimerOverlayOpen, setIsSleepTimerOverlayOpen] = useState(false);
  const [sleepFadeEnabled, setSleepFadeEnabled] = useState(true);
  const [sleepCustomMinutes, setSleepCustomMinutes] = useState('');
  const [stopAfterTrack, setStopAfterTrack] = useState(false);
  const sleepTimerMenuRef = useRef(null);
  const mixtapeVaultRef = useRef(null);
  const [isQualityDropdownOpen, setIsQualityDropdownOpen] = useState(false);
  const qualityDropdownRef = useRef(null);
  const [localIp, setLocalIp] = useState('');
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [miniPlayerInfoMode, setMiniPlayerInfoMode] = useState('artist');
  const [isMiniQueuePeekOpen, setIsMiniQueuePeekOpen] = useState(false);
  const [isSpotifyImportOpen, setIsSpotifyImportOpen] = useState(false);
  const [musicImportProvider, setMusicImportProvider] = useState('');
  const [spotifyImportUrl, setSpotifyImportUrl] = useState('');
  const [spotifyImportPlaylistName, setSpotifyImportPlaylistName] = useState('');
  const [spotifyImportProgress, setSpotifyImportProgress] = useState({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [isSpotifyImporting, setIsSpotifyImporting] = useState(false);
  const [isLocalMediaImporting, setIsLocalMediaImporting] = useState(false);
  const [importReview, setImportReview] = useState(null);
  const [spotifyImportLogs, setSpotifyImportLogs] = useState([]);
  const [isVaultImporting, setIsVaultImporting] = useState(false);
  const [isShortcutSettingsSaving, setIsShortcutSettingsSaving] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    enabled: false,
    status: 'idle',
    message: '',
    available: false,
    downloaded: false,
    version: null,
    progress: 0
  });
  const [isUpdateBusy, setIsUpdateBusy] = useState(false);
  const [updateToast, setUpdateToast] = useState('');
  const [isVaultCleaning, setIsVaultCleaning] = useState(false);
  const [isWarmupUnavailable, setIsWarmupUnavailable] = useState(false);
  const [isOfflineRemovalBusy, setIsOfflineRemovalBusy] = useState(false);
  const [skipReasonToast, setSkipReasonToast] = useState('');
  const [skipEvents, setSkipEvents] = useState([]);
  const [lockStatus, setLockStatus] = useState({
    enabled: false,
    touchIdAvailable: false,
    touchIdEnabled: false
  });
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [lockPasswordConfirm, setLockPasswordConfirm] = useState('');
  const [lockDisablePassword, setLockDisablePassword] = useState('');
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [lockUseTouchId, setLockUseTouchId] = useState(false);
  const [lockIdleMinutes, setLockIdleMinutes] = useState(5);
  const [lockError, setLockError] = useState('');
  const [isLockBusy, setIsLockBusy] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const [storagePolicy, setStoragePolicy] = useState({
    cacheCapMb: 2048,
    maxCacheAgeDays: 30
  });
  const [storageEstimate, setStorageEstimate] = useState({
    cap: null,
    age: null,
    downloadsOnly: null
  });
  const [isStorageBusy, setIsStorageBusy] = useState(false);
  const [isRuntimeRepairing, setIsRuntimeRepairing] = useState(false);
  const [engineStatus, setEngineStatus] = useState(null);
  const [offlineDownloads, setOfflineDownloads] = useState([]);
  const [isOfflineDownloadsBusy, setIsOfflineDownloadsBusy] = useState(false);
  const [destructiveConfirmRequest, setDestructiveConfirmRequest] = useState(null);
  const destructiveConfirmResolverRef = useRef(null);
  const isStandalone = !!window.aether;
  const [videoMode, setVideoMode] = useState(null); // null | 'dual' | 'cinema'
  const currentTrack = queue?.[0];
  const fileInputRef = useRef(null);
  const [isOfflineMode, setIsOfflineMode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aether.offlineMode')) ?? false;
    } catch {
      return false;
    }
  });
  const [offlineLibrarySearchTerm, setOfflineLibrarySearchTerm] = useState('');
  const [searchHistoryByScope, setSearchHistoryByScope] = useState(() => ({
    online: readSearchHistory('online'),
    offline: readSearchHistory('offline')
  }));
  const commitSearchHistory = useCallback((scope, query) => {
    const next = pushSearchHistoryItem(scope, query);
    setSearchHistoryByScope(prev => ({
      ...prev,
      [scope]: next
    }));
    return next;
  }, []);
  const discardSearchHistoryItem = useCallback((scope, query) => {
    const next = removeSearchHistoryItem(scope, query);
    setSearchHistoryByScope(prev => ({
      ...prev,
      [scope]: next
    }));
  }, []);
  const clearSearchHistoryForScope = useCallback(scope => {
    const next = clearSearchHistoryScope(scope);
    setSearchHistoryByScope(prev => ({
      ...prev,
      [scope]: next
    }));
  }, []);
  const handleOfflineLibrarySearch = useCallback(query => {
    const normalized = normalizeSearchHistoryItem(query);
    setOfflineLibrarySearchTerm(normalized);
    if (normalized) commitSearchHistory('offline', normalized);
  }, [commitSearchHistory]);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);
  const [autoplayMoodMode, setAutoplayMoodMode] = useState('flow');
  const [isAutoplayMenuOpen, setIsAutoplayMenuOpen] = useState(false);
  const autoplayMenuButtonRef = useRef(null);
  const [autoplayMenuStyle, setAutoplayMenuStyle] = useState({
    top: 0,
    left: 0
  });
  const [isVerticalStack, setIsVerticalStack] = useState(false);
  const [isFocusedMode, setIsFocusedMode] = useState(false);
  const expandedContainerRef = useRef(null);
  const expandedActiveRef = useRef(null);
  const idleStartTimeRef = useRef(null);
  const idlePhraseRef = useRef(null);
  const lastRPCTrackIdRef = useRef(null);
  const lastRPCPlayingRef = useRef(null);
  const sessionReadyRef = useRef(false);
  const pendingResumeTimeRef = useRef(null);

  // Audio Analysis Refs (NOVA
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const auraEnergyRef = useRef({
    bass: 0,
    mids: 0,
    highs: 0,
    phase: 0
  });
  const uiPulseRef = useRef(1);
  const uiPulseSignalRef = useRef({
    bass: 0,
    rms: 0
  });
  const uiPulsePeakRef = useRef(0);
  const visualizerStateRef = useRef({
    visualizerMode: 'bars',
    themeColor: '#00ffbf',
    auraPreset: 'balanced',
    isMixtapeVaultOpen: false,
    performanceMode: 'high',
    isHeavyOverlayOpen: false
  });
  const visualizerErrorCountRef = useRef(0);
  const visualizerFrameBudgetRef = useRef({
    lastDrawAt: 0,
    lastStyleAt: 0,
    lastMixtapeCssAt: 0,
    brandAccent: '#00ffbf',
    brandContrast: '#ff00ff',
    canvas: null,
    ctx: null,
    pulseCanvas: null,
    pulseCtx: null
  });
  const visualizerBarsRef = useRef(null);
  const playButtonRef = useRef(null);
  const beatRingsRef = useRef(null);
  const lastBeatRingTimeRef = useRef(0);
  const vaultTelemetryRef = useRef({
    lastStateAt: 0
  });
  const uiInteractionCooldownUntilRef = useRef(0);
  const isAuraMode = visualizerMode === 'pulse';
  const liveBeatIntensity = useMemo(() => clamp01(vaultPulse.energy * 0.9 + vaultPulse.bass * 0.45 + vaultPulse.highs * 0.12), [vaultPulse.energy, vaultPulse.bass, vaultPulse.highs]);
  const immersiveBeatIntensity = useMemo(() => isAuraMode ? liveBeatIntensity : 0, [isAuraMode, liveBeatIntensity]);

  // Pulse smoothing: keep high-frequency RAF updates in refs (no re-render),
  // and only update React state at a modest rate to avoid heavy re-renders.
  const pulseReadoutRef = useRef(0);
  const pulseTargetRef = useRef(0);
  const [pulseDisplay, setPulseDisplay] = useState(0); // low-frequency UI state (updates ~10Hz)

  useEffect(() => {
    pulseTargetRef.current = isPlaying ? Math.max(liveBeatIntensity, 0) : 0;
  }, [liveBeatIntensity, isPlaying]);
  useEffect(() => {
    let raf = null;
    const ease = 0.15;
    const decay = 0.96;
    const step = () => {
      const target = pulseTargetRef.current;
      let prev = pulseReadoutRef.current;
      let next = prev;
      if (target > prev) next = prev + (target - prev) * ease;else next = prev * decay;
      next = Math.max(0, Math.min(1, next));
      pulseReadoutRef.current = Math.abs(next) < 0.0005 ? 0 : next;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sync ref -> state at low frequency to reduce renders
  useEffect(() => {
    let interval = null;
    const fps = 10; // update UI ~10 times per second
    interval = setInterval(() => {
      setPulseDisplay(prev => {
        const next = pulseReadoutRef.current;
        // small clamp to avoid unnecessary updates
        if (Math.abs(next - prev) < 0.003) return prev;
        return next;
      });
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, []);
  const livePulseReadout = pulseDisplay;
  const auraCardShadow = useMemo(() => isAuraMode ? `0 24px 60px rgba(0,0,0,0.30), inset 0 0 ${10 + immersiveBeatIntensity * 30}px rgba(0,255,191,${0.06 + immersiveBeatIntensity * 0.24})` : undefined, [isAuraMode, immersiveBeatIntensity]);
  const auraPanelShadow = useMemo(() => isAuraMode ? `0 12px 30px rgba(0,0,0,0.24), inset 0 0 ${6 + immersiveBeatIntensity * 18}px rgba(0,255,191,${0.05 + immersiveBeatIntensity * 0.18})` : undefined, [isAuraMode, immersiveBeatIntensity]);
  const auraCardBorder = useMemo(() => isAuraMode ? `rgba(130, 255, 221, ${0.16 + immersiveBeatIntensity * 0.20})` : undefined, [isAuraMode, immersiveBeatIntensity]);
  const auraPanelBorder = useMemo(() => isAuraMode ? `rgba(130, 255, 221, ${0.11 + immersiveBeatIntensity * 0.16})` : undefined, [isAuraMode, immersiveBeatIntensity]);
  const auraPresetConfig = AURA_PRESETS.find(preset => preset.id === auraPreset) || AURA_PRESETS[1];
  const auraFieldStyle = useMemo(() => isAuraMode ? {
    '--aura-field-boost': String(clamp01((0.22 + immersiveBeatIntensity * 0.78) * auraPresetConfig.fieldBoost)),
    '--aura-field-flare': String(clamp01((0.18 + immersiveBeatIntensity * 0.46) * auraPresetConfig.fieldFlare)),
    '--aura-field-drift': `${(8 + immersiveBeatIntensity * 18).toFixed(2)}px`
  } : undefined, [isAuraMode, immersiveBeatIntensity, auraPresetConfig]);
  const soundLedgerView = useSoundLedgerView({
    getLocalDateKey,
    normalizePlaybackLedgerData,
    soundCapsuleData
  });
  const isPlaylistInspect = inspectTarget?.type === 'playlist';
  const showVisualStage = Boolean(isStandalone && currentTrack && videoMode);
  const isDualVisualMode = showVisualStage && videoMode === 'dual';
  const isDualWorkspaceMode = isDualVisualMode && !isVerticalStack;
  const isDualLayoutLocked = videoMode === 'dual';
  const isImmersiveLyricsLocked = Boolean(showVisualStage);
  const showSecondaryColumn = !isFocusedMode && !isDualVisualMode;
  const normalizeTrackIdentity = useCallback(track => {
    if (!track) return '';
    if (track.youtubeId) return `yt:${track.youtubeId}`;
    if (track.id) return `id:${track.id}`;
    const title = String(track.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const author = String(track.author || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return `meta:${title}|${author}`;
  }, []);
  const normalizeQueueTrack = useCallback(track => {
    if (!track) return null;
    const idFromTrack = /^[A-Za-z0-9_-]{11}$/.test(String(track.id || '')) ? String(track.id) : null;
    const rawUrl = track.actualUrl || track.url || '';
    const youtubeId = track.youtubeId || extractYouTubeId(rawUrl) || idFromTrack || extractYouTubeId(track.thumbnail);
    const baseUrl = rawUrl || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '');
    if (!baseUrl && !youtubeId) return null;
    const canonicalUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : baseUrl;
    const stableId = youtubeId || track.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const thumbnail = track.thumbnail || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '');
    const queueNonce = String(track.queueNonce || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    return {
      ...track,
      id: stableId,
      queueNonce,
      youtubeId,
      thumbnail,
      actualUrl: canonicalUrl,
      url: canonicalUrl
    };
  }, []);
  const getTrackActionKey = useCallback(track => {
    if (!track || typeof track !== 'object') return '';
    if (track.queueNonce) return `nonce:${String(track.queueNonce)}`;
    if (track.youtubeId) return `yt:${String(track.youtubeId)}`;
    if (track.id) return `id:${String(track.id)}`;
    const title = String(track.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const author = String(track.author || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return `meta:${title}|${author}`;
  }, []);
  const inspectPlaylistTracks = useMemo(() => isPlaylistInspect && Array.isArray(inspectTarget?.tracks) ? inspectTarget.tracks.filter(Boolean) : [], [isPlaylistInspect, inspectTarget?.tracks]);
  const isInspectPlaylistFromVault = isPlaylistInspect && String(inspectTarget?.source || '').startsWith('vault:');
  const inspectPrimaryTrack = inspectPlaylistTracks[0] || null;
  const inspectTrack = isPlaylistInspect ? null : inspectTarget?.track || null;
  const inspectSourceUrl = useMemo(() => {
    if (!inspectTrack) return '';
    const explicitUrl = inspectTrack.actualUrl || inspectTrack.url || '';
    if (explicitUrl) return explicitUrl;
    const youtubeId = inspectTrack.youtubeId || extractYouTubeId(inspectTrack.id) || extractYouTubeId(inspectTrack.thumbnail);
    return youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '';
  }, [inspectTrack]);
  const getInspectSourceUrl = track => {
    if (!track) return '';
    const explicitUrl = track.actualUrl || track.url || '';
    if (explicitUrl) return explicitUrl;
    const youtubeId = track.youtubeId || extractYouTubeId(track.id) || extractYouTubeId(track.thumbnail);
    return youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '';
  };
  const inspectPlaylistSourceUrls = useMemo(() => inspectPlaylistTracks.map(getInspectSourceUrl).filter(Boolean), [inspectPlaylistTracks]);
  const inspectPlaylistTracklistText = useMemo(() => inspectPlaylistTracks.map((track, index) => {
    const sourceUrl = getInspectSourceUrl(track);
    return `${index + 1}. ${track.title || 'Unknown Track'} - ${track.author || 'Unknown Artist'}${sourceUrl ? ` - ${sourceUrl}` : ''}`;
  }).join('\n'), [inspectPlaylistTracks]);
  const inspectVaultNames = useMemo(() => inspectTrack ? Object.entries(playlists).filter(([, tracks]) => (tracks || []).some(track => normalizeTrackIdentity(track) === normalizeTrackIdentity(inspectTrack))).map(([name]) => name) : [], [inspectTrack, playlists, normalizeTrackIdentity]);
  const inspectPlaylistDurationMs = useMemo(() => inspectPlaylistTracks.reduce((total, track) => total + Math.max(0, Number(track?.totalDurationMs || track?.duration || 0)), 0), [inspectPlaylistTracks]);
  const inspectPlaylistArtistCount = useMemo(() => new Set(inspectPlaylistTracks.map(track => String(track?.author || 'Unknown Artist').trim()).filter(Boolean)).size, [inspectPlaylistTracks]);
  const inspectPlaylistQueuedCount = useMemo(() => inspectPlaylistTracks.filter(track => queue.some(queuedTrack => normalizeTrackIdentity(queuedTrack) === normalizeTrackIdentity(track))).length, [inspectPlaylistTracks, queue, normalizeTrackIdentity]);
  const inspectPlaylistSignal = useInspectPlaylistSignal({
    downloadedTracks,
    extractYouTubeId,
    favoriteTracks,
    getInspectSourceUrl,
    inspectPlaylistDurationMs,
    inspectPlaylistQueuedCount,
    inspectPlaylistTracks,
    normalizeTrackIdentity
  });
  const restoreVerticalStackAfterVideoRef = useRef(false);
  const currentTrackRef = useRef(null);
  const prevTrackRef = useRef(null); // Neural Memory Ref (NOVA
  const standaloneTrackLoadKeyRef = useRef('');
  const bufferingRescueRef = useRef({
    trackKey: '',
    lastAttemptAt: 0,
    attempts: 0
  });
  const streamFailureRef = useRef({
    trackKey: '',
    attempts: 0,
    lastErrorAt: 0
  });
  const skipReasonTimeoutRef = useRef(null);
  const updateToastTimeoutRef = useRef(null);
  const prevUpdateStatusRef = useRef('idle');
  const libraryOverlayCreateInputRef = useRef(null);
  const lastWindowModeChangeRef = useRef(0);
  const prematureEndGuardRef = useRef({
    trackId: null,
    retried: false
  });
  const manualTransportAdvanceRef = useRef({
    trackKey: '',
    at: 0,
    action: ''
  });
  const warmupRetryRef = useRef(new Map());
  const videoEndGuardRef = useRef({
    trackKey: '',
    settled: false,
    lastNearEndAt: 0,
    lastObservedMs: 0,
    lastProgressAt: 0
  });
  const [history, setHistory] = useState([]);
  const [isManualStop, setIsManualStop] = useState(false);
  const [streamPort, setStreamPort] = useState(3333);
  const [videoQuality, setVideoQuality] = useState('720');
  const [playbackResetNonce, setPlaybackResetNonce] = useState(0);
  const [pendingResumeTime, setPendingResumeTime] = useState(null);
  // Web-only: browsers block audio.play() until a user gesture happens in the tab.
  // Standalone (Electron) starts unlocked. Web starts locked until user taps the overlay.
  const [webAudioUnlocked, setWebAudioUnlocked] = useState(!!window.aether);
  const [oauthPrompt, setOauthPrompt] = useState(null);
  const youtubeAuthRequiredRef = useRef(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [dualFocusMode, setDualFocusMode] = useState(null); // null | 'video' | 'lyrics'
  const videoModeRef = useRef(null); // synchronous mirror — safe to read in audio callbacks
  const isPlayingRef = useRef(false); // live mirror of isPlaying for video handler closures
  const volumeRef = useRef(volume);
  const webAudioUnlockedRef = useRef(webAudioUnlocked);
  const queueRef = useRef([]);
  const currentTimeRef = useRef(0); // live mirror of currentTime for video handler closures
  const currentTimeCommitRef = useRef({
    committed: 0,
    at: 0
  });
  const webPlaybackFallbackRef = useRef({
    trackKey: '',
    attemptedIds: new Set(),
    inFlight: false
  });
  const isAppLockedRef = useRef(isAppLocked);
  const lockIdleMinutesRef = useRef(lockIdleMinutes);
  const lockIdleListenersActiveRef = useRef(false);
  const deviceSyncIntervalRef = useRef(0);
  const discordQueuePollIntervalRef = useRef(0);
  const remoteHeartbeatIntervalRef = useRef(0);
  const soundCapsuleLiveIntervalRef = useRef(0);
  const soundCapsuleWarmupTimeoutRef = useRef(0);
  const volumeToastTimeoutRef = useRef(0);
  const effectiveGuildIdRef = useRef(DEFAULT_GUILD_ID);
  const handleControlRef = useRef(null);
  const advanceQueueRef = useRef(null);
  const fetchQueueRef = useRef(null);
  const ledgerSessionRef = useRef({
    id: '',
    trackKey: '',
    counted: false,
    lastLoggedMs: 0
  });
  const liveStreamStartOffsetMsRef = useRef(0);
  const [cinemaControlsVisible, setCinemaControlsVisible] = useState(true);
  const cinemaHideTimerRef = useRef(null);
  const localVideoRef = useRef(null);
  const [showVisualLyrics, setShowVisualLyrics] = useState(true);
  const [visualControlsPinned, setVisualControlsPinned] = useState(false);
  const [visualVideoFit, setVisualVideoFit] = useState('contain');
  const clearTrackedInterval = useCallback((timerRef, label) => {
    if (!timerRef?.current) return;
    console.warn(`[Aether/Perf] Clearing stale ${label} interval before creating another.`);
    window.clearInterval(timerRef.current);
    timerRef.current = 0;
  }, []);
  const clearTrackedTimeout = useCallback((timerRef, label) => {
    if (!timerRef?.current) return;
    console.warn(`[Aether/Perf] Clearing stale ${label} timeout before creating another.`);
    window.clearTimeout(timerRef.current);
    timerRef.current = 0;
  }, []);
  const showVolumeToastFor = useCallback((durationMs = 2000) => {
    setVolumeToast(true);
    if (volumeToastTimeoutRef.current) {
      window.clearTimeout(volumeToastTimeoutRef.current);
    }
    volumeToastTimeoutRef.current = window.setTimeout(() => {
      volumeToastTimeoutRef.current = 0;
      setVolumeToast(false);
    }, durationMs);
  }, []);
  const setCurrentTime = useCallback(nextValue => {
    const previous = Math.max(0, Number(currentTimeRef.current) || 0);
    const resolved = typeof nextValue === 'function' ? nextValue(previous) : nextValue;
    const nextMs = Math.max(0, Math.floor(Number(resolved) || 0));
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const last = currentTimeCommitRef.current;
    const previousCommitted = last.committed;
    currentTimeRef.current = nextMs;
    const isReset = nextMs === 0;
    const isUiTick = now - last.at >= 900;
    const isLargeJump = Math.abs(nextMs - previousCommitted) >= 4000;
    const isStaleCommit = now - last.at >= 8000;
    if (!isReset && !isUiTick && !isLargeJump && !isStaleCommit) return;
    last.committed = nextMs;
    last.at = now;
    if (isReset || Math.abs(nextMs - previousCommitted) > 3000) {
      setCurrentTimeState(nextMs);
      return;
    }
    startTransition(() => setCurrentTimeState(nextMs));
  }, []);

  // MASTER SINGLETON: Lazy-initialized once to prevent memory leaks and ghost audio streams.
  const localAudioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubeProgressTimerRef = useRef(null);
  const webTrackLoadKeyRef = useRef('');
  const getActivePlaybackPositionMs = useCallback(() => {
    if (videoModeRef.current && localVideoRef.current?.currentTime > 0) {
      return Math.max(0, Math.floor(localVideoRef.current.currentTime * 1000));
    }
    if (localAudioRef.current?.currentTime > 0) {
      return Math.max(0, liveStreamStartOffsetMsRef.current + Math.floor(localAudioRef.current.currentTime * 1000));
    }
    return Math.max(0, Math.floor(currentTimeRef.current || 0));
  }, []);
  const stopVideoElement = useCallback((vid, options = {}) => {
    const {
      clearSource = true
    } = options;
    if (!vid) return;
    vid.oncanplay = null;
    vid.onwaiting = null;
    vid.onplaying = null;
    vid.ontimeupdate = null;
    vid.onended = null;
    vid.onerror = null;
    try {
      vid.pause();
      if (clearSource) {
        vid.removeAttribute('src');
        vid.load();
      }
    } catch {}
  }, []);
  const exitVideoMode = useExitVideoModeAction({
    advanceQueueRef,
    currentTimeRef,
    currentTrackRef,
    localAudioRef,
    localVideoRef,
    pendingResumeTimeRef,
    restoreVerticalStackAfterVideoRef,
    setCurrentTime,
    setIsAudioBuffering,
    setIsVideoReady,
    setPendingResumeTime,
    setPlaybackResetNonce,
    setVideoMode,
    standaloneTrackLoadKeyRef,
    stopVideoElement,
    videoModeRef
  }); // Reset isVideoReady on track change
  useEffect(() => {
    setIsVideoReady(false);
  }, [queue?.[0]?.url, queue?.[0]?.youtubeId]);
  const switchVideoMode = useSwitchVideoModeAction({
    currentTimeRef,
    exitVideoMode,
    getActivePlaybackPositionMs,
    isOfflineMode,
    isVerticalStack,
    localVideoRef,
    pendingResumeTimeRef,
    restoreVerticalStackAfterVideoRef,
    setCinemaControlsVisible,
    setCurrentTime,
    setIsAudioBuffering,
    setIsLyricsExpanded,
    setIsVerticalStack,
    setLastAdded,
    setPendingResumeTime,
    setShowVisualLyrics,
    setVideoMode,
    setVisualControlsPinned,
    stopVideoElement,
    videoModeRef
  }); // Resolve missing YouTube ID when user enters video mode from vault/playlist tracks.
  useVideoQueueResolver({
    extractYouTubeId,
    isOfflineMode,
    isStandalone,
    queue,
    setQueue,
    videoMode
  });
  useEffect(() => {
    if (!isStandalone || !window.aether?.onYouTubeAuthRequired) return;
    const unsub = window.aether.onYouTubeAuthRequired(data => {
      youtubeAuthRequiredRef.current = true;
      setOauthPrompt(data || {
        reason: 'YouTube needs a verified browser session.'
      });
    });
    return unsub;
  }, [isStandalone]);
  useEffect(() => () => {
    if (volumeToastTimeoutRef.current) {
      window.clearTimeout(volumeToastTimeoutRef.current);
      volumeToastTimeoutRef.current = 0;
    }
  }, []);

  // Keep videoModeRef in sync with videoMode state (synchronous for closure callbacks)
  useEffect(() => {
    videoModeRef.current = videoMode;
  }, [videoMode]);
  // Live mirrors so video handler closures never go stale on isPlaying / currentTime
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    webAudioUnlockedRef.current = webAudioUnlocked;
  }, [webAudioUnlocked]);
  useEffect(() => {
    queueRef.current = Array.isArray(queue) ? queue : [];
  }, [queue]);
  useEffect(() => {
    isAppLockedRef.current = isAppLocked;
  }, [isAppLocked]);
  useEffect(() => {
    lockIdleMinutesRef.current = lockIdleMinutes;
  }, [lockIdleMinutes]);
  useEffect(() => {
    if (currentTime === 0 || Math.abs(currentTime - currentTimeRef.current) > 1200) {
      currentTimeRef.current = currentTime;
    }
  }, [currentTime]);
  useEffect(() => {
    currentTrackRef.current = queue?.[0] || null;
  }, [queue]);
  useEffect(() => {
    pendingResumeTimeRef.current = pendingResumeTime;
  }, [pendingResumeTime]);
  useEffect(() => {
    if (!isOfflineMode) return;
    if (videoModeRef.current) {
      exitVideoMode({
        reason: 'offline_mode'
      });
    }
    setIsViewingFullDiscovery(false);
    setIsSharedSceneOpen(false);
    setIsSpotifyImportOpen(false);
    setIsPartyModeOpen(false);
    setIsAutoplayMenuOpen(false);
    setIsAutoplayEnabled(false);
  }, [exitVideoMode, isOfflineMode]);
  useEffect(() => {
    let raf = 0;
    if (isViewingFullQueue) {
      setIsFullQueueContentReady(false);
      raf = requestAnimationFrame(() => setIsFullQueueContentReady(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsFullQueueContentReady(false);
    return undefined;
  }, [isViewingFullQueue]);
  useEffect(() => {
    let raf = 0;
    if (isViewingFullDiscovery) {
      setIsFullDiscoveryContentReady(false);
      raf = requestAnimationFrame(() => setIsFullDiscoveryContentReady(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsFullDiscoveryContentReady(false);
    return undefined;
  }, [isViewingFullDiscovery]);
  useEffect(() => {
    let raf = 0;
    if (isViewingFullPlaylist) {
      setIsFullPlaylistContentReady(false);
      raf = requestAnimationFrame(() => setIsFullPlaylistContentReady(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsFullPlaylistContentReady(false);
    return undefined;
  }, [isViewingFullPlaylist]);
  useEffect(() => {
    let raf = 0;
    if (isMixtapeVaultOpen) {
      setIsMixtapeVaultContentReady(false);
      raf = requestAnimationFrame(() => setIsMixtapeVaultContentReady(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsMixtapeVaultContentReady(false);
    return undefined;
  }, [isMixtapeVaultOpen]);
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    if (isLibraryOverlayOpen) {
      setIsLibraryOverlayContentReady(false);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setIsLibraryOverlayContentReady(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setIsLibraryOverlayContentReady(false);
    return undefined;
  }, [isLibraryOverlayOpen]);
  useEffect(() => {
    visualizerStateRef.current = {
      visualizerMode,
      themeColor,
      auraPreset,
      isMixtapeVaultOpen,
      isAuraStageOpen,
      isSharedSceneOpen,
      isHeavyOverlayOpen: Boolean(isMixtapeVaultOpen || isLibraryOverlayOpen || isViewingFullQueue || isViewingFullDiscovery || isViewingFullPlaylist || isPlayerOverlayOpen || isLyricsExpanded || isManualLyricsEditorOpen || isSpotifyImportOpen),
      performanceMode
    };
  }, [visualizerMode, themeColor, auraPreset, isMixtapeVaultOpen, isAuraStageOpen, isSharedSceneOpen, isLibraryOverlayOpen, isViewingFullQueue, isViewingFullDiscovery, isViewingFullPlaylist, isPlayerOverlayOpen, isLyricsExpanded, isManualLyricsEditorOpen, isSpotifyImportOpen, performanceMode]);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.remove('perf-low', 'perf-medium', 'perf-high');
    document.body.classList.add(`perf-${performanceMode}`);
    return () => {
      document.body.classList.remove('perf-low', 'perf-medium', 'perf-high');
    };
  }, [performanceMode]);

  // Auto-exit video mode when queue empties (no current track)
  useEffect(() => {
    if (videoMode && !queue?.[0]) {
      console.log('[Aether/Video] Queue empty — exiting video mode');
      exitVideoMode({
        preservePosition: false,
        reason: 'queue_empty'
      });
    }
  }, [queue, videoMode, exitVideoMode]);
  useStandaloneTeardownPersist({
    SESSION_PLAYBACK_STORAGE_KEY,
    isStandalone,
    localAudioRef,
    localVideoRef,
    pendingResumeTimeRef,
    sessionReadyRef,
    stopVideoElement
  }); // ─── SIMPLE VIDEO ENGINE ─────────────────────────────────────────────────
  // NOTE: isPlaying is intentionally NOT in the dep array.
  // Play/Pause sync is handled by a separate effect below to avoid
  // re-running src assignment and seek logic on every play/pause toggle.
  useSimpleVideoEngine({
    Infinity,
    advanceQueueRef,
    currentTimeRef,
    encodeURIComponent,
    exitVideoMode,
    getTrackActionKey,
    isPlayingRef,
    isStandalone,
    localAudioRef,
    localVideoRef,
    playbackResetNonce,
    queue,
    setCurrentTime,
    setIsAudioBuffering,
    setIsVideoReady,
    streamPort,
    videoEndGuardRef,
    videoMode,
    videoModeRef,
    videoQuality
  }); // Video play/pause sync — separate effect so it doesn't re-run src/seek logic
  useEffect(() => {
    if (!videoMode || !localVideoRef.current) return;
    if (isPlaying) {
      localVideoRef.current.play().catch(() => {});
    } else {
      localVideoRef.current.pause();
    }
  }, [isPlaying, videoMode]);
  useEffect(() => {
    if (videoMode && localVideoRef.current) {
      localVideoRef.current.volume = volume;
    }
  }, [volume, videoMode]);
  const shouldAutoHideVisualChrome = Boolean(videoMode === 'cinema' || videoMode === 'dual' && visualVideoFit === 'cover');

  // Visual stage chrome auto-hides in cinema and in dual fill-frame mode.
  useEffect(() => {
    if (!shouldAutoHideVisualChrome) {
      setCinemaControlsVisible(true);
      clearTimeout(cinemaHideTimerRef.current);
      return undefined;
    }
    setCinemaControlsVisible(true);
    if (visualControlsPinned) return;
    clearTimeout(cinemaHideTimerRef.current);
    cinemaHideTimerRef.current = setTimeout(() => setCinemaControlsVisible(false), 3000);
    return () => clearTimeout(cinemaHideTimerRef.current);
  }, [shouldAutoHideVisualChrome, visualControlsPinned]);
  const handleVisualStagePointerActivity = useCallback(() => {
    if (!shouldAutoHideVisualChrome) return;
    setCinemaControlsVisible(true);
    if (visualControlsPinned) return;
    clearTimeout(cinemaHideTimerRef.current);
    cinemaHideTimerRef.current = setTimeout(() => setCinemaControlsVisible(false), 3000);
  }, [shouldAutoHideVisualChrome, visualControlsPinned]);

  // --- AETHER STUDIO CORE: NEURAL ENGINE STATE (NOVA ---

  const currentTrackSourceUrl = useMemo(() => {
    if (!currentTrack) return '';
    if (currentTrack.youtubeId) return `https://www.youtube.com/watch?v=${currentTrack.youtubeId}`;
    return currentTrack.actualUrl || currentTrack.url || '';
  }, [currentTrack?.youtubeId, currentTrack?.actualUrl, currentTrack?.url]);
  const pendingLibraryItems = useMemo(() => {
    if (libraryActionTarget?.items?.length) return libraryActionTarget.items;
    return currentTrack ? [currentTrack] : [];
  }, [libraryActionTarget, currentTrack]);
  const canAddPendingToVault = pendingLibraryItems.length > 0;
  const canOpenCurrentSource = Boolean(isStandalone && currentTrackSourceUrl);
  const canDownloadCurrentTrack = Boolean(isStandalone && window.aether?.exportAudioToFile && currentTrackSourceUrl);
  const canUseUpdater = Boolean(isStandalone && window.aether?.getUpdateStatus && window.aether?.checkForUpdates && window.aether?.downloadUpdate && window.aether?.quitAndInstallUpdate);
  const platform = isStandalone ? window.aether?.platform : '';
  const isMacPlatform = isStandalone ? platform === 'darwin' : /mac/i.test(navigator?.platform || '');
  const isWindowsPlatform = isStandalone ? platform === 'win32' : /win/i.test(navigator?.platform || '');
  const parsedShortcuts = useMemo(() => Object.fromEntries(SHORTCUT_FIELDS.map(({
    id
  }) => [id, parseShortcutCombo(shortcuts[id], isMacPlatform)])), [isMacPlatform, shortcuts]);
  const windowChromeInsetClass = isMacPlatform ? 'pt-7' : isWindowsPlatform ? isMaximized ? 'pt-0' : 'pt-[34px]' : 'pt-0';
  const defaultGlobalMediaShortcutsEnabled = isMacPlatform;
  const updateActionLabel = useMemo(() => {
    if (!canUseUpdater || !updateInfo?.enabled) return 'UPDATE';
    if (updateInfo.downloaded) return 'RESTART';
    if (updateInfo.status === 'downloading') return `${Math.round(Number(updateInfo.progress || 0))}%`;
    if (updateInfo.available) return 'DOWNLOAD';
    if (updateInfo.status === 'checking') return 'CHECKING';
    if (updateInfo.status === 'up-to-date') return 'UP-TO-DATE';
    if (updateInfo.status === 'error') return 'RETRY';
    return 'CHECK';
  }, [canUseUpdater, updateInfo]);
  const handleUpdateAction = useUpdateAction({
    canUseUpdater,
    isUpdateBusy,
    setIsUpdateBusy,
    setLastAdded,
    setUpdateToast,
    updateInfo,
    updateToastTimeoutRef
  });
  useEffect(() => {
    if (!canUseUpdater || !updateInfo?.enabled) return;
    const prevStatus = prevUpdateStatusRef.current;
    const nextStatus = String(updateInfo?.status || 'idle');
    if (prevStatus === nextStatus) return;
    prevUpdateStatusRef.current = nextStatus;
    let toast = '';
    if (nextStatus === 'checking') {
      toast = 'Checking for updates…';
    } else if (nextStatus === 'available') {
      toast = `Update available${updateInfo?.version ? ` • v${updateInfo.version}` : ''}`;
    } else if (nextStatus === 'up-to-date') {
      toast = 'You are on the latest version';
    } else if (nextStatus === 'downloaded') {
      toast = `Update ready${updateInfo?.version ? ` • v${updateInfo.version}` : ''} • restart to install`;
    } else if (nextStatus === 'error') {
      toast = `Updater issue${updateInfo?.message ? `: ${String(updateInfo.message).slice(0, 58)}` : ''}`;
    }
    if (!toast) return;
    setUpdateToast(toast);
    if (updateToastTimeoutRef.current) clearTimeout(updateToastTimeoutRef.current);
    updateToastTimeoutRef.current = setTimeout(() => setUpdateToast(''), nextStatus === 'downloaded' ? 5200 : nextStatus === 'checking' ? 2000 : 3600);
    return () => {
      if (updateToastTimeoutRef.current) {
        clearTimeout(updateToastTimeoutRef.current);
      }
    };
  }, [canUseUpdater, updateInfo?.enabled, updateInfo?.status, updateInfo?.version, updateInfo?.message]);
  const handleDownloadCurrentTrack = useCallback(async () => {
    if (!canDownloadCurrentTrack || !currentTrack || isDownloadingTrack) {
      setLastAdded('Download unavailable');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    setIsDownloadingTrack(true);
    setLastAdded('Choose destination folder…');
    try {
      const result = await window.aether.exportAudioToFile(currentTrackSourceUrl, currentTrack.title || 'track', currentTrack.author || 'unknown');
      if (result?.cancel) {
        setLastAdded('Export cancelled');
        setTimeout(() => setLastAdded(null), 1800);
        return;
      }
      if (result?.success === false) {
        throw new Error(result?.error || 'Save failed');
      }
      setLastAdded(`Exported: ${currentTrack.title || 'Track'}`);
      setTimeout(() => setLastAdded(null), 2800);
    } catch (err) {
      setLastAdded(`Download failed${err?.message ? `: ${String(err.message).slice(0, 42)}` : ''}`);
      setTimeout(() => setLastAdded(null), 3000);
    } finally {
      setIsDownloadingTrack(false);
    }
  }, [canDownloadCurrentTrack, currentTrack, currentTrackSourceUrl, isDownloadingTrack]);
  const appendSpotifyImportLog = useCallback(line => {
    const stamp = new Date().toLocaleTimeString();
    const msg = `[${stamp}] ${line}`;
    console.log('[Aether/SpotifyImport]', msg);
    setSpotifyImportLogs(prev => [...prev.slice(-19), msg]);
  }, []);
  const copySpotifyImportDebugLog = useCallback(async () => {
    const text = spotifyImportLogs.length > 0 ? spotifyImportLogs.join('\n') : `Aether playlist import\nprovider=${musicImportProvider || 'none'}\nname=${spotifyImportPlaylistName || 'auto'}\nurl=${spotifyImportUrl || 'empty'}\nstatus=${spotifyImportProgress.stage || 'idle'}\nmessage=${spotifyImportProgress.message || 'No logs yet.'}`;
    try {
      await navigator.clipboard?.writeText(text);
      setLastAdded('Import debug log copied');
      setTimeout(() => setLastAdded(null), 2200);
    } catch {
      setLastAdded('Could not copy import debug log');
      setTimeout(() => setLastAdded(null), 2200);
    }
  }, [musicImportProvider, spotifyImportLogs, spotifyImportPlaylistName, spotifyImportProgress.message, spotifyImportProgress.stage, spotifyImportUrl]);
  const appendRecentEvent = useCallback((label, detail = '', meta = {}) => {
    const event = {
      at: Date.now(),
      label: String(label || 'event'),
      detail: String(detail || meta?.detail || '').trim(),
      tone: String(meta?.tone || 'neutral'),
      title: String(meta?.title || currentTrack?.title || '').trim()
    };
    setSkipEvents(prev => [...prev.slice(-49), event]);
  }, [currentTrack?.title]);
  const openTrackInspect = useCallback((track, source = 'track') => {
    if (!track) return;
    setInspectTarget({
      type: 'track',
      track,
      source,
      openedAt: Date.now()
    });
  }, []);
  const openPlaylistInspect = useCallback((playlistName, tracks = [], source = 'playlist') => {
    const safeTracks = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
    if (safeTracks.length === 0) return;
    setInspectTarget({
      type: 'playlist',
      playlistName: String(playlistName || 'Playlist'),
      tracks: safeTracks,
      source,
      openedAt: Date.now()
    });
  }, []);
  const showGestureNotice = useCallback(message => {
    setGestureNotice(message);
    if (gestureStateRef.current.noticeTimer) {
      window.clearTimeout(gestureStateRef.current.noticeTimer);
    }
    gestureStateRef.current.noticeTimer = window.setTimeout(() => setGestureNotice(''), 1700);
  }, []);
  const updateFeedbackDraft = useCallback(patch => {
    setFeedbackDraft(prev => ({
      ...prev,
      ...patch
    }));
    setFeedbackStatus('');
  }, []);
  const submitFeedback = useSubmitFeedbackAction({
    BUILD_VERSION,
    DEFAULT_FEEDBACK_DRAFT,
    FEEDBACK_ISSUE_URL,
    FEEDBACK_STORAGE_KEY,
    UX_VERSION,
    appendRecentEvent,
    auraPreset,
    axios,
    currentTrack,
    feedbackDraft,
    getActivePlaybackPositionMs,
    isStandalone,
    lyrics,
    platform,
    queue,
    setFeedbackDraft,
    setFeedbackStatus,
    setIsFeedbackOpen,
    setIsFeedbackSending,
    videoMode,
    visualizerMode
  });
  const noteSkipReason = useCallback((reason, meta = {}) => {
    console.log('[Aether/SkipReason]', reason, meta);
    setSkipReasonToast(reason);
    const event = {
      at: Date.now(),
      label: reason,
      detail: meta?.title || currentTrack?.title || 'Unknown',
      tone: 'transport',
      title: meta?.title || currentTrack?.title || 'Unknown',
      source: meta?.source || 'unknown',
      trackId: meta?.trackId || currentTrack?.id || null
    };
    setSkipEvents(prev => [...prev.slice(-49), event]);
    if (skipReasonTimeoutRef.current) clearTimeout(skipReasonTimeoutRef.current);
    skipReasonTimeoutRef.current = setTimeout(() => setSkipReasonToast(''), 2200);
  }, [currentTrack?.id, currentTrack?.title]);
  const closeHeaderSurfaces = useCallback((except = null) => {
    if (except !== 'looks' && except !== 'shortcuts' && except !== 'header') headerControlsRef.current?.close();
    if (except !== 'sleep') sleepTimerControlsRef.current?.close();
    if (except !== 'lock') appLockSettingsRef.current?.close();
    if (except !== 'tips') setIsTipsOverlayOpen(false);
    if (except !== 'shortcuts') {
      setIsShortcutSettingsOpen(false);
      setShortcutSettingsError('');
    }
    if (except !== 'diagnostics') setIsDiagnosticsOpen(false);
    if (except !== 'looks') setIsLooksPanelOpen(false);
    if (except !== 'sleep') setIsSleepTimerMenuOpen(false);
  }, []);
  const markUiInteraction = useCallback((durationMs = 900) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    uiInteractionCooldownUntilRef.current = Math.max(uiInteractionCooldownUntilRef.current || 0, now + durationMs);
  }, []);
  const runAfterInputPaint = useCallback(fn => {
    markUiInteraction(1100);
    if (typeof window === 'undefined') {
      startTransition(fn);
      return;
    }
    window.requestAnimationFrame(() => {
      window.setTimeout(() => startTransition(fn), 0);
    });
  }, [markUiInteraction]);
  const requestDestructiveConfirmation = useCallback((options = {}) => {
    const preferenceKey = String(options.preferenceKey || '');
    const allowDontAskAgain = Boolean(options.allowDontAskAgain && preferenceKey);
    if (allowDontAskAgain && readConfirmationSkipPrefs()[preferenceKey]) {
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      if (destructiveConfirmResolverRef.current) {
        destructiveConfirmResolverRef.current(false);
      }
      destructiveConfirmResolverRef.current = resolve;
      setDestructiveConfirmRequest({
        title: options.title || 'Confirm action?',
        message: options.message || 'This action changes saved Aether data.',
        detail: options.detail || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        allowDontAskAgain,
        preferenceKey
      });
    });
  }, []);
  const closeDestructiveConfirmation = useCallback((confirmed = false, dontAskAgain = false) => {
    if (confirmed && dontAskAgain && destructiveConfirmRequest?.allowDontAskAgain && destructiveConfirmRequest?.preferenceKey) {
      setConfirmationSkipPref(destructiveConfirmRequest.preferenceKey, true);
    }
    const resolve = destructiveConfirmResolverRef.current;
    destructiveConfirmResolverRef.current = null;
    setDestructiveConfirmRequest(null);
    resolve?.(Boolean(confirmed));
  }, [destructiveConfirmRequest]);
  useEffect(() => () => {
    if (destructiveConfirmResolverRef.current) {
      destructiveConfirmResolverRef.current(false);
      destructiveConfirmResolverRef.current = null;
    }
  }, []);
  const openLibraryOverlay = useCallback((target = null) => {
    runAfterInputPaint(() => {
      const favoriteCount = Object.keys(favoriteTracks || {}).length;
      const fallbackPlaylist = viewingPlaylist === FAVORITES_PLAYLIST_ID && favoriteCount > 0 ? FAVORITES_PLAYLIST_ID : viewingPlaylist && playlists[viewingPlaylist] ? viewingPlaylist : favoriteCount > 0 ? FAVORITES_PLAYLIST_ID : playlistOrder.find(name => Array.isArray(playlists[name])) || Object.keys(playlists)[0] || null;
      if (fallbackPlaylist) setViewingPlaylist(fallbackPlaylist);
      setLibraryActionTarget(target);
      setIsLibraryOverlayOpen(true);
    });
  }, [favoriteTracks, playlistOrder, playlists, runAfterInputPaint, viewingPlaylist]);
  const closeLibraryOverlay = useCallback(() => {
    setIsLibraryOverlayOpen(false);
    setLibraryActionTarget(null);
  }, []);
  const openFeedbackPanel = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('feedback');
      setExperienceCenterInitialPage('feedback');
      setIsExperienceCenterOpen(true);
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);
  const openGestureLab = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('gesture');
      setExperienceCenterInitialPage('gesture-face-lab');
      setIsExperienceCenterOpen(true);
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);
  const openSignalLedger = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('ledger');
      setExperienceCenterInitialPage('signal-ledger');
      setIsExperienceCenterOpen(true);
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);
  const openExperienceCenterPage = useCallback((page = 'home') => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('experience');
      setExperienceCenterInitialPage(page || 'home');
      setIsExperienceCenterOpen(true);
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);
  const openMusicImport = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces();
      setMusicImportProvider('');
      setSpotifyImportUrl('');
      setSpotifyImportPlaylistName('');
      setSpotifyImportProgress({
        stage: 'idle',
        progress: 0,
        message: ''
      });
      setSpotifyImportLogs([]);
      setIsSpotifyImportOpen(true);
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);
  const openTipsOverlay = useCallback(() => {
    closeHeaderSurfaces('tips');
    setTipsDontShowAgain(hideFirstRunTips);
    setIsTipsOverlayOpen(true);
  }, [closeHeaderSurfaces, hideFirstRunTips]);
  const persistHideFirstRunTips = usePersistHideFirstRunTipsAction({
    SESSION_UI_STORAGE_KEY,
    isStandalone,
    setUserError
  });
  const closeTipsOverlay = useCallback(() => {
    const nextHide = Boolean(tipsDontShowAgain);
    if (firstRunTipsTimerRef.current) {
      window.clearTimeout(firstRunTipsTimerRef.current);
      firstRunTipsTimerRef.current = null;
    }
    setIsTipsOverlayOpen(false);
    setHideFirstRunTips(nextHide);
    persistHideFirstRunTips(nextHide);
  }, [persistHideFirstRunTips, tipsDontShowAgain]);
  useEffect(() => () => {
    if (firstRunTipsTimerRef.current) {
      window.clearTimeout(firstRunTipsTimerRef.current);
      firstRunTipsTimerRef.current = null;
    }
  }, []);
  const openShortcutSettings = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('shortcuts');
      setShortcutSettingsError('');
      setShortcutDraft(sanitizeShortcutMap(shortcuts, isMacPlatform));
      setExperienceCenterInitialPage('shortcut-settings');
      setIsExperienceCenterOpen(true);
    });
  }, [closeHeaderSurfaces, isMacPlatform, runAfterInputPaint, shortcuts]);
  const openAppLockSettings = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('lock');
      setExperienceCenterInitialPage('app-lock');
      setIsExperienceCenterOpen(true);
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);
  const closeShortcutSettings = useCallback(() => {
    setIsShortcutSettingsOpen(false);
    setShortcutSettingsError('');
  }, []);
  const resetShortcutSettingsToDefaults = useCallback(() => {
    setShortcutSettingsError('');
    setShortcutDraft(sanitizeShortcutMap(DEFAULT_SHORTCUTS, isMacPlatform));
    flashLastAdded('Shortcut defaults staged', 1800, 'warning');
  }, [flashLastAdded, isMacPlatform]);
  const saveShortcutSettings = useSaveShortcutSettingsAction({
    GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY,
    SHORTCUT_FIELDS,
    buildCanonicalShortcutCombo,
    flashLastAdded,
    globalMediaShortcutsEnabled,
    isMacPlatform,
    isShortcutSettingsSaving,
    isStandalone,
    parseShortcutCombo,
    sanitizeShortcutMap,
    setIsShortcutSettingsOpen,
    setIsShortcutSettingsSaving,
    setShortcutSettingsError,
    setShortcuts,
    shortcutDraft,
    toReadableShortcut
  });
  const copyVaultSceneEmbed = useCopyVaultSceneEmbedAction({
    AETHER_SHARE_ORIGIN,
    appendRecentEvent,
    clamp01,
    currentTrack,
    deriveFallbackPulse,
    encodeScenePayload,
    extractSceneYouTubeId,
    formatTime,
    getActivePlaybackPositionMs,
    isPlaying,
    isStandalone,
    livePulseReadout,
    lyrics,
    normalizeScenePayload,
    setIsSharedSceneOpen,
    setLastAdded,
    setSharedScene,
    setSharedSceneEncoded,
    themeColor,
    vaultPulse,
    vaultPulseRef,
    visualizerMode
  });
  const refreshLockStatus = useCallback(async () => {
    if (!isStandalone || !window.aether?.getLockStatus) return;
    try {
      const status = await window.aether.getLockStatus();
      const normalized = {
        enabled: !!status?.enabled,
        touchIdAvailable: !!status?.touchIdAvailable,
        touchIdEnabled: !!status?.touchIdEnabled
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
  const handleEnableLock = useEnableLockAction({
    lockPasswordConfirm,
    lockPasswordInput,
    lockUseTouchId,
    refreshLockStatus,
    setIsLockBusy,
    setIsLockModalOpen,
    setLastAdded,
    setLockError,
    setLockPasswordConfirm,
    setLockPasswordInput
  });
  const handleDisableLock = useDisableLockAction({
    lockDisablePassword,
    refreshLockStatus,
    requestDestructiveConfirmation,
    setIsAppLocked,
    setIsLockBusy,
    setIsLockModalOpen,
    setLastAdded,
    setLockDisablePassword,
    setLockError
  });
  const handleToggleTouchIdLock = useCallback(async enabled => {
    setLockUseTouchId(enabled);
    if (!lockStatus.enabled || !window.aether?.setAppLockTouchId) return;
    const res = await window.aether.setAppLockTouchId(enabled);
    if (res?.success) {
      await refreshLockStatus();
    }
  }, [lockStatus.enabled, refreshLockStatus]);
  const handleVerifyRecoveryPhrase = useCallback(async () => {
    if (!window.aether?.verifyRecoveryPhrase) return;
    const phrase = String(recoveryPhrase || '').trim();
    if (!phrase) return;
    setRecoveryError('');
    setRecoveryBusy(true);
    try {
      const res = await window.aether.verifyRecoveryPhrase(phrase);
      if (!res?.success) {
        setRecoveryError(res?.error || 'Verification failed.');
        return;
      }
      setRecoveryToken(String(res.token || ''));
    } catch (e) {
      setRecoveryError(e?.message || 'Verification failed.');
    } finally {
      setRecoveryBusy(false);
    }
  }, [recoveryPhrase]);
  const handleResetPasswordFromRecovery = useResetPasswordFromRecoveryAction({
    lockUseTouchId,
    recoveryNewPassword,
    recoveryNewPasswordConfirm,
    recoveryToken,
    refreshLockStatus,
    requestDestructiveConfirmation,
    setIsAppLocked,
    setIsForgotPasswordOpen,
    setRecoveryError,
    setRecoveryNewPassword,
    setRecoveryNewPasswordConfirm,
    setRecoveryPhrase,
    setRecoveryResetBusy,
    setRecoveryToken,
    setUnlockPasswordInput
  });
  const handleCopyPhrase = useCallback(() => {
    if (!phraseGenerated) return;
    navigator.clipboard.writeText(phraseGenerated).then(() => {
      setPhraseCopied(true);
      setTimeout(() => setPhraseCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy phrase:', err);
    });
  }, [phraseGenerated]);
  const handleGenerateRecoveryPhrase = useCallback(async () => {
    if (!window.aether?.generateRecoveryPhrase) return;
    setPhraseBusy(true);
    setRecoverySetupError('');
    try {
      const res = await window.aether.generateRecoveryPhrase();
      if (!res?.success) {
        setRecoverySetupError(res?.error || 'Failed to generate phrase.');
        return;
      }
      setPhraseGenerated(String(res.phrase || ''));
      await refreshLockRecoveryStatus();
    } catch (e) {
      setRecoverySetupError(e?.message || 'Failed to generate phrase.');
    } finally {
      setPhraseBusy(false);
    }
  }, [refreshLockRecoveryStatus]);
  useEffect(() => {
    return () => {
      if (skipReasonTimeoutRef.current) clearTimeout(skipReasonTimeoutRef.current);
    };
  }, []);
  useEffect(() => {
    refreshLockStatus();
  }, [refreshLockStatus]);
  useEffect(() => {
    if (!isLibraryOverlayOpen || !isCreatingPlaylist) return;
    const t = setTimeout(() => {
      libraryOverlayCreateInputRef.current?.focus();
      libraryOverlayCreateInputRef.current?.select?.();
    }, 0);
    return () => clearTimeout(t);
  }, [isLibraryOverlayOpen, isCreatingPlaylist]);
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
          setSkipEvents(savedSkipEvents.slice(-50));
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
        window.aether.store.set(SKIP_EVENTS_STORAGE_KEY, skipEvents.slice(-50));
      } else {
        localStorage.setItem(SKIP_EVENTS_STORAGE_KEY, JSON.stringify(skipEvents.slice(-50)));
      }
    } catch (e) {
      console.warn('[Aether/Prefs] Failed to persist skip events', e);
    }
  }, [isStandalone, skipEvents]);
  useEffect(() => {
    const payload = {
      idleMinutes: lockIdleMinutes,
      savedAt: Date.now()
    };
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
    if (!isAutoplayMenuOpen) return;
    const close = () => setIsAutoplayMenuOpen(false);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
    };
  }, [isAutoplayMenuOpen]);
  useLayoutEffect(() => {
    if (!isAutoplayMenuOpen) return;
    const updateMenuPosition = () => {
      const rect = autoplayMenuButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 224;
      const height = 246;
      const margin = 12;
      setAutoplayMenuStyle({
        top: Math.min(window.innerHeight - height - margin, rect.bottom + 8),
        left: Math.min(window.innerWidth - width - margin, Math.max(margin, rect.right - width))
      });
    };
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isAutoplayMenuOpen]);
  useEffect(() => {
    if (!lockStatus.enabled) return;
    const lockNow = () => {
      if (!isAppLockedRef.current) setIsAppLocked(true);
    };
    let idleTimer = null;
    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (isAppLockedRef.current) return;
      const idleMs = Math.max(1, Number(lockIdleMinutesRef.current) || 1) * 60 * 1000;
      idleTimer = setTimeout(() => {
        console.log('[Aether/Lock] Idle timeout lock triggered');
        lockNow();
      }, idleMs);
    };
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    if (lockIdleListenersActiveRef.current) {
      console.warn('[Aether/Perf] App Lock idle listeners were already active; replacing stale listener set.');
    }
    lockIdleListenersActiveRef.current = true;
    activityEvents.forEach(eventName => window.addEventListener(eventName, resetIdle, {
      passive: true
    }));
    resetIdle();
    return () => {
      activityEvents.forEach(eventName => window.removeEventListener(eventName, resetIdle));
      lockIdleListenersActiveRef.current = false;
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [lockStatus.enabled]);
  const getProxyUrl = url => {
    if (!url) return null;
    let processed = String(url);
    if (!processed.trim()) return null;
    processed = processed.startsWith('//') ? 'https:' + processed : processed;
    try {
      const parsed = new URL(processed);
      const isYtImg = /(^|\.)ytimg\.com$/i.test(parsed.hostname);
      const isMaxRes = /\/maxresdefault\.(jpg|webp)$/i.test(parsed.pathname);
      if (isYtImg && isMaxRes) {
        parsed.pathname = parsed.pathname.replace(/maxresdefault\.(jpg|webp)$/i, 'hqdefault.jpg');
        processed = parsed.toString();
      }
    } catch {}
    if (processed.startsWith('http://localhost') || processed.startsWith('http://127.0.0.1')) return processed;
    if (isStandalone) {
      return `http://localhost:${streamPort}/api/proxy?url=${encodeURIComponent(processed)}`;
    }
    return `${API_BASE}/api/proxy?url=${encodeURIComponent(processed)}`;
  };
  useEffect(() => {
    if (!isStandalone) return;
    clearTrackedInterval(deviceSyncIntervalRef, 'device sync');
    deviceSyncIntervalRef.current = window.setInterval(() => {
      axios.post(`http://localhost:${streamPort}/api/device/sync`, {
        isPlaying: isPlayingRef.current,
        currentTime: Math.max(0, Math.floor(currentTimeRef.current || 0)),
        track: currentTrackRef.current
      }).catch(() => {});
    }, 1000);
    return () => {
      if (deviceSyncIntervalRef.current) {
        window.clearInterval(deviceSyncIntervalRef.current);
        deviceSyncIntervalRef.current = 0;
      }
    };
  }, [clearTrackedInterval, isStandalone, streamPort]);
  const getEffectiveGuildId = useCallback(() => {
    const guildId = auth?.guild_id || new URLSearchParams(window.location.search).get('guild_id');
    return guildId && guildId !== '0' ? guildId : DEFAULT_GUILD_ID;
  }, [auth]);
  useEffect(() => {
    effectiveGuildIdRef.current = getEffectiveGuildId();
  }, [getEffectiveGuildId]);
  const getTrackPresetKey = useCallback(track => {
    if (!track) return '';
    if (track.youtubeId) return `yt:${track.youtubeId}`;
    if (track.id) return `id:${track.id}`;
    return `meta:${String(track.title || '').toLowerCase()}|${String(track.author || '').toLowerCase()}`;
  }, []);
  const currentTrackPresetKey = useMemo(() => getTrackPresetKey(currentTrack), [getTrackPresetKey, currentTrack?.id, currentTrack?.youtubeId, currentTrack?.title, currentTrack?.author]);
  const currentManualLyricsEntry = useMemo(() => {
    if (!currentTrackPresetKey) return null;
    return manualLyricsStore[currentTrackPresetKey] || null;
  }, [currentTrackPresetKey, manualLyricsStore]);
  const currentManualLyricsLines = useMemo(() => sortManualLyricsLines(currentManualLyricsEntry?.lines || []), [currentManualLyricsEntry]);
  const persistLyricPresets = useCallback(async nextPresets => {
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
  const persistManualLyricsStore = useCallback(async nextStore => {
    try {
      if (isStandalone && window.aether?.store?.set) {
        await window.aether.store.set(MANUAL_LYRICS_STORAGE_KEY, nextStore);
      } else {
        localStorage.setItem(MANUAL_LYRICS_STORAGE_KEY, JSON.stringify(nextStore));
      }
    } catch (e) {
      console.warn('[Aether/Lyrics] Failed to persist manual lyrics', e);
    }
  }, [isStandalone]);
  const openManualLyricsEditor = useCallback(() => {
    const sourceLines = currentManualLyricsLines.length > 0 ? currentManualLyricsLines : Array.isArray(lyrics) ? sortManualLyricsLines(lyrics) : [];
    const draftLines = sourceLines.length > 0 ? sourceLines.map((line, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      time: Number.isFinite(Number(line?.time)) ? Math.max(0, Math.trunc(Number(line.time))) : 0,
      timestamp: formatManualLyricsTimestamp(Number.isFinite(Number(line?.time)) ? Math.max(0, Math.trunc(Number(line.time))) : 0).slice(1, -1),
      text: String(line?.text || '')
    })) : [{
      id: `${Date.now()}-0-${Math.random().toString(36).slice(2, 8)}`,
      time: Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0)),
      timestamp: formatManualLyricsTimestamp(Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0))).slice(1, -1),
      text: ''
    }];
    setManualLyricsDraft(draftLines);
    setManualLyricsRawText(manualLyricsLinesToLrc(draftLines));
    setManualLyricsDraftError('');
    setIsManualLyricsRawEditorOpen(false);
    setIsManualLyricsTapMode(false);
    setIsManualLyricsEditorOpen(true);
  }, [currentManualLyricsLines, getActivePlaybackPositionMs, lyrics]);
  const updateManualLyricsDraftLine = useCallback((index, patch) => {
    setManualLyricsDraft(prev => {
      const next = prev.map((line, lineIndex) => lineIndex === index ? {
        ...line,
        ...patch
      } : line);
      return next;
    });
  }, []);
  const appendManualLyricsDraftLine = useCallback((timestamp = getActivePlaybackPositionMs()) => {
    setManualLyricsDraft(prev => {
      const nextTimestamp = Math.max(0, Math.trunc(Number(timestamp) || 0));
      const next = [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: nextTimestamp,
        timestamp: formatManualLyricsTimestamp(nextTimestamp).slice(1, -1),
        text: ''
      }];
      return next;
    });
  }, [getActivePlaybackPositionMs]);
  useEffect(() => {
    if (!isManualLyricsEditorOpen) return;
    if (isManualLyricsRawEditorOpen) return;
    setManualLyricsRawText(manualLyricsLinesToLrc(manualLyricsDraft));
  }, [isManualLyricsEditorOpen, isManualLyricsRawEditorOpen, manualLyricsDraft]);
  const setManualLyricsDraftAndSync = useCallback(updater => {
    setManualLyricsDraft(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);
  const loadManualLyricsFromRawText = useCallback(() => {
    const parsed = parseManualLyricsLrcText(manualLyricsRawText);
    if (parsed.length === 0) {
      setManualLyricsDraftError('Paste valid LRC lines before importing.');
      return;
    }
    setManualLyricsDraftAndSync(parsed);
    setManualLyricsDraftError('');
    setIsManualLyricsRawEditorOpen(false);
  }, [manualLyricsRawText, setManualLyricsDraftAndSync]);
  const copyManualLyricsToClipboard = useCallback(async () => {
    const payload = manualLyricsLinesToLrc(manualLyricsDraft);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        setManualLyricsSavedNotice('LRC copied to clipboard');
        setTimeout(() => setManualLyricsSavedNotice(''), 1800);
      }
    } catch (error) {
      console.warn('[Aether/Lyrics] Clipboard copy failed', error);
      setManualLyricsDraftError('Could not copy lyrics to clipboard.');
    }
  }, [manualLyricsDraft]);
  const pasteCurrentLyricsIntoRawEditor = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setManualLyricsRawText(clipboardText || '');
      setIsManualLyricsRawEditorOpen(true);
      setManualLyricsDraftError('');
    } catch (error) {
      console.warn('[Aether/Lyrics] Clipboard paste failed', error);
      setManualLyricsDraftError('Could not read clipboard text.');
    }
  }, []);
  const appendStampedManualLyricsLine = useCallback(() => {
    const nextTimestamp = Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0));
    setManualLyricsDraftAndSync(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: nextTimestamp,
      timestamp: formatManualLyricsTimestamp(nextTimestamp).slice(1, -1),
      text: ''
    }]);
    setIsManualLyricsTapMode(true);
  }, [getActivePlaybackPositionMs, setManualLyricsDraftAndSync]);
  const appendAndStampCurrentLine = useCallback(index => {
    const nextTimestamp = Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0));
    setManualLyricsDraftAndSync(prev => prev.map((line, lineIndex) => lineIndex === index ? {
      ...line,
      time: nextTimestamp,
      timestamp: formatManualLyricsTimestamp(nextTimestamp).slice(1, -1)
    } : line));
  }, [getActivePlaybackPositionMs, setManualLyricsDraftAndSync]);
  const removeManualLyricsDraftLine = useCallback(index => {
    setManualLyricsDraft(prev => prev.filter((_, lineIndex) => lineIndex !== index));
  }, []);
  const stampManualLyricsDraftLine = useCallback(index => {
    setManualLyricsDraft(prev => {
      const nextTimestamp = Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0));
      return prev.map((line, lineIndex) => lineIndex === index ? {
        ...line,
        time: nextTimestamp,
        timestamp: formatManualLyricsTimestamp(nextTimestamp).slice(1, -1)
      } : line);
    });
  }, [getActivePlaybackPositionMs]);
  const handleSaveManualLyrics = useSaveManualLyricsAction({
    currentManualLyricsEntry,
    currentTrack,
    currentTrackPresetKey,
    currentTrackTitle,
    manualLyricsDraft,
    manualLyricsLinesToLrc,
    manualLyricsStoreRef,
    parseManualLyricsTimestamp,
    persistManualLyricsStore,
    setDiagnostics,
    setIsManualLyricsEditorOpen,
    setIsManualLyricsSaving,
    setLyrics,
    setManualLyricsDraft,
    setManualLyricsDraftError,
    setManualLyricsStore,
    sortManualLyricsLines
  });
  const handleSaveLyricPreset = useCallback(async () => {
    if (!currentTrackPresetKey) return;
    const next = {
      ...lyricOffsetPresets,
      [currentTrackPresetKey]: parseLyricOffsetValue(lyricOffsetMs)
    };
    setLyricOffsetPresets(next);
    setIsLyricPresetSaved(true);
    await persistLyricPresets(next);
    appendRecentEvent('sync_saved', `${parseLyricOffsetValue(lyricOffsetMs)}ms`, {
      tone: 'success',
      title: currentTrack?.title || currentTrackTitle
    });
  }, [appendRecentEvent, currentTrack?.title, currentTrackPresetKey, currentTrackTitle, lyricOffsetPresets, lyricOffsetMs, persistLyricPresets]);
  const handleResetLyricPreset = useCallback(async () => {
    const confirmed = await requestDestructiveConfirmation({
      title: 'Reset subtitle sync?',
      message: 'Aether will remove the saved subtitle timing adjustment for this track and return it to 0ms.',
      detail: 'This only changes subtitle timing for the current track.',
      confirmLabel: 'Reset Sync'
    });
    if (!confirmed) return;
    if (!currentTrackPresetKey) {
      setLyricOffsetMs(0);
      setIsLyricPresetSaved(false);
      return;
    }
    const next = {
      ...lyricOffsetPresets
    };
    delete next[currentTrackPresetKey];
    setLyricOffsetPresets(next);
    setLyricOffsetMs(0);
    setIsLyricPresetSaved(false);
    await persistLyricPresets(next);
    appendRecentEvent('sync_reset', 'Subtitle sync reset to 0ms', {
      tone: 'warning',
      title: currentTrack?.title || currentTrackTitle
    });
  }, [appendRecentEvent, currentTrack?.title, currentTrackPresetKey, currentTrackTitle, lyricOffsetPresets, persistLyricPresets, requestDestructiveConfirmation]);
  const trackHasSavedLyrics = useCallback(track => {
    if (!track) return false;
    const keys = new Set([getTrackActionKey(track), track.youtubeId ? `yt:${String(track.youtubeId)}` : '', track.id ? `id:${String(track.id)}` : '', `meta:${String(track.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${String(track.author || track.artist || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`].filter(Boolean));
    return Array.from(keys).some(key => (manualLyricsStoreRef.current?.[key]?.lines || []).length > 0);
  }, [getTrackActionKey]);
  const hasTrackInList = useCallback((list, target) => {
    const key = normalizeTrackIdentity(target);
    return (list || []).some(item => normalizeTrackIdentity(item) === key);
  }, [normalizeTrackIdentity]);
  const isPlaceholderMetadataTitle = value => {
    const title = String(value || '').trim().toLowerCase();
    if (!title) return true;
    return title === 'videoplayback' || title === 'unknown' || title === 'unknown title' || title === 'audio' || title.startsWith('googlevideo') || /^https?:\/\//.test(title);
  };
  const isPlaceholderMetadataAuthor = value => {
    const author = String(value || '').trim().toLowerCase();
    if (!author) return true;
    return author === 'unknown' || author === 'unknown artist' || author === 'youtube';
  };
  const mergeTrackMetadata = (baseTrack, meta) => {
    if (!baseTrack || !meta || typeof meta !== 'object') return baseTrack;
    const merged = {
      ...baseTrack,
      ...meta
    };
    const incomingTitle = String(meta.title || '').trim();
    const incomingAuthor = String(meta.author || '').trim();
    const keepBaseTitle = isPlaceholderMetadataTitle(incomingTitle);
    const keepBaseAuthor = isPlaceholderMetadataAuthor(incomingAuthor);
    merged.title = keepBaseTitle ? String(baseTrack.title || '').trim() : incomingTitle;
    merged.author = keepBaseAuthor ? String(baseTrack.author || '').trim() : incomingAuthor;
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
  const formatDiagTime = useCallback(ts => {
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
  const openSharedScenePayload = useCallback(encoded => {
    if (!encoded) return false;
    const decoded = decodeScenePayload(encoded);
    if (!decoded) return false;
    const normalized = normalizeScenePayload(decoded);
    if (!normalized) return false;
    setSharedScene(normalized);
    setSharedSceneEncoded(encoded);
    setIsSharedSceneOpen(true);
    return true;
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get('scene');
      const fromHash = (url.hash || '').startsWith('#scene=') ? url.hash.slice(7) : null;
      const encoded = fromQuery || fromHash;
      openSharedScenePayload(encoded);
    } catch (e) {
      console.warn('[Aether/Share] Scene parse failed', e);
    }
  }, [openSharedScenePayload]);
  useEffect(() => {
    if (!isStandalone || !window.aether?.onDeepLink) return undefined;
    const unsubscribe = window.aether.onDeepLink(payload => {
      try {
        const rawUrl = typeof payload === 'string' ? payload : payload?.url;
        const url = new URL(rawUrl);
        const encoded = url.searchParams.get('scene') || (url.hash || '').replace(/^#scene=/, '');
        if (encoded && openSharedScenePayload(encoded)) {
          flashLastAdded('Shared scene opened', 1800, 'success');
        }
      } catch (e) {
        console.warn('[Aether/Share] Deep link parse failed', e);
        flashLastAdded('Shared scene link could not open', 2200, 'error');
      }
    });
    return typeof unsubscribe === 'function' ? unsubscribe : undefined;
  }, [flashLastAdded, isStandalone, openSharedScenePayload]);
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
    manualLyricsStoreRef.current = manualLyricsStore || {};
  }, [manualLyricsStore]);
  useEffect(() => {
    const loadManualLyrics = async () => {
      try {
        let loaded = {};
        if (isStandalone && window.aether?.store?.get) {
          loaded = await window.aether.store.get(MANUAL_LYRICS_STORAGE_KEY);
        } else {
          const raw = localStorage.getItem(MANUAL_LYRICS_STORAGE_KEY);
          loaded = raw ? JSON.parse(raw) : {};
        }
        if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
          const normalizedStore = Object.fromEntries(Object.entries(loaded).map(([trackKey, entry]) => [trackKey, {
            ...(entry && typeof entry === 'object' ? entry : {}),
            trackKey,
            lines: sortManualLyricsLines(entry?.lines || [])
          }]));
          manualLyricsStoreRef.current = normalizedStore;
          setManualLyricsStore(normalizedStore);
        }
      } catch (error) {
        console.warn('[Aether/Lyrics] Failed to load manual lyrics', error);
      }
    };
    loadManualLyrics();
  }, [isStandalone]);
  useEffect(() => {
    if (!currentTrackPresetKey) return;
    const hasPreset = Object.prototype.hasOwnProperty.call(lyricOffsetPresets, currentTrackPresetKey);
    const presetValue = hasPreset ? parseLyricOffsetValue(lyricOffsetPresets[currentTrackPresetKey]) : 0;
    setLyricOffsetMs(presetValue);
    setIsLyricPresetSaved(hasPreset);
  }, [currentTrackPresetKey, lyricOffsetPresets]);
  useEffect(() => {
    if (!currentTrackPresetKey) {
      setIsLyricPresetSaved(false);
      return;
    }
    const hasPreset = Object.prototype.hasOwnProperty.call(lyricOffsetPresets, currentTrackPresetKey);
    if (!hasPreset) {
      setIsLyricPresetSaved(false);
      return;
    }
    const presetValue = parseLyricOffsetValue(lyricOffsetPresets[currentTrackPresetKey]);
    setIsLyricPresetSaved(parseLyricOffsetValue(lyricOffsetMs) === presetValue);
  }, [currentTrackPresetKey, lyricOffsetMs, lyricOffsetPresets]);
  const normalizeWebPlaybackCandidate = useCallback(track => {
    if (!track || typeof track !== 'object') return null;
    const trackUrl = track.actualUrl || track.url || track.link || track.webpage_url || '';
    const youtubeId = track.youtubeId || extractYouTubeId(trackUrl || track.id || track.thumbnail || '');
    if (!youtubeId) return null;
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    const durationMs = Number(track.totalDurationMs || track.durationMs || track.duration || 0);
    return {
      ...track,
      id: track.id || youtubeId,
      youtubeId,
      actualUrl: url,
      url,
      title: track.title || track.name || 'Unknown Track',
      author: track.author || track.artist || track.channel || 'Unknown Artist',
      artist: track.artist || track.author || track.channel || 'Unknown Artist',
      thumbnail: track.thumbnail || track.artwork || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      duration: durationMs,
      totalDurationMs: durationMs,
      source: track.source || 'youtube'
    };
  }, []);
  const tryWebPlaybackFallback = useWebPlaybackFallbackAction({
    API_BASE,
    axios,
    flashLastAdded,
    isStandalone,
    normalizeWebPlaybackCandidate,
    queueRef,
    setDiagnostics,
    setIsAudioBuffering,
    setIsManualStop,
    setIsPlaying,
    setQueue,
    webPlaybackFallbackRef
  });
  useWebYoutubePlayback({
    advanceQueueRef,
    currentTimeRef,
    currentTrack,
    currentTrackRef,
    extractYouTubeId,
    isPlayingRef,
    isStandalone,
    loadYouTubeIframeApi,
    setCurrentTime,
    setDiagnostics,
    setIsAudioBuffering,
    setIsPlaying,
    tryWebPlaybackFallback,
    undefined,
    volumeRef,
    webAudioUnlockedRef,
    webTrackLoadKeyRef,
    youtubePlayerRef,
    youtubeProgressTimerRef
  });
  useEffect(() => {
    if (isStandalone) return;
    const player = youtubePlayerRef.current;
    if (!player) return;
    try {
      player.setVolume?.(Math.round(volume * 100));
      if (isPlaying && webAudioUnlocked) {
        player.playVideo?.();
      } else {
        player.pauseVideo?.();
      }
    } catch {}
  }, [isStandalone, isPlaying, volume, webAudioUnlocked]);
  useEffect(() => {
    if (!sessionReadyRef.current) return;
    const uiPrefs = {
      visualizerMode,
      auraPreset,
      isVerticalStack,
      isFocusedMode,
      miniPlayerInfoMode,
      isAutoplayEnabled,
      autoplayMoodMode,
      isDoodleMode,
      doodleIntensity,
      performanceMode,
      isDepthMotionEnabled,
      isGestureControlEnabled,
      hideFirstRunTips,
      savedAt: Date.now()
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
  }, [isStandalone, visualizerMode, auraPreset, isVerticalStack, isFocusedMode, miniPlayerInfoMode, isAutoplayEnabled, autoplayMoodMode, isDoodleMode, doodleIntensity, performanceMode, isDepthMotionEnabled, isGestureControlEnabled, hideFirstRunTips]);
  useEffect(() => {
    if (!sessionReadyRef.current) return;
    try {
      if (isStandalone && window.aether?.store?.set) {
        window.aether.store.set(SHORTCUTS_STORAGE_KEY, shortcuts);
      } else {
        localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
      }
    } catch (e) {
      console.warn('[Aether/Shortcuts] Failed to persist shortcut map', e);
    }
  }, [isStandalone, shortcuts]);
  useEffect(() => {
    if (!isStandalone) return undefined;
    const persistPlayback = () => {
      if (!sessionReadyRef.current) return;
      const playback = {
        queue: queueRef.current.slice(0, 120),
        isPlaying: !!isPlayingRef.current,
        currentTime: Math.max(0, Math.floor(currentTimeRef.current || 0)),
        savedAt: Date.now()
      };
      try {
        window.aether?.store?.set?.(SESSION_PLAYBACK_STORAGE_KEY, playback);
      } catch (e) {
        console.warn('[Aether/Session] Failed to persist playback', e);
      }
    };
    persistPlayback();
    const interval = window.setInterval(persistPlayback, 5000);
    return () => window.clearInterval(interval);
  }, [isStandalone]);
  const updateDiscordRichPresence = createUpdateDiscordRichPresenceAction({
    discordSdkRef,
    queue
  });
  const fetchQueue = createFetchQueueAction({
    API_BASE,
    axios,
    currentTimeRef,
    currentTrackTitle,
    getEffectiveGuildId,
    isPlayingRef,
    isStandalone,
    localAudioRef,
    setCurrentTime,
    setCurrentTrackTitle,
    setDiagnostics,
    setIsAudioBuffering,
    setIsPlaying,
    setQueue,
    updateDiscordRichPresence,
    webTrackLoadKeyRef,
    youtubePlayerRef
  });
  useStandaloneSessionBoot({
    AURA_PRESETS,
    AUTOPLAY_MOOD_MODES,
    DEFAULT_SHORTCUTS,
    FAVORITES_STORAGE_KEY,
    GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY,
    PERFORMANCE_MODES,
    PLAYLIST_ORDER_STORAGE_KEY,
    SESSION_PLAYBACK_STORAGE_KEY,
    SESSION_UI_STORAGE_KEY,
    SHORTCUTS_STORAGE_KEY,
    defaultGlobalMediaShortcutsEnabled,
    discordQueuePollIntervalRef,
    discordSdkRef,
    fetchQueue,
    fetchQueueRef,
    firstRunTipsTimerRef,
    isFinite,
    isMacPlatform,
    isStandalone,
    lastWindowModeChangeRef,
    localAudioRef,
    normalizeQueueTrack,
    pendingResumeTimeRef,
    playlistOrderHydratedRef,
    sanitizeShortcutMap,
    sessionReadyRef,
    setAuraPreset,
    setAuth,
    setAutoplayMoodMode,
    setCurrentTime,
    setDoodleIntensity,
    setDownloadedTracks,
    setFavoriteTracks,
    setGlobalMediaShortcutsEnabled,
    setHideFirstRunTips,
    setIsAutoplayEnabled,
    setIsDepthMotionEnabled,
    setIsDoodleMode,
    setIsFocusedMode,
    setIsGestureControlEnabled,
    setIsMaximized,
    setIsPlaying,
    setIsTipsOverlayOpen,
    setIsVerticalStack,
    setLoading,
    setMiniPlayerInfoMode,
    setOfflineDownloads,
    setPendingResumeTime,
    setPerformanceMode,
    setPlaylistOrder,
    setPlaylists,
    setQueue,
    setSessionRestoreNotice,
    setShortcutDraft,
    setShortcuts,
    setTipsDontShowAgain,
    setUpdateInfo,
    setVisualizerMode,
    setVoiceChannel,
    setVolume,
    setupDiscordSdk,
    undefined
  }); // --- AETHER: STANDALONE PLAYBACK LOOP (NOVA ---
  const showRuntimeIssuePrompt = useCallback(nextPrompt => {
    if (!isStandalone || runtimeIssueDismissedRef.current) return;
    setRuntimeIssuePrompt({
      title: 'Playback Tools Need Repair',
      message: 'Aether could not confirm the local download engine. Repair can reinstall or relink yt-dlp and FFmpeg automatically.',
      actionLabel: 'Repair Runtime',
      ...nextPrompt
    });
  }, [isStandalone]);
  const warmupTrack = createWarmupTrackAction({
    downloadedTracks,
    extractYouTubeId,
    isWarmupUnavailable,
    setDownloadedTracks,
    setIsWarmupUnavailable,
    setLastAdded,
    setWarmingTrackIds,
    showRuntimeIssuePrompt,
    warmupRetryRef
  });
  const resolveWarmupTrackId = useCallback(track => {
    if (!track) return null;
    const derivedYoutubeId = track.youtubeId || extractYouTubeId(track.actualUrl || track.url || track.id);
    const idFromTrack = /^[A-Za-z0-9_-]{11}$/.test(String(track.id || '')) ? String(track.id) : null;
    return derivedYoutubeId || idFromTrack || track.id || null;
  }, []);
  useStandalonePlaybackLoop({
    API_BASE,
    Audio,
    advanceQueueRef,
    bufferingRescueRef,
    currentTimeRef,
    downloadedTracks,
    encodeURIComponent,
    flashLastAdded,
    isOfflineMode,
    isPlayingRef,
    isStandalone,
    liveStreamStartOffsetMsRef,
    localAudioRef,
    pendingResumeTimeRef,
    playbackResetNonce,
    prematureEndGuardRef,
    queue,
    resolveWarmupTrackId,
    setCurrentTime,
    setCurrentTrackTitle,
    setDiagnostics,
    setIsAudioBuffering,
    setIsPlaying,
    setLastAdded,
    setOauthPrompt,
    setPendingResumeTime,
    setQueue,
    standaloneTrackLoadKeyRef,
    streamFailureRef,
    streamPort,
    undefined,
    videoModeRef,
    volume,
    warmingTrackIds,
    warmupTrack,
    youtubeAuthRequiredRef
  });
  useBufferingRescue({
    bufferingRescueRef,
    currentTimeRef,
    currentTrack,
    flashLastAdded,
    isAudioBuffering,
    isPlaying,
    isStandalone,
    localAudioRef,
    setIsAudioBuffering,
    setIsPlaying,
    setOauthPrompt,
    streamPort,
    videoModeRef,
    youtubeAuthRequiredRef
  });
  useEffect(() => {
    if (!isStandalone || videoMode || !isPlaying || !isAudioBuffering) return;
    if (!localAudioRef.current) return;
    let timer = null;
    const syncHealthyPlaybackState = () => {
      const audio = localAudioRef.current;
      if (!audio || videoModeRef.current) return;
      const progressMs = Math.max(0, Math.floor((audio.currentTime || 0) * 1000), Math.floor(currentTimeRef.current || 0));
      const healthyPlayback = !audio.paused && !audio.ended && (audio.readyState >= 3 || progressMs > 350);
      if (healthyPlayback) {
        setIsAudioBuffering(false);
        return;
      }
      timer = window.setTimeout(syncHealthyPlaybackState, 250);
    };
    syncHealthyPlaybackState();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isStandalone, videoMode, isPlaying, isAudioBuffering, currentTrack?.id, currentTrack?.queueNonce]);
  useEffect(() => {
    if (!isStandalone || videoMode || !isPlaying || !currentTrack) return;
    if (!localAudioRef.current) return;
    const interval = window.setInterval(() => {
      const audio = localAudioRef.current;
      if (!audio || videoModeRef.current) return;
      const nextMs = Math.max(0, Math.floor((audio.currentTime || 0) * 1000));
      if (Math.abs(nextMs - currentTimeRef.current) >= 500) {
        currentTimeRef.current = nextMs;
        setCurrentTime(nextMs);
      }
      const isHealthy = !audio.paused && !audio.ended && (audio.readyState >= 2 || nextMs > 0);
      if (isHealthy && isAudioBuffering) {
        setIsAudioBuffering(false);
      }
    }, 750);
    return () => window.clearInterval(interval);
  }, [isStandalone, videoMode, isPlaying, currentTrack?.id, currentTrack?.queueNonce, isAudioBuffering]);
  useEffect(() => {
    if (visualizerMode !== 'off') return;
    if (visualizerCanvasRef.current) {
      const canvas = visualizerCanvasRef.current;
      canvas.getContext('2d', {
        alpha: true
      })?.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    }
    if (pulseCanvasRef.current) {
      const canvas = pulseCanvasRef.current;
      canvas.getContext('2d', {
        alpha: true
      })?.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    }
    if (document.documentElement) {
      document.documentElement.style.setProperty('--aura-beat-pulse', '0');
      document.documentElement.style.setProperty('--aura-edge-glow', '0');
      document.documentElement.style.setProperty('--aura-kick-shift', '0deg');
      document.documentElement.style.setProperty('--aura-kick-glow', '0');
    }
  }, [visualizerMode]);

  // --- AETHER: UNIFIED DISCORD RPC ENGINE (NOVA ---
  useDiscordActivitySync({
    IDLE_PHRASES,
    currentTime,
    currentTimeRef,
    idlePhraseRef,
    idleStartTimeRef,
    isPlaying,
    isStandalone,
    lastRPCPlayingRef,
    lastRPCTrackIdRef,
    partyInfo,
    queue,
    videoMode
  }); // Combined effect replaced the previous two RPC effects
  // Handle Play/Pause sync
  useEffect(() => {
    if (!isStandalone || !localAudioRef.current) return;
    if (isPlaying) {
      if (localAudioRef.current && !videoModeRef.current) localAudioRef.current.play().catch(() => {});
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    } else {
      localAudioRef.current.pause();
      setIsAudioBuffering(false);
      if (audioCtxRef.current?.state === 'running') {
        audioCtxRef.current.suspend().catch(() => {});
      }
    }
  }, [isPlaying, isStandalone, videoMode]);

  // Audio Visualizer Loop (NOVA
  useAudioVisualizerLoop({
    AURA_PRESETS,
    AURA_PRESETS_MAP,
    Float32Array,
    Uint8Array,
    alphaHex,
    analyserRef,
    animationFrameRef,
    audioCtxRef,
    auraEnergyRef,
    beatRingsRef,
    clamp01,
    currentTimeRef,
    currentTrack,
    currentTrackRef,
    getComputedStyle,
    isPlayingRef,
    isStandalone,
    lastBeatRingTimeRef,
    lastVaultStateUpdateRef,
    lerp,
    localAudioRef,
    mixtapeVaultRef,
    performanceMode,
    playbackResetNonce,
    pulseCanvasRef,
    setVaultPulse,
    setVaultSpectrum,
    sourceRef,
    uiInteractionCooldownUntilRef,
    uiPulseRef,
    undefined,
    vaultPulseRef,
    vaultTelemetryRef,
    visualizerBarsRef,
    visualizerCanvasRef,
    visualizerErrorCountRef,
    visualizerFrameBudgetRef,
    visualizerStateRef
  });
  const handleVolumeChange = useCallback(val => {
    const v = parseFloat(val);
    if (!isFinite(v)) return;
    const finalV = Math.max(0, Math.min(1, v));
    setVolume(finalV);
    if (localAudioRef.current) localAudioRef.current.volume = finalV;
    window.aether?.store?.set('volume', finalV);
  }, []);
  const orderedPlaylistNames = useMemo(() => {
    const seen = new Set();
    const ordered = [];
    playlistOrder.forEach(name => {
      if (playlists[name] && !seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    });
    Object.keys(playlists).forEach(name => {
      if (!seen.has(name)) ordered.push(name);
    });
    return ordered;
  }, [playlists, playlistOrder]);
  const persistPlaylistOrder = useCallback(nextOrder => {
    setPlaylistOrder(nextOrder);
    window.aether?.store?.set(PLAYLIST_ORDER_STORAGE_KEY, nextOrder);
  }, []);
  const movePlaylist = useCallback((name, direction) => {
    setPlaylistOrder(prev => {
      const current = prev.length ? prev : Object.keys(playlists);
      const index = current.indexOf(name);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      window.aether?.store?.set(PLAYLIST_ORDER_STORAGE_KEY, next);
      return next;
    });
  }, [playlists]);
  const reorderPlaylistByDrag = useCallback((targetName, draggedNameOverride = null) => {
    const activeDraggedName = draggedNameOverride || draggedPlaylistName;
    if (!activeDraggedName || !targetName || activeDraggedName === targetName) {
      setDraggedPlaylistName(null);
      return;
    }
    const current = orderedPlaylistNames;
    const from = current.indexOf(activeDraggedName);
    const to = current.indexOf(targetName);
    if (from < 0 || to < 0) {
      setDraggedPlaylistName(null);
      return;
    }
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistPlaylistOrder(next);
    setDraggedPlaylistName(null);
  }, [draggedPlaylistName, orderedPlaylistNames, persistPlaylistOrder]);
  const reorderQueueByDrag = useCallback((targetIndex, draggedIndexOverride = null) => {
    const from = Number(draggedIndexOverride ?? draggedQueueIndex);
    const to = Number(targetIndex);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from === to) {
      setDraggedQueueIndex(null);
      return;
    }
    setQueue(prev => {
      if (!Array.isArray(prev) || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggedQueueIndex(null);
  }, [draggedQueueIndex]);
  useEffect(() => {
    if (!playlistOrderHydratedRef.current) return;
    const playlistNames = Object.keys(playlists);
    if (playlistNames.length === 0) return;
    const nextOrder = playlistOrder.filter(name => playlistNames.includes(name));
    playlistNames.forEach(name => {
      if (!nextOrder.includes(name)) nextOrder.push(name);
    });
    const differs = nextOrder.length !== playlistOrder.length || nextOrder.some((name, idx) => name !== playlistOrder[idx]);
    if (differs) {
      setPlaylistOrder(nextOrder);
      window.aether?.store?.set(PLAYLIST_ORDER_STORAGE_KEY, nextOrder);
    }
  }, [playlists, playlistOrder]);
  const handleAddToPlaylist = useAddToPlaylistAction({
    hasTrackInList,
    normalizeQueueTrack,
    persistPlaylistOrder,
    playlistOrder,
    playlists,
    setActiveMenuTrack,
    setLastAdded,
    setPlaylists
  });
  const libraryInsights = useLibraryInsights({
    downloadedTracks,
    extractYouTubeId,
    normalizeTrackIdentity,
    playlists,
    trackHasSavedLyrics
  });
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
    const shuffled = [...smartMixTracks].sort(() => Math.random() - 0.5);
    const pickCount = Math.min(shuffled.length, Math.max(5, Math.ceil(shuffled.length * 0.5)));
    const selected = shuffled.slice(0, pickCount);
    let added = 0;
    setQueue(prev => {
      const next = Array.isArray(prev) ? [...prev] : [];
      selected.forEach(track => {
        if (!hasTrackInList(next, track)) {
          next.push(track);
          added += 1;
        }
      });
      return next;
    });
    setLastAdded(added > 0 ? `Smart Mix queued • ${added} tracks` : 'Smart Mix already in queue');
    setTimeout(() => setLastAdded(null), 2800);
  }, [smartMixTracks, hasTrackInList]);
  const handleCleanVault = useCleanVaultAction({
    extractYouTubeId,
    isStandalone,
    isVaultCleaning,
    mergeTrackMetadata,
    normalizeTrackIdentity,
    persistPlaylistOrder,
    playlists,
    requestDestructiveConfirmation,
    setIsVaultCleaning,
    setLastAdded,
    setPlaylists
  });
  const activeLyric = useMemo(() => {
    if (!lyrics || lyrics.length === 0 || activeLyricIndex < 0) return null;
    return lyrics[activeLyricIndex]?.text || null;
  }, [lyrics, activeLyricIndex]);
  const compactLyric = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return null;
    return lyrics[activeLyricIndex]?.text || activeLyric || null;
  }, [lyrics, activeLyricIndex, activeLyric]);
  const nextLyric = useMemo(() => {
    if (!Array.isArray(lyrics) || activeLyricIndex < 0) return null;
    const candidate = lyrics[activeLyricIndex + 1]?.text?.trim();
    if (!candidate || candidate === compactLyric) return null;
    return candidate;
  }, [lyrics, activeLyricIndex, compactLyric]);
  const handleAdd = createHandleAddAction({
    downloadedTracks,
    flashLastAdded,
    isOfflineMode,
    isStandalone,
    mergeTrackMetadata,
    normalizeQueueTrack,
    resolveWarmupTrackId,
    setAddingIds,
    setIsAutoplaySeeking,
    setIsManualStop,
    setIsPlaying,
    setLastAdded,
    setQueue,
    warmupTrack
  });
  const triggerAutoplay = createTriggerAutoplay({
    autoplayRequestRef,
    autoplayMoodMode,
    currentTrack,
    handleAdd,
    history,
    isAutoplayEnabled,
    isOfflineMode,
    isStandalone,
    normalizeTrackIdentity,
    queue,
    setIsAutoplaySeeking,
    skipEvents
  });
  useEffect(() => {
    fetchQueueRef.current = fetchQueue;
  });
  useEffect(() => {
    if (isStandalone) return undefined;
    clearTrackedInterval(remoteHeartbeatIntervalRef, 'remote heartbeat');
    remoteHeartbeatIntervalRef.current = window.setInterval(() => {
      const hasRemoteQueue = Boolean(discordSdkRef.current?.guildId);
      if (hasRemoteQueue) fetchQueueRef.current?.();
      if (hasRemoteQueue && isPlayingRef.current) {
        // Heartbeat Sync (NOVA)
        axios.post(`${API_BASE}/api/heartbeat/${effectiveGuildIdRef.current || DEFAULT_GUILD_ID}`, {
          currentTime: Math.max(0, Math.floor(currentTimeRef.current || 0)),
          isPlaying: true
        }).catch(() => {});
      }
    }, 3000);
    return () => {
      if (remoteHeartbeatIntervalRef.current) {
        window.clearInterval(remoteHeartbeatIntervalRef.current);
        remoteHeartbeatIntervalRef.current = 0;
      }
    };
  }, [clearTrackedInterval, isStandalone]);

  // Autoplay Trigger Logic
  useEffect(() => {
    if (!isOfflineMode && isStandalone && isAutoplayEnabled && queue.length === 0 && !isManualStop && !isAutoplaySeeking) {
      const seed = currentTrack || history[0] || prevTrackRef.current;
      if (seed) {
        console.log('[Aether/Autoplay] Queue empty, triggering autoplay', {
          seedTitle: seed.title,
          seedId: seed.id,
          from: currentTrack ? 'current' : history[0] ? 'history' : 'previous-ref'
        });
        triggerAutoplay(seed);
      }
    }
  }, [queue.length, isAutoplayEnabled, isOfflineMode, isStandalone, isManualStop, isAutoplaySeeking, currentTrack, history, autoplayMoodMode, skipEvents]);
  useEffect(() => {
    if (!isStandalone || !window.aether?.onSpotifyImportProgress) return;
    const onSpotifyImportProgress = payload => {
      appendSpotifyImportLog(`${payload?.stage || 'working'} ${Number.isFinite(payload?.progress) ? `${payload.progress}%` : ''} ${payload?.message || ''}`.trim());
      setSpotifyImportProgress({
        stage: payload?.stage || 'working',
        progress: Number.isFinite(payload?.progress) ? payload.progress : 0,
        message: payload?.message || ''
      });
    };
    const unsubscribe = window.aether.onSpotifyImportProgress(onSpotifyImportProgress);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [appendSpotifyImportLog, isStandalone]);

  // --- AETHER: DYNAMIC THEME SYNC (NOVA ---
  useDynamicThemeSync({
    Image,
    buildTrackPaletteFromRgb,
    currentTrack,
    getTrackFallbackPalette,
    setThemeColor,
    setTrackPalette,
    trackPaletteCacheRef
  }); // --- AETHER: HARDWARE MEDIA SESSION BRIDGE (NOVA ---
  useDiscordQueueBridge({
    handleControlRef,
    isStandalone,
    localAudioRef,
    setStreamPort,
    setVolume,
    showVolumeToastFor
  });
  useEffect(() => {
    const SEQUENCE = 'mixtape';
    const handleKeyDown = e => {
      if (e.defaultPrevented || e.repeat || isNativeKeyboardTarget(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!e.key || e.key.length !== 1) {
        typedBufferRef.current = '';
        return;
      }
      const next = `${typedBufferRef.current}${e.key.toLowerCase()}`.slice(-SEQUENCE.length);
      typedBufferRef.current = next;
      if (next === SEQUENCE) {
        typedBufferRef.current = '';
        markUiInteraction(1100);
        setIsMixtapeVaultOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [markUiInteraction]);
  const fetchSystemStats = useCallback(async () => {
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
        lastSystemError: null
      }));
    } catch (err) {
      setDiagnostics(prev => ({
        ...prev,
        lastSystemFetchAt: Date.now(),
        lastSystemError: err?.message || 'system fetch failed'
      }));
    }
  }, [isStandalone]);
  useEffect(() => {
    if (isStandalone) return undefined;
    const controller = new AbortController();
    const wakeBackend = async () => {
      const startedAt = performance.now();
      try {
        await fetch(`${API_BASE}/api/system`, {
          signal: controller.signal,
          cache: 'no-store'
        });
        setDiagnostics(prev => ({
          ...prev,
          lastSystemFetchMs: Math.round(performance.now() - startedAt),
          lastSystemFetchAt: Date.now(),
          lastSystemError: null
        }));
      } catch (err) {
        if (controller.signal.aborted) return;
        setDiagnostics(prev => ({
          ...prev,
          lastSystemFetchAt: Date.now(),
          lastSystemError: err?.message || 'backend wake failed'
        }));
      }
    };
    wakeBackend();
    return () => controller.abort();
  }, [isStandalone]);
  useEffect(() => {
    if (!isDiagnosticsOpen) return undefined;
    fetchSystemStats();
    const statsInterval = window.setInterval(fetchSystemStats, 10000);
    return () => window.clearInterval(statsInterval);
  }, [fetchSystemStats, isDiagnosticsOpen]);
  const refreshStorageStats = useCallback(async () => {
    if (!isStandalone || !window.aether?.getStorageStats) return;
    try {
      const res = await window.aether.getStorageStats();
      if (res?.success) {
        setStorageStats(res);
        if (res?.policy) {
          setStoragePolicy({
            cacheCapMb: res.policy.cacheCapMb || 2048,
            maxCacheAgeDays: res.policy.maxCacheAgeDays || 30
          });
        }
      }
    } catch (e) {
      console.warn('[Aether/Storage] stats fetch failed', e);
    }
  }, [isStandalone]);
  const refreshEngineStatus = useCallback(async () => {
    if (!isStandalone || !window.aether?.getEngineStatus) return;
    try {
      const res = await window.aether.getEngineStatus();
      if (res?.success) {
        setEngineStatus(res);
      }
    } catch (e) {
      console.warn('[Aether/Diagnostics] engine status fetch failed', e);
    }
  }, [isStandalone]);
  useEffect(() => {
    try {
      runtimeIssueDismissedRef.current = sessionStorage.getItem('aether.runtimeIssueDismissed') === 'true';
    } catch {
      runtimeIssueDismissedRef.current = false;
    }
  }, []);
  const dismissRuntimeIssuePrompt = useCallback(() => {
    runtimeIssueDismissedRef.current = true;
    try {
      sessionStorage.setItem('aether.runtimeIssueDismissed', 'true');
    } catch {}
    setRuntimeIssuePrompt(null);
  }, []);
  const handleRepairEnvironment = useCallback(async () => {
    if (!isStandalone || !window.aether?.repairEnvironment) return;
    const confirmed = await requestDestructiveConfirmation({
      title: 'Repair playback environment?',
      message: 'Aether will inspect local playback helpers and may relink bundled runtime paths.',
      detail: 'This can change local helper settings used for yt-dlp and FFmpeg.',
      confirmLabel: 'Repair Environment'
    });
    if (!confirmed) return;
    setRepairResult({
      status: 'running'
    });
    try {
      const res = await window.aether.repairEnvironment();
      setRepairResult({
        status: 'done',
        result: res
      });
      // refresh engine status after repair attempt
      await refreshEngineStatus();
    } catch (e) {
      setRepairResult({
        status: 'error',
        error: e?.message || String(e)
      });
    }
  }, [isStandalone, refreshEngineStatus, requestDestructiveConfirmation]);
  const handleAttemptFixes = useAttemptFixesAction({
    isStandalone,
    refreshEngineStatus,
    requestDestructiveConfirmation,
    runtimeIssueDismissedRef,
    setRepairResult,
    setRuntimeIssuePrompt
  });
  const handleRunInstaller = useCallback(async () => {
    if (!isStandalone || !window.aether?.runInstaller) return;
    try {
      const res = await window.aether.runInstaller();
      if (!res?.success && res?.releasesUrl) {
        // Open releases page in default browser
        if (window.aether?.openExternal) {
          window.aether.openExternal(res.releasesUrl);
        } else {
          window.open(res.releasesUrl, '_blank');
        }
      }
      // Save result for user to see
      setRepairResult(prev => ({
        ...(prev || {}),
        installerResult: res
      }));
    } catch (e) {
      setRepairResult(prev => ({
        ...(prev || {}),
        installerResult: {
          success: false,
          error: e?.message || String(e)
        }
      }));
    }
  }, [isStandalone]);
  const handleImportCookies = useImportCookiesAction({
    appendRecentEvent,
    isStandalone,
    refreshEngineStatus,
    setLastAdded,
    setOauthPrompt,
    youtubeAuthRequiredRef
  });
  useEffect(() => {
    if (!isStandalone || !engineStatus) return;
    if (engineStatus.ytDlpReady && engineStatus.ffmpegReady) {
      setRuntimeIssuePrompt(null);
      return;
    }
    showRuntimeIssuePrompt({
      title: 'Download Engine Needs Attention',
      message: engineStatus.ytDlpReady ? 'FFmpeg is missing or not executable. Repair Runtime can relink the bundled binary or guide you to the release installer.' : 'yt-dlp is missing or not executable. Repair Runtime can fetch the correct binary for this platform.'
    });
  }, [engineStatus, isStandalone, showRuntimeIssuePrompt]);
  useEffect(() => {
    if (!isStandalone || !window.aether?.onUserError) return undefined;
    const unsubscribe = window.aether.onUserError((payload = {}) => {
      const errorText = String(payload?.message || payload?.error || '').toLowerCase();
      if (!/(yt-dlp|ffmpeg|ffprobe|enoent|eacces|eperm|spawn)/.test(errorText)) return;
      showRuntimeIssuePrompt({
        title: 'Playback Engine Error',
        message: payload?.message || 'Aether hit a local playback tool error. Repair Runtime can attempt an automatic fix.'
      });
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isStandalone, showRuntimeIssuePrompt]);
  const handleCopyDiagnosticsValue = useCallback(async (value, successLabel = 'Copied to clipboard') => {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', 'true');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setLastAdded(successLabel);
      appendRecentEvent('copied', successLabel, {
        tone: 'success'
      });
      setTimeout(() => setLastAdded(null), 1800);
    } catch (error) {
      console.warn('[Aether/Diagnostics] clipboard copy failed', error);
      appendRecentEvent('copy_failed', error?.message || 'Clipboard copy failed', {
        tone: 'error'
      });
      setLastAdded('Clipboard copy failed');
      setTimeout(() => setLastAdded(null), 1800);
    }
  }, [appendRecentEvent]);
  const applyStoragePolicy = useCallback(async nextPolicy => {
    if (!isStandalone || !window.aether?.updateStoragePolicy) return;
    try {
      const res = await window.aether.updateStoragePolicy(nextPolicy);
      if (res?.success && res?.policy) {
        setStoragePolicy({
          cacheCapMb: res.policy.cacheCapMb,
          maxCacheAgeDays: res.policy.maxCacheAgeDays
        });
      }
    } catch (e) {
      console.warn('[Aether/Storage] policy update failed', e);
    }
  }, [isStandalone]);
  const refreshStorageEstimate = useCallback(async () => {
    if (!isStandalone || !window.aether?.getStorageEstimate) return;
    try {
      const [capRes, ageRes, downloadsRes] = await Promise.all([window.aether.getStorageEstimate({
        mode: 'cap',
        cacheCapMb: storagePolicy.cacheCapMb
      }), window.aether.getStorageEstimate({
        mode: 'age',
        maxCacheAgeDays: storagePolicy.maxCacheAgeDays
      }), window.aether.getStorageEstimate({
        mode: 'downloads-only'
      })]);
      setStorageEstimate({
        cap: capRes?.success ? capRes : null,
        age: ageRes?.success ? ageRes : null,
        downloadsOnly: downloadsRes?.success ? downloadsRes : null
      });
    } catch (e) {
      console.warn('[Aether/Storage] estimate fetch failed', e);
    }
  }, [isStandalone, storagePolicy.cacheCapMb, storagePolicy.maxCacheAgeDays]);
  const runStorageOptimize = useStorageOptimizeAction({
    isStandalone,
    refreshStorageEstimate,
    refreshStorageStats,
    requestDestructiveConfirmation,
    setIsStorageBusy,
    setLastAdded,
    storagePolicy
  });
  const refreshOfflineDownloads = useCallback(async () => {
    if (!isStandalone) return;
    try {
      if (window.aether?.getOfflineDownloads) {
        const res = await window.aether.getOfflineDownloads();
        if (res?.success && Array.isArray(res.downloads)) {
          setOfflineDownloads(res.downloads);
          return;
        }
      }
      setOfflineDownloads((downloadedTracks || []).map(id => ({
        id,
        fileName: `${id}.m4a`,
        filePath: '',
        bytes: 0,
        modifiedAt: 0
      })));
    } catch (e) {
      console.warn('[Aether/Storage] offline downloads fetch failed', e);
    }
  }, [downloadedTracks, isStandalone]);
  useEffect(() => {
    let interval;
    if (isPlaying && currentTrack && !isAudioBuffering && !videoMode && !localAudioRef.current) {
      interval = window.setInterval(() => setCurrentTime(prev => prev + 500), 500);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isPlaying, currentTrack, isAudioBuffering, setCurrentTime, videoMode]);
  useEffect(() => {
    if (!lyrics || lyrics.length === 0) {
      setActiveLyricIndex(-1);
      return undefined;
    }
    const offsetMs = (currentTrack?.introOffsetMs || 0) + (lyricOffsetMs || 0);
    const updateActiveLyric = () => {
      const liveMs = getActivePlaybackPositionMs();
      const idx = lyrics.findLastIndex(line => line.time <= liveMs - offsetMs);
      setActiveLyricIndex(prev => idx !== -1 && idx !== prev ? idx : prev);
    };
    updateActiveLyric();
    if (!isPlaying && !isLyricsExpanded) return undefined;
    const interval = window.setInterval(updateActiveLyric, 250);
    return () => window.clearInterval(interval);
  }, [currentTrack?.introOffsetMs, getActivePlaybackPositionMs, isLyricsExpanded, isPlaying, lyrics, lyricOffsetMs]);
  const centerCompactLyrics = useCallback((behavior = 'smooth') => {
    if (!activeLyricRef.current || !lyricsContainerRef.current) return;
    const activeLine = activeLyricRef.current;
    const container = lyricsContainerRef.current;
    const rawTop = activeLine.offsetTop - container.offsetHeight / 2 + activeLine.offsetHeight / 2;
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(maxTop, rawTop));
    container.scrollTo({
      top: targetTop,
      behavior
    });
  }, []);
  const centerImmersiveLyrics = useCallback((behavior = 'smooth') => {
    if (!expandedActiveRef.current || !expandedContainerRef.current) return;
    const activeLine = expandedActiveRef.current;
    const container = expandedContainerRef.current;
    const rawTop = activeLine.offsetTop - container.offsetHeight / 2 + activeLine.offsetHeight / 2;
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(maxTop, rawTop));
    container.scrollTo({
      top: targetTop,
      behavior
    });
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
      closeHeaderSurfaces();
    }
  }, [isLyricsExpanded, closeHeaderSurfaces]);
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
  useEffect(() => {
    if (!isLyricsExpanded || !expandedActiveRef.current || activeLyricIndex < 0 || !lyrics[activeLyricIndex]) return undefined;
    let raf = 0;
    let lastPaintAt = 0;
    const lyric = lyrics[activeLyricIndex];
    const nextLyricLine = lyrics[activeLyricIndex + 1];
    const durationMs = nextLyricLine ? Math.max(100, nextLyricLine.time - lyric.time) : 4000;
    const startMs = lyric.time + (currentTrack?.introOffsetMs || 0) + (lyricOffsetMs || 0);
    const updateKaraokeFill = now => {
      const activeLine = expandedActiveRef.current;
      if (activeLine && now - lastPaintAt >= 16) {
        const currentMs = getActivePlaybackPositionMs();
        const fillPercent = Math.max(0, Math.min(100, (currentMs - startMs) / durationMs * 100));
        activeLine.style.setProperty('--karaoke-fill', `${fillPercent.toFixed(1)}%`);
        lastPaintAt = now;
      }
      raf = requestAnimationFrame(updateKaraokeFill);
    };
    raf = requestAnimationFrame(updateKaraokeFill);
    return () => {
      cancelAnimationFrame(raf);
      expandedActiveRef.current?.style.removeProperty('--karaoke-fill');
    };
  }, [activeLyricIndex, currentTrack?.introOffsetMs, getActivePlaybackPositionMs, isLyricsExpanded, lyricOffsetMs, lyrics]);
  const parseLRC = lrcString => {
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
        if (text) result.push({
          time,
          text
        });
      }
    });
    setLyrics(result);
  };
  function getTrackFallbackPalette(track) {
    const seed = String(track?.thumbnail || track?.youtubeId || track?.actualUrl || track?.url || `${track?.title || ''}|${track?.author || ''}`).trim() || 'aether';
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(index) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return buildTrackPaletteFromRgb(hslToRgb(hue, 100, 58));
  }
  const fetchLyrics = createFetchLyricsAction({
    API_BASE,
    currentTrackPresetKey,
    isStandalone,
    lyricsFetchRequestRef,
    manualLyricsStoreRef,
    setDiagnostics,
    setIsLyricsLoading,
    setLyrics
  });
  const closeTopmostOverlay = useCloseTopmostOverlay({
    activeMenuTrack,
    appLockSettingsRef,
    closeHeaderSurfaces,
    closeShortcutSettings,
    closeTipsOverlay,
    exitVideoMode,
    feedbackRef,
    gestureLabRef,
    headerControlsRef,
    inspectTarget,
    isAuraStageOpen,
    isAutoplayMenuOpen,
    isCommandPaletteOpen,
    isDiagnosticsOpen,
    isExperienceCenterOpen,
    isFeedbackOpen,
    isGestureLabOpen,
    isLibraryOverlayOpen,
    isLocalMediaImporting,
    isLockBusy,
    isLockModalOpen,
    isLooksPanelOpen,
    isLyricsExpanded,
    isManualLyricsEditorOpen,
    isManualLyricsRawEditorOpen,
    isMiniQueuePeekOpen,
    isMixtapeVaultOpen,
    isPlayerOverlayOpen,
    isSharedSceneOpen,
    isShortcutSettingsOpen,
    isSleepTimerMenuOpen,
    isSpotifyImportOpen,
    isSpotifyImporting,
    isTipsOverlayOpen,
    isViewingFullDiscovery,
    isViewingFullPlaylist,
    isViewingFullQueue,
    oauthPrompt,
    setActiveMenuTrack,
    setInspectTarget,
    setIsAuraStageOpen,
    setIsAutoplayMenuOpen,
    setIsCommandPaletteOpen,
    setIsExperienceCenterOpen,
    setIsFeedbackOpen,
    setIsGestureLabOpen,
    setIsLibraryOverlayOpen,
    setIsLockModalOpen,
    setIsLyricsExpanded,
    setIsManualLyricsEditorOpen,
    setIsManualLyricsRawEditorOpen,
    setIsMiniQueuePeekOpen,
    setIsMixtapeVaultOpen,
    setIsPlayerOverlayOpen,
    setIsSharedSceneOpen,
    setIsSpotifyImportOpen,
    setIsViewingFullDiscovery,
    setIsViewingFullPlaylist,
    setIsViewingFullQueue,
    setLibraryActionTarget,
    setOauthPrompt,
    sleepTimerControlsRef,
    soundCapsuleRef,
    videoMode,
    youtubeAuthRequiredRef
  });
  useEffect(() => {
    const onKeyDown = e => {
      if (e.key !== 'Escape') return;
      const target = e.target instanceof Element ? e.target : document.activeElement;
      const activeTarget = document.activeElement instanceof Element ? document.activeElement : null;
      const isEditingTarget = [target, activeTarget].some(node => node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || node.isContentEditable || node.closest('[data-shortcut-recording="true"]')));
      if (isEditingTarget) return;
      if (!closeTopmostOverlay()) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeTopmostOverlay]);
  useEffect(() => {
    if (!isLooksPanelOpen && !isSleepTimerMenuOpen && !isQualityDropdownOpen) return;
    const onPointerDown = event => {
      const target = event.target;
      if (isLooksPanelOpen && looksPanelRef.current && !looksPanelRef.current.contains(target)) {
        setIsLooksPanelOpen(false);
      }
      if (isSleepTimerMenuOpen && sleepTimerMenuRef.current && !sleepTimerMenuRef.current.contains(target)) {
        setIsSleepTimerMenuOpen(false);
      }
      if (isQualityDropdownOpen && qualityDropdownRef.current && !qualityDropdownRef.current.contains(target)) {
        setIsQualityDropdownOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isLooksPanelOpen, isSleepTimerMenuOpen, isQualityDropdownOpen]);
  useEffect(() => {
    if (!isStandalone) return;
    refreshStorageStats();
    refreshStorageEstimate();
    refreshOfflineDownloads();
    refreshEngineStatus();
  }, [isStandalone, refreshEngineStatus, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats]);
  useEffect(() => {
    if (!isStandalone || !isDiagnosticsOpen) return;
    refreshStorageStats();
    refreshStorageEstimate();
    refreshOfflineDownloads();
    refreshEngineStatus();
  }, [isStandalone, isDiagnosticsOpen, refreshEngineStatus, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats]);
  useEffect(() => {
    const currentKey = getTrackActionKey(currentTrack);
    const previousKey = getTrackActionKey(prevTrackRef.current);
    if (currentKey !== previousKey) {
      if (prevTrackRef.current) {
        setHistory(prev => [prevTrackRef.current, ...prev].slice(0, 20)); // Keep last 20
      }
      setCurrentTime(0);
      setCurrentTrackTitle(currentTrack?.title || "");
      prevTrackRef.current = currentTrack || null;
      lyricsFetchRequestRef.current += 1;
    }
    const manualEntry = currentTrackPresetKey ? manualLyricsStoreRef.current?.[currentTrackPresetKey] : null;
    const manualLines = sortManualLyricsLines(manualEntry?.lines || []);
    if (manualLines.length > 0) {
      lyricsFetchRequestRef.current += 1;
      setIsLyricsLoading(false);
      setLyrics(manualLines);
      setDiagnostics(prev => ({
        ...prev,
        lastLyricsSource: 'manual',
        lastLyricsFetchMs: null,
        lastLyricsFetchAt: manualEntry?.updatedAt || Date.now(),
        lastLyricsError: null
      }));
    } else if (currentTrack?.syncedLyrics) {
      lyricsFetchRequestRef.current += 1;
      setIsLyricsLoading(false);
      setLyrics(currentTrack.syncedLyrics.lyrics || []);
    } else if (currentTrack?.title) {
      fetchLyrics(currentTrack.title, currentTrack.author, currentTrack.totalDurationMs || currentTrack.duration, currentTrack.actualUrl || currentTrack.url, currentTrackPresetKey);
    } else {
      lyricsFetchRequestRef.current += 1;
      setIsLyricsLoading(false);
      setLyrics([]);
    }
  }, [currentTrack?.title, currentTrack?.id, currentTrack?.youtubeId, currentTrack?.queueNonce, currentTrackPresetKey, currentManualLyricsLines, currentTrack?.syncedLyrics?.lyrics?.length, getTrackActionKey]);
  const favoriteTracksList = useMemo(() => Object.values(favoriteTracks || {}).filter(Boolean), [favoriteTracks]);
  const profileStats = useProfileStats({
    PLAYBACK_LEDGER_STORAGE_KEY,
    createPlaybackLedgerData,
    favoriteTracksList,
    normalizePlaybackLedgerData,
    normalizeTrackIdentity,
    playlists
  });
  const copyProfileShareCard = useCopyProfileShareCardAction({
    aetherProfile,
    blobToDataUrl,
    createProfileShareCardBlob,
    downloadBlob,
    flashLastAdded,
    profileStats
  });
  const saveProfileShareCard = useCallback(async () => {
    try {
      const blob = await createProfileShareCardBlob(aetherProfile, profileStats);
      downloadBlob(blob, `aether-profile-${aetherProfile.handle || 'share'}.png`);
      flashLastAdded('Profile PNG saved', 1800, 'success');
    } catch (error) {
      console.error('[Aether/Profile] Failed to save profile card', error);
      flashLastAdded('Could not save profile PNG', 2200, 'error');
    }
  }, [aetherProfile, flashLastAdded, profileStats]);
  const copyProfileLink = useCallback(async () => {
    const link = getProfileLink(aetherProfile);
    if (!link || aetherProfile.publishedVisibility === 'private') {
      flashLastAdded('Publish profile before copying a link', 2400, 'warning');
      return;
    }
    try {
      if (window.aether?.clipboard?.writeText) await window.aether.clipboard.writeText(link);else await navigator.clipboard.writeText(link);
      flashLastAdded('Profile link copied', 1600, 'success');
    } catch (error) {
      console.error('[Aether/Profile] Failed to copy profile link', error);
      flashLastAdded('Could not copy profile link', 2200, 'error');
    }
  }, [aetherProfile, flashLastAdded]);
  const handleAvatarFileSelected = useCallback(async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const avatarDataUrl = await resizeImageFileToDataUrl(file);
      setAetherProfile(prev => ({
        ...prev,
        avatarDataUrl
      }));
      flashLastAdded('Avatar updated', 1800, 'success');
    } catch (error) {
      flashLastAdded(error?.message || 'Could not use that avatar', 2600, 'error');
    }
  }, [flashLastAdded, setAetherProfile]);
  const publishAetherProfile = usePublishAetherProfileAction({
    AETHER_PROFILE_API_BASE,
    aetherProfile,
    ensureAetherProfileCredentials,
    flashLastAdded,
    isProfilePublishing,
    profileStats,
    setAetherProfile,
    setIsProfilePublishing
  });
  const unpublishAetherProfile = useCallback(async () => {
    const withCredentials = ensureAetherProfileCredentials(aetherProfile);
    setIsProfilePublishing(true);
    try {
      if (withCredentials.profileId && withCredentials.profileSecret) {
        const response = await fetch(`${AETHER_PROFILE_API_BASE}/v1/profile/${encodeURIComponent(withCredentials.profileId)}`, {
          method: 'DELETE',
          headers: {
            authorization: `Bearer ${withCredentials.profileSecret}`
          }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.ok === false) throw new Error(data?.error || 'Could not unpublish profile.');
      }
      setAetherProfile({
        ...withCredentials,
        visibility: 'private',
        publishedVisibility: 'private',
        lastPublishedAt: 0
      });
      flashLastAdded('Profile unpublished', 2200, 'success');
    } catch (error) {
      flashLastAdded(error?.message || 'Profile unpublish failed', 3200, 'error');
    } finally {
      setIsProfilePublishing(false);
    }
  }, [aetherProfile, flashLastAdded, setAetherProfile]);
  const isViewingFavorites = viewingPlaylist === FAVORITES_PLAYLIST_ID;
  const focusedVaultName = isViewingFavorites ? FAVORITES_PLAYLIST_NAME : viewingPlaylist;
  const focusedVaultTracks = isViewingFavorites ? favoriteTracksList : viewingPlaylist ? playlists[viewingPlaylist] || [] : [];
  const librarySearchNeedle = useMemo(() => librarySearchTerm.trim().toLowerCase(), [librarySearchTerm]);
  const soundLedgerTracks = soundCapsuleData?.tracks || {};
  const parseLibraryTime = useCallback(value => {
    if (!value) return 0;
    const parsed = typeof value === 'number' ? value : Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);
  const getTrackLedgerEntry = useCallback(track => {
    if (!track) return null;
    const candidates = [track.id, track.youtubeId, normalizeTrackIdentity(track), track.youtubeId ? `yt:${track.youtubeId}` : '', track.id ? `id:${track.id}` : ''].filter(Boolean);
    for (const key of candidates) {
      if (soundLedgerTracks[key]) return soundLedgerTracks[key];
    }
    return null;
  }, [normalizeTrackIdentity, soundLedgerTracks]);
  const getTrackAddedMs = useCallback(track => Math.max(parseLibraryTime(track?.addedAt), parseLibraryTime(track?.createdAt), parseLibraryTime(track?.importedAt), parseLibraryTime(track?.savedAt)), [parseLibraryTime]);
  const getTrackLastListenedMs = useCallback(track => {
    const ledgerEntry = getTrackLedgerEntry(track);
    return Math.max(parseLibraryTime(track?.lastListenedAt), parseLibraryTime(track?.lastListened), parseLibraryTime(track?.lastPlayedAt), parseLibraryTime(track?.playedAt), parseLibraryTime(ledgerEntry?.lastListened), parseLibraryTime(ledgerEntry?.lastCompletedAt));
  }, [getTrackLedgerEntry, parseLibraryTime]);
  const getTrackPlayCount = useCallback(track => {
    const ledgerEntry = getTrackLedgerEntry(track);
    return Math.max(0, Math.floor(Number(track?.playCount) || 0), Math.floor(Number(track?.plays) || 0), Math.floor(Number(ledgerEntry?.count) || 0));
  }, [getTrackLedgerEntry]);
  const getPlaylistLibraryStats = useCallback(name => {
    const tracks = playlists[name] || [];
    let recentlyAddedMs = 0;
    let recentlyListenedMs = 0;
    let lastUpdatedMs = 0;
    let playCount = 0;
    tracks.forEach(track => {
      const addedMs = getTrackAddedMs(track);
      const listenedMs = getTrackLastListenedMs(track);
      recentlyAddedMs = Math.max(recentlyAddedMs, addedMs);
      recentlyListenedMs = Math.max(recentlyListenedMs, listenedMs);
      lastUpdatedMs = Math.max(lastUpdatedMs, addedMs, listenedMs, parseLibraryTime(track?.updatedAt), parseLibraryTime(track?.modifiedAt));
      playCount += getTrackPlayCount(track);
    });
    return {
      recentlyAddedMs,
      recentlyListenedMs,
      lastUpdatedMs,
      playCount
    };
  }, [getTrackAddedMs, getTrackLastListenedMs, getTrackPlayCount, parseLibraryTime, playlists]);
  const getLibrarySongSortValue = useCallback((entry, sortKey) => {
    const track = entry?.track || entry;
    if (sortKey === 'title') return String(track?.title || '');
    if (sortKey === 'artist') return String(track?.author || '');
    if (sortKey === 'listened-desc') return getTrackLastListenedMs(track);
    if (sortKey === 'added-desc') return getTrackAddedMs(track);
    if (sortKey === 'plays-desc') return getTrackPlayCount(track);
    if (sortKey === 'duration-desc' || sortKey === 'duration-asc') return Number(track?.totalDurationMs || track?.duration || 0);
    return '';
  }, [getTrackAddedMs, getTrackLastListenedMs, getTrackPlayCount]);
  const librarySongEntries = useLibrarySongEntries({
    FAVORITES_PLAYLIST_ID,
    FAVORITES_PLAYLIST_NAME,
    favoriteTracksList,
    normalizeTrackIdentity,
    playlists
  });
  const downloadedIdSet = useMemo(() => new Set((downloadedTracks || []).map(id => String(id))), [downloadedTracks]);
  const artistCatalog = useMemo(() => buildArtistCatalog(librarySongEntries, {
    downloadedIds: downloadedIdSet,
    resolveId: resolveWarmupTrackId
  }), [downloadedIdSet, librarySongEntries, resolveWarmupTrackId]);
  const selectedArtist = useMemo(() => {
    const needle = selectedArtistName.trim().toLowerCase();
    if (!needle) return null;
    return artistCatalog.find(artist => artist.name.toLowerCase() === needle) || null;
  }, [artistCatalog, selectedArtistName]);
  const artistExplorerTracks = useMemo(() => filterArtistTracks(selectedArtist, artistFilter, artistSort, {
    getTrackLastListenedMs,
    getTrackPlayCount
  }), [artistFilter, artistSort, getTrackLastListenedMs, getTrackPlayCount, selectedArtist]);
  const recentLibraryTracks = useMemo(() => librarySongEntries.map(entry => entry.track).filter(Boolean).sort((left, right) => getTrackLastListenedMs(right) - getTrackLastListenedMs(left)).filter(track => getTrackLastListenedMs(track) > 0).slice(0, 12), [getTrackLastListenedMs, librarySongEntries]);
  const discoveryHome = useMemo(() => buildDiscoveryHome({
    artists: artistCatalog,
    recentTracks: recentLibraryTracks,
    favoriteTracks: favoriteTracksList,
    currentTrack
  }), [artistCatalog, currentTrack, favoriteTracksList, recentLibraryTracks]);
  const homeSeedArtists = useMemo(() => {
    const activeArtist = currentTrack ? artistCatalog.find(artist => artist.name.toLowerCase() === String(currentTrack.author || '').trim().toLowerCase()) : null;
    const next = [];
    const seen = new Set();
    [activeArtist, ...artistCatalog].forEach(artist => {
      if (!artist || seen.has(artist.id)) return;
      seen.add(artist.id);
      next.push(artist);
    });
    return next.slice(0, 10);
  }, [artistCatalog, currentTrack]);
  const fetchHomeResults = useCallback(async query => {
    const trimmed = String(query || '').trim();
    if (!trimmed) return [];
    let timeoutId = null;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('Search took too long. Try again or use a shorter search.')), 12000);
    });
    const search = isStandalone ? window.aether?.search?.(trimmed) : axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(trimmed)}`).then(response => response.data);
    const response = await Promise.race([search, timeout]).finally(() => {
      if (timeoutId) window.clearTimeout(timeoutId);
    });
    return Array.isArray(response) ? response.filter(Boolean).slice(0, 36) : [];
  }, [isStandalone]);
  const runHomeSearch = useCallback(async query => {
    const trimmed = String(query || '').trim();
    if (!trimmed) return;
    const runId = ++homeFetchIdRef.current;
    setIsHomeOpen(true);
    setHomeArtistName('');
    setHomeError('');
    setHomeLoading(true);
    try {
      const results = await fetchHomeResults(trimmed);
      if (runId !== homeFetchIdRef.current) return;
      setHomeResults(results);
      setHomeArtistResults([]);
      if (!results.length) setHomeError('No online results found. Try a shorter search.');
    } catch (error) {
      if (runId !== homeFetchIdRef.current) return;
      setHomeError(error?.message || 'Home search failed.');
    } finally {
      if (runId === homeFetchIdRef.current) setHomeLoading(false);
    }
  }, [fetchHomeResults]);
  const openHomeArtist = useCallback(async name => {
    const artistName = String(name || '').trim();
    if (!artistName) return;
    const runId = ++homeFetchIdRef.current;
    setIsHomeOpen(true);
    setHomeArtistName(artistName);
    setHomeResults([]);
    setHomeError('');
    setHomeLoading(true);
    try {
      const results = await fetchHomeResults(`${artistName} official music video`);
      if (runId !== homeFetchIdRef.current) return;
      setHomeArtistResults(results);
      if (!results.length) setHomeError(`No online results found for ${artistName}.`);
    } catch (error) {
      if (runId !== homeFetchIdRef.current) return;
      setHomeError(error?.message || 'Artist search failed.');
    } finally {
      if (runId === homeFetchIdRef.current) setHomeLoading(false);
    }
  }, [fetchHomeResults]);
  const clearHomeArtist = useCallback(() => {
    setHomeArtistName('');
    setHomeArtistResults([]);
    setHomeError('');
  }, []);
  const isHomeTrackDownloaded = useCallback(track => {
    const ids = [track?.youtubeId, track?.id, resolveWarmupTrackId(track)].filter(Boolean).map(String);
    return ids.some(id => downloadedIdSet.has(id));
  }, [downloadedIdSet, resolveWarmupTrackId]);
  const isHomeTrackInLibrary = useCallback(track => {
    const key = normalizeTrackIdentity(track);
    if (!key) return false;
    return librarySongEntries.some(entry => entry.key === key || normalizeTrackIdentity(entry.track) === key);
  }, [librarySongEntries, normalizeTrackIdentity]);
  const playHomeTrack = useCallback(track => {
    const normalized = normalizeQueueTrack(track);
    if (!normalized) {
      flashLastAdded('That result cannot be played', 2200, 'warning');
      return;
    }
    setQueue([normalized]);
    setCurrentTime(0);
    setIsManualStop(false);
    setIsPlaying(true);
    setIsHomeOpen(false);
  }, [flashLastAdded, normalizeQueueTrack]);
  useEffect(() => {
    if (!isHomeOpen) return;
    if (homeFeed.length > 0) return;
    const seedNames = homeSeedArtists.map(artist => artist.name).filter(Boolean);
    const seed = seedNames[0] || currentTrack?.author || favoriteTracksList[0]?.author || 'music videos';
    const seedKey = String(seed || '').trim().toLowerCase();
    if (!seedKey || homeFeedSeedRef.current === seedKey) return;
    homeFeedSeedRef.current = seedKey;
    let cancelled = false;
    setHomeLoading(true);
    setHomeError('');
    fetchHomeResults(seed)
      .then(results => {
        if (cancelled) return;
        setHomeFeed(results);
        if (!results.length) setHomeError('No recommendations found yet. Search an artist or try a quick start.');
      })
      .catch(error => {
        if (!cancelled) {
          homeFeedSeedRef.current = '';
          setHomeError(error?.message || 'Home feed failed.');
        }
      })
      .finally(() => {
        if (!cancelled) setHomeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.author, favoriteTracksList, fetchHomeResults, homeFeed.length, homeSeedArtists, isHomeOpen]);
  const openArtistExplorer = useCallback(name => {
    const normalized = String(name || '').trim();
    if (!normalized) return;
    setSelectedArtistName(normalized);
    setArtistFilter('all');
    setArtistSort('popular');
    setSearchQuery('');
    setSearchResults([]);
    setHasCompletedSearch(false);
  }, []);
  const clearArtistExplorer = useCallback(() => setSelectedArtistName(''), []);
  const getHeaderSearchSuggestions = useCallback(draft => buildSearchSuggestions({
    query: draft,
    songEntries: librarySongEntries,
    artists: artistCatalog,
    playlistNames: orderedPlaylistNames,
    history: searchHistoryByScope[isOfflineMode ? 'offline' : 'online'] || [],
    limit: 8
  }), [artistCatalog, isOfflineMode, librarySongEntries, orderedPlaylistNames, searchHistoryByScope]);
  const shouldHydrateLibrarySearch = isLibraryOverlayContentReady || Boolean(librarySearchNeedle);
  const librarySearchIndex = useMemo(() => shouldHydrateLibrarySearch ? buildLibrarySearchIndex({
    songEntries: librarySongEntries,
    playlistNames: orderedPlaylistNames,
    playlists
  }) : {
    docs: [],
    search: () => null
  }, [librarySongEntries, orderedPlaylistNames, playlists, shouldHydrateLibrarySearch]);
  const librarySearchMatches = useMemo(() => librarySearchIndex.search(librarySearchNeedle), [librarySearchIndex, librarySearchNeedle]);
  useEffect(() => {
    if (!isLibraryOverlayOpen) return;
    if (!librarySearchIndex.docs.length) return;
    const handle = window.setTimeout(() => {
      persistLibraryIndexSnapshot({
        version: APP_VERSION,
        docs: librarySearchIndex.docs,
        songCount: librarySongEntries.length,
        playlistCount: orderedPlaylistNames.length
      });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [isLibraryOverlayOpen, librarySearchIndex.docs, librarySongEntries.length, orderedPlaylistNames.length]);
  const libraryVisibleSongEntries = useLibraryVisibleSongEntries({
    getLibrarySongSortValue,
    getTrackLastListenedMs,
    getTrackPlayCount,
    isLibraryOverlayContentReady,
    librarySearchMatches,
    librarySearchNeedle,
    librarySongEntries,
    librarySongFilter,
    librarySongSort
  });
  const libraryVisiblePlaylistNames = useLibraryVisiblePlaylistNames({
    getPlaylistLibraryStats,
    isLibraryOverlayContentReady,
    libraryFilter,
    librarySearchMatches,
    librarySearchNeedle,
    librarySort,
    orderedPlaylistNames,
    playlists
  });
  const showFavoriteLibraryCard = useMemo(() => {
    if (!isLibraryOverlayContentReady) return false;
    if (libraryFilter === 'empty') return false;
    if (!librarySearchNeedle) return true;
    if (FAVORITES_PLAYLIST_NAME.toLowerCase().includes(librarySearchNeedle)) return true;
    return librarySongEntries.some(entry => entry.isFavorite && librarySearchMatches?.songKeys?.has(entry.key));
  }, [isLibraryOverlayContentReady, libraryFilter, librarySearchMatches, librarySearchNeedle, librarySongEntries]);
  const focusedVaultVisibleTracks = useMemo(() => {
    if (!isLibraryOverlayContentReady) return [];
    const focusedNameMatches = String(focusedVaultName || '').toLowerCase().includes(librarySearchNeedle);
    const base = !librarySearchNeedle || focusedNameMatches ? focusedVaultTracks : focusedVaultTracks.filter(track => `${track?.title || ''} ${track?.author || ''}`.toLowerCase().includes(librarySearchNeedle));
    const sorted = [...base];
    if (libraryTrackSort === 'title') {
      sorted.sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (libraryTrackSort === 'artist') {
      sorted.sort((a, b) => String(a?.author || '').localeCompare(String(b?.author || '')) || String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (libraryTrackSort === 'duration-desc') {
      sorted.sort((a, b) => Number(b?.totalDurationMs || b?.duration || 0) - Number(a?.totalDurationMs || a?.duration || 0));
    } else if (libraryTrackSort === 'duration-asc') {
      sorted.sort((a, b) => Number(a?.totalDurationMs || a?.duration || 0) - Number(b?.totalDurationMs || b?.duration || 0));
    } else if (libraryTrackSort === 'listened-desc') {
      sorted.sort((a, b) => getTrackLastListenedMs(b) - getTrackLastListenedMs(a) || String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (libraryTrackSort === 'added-desc') {
      sorted.sort((a, b) => getTrackAddedMs(b) - getTrackAddedMs(a) || String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (libraryTrackSort === 'plays-desc') {
      sorted.sort((a, b) => getTrackPlayCount(b) - getTrackPlayCount(a) || String(a?.title || '').localeCompare(String(b?.title || '')));
    }
    return sorted;
  }, [focusedVaultName, focusedVaultTracks, getTrackAddedMs, getTrackLastListenedMs, getTrackPlayCount, isLibraryOverlayContentReady, librarySearchNeedle, libraryTrackSort]);
  const persistFavoriteTracks = useCallback(nextFavorites => {
    setFavoriteTracks(nextFavorites);
    if (isStandalone) {
      window.aether?.store?.set?.(FAVORITES_STORAGE_KEY, nextFavorites);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
    }
  }, [isStandalone]);
  const isTrackFavorite = useCallback(track => {
    const key = normalizeTrackIdentity(track);
    return Boolean(key && favoriteTracks?.[key]);
  }, [favoriteTracks, normalizeTrackIdentity]);
  const toggleFavoriteTrack = useCallback(async (track, options = {}) => {
    const normalizedTrack = normalizeQueueTrack(track);
    const key = normalizeTrackIdentity(normalizedTrack || track);
    if (!key) return;
    const next = {
      ...(favoriteTracks || {})
    };
    const wasFavorite = Boolean(next[key]);
    if (wasFavorite && !options.skipConfirm) {
      const confirmed = await requestDestructiveConfirmation({
        title: 'Remove favorite?',
        message: `Aether will remove "${(normalizedTrack || track)?.title || 'this track'}" from Favorites.`,
        detail: 'The track is not deleted from disk or from your vaults.',
        confirmLabel: 'Remove Favorite'
      });
      if (!confirmed) return;
    }
    if (wasFavorite) delete next[key];else next[key] = normalizedTrack || track;
    persistFavoriteTracks(next);
    setLastAdded(wasFavorite ? 'Removed from favorites' : `Favorited: ${(normalizedTrack || track)?.title || 'Track'}`);
    setTimeout(() => setLastAdded(null), 2200);
  }, [favoriteTracks, normalizeQueueTrack, normalizeTrackIdentity, persistFavoriteTracks, requestDestructiveConfirmation]);
  const handleFavoriteAddAll = useCallback(() => {
    if (!favoriteTracksList.length) {
      setLastAdded('No favorite tracks yet');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const normalized = favoriteTracksList.map(normalizeQueueTrack).filter(Boolean);
    setQueue(prev => {
      const next = [...prev, ...normalized];
      if (prev.length === 0 && normalized.length > 0) setIsPlaying(true);
      return next;
    });
    setIsManualStop(false);
    setLastAdded(`Queued Favorites (${normalized.length})`);
    setTimeout(() => setLastAdded(null), 2600);
  }, [favoriteTracksList, normalizeQueueTrack]);
  const playLibraryTracks = useCallback((tracks, label = 'Vault', shuffle = false) => {
    const normalized = (Array.isArray(tracks) ? tracks : []).map(normalizeQueueTrack).filter(Boolean);
    if (!normalized.length) {
      setLastAdded(`${label} is empty`);
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const nextQueue = shuffle ? [...normalized].sort(() => Math.random() - 0.5) : normalized;
    setQueue(nextQueue);
    setCurrentTime(0);
    setIsManualStop(false);
    setIsPlaying(true);
    setLastAdded(`${shuffle ? 'Shuffling' : 'Playing'} ${label} (${nextQueue.length})`);
    setTimeout(() => setLastAdded(null), 2600);
  }, [normalizeQueueTrack]);
  const handleFavoritePlayAll = useCallback((shuffle = false) => {
    playLibraryTracks(favoriteTracksList, FAVORITES_PLAYLIST_NAME, shuffle);
  }, [favoriteTracksList, playLibraryTracks]);
  const handlePlaylistPlayAll = useCallback((name, shuffle = false) => {
    if (name === FAVORITES_PLAYLIST_ID) {
      handleFavoritePlayAll(shuffle);
      return;
    }
    playLibraryTracks(playlists[name] || [], name || 'Vault', shuffle);
  }, [handleFavoritePlayAll, playLibraryTracks, playlists]);
  const handleRemoveFromPlaylist = useRemoveFromPlaylistAction({
    FAVORITES_PLAYLIST_ID,
    favoriteTracksList,
    playlists,
    requestDestructiveConfirmation,
    setLastAdded,
    setPlaylists,
    toggleFavoriteTrack
  });
  const handlePlaylistAddAll = usePlaylistAddAllAction({
    FAVORITES_PLAYLIST_ID,
    handleFavoriteAddAll,
    normalizeQueueTrack,
    playlists,
    setIsManualStop,
    setIsPlaying,
    setLastAdded,
    setQueue
  });
  const handleRenamePlaylist = useRenamePlaylistAction({
    FAVORITES_PLAYLIST_ID,
    persistPlaylistOrder,
    playlistOrder,
    playlists,
    setIsRenamingPlaylist,
    setLastAdded,
    setPlaylists,
    setViewingPlaylist,
    viewingPlaylist
  });
  const handleDeletePlaylist = useDeletePlaylistAction({
    FAVORITES_PLAYLIST_ID,
    persistFavoriteTracks,
    persistPlaylistOrder,
    playlistOrder,
    playlists,
    requestDestructiveConfirmation,
    setLastAdded,
    setPlaylists,
    setViewingPlaylist,
    viewingPlaylist
  });
  const handleRemoveTrackFromPlaylist = useCallback(async (name, track, fallbackIndex = -1) => {
    if (name === FAVORITES_PLAYLIST_ID) {
      const confirmed = await requestDestructiveConfirmation({
        title: 'Remove favorite?',
        message: `Aether will remove "${track?.title || 'this track'}" from Favorites.`,
        detail: 'The track is not deleted from disk or from your vaults.',
        confirmLabel: 'Remove Favorite'
      });
      if (!confirmed) return;
      if (track) toggleFavoriteTrack(track, {
        skipConfirm: true
      });
      return;
    }
    const tracks = playlists[name] || [];
    const key = normalizeTrackIdentity(track);
    const resolvedIndex = key ? tracks.findIndex(item => normalizeTrackIdentity(item) === key) : fallbackIndex;
    if (resolvedIndex < 0) return;
    handleRemoveFromPlaylist(name, resolvedIndex);
  }, [handleRemoveFromPlaylist, normalizeTrackIdentity, playlists, toggleFavoriteTrack, requestDestructiveConfirmation]);
  const handleRemoveTrackEverywhere = useRemoveTrackEverywhereAction({
    favoriteTracks,
    normalizeTrackIdentity,
    persistFavoriteTracks,
    playlists,
    requestDestructiveConfirmation,
    setLastAdded,
    setPlaylists
  });
  const handleSearch = createSearchAction({
    API_BASE,
    axios,
    commitSearchHistory,
    handleOfflineLibrarySearch,
    isMobileSearchOpen,
    isOfflineMode,
    isStandalone,
    searchQuery,
    setHasCompletedSearch,
    setIsMobileSearchOpen,
    setIsSearching,
    setSearchQuery,
    setSearchResults
  });
  const runSuggestedSearch = useCallback(query => {
    setSelectedArtistName('');
    handleSearch(query);
  }, [handleSearch]);
  const handleHeaderSuggestionPick = useCallback(item => {
    if (!item) return;
    const value = item.value || item.title || '';
    if (item.type === 'artist') {
      openHomeArtist(value);
      return;
    }
    if (item.type === 'vault') {
      setLibrarySearchTerm(value);
      openLibraryOverlay(null);
      return;
    }
    runSuggestedSearch(value);
  }, [openHomeArtist, openLibraryOverlay, runSuggestedSearch]);
  const clearDiscoveryResults = useCallback(() => {
    setSearchResults([]);
    setHasCompletedSearch(false);
    setIsSearching(false);
    setSelectedArtistName('');
  }, []);
  useEffect(() => {
    if (searchQuery.trim()) return;
    if (searchResults.length > 0 || !hasCompletedSearch) return;
    setHasCompletedSearch(false);
  }, [searchQuery, searchResults.length, hasCompletedSearch]);

  // -- NEURAL DISCOVERY (AUTO-FETCH) --
  useEffect(() => {
    if (!currentTrack || isOfflineMode) return;
    const fetchNeural = async () => {
      try {
        const query = currentTrack.author || currentTrack.title?.split('-')?.[0] || 'music';
        const res = isStandalone ? await window.aether?.search?.(query) : (await axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`)).data;
        if (Array.isArray(res)) {
          const filtered = res.filter(t => t.id !== currentTrack.id && t.youtubeId !== currentTrack.youtubeId);
          setNeuralRecommendations(filtered.slice(0, 15));
        }
      } catch (e) {
        console.error('[Aether] Neural fetch failed', e);
      }
    };
    fetchNeural();
  }, [API_BASE, currentTrack?.title, currentTrack?.author, currentTrack?.id, currentTrack?.youtubeId, isOfflineMode, isStandalone]);
  const handleDownloadMissingForVault = useCallback((tracks = [], label = 'vault') => {
    if (!isStandalone || !window.aether?.download) {
      flashLastAdded('Offline downloads unavailable', 2200, 'warning');
      return;
    }
    const downloadedSet = new Set((downloadedTracks || []).map(id => String(id)));
    const missing = (Array.isArray(tracks) ? tracks : []).filter(track => {
      const id = resolveWarmupTrackId(track);
      return id && !downloadedSet.has(String(id)) && !downloadedSet.has(String(track?.id || ''));
    });
    if (missing.length === 0) {
      flashLastAdded(`${label} is ready offline`, 1800, 'success');
      return;
    }
    missing.slice(0, 24).forEach(track => warmupTrack(track));
    flashLastAdded(`Downloading ${Math.min(missing.length, 24)} missing track${missing.length === 1 ? '' : 's'} for ${label}`, 3200, 'success');
  }, [downloadedTracks, flashLastAdded, isStandalone, resolveWarmupTrackId]);
  const downloadLabelById = useMemo(() => {
    const map = new Map();
    const addTrack = track => {
      const id = resolveWarmupTrackId(track);
      if (!id || map.has(id)) return;
      map.set(id, {
        title: track?.title || id,
        author: track?.author || 'Unknown'
      });
    };
    queue.forEach(addTrack);
    Object.values(playlists || {}).forEach(tracks => {
      (Array.isArray(tracks) ? tracks : []).forEach(addTrack);
    });
    return map;
  }, [playlists, queue, resolveWarmupTrackId]);
  const offlineAvailableTracks = useOfflineAvailableTracks({
    FAVORITES_PLAYLIST_NAME,
    downloadLabelById,
    downloadedTracks,
    favoriteTracksList,
    librarySongEntries,
    offlineDownloads,
    queue,
    resolveWarmupTrackId
  });
  const offlineVisibleTracks = useMemo(() => {
    const needle = offlineLibrarySearchTerm.trim().toLowerCase();
    if (!needle) return offlineAvailableTracks;
    return offlineAvailableTracks.filter(track => [track?.title, track?.author, track?.offlineSource].some(value => String(value || '').toLowerCase().includes(needle)));
  }, [offlineAvailableTracks, offlineLibrarySearchTerm]);
  const removeDownloadedById = useRemoveDownloadedByIdAction({
    isOfflineRemovalBusy,
    isStandalone,
    refreshOfflineDownloads,
    refreshStorageEstimate,
    refreshStorageStats,
    requestDestructiveConfirmation,
    setDownloadedTracks,
    setIsOfflineRemovalBusy,
    setLastAdded,
    setWarmingTrackIds,
    warmupRetryRef
  });
  const clearAllDownloadedTracks = useClearAllDownloadedTracksAction({
    isOfflineRemovalBusy,
    isStandalone,
    refreshOfflineDownloads,
    refreshStorageEstimate,
    refreshStorageStats,
    requestDestructiveConfirmation,
    setDownloadedTracks,
    setIsOfflineDownloadsBusy,
    setIsOfflineRemovalBusy,
    setLastAdded,
    setWarmingTrackIds,
    warmupRetryRef
  });
  const handleSetSleepTimer = useCallback(minutes => {
    const nextVal = Number(minutes) || 0;
    setSleepTimerValue(nextVal);
    if (nextVal <= 0) {
      setSleepDeadline(null);
      setSleepRemainingStr('');
      if (localAudioRef.current) localAudioRef.current.volume = volume;
      setLastAdded('Sleep timer disabled');
    } else {
      setSleepDeadline(Date.now() + nextVal * 60 * 1000);
      setSleepRemainingStr(`${nextVal}:00`);
      setLastAdded(`Sleep timer set • ${nextVal}m`);
    }
    setTimeout(() => setLastAdded(null), 1800);
    setIsSleepTimerMenuOpen(false);
    setIsSleepTimerOverlayOpen(false);
  }, [volume]);
  const handleExportVault = async (playlistName, overrideTracks = null) => {
    if (!isStandalone || !window.aether?.exportVault) {
      setLastAdded('Vault export unavailable');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const exportName = playlistName === FAVORITES_PLAYLIST_ID ? FAVORITES_PLAYLIST_NAME : playlistName;
    const data = Array.isArray(overrideTracks) ? overrideTracks : playlistName === FAVORITES_PLAYLIST_ID ? favoriteTracksList : playlists[playlistName] || [];
    const res = await window.aether.exportVault(exportName, data);
    if (res?.success) {
      setLastAdded(`Exported vault: ${exportName}`);
      setTimeout(() => setLastAdded(null), 2600);
    } else if (res?.cancel) {
      setLastAdded('Vault export cancelled');
      setTimeout(() => setLastAdded(null), 1800);
    } else {
      setLastAdded(`Export failed${res?.error ? `: ${String(res.error).slice(0, 36)}` : ''}`);
      setTimeout(() => setLastAdded(null), 3000);
    }
  };
  const handleImportVault = createImportVaultAction({
    buildUniquePlaylistName,
    flashLastAdded,
    isStandalone,
    isVaultImporting,
    normalizeQueueTrack,
    persistPlaylistOrder,
    playlistOrder,
    playlists,
    setIsVaultImporting,
    setPlaylists,
    setViewingPlaylist
  });
  const handleImportSpotifyPlaylist = createImportSpotifyPlaylistAction({
    appendSpotifyImportLog,
    buildUniquePlaylistName,
    flashLastAdded,
    isStandalone,
    musicImportProvider,
    normalizeQueueTrack,
    normalizeTrackIdentity,
    persistPlaylistOrder,
    playlistOrder,
    playlists,
    setImportReview,
    setIsSpotifyImportOpen,
    setIsSpotifyImporting,
    setMusicImportProvider,
    setPlaylists,
    setSpotifyImportLogs,
    setSpotifyImportPlaylistName,
    setSpotifyImportProgress,
    setSpotifyImportUrl,
    setViewingPlaylist,
    spotifyImportPlaylistName,
    spotifyImportUrl
  });
  const handleImportLocalMedia = createImportLocalMediaAction({
    appendSpotifyImportLog,
    buildUniquePlaylistName,
    flashLastAdded,
    isLocalMediaImporting,
    isSpotifyImporting,
    isStandalone,
    manualLyricsStoreRef,
    normalizeQueueTrack,
    normalizeTrackIdentity,
    persistManualLyricsStore,
    persistPlaylistOrder,
    playlistOrder,
    playlists,
    refreshOfflineDownloads,
    refreshStorageEstimate,
    refreshStorageStats,
    setDownloadedTracks,
    setImportReview,
    setIsLocalMediaImporting,
    setIsSpotifyImportOpen,
    setManualLyricsStore,
    setMusicImportProvider,
    setPlaylists,
    setSpotifyImportLogs,
    setSpotifyImportPlaylistName,
    setSpotifyImportProgress,
    setViewingPlaylist,
    spotifyImportPlaylistName
  });
  const seekActivePlaybackTo = useSeekActivePlaybackAction({
    API_BASE,
    currentTimeRef,
    downloadedTracks,
    isPlaying,
    isStandalone,
    liveStreamStartOffsetMsRef,
    localAudioRef,
    localVideoRef,
    pendingResumeTimeRef,
    playbackResetNonce,
    queue,
    setCurrentTime,
    setPendingResumeTime,
    streamPort,
    videoModeRef
  });
  const logSoundCapsulePlayback = useLogSoundCapsulePlayback({
    PLAYBACK_GENRE_SIGNALS,
    PLAYBACK_LEDGER_STORAGE_KEY,
    currentTimeRef,
    getLocalDateKey,
    ledgerSessionRef,
    normalizePlaybackLedgerData,
    normalizeTrackIdentity,
    scoreLedgerPayload
  });
  useEffect(() => {
    ledgerSessionRef.current = {
      id: '',
      trackKey: '',
      counted: false,
      lastLoggedMs: 0
    };
  }, [currentTrack?.actualUrl, currentTrack?.id, currentTrack?.queueNonce, currentTrack?.url, currentTrack?.youtubeId]);
  useEffect(() => {
    if (!isStandalone || !window.aether?.store) return;
    const flushLiveLedger = () => {
      const liveTrack = currentTrackRef.current;
      if (!isPlayingRef.current || !liveTrack) return;
      if (Math.max(0, Math.floor(Number(currentTimeRef.current) || 0)) < 15000) return;
      logSoundCapsulePlayback(liveTrack, {
        reason: 'live'
      });
    };
    clearTrackedInterval(soundCapsuleLiveIntervalRef, 'sound capsule live flush');
    clearTrackedTimeout(soundCapsuleWarmupTimeoutRef, 'sound capsule warmup flush');
    soundCapsuleLiveIntervalRef.current = window.setInterval(flushLiveLedger, 45000);
    soundCapsuleWarmupTimeoutRef.current = window.setTimeout(() => {
      soundCapsuleWarmupTimeoutRef.current = 0;
      flushLiveLedger();
    }, 18000);
    return () => {
      if (soundCapsuleLiveIntervalRef.current) {
        window.clearInterval(soundCapsuleLiveIntervalRef.current);
        soundCapsuleLiveIntervalRef.current = 0;
      }
      if (soundCapsuleWarmupTimeoutRef.current) {
        window.clearTimeout(soundCapsuleWarmupTimeoutRef.current);
        soundCapsuleWarmupTimeoutRef.current = 0;
      }
    };
  }, [clearTrackedInterval, clearTrackedTimeout, isStandalone, logSoundCapsulePlayback]);

  // Consolidate queue advancement logic
  const advanceQueue = useAdvanceQueueAction({
    appendRecentEvent,
    currentTimeRef,
    getTrackActionKey,
    isAutoplayEnabled,
    isPlaying,
    localAudioRef,
    localVideoRef,
    logSoundCapsulePlayback,
    manualTransportAdvanceRef,
    noteSkipReason,
    pendingResumeTimeRef,
    queue,
    repeatMode,
    setCurrentTime,
    setIsPlaying,
    setLastAdded,
    setPendingResumeTime,
    setQueue,
    setStopAfterTrack,
    stopAfterTrack,
    triggerAutoplay,
    videoModeRef
  });
  useEffect(() => {
    advanceQueueRef.current = advanceQueue;
  }, [advanceQueue]);
  const handleControl = useAetherHandleControl({
    advanceQueueRef,
    currentTimeRef,
    getTrackActionKey,
    history,
    isStandalone,
    localAudioRef,
    manualTransportAdvanceRef,
    pendingResumeTimeRef,
    queue,
    requestDestructiveConfirmation,
    seekActivePlaybackTo,
    setCurrentTime,
    setHistory,
    setIsAudioBuffering,
    setIsManualStop,
    setIsPlaying,
    setPendingResumeTime,
    setQueue,
    setVolume,
    setWebAudioUnlocked,
    videoModeRef,
    webTrackLoadKeyRef,
    youtubePlayerRef
  });
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.author,
        album: 'Aether Studio',
        artwork: [{
          src: getProxyUrl(currentTrack.thumbnail),
          sizes: '512x512',
          type: 'image/png'
        }]
      });
      navigator.mediaSession.setActionHandler('play', () => {
        handleControl('resume');
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        handleControl('pause');
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleControl('skip');
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handleControl('previous');
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {}
  }, [currentTrack, isPlaying]);
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
      } else if (sleepFadeEnabled && remainingMs <= 10000) {
        const fadeRatio = remainingMs / 10000;
        if (localAudioRef.current) localAudioRef.current.volume = volume * fadeRatio;
        setSleepRemainingStr('FADING...');
      } else {
        if (localAudioRef.current && localAudioRef.current.volume !== volume) localAudioRef.current.volume = volume;
        const m = Math.floor(remainingMs / 60000);
        const s = Math.floor(remainingMs % 60000 / 1000);
        setSleepRemainingStr(`${m}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(int);
  }, [sleepDeadline, volume, sleepFadeEnabled]);
  useEffect(() => {
    handleControlRef.current = handleControl;
  }, [handleControl]);
  const cleanQueueBuffer = useCallback(() => {
    let removed = 0;
    setQueue(prev => {
      if (!Array.isArray(prev) || prev.length <= 1) return prev;
      const seen = new Set();
      const next = [];
      prev.forEach((track, index) => {
        const key = getTrackActionKey(track) || `${track?.title || ''}|${track?.author || ''}`;
        if (index > 0 && seen.has(key)) {
          removed += 1;
          return;
        }
        seen.add(key);
        next.push(track);
      });
      return next;
    });
    flashLastAdded(removed > 0 ? `Queue cleaned • removed ${removed} duplicate${removed === 1 ? '' : 's'}` : 'Queue already clean', 2200, removed > 0 ? 'success' : 'warning');
  }, [flashLastAdded, getTrackActionKey]);
  const playDownloadedOnly = useCallback(() => {
    const downloadedSet = new Set((downloadedTracks || []).map(id => String(id)));
    let removed = 0;
    setQueue(prev => {
      const next = (Array.isArray(prev) ? prev : []).filter(track => {
        const id = resolveWarmupTrackId(track) || track?.id || track?.youtubeId;
        const keep = id && (downloadedSet.has(String(id)) || downloadedSet.has(String(track?.id || '')));
        if (!keep) removed += 1;
        return keep;
      });
      return next;
    });
    flashLastAdded(removed > 0 ? `Queue set to downloaded only • removed ${removed}` : 'Queue is already downloaded only', 2400, removed > 0 ? 'success' : 'warning');
  }, [downloadedTracks, flashLastAdded, resolveWarmupTrackId]);
  const [accentColor, setAccentColor] = useState('#00ffbf');
  const handleSeek = useCallback(async time => {
    // Neural Seek Link
    const guildId = getEffectiveGuildId();
    if (isStandalone || !discordSdkRef.current?.guildId) {
      seekActivePlaybackTo(time);
      return;
    }
    try {
      await axios.post(`${API_BASE}/api/control/${guildId}`, {
        action: 'seek',
        time
      });
    } catch (e) {}
    seekActivePlaybackTo(time);
  }, [API_BASE, getEffectiveGuildId, isStandalone, seekActivePlaybackTo]);
  const handleLyricLineSeek = useCallback(lineTime => {
    handleSeek(lineTime + (currentTrackRef.current?.introOffsetMs || 0) + (lyricOffsetMs || 0));
  }, [handleSeek, lyricOffsetMs]);
  const memoizedLyricsContent = useMemo(() => lyrics.map((line, idx) => {
    const distance = Math.abs(idx - activeLyricIndex);
    const bucket = distance === 0 ? 'active' : distance === 1 ? 'near' : distance === 2 ? 'mid' : 'far';
    return <LyricLineIsland key={`${idx}-${line.time}`} bucket={bucket} index={idx} isActive={idx === activeLyricIndex} isDualWorkspaceMode={isDualWorkspaceMode} line={line} onSeek={handleLyricLineSeek} setActiveRef={activeLyricRef} />;
  }), [lyrics, activeLyricIndex, isDualWorkspaceMode, handleLyricLineSeek]);
  const handleRemove = useCallback(async index => {
    const track = queue?.[index];
    const confirmed = await requestDestructiveConfirmation({
      title: 'Remove track from queue?',
      message: `Aether will remove "${track?.title || 'this track'}" from the queue.`,
      detail: 'The track is not removed from vaults, favorites, or downloads.',
      confirmLabel: 'Remove Track'
    });
    if (!confirmed) return;
    if (isStandalone || !discordSdkRef.current?.guildId) {
      setQueue(prev => {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
      return;
    }
    const guildId = getEffectiveGuildId();
    try {
      await axios.post(`${API_BASE}/api/remove/${guildId}/${index}`);
      fetchQueue();
    } catch (err) {}
  }, [isStandalone, API_BASE, getEffectiveGuildId, queue, requestDestructiveConfirmation]);
  const handleSync = async offset => {
    if (isStandalone || !discordSdkRef.current?.guildId) {
      setLyricOffsetMs(prev => prev + offset);
      return;
    }
    const guildId = getEffectiveGuildId();
    await axios.post(`${API_BASE}/api/sync/${guildId}`, {
      offset
    });
    fetchQueue();
  };
  const toggleMiniPlayer = useCallback(async () => {
    if (!isStandalone || !window.aether?.resizeWindow) return;
    if (isMiniPlayer) {
      await window.aether.resizeWindow(1160, 780, false);
      setIsMiniPlayer(false);
      setIsMiniQueuePeekOpen(false);
      appendRecentEvent('mini_player', 'Returned to studio layout', {
        tone: 'neutral'
      });
    } else {
      if (videoModeRef.current || localVideoRef.current) {
        switchVideoMode('dual'); // Compress into album bounding box, don't sever connection
      }
      await window.aether.resizeWindow(isMacPlatform ? 664 : 648, isMacPlatform ? 236 : 228, true);
      setIsMiniPlayer(true);
      setIsMiniQueuePeekOpen(false);
      appendRecentEvent('mini_player', 'Dock view enabled', {
        tone: 'neutral'
      });
    }
  }, [appendRecentEvent, exitVideoMode, isMacPlatform, isMiniPlayer, isStandalone]);
  const toggleFocusMode = useCallback(() => {
    if (videoMode === 'dual') return;
    setIsFocusedMode(prev => !prev);
  }, [videoMode]);
  const openDiagnosticsPage = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('diagnostics');
      setIsDiagnosticsOpen(false);
      setExperienceCenterInitialPage('diagnostics');
      setIsExperienceCenterOpen(true);
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);
  const commandPaletteShortcutLabel = useMemo(() => getCommandPaletteShortcutLabel(isMacPlatform), [isMacPlatform]);
  const shortcutLabel = useCallback(id => toReadableShortcut(shortcuts?.[id], isMacPlatform), [isMacPlatform, shortcuts]);
  const focusMusicSearch = useCallback(() => {
    setIsMobileSearchOpen(false);
    runAfterInputPaint(() => {
      headerSearchInputRef.current?.focus();
      headerSearchInputRef.current?.select?.();
    });
  }, [runAfterInputPaint]);
  const commandPaletteCommands = useCommandPaletteCommands({
    cleanQueueBuffer,
    closeHeaderSurfaces,
    focusMusicSearch,
    handleAdd,
    isOfflineMode,
    isStandalone,
    librarySongEntries,
    lockStatus,
    openExperienceCenterPage,
    openFeedbackPanel,
    openLibraryOverlay,
    openMusicImport,
    playDownloadedOnly,
    queue,
    setIsAppLocked,
    setIsAuraStageOpen,
    shortcutLabel,
    toggleMiniPlayer
  });
  const toggleLooksPanel = useCallback(() => {
    const next = !isLooksPanelOpen;
    runAfterInputPaint(() => {
      if (next) closeHeaderSurfaces('looks');
      setIsLooksPanelOpen(next);
    });
  }, [closeHeaderSurfaces, isLooksPanelOpen, runAfterInputPaint]);
  const toggleSleepTimerMenu = useCallback(() => {
    const next = !isSleepTimerMenuOpen;
    runAfterInputPaint(() => {
      if (next) closeHeaderSurfaces('sleep');
      setIsSleepTimerMenuOpen(next);
    });
  }, [closeHeaderSurfaces, isSleepTimerMenuOpen, runAfterInputPaint]);
  const cycleRepeatMode = useCallback(() => {
    setRepeatMode(prev => {
      const next = prev === 'off' ? 'track' : prev === 'track' ? 'queue' : 'off';
      appendRecentEvent('repeat_mode', next === 'off' ? 'Repeat disabled' : next === 'track' ? 'Repeating current track' : 'Repeating queue', {
        tone: 'neutral'
      });
      return next;
    });
  }, [appendRecentEvent]);
  useEffect(() => {
    gestureRuntimeRef.current.handleControl = handleControl;
    gestureRuntimeRef.current.appendRecentEvent = appendRecentEvent;
  }, [appendRecentEvent, handleControl]);
  useFaceControlLoop({
    Uint8Array,
    cameraMotionRef,
    cameraUiUpdateRef,
    clamp01,
    faceActionRef,
    faceLoopRef,
    faceStreamRef,
    faceVideoRef,
    gestureRuntimeRef,
    isFaceControlEnabled,
    localAudioRef,
    setCameraHandSignal,
    setFaceControlSignal,
    setFaceControlStatus,
    setIsCameraPreviewVisible,
    setIsFaceControlEnabled,
    setVolume,
    setVolumeToast,
    showGestureNotice,
    undefined
  });
  useGestureControlLoop({
    Element,
    clamp01,
    gestureRuntimeRef,
    gestureStateRef,
    isGestureControlEnabled,
    localAudioRef,
    setVolume,
    showGestureNotice,
    showVolumeToastFor,
    touchGestureRef,
    undefined
  });
  useEffect(() => {
    if (!isMiniPlayer || !currentTrack || queue.length <= 1) {
      setIsMiniQueuePeekOpen(false);
    }
  }, [isMiniPlayer, currentTrack, queue.length]);
  const toggleWindowMaximize = useCallback(async () => {
    if (!isStandalone || !window.aether?.toggleWindowMaximize) return;
    try {
      await window.aether.toggleWindowMaximize();
    } catch (e) {
      console.warn('[Aether/Window] toggle maximize failed', e);
    }
  }, [isStandalone]);
  const handleHeaderDoubleClick = useCallback(event => {
    if (!isStandalone) return;
    if (event?.target instanceof Element && event.target.closest('button, input, textarea, select, option, a, [role="button"], [data-no-maximize="true"]')) {
      return;
    }
    toggleWindowMaximize();
  }, [isStandalone, toggleWindowMaximize]);
  const handleResetPlaybackEngine = useResetPlaybackEngineAction({
    appendRecentEvent,
    bufferingRescueRef,
    currentTimeRef,
    currentTrack,
    getActivePlaybackPositionMs,
    isStandalone,
    localAudioRef,
    localVideoRef,
    pendingResumeTimeRef,
    prematureEndGuardRef,
    requestDestructiveConfirmation,
    setCinemaControlsVisible,
    setCurrentTime,
    setIsAudioBuffering,
    setLastAdded,
    setPendingResumeTime,
    setPlaybackResetNonce,
    standaloneTrackLoadKeyRef,
    stopVideoElement,
    videoModeRef
  });
  const handleRunRuntimeRepair = useRunRuntimeRepairAction({
    appendRecentEvent,
    currentTrack,
    handleResetPlaybackEngine,
    isStandalone,
    refreshEngineStatus,
    refreshOfflineDownloads,
    refreshStorageEstimate,
    refreshStorageStats,
    requestDestructiveConfirmation,
    runtimeIssueDismissedRef,
    setIsRuntimeRepairing,
    setLastAdded,
    setRuntimeIssuePrompt
  });
  const clearDiagnosticEvents = useCallback(async () => {
    const confirmed = await requestDestructiveConfirmation({
      title: 'Clear diagnostic events?',
      message: 'Aether will clear the recent diagnostic event list.',
      detail: 'This only clears diagnostics shown here. Your music library is not changed.',
      confirmLabel: 'Clear Events',
      preferenceKey: 'diagnostics.clearEvents'
    });
    if (confirmed) setSkipEvents([]);
  }, [requestDestructiveConfirmation]);
  useEffect(() => {
    const isEditingTarget = event => {
      const target = getKeyboardEventElement(event) || (document.activeElement instanceof Element ? document.activeElement : null);
      if (!target) return false;
      return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [data-shortcut-recording="true"]'));
    };
    const onCommandPaletteShortcut = event => {
      if (event.defaultPrevented || event.repeat || event.isComposing) return;
      const key = getEventKeyToken(event);
      const wantsPalette = key === 'K' && (isMacPlatform ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey) && !event.altKey && !event.shiftKey;
      if (!wantsPalette) return;
      if (isEditingTarget(event) || destructiveConfirmRequest || isLockModalOpen) return;
      event.preventDefault();
      event.stopPropagation();
      setIsCommandPaletteOpen(true);
    };
    window.addEventListener('keydown', onCommandPaletteShortcut, true);
    return () => window.removeEventListener('keydown', onCommandPaletteShortcut, true);
  }, [destructiveConfirmRequest, isLockModalOpen, isMacPlatform]);
  useKeyboardShortcutLayer({
    appLockSettingsRef,
    closeHeaderSurfaces,
    destructiveConfirmRequest,
    feedbackRef,
    focusMusicSearch,
    gestureLabRef,
    handleControl,
    headerControlsRef,
    inspectTarget,
    isAuraStageOpen,
    isCommandPaletteOpen,
    isExperienceCenterOpen,
    isFeedbackOpen,
    isGestureLabOpen,
    isLibraryOverlayOpen,
    isLockModalOpen,
    isManualLyricsEditorOpen,
    isManualLyricsRawEditorOpen,
    isMixtapeVaultOpen,
    isNativeKeyboardTarget,
    isParsedShortcutEventMatch,
    isPlayerOverlayOpen,
    isPlaying,
    isSharedSceneOpen,
    isShortcutSettingsOpen,
    isSpotifyImportOpen,
    isStandalone,
    isTipsOverlayOpen,
    isViewingFullDiscovery,
    isViewingFullPlaylist,
    isViewingFullQueue,
    localAudioRef,
    oauthPrompt,
    openDiagnosticsPage,
    openExperienceCenterPage,
    openLibraryOverlay,
    openShortcutSettings,
    parsedShortcuts,
    setIsAuraStageOpen,
    setVolume,
    setVolumeToast,
    soundCapsuleRef,
    toggleFocusMode,
    toggleMiniPlayer
  });
  const musicImportTheme = musicImportProvider === 'apple' ? {
    accent: '#ff5a7d',
    accentSoft: 'rgba(255, 90, 125, 0.13)',
    accentBorder: 'rgba(255, 90, 125, 0.42)',
    accentText: '#ff9aad',
    accentShadow: 'rgba(255, 90, 125, 0.18)',
    ctaText: '#19070c',
    label: 'Apple Music',
    sourceLine: 'Public music.apple.com playlist links',
    placeholder: 'https://music.apple.com/.../playlist/...'
  } : musicImportProvider === 'spotify' ? {
    accent: '#1ed760',
    accentSoft: 'rgba(30, 215, 96, 0.12)',
    accentBorder: 'rgba(30, 215, 96, 0.42)',
    accentText: '#83f3ad',
    accentShadow: 'rgba(30, 215, 96, 0.16)',
    ctaText: '#031108',
    label: 'Spotify',
    sourceLine: 'Public open.spotify.com playlist links',
    placeholder: 'https://open.spotify.com/playlist/...'
  } : musicImportProvider === 'local' ? {
    accent: 'rgb(125, 255, 218)',
    accentSoft: 'rgba(0, 255, 191, 0.11)',
    accentBorder: 'rgba(0, 255, 191, 0.36)',
    accentText: 'rgb(125, 255, 218)',
    accentShadow: 'rgba(0, 255, 191, 0.16)',
    ctaText: '#00140f',
    label: 'Local Files',
    sourceLine: 'Songs, videos, playlists, and matching .lrc lyrics from this computer',
    placeholder: 'Use Pick Local Files below'
  } : {
    accent: 'rgb(0, 255, 191)',
    accentSoft: 'rgba(0, 255, 191, 0.1)',
    accentBorder: 'rgba(0, 255, 191, 0.32)',
    accentText: 'rgb(125, 255, 218)',
    accentShadow: 'rgba(0, 255, 191, 0.12)',
    ctaText: '#00140f',
    label: 'Playlist',
    sourceLine: 'Choose Spotify or Apple Music first',
    placeholder: 'Choose Spotify or Apple Music first'
  };
  const auraStageDurationMs = currentTrack?.totalDurationMs || currentTrack?.duration || 0;
  const auraStagePulseScale = 1 + livePulseReadout * 0.12;
  const mixtapeDurationMs = Math.max(0, Number(currentTrack?.totalDurationMs || currentTrack?.duration || 0));
  const mixtapePositionMs = getActivePlaybackPositionMs();
  const mixtapeProgressPct = mixtapeDurationMs > 0 ? clamp01(mixtapePositionMs / mixtapeDurationMs) * 100 : 0;
  const mixtapeLiveLyric = compactLyric || activeLyric || 'No live lyric locked yet';
  const mixtapeFallbackPulse = useMemo(() => deriveFallbackPulse(currentTrack, mixtapePositionMs, isPlaying), [currentTrack?.author, currentTrack?.id, currentTrack?.title, currentTrack?.youtubeId, isPlaying, mixtapePositionMs]);
  const hasLivePulseSignal = liveBeatIntensity > 0.015 || vaultPulse.bass > 0.015 || vaultPulse.mids > 0.015 || vaultPulse.highs > 0.015 || vaultPulse.energy > 0.015;
  const mixtapePulse = hasLivePulseSignal ? vaultPulse : mixtapeFallbackPulse;
  const mixtapePulseReadout = hasLivePulseSignal ? livePulseReadout : Math.max(mixtapeFallbackPulse.energy, isPlaying ? 0.08 : 0);
  const mixtapeSpectrum = useMemo(() => {
    if (!isPlaying) return vaultSpectrum.map(() => 0);
    if (hasLivePulseSignal) return vaultSpectrum;
    const seed = hashStringToUnit(`${currentTrack?.title || ''}|${currentTrack?.author || ''}`);
    return vaultSpectrum.map((bin, idx) => {
      const phase = mixtapePositionMs / 1000 * (0.8 + idx * 0.08) + seed * 6 + idx;
      const fallback = clamp01(0.18 + mixtapePulseReadout * 0.55 + Math.sin(phase) * 0.1);
      return Math.max(bin, fallback);
    });
  }, [currentTrack?.author, currentTrack?.title, hasLivePulseSignal, isPlaying, mixtapePositionMs, mixtapePulseReadout, vaultSpectrum]);
  const mixtapeEnergyPct = Math.round(mixtapePulseReadout * 100);
  if (loading) return {
    __aetherView: <div className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="relative">
        <Loader2 className="animate-spin text-brand-accent" size={48} />
        <div className="absolute inset-0 blur-xl bg-brand-accent/20 animate-pulse" />
      </div>
      <div className="label-caps animate-pulse text-sm">Neural Link Active</div>
    </div>
  };
  if (isStandalone && lockStatus.enabled && isAppLocked) return {
    __aetherView: <div className="h-screen w-full bg-[#050505] flex items-center justify-center p-6">
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
          <input type="password" value={unlockPasswordInput} onChange={e => setUnlockPasswordInput(e.target.value)} placeholder="Enter password" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent/50" onKeyDown={e => {
            if (e.key === 'Enter') handleUnlockWithPassword();
          }} />

          {lockError && <div className="text-[11px] text-red-400">{lockError}</div>}

          <div className="flex items-center gap-2">
            <button onClick={handleUnlockWithPassword} disabled={isLockBusy || !unlockPasswordInput} className="flex-1 rounded-xl bg-brand-accent text-black font-black py-2.5 text-sm disabled:opacity-50">
              Unlock
            </button>
            {lockStatus.touchIdAvailable && lockStatus.touchIdEnabled && <button onClick={handleUnlockWithBiometric} disabled={isLockBusy} className="rounded-xl border border-white/15 bg-white/5 text-white px-3 py-2.5 hover:text-brand-accent transition-colors" title="Unlock with Touch ID">
                <Fingerprint size={16} />
              </button>}
          </div>

          <div className="flex justify-end mt-1">
            <button className="text-xs text-brand-accent hover:underline focus:underline focus:outline-none" type="button" onClick={() => {
              setIsForgotPasswordOpen(true);
              setRecoveryError('');
              setRecoveryPhrase('');
              setRecoveryToken('');
              setRecoveryNewPassword('');
              setRecoveryNewPasswordConfirm('');
              refreshLockRecoveryStatus();
            }}>
              Forgot password?
            </button>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {isForgotPasswordOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-[#181818] border border-white/10 p-6 relative">
              <button className="absolute top-3 right-3 text-white/40 hover:text-brand-accent" onClick={() => setIsForgotPasswordOpen(false)} aria-label="Close recovery dialog">
                <X size={18} />
              </button>
              <div className="text-lg font-bold text-brand-accent mb-2">Recover Access</div>
              <div className="text-xs text-white/60 mb-4">Verify your backup phrase, then set a new password.</div>

              <div className="space-y-4">
                {/* Backup Phrase Recovery — primary */}
                <div className="border border-brand-accent/25 rounded-xl p-3 bg-brand-accent/[0.04]">
                  <div className="font-semibold text-white/90 mb-1 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-accent" />
                    Backup Recovery Phrase
                    <span className="ml-1 text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent/70">Primary</span>
                  </div>
                  {lockRecoveryStatus?.phrase?.enabled ? <>
                      <input type="text" value={recoveryPhrase} onChange={e => setRecoveryPhrase(e.target.value)} placeholder="Enter backup phrase" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-brand-accent/50" />
                      <button className="mt-2 w-full rounded-lg bg-brand-accent text-black font-bold px-3 py-1 text-xs disabled:opacity-50" disabled={!recoveryPhrase || recoveryBusy} onClick={handleVerifyRecoveryPhrase}>
                        {recoveryBusy ? 'Verifying…' : 'Verify Phrase'}
                      </button>
                    </> : <div className="text-xs text-white/45">
                      No backup phrase is set. Generate one in App Lock settings while unlocked.
                    </div>}
                </div>

                {/* Reset Password */}
                <div className="border border-white/10 rounded-xl p-3 bg-white/[0.02]">
                  <div className="font-semibold text-white/80 mb-1">Set New Password</div>
                  <div className="text-xs text-white/45 mb-2">
                    {recoveryToken ? 'Recovery verified. Choose a new password.' : 'Verify backup phrase or email code first.'}
                  </div>
                  <div className="space-y-2">
                    <input type="password" value={recoveryNewPassword} onChange={e => setRecoveryNewPassword(e.target.value)} placeholder="New password" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-brand-accent/50" disabled={!recoveryToken || recoveryResetBusy} />
                    <input type="password" value={recoveryNewPasswordConfirm} onChange={e => setRecoveryNewPasswordConfirm(e.target.value)} placeholder="Confirm new password" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-brand-accent/50" disabled={!recoveryToken || recoveryResetBusy} />
                    <button className="w-full rounded-lg bg-brand-accent text-black font-bold px-3 py-1.5 text-xs disabled:opacity-50" disabled={!recoveryToken || recoveryResetBusy || !recoveryNewPassword || !recoveryNewPasswordConfirm} onClick={handleResetPasswordFromRecovery}>
                      {recoveryResetBusy ? 'Resetting…' : 'Reset Password'}
                    </button>
                  </div>
                </div>

                {(lockRecoveryStatusError || recoveryError) && <div className="text-xs text-red-400 text-center space-y-2">
                    <div>{recoveryError || lockRecoveryStatusError}</div>
                  </div>}

                {/* Fallback/help */}
                <div className="text-xs text-white/40 text-center mt-2">
                  If you can't access your backup phrase, please contact support or check your device backups.
                </div>
              </div>
            </div>
          </div>}
      </div>
    </div>
  };
  if (isMiniPlayer) {
    const miniDurationMs = currentTrack?.totalDurationMs || currentTrack?.duration || 0;
    const miniTitle = currentTrack?.title || '';
    const miniArtist = currentTrack?.author || '';
    const miniTitleMarquee = miniTitle.length > 34;
    const miniUpcomingQueue = queue.slice(1, 4);
    const miniQueueCount = Math.max(0, queue.length - 1);
    const miniShowingLyric = miniPlayerInfoMode === 'lyric' && Boolean(compactLyric);
    const miniMetaEyebrow = miniShowingLyric ? 'Live lyric' : 'Artist';
    const miniMetaLine = miniShowingLyric ? compactLyric : miniArtist || 'Unknown artist';
    const miniTrackProgressAccent = trackPalette.progressAccent || themeColor;
    const miniTrackProgressGlow = trackPalette.progressGlow || 'rgba(0, 255, 191, 0.42)';
    const miniTrackControlAccent = trackPalette.controlAccent || themeColor;
    const miniTrackControlGlow = trackPalette.controlGlow || 'rgba(0, 255, 191, 0.38)';
    const miniTrackControlSurface = trackPalette.controlSurface || 'rgba(12, 18, 22, 0.78)';
    return {
      __aetherView: <div className={`w-[100vw] h-[100vh] bg-[#040607] overflow-hidden drag relative ${windowChromeInsetClass}`}>
        {/* Ambient glow from album art color */}
        <div className="absolute -top-20 left-8 h-40 w-40 rounded-full blur-[78px] opacity-28 pointer-events-none" style={{
          background: `${themeColor}50`
        }} />
        <div className="absolute -bottom-12 right-8 h-36 w-36 rounded-full blur-[72px] opacity-20 pointer-events-none" style={{
          background: `${themeColor}32`
        }} />

        <div className="w-full h-full bg-[#090d12]/92 backdrop-blur-2xl flex flex-col relative z-10 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3.5 py-2 no-drag">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`h-2 w-2 rounded-full transition-all flex-none ${isPlaying ? 'bg-brand-accent shadow-[0_0_10px_rgba(0,255,191,0.88)]' : 'bg-white/25'}`} />
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent/80">Aether Dock</div>
              </div>
              <button onClick={() => miniQueueCount > 0 && setIsMiniQueuePeekOpen(prev => !prev)} disabled={miniQueueCount === 0} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] transition-all ${miniQueueCount > 0 ? 'border-white/10 bg-white/[0.04] text-white/55 hover:border-brand-accent/40 hover:text-brand-accent' : 'border-white/6 bg-white/[0.03] text-white/25 cursor-default'}`} title={miniQueueCount > 0 ? 'Peek upcoming queue' : 'No queued tracks'}>
                <ListMusic size={11} />
                <span>{miniQueueCount}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={() => setMiniPlayerInfoMode(prev => prev === 'artist' ? 'lyric' : 'artist')} className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all no-drag ${miniShowingLyric ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-brand-accent/35 hover:text-brand-accent'}`} title={miniShowingLyric ? 'Show artist details' : 'Show live lyric line'}>
                <BookOpen size={13} />
              </button>
              <button onClick={toggleMiniPlayer} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 h-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/55 transition-all no-drag hover:border-brand-accent/40 hover:bg-brand-accent/8 hover:text-brand-accent" title="Expand to full studio">
                <AppWindow size={12} />
                <span>Studio</span>
              </button>
            </div>
          </div>

          <div className="relative flex-1 min-h-0">
            {currentTrack ? <>
                {isMiniQueuePeekOpen && <div className="absolute inset-x-3 top-3 z-20 rounded-[1.4rem] border border-white/10 bg-[#071015]/96 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl no-drag">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.24em] text-brand-accent/75">Queue Peek</div>
                        <div className="mt-1 text-[10px] text-white/38">{miniQueueCount} track{miniQueueCount === 1 ? '' : 's'} waiting in line</div>
                      </div>
                      <button onClick={() => setIsMiniQueuePeekOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/45 transition-all hover:border-white/25 hover:text-white" title="Close queue peek">
                        <X size={13} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {miniUpcomingQueue.length > 0 ? miniUpcomingQueue.map((track, index) => <div key={`${track.id || track.title}-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-brand-accent/20 bg-brand-accent/10 text-[9px] font-black text-brand-accent">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[11px] font-black uppercase tracking-tight text-white/86">{track.title}</div>
                            <div className="truncate text-[9px] uppercase tracking-[0.18em] text-brand-accent/60">{track.author || 'Unknown artist'}</div>
                          </div>
                        </div>) : <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-[10px] uppercase tracking-[0.2em] text-white/35">
                          Nothing queued yet
                        </div>}
                    </div>
                  </div>}

                <div className={`flex h-full flex-col justify-between px-3.5 py-3 transition-all duration-200 ${isMiniQueuePeekOpen ? 'opacity-35 blur-[2px]' : 'opacity-100'}`}>
                  <div className="flex min-h-0 items-center gap-3">
                    <button onClick={toggleMiniPlayer} className="relative h-[74px] w-[74px] flex-none overflow-hidden rounded-[1.3rem] border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.45)] no-drag" title="Open in Studio">
                      <img src={getProxyUrl(currentTrack.thumbnail)} className="h-full w-full object-cover" alt="" />
                      {isAudioBuffering && <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                          <Loader2 size={18} className="animate-spin text-brand-accent" />
                        </div>}
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <button onClick={toggleMiniPlayer} className="min-w-0 text-left no-drag" title="Open in Studio">
                        {miniTitleMarquee ? <div className="overlay-marquee">
                            <div className="overlay-marquee-track text-[15px] font-black uppercase tracking-tight text-white leading-tight">
                              <span>{miniTitle}</span>
                              <span aria-hidden="true">{miniTitle}</span>
                              <span aria-hidden="true">{miniTitle}</span>
                              <span aria-hidden="true">{miniTitle}</span>
                            </div>
                          </div> : <div className="truncate text-[15px] font-black uppercase tracking-tight text-white leading-tight">{miniTitle}</div>}
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span className="rounded-full border border-brand-accent/18 bg-brand-accent/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-brand-accent/76">
                            {miniMetaEyebrow}
                          </span>
                          <div className={`min-w-0 truncate text-[11px] ${miniShowingLyric ? 'text-white/58 italic' : 'text-white/46'}`}>
                            {miniMetaLine}
                          </div>
                          <ShortcutHint label={shortcutLabel('miniPlayer')} className="hidden sm:inline-flex" title="Toggle mini player" visible={showShortcutHints} />
                        </div>
                      </button>

                      <div className="space-y-1.5 no-drag">
                        <PlaybackProgressIsland durationMs={miniDurationMs} getPositionMs={getActivePlaybackPositionMs} onSeek={handleSeek} accent={miniTrackProgressAccent} glow={miniTrackProgressGlow} barClassName={`relative h-1.5 overflow-hidden rounded-full bg-white/10 ${miniDurationMs > 0 ? 'cursor-pointer' : 'cursor-default'}`} fillClassName="absolute inset-y-0 left-0 w-full rounded-full" timeRowClassName="flex items-center justify-between gap-3 text-[9px] font-mono text-white/36" middleContent={<span className="truncate uppercase tracking-[0.18em] text-white/22">{miniQueueCount > 0 ? `${miniQueueCount} up next` : 'Live audio'}</span>} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-[1.45rem] border border-white/10 px-2 py-1.5 no-drag" style={{
                    background: miniTrackControlSurface
                  }}>
                      <button onClick={() => handleControl('previous')} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent active:scale-95" title="Previous">
                        <Rewind size={15} fill="currentColor" />
                      </button>
                      <button onClick={() => handleControl(isPlaying ? 'pause' : 'resume')} className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] text-black transition-all hover:scale-[1.03] active:scale-95" style={{
                      background: miniTrackControlAccent,
                      boxShadow: `0 0 22px ${miniTrackControlGlow}`
                    }} title={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                      </button>
                      <button onClick={() => handleControl('skip')} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent active:scale-95" title="Next">
                        <FastForward size={15} fill="currentColor" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 px-0.5 no-drag">
                    <button onClick={() => handleControl('mute')} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50 transition-all hover:border-brand-accent/35 hover:text-brand-accent" title="Mute">
                      {volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                    <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => {
                    const next = parseFloat(e.target.value);
                    setVolume(next);
                    if (localAudioRef.current) localAudioRef.current.volume = next;
                    if (isStandalone) window.aether?.store?.set('volume', next);
                  }} className="mini-volume-slider h-1 w-full" title="Volume" />
                    <div className="w-10 text-right text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent/70">
                      {Math.round(volume * 100)}%
                    </div>
                  </div>
                </div>
              </> : <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-white/35">
                <Music size={18} className="text-brand-accent/50" />
                <div className="text-[10px] font-black uppercase tracking-[0.24em]">No signal</div>
                <button onClick={toggleMiniPlayer} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 transition-all hover:border-brand-accent/35 hover:text-brand-accent no-drag">
                  Open Studio
                </button>
              </div>}
          </div>
        </div>
      </div>
    };
  }
  const headerZClass = videoMode === 'cinema' ? 'z-[120]' : 'z-[220]';
  const headerInsetClass = isMacPlatform ? 'pl-20' : 'pl-4';
  const topHeaderClass = isAuraMode ? `h-[72px] border-b border-white/[0.15] bg-white/[0.015] backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,255,191,0.08),0_10px_40px_rgba(0,0,0,0.35)] ${headerZClass} px-4 md:px-6 ${headerInsetClass} flex flex-row items-center justify-between gap-4 drag flex-none relative` : `h-[72px] border-b border-white/8 bg-[#0a0f12]/86 backdrop-blur-3xl ${headerZClass} px-4 md:px-6 ${headerInsetClass} flex flex-row items-center justify-between gap-4 drag flex-none relative`;
  const headerIconButtonClass = 'no-drag flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] text-white/54 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:-translate-y-[1px] hover:border-brand-accent/38 hover:bg-brand-accent/[0.08] hover:text-brand-accent';
  const headerAccentButtonClass = 'no-drag flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/[0.08] text-brand-accent shadow-[0_0_18px_rgba(0,255,191,0.14)] transition-all hover:-translate-y-[1px] hover:border-brand-accent/55 hover:bg-brand-accent/[0.14]';
  const panelGlassClass = isAuraMode ? 'bg-white/[0.015] border-white/[0.12] backdrop-blur-[26px] shadow-[0_20px_80px_rgba(0,0,0,0.28)]' : 'bg-white/[0.03] border-white/5';
  const panelHeaderClass = isAuraMode ? 'bg-white/[0.03]' : 'bg-white/[0.02]';
  const panelInteractiveClass = isAuraMode ? 'hover:border-brand-accent/35 hover:shadow-[0_18px_60px_rgba(0,255,191,0.08)] hover:-translate-y-[1px]' : 'hover:border-brand-accent/20';
  const doodlePresetConfig = DOODLE_PRESETS.find(preset => preset.id === doodleIntensity) || DOODLE_PRESETS[1];
  const trackProgressAccent = trackPalette.progressAccent || themeColor;
  const trackProgressGlow = trackPalette.progressGlow || 'rgba(0, 255, 191, 0.42)';
  const trackControlAccent = trackPalette.controlAccent || themeColor;
  const trackControlGlow = trackPalette.controlGlow || 'rgba(0, 255, 191, 0.38)';
  const trimmedSearchQuery = searchQuery.trim();
  const isSearchActive = trimmedSearchQuery.length > 0;
  const hasActiveSearchState = Boolean(trimmedSearchQuery || searchResults.length > 0 || hasCompletedSearch);
  const isArtistExplorerActive = Boolean(selectedArtist);
  const discoveryItems = isArtistExplorerActive ? artistExplorerTracks : isSearchActive ? searchResults : neuralRecommendations;
  const discoveryModeLabel = isArtistExplorerActive ? 'ARTIST TRACK' : isSearchActive ? 'RESULT' : 'RECOMMENDATION';
  const diagnosticsApiBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
  const queuePollDisplay = isStandalone ? 'local' : `${diagnostics.lastQueueFetchMs ?? '—'}ms`;
  const queuePollTime = isStandalone ? 'direct engine' : formatDiagTime(diagnostics.lastQueueFetchAt);
  const cookieAudit = engineStatus?.cookieAudit || null;
  const cookieStatusLabel = !engineStatus ? 'CHECKING' : !engineStatus.cookiesReady ? 'NO FILE' : cookieAudit?.readyForYoutube ? 'READY FOR YOUTUBE' : cookieAudit?.valid ? 'FORMAT OK' : 'CHECK FILE';
  const cookieStatusTone = !engineStatus ? 'text-white/60' : !engineStatus.cookiesReady ? 'text-white/60' : cookieAudit?.readyForYoutube ? 'text-brand-accent' : cookieAudit?.valid ? 'text-white/80' : 'text-yellow-400';
  const cookieSummaryLine = !engineStatus ? 'Checking cookie session…' : !engineStatus.cookiesReady ? 'Anonymous requests only until a Netscape cookies.txt file is imported.' : cookieAudit?.summary || 'Cookie file detected.';
  const cookieAssuranceLine = !engineStatus?.cookiesReady ? 'Used only when YouTube asks for sign-in or confirmation.' : cookieAudit?.note || 'Local format scan only.';
  const ytDlpStatusLabel = !engineStatus ? 'CHECKING' : engineStatus.ytDlpReady ? 'READY' : engineStatus.ytDlpPath ? 'FOUND, VERIFYING' : 'UNAVAILABLE';
  const ytDlpStatusTone = !engineStatus ? 'text-white/60' : engineStatus.ytDlpReady ? 'text-brand-accent' : engineStatus.ytDlpPath ? 'text-white/80' : 'text-yellow-400';
  const ytDlpDetailLine = !engineStatus ? 'Resolving yt-dlp binary…' : engineStatus.ytDlpReady ? 'Direct fetch engine answered a version check.' : engineStatus.ytDlpPath ? 'Binary is present but has not passed a health check yet.' : 'No working yt-dlp binary found yet.';
  const ffmpegStatusLabel = !engineStatus ? 'CHECKING' : engineStatus.ffmpegReady ? 'READY' : 'MISSING';
  const ffmpegStatusTone = !engineStatus ? 'text-white/60' : engineStatus.ffmpegReady ? 'text-brand-accent' : 'text-yellow-400';
  const ffmpegDetailLine = !engineStatus ? 'Resolving ffmpeg…' : engineStatus.ffmpegReady ? 'Remux and extraction pipeline is ready.' : 'FFmpeg is not resolved yet.';
  const showImmersiveLyricsOverlay = Boolean(isLyricsExpanded && !showVisualStage);
  const showWindowsTitleStrip = Boolean(isStandalone && isWindowsPlatform && !isMaximized && !showImmersiveLyricsOverlay);
  const showWindowsHeaderWindowControls = Boolean(isStandalone && isWindowsPlatform && isMaximized && !showImmersiveLyricsOverlay);
  const desktopTopInsetClass = showImmersiveLyricsOverlay ? 'pt-0' : windowChromeInsetClass;
  const diagnosticPathBlockClass = 'mt-2 rounded-xl border border-white/8 bg-black/25 px-2.5 py-2 text-[10px] leading-4 font-mono text-white/55 whitespace-pre-wrap break-all';
  const repairActionLabel = isRuntimeRepairing ? 'Repairing…' : 'Repair Runtime';
  const doodleIntensityScale = doodleIntensity === 'subtle' ? 0.75 : doodleIntensity === 'dreamy' ? 1.35 : 1;
  const doodleIntensityBadge = doodlePresetConfig.badge;
  const workspaceModeLabel = isFocusedMode ? 'Focus' : isVerticalStack ? 'Stack' : 'Studio';
  const playbackModeLabel = isOfflineMode ? 'Offline Ready' : videoMode === 'cinema' ? 'Cinema' : videoMode === 'dual' ? 'Dual Stage' : isPlaying ? 'Audio Live' : 'Ready';
  const repeatModeLabel = repeatMode === 'track' ? 'Repeat Track' : repeatMode === 'queue' ? 'Repeat Queue' : 'Repeat Off';
  const repeatModeBadge = repeatMode === 'track' ? '1' : repeatMode === 'queue' ? 'Q' : null;
  const hasLyricPreset = Boolean(currentTrackPresetKey && Object.prototype.hasOwnProperty.call(lyricOffsetPresets, currentTrackPresetKey));
  const lyricPresetActionLabel = isLyricPresetSaved ? 'Saved' : hasLyricPreset ? 'Update' : 'Save';
  const chromeTopOffset = isWindowsPlatform ? showWindowsTitleStrip ? 114 : 84 : isMacPlatform ? 96 : 86;
  const diagnosticsTopOffset = isWindowsPlatform ? showWindowsTitleStrip ? 120 : 88 : isMacPlatform ? 102 : 92;
  const libraryModeOptions = [{
    id: 'playlists',
    label: 'Vaults'
  }, {
    id: 'songs',
    label: 'Songs'
  }];
  const libraryPlaylistFilterOptions = [{
    id: 'all',
    label: 'All'
  }, {
    id: 'filled',
    label: 'With Songs'
  }, {
    id: 'empty',
    label: 'Empty'
  }];
  const libraryPlaylistSortOptions = [{
    id: 'manual',
    label: 'Manual'
  }, {
    id: 'name',
    label: 'A-Z'
  }, {
    id: 'listened-desc',
    label: 'Recent'
  }, {
    id: 'added-desc',
    label: 'Added'
  }, {
    id: 'plays-desc',
    label: 'Played'
  }];
  const librarySongFilterOptions = [{
    id: 'all',
    label: 'All'
  }, {
    id: 'favorites',
    label: 'Favorites'
  }, {
    id: 'played',
    label: 'Played'
  }];
  const librarySongSortOptions = [{
    id: 'title',
    label: 'Title'
  }, {
    id: 'artist',
    label: 'Artist'
  }, {
    id: 'listened-desc',
    label: 'Recent'
  }, {
    id: 'added-desc',
    label: 'Added'
  }, {
    id: 'plays-desc',
    label: 'Played'
  }];
  const visualStageLyric = compactLyric || activeLyric || null;
  const visualStageNextLyric = nextLyric && nextLyric !== visualStageLyric ? nextLyric : null;
  const visualStageHeaderVisible = !shouldAutoHideVisualChrome || cinemaControlsVisible || visualControlsPinned;
  const visualStageFooterVisible = !shouldAutoHideVisualChrome || cinemaControlsVisible || visualControlsPinned;
  const dualVisualStageWidth = 'clamp(320px, 34vw, 560px)';
  const dualVisualStageZClass = videoMode === 'cinema' ? 'z-[260]' : 'z-[180]';
  const visualStageTitle = currentTrack?.title || '';
  const visualStageTitleMarquee = visualStageTitle.length > (videoMode === 'cinema' ? 42 : 24);
  const showVisualLyricOverlay = Boolean(showVisualLyrics && visualStageLyric && (videoMode === 'cinema' || videoMode === 'dual'));
  const visualLyricOverlayBottomClass = videoMode === 'cinema' ? visualStageFooterVisible ? 'bottom-28 md:bottom-36' : 'bottom-0' : 'bottom-24';
  const leftWorkspaceClass = isVerticalStack ? '!w-full !max-w-full !flex-none' : showSecondaryColumn ? 'w-[66.666%] h-full' : isFocusedMode ? 'w-full px-0 max-w-[1480px] mx-auto' : 'w-full px-0';
  const playerCardClass = isDualWorkspaceMode ? 'p-5 md:p-6 gap-6 md:gap-8 min-h-[248px] lg:min-h-[266px]' : 'p-6 md:p-8 gap-8 md:gap-10 min-h-[300px]';
  const playerTitleClass = isDualWorkspaceMode ? 'text-xl md:text-2xl lg:text-3xl' : 'text-2xl md:text-3xl lg:text-4xl';
  const lyricsPanelHeightClass = isVerticalStack ? 'h-[400px] flex-none' : 'flex-1';
  const lyricsViewportClass = isDualWorkspaceMode ? 'px-6 py-8 lg:px-12 lg:py-12 overflow-x-hidden custom-scrollbar-heavy' : 'p-10 lg:p-20';
  const lyricsListClass = isDualWorkspaceMode ? 'relative z-10 flex flex-col items-center gap-14 lg:gap-20 py-[18vh] text-center w-full mx-auto' : 'flex flex-col gap-6 py-4 text-center';
  const lyricsHeaderEyebrow = isDualWorkspaceMode ? 'Split Immersive' : 'Subtitles';
  const sharedModalCloseButtonClass = 'w-10 h-10 rounded-xl border border-white/15 bg-white/[0.03] text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center';
  const inspectPlaylistName = isPlaylistInspect ? String(inspectTarget?.playlistName || 'Playlist') : '';
  const inspectPlaylistSourceText = inspectPlaylistSourceUrls.join('\n');
  const inspectQueueIndex = inspectTrack ? queue.findIndex(track => normalizeTrackIdentity(track) === normalizeTrackIdentity(inspectTrack)) : -1;
  const inspectDurationMs = inspectTrack?.totalDurationMs || inspectTrack?.duration || 0;
  const playInspectPlaylist = (shuffle = false) => {
    const normalized = inspectPlaylistTracks.map(normalizeQueueTrack).filter(Boolean);
    if (normalized.length === 0) {
      setLastAdded(`No playable tracks in ${inspectPlaylistName}`);
      setTimeout(() => setLastAdded(null), 2600);
      return;
    }
    const nextQueue = shuffle ? [...normalized].sort(() => Math.random() - 0.5) : normalized;
    setQueue(nextQueue);
    seekActivePlaybackTo(0);
    setIsPlaying(true);
    setIsManualStop(false);
    setInspectTarget(null);
    setLastAdded(`${shuffle ? 'Shuffling' : 'Playing'} ${inspectPlaylistName} (${nextQueue.length})`);
    setTimeout(() => setLastAdded(null), 2600);
  };
  const queueInspectPlaylist = () => {
    const normalized = inspectPlaylistTracks.map(normalizeQueueTrack).filter(Boolean);
    if (normalized.length === 0) {
      setLastAdded(`No playable tracks in ${inspectPlaylistName}`);
      setTimeout(() => setLastAdded(null), 2600);
      return;
    }
    const shouldStart = queue.length === 0;
    setQueue(prev => [...(Array.isArray(prev) ? prev : []), ...normalized]);
    if (shouldStart) {
      setIsPlaying(true);
      setIsManualStop(false);
    }
    setLastAdded(`Queued ${inspectPlaylistName} (${normalized.length})`);
    setTimeout(() => setLastAdded(null), 2600);
  };
  const favoriteInspectPlaylist = () => {
    const next = {
      ...(favoriteTracks || {})
    };
    let added = 0;
    inspectPlaylistTracks.forEach(track => {
      const normalized = normalizeQueueTrack(track) || track;
      const key = normalizeTrackIdentity(normalized);
      if (key && !next[key]) {
        next[key] = normalized;
        added += 1;
      }
    });
    if (added <= 0) {
      setLastAdded('Playlist already in favorites');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    persistFavoriteTracks(next);
    setLastAdded(`Favorited ${added} playlist tracks`);
    setTimeout(() => setLastAdded(null), 2400);
  };
  const rootModeClass = [isVerticalStack ? 'vertical-stack-mode' : '', isDoodleMode ? `doodle-mode-active doodle-preset-${doodleIntensity}` : '', isAuraMode ? `aura-mode-active aura-preset-${auraPreset}` : '', isDepthMotionEnabled ? 'aether-depth-mode' : '', isGestureControlEnabled || isFaceControlEnabled ? 'gesture-lab-active' : ''].filter(Boolean).join(' ');
  const sharedSceneTrack = sharedScene ? {
    id: `shared-scene-${sharedScene.youtubeId || sharedScene.title || Date.now()}`,
    title: sharedScene.title || 'Aether Scene',
    author: sharedScene.author || 'Unknown Artist',
    thumbnail: sharedScene.thumbnail || (sharedScene.youtubeId ? `https://i.ytimg.com/vi/${sharedScene.youtubeId}/hqdefault.jpg` : ''),
    youtubeId: sharedScene.youtubeId || '',
    actualUrl: sharedScene.youtubeId ? `https://www.youtube.com/watch?v=${sharedScene.youtubeId}` : '',
    url: sharedScene.youtubeId ? `https://www.youtube.com/watch?v=${sharedScene.youtubeId}` : '',
    totalDurationMs: Math.max(0, Number(sharedScene.total || 0)),
    duration: Math.max(0, Number(sharedScene.total || 0)),
    source: 'shared-scene'
  } : null;
  const sharedSceneCanPlay = Boolean(sharedSceneTrack?.youtubeId);
  const sharedSceneUrl = sharedSceneEncoded ? `${AETHER_SHARE_ORIGIN}/?scene=${encodeURIComponent(sharedSceneEncoded)}` : AETHER_SHARE_ORIGIN;
  const sharedSceneDesktopLink = sharedSceneEncoded ? `aether://scene?scene=${encodeURIComponent(sharedSceneEncoded)}` : 'aether://';
  const playSharedSceneInBrowser = () => {
    if (!sharedSceneTrack || !sharedSceneCanPlay) {
      flashLastAdded('This scene has preview only', 2200, 'warning');
      return;
    }
    const normalized = normalizeQueueTrack(sharedSceneTrack) || sharedSceneTrack;
    setQueue([normalized]);
    const resumeAtMs = Math.max(0, Number(sharedScene?.at || 0));
    pendingResumeTimeRef.current = resumeAtMs;
    setPendingResumeTime(resumeAtMs);
    setPlaybackResetNonce(value => value + 1);
    setWebAudioUnlocked(true);
    setIsManualStop(false);
    setIsPlaying(true);
    setIsSharedSceneOpen(false);
    flashLastAdded('Playing shared scene', 1800, 'success');
    try {
      youtubePlayerRef.current?.playVideo?.();
    } catch {}
  };
  const openSharedSceneInAether = async () => {
    try {
      window.location.href = sharedSceneDesktopLink;
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(sharedSceneUrl);
      flashLastAdded('Scene link ready for Aether', 1800, 'success');
    } catch {
      flashLastAdded('Scene link copied fallback unavailable', 2200, 'warning');
    }
  };
  return buildAetherViewProps({
    APP_VERSION,
    Activity,
    AetherConfirmDialog,
    AetherHome,
    AlertTriangle,
    AnimatePresence,
    BUILD_VERSION,
    BookOpen,
    Check,
    ChevronLeft,
    ChevronRight,
    Clapperboard,
    Clock,
    Columns2,
    CommandPalette,
    Copy,
    DiscoveryGridSection,
    Download,
    Edit3,
    ExperienceCenterShell,
    ExternalLink,
    Eye,
    FAVORITES_PLAYLIST_ID,
    FAVORITES_PLAYLIST_NAME,
    FastForward,
    FullPlaylistOverlay,
    FullQueueOverlay,
    Globe,
    Hand,
    HardDrive,
    HeaderSearchBox,
    HeaderSleepTimerControls,
    HealthMetricCard,
    Heart,
    Home,
    Layers,
    ListMusic,
    Loader2,
    Lock,
    Maximize2,
    MessageSquare,
    Minimize2,
    MinusCircle,
    MixtapeVaultContent,
    Monitor,
    MotionConfig,
    Music,
    OfflineAvailablePanel,
    PartyMode,
    Pause,
    Play,
    PlaybackProgressIsland,
    PlayerActionButtons,
    PlayerModePill,
    PlayerTransportControls,
    Plus,
    PlusCircle,
    QueueBufferHeader,
    RefreshCw,
    Repeat,
    Rewind,
    RotateCcw,
    Save,
    Search,
    SecondaryNowPlayingStrip,
    Shuffle,
    Signal,
    SlidersHorizontal,
    Sparkles,
    StudioLibraryOverlayIsland,
    ToastPortal,
    Trash2,
    Upload,
    Users,
    Volume2,
    X,
    YouTubeAuthOverlay,
    Zap,
    activeLyricIndex,
    aetherProfile,
    alphaHex,
    appendManualLyricsDraftLine,
    appendRecentEvent,
    appendStampedManualLyricsLine,
    applyStoragePolicy,
    auraCardBorder,
    auraCardShadow,
    auraFieldStyle,
    auraPanelBorder,
    auraPanelShadow,
    auraPreset,
    auraStageDurationMs,
    auraStagePulseScale,
    autoplayMenuButtonRef,
    autoplayMenuStyle,
    autoplayMoodMode,
    artistFilter,
    artistSort,
    avatarFileInputRef,
    beatRingsRef,
    cameraHandSignal,
    canAddPendingToVault,
    canDownloadCurrentTrack,
    canOpenCurrentSource,
    canUseUpdater,
    cassetteSide,
    catDoodlePeek,
    chromeTopOffset,
    clamp01,
    cleanQueueBuffer,
    clearArtistExplorer,
    clearAllDownloadedTracks,
    clearDiagnosticEvents,
    clearDiscoveryResults,
    clearSearchHistoryForScope,
    closeDestructiveConfirmation,
    closeHeaderSurfaces,
    closeLibraryOverlay,
    closeTipsOverlay,
    commandPaletteCommands,
    commandPaletteShortcutLabel,
    compactLyric,
    cookieAssuranceLine,
    cookieStatusLabel,
    cookieStatusTone,
    cookieSummaryLine,
    copyManualLyricsToClipboard,
    copyProfileLink,
    copyProfileShareCard,
    copySpotifyImportDebugLog,
    copyVaultSceneEmbed,
    currentManualLyricsLines,
    currentTrack,
    currentTrackSourceUrl,
    currentTrackTitle,
    cycleRepeatMode,
    desktopTopInsetClass,
    destructiveConfirmRequest,
    diagnosticPathBlockClass,
    diagnostics,
    diagnosticsApiBase,
    diagnosticsTopOffset,
    discardSearchHistoryItem,
    discordPrivate,
    discoveryHome,
    discoveryItems,
    discoveryModeLabel,
    dismissRuntimeIssuePrompt,
    doodleIntensityBadge,
    doodleIntensityScale,
    downloadLabelById,
    downloadedTracks,
    draggedPlaylistName,
    draggedQueueIndex,
    dualVisualStageWidth,
    dualVisualStageZClass,
    engineStatus,
    exitVideoMode,
    expandedActiveRef,
    expandedContainerRef,
    experienceCenterInitialPage,
    faceControlSignal,
    faceControlStatus,
    faceVideoRef,
    favoriteInspectPlaylist,
    favoriteTracksList,
    ffmpegDetailLine,
    ffmpegStatusLabel,
    ffmpegStatusTone,
    flashLastAdded,
    focusedVaultName,
    focusedVaultTracks,
    focusedVaultVisibleTracks,
    formatBytes,
    formatDiagTime,
    formatManualLyricsTimestamp,
    formatTime,
    gestureNotice,
    getActivePlaybackPositionMs,
    getInspectSourceUrl,
    getProxyUrl,
    getTrackAddedMs,
    getHeaderSearchSuggestions,
    getTrackLastListenedMs,
    getTrackPlayCount,
    globalMediaShortcutsEnabled,
    handleAdd,
    handleAddToPlaylist,
    handleAttemptFixes,
    handleAvatarFileSelected,
    handleCleanVault,
    handleControl,
    handleCopyDiagnosticsValue,
    handleCopyPhrase,
    handleDeletePlaylist,
    handleDisableLock,
    handleDownloadCurrentTrack,
    handleDownloadMissingForVault,
    handleEnableLock,
    handleExportVault,
    handleFavoriteAddAll,
    handleFavoritePlayAll,
    handleGenerateRecoveryPhrase,
    handleGenerateSmartMix,
    handleHeaderDoubleClick,
    handleImportCookies,
    handleImportLocalMedia,
    handleImportSpotifyPlaylist,
    handleImportVault,
    handleLyricLineSeek,
    handleOfflineLibrarySearch,
    handlePlaylistAddAll,
    handlePlaylistPlayAll,
    handleRemove,
    handleRemoveFromPlaylist,
    handleRemoveTrackEverywhere,
    handleRemoveTrackFromPlaylist,
    handleRenamePlaylist,
    handleRepairEnvironment,
    handleResetLyricPreset,
    handleResetPlaybackEngine,
    handleResyncLyrics,
    handleRunInstaller,
    handleRunRuntimeRepair,
    handleSaveLyricPreset,
    handleSaveManualLyrics,
    handleHeaderSuggestionPick,
    handleSearch,
    handleSeek,
    handleSetSleepTimer,
    handleSync,
    handleToggleTouchIdLock,
    handleUpdateAction,
    handleVisualStagePointerActivity,
    handleVolumeChange,
    hasActiveSearchState,
    hasCompletedSearch,
    hasLyricPreset,
    headerAccentButtonClass,
    headerIconButtonClass,
    headerSearchInputRef,
    homeArtistName,
    homeArtistResults,
    homeError,
    homeFeed,
    homeFilter,
    homeLoading,
    homeResults,
    homeSeedArtists,
    homeSort,
    immersiveBeatIntensity,
    importReview,
    inferToastTone,
    inspectDurationMs,
    inspectPlaylistArtistCount,
    inspectPlaylistDurationMs,
    inspectPlaylistName,
    inspectPlaylistQueuedCount,
    inspectPlaylistSignal,
    inspectPlaylistTracklistText,
    inspectPlaylistTracks,
    inspectPrimaryTrack,
    inspectQueueIndex,
    inspectSourceUrl,
    inspectTarget,
    inspectTrack,
    inspectVaultNames,
    isAudioBuffering,
    isAuraMode,
    isAuraStageOpen,
    isAutoScrollPaused,
    isAutoplayEnabled,
    isAutoplayMenuOpen,
    isCameraPreviewVisible,
    isCommandPaletteOpen,
    isDepthMotionEnabled,
    isDiagnosticsOpen,
    isDoodleMode,
    isDownloadingTrack,
    isDualLayoutLocked,
    isDualVisualMode,
    isDualWorkspaceMode,
    isExperienceCenterOpen,
    isFaceControlEnabled,
    isFocusedMode,
    isFullDiscoveryContentReady,
    isFullPlaylistContentReady,
    isFullQueueContentReady,
    isGestureControlEnabled,
    isHomeOpen,
    isImmersiveLyricsLocked,
    isInspectPlaylistFromVault,
    isLibraryOverlayOpen,
    isLocalMediaImporting,
    isLockBusy,
    isLockModalOpen,
    isLyricPresetSaved,
    isLyricsExpanded,
    isLyricsLoading,
    isMacPlatform,
    isManualLyricsEditorOpen,
    isManualLyricsRawEditorOpen,
    isManualLyricsSaving,
    isManualLyricsTapMode,
    isMixtapeVaultContentReady,
    isMixtapeVaultOpen,
    isOfflineDownloadsBusy,
    isOfflineMode,
    isOfflineRemovalBusy,
    isPartyModeOpen,
    isPlayerOverlayOpen,
    isPlaying,
    isPlaylistInspect,
    isProfilePublishing,
    isQualityDropdownOpen,
    isRenamingPlaylist,
    isRuntimeRepairing,
    isSearchActive,
    isSearching,
    isSharedSceneOpen,
    isShortcutSettingsSaving,
    isSpotifyImportOpen,
    isSpotifyImporting,
    isStandalone,
    isStorageBusy,
    isTipsOverlayOpen,
    isTrackFavorite,
    isUpdateBusy,
    isVaultCleaning,
    isVaultImporting,
    isVerticalStack,
    isVideoReady,
    isViewingFavorites,
    isViewingFullDiscovery,
    isViewingFullPlaylist,
    isViewingFullQueue,
    lastAdded,
    leftWorkspaceClass,
    libraryActionTarget,
    libraryBrowseMode,
    libraryFilter,
    libraryInsights,
    libraryModeOptions,
    libraryOverlayCreateInputRef,
    libraryPlaylistFilterOptions,
    libraryPlaylistSortOptions,
    librarySearchNeedle,
    librarySearchTerm,
    librarySongFilter,
    librarySongFilterOptions,
    librarySongSort,
    librarySongSortOptions,
    librarySort,
    libraryTrackSort,
    libraryVisiblePlaylistNames,
    libraryVisibleSongEntries,
    livePulseReadout,
    loadManualLyricsFromRawText,
    localAudioRef,
    localVideoRef,
    lockDisablePassword,
    lockError,
    lockIdleMinutes,
    lockPasswordConfirm,
    lockPasswordInput,
    lockRecoveryStatus,
    lockRecoveryStatusError,
    lockStatus,
    lockUseTouchId,
    lyricOffsetMs,
    lyricPresetActionLabel,
    lyrics,
    lyricsContainerRef,
    lyricsHeaderEyebrow,
    lyricsListClass,
    lyricsPanelHeightClass,
    lyricsViewportClass,
    manualLyricsDraft,
    manualLyricsDraftError,
    manualLyricsRawText,
    manualLyricsSavedNotice,
    memoizedLyricsContent,
    mixtapeDurationMs,
    mixtapeEnergyPct,
    mixtapeLiveLyric,
    mixtapePositionMs,
    mixtapeProgressPct,
    mixtapePulse,
    mixtapePulseReadout,
    mixtapeSpectrum,
    mixtapeVaultRef,
    motion,
    movePlaylist,
    musicImportProvider,
    musicImportTheme,
    newPlaylistName,
    nextLyric,
    normalizeQueueTrack,
    normalizeTrackIdentity,
    oauthPrompt,
    offlineAvailableTracks,
    offlineDownloads,
    offlineLibrarySearchTerm,
    offlineVisibleTracks,
    openAppLockSettings,
    openDiagnosticsPage,
    openFeedbackPanel,
    openGestureLab,
    openLibraryOverlay,
    openManualLyricsEditor,
    openMusicImport,
    openArtistExplorer,
    openHomeArtist,
    openPlaylistInspect,
    openSharedSceneInAether,
    openShortcutSettings,
    openSignalLedger,
    openTipsOverlay,
    openTrackInspect,
    orderedPlaylistNames,
    panelGlassClass,
    panelHeaderClass,
    panelInteractiveClass,
    parseInt,
    parseManualLyricsTimestamp,
    pasteCurrentLyricsIntoRawEditor,
    pendingLibraryItems,
    performanceMode,
    phraseBusy,
    phraseCopied,
    phraseGenerated,
    platform,
    playButtonRef,
    playDownloadedOnly,
    playInspectPlaylist,
    playSharedSceneInBrowser,
    playbackModeLabel,
    playerCardClass,
    playerTitleClass,
    playlists,
    profileStats,
    publishAetherProfile,
    pulseCanvasRef,
    qualityDropdownRef,
    queue,
    queueInspectPlaylist,
    queuePollDisplay,
    queuePollTime,
    refreshLockRecoveryStatus,
    refreshLockStatus,
    refreshOfflineDownloads,
    refreshStorageEstimate,
    refreshStorageStats,
    removeDownloadedById,
    removeManualLyricsDraftLine,
    renameValue,
    reorderPlaylistByDrag,
    reorderQueueByDrag,
    repairActionLabel,
    repairResult,
    repeatMode,
    repeatModeBadge,
    repeatModeLabel,
    requestDestructiveConfirmation,
    resetConfirmationSkipPrefs,
    resetShortcutSettingsToDefaults,
    resolveWarmupTrackId,
    rootModeClass,
    runAfterInputPaint,
    runHomeSearch,
    runSuggestedSearch,
    runStorageOptimize,
    runtimeIssuePrompt,
    saveProfileShareCard,
    saveShortcutSettings,
    searchHistoryByScope,
    searchQuery,
    searchResults,
    seekActivePlaybackTo,
    selectedArtist,
    sessionRestoreNotice,
    setAetherProfile,
    setArtistFilter,
    setArtistSort,
    setAuraPreset,
    setAutoplayMoodMode,
    setDiscordPrivate,
    setDraggedPlaylistName,
    setDraggedQueueIndex,
    setExperienceCenterInitialPage,
    setGlobalMediaShortcutsEnabled,
    setHomeFilter,
    setHomeSort,
    setImportReview,
    setInspectTarget,
    setIsAppLocked,
    setIsAuraStageOpen,
    setIsAutoScrollPaused,
    setIsAutoplayEnabled,
    setIsAutoplayMenuOpen,
    setIsCameraPreviewVisible,
    setIsCommandPaletteOpen,
    setIsCreatingPlaylist,
    setIsDepthMotionEnabled,
    setIsDiagnosticsOpen,
    setIsDoodleMode,
    setIsExperienceCenterOpen,
    setIsFaceControlEnabled,
    setIsFocusedMode,
    setIsGestureControlEnabled,
    setIsHomeOpen,
    setIsLockModalOpen,
    setIsLyricsExpanded,
    setIsManualLyricsEditorOpen,
    setIsManualLyricsRawEditorOpen,
    setIsManualStop,
    setIsMixtapeVaultOpen,
    setIsOfflineMode,
    setIsPartyModeOpen,
    setIsPlayerOverlayOpen,
    setIsPlaying,
    setIsQualityDropdownOpen,
    setIsRenamingPlaylist,
    setIsSharedSceneOpen,
    setIsSpotifyImportOpen,
    setIsVerticalStack,
    setIsVideoReady,
    setIsViewingFullDiscovery,
    setIsViewingFullPlaylist,
    setIsViewingFullQueue,
    setLastAdded,
    setLibraryBrowseMode,
    setLibraryFilter,
    setLibrarySearchTerm,
    setLibrarySongFilter,
    setLibrarySongSort,
    setLibrarySort,
    setLibraryTrackSort,
    setLockDisablePassword,
    setLockIdleMinutes,
    setLockPasswordConfirm,
    setLockPasswordInput,
    setLockUseTouchId,
    setLyricOffsetMs,
    setManualLyricsRawText,
    setMusicImportProvider,
    setNewPlaylistName,
    setOauthPrompt,
    setOfflineLibrarySearchTerm,
    setPartyInfo,
    setPerformanceMode,
    setQueue,
    setRenameValue,
    setSearchQuery,
    setShortcutDraft,
    setShortcutSettingsError,
    setShowShortcutHints,
    setSkipEvents,
    setSleepCustomMinutes,
    setSleepFadeEnabled,
    setSpotifyImportLogs,
    setSpotifyImportPlaylistName,
    setSpotifyImportProgress,
    setSpotifyImportUrl,
    setStopAfterTrack,
    setStoragePolicy,
    setTipsDontShowAgain,
    setVideoMode,
    setVideoQuality,
    setViewingPlaylist,
    setVisualControlsPinned,
    setVisualVideoFit,
    setVisualizerMode,
    setWebAudioUnlocked,
    sharedModalCloseButtonClass,
    sharedScene,
    sharedSceneCanPlay,
    shortcutDraft,
    shortcutLabel,
    shortcutSettingsError,
    shortcuts,
    showFavoriteLibraryCard,
    showImmersiveLyricsOverlay,
    showSecondaryColumn,
    showShortcutHints,
    showVisualLyricOverlay,
    showVisualStage,
    showWindowsHeaderWindowControls,
    showWindowsTitleStrip,
    skipEvents,
    skipReasonToast,
    sleepCustomMinutes,
    sleepDeadline,
    sleepFadeEnabled,
    sleepRemainingStr,
    sleepTimerControlsRef,
    sleepTimerValue,
    soundLedgerView,
    spotifyImportLogs,
    spotifyImportPlaylistName,
    spotifyImportProgress,
    spotifyImportUrl,
    stampManualLyricsDraftLine,
    stopAfterTrack,
    storageEstimate,
    storagePolicy,
    storageStats,
    switchVideoMode,
    systemStats,
    themeColor,
    tipsDontShowAgain,
    toReadableShortcut,
    toggleFavoriteTrack,
    toggleWindowMaximize,
    clearHomeArtist,
    isHomeTrackDownloaded,
    isHomeTrackInLibrary,
    playHomeTrack,
    topHeaderClass,
    trackControlAccent,
    trackControlGlow,
    trackHasSavedLyrics,
    trackProgressAccent,
    trackProgressGlow,
    unpublishAetherProfile,
    updateActionLabel,
    updateInfo,
    updateManualLyricsDraftLine,
    updateToast,
    vaultPulse,
    videoMode,
    videoQuality,
    viewingPlaylist,
    visualControlsPinned,
    visualLyricOverlayBottomClass,
    visualStageFooterVisible,
    visualStageHeaderVisible,
    visualStageLyric,
    visualStageNextLyric,
    visualStageTitle,
    visualStageTitleMarquee,
    visualVideoFit,
    visualizerCanvasRef,
    visualizerMode,
    volume,
    volumeToast,
    webAudioUnlocked,
    workspaceModeLabel,
    youtubeAuthRequiredRef,
    youtubePlayerRef,
    ytDlpDetailLine,
    ytDlpStatusLabel,
    ytDlpStatusTone
  });
}
