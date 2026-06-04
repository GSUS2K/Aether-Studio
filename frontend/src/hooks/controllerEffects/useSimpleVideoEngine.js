import { useEffect } from 'react';

export function useSimpleVideoEngine(props) {
  const {
    advanceQueueRef, currentTimeRef, encodeURIComponent, exitVideoMode, getTrackActionKey, isPlayingRef, isStandalone,
    localAudioRef, localVideoRef, playbackResetNonce, queue, setCurrentTime, setIsAudioBuffering, setIsVideoReady, streamPort,
    videoEndGuardRef, videoMode, videoModeRef, videoQuality,
  } = props;

  // ─── SIMPLE VIDEO ENGINE ─────────────────────────────────────────────────
// NOTE: isPlaying is intentionally NOT in the dep array.
// Play/Pause sync is handled by a separate effect below to avoid
// re-running src assignment and seek logic on every play/pause toggle.
useEffect(() => {
  const vid = localVideoRef.current;
  if (!queue?.[0] || !isStandalone || !videoMode) {
    videoEndGuardRef.current = {
      trackKey: '',
      settled: false,
      lastNearEndAt: 0,
      lastObservedMs: 0,
      lastProgressAt: 0
    };
    if (vid) {
      vid.oncanplay = null;
      vid.onwaiting = null;
      vid.onplaying = null;
      vid.ontimeupdate = null;
      vid.onended = null;
      vid.onerror = null;
      vid.pause();
      vid.src = '';
    }
    // Do NOT call setIsAudioBuffering here — the audio engine owns that state
    // and will race against us if we touch it during its own re-init.
    if (localAudioRef.current) localAudioRef.current.muted = false;
    return;
  }
  const track = queue[0];
  const trackActionKey = getTrackActionKey(track);

  // Build YouTube URL - use youtubeId if available, otherwise fall back to URL
  let youtubeUrl = track?.youtubeId ? `https://www.youtube.com/watch?v=${track.youtubeId}` : track?.actualUrl || track?.url || '';

  // If we don't yet have a resolvable URL, allow the resolver effect to run first.
  // Only fall back after a resolve attempt has already been made.
  if (!youtubeUrl) {
    if (!track?.videoResolveAttempted) {
      console.log('[Aether/Video] Waiting for YouTube ID resolution before fallback', {
        title: track?.title,
        author: track?.author
      });
      setIsAudioBuffering(true);
      return;
    }
    console.warn('[Aether/Video] No video source after resolution attempt; falling back to audio', {
      title: track?.title,
      author: track?.author
    });
    if (videoModeRef.current) exitVideoMode({
      reason: 'no_video_source_after_resolve'
    });
    return;
  }
  const streamBase = `http://localhost:${streamPort}`;
  const targetSrc = `${streamBase}/videostream?url=${encodeURIComponent(youtubeUrl)}&quality=${videoQuality}&_r=${playbackResetNonce}`;
  let videoRetryCount = 0;

  // Mute / pause the audio element — video owns output now
  if (localAudioRef.current) {
    localAudioRef.current.muted = true;
    localAudioRef.current.pause();
  }

  // Only reload src if actually changed (don't disrupt a playing video on re-render)
  if (vid && vid.src !== targetSrc) {
    vid.src = targetSrc;
    setIsAudioBuffering(true);
  }
  videoEndGuardRef.current = {
    trackKey: trackActionKey,
    settled: false,
    lastNearEndAt: 0,
    lastObservedMs: 0,
    lastProgressAt: Date.now()
  };
  const getResolvedVideoDurationMs = () => Number.isFinite(Number(vid?.duration)) && Number(vid?.duration) > 0 ? Math.round(Number(vid.duration) * 1000) : Number(track.totalDurationMs || track.duration || 0);
  let lastVideoStateUpdateAt = 0;
  let lastVideoStateMs = 0;
  const commitVideoTime = (nextMs, force = false) => {
    currentTimeRef.current = nextMs;
    const now = Date.now();
    if (force || nextMs === 0 || Math.abs(nextMs - lastVideoStateMs) >= 900 || now - lastVideoStateUpdateAt >= 900) {
      lastVideoStateMs = nextMs;
      lastVideoStateUpdateAt = now;
      setCurrentTime(nextMs);
    }
  };
  const settleVideoNaturalEnd = () => {
    const guard = videoEndGuardRef.current;
    if (!guard || guard.trackKey !== trackActionKey || guard.settled) return;
    guard.settled = true;
    const resolvedDurationMs = getResolvedVideoDurationMs();
    if (Number.isFinite(resolvedDurationMs) && resolvedDurationMs > 0) {
      commitVideoTime(Math.max(currentTimeRef.current || 0, resolvedDurationMs), true);
    }
    advanceQueueRef.current('natural_end');
  };

  // Handlers — re-attach every time track/mode changes, not on play/pause
  vid.oncanplay = () => {
    // Sync video position to where audio was (one-time on initial load only)
    const targetSec = Math.floor(currentTimeRef.current / 1000);
    if (vid.currentTime === 0 && targetSec > 2) vid.currentTime = targetSec;
    if (isPlayingRef.current) vid.play().catch(() => {});
    setIsAudioBuffering(false);
    setIsVideoReady(true);
  };
  vid.onwaiting = () => setIsAudioBuffering(true);
  vid.onplaying = () => setIsAudioBuffering(false);
  vid.ontimeupdate = () => {
    const currentMs = Math.max(0, Math.floor((vid.currentTime || 0) * 1000));
    const guard = videoEndGuardRef.current;
    if (guard?.trackKey === trackActionKey) {
      if (currentMs > guard.lastObservedMs + 120) {
        guard.lastObservedMs = currentMs;
        guard.lastProgressAt = Date.now();
      }
      const durationMs = getResolvedVideoDurationMs();
      const nearEndThresholdMs = durationMs > 0 ? Math.max(450, Math.min(1500, durationMs * 0.02)) : 0;
      const remainingMs = durationMs > 0 ? Math.max(0, durationMs - currentMs) : Infinity;
      if (durationMs > 0 && remainingMs <= nearEndThresholdMs) {
        guard.lastNearEndAt ||= Date.now();
      } else {
        guard.lastNearEndAt = 0;
      }
    }
    if (currentMs > 0) commitVideoTime(currentMs);
  };
  vid.onended = () => settleVideoNaturalEnd();
  vid.onerror = () => {
    if (videoRetryCount < 1) {
      videoRetryCount += 1;
      const retrySrc = `${targetSrc}&vr=${Date.now()}`;
      console.warn('[Aether/Video] Video playback error, retrying source before fallback', {
        title: track?.title,
        url: youtubeUrl,
        retry: videoRetryCount
      });
      try {
        vid.src = retrySrc;
        setIsAudioBuffering(true);
        return;
      } catch (err) {
        console.warn('[Aether/Video] Retry source assignment failed', err);
      }
    }
    console.warn('[Aether/Video] Video playback error after retry, falling back to audio mode', {
      title: track?.title,
      url: youtubeUrl
    });
    setIsAudioBuffering(false);
    exitVideoMode({
      reason: 'video_element_error'
    });
  };
  const nearEndWatchdog = window.setInterval(() => {
    const guard = videoEndGuardRef.current;
    if (!vid || !guard || guard.trackKey !== trackActionKey || guard.settled) return;
    const durationMs = getResolvedVideoDurationMs();
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    const currentMs = Math.max(0, Math.floor((vid.currentTime || 0) * 1000));
    const nearEndThresholdMs = Math.max(900, Math.min(1800, durationMs * 0.03));
    const remainingMs = Math.max(0, durationMs - currentMs);
    const nearEndLongEnough = guard.lastNearEndAt > 0 && Date.now() - guard.lastNearEndAt > 1500;
    const stalledNearEnd = isPlayingRef.current && !vid.paused && remainingMs <= nearEndThresholdMs && Date.now() - guard.lastProgressAt > 1200;
    if (vid.ended || remainingMs <= 180 || nearEndLongEnough || stalledNearEnd) {
      console.warn('[Aether/Video] Near-end watchdog advancing queue', {
        title: track?.title,
        currentMs,
        durationMs,
        remainingMs,
        nearEndLongEnough,
        stalledNearEnd
      });
      settleVideoNaturalEnd();
    }
  }, 260);
  return () => {
    window.clearInterval(nearEndWatchdog);
    if (vid) {
      vid.oncanplay = null;
      vid.onwaiting = null;
      vid.onplaying = null;
      vid.ontimeupdate = null;
      vid.onended = null;
      vid.onerror = null;
    }
    videoEndGuardRef.current = {
      trackKey: '',
      settled: false,
      lastNearEndAt: 0,
      lastObservedMs: 0,
      lastProgressAt: 0
    };
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [queue?.[0]?.id, queue?.[0]?.queueNonce, queue?.[0]?.youtubeId, queue?.[0]?.videoResolveAttempted, queue?.[0]?.url, queue?.[0]?.actualUrl, videoMode, streamPort, playbackResetNonce, videoQuality]);

// Video play/pause sync — separate effect so it doesn't re-run src/seek logic
}
