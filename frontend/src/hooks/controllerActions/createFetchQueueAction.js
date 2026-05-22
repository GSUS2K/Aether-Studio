/* eslint-disable react-hooks/preserve-manual-memoization */
export function createFetchQueueAction(props) {
  const {
    API_BASE, axios, currentTimeRef, currentTrackTitle, getEffectiveGuildId, isPlayingRef, isStandalone, localAudioRef, setCurrentTime, setCurrentTrackTitle, setDiagnostics, setIsAudioBuffering, setIsPlaying, setQueue, updateDiscordRichPresence, webTrackLoadKeyRef, youtubePlayerRef
  } = props;
  return async () => {
  const startedAt = performance.now();
  try {
    const guildId = getEffectiveGuildId();
    const resp = await axios.get(`${API_BASE}/api/queue/${guildId}`);

    // Only pull remote queue if acting as Discord client (Standalone manages its own state)
    if (resp.data.songs && !isStandalone) setQueue(resp.data.songs);
    const queueLength = resp.data?.songs?.length || 0;
    if (!isStandalone && queueLength === 0) {
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentTrackTitle('');
      setIsAudioBuffering(false);
      webTrackLoadKeyRef.current = '';
      if (youtubePlayerRef.current?.stopVideo) {
        try {
          youtubePlayerRef.current.stopVideo();
        } catch {}
      }
      if (localAudioRef.current) {
        localAudioRef.current.pause();
        localAudioRef.current.removeAttribute('src');
        localAudioRef.current.load();
      }
    }
    const serverMs = resp.data.currentMs || 0;
    const liveCurrentTime = currentTimeRef.current;
    const liveIsPlaying = isPlayingRef.current;
    if (!isStandalone && queueLength > 0 && (Math.abs(liveCurrentTime - serverMs) > 1000 || liveCurrentTime === 0)) setCurrentTime(serverMs);
    // Only adopt isPlaying=true from the server (a new song started / resumed).
    // Never let another tab's paused heartbeat silence your local audio.
    // Each tab manages its own pause/resume independently after unlock.
    if (!isStandalone && resp.data.isPlaying === true && !liveIsPlaying) {
      setIsPlaying(true);
    }
    const track = resp.data.songs && resp.data.songs[0];
    if (track && track.title !== currentTrackTitle) {
      console.log("[Aether/Queue] New head track", {
        id: track.id,
        title: track.title,
        author: track.author,
        actualUrl: track.actualUrl,
        url: track.url
      });
      setCurrentTrackTitle(track.title);
      updateDiscordRichPresence(track, serverMs);
    }
    setDiagnostics(prev => ({
      ...prev,
      lastQueueFetchMs: Math.round(performance.now() - startedAt),
      lastQueueFetchAt: Date.now(),
      lastQueueError: null
    }));
  } catch (err) {
    console.error("[Aether/Queue] Fetch failed", err, {
      apiBase: API_BASE,
      guildId: getEffectiveGuildId()
    });
    setDiagnostics(prev => ({
      ...prev,
      lastQueueFetchAt: Date.now(),
      lastQueueError: err?.message || 'queue fetch failed'
    }));
  }
};
}
