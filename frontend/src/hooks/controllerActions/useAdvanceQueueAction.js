/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useAdvanceQueueAction(props) {
  const {
    appendRecentEvent, currentTimeRef, getTrackActionKey, isAutoplayEnabled, isPlaying, localAudioRef, localVideoRef, logSoundCapsulePlayback, manualTransportAdvanceRef, noteSkipReason, pendingResumeTimeRef, queue, repeatMode, setCurrentTime, setIsPlaying, setLastAdded, setPendingResumeTime, setQueue, setStopAfterTrack, stopAfterTrack, triggerAutoplay, videoModeRef
  } = props;
  return useCallback(reason => {
  const track = queue?.[0];
  if (!track) return;
  const endedTrackKey = getTrackActionKey(track);
  const transportGuard = manualTransportAdvanceRef.current;
  if (reason === 'natural_end' && transportGuard?.action && transportGuard.trackKey === endedTrackKey && Date.now() - Number(transportGuard.at || 0) < 1500) {
    console.log('[Aether/Queue] Ignoring advance event after manual transport action', {
      action: transportGuard.action,
      title: track?.title
    });
    // Do not hard-block; if we are actually stuck at the end, we still need to clear it.
    if (Math.abs(currentTimeRef.current - (track.totalDurationMs || track.duration || 0)) < 5000) {
      console.log('[Aether/Queue] Override: Forced natural end at EOF boundary.');
    } else {
      return;
    }
  }
  console.log(`[Aether/Queue] Advancing: ${reason} for ${track.title}`);
  noteSkipReason(reason, {
    trackId: track.id,
    title: track.title
  });
  if (reason === 'natural_end' || currentTimeRef.current > 30000 || track.totalDurationMs && currentTimeRef.current > track.totalDurationMs * 0.5) {
    logSoundCapsulePlayback(track, {
      reason
    });
  }
  if (reason === 'natural_end' && stopAfterTrack) {
    setStopAfterTrack(false);
    setIsPlaying(false);
    if (localAudioRef.current) localAudioRef.current.pause();
    if (localVideoRef.current) localVideoRef.current.pause();
    setLastAdded('Sleep timer • Paused after track');
    setTimeout(() => setLastAdded(null), 2000);
    return;
  }
  if (reason === 'natural_end' && repeatMode === 'track') {
    pendingResumeTimeRef.current = null;
    setPendingResumeTime(null);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    manualTransportAdvanceRef.current = null;
    if (localAudioRef.current && !videoModeRef.current) {
      try {
        localAudioRef.current.currentTime = 0;
        if (isPlaying) localAudioRef.current.play().catch(() => {});
      } catch {}
    }
    appendRecentEvent('repeat_track', track.title || 'Current track', {
      tone: 'neutral'
    });
    return;
  }
  if (reason === 'natural_end' && repeatMode === 'queue' && queue.length === 1) {
    pendingResumeTimeRef.current = null;
    setPendingResumeTime(null);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    manualTransportAdvanceRef.current = null;
    if (localAudioRef.current && !videoModeRef.current) {
      try {
        localAudioRef.current.currentTime = 0;
        if (isPlaying) localAudioRef.current.play().catch(() => {});
      } catch {}
    }
    appendRecentEvent('repeat_queue', `Repeating loop: ${track.title}`, {
      tone: 'neutral'
    });
    return;
  }

  // Standard Queue Advancement
  setQueue(prev => {
    if (!Array.isArray(prev) || prev.length === 0) return [];
    const removed = prev[0];
    const removedKey = getTrackActionKey(removed);
    let next = prev.slice(1);
    if (repeatMode === 'queue' && removed) {
      next = [...next, removed];
    }
    if (next.length === 0) {
      if (isAutoplayEnabled && removed) {
        setTimeout(async () => {
          const added = await triggerAutoplay(removed);
          if (!added) setIsPlaying(false);
        }, 50);
      } else {
        setIsPlaying(false);
      }
    }
    return next;
  });
  pendingResumeTimeRef.current = null;
  setPendingResumeTime(null);
  currentTimeRef.current = 0;
  setCurrentTime(0);
  manualTransportAdvanceRef.current = null;
}, [appendRecentEvent, getTrackActionKey, isAutoplayEnabled, isPlaying, logSoundCapsulePlayback, noteSkipReason, queue, repeatMode, triggerAutoplay]);
}
