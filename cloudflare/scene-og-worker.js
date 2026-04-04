export default {
  async fetch(request) {
    const url = new URL(request.url);
    const encoded = url.searchParams.get('scene');

    // No scene payload -> pass through to origin/site.
    if (!encoded) {
      return fetch(request);
    }

    const decoded = decodeScenePayload(encoded);
    if (!decoded) {
      return fetch(request);
    }

    const scene = normalizeScenePayload(decoded);
    const pageUrl = `https://aetherstudio.me/?scene=${encodeURIComponent(encoded)}`;

    // Bots get OG HTML. Humans should receive normal app HTML from origin.
    const ua = (request.headers.get('user-agent') || '').toLowerCase();
    const isBot = /(discordbot|twitterbot|slackbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|embedly|quora link preview|pinterest|googlebot)/i.test(ua);

    if (!isBot) {
      return fetch(request);
    }

    const title = escapeHtml(`${scene.title} — ${scene.author}`.slice(0, 120));
    const description = escapeHtml(`“${scene.lyric}” • ${formatTime(scene.at)} / ${formatTime(scene.total)} • ${scene.state} • ${scene.mode}`.slice(0, 220));
    const image = escapeHtml(scene.thumbnail || `https://aetherstudio.me/aether-logo.png`);

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Aether Studio" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${image}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />

</head>
<body>
  <p>Shared scene preview for bots. Open: <a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a></p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300'
      }
    });
  }
};

function decodeScenePayload(encoded) {
  try {
    const normalized = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    const raw = atob(normalized + pad);
    const bytes = Array.from(raw).map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
    return JSON.parse(decodeURIComponent(bytes));
  } catch {
    return null;
  }
}

function extractSceneYouTubeId(value) {
  const text = String(value || '');
  const match = text.match(/(?:v=|\/vi\/|\/v\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || null;
}

function normalizeScenePayload(raw) {
  const youtubeId = String(raw?.youtubeId || raw?.y || extractSceneYouTubeId(raw?.thumbnail || raw?.th || raw?.source || '') || '');
  const thumbnail = String(raw?.thumbnail || raw?.th || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : ''));

  return {
    title: String(raw?.title || raw?.t || 'Aether Scene').slice(0, 140),
    author: String(raw?.author || raw?.a || 'Unknown Artist').slice(0, 100),
    lyric: String(raw?.lyric || raw?.l || 'No lyric locked yet').slice(0, 180),
    thumbnail,
    at: Math.max(0, Number(raw?.at || raw?.time || 0)),
    total: Math.max(0, Number(raw?.total || raw?.to || 0)),
    state: String(raw?.state || (raw?.s === 1 ? 'playing' : 'paused')),
    mode: String(raw?.mode || (raw?.m === 1 ? 'pulse' : 'bars')),
  };
}

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
