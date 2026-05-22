/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useWebPlaybackFallbackAction(props) {
  const {
    API_BASE, axios, flashLastAdded, isStandalone, normalizeWebPlaybackCandidate, queueRef, setDiagnostics, setIsAudioBuffering, setIsManualStop, setIsPlaying, setQueue, webPlaybackFallbackRef
  } = props;
  return useCallback(async ({
  code,
  youtubeId,
  track
}) => {
  if (isStandalone) return false;
  const errorCode = Number(code);
  const blockedCodes = new Set([2, 5, 100, 101, 150]);
  if (!blockedCodes.has(errorCode)) return false;
  const currentHead = queueRef.current?.[0];
  const isStillCurrentTrack = currentHead && (currentHead.queueNonce === track?.queueNonce || currentHead.youtubeId === youtubeId || currentHead.id === track?.id);
  if (!isStillCurrentTrack) return false;
  const fallbackRootId = String(track?.webFallbackRoot || track?.webFallbackFor || youtubeId || track?.queueNonce || track?.id || '');
  const trackKey = fallbackRootId;
  const fallbackState = webPlaybackFallbackRef.current;
  if (fallbackState.trackKey !== trackKey) {
    fallbackState.trackKey = trackKey;
    fallbackState.attemptedIds = new Set([fallbackRootId, String(youtubeId || '')].filter(Boolean));
    fallbackState.inFlight = false;
  }
  if (fallbackState.inFlight) return true;
  fallbackState.inFlight = true;
  try {
    const query = [track?.author || track?.artist, track?.title].filter(Boolean).join(' ').trim() || track?.title || '';
    if (!query) return false;
    setIsAudioBuffering(true);
    const response = await axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    const results = Array.isArray(response.data) ? response.data : [];
    const attemptedIds = fallbackState.attemptedIds;
    const replacement = results.map(normalizeWebPlaybackCandidate).find(candidate => {
      if (!candidate?.youtubeId) return false;
      if (candidate.youtubeId === youtubeId || attemptedIds.has(candidate.youtubeId)) return false;
      return Boolean(candidate.title && (candidate.actualUrl || candidate.url));
    });
    if (!replacement) {
      setIsPlaying(false);
      setIsAudioBuffering(false);
      setDiagnostics(prev => ({
        ...prev,
        lastSongSource: 'youtube-iframe-blocked',
        lastSongError: `YouTube embed blocked (${errorCode})`,
        lastSongFetchAt: Date.now()
      }));
      flashLastAdded('This video cannot play in the browser. Try another result or open Aether desktop.', 3800, 'warning');
      return false;
    }
    attemptedIds.add(replacement.youtubeId);
    const fallbackNonce = `web-fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setQueue(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      const head = prev[0];
      const stillSameHead = head.queueNonce === track?.queueNonce || head.youtubeId === youtubeId || head.id === track?.id;
      if (!stillSameHead) return prev;
      return [{
        ...replacement,
        queueNonce: fallbackNonce,
        webFallbackRoot: fallbackRootId || youtubeId,
        webFallbackFor: youtubeId,
        webFallbackReason: errorCode
      }, ...prev.slice(1)];
    });
    setIsManualStop(false);
    setIsPlaying(true);
    setDiagnostics(prev => ({
      ...prev,
      lastSongSource: 'youtube-iframe-fallback',
      lastSongError: '',
      lastSongFetchAt: Date.now()
    }));
    flashLastAdded('Official video was restricted. Trying another playable result.', 3200, 'warning');
    return true;
  } catch (error) {
    console.warn('[Aether/Audio] Web playback fallback search failed', error);
    setIsAudioBuffering(false);
    flashLastAdded('Could not find a playable web fallback.', 2800, 'error');
    return false;
  } finally {
    fallbackState.inFlight = false;
  }
}, [flashLastAdded, isStandalone, normalizeWebPlaybackCandidate]);
}
