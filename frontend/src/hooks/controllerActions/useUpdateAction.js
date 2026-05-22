/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useUpdateAction(props) {
  const {
    canUseUpdater, isUpdateBusy, setIsUpdateBusy, setLastAdded, setUpdateToast, updateInfo, updateToastTimeoutRef
  } = props;
  return useCallback(async () => {
  if (!canUseUpdater || isUpdateBusy) return;
  setIsUpdateBusy(true);
  try {
    if (updateInfo.downloaded) {
      const res = await window.aether.quitAndInstallUpdate();
      if (!res?.success) {
        setLastAdded(`Update restart failed${res?.error ? `: ${String(res.error).slice(0, 46)}` : ''}`);
        setTimeout(() => setLastAdded(null), 2600);
      }
      return;
    }
    if (updateInfo.available) {
      setUpdateToast('Downloading update…');
      if (updateToastTimeoutRef.current) clearTimeout(updateToastTimeoutRef.current);
      updateToastTimeoutRef.current = setTimeout(() => setUpdateToast(''), 2400);
      const res = await window.aether.downloadUpdate();
      if (!res?.success) {
        setLastAdded(`Update download failed${res?.error ? `: ${String(res.error).slice(0, 46)}` : ''}`);
        setTimeout(() => setLastAdded(null), 2600);
      }
      return;
    }
    setUpdateToast('Checking for updates…');
    if (updateToastTimeoutRef.current) clearTimeout(updateToastTimeoutRef.current);
    updateToastTimeoutRef.current = setTimeout(() => setUpdateToast(''), 2400);
    const res = await window.aether.checkForUpdates();
    if (!res?.success && res?.error) {
      setLastAdded(`Update check failed: ${String(res.error).slice(0, 42)}`);
      setTimeout(() => setLastAdded(null), 2400);
    }
  } catch (e) {
    setLastAdded(`Updater error: ${String(e?.message || e).slice(0, 46)}`);
    setTimeout(() => setLastAdded(null), 2600);
  } finally {
    setIsUpdateBusy(false);
  }
}, [canUseUpdater, isUpdateBusy, updateInfo?.downloaded, updateInfo?.available]);
}
