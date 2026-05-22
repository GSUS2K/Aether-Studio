/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useDisableLockAction(props) {
  const {
    lockDisablePassword, refreshLockStatus, requestDestructiveConfirmation, setIsAppLocked, setIsLockBusy, setIsLockModalOpen, setLastAdded, setLockDisablePassword, setLockError
  } = props;
  return useCallback(async () => {
  if (!window.aether?.disableAppLock || !lockDisablePassword) {
    setLockError('Enter password to disable lock.');
    return;
  }
  const confirmed = await requestDestructiveConfirmation({
    title: 'Disable App Lock?',
    message: 'Aether will remove the password gate and idle lock protection from this device.',
    detail: 'You can turn App Lock back on later from Security.',
    confirmLabel: 'Disable Lock'
  });
  if (!confirmed) return;
  setIsLockBusy(true);
  setLockError('');
  try {
    const res = await window.aether.disableAppLock(lockDisablePassword);
    if (!res?.success) {
      setLockError(res?.error || 'Failed to disable lock.');
      return;
    }
    setLockDisablePassword('');
    await refreshLockStatus();
    setIsAppLocked(false);
    setIsLockModalOpen(false);
    setLastAdded('App lock disabled');
    setTimeout(() => setLastAdded(null), 2000);
  } finally {
    setIsLockBusy(false);
  }
}, [lockDisablePassword, refreshLockStatus, requestDestructiveConfirmation]);
}
