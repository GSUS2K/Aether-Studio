export const encodeScenePayload = (payload) => {
  try {
    const json = JSON.stringify(payload);
    const bytes = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
    return btoa(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return null;
  }
};

export const decodeScenePayload = (encoded) => {
  try {
    const normalized = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    const raw = atob(normalized + pad);
    const json = decodeURIComponent(Array.from(raw).map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const extractSceneYouTubeId = (value) => {
  const text = String(value || '');
  const match = text.match(/(?:v=|\/vi\/|\/v\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || null;
};

export const normalizeScenePayload = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const youtubeId = String(raw.youtubeId || raw.y || extractSceneYouTubeId(raw.thumbnail || raw.th || raw.source || ''));
  const thumbnail = String(raw.thumbnail || raw.th || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : ''));
  return {
    title: String(raw.title || raw.t || 'Aether Scene').slice(0, 140),
    author: String(raw.author || raw.a || 'Unknown Artist').slice(0, 100),
    lyric: String(raw.lyric || raw.l || 'No lyric locked yet').slice(0, 180),
    thumbnail,
    youtubeId,
    at: Math.max(0, Number(raw.at || raw.time || 0)),
    total: Math.max(0, Number(raw.total || raw.to || 0)),
    state: String(raw.state || (raw.s === 1 ? 'playing' : 'paused')),
    mode: String(raw.mode || (raw.m === 1 ? 'pulse' : 'bars')),
    pulse: {
      e: Math.max(0, Number(raw?.pulse?.e ?? raw?.p?.[0] ?? 0)),
      b: Math.max(0, Number(raw?.pulse?.b ?? raw?.p?.[1] ?? 0)),
      m: Math.max(0, Number(raw?.pulse?.m ?? raw?.p?.[2] ?? 0)),
      h: Math.max(0, Number(raw?.pulse?.h ?? raw?.p?.[3] ?? 0)),
    },
    theme: String(raw.theme || raw.c || '#00ffbf'),
  };
};
