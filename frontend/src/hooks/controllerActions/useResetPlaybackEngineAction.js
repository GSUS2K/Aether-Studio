/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useResetPlaybackEngineAction(props) {
  const {
    appendRecentEvent, bufferingRescueRef, currentTimeRef, currentTrack, getActivePlaybackPositionMs, isStandalone, localAudioRef, localVideoRef, pendingResumeTimeRef, prematureEndGuardRef, requestDestructiveConfirmation, setCinemaControlsVisible, setCurrentTime, setIsAudioBuffering, setLastAdded, setPendingResumeTime, setPlaybackResetNonce, standaloneTrackLoadKeyRef, stopVideoElement, videoModeRef
  } = props;
  return useCallback(async (options = {}) => {
  const sourceUrl = currentTrack?.actualUrl || currentTrack?.url;
  if (!sourceUrl) {
    setLastAdded('No active playback to reset');
    setTimeout(() => setLastAdded(null), 1800);
    return;
  }
  if (!options.skipConfirm) {
    const confirmed = await requestDestructiveConfirmation({
      title: 'Reset playback engine?',
      message: 'Aether will stop and rebuild the active playback transport, then try to resume from the current position.',
      detail: 'Your queue and saved library are not deleted, but current playback can briefly restart.',
      confirmLabel: 'Reset Engine',
      allowDontAskAgain: true,
      preferenceKey: 'diagnostics.resetPlaybackEngine'
    });
    if (!confirmed) return;
  }
  const resumeAtMs = getActivePlaybackPositionMs();
  const activeMode = videoModeRef.current ? 'video' : 'audio';
  console.log('[Aether/Diagnostics] Reset playback engine', {
    title: currentTrack?.title,
    resumeAtMs,
    activeMode,
    isStandalone
  });
  bufferingRescueRef.current = {
    trackKey: '',
    lastAttemptAt: 0,
    attempts: 0
  };
  standaloneTrackLoadKeyRef.current = '';
  prematureEndGuardRef.current = {
    trackId: null,
    retried: false
  };
  currentTimeRef.current = resumeAtMs;
  pendingResumeTimeRef.current = resumeAtMs;
  setPendingResumeTime(resumeAtMs);
  setCurrentTime(resumeAtMs);
  setIsAudioBuffering(true);
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
      localAudioRef.current.muted = !!videoModeRef.current;
    } catch {}
  }
  if (videoModeRef.current && localVideoRef.current) {
    stopVideoElement(localVideoRef.current);
    setCinemaControlsVisible(true);
  }
  setPlaybackResetNonce(prev => prev + 1);
  appendRecentEvent('engine_reset', `${activeMode} transport`, {
    tone: 'warning',
    title: currentTrack?.title || 'Playback'
  });
  setLastAdded(`Engine reset • ${activeMode} transport`);
  setTimeout(() => setLastAdded(null), 2200);
}, [appendRecentEvent, currentTrack?.actualUrl, currentTrack?.title, currentTrack?.url, getActivePlaybackPositionMs, isStandalone, requestDestructiveConfirmation, stopVideoElement]);
}
