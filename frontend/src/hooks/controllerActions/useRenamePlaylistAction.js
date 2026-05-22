/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useRenamePlaylistAction(props) {
  const {
    FAVORITES_PLAYLIST_ID, persistPlaylistOrder, playlistOrder, playlists, setIsRenamingPlaylist, setLastAdded, setPlaylists, setViewingPlaylist, viewingPlaylist
  } = props;
  return useCallback((oldName, newName) => {
  if (oldName === FAVORITES_PLAYLIST_ID) {
    setIsRenamingPlaylist(null);
    setLastAdded('Favorites is a built-in library');
    setTimeout(() => setLastAdded(null), 2200);
    return;
  }
  const cleanName = String(newName || '').trim();
  if (!cleanName || oldName === cleanName) {
    setIsRenamingPlaylist(null);
    return;
  }
  if (playlists[cleanName] && cleanName !== oldName) {
    setLastAdded('Vault name already exists');
    setTimeout(() => setLastAdded(null), 2200);
    return;
  }
  const newPlaylists = {
    ...playlists
  };
  newPlaylists[cleanName] = newPlaylists[oldName];
  delete newPlaylists[oldName];
  setPlaylists(newPlaylists);
  window.aether?.store?.set('playlists', newPlaylists);
  persistPlaylistOrder(playlistOrder.map(name => name === oldName ? cleanName : name));
  setIsRenamingPlaylist(null);
  if (viewingPlaylist === oldName) setViewingPlaylist(cleanName);
  setLastAdded(`Renamed vault: ${cleanName}`);
  setTimeout(() => setLastAdded(null), 2200);
}, [playlists, playlistOrder, persistPlaylistOrder, viewingPlaylist]);
}
