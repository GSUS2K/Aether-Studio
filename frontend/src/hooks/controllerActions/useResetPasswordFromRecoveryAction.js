/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useResetPasswordFromRecoveryAction(props) {
  const {
    lockUseTouchId, recoveryNewPassword, recoveryNewPasswordConfirm, recoveryToken, refreshLockStatus, requestDestructiveConfirmation, setIsAppLocked, setIsForgotPasswordOpen, setRecoveryError, setRecoveryNewPassword, setRecoveryNewPasswordConfirm, setRecoveryPhrase, setRecoveryResetBusy, setRecoveryToken, setUnlockPasswordInput
  } = props;
  return useCallback(async () => {
  if (!window.aether?.resetAppLockPasswordWithRecovery) return;
  if (!recoveryToken) {
    setRecoveryError('Verify a recovery method first.');
    return;
  }
  if (!recoveryNewPassword || recoveryNewPassword.length < 4) {
    setRecoveryError('New password must be at least 4 characters.');
    return;
  }
  if (recoveryNewPassword !== recoveryNewPasswordConfirm) {
    setRecoveryError('Passwords do not match.');
    return;
  }
  const confirmed = await requestDestructiveConfirmation({
    title: 'Reset App Lock password?',
    message: 'Aether will replace the current App Lock password with the new password you entered.',
    detail: 'Use the new password the next time Aether locks.',
    confirmLabel: 'Reset Password'
  });
  if (!confirmed) return;
  setRecoveryError('');
  setRecoveryResetBusy(true);
  try {
    const res = await window.aether.resetAppLockPasswordWithRecovery({
      token: recoveryToken,
      newPassword: recoveryNewPassword,
      useTouchId: !!lockUseTouchId
    });
    if (!res?.success) {
      setRecoveryError(res?.error || 'Failed to reset password.');
      return;
    }
    setIsAppLocked(false);
    setUnlockPasswordInput('');
    setIsForgotPasswordOpen(false);
    setRecoveryPhrase('');
    setRecoveryToken('');
    setRecoveryNewPassword('');
    setRecoveryNewPasswordConfirm('');
    await refreshLockStatus();
  } catch (e) {
    setRecoveryError(e?.message || 'Failed to reset password.');
  } finally {
    setRecoveryResetBusy(false);
  }
}, [lockUseTouchId, recoveryNewPassword, recoveryNewPasswordConfirm, recoveryToken, refreshLockStatus, requestDestructiveConfirmation]);
}
