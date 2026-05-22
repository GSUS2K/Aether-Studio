/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useCopyVaultSceneEmbedAction(props) {
  const {
    AETHER_SHARE_ORIGIN, appendRecentEvent, clamp01, currentTrack, deriveFallbackPulse, encodeScenePayload, extractSceneYouTubeId, formatTime, getActivePlaybackPositionMs, isPlaying, isStandalone, livePulseReadout, lyrics, normalizeScenePayload, setIsSharedSceneOpen, setLastAdded, setSharedScene, setSharedSceneEncoded, themeColor, vaultPulse, vaultPulseRef, visualizerMode
  } = props;
  return useCallback(async () => {
  const totalDurationMs = currentTrack?.totalDurationMs || currentTrack?.duration || 0;
  const currentMs = getActivePlaybackPositionMs();
  const sceneFallbackPulse = deriveFallbackPulse(currentTrack, currentMs, isPlaying);
  const sceneLivePulse = vaultPulseRef.current || vaultPulse;
  const hasScenePulseSignal = clamp01(sceneLivePulse.energy) + clamp01(sceneLivePulse.bass) + clamp01(sceneLivePulse.mids) + clamp01(sceneLivePulse.highs) > 0.035;
  const scenePulse = hasScenePulseSignal ? sceneLivePulse : sceneFallbackPulse;
  const sceneEnergy = hasScenePulseSignal ? isPlaying ? Math.max(scenePulse.energy, livePulseReadout) : scenePulse.energy : scenePulse.energy;
  const lyricLine = (() => {
    if (!Array.isArray(lyrics) || lyrics.length === 0) return 'No lyric locked yet';
    const line = [...lyrics].reverse().find(l => l.time <= currentMs);
    return line?.text || 'No lyric locked yet';
  })();
  const sceneYouTubeId = currentTrack?.youtubeId || extractSceneYouTubeId(currentTrack?.actualUrl || currentTrack?.url || currentTrack?.thumbnail || '');
  const payload = {
    v: 1,
    t: String(currentTrack?.title || 'Aether Secret Session').slice(0, 120),
    a: String(currentTrack?.author || 'Unknown Artist').slice(0, 72),
    l: String(lyricLine || 'No lyric locked yet').slice(0, 140),
    y: sceneYouTubeId || '',
    th: sceneYouTubeId ? '' : String(currentTrack?.thumbnail || '').slice(0, 220),
    at: currentMs,
    to: totalDurationMs,
    s: isPlaying ? 1 : 0,
    m: visualizerMode === 'pulse' ? 1 : 0,
    p: [Math.round(clamp01(sceneEnergy) * 100), Math.round(clamp01(scenePulse.bass) * 100), Math.round(clamp01(scenePulse.mids) * 100), Math.round(clamp01(scenePulse.highs) * 100)],
    c: themeColor
  };
  const encoded = encodeScenePayload(payload);
  if (!encoded) {
    setLastAdded('Scene link unavailable');
    setTimeout(() => setLastAdded(null), 2200);
    return;
  }
  const sceneUrl = `${AETHER_SHARE_ORIGIN}/?scene=${encoded}`;
  setSharedScene(normalizeScenePayload(payload));
  setSharedSceneEncoded(encoded);
  setIsSharedSceneOpen(true);
  try {
    if (isStandalone && window.aether?.clipboard?.writeText) {
      await window.aether.clipboard.writeText(sceneUrl);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(sceneUrl);
    } else {
      const fallback = document.createElement('textarea');
      fallback.value = sceneUrl;
      fallback.style.position = 'fixed';
      fallback.style.left = '-9999px';
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      fallback.remove();
    }
    appendRecentEvent('scene_link', `${payload.t} @ ${formatTime(currentMs)}`, {
      tone: 'success',
      title: payload.t
    });
    setLastAdded('Scene link copied');
    setTimeout(() => setLastAdded(null), 2200);
  } catch (err) {
    console.warn('[Aether/Vault] Failed to copy scene embed', err);
    appendRecentEvent('scene_link_failed', err?.message || 'Scene link unavailable', {
      tone: 'error',
      title: payload.t
    });
    setLastAdded('Scene link unavailable');
    setTimeout(() => setLastAdded(null), 2200);
  }
}, [appendRecentEvent, currentTrack, currentTrack?.actualUrl, currentTrack?.author, currentTrack?.duration, currentTrack?.thumbnail, currentTrack?.title, currentTrack?.youtubeId, formatTime, getActivePlaybackPositionMs, isPlaying, isStandalone, livePulseReadout, lyrics, themeColor, visualizerMode, vaultPulse]);
}
