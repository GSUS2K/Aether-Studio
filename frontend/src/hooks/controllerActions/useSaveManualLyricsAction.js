/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useSaveManualLyricsAction(props) {
  const {
    currentManualLyricsEntry, currentTrack, currentTrackPresetKey, currentTrackTitle, manualLyricsDraft, manualLyricsLinesToLrc, manualLyricsStoreRef, parseManualLyricsTimestamp, persistManualLyricsStore, setDiagnostics, setIsManualLyricsEditorOpen, setIsManualLyricsSaving, setLyrics, setManualLyricsDraft, setManualLyricsDraftError, setManualLyricsStore, sortManualLyricsLines
  } = props;
  return useCallback(async () => {
  if (!currentTrackPresetKey) {
    setManualLyricsDraftError('No track key is available for these lyrics yet.');
    return;
  }
  const normalizedLines = sortManualLyricsLines(manualLyricsDraft.map(line => {
    const parsedTimestamp = parseManualLyricsTimestamp(line?.timestamp);
    return {
      ...line,
      time: Number.isFinite(parsedTimestamp) ? parsedTimestamp : Math.max(0, Math.trunc(Number(line?.time) || 0)),
      text: String(line?.text || '').trim()
    };
  })).filter(line => String(line.text || '').trim().length > 0);
  if (normalizedLines.length === 0) {
    setManualLyricsDraftError('Add at least one timestamped lyric line before saving.');
    return;
  }
  const nextStore = {
    ...(manualLyricsStoreRef.current || {}),
    [currentTrackPresetKey]: {
      trackKey: currentTrackPresetKey,
      title: currentTrack?.title || currentTrackTitle || '',
      author: currentTrack?.author || '',
      duration: currentTrack?.totalDurationMs || currentTrack?.duration || null,
      createdAt: currentManualLyricsEntry?.createdAt || Date.now(),
      updatedAt: Date.now(),
      lines: normalizedLines,
      lrc: manualLyricsLinesToLrc(normalizedLines)
    }
  };
  setIsManualLyricsSaving(true);
  try {
    manualLyricsStoreRef.current = nextStore;
    setManualLyricsStore(nextStore);
    setLyrics(normalizedLines);
    setDiagnostics(prev => ({
      ...prev,
      lastLyricsSource: 'manual',
      lastLyricsFetchMs: null,
      lastLyricsFetchAt: Date.now(),
      lastLyricsError: null
    }));
    await persistManualLyricsStore(nextStore);
    setIsManualLyricsEditorOpen(false);
    setManualLyricsDraft([]);
    setManualLyricsDraftError('');
  } catch (error) {
    console.error('[Aether/Lyrics] Failed to save manual lyrics', error);
    setManualLyricsDraftError(error?.message || 'Failed to save manual lyrics.');
  } finally {
    setIsManualLyricsSaving(false);
  }
}, [currentManualLyricsEntry?.createdAt, currentTrack?.author, currentTrack?.duration, currentTrack?.title, currentTrack?.totalDurationMs, currentTrackPresetKey, currentTrackTitle, manualLyricsDraft, persistManualLyricsStore]);
}
