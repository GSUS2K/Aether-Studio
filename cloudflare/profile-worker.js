export default {
  async fetch(request, env) {
    return handleProfileApi(request, env);
  }
};

const PROFILE_MAX_AGE_SECONDS = 60;
const PROFILE_ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'https://aetherstudio.me',
]);

async function handleProfileApi(request, env) {
  const url = new URL(request.url);
  const corsHeaders = buildCorsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (!env?.AETHER_PROFILES) {
    return jsonResponse({ error: 'Profile storage is not configured. Bind KV as AETHER_PROFILES.' }, 503, corsHeaders);
  }

  try {
    if (request.method === 'PUT' && /^\/v1\/profile\/[^/]+$/.test(url.pathname)) {
      return upsertProfile(request, env, corsHeaders);
    }
    if (request.method === 'DELETE' && /^\/v1\/profile\/[^/]+$/.test(url.pathname)) {
      return deleteProfile(request, env, corsHeaders);
    }
    if (request.method === 'GET' && /^\/v1\/profile\/handle\/[^/]+$/.test(url.pathname)) {
      const handle = normalizeHandle(url.pathname.split('/').pop());
      return getProfileByHandle(handle, request, env, corsHeaders);
    }
    if (request.method === 'GET' && /^\/v1\/profile\/share\/[^/]+$/.test(url.pathname)) {
      const shareId = normalizeId(url.pathname.split('/').pop());
      return getProfileById(shareId, request, env, corsHeaders);
    }
    if (request.method === 'GET' && url.pathname === '/v1/profiles/search') {
      return searchProfiles(url.searchParams.get('q'), env, corsHeaders);
    }
    return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: error?.message || 'Profile service failed.' }, 500, corsHeaders);
  }
}

async function upsertProfile(request, env, corsHeaders) {
  const profileId = normalizeId(new URL(request.url).pathname.split('/').pop());
  const secret = getBearerSecret(request);
  if (!profileId || !secret) return jsonResponse({ error: 'Missing profile id or authorization secret.' }, 401, corsHeaders);

  const body = await request.json().catch(() => null);
  const profile = normalizeProfile(body);
  const ownerHash = await sha256Hex(secret);
  const key = `profile:${profileId}`;
  const existing = await env.AETHER_PROFILES.get(key, 'json');
  if (existing?.ownerHash && existing.ownerHash !== ownerHash) {
    return jsonResponse({ error: 'This profile belongs to another install.' }, 403, corsHeaders);
  }

  if (profile.handle) {
    const handleKey = `handle:${profile.handle}`;
    const handleOwner = await env.AETHER_PROFILES.get(handleKey);
    if (handleOwner && handleOwner !== profileId) {
      return jsonResponse({ error: 'That handle is already taken.' }, 409, corsHeaders);
    }
    await env.AETHER_PROFILES.put(handleKey, profileId);
  }
  if (existing?.handle && existing.handle !== profile.handle) {
    await env.AETHER_PROFILES.delete(`handle:${existing.handle}`);
  }

  const saved = {
    ...profile,
    id: profileId,
    ownerHash,
    updatedAt: Date.now(),
  };
  await env.AETHER_PROFILES.put(key, JSON.stringify(saved));
  return jsonResponse({ ok: true, profile: publicProfile(saved) }, 200, corsHeaders);
}

async function deleteProfile(request, env, corsHeaders) {
  const profileId = normalizeId(new URL(request.url).pathname.split('/').pop());
  const secret = getBearerSecret(request);
  if (!profileId || !secret) return jsonResponse({ error: 'Missing profile id or authorization secret.' }, 401, corsHeaders);
  const key = `profile:${profileId}`;
  const existing = await env.AETHER_PROFILES.get(key, 'json');
  if (!existing) return jsonResponse({ ok: true }, 200, corsHeaders);
  if (existing.ownerHash !== await sha256Hex(secret)) return jsonResponse({ error: 'Not allowed.' }, 403, corsHeaders);
  if (existing.handle) await env.AETHER_PROFILES.delete(`handle:${existing.handle}`);
  await env.AETHER_PROFILES.delete(key);
  return jsonResponse({ ok: true }, 200, corsHeaders);
}

async function getProfileByHandle(handle, request, env, corsHeaders) {
  if (!handle) return jsonResponse({ error: 'Missing handle.' }, 400, corsHeaders);
  const profileId = await env.AETHER_PROFILES.get(`handle:${handle}`);
  if (!profileId) return jsonResponse({ error: 'Profile not found.' }, 404, corsHeaders);
  return getProfileById(profileId, request, env, corsHeaders);
}

async function getProfileById(profileId, request, env, corsHeaders) {
  const profile = await env.AETHER_PROFILES.get(`profile:${normalizeId(profileId)}`, 'json');
  if (!profile || profile.visibility === 'private') return jsonResponse({ error: 'Profile not found.' }, 404, corsHeaders);
  const publicData = publicProfile(profile);
  const headers = {
    ...corsHeaders,
    'cache-control': `public, max-age=${PROFILE_MAX_AGE_SECONDS}`,
  };
  if (wantsHtml(request)) return htmlResponse(renderProfileHtml(publicData, request), 200, headers);
  return jsonResponse({ profile: publicData }, 200, headers);
}

async function searchProfiles(query, env, corsHeaders) {
  const needle = normalizeText(query).toLowerCase();
  if (!needle || needle.length < 2) return jsonResponse({ profiles: [] }, 200, corsHeaders);
  const list = await env.AETHER_PROFILES.list({ prefix: 'profile:', limit: 80 });
  const profiles = [];
  for (const key of list.keys) {
    const profile = await env.AETHER_PROFILES.get(key.name, 'json');
    if (!profile || profile.visibility !== 'public') continue;
    const haystack = `${profile.handle || ''} ${profile.displayName || ''} ${profile.bio || ''}`.toLowerCase();
    if (haystack.includes(needle)) profiles.push(publicProfile(profile));
    if (profiles.length >= 12) break;
  }
  return jsonResponse({ profiles }, 200, {
    ...corsHeaders,
    'cache-control': `public, max-age=${PROFILE_MAX_AGE_SECONDS}`,
  });
}

function normalizeProfile(raw = {}) {
  const visibility = raw.visibility === 'public' || raw.visibility === 'unlisted' ? raw.visibility : 'private';
  const avatarDataUrl = normalizeAvatarDataUrl(raw.avatarDataUrl);
  return {
    displayName: normalizeText(raw.displayName).slice(0, 32) || 'Aether Listener',
    handle: normalizeHandle(raw.handle),
    bio: normalizeText(raw.bio).slice(0, 140),
    avatarColor: /^#[0-9a-f]{6}$/i.test(String(raw.avatarColor || '')) ? raw.avatarColor : '#16f7c6',
    avatarDataUrl,
    visibility,
    shareStats: raw.shareStats !== false,
    stats: normalizeStats(raw.stats),
  };
}

function publicProfile(profile) {
  return {
    id: profile.id,
    handle: profile.handle,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarColor: profile.avatarColor,
    avatarDataUrl: profile.avatarDataUrl || '',
    visibility: profile.visibility,
    shareStats: profile.shareStats !== false,
    stats: profile.shareStats === false ? null : normalizeStats(profile.stats),
    updatedAt: profile.updatedAt || 0,
  };
}

function normalizeStats(stats = {}) {
  return {
    vaults: clampInt(stats.vaults, 0, 9999),
    tracks: clampInt(stats.tracks, 0, 999999),
    favorites: clampInt(stats.favorites, 0, 999999),
    artists: clampInt(stats.artists, 0, 999999),
    listens: clampInt(stats.listens, 0, 999999),
    minutes: clampInt(stats.minutes, 0, 99999999),
    sessions: clampInt(stats.sessions, 0, 999999),
    topArtist: normalizeText(stats.topArtist).slice(0, 80),
    topTrack: normalizeText(stats.topTrack).slice(0, 120),
  };
}

function wantsHtml(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('format') === 'json') return false;
  if (url.searchParams.get('format') === 'html') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html') && !accept.includes('application/json');
}

function renderProfileHtml(profile, request) {
  const url = new URL(request.url);
  const title = `${profile.displayName || 'Aether Listener'}${profile.handle ? ` (@${profile.handle})` : ''} on Aether`;
  const description = profile.bio || (profile.stats ? `${profile.stats.vaults} vaults, ${profile.stats.tracks} tracks, ${profile.stats.favorites} favorites.` : 'A public Aether listening profile.');
  const avatarStyle = `background:${escapeAttr(profile.avatarColor || '#16f7c6')}`;
  const avatar = profile.avatarDataUrl
    ? `<img src="${escapeAttr(profile.avatarDataUrl)}" alt="" class="avatar-img">`
    : `<span>${escapeHtml(String(profile.displayName || 'A').slice(0, 2).toUpperCase())}</span>`;
  const stats = profile.stats;
  const statCards = stats ? [
    ['Vaults', stats.vaults],
    ['Tracks', stats.tracks],
    ['Favorites', stats.favorites],
    ['Artists', stats.artists],
    ['Listens', stats.listens],
    ['Minutes', stats.minutes],
  ].map(([label, value]) => `
    <div class="stat">
      <strong>${escapeHtml(formatNumber(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `).join('') : '<div class="empty">This listener has hidden their listening stats.</div>';
  const highlights = stats ? `
    <div class="highlights">
      <div><span>Top Artist</span><strong>${escapeHtml(stats.topArtist || 'Not shared yet')}</strong></div>
      <div><span>Top Track</span><strong>${escapeHtml(stats.topTrack || 'Not shared yet')}</strong></div>
    </div>
  ` : '';
  const canonical = `${url.origin}${url.pathname}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  ${profile.avatarDataUrl ? `<meta property="og:image" content="${escapeAttr(profile.avatarDataUrl)}">` : ''}
  <style>
    :root { color-scheme: dark; --mint:#16f7c6; --bg:#040706; --panel:#08100f; --line:rgba(255,255,255,.12); --muted:rgba(255,255,255,.56); }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; padding:28px; background:
      radial-gradient(circle at 18% 12%, rgba(22,247,198,.14), transparent 28%),
      radial-gradient(circle at 85% 82%, rgba(122,162,255,.10), transparent 32%),
      linear-gradient(135deg, #020403, #07100f 56%, #030506); color:white; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width:min(100%, 1080px); border:1px solid rgba(22,247,198,.26); border-radius:34px; overflow:hidden; background:rgba(5,8,11,.9); box-shadow:0 28px 100px rgba(0,0,0,.58); backdrop-filter: blur(18px); }
    .hero { display:grid; grid-template-columns:minmax(0,1fr) minmax(260px,360px); gap:28px; padding:40px; background:linear-gradient(135deg, rgba(22,247,198,.12), rgba(255,255,255,.025)); border-bottom:1px solid var(--line); }
    .identity { display:grid; grid-template-columns:132px minmax(0,1fr); gap:24px; align-items:center; min-width:0; }
    .avatar { width:132px; height:132px; flex:0 0 auto; border-radius:32px; border:1px solid rgba(255,255,255,.18); display:grid; place-items:center; color:#020504; font-size:42px; font-weight:950; overflow:hidden; box-shadow:0 22px 60px rgba(0,0,0,.36); }
    .avatar-img { width:100%; height:100%; object-fit:cover; display:block; }
    .eyebrow { color:var(--mint); font-size:12px; font-weight:950; letter-spacing:.24em; text-transform:uppercase; }
    h1 { margin:8px 0 0; font-size:clamp(42px, 7vw, 82px); line-height:.88; letter-spacing:-.045em; text-transform:uppercase; overflow-wrap:anywhere; }
    .handle { margin-top:10px; color:var(--mint); font-weight:950; letter-spacing:.18em; text-transform:uppercase; }
    .bio { align-self:stretch; display:flex; align-items:center; margin:0; color:var(--muted); font-size:18px; line-height:1.65; padding:24px; border:1px solid rgba(255,255,255,.09); border-radius:26px; background:rgba(0,0,0,.18); }
    .content { padding:30px 40px 40px; }
    .stats { display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); gap:12px; }
    .stat { border:1px solid var(--line); border-radius:22px; padding:16px; background:rgba(0,0,0,.22); min-height:96px; }
    .stat strong { display:block; font-size:28px; line-height:1; letter-spacing:-.03em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .stat span { display:block; margin-top:12px; color:rgba(255,255,255,.42); font-size:10px; font-weight:950; letter-spacing:.16em; text-transform:uppercase; }
    .highlights { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin-top:14px; }
    .highlights div, .empty { border:1px solid var(--line); border-radius:24px; padding:20px; background:rgba(0,0,0,.18); }
    .highlights span { display:block; color:var(--mint); font-size:11px; font-weight:950; letter-spacing:.2em; text-transform:uppercase; }
    .highlights strong { display:block; margin-top:10px; font-size:18px; text-transform:uppercase; }
    .empty { color:var(--muted); }
    .footer { display:flex; justify-content:space-between; gap:16px; align-items:center; margin-top:28px; color:rgba(255,255,255,.38); font-size:12px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
    .open { color:var(--mint); text-decoration:none; border:1px solid rgba(22,247,198,.3); border-radius:999px; padding:12px 16px; background:rgba(22,247,198,.08); }
    @media (max-width: 900px) { .hero { grid-template-columns:1fr; } .stats { grid-template-columns:repeat(3, minmax(0,1fr)); } }
    @media (max-width: 640px) { body { padding:14px; } .hero, .content { padding:22px; } .identity { grid-template-columns:1fr; } .avatar { width:104px; height:104px; border-radius:28px; } .stats { grid-template-columns:repeat(2, minmax(0,1fr)); } .footer { align-items:flex-start; flex-direction:column; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="identity">
        <div class="avatar" style="${avatarStyle}">${avatar}</div>
        <div>
          <div class="eyebrow">Aether Profile</div>
          <h1>${escapeHtml(profile.displayName || 'Aether Listener')}</h1>
          <div class="handle">${profile.handle ? `@${escapeHtml(profile.handle)}` : 'Public Listener'}</div>
        </div>
      </div>
      <p class="bio">${escapeHtml(profile.bio || 'No bio shared yet.')}</p>
    </section>
    <section class="content">
      <div class="stats">${statCards}</div>
      ${highlights}
      <div class="footer">
        <span>Shared from Aether</span>
        <a class="open" href="https://aetherstudio.me">Open Aether</a>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function htmlResponse(html, status = 200, headers = {}) {
  const nextHeaders = { ...headers };
  delete nextHeaders['access-control-allow-origin'];
  delete nextHeaders['access-control-allow-methods'];
  delete nextHeaders['access-control-allow-headers'];
  delete nextHeaders['access-control-max-age'];
  return new Response(html, {
    status,
    headers: {
      ...nextHeaders,
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function formatNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

function normalizeAvatarDataUrl(value) {
  const text = String(value || '');
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(text)) return '';
  return text.length <= 180_000 ? text : '';
}

function normalizeHandle(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}

function normalizeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function clampInt(value, min, max) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function getBearerSecret(request) {
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildCorsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowOrigin = PROFILE_ALLOWED_ORIGINS.has(origin) || origin.endsWith('.aetherstudio.me') ? origin : 'https://aetherstudio.me';
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'GET, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...headers,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
