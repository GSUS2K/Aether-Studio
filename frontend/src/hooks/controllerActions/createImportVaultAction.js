export function createImportVaultAction(props) {
  const {
    buildUniquePlaylistName, flashLastAdded, isStandalone, isVaultImporting, normalizeQueueTrack, persistPlaylistOrder, playlistOrder, playlists, setIsVaultImporting, setPlaylists, setViewingPlaylist
  } = props;
  return async () => {
  if (isVaultImporting) return;
  if (!isStandalone || !window.aether?.importVault) {
    flashLastAdded('Vault import unavailable', 2200, 'warning');
    return;
  }
  setIsVaultImporting(true);
  flashLastAdded('Importing vault...', 1600, 'warning');
  try {
    const res = await window.aether.importVault();
    if (res?.success && res.data && Array.isArray(res.data)) {
      const normalized = res.data.map(normalizeQueueTrack).filter(Boolean);
      const importName = buildUniquePlaylistName(res.name || 'Imported Vault', playlists);
      const p = {
        ...playlists
      };
      p[importName] = normalized;
      setPlaylists(p);
      window.aether?.store?.set('playlists', p);
      if (!playlistOrder.includes(importName)) {
        persistPlaylistOrder([...playlistOrder, importName]);
      }
      setViewingPlaylist(importName);
      flashLastAdded(`Imported vault: ${importName} (${normalized.length})`, 2800, 'success');
    } else if (res?.cancel) {
      flashLastAdded('Vault import cancelled', 1800, 'warning');
    } else {
      flashLastAdded(`Import failed${res?.error ? `: ${String(res.error).slice(0, 36)}` : ''}`, 3000, 'error');
    }
  } catch (error) {
    flashLastAdded(`Import failed${error?.message ? `: ${String(error.message).slice(0, 36)}` : ''}`, 3000, 'error');
  } finally {
    setIsVaultImporting(false);
  }
};
}
