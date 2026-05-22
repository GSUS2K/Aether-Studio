export const formatTime = (ms) => {
  if (isNaN(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const parseLyricOffsetValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const direct = Number(raw);
  if (Number.isFinite(direct)) return Math.trunc(direct);
  const match = raw.match(/-?\d+/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

export const formatBytes = (bytes) => {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const scaled = value / (1024 ** power);
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[power]}`;
};
