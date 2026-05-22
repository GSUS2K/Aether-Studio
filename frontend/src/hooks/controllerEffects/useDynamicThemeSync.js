import { useEffect } from 'react';

export function useDynamicThemeSync(props) {
  const {
    Image, buildTrackPaletteFromRgb, currentTrack, getTrackFallbackPalette, setThemeColor, setTrackPalette, trackPaletteCacheRef,
  } = props;

  // --- AETHER: DYNAMIC THEME SYNC (NOVA ---
useEffect(() => {
  if (!currentTrack) return;
  let cancelled = false;
  const themeCacheKey = String(currentTrack?.youtubeId || currentTrack?.id || `${currentTrack?.title || ''}|${currentTrack?.author || ''}`);
  const themeImageUrl = String(currentTrack?.thumbnail || '');
  const applyPalette = palette => {
    if (cancelled) return;
    setThemeColor(palette.accent);
    setTrackPalette(palette);
    document.documentElement.style.setProperty('--brand-accent', palette.accent);
    document.documentElement.style.setProperty('--brand-contrast', palette.contrast);
    document.documentElement.style.setProperty('--brand-glow', palette.glow);
    document.documentElement.style.setProperty('--aura-accent-rgb', `${palette.accentRgb[0]}, ${palette.accentRgb[1]}, ${palette.accentRgb[2]}`);
    document.documentElement.style.setProperty('--aura-contrast-rgb', `${palette.contrastRgb[0]}, ${palette.contrastRgb[1]}, ${palette.contrastRgb[2]}`);
    document.documentElement.style.setProperty('--track-control-accent', palette.controlAccent);
    document.documentElement.style.setProperty('--track-progress-accent', palette.progressAccent);
    document.documentElement.style.setProperty('--track-progress-glow', palette.progressGlow);
  };
  const applyFallbackTheme = () => {
    const palette = getTrackFallbackPalette(currentTrack);
    applyPalette(palette);
  };
  const rememberPalette = (key, palette) => {
    if (!key || !palette) return;
    const paletteCache = trackPaletteCacheRef.current;
    paletteCache.set(key, palette);
    if (paletteCache.size > 64) {
      const oldestKey = paletteCache.keys().next().value;
      if (oldestKey) paletteCache.delete(oldestKey);
    }
  };
  const cachedPalette = trackPaletteCacheRef.current.get(themeCacheKey) || (themeImageUrl ? trackPaletteCacheRef.current.get(themeImageUrl) : null);
  if (cachedPalette) {
    applyPalette(cachedPalette);
    return;
  }
  if (!themeImageUrl) {
    applyFallbackTheme();
    return;
  }
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.decoding = 'async';
  img.src = themeImageUrl;
  img.onload = () => {
    if (cancelled) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !img.width || !img.height) {
      applyFallbackTheme();
      return;
    }
    canvas.width = img.width;
    canvas.height = img.height;
    try {
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 8000) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count += 1;
      }
      if (!count) {
        applyFallbackTheme();
        return;
      }
      const avgR = Math.floor(r / count);
      const avgG = Math.floor(g / count);
      const avgB = Math.floor(b / count);
      let vibrantR = avgR;
      let vibrantG = avgG;
      let vibrantB = avgB;
      let bestScore = -1;
      for (let i = 0; i < data.length; i += 96) {
        const pr = data[i];
        const pg = data[i + 1];
        const pb = data[i + 2];
        const pMax = Math.max(pr, pg, pb);
        const pMin = Math.min(pr, pg, pb);
        const sat = pMax === 0 ? 0 : (pMax - pMin) / pMax;
        const val = pMax / 255;
        const midBand = 1 - Math.min(1, Math.abs(val - 0.58) / 0.58);
        const score = sat * 0.72 + val * 0.16 + midBand * 0.22;
        if (score > bestScore) {
          bestScore = score;
          vibrantR = pr;
          vibrantG = pg;
          vibrantB = pb;
        }
      }
      const blend = 0.68;
      const tunedR = Math.round(vibrantR * blend + avgR * (1 - blend));
      const tunedG = Math.round(vibrantG * blend + avgG * (1 - blend));
      const tunedB = Math.round(vibrantB * blend + avgB * (1 - blend));
      const palette = buildTrackPaletteFromRgb([tunedR, tunedG, tunedB]);
      rememberPalette(themeCacheKey, palette);
      rememberPalette(themeImageUrl, palette);
      applyPalette(palette);
    } catch (error) {
      applyFallbackTheme();
    }
  };
  img.onerror = applyFallbackTheme;
  applyFallbackTheme();
  return () => {
    cancelled = true;
    img.onload = null;
    img.onerror = null;
  };
}, [currentTrack?.thumbnail, currentTrack?.youtubeId, currentTrack?.id, currentTrack?.title, currentTrack?.author]);

// --- AETHER: HARDWARE MEDIA SESSION BRIDGE (NOVA ---
}
