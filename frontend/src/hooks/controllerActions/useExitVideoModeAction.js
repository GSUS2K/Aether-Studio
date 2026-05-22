/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useExitVideoModeAction(props) {
  const {
    advanceQueueRef, currentTimeRef, currentTrackRef, localAudioRef, localVideoRef, pendingResumeTimeRef, restoreVerticalStackAfterVideoRef, setCurrentTime, setIsAudioBuffering, setIsVideoReady, setPendingResumeTime, setPlaybackResetNonce, setVideoMode, standaloneTrackLoadKeyRef, stopVideoElement, videoModeRef
  } = props;
  return useCallback((options = {}) => {
  const {
    preservePosition = true,
    reason = 'unspecified'
  } = options;
  const vid = localVideoRef.current;
  const shouldRestoreVerticalStack = restoreVerticalStackAfterVideoRef.current;
  restoreVerticalStackAfterVideoRef.current = false;
  console.log('[Aether/Video] Exiting video mode', {
    reason,
    preservePosition,
    title: currentTrackRef.current?.title,
    youtubeId: currentTrackRef.current?.youtubeId
  });

  // Step 1: Capture handoff timestamp BEFORE touching anything
  const handoffMs = vid?.currentTime > 0 ? Math.floor(vid.currentTime * 1000) : null;

  // Step 2: Hard-kill all video event handlers BEFORE unmounting.
  // The video element stays in memory after unmount and its events
  // (onwaiting, onplaying) will keep firing, corrupting buffering state.
  stopVideoElement(vid);
  // Clear the ref immediately so no stale pointer lingers
  localVideoRef.current = null;

  // Step 3: Synchronously clear videoModeRef so audio callbacks see it immediately
  videoModeRef.current = null;

  // Step 4: Seed audio resumption time from where video left off
  const durationMs = currentTrackRef.current?.totalDurationMs || currentTrackRef.current?.duration || 0;
  if (preservePosition && handoffMs !== null) {
    if (durationMs > 0 && handoffMs >= durationMs - 3000) {
      // If we exit video basically at the end, don't try to seek the raw audio pipe—just finish gracefully.
      setIsAudioBuffering(false);
      setIsVideoReady(false);
      setVideoMode(null);
      advanceQueueRef.current('natural_end');
      return;
    }
    currentTimeRef.current = handoffMs;
    pendingResumeTimeRef.current = handoffMs;
    setPendingResumeTime(handoffMs);
    setCurrentTime(handoffMs);
  } else {
    pendingResumeTimeRef.current = null;
    setPendingResumeTime(null);
  }

  // Step 5: Fully reset audio element to avoid stuck/screeching playback,
  // then bump the load key ONCE to force audio re-initialization.
  if (localAudioRef.current) {
    try {
      localAudioRef.current.oncanplay = null;
      localAudioRef.current.onplaying = null;
      localAudioRef.current.onwaiting = null;
      localAudioRef.current.onstalled = null;
      localAudioRef.current.onended = null;
      localAudioRef.current.onerror = null;
      localAudioRef.current.onloadstart = null;
      localAudioRef.current.pause();
      localAudioRef.current.removeAttribute('src');
      localAudioRef.current.load();
      localAudioRef.current.muted = false;
    } catch {}
  }
  standaloneTrackLoadKeyRef.current = '';
  setPlaybackResetNonce(prev => prev + 1);

  // Step 6: Clear stale buffering state from the video engine
  setIsAudioBuffering(false);
  setIsVideoReady(false);
  setVideoMode(null);
}, []);
}
