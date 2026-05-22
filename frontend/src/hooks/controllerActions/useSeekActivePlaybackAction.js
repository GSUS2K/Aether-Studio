/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useSeekActivePlaybackAction(props) {
  const {
    API_BASE, currentTimeRef, downloadedTracks, isPlaying, isStandalone, liveStreamStartOffsetMsRef, localAudioRef, localVideoRef, pendingResumeTimeRef, playbackResetNonce, queue, setCurrentTime, setPendingResumeTime, streamPort, videoModeRef
  } = props;
  return useCallback(timeMs => {
  const clampedMs = Math.max(0, Math.floor(Number(timeMs) || 0));
  const seekSeconds = clampedMs / 1000;
  currentTimeRef.current = clampedMs;
  if (videoModeRef.current && localVideoRef.current) {
    try {
      localVideoRef.current.currentTime = seekSeconds;
      pendingResumeTimeRef.current = null;
      setPendingResumeTime(null);
    } catch {
      pendingResumeTimeRef.current = clampedMs;
      setPendingResumeTime(clampedMs);
    }
    setCurrentTime(clampedMs);
    return;
  }
  if (localAudioRef.current) {
    const track = queue?.[0];
    const isLocalDownloaded = track && downloadedTracks.includes(track.id);
    if (track && !isLocalDownloaded) {
      // Server-side seek for live streaming
      const streamNonce = encodeURIComponent(String(track.queueNonce || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`));
      const resetQuery = `&_r=${playbackResetNonce}`;
      const youtubeUrl = track.youtubeId ? `https://www.youtube.com/watch?v=${track.youtubeId}` : track.actualUrl || track.url;
      const streamBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
      const newSrc = `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}&t=${seekSeconds}&_q=${streamNonce}${resetQuery}`;
      console.log("[Aether/Seek] Live Stream Source Re-route:", newSrc);
      liveStreamStartOffsetMsRef.current = clampedMs;
      localAudioRef.current.src = newSrc;
      if (isPlaying) {
        localAudioRef.current.play().catch(() => {});
      }
    } else {
      // Native client-side seek for downloaded/local tracks
      try {
        liveStreamStartOffsetMsRef.current = 0;
        localAudioRef.current.currentTime = seekSeconds;
        pendingResumeTimeRef.current = null;
        setPendingResumeTime(null);
      } catch {
        pendingResumeTimeRef.current = clampedMs;
        setPendingResumeTime(clampedMs);
      }
    }
  }
  setCurrentTime(clampedMs);
}, [queue, downloadedTracks, isPlaying, API_BASE, streamPort, playbackResetNonce, isStandalone]);
}
