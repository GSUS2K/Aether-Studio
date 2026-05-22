/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useRemoveFromPlaylistAction(props) {
  const {
    FAVORITES_PLAYLIST_ID, favoriteTracksList, playlists, requestDestructiveConfirmation, setLastAdded, setPlaylists, toggleFavoriteTrack
  } = props;
  return useCallback(async (name, index) => {
  const confirmed = await requestDestructiveConfirmation({
    title: name === FAVORITES_PLAYLIST_ID ? 'Remove favorite?' : 'Remove track from vault?',
    message: name === FAVORITES_PLAYLIST_ID ? 'Aether will remove this track from Favorites.' : `Aether will remove this track from "${name || 'this vault'}".`,
    detail: 'The track is not deleted from disk or from other vaults.',
    confirmLabel: 'Remove Track'
  });
  if (!confirmed) return;
  if (name === FAVORITES_PLAYLIST_ID) {
    const track = favoriteTracksList[index];
    if (track) toggleFavoriteTrack(track, {
      skipConfirm: true
    });
    return;
  }
  const newPlaylists = {
    ...playlists
  };
  newPlaylists[name] = [...(newPlaylists[name] || [])];
  newPlaylists[name].splice(index, 1);
  setLastAdded(`Purged node from ${name}`);
  setTimeout(() => setLastAdded(null), 2000);
  setPlaylists(newPlaylists);
  window.aether?.store?.set('playlists', newPlaylists);
}, [playlists, favoriteTracksList, toggleFavoriteTrack, requestDestructiveConfirmation]);
}
