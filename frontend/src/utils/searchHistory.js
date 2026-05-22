import { SEARCH_HISTORY_LIMIT, SEARCH_HISTORY_STORAGE_KEY } from '../config/aetherConfig';

export const normalizeSearchHistoryItem = (value) => String(value || '').trim().replace(/\s+/g, ' ');

export const readSearchHistoryStore = () => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn('[Aether/Search] Failed to read search history', error);
    return {};
  }
};

export const writeSearchHistoryStore = (store) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(store || {}));
  } catch (error) {
    console.warn('[Aether/Search] Failed to save search history', error);
  }
};

export const readSearchHistory = (scope) => {
  const store = readSearchHistoryStore();
  const list = Array.isArray(store?.[scope]) ? store[scope] : [];
  return list.map(normalizeSearchHistoryItem).filter(Boolean).slice(0, SEARCH_HISTORY_LIMIT);
};

export const pushSearchHistoryItem = (scope, query) => {
  const normalized = normalizeSearchHistoryItem(query);
  if (!scope || !normalized) return readSearchHistory(scope);
  const store = readSearchHistoryStore();
  const current = Array.isArray(store[scope]) ? store[scope] : [];
  const next = [
    normalized,
    ...current
      .map(normalizeSearchHistoryItem)
      .filter((item) => item && item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, SEARCH_HISTORY_LIMIT);
  writeSearchHistoryStore({ ...store, [scope]: next });
  return next;
};

export const removeSearchHistoryItem = (scope, query) => {
  const normalized = normalizeSearchHistoryItem(query);
  const store = readSearchHistoryStore();
  const current = Array.isArray(store[scope]) ? store[scope] : [];
  const next = current
    .map(normalizeSearchHistoryItem)
    .filter((item) => item && item.toLowerCase() !== normalized.toLowerCase())
    .slice(0, SEARCH_HISTORY_LIMIT);
  writeSearchHistoryStore({ ...store, [scope]: next });
  return next;
};

export const clearSearchHistoryScope = (scope) => {
  const store = readSearchHistoryStore();
  writeSearchHistoryStore({ ...store, [scope]: [] });
  return [];
};
