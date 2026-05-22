import { useEffect } from 'react';

export function useVideoQueueResolver(props) {
  const {
    extractYouTubeId, isOfflineMode, isStandalone, queue, setQueue, videoMode
  } = props;
  // Resolve missing YouTube ID when user enters video mode from vault/playlist tracks.
useEffect(() => {
  if (isOfflineMode || !isStandalone || !videoMode || !queue?.[0] || !window.aether?.search) return;
  const track = queue[0];
  if (track.youtubeId || track.videoResolveAttempted) return;
  const searchQuery = [track.author, track.title].filter(Boolean).join(' ').trim() || track.title || '';
  if (!searchQuery) return;
  setQueue(current => {
    if (!Array.isArray(current) || current.length === 0) return current;
    const head = current[0];
    if (head.queueNonce !== track.queueNonce) return current;
    if (head.youtubeId || head.videoResolveAttempted) return current;
    return [{
      ...head,
      videoResolveAttempted: true
    }, ...current.slice(1)];
  });
  console.log('[Aether/Video] Resolving missing YouTube ID for video mode', {
    title: track.title,
    author: track.author,
    searchQuery
  });
  (async () => {
    try {
      const results = await window.aether.search(searchQuery);
      const candidates = Array.isArray(results) ? results : [];
      const best = candidates.find(item => {
        const idFromResult = item?.youtubeId || extractYouTubeId(item?.actualUrl || item?.url || item?.id);
        return Boolean(idFromResult);
      });
      const resolvedYoutubeId = best?.youtubeId || extractYouTubeId(best?.actualUrl || best?.url || best?.id);
      if (!resolvedYoutubeId) return;
      setQueue(current => {
        if (!Array.isArray(current) || current.length === 0) return current;
        const head = current[0];
        if (head.queueNonce !== track.queueNonce) return current;
        if (head.youtubeId) return current;
        return [{
          ...head,
          youtubeId: resolvedYoutubeId,
          actualUrl: `https://www.youtube.com/watch?v=${resolvedYoutubeId}`,
          url: `https://www.youtube.com/watch?v=${resolvedYoutubeId}`,
          thumbnail: head.thumbnail || `https://i.ytimg.com/vi/${resolvedYoutubeId}/hqdefault.jpg`
        }, ...current.slice(1)];
      });
      console.log('[Aether/Video] Resolved YouTube ID for queued track', {
        title: track.title,
        youtubeId: resolvedYoutubeId
      });
    } catch (err) {
      console.warn('[Aether/Video] Failed to resolve YouTube ID for queued track', {
        title: track.title,
        error: err?.message || err
      });
    }
  })();
}, [isOfflineMode, isStandalone, videoMode, queue]);
}
