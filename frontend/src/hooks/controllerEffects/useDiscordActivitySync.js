import { useEffect } from 'react';

export function useDiscordActivitySync(props) {
  const {
    IDLE_PHRASES, currentTime, currentTimeRef, idlePhraseRef, idleStartTimeRef, isPlaying, isStandalone, lastRPCPlayingRef, lastRPCTrackIdRef, partyInfo, queue
  } = props;
  // --- AETHER: UNIFIED DISCORD RPC ENGINE (NOVA ---
useEffect(() => {
  if (!isStandalone || !window.aether?.updateRPC) return;
  let cycleInterval;
  const updateRPC = () => {
    const track = queue?.[0];
    const hasValidTrack = !!(track && typeof track === 'object');
    if (hasValidTrack) {
      const rpcTrackId = String(track.id || track.youtubeId || `${track.title || ''}|${track.author || ''}`);
      lastRPCTrackIdRef.current = rpcTrackId;
      lastRPCPlayingRef.current = isPlaying;
      idleStartTimeRef.current = null;
      idlePhraseRef.current = null;
      window.aether.updateRPC({
        title: track.title,
        artist: track.author,
        thumbnail: track.thumbnail,
        isPlaying: isPlaying,
        url: track.actualUrl || track.url || '',
        currentTime: Math.max(0, Math.floor(currentTimeRef.current || 0)),
        duration: Math.max(0, Math.floor(track.totalDurationMs || track.duration || 0)),
        ...(partyInfo || {})
      });
    } else {
      // Idle Lobby State
      lastRPCTrackIdRef.current = null;
      lastRPCPlayingRef.current = null;
      if (!idleStartTimeRef.current) {
        idleStartTimeRef.current = Date.now();
        idlePhraseRef.current = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)];
      }
      window.aether.updateRPC({
        title: "Music Lobby",
        artist: idlePhraseRef.current,
        startTime: idleStartTimeRef.current,
        ...(partyInfo || {})
      });

      // Start cycler if not already running
      if (!cycleInterval) {
        cycleInterval = setInterval(() => {
          if (queue && queue.length > 0) return; // Guard for async race

          let next;
          do {
            next = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)];
          } while (next === idlePhraseRef.current);
          idlePhraseRef.current = next;
          window.aether.updateRPC({
            title: "Music Lobby",
            artist: idlePhraseRef.current,
            startTime: idleStartTimeRef.current,
            ...(partyInfo || {})
          });
        }, 20000);
      }
    }
  };
  updateRPC();
  return () => {
    if (cycleInterval) {
      clearInterval(cycleInterval);
      cycleInterval = null;
    }
  };
}, [queue, isPlaying, isStandalone, currentTime, partyInfo]);

// Combined effect replaced the previous two RPC effects

// Handle Play/Pause sync
}
