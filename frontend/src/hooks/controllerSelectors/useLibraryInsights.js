/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMemo } from 'react';

export function useLibraryInsights(props) {
  const {
    downloadedTracks, extractYouTubeId, normalizeTrackIdentity, playlists, trackHasSavedLyrics
  } = props;
  return useMemo(() => {
  const allTracks = Object.values(playlists).flat();
  const seen = new Map();
  const artistCount = new Map();
  const downloadedSet = new Set((downloadedTracks || []).map(id => String(id)));
  let duplicates = 0;
  let missingLinks = 0;
  let weakMetadata = 0;
  let noLyrics = 0;
  let notDownloaded = 0;
  allTracks.forEach(track => {
    const key = normalizeTrackIdentity(track);
    if (seen.has(key)) duplicates += 1;else seen.set(key, true);
    const artist = (track?.author || 'Unknown').trim();
    artistCount.set(artist, (artistCount.get(artist) || 0) + 1);
    const resolvedId = track?.youtubeId || extractYouTubeId(track?.actualUrl || track?.url || track?.id) || track?.id;
    if (!(track?.actualUrl || track?.url || track?.youtubeId)) missingLinks += 1;
    const title = String(track?.title || '').trim().toLowerCase();
    const normalizedArtist = String(track?.author || track?.artist || '').trim().toLowerCase();
    if (!title || !normalizedArtist || title === 'unknown track' || normalizedArtist === 'unknown artist' || !track?.thumbnail) weakMetadata += 1;
    if (!trackHasSavedLyrics(track)) noLyrics += 1;
    if (!resolvedId || !downloadedSet.has(String(resolvedId)) && !downloadedSet.has(String(track?.id || ''))) notDownloaded += 1;
  });
  const topArtists = [...artistCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return {
    total: allTracks.length,
    unique: seen.size,
    duplicates,
    missingLinks,
    weakMetadata,
    noLyrics,
    notDownloaded,
    topArtists
  };
}, [downloadedTracks, playlists, normalizeTrackIdentity, trackHasSavedLyrics]);
}
