/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useStorageOptimizeAction(props) {
  const {
    isStandalone, refreshStorageEstimate, refreshStorageStats, requestDestructiveConfirmation, setIsStorageBusy, setLastAdded, storagePolicy
  } = props;
  return useCallback(async mode => {
  if (!isStandalone || !window.aether?.optimizeStorage) return;
  const modeLabel = mode === 'downloads-only' ? 'keep downloaded only' : mode === 'age' ? 'clean old cache' : 'trim cache to cap';
  const confirmed = await requestDestructiveConfirmation({
    title: 'Run storage cleanup?',
    message: `Aether will ${modeLabel} and remove matching cached playback files.`,
    detail: 'Downloaded tracks are kept unless this cleanup mode marks cache-only files as removable.',
    confirmLabel: 'Clean Storage'
  });
  if (!confirmed) return;
  setIsStorageBusy(true);
  try {
    const payload = mode === 'cap' ? {
      mode,
      cacheCapMb: storagePolicy.cacheCapMb
    } : mode === 'age' ? {
      mode,
      maxCacheAgeDays: storagePolicy.maxCacheAgeDays
    } : {
      mode
    };
    const res = await window.aether.optimizeStorage(payload);
    if (res?.success) {
      setLastAdded(`Storage optimized • ${mode}`);
      setTimeout(() => setLastAdded(null), 2200);
    }
    await refreshStorageStats();
    await refreshStorageEstimate();
  } catch (e) {
    console.warn('[Aether/Storage] optimize failed', e);
  } finally {
    setIsStorageBusy(false);
  }
}, [isStandalone, refreshStorageEstimate, refreshStorageStats, storagePolicy.cacheCapMb, storagePolicy.maxCacheAgeDays, requestDestructiveConfirmation]);
}
