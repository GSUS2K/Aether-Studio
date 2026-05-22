import { AETHER_PROFILE_API_BASE, AETHER_PROFILE_STORAGE_KEY, DEFAULT_AETHER_PROFILE } from '../config/aetherConfig';

export const sanitizeAetherProfile = (profile = {}) => {
  const next = {
    ...DEFAULT_AETHER_PROFILE,
    ...(profile && typeof profile === 'object' ? profile : {}),
  };
  const visibility = next.visibility === 'public' || next.visibility === 'unlisted' ? next.visibility : 'private';
  const hasLegacyPublishedState = !next.publishedVisibility && Number(next.lastPublishedAt) > 0 && visibility !== 'private';
  return {
    displayName: String(next.displayName || DEFAULT_AETHER_PROFILE.displayName).trim().slice(0, 32) || DEFAULT_AETHER_PROFILE.displayName,
    handle: String(next.handle || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24),
    bio: String(next.bio || '').trim().slice(0, 140),
    avatarColor: /^#[0-9a-f]{6}$/i.test(String(next.avatarColor || '')) ? next.avatarColor : DEFAULT_AETHER_PROFILE.avatarColor,
    avatarDataUrl: /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(next.avatarDataUrl || '')) && String(next.avatarDataUrl || '').length < 180000 ? String(next.avatarDataUrl) : '',
    visibility,
    publishedVisibility: next.publishedVisibility === 'public' || next.publishedVisibility === 'unlisted' ? next.publishedVisibility : (hasLegacyPublishedState ? visibility : 'private'),
    shareStats: next.shareStats !== false,
    profileId: String(next.profileId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80),
    profileSecret: String(next.profileSecret || '').slice(0, 160),
    lastPublishedAt: Number.isFinite(Number(next.lastPublishedAt)) ? Number(next.lastPublishedAt) : 0,
  };
};

export const readAetherProfile = () => {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_AETHER_PROFILE };
  try {
    return sanitizeAetherProfile(JSON.parse(localStorage.getItem(AETHER_PROFILE_STORAGE_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_AETHER_PROFILE };
  }
};

const createProfileToken = () => {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  }
};

export const ensureAetherProfileCredentials = (profile) => {
  const clean = sanitizeAetherProfile(profile);
  return {
    ...clean,
    profileId: clean.profileId || `ap_${createProfileToken().replace(/-/g, '').slice(0, 24)}`,
    profileSecret: clean.profileSecret || `as_${createProfileToken()}_${createProfileToken()}`,
  };
};

export const getProfileLink = (profile) => {
  const handle = sanitizeAetherProfile(profile).handle;
  return handle ? `${AETHER_PROFILE_API_BASE}/v1/profile/handle/${handle}` : '';
};

export const createPublicProfileLink = (handle) => {
  const cleanHandle = String(handle || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
  return cleanHandle ? `${AETHER_PROFILE_API_BASE}/v1/profile/handle/${cleanHandle}` : '';
};

export const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not prepare profile image.'));
  reader.onload = () => resolve(String(reader.result || ''));
  reader.readAsDataURL(blob);
});

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const loadCanvasImage = (src) => new Promise((resolve, reject) => {
  if (!src) {
    resolve(null);
    return;
  }
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not render profile image.'));
  image.src = src;
});

export const createProfileShareCardBlob = async (profile, stats) => {
  const clean = sanitizeAetherProfile(profile);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#030706');
  gradient.addColorStop(0.58, '#071715');
  gradient.addColorStop(1, '#030405');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(22,247,198,0.07)';
  roundRect(ctx, 62, 62, 1076, 551, 42);
  ctx.fill();
  ctx.strokeStyle = 'rgba(22,247,198,0.34)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const avatarX = 112;
  const avatarY = 110;
  const avatarSize = 164;
  ctx.save();
  roundRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 36);
  ctx.clip();
  if (clean.avatarDataUrl) {
    try {
      const image = await loadCanvasImage(clean.avatarDataUrl);
      if (image) ctx.drawImage(image, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      ctx.fillStyle = clean.avatarColor;
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
  } else {
    ctx.fillStyle = clean.avatarColor;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = '#020504';
    ctx.font = '900 54px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(clean.displayName || 'A').slice(0, 2).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
  }
  ctx.restore();

  ctx.fillStyle = '#16f7c6';
  ctx.font = '900 20px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('AETHER PROFILE', 318, 132);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 70px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  drawFittedText(ctx, clean.displayName || 'Aether Listener', 318, 204, 720, 70, 38);
  ctx.fillStyle = '#16f7c6';
  ctx.font = '800 32px Inter, Arial, sans-serif';
  ctx.fillText(clean.handle ? `@${clean.handle}` : 'Aether listener', 320, 252);

  ctx.fillStyle = 'rgba(255,255,255,0.64)';
  ctx.font = '500 27px Inter, Arial, sans-serif';
  wrapCanvasText(ctx, clean.bio || 'Listening on Aether.', 112, 340, 976, 38, 2);

  if (clean.shareStats) {
    [
      ['VAULTS', stats.vaults],
      ['TRACKS', stats.tracks],
      ['FAVORITES', stats.favorites],
      ['ARTISTS', stats.artists],
      ['LISTENS', stats.listens],
      ['MINUTES', stats.minutes],
    ].forEach(([label, value], index) => {
      const x = 112 + (index % 3) * 330;
      const y = 410 + Math.floor(index / 3) * 84;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      roundRect(ctx, x, y, 288, 64, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 29px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(Number(value || 0).toLocaleString()), x + 144, y + 31);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '900 13px Inter, Arial, sans-serif';
      ctx.fillText(label, x + 144, y + 52);
    });
    if (stats.topArtist || stats.topTrack) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      roundRect(ctx, 112, 578, 976, 44, 16);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.font = '700 18px Inter, Arial, sans-serif';
      const highlight = [
        stats.topArtist ? `Top artist: ${stats.topArtist}` : '',
        stats.topTrack ? `Top track: ${stats.topTrack}` : '',
      ].filter(Boolean).join('  /  ');
      drawFittedText(ctx, highlight, 136, 606, 928, 18, 14);
    }
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(22,247,198,0.82)';
  ctx.font = '900 18px Inter, Arial, sans-serif';
  ctx.fillText('AETHER', 112, 648);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = '500 18px Inter, Arial, sans-serif';
  drawFittedText(ctx, getProfileLink(clean) || 'Private on this device', 220, 648, 868, 18, 14);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not create profile card image.'));
    }, 'image/png');
  });
};

export function drawFittedText(ctx, text, x, y, maxWidth, startSize, minSize = 12) {
  const family = 'Inter, Arial, sans-serif';
  let size = startSize;
  const weight = String(ctx.font || '').includes('900') ? '900' : String(ctx.font || '').includes('800') ? '800' : String(ctx.font || '').includes('700') ? '700' : '500';
  let value = String(text || '');
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  while (ctx.measureText(value).width > maxWidth && value.length > 4) {
    value = `${value.slice(0, -4)}...`;
  }
  ctx.fillText(value, x, y);
}

export function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let lineCount = 0;
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      if (lineCount < maxLines) ctx.fillText(line, x, y + lineCount * lineHeight);
      line = word;
      lineCount += 1;
    } else {
      line = next;
    }
  });
  if (line && lineCount < maxLines) ctx.fillText(line, x, y + lineCount * lineHeight);
}

export const resizeImageFileToDataUrl = (file, maxSize = 320, quality = 0.84) => new Promise((resolve, reject) => {
  if (!file || !/^image\//i.test(file.type || '')) {
    reject(new Error('Choose an image file.'));
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    reject(new Error('Avatar image is too large. Choose an image under 8 MB.'));
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read avatar image.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Could not decode avatar image.'));
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width || maxSize, image.height || maxSize));
      const width = Math.max(1, Math.round((image.width || maxSize) * scale));
      const height = Math.max(1, Math.round((image.height || maxSize) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
});
