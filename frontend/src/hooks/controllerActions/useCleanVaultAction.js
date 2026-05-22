/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useCleanVaultAction(props) {
  const {
    extractYouTubeId, isStandalone, isVaultCleaning, mergeTrackMetadata, normalizeTrackIdentity, persistPlaylistOrder, playlists, requestDestructiveConfirmation, setIsVaultCleaning, setLastAdded, setPlaylists
  } = props;
  return useCallback(async () => {
  if (isVaultCleaning) return;
  const confirmed = await requestDestructiveConfirmation({
    title: 'Clean vault data?',
    message: 'Aether will remove duplicate or unavailable vault entries and normalize saved track metadata.',
    detail: 'This changes your saved vault lists, but it does not delete audio files from disk.',
    confirmLabel: 'Clean Vault'
  });
  if (!confirmed) return;
  setIsVaultCleaning(true);
  setLastAdded('Cleaning vault…');
  try {
    const next = {};
    let removedDuplicates = 0;
    let removedUnavailable = 0;
    let normalized = 0;
    const totalTracks = Object.values(playlists).reduce((sum, tracks) => sum + (Array.isArray(tracks) ? tracks.length : 0), 0);
    let processedTracks = 0;
    const withTimeout = (promise, timeoutMs = 2500) => new Promise(resolve => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          resolve(null);
        }
      }, timeoutMs);
      Promise.resolve(promise).then(value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value ?? null);
      }).catch(() => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(null);
      });
    });
    for (const [name, tracks] of Object.entries(playlists)) {
      const seen = new Set();
      const clean = [];
      for (const original of tracks || []) {
        processedTracks += 1;
        if (processedTracks % 18 === 0) {
          setLastAdded(`Cleaning vault… ${processedTracks}/${Math.max(totalTracks, 1)}`);
        }
        const baseUrl = original?.actualUrl || original?.url || (original?.youtubeId ? `https://www.youtube.com/watch?v=${original.youtubeId}` : '');
        let track = baseUrl ? {
          ...original,
          id: original?.id || original?.youtubeId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          youtubeId: original?.youtubeId || extractYouTubeId(baseUrl),
          actualUrl: original?.actualUrl || baseUrl,
          url: original?.url || baseUrl
        } : null;
        if (!track) {
          removedUnavailable += 1;
          continue;
        }
        if (isStandalone && window.aether?.getMetadata) {
          const needsHydration = !original?.title || !original?.author || !original?.thumbnail || !track.youtubeId;
          if (needsHydration) {
            const meta = await withTimeout(window.aether.getMetadata(track.actualUrl || track.url), 2500);
            if (meta && (meta.title || meta.author || meta.thumbnail || meta.url || meta.actualUrl)) {
              track = mergeTrackMetadata(track, meta);
            }
          }
        }
        if (!(track.actualUrl || track.url || track.youtubeId)) {
          removedUnavailable += 1;
          continue;
        }
        const key = normalizeTrackIdentity(track);
        if (seen.has(key)) {
          removedDuplicates += 1;
          continue;
        }
        seen.add(key);
        const beforeTitle = String(original?.title || '').trim();
        const beforeAuthor = String(original?.author || '').trim();
        const beforeThumb = String(original?.thumbnail || '').trim();
        const normalizedTrack = {
          ...track,
          title: String(track.title || beforeTitle || 'Unknown Track').trim(),
          author: String(track.author || beforeAuthor || 'Unknown Artist').trim(),
          thumbnail: track.thumbnail || beforeThumb || ''
        };
        if (normalizedTrack.title !== beforeTitle || normalizedTrack.author !== beforeAuthor || (normalizedTrack.thumbnail || '') !== beforeThumb) {
          normalized += 1;
        }
        clean.push(normalizedTrack);
      }
      next[name] = clean;
    }
    setPlaylists(next);
    await window.aether?.store?.set?.('playlists', next);
    persistPlaylistOrder(Object.keys(next).filter(name => next[name]));
    setLastAdded(`Vault cleaned • deduped ${removedDuplicates}, removed ${removedUnavailable}, normalized ${normalized}`);
    setTimeout(() => setLastAdded(null), 4200);
  } finally {
    setIsVaultCleaning(false);
  }
}, [isStandalone, isVaultCleaning, normalizeTrackIdentity, playlists, requestDestructiveConfirmation]);
}
