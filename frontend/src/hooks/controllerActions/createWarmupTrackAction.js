/* eslint-disable react-hooks/preserve-manual-memoization */
export function createWarmupTrackAction(props) {
  const {
    downloadedTracks, extractYouTubeId, isWarmupUnavailable, setDownloadedTracks, setIsWarmupUnavailable, setLastAdded, setWarmingTrackIds, showRuntimeIssuePrompt, warmupRetryRef
  } = props;
  return async track => {
  if (!window.aether?.download || !track || isWarmupUnavailable) return;
  const derivedYoutubeId = track.youtubeId || extractYouTubeId(track.actualUrl || track.url || track.id);
  const idFromTrack = /^[A-Za-z0-9_-]{11}$/.test(String(track.id || '')) ? String(track.id) : null;
  const canonicalYoutubeId = derivedYoutubeId || idFromTrack;
  const id = canonicalYoutubeId || track.id;
  const sourceUrl = canonicalYoutubeId ? `https://www.youtube.com/watch?v=${canonicalYoutubeId}` : track.actualUrl || track.url;
  const title = track.title || 'Unknown';
  if (!id || !sourceUrl) return;
  const retryGate = warmupRetryRef.current.get(id);
  if (retryGate && Date.now() < retryGate.nextTryAt) {
    return;
  }
  if (downloadedTracks.includes(id)) {
    console.log(`[Aether] Warmup skipped because already downloaded: ${title} (${id})`);
    return;
  }
  setWarmingTrackIds(prev => {
    if (prev.has(id)) return prev;
    const next = new Set(prev);
    next.add(id);
    return next;
  });
  try {
    console.log(`[Aether] Warmup download request for ${title} (${id})`);
    const result = await window.aether.download(sourceUrl, id);
    console.log(`[Aether] Warmup result for ${id}:`, result);
    if (result?.success) {
      warmupRetryRef.current.delete(id);
      setDownloadedTracks(prev => Array.from(new Set([...prev, id])));
    } else if (String(result?.error || '').toLowerCase().includes('yt-dlp unavailable') || String(result?.error || '').toLowerCase().includes('enoent')) {
      const prev = warmupRetryRef.current.get(id);
      const failures = (prev?.failures || 0) + 1;
      warmupRetryRef.current.set(id, {
        failures,
        nextTryAt: Date.now() + Math.min(180000, 12000 * failures)
      });
      setIsWarmupUnavailable(true);
      showRuntimeIssuePrompt({
        title: 'Download Engine Needs Repair',
        message: 'Aether could not warm up downloads because yt-dlp is missing or blocked. Repair Runtime can fetch or relink the correct binary.'
      });
      setLastAdded('Warmup unavailable: yt-dlp missing');
      setTimeout(() => setLastAdded(null), 2400);
    } else {
      const prev = warmupRetryRef.current.get(id);
      const failures = (prev?.failures || 0) + 1;
      const err = String(result?.error || '').toLowerCase();
      const baseDelay = /403|416|resolve|nodename|throttled|ffmpeg|ffprobe/.test(err) ? 20000 : 6000;
      warmupRetryRef.current.set(id, {
        failures,
        nextTryAt: Date.now() + Math.min(180000, baseDelay * failures)
      });
    }
  } catch (err) {
    console.error(`[Aether] Warmup download failed for ${title} (${id})`, err);
    const prev = warmupRetryRef.current.get(id);
    const failures = (prev?.failures || 0) + 1;
    warmupRetryRef.current.set(id, {
      failures,
      nextTryAt: Date.now() + Math.min(180000, 10000 * failures)
    });
    if (/(yt-dlp|ffmpeg|ffprobe|enoent|eacces|eperm|spawn)/i.test(String(err?.message || err || ''))) {
      showRuntimeIssuePrompt({
        title: 'Download Engine Error',
        message: 'Aether hit a local playback tool error while warming up a track. Repair Runtime can attempt an automatic fix.'
      });
    }
  } finally {
    setWarmingTrackIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }
};
}
