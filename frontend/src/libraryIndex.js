import MiniSearch from 'minisearch';

const DB_NAME = 'aether-library-index';
const STORE_NAME = 'snapshots';
const SNAPSHOT_KEY = 'latest';

const normalizeText = (value = '') => String(value || '').toLowerCase().trim();

const openIndexDb = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB unavailable'));
    return;
  }
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
  };
  request.onerror = () => reject(request.error || new Error('Failed to open library index'));
  request.onsuccess = () => resolve(request.result);
});

const withStore = async (mode, action) => {
  const db = await openIndexDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = action(store);
      request.onerror = () => reject(request.error || new Error('Library index transaction failed'));
      request.onsuccess = () => resolve(request.result);
      tx.onerror = () => reject(tx.error || new Error('Library index transaction failed'));
    });
  } finally {
    db.close();
  }
};

export const persistLibraryIndexSnapshot = async (snapshot) => {
  if (!snapshot || typeof indexedDB === 'undefined') return false;
  try {
    await withStore('readwrite', (store) => store.put({ ...snapshot, savedAt: Date.now() }, SNAPSHOT_KEY));
    return true;
  } catch (error) {
    console.warn('[Aether/LibraryIndex] Persist failed', error);
    return false;
  }
};

export const loadLibraryIndexSnapshot = async () => {
  if (typeof indexedDB === 'undefined') return null;
  try {
    return await withStore('readonly', (store) => store.get(SNAPSHOT_KEY));
  } catch (error) {
    console.warn('[Aether/LibraryIndex] Load failed', error);
    return null;
  }
};

export const buildLibrarySearchIndex = ({ songEntries = [], playlistNames = [], playlists = {} }) => {
  const docs = [];

  songEntries.forEach((entry) => {
    const track = entry?.track || {};
    docs.push({
      id: `song:${entry.key}`,
      kind: 'song',
      key: entry.key,
      title: track.title || '',
      artist: track.author || '',
      playlists: (entry.playlists || []).join(' '),
      text: `${track.title || ''} ${track.author || ''} ${(entry.playlists || []).join(' ')}`,
    });
  });

  playlistNames.forEach((name) => {
    const tracks = Array.isArray(playlists[name]) ? playlists[name] : [];
    docs.push({
      id: `playlist:${name}`,
      kind: 'playlist',
      key: name,
      title: name,
      artist: '',
      playlists: name,
      text: `${name} ${tracks.map((track) => `${track?.title || ''} ${track?.author || ''}`).join(' ')}`,
    });
  });

  const index = new MiniSearch({
    fields: ['title', 'artist', 'playlists', 'text'],
    storeFields: ['kind', 'key'],
    searchOptions: {
      boost: { title: 3, artist: 2, playlists: 1.5 },
      fuzzy: 0.18,
      prefix: true,
    },
  });

  if (docs.length) index.addAll(docs);

  return {
    docs,
    search(query) {
      const normalized = normalizeText(query);
      if (!normalized) return null;
      const songKeys = new Set();
      const playlistNamesSet = new Set();
      index.search(normalized).forEach((result) => {
        if (result.kind === 'song') songKeys.add(result.key);
        if (result.kind === 'playlist') playlistNamesSet.add(result.key);
      });
      return { songKeys, playlistNames: playlistNamesSet };
    },
  };
};
