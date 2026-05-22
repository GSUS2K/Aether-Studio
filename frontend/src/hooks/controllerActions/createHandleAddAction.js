/* eslint-disable react-hooks/preserve-manual-memoization */
export function createHandleAddAction(props) {
  const {
    downloadedTracks, flashLastAdded, isOfflineMode, isStandalone, mergeTrackMetadata, normalizeQueueTrack, resolveWarmupTrackId, setAddingIds, setIsAutoplaySeeking, setIsManualStop, setIsPlaying, setLastAdded, setQueue, warmupTrack
  } = props;
  return async track => {
  if (isStandalone) {
    const addStartTime = Date.now();
    const newTrack = normalizeQueueTrack(track);
    if (!newTrack) {
      console.warn('[Aether/Queue] Ignored add: track has no playable URL', track);
      return;
    }
    const url = newTrack.actualUrl || newTrack.url;
    const stableId = newTrack.id;
    const resolvedOfflineId = resolveWarmupTrackId(newTrack);
    const canPlayOffline = !isOfflineMode || downloadedTracks.includes(String(resolvedOfflineId)) || downloadedTracks.includes(String(stableId));
    if (!canPlayOffline) {
      setLastAdded('Offline Mode can only queue downloaded tracks');
      window.setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const queueNonce = newTrack.queueNonce;
    console.log(`[Aether] Adding standalone track to queue: ${newTrack.title} (${url}) -> id=${stableId}`);
    setQueue(prev => {
      const next = [...prev, newTrack];
      if (next.length === 1) setIsPlaying(true);
      setIsManualStop(false); // Reset on manual add
      return next;
    });
    console.log(`[Aether] Track queued in ${Date.now() - addStartTime}ms`);
    flashLastAdded(`Queued: ${track.title || 'Track'}`, 2400, 'success');
    if (!isOfflineMode) {
      warmupTrack({
        ...newTrack,
        id: stableId,
        actualUrl: url,
        url,
        title: track.title
      });

      // --- AETHER: NEURAL METADATA SYNC (NOVA ---
      window.aether.getMetadata(newTrack.actualUrl || newTrack.url).then(fullTrack => {
        if (fullTrack) {
          setQueue(current => current.map(item => item.queueNonce === queueNonce ? mergeTrackMetadata(item, fullTrack) : item));
        }
      }).catch(() => {
        flashLastAdded('Metadata refresh failed', 2200, 'warning');
      });
    }
    return;
  }
  const newTrack = normalizeQueueTrack(track);
  if (!newTrack) {
    console.warn('[Aether/Queue] Ignored web add: track has no playable URL', track);
    return;
  }
  setAddingIds(prev => new Set(prev).add(track.id));
  try {
    console.log("[Aether/Add] Web local add request", {
      trackId: track.id,
      title: track.title,
      author: track.author,
      actualUrl: track.actualUrl,
      url: track.url
    });
    setQueue(prev => {
      const next = [...(Array.isArray(prev) ? prev : []), newTrack];
      if (next.length === 1) setIsPlaying(true);
      return next;
    });
    setIsManualStop(false);
    flashLastAdded(`Queued: ${track.title || 'Track'}`, 2400, 'success');
  } catch (err) {
    flashLastAdded('Add to queue failed', 2200, 'error');
  } finally {
    setAddingIds(prev => {
      const next = new Set(prev);
      next.delete(track.id);
      return next;
    });
    setIsAutoplaySeeking(false);
  }
};
}
