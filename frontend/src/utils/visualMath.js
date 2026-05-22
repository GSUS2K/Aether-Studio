export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const alphaHex = (a) => Math.round(clamp01(a) * 255).toString(16).padStart(2, '0');

export const hashStringToUnit = (value) => {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
};

export const deriveFallbackPulse = (track, positionMs = 0, playing = false) => {
  if (!playing) return { bass: 0, mids: 0, highs: 0, energy: 0 };
  const seed = hashStringToUnit(`${track?.title || ''}|${track?.author || ''}|${track?.youtubeId || track?.id || ''}`);
  const t = Math.max(0, Number(positionMs) || 0) / 1000;
  const bass = clamp01(0.18 + Math.sin(t * (1.55 + seed * 0.7) + seed * 6.28) * 0.12 + Math.sin(t * 0.38 + seed) * 0.08);
  const mids = clamp01(0.15 + Math.sin(t * (1.05 + seed * 0.55) + 1.7) * 0.09 + Math.sin(t * 0.29 + seed * 4) * 0.07);
  const highs = clamp01(0.11 + Math.sin(t * (2.15 + seed * 0.45) + 2.3) * 0.08 + Math.sin(t * 0.52 + seed * 5) * 0.05);
  return { bass, mids, highs, energy: clamp01(bass * 0.46 + mids * 0.34 + highs * 0.2) };
};

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(Number(value) || 0)));

export const rgbToHex = (r, g, b) => `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`;

export const hslToRgb = (h, s, l) => {
  const hue = ((Number(h) % 360) + 360) % 360;
  const sat = clamp01(Number(s) / 100);
  const lig = clamp01(Number(l) / 100);
  const chroma = (1 - Math.abs((2 * lig) - 1)) * sat;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (huePrime >= 0 && huePrime < 1) {
    r1 = chroma; g1 = x; b1 = 0;
  } else if (huePrime < 2) {
    r1 = x; g1 = chroma; b1 = 0;
  } else if (huePrime < 3) {
    r1 = 0; g1 = chroma; b1 = x;
  } else if (huePrime < 4) {
    r1 = 0; g1 = x; b1 = chroma;
  } else if (huePrime < 5) {
    r1 = x; g1 = 0; b1 = chroma;
  } else {
    r1 = chroma; g1 = 0; b1 = x;
  }
  const match = lig - chroma / 2;
  return [
    clampChannel((r1 + match) * 255),
    clampChannel((g1 + match) * 255),
    clampChannel((b1 + match) * 255),
  ];
};

export const rgbToHsl = (r, g, b) => {
  const red = clampChannel(r) / 255;
  const green = clampChannel(g) / 255;
  const blue = clampChannel(b) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = ((blue - red) / delta) + 2;
    else hue = ((red - green) / delta) + 4;
  }
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs((2 * lightness) - 1));
  return {
    h: Math.round((((hue * 60) + 360) % 360) * 10) / 10,
    s: Math.round(saturation * 1000) / 10,
    l: Math.round(lightness * 1000) / 10,
  };
};

export const mixRgb = (left, right, weight = 0.5) => {
  const t = clamp01(weight);
  return [
    clampChannel(lerp(left[0], right[0], t)),
    clampChannel(lerp(left[1], right[1], t)),
    clampChannel(lerp(left[2], right[2], t)),
  ];
};

export const buildTrackPaletteFromRgb = (inputRgb = [0, 255, 191]) => {
  const baseRgb = Array.isArray(inputRgb) && inputRgb.length === 3
    ? inputRgb.map((channel) => clampChannel(channel))
    : [0, 255, 191];
  const { h, s, l } = rgbToHsl(baseRgb[0], baseRgb[1], baseRgb[2]);
  const accentRgb = hslToRgb(h, Math.max(52, Math.min(84, s * 0.82 + 10)), Math.max(46, Math.min(62, l * 0.58 + 22)));
  const contrastRgb = hslToRgb((h + 32) % 360, Math.max(42, Math.min(78, s * 0.6 + 16)), Math.max(58, Math.min(74, l * 0.34 + 40)));
  const progressRgb = mixRgb(accentRgb, contrastRgb, 0.36);
  const controlAccentRgb = mixRgb(accentRgb, [255, 255, 255], 0.18);
  const controlSurfaceRgb = mixRgb(accentRgb, [8, 11, 14], 0.84);
  return {
    accent: rgbToHex(...accentRgb),
    contrast: rgbToHex(...contrastRgb),
    glow: `${rgbToHex(...accentRgb)}33`,
    accentRgb,
    contrastRgb,
    progressAccent: rgbToHex(...progressRgb),
    progressGlow: `rgba(${progressRgb.join(', ')}, 0.46)`,
    controlAccent: rgbToHex(...controlAccentRgb),
    controlGlow: `rgba(${accentRgb.join(', ')}, 0.4)`,
    controlSurface: `rgba(${controlSurfaceRgb.join(', ')}, 0.78)`,
  };
};

export const DEFAULT_TRACK_PALETTE = Object.freeze(buildTrackPaletteFromRgb([0, 255, 191]));
