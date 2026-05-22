/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useClearAllDownloadedTracksAction(props) {
  const {
    isOfflineRemovalBusy, isStandalone, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats, requestDestructiveConfirmation, setDownloadedTracks, setIsOfflineDownloadsBusy, setIsOfflineRemovalBusy, setLastAdded, setWarmingTrackIds, warmupRetryRef
  } = props;
  return useCallback(async () => {
  if (!isStandalone || !window.aether?.clearOfflineDownloads || isOfflineRemovalBusy) return;
  const confirmed = await requestDestructiveConfirmation({
    title: 'Clear all downloads?',
    message: 'Aether will delete every downloaded audio file stored for offline playback on this device.',
    detail: 'Your vaults, favorites, and queue are not deleted.',
    confirmLabel: 'Clear Downloads'
  });
  if (!confirmed) return;
  setIsOfflineRemovalBusy(true);
  setIsOfflineDownloadsBusy(true);
  try {
    const response = await window.aether.clearOfflineDownloads();
    if (!response?.success) {
      throw new Error(response?.error || response?.result?.error || 'Failed to clear downloads');
    }
    const downloaded = Array.isArray(response?.downloaded) ? response.downloaded : [];
    setDownloadedTracks(downloaded);
    setWarmingTrackIds(new Set());
    warmupRetryRef.current.clear();
    await refreshOfflineDownloads();
    await refreshStorageStats();
    await refreshStorageEstimate();
    setLastAdded('Cleared all downloaded tracks');
    setTimeout(() => setLastAdded(null), 2300);
  } catch (err) {
    console.error('[Aether/Storage] Failed to clear all downloaded tracks', err);
    setLastAdded(`Clear failed${err?.message ? `: ${String(err.message).slice(0, 42)}` : ''}`);
    setTimeout(() => setLastAdded(null), 2800);
  } finally {
    setIsOfflineDownloadsBusy(false);
    setIsOfflineRemovalBusy(false);
  }
}, [isOfflineRemovalBusy, isStandalone, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats, requestDestructiveConfirmation]);
}
