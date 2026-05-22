/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMemo } from 'react';

export function useLibraryVisiblePlaylistNames(props) {
  const {
    getPlaylistLibraryStats, isLibraryOverlayContentReady, libraryFilter, librarySearchMatches, librarySearchNeedle, librarySort, orderedPlaylistNames, playlists
  } = props;
  return useMemo(() => {
  if (!isLibraryOverlayContentReady) return [];
  const matchesSearch = name => {
    if (!librarySearchNeedle) return true;
    return librarySearchMatches?.playlistNames?.has(name);
  };
  const matchesFilter = name => {
    const count = (playlists[name] || []).length;
    if (libraryFilter === 'filled') return count > 0;
    if (libraryFilter === 'empty') return count === 0;
    return true;
  };
  const list = orderedPlaylistNames.filter(name => matchesSearch(name) && matchesFilter(name));
  const sorted = [...list];
  const byName = (a, b) => a.localeCompare(b);
  if (librarySort === 'name') {
    sorted.sort(byName);
  } else if (librarySort === 'tracks-desc') {
    sorted.sort((a, b) => (playlists[b] || []).length - (playlists[a] || []).length || byName(a, b));
  } else if (librarySort === 'tracks-asc') {
    sorted.sort((a, b) => (playlists[a] || []).length - (playlists[b] || []).length || byName(a, b));
  } else if (librarySort === 'listened-desc') {
    sorted.sort((a, b) => getPlaylistLibraryStats(b).recentlyListenedMs - getPlaylistLibraryStats(a).recentlyListenedMs || byName(a, b));
  } else if (librarySort === 'added-desc') {
    sorted.sort((a, b) => getPlaylistLibraryStats(b).recentlyAddedMs - getPlaylistLibraryStats(a).recentlyAddedMs || byName(a, b));
  } else if (librarySort === 'updated-desc') {
    sorted.sort((a, b) => getPlaylistLibraryStats(b).lastUpdatedMs - getPlaylistLibraryStats(a).lastUpdatedMs || byName(a, b));
  } else if (librarySort === 'plays-desc') {
    sorted.sort((a, b) => getPlaylistLibraryStats(b).playCount - getPlaylistLibraryStats(a).playCount || byName(a, b));
  }
  return sorted;
}, [getPlaylistLibraryStats, isLibraryOverlayContentReady, libraryFilter, librarySearchMatches, librarySearchNeedle, librarySort, orderedPlaylistNames, playlists]);
}
