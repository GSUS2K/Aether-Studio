const cleanText = value => String(value || '').trim();
const normalizeKey = value => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

export function getTrackArtist(track = {}) {
  return cleanText(track.author || track.artist || track.channelTitle || 'Unknown Artist') || 'Unknown Artist';
}

export function getTrackTitle(track = {}) {
  return cleanText(track.title || track.name || 'Untitled Track') || 'Untitled Track';
}

export function getTrackKind(track = {}, downloadedIds = new Set(), resolveId = null) {
  const id = resolveId ? resolveId(track) : (track.youtubeId || track.id || track.url);
  if (id && downloadedIds.has(String(id))) return 'offline';
  const title = getTrackTitle(track).toLowerCase();
  const url = cleanText(track.url || track.actualUrl || track.sourceUrl).toLowerCase();
  if (/\b(video|official mv|music video|visualizer|live)\b/.test(title) || url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
  return 'audio';
}

export function buildArtistCatalog(songEntries = [], options = {}) {
  const { downloadedIds = new Set(), resolveId = null, maxTracksPerArtist = 120 } = options;
  const artists = new Map();

  for (const entry of songEntries || []) {
    const track = entry?.track || entry;
    if (!track) continue;
    const name = getTrackArtist(track);
    const key = normalizeKey(name);
    if (!key) continue;
    const id = resolveId ? resolveId(track) : (track.youtubeId || track.id || `${getTrackTitle(track)}-${name}`);
    const kind = getTrackKind(track, downloadedIds, resolveId);
    const artist = artists.get(key) || {
      id: key,
      name,
      tracks: [],
      trackIds: new Set(),
      audio: 0,
      video: 0,
      offline: 0,
      playlists: new Set(),
      thumbnail: '',
    };
    if (!artist.trackIds.has(String(id))) {
      artist.trackIds.add(String(id));
      artist.tracks.push({ ...track, mediaKind: kind, libraryPlaylists: entry?.playlists || [] });
      if (kind === 'audio') artist.audio += 1;
      if (kind === 'video') artist.video += 1;
      if (kind === 'offline') artist.offline += 1;
      if (!artist.thumbnail && track.thumbnail) artist.thumbnail = track.thumbnail;
      (entry?.playlists || []).forEach(name => artist.playlists.add(name));
    }
    artists.set(key, artist);
  }

  return [...artists.values()]
    .map(artist => ({
      ...artist,
      tracks: artist.tracks.slice(0, maxTracksPerArtist),
      trackCount: artist.tracks.length,
      playlistNames: [...artist.playlists].slice(0, 8),
    }))
    .sort((left, right) => right.trackCount - left.trackCount || left.name.localeCompare(right.name));
}

export function filterArtistTracks(artist, filter = 'all', sort = 'popular', helpers = {}) {
  const { getTrackPlayCount = () => 0, getTrackLastListenedMs = () => 0 } = helpers;
  const tracks = [...(artist?.tracks || [])].filter(track => filter === 'all' || track.mediaKind === filter);
  tracks.sort((left, right) => {
    if (sort === 'title') return getTrackTitle(left).localeCompare(getTrackTitle(right));
    if (sort === 'recent') return getTrackLastListenedMs(right) - getTrackLastListenedMs(left);
    if (sort === 'video') return (right.mediaKind === 'video') - (left.mediaKind === 'video') || getTrackTitle(left).localeCompare(getTrackTitle(right));
    return getTrackPlayCount(right) - getTrackPlayCount(left) || getTrackTitle(left).localeCompare(getTrackTitle(right));
  });
  return tracks;
}

export function buildSearchSuggestions({ query, songEntries = [], artists = [], playlistNames = [], history = [], limit = 8 }) {
  const needle = normalizeKey(query);
  if (needle.length < 2) return [];
  const suggestions = [];
  const seen = new Set();
  const push = item => {
    const key = `${item.type}:${normalizeKey(item.value || item.title)}`;
    if (seen.has(key) || suggestions.length >= limit) return;
    seen.add(key);
    suggestions.push(item);
  };

  for (const artist of artists) {
    if (normalizeKey(artist.name).includes(needle)) {
      push({ type: 'artist', title: artist.name, detail: `${artist.trackCount} tracks • ${artist.video} videos`, value: artist.name, thumbnail: artist.thumbnail });
    }
  }

  for (const entry of songEntries || []) {
    const track = entry?.track || entry;
    const title = getTrackTitle(track);
    const artist = getTrackArtist(track);
    if (`${normalizeKey(title)} ${normalizeKey(artist)}`.includes(needle)) {
      push({ type: 'track', title, detail: artist, value: `${title} ${artist}`, thumbnail: track.thumbnail });
    }
  }

  for (const name of playlistNames || []) {
    if (normalizeKey(name).includes(needle)) push({ type: 'vault', title: name, detail: 'Vault', value: name });
  }

  for (const item of history || []) {
    if (normalizeKey(item).includes(needle)) push({ type: 'recent', title: item, detail: 'Recent search', value: item });
  }

  return suggestions;
}

export function buildDiscoveryHome({ artists = [], recentTracks = [], favoriteTracks = [], currentTrack = null }) {
  const currentArtist = currentTrack ? artists.find(artist => normalizeKey(artist.name) === normalizeKey(getTrackArtist(currentTrack))) : null;
  return {
    currentArtist,
    topArtists: artists.slice(0, 6),
    recentTracks: (recentTracks || []).slice(0, 8),
    favoriteTracks: (favoriteTracks || []).slice(0, 8),
  };
}
