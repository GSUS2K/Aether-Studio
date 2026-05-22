/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useDeletePlaylistAction(props) {
  const {
    FAVORITES_PLAYLIST_ID, persistFavoriteTracks, persistPlaylistOrder, playlistOrder, playlists, requestDestructiveConfirmation, setLastAdded, setPlaylists, setViewingPlaylist, viewingPlaylist
  } = props;
  return useCallback(async name => {
  const isFavorites = name === FAVORITES_PLAYLIST_ID;
  const confirmed = await requestDestructiveConfirmation({
    title: isFavorites ? 'Clear Favorites?' : 'Delete vault?',
    message: isFavorites ? 'Aether will remove every track saved in Favorites.' : `Aether will delete the "${name || 'selected'}" vault and its saved track list.`,
    detail: 'Audio files and downloads are not deleted from disk.',
    confirmLabel: isFavorites ? 'Clear Favorites' : 'Delete Vault'
  });
  if (!confirmed) return;
  if (name === FAVORITES_PLAYLIST_ID) {
    persistFavoriteTracks({});
    setViewingPlaylist(Object.keys(playlists)[0] || null);
    setLastAdded('Cleared favorites');
    setTimeout(() => setLastAdded(null), 2200);
    return;
  }
  const newPlaylists = {
    ...playlists
  };
  delete newPlaylists[name];
  setPlaylists(newPlaylists);
  window.aether?.store?.set('playlists', newPlaylists);
  const nextOrder = playlistOrder.filter(playlistName => playlistName !== name);
  persistPlaylistOrder(nextOrder);
  if (viewingPlaylist === name) {
    setViewingPlaylist(nextOrder.find(playlistName => Array.isArray(newPlaylists[playlistName])) || Object.keys(newPlaylists)[0] || null);
  }
}, [playlists, playlistOrder, persistPlaylistOrder, viewingPlaylist, persistFavoriteTracks, requestDestructiveConfirmation]);
}
