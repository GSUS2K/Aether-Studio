/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useEnableLockAction(props) {
  const {
    lockPasswordConfirm, lockPasswordInput, lockUseTouchId, refreshLockStatus, setIsLockBusy, setIsLockModalOpen, setLastAdded, setLockError, setLockPasswordConfirm, setLockPasswordInput
  } = props;
  return useCallback(async () => {
  if (!window.aether?.setAppLock) return;
  if (!lockPasswordInput || lockPasswordInput.length < 4) {
    setLockError('Password must be at least 4 characters.');
    return;
  }
  if (lockPasswordInput !== lockPasswordConfirm) {
    setLockError('Passwords do not match.');
    return;
  }
  setIsLockBusy(true);
  setLockError('');
  try {
    const res = await window.aether.setAppLock(lockPasswordInput, !!lockUseTouchId);
    if (!res?.success) {
      setLockError(res?.error || 'Failed to enable lock.');
      return;
    }
    setLockPasswordInput('');
    setLockPasswordConfirm('');
    await refreshLockStatus();
    setIsLockModalOpen(false);
    setLastAdded('App lock enabled');
    setTimeout(() => setLastAdded(null), 2000);
  } finally {
    setIsLockBusy(false);
  }
}, [lockPasswordConfirm, lockPasswordInput, lockUseTouchId, refreshLockStatus]);
}
