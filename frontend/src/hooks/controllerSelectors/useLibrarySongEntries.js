/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMemo } from 'react';

export function useLibrarySongEntries(props) {
  const {
    FAVORITES_PLAYLIST_ID, FAVORITES_PLAYLIST_NAME, favoriteTracksList, normalizeTrackIdentity, playlists
  } = props;
  return useMemo(() => {
  const entries = [];
  const seen = new Set();
  const entryByKey = new Map();
  Object.entries(playlists || {}).forEach(([playlistName, tracks]) => {
    (Array.isArray(tracks) ? tracks : []).forEach((track, index) => {
      const key = normalizeTrackIdentity(track) || `${playlistName}-${index}`;
      const existing = entryByKey.get(key);
      if (existing) {
        if (!existing.playlists.includes(playlistName)) existing.playlists.push(playlistName);
        return;
      }
      seen.add(key);
      const entry = {
        key,
        track,
        playlists: [playlistName],
        playlistName,
        index
      };
      entryByKey.set(key, entry);
      entries.push(entry);
    });
  });
  favoriteTracksList.forEach((track, index) => {
    const key = normalizeTrackIdentity(track) || `${FAVORITES_PLAYLIST_ID}-${index}`;
    const existing = entryByKey.get(key);
    if (existing) {
      existing.isFavorite = true;
      if (!existing.playlists.includes(FAVORITES_PLAYLIST_NAME)) existing.playlists.push(FAVORITES_PLAYLIST_NAME);
      return;
    }
    if (!seen.has(key)) {
      const entry = {
        key,
        track,
        playlists: [FAVORITES_PLAYLIST_NAME],
        playlistName: FAVORITES_PLAYLIST_ID,
        index,
        isFavorite: true
      };
      entryByKey.set(key, entry);
      entries.push(entry);
    }
  });
  return entries;
}, [favoriteTracksList, normalizeTrackIdentity, playlists]);
}
