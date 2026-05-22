/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMemo } from 'react';

export function useProfileStats(props) {
  const {
    PLAYBACK_LEDGER_STORAGE_KEY, createPlaybackLedgerData, favoriteTracksList, normalizePlaybackLedgerData, normalizeTrackIdentity, playlists
  } = props;
  return useMemo(() => {
  const uniqueTracks = new Set();
  const artistNames = new Set();
  Object.values(playlists || {}).forEach(tracks => {
    (Array.isArray(tracks) ? tracks : []).forEach(track => {
      const key = normalizeTrackIdentity(track) || track?.id || track?.youtubeId || track?.title;
      if (key) uniqueTracks.add(key);
      const artist = String(track?.author || track?.artist || '').trim();
      if (artist) artistNames.add(artist.toLowerCase());
    });
  });
  favoriteTracksList.forEach(track => {
    const key = normalizeTrackIdentity(track) || track?.id || track?.youtubeId || track?.title;
    if (key) uniqueTracks.add(key);
    const artist = String(track?.author || track?.artist || '').trim();
    if (artist) artistNames.add(artist.toLowerCase());
  });
  let ledger = createPlaybackLedgerData();
  try {
    ledger = normalizePlaybackLedgerData(JSON.parse(localStorage.getItem(PLAYBACK_LEDGER_STORAGE_KEY) || '{}'));
  } catch {
    ledger = createPlaybackLedgerData();
  }
  const topArtist = Object.entries(ledger.artists || {}).sort(([, left], [, right]) => (right?.count || 0) - (left?.count || 0))[0]?.[0] || '';
  const topTrack = Object.values(ledger.tracks || {}).sort((left, right) => (right?.count || 0) - (left?.count || 0))[0]?.title || '';
  return {
    vaults: Object.keys(playlists || {}).length,
    tracks: uniqueTracks.size,
    favorites: favoriteTracksList.length,
    artists: artistNames.size || Object.keys(ledger.artists || {}).length,
    listens: ledger.totalPlays || 0,
    minutes: Math.round((ledger.totalMs || 0) / 60000),
    sessions: ledger.totalSessions || 0,
    topArtist,
    topTrack
  };
}, [favoriteTracksList, normalizeTrackIdentity, playlists]);
}
