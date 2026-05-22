/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMemo } from 'react';

export function useLibraryVisibleSongEntries(props) {
  const {
    getLibrarySongSortValue, getTrackLastListenedMs, getTrackPlayCount, isLibraryOverlayContentReady, librarySearchMatches, librarySearchNeedle, librarySongEntries, librarySongFilter, librarySongSort
  } = props;
  return useMemo(() => {
  if (!isLibraryOverlayContentReady) return [];
  const matchesSearch = entry => {
    if (!librarySearchNeedle) return true;
    return librarySearchMatches?.songKeys?.has(entry.key);
  };
  const filtered = librarySongEntries.filter(entry => {
    if (!matchesSearch(entry)) return false;
    if (librarySongFilter === 'favorites') return Boolean(entry.isFavorite);
    if (librarySongFilter === 'played') return getTrackPlayCount(entry.track) > 0 || getTrackLastListenedMs(entry.track) > 0;
    if (librarySongFilter === 'unplayed') return getTrackPlayCount(entry.track) === 0 && getTrackLastListenedMs(entry.track) === 0;
    return true;
  });
  const sorted = [...filtered];
  const byTitle = (a, b) => String(a.track?.title || '').localeCompare(String(b.track?.title || ''));
  if (librarySongSort === 'title') {
    sorted.sort(byTitle);
  } else if (librarySongSort === 'artist') {
    sorted.sort((a, b) => String(a.track?.author || '').localeCompare(String(b.track?.author || '')) || byTitle(a, b));
  } else if (librarySongSort === 'duration-asc') {
    sorted.sort((a, b) => getLibrarySongSortValue(a, librarySongSort) - getLibrarySongSortValue(b, librarySongSort) || byTitle(a, b));
  } else if (['listened-desc', 'added-desc', 'plays-desc', 'duration-desc'].includes(librarySongSort)) {
    sorted.sort((a, b) => getLibrarySongSortValue(b, librarySongSort) - getLibrarySongSortValue(a, librarySongSort) || byTitle(a, b));
  }
  return sorted;
}, [getLibrarySongSortValue, getTrackLastListenedMs, getTrackPlayCount, isLibraryOverlayContentReady, librarySearchMatches, librarySearchNeedle, librarySongEntries, librarySongFilter, librarySongSort]);
}
