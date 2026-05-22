/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useAddToPlaylistAction(props) {
  const {
    hasTrackInList, normalizeQueueTrack, persistPlaylistOrder, playlistOrder, playlists, setActiveMenuTrack, setLastAdded, setPlaylists
  } = props;
  return useCallback((name, data) => {
  if (!data) return;
  const newPlaylists = {
    ...playlists
  };
  const addedAt = new Date().toISOString();
  const markAdded = track => track ? {
    ...track,
    addedAt: track.addedAt || addedAt
  } : track;
  if (!newPlaylists[name]) newPlaylists[name] = [];
  if (!playlistOrder.includes(name)) {
    persistPlaylistOrder([...playlistOrder, name]);
  }
  if (Array.isArray(data)) {
    let addedCount = 0;
    data.forEach(t => {
      const normalizedTrack = markAdded(normalizeQueueTrack(t) || t);
      if (!hasTrackInList(newPlaylists[name], normalizedTrack)) {
        newPlaylists[name].push(normalizedTrack);
        addedCount++;
      }
    });
    setPlaylists(newPlaylists);
    window.aether?.store?.set('playlists', newPlaylists);
    setLastAdded(`Vaulted ${addedCount} Node(s)`);
    setTimeout(() => setLastAdded(null), 3000);
  } else {
    const normalizedTrack = markAdded(normalizeQueueTrack(data) || data);
    if (!hasTrackInList(newPlaylists[name], normalizedTrack)) {
      newPlaylists[name].push(normalizedTrack);
      setPlaylists(newPlaylists);
      window.aether?.store?.set('playlists', newPlaylists);
      setLastAdded(`Vaulted: ${normalizedTrack.title}`);
      setTimeout(() => setLastAdded(null), 3000);
    }
  }
  setActiveMenuTrack(null);
}, [playlists, playlistOrder, persistPlaylistOrder, hasTrackInList]);
}
