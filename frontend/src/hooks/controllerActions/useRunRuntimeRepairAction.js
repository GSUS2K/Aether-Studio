/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useRunRuntimeRepairAction(props) {
  const {
    appendRecentEvent, currentTrack, handleResetPlaybackEngine, isStandalone, refreshEngineStatus, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats, requestDestructiveConfirmation, runtimeIssueDismissedRef, setIsRuntimeRepairing, setLastAdded, setRuntimeIssuePrompt
  } = props;
  return useCallback(async () => {
  if (!isStandalone) return;
  const confirmed = await requestDestructiveConfirmation({
    title: 'Repair runtime?',
    message: 'Aether will attempt to repair local playback helpers such as yt-dlp and FFmpeg.',
    detail: 'This may change local helper files or paths. Playback may reset after the repair.',
    confirmLabel: 'Repair Runtime'
  });
  if (!confirmed) return;
  setIsRuntimeRepairing(true);
  try {
    const repairResult = window.aether?.repairRuntime ? await window.aether.repairRuntime() : await window.aether?.repairEnvironment?.({
      runFixes: true
    });
    if (currentTrack?.actualUrl || currentTrack?.url) {
      handleResetPlaybackEngine({
        skipConfirm: true
      });
    }
    await refreshEngineStatus();
    await refreshStorageStats();
    await refreshStorageEstimate();
    await refreshOfflineDownloads();
    const notes = Array.isArray(repairResult?.notes) ? repairResult.notes.filter(Boolean) : [];
    const failedFix = Array.isArray(repairResult?.fixAttempts) && repairResult.fixAttempts.some(attempt => !attempt?.success);
    const ready = repairResult?.ytDlpReady && repairResult?.ffmpegReady;
    const summary = notes[0] || (ready ? 'Runtime repair complete' : 'Runtime repair checked environment');
    if (ready) {
      runtimeIssueDismissedRef.current = false;
      try {
        sessionStorage.removeItem('aether.runtimeIssueDismissed');
      } catch {}
      setRuntimeIssuePrompt(null);
    }
    appendRecentEvent('runtime_repair', summary, {
      tone: failedFix && !ready ? 'warning' : 'success'
    });
    setLastAdded(summary);
    setTimeout(() => setLastAdded(null), 3200);
  } catch (e) {
    console.warn('[Aether/Diagnostics] runtime repair failed', e);
    appendRecentEvent('runtime_repair_failed', e?.message || 'Runtime repair failed', {
      tone: 'error'
    });
    setLastAdded('Runtime repair failed');
    setTimeout(() => setLastAdded(null), 2800);
  } finally {
    setIsRuntimeRepairing(false);
  }
}, [appendRecentEvent, currentTrack?.actualUrl, currentTrack?.url, handleResetPlaybackEngine, isStandalone, refreshEngineStatus, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats, requestDestructiveConfirmation]);
}
