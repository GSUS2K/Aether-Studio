/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMemo } from 'react';

export function useSoundLedgerView(props) {
  const {
    getLocalDateKey, normalizePlaybackLedgerData, soundCapsuleData
  } = props;
  return useMemo(() => {
  const data = normalizePlaybackLedgerData(soundCapsuleData);
  const totalTracksPlayed = data.totalPlays || Object.values(data.tracks || {}).reduce((total, entry) => total + Math.max(0, Math.floor(Number(entry?.count) || 0)), 0);
  const totalMs = Math.max(0, Math.floor(Number(data.totalMs) || (Number(data.totalMinutes) || 0) * 60000));
  const recentWeek = Array.from({
    length: 7
  }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = getLocalDateKey(date);
    return {
      key,
      label: date.toLocaleDateString(undefined, {
        weekday: 'short'
      }).slice(0, 3).toUpperCase(),
      minutesMs: Math.max(0, Math.floor(Number(data.dailyMinutes?.[key]) || 0)),
      plays: Math.max(0, Math.floor(Number(data.dailyPlays?.[key]) || 0))
    };
  });
  const peakHours = Array.from({
    length: 24
  }, (_, hour) => ({
    hour,
    label: hour === 0 ? '12A' : hour === 12 ? '12P' : hour > 12 ? `${hour - 12}P` : `${hour}A`,
    count: Math.max(0, Math.floor(Number(data.hourlyTrends?.[hour]) || 0))
  }));
  const topArtists = Object.entries(data.artists || {}).sort((left, right) => {
    const countDiff = Math.max(0, Math.floor(Number(right[1]?.count) || 0)) - Math.max(0, Math.floor(Number(left[1]?.count) || 0));
    if (countDiff !== 0) return countDiff;
    return Math.max(0, Math.floor(Number(right[1]?.totalMs) || 0)) - Math.max(0, Math.floor(Number(left[1]?.totalMs) || 0));
  }).slice(0, 6);
  const topTracks = Object.entries(data.tracks || {}).sort((left, right) => {
    const countDiff = Math.max(0, Math.floor(Number(right[1]?.count) || 0)) - Math.max(0, Math.floor(Number(left[1]?.count) || 0));
    if (countDiff !== 0) return countDiff;
    return Math.max(0, Math.floor(Number(right[1]?.totalMs) || 0)) - Math.max(0, Math.floor(Number(left[1]?.totalMs) || 0));
  }).slice(0, 8);
  const genreMix = Object.entries(data.genres || {}).sort((left, right) => Math.max(0, Math.floor(Number(right[1]) || 0)) - Math.max(0, Math.floor(Number(left[1]) || 0))).slice(0, 6);
  const recentSessions = Array.isArray(data.recentSessions) ? data.recentSessions.slice(0, 6) : [];
  const weekMaxMs = Math.max(1, ...recentWeek.map(entry => entry.minutesMs));
  const peakHourMax = Math.max(1, ...peakHours.map(entry => entry.count));
  const topWindow = [...Array.from({
    length: 24
  }, (_, hour) => ({
    hour,
    label: hour === 0 ? '12A' : hour === 12 ? '12P' : hour > 12 ? `${hour - 12}P` : `${hour}A`,
    count: Math.max(0, Math.floor(Number(data.hourlyTrends?.[hour]) || 0))
  }))].sort((left, right) => right.count - left.count).filter(entry => entry.count > 0).slice(0, 3);
  return {
    totalTracksPlayed,
    totalMs,
    totalSessions: Math.max(0, Math.floor(Number(data.totalSessions) || totalTracksPlayed)),
    activeDays: recentWeek.filter(entry => entry.minutesMs > 0 || entry.plays > 0).length,
    recentWeek,
    weekMaxMs,
    peakHours,
    peakHourMax,
    topArtists,
    topTracks,
    genreMix,
    recentSessions,
    topWindow
  };
}, [soundCapsuleData]);
}
