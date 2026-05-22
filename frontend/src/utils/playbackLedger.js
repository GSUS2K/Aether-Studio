export const createPlaybackLedgerData = () => ({
  tracks: {},
  artists: {},
  totalMinutes: 0,
  totalMs: 0,
  totalPlays: 0,
  totalSessions: 0,
  hourlyTrends: {},
  weeklyTrends: {},
  dailyMinutes: {},
  dailyPlays: {},
  genres: {},
  recentSessions: [],
});
export const safeMetricMap = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => key !== '__proto__')
      .map(([key, value]) => [key, Math.max(0, Math.floor(Number(value) || 0))]),
  );
};
export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export const formatPlaybackDuration = (ms) => {
  const safeMs = Math.max(0, Math.floor(Number(ms) || 0));
  const totalMinutes = Math.round(safeMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${hours}h`;
};
export const normalizePlaybackLedgerData = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const next = createPlaybackLedgerData();

  next.tracks = Object.fromEntries(
    Object.entries(source.tracks || {})
      .filter(([key]) => key !== '__proto__')
      .map(([id, entry]) => {
        const trackEntry = entry && typeof entry === 'object' ? entry : {};
        return [id, {
          count: Math.max(0, Math.floor(Number(trackEntry.count) || 0)),
          totalMs: Math.max(0, Math.floor(Number(trackEntry.totalMs) || 0)),
          title: String(trackEntry.title || 'Unknown track'),
          author: String(trackEntry.author || 'Unknown artist'),
          thumbnail: String(trackEntry.thumbnail || ''),
          lastListened: trackEntry.lastListened || null,
          lastCompletedAt: trackEntry.lastCompletedAt || null,
        }];
      }),
  );

  next.artists = Object.fromEntries(
    Object.entries(source.artists || {})
      .filter(([key]) => key !== '__proto__')
      .map(([name, entry]) => {
        const artistEntry = entry && typeof entry === 'object' ? entry : {};
        return [name, {
          count: Math.max(0, Math.floor(Number(artistEntry.count) || 0)),
          totalMs: Math.max(0, Math.floor(Number(artistEntry.totalMs) || 0)),
        }];
      }),
  );

  next.hourlyTrends = safeMetricMap(source.hourlyTrends);
  next.weeklyTrends = safeMetricMap(source.weeklyTrends);
  next.dailyMinutes = safeMetricMap(source.dailyMinutes);
  next.dailyPlays = safeMetricMap(source.dailyPlays);
  next.genres = safeMetricMap(source.genres);
  next.recentSessions = Array.isArray(source.recentSessions)
    ? source.recentSessions
      .filter((entry) => entry && typeof entry === 'object')
      .slice(0, 24)
      .map((entry) => ({
        id: String(entry.id || `${entry.trackId || 'session'}-${entry.endedAt || entry.startedAt || Date.now()}`),
        trackId: String(entry.trackId || ''),
        title: String(entry.title || 'Unknown track'),
        author: String(entry.author || 'Unknown artist'),
        thumbnail: String(entry.thumbnail || ''),
        playedMs: Math.max(0, Math.floor(Number(entry.playedMs) || 0)),
        completed: Boolean(entry.completed),
        startedAt: entry.startedAt || null,
        endedAt: entry.endedAt || null,
        reason: String(entry.reason || 'session'),
      }))
    : [];

  const sumTrackMs = Object.values(next.tracks).reduce((total, entry) => total + Math.max(0, Math.floor(Number(entry.totalMs) || 0)), 0);
  const sumTrackPlays = Object.values(next.tracks).reduce((total, entry) => total + Math.max(0, Math.floor(Number(entry.count) || 0)), 0);
  const sourceTotalMs = Math.max(0, Math.floor(Number(source.totalMs) || 0));
  const sourceTotalMinutes = Math.max(0, Math.floor(Number(source.totalMinutes) || 0));

  next.totalMs = sourceTotalMs || sumTrackMs || (sourceTotalMinutes * 60000);
  next.totalMinutes = next.totalMs > 0 ? Math.round(next.totalMs / 60000) : sourceTotalMinutes;
  next.totalPlays = Math.max(0, Math.floor(Number(source.totalPlays) || 0)) || sumTrackPlays;
  next.totalSessions = Math.max(
    0,
    Math.floor(Number(source.totalSessions) || 0),
    next.totalPlays,
    next.recentSessions.length,
  );

  return next;
};
export const scoreLedgerPayload = (payload) => {
  const data = normalizePlaybackLedgerData(payload);
  const totalTracksPlayed = Math.max(0, Math.floor(Number(data.totalPlays) || 0));
  const totalSessions = Math.max(0, Math.floor(Number(data.totalSessions) || 0));
  const totalMs = Math.max(0, Math.floor(Number(data.totalMs) || 0));
  const tracks = Object.keys(data.tracks || {}).length;
  const sessions = Array.isArray(data.recentSessions) ? data.recentSessions.length : 0;
  return { data, score: (totalTracksPlayed * 1000000) + (totalSessions * 100000) + totalMs + (tracks * 1000) + sessions };
};
