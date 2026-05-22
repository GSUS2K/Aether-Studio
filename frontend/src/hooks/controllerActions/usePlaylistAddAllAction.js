/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function usePlaylistAddAllAction(props) {
  const {
    FAVORITES_PLAYLIST_ID, handleFavoriteAddAll, normalizeQueueTrack, playlists, setIsManualStop, setIsPlaying, setLastAdded, setQueue
  } = props;
  return useCallback(name => {
  if (name === FAVORITES_PLAYLIST_ID) {
    handleFavoriteAddAll();
    return;
  }
  const tracks = playlists[name];
  if (tracks && tracks.length > 0) {
    const normalized = (tracks || []).map(normalizeQueueTrack).filter(Boolean);
    if (normalized.length === 0) {
      setLastAdded(`No playable tracks in ${name}`);
      setTimeout(() => setLastAdded(null), 2600);
      return;
    }
    setQueue(prev => {
      const next = [...prev, ...normalized];
      if (prev.length === 0) setIsPlaying(true);
      return next;
    });
    setIsManualStop(false);
    setLastAdded(`Queued Entire Vault: ${name} (${normalized.length})`);
    setTimeout(() => setLastAdded(null), 3000);
  }
}, [playlists, handleFavoriteAddAll]);
}
