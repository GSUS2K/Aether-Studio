import { useEffect } from 'react';

export function useBufferingRescue(props) {
  const {
    bufferingRescueRef, currentTimeRef, currentTrack, flashLastAdded, isAudioBuffering, isPlaying, isStandalone, localAudioRef, setIsAudioBuffering, setIsPlaying, setOauthPrompt, streamPort, videoModeRef, youtubeAuthRequiredRef
  } = props;
  useEffect(() => {
  if (!isStandalone || !isPlaying || !isAudioBuffering || !currentTrack || !localAudioRef.current || videoModeRef.current) return;
  // Rescue only during startup buffering. Mid-song stalls should recover naturally without forced source switch.
  if ((currentTimeRef.current || 0) > 5000) return;
  const trackKey = currentTrack.id || currentTrack.youtubeId || `${currentTrack.title || ''}|${currentTrack.author || ''}`;
  const timer = setTimeout(() => {
    const audio = localAudioRef.current;
    if (!audio || !isAudioBuffering) return;
    const now = Date.now();
    const sameTrack = bufferingRescueRef.current.trackKey === trackKey;
    const attempts = sameTrack ? bufferingRescueRef.current.attempts || 0 : 0;
    const lastAttemptAt = sameTrack ? bufferingRescueRef.current.lastAttemptAt || 0 : 0;

    // Backoff + cap to avoid infinite thrash while still giving enough chances to recover.
    if (attempts >= 3) {
      console.warn('[Aether/Audio] Buffering rescue exhausted; pausing playback to prevent screech loop', {
        trackId: currentTrack.id,
        title: currentTrack.title,
        attempts
      });
      audio.pause();
      setIsPlaying(false);
      setIsAudioBuffering(false);
      if (audio && !videoModeRef.current) audio.muted = false;
      return;
    }
    if (lastAttemptAt > 0 && now - lastAttemptAt < 6000) {
      return;
    }
    bufferingRescueRef.current = {
      trackKey,
      lastAttemptAt: now,
      attempts: attempts + 1
    };
    const sourceUrl = currentTrack.youtubeId ? `https://www.youtube.com/watch?v=${currentTrack.youtubeId}` : currentTrack.actualUrl || currentTrack.url;
    if (!sourceUrl) return;
    const rescueUrl = `http://localhost:${streamPort}/stream?url=${encodeURIComponent(sourceUrl)}&_r=${Date.now()}`;
    console.warn('[Aether/Audio] Buffering rescue triggered', {
      trackId: currentTrack.id,
      title: currentTrack.title,
      from: audio.src,
      to: rescueUrl,
      attempt: attempts + 1,
      readyState: audio.readyState,
      currentTime: audio.currentTime
    });
    audio.muted = true;
    audio.pause();
    audio.src = rescueUrl;
    audio.load();
    audio.play().catch(e => {
      console.error('[Aether/Audio] Buffering rescue failed', e);
      if (e?.name === 'NotSupportedError') {
        audio.pause();
        audio.muted = false;
        setIsPlaying(false);
        setIsAudioBuffering(false);
        if (youtubeAuthRequiredRef.current) {
          setOauthPrompt(prev => prev || {
            reason: 'YouTube rejected this stream. Upload a fresh cookies.txt file and try again.'
          });
          return;
        }
        flashLastAdded('Playback failed. Check cookies or try another result.', 3600, 'error');
      }
    });
  }, 8500);
  return () => clearTimeout(timer);
}, [isStandalone, isPlaying, isAudioBuffering, currentTrack?.id, currentTrack?.youtubeId, currentTrack?.title, currentTrack?.author, currentTrack?.actualUrl, currentTrack?.url, streamPort, flashLastAdded]);
}
