/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useAttemptFixesAction(props) {
  const {
    isStandalone, refreshEngineStatus, requestDestructiveConfirmation, runtimeIssueDismissedRef, setRepairResult, setRuntimeIssuePrompt
  } = props;
  return useCallback(async () => {
  if (!isStandalone || !window.aether?.repairEnvironment) return;
  const confirmed = await requestDestructiveConfirmation({
    title: 'Attempt platform fixes?',
    message: 'Aether will try to fix local playback helper paths and permissions for this platform.',
    detail: 'This changes local runtime settings so playback and downloads can recover automatically.',
    confirmLabel: 'Attempt Fixes'
  });
  if (!confirmed) return;
  setRepairResult({
    status: 'running'
  });
  try {
    const res = await window.aether.repairEnvironment({
      runFixes: true
    });
    setRepairResult({
      status: 'done',
      result: res
    });
    await refreshEngineStatus();
    if (res?.ytDlpReady && res?.ffmpegReady) {
      runtimeIssueDismissedRef.current = false;
      try {
        sessionStorage.removeItem('aether.runtimeIssueDismissed');
      } catch {}
      setRuntimeIssuePrompt(null);
    }
  } catch (e) {
    setRepairResult({
      status: 'error',
      error: e?.message || String(e)
    });
  }
}, [isStandalone, refreshEngineStatus, requestDestructiveConfirmation]);
}
