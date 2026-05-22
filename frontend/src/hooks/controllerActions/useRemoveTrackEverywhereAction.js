/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useRemoveTrackEverywhereAction(props) {
  const {
    favoriteTracks, normalizeTrackIdentity, persistFavoriteTracks, playlists, requestDestructiveConfirmation, setLastAdded, setPlaylists
  } = props;
  return useCallback(async track => {
  const key = normalizeTrackIdentity(track);
  if (!key) return;
  const confirmed = await requestDestructiveConfirmation({
    title: 'Delete track from every vault?',
    message: `Aether will remove "${track?.title || 'this track'}" from every vault and Favorites.`,
    detail: 'This does not delete downloaded audio files from disk.',
    confirmLabel: 'Delete Track'
  });
  if (!confirmed) return;
  const nextPlaylists = {};
  let removedCount = 0;
  Object.entries(playlists || {}).forEach(([name, tracks]) => {
    const filtered = (Array.isArray(tracks) ? tracks : []).filter(item => {
      const isMatch = normalizeTrackIdentity(item) === key;
      if (isMatch) removedCount += 1;
      return !isMatch;
    });
    nextPlaylists[name] = filtered;
  });
  if (removedCount > 0) {
    setPlaylists(nextPlaylists);
    window.aether?.store?.set?.('playlists', nextPlaylists);
  }
  if (favoriteTracks?.[key]) {
    const nextFavorites = {
      ...(favoriteTracks || {})
    };
    delete nextFavorites[key];
    persistFavoriteTracks(nextFavorites);
  }
  setLastAdded(removedCount > 0 ? `Deleted track from ${removedCount} vault${removedCount === 1 ? '' : 's'}` : 'Track not found in vaults');
  setTimeout(() => setLastAdded(null), 2600);
}, [favoriteTracks, normalizeTrackIdentity, persistFavoriteTracks, playlists, requestDestructiveConfirmation]);
}
