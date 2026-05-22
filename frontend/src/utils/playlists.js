export const buildUniquePlaylistName = (baseName, playlists = {}, ignoreName = '') => {
  const cleanBase = String(baseName || 'Playlist').trim() || 'Playlist';
  if (!playlists?.[cleanBase] || cleanBase === ignoreName) return cleanBase;
  let index = 2;
  let candidate = `${cleanBase} ${index}`;
  while (playlists?.[candidate] && candidate !== ignoreName) {
    index += 1;
    candidate = `${cleanBase} ${index}`;
  }
  return candidate;
};
