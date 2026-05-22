export const CONFIRMATION_PREFS_STORAGE_KEY = 'aether.confirmationSkips';
export const readConfirmationSkipPrefs = () => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(CONFIRMATION_PREFS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn('[Aether/Confirm] Failed to read confirmation preferences', error);
    return {};
  }
};
export const setConfirmationSkipPref = (key, value) => {
  if (!key || typeof localStorage === 'undefined') return;
  try {
    const prefs = readConfirmationSkipPrefs();
    if (value) prefs[key] = true;
    else delete prefs[key];
    localStorage.setItem(CONFIRMATION_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn('[Aether/Confirm] Failed to save confirmation preference', error);
  }
};
export const resetConfirmationSkipPrefs = () => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CONFIRMATION_PREFS_STORAGE_KEY);
  } catch (error) {
    console.warn('[Aether/Confirm] Failed to reset confirmation preferences', error);
  }
};
