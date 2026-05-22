/* eslint-disable react-hooks/preserve-manual-memoization */
export function createImportSpotifyPlaylistAction(props) {
  const {
    appendSpotifyImportLog, buildUniquePlaylistName, flashLastAdded, isStandalone, musicImportProvider, normalizeQueueTrack, normalizeTrackIdentity, persistPlaylistOrder, playlistOrder, playlists, setImportReview, setIsSpotifyImportOpen, setIsSpotifyImporting, setMusicImportProvider, setPlaylists, setSpotifyImportLogs, setSpotifyImportPlaylistName, setSpotifyImportProgress, setSpotifyImportUrl, setViewingPlaylist, spotifyImportPlaylistName, spotifyImportUrl
  } = props;
  return async () => {
  if (!isStandalone) return;
  const url = spotifyImportUrl.trim();
  const provider = musicImportProvider || (url.includes('music.apple.com') ? 'apple' : 'spotify');
  const importer = provider === 'apple' ? window.aether?.importAppleMusicPlaylist : window.aether?.importSpotifyPlaylist;
  if (!url || !importer) {
    setSpotifyImportProgress({
      stage: 'error',
      progress: 0,
      message: provider === 'apple' ? 'Apple Music import is unavailable in this desktop build.' : 'Spotify import is unavailable in this desktop build.'
    });
    flashLastAdded('Playlist import unavailable', 2400, 'warning');
    return;
  }
  setIsSpotifyImporting(true);
  setSpotifyImportLogs([]);
  appendSpotifyImportLog(`start provider=${provider} name=${spotifyImportPlaylistName.trim() || 'auto'} url=${url}`);
  setSpotifyImportProgress({
    stage: 'starting',
    progress: 1,
    message: `Preparing ${provider === 'apple' ? 'Apple Music' : 'Spotify'} import...`
  });
  try {
    const res = await importer(url.trim());
    appendSpotifyImportLog(`result success=${!!res?.success} matched=${res?.matchedTracks ?? 0} total=${res?.totalTracks ?? 0}`);
    if (res?.debug) {
      appendSpotifyImportLog(`debug ${JSON.stringify(res.debug).slice(0, 900)}`);
    }
    if (!res?.success) {
      const parserDebug = res?.debug?.parser || res?.debug || {};
      const debugParts = [res?.debug?.playlistId ? `id=${res.debug.playlistId}` : '', Number.isFinite(res?.debug?.htmlStatus) ? `status=${res.debug.htmlStatus}` : '', Number.isFinite(res?.debug?.htmlLength) ? `bytes=${res.debug.htmlLength}` : '', Number.isFinite(parserDebug.metaSongTags) ? `songTags=${parserDebug.metaSongTags}` : '', Number.isFinite(parserDebug.jsonLdBlocks) ? `jsonLd=${parserDebug.jsonLdBlocks}` : '', Number.isFinite(parserDebug.attributeBlocks) ? `attr=${parserDebug.attributeBlocks}` : ''].filter(Boolean).join(' ');
      const debug = debugParts ? ` [${debugParts}]` : '';
      setSpotifyImportProgress({
        stage: 'error',
        progress: 0,
        message: `${res?.error || 'Playlist import failed.'}${debug}`
      });
      appendSpotifyImportLog(`error ${res?.error || 'Playlist import failed.'}${debug}`);
      flashLastAdded('Playlist import failed', 2800, 'error');
      return;
    }
    if (!Array.isArray(res.tracks) || res.tracks.length === 0) {
      const debugHint = res?.debug ? ` (${res.debug.matchedTracks}/${res.debug.searchedTracks} matched${res.debug.missedSamples?.length ? ` • sample misses: ${res.debug.missedSamples.slice(0, 2).join(' | ')}` : ''})` : '';
      setSpotifyImportProgress({
        stage: 'complete',
        progress: 100,
        message: `Imported the shell for "${res.playlistName}", but no playable matches were found${debugHint}.`
      });
      flashLastAdded('No playable tracks found', 2600, 'warning');
      return;
    }
    const providerLabel = provider === 'apple' ? 'Apple Music' : 'Spotify';
    const playlistName = spotifyImportPlaylistName.trim() || res.playlistName || `${providerLabel} Playlist`;
    const uniquePlaylistName = buildUniquePlaylistName(playlistName, playlists);
    const importedTracks = res.tracks.map(normalizeQueueTrack).filter(Boolean);
    const importedKeys = new Set();
    const duplicateCount = importedTracks.reduce((count, track) => {
      const key = normalizeTrackIdentity(track);
      if (importedKeys.has(key)) return count + 1;
      importedKeys.add(key);
      return count;
    }, 0);
    setImportReview({
      source: providerLabel,
      playlistName: uniquePlaylistName,
      matched: importedTracks.length,
      total: Number(res.totalTracks) || importedTracks.length,
      duplicates: duplicateCount,
      lyrics: 0,
      skipped: Math.max(0, (Number(res.totalTracks) || importedTracks.length) - importedTracks.length),
      suggestions: [duplicateCount > 0 ? 'Run Playlist Health to remove duplicate matches.' : '', importedTracks.length < (Number(res.totalTracks) || importedTracks.length) ? 'Some source tracks could not be matched. Try local import for exact files.' : '', 'Open the new vault and use Download Missing for offline readiness.'].filter(Boolean)
    });
    const nextPlaylists = {
      ...playlists,
      [uniquePlaylistName]: importedTracks
    };
    setPlaylists(nextPlaylists);
    persistPlaylistOrder([...playlistOrder.filter(name => name !== uniquePlaylistName), uniquePlaylistName]);
    window.aether?.store?.set('playlists', nextPlaylists);
    setViewingPlaylist(uniquePlaylistName);
    flashLastAdded(`Imported ${importedTracks.length}/${res.totalTracks} ${providerLabel} tracks`, 3500, 'success');
    setIsSpotifyImportOpen(false);
    setSpotifyImportUrl('');
    setSpotifyImportPlaylistName('');
    setMusicImportProvider('');
    setSpotifyImportProgress({
      stage: 'complete',
      progress: 100,
      message: `Imported ${importedTracks.length}/${res.totalTracks} tracks`
    });
  } catch (err) {
    const message = err?.message || 'Playlist import failed.';
    appendSpotifyImportLog(`exception ${message}`);
    setSpotifyImportProgress({
      stage: 'error',
      progress: 0,
      message
    });
    flashLastAdded('Playlist import failed', 2800, 'error');
  } finally {
    setIsSpotifyImporting(false);
  }
};
}
