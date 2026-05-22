/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useLogSoundCapsulePlayback(props) {
  const {
    PLAYBACK_GENRE_SIGNALS, PLAYBACK_LEDGER_STORAGE_KEY, currentTimeRef, getLocalDateKey, ledgerSessionRef, normalizePlaybackLedgerData, normalizeTrackIdentity, scoreLedgerPayload
  } = props;
  return useCallback(async (track, options = {}) => {
  if (!track) return;
  try {
    const candidatePayloads = [];
    if (window.aether?.store?.get) {
      candidatePayloads.push(await window.aether.store.get(PLAYBACK_LEDGER_STORAGE_KEY));
    }
    if (window.aether?.getPlaybackLedger) {
      candidatePayloads.push(await window.aether.getPlaybackLedger());
    }
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PLAYBACK_LEDGER_STORAGE_KEY);
      if (raw) candidatePayloads.push(JSON.parse(raw));
    }
    const data = candidatePayloads.map(payload => scoreLedgerPayload(payload)).sort((left, right) => right.score - left.score)[0]?.data || normalizePlaybackLedgerData(null);
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const playedMs = Math.max(0, Math.floor(Number(currentTimeRef.current || 0)));
    const trackDurationMs = Math.max(0, Math.floor(Number(track.totalDurationMs || track.duration || 0)));
    const trackKey = track.id || track.youtubeId || normalizeTrackIdentity(track);
    const dateKey = getLocalDateKey(now);
    const completed = options.reason === 'natural_end' || trackDurationMs > 0 && playedMs >= trackDurationMs * 0.92;
    const sessionState = ledgerSessionRef.current;
    const sessionId = sessionState.trackKey === trackKey && sessionState.id ? sessionState.id : `${trackKey || 'track'}-${track.queueNonce || now.getTime()}`;
    const previousLoggedMs = sessionState.trackKey === trackKey && sessionState.id === sessionId ? Math.max(0, Math.floor(Number(sessionState.lastLoggedMs) || 0)) : 0;
    const deltaMs = Math.max(0, playedMs - previousLoggedMs);
    const shouldCountSession = !(sessionState.trackKey === trackKey && sessionState.id === sessionId && sessionState.counted);
    const isFinalWrite = options.reason === 'natural_end' || options.reason === 'skip' || options.reason === 'previous' || options.final;
    const hasMeaningfulProgress = playedMs >= 15000 || completed || isFinalWrite;
    const shouldPersist = hasMeaningfulProgress && (shouldCountSession || deltaMs >= 12000 || isFinalWrite);
    if (!trackKey || !shouldPersist) return;
    if (!data.tracks[trackKey]) {
      data.tracks[trackKey] = {
        count: 0,
        totalMs: 0,
        title: track.title,
        author: track.author,
        thumbnail: track.thumbnail,
        lastListened: null,
        lastCompletedAt: null
      };
    }
    if (shouldCountSession) data.tracks[trackKey].count += 1;
    data.tracks[trackKey].totalMs = Math.max(0, Math.floor(Number(data.tracks[trackKey].totalMs) || 0)) + deltaMs;
    data.tracks[trackKey].title = track.title || data.tracks[trackKey].title;
    data.tracks[trackKey].author = track.author || data.tracks[trackKey].author;
    data.tracks[trackKey].thumbnail = track.thumbnail || data.tracks[trackKey].thumbnail;
    data.tracks[trackKey].lastListened = now.toISOString();
    if (completed) data.tracks[trackKey].lastCompletedAt = now.toISOString();
    const author = track.author?.trim();
    if (author) {
      if (!data.artists[author]) data.artists[author] = {
        count: 0,
        totalMs: 0
      };
      if (shouldCountSession) data.artists[author].count += 1;
      data.artists[author].totalMs = Math.max(0, Math.floor(Number(data.artists[author].totalMs) || 0)) + deltaMs;
    }
    data.dailyMinutes[dateKey] = (data.dailyMinutes[dateKey] || 0) + deltaMs;
    if (shouldCountSession) {
      data.hourlyTrends[hour] = (data.hourlyTrends[hour] || 0) + 1;
      data.weeklyTrends[day] = (data.weeklyTrends[day] || 0) + 1;
      data.dailyPlays[dateKey] = (data.dailyPlays[dateKey] || 0) + 1;
    }
    const titleLower = track.title?.toLowerCase() || '';
    const authorLower = track.author?.toLowerCase() || '';
    const explicitGenre = String(track.genre || track.category || track.mood || '').toLowerCase().trim();
    if (shouldCountSession) {
      if (explicitGenre) {
        const genreKey = explicitGenre.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
        if (genreKey) data.genres[genreKey] = (data.genres[genreKey] || 0) + 1;
      }
      PLAYBACK_GENRE_SIGNALS.forEach(signal => {
        if (titleLower.includes(signal) || authorLower.includes(signal) || explicitGenre.includes(signal)) {
          data.genres[signal] = (data.genres[signal] || 0) + 1;
        }
      });
    }
    data.totalMs = Math.max(0, Math.floor(Number(data.totalMs) || 0)) + deltaMs;
    data.totalMinutes = Math.round(data.totalMs / 60000);
    if (shouldCountSession) {
      data.totalPlays = Math.max(0, Math.floor(Number(data.totalPlays) || 0)) + 1;
      data.totalSessions = Math.max(0, Math.floor(Number(data.totalSessions) || 0)) + 1;
    }
    const existingSession = (Array.isArray(data.recentSessions) ? data.recentSessions : []).find(entry => entry?.id === sessionId);
    data.recentSessions = [{
      id: sessionId,
      trackId: String(trackKey || ''),
      title: String(track.title || 'Unknown track'),
      author: String(track.author || 'Unknown artist'),
      thumbnail: String(track.thumbnail || ''),
      playedMs: Math.max(playedMs, Math.floor(Number(existingSession?.playedMs) || 0)),
      completed: Boolean(completed || existingSession?.completed),
      startedAt: existingSession?.startedAt || now.toISOString(),
      endedAt: now.toISOString(),
      reason: String(options.reason || 'session')
    }, ...(Array.isArray(data.recentSessions) ? data.recentSessions : []).filter(entry => entry?.id !== sessionId)].slice(0, 24);
    if (window.aether?.store?.set) {
      await window.aether.store.set(PLAYBACK_LEDGER_STORAGE_KEY, data);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PLAYBACK_LEDGER_STORAGE_KEY, JSON.stringify(data));
    }
    ledgerSessionRef.current = {
      id: sessionId,
      trackKey,
      counted: true,
      lastLoggedMs: Math.max(playedMs, previousLoggedMs)
    };
  } catch (e) {
    console.error('[Aether] Sound capsule write failed', e);
  }
}, [normalizeTrackIdentity]);
}
