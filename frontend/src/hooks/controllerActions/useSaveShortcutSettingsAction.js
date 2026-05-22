/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useSaveShortcutSettingsAction(props) {
  const {
    GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, SHORTCUT_FIELDS, buildCanonicalShortcutCombo, flashLastAdded, globalMediaShortcutsEnabled, isMacPlatform, isShortcutSettingsSaving, isStandalone, parseShortcutCombo, sanitizeShortcutMap, setIsShortcutSettingsOpen, setIsShortcutSettingsSaving, setShortcutSettingsError, setShortcuts, shortcutDraft, toReadableShortcut
  } = props;
  return useCallback(async () => {
  if (isShortcutSettingsSaving) return;
  const normalized = sanitizeShortcutMap(shortcutDraft, isMacPlatform);
  const seen = new Map();
  for (const {
    id,
    label
  } of SHORTCUT_FIELDS) {
    const parsed = parseShortcutCombo(normalized[id], isMacPlatform);
    if (!parsed) {
      setShortcutSettingsError(`Invalid shortcut for ${label}.`);
      return;
    }
    const key = buildCanonicalShortcutCombo(parsed, isMacPlatform);
    if (seen.has(key)) {
      setShortcutSettingsError(`Shortcut conflict: ${label} and ${seen.get(key)} both use ${toReadableShortcut(key, isMacPlatform)}.`);
      return;
    }
    seen.set(key, label);
  }
  setIsShortcutSettingsSaving(true);
  try {
    if (isStandalone && window.aether?.store?.set) {
      await window.aether.store.set(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, !!globalMediaShortcutsEnabled);
    } else {
      localStorage.setItem(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, JSON.stringify(!!globalMediaShortcutsEnabled));
    }
    setShortcuts(normalized);
    setShortcutSettingsError('');
    setIsShortcutSettingsOpen(false);
    flashLastAdded('Shortcuts saved', 1800, 'success');
  } catch (e) {
    console.warn('[Aether/Shortcuts] Failed to persist global media shortcut toggle', e);
    setShortcutSettingsError('Could not save shortcuts. Try again.');
    flashLastAdded('Shortcut save failed', 2200, 'error');
  } finally {
    setIsShortcutSettingsSaving(false);
  }
}, [flashLastAdded, globalMediaShortcutsEnabled, isMacPlatform, isShortcutSettingsSaving, isStandalone, shortcutDraft]);
}
