import { useEffect } from 'react';

export function useStandalonePlaybackLoop(props) {
  const {
    API_BASE, Audio, advanceQueueRef, bufferingRescueRef, currentTimeRef, downloadedTracks, encodeURIComponent, flashLastAdded,
    isOfflineMode, isPlayingRef, isStandalone, liveStreamStartOffsetMsRef, localAudioRef, pendingResumeTimeRef, playbackResetNonce, prematureEndGuardRef,
    queue, resolveWarmupTrackId, setCurrentTime, setCurrentTrackTitle, setDiagnostics, setIsAudioBuffering, setIsPlaying, setLastAdded,
    setOauthPrompt, setPendingResumeTime, setQueue, standaloneTrackLoadKeyRef, streamFailureRef, streamPort, videoModeRef,
    volume, warmingTrackIds, warmupTrack, youtubeAuthRequiredRef,
  } = props;

  // --- AETHER: STANDALONE PLAYBACK LOOP (NOVA ---
useEffect(() => {
  console.log("[Aether/Audio] Queue effect fired", {
    queueLength: queue?.length,
    currentTrack: queue?.[0]?.title,
    isPlaying: isPlayingRef.current,
    isStandalone
  });
  if (!isStandalone) {
    return undefined;
  }
  if (!queue || queue.length === 0) {
    if (localAudioRef.current) {
      localAudioRef.current.pause();
      localAudioRef.current.removeAttribute('src');
      localAudioRef.current.load();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    return;
  }
  const track = queue[0];
  if (!track || typeof track !== 'object') {
    setQueue(prev => Array.isArray(prev) ? prev.filter(item => item && typeof item === 'object') : []);
    return;
  }
  const loadStartTime = Date.now();
  const trackUrl = track.actualUrl || track.url;
  const baseTrackLoadKey = track.queueNonce || track.id || track.youtubeId || `${track.title || ''}|${track.author || ''}|${trackUrl || ''}`;
  const resolvedHeadId = resolveWarmupTrackId(track);
  const isHeadDownloaded = downloadedTracks.includes(track.id) || downloadedTracks.includes(String(resolvedHeadId));
  const trackLoadKey = `${baseTrackLoadKey}|p:${streamPort}|r:${playbackResetNonce}`;
  const resumeMs = Math.max(0, Math.floor(Number(pendingResumeTimeRef.current || 0)));
  const startSec = resumeMs > 0 ? resumeMs / 1000 : 0;
  console.log("[Aether/Audio] Queue head details", {
    id: track.id,
    title: track.title,
    author: track.author,
    youtubeId: track.youtubeId,
    actualUrl: track.actualUrl,
    url: track.url,
    trackUrl,
    isPlaying: isPlayingRef.current,
    downloaded: isHeadDownloaded
  });
  if (isOfflineMode && !isHeadDownloaded) {
    console.warn('[Aether/Audio] Offline Mode skipped non-downloaded queue head', {
      id: track.id,
      title: track.title
    });
    setLastAdded('Offline Mode skipped a non-downloaded track');
    window.setTimeout(() => setLastAdded(null), 2200);
    setQueue(prev => Array.isArray(prev) ? prev.slice(1) : []);
    setIsAudioBuffering(false);
    return undefined;
  }

  // Pre-warm next queue tracks
  if (!isOfflineMode) queue.slice(0, 3).forEach(item => {
    if (!downloadedTracks.includes(item.id) && !warmingTrackIds.has(item.id)) {
      console.log(`[Aether] Warmup pre-download for queued track: ${item.title} (${item.id})`);
      warmupTrack(item);
    }
  });
  if (track && standaloneTrackLoadKeyRef.current !== trackLoadKey) {
    standaloneTrackLoadKeyRef.current = trackLoadKey;
    streamFailureRef.current = {
      trackKey: trackLoadKey,
      attempts: 0,
      lastErrorAt: 0
    };
    setCurrentTrackTitle(track.title);
    setIsAudioBuffering(!!isPlayingRef.current);
    if (!localAudioRef.current) {
      localAudioRef.current = new Audio();
      localAudioRef.current.volume = volume;
    }
    const isLocalDownloaded = isHeadDownloaded;
    let resumeApplied = false;
    const streamNonce = encodeURIComponent(String(track.queueNonce || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`));
    const resetQuery = `&_r=${playbackResetNonce}`;
    // Reconstruct YouTube URL if we have the ID (avoids expired direct URLs)
    const youtubeUrl = track.youtubeId ? `https://www.youtube.com/watch?v=${track.youtubeId}` : track.actualUrl || track.url;
    const streamBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
    let didOfflineFallback = false;
    let didSettleAudioEnd = false;
    let lastStateTimeUpdateAt = 0;
    let lastStateTimeMs = 0;
    let audioNearEndSince = 0;
    let lastObservedAudioMs = 0;
    let lastAudioProgressAt = Date.now();
    const commitAudioTime = (nextMs, force = false) => {
      currentTimeRef.current = nextMs;
      const now = Date.now();
      if (force || nextMs === 0 || Math.abs(nextMs - lastStateTimeMs) >= 900 || now - lastStateTimeUpdateAt >= 900) {
        lastStateTimeMs = nextMs;
        lastStateTimeUpdateAt = now;
        setCurrentTime(nextMs);
      }
    };
    const getResolvedAudioDurationMs = () => {
      const mediaDuration = Number(localAudioRef.current?.duration);
      const mediaDurationMs = Number.isFinite(mediaDuration) && mediaDuration > 0 ? Math.round(mediaDuration * 1000) : 0;
      const trackDurationMs = Number(track.totalDurationMs || track.duration || 0);
      return mediaDurationMs || (Number.isFinite(trackDurationMs) && trackDurationMs > 0 ? trackDurationMs : 0);
    };
    const settleAudioEnd = reason => {
      if (didSettleAudioEnd || videoModeRef.current) return;
      didSettleAudioEnd = true;
      const durationMs = getResolvedAudioDurationMs();
      if (durationMs > 0) {
        commitAudioTime(durationMs, true);
      }
      setIsAudioBuffering(false);
      console.log('[Aether/Audio] Settled audio end', {
        reason,
        title: track.title,
        durationMs
      });
      advanceQueueRef.current(reason);
    };
    const fallbackToOnlineStream = () => {
      if (isOfflineMode) return;
      if (!isPlayingRef.current || !isLocalDownloaded || didOfflineFallback) return;
      didOfflineFallback = true;
      const onlineUrl = `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}&_q=${streamNonce}${resetQuery}`;
      console.warn('[Aether/Audio] Offline source stalled, switching to live stream', {
        trackId: track.id,
        title: track.title,
        onlineUrl
      });
      localAudioRef.current.src = onlineUrl;
      if (!videoModeRef.current) localAudioRef.current.play().catch(() => {});
    };

    // Neural Flow Bridge (NOVA) - High-Fidelity Signal Acquisition
    localAudioRef.current.onloadstart = () => {
      console.log(`[Aether/Audio] loadstart at ${Date.now() - loadStartTime}ms`);
    };
    localAudioRef.current.oncanplay = () => {
      if (videoModeRef.current) return; // still in video mode — stay silent
      // Apply pending resume handoff only once to avoid seek oscillation loops.
      if (resumeMs > 0 && !resumeApplied) {
        resumeApplied = true;
        const resumeSec = resumeMs / 1000;

        // For offline/local files we seek client-side.
        // For streamed tracks we already pass t= in URL, so avoid duplicate seek here.
        if (isLocalDownloaded) {
          localAudioRef.current.currentTime = resumeSec;
        }
        commitAudioTime(Math.floor(resumeSec * 1000), true);
        pendingResumeTimeRef.current = null;
        setPendingResumeTime(null);
        setIsAudioBuffering(false);
        if (isPlayingRef.current) localAudioRef.current.play().catch(() => {});
        return;
      }
      setIsAudioBuffering(false);
    };
    localAudioRef.current.ontimeupdate = () => {
      if (videoModeRef.current) return;
      const nextMs = Math.max(0, liveStreamStartOffsetMsRef.current + Math.floor((localAudioRef.current?.currentTime || 0) * 1000));
      commitAudioTime(nextMs);
      if (nextMs > lastObservedAudioMs + 120) {
        lastObservedAudioMs = nextMs;
        lastAudioProgressAt = Date.now();
      }
      if (isPlayingRef.current && nextMs >= 0) {
        setIsAudioBuffering(false);
      }
    };
    localAudioRef.current.onplaying = () => {
      // In video mode the video element owns audio output — don't un-mute here
      if (videoModeRef.current) return;
      console.log(`[Aether/Audio] playing after ${Date.now() - loadStartTime}ms`);
      if (localAudioRef.current) localAudioRef.current.muted = false;
      setIsAudioBuffering(false);
      bufferingRescueRef.current = {
        trackKey: trackLoadKey,
        lastAttemptAt: 0,
        attempts: 0
      };
      streamFailureRef.current = {
        trackKey: trackLoadKey,
        attempts: 0,
        lastErrorAt: 0
      };
      setDiagnostics(prev => ({
        ...prev,
        lastSongFetchMs: Math.max(0, Date.now() - loadStartTime),
        lastSongFetchAt: Date.now(),
        lastSongSource: downloadedTracks.includes(track.id) ? 'offline-cache' : 'local-stream'
      }));
    };
    localAudioRef.current.onwaiting = () => {
      if (videoModeRef.current) return;
      // Do NOT mute here — muting causes an oscillation loop.
      // Browser naturally outputs silence while buffering.
      if (isPlayingRef.current) setIsAudioBuffering(true);
    };
    localAudioRef.current.onstalled = () => {
      if (videoModeRef.current) return;
      if (isPlayingRef.current) {
        setIsAudioBuffering(true);
        fallbackToOnlineStream();
      }
    };
    localAudioRef.current.onended = () => {
      // In video mode the video element owns queue advance — audio ended while muted, ignore
      if (videoModeRef.current) {
        console.log('[Aether/Audio] onended suppressed — video mode active');
        return;
      }
      const playedMs = Math.floor((localAudioRef.current?.currentTime || 0) * 1000);
      const durationMs = getResolvedAudioDurationMs();
      const completion = durationMs > 0 ? playedMs / durationMs : 1;
      if (completion > 0 && completion < 0.9 && !prematureEndGuardRef.current.retried) {
        if (isOfflineMode) {
          console.warn('[Aether/Audio] Offline source ended early; no live recovery in Offline Mode', {
            title: track.title
          });
          advanceQueueRef.current('offline_premature_end');
          return;
        }
        prematureEndGuardRef.current = {
          trackId: track.id,
          retried: true
        };
        const youtubeUrl = track.youtubeId ? `https://www.youtube.com/watch?v=${track.youtubeId}` : track.actualUrl || track.url;
        const streamBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
        const recoveryUrl = `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}&_r=${Date.now()}`;
        console.warn('[Aether/Audio] Premature end detected, attempting recovery', {
          title: track.title,
          playedMs,
          durationMs,
          recoveryUrl
        });
        setIsAudioBuffering(true);
        localAudioRef.current.src = recoveryUrl;
        if (!videoModeRef.current) localAudioRef.current.play().catch(e => {
          console.error('[Aether/Audio] Recovery failed', e);
          advanceQueueRef.current('premature_recover_failed');
        });
        return;
      }
      settleAudioEnd('natural_end');
    };
    localAudioRef.current.onerror = e => {
      if (videoModeRef.current) {
        console.log('[Aether/Audio] onerror suppressed — video mode active');
        return;
      }
      // HIGH-FIDELITY FAULT TOLERANCE: Do not skip on initial connection fault
      console.error("[Aether/Audio] Signal Disturbance Detected:", e, {
        src: localAudioRef.current?.src,
        networkState: localAudioRef.current?.networkState,
        readyState: localAudioRef.current?.readyState,
        currentTime: localAudioRef.current?.currentTime,
        paused: localAudioRef.current?.paused
      });
      const failure = streamFailureRef.current.trackKey === trackLoadKey ? {
        ...streamFailureRef.current
      } : {
        trackKey: trackLoadKey,
        attempts: 0,
        lastErrorAt: 0
      };
      failure.attempts += 1;
      failure.lastErrorAt = Date.now();
      streamFailureRef.current = failure;
      console.log("[Aether/Audio] Attempting signal recovery. Skip suppressed.");
      if (localAudioRef.current) localAudioRef.current.muted = true;
      if (isPlayingRef.current) {
        setIsAudioBuffering(true);
        if (isOfflineMode) {
          setIsAudioBuffering(false);
          advanceQueueRef.current('offline_audio_error');
          return;
        }
        if (!isLocalDownloaded && failure.attempts >= 2) {
          if (localAudioRef.current) {
            localAudioRef.current.pause();
            localAudioRef.current.muted = false;
          }
          setIsPlaying(false);
          setIsAudioBuffering(false);
          setDiagnostics(prev => ({
            ...prev,
            lastSongSource: 'local-stream-error',
            lastSongError: 'Audio stream failed',
            lastSongFetchAt: Date.now()
          }));
          if (youtubeAuthRequiredRef.current) {
            setOauthPrompt(prev => prev || {
              reason: 'YouTube rejected this stream. Upload a fresh cookies.txt file and try again.'
            });
            return;
          }
          flashLastAdded('Playback failed. Check cookies or try another result.', 3600, 'error');
          return;
        }
        fallbackToOnlineStream();
      }
    };

    // VIDEO MODE GUARD: If video is active, audio player MUST stay dead to prevent echo/waste
    if (videoModeRef.current) {
      console.log("[Aether/Audio] Suppression Active: Video mode driving session");
      if (localAudioRef.current) {
        localAudioRef.current.pause();
        localAudioRef.current.src = '';
      }
      return;
    }
    const offlineAudioId = resolvedHeadId || track.id;
    const streamUrl = isLocalDownloaded ? `${streamBase}/offline/${offlineAudioId}.m4a?_q=${streamNonce}${resetQuery}` : `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}&_q=${streamNonce}${resetQuery}${startSec > 0 ? `&t=${startSec}` : ''}`;
    prematureEndGuardRef.current = {
      trackId: track.id,
      retried: false
    };
    console.log("[Aether/Audio] Initializing Stream:", streamUrl, {
      isLocalDownloaded,
      startSec,
      trackId: track.id
    });
    liveStreamStartOffsetMsRef.current = isLocalDownloaded ? 0 : Math.floor(startSec * 1000);
    localAudioRef.current.crossOrigin = "anonymous";
    localAudioRef.current.src = streamUrl;

    // New tracks always start clean unless an explicit handoff/session resume asked otherwise.
    if (startSec > 0 && isLocalDownloaded) {
      localAudioRef.current.currentTime = startSec;
    } else {
      try {
        localAudioRef.current.currentTime = 0;
      } catch {}
      if (startSec === 0) {
        commitAudioTime(0, true);
      } else {
        commitAudioTime(Math.floor(startSec * 1000), true);
      }
    }
    const startupWatchdog = setTimeout(() => {
      const audio = localAudioRef.current;
      if (!audio || !isPlayingRef.current) return;
      const stuckAtStart = (audio.currentTime || 0) < 1 && audio.readyState < 2;
      if (stuckAtStart) {
        console.warn('[Aether/Audio] Startup watchdog triggered', {
          trackId: track.id,
          title: track.title,
          src: audio.src,
          readyState: audio.readyState,
          currentTime: audio.currentTime
        });
        fallbackToOnlineStream();
      }
    }, 12000);
    const nearEndWatchdog = window.setInterval(() => {
      const audio = localAudioRef.current;
      if (!audio || !isPlayingRef.current || videoModeRef.current || didSettleAudioEnd) return;
      const durationMs = getResolvedAudioDurationMs();
      if (!Number.isFinite(durationMs) || durationMs <= 0) return;
      const currentMs = Math.max(0, liveStreamStartOffsetMsRef.current + Math.floor((audio.currentTime || 0) * 1000));
      const remainingMs = durationMs - currentMs;
      const endWindowMs = Math.max(700, Math.min(1800, durationMs * 0.025));
      const oldEnough = Date.now() - loadStartTime > 1500;
      if (remainingMs <= endWindowMs && currentMs > 0) {
        audioNearEndSince ||= Date.now();
      } else {
        audioNearEndSince = 0;
      }
      const nearEndLongEnough = audioNearEndSince > 0 && Date.now() - audioNearEndSince > 1600;
      const stalledNearEnd = remainingMs <= endWindowMs && Date.now() - lastAudioProgressAt > 1400;
      const pausedNearEnd = isPlayingRef.current && audio.paused && remainingMs <= Math.max(700, endWindowMs);
      if (audio.ended || (oldEnough && currentMs > 0 && (remainingMs <= 180 || nearEndLongEnough || stalledNearEnd || pausedNearEnd))) {
        console.warn('[Aether/Audio] Near-end watchdog advancing queue', {
          title: track.title,
          currentMs,
          durationMs,
          remainingMs,
          nearEndLongEnough,
          stalledNearEnd,
          pausedNearEnd
        });
        settleAudioEnd('audio_near_end_watchdog');
      }
    }, 700);

    // Trigger background download if not already cached / warming
    if (!isOfflineMode && window.aether?.download && !downloadedTracks.includes(track.id) && !warmingTrackIds.has(track.id)) {
      console.log(`[Aether] Triggering background download for track ${track.id}`);
      warmupTrack(track);
    }
    if (isPlayingRef.current && !videoModeRef.current) {
      console.log("[Aether/Audio] Attempting play()", {
        src: localAudioRef.current?.src,
        readyState: localAudioRef.current?.readyState,
        networkState: localAudioRef.current?.networkState
      });
      if (!videoModeRef.current) localAudioRef.current.play().catch(e => {
        if (e?.name === 'AbortError') {
          console.warn('[Aether/Audio] play() interrupted by source refresh (non-fatal)');
          return;
        }
        console.error("[Aether/Audio] Autoplay Blocked or Failed:", e, {
          src: localAudioRef.current?.src,
          readyState: localAudioRef.current?.readyState,
          networkState: localAudioRef.current?.networkState,
          paused: localAudioRef.current?.paused
        });
        if (e?.name === 'NotSupportedError') {
          if (localAudioRef.current && !videoModeRef.current) localAudioRef.current.muted = false;
          setIsPlaying(false);
          setIsAudioBuffering(false);
          setDiagnostics(prev => ({
            ...prev,
            lastSongSource: 'local-stream-error',
            lastSongError: 'Unsupported or empty audio stream',
            lastSongFetchAt: Date.now()
          }));
          if (youtubeAuthRequiredRef.current) {
            setOauthPrompt(prev => prev || {
              reason: 'YouTube rejected this stream. Upload a fresh cookies.txt file and try again.'
            });
            return;
          }
          flashLastAdded('Playback failed. Check cookies or try another result.', 3600, 'error');
          return;
        }
        setIsAudioBuffering(true);
      });
    } else {
      setIsAudioBuffering(false);
    }
    const clearWatchdog = () => {
      clearTimeout(startupWatchdog);
      window.clearInterval(nearEndWatchdog);
    };

    // Return cleanup function to clear state before next effect run
    return () => {
      clearWatchdog();
      if (localAudioRef.current) {
        localAudioRef.current.oncanplay = null;
        localAudioRef.current.onplaying = null;
        localAudioRef.current.ontimeupdate = null;
        localAudioRef.current.onwaiting = null;
        localAudioRef.current.onstalled = null;
        localAudioRef.current.onended = null;
        localAudioRef.current.onerror = null;
        localAudioRef.current.onloadstart = null;
      }
    };
  }
}, [queue?.[0]?.title, queue?.[0]?.id, queue?.[0]?.youtubeId, queue?.[0]?.queueNonce, queue?.[0]?.actualUrl, queue?.[0]?.url, isStandalone, streamPort, playbackResetNonce, flashLastAdded]);
}
