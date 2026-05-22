/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useSwitchVideoModeAction(props) {
  const {
    currentTimeRef, exitVideoMode, getActivePlaybackPositionMs, isOfflineMode, isVerticalStack, localVideoRef, pendingResumeTimeRef, restoreVerticalStackAfterVideoRef, setCinemaControlsVisible, setCurrentTime, setIsAudioBuffering, setIsLyricsExpanded, setIsVerticalStack, setLastAdded, setPendingResumeTime, setShowVisualLyrics, setVideoMode, setVisualControlsPinned, stopVideoElement, videoModeRef
  } = props;
  return useCallback(nextMode => {
  const next = nextMode || null;
  const currentMode = videoModeRef.current;
  if (next === currentMode) return;
  if (isOfflineMode && next) {
    setLastAdded('Offline Mode keeps visual video stages off');
    window.setTimeout(() => setLastAdded(null), 1800);
    return;
  }
  if (next === null) {
    if (!currentMode) return;
    exitVideoMode({
      reason: 'user_switch_to_audio'
    });
    return;
  }
  const handoffMs = getActivePlaybackPositionMs();
  if (handoffMs > 0) {
    currentTimeRef.current = handoffMs;
    setCurrentTime(handoffMs);
  }
  pendingResumeTimeRef.current = null;
  setPendingResumeTime(null);
  setIsLyricsExpanded(false);
  if (!currentMode) {
    restoreVerticalStackAfterVideoRef.current = false;
  }
  if (next === 'dual') {
    if (isVerticalStack) {
      restoreVerticalStackAfterVideoRef.current = true;
      setIsVerticalStack(false);
    }
    setShowVisualLyrics(false);
    setVisualControlsPinned(false);
  }
  if (next === 'cinema') {
    setShowVisualLyrics(true);
  }

  // Split <-> cinema is just a shell transition around the same video element.
  if (currentMode && next && localVideoRef.current) {
    setCinemaControlsVisible(true);
    setVideoMode(next);
    return;
  }
  if (currentMode && localVideoRef.current) {
    stopVideoElement(localVideoRef.current);
    localVideoRef.current = null;
  }
  setIsAudioBuffering(true);
  setCinemaControlsVisible(true);
  setVideoMode(next);
}, [exitVideoMode, getActivePlaybackPositionMs, isOfflineMode, isVerticalStack, setLastAdded, stopVideoElement]);
}
