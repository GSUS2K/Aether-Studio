import { useEffect } from 'react';

export function useStandaloneSessionBoot(props) {
  const {
    AURA_PRESETS, AUTOPLAY_MOOD_MODES, DEFAULT_SHORTCUTS, FAVORITES_STORAGE_KEY, GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, PERFORMANCE_MODES, PLAYLIST_ORDER_STORAGE_KEY, SESSION_PLAYBACK_STORAGE_KEY,
    SESSION_UI_STORAGE_KEY, SHORTCUTS_STORAGE_KEY, defaultGlobalMediaShortcutsEnabled, discordQueuePollIntervalRef, discordSdkRef, fetchQueue, fetchQueueRef, firstRunTipsTimerRef,
    isFinite, isMacPlatform, isStandalone, lastWindowModeChangeRef, localAudioRef, normalizeQueueTrack, pendingResumeTimeRef, playlistOrderHydratedRef,
    sanitizeShortcutMap, sessionReadyRef, setAuraPreset, setAuth, setAutoplayMoodMode, setCurrentTime, setDoodleIntensity, setDownloadedTracks,
    setFavoriteTracks, setGlobalMediaShortcutsEnabled, setHideFirstRunTips, setIsAutoplayEnabled, setIsDepthMotionEnabled, setIsDoodleMode, setIsFocusedMode, setIsGestureControlEnabled,
    setIsMaximized, setIsPlaying, setIsTipsOverlayOpen, setIsVerticalStack, setLoading, setMiniPlayerInfoMode, setOfflineDownloads, setPendingResumeTime,
    setPerformanceMode, setPlaylistOrder, setPlaylists, setQueue, setSessionRestoreNotice, setShortcutDraft, setShortcuts, setTipsDontShowAgain,
    setUpdateInfo, setVisualizerMode, setVoiceChannel, setVolume, setupDiscordSdk,
  } = props;

  useEffect(() => {
  let unsubscribeMaximized = null;
  let unsubscribeLibraryUpdate = null;
  if (isStandalone) {
    setAuth({
      guild_id: 'LOCAL',
      user: {
        id: 'Standalone',
        username: 'DESKTOP_USER'
      }
    });
    setLoading(false);
    setVoiceChannel('Local Speakers');

    // Load persisted state asynchronously
    const loadPersisted = async () => {
      let resolvedHideFirstRunTips = false;
      const savedUiPrefs = await window.aether?.store?.get(SESSION_UI_STORAGE_KEY);
      if (savedUiPrefs && typeof savedUiPrefs === 'object') {
        if (typeof savedUiPrefs.visualizerMode === 'string') setVisualizerMode(savedUiPrefs.visualizerMode);
        if (typeof savedUiPrefs.auraPreset === 'string' && AURA_PRESETS.some(preset => preset.id === savedUiPrefs.auraPreset)) {
          setAuraPreset(savedUiPrefs.auraPreset);
        }
        if (typeof savedUiPrefs.isVerticalStack === 'boolean') setIsVerticalStack(savedUiPrefs.isVerticalStack);
        if (typeof savedUiPrefs.isFocusedMode === 'boolean') setIsFocusedMode(savedUiPrefs.isFocusedMode);
        if (typeof savedUiPrefs.miniPlayerInfoMode === 'string' && ['artist', 'lyric'].includes(savedUiPrefs.miniPlayerInfoMode)) {
          setMiniPlayerInfoMode(savedUiPrefs.miniPlayerInfoMode);
        }
        if (typeof savedUiPrefs.isAutoplayEnabled === 'boolean') setIsAutoplayEnabled(savedUiPrefs.isAutoplayEnabled);
        if (typeof savedUiPrefs.autoplayMoodMode === 'string' && AUTOPLAY_MOOD_MODES.some(m => m.id === savedUiPrefs.autoplayMoodMode)) {
          setAutoplayMoodMode(savedUiPrefs.autoplayMoodMode);
        }
        if (typeof savedUiPrefs.isDoodleMode === 'boolean') setIsDoodleMode(savedUiPrefs.isDoodleMode);else if (typeof savedUiPrefs.isCatMode === 'boolean') setIsDoodleMode(savedUiPrefs.isCatMode);
        if (typeof savedUiPrefs.doodleIntensity === 'string' && ['subtle', 'medium', 'dreamy'].includes(savedUiPrefs.doodleIntensity)) {
          setDoodleIntensity(savedUiPrefs.doodleIntensity);
        }
        if (typeof savedUiPrefs.performanceMode === 'string' && PERFORMANCE_MODES.some(mode => mode.id === savedUiPrefs.performanceMode)) {
          setPerformanceMode(savedUiPrefs.performanceMode);
        }
        if (typeof savedUiPrefs.isDepthMotionEnabled === 'boolean') setIsDepthMotionEnabled(savedUiPrefs.isDepthMotionEnabled);
        if (typeof savedUiPrefs.isGestureControlEnabled === 'boolean') setIsGestureControlEnabled(savedUiPrefs.isGestureControlEnabled);
        if (typeof savedUiPrefs.hideFirstRunTips === 'boolean') {
          resolvedHideFirstRunTips = savedUiPrefs.hideFirstRunTips;
          setHideFirstRunTips(savedUiPrefs.hideFirstRunTips);
          setTipsDontShowAgain(savedUiPrefs.hideFirstRunTips);
        }
      }
      try {
        const savedShortcuts = await window.aether?.store?.get(SHORTCUTS_STORAGE_KEY);
        const normalized = sanitizeShortcutMap(savedShortcuts || DEFAULT_SHORTCUTS, isMacPlatform);
        setShortcuts(normalized);
        setShortcutDraft(normalized);
      } catch (e) {
        const normalized = sanitizeShortcutMap(DEFAULT_SHORTCUTS, isMacPlatform);
        setShortcuts(normalized);
        setShortcutDraft(normalized);
      }
      try {
        const savedGlobalEnabled = await window.aether?.store?.get(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY);
        const resolved = typeof savedGlobalEnabled === 'boolean' ? savedGlobalEnabled : defaultGlobalMediaShortcutsEnabled;
        setGlobalMediaShortcutsEnabled(resolved);
      } catch {
        setGlobalMediaShortcutsEnabled(defaultGlobalMediaShortcutsEnabled);
      }
      if (!resolvedHideFirstRunTips) {
        if (firstRunTipsTimerRef.current) window.clearTimeout(firstRunTipsTimerRef.current);
        firstRunTipsTimerRef.current = window.setTimeout(() => {
          firstRunTipsTimerRef.current = null;
          setIsTipsOverlayOpen(true);
        }, 700);
      }
      const savedPlaylists = await window.aether?.store?.get('playlists');
      if (savedPlaylists && typeof savedPlaylists === 'object' && !Array.isArray(savedPlaylists)) {
        const normalizedPlaylists = Object.fromEntries(Object.entries(savedPlaylists).map(([playlistName, tracks]) => {
          const normalizedTracks = (Array.isArray(tracks) ? tracks : []).map(track => normalizeQueueTrack(track)).filter(Boolean);
          return [playlistName, normalizedTracks];
        }));
        setPlaylists(normalizedPlaylists);
        window.aether?.store?.set('playlists', normalizedPlaylists);
        const savedOrder = await window.aether?.store?.get(PLAYLIST_ORDER_STORAGE_KEY);
        if (Array.isArray(savedOrder)) {
          setPlaylistOrder(savedOrder.filter(name => typeof name === 'string' && name.trim()));
        } else {
          setPlaylistOrder(Object.keys(normalizedPlaylists));
        }
      }
      const savedFavorites = await window.aether?.store?.get(FAVORITES_STORAGE_KEY);
      if (savedFavorites && typeof savedFavorites === 'object' && !Array.isArray(savedFavorites)) {
        const normalizedFavorites = Object.fromEntries(Object.entries(savedFavorites).map(([key, track]) => [key, normalizeQueueTrack(track)]).filter(([, track]) => Boolean(track)));
        setFavoriteTracks(normalizedFavorites);
        window.aether?.store?.set(FAVORITES_STORAGE_KEY, normalizedFavorites);
      }
      playlistOrderHydratedRef.current = true;
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
      if (window.aether?.getOfflineDownloads) {
        try {
          const details = await window.aether.getOfflineDownloads();
          if (details?.success && Array.isArray(details.downloads)) {
            setOfflineDownloads(details.downloads);
          }
        } catch {}
      }
      const savedPlayback = await window.aether?.store?.get(SESSION_PLAYBACK_STORAGE_KEY);
      if (savedPlayback && typeof savedPlayback === 'object') {
        let restoredQueueCount = 0;
        let restoredWasPlaying = false;
        if (Array.isArray(savedPlayback.queue) && savedPlayback.queue.length > 0) {
          const normalizedQueue = savedPlayback.queue.map(track => normalizeQueueTrack(track)).filter(Boolean);
          setQueue(normalizedQueue);
          restoredQueueCount = normalizedQueue.length;
          console.log(`[Aether/Session] Restored ${restoredQueueCount} tracks from session`);
        }
        if (typeof savedPlayback.isPlaying === 'boolean') {
          console.log(`[Aether/Session] Restored isPlaying: ${savedPlayback.isPlaying}`);
          restoredWasPlaying = savedPlayback.isPlaying;
          // Hardening: after cold restart, resume in a paused state to avoid rapid
          // play/buffer loops from stale stream/session state.
          setIsPlaying(false);
        }
        // Cold-launch resume position caused stale seeks and screechy recovery paths.
        // We restore the queue paused, but always start a fresh track session from 0.
        pendingResumeTimeRef.current = null;
        setPendingResumeTime(null);
        setCurrentTime(0);
        if (restoredQueueCount > 0) {
          setSessionRestoreNotice(restoredWasPlaying ? `Restored session paused • ${restoredQueueCount} track${restoredQueueCount > 1 ? 's' : ''}` : `Restored session • ${restoredQueueCount} track${restoredQueueCount > 1 ? 's' : ''}`);
          setTimeout(() => setSessionRestoreNotice(''), 3500);
        }
      }
      sessionReadyRef.current = true;
    };
    loadPersisted();
  } else {
    try {
      let resolvedHideFirstRunTips = false;
      const rawUiPrefs = localStorage.getItem(SESSION_UI_STORAGE_KEY);
      const savedUiPrefs = rawUiPrefs ? JSON.parse(rawUiPrefs) : null;
      if (savedUiPrefs && typeof savedUiPrefs === 'object') {
        if (typeof savedUiPrefs.visualizerMode === 'string') setVisualizerMode(savedUiPrefs.visualizerMode);
        if (typeof savedUiPrefs.auraPreset === 'string' && AURA_PRESETS.some(preset => preset.id === savedUiPrefs.auraPreset)) {
          setAuraPreset(savedUiPrefs.auraPreset);
        }
        if (typeof savedUiPrefs.isVerticalStack === 'boolean') setIsVerticalStack(savedUiPrefs.isVerticalStack);
        if (typeof savedUiPrefs.isFocusedMode === 'boolean') setIsFocusedMode(savedUiPrefs.isFocusedMode);
        if (typeof savedUiPrefs.miniPlayerInfoMode === 'string' && ['artist', 'lyric'].includes(savedUiPrefs.miniPlayerInfoMode)) {
          setMiniPlayerInfoMode(savedUiPrefs.miniPlayerInfoMode);
        }
        if (typeof savedUiPrefs.isAutoplayEnabled === 'boolean') setIsAutoplayEnabled(savedUiPrefs.isAutoplayEnabled);
        if (typeof savedUiPrefs.autoplayMoodMode === 'string' && AUTOPLAY_MOOD_MODES.some(m => m.id === savedUiPrefs.autoplayMoodMode)) {
          setAutoplayMoodMode(savedUiPrefs.autoplayMoodMode);
        }
        if (typeof savedUiPrefs.isDoodleMode === 'boolean') setIsDoodleMode(savedUiPrefs.isDoodleMode);else if (typeof savedUiPrefs.isCatMode === 'boolean') setIsDoodleMode(savedUiPrefs.isCatMode);
        if (typeof savedUiPrefs.doodleIntensity === 'string' && ['subtle', 'medium', 'dreamy'].includes(savedUiPrefs.doodleIntensity)) {
          setDoodleIntensity(savedUiPrefs.doodleIntensity);
        }
        if (typeof savedUiPrefs.performanceMode === 'string' && PERFORMANCE_MODES.some(mode => mode.id === savedUiPrefs.performanceMode)) {
          setPerformanceMode(savedUiPrefs.performanceMode);
        }
        if (typeof savedUiPrefs.isDepthMotionEnabled === 'boolean') setIsDepthMotionEnabled(savedUiPrefs.isDepthMotionEnabled);
        if (typeof savedUiPrefs.isGestureControlEnabled === 'boolean') setIsGestureControlEnabled(savedUiPrefs.isGestureControlEnabled);
        if (typeof savedUiPrefs.hideFirstRunTips === 'boolean') {
          resolvedHideFirstRunTips = savedUiPrefs.hideFirstRunTips;
          setHideFirstRunTips(savedUiPrefs.hideFirstRunTips);
          setTipsDontShowAgain(savedUiPrefs.hideFirstRunTips);
        }
      }
      if (!resolvedHideFirstRunTips) {
        if (firstRunTipsTimerRef.current) window.clearTimeout(firstRunTipsTimerRef.current);
        firstRunTipsTimerRef.current = window.setTimeout(() => {
          firstRunTipsTimerRef.current = null;
          setIsTipsOverlayOpen(true);
        }, 700);
      }
      const rawShortcuts = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
      const savedShortcuts = rawShortcuts ? JSON.parse(rawShortcuts) : null;
      const normalized = sanitizeShortcutMap(savedShortcuts || DEFAULT_SHORTCUTS, isMacPlatform);
      setShortcuts(normalized);
      setShortcutDraft(normalized);
      const rawGlobalEnabled = localStorage.getItem(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY);
      if (rawGlobalEnabled == null) {
        setGlobalMediaShortcutsEnabled(defaultGlobalMediaShortcutsEnabled);
      } else {
        setGlobalMediaShortcutsEnabled(Boolean(JSON.parse(rawGlobalEnabled)));
      }
      const rawFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const savedFavorites = rawFavorites ? JSON.parse(rawFavorites) : null;
      if (savedFavorites && typeof savedFavorites === 'object' && !Array.isArray(savedFavorites)) {
        const normalizedFavorites = Object.fromEntries(Object.entries(savedFavorites).map(([key, track]) => [key, normalizeQueueTrack(track)]).filter(([, track]) => Boolean(track)));
        setFavoriteTracks(normalizedFavorites);
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(normalizedFavorites));
      }
    } catch (e) {
      console.warn('[Aether/Session] Failed to load web UI prefs', e);
      const normalized = sanitizeShortcutMap(DEFAULT_SHORTCUTS, isMacPlatform);
      setShortcuts(normalized);
      setShortcutDraft(normalized);
      setGlobalMediaShortcutsEnabled(defaultGlobalMediaShortcutsEnabled);
    }
    sessionReadyRef.current = true;
    const initDiscord = async () => {
      try {
        const {
          sdk,
          auth: authData
        } = await setupDiscordSdk();
        discordSdkRef.current = sdk;
        if (sdk) {
          if (authData) setAuth(authData);else setAuth({
            guild_id: sdk.guildId,
            user: {
              id: 'Guest',
              username: 'GUEST'
            }
          });
          if (sdk.guildId) {
            fetchQueue(sdk.guildId);
            if (discordQueuePollIntervalRef.current) {
              console.warn('[Aether/Perf] Clearing stale Discord queue poll interval before creating another.');
              window.clearInterval(discordQueuePollIntervalRef.current);
            }
            discordQueuePollIntervalRef.current = window.setInterval(() => fetchQueueRef.current?.(sdk.guildId), 5000);
          }
        }
      } catch (err) {
        setAuth({
          guild_id: '0',
          user: {
            id: 'Offline',
            username: 'OFFLINE'
          }
        });
      } finally {
        setLoading(false);
      }
    };
    initDiscord();
  }

  // Maximized State Listener (NOVA - Fixed bridge + Height fail-safe
  if (window.aether?.onMaximized) {
    unsubscribeMaximized = window.aether.onMaximized(state => {
      lastWindowModeChangeRef.current = Date.now();
      setIsMaximized(!!state);
    });
    if (typeof unsubscribeMaximized !== 'function') {
      console.warn('[Aether/Perf] onMaximized did not provide an unsubscribe; IPC listener may accumulate.');
    }
  }

  // Library update listener for downloaded tracks
  if (window.aether?.onLibraryUpdate) {
    unsubscribeLibraryUpdate = window.aether.onLibraryUpdate(data => {
      console.log(`[Aether] Library update received:`, data);
      setDownloadedTracks(data);
      if (window.aether?.getOfflineDownloads) {
        window.aether.getOfflineDownloads().then(res => {
          if (res?.success && Array.isArray(res.downloads)) {
            setOfflineDownloads(res.downloads);
          }
        }).catch(() => {});
      }
    });
    if (typeof unsubscribeLibraryUpdate !== 'function') {
      console.warn('[Aether/Perf] onLibraryUpdate did not provide an unsubscribe; IPC listener may accumulate.');
    }
  }
  let unsubscribeUpdateStatus = null;
  if (window.aether?.getUpdateStatus) {
    window.aether.getUpdateStatus().then(state => {
      if (state && typeof state === 'object') {
        setUpdateInfo(prev => ({
          ...prev,
          ...state
        }));
      }
    }).catch(() => {});
  }
  if (window.aether?.onUpdateStatus) {
    unsubscribeUpdateStatus = window.aether.onUpdateStatus(state => {
      if (state && typeof state === 'object') {
        setUpdateInfo(prev => ({
          ...prev,
          ...state
        }));
      }
    });
  }
  let resizeRaf = 0;
  let lastTallState = null;
  const handleResize = () => {
    if (resizeRaf) return;
    resizeRaf = window.requestAnimationFrame(() => {
      resizeRaf = 0;
      const nextTallState = window.innerHeight > 820 ? true : window.innerHeight <= 800 ? false : lastTallState;
      if (typeof nextTallState === 'boolean' && nextTallState !== lastTallState) {
        lastTallState = nextTallState;
        setIsMaximized(nextTallState);
      }
    });
  };
  window.addEventListener('resize', handleResize);
  handleResize(); // Initial check

  return () => {
    if (discordQueuePollIntervalRef.current) {
      window.clearInterval(discordQueuePollIntervalRef.current);
      discordQueuePollIntervalRef.current = 0;
    }
    if (typeof unsubscribeMaximized === 'function') unsubscribeMaximized();
    if (typeof unsubscribeLibraryUpdate === 'function') unsubscribeLibraryUpdate();
    if (typeof unsubscribeUpdateStatus === 'function') unsubscribeUpdateStatus();
    window.removeEventListener('resize', handleResize);
    if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
  };
}, []);

// --- AETHER: STANDALONE PLAYBACK LOOP (NOVA ---
}
