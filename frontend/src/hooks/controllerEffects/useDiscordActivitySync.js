import { useEffect, useMemo, useRef } from 'react';

const normalizeDurationSeconds = track => {
  if (!track) return 0;
  const raw = Number(track.totalDurationMs ?? track.durationMs ?? track.duration ?? 0) || 0;
  if (raw <= 0) return 0;
  const looksLikeMs = Boolean(track.totalDurationMs || track.durationMs || raw > 1000);
  return Math.max(0, Math.floor(looksLikeMs ? raw / 1000 : raw));
};

export function useDiscordActivitySync(props) {
  const {
    IDLE_PHRASES,
    currentTimeRef,
    idlePhraseRef,
    idleStartTimeRef,
    isPlaying,
    isStandalone,
    lastRPCPlayingRef,
    lastRPCTrackIdRef,
    partyInfo,
    queue,
    videoMode
  } = props;

  const track = queue?.[0] || null;
  const trackDetails = useMemo(() => {
    if (!track) return null;
    const key = String(track.id || track.youtubeId || `${track.title || ''}|${track.author || ''}`);
    return {
      key,
      title: track.title || 'Untitled track',
      artist: track.author || 'Unknown artist',
      thumbnail: track.thumbnail || '',
      url: track.actualUrl || track.url || '',
      durationSeconds: normalizeDurationSeconds(track)
    };
  }, [track]);
  const partyKey = useMemo(() => JSON.stringify(partyInfo || {}), [partyInfo]);
  const activityRef = useRef({
    isPlaying,
    partyInfo,
    trackDetails,
    videoMode
  });

  useEffect(() => {
    activityRef.current = {
      isPlaying,
      partyInfo,
      trackDetails,
      videoMode
    };
  }, [isPlaying, partyInfo, trackDetails, videoMode]);

  useEffect(() => {
    if (!isStandalone || !window.aether?.updateRPC) return undefined;

    let idleInterval = null;
    let trackInterval = null;
    let seekInterval = null;
    const lastSentRef = {
      current: {
        key: '',
        isPlaying: null,
        isVideo: null,
        partyKey: '',
        seconds: -1
      }
    };

    const getIdlePhrase = () => {
      if (!idlePhraseRef.current) {
        idlePhraseRef.current = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)] || 'Ready when you are';
      }
      return idlePhraseRef.current;
    };

    const sendTrackActivity = (force = false) => {
      const live = activityRef.current;
      if (!live.trackDetails) return;
      const currentSeconds = Math.max(0, Math.floor((currentTimeRef.current || 0) / 1000));
      const sent = lastSentRef.current;
      const isVideo = Boolean(live.videoMode);
      const livePartyKey = JSON.stringify(live.partyInfo || {});
      const changed =
        sent.key !== live.trackDetails.key ||
        sent.isPlaying !== live.isPlaying ||
        sent.isVideo !== isVideo ||
        sent.partyKey !== livePartyKey ||
        Math.abs(currentSeconds - sent.seconds) >= 4;

      if (!force && !changed) return;
      lastSentRef.current = {
        key: live.trackDetails.key,
        isPlaying: live.isPlaying,
        isVideo,
        partyKey: livePartyKey,
        seconds: currentSeconds
      };
      lastRPCTrackIdRef.current = live.trackDetails.key;
      lastRPCPlayingRef.current = live.isPlaying;
      idleStartTimeRef.current = null;
      idlePhraseRef.current = null;
      window.aether.updateRPC({
        hasTrack: true,
        title: live.trackDetails.title,
        artist: live.trackDetails.artist,
        thumbnail: live.trackDetails.thumbnail,
        isPlaying: live.isPlaying,
        isVideo,
        url: live.trackDetails.url,
        currentTime: currentSeconds,
        duration: live.trackDetails.durationSeconds,
        ...(live.partyInfo || {})
      });
    };

    const sendIdleActivity = () => {
      const live = activityRef.current;
      lastRPCTrackIdRef.current = null;
      lastRPCPlayingRef.current = null;
      if (!idleStartTimeRef.current) idleStartTimeRef.current = Date.now();
      window.aether.updateRPC({
        idle: true,
        hasTrack: false,
        title: 'Music Lobby',
        artist: getIdlePhrase(),
        isPlaying: false,
        startTime: idleStartTimeRef.current,
        ...(live.partyInfo || {})
      });
    };

    if (trackDetails) {
      sendTrackActivity(true);
      trackInterval = window.setInterval(() => sendTrackActivity(true), 30000);
      seekInterval = window.setInterval(() => sendTrackActivity(false), 1000);
    } else {
      sendIdleActivity();
      idleInterval = window.setInterval(() => {
        let next = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)] || 'Ready when you are';
        if (IDLE_PHRASES.length > 1) {
          while (next === idlePhraseRef.current) {
            next = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)] || 'Ready when you are';
          }
        }
        idlePhraseRef.current = next;
        sendIdleActivity();
      }, 8000);
    }

    return () => {
      if (idleInterval) window.clearInterval(idleInterval);
      if (trackInterval) window.clearInterval(trackInterval);
      if (seekInterval) window.clearInterval(seekInterval);
    };
  }, [IDLE_PHRASES, currentTimeRef, idlePhraseRef, idleStartTimeRef, isStandalone, lastRPCPlayingRef, lastRPCTrackIdRef, partyKey, trackDetails]);
}
