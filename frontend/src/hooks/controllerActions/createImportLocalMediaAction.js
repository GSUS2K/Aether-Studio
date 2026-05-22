/* eslint-disable react-hooks/preserve-manual-memoization */
export function createImportLocalMediaAction(props) {
  const {
    appendSpotifyImportLog, buildUniquePlaylistName, flashLastAdded, isLocalMediaImporting, isSpotifyImporting, isStandalone, manualLyricsStoreRef, normalizeQueueTrack, normalizeTrackIdentity, persistManualLyricsStore, persistPlaylistOrder, playlistOrder, playlists, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats, setDownloadedTracks, setImportReview, setIsLocalMediaImporting, setIsSpotifyImportOpen, setManualLyricsStore, setMusicImportProvider, setPlaylists, setSpotifyImportLogs, setSpotifyImportPlaylistName, setSpotifyImportProgress, setViewingPlaylist, spotifyImportPlaylistName
  } = props;
  return async () => {
  if (isLocalMediaImporting || isSpotifyImporting) return;
  if (!isStandalone || !window.aether?.importLocalMedia) {
    flashLastAdded('Local import unavailable', 2200, 'warning');
    return;
  }
  setIsLocalMediaImporting(true);
  setMusicImportProvider('local');
  setSpotifyImportLogs([]);
  appendSpotifyImportLog('start provider=local');
  setSpotifyImportProgress({
    stage: 'starting',
    progress: 8,
    message: 'Choose local songs, videos, playlists, or lyric files...'
  });
  try {
    const res = await window.aether.importLocalMedia();
    if (res?.cancel) {
      setSpotifyImportProgress({
        stage: 'idle',
        progress: 0,
        message: 'Local import cancelled.'
      });
      flashLastAdded('Local import cancelled', 1800, 'warning');
      return;
    }
    appendSpotifyImportLog(`result success=${!!res?.success} tracks=${res?.importedTracks ?? 0} playlists=${res?.importedPlaylists ?? 0} lyrics=${res?.importedLyrics ?? 0}`);
    if (!res?.success) {
      setSpotifyImportProgress({
        stage: 'error',
        progress: 0,
        message: res?.error || 'Local import failed.'
      });
      flashLastAdded('Local import failed', 2600, 'error');
      return;
    }
    const importedTracks = (Array.isArray(res.tracks) ? res.tracks : []).map(normalizeQueueTrack).filter(Boolean);
    const importedPlaylists = Array.isArray(res.playlists) ? res.playlists : [];
    if (importedTracks.length === 0 && importedPlaylists.length === 0) {
      setSpotifyImportProgress({
        stage: 'complete',
        progress: 100,
        message: 'No playable local media files were found.'
      });
      flashLastAdded('No playable local files found', 2600, 'warning');
      return;
    }
    const nextPlaylists = {
      ...playlists
    };
    const nextOrder = [...playlistOrder];
    const addPlaylist = (name, tracks) => {
      const normalizedTracks = (tracks || []).map(normalizeQueueTrack).filter(Boolean);
      if (normalizedTracks.length === 0) return '';
      const uniqueName = buildUniquePlaylistName(name || 'Local Import', nextPlaylists);
      nextPlaylists[uniqueName] = normalizedTracks;
      nextOrder.push(uniqueName);
      return uniqueName;
    };
    let firstPlaylistName = '';
    if (importedPlaylists.length > 0) {
      importedPlaylists.forEach(entry => {
        const created = addPlaylist(entry.name || 'Local Playlist', entry.tracks || []);
        if (!firstPlaylistName && created) firstPlaylistName = created;
      });
    }
    if (importedTracks.length > 0) {
      const defaultName = spotifyImportPlaylistName.trim() || 'Local Imports';
      const created = addPlaylist(defaultName, importedTracks);
      if (!firstPlaylistName && created) firstPlaylistName = created;
    }
    if (Object.keys(nextPlaylists).length !== Object.keys(playlists).length) {
      setPlaylists(nextPlaylists);
      window.aether?.store?.set?.('playlists', nextPlaylists);
      persistPlaylistOrder(Array.from(new Set(nextOrder)));
    }
    if (firstPlaylistName) setViewingPlaylist(firstPlaylistName);
    const lyricsByTrackKey = res.lyricsByTrackKey && typeof res.lyricsByTrackKey === 'object' ? res.lyricsByTrackKey : {};
    const lyricCount = Object.keys(lyricsByTrackKey).length;
    if (lyricCount > 0) {
      const nextManualLyricsStore = {
        ...(manualLyricsStoreRef.current || {}),
        ...lyricsByTrackKey
      };
      manualLyricsStoreRef.current = nextManualLyricsStore;
      setManualLyricsStore(nextManualLyricsStore);
      await persistManualLyricsStore(nextManualLyricsStore);
    }
    const downloaded = await window.aether?.getOfflineTracks?.();
    if (Array.isArray(downloaded)) setDownloadedTracks(downloaded);
    await refreshOfflineDownloads();
    await refreshStorageStats();
    await refreshStorageEstimate();
    const summary = `Imported ${importedTracks.length} local file${importedTracks.length === 1 ? '' : 's'}${lyricCount ? ` + ${lyricCount} lyric set${lyricCount === 1 ? '' : 's'}` : ''}`;
    const reviewTracks = [...importedTracks, ...importedPlaylists.flatMap(entry => Array.isArray(entry.tracks) ? entry.tracks : [])].map(normalizeQueueTrack).filter(Boolean);
    const reviewKeys = new Set();
    const duplicateCount = reviewTracks.reduce((count, track) => {
      const key = normalizeTrackIdentity(track);
      if (reviewKeys.has(key)) return count + 1;
      reviewKeys.add(key);
      return count;
    }, 0);
    setImportReview({
      source: 'Local Files',
      playlistName: firstPlaylistName || spotifyImportPlaylistName.trim() || 'Local Imports',
      matched: reviewTracks.length,
      total: reviewTracks.length + Math.max(0, Number(res.skippedFiles) || 0),
      duplicates: duplicateCount,
      lyrics: lyricCount,
      skipped: Math.max(0, Number(res.skippedFiles) || 0),
      suggestions: [lyricCount > 0 ? 'Matched lyric files were saved and will load before online lyrics.' : 'Add .lrc files with matching names to attach local lyrics.', duplicateCount > 0 ? 'Run Playlist Health to collapse duplicate local files.' : '', 'Use Download Missing after review if you want the vault ready offline.'].filter(Boolean)
    });
    setSpotifyImportProgress({
      stage: 'complete',
      progress: 100,
      message: summary
    });
    flashLastAdded(summary, 3200, 'success');
    setIsSpotifyImportOpen(false);
    setSpotifyImportPlaylistName('');
    setMusicImportProvider('');
  } catch (err) {
    const message = err?.message || 'Local import failed.';
    appendSpotifyImportLog(`exception ${message}`);
    setSpotifyImportProgress({
      stage: 'error',
      progress: 0,
      message
    });
    flashLastAdded('Local import failed', 2600, 'error');
  } finally {
    setIsLocalMediaImporting(false);
  }
};
}
