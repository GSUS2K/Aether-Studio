/* eslint-disable react-hooks/preserve-manual-memoization */
export function createFetchLyricsAction(props) {
  const {
    API_BASE, currentTrackPresetKey, isStandalone, lyricsFetchRequestRef, manualLyricsStoreRef, setDiagnostics, setIsLyricsLoading, setLyrics
  } = props;
  return async (trackTitle, trackAuthor, trackDuration, trackUrl, trackKey = '') => {
  if (!trackTitle) return;
  const manualKey = trackKey || currentTrackPresetKey;
  const requestId = ++lyricsFetchRequestRef.current;
  if (manualKey && (manualLyricsStoreRef.current?.[manualKey]?.lines || []).length > 0) {
    setIsLyricsLoading(false);
    return;
  }
  const startedAt = performance.now();
  setIsLyricsLoading(true);
  try {
    const normalizedTitle = String(trackTitle).replace(/\(official[^)]*\)/gi, '').replace(/\[[^\]]*\]/g, '').replace(/\(lyrics?\)/gi, '').replace(/\(audio\)/gi, '').replace(/\s{2,}/g, ' ').trim();
    console.log("[Aether/Lyrics] Fetch start", {
      trackTitle,
      normalizedTitle,
      trackAuthor,
      trackDuration,
      trackUrl,
      isStandalone
    });
    if (isStandalone) {
      const results = await window.aether.getLyrics(trackTitle, trackAuthor, trackDuration, trackTitle, trackUrl);
      // Backend returns { lyrics: Array<{time, text}>, source: string } OR Array directly
      const lyricsArray = Array.isArray(results) ? results : results?.lyrics || [];
      if (lyricsFetchRequestRef.current !== requestId) return;
      if (manualKey && (manualLyricsStoreRef.current?.[manualKey]?.lines || []).length > 0) {
        setIsLyricsLoading(false);
        return;
      }
      console.log("[Aether/Lyrics] Standalone result", {
        count: lyricsArray.length,
        source: results?.source
      });
      setLyrics(lyricsArray);
      setDiagnostics(prev => ({
        ...prev,
        lastLyricsSource: results?.source || 'local',
        lastLyricsFetchMs: Math.round(performance.now() - startedAt),
        lastLyricsFetchAt: Date.now(),
        lastLyricsError: null
      }));
      setIsLyricsLoading(false);
      return;
    }
    const query = `${normalizedTitle || trackTitle} ${trackAuthor || ''}`.trim();
    const resp = await fetch(`${API_BASE}/api/lyrics?track=${encodeURIComponent(normalizedTitle || trackTitle)}&artist=${encodeURIComponent(trackAuthor || '')}&duration=${(trackDuration || 0) / 1000}&url=${encodeURIComponent(trackUrl || '')}&query=${encodeURIComponent(query)}&format=json`);
    const data = await resp.json();
    if (lyricsFetchRequestRef.current !== requestId) return;
    if (manualKey && (manualLyricsStoreRef.current?.[manualKey]?.lines || []).length > 0) {
      setIsLyricsLoading(false);
      return;
    }
    console.log("[Aether/Lyrics] Web result", {
      ok: resp.ok,
      status: resp.status,
      count: Array.isArray(data) ? data.length : 0,
      sample: Array.isArray(data) ? data[0] : data
    });
    setLyrics(Array.isArray(data) ? data : []);
    setDiagnostics(prev => ({
      ...prev,
      lastLyricsSource: data?.source || 'api',
      lastLyricsFetchMs: Math.round(performance.now() - startedAt),
      lastLyricsFetchAt: Date.now(),
      lastLyricsError: null
    }));
  } catch (err) {
    if (lyricsFetchRequestRef.current !== requestId) return;
    console.error("[Aether/Lyrics] Fetch failed", err, {
      trackTitle,
      trackAuthor,
      trackDuration,
      trackUrl
    });
    setLyrics([]);
    setDiagnostics(prev => ({
      ...prev,
      lastLyricsFetchAt: Date.now(),
      lastLyricsError: err?.message || 'lyrics fetch failed'
    }));
  } finally {
    if (lyricsFetchRequestRef.current === requestId) {
      setIsLyricsLoading(false);
    }
  }
};
}
