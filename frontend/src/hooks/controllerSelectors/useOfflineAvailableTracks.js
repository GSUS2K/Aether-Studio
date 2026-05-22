/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMemo } from 'react';

export function useOfflineAvailableTracks(props) {
  const {
    FAVORITES_PLAYLIST_NAME, downloadLabelById, downloadedTracks, favoriteTracksList, librarySongEntries, offlineDownloads, queue, resolveWarmupTrackId
  } = props;
  return useMemo(() => {
  const downloadedSet = new Set((downloadedTracks || []).map(id => String(id)));
  const byId = new Map();
  const addTrack = (track, offlineSource = '') => {
    if (!track) return;
    const resolvedId = resolveWarmupTrackId(track);
    const trackId = track?.id;
    const key = String(resolvedId || trackId || '');
    if (!key) return;
    if (!downloadedSet.has(String(resolvedId)) && !downloadedSet.has(String(trackId))) return;
    if (byId.has(key)) return;
    byId.set(key, {
      ...track,
      id: trackId || key,
      offlineKey: key,
      offlineSource
    });
  };
  librarySongEntries.forEach(entry => addTrack(entry.track, entry.playlists?.slice(0, 2).join(' / ')));
  favoriteTracksList.forEach(track => addTrack(track, FAVORITES_PLAYLIST_NAME));
  queue.forEach(track => addTrack(track, 'Queue'));
  (offlineDownloads || []).forEach(download => {
    const id = String(download?.id || download?.trackId || download?.youtubeId || download?.fileName || '').trim();
    if (!id || byId.has(id)) return;
    const label = downloadLabelById.get(id);
    byId.set(id, {
      id,
      offlineKey: id,
      title: label?.title || download?.title || download?.fileName || id,
      author: label?.author || download?.author || 'Downloaded',
      thumbnail: download?.thumbnail || '',
      offlineSource: 'Downloaded'
    });
  });
  return Array.from(byId.values()).sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
}, [downloadLabelById, downloadedTracks, favoriteTracksList, librarySongEntries, offlineDownloads, queue, resolveWarmupTrackId]);
}
