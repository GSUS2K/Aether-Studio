export const normalizeManualLyricsLine = (line) => ({
  time: Number.isFinite(Number(line?.time)) ? Math.max(0, Math.trunc(Number(line.time))) : 0,
  text: String(line?.text || '').replace(/\r/g, '').trim(),
});

export const sortManualLyricsLines = (lines = []) => (Array.isArray(lines) ? lines : [])
  .map(normalizeManualLyricsLine)
  .filter((line) => line.text.length > 0 || line.time >= 0)
  .sort((left, right) => left.time - right.time);

export const formatManualLyricsTimestamp = (ms = 0) => {
  const safeMs = Math.max(0, Math.trunc(Number(ms) || 0));
  const totalCentiseconds = Math.round(safeMs / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]`;
};

export const parseManualLyricsTimestamp = (value) => {
  const raw = String(value ?? '').trim().replace(/^\[|\]$/g, '');
  const match = raw.match(/^(\d+):(\d{1,2})(?:[.:](\d{1,3}))?$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = match[3] ? Number(String(match[3]).padEnd(3, '0').slice(0, 3)) : 0;
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(fraction)) return null;
  return ((minutes * 60) + seconds) * 1000 + fraction;
};

export const manualLyricsLinesToLrc = (lines = []) => sortManualLyricsLines(lines)
  .map((line) => `${formatManualLyricsTimestamp(line.time)}${line.text}`)
  .join('\n');

export const parseManualLyricsLrcText = (input = '') => {
  const lines = String(input || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = [];
  for (const rawLine of lines) {
    const timestampMatches = [...rawLine.matchAll(/\[(\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/g)];
    const lyricText = rawLine.replace(/\[(\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/g, '').trim();
    if (!lyricText || timestampMatches.length === 0) continue;
    for (const match of timestampMatches) {
      const parsedTime = parseManualLyricsTimestamp(match[1]);
      if (Number.isFinite(parsedTime)) {
        parsed.push({
          time: parsedTime,
          text: lyricText,
          timestamp: formatManualLyricsTimestamp(parsedTime).slice(1, -1),
        });
      }
    }
  }

  return sortManualLyricsLines(parsed).map((line) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: line.time,
    timestamp: formatManualLyricsTimestamp(line.time).slice(1, -1),
    text: line.text,
  }));
};
