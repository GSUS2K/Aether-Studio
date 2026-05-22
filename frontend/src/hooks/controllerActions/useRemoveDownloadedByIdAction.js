/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useRemoveDownloadedByIdAction(props) {
  const {
    isOfflineRemovalBusy, isStandalone, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats, requestDestructiveConfirmation, setDownloadedTracks, setIsOfflineRemovalBusy, setLastAdded, setWarmingTrackIds, warmupRetryRef
  } = props;
  return useCallback(async (resolvedId, label = '') => {
  if (!isStandalone || !window.aether?.removeOfflineTrack || !resolvedId || isOfflineRemovalBusy) return;
  const confirmed = await requestDestructiveConfirmation({
    title: 'Delete downloaded file?',
    message: `Aether will remove the local downloaded copy for "${label || resolvedId}".`,
    detail: 'The track stays in your vaults and can be downloaded again later.',
    confirmLabel: 'Delete Download'
  });
  if (!confirmed) return;
  setIsOfflineRemovalBusy(true);
  setWarmingTrackIds(prev => {
    const next = new Set(prev);
    next.delete(resolvedId);
    return next;
  });
  try {
    const response = await window.aether.removeOfflineTrack(resolvedId);
    if (!response?.success) {
      throw new Error(response?.error || response?.result?.error || 'Failed to remove downloaded track');
    }
    const downloaded = Array.isArray(response?.downloaded) ? response.downloaded : [];
    setDownloadedTracks(downloaded);
    warmupRetryRef.current.delete(resolvedId);
    await refreshOfflineDownloads();
    await refreshStorageStats();
    await refreshStorageEstimate();
    setLastAdded(`Removed download • ${label || resolvedId}`);
    setTimeout(() => setLastAdded(null), 2200);
  } catch (err) {
    console.error('[Aether/Storage] Failed to remove downloaded track', err);
    setLastAdded(`Remove failed${err?.message ? `: ${String(err.message).slice(0, 42)}` : ''}`);
    setTimeout(() => setLastAdded(null), 2600);
  } finally {
    setIsOfflineRemovalBusy(false);
  }
}, [isOfflineRemovalBusy, isStandalone, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats, requestDestructiveConfirmation]);
}
