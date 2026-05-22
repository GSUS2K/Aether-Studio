import { useEffect } from 'react';

export function useStandaloneTeardownPersist(props) {
  const {
    SESSION_PLAYBACK_STORAGE_KEY, isStandalone, localAudioRef, localVideoRef, pendingResumeTimeRef, sessionReadyRef, stopVideoElement
  } = props;
  useEffect(() => {
  if (!isStandalone) return;
  const teardownPlaybackSession = () => {
    sessionReadyRef.current = false;
    pendingResumeTimeRef.current = null;
    try {
      window.aether?.store?.set?.(SESSION_PLAYBACK_STORAGE_KEY, {
        queue: [],
        isPlaying: false,
        currentTime: 0,
        savedAt: Date.now(),
        closedAt: Date.now()
      });
    } catch {}
    stopVideoElement(localVideoRef.current);
    localVideoRef.current = null;
    if (localAudioRef.current) {
      try {
        localAudioRef.current.oncanplay = null;
        localAudioRef.current.onplaying = null;
        localAudioRef.current.ontimeupdate = null;
        localAudioRef.current.onwaiting = null;
        localAudioRef.current.onstalled = null;
        localAudioRef.current.onended = null;
        localAudioRef.current.onerror = null;
        localAudioRef.current.onloadstart = null;
        localAudioRef.current.pause();
        localAudioRef.current.muted = true;
        localAudioRef.current.removeAttribute('src');
        localAudioRef.current.load();
      } catch {}
    }
  };
  window.addEventListener('beforeunload', teardownPlaybackSession);
  window.addEventListener('pagehide', teardownPlaybackSession);
  return () => {
    window.removeEventListener('beforeunload', teardownPlaybackSession);
    window.removeEventListener('pagehide', teardownPlaybackSession);
  };
}, [isStandalone, stopVideoElement]);

// ─── SIMPLE VIDEO ENGINE ─────────────────────────────────────────────────
// NOTE: isPlaying is intentionally NOT in the dep array.
// Play/Pause sync is handled by a separate effect below to avoid
// re-running src assignment and seek logic on every play/pause toggle.
}
