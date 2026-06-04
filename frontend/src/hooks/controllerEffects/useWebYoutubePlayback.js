import { useEffect } from 'react';

export function useWebYoutubePlayback(props) {
  const {
    advanceQueueRef, currentTimeRef, currentTrack, currentTrackRef, extractYouTubeId, isPlayingRef, isStandalone, loadYouTubeIframeApi,
    setCurrentTime, setDiagnostics, setIsAudioBuffering, setIsPlaying, tryWebPlaybackFallback, volumeRef, webAudioUnlockedRef,
    webTrackLoadKeyRef, youtubePlayerRef, youtubeProgressTimerRef,
  } = props;

  useEffect(() => {
  if (isStandalone) return undefined;
  const player = youtubePlayerRef.current;
  if (!currentTrack?.title) {
    webTrackLoadKeyRef.current = '';
    clearInterval(youtubeProgressTimerRef.current);
    youtubeProgressTimerRef.current = null;
    if (player?.stopVideo) {
      try {
        player.stopVideo();
      } catch {}
    }
    setCurrentTime(0);
    return;
  }
  const streamStart = performance.now();
  const trackUrl = currentTrack.actualUrl || currentTrack.url;
  const youtubeId = currentTrack.youtubeId || extractYouTubeId(trackUrl || currentTrack.id || currentTrack.thumbnail || '');
  if (!youtubeId) {
    console.warn("[Aether/Audio] Web playback skipped: no YouTube id", {
      title: currentTrack.title,
      author: currentTrack.author,
      id: currentTrack.id
    });
    return;
  }
  const trackLoadKey = `${youtubeId}|${currentTrack.queueNonce || currentTrack.id || ''}`;
  console.log("[Aether/Audio] Web YouTube player init", {
    title: currentTrack.title,
    author: currentTrack.author,
    youtubeId,
    isPlaying: isPlayingRef.current,
    volume: volumeRef.current
  });
  let cancelled = false;
  let webEndSettled = false;
  let webNearEndSince = 0;
  let webLastProgressMs = 0;
  let webLastProgressAt = Date.now();
  const bufferingFallbackTimers = [];
  const ensureHost = () => {
    let host = document.getElementById('aether-youtube-player-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'aether-youtube-player-host';
      host.style.position = 'fixed';
      host.style.left = '12px';
      host.style.bottom = '12px';
      host.style.width = '240px';
      host.style.height = '135px';
      host.style.opacity = '0.02';
      host.style.pointerEvents = 'none';
      host.style.zIndex = '1';
      host.setAttribute('aria-hidden', 'true');
      document.body.appendChild(host);
    }
    return host;
  };
  const clearWebBufferingIfAudible = (ytPlayer = youtubePlayerRef.current) => {
    if (!ytPlayer) return false;
    try {
      const state = ytPlayer.getPlayerState?.();
      const position = Number(ytPlayer.getCurrentTime?.() || 0);
      if (state === 1 || isPlayingRef.current && position > 0) {
        setIsAudioBuffering(false);
        return true;
      }
    } catch {}
    return false;
  };
  const scheduleBufferingFallback = ytPlayer => {
    [350, 900, 1600].forEach(delay => {
      const timer = window.setTimeout(() => {
        if (!cancelled) clearWebBufferingIfAudible(ytPlayer);
      }, delay);
      bufferingFallbackTimers.push(timer);
    });
  };
  const startProgressTimer = () => {
    clearInterval(youtubeProgressTimerRef.current);
    youtubeProgressTimerRef.current = window.setInterval(() => {
      const ytPlayer = youtubePlayerRef.current;
      if (!ytPlayer?.getCurrentTime) return;
      try {
        const nextMs = Math.max(0, Math.floor(ytPlayer.getCurrentTime() * 1000));
        const durationSec = Number(ytPlayer.getDuration?.() || 0);
        const durationMs = Number.isFinite(durationSec) && durationSec > 0 ? Math.round(durationSec * 1000) : Number(currentTrackRef.current?.totalDurationMs || currentTrackRef.current?.duration || currentTrack?.totalDurationMs || currentTrack?.duration || 0);
        const state = ytPlayer.getPlayerState?.();
        setCurrentTime(nextMs);
        if (nextMs > 0) clearWebBufferingIfAudible(ytPlayer);
        if (nextMs > webLastProgressMs + 120) {
          webLastProgressMs = nextMs;
          webLastProgressAt = Date.now();
        }
        if (!webEndSettled && durationMs > 0) {
          const remainingMs = Math.max(0, durationMs - nextMs);
          const nearEndWindowMs = Math.max(900, Math.min(1800, durationMs * 0.03));
          if (remainingMs <= nearEndWindowMs && nextMs > 0) {
            webNearEndSince ||= Date.now();
          } else {
            webNearEndSince = 0;
          }
          const nearEndLongEnough = webNearEndSince > 0 && Date.now() - webNearEndSince > 1600;
          const stalledNearEnd = isPlayingRef.current && state === 1 && remainingMs <= nearEndWindowMs && Date.now() - webLastProgressAt > 1400;
          if (state === 0 || remainingMs <= 180 || nearEndLongEnough || stalledNearEnd) {
            console.warn('[Aether/Audio] Web near-end watchdog advancing queue', {
              title: currentTrackRef.current?.title || currentTrack?.title,
              nextMs,
              durationMs,
              remainingMs,
              nearEndLongEnough,
              stalledNearEnd
            });
            skipCurrentWebTrack();
          }
        }
      } catch {}
    }, 500);
  };
  const stopProgressTimer = () => {
    clearInterval(youtubeProgressTimerRef.current);
    youtubeProgressTimerRef.current = null;
  };
  const isWebPlayerNearEnd = ytPlayer => {
    try {
      const positionMs = Math.max(0, Math.floor(Number(ytPlayer?.getCurrentTime?.() || 0) * 1000));
      const durationSec = Number(ytPlayer?.getDuration?.() || 0);
      const durationMs = Number.isFinite(durationSec) && durationSec > 0 ? Math.round(durationSec * 1000) : Number(currentTrackRef.current?.totalDurationMs || currentTrackRef.current?.duration || currentTrack?.totalDurationMs || currentTrack?.duration || 0);
      return durationMs > 0 && positionMs > 0 && durationMs - positionMs <= Math.max(900, Math.min(1800, durationMs * 0.03));
    } catch {
      return false;
    }
  };
  function skipCurrentWebTrack() {
    if (webEndSettled) return;
    webEndSettled = true;
    const liveTrack = currentTrackRef.current || currentTrack;
    const skipTrackId = liveTrack?.id || liveTrack?.youtubeId || liveTrack?.actualUrl || liveTrack?.url || '';
    console.log("[Aether/Audio] Web ended", {
      title: liveTrack?.title,
      skipTrackId
    });
    advanceQueueRef.current?.('natural_end');
  }
  const resetWebEndGuard = () => {
    webEndSettled = false;
    webNearEndSince = 0;
    webLastProgressMs = 0;
    webLastProgressAt = Date.now();
  };
  loadYouTubeIframeApi().then(YT => {
    if (cancelled) return;
    ensureHost();
    const existing = youtubePlayerRef.current;
    if (existing?.loadVideoById && webTrackLoadKeyRef.current !== trackLoadKey) {
      webTrackLoadKeyRef.current = trackLoadKey;
      resetWebEndGuard();
      setIsAudioBuffering(true);
      existing.loadVideoById({
        videoId: youtubeId,
        startSeconds: Math.max(0, Math.floor(currentTimeRef.current / 1000))
      });
      existing.setVolume?.(Math.round(volumeRef.current * 100));
      if (webAudioUnlockedRef.current && isPlayingRef.current) {
        existing.playVideo?.();
        startProgressTimer();
        scheduleBufferingFallback(existing);
      } else {
        existing.pauseVideo?.();
        setIsAudioBuffering(false);
      }
      return;
    }
    if (existing) return;
    webTrackLoadKeyRef.current = trackLoadKey;
    resetWebEndGuard();
    setIsAudioBuffering(true);
    youtubePlayerRef.current = new YT.Player('aether-youtube-player-host', {
      width: '240',
      height: '135',
      videoId: youtubeId,
      playerVars: {
        autoplay: webAudioUnlockedRef.current && isPlayingRef.current ? 1 : 0,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        modestbranding: 1,
        origin: window.location.origin,
        playsinline: 1,
        rel: 0,
        widget_referrer: window.location.href
      },
      events: {
        onReady: event => {
          if (cancelled) return;
          event.target.setVolume(Math.round(volumeRef.current * 100));
          setIsAudioBuffering(false);
          setDiagnostics(prev => ({
            ...prev,
            lastSongFetchMs: Math.round(performance.now() - streamStart),
            lastSongFetchAt: Date.now(),
            lastSongSource: 'youtube-iframe'
          }));
          if (webAudioUnlockedRef.current && isPlayingRef.current) {
            event.target.playVideo();
            startProgressTimer();
            scheduleBufferingFallback(event.target);
          }
        },
        onStateChange: event => {
          if (cancelled) return;
          if (event.data === YT.PlayerState.PLAYING) {
            setIsAudioBuffering(false);
            startProgressTimer();
          } else if (event.data === YT.PlayerState.BUFFERING) {
            if (!clearWebBufferingIfAudible(event.target)) setIsAudioBuffering(true);
            startProgressTimer();
          } else if (event.data === YT.PlayerState.CUED) {
            if (webAudioUnlockedRef.current && isPlayingRef.current) event.target.playVideo?.();
          } else if (event.data === YT.PlayerState.PAUSED) {
            if (isPlayingRef.current && isWebPlayerNearEnd(event.target)) {
              skipCurrentWebTrack();
              return;
            }
            stopProgressTimer();
          } else if (event.data === YT.PlayerState.ENDED) {
            stopProgressTimer();
            skipCurrentWebTrack();
          }
        },
        onError: async event => {
          const errorCode = Number(event?.data);
          const liveTrack = currentTrackRef.current || currentTrack;
          const liveTrackUrl = liveTrack?.actualUrl || liveTrack?.url || '';
          const liveYoutubeId = liveTrack?.youtubeId || extractYouTubeId(liveTrackUrl || liveTrack?.id || liveTrack?.thumbnail || '') || youtubeId;
          console.error('[Aether/Audio] YouTube player error', {
            code: errorCode,
            title: liveTrack?.title,
            youtubeId: liveYoutubeId
          });
          const recovered = await tryWebPlaybackFallback({
            code: errorCode,
            youtubeId: liveYoutubeId,
            track: liveTrack
          });
          if (!recovered) {
            setIsAudioBuffering(false);
            setIsPlaying(false);
          }
        }
      }
    });
  }).catch(error => {
    console.error('[Aether/Audio] YouTube iframe player unavailable', error);
    setIsAudioBuffering(false);
  });
  return () => {
    cancelled = true;
    bufferingFallbackTimers.forEach(timer => window.clearTimeout(timer));
  };
}, [isStandalone, currentTrack?.title, currentTrack?.actualUrl, currentTrack?.url, currentTrack?.youtubeId, currentTrack?.id, currentTrack?.queueNonce, setCurrentTime, tryWebPlaybackFallback]);
}
