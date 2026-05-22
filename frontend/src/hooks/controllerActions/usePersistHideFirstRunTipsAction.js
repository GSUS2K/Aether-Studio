/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function usePersistHideFirstRunTipsAction(props) {
  const {
    SESSION_UI_STORAGE_KEY, isStandalone, setUserError
  } = props;
  return useCallback(nextHideFirstRunTips => {
  const nextValue = Boolean(nextHideFirstRunTips);
  try {
    if (isStandalone && window.aether?.store?.set) {
      (async () => {
        const rawExisting = await window.aether?.store?.get?.(SESSION_UI_STORAGE_KEY);
        const existing = rawExisting && typeof rawExisting === 'object' ? rawExisting : {};
        await window.aether.store.set(SESSION_UI_STORAGE_KEY, {
          ...existing,
          hideFirstRunTips: nextValue,
          savedAt: Date.now()
        });
      })().catch(e => {
        setUserError('Failed to save session settings.');
        console.warn('[Aether/Session] Failed to persist hideFirstRunTips (standalone)', e);
      });
      return;
    }
    let existing = {};
    try {
      const raw = localStorage.getItem(SESSION_UI_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') existing = parsed;
    } catch (e) {
      setUserError('Failed to read session settings.');
      console.warn('[Aether/Session] Failed to read session settings', e);
    }
    try {
      localStorage.setItem(SESSION_UI_STORAGE_KEY, JSON.stringify({
        ...existing,
        hideFirstRunTips: nextValue,
        savedAt: Date.now()
      }));
    } catch (e) {
      setUserError('Failed to save session settings.');
      console.warn('[Aether/Session] Failed to persist hideFirstRunTips', e);
    }
  } catch (e) {
    setUserError('Failed to save session settings.');
    console.warn('[Aether/Session] Failed to persist hideFirstRunTips', e);
  }
}, [isStandalone]);
}
