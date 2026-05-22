/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useAetherHandleControl(props) {
  const {
    advanceQueueRef, currentTimeRef, getTrackActionKey, history, isStandalone, localAudioRef, manualTransportAdvanceRef, pendingResumeTimeRef, queue, requestDestructiveConfirmation, seekActivePlaybackTo, setCurrentTime, setHistory, setIsAudioBuffering, setIsManualStop, setIsPlaying, setPendingResumeTime, setQueue, setVolume, setWebAudioUnlocked, videoModeRef, webTrackLoadKeyRef, youtubePlayerRef
  } = props;
  return useCallback(async (action, value) => {
  console.log("[Aether/Control] Signal Bridge Active:", action, value);
  if (action === 'clear' || action === 'stop') {
    const confirmed = await requestDestructiveConfirmation({
      title: action === 'stop' ? 'Stop and clear queue?' : 'Clear queue?',
      message: 'Aether will stop playback and remove every track from the queue.',
      detail: 'Your vaults, favorites, downloads, and listening history are not changed.',
      confirmLabel: action === 'stop' ? 'Stop Playback' : 'Clear Queue',
      allowDontAskAgain: true,
      preferenceKey: action === 'stop' ? 'queue.stopClear' : 'queue.clear'
    });
    if (!confirmed) return;
  }
  if (isStandalone) {
    if (action === 'pause') setIsPlaying(false);
    if (action === 'resume') setIsPlaying(true);
    if (action === 'toggle') setIsPlaying(prev => !prev);
    if (action === 'seek' && typeof value === 'number') {
      seekActivePlaybackTo(value);
    }
    if (action === 'mute') {
      setVolume(prev => {
        const nextV = prev > 0 ? 0 : 0.5;
        if (localAudioRef.current) localAudioRef.current.volume = nextV;
        return nextV;
      });
      return;
    }

    // PREVIOUS TRACK: If > 3s into current, restart. Otherwise go to previous track.
    if (action === 'previous') {
      if ((currentTimeRef.current || 0) > 3000) {
        // Restart current track
        console.log("[Aether/Control] Restarting current track (> 3s in)");
        seekActivePlaybackTo(0);
      } else if (history.length > 0) {
        // Go to actual previous track
        const prev = history[0];
        console.log("[Aether/Control] Restoring previous track:", prev?.title);
        manualTransportAdvanceRef.current = {
          trackKey: getTrackActionKey(queue?.[0]),
          at: Date.now(),
          action: 'previous'
        };
        setHistory(h => h.slice(1));
        setQueue(q => {
          const normalized = Array.isArray(q) ? q.filter(item => item && typeof item === 'object') : [];
          const prevKey = getTrackActionKey(prev);
          if (!prevKey) return normalized;
          const currentHeadKey = getTrackActionKey(normalized[0]);
          if (currentHeadKey && currentHeadKey === prevKey) {
            return normalized;
          }
          const deduped = normalized.filter(item => getTrackActionKey(item) !== prevKey);
          return [prev, ...deduped];
        });
        pendingResumeTimeRef.current = null;
        setPendingResumeTime(null);
        currentTimeRef.current = 0;
        setCurrentTime(0);
        setIsPlaying(true);
      } else {
        // No history, just restart current
        console.log("[Aether/Control] No history, restarting current");
        seekActivePlaybackTo(0);
      }
    }

    // SKIP: Remove current track and play next
    if (action === 'skip') {
      console.log("[Aether/Control] Skip triggered");
      manualTransportAdvanceRef.current = {
        trackKey: getTrackActionKey(queue?.[0]),
        at: Date.now(),
        action: 'skip'
      };
      advanceQueueRef.current('manual_skip');
    }

    // CLEAR/STOP: Empty queue and stop playback
    if (action === 'clear' || action === 'stop') {
      console.log("[Aether/Control] Queue cleared");
      setQueue([]);
      setHistory([]);
      setIsPlaying(false);
      pendingResumeTimeRef.current = null;
      setPendingResumeTime(null);
      currentTimeRef.current = 0;
      setCurrentTime(0);
      setIsManualStop(true);
      if (localAudioRef.current) {
        localAudioRef.current.currentTime = 0;
        localAudioRef.current.pause();
      }
    }
    return;
  }
  if (action === 'pause') {
    setIsPlaying(false);
    try {
      youtubePlayerRef.current?.pauseVideo?.();
    } catch {}
    if (localAudioRef.current) localAudioRef.current.pause();
    return;
  }
  if (action === 'resume') {
    setWebAudioUnlocked(true);
    setIsManualStop(false);
    setIsPlaying(true);
    try {
      youtubePlayerRef.current?.playVideo?.();
    } catch {}
    if (localAudioRef.current && !videoModeRef.current) localAudioRef.current.play().catch(() => {});
    return;
  }
  if (action === 'toggle') {
    setWebAudioUnlocked(true);
    setIsPlaying(prev => !prev);
    return;
  }
  if (action === 'mute') {
    setVolume(prev => {
      const nextV = prev > 0 ? 0 : 0.5;
      if (localAudioRef.current) localAudioRef.current.volume = nextV;
      try {
        if (nextV === 0) youtubePlayerRef.current?.mute?.();else {
          youtubePlayerRef.current?.unMute?.();
          youtubePlayerRef.current?.setVolume?.(Math.round(nextV * 100));
        }
      } catch {}
      return nextV;
    });
    return;
  }
  if (action === 'previous') {
    if ((currentTimeRef.current || 0) > 3000) {
      seekActivePlaybackTo(0);
    } else if (history.length > 0) {
      const prev = history[0];
      manualTransportAdvanceRef.current = {
        trackKey: getTrackActionKey(queue?.[0]),
        at: Date.now(),
        action: 'previous'
      };
      setHistory(h => h.slice(1));
      setQueue(q => {
        const normalized = Array.isArray(q) ? q.filter(item => item && typeof item === 'object') : [];
        const prevKey = getTrackActionKey(prev);
        if (!prevKey) return normalized;
        const currentHeadKey = getTrackActionKey(normalized[0]);
        if (currentHeadKey && currentHeadKey === prevKey) return normalized;
        return [prev, ...normalized.filter(item => getTrackActionKey(item) !== prevKey)];
      });
      pendingResumeTimeRef.current = null;
      setPendingResumeTime(null);
      currentTimeRef.current = 0;
      setCurrentTime(0);
      setWebAudioUnlocked(true);
      setIsManualStop(false);
      setIsPlaying(true);
    } else {
      seekActivePlaybackTo(0);
    }
    return;
  }
  if (action === 'skip') {
    manualTransportAdvanceRef.current = {
      trackKey: getTrackActionKey(queue?.[0]),
      at: Date.now(),
      action: 'skip'
    };
    advanceQueueRef.current('manual_skip');
    return;
  }
  if (action === 'shuffle') {
    setQueue(q => {
      if (!Array.isArray(q) || q.length <= 1) return q;
      const current = q[0];
      const rest = [...q.slice(1)].sort(() => Math.random() - 0.5);
      return [current, ...rest];
    });
    return;
  }
  if (action === 'clear' || action === 'stop') {
    setQueue([]);
    setHistory([]);
    webTrackLoadKeyRef.current = '';
    setIsPlaying(false);
    setIsAudioBuffering(false);
    pendingResumeTimeRef.current = null;
    setPendingResumeTime(null);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    setIsManualStop(true);
    try {
      youtubePlayerRef.current?.stopVideo?.();
    } catch {}
    if (localAudioRef.current) {
      localAudioRef.current.pause();
      localAudioRef.current.removeAttribute('src');
      localAudioRef.current.load();
    }
  }
}, [isStandalone, history, queue, getTrackActionKey, seekActivePlaybackTo, requestDestructiveConfirmation]);
}
