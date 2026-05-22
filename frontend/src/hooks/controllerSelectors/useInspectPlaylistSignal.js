/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMemo } from 'react';

export function useInspectPlaylistSignal(props) {
  const {
    downloadedTracks, extractYouTubeId, favoriteTracks, getInspectSourceUrl, inspectPlaylistDurationMs, inspectPlaylistQueuedCount, inspectPlaylistTracks, normalizeTrackIdentity
  } = props;
  return useMemo(() => {
  const identityCounts = new Map();
  const artistCounts = new Map();
  let downloaded = 0;
  let favorites = 0;
  let missingSources = 0;
  inspectPlaylistTracks.forEach(track => {
    const identity = normalizeTrackIdentity(track);
    if (identity) identityCounts.set(identity, (identityCounts.get(identity) || 0) + 1);
    const artist = String(track?.author || track?.artist || 'Unknown Artist').trim() || 'Unknown Artist';
    artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
    const id = String(track?.id || track?.youtubeId || extractYouTubeId(track?.url) || extractYouTubeId(track?.actualUrl) || '').trim();
    if (id && downloadedTracks.includes(id)) downloaded += 1;
    if (identity && favoriteTracks?.[identity]) favorites += 1;
    if (!getInspectSourceUrl(track)) missingSources += 1;
  });
  const duplicateTracks = Array.from(identityCounts.values()).reduce((total, count) => total + Math.max(0, count - 1), 0);
  const topArtistEntry = Array.from(artistCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const avgDurationMs = inspectPlaylistTracks.length ? inspectPlaylistDurationMs / inspectPlaylistTracks.length : 0;
  const queuedPercent = inspectPlaylistTracks.length ? Math.round(inspectPlaylistQueuedCount / inspectPlaylistTracks.length * 100) : 0;
  const offlinePercent = inspectPlaylistTracks.length ? Math.round(downloaded / inspectPlaylistTracks.length * 100) : 0;
  return {
    duplicateTracks,
    topArtist: topArtistEntry?.[0] || 'Mixed artists',
    topArtistCount: topArtistEntry?.[1] || 0,
    avgDurationMs,
    downloaded,
    favorites,
    missingSources,
    queuedPercent,
    offlinePercent
  };
}, [downloadedTracks, favoriteTracks, inspectPlaylistDurationMs, inspectPlaylistQueuedCount, inspectPlaylistTracks, normalizeTrackIdentity]);
}
