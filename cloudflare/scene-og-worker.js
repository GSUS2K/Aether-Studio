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

    const title = `${scene.title} - ${scene.author}`.slice(0, 120);
    const description = `${scene.lyric} - ${formatTime(scene.at)} / ${formatTime(scene.total)} - ${scene.state} - ${scene.mode}`.slice(0, 220);
    const image = scene.thumbnail || `https://aetherstudio.me/aether-logo.png`;
    const appUrl = `aether://scene?scene=${encodeURIComponent(encoded)}`;
    const html = renderSceneHtml({ scene, pageUrl, appUrl, title, description, image });

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
    pulse: clampPercent(raw?.pulse ?? raw?.p ?? 0),
    bass: clampPercent(raw?.bass ?? raw?.b ?? 0),
    mids: clampPercent(raw?.mids ?? raw?.mid ?? raw?.mi ?? 0),
    highs: clampPercent(raw?.highs ?? raw?.h ?? 0),
  };
}

function renderSceneHtml({ scene, pageUrl, appUrl, title, description, image }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safePageUrl = escapeHtml(pageUrl);
  const safeAppUrl = escapeHtml(appUrl);
  const safeImage = escapeHtml(image);
  const chips = [
    ['Pulse', scene.pulse],
    ['Bass', scene.bass],
    ['Mids', scene.mids],
    ['Highs', scene.highs],
  ].map(([label, value]) => `
          <div class="chip">
            <strong>${escapeHtml(value)}%</strong>
            <span>${escapeHtml(label)}</span>
          </div>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <meta name="theme-color" content="#07110f" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Aether Studio" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safePageUrl}" />
  <meta property="og:image" content="${safeImage}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />

  <style>
    :root {
      color-scheme: dark;
      --bg: #020706;
      --panel: rgba(8, 17, 16, 0.92);
      --panel-strong: rgba(12, 42, 35, 0.72);
      --border: rgba(97, 255, 206, 0.28);
      --muted: rgba(234, 244, 241, 0.62);
      --text: #f7fffc;
      --accent: #21ffd2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px;
      background:
        radial-gradient(circle at 12% 20%, rgba(33, 255, 210, 0.14), transparent 24rem),
        radial-gradient(circle at 86% 78%, rgba(33, 255, 210, 0.10), transparent 28rem),
        linear-gradient(145deg, #010403, var(--bg));
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    .shell {
      width: min(1080px, 100%);
      border: 1px solid var(--border);
      border-radius: 34px;
      padding: 28px;
      background: linear-gradient(145deg, rgba(4, 10, 9, 0.94), rgba(7, 24, 21, 0.86));
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.58), 0 0 70px rgba(33, 255, 210, 0.08);
    }
    .eyebrow {
      color: var(--accent);
      font-weight: 900;
      font-size: 13px;
      letter-spacing: 0.34em;
      text-transform: uppercase;
      margin: 0 0 20px;
    }
    .card {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      gap: 28px;
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px;
      padding: 28px;
      background: rgba(0, 0, 0, 0.32);
    }
    .art {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 22px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: #06100e;
      box-shadow: 0 20px 42px rgba(0, 0, 0, 0.38);
    }
    h1 {
      margin: 0;
      max-width: 760px;
      color: var(--accent);
      font-size: clamp(32px, 5vw, 62px);
      line-height: 0.98;
      letter-spacing: 0;
      text-wrap: balance;
    }
    .artist {
      margin: 12px 0 0;
      color: rgba(255, 255, 255, 0.72);
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }
    .lyric {
      margin: 24px 0;
      color: rgba(255, 255, 255, 0.88);
      font-size: 20px;
      font-style: italic;
      line-height: 1.45;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .chips {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
    }
    .chip {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px;
      background: rgba(0, 0, 0, 0.26);
    }
    .chip strong {
      display: block;
      font-size: 24px;
      line-height: 1;
    }
    .chip span {
      display: block;
      margin-top: 8px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      margin-top: 22px;
      color: rgba(255, 255, 255, 0.42);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.24em;
      text-transform: uppercase;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0 22px;
      border-radius: 999px;
      border: 1px solid rgba(33, 255, 210, 0.52);
      background: var(--panel-strong);
      color: var(--accent);
      text-decoration: none;
      letter-spacing: 0.2em;
    }
    .button.primary {
      border-color: transparent;
      background: var(--accent);
      color: #03110d;
      box-shadow: 0 16px 42px rgba(33, 255, 210, 0.22);
    }
    @media (max-width: 760px) {
      body { padding: 18px; }
      .shell { padding: 18px; border-radius: 24px; }
      .card { grid-template-columns: 1fr; padding: 18px; }
      .art { max-width: 260px; }
      .chips { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .footer { align-items: flex-start; flex-direction: column; }
      .actions { justify-content: flex-start; width: 100%; }
      .button { width: 100%; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <p class="eyebrow">Aether Shared Scene</p>
    <section class="card">
      <img class="art" src="${safeImage}" alt="" />
      <div>
        <h1>${escapeHtml(scene.title)}</h1>
        <p class="artist">${escapeHtml(scene.author)}</p>
        <p class="lyric">"${escapeHtml(scene.lyric)}"</p>
        <div class="meta">
          <span>${escapeHtml(formatTime(scene.at))} / ${escapeHtml(formatTime(scene.total))}</span>
          <span>${escapeHtml(scene.state)}</span>
          <span>${escapeHtml(scene.mode)}</span>
        </div>
        <div class="chips">${chips}</div>
      </div>
    </section>
    <div class="footer">
      <span>Shared from Aether</span>
      <div class="actions">
        <a class="button primary" href="${safePageUrl}">Play In Browser</a>
        <a class="button" href="${safeAppUrl}">Open In Aether</a>
      </div>
    </div>
  </main>
</body>
</html>`;
}

function clampPercent(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(100, Math.round(next)));
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
