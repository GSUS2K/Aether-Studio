import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, Component, startTransition, memo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
// NOTE: Many async operations and state changes below may be subject to race conditions if triggered rapidly.
// Consider debouncing or locking for critical flows (e.g., downloads, updates, queue changes).
import { Play, Pause, SkipForward, Search, Plus, Loader2, ListMusic, Music, Globe, User, UserPlus, BookOpen, Trash2, Rewind, FastForward, ExternalLink, ChevronLeft, ChevronRight, Zap, X, HardDrive, Activity, Radio, Signal, Wifi, Clock, Maximize2, Minimize2, RotateCcw, AlertTriangle, RefreshCw, Monitor, Target, AppWindow, Volume2, VolumeX, Shuffle, Download, Upload, Save, Lock, Fingerprint, Keyboard, Edit3, PlusCircle, MinusCircle, Sparkles, Clapperboard, Columns2, Repeat, MessageSquare, Send, Layers, Eye, Hand, MousePointer2, Camera, Copy, Check, Heart } from 'lucide-react';

import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { setupDiscordSdk } from './discord';
import axios from 'axios';
import { APP_VERSION, BUILD_VERSION, UX_VERSION } from './buildVersion';
import catDoodlePeek from './assets/cat-doodle-peek.svg';
import './App.css';

const getApiBase = () => {
  const isElectronStandalone = typeof window !== 'undefined' && !!window.aether;
  if (isElectronStandalone) {
    return 'http://localhost:3333';
  }

  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBase) return configuredBase.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    const host = window.location.hostname || '';
    if (/^(www\.)?aetherstudio\.me$/i.test(host)) {
      return 'https://aether-backend-website.onrender.com';
    }
    if (!/^https?:\/\/localhost(?::\d+)?$/i.test(origin) && !/^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)) {
      return origin;
    }
  }

  return 'http://localhost:3333';
};
const API_BASE = getApiBase();
const DEFAULT_GUILD_ID = 'local_studio';
const LYRIC_PRESETS_STORAGE_KEY = 'aether.lyricOffsetPresets.v1';
const SESSION_UI_STORAGE_KEY = 'aether.sessionUi.v1';
const SESSION_PLAYBACK_STORAGE_KEY = 'aether.sessionPlayback.v1';
const PLAYLIST_ORDER_STORAGE_KEY = 'aether.playlistOrder.v1';
const FAVORITES_STORAGE_KEY = 'aether.favoriteTracks.v1';
const FAVORITES_PLAYLIST_ID = '__aether_favorites__';
const FAVORITES_PLAYLIST_NAME = 'Favorite Songs';
const SKIP_EVENTS_STORAGE_KEY = 'aether.skipEvents.v1';
const MANUAL_LYRICS_STORAGE_KEY = 'aether.manualLyrics.v1';
const LOCK_PREFS_STORAGE_KEY = 'aether.lockPrefs.v1';
const SHORTCUTS_STORAGE_KEY = 'aether.shortcuts.v1';
const GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY = 'aether.globalMediaShortcuts.enabled';
const FEEDBACK_STORAGE_KEY = 'aether.feedbackOutbox.v1';
const FEEDBACK_ISSUE_URL = 'https://github.com/GSUS2K/Aether-Studio/issues/new';
const DEFAULT_FEEDBACK_DRAFT = Object.freeze({
  type: 'Problem',
  summary: '',
  details: '',
  contact: '',
});
const DEFAULT_SHORTCUTS = Object.freeze({
  playPause: 'Mod+Alt+Space',
  previous: 'Mod+Alt+ArrowLeft',
  next: 'Mod+Alt+ArrowRight',
  volumeUp: 'Mod+Alt+ArrowUp',
  volumeDown: 'Mod+Alt+ArrowDown',
  mute: 'Mod+Alt+M',
  clearQueue: 'Mod+Alt+Backspace',
  focusMode: 'Shift+F',
  miniPlayer: 'Shift+M',
  diagnostics: 'D',
});
const SHORTCUT_FIELDS = [
  { id: 'playPause', label: 'Play / Pause' },
  { id: 'previous', label: 'Previous Track' },
  { id: 'next', label: 'Next Track' },
  { id: 'volumeUp', label: 'Volume Up' },
  { id: 'volumeDown', label: 'Volume Down' },
  { id: 'mute', label: 'Mute / Unmute' },
  { id: 'clearQueue', label: 'Clear Queue' },
  { id: 'focusMode', label: 'Toggle Focus View' },
  { id: 'miniPlayer', label: 'Toggle Mini Player' },
  { id: 'diagnostics', label: 'Toggle Diagnostics' },
];
const AUTOPLAY_MOOD_MODES = Object.freeze([
  { id: 'flow', label: 'Flow' },
  { id: 'safe', label: 'Safe' },
  { id: 'explore', label: 'Explore' },
]);

const ToastPortal = ({ children }) => {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
};

const buildUniquePlaylistName = (baseName, playlists = {}, ignoreName = '') => {
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
const AURA_PRESETS = Object.freeze([
  { id: 'calm', label: 'Calm', fieldBoost: 0.72, fieldFlare: 0.62, hueShift: 0.65, kickGlow: 0.62, ringCooldownMs: 380, ringThreshold: 0.82, ringScale: 0.72, ringDurationMs: 460 },
  { id: 'balanced', label: 'Balanced', fieldBoost: 1, fieldFlare: 1, hueShift: 1, kickGlow: 1, ringCooldownMs: 300, ringThreshold: 0.78, ringScale: 0.6, ringDurationMs: 420 },
  { id: 'cinematic', label: 'Cinematic', fieldBoost: 1.26, fieldFlare: 1.2, hueShift: 1.2, kickGlow: 1.15, ringCooldownMs: 260, ringThreshold: 0.74, ringScale: 0.66, ringDurationMs: 380 },
]);
const AURA_PRESETS_MAP = Object.freeze(
  AURA_PRESETS.reduce((acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  }, {})
);
const DOODLE_PRESETS = Object.freeze([
  { id: 'subtle', label: 'Cozy', badge: 'CZ' },
  { id: 'medium', label: 'Floaty', badge: 'FL' },
  { id: 'dreamy', label: 'Playful', badge: 'PL' },
]);
const PERFORMANCE_MODES = Object.freeze([
  { id: 'low', label: 'Low', detail: 'Playback first, no motion' },
  { id: 'medium', label: 'Medium', detail: 'Soft motion, capped visuals' },
  { id: 'high', label: 'High', detail: 'Full visuals and effects' },
]);
const IDLE_PHRASES = [
  "Exploring the Neural Vault",
  "Calibrating Sonic Synapses",
  "Organizing the Vibe Buffer",
  "Hunting for Rare Nodes",
  "Defragmenting the Studio",
  "Awaiting the Next Drop",
  "Lost in the Music Nexus",
  "Optimizing Aura Sync",
  "Neural Network Standby",
  "Refining Studio Echoes",
  "Calculating Bass Velocity",
  "Feeding the Rhythm Hamsters",
  "Searching for Perfect Snares",
  "Overclocking the Speakers",
  "Untangling Virtual Cables",
  "Wait, where did the kick go?",
  "Stealing hearts, one beat at a time",
  "Looking hot in the studio spotlight",
  "Is it hot in here or just the bass?",
  "Aether's got a crush on your vibe",
  "Neural connection... established? 😉",
  "Synchronizing heartbeats...",
  "Midnight studio sessions > Anything",
  "Caught in your sonic orbit"
];

const formatTime = (ms) => {
  if (isNaN(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const parseLyricOffsetValue = (value) => {
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

const formatBytes = (bytes) => {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const scaled = value / (1024 ** power);
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[power]}`;
};

const normalizeManualLyricsLine = (line) => ({
  time: Number.isFinite(Number(line?.time)) ? Math.max(0, Math.trunc(Number(line.time))) : 0,
  text: String(line?.text || '').replace(/\r/g, '').trim(),
});

const sortManualLyricsLines = (lines = []) => (Array.isArray(lines) ? lines : [])
  .map(normalizeManualLyricsLine)
  .filter((line) => line.text.length > 0 || line.time >= 0)
  .sort((left, right) => left.time - right.time);

const formatManualLyricsTimestamp = (ms = 0) => {
  const safeMs = Math.max(0, Math.trunc(Number(ms) || 0));
  const totalCentiseconds = Math.round(safeMs / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]`;
};

const parseManualLyricsTimestamp = (value) => {
  const raw = String(value ?? '').trim().replace(/^\[|\]$/g, '');
  const match = raw.match(/^(\d+):(\d{1,2})(?:[.:](\d{1,3}))?$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = match[3] ? Number(String(match[3]).padEnd(3, '0').slice(0, 3)) : 0;
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(fraction)) return null;
  return ((minutes * 60) + seconds) * 1000 + fraction;
};

const manualLyricsLinesToLrc = (lines = []) => sortManualLyricsLines(lines)
  .map((line) => `${formatManualLyricsTimestamp(line.time)}${line.text}`)
  .join('\n');

const parseManualLyricsLrcText = (input = '') => {
  const lines = String(input || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = [];
  for (const rawLine of lines) {
    const timestampMatches = [...rawLine.matchAll(/\[(\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/g)];
    const lyricText = rawLine.replace(/\[(\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/g, '').trim();
    if (!lyricText || timestampMatches.length === 0) continue;
    for (const match of timestampMatches) {
      const parsedTime = parseManualLyricsTimestamp(match[1]);
      if (Number.isFinite(parsedTime)) {
        parsed.push({
          time: parsedTime,
          text: lyricText,
          timestamp: formatManualLyricsTimestamp(parsedTime).slice(1, -1),
        });
      }
    }
  }

  return sortManualLyricsLines(parsed).map((line) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: line.time,
    timestamp: formatManualLyricsTimestamp(line.time).slice(1, -1),
    text: line.text,
  }));
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const alphaHex = (a) => Math.round(clamp01(a) * 255).toString(16).padStart(2, '0');
const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
const rgbToHex = (r, g, b) => `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`;
const hslToRgb = (h, s, l) => {
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
const rgbToHsl = (r, g, b) => {
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
const mixRgb = (left, right, weight = 0.5) => {
  const t = clamp01(weight);
  return [
    clampChannel(lerp(left[0], right[0], t)),
    clampChannel(lerp(left[1], right[1], t)),
    clampChannel(lerp(left[2], right[2], t)),
  ];
};
const buildTrackPaletteFromRgb = (inputRgb = [0, 255, 191]) => {
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
const DEFAULT_TRACK_PALETTE = Object.freeze(buildTrackPaletteFromRgb([0, 255, 191]));
const PLAYBACK_LEDGER_STORAGE_KEY = 'sound-capsule';
const PLAYBACK_GENRE_SIGNALS = [
  'lofi', 'jazz', 'rock', 'pop', 'synthwave', 'techno', 'ambient', 'classic', 'metal',
  'rap', 'hiphop', 'trap', 'house', 'dubstep', 'relax', 'study', 'indie', 'phonk', 'folk',
];
const createPlaybackLedgerData = () => ({
  tracks: {},
  artists: {},
  totalMinutes: 0,
  totalMs: 0,
  totalPlays: 0,
  totalSessions: 0,
  hourlyTrends: {},
  weeklyTrends: {},
  dailyMinutes: {},
  dailyPlays: {},
  genres: {},
  recentSessions: [],
});
const safeMetricMap = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => key !== '__proto__')
      .map(([key, value]) => [key, Math.max(0, Math.floor(Number(value) || 0))]),
  );
};
const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatPlaybackDuration = (ms) => {
  const safeMs = Math.max(0, Math.floor(Number(ms) || 0));
  const totalMinutes = Math.round(safeMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${hours}h`;
};
const normalizePlaybackLedgerData = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const next = createPlaybackLedgerData();

  next.tracks = Object.fromEntries(
    Object.entries(source.tracks || {})
      .filter(([key]) => key !== '__proto__')
      .map(([id, entry]) => {
        const trackEntry = entry && typeof entry === 'object' ? entry : {};
        return [id, {
          count: Math.max(0, Math.floor(Number(trackEntry.count) || 0)),
          totalMs: Math.max(0, Math.floor(Number(trackEntry.totalMs) || 0)),
          title: String(trackEntry.title || 'Unknown track'),
          author: String(trackEntry.author || 'Unknown artist'),
          thumbnail: String(trackEntry.thumbnail || ''),
          lastListened: trackEntry.lastListened || null,
          lastCompletedAt: trackEntry.lastCompletedAt || null,
        }];
      }),
  );

  next.artists = Object.fromEntries(
    Object.entries(source.artists || {})
      .filter(([key]) => key !== '__proto__')
      .map(([name, entry]) => {
        const artistEntry = entry && typeof entry === 'object' ? entry : {};
        return [name, {
          count: Math.max(0, Math.floor(Number(artistEntry.count) || 0)),
          totalMs: Math.max(0, Math.floor(Number(artistEntry.totalMs) || 0)),
        }];
      }),
  );

  next.hourlyTrends = safeMetricMap(source.hourlyTrends);
  next.weeklyTrends = safeMetricMap(source.weeklyTrends);
  next.dailyMinutes = safeMetricMap(source.dailyMinutes);
  next.dailyPlays = safeMetricMap(source.dailyPlays);
  next.genres = safeMetricMap(source.genres);
  next.recentSessions = Array.isArray(source.recentSessions)
    ? source.recentSessions
      .filter((entry) => entry && typeof entry === 'object')
      .slice(0, 24)
      .map((entry) => ({
        id: String(entry.id || `${entry.trackId || 'session'}-${entry.endedAt || entry.startedAt || Date.now()}`),
        trackId: String(entry.trackId || ''),
        title: String(entry.title || 'Unknown track'),
        author: String(entry.author || 'Unknown artist'),
        thumbnail: String(entry.thumbnail || ''),
        playedMs: Math.max(0, Math.floor(Number(entry.playedMs) || 0)),
        completed: Boolean(entry.completed),
        startedAt: entry.startedAt || null,
        endedAt: entry.endedAt || null,
        reason: String(entry.reason || 'session'),
      }))
    : [];

  const sumTrackMs = Object.values(next.tracks).reduce((total, entry) => total + Math.max(0, Math.floor(Number(entry.totalMs) || 0)), 0);
  const sumTrackPlays = Object.values(next.tracks).reduce((total, entry) => total + Math.max(0, Math.floor(Number(entry.count) || 0)), 0);
  const sourceTotalMs = Math.max(0, Math.floor(Number(source.totalMs) || 0));
  const sourceTotalMinutes = Math.max(0, Math.floor(Number(source.totalMinutes) || 0));

  next.totalMs = sourceTotalMs || sumTrackMs || (sourceTotalMinutes * 60000);
  next.totalMinutes = next.totalMs > 0 ? Math.round(next.totalMs / 60000) : sourceTotalMinutes;
  next.totalPlays = Math.max(0, Math.floor(Number(source.totalPlays) || 0)) || sumTrackPlays;
  next.totalSessions = Math.max(
    0,
    Math.floor(Number(source.totalSessions) || 0),
    next.totalPlays,
    next.recentSessions.length,
  );

  return next;
};
const AETHER_SHARE_ORIGIN = 'https://aetherstudio.me';
const encodeScenePayload = (payload) => {
  try {
    const json = JSON.stringify(payload);
    const bytes = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
    return btoa(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return null;
  }
};
const decodeScenePayload = (encoded) => {
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
const extractSceneYouTubeId = (value) => {
  const text = String(value || '');
  const match = text.match(/(?:v=|\/vi\/|\/v\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || null;
};
const normalizeScenePayload = (raw) => {
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

const getCanonicalKeyToken = (token) => {
  const raw = String(token || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === 'space' || raw === ' ') return 'Space';
  if (lower === 'left' || lower === 'arrowleft') return 'ArrowLeft';
  if (lower === 'right' || lower === 'arrowright') return 'ArrowRight';
  if (lower === 'up' || lower === 'arrowup') return 'ArrowUp';
  if (lower === 'down' || lower === 'arrowdown') return 'ArrowDown';
  if (lower === 'esc' || lower === 'escape') return 'Escape';
  if (lower === 'enter' || lower === 'return') return 'Enter';
  if (lower === 'backspace' || lower === 'deleteleft') return 'Backspace';
  if (lower === 'delete' || lower === 'del' || lower === 'forwarddelete') return 'Delete';
  if (lower === 'slash' || lower === '/') return '/';
  if (/^[a-z]$/i.test(raw)) return raw.toUpperCase();
  if (/^\d$/.test(raw)) return raw;
  return null;
};

const parseShortcutCombo = (combo, isMacPlatform) => {
  const parts = String(combo || '')
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const model = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    key: null,
  };

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'mod') {
      if (isMacPlatform) model.meta = true;
      else model.ctrl = true;
      continue;
    }
    if (lower === 'cmd' || lower === 'command' || lower === 'meta') {
      model.meta = true;
      continue;
    }
    if (lower === 'ctrl' || lower === 'control') {
      model.ctrl = true;
      continue;
    }
    if (lower === 'alt' || lower === 'option') {
      model.alt = true;
      continue;
    }
    if (lower === 'shift') {
      model.shift = true;
      continue;
    }
    if (model.key) return null;
    model.key = getCanonicalKeyToken(part);
    if (!model.key) return null;
  }

  if (!model.key) return null;
  return model;
};

const buildCanonicalShortcutCombo = (parsed, isMacPlatform) => {
  if (!parsed?.key) return '';
  const out = [];
  if (isMacPlatform ? parsed.meta : parsed.ctrl) out.push('Mod');
  if (parsed.ctrl && isMacPlatform) out.push('Ctrl');
  if (parsed.meta && !isMacPlatform) out.push('Meta');
  if (parsed.alt) out.push('Alt');
  if (parsed.shift) out.push('Shift');
  out.push(parsed.key);
  return out.join('+');
};

const getEventKeyToken = (e) => {
  if (!e) return null;
  if (e.code === 'Space') return 'Space';
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'ArrowDown') return e.code;
  if (e.code === 'Escape') return 'Escape';
  if (e.code === 'Enter') return 'Enter';
  if (e.code === 'Backspace') return 'Backspace';
  if (e.code === 'Delete') return 'Delete';
  if (e.code?.startsWith('Key')) return e.code.slice(3).toUpperCase();
  if (e.code?.startsWith('Digit')) return e.code.slice(5);
  return getCanonicalKeyToken(e.key);
};

const isShortcutEventMatch = (e, combo, isMacPlatform) => {
  const parsed = parseShortcutCombo(combo, isMacPlatform);
  if (!parsed) return false;
  return isParsedShortcutEventMatch(e, parsed);
};

const isParsedShortcutEventMatch = (e, parsed) => {
  if (!parsed?.key) return false;
  const key = getEventKeyToken(e);
  if (!key || key !== parsed.key) return false;
  if (e.ctrlKey !== parsed.ctrl) return false;
  if (e.metaKey !== parsed.meta) return false;
  if (e.altKey !== parsed.alt) return false;
  if (e.shiftKey !== parsed.shift) return false;
  return true;
};

const getKeyboardEventElement = (event) => {
  const target = event?.target || (typeof document !== 'undefined' ? document.activeElement : null);
  if (typeof Element !== 'undefined' && target instanceof Element) return target;
  return null;
};

const isNativeKeyboardTarget = (event) => {
  const target = getKeyboardEventElement(event);
  if (!target) return false;
  return Boolean(target.closest('input, textarea, select, button, a[href], [role="button"], [contenteditable="true"], [data-aether-native-keys="true"]'));
};

const toReadableShortcut = (combo, isMacPlatform) => {
  const parsed = parseShortcutCombo(combo, isMacPlatform);
  if (!parsed) return String(combo || '');
  const parts = [];
  if (parsed.ctrl) parts.push(isMacPlatform ? '⌃' : 'Ctrl');
  if (parsed.meta) parts.push(isMacPlatform ? '⌘' : 'Meta');
  if (parsed.alt) parts.push(isMacPlatform ? '⌥' : 'Alt');
  if (parsed.shift) parts.push(isMacPlatform ? '⇧' : 'Shift');
  parts.push(parsed.key === 'Space' ? 'Space' : parsed.key);
  return parts.join(isMacPlatform ? '' : '+');
};

const sanitizeShortcutMap = (candidate, isMacPlatform) => {
  const next = {};
  SHORTCUT_FIELDS.forEach(({ id }) => {
    const raw = candidate?.[id] ?? DEFAULT_SHORTCUTS[id];
    const parsed = parseShortcutCombo(raw, isMacPlatform);
    next[id] = parsed ? buildCanonicalShortcutCombo(parsed, isMacPlatform) : DEFAULT_SHORTCUTS[id];
  });
  return next;
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("[Signal Crash]", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-8 text-center font-black">
          <div className="relative group mb-12">
            <div className="absolute inset-0 bg-red-500/20 blur-[100px] animate-pulse rounded-full" />
            <AlertTriangle className="text-red-500 group-hover:scale-110 transition-transform relative z-10" size={120} strokeWidth={1.5} />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500 text-black px-6 py-1 tracking-[0.5em] text-[10px] skew-x-[-20deg]">SIGNAL_LOST // DECODING_ERR</div>
          </div>
          <h1 className="text-4xl lg:text-6xl text-white uppercase tracking-tighter mb-4 max-w-2xl px-4">Neural Buffer Overload</h1>
          <p className="text-brand-text-dim text-lg mb-12 max-w-xl uppercase tracking-widest font-mono opacity-50">
            Internal decrypt signal failed. The dashboard has encountered a critical parity error.
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-10 py-5 bg-white text-black text-sm uppercase tracking-[0.5em] hover:bg-brand-accent transition-all flex items-center gap-4 group"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" /> Reboot Interface
            </button>
            <div className="text-[10px] font-mono text-red-500/50 uppercase tracking-tighter">ERROR: {this.state.error?.message || "UNDEFINED_FRAGMENT"}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const HeaderVisualControls = memo(forwardRef(function HeaderVisualControls({
  headerIconButtonClass,
  headerAccentButtonClass,
  isGestureControlEnabled,
  openFeedbackPanel,
  openGestureLab,
  openSignalLedger,
  setVisualizerMode,
  visualizerMode,
  auraPreset,
  setAuraPreset,
  isDepthMotionEnabled,
  setIsDepthMotionEnabled,
  isDoodleMode,
  setIsDoodleMode,
  doodleIntensity,
  setDoodleIntensity,
  doodleIntensityBadge,
  setIsAuraStageOpen,
  toggleDiagnostics,
  isDiagnosticsOpen,
  setLastAdded,
  shortcuts,
  setShortcuts,
  isMacPlatform,
  isStandalone,
  globalMediaShortcutsEnabled,
  setGlobalMediaShortcutsEnabled,
  performanceMode,
  setPerformanceMode,
  onSurfaceOpen,
}, ref) {
  const [isLooksPanelOpen, setIsLooksPanelOpen] = useState(false);
  const [isShortcutSettingsOpen, setIsShortcutSettingsOpen] = useState(false);
  const [shortcutDraft, setShortcutDraft] = useState(shortcuts);
  const [shortcutSettingsError, setShortcutSettingsError] = useState('');
  const looksPanelRef = useRef(null);

  const flashLastAdded = useCallback((message, delay = 1500) => {
    setLastAdded(message);
    window.setTimeout(() => setLastAdded(null), delay);
  }, [setLastAdded]);

  const openShortcutSettingsLocal = useCallback(() => {
    onSurfaceOpen?.('shortcuts');
    setShortcutSettingsError('');
    setShortcutDraft(shortcuts);
    setIsShortcutSettingsOpen(true);
  }, [onSurfaceOpen, shortcuts]);

  const closeShortcutSettingsLocal = useCallback(() => {
    setIsShortcutSettingsOpen(false);
    setShortcutSettingsError('');
  }, []);

  const closeLocalSurfaces = useCallback(() => {
    setIsLooksPanelOpen(false);
    closeShortcutSettingsLocal();
  }, [closeShortcutSettingsLocal]);

  useImperativeHandle(ref, () => ({
    openShortcutSettings: openShortcutSettingsLocal,
    close: closeLocalSurfaces,
    isOpen: () => isLooksPanelOpen || isShortcutSettingsOpen,
  }), [closeLocalSurfaces, isLooksPanelOpen, isShortcutSettingsOpen, openShortcutSettingsLocal]);

  useEffect(() => {
    if (!isLooksPanelOpen) return;
    const onPointerDown = (event) => {
      if (looksPanelRef.current && !looksPanelRef.current.contains(event.target)) {
        setIsLooksPanelOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isLooksPanelOpen]);

  useEffect(() => {
    if (!isShortcutSettingsOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeShortcutSettingsLocal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeShortcutSettingsLocal, isShortcutSettingsOpen]);

  const saveShortcutSettingsLocal = useCallback(async () => {
    const normalized = sanitizeShortcutMap(shortcutDraft, isMacPlatform);
    const seen = new Map();

    for (const { id, label } of SHORTCUT_FIELDS) {
      const parsed = parseShortcutCombo(normalized[id], isMacPlatform);
      if (!parsed) {
        setShortcutSettingsError(`Invalid shortcut for ${label}.`);
        return;
      }
      const key = buildCanonicalShortcutCombo(parsed, isMacPlatform);
      if (seen.has(key)) {
        setShortcutSettingsError(`Shortcut conflict: ${label} and ${seen.get(key)} both use ${toReadableShortcut(key, isMacPlatform)}.`);
        return;
      }
      seen.set(key, label);
    }

    setShortcuts(normalized);
    closeShortcutSettingsLocal();
    flashLastAdded('Shortcuts updated', 1600);

    try {
      if (isStandalone && window.aether?.store?.set) {
        await window.aether.store.set(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, !!globalMediaShortcutsEnabled);
      } else {
        localStorage.setItem(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, JSON.stringify(!!globalMediaShortcutsEnabled));
      }
    } catch (e) {
      console.warn('[Aether/Shortcuts] Failed to persist global media shortcut toggle', e);
    }
  }, [closeShortcutSettingsLocal, flashLastAdded, globalMediaShortcutsEnabled, isMacPlatform, isStandalone, setShortcuts, shortcutDraft]);

  return (
    <>
      <div className="hidden md:flex items-center gap-2 no-drag" data-no-maximize="true">
        <button onClick={openSignalLedger} className={`${headerAccentButtonClass} group`} title="Open Signal Ledger">
          <Activity size={16} className="group-hover:animate-pulse" />
        </button>
        <button onClick={openGestureLab} className={`${headerIconButtonClass} ${isGestureControlEnabled ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : ''}`} title="Gesture Lab">
          <Hand size={15} />
        </button>
        <button onClick={openFeedbackPanel} className={headerIconButtonClass} title="Send Feedback">
          <MessageSquare size={15} />
        </button>
        <button onClick={openShortcutSettingsLocal} className={headerIconButtonClass} title="Shortcut Settings">
          <Keyboard size={16} />
        </button>

        <div className="relative" ref={looksPanelRef} data-no-maximize="true">
          <button
            onClick={() => {
              const next = !isLooksPanelOpen;
              if (next) onSurfaceOpen?.('looks');
              setIsLooksPanelOpen(next);
            }}
            className={`${headerIconButtonClass} ${isLooksPanelOpen ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : ''}`}
            title="Visual presets"
          >
            <Sparkles size={14} />
          </button>

          {isLooksPanelOpen && (
            <div className="absolute left-0 mt-2 z-[340] w-64 rounded-2xl border border-white/15 bg-[#0b0f14]/95 backdrop-blur-xl p-3 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Visualizer</div>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {['bars', 'pulse'].map((mode) => (
                  <button key={mode} onClick={() => setVisualizerMode(mode)} className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.14em] border transition-colors ${visualizerMode === mode ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'bg-white/[0.03] border-white/10 text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                    {mode === 'pulse' ? 'Aura' : 'Bars'}
                  </button>
                ))}
              </div>

              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Performance</div>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {PERFORMANCE_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setPerformanceMode(mode.id);
                      flashLastAdded(`Performance - ${mode.label}`, 1500);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.14em] border transition-colors ${performanceMode === mode.id ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'bg-white/[0.03] border-white/10 text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}
                    title={mode.detail}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Aura Preset</div>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {AURA_PRESETS.map((preset) => (
                  <button key={preset.id} onClick={() => { setAuraPreset(preset.id); flashLastAdded(`Aura preset - ${preset.label}`); }} className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.14em] border transition-colors ${auraPreset === preset.id ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'bg-white/[0.03] border-white/10 text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-3">
                <button onClick={() => { setIsDepthMotionEnabled((prev) => !prev); flashLastAdded(isDepthMotionEnabled ? 'Depth motion disabled' : 'Depth motion enabled'); }} className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.14em] border transition-colors ${isDepthMotionEnabled ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'bg-white/[0.03] border-white/10 text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                  Depth
                </button>
                <button onClick={() => { openGestureLab(); setIsLooksPanelOpen(false); }} className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.14em] border transition-colors ${isGestureControlEnabled ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'bg-white/[0.03] border-white/10 text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                  Gesture
                </button>
              </div>

              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Doodle Preset</div>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {DOODLE_PRESETS.map((preset) => (
                  <button key={preset.id} onClick={() => { setDoodleIntensity(preset.id); flashLastAdded(`Doodle preset - ${preset.label}`); }} className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.14em] border transition-colors ${doodleIntensity === preset.id ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'bg-white/[0.03] border-white/10 text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                    {preset.badge}
                  </button>
                ))}
              </div>

              <button onClick={() => { setIsDoodleMode((prev) => !prev); flashLastAdded(isDoodleMode ? 'Doodle mode disabled' : 'Doodle mode enabled', 1600); }} className={`w-full px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${isDoodleMode ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent mb-3' : 'bg-white/[0.03] border-white/10 text-white/65 hover:text-brand-accent hover:border-brand-accent/35 mb-3'}`}>
                {isDoodleMode ? `Doodle ON - ${doodleIntensityBadge}` : 'Enable Doodle'}
              </button>

              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 mt-1 border-t border-white/10 pt-3">System & Tools</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => { setIsAuraStageOpen(true); setIsLooksPanelOpen(false); }} className="flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-white/65 transition-colors hover:text-brand-accent hover:border-brand-accent/35">
                  <Layers size={14} />
                  <span className="text-[8px] font-black uppercase tracking-[0.12em]">Aura Stage</span>
                </button>
                <button onClick={() => { toggleDiagnostics(); setIsLooksPanelOpen(false); }} className={`flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-colors ${isDiagnosticsOpen ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'border-white/10 bg-white/[0.03] text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                  <Monitor size={14} />
                  <span className="text-[8px] font-black uppercase tracking-[0.12em]">Diagnostics</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {typeof document !== 'undefined' ? createPortal(
        <AnimatePresence>
          {isShortcutSettingsOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[340] flex items-start justify-center p-4 pt-6 md:items-center md:pt-4" onClick={closeShortcutSettingsLocal}>
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.96, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} className="relative z-10 flex w-[min(96vw,920px)] max-h-[min(92vh,calc(100vh-2rem))] flex-col overflow-hidden rounded-[2rem] border border-brand-accent/25 bg-[#090b0f]/95 shadow-[0_0_90px_rgba(0,255,191,0.15)]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/20 px-5 py-5 md:px-6 md:py-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Settings</div>
                    <div className="text-2xl md:text-3xl font-black text-brand-accent uppercase tracking-tight">Shortcut Settings</div>
                    <div className="text-white/55 mt-2 text-sm">Use formats like <span className="text-brand-accent">Mod+Alt+Space</span>, <span className="text-brand-accent">Shift+M</span>, <span className="text-brand-accent">D</span>.</div>
                  </div>
                  <button onClick={closeShortcutSettingsLocal} className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.03] text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close shortcut settings">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5 custom-scrollbar-heavy">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SHORTCUT_FIELDS.map((field) => (
                      <label key={field.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-white/75 text-sm">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-2">{field.label}</div>
                        <input value={shortcutDraft[field.id] || ''} onChange={(e) => { setShortcutSettingsError(''); setShortcutDraft((prev) => ({ ...prev, [field.id]: e.target.value })); }} className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand-accent/50" placeholder="Mod+Alt+Space" />
                        <div className="mt-1 text-[11px] text-white/40">Current: {toReadableShortcut(shortcuts[field.id], isMacPlatform)}</div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <label className="flex items-start gap-3 text-sm text-white/75">
                      <input type="checkbox" checked={globalMediaShortcutsEnabled} onChange={(e) => setGlobalMediaShortcutsEnabled(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-accent" />
                      <span>
                        Enable global media shortcuts (play/pause, next, previous)
                        <span className="block text-[11px] text-white/45 mt-1">This affects system-wide key capture and may conflict with OS/app controls. Restart app after change.</span>
                      </span>
                    </label>
                  </div>

                  {shortcutSettingsError && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{shortcutSettingsError}</div>}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap border-t border-white/10 bg-black/20 px-5 py-4 md:px-6 md:py-5">
                  <button onClick={() => { setShortcutSettingsError(''); setShortcutDraft(sanitizeShortcutMap(DEFAULT_SHORTCUTS, isMacPlatform)); }} className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 hover:border-brand-accent/40 hover:text-brand-accent transition-all">
                    Reset to Defaults
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={closeShortcutSettingsLocal} className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 hover:border-brand-accent/40 hover:text-brand-accent transition-all">Cancel</button>
                    <button onClick={saveShortcutSettingsLocal} className="px-4 py-2 rounded-xl border border-brand-accent/35 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-all">Save</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      ) : null}
    </>
  );
}));

const HeaderSleepTimerControls = memo(forwardRef(function HeaderSleepTimerControls({
  headerIconButtonClass,
  sleepTimerValue,
  stopAfterTrack,
  sleepRemainingStr,
  sleepDeadline,
  handleSetSleepTimer,
  sleepCustomMinutes,
  setSleepCustomMinutes,
  setStopAfterTrack,
  sleepFadeEnabled,
  setSleepFadeEnabled,
  onSurfaceOpen,
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  useImperativeHandle(ref, () => ({
    close: () => setIsOpen(false),
    isOpen: () => isOpen,
  }), [isOpen]);

  const progress = sleepTimerValue > 0 && sleepDeadline ? 1 : 0;

  return (
    <div className="relative" ref={menuRef} data-no-maximize="true">
      <button
        onClick={() => {
          const next = !isOpen;
          if (next) onSurfaceOpen?.('sleep');
          setIsOpen(next);
        }}
        className={`${(sleepTimerValue > 0 || stopAfterTrack) ? 'no-drag flex h-10 items-center gap-1.5 rounded-2xl border border-brand-accent/35 bg-brand-accent/12 px-3 text-brand-accent shadow-[0_0_14px_rgba(0,255,191,0.12)] transition-all hover:border-brand-accent/55 hover:bg-brand-accent/18' : headerIconButtonClass}`}
        title={(sleepTimerValue > 0 || stopAfterTrack) ? `Sleep active • ${stopAfterTrack ? 'End of track' : (sleepRemainingStr || `${sleepTimerValue}m`)}` : 'Sleep Timer'}
      >
        <div className="relative flex items-center justify-center">
          <Clock size={14} className={(sleepTimerValue > 0 || stopAfterTrack) ? 'animate-pulse' : ''} />
          {(sleepTimerValue > 0) && (
            <svg className="absolute -inset-1 -rotate-90" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.1" />
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="62.8" strokeDashoffset={62.8 * (1 - progress)} />
            </svg>
          )}
        </div>
        {(sleepTimerValue > 0 || stopAfterTrack) && <span className="ml-1 text-[11px] font-black tracking-[0.12em] tabular-nums">{stopAfterTrack ? 'END' : (sleepRemainingStr || `${sleepTimerValue}m`)}</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 z-[340] w-72 rounded-2xl border border-white/12 bg-[#080c10]/96 backdrop-blur-2xl p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-brand-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.26em] text-white/60">Sleep Timer</span>
            </div>
            {sleepTimerValue > 0 && <div className="rounded-full border border-brand-accent/30 bg-brand-accent/10 px-2.5 py-1 text-[11px] font-black tabular-nums text-brand-accent">{sleepRemainingStr || `${sleepTimerValue}m`}</div>}
          </div>

          <div className="mb-3">
            <div className="text-[8px] uppercase tracking-[0.22em] text-white/30 mb-2">Presets</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[15, 30, 60, 120].map((m) => (
                <button key={`sleep-${m}`} onClick={() => handleSetSleepTimer(m)} className={`rounded-xl py-2 text-[10px] font-black transition-all ${sleepTimerValue === m ? 'bg-brand-accent text-black shadow-[0_0_12px_rgba(0,255,191,0.3)]' : 'border border-white/10 bg-white/[0.04] text-white/60 hover:border-brand-accent/35 hover:text-brand-accent'}`}>
                  {m < 60 ? `${m}m` : `${m / 60}h`}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="text-[8px] uppercase tracking-[0.22em] text-white/30 mb-2">Custom</div>
            <div className="flex gap-2">
              <input type="number" min="1" max="480" value={sleepCustomMinutes} onChange={(e) => setSleepCustomMinutes(e.target.value)} placeholder="Minutes..." className="no-drag flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] font-black text-white outline-none placeholder:text-white/25 focus:border-brand-accent/50 focus:bg-brand-accent/[0.04] transition-all" style={{ WebkitUserSelect: 'text', userSelect: 'text' }} />
              <button onClick={() => { const val = parseInt(sleepCustomMinutes, 10); if (val > 0 && val <= 480) { handleSetSleepTimer(val); setSleepCustomMinutes(''); } }} disabled={!sleepCustomMinutes || parseInt(sleepCustomMinutes, 10) <= 0} className="rounded-xl border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-[10px] font-black text-brand-accent transition-all hover:bg-brand-accent hover:text-black disabled:opacity-30">
                Set
              </button>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition-all hover:border-white/15">
            <div className="flex items-center gap-2.5">
              <Music size={14} className="text-brand-accent" />
              <div>
                <div className="text-[10px] font-black text-white/85">Stop after track</div>
                <div className="text-[8px] text-white/35 mt-0.5">Pause when current song ends</div>
              </div>
            </div>
            <button onClick={() => { const next = !stopAfterTrack; setStopAfterTrack(next); if (next) handleSetSleepTimer(0); }} className={`h-5 w-9 rounded-full p-1 transition-all ${stopAfterTrack ? 'bg-brand-accent' : 'bg-white/10'}`}>
              <div className={`h-3 w-3 rounded-full bg-white shadow-sm transition-all ${stopAfterTrack ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition-all hover:border-white/15">
            <div className="flex items-center gap-2.5">
              <Zap size={14} className="text-white/50" />
              <div>
                <div className="text-[10px] font-black text-white/85">Fade out audio</div>
                <div className="text-[8px] text-white/35 mt-0.5">Smooth volume ramp-down</div>
              </div>
            </div>
            <button onClick={() => setSleepFadeEnabled((p) => !p)} className={`relative h-5 w-9 rounded-full transition-colors ${sleepFadeEnabled ? 'bg-brand-accent' : 'bg-white/15'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${sleepFadeEnabled ? 'left-[calc(100%-18px)]' : 'left-0.5'}`} />
            </button>
          </div>

          {sleepTimerValue > 0 && <button onClick={() => handleSetSleepTimer(0)} className="w-full rounded-xl border border-red-500/20 bg-red-500/8 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-400 transition-all hover:bg-red-500/18">Cancel Timer</button>}
        </div>
      )}
    </div>
  );
}));

const HeaderSearchBox = memo(function HeaderSearchBox({
  searchQuery,
  isSearching,
  hasActiveSearchState,
  isAuraMode,
  disabled,
  onSearch,
  onClear,
}) {
  const [draft, setDraft] = useState(searchQuery || '');

  const trimmedDraft = draft.trim();
  const hasLocalSearchState = Boolean(trimmedDraft || hasActiveSearchState);
  const isYouTubeLink = /(youtube\.com|youtu\.be)/i.test(trimmedDraft);

  const submitSearch = useCallback((event) => {
    event.preventDefault();
    if (!trimmedDraft) return;
    onSearch(trimmedDraft);
  }, [onSearch, trimmedDraft]);

  const clearSearch = useCallback(() => {
    setDraft('');
    onClear();
  }, [onClear]);

  return (
    <form onSubmit={submitSearch} className="relative w-full group no-drag" data-no-maximize="true">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-dim group-focus-within:text-brand-accent z-10 transition-colors" size={18} />
      <input
        type="text"
        placeholder="Search tracks, artists, or paste a YouTube link"
        className={`w-full rounded-full pl-12 pr-28 h-11 text-sm md:text-[14px] outline-none transition-all text-ellipsis overflow-hidden whitespace-nowrap ${isAuraMode ? 'bg-white/[0.035] border border-white/[0.14] focus:border-brand-accent/60 focus:bg-brand-accent/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.2)]' : 'bg-white/[0.04] border border-white/10 focus:border-brand-accent/50 focus:bg-brand-accent/[0.03]'} disabled:opacity-30 disabled:cursor-not-allowed`}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && hasLocalSearchState) {
            event.preventDefault();
            clearSearch();
          }
        }}
      />
      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
        {isYouTubeLink && (
          <span className="rounded-full border border-brand-accent/22 bg-brand-accent/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-brand-accent/78">
            Link
          </span>
        )}
        {isSearching ? (
          <Loader2 className="animate-spin text-brand-accent" size={16} />
        ) : (
          <button
            type="submit"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/42 transition-all hover:border-brand-accent/35 hover:bg-brand-accent/[0.08] hover:text-brand-accent"
            title="Run search"
          >
            <Search size={12} />
          </button>
        )}
        {hasLocalSearchState && (
          <button
            type="button"
            onClick={clearSearch}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/38 transition-all hover:border-brand-accent/35 hover:text-brand-accent"
            title="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </form>
  );
});

const PlaybackProgressIsland = memo(function PlaybackProgressIsland({
  durationMs,
  getPositionMs,
  onSeek,
  accent,
  glow,
  barClassName = 'h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/10',
  fillClassName = 'h-full rounded-full',
  timeRowClassName = 'flex items-center justify-between gap-3 text-[10px] font-mono text-white/42',
  durationLabel,
  middleContent = null,
}) {
  const fillRef = useRef(null);
  const [timeLabel, setTimeLabel] = useState('0:00');
  const safeDurationMs = Math.max(0, Number(durationMs) || 0);

  useEffect(() => {
    let raf = 0;
    let lastLabelAt = 0;
    let lastLabel = '';

    const update = (now) => {
      const liveMs = Math.max(0, Math.floor(Number(getPositionMs?.() || 0)));
      const pct = safeDurationMs > 0 ? clamp01(liveMs / safeDurationMs) : 0;
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${pct})`;
      }

      if (now - lastLabelAt > 250) {
        const nextLabel = formatTime(liveMs);
        if (nextLabel !== lastLabel) {
          lastLabel = nextLabel;
          setTimeLabel(nextLabel);
        }
        lastLabelAt = now;
      }

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [getPositionMs, safeDurationMs]);

  const seekFromPointer = useCallback((event) => {
    if (safeDurationMs <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pos = clamp01((event.clientX - rect.left) / Math.max(rect.width, 1));
    onSeek(pos * safeDurationMs);
  }, [onSeek, safeDurationMs]);

  return (
    <div className="space-y-2">
      <div className={barClassName} onClick={seekFromPointer}>
        <div
          ref={fillRef}
          className={fillClassName}
          style={{
            background: accent,
            boxShadow: glow ? `0 0 14px ${glow}` : undefined,
            transform: 'scaleX(0)',
            transformOrigin: 'left center',
            willChange: 'transform',
          }}
        />
      </div>
      <div className={timeRowClassName}>
        <span>{timeLabel}</span>
        {middleContent}
        <span>{durationLabel || formatTime(safeDurationMs)}</span>
      </div>
    </div>
  );
});

const PlayerModePill = memo(function PlayerModePill({ videoMode, switchVideoMode, variant = 'main' }) {
  const isCompact = variant === 'dual';
  const activeClass = 'bg-brand-accent text-black shadow-[0_0_12px_rgba(0,255,191,0.34)]';
  const inactiveClass = isCompact ? 'text-white/45 hover:text-white' : 'text-white/40 hover:text-white';
  const buttonClass = isCompact
    ? 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] transition-all'
    : 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all';
  const wrapClass = isCompact
    ? 'flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1'
    : 'flex items-center bg-white/[0.04] border border-white/10 rounded-2xl p-1 gap-1';
  const iconSize = isCompact ? 10 : 11;

  return (
    <div className={wrapClass}>
      <button onClick={() => switchVideoMode(null)} className={`${buttonClass} ${videoMode === null ? activeClass : inactiveClass}`}>
        <Music size={iconSize} /> Audio
      </button>
      <button onClick={() => switchVideoMode('dual')} className={`${buttonClass} ${videoMode === 'dual' ? activeClass : inactiveClass}`}>
        <Columns2 size={iconSize} /> Dual
      </button>
      <button onClick={() => switchVideoMode('cinema')} className={`${buttonClass} ${videoMode === 'cinema' ? activeClass : inactiveClass}`}>
        <Clapperboard size={iconSize} /> Cinema
      </button>
    </div>
  );
});

const PlayerTransportControls = memo(function PlayerTransportControls({
  handleControl,
  isPlaying,
  isAuraMode,
  playButtonRef,
  beatRingsRef,
  trackControlAccent,
  trackControlGlow,
}) {
  return (
    <div className="flex items-center justify-center w-full mt-2 relative">
      <div className={`flex items-center backdrop-blur-3xl border p-2 rounded-3xl gap-4 relative z-10 ${isAuraMode ? 'bg-white/[0.04] border-white/[0.16] shadow-[0_12px_40px_rgba(0,0,0,0.22)]' : 'bg-white/5 border-white/5'}`}>
        <button onClick={() => handleControl('previous')} className="p-3 hover:text-brand-accent transition-colors active:scale-90"><Rewind size={22} fill="currentColor" /></button>
        <button
          ref={playButtonRef}
          onClick={() => handleControl(isPlaying ? 'pause' : 'resume')}
          className="w-16 h-16 text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
          style={{ background: trackControlAccent, boxShadow: `0 0 32px ${trackControlGlow}` }}
        >
          {isAuraMode && <div ref={beatRingsRef} className="absolute inset-0" />}
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>
        <button onClick={() => handleControl('skip')} className="p-3 hover:text-brand-accent transition-colors active:scale-90"><FastForward size={22} fill="currentColor" /></button>
      </div>
    </div>
  );
});

const PlayerActionButtons = memo(function PlayerActionButtons({
  canDownloadCurrentTrack,
  canOpenCurrentSource,
  currentTrack,
  currentTrackSourceUrl,
  cycleRepeatMode,
  handleControl,
  handleDownloadCurrentTrack,
  isCurrentTrackFavorite,
  isDownloadingTrack,
  isFocusedMode,
  openLibraryOverlay,
  openTrackInspect,
  queueLength,
  repeatMode,
  repeatModeBadge,
  repeatModeLabel,
  setIsFocusedMode,
  setIsPlayerOverlayOpen,
  toggleFavoriteTrack,
}) {
  return (
    <div className="flex items-center gap-1 no-drag ml-auto">
      <button disabled={queueLength === 0} onClick={() => handleControl('clear')} className="p-2 text-white/20 hover:text-red-500 transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title="Clear Queue"><Trash2 size={14} /></button>
      <button onClick={cycleRepeatMode} className={`relative p-2 transition-colors ${repeatMode === 'off' ? 'text-white/20 hover:text-brand-accent' : 'text-brand-accent'}`} title={repeatModeLabel}>
        <Repeat size={14} />
        {repeatModeBadge && <span className="absolute right-0 top-0 text-[8px] font-black">{repeatModeBadge}</span>}
      </button>
      <button onClick={() => {
        if (!canOpenCurrentSource) return;
        window.aether?.openExternal(currentTrackSourceUrl);
      }} disabled={!canOpenCurrentSource} className="p-2 text-white/20 hover:text-brand-accent transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title="Open Source"><ExternalLink size={14} /></button>
      <button onClick={handleDownloadCurrentTrack} disabled={!canDownloadCurrentTrack || isDownloadingTrack} className="p-2 text-white/20 hover:text-brand-accent transition-colors disabled:opacity-25 disabled:cursor-not-allowed" title={isDownloadingTrack ? 'Exporting...' : 'Export Audio to File'}><Download size={14} className={isDownloadingTrack ? 'animate-pulse' : ''} /></button>
      <button onClick={() => toggleFavoriteTrack(currentTrack)} disabled={!currentTrack} className={`p-2 transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${isCurrentTrackFavorite ? 'text-rose-300' : 'text-white/20 hover:text-rose-300'}`} title={isCurrentTrackFavorite ? 'Remove from Favorites' : 'Add to Favorites'}><Heart size={14} fill={isCurrentTrackFavorite ? 'currentColor' : 'none'} /></button>
      <button onClick={() => openLibraryOverlay({ type: 'track', items: [currentTrack] })} className="p-2 text-white/20 hover:text-brand-accent transition-colors" title="Save to Library Overlay"><Plus size={14} /></button>
      <button onClick={() => openTrackInspect(currentTrack, 'now-playing')} className="p-2 text-white/20 hover:text-brand-accent transition-colors" title="Inspect Track"><Eye size={14} /></button>
      <div className="w-px h-3 bg-white/10 mx-1" />
      <button onClick={() => setIsPlayerOverlayOpen(true)} className="p-2 text-white/40 hover:text-brand-accent transition-colors" title="Open Player Overlay"><ListMusic size={16} /></button>
      <button onClick={() => setIsFocusedMode(!isFocusedMode)} className={`p-2 transition-colors ${isFocusedMode ? 'text-brand-accent' : 'text-white/40 hover:text-brand-accent'}`} title="Toggle Focus Mode"><Target size={16} /></button>
    </div>
  );
});

const LyricLineIsland = memo(function LyricLineIsland({
  bucket,
  index,
  isActive,
  isDualWorkspaceMode,
  line,
  onSeek,
  setActiveRef,
}) {
  let lyricLineClass = '';
  if (isDualWorkspaceMode) {
    lyricLineClass = 'max-w-[min(92%,760px)] px-3 md:px-5 text-2xl sm:text-3xl lg:text-5xl font-black leading-tight w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere] transition-[transform,opacity,filter,color,text-shadow] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu origin-center will-change-[transform,opacity,filter]';
    if (bucket === 'active') lyricLineClass += ' text-brand-accent scale-[1.06] opacity-100 drop-shadow-[0_0_24px_rgba(0,255,191,0.34)]';
    else if (bucket === 'near') lyricLineClass += ' text-white/52 opacity-68 scale-[1.02]';
    else if (bucket === 'mid') lyricLineClass += ' text-white/30 opacity-34 scale-100 blur-[0.45px]';
    else lyricLineClass += ' text-white/18 opacity-18 scale-[0.985] blur-[0.85px]';
  } else {
    lyricLineClass = 'text-base sm:text-lg lg:text-xl font-bold transition-[transform,opacity,filter,color,text-shadow] duration-380 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu leading-snug py-1.5 relative will-change-[transform,opacity,filter]';
    if (bucket === 'active') lyricLineClass += ' text-brand-accent scale-[1.035] opacity-100 drop-shadow-[0_0_12px_rgba(0,255,191,0.34)]';
    else if (bucket === 'near') lyricLineClass += ' text-white/78 opacity-92';
    else if (bucket === 'mid') lyricLineClass += ' text-white/48 opacity-68 blur-[0.25px]';
    else lyricLineClass += ' text-white/30 opacity-48 blur-[0.7px]';
  }

  const delay = bucket === 'active' ? 0 : bucket === 'near' ? 18 : bucket === 'mid' ? 36 : 54;
  return (
    <div
      ref={isActive ? setActiveRef : null}
      className={`${lyricLineClass} cursor-pointer hover:!opacity-90 hover:!text-white/75 hover:!scale-[1.015] hover:-translate-y-[1px] transition-all`}
      onClick={() => onSeek(line.time)}
      style={isDualWorkspaceMode ? { textWrap: 'balance', transitionDelay: `${delay}ms` } : { transitionDelay: `${Math.min(delay, 42)}ms` }}
    >
      {line.text}
    </div>
  );
}, (prev, next) => (
  prev.bucket === next.bucket
  && prev.index === next.index
  && prev.isActive === next.isActive
  && prev.isDualWorkspaceMode === next.isDualWorkspaceMode
  && prev.line === next.line
  && prev.onSeek === next.onSeek
  && prev.setActiveRef === next.setActiveRef
));

const SignalLedgerIsland = memo(forwardRef(function SignalLedgerIsland({
  getProxyUrl,
  currentTrack,
  isPlaying,
  getActivePlaybackPositionMs,
  setLastAdded,
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [soundCapsuleData, setSoundCapsuleData] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0);
  const [ledgerError, setLedgerError] = useState('');
  const [liveTick, setLiveTick] = useState(0);
  const [isClearLedgerOpen, setIsClearLedgerOpen] = useState(false);
  const [ledgerClearPassword, setLedgerClearPassword] = useState('');
  const [ledgerClearError, setLedgerClearError] = useState('');
  const [isClearingLedger, setIsClearingLedger] = useState(false);

  const loadLedger = useCallback(async () => {
    try {
      setLedgerError('');
      let data = null;
      if (window.aether?.store?.get) {
        data = await window.aether.store.get(PLAYBACK_LEDGER_STORAGE_KEY);
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(PLAYBACK_LEDGER_STORAGE_KEY);
        data = raw ? JSON.parse(raw) : null;
      }
      const normalized = normalizePlaybackLedgerData(data);
      setSoundCapsuleData(normalized);
      setLastUpdatedAt(Date.now());
      return normalized;
    } catch (error) {
      setLedgerError(error?.message || 'Ledger refresh failed');
      const fallback = normalizePlaybackLedgerData(null);
      setSoundCapsuleData(fallback);
      return fallback;
    }
  }, []);

  const soundLedgerView = useMemo(() => {
    const data = normalizePlaybackLedgerData(soundCapsuleData);
    if (!data) return null;
    const totalTracksPlayed = data.totalPlays || Object.values(data.tracks || {}).reduce((total, entry) => total + Math.max(0, Math.floor(Number(entry?.count) || 0)), 0);
    const totalMs = Math.max(0, Math.floor(Number(data.totalMs) || (Number(data.totalMinutes) || 0) * 60000));
    const todayKey = getLocalDateKey(new Date());
    const recentWeek = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = getLocalDateKey(date);
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toUpperCase(),
        minutesMs: Math.max(0, Math.floor(Number(data.dailyMinutes?.[key]) || 0)),
        plays: Math.max(0, Math.floor(Number(data.dailyPlays?.[key]) || 0)),
      };
    });
    const weekMaxMs = Math.max(1, ...recentWeek.map((entry) => entry.minutesMs));
    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      count: Math.max(0, Number(data.hourlyTrends?.[hour] || 0)),
    }));
    const peakHourMax = Math.max(1, ...peakHours.map((entry) => entry.count));
    const topWindow = [...peakHours].sort((a, b) => b.count - a.count).filter((entry) => entry.count > 0).slice(0, 3);
    const topTracks = Object.entries(data.tracks || {})
      .sort((a, b) => {
        const countDiff = (b[1]?.count || 0) - (a[1]?.count || 0);
        if (countDiff !== 0) return countDiff;
        return (b[1]?.totalMs || 0) - (a[1]?.totalMs || 0);
      })
      .slice(0, 6);
    const topArtists = Object.entries(data.artists || {})
      .sort((a, b) => {
        const countDiff = (b[1]?.count || 0) - (a[1]?.count || 0);
        if (countDiff !== 0) return countDiff;
        return (b[1]?.totalMs || 0) - (a[1]?.totalMs || 0);
      })
      .slice(0, 6);
    const genreMix = Object.entries(data.genres || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const recentSessions = Array.isArray(data.recentSessions) ? data.recentSessions.slice(0, 8) : [];
    const completedSessions = recentSessions.filter((session) => session.completed).length;
    const totalSessions = Math.max(0, Math.floor(Number(data.totalSessions) || totalTracksPlayed));
    const todayMs = Math.max(0, Math.floor(Number(data.dailyMinutes?.[todayKey]) || 0));
    const todayPlays = Math.max(0, Math.floor(Number(data.dailyPlays?.[todayKey]) || 0));
    const averageSessionMs = totalSessions > 0 ? Math.floor(totalMs / totalSessions) : 0;
    const completionRate = recentSessions.length > 0 ? Math.round((completedSessions / recentSessions.length) * 100) : 0;
    const activeDays = recentWeek.filter((entry) => entry.minutesMs > 0 || entry.plays > 0).length;
    let streakDays = 0;
    for (let i = recentWeek.length - 1; i >= 0; i -= 1) {
      if (recentWeek[i].minutesMs <= 0 && recentWeek[i].plays <= 0) break;
      streakDays += 1;
    }
    const sumRange = (startDate, endDate) => {
      let minutesMs = 0;
      let plays = 0;
      const cursor = new Date(startDate);
      cursor.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        const key = getLocalDateKey(cursor);
        minutesMs += Math.max(0, Math.floor(Number(data.dailyMinutes?.[key]) || 0));
        plays += Math.max(0, Math.floor(Number(data.dailyPlays?.[key]) || 0));
        cursor.setDate(cursor.getDate() + 1);
      }
      return { minutesMs, plays };
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysAgo = (days) => {
      const date = new Date(today);
      date.setDate(date.getDate() - days);
      return date;
    };
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const previousYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(today.getFullYear() - 1, 11, 31);
    const periodSummary = [
      ['This Week', sumRange(daysAgo(6), today)],
      ['Previous Week', sumRange(daysAgo(13), daysAgo(7))],
      ['This Month', sumRange(monthStart, today)],
      ['Previous Month', sumRange(previousMonthStart, previousMonthEnd)],
      ['This Year', sumRange(yearStart, today)],
      ['Previous Year', sumRange(previousYearStart, previousYearEnd)],
    ];

    return {
      ...data,
      recentWeek,
      weekMaxMs,
      peakHours,
      peakHourMax,
      topWindow,
      topTracks,
      topArtists,
      genreMix,
      recentSessions,
      totalMs,
      totalSessions,
      activeDays,
      totalTracksPlayed,
      todayMs,
      todayPlays,
      averageSessionMs,
      completionRate,
      streakDays,
      periodSummary,
    };
  }, [soundCapsuleData]);

  const open = useCallback(() => {
    setIsOpen(true);
    loadLedger();
  }, [loadLedger]);

  const close = useCallback(() => {
    setIsClearLedgerOpen(false);
    setIsOpen(false);
  }, []);

  const syncLedger = useCallback(async () => {
    await loadLedger();
    setLastAdded?.('Signal Ledger synced');
    window.setTimeout(() => setLastAdded?.(null), 2200);
  }, [loadLedger, setLastAdded]);

  const requestClearLedger = useCallback(async () => {
    setLedgerClearPassword('');
    setLedgerClearError('');
    try {
      const status = await window.aether?.getLockStatus?.();
      if (!status?.enabled) {
        setLedgerClearError('Set up App Lock first, then Signal Ledger can be cleared safely.');
        setIsClearLedgerOpen(true);
        return;
      }
      setIsClearLedgerOpen(true);
    } catch (error) {
      setLedgerClearError(error?.message || 'Could not check App Lock.');
      setIsClearLedgerOpen(true);
    }
  }, []);

  const clearLedgerAfterAuth = useCallback(async (method = 'password') => {
    if (isClearingLedger) return;
    setIsClearingLedger(true);
    setLedgerClearError('');
    try {
      const status = await window.aether?.getLockStatus?.();
      if (!status?.enabled) {
        throw new Error('Set up App Lock first, then Signal Ledger can be cleared safely.');
      }
      let verified = false;
      if (method === 'biometric') {
        const res = await window.aether?.verifyAppLockBiometric?.();
        verified = !!res?.success;
      } else {
        if (!ledgerClearPassword.trim()) throw new Error('Enter your App Lock password.');
        const res = await window.aether?.verifyAppLockPassword?.(ledgerClearPassword);
        verified = !!res?.success;
      }
      if (!verified) throw new Error('Verification failed.');
      const emptyLedger = createPlaybackLedgerData();
      if (window.aether?.store?.set) {
        await window.aether.store.set(PLAYBACK_LEDGER_STORAGE_KEY, emptyLedger);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PLAYBACK_LEDGER_STORAGE_KEY, JSON.stringify(emptyLedger));
      }
      setSoundCapsuleData(emptyLedger);
      setLastUpdatedAt(Date.now());
      setLedgerClearPassword('');
      setIsClearLedgerOpen(false);
      setLastAdded?.('Signal Ledger cleared');
      window.setTimeout(() => setLastAdded?.(null), 2600);
    } catch (error) {
      setLedgerClearError(error?.message || 'Could not clear Signal Ledger.');
    } finally {
      setIsClearingLedger(false);
    }
  }, [isClearingLedger, ledgerClearPassword, setLastAdded]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const refreshInterval = window.setInterval(loadLedger, 5000);
    const liveInterval = window.setInterval(() => setLiveTick((tick) => tick + 1), 2500);
    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(liveInterval);
    };
  }, [isOpen, loadLedger]);

  useImperativeHandle(ref, () => ({
    open,
    close,
    isOpen: () => isOpen,
  }), [close, isOpen, open]);

  if (!isOpen || !soundLedgerView) return null;

  const livePositionMs = currentTrack && isPlaying ? Math.max(0, Math.floor(Number(getActivePlaybackPositionMs?.() || liveTick * 0) || 0)) : 0;
  const liveDurationMs = Math.max(0, Math.floor(Number(currentTrack?.totalDurationMs || currentTrack?.duration || 0)));
  const liveProgressPct = liveDurationMs > 0 ? clamp01(livePositionMs / liveDurationMs) * 100 : 0;
  const updatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'fresh';
  const statCards = [
    ['Listening', formatPlaybackDuration(soundLedgerView.totalMs), `${soundLedgerView.activeDays} active days`],
    ['Today', formatPlaybackDuration(soundLedgerView.todayMs), `${soundLedgerView.todayPlays} plays`],
    ['Plays', String(soundLedgerView.totalTracksPlayed), `${soundLedgerView.totalSessions} sessions`],
    ['Average', formatPlaybackDuration(soundLedgerView.averageSessionMs), `${soundLedgerView.completionRate}% recent completion`],
  ];

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[350] flex items-center justify-center bg-black/[0.82] p-3 md:p-5"
      >
        <div className="absolute inset-0 bg-black/80" onClick={close} />
        <motion.div
          initial={{ y: 18, scale: 0.985, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 12, scale: 0.985, opacity: 0 }}
          className="relative z-10 flex h-[min(92vh,940px)] w-full max-w-[1220px] flex-col overflow-hidden rounded-[1.8rem] border border-brand-accent/20 bg-[#07090c] shadow-[0_18px_70px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#090d11] px-5 py-4 md:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/10">
                <Signal size={20} className="text-brand-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/34">Playback Intelligence</div>
                <div className="truncate text-2xl font-black uppercase tracking-tight text-brand-accent">Signal Ledger</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                  Live refresh - {updatedLabel}{ledgerError ? ` - ${ledgerError}` : ''}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={requestClearLedger} className="flex h-10 items-center gap-2 rounded-xl border border-red-500/18 bg-red-500/[0.06] px-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-200/70 transition-colors hover:border-red-400/40 hover:text-red-200" title="Clear Signal Ledger">
                <Trash2 size={13} /> Clear
              </button>
              <button onClick={syncLedger} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 transition-colors hover:border-brand-accent/35 hover:text-brand-accent" title="Refresh ledger">
                <RefreshCw size={13} /> Sync
              </button>
              <button onClick={close} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-white/45 transition-colors hover:border-red-500/40 hover:text-red-400" title="Close">
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="custom-scrollbar-heavy flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-6" style={{ scrollBehavior: 'auto' }}>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <section className="rounded-[1.5rem] border border-brand-accent/22 bg-brand-accent/[0.075] p-5 xl:col-span-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Live Now</div>
                    <div className="mt-2 truncate text-xl font-black text-white">{currentTrack?.title || 'No active track'}</div>
                    <div className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-white/42">{currentTrack?.author || (isPlaying ? 'Resolving signal' : 'Playback paused')}</div>
                  </div>
                  {currentTrack?.thumbnail ? (
                    <img src={getProxyUrl(currentTrack.thumbnail)} loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 object-cover" alt="" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-brand-accent"><Music size={20} /></div>
                  )}
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/35">
                  <div className="h-full rounded-full bg-brand-accent" style={{ width: `${liveProgressPct}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span>{formatTime(livePositionMs)}</span>
                  <span>{liveDurationMs > 0 ? formatTime(liveDurationMs) : isPlaying ? 'live' : '--:--'}</span>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3 xl:col-span-7 md:grid-cols-4">
                {statCards.map(([label, value, detail]) => (
                  <div key={label} className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/34">{label}</div>
                    <div className="mt-3 text-2xl font-black text-white">{value}</div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/34">{detail}</div>
                  </div>
                ))}
              </section>

              <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 xl:col-span-12">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">History Window</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/34">Recent, previous, monthly, and yearly listening totals</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                  {soundLedgerView.periodSummary.map(([label, entry]) => (
                    <div key={label} className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">{label}</div>
                      <div className="mt-2 text-lg font-black text-white">{formatPlaybackDuration(entry.minutesMs)}</div>
                      <div className="mt-1 text-[9px] font-mono text-brand-accent">{entry.plays} plays</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 xl:col-span-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Recent Week</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/34">{soundLedgerView.streakDays} day streak</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">{Math.round(soundLedgerView.totalMs / 60000)} min total</div>
                </div>
                <div className="mt-5 grid grid-cols-7 gap-2">
                  {soundLedgerView.recentWeek.map((entry) => (
                    <div key={entry.key} className="performance-list-item flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-black/20 px-2 py-3">
                      <div className="flex h-24 w-full items-end justify-center">
                        <div className="w-full max-w-[24px] rounded-full bg-gradient-to-t from-brand-accent via-brand-accent/80 to-white" style={{ height: `${entry.minutesMs > 0 ? 16 + ((entry.minutesMs / soundLedgerView.weekMaxMs) * 84) : 10}%` }} />
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/48">{entry.label}</div>
                      <div className="text-[9px] font-mono text-brand-accent">{Math.round(entry.minutesMs / 60000)}m</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 xl:col-span-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Hourly Pulse</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/34">Play starts by hour</div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {soundLedgerView.topWindow.length > 0 ? soundLedgerView.topWindow.map((entry) => (
                      <span key={entry.hour} className="rounded-full border border-brand-accent/18 bg-brand-accent/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent">{entry.label} - {entry.count}</span>
                    )) : <span className="text-[10px] uppercase tracking-[0.18em] text-white/28">Collecting signal</span>}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-12 gap-1.5 md:grid-cols-[repeat(24,minmax(0,1fr))]">
                  {soundLedgerView.peakHours.map((entry) => (
                    <div key={entry.hour} className="flex min-w-0 flex-col items-center gap-2">
                      <div className="flex h-24 w-full items-end justify-center">
                        <div className={`w-full rounded-full ${entry.count > 0 ? 'bg-brand-accent/85' : 'bg-white/[0.06]'}`} style={{ height: `${entry.count > 0 ? 12 + ((entry.count / soundLedgerView.peakHourMax) * 88) : 10}%` }} />
                      </div>
                      <div className="text-[8px] font-mono text-white/26">{entry.hour % 3 === 0 ? String(entry.hour).padStart(2, '0') : ''}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 xl:col-span-8">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Recent Sessions</div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {soundLedgerView.recentSessions.length > 0 ? soundLedgerView.recentSessions.map((session) => (
                    <div key={session.id} className="performance-list-item flex min-w-0 items-center gap-3 rounded-[1.25rem] border border-white/10 bg-black/20 p-3">
                      <img src={getProxyUrl(session.thumbnail)} loading="lazy" decoding="async" className="h-14 w-14 rounded-xl bg-white/[0.03] object-cover" alt="" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent">{formatPlaybackDuration(session.playedMs)} - {session.completed ? 'completed' : session.reason}</div>
                        <div className="mt-1 truncate text-sm font-black uppercase tracking-tight text-white">{session.title}</div>
                        <div className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-white/35">{session.author}</div>
                      </div>
                    </div>
                  )) : <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-black/20 p-5 text-[11px] uppercase tracking-[0.18em] text-white/28 md:col-span-2">Play for at least 15 seconds and the live ledger will start filling in.</div>}
                </div>
              </section>

              <section className="flex flex-col gap-4 xl:col-span-4">
                {[
                  ['Top Artists', soundLedgerView.topArtists.map(([name, entry], idx) => ({ key: name, title: name, meta: `#${idx + 1} - ${entry.count} plays`, detail: formatPlaybackDuration(entry.totalMs) }))],
                  ['Most Replayed', soundLedgerView.topTracks.map(([id, entry], idx) => ({ key: id, title: entry.title, meta: `#${idx + 1} - ${entry.count} plays`, detail: entry.author, thumbnail: entry.thumbnail }))],
                ].map(([title, items]) => (
                  <div key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">{title}</div>
                    <div className="mt-4 flex flex-col gap-2.5">
                      {items.length > 0 ? items.map((entry) => (
                        <div key={entry.key} className="performance-list-item flex items-center gap-3 rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                          {entry.thumbnail && <img src={getProxyUrl(entry.thumbnail)} loading="lazy" decoding="async" className="h-11 w-11 rounded-xl bg-white/[0.03] object-cover" alt="" />}
                          <div className="min-w-0 flex-1">
                            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent">{entry.meta}</div>
                            <div className="mt-1 truncate text-sm font-black uppercase tracking-tight text-white">{entry.title}</div>
                            <div className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-white/35">{entry.detail}</div>
                          </div>
                        </div>
                      )) : <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-black/20 p-4 text-[10px] uppercase tracking-[0.18em] text-white/28">Signals appear after a few qualified sessions.</div>}
                    </div>
                  </div>
                ))}
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Genre Pulse</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {soundLedgerView.genreMix.length > 0 ? soundLedgerView.genreMix.map(([genre, count]) => (
                      <span key={genre} className="rounded-full border border-brand-accent/18 bg-brand-accent/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent">{genre} - {count}</span>
                    )) : <span className="text-[10px] uppercase tracking-[0.18em] text-white/28">No pattern clusters yet</span>}
                  </div>
                </div>
              </section>
            </div>
          </div>
          <AnimatePresence>
            {isClearLedgerOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: 12, scale: 0.98 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 8, scale: 0.98 }}
                  className="w-full max-w-md rounded-[1.6rem] border border-red-500/20 bg-[#0b0d10] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.5)]"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Protected Clear</div>
                  <div className="mt-2 text-xl font-black text-white">Clear Signal Ledger?</div>
                  <div className="mt-2 text-sm leading-6 text-white/52">
                    This removes listening sessions, play counts, history windows, and genre signals from this device. App Lock verification is required.
                  </div>
                  <input
                    value={ledgerClearPassword}
                    onChange={(event) => setLedgerClearPassword(event.target.value)}
                    type="password"
                    placeholder="App Lock password"
                    className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-red-300/45"
                    disabled={isClearingLedger}
                  />
                  {ledgerClearError && <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100/80">{ledgerClearError}</div>}
                  <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsClearLedgerOpen(false);
                        setLedgerClearError('');
                        setLedgerClearPassword('');
                      }}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/60 transition-colors hover:text-white"
                      disabled={isClearingLedger}
                    >
                      Keep Data
                    </button>
                    {window.aether?.verifyAppLockBiometric && (
                      <button
                        onClick={() => clearLedgerAfterAuth('biometric')}
                        className="rounded-xl border border-brand-accent/20 bg-brand-accent/10 px-4 py-2 text-sm font-black text-brand-accent transition-colors hover:bg-brand-accent/15"
                        disabled={isClearingLedger}
                      >
                        Use Touch ID
                      </button>
                    )}
                    <button
                      onClick={() => clearLedgerAfterAuth('password')}
                      className="rounded-xl bg-red-400 px-4 py-2 text-sm font-black text-black transition-transform active:scale-95 disabled:opacity-50"
                      disabled={isClearingLedger}
                    >
                      {isClearingLedger ? 'Clearing...' : 'Clear Ledger'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}));

const FeedbackIsland = memo(forwardRef(function FeedbackIsland({
  platform,
  isStandalone,
  currentTrack,
  getActivePlaybackPositionMs,
  videoMode,
  visualizerMode,
  auraPreset,
  queueLength,
  lyricsCount,
  appendRecentEvent,
  sharedModalCloseButtonClass,
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState(DEFAULT_FEEDBACK_DRAFT);
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [isFeedbackSending, setIsFeedbackSending] = useState(false);

  const close = useCallback(() => {
    if (!isFeedbackSending) setIsOpen(false);
  }, [isFeedbackSending]);

  useImperativeHandle(ref, () => ({
    open: () => {
      setFeedbackStatus('');
      setIsOpen(true);
    },
    close,
    isOpen: () => isOpen,
  }), [close, isOpen]);

  const updateFeedbackDraft = useCallback((patch) => {
    setFeedbackDraft((prev) => ({ ...prev, ...patch }));
    setFeedbackStatus('');
  }, []);

  const submitFeedback = useCallback(async () => {
    const summary = feedbackDraft.summary.trim();
    const details = feedbackDraft.details.trim();
    if (!summary || !details) {
      setFeedbackStatus('Add a short title and a little detail first.');
      return;
    }

    const trackSnapshot = currentTrack ? {
      title: currentTrack.title || '',
      author: currentTrack.author || '',
      url: currentTrack.actualUrl || currentTrack.url || '',
      youtubeId: currentTrack.youtubeId || '',
      positionMs: getActivePlaybackPositionMs(),
    } : null;

    const payload = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: feedbackDraft.type,
      summary,
      details,
      contact: feedbackDraft.contact.trim(),
      buildVersion: BUILD_VERSION,
      uxVersion: UX_VERSION,
      platform: platform || 'web',
      isStandalone,
      currentTrack: trackSnapshot,
      diagnostics: { playbackMode: videoMode || 'audio', visualizerMode, auraPreset, queueLength, lyricsCount },
      createdAt: new Date().toISOString(),
    };

    setIsFeedbackSending(true);
    setFeedbackStatus('Preparing feedback...');

    try {
      let saved = false;
      if (isStandalone && window.aether?.store?.get && window.aether?.store?.set) {
        const existing = await window.aether.store.get(FEEDBACK_STORAGE_KEY);
        const list = Array.isArray(existing) ? existing : [];
        await window.aether.store.set(FEEDBACK_STORAGE_KEY, [payload, ...list].slice(0, 50));
        saved = true;
      } else {
        const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([payload, ...(Array.isArray(list) ? list : [])].slice(0, 50)));
        saved = true;
      }

      const title = encodeURIComponent(`[${payload.type}] ${summary}`);
      const body = encodeURIComponent([
        details,
        '',
        '---',
        `Build: ${BUILD_VERSION}`,
        `UX: ${UX_VERSION}`,
        `Platform: ${payload.platform}`,
        trackSnapshot ? `Track: ${trackSnapshot.title} - ${trackSnapshot.author}` : 'Track: none',
      ].join('\n'));
      const issueUrl = `${FEEDBACK_ISSUE_URL}?title=${title}&body=${body}`;
      if (isStandalone && window.aether?.openExternal) {
        await window.aether.openExternal(issueUrl);
      } else {
        window.open(issueUrl, '_blank', 'noopener,noreferrer');
      }

      setFeedbackStatus(saved ? 'Saved locally and opened GitHub issue draft.' : 'Opened GitHub issue draft.');
      appendRecentEvent('feedback', summary, { tone: 'success' });
      setFeedbackDraft(DEFAULT_FEEDBACK_DRAFT);
    } catch (error) {
      console.warn('[Aether/Feedback] Failed to submit feedback', error);
      setFeedbackStatus(error?.message || 'Feedback failed. Copy details and try again.');
      appendRecentEvent('feedback_failed', error?.message || 'Feedback failed', { tone: 'error' });
    } finally {
      setIsFeedbackSending(false);
    }
  }, [appendRecentEvent, auraPreset, currentTrack, feedbackDraft, getActivePlaybackPositionMs, isStandalone, lyricsCount, platform, queueLength, videoMode, visualizerMode]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[350] flex items-center justify-center bg-black/82 p-4 backdrop-blur-xl">
        <div className="absolute inset-0" onClick={close} />
        <motion.div initial={{ scale: 0.96, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 18 }} className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-brand-accent/20 bg-[#080c10]/96 shadow-[0_28px_100px_rgba(0,0,0,0.55)]">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/22 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/10 text-brand-accent"><MessageSquare size={18} /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent">Send Feedback</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">Issues open on GitHub unless a feedback endpoint is configured.</div>
              </div>
            </div>
            <button onClick={close} disabled={isFeedbackSending} className={sharedModalCloseButtonClass} title="Close"><X size={16} /></button>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-3 gap-2">
              {['Problem', 'Improvement', 'Idea'].map((type) => (
                <button key={type} onClick={() => updateFeedbackDraft({ type })} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${feedbackDraft.type === type ? 'border-brand-accent/40 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`}>{type}</button>
              ))}
            </div>
            <input value={feedbackDraft.summary} onChange={(e) => updateFeedbackDraft({ summary: e.target.value })} placeholder="Short title" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none transition-all placeholder:text-white/24 focus:border-brand-accent/45" />
            <textarea value={feedbackDraft.details} onChange={(e) => updateFeedbackDraft({ details: e.target.value })} placeholder="What happened, or what should be better?" className="min-h-[150px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition-all placeholder:text-white/24 focus:border-brand-accent/45" />
            <input value={feedbackDraft.contact} onChange={(e) => updateFeedbackDraft({ contact: e.target.value })} placeholder="Contact handle/email optional" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/24 focus:border-brand-accent/45" />
            {feedbackStatus && <div className="rounded-2xl border border-white/8 bg-black/24 px-4 py-3 text-[11px] font-semibold leading-5 text-white/58">{feedbackStatus}</div>}
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Build {BUILD_VERSION} // {platform || 'web'}</div>
              <button onClick={submitFeedback} disabled={isFeedbackSending || !feedbackDraft.summary.trim() || !feedbackDraft.details.trim()} className="flex items-center gap-2 rounded-2xl bg-brand-accent px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-45 disabled:hover:scale-100">
                {isFeedbackSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}));

const GestureLabIsland = memo(forwardRef(function GestureLabIsland({
  isGestureControlEnabled,
  setIsGestureControlEnabled,
  isFaceControlEnabled,
  setIsFaceControlEnabled,
  faceControlStatus,
  faceControlSignal,
  cameraHandSignal,
  sharedModalCloseButtonClass,
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close,
    isOpen: () => isOpen,
  }), [close, isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[345] flex items-center justify-center bg-black/82 p-4 backdrop-blur-xl">
        <div className="absolute inset-0" onClick={close} />
        <motion.div initial={{ scale: 0.96, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 18 }} className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-brand-accent/20 bg-[#080c10]/96 shadow-[0_28px_100px_rgba(0,0,0,0.55)]">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/22 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/10 text-brand-accent"><Hand size={18} /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent">Gesture + Face Lab</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">Pointer, swipe, and camera face/hand controls</div>
              </div>
            </div>
            <button onClick={close} className={sharedModalCloseButtonClass} title="Close"><X size={16} /></button>
          </div>
          <div className="custom-scrollbar overflow-y-auto p-5">
            <button onClick={() => setIsGestureControlEnabled((prev) => { const next = !prev; if (!next) setIsFaceControlEnabled(false); return next; })} className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${isGestureControlEnabled ? 'border-brand-accent/35 bg-brand-accent/12 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-brand-accent/35 hover:text-brand-accent'}`}>
              <span><span className="block text-[11px] font-black uppercase tracking-[0.22em]">Gesture controls</span><span className="mt-1 block text-[11px] font-semibold text-white/42">Pointer motion drives stage depth. Fast swipes control playback.</span></span>
              <span className="rounded-full border border-current px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]">{isGestureControlEnabled ? 'On' : 'Off'}</span>
            </button>
            <button onClick={() => { const next = !isFaceControlEnabled; if (next) setIsGestureControlEnabled(true); setIsFaceControlEnabled(next); }} className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${isFaceControlEnabled ? 'border-brand-accent/35 bg-brand-accent/12 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-brand-accent/35 hover:text-brand-accent'}`}>
              <span className="flex items-center gap-3"><Camera size={18} className="shrink-0" /><span><span className="block text-[11px] font-black uppercase tracking-[0.22em]">Camera controls</span><span className="mt-1 block text-[11px] font-semibold text-white/42">Camera tracks face position and hand swipes for app control.</span></span></span>
              <span className="rounded-full border border-current px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]">{isFaceControlEnabled ? 'On' : 'Off'}</span>
            </button>
            <div className="mb-4 rounded-2xl border border-white/8 bg-black/24 p-4">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30">Camera Status</div><div className="mt-1 text-[11px] font-bold text-white/55">{faceControlStatus}</div></div>
                <div className="text-right text-[10px] font-mono text-brand-accent/75">FACE {faceControlSignal.x.toFixed(2)}, {faceControlSignal.y.toFixed(2)}<br />HAND {cameraHandSignal.x.toFixed(2)}, {cameraHandSignal.y.toFixed(2)}</div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-accent transition-all" style={{ width: `${Math.round(clamp01(faceControlSignal.confidence) * 100)}%` }} /></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-accent/65 transition-all" style={{ width: `${Math.round(clamp01(cameraHandSignal.motion) * 100)}%` }} /></div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/28">Hand {cameraHandSignal.last}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                [MousePointer2, 'Pointer depth', 'Move pointer/finger to tilt the Aura Stage layers.'],
                [ChevronLeft, 'Swipe left', 'Skip to the next track.'],
                [ChevronRight, 'Swipe right', 'Restart or go to the previous track.'],
                [Hand, '2-finger swipe L/R', 'Two fingers slide left or right to change tracks.'],
                [Volume2, '2-finger swipe U/D', 'Two fingers slide up or down to adjust volume.'],
                [Fingerprint, 'Pinch in', 'Two-finger pinch to pause playback.'],
                [Fingerprint, 'Spread out', 'Two-finger spread to resume playback.'],
                [MousePointer2, 'Double-tap', 'Quickly tap twice on empty space to toggle play/pause.'],
                [Camera, 'Camera wave', 'Wave your hand or look around for playback controls.'],
                [Eye, 'Face zones', 'Look or tilt to trigger volume and transport controls.'],
              ].map(([Icon, title, detail]) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <Icon size={18} className="text-brand-accent" />
                  <div className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/80">{title}</div>
                  <div className="mt-1 text-[11px] leading-5 text-white/42">{detail}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}));

const AppLockSettingsIsland = memo(forwardRef(function AppLockSettingsIsland({
  isStandalone,
  lockStatus,
  lockIdleMinutes,
  setLockIdleMinutes,
  refreshLockStatus,
  setIsAppLocked,
  setLastAdded,
  sharedModalCloseButtonClass,
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [lockPasswordConfirm, setLockPasswordConfirm] = useState('');
  const [lockDisablePassword, setLockDisablePassword] = useState('');
  const [lockUseTouchId, setLockUseTouchId] = useState(false);
  const [lockError, setLockError] = useState('');
  const [isLockBusy, setIsLockBusy] = useState(false);
  const [lockRecoveryStatus, setLockRecoveryStatus] = useState({
    phrase: { enabled: false, createdAt: null },
  });
  const [lockRecoveryStatusError, setLockRecoveryStatusError] = useState('');
  const [recoverySetupError, setRecoverySetupError] = useState('');
  const [phraseBusy, setPhraseBusy] = useState(false);
  const [phraseGenerated, setPhraseGenerated] = useState('');
  const [phraseCopied, setPhraseCopied] = useState(false);

  const refreshLockRecoveryStatusLocal = useCallback(async () => {
    if (!window.aether?.getLockRecoveryStatus) return;
    setLockRecoveryStatusError('');
    try {
      const res = await window.aether.getLockRecoveryStatus();
      if (res?.success) {
        setLockRecoveryStatus({
          phrase: res.phrase || { enabled: false, createdAt: null },
        });
      } else {
        setLockRecoveryStatusError(res?.error || 'Failed to load recovery status.');
      }
    } catch (e) {
      setLockRecoveryStatusError(e?.message || 'Failed to load recovery status.');
    }
  }, []);

  const close = useCallback(() => {
    if (!isLockBusy) setIsOpen(false);
  }, [isLockBusy]);

  const open = useCallback(() => {
    setLockError('');
    setRecoverySetupError('');
    setLockUseTouchId(!!lockStatus.touchIdEnabled);
    setIsOpen(true);
    refreshLockRecoveryStatusLocal();
  }, [lockStatus.touchIdEnabled, refreshLockRecoveryStatusLocal]);

  useImperativeHandle(ref, () => ({
    open,
    close,
    isOpen: () => isOpen,
    isBusy: () => isLockBusy,
  }), [close, isLockBusy, isOpen, open]);

  useEffect(() => {
    if (!isOpen) {
      setLockPasswordInput('');
      setLockPasswordConfirm('');
      setLockDisablePassword('');
      setLockError('');
      setRecoverySetupError('');
      setPhraseGenerated('');
      setPhraseCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setLockUseTouchId(!!lockStatus.touchIdEnabled);
  }, [isOpen, lockStatus.touchIdEnabled]);

  const handleEnableLock = useCallback(async () => {
    if (!window.aether?.setAppLock) return;
    if (!lockPasswordInput || lockPasswordInput.length < 4) {
      setLockError('Password must be at least 4 characters.');
      return;
    }
    if (lockPasswordInput !== lockPasswordConfirm) {
      setLockError('Passwords do not match.');
      return;
    }
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.setAppLock(lockPasswordInput, !!lockUseTouchId);
      if (!res?.success) {
        setLockError(res?.error || 'Failed to enable lock.');
        return;
      }
      setLockPasswordInput('');
      setLockPasswordConfirm('');
      await refreshLockStatus();
      setIsOpen(false);
      setLastAdded('App lock enabled');
      setTimeout(() => setLastAdded(null), 2000);
    } finally {
      setIsLockBusy(false);
    }
  }, [lockPasswordConfirm, lockPasswordInput, lockUseTouchId, refreshLockStatus, setLastAdded]);

  const handleDisableLock = useCallback(async () => {
    if (!window.aether?.disableAppLock || !lockDisablePassword) {
      setLockError('Enter password to disable lock.');
      return;
    }
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.disableAppLock(lockDisablePassword);
      if (!res?.success) {
        setLockError(res?.error || 'Failed to disable lock.');
        return;
      }
      setLockDisablePassword('');
      await refreshLockStatus();
      setIsAppLocked(false);
      setIsOpen(false);
      setLastAdded('App lock disabled');
      setTimeout(() => setLastAdded(null), 2000);
    } finally {
      setIsLockBusy(false);
    }
  }, [lockDisablePassword, refreshLockStatus, setIsAppLocked, setLastAdded]);

  const handleToggleTouchIdLock = useCallback(async (enabled) => {
    setLockUseTouchId(enabled);
    if (!lockStatus.enabled || !window.aether?.setAppLockTouchId) return;
    const res = await window.aether.setAppLockTouchId(enabled);
    if (res?.success) {
      await refreshLockStatus();
    }
  }, [lockStatus.enabled, refreshLockStatus]);

  const handleCopyPhrase = useCallback(() => {
    if (!phraseGenerated) return;
    navigator.clipboard.writeText(phraseGenerated).then(() => {
      setPhraseCopied(true);
      setTimeout(() => setPhraseCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy phrase:', err);
    });
  }, [phraseGenerated]);

  const handleGenerateRecoveryPhrase = useCallback(async () => {
    if (!window.aether?.generateRecoveryPhrase) return;
    setPhraseBusy(true);
    setRecoverySetupError('');
    try {
      const res = await window.aether.generateRecoveryPhrase();
      if (!res?.success) {
        setRecoverySetupError(res?.error || 'Failed to generate phrase.');
        return;
      }
      setPhraseGenerated(String(res.phrase || ''));
      await refreshLockRecoveryStatusLocal();
    } catch (e) {
      setRecoverySetupError(e?.message || 'Failed to generate phrase.');
    } finally {
      setPhraseBusy(false);
    }
  }, [refreshLockRecoveryStatusLocal]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[245] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={close} />
          <motion.div
            initial={{ y: 12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            className="relative z-10 flex w-full max-w-lg max-h-[min(88vh,760px)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-accent">App Lock</div>
                <div className="text-[11px] text-white/45 mt-1">Secure Aether with password and optional Touch ID. Idle auto-lock stays enabled.</div>
              </div>
              <button
                onClick={close}
                className={sharedModalCloseButtonClass}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {lockStatus.enabled ? (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Status</div>
                    <div className="text-[12px] text-brand-accent font-black">Enabled</div>
                  </div>

                  {lockStatus.touchIdAvailable && (
                    <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer">
                      <span className="text-[11px] text-white/70">Use Touch ID</span>
                      <input
                        type="checkbox"
                        checked={lockUseTouchId}
                        onChange={(e) => handleToggleTouchIdLock(e.target.checked)}
                        className="accent-brand-accent"
                      />
                    </label>
                  )}

                  <label className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-white/70">Idle auto-lock</span>
                      <span className="text-[11px] font-black text-brand-accent">{lockIdleMinutes}m</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={60}
                      step={1}
                      value={lockIdleMinutes}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value || '5', 10);
                        setLockIdleMinutes(Number.isFinite(parsed) ? Math.max(1, parsed) : 5);
                      }}
                      className="w-full accent-brand-accent"
                    />
                  </label>

                  <input
                    type="password"
                    value={lockDisablePassword}
                    onChange={(e) => setLockDisablePassword(e.target.value)}
                    placeholder="Enter password to disable lock"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50"
                  />
                  <button
                    onClick={handleDisableLock}
                    disabled={isLockBusy || !lockDisablePassword}
                    className="w-full px-5 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 font-black text-sm disabled:opacity-50"
                  >
                    Disable Lock
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="password"
                    value={lockPasswordInput}
                    onChange={(e) => setLockPasswordInput(e.target.value)}
                    placeholder="Set password"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50"
                  />
                  <input
                    type="password"
                    value={lockPasswordConfirm}
                    onChange={(e) => setLockPasswordConfirm(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50"
                  />
                  {lockStatus.touchIdAvailable && (
                    <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer">
                      <span className="text-[11px] text-white/70">Enable Touch ID unlock</span>
                      <input
                        type="checkbox"
                        checked={lockUseTouchId}
                        onChange={(e) => setLockUseTouchId(e.target.checked)}
                        className="accent-brand-accent"
                      />
                    </label>
                  )}
                  <button
                    onClick={handleEnableLock}
                    disabled={isLockBusy || !lockPasswordInput || !lockPasswordConfirm}
                    className="w-full px-5 py-2.5 rounded-xl bg-brand-accent text-black font-black text-sm disabled:opacity-50"
                  >
                    Enable Lock
                  </button>
                </>
              )}

              {lockStatus.enabled && (
                <button
                  onClick={() => { setIsAppLocked(true); setIsOpen(false); }}
                  className="w-full px-5 py-2.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent font-black text-sm"
                >
                  Lock Now
                </button>
              )}

              {isStandalone && lockStatus.enabled && window.aether?.getLockRecoveryStatus && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Recovery</div>
                      <div className="mt-1 text-[11px] text-white/55">Set up recovery now so you can reset your lock later.</div>
                    </div>
                    <button
                      type="button"
                      onClick={refreshLockRecoveryStatusLocal}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 hover:border-brand-accent/40 hover:text-brand-accent transition-all"
                      title="Refresh recovery status"
                    >
                      Refresh
                    </button>
                  </div>

                  {(lockRecoveryStatusError || recoverySetupError) && (
                    <div className="mt-2 text-[11px] text-red-400">{lockRecoveryStatusError || recoverySetupError}</div>
                  )}

                  <div className="mt-3 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Backup Phrase</div>
                      <div className="text-[11px] text-white/55">
                        Status:{' '}
                        {lockRecoveryStatus?.phrase?.enabled ? <span className="text-white/70">Enabled</span> : <span className="text-white/45">Not set</span>}
                      </div>

                      {phraseGenerated && (
                        <div className="mt-3 rounded-2xl border border-brand-accent/20 bg-brand-accent/10 px-3 py-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/80">Save this phrase now</div>
                              <div className="mt-2 text-[12px] font-mono text-white/85 break-words select-all cursor-pointer" onClick={handleCopyPhrase} title="Click to copy">{phraseGenerated}</div>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyPhrase}
                              className={`mt-1 p-2 rounded-xl border transition-all ${phraseCopied ? 'border-brand-accent/40 bg-brand-accent/10 text-brand-accent' : 'border-white/10 bg-white/5 text-white/50 hover:text-brand-accent hover:border-brand-accent/40'}`}
                              title="Copy phrase to clipboard"
                            >
                              {phraseCopied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                          <div className="mt-2 text-[10px] text-white/45 border-t border-white/5 pt-2">It will not be shown again after closing this dialog.</div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateRecoveryPhrase}
                          disabled={phraseBusy}
                          className="rounded-xl bg-brand-accent text-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
                          title={lockRecoveryStatus?.phrase?.enabled ? 'Generate a new phrase (replaces the old one)' : 'Generate backup phrase'}
                        >
                          {phraseBusy ? 'Generating...' : (lockRecoveryStatus?.phrase?.enabled ? 'Regenerate' : 'Generate')}
                        </button>
                        <div className="text-[10px] text-white/35">Use this if you forget your lock password.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {lockError && <div className="text-[11px] text-red-400">{lockError}</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}));

function App() {
  // --- App Lock Recovery (Electron only) ---
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  const [userError, setUserError] = useState('');

  const [lockRecoveryStatus, setLockRecoveryStatus] = useState({
    phrase: { enabled: false, createdAt: null },
  });
  const [lockRecoveryStatusError, setLockRecoveryStatusError] = useState('');
  const [recoverySetupError, setRecoverySetupError] = useState('');

  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryNewPasswordConfirm, setRecoveryNewPasswordConfirm] = useState('');
  const [recoveryResetBusy, setRecoveryResetBusy] = useState(false);

  const [phraseBusy, setPhraseBusy] = useState(false);
  const [phraseGenerated, setPhraseGenerated] = useState('');
  const [phraseCopied, setPhraseCopied] = useState(false);

  // Clear ephemeral recovery state when modals close
  useEffect(() => {
    if (!isLockModalOpen) {
      setPhraseGenerated('');
      setPhraseCopied(false);
    }
  }, [isLockModalOpen]);


  const refreshLockRecoveryStatus = useCallback(async () => {
    if (!window.aether?.getLockRecoveryStatus) return;
    setLockRecoveryStatusError('');
    try {
      const res = await window.aether.getLockRecoveryStatus();
      if (res?.success) {
        setLockRecoveryStatus({
          phrase: res.phrase || { enabled: false, createdAt: null },
        });
      } else {
        setLockRecoveryStatusError(res?.error || 'Failed to load recovery status.');
      }
    } catch (e) {
      setLockRecoveryStatusError(e?.message || 'Failed to load recovery status.');
    }
  }, []);

  useEffect(() => {
    if (!window.aether?.getLockRecoveryStatus) return;
    refreshLockRecoveryStatus();
  }, [refreshLockRecoveryStatus]);

  const [auth, setAuth] = useState(null);
  const discordSdkRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [warmingTrackIds, setWarmingTrackIds] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState('Unknown');
  const [isAudioBuffering, setIsAudioBuffering] = useState(false);
  const [isAutoplaySeeking, setIsAutoplaySeeking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [lyricOffsetMs, setLyricOffsetMs] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [manualLyricsStore, setManualLyricsStore] = useState({});
  const manualLyricsStoreRef = useRef({});
  const [isManualLyricsEditorOpen, setIsManualLyricsEditorOpen] = useState(false);
  const [manualLyricsDraft, setManualLyricsDraft] = useState([]);
  const [manualLyricsDraftError, setManualLyricsDraftError] = useState('');
  const [isManualLyricsSaving, setIsManualLyricsSaving] = useState(false);
  const [manualLyricsRawText, setManualLyricsRawText] = useState('');
  const [isManualLyricsRawEditorOpen, setIsManualLyricsRawEditorOpen] = useState(false);
  const [isManualLyricsTapMode, setIsManualLyricsTapMode] = useState(false);
  const [manualLyricsSavedNotice, setManualLyricsSavedNotice] = useState('');
  const [systemStats, setSystemStats] = useState(null);
  const visualizerCanvasRef = useRef(null);
  const pulseCanvasRef = useRef(null);
  const [visualizerMode, setVisualizerMode] = useState('bars');
  const [themeColor, setThemeColor] = useState(DEFAULT_TRACK_PALETTE.accent);
  const [trackPalette, setTrackPalette] = useState(DEFAULT_TRACK_PALETTE);
  const trackPaletteCacheRef = useRef(new Map());
  const lyricsContainerRef = useRef(null);
  const activeLyricRef = useRef(null);
  const lyricsFetchRequestRef = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [neuralRecommendations, setNeuralRecommendations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
  const [addingIds, setAddingIds] = useState(new Set());
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const [lyricOffsetPresets, setLyricOffsetPresets] = useState({});
  const [isLyricPresetSaved, setIsLyricPresetSaved] = useState(false);
  const [sessionRestoreNotice, setSessionRestoreNotice] = useState('');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState({
    lastQueueFetchMs: null,
    lastQueueFetchAt: null,
    lastQueueError: null,
    lastSystemFetchMs: null,
    lastSystemFetchAt: null,
    lastSystemError: null,
    lastSongFetchMs: null,
    lastSongFetchAt: null,
    lastSongSource: '-',
    lastLyricsSource: '-',
    lastLyricsFetchMs: null,
    lastLyricsFetchAt: null,
    lastLyricsError: null,
    transportGuardHits: 0,
    lastTransportGuardAt: null,
    lastTransportGuardAction: null,
  });
  const [lastAdded, setLastAdded] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isDoodleMode, setIsDoodleMode] = useState(true);
  const [doodleIntensity, setDoodleIntensity] = useState('medium');
  const [performanceMode, setPerformanceMode] = useState('high');
  const [auraPreset, setAuraPreset] = useState('balanced');
  const [isLooksPanelOpen, setIsLooksPanelOpen] = useState(false);
  const [isAuraStageOpen, setIsAuraStageOpen] = useState(false);
  const [isDepthMotionEnabled, setIsDepthMotionEnabled] = useState(true);
  const headerControlsRef = useRef(null);
  const sleepTimerControlsRef = useRef(null);
  const soundCapsuleRef = useRef(null);
  const feedbackRef = useRef(null);
  const gestureLabRef = useRef(null);
  const appLockSettingsRef = useRef(null);
  const [isGestureLabOpen, setIsGestureLabOpen] = useState(false);
  const [isGestureControlEnabled, setIsGestureControlEnabled] = useState(false);
  const [isFaceControlEnabled, setIsFaceControlEnabled] = useState(false);
  const [faceControlStatus, setFaceControlStatus] = useState('Camera off');
  const [faceControlSignal, setFaceControlSignal] = useState({ x: 0, y: 0, confidence: 0, source: 'idle' });
  const [cameraHandSignal, setCameraHandSignal] = useState({ x: 0, y: 0, motion: 0, last: 'idle' });
  const [gestureNotice, setGestureNotice] = useState('');
  const [inspectTarget, setInspectTarget] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState(DEFAULT_FEEDBACK_DRAFT);
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [isFeedbackSending, setIsFeedbackSending] = useState(false);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const typedBufferRef = useRef('');
  const [isMixtapeVaultOpen, setIsMixtapeVaultOpen] = useState(false);
  const [sharedScene, setSharedScene] = useState(null);
  const [isSharedSceneOpen, setIsSharedSceneOpen] = useState(false);
  const [vaultPulse, setVaultPulse] = useState({ bass: 0, mids: 0, highs: 0, energy: 0, spin: 0, stamp: 'AETHER-PULSE' });
  const vaultPulseRef = useRef(vaultPulse);
  const lastVaultStateUpdateRef = useRef(0);
  const [vaultSpectrum, setVaultSpectrum] = useState(() => Array(8).fill(0.12));
  const [playlists, setPlaylists] = useState({});
  const [playlistOrder, setPlaylistOrder] = useState([]);
  const [favoriteTracks, setFavoriteTracks] = useState({});
  const playlistOrderHydratedRef = useRef(false);
  const [viewingPlaylist, setViewingPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isViewingFullQueue, setIsViewingFullQueue] = useState(false);
    const [isViewingFullDiscovery, setIsViewingFullDiscovery] = useState(false);
    const [isViewingFullPlaylist, setIsViewingFullPlaylist] = useState(null);
    const [isFullQueueContentReady, setIsFullQueueContentReady] = useState(false);
    const [isFullDiscoveryContentReady, setIsFullDiscoveryContentReady] = useState(false);
    const [isFullPlaylistContentReady, setIsFullPlaylistContentReady] = useState(false);
    const [isMixtapeVaultContentReady, setIsMixtapeVaultContentReady] = useState(false);
  const [isLibraryOverlayOpen, setIsLibraryOverlayOpen] = useState(false);
  const [isSoundCapsuleOpen, setIsSoundCapsuleOpen] = useState(false);
  const [soundCapsuleData, setSoundCapsuleData] = useState(null);
  const [libraryActionTarget, setLibraryActionTarget] = useState(null);
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const [libraryBrowseMode, setLibraryBrowseMode] = useState('playlists');
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [librarySort, setLibrarySort] = useState('manual');
  const [librarySongFilter, setLibrarySongFilter] = useState('all');
  const [librarySongSort, setLibrarySongSort] = useState('title');
  const [libraryTrackSort, setLibraryTrackSort] = useState('title');
  const [isPlayerOverlayOpen, setIsPlayerOverlayOpen] = useState(false);
  const [isShortcutSettingsOpen, setIsShortcutSettingsOpen] = useState(false);
  const [shortcutSettingsError, setShortcutSettingsError] = useState('');
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [shortcutDraft, setShortcutDraft] = useState(DEFAULT_SHORTCUTS);
  const [globalMediaShortcutsEnabled, setGlobalMediaShortcutsEnabled] = useState(false);
  const [isTipsOverlayOpen, setIsTipsOverlayOpen] = useState(false);
  const looksPanelRef = useRef(null);
  const gestureStateRef = useRef({ pointerDown: null, lastActionAt: 0, noticeTimer: null, lastTapAt: 0 });
  const gestureRuntimeRef = useRef({ handleControl: null, appendRecentEvent: null });
  const touchGestureRef = useRef({ touches: {}, pinchStartDist: 0, twoFingerStart: null, active: false });
  const faceVideoRef = useRef(null);
  const faceStreamRef = useRef(null);
  const faceLoopRef = useRef(0);
  const faceActionRef = useRef({ lastActionAt: 0, lastZone: 'center', centeredFrames: 0 });
  const cameraMotionRef = useRef({ prevLuma: null, active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, startAt: 0, lastSeenAt: 0, lastActionAt: 0 });
  const [hideFirstRunTips, setHideFirstRunTips] = useState(false);
  const [tipsDontShowAgain, setTipsDontShowAgain] = useState(false);
  const [draggedPlaylistName, setDraggedPlaylistName] = useState(null);
  const [draggedQueueIndex, setDraggedQueueIndex] = useState(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [activeMenuTrack, setActiveMenuTrack] = useState(null);
  const [isRenamingPlaylist, setIsRenamingPlaylist] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [volume, setVolume] = useState(0.5);
  const [volumeToast, setVolumeToast] = useState(false);
  const [isDownloadingTrack, setIsDownloadingTrack] = useState(false);
  const [sleepTimerValue, setSleepTimerValue] = useState(0); // 0, 15, 30, 60, 120
  const [sleepDeadline, setSleepDeadline] = useState(null);
  const [sleepRemainingStr, setSleepRemainingStr] = useState('');
  const [isSleepTimerMenuOpen, setIsSleepTimerMenuOpen] = useState(false);
  const [isSleepTimerOverlayOpen, setIsSleepTimerOverlayOpen] = useState(false);
  const [sleepFadeEnabled, setSleepFadeEnabled] = useState(true);
  const [sleepCustomMinutes, setSleepCustomMinutes] = useState('');
  const [stopAfterTrack, setStopAfterTrack] = useState(false);
  const sleepTimerMenuRef = useRef(null);
  const mixtapeVaultRef = useRef(null);
  const [isQualityDropdownOpen, setIsQualityDropdownOpen] = useState(false);
  const qualityDropdownRef = useRef(null);
  const [localIp, setLocalIp] = useState('');
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [miniPlayerInfoMode, setMiniPlayerInfoMode] = useState('artist');
  const [isMiniQueuePeekOpen, setIsMiniQueuePeekOpen] = useState(false);
  const [isSpotifyImportOpen, setIsSpotifyImportOpen] = useState(false);
  const [musicImportProvider, setMusicImportProvider] = useState('');
  const [spotifyImportUrl, setSpotifyImportUrl] = useState('');
  const [spotifyImportPlaylistName, setSpotifyImportPlaylistName] = useState('');
  const [spotifyImportProgress, setSpotifyImportProgress] = useState({ stage: 'idle', progress: 0, message: '' });
  const [isSpotifyImporting, setIsSpotifyImporting] = useState(false);
  const [spotifyImportLogs, setSpotifyImportLogs] = useState([]);
  const [updateInfo, setUpdateInfo] = useState({ enabled: false, status: 'idle', message: '', available: false, downloaded: false, version: null, progress: 0 });
  const [isUpdateBusy, setIsUpdateBusy] = useState(false);
  const [updateToast, setUpdateToast] = useState('');
  const [isVaultCleaning, setIsVaultCleaning] = useState(false);
  const [isWarmupUnavailable, setIsWarmupUnavailable] = useState(false);
  const [isOfflineRemovalBusy, setIsOfflineRemovalBusy] = useState(false);
  const [skipReasonToast, setSkipReasonToast] = useState('');
  const [skipEvents, setSkipEvents] = useState([]);
  const [lockStatus, setLockStatus] = useState({ enabled: false, touchIdAvailable: false, touchIdEnabled: false });
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [lockPasswordConfirm, setLockPasswordConfirm] = useState('');
  const [lockDisablePassword, setLockDisablePassword] = useState('');
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [lockUseTouchId, setLockUseTouchId] = useState(false);
  const [lockIdleMinutes, setLockIdleMinutes] = useState(5);
  const [lockError, setLockError] = useState('');
  const [isLockBusy, setIsLockBusy] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const [storagePolicy, setStoragePolicy] = useState({ cacheCapMb: 2048, maxCacheAgeDays: 30 });
  const [storageEstimate, setStorageEstimate] = useState({ cap: null, age: null, downloadsOnly: null });
  const [isStorageBusy, setIsStorageBusy] = useState(false);
  const [isRuntimeRepairing, setIsRuntimeRepairing] = useState(false);
  const [engineStatus, setEngineStatus] = useState(null);
  const [offlineDownloads, setOfflineDownloads] = useState([]);
  const [isOfflineDownloadsBusy, setIsOfflineDownloadsBusy] = useState(false);
  
  const isStandalone = !!window.aether;
  const [videoMode, setVideoMode] = useState(null); // null | 'dual' | 'cinema'
  const currentTrack = queue?.[0];

  
  const fileInputRef = useRef(null);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [autoplayMoodMode, setAutoplayMoodMode] = useState('flow');
  const [isAutoplayMenuOpen, setIsAutoplayMenuOpen] = useState(false);
  const [isVerticalStack, setIsVerticalStack] = useState(false);
  const [isFocusedMode, setIsFocusedMode] = useState(false);
  const expandedContainerRef = useRef(null);
  const expandedActiveRef = useRef(null);
  const idleStartTimeRef = useRef(null);
  const idlePhraseRef = useRef(null);
  const lastRPCTrackIdRef = useRef(null);
  const lastRPCPlayingRef = useRef(null);
  const lastRPCStartRef = useRef(null);
  const lastRPCEndRef = useRef(null);
  const sessionReadyRef = useRef(false);
  const pendingResumeTimeRef = useRef(null);


  // Audio Analysis Refs (NOVA
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const auraEnergyRef = useRef({ bass: 0, mids: 0, highs: 0, phase: 0 });
  const uiPulseRef = useRef(1);
  const uiPulseSignalRef = useRef({ bass: 0, rms: 0 });
  const uiPulsePeakRef = useRef(0);
  const visualizerStateRef = useRef({
    visualizerMode: 'bars',
    themeColor: '#00ffbf',
    auraPreset: 'balanced',
    isMixtapeVaultOpen: false,
    performanceMode: 'high',
  });
  const visualizerErrorCountRef = useRef(0);
  const visualizerFrameBudgetRef = useRef({ lastDrawAt: 0, lastStyleAt: 0, lastMixtapeCssAt: 0, brandAccent: '#00ffbf', brandContrast: '#ff00ff', canvas: null, ctx: null, pulseCanvas: null, pulseCtx: null });
  const visualizerBarsRef = useRef(null);
  const playButtonRef = useRef(null);
  const beatRingsRef = useRef(null);
  const lastBeatRingTimeRef = useRef(0);
  const vaultTelemetryRef = useRef({ lastStateAt: 0 });

  const isAuraMode = visualizerMode === 'pulse';
  
  const immersiveBeatIntensity = useMemo(() => isAuraMode
    ? clamp01((vaultPulse.energy * 0.9) + (vaultPulse.bass * 0.45) + (vaultPulse.highs * 0.12))
    : 0, [isAuraMode, vaultPulse.energy, vaultPulse.bass, vaultPulse.highs]);

  const auraCardShadow = useMemo(() => isAuraMode
    ? `0 24px 60px rgba(0,0,0,0.30), inset 0 0 ${10 + immersiveBeatIntensity * 30}px rgba(0,255,191,${0.06 + immersiveBeatIntensity * 0.24})`
    : undefined, [isAuraMode, immersiveBeatIntensity]);

  const auraPanelShadow = useMemo(() => isAuraMode
    ? `0 12px 30px rgba(0,0,0,0.24), inset 0 0 ${6 + immersiveBeatIntensity * 18}px rgba(0,255,191,${0.05 + immersiveBeatIntensity * 0.18})`
    : undefined, [isAuraMode, immersiveBeatIntensity]);

  const auraCardBorder = useMemo(() => isAuraMode ? `rgba(130, 255, 221, ${0.16 + immersiveBeatIntensity * 0.20})` : undefined, [isAuraMode, immersiveBeatIntensity]);
  const auraPanelBorder = useMemo(() => isAuraMode ? `rgba(130, 255, 221, ${0.11 + immersiveBeatIntensity * 0.16})` : undefined, [isAuraMode, immersiveBeatIntensity]);
  const auraPresetConfig = AURA_PRESETS.find((preset) => preset.id === auraPreset) || AURA_PRESETS[1];
  const auraFieldStyle = useMemo(() => isAuraMode ? {
    '--aura-field-boost': String(clamp01((0.22 + immersiveBeatIntensity * 0.78) * auraPresetConfig.fieldBoost)),
    '--aura-field-flare': String(clamp01((0.18 + immersiveBeatIntensity * 0.46) * auraPresetConfig.fieldFlare)),
    '--aura-field-drift': `${(8 + immersiveBeatIntensity * 18).toFixed(2)}px`,
  } : undefined, [isAuraMode, immersiveBeatIntensity, auraPresetConfig]);

  const soundLedgerView = useMemo(() => {
    const data = normalizePlaybackLedgerData(soundCapsuleData);
    const totalTracksPlayed = data.totalPlays || Object.values(data.tracks || {}).reduce((total, entry) => total + Math.max(0, Math.floor(Number(entry?.count) || 0)), 0);
    const totalMs = Math.max(0, Math.floor(Number(data.totalMs) || (Number(data.totalMinutes) || 0) * 60000));
    const recentWeek = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = getLocalDateKey(date);
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toUpperCase(),
        minutesMs: Math.max(0, Math.floor(Number(data.dailyMinutes?.[key]) || 0)),
        plays: Math.max(0, Math.floor(Number(data.dailyPlays?.[key]) || 0)),
      };
    });
    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: hour === 0 ? '12A' : hour === 12 ? '12P' : hour > 12 ? `${hour - 12}P` : `${hour}A`,
      count: Math.max(0, Math.floor(Number(data.hourlyTrends?.[hour]) || 0)),
    }));
    const topArtists = Object.entries(data.artists || {})
      .sort((left, right) => {
        const countDiff = Math.max(0, Math.floor(Number(right[1]?.count) || 0)) - Math.max(0, Math.floor(Number(left[1]?.count) || 0));
        if (countDiff !== 0) return countDiff;
        return Math.max(0, Math.floor(Number(right[1]?.totalMs) || 0)) - Math.max(0, Math.floor(Number(left[1]?.totalMs) || 0));
      })
      .slice(0, 6);
    const topTracks = Object.entries(data.tracks || {})
      .sort((left, right) => {
        const countDiff = Math.max(0, Math.floor(Number(right[1]?.count) || 0)) - Math.max(0, Math.floor(Number(left[1]?.count) || 0));
        if (countDiff !== 0) return countDiff;
        return Math.max(0, Math.floor(Number(right[1]?.totalMs) || 0)) - Math.max(0, Math.floor(Number(left[1]?.totalMs) || 0));
      })
      .slice(0, 8);
    const genreMix = Object.entries(data.genres || {})
      .sort((left, right) => Math.max(0, Math.floor(Number(right[1]) || 0)) - Math.max(0, Math.floor(Number(left[1]) || 0)))
      .slice(0, 6);
    const recentSessions = Array.isArray(data.recentSessions) ? data.recentSessions.slice(0, 6) : [];
    const weekMaxMs = Math.max(1, ...recentWeek.map((entry) => entry.minutesMs));
    const peakHourMax = Math.max(1, ...peakHours.map((entry) => entry.count));
    const topWindow = [...Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: hour === 0 ? '12A' : hour === 12 ? '12P' : hour > 12 ? `${hour - 12}P` : `${hour}A`,
      count: Math.max(0, Math.floor(Number(data.hourlyTrends?.[hour]) || 0)),
    }))]
      .sort((left, right) => right.count - left.count)
      .filter((entry) => entry.count > 0)
      .slice(0, 3);

    return {
      totalTracksPlayed,
      totalMs,
      totalSessions: Math.max(0, Math.floor(Number(data.totalSessions) || totalTracksPlayed)),
      activeDays: recentWeek.filter((entry) => entry.minutesMs > 0 || entry.plays > 0).length,
      recentWeek,
      weekMaxMs,
      peakHours,
      peakHourMax,
      topArtists,
      topTracks,
      genreMix,
      recentSessions,
      topWindow,
    };
  }, [soundCapsuleData]);

  const isPlaylistInspect = inspectTarget?.type === 'playlist';
  const showVisualStage = Boolean(isStandalone && currentTrack && videoMode);
  const isDualVisualMode = showVisualStage && videoMode === 'dual';
  const isDualWorkspaceMode = isDualVisualMode && !isVerticalStack;
  const isDualLayoutLocked = videoMode === 'dual';
  const isImmersiveLyricsLocked = Boolean(showVisualStage);
  const showSecondaryColumn = !isFocusedMode && !isDualVisualMode;

  const normalizeTrackIdentity = useCallback((track) => {
    if (!track) return '';
    if (track.youtubeId) return `yt:${track.youtubeId}`;
    if (track.id) return `id:${track.id}`;
    const title = String(track.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const author = String(track.author || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return `meta:${title}|${author}`;
  }, []);

  const inspectPlaylistTracks = useMemo(() => isPlaylistInspect && Array.isArray(inspectTarget?.tracks) ? inspectTarget.tracks.filter(Boolean) : [], [isPlaylistInspect, inspectTarget?.tracks]);
  const inspectPrimaryTrack = inspectPlaylistTracks[0] || null;
  const inspectTrack = isPlaylistInspect ? null : inspectTarget?.track || null;
  const inspectSourceUrl = useMemo(() => {
    if (!inspectTrack) return '';
    const explicitUrl = inspectTrack.actualUrl || inspectTrack.url || '';
    if (explicitUrl) return explicitUrl;
    const youtubeId = inspectTrack.youtubeId || extractYouTubeId(inspectTrack.id) || extractYouTubeId(inspectTrack.thumbnail);
    return youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '';
  }, [inspectTrack]);
  const getInspectSourceUrl = (track) => {
    if (!track) return '';
    const explicitUrl = track.actualUrl || track.url || '';
    if (explicitUrl) return explicitUrl;
    const youtubeId = track.youtubeId || extractYouTubeId(track.id) || extractYouTubeId(track.thumbnail);
    return youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '';
  };
  const inspectPlaylistSourceUrls = useMemo(() => inspectPlaylistTracks.map(getInspectSourceUrl).filter(Boolean), [inspectPlaylistTracks]);
  const inspectPlaylistTracklistText = useMemo(() => inspectPlaylistTracks.map((track, index) => {
    const sourceUrl = getInspectSourceUrl(track);
    return `${index + 1}. ${track.title || 'Unknown Track'} - ${track.author || 'Unknown Artist'}${sourceUrl ? ` - ${sourceUrl}` : ''}`;
  }).join('\n'), [inspectPlaylistTracks]);
  const inspectVaultNames = useMemo(() => inspectTrack
    ? Object.entries(playlists)
      .filter(([, tracks]) => (tracks || []).some((track) => normalizeTrackIdentity(track) === normalizeTrackIdentity(inspectTrack)))
      .map(([name]) => name)
    : [], [inspectTrack, playlists, normalizeTrackIdentity]);
  const inspectPlaylistDurationMs = useMemo(() => inspectPlaylistTracks.reduce((total, track) => total + Math.max(0, Number(track?.totalDurationMs || track?.duration || 0)), 0), [inspectPlaylistTracks]);
  const inspectPlaylistArtistCount = useMemo(() => new Set(inspectPlaylistTracks.map((track) => String(track?.author || 'Unknown Artist').trim()).filter(Boolean)).size, [inspectPlaylistTracks]);
  const inspectPlaylistQueuedCount = useMemo(() => inspectPlaylistTracks.filter((track) => queue.some((queuedTrack) => normalizeTrackIdentity(queuedTrack) === normalizeTrackIdentity(track))).length, [inspectPlaylistTracks, queue, normalizeTrackIdentity]);








  const restoreVerticalStackAfterVideoRef = useRef(false);
  const currentTrackRef = useRef(null);
  const prevTrackRef = useRef(null); // Neural Memory Ref (NOVA
  const standaloneTrackLoadKeyRef = useRef('');
  const bufferingRescueRef = useRef({ trackKey: '', lastAttemptAt: 0, attempts: 0 });
  const skipReasonTimeoutRef = useRef(null);
  const updateToastTimeoutRef = useRef(null);
  const prevUpdateStatusRef = useRef('idle');
  const libraryOverlayCreateInputRef = useRef(null);
  const lastWindowModeChangeRef = useRef(0);
  const prematureEndGuardRef = useRef({ trackId: null, retried: false });
  const manualTransportAdvanceRef = useRef({ trackKey: '', at: 0, action: '' });
  const warmupRetryRef = useRef(new Map());
  const videoEndGuardRef = useRef({ trackKey: '', settled: false, lastNearEndAt: 0, lastObservedMs: 0, lastProgressAt: 0 });

  const [history, setHistory] = useState([]);
  const [isManualStop, setIsManualStop] = useState(false);
  const [streamPort, setStreamPort] = useState(3333);
  const [videoQuality, setVideoQuality] = useState('720');
  const [playbackResetNonce, setPlaybackResetNonce] = useState(0);
  const [pendingResumeTime, setPendingResumeTime] = useState(null);
  // Web-only: browsers block audio.play() until a user gesture happens in the tab.
  // Standalone (Electron) starts unlocked. Web starts locked until user taps the overlay.
  const [webAudioUnlocked, setWebAudioUnlocked] = useState(!!window.aether);
  const [oauthPrompt, setOauthPrompt] = useState(null);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [dualFocusMode, setDualFocusMode] = useState(null); // null | 'video' | 'lyrics'
  const videoModeRef = useRef(null); // synchronous mirror — safe to read in audio callbacks
  const isPlayingRef = useRef(false); // live mirror of isPlaying for video handler closures
  const queueRef = useRef([]);
  const currentTimeRef = useRef(0);   // live mirror of currentTime for video handler closures
  const currentTimeCommitRef = useRef({ committed: 0, at: 0 });
  const ledgerSessionRef = useRef({ id: '', trackKey: '', counted: false, lastLoggedMs: 0 });
  const liveStreamStartOffsetMsRef = useRef(0);
  const [cinemaControlsVisible, setCinemaControlsVisible] = useState(true);
  const cinemaHideTimerRef = useRef(null);
  const localVideoRef = useRef(null);
  const [showVisualLyrics, setShowVisualLyrics] = useState(true);
  const [visualControlsPinned, setVisualControlsPinned] = useState(false);
  const [visualVideoFit, setVisualVideoFit] = useState('contain');

  const setCurrentTime = useCallback((nextValue) => {
    const previous = Math.max(0, Number(currentTimeRef.current) || 0);
    const resolved = typeof nextValue === 'function' ? nextValue(previous) : nextValue;
    const nextMs = Math.max(0, Math.floor(Number(resolved) || 0));
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const last = currentTimeCommitRef.current;
    const previousCommitted = last.committed;

    currentTimeRef.current = nextMs;

    const isReset = nextMs === 0;
    const isLargeJump = Math.abs(nextMs - previousCommitted) >= 900;
    const isStaleCommit = now - last.at >= 8000;
    if (!isReset && !isLargeJump && !isStaleCommit) return;

    last.committed = nextMs;
    last.at = now;
    if (isReset || Math.abs(nextMs - previousCommitted) > 3000) {
      setCurrentTimeState(nextMs);
      return;
    }
    startTransition(() => setCurrentTimeState(nextMs));
  }, []);

  // MASTER SINGLETON: Lazy-initialized once to prevent memory leaks and ghost audio streams.
  const localAudioRef = useRef(null);

  const getActivePlaybackPositionMs = useCallback(() => {
    if (videoModeRef.current && localVideoRef.current?.currentTime > 0) {
      return Math.max(0, Math.floor(localVideoRef.current.currentTime * 1000));
    }
    if (localAudioRef.current?.currentTime > 0) {
      return Math.max(0, liveStreamStartOffsetMsRef.current + Math.floor(localAudioRef.current.currentTime * 1000));
    }
    return Math.max(0, Math.floor(currentTimeRef.current || 0));
  }, []);

  const stopVideoElement = useCallback((vid, options = {}) => {
    const { clearSource = true } = options;
    if (!vid) return;
    vid.oncanplay = null;
    vid.onwaiting = null;
    vid.onplaying = null;
    vid.ontimeupdate = null;
    vid.onended = null;
    vid.onerror = null;
    try {
      vid.pause();
      if (clearSource) {
        vid.removeAttribute('src');
        vid.load();
      }
    } catch {}
  }, []);

  const exitVideoMode = useCallback((options = {}) => {
    const { preservePosition = true } = options;
    const vid = localVideoRef.current;
    const shouldRestoreVerticalStack = restoreVerticalStackAfterVideoRef.current;
    restoreVerticalStackAfterVideoRef.current = false;

    // Step 1: Capture handoff timestamp BEFORE touching anything
    const handoffMs = vid?.currentTime > 0
      ? Math.floor(vid.currentTime * 1000)
      : null;

    // Step 2: Hard-kill all video event handlers BEFORE unmounting.
    // The video element stays in memory after unmount and its events
    // (onwaiting, onplaying) will keep firing, corrupting buffering state.
    stopVideoElement(vid);
    // Clear the ref immediately so no stale pointer lingers
    localVideoRef.current = null;

    // Step 3: Synchronously clear videoModeRef so audio callbacks see it immediately
    videoModeRef.current = null;

    // Step 4: Seed audio resumption time from where video left off
    const durationMs = currentTrackRef.current?.totalDurationMs || currentTrackRef.current?.duration || 0;
    if (preservePosition && handoffMs !== null) {
      if (durationMs > 0 && handoffMs >= durationMs - 3000) {
        // If we exit video basically at the end, don't try to seek the raw audio pipe—just finish gracefully.
        advanceQueueRef.current('natural_end');
        return;
      }
      currentTimeRef.current = handoffMs;
      pendingResumeTimeRef.current = handoffMs;
      setPendingResumeTime(handoffMs);
      setCurrentTime(handoffMs);
    } else {
      pendingResumeTimeRef.current = null;
      setPendingResumeTime(null);
    }

    // Step 5: Fully reset audio element to avoid stuck/screeching playback,
    // then bump the load key ONCE to force audio re-initialization.
    if (localAudioRef.current) {
      try {
        localAudioRef.current.oncanplay = null;
        localAudioRef.current.onplaying = null;
        localAudioRef.current.onwaiting = null;
        localAudioRef.current.onstalled = null;
        localAudioRef.current.onended = null;
        localAudioRef.current.onerror = null;
        localAudioRef.current.onloadstart = null;
        localAudioRef.current.pause();
        localAudioRef.current.removeAttribute('src');
        localAudioRef.current.load();
        localAudioRef.current.muted = false;
      } catch {}
    }
    standaloneTrackLoadKeyRef.current = '';
    setPlaybackResetNonce((prev) => prev + 1);

    // Step 6: Clear stale buffering state from the video engine
    setIsAudioBuffering(false);

    setIsVideoReady(false);
    setVideoMode(null);
  }, []);

  // Reset isVideoReady on track change
  useEffect(() => {
    setIsVideoReady(false);
    if (!queue || queue.length === 0) {
      if (videoModeRef.current) exitVideoMode();
    }
  }, [queue?.[0]?.url, queue?.[0]?.youtubeId, queue?.length, exitVideoMode]);

  const switchVideoMode = useCallback((nextMode) => {
    const next = nextMode || null;
    const currentMode = videoModeRef.current;
    if (next === currentMode) return;
    if (next === null) {
      if (!currentMode) return;
      exitVideoMode();
      return;
    }

    const handoffMs = getActivePlaybackPositionMs();
    if (handoffMs > 0) {
      currentTimeRef.current = handoffMs;
      setCurrentTime(handoffMs);
    }
    pendingResumeTimeRef.current = null;
    setPendingResumeTime(null);
    setIsLyricsExpanded(false);

    if (!currentMode) {
      restoreVerticalStackAfterVideoRef.current = false;
    }

    if (next === 'dual') {
      if (isVerticalStack) {
        restoreVerticalStackAfterVideoRef.current = true;
        setIsVerticalStack(false);
      }
      setShowVisualLyrics(false);
      setVisualControlsPinned(false);
    }
    if (next === 'cinema') {
      setShowVisualLyrics(true);
    }

    // Split <-> cinema is just a shell transition around the same video element.
    if (currentMode && next && localVideoRef.current) {
      setCinemaControlsVisible(true);
      setVideoMode(next);
      return;
    }

    if (currentMode && localVideoRef.current) {
      stopVideoElement(localVideoRef.current);
      localVideoRef.current = null;
    }
    setIsAudioBuffering(true);
    setCinemaControlsVisible(true);
    setVideoMode(next);
  }, [exitVideoMode, getActivePlaybackPositionMs, isVerticalStack, stopVideoElement]);

  useEffect(() => {
    if (!isStandalone || !window.aether?.onYouTubeAuthRequired) return;
    const unsub = window.aether.onYouTubeAuthRequired((data) => {
      setOauthPrompt(data);
    });
    return unsub;
  }, [isStandalone]);

  // Keep videoModeRef in sync with videoMode state (synchronous for closure callbacks)
  useEffect(() => { videoModeRef.current = videoMode; }, [videoMode]);
  // Live mirrors so video handler closures never go stale on isPlaying / currentTime
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { queueRef.current = Array.isArray(queue) ? queue : []; }, [queue]);
  useEffect(() => {
    if (currentTime === 0 || Math.abs(currentTime - currentTimeRef.current) > 1200) {
      currentTimeRef.current = currentTime;
    }
  }, [currentTime]);
  useEffect(() => { currentTrackRef.current = queue?.[0] || null; }, [queue]);
  useEffect(() => { pendingResumeTimeRef.current = pendingResumeTime; }, [pendingResumeTime]);
  useEffect(() => {
    let raf = 0;
    if (isViewingFullQueue) {
      setIsFullQueueContentReady(false);
      raf = requestAnimationFrame(() => setIsFullQueueContentReady(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsFullQueueContentReady(false);
    return undefined;
  }, [isViewingFullQueue]);
  useEffect(() => {
    let raf = 0;
    if (isViewingFullDiscovery) {
      setIsFullDiscoveryContentReady(false);
      raf = requestAnimationFrame(() => setIsFullDiscoveryContentReady(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsFullDiscoveryContentReady(false);
    return undefined;
  }, [isViewingFullDiscovery]);
  useEffect(() => {
    let raf = 0;
    if (isViewingFullPlaylist) {
      setIsFullPlaylistContentReady(false);
      raf = requestAnimationFrame(() => setIsFullPlaylistContentReady(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsFullPlaylistContentReady(false);
    return undefined;
  }, [isViewingFullPlaylist]);
  useEffect(() => {
    let raf = 0;
    if (isMixtapeVaultOpen) {
      setIsMixtapeVaultContentReady(false);
      raf = requestAnimationFrame(() => setIsMixtapeVaultContentReady(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsMixtapeVaultContentReady(false);
    return undefined;
  }, [isMixtapeVaultOpen]);
  useEffect(() => {
    visualizerStateRef.current = {
      visualizerMode,
      themeColor,
      auraPreset,
      isMixtapeVaultOpen,
      performanceMode,
    };
  }, [visualizerMode, themeColor, auraPreset, isMixtapeVaultOpen, performanceMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.remove('perf-low', 'perf-medium', 'perf-high');
    document.body.classList.add(`perf-${performanceMode}`);
    return () => {
      document.body.classList.remove('perf-low', 'perf-medium', 'perf-high');
    };
  }, [performanceMode]);

  // Auto-exit video mode when queue empties (no current track)
  useEffect(() => {
    if (videoMode && !queue?.[0]) {
      console.log('[Aether/Video] Queue empty — exiting video mode');
      exitVideoMode({ preservePosition: false });
    }
  }, [queue, videoMode, exitVideoMode]);

  useEffect(() => {
    if (!isStandalone) return;

    const teardownPlaybackSession = () => {
      sessionReadyRef.current = false;
      pendingResumeTimeRef.current = null;
      try {
        window.aether?.store?.set?.(SESSION_PLAYBACK_STORAGE_KEY, {
          queue: [],
          isPlaying: false,
          currentTime: 0,
          savedAt: Date.now(),
          closedAt: Date.now(),
        });
      } catch {}

      stopVideoElement(localVideoRef.current);
      localVideoRef.current = null;

      if (localAudioRef.current) {
        try {
          localAudioRef.current.oncanplay = null;
          localAudioRef.current.onplaying = null;
          localAudioRef.current.ontimeupdate = null;
          localAudioRef.current.onwaiting = null;
          localAudioRef.current.onstalled = null;
          localAudioRef.current.onended = null;
          localAudioRef.current.onerror = null;
          localAudioRef.current.onloadstart = null;
          localAudioRef.current.pause();
          localAudioRef.current.muted = true;
          localAudioRef.current.removeAttribute('src');
          localAudioRef.current.load();
        } catch {}
      }
    };

    window.addEventListener('beforeunload', teardownPlaybackSession);
    window.addEventListener('pagehide', teardownPlaybackSession);
    return () => {
      window.removeEventListener('beforeunload', teardownPlaybackSession);
      window.removeEventListener('pagehide', teardownPlaybackSession);
    };
  }, [isStandalone, stopVideoElement]);

  useEffect(() => {
    if (!isAudioBuffering && oauthPrompt) {
      setOauthPrompt(null);
    }
  }, [isAudioBuffering, oauthPrompt]);

  // ─── SIMPLE VIDEO ENGINE ─────────────────────────────────────────────────
  // NOTE: isPlaying is intentionally NOT in the dep array.
  // Play/Pause sync is handled by a separate effect below to avoid
  // re-running src assignment and seek logic on every play/pause toggle.
  useEffect(() => {
    const vid = localVideoRef.current;
    if (!queue?.[0] || !isStandalone || !videoMode) {
      videoEndGuardRef.current = { trackKey: '', settled: false, lastNearEndAt: 0, lastObservedMs: 0, lastProgressAt: 0 };
      if (vid) {
        vid.oncanplay = null;
        vid.onwaiting = null;
        vid.onplaying = null;
        vid.ontimeupdate = null;
        vid.onended = null;
        vid.onerror = null;
        vid.pause();
        vid.src = '';
      }
      // Do NOT call setIsAudioBuffering here — the audio engine owns that state
      // and will race against us if we touch it during its own re-init.
      if (localAudioRef.current) localAudioRef.current.muted = false;
      return;
    }

    const track = queue[0];
    const trackActionKey = getTrackActionKey(track);
    const youtubeUrl = track?.youtubeId
      ? `https://www.youtube.com/watch?v=${track.youtubeId}`
      : track?.actualUrl || track?.url || '';
    
    if (!youtubeUrl) return;

    const streamBase = `http://localhost:${streamPort}`;
    const targetSrc = `${streamBase}/videostream?url=${encodeURIComponent(youtubeUrl)}&quality=${videoQuality}&_r=${playbackResetNonce}`;

    // Mute / pause the audio element — video owns output now
    if (localAudioRef.current) {
        localAudioRef.current.muted = true;
        localAudioRef.current.pause();
    }

    // Only reload src if actually changed (don't disrupt a playing video on re-render)
    if (vid && vid.src !== targetSrc) {
        vid.src = targetSrc;
        setIsAudioBuffering(true);
    }

    videoEndGuardRef.current = {
      trackKey: trackActionKey,
      settled: false,
      lastNearEndAt: 0,
      lastObservedMs: 0,
      lastProgressAt: Date.now(),
    };

    const getResolvedVideoDurationMs = () => (
      Number.isFinite(Number(vid?.duration)) && Number(vid?.duration) > 0
        ? Math.round(Number(vid.duration) * 1000)
        : Number(track.totalDurationMs || track.duration || 0)
    );

    const settleVideoNaturalEnd = () => {
      const guard = videoEndGuardRef.current;
      if (!guard || guard.trackKey !== trackActionKey || guard.settled) return;
      guard.settled = true;
      const resolvedDurationMs = getResolvedVideoDurationMs();
      if (Number.isFinite(resolvedDurationMs) && resolvedDurationMs > 0) {
        currentTimeRef.current = Math.max(currentTimeRef.current || 0, resolvedDurationMs);
        setCurrentTime(resolvedDurationMs);
      }
      advanceQueueRef.current('natural_end');
    };

    // Handlers — re-attach every time track/mode changes, not on play/pause
    vid.oncanplay = () => {
        // Sync video position to where audio was (one-time on initial load only)
        const targetSec = Math.floor(currentTimeRef.current / 1000);
        if (vid.currentTime === 0 && targetSec > 2) vid.currentTime = targetSec;
        if (isPlayingRef.current) vid.play().catch(() => {});
        setIsAudioBuffering(false);
        setIsVideoReady(true);
    };
    vid.onwaiting = () => setIsAudioBuffering(true);
    vid.onplaying = () => setIsAudioBuffering(false);
    vid.ontimeupdate = () => {
        const currentMs = Math.max(0, Math.floor((vid.currentTime || 0) * 1000));
        const guard = videoEndGuardRef.current;
        if (guard?.trackKey === trackActionKey) {
          if (currentMs > guard.lastObservedMs + 120) {
            guard.lastObservedMs = currentMs;
            guard.lastProgressAt = Date.now();
          }
          const durationMs = getResolvedVideoDurationMs();
          const nearEndThresholdMs = durationMs > 0 ? Math.max(450, Math.min(1500, durationMs * 0.02)) : 0;
          const remainingMs = durationMs > 0 ? Math.max(0, durationMs - currentMs) : Infinity;
          if (durationMs > 0 && remainingMs <= nearEndThresholdMs) {
            guard.lastNearEndAt ||= Date.now();
          } else {
            guard.lastNearEndAt = 0;
          }
        }
        if (currentMs > 0) setCurrentTime(currentMs);
    };
    vid.onended = () => settleVideoNaturalEnd();
    vid.onerror = () => {
      console.warn('[Aether/Video] Video playback error, falling back to audio mode', {
        title: track?.title,
        url: youtubeUrl,
      });
      setIsAudioBuffering(false);
      exitVideoMode();
    };

    const nearEndWatchdog = window.setInterval(() => {
      const guard = videoEndGuardRef.current;
      if (!vid || !guard || guard.trackKey !== trackActionKey || guard.settled) return;
      const durationMs = getResolvedVideoDurationMs();
      if (!Number.isFinite(durationMs) || durationMs <= 0) return;

      const currentMs = Math.max(0, Math.floor((vid.currentTime || 0) * 1000));
      const nearEndThresholdMs = Math.max(900, Math.min(1800, durationMs * 0.03));
      const remainingMs = Math.max(0, durationMs - currentMs);
      const nearEndLongEnough = guard.lastNearEndAt > 0 && (Date.now() - guard.lastNearEndAt) > 1500;
      const stalledNearEnd = isPlayingRef.current && !vid.paused && remainingMs <= nearEndThresholdMs && (Date.now() - guard.lastProgressAt) > 1200;

      if (vid.ended || remainingMs <= 180 || nearEndLongEnough || stalledNearEnd) {
        console.warn('[Aether/Video] Near-end watchdog advancing queue', {
          title: track?.title,
          currentMs,
          durationMs,
          remainingMs,
          nearEndLongEnough,
          stalledNearEnd,
        });
        settleVideoNaturalEnd();
      }
    }, 260);

    return () => {
        window.clearInterval(nearEndWatchdog);
        if (vid) {
            vid.oncanplay = null;
            vid.onwaiting = null;
            vid.onplaying = null;
            vid.ontimeupdate = null;
            vid.onended = null;
            vid.onerror = null;
        }
        videoEndGuardRef.current = { trackKey: '', settled: false, lastNearEndAt: 0, lastObservedMs: 0, lastProgressAt: 0 };
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue?.[0]?.id, queue?.[0]?.queueNonce, videoMode, streamPort, playbackResetNonce, videoQuality]);

  // Video play/pause sync — separate effect so it doesn't re-run src/seek logic
  useEffect(() => {
    if (!videoMode || !localVideoRef.current) return;
    if (isPlaying) {
      localVideoRef.current.play().catch(() => {});
    } else {
      localVideoRef.current.pause();
    }
  }, [isPlaying, videoMode]);

  useEffect(() => {
    if (videoMode && localVideoRef.current) {
      localVideoRef.current.volume = volume;
    }
  }, [volume, videoMode]);

  // Cinema mode: auto-hide controls after 3s of inactivity
  useEffect(() => {
    if (videoMode !== 'cinema') return;
    setCinemaControlsVisible(true);
    if (visualControlsPinned) return;
    clearTimeout(cinemaHideTimerRef.current);
    cinemaHideTimerRef.current = setTimeout(() => setCinemaControlsVisible(false), 3000);
    return () => clearTimeout(cinemaHideTimerRef.current);
  }, [videoMode, visualControlsPinned]);

  const handleCinemaMouseMove = useCallback(() => {
    if (videoMode !== 'cinema') return;
    setCinemaControlsVisible(true);
    if (visualControlsPinned) return;
    clearTimeout(cinemaHideTimerRef.current);
    cinemaHideTimerRef.current = setTimeout(() => setCinemaControlsVisible(false), 3000);
  }, [videoMode, visualControlsPinned]);

  // --- AETHER STUDIO CORE: NEURAL ENGINE STATE (NOVA ---

  const currentTrackSourceUrl = useMemo(() => {
    if (!currentTrack) return '';
    if (currentTrack.youtubeId) return `https://www.youtube.com/watch?v=${currentTrack.youtubeId}`;
    return currentTrack.actualUrl || currentTrack.url || '';
  }, [currentTrack?.youtubeId, currentTrack?.actualUrl, currentTrack?.url]);
  const pendingLibraryItems = useMemo(() => {
    if (libraryActionTarget?.items?.length) return libraryActionTarget.items;
    return currentTrack ? [currentTrack] : [];
  }, [libraryActionTarget, currentTrack]);
  const canAddPendingToVault = pendingLibraryItems.length > 0;
  const canOpenCurrentSource = Boolean(isStandalone && currentTrackSourceUrl);
  const canDownloadCurrentTrack = Boolean(isStandalone && window.aether?.exportAudioToFile && currentTrackSourceUrl);
  const canUseUpdater = Boolean(isStandalone && window.aether?.getUpdateStatus && window.aether?.checkForUpdates && window.aether?.downloadUpdate && window.aether?.quitAndInstallUpdate);
  const platform = isStandalone ? window.aether?.platform : '';
  const isMacPlatform = isStandalone ? platform === 'darwin' : /mac/i.test(navigator?.platform || '');
  const isWindowsPlatform = isStandalone ? platform === 'win32' : /win/i.test(navigator?.platform || '');
  const parsedShortcuts = useMemo(() => Object.fromEntries(
    SHORTCUT_FIELDS.map(({ id }) => [id, parseShortcutCombo(shortcuts[id], isMacPlatform)]),
  ), [isMacPlatform, shortcuts]);
  const windowChromeInsetClass = isMacPlatform ? 'pt-7' : (isWindowsPlatform ? (isMaximized ? 'pt-0' : 'pt-[34px]') : 'pt-0');
  const defaultGlobalMediaShortcutsEnabled = isMacPlatform;

  const updateActionLabel = useMemo(() => {
    if (!canUseUpdater || !updateInfo?.enabled) return 'UPDATE';
    if (updateInfo.downloaded) return 'RESTART';
    if (updateInfo.status === 'downloading') return `${Math.round(Number(updateInfo.progress || 0))}%`;
    if (updateInfo.available) return 'DOWNLOAD';
    if (updateInfo.status === 'checking') return 'CHECKING';
    if (updateInfo.status === 'up-to-date') return 'UP-TO-DATE';
    if (updateInfo.status === 'error') return 'RETRY';
    return 'CHECK';
  }, [canUseUpdater, updateInfo]);

  const handleUpdateAction = useCallback(async () => {
    if (!canUseUpdater || isUpdateBusy) return;
    setIsUpdateBusy(true);
    try {
      if (updateInfo.downloaded) {
        const res = await window.aether.quitAndInstallUpdate();
        if (!res?.success) {
          setLastAdded(`Update restart failed${res?.error ? `: ${String(res.error).slice(0, 46)}` : ''}`);
          setTimeout(() => setLastAdded(null), 2600);
        }
        return;
      }
      if (updateInfo.available) {
        setUpdateToast('Downloading update…');
        if (updateToastTimeoutRef.current) clearTimeout(updateToastTimeoutRef.current);
        updateToastTimeoutRef.current = setTimeout(() => setUpdateToast(''), 2400);
        const res = await window.aether.downloadUpdate();
        if (!res?.success) {
          setLastAdded(`Update download failed${res?.error ? `: ${String(res.error).slice(0, 46)}` : ''}`);
          setTimeout(() => setLastAdded(null), 2600);
        }
        return;
      }
      setUpdateToast('Checking for updates…');
      if (updateToastTimeoutRef.current) clearTimeout(updateToastTimeoutRef.current);
      updateToastTimeoutRef.current = setTimeout(() => setUpdateToast(''), 2400);
      const res = await window.aether.checkForUpdates();
      if (!res?.success && res?.error) {
        setLastAdded(`Update check failed: ${String(res.error).slice(0, 42)}`);
        setTimeout(() => setLastAdded(null), 2400);
      }
    } catch (e) {
      setLastAdded(`Updater error: ${String(e?.message || e).slice(0, 46)}`);
      setTimeout(() => setLastAdded(null), 2600);
    } finally {
      setIsUpdateBusy(false);
    }
  }, [canUseUpdater, isUpdateBusy, updateInfo?.downloaded, updateInfo?.available]);

  useEffect(() => {
    if (!canUseUpdater || !updateInfo?.enabled) return;
    const prevStatus = prevUpdateStatusRef.current;
    const nextStatus = String(updateInfo?.status || 'idle');
    if (prevStatus === nextStatus) return;
    prevUpdateStatusRef.current = nextStatus;

    let toast = '';
    if (nextStatus === 'checking') {
      toast = 'Checking for updates…';
    } else 
    if (nextStatus === 'available') {
      toast = `Update available${updateInfo?.version ? ` • v${updateInfo.version}` : ''}`;
    } else if (nextStatus === 'up-to-date') {
      toast = 'You are on the latest version';
    } else if (nextStatus === 'downloaded') {
      toast = `Update ready${updateInfo?.version ? ` • v${updateInfo.version}` : ''} • restart to install`;
    } else if (nextStatus === 'error') {
      toast = `Updater issue${updateInfo?.message ? `: ${String(updateInfo.message).slice(0, 58)}` : ''}`;
    }

    if (!toast) return;
    setUpdateToast(toast);
    if (updateToastTimeoutRef.current) clearTimeout(updateToastTimeoutRef.current);
    updateToastTimeoutRef.current = setTimeout(() => setUpdateToast(''), nextStatus === 'downloaded' ? 5200 : nextStatus === 'checking' ? 2000 : 3600);

    return () => {
      if (updateToastTimeoutRef.current) {
        clearTimeout(updateToastTimeoutRef.current);
      }
    };
  }, [canUseUpdater, updateInfo?.enabled, updateInfo?.status, updateInfo?.version, updateInfo?.message]);

  const handleDownloadCurrentTrack = useCallback(async () => {
    if (!canDownloadCurrentTrack || !currentTrack || isDownloadingTrack) {
      setLastAdded('Download unavailable');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }

    setIsDownloadingTrack(true);
    setLastAdded('Choose destination folder…');

    try {
      const result = await window.aether.exportAudioToFile(
        currentTrackSourceUrl,
        currentTrack.title || 'track',
        currentTrack.author || 'unknown'
      );

      if (result?.cancel) {
        setLastAdded('Export cancelled');
        setTimeout(() => setLastAdded(null), 1800);
        return;
      }

      if (result?.success === false) {
        throw new Error(result?.error || 'Save failed');
      }

      setLastAdded(`Exported: ${currentTrack.title || 'Track'}`);
      setTimeout(() => setLastAdded(null), 2800);
    } catch (err) {
      setLastAdded(`Download failed${err?.message ? `: ${String(err.message).slice(0, 42)}` : ''}`);
      setTimeout(() => setLastAdded(null), 3000);
    } finally {
      setIsDownloadingTrack(false);
    }
  }, [canDownloadCurrentTrack, currentTrack, currentTrackSourceUrl, isDownloadingTrack]);

  const appendSpotifyImportLog = useCallback((line) => {
    const stamp = new Date().toLocaleTimeString();
    const msg = `[${stamp}] ${line}`;
    console.log('[Aether/SpotifyImport]', msg);
    setSpotifyImportLogs(prev => [...prev.slice(-19), msg]);
  }, []);

  const copySpotifyImportDebugLog = useCallback(async () => {
    const text = spotifyImportLogs.length > 0
      ? spotifyImportLogs.join('\n')
      : `Aether playlist import\nprovider=${musicImportProvider || 'none'}\nname=${spotifyImportPlaylistName || 'auto'}\nurl=${spotifyImportUrl || 'empty'}\nstatus=${spotifyImportProgress.stage || 'idle'}\nmessage=${spotifyImportProgress.message || 'No logs yet.'}`;
    try {
      await navigator.clipboard?.writeText(text);
      setLastAdded('Import debug log copied');
      setTimeout(() => setLastAdded(null), 2200);
    } catch {
      setLastAdded('Could not copy import debug log');
      setTimeout(() => setLastAdded(null), 2200);
    }
  }, [musicImportProvider, spotifyImportLogs, spotifyImportPlaylistName, spotifyImportProgress.message, spotifyImportProgress.stage, spotifyImportUrl]);

  const appendRecentEvent = useCallback((label, detail = '', meta = {}) => {
    const event = {
      at: Date.now(),
      label: String(label || 'event'),
      detail: String(detail || meta?.detail || '').trim(),
      tone: String(meta?.tone || 'neutral'),
      title: String(meta?.title || currentTrack?.title || '').trim(),
    };
    setSkipEvents((prev) => [...prev.slice(-49), event]);
  }, [currentTrack?.title]);

  const openTrackInspect = useCallback((track, source = 'track') => {
    if (!track) return;
    setInspectTarget({
      type: 'track',
      track,
      source,
      openedAt: Date.now(),
    });
  }, []);

  const openPlaylistInspect = useCallback((playlistName, tracks = [], source = 'playlist') => {
    const safeTracks = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
    if (safeTracks.length === 0) return;
    setInspectTarget({
      type: 'playlist',
      playlistName: String(playlistName || 'Playlist'),
      tracks: safeTracks,
      source,
      openedAt: Date.now(),
    });
  }, []);

  const showGestureNotice = useCallback((message) => {
    setGestureNotice(message);
    if (gestureStateRef.current.noticeTimer) {
      window.clearTimeout(gestureStateRef.current.noticeTimer);
    }
    gestureStateRef.current.noticeTimer = window.setTimeout(() => setGestureNotice(''), 1700);
  }, []);

  const updateFeedbackDraft = useCallback((patch) => {
    setFeedbackDraft((prev) => ({ ...prev, ...patch }));
    setFeedbackStatus('');
  }, []);

  const submitFeedback = useCallback(async () => {
    const summary = feedbackDraft.summary.trim();
    const details = feedbackDraft.details.trim();
    if (!summary || !details) {
      setFeedbackStatus('Add a short title and a little detail first.');
      return;
    }

    const trackSnapshot = currentTrack ? {
      title: currentTrack.title || '',
      author: currentTrack.author || '',
      url: currentTrack.actualUrl || currentTrack.url || '',
      youtubeId: currentTrack.youtubeId || '',
      positionMs: getActivePlaybackPositionMs(),
    } : null;

    const payload = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: feedbackDraft.type,
      summary,
      details,
      contact: feedbackDraft.contact.trim(),
      buildVersion: BUILD_VERSION,
      uxVersion: UX_VERSION,
      platform: platform || 'web',
      isStandalone,
      currentTrack: trackSnapshot,
      diagnostics: {
        playbackMode: videoMode || 'audio',
        visualizerMode,
        auraPreset,
        queueLength: queue.length,
        lyricsCount: lyrics.length,
      },
      createdAt: new Date().toISOString(),
    };

    setIsFeedbackSending(true);
    setFeedbackStatus('Preparing feedback...');

    try {
      const persistEntry = async (entry) => {
        if (isStandalone && window.aether?.store?.get && window.aether?.store?.set) {
          const existing = await window.aether.store.get(FEEDBACK_STORAGE_KEY);
          const list = Array.isArray(existing) ? existing : [];
          await window.aether.store.set(FEEDBACK_STORAGE_KEY, [entry, ...list].slice(0, 30));
          return;
        }
        const existingRaw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([entry, ...(Array.isArray(existing) ? existing : [])].slice(0, 30)));
      };

      const endpoint = import.meta.env.VITE_FEEDBACK_ENDPOINT?.trim();
      if (endpoint) {
        await axios.post(endpoint, payload, { timeout: 8000 });
        await persistEntry({ ...payload, delivery: 'endpoint' });
        setFeedbackStatus('Sent. Thanks for the report.');
        appendRecentEvent('feedback_sent', payload.summary, { tone: 'success', title: payload.type });
      } else {
        const bodyLines = [
          `Type: ${payload.type}`,
          `Build: ${payload.buildVersion} / ${payload.uxVersion}`,
          `Platform: ${payload.platform}${payload.isStandalone ? ' desktop' : ' web'}`,
          '',
          'Details:',
          payload.details,
          '',
          payload.currentTrack ? `Track: ${payload.currentTrack.title} - ${payload.currentTrack.author}` : 'Track: none',
          payload.currentTrack?.url ? `Source: ${payload.currentTrack.url}` : '',
          `Queue: ${payload.diagnostics.queueLength}`,
          `Mode: ${payload.diagnostics.playbackMode} / ${payload.diagnostics.visualizerMode}`,
          payload.contact ? `Contact: ${payload.contact}` : '',
        ].filter(Boolean);
        const issueUrl = `${FEEDBACK_ISSUE_URL}?title=${encodeURIComponent(`[${payload.type}] ${payload.summary}`)}&body=${encodeURIComponent(bodyLines.join('\n'))}&labels=${encodeURIComponent('feedback')}`;
        await persistEntry({ ...payload, delivery: 'github-issue-draft' });
        if (isStandalone && window.aether?.openExternal) {
          await window.aether.openExternal(issueUrl);
        } else {
          window.open(issueUrl, '_blank', 'noopener,noreferrer');
        }
        setFeedbackStatus('Opened a GitHub issue draft. Submit it there so it lands in the maintainer inbox.');
        appendRecentEvent('feedback_issue_opened', payload.summary, { tone: 'success', title: payload.type });
      }

      setFeedbackDraft(DEFAULT_FEEDBACK_DRAFT);
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setFeedbackStatus('');
      }, 1200);
    } catch (error) {
      console.warn('[Aether/Feedback] submit failed', error);
      setFeedbackStatus(`Feedback failed: ${String(error?.message || error).slice(0, 80)}`);
      appendRecentEvent('feedback_failed', error?.message || 'Feedback failed', { tone: 'error' });
    } finally {
      setIsFeedbackSending(false);
    }
  }, [appendRecentEvent, auraPreset, currentTrack, feedbackDraft, getActivePlaybackPositionMs, isStandalone, lyrics.length, platform, queue.length, videoMode, visualizerMode]);

  const noteSkipReason = useCallback((reason, meta = {}) => {
    console.log('[Aether/SkipReason]', reason, meta);
    setSkipReasonToast(reason);
    const event = {
      at: Date.now(),
      label: reason,
      detail: meta?.title || currentTrack?.title || 'Unknown',
      tone: 'transport',
      title: meta?.title || currentTrack?.title || 'Unknown',
      source: meta?.source || 'unknown',
      trackId: meta?.trackId || currentTrack?.id || null,
    };
    setSkipEvents(prev => [...prev.slice(-49), event]);
    if (skipReasonTimeoutRef.current) clearTimeout(skipReasonTimeoutRef.current);
    skipReasonTimeoutRef.current = setTimeout(() => setSkipReasonToast(''), 2200);
  }, [currentTrack?.id, currentTrack?.title]);

  const closeHeaderSurfaces = useCallback((except = null) => {
    if (except !== 'looks' && except !== 'shortcuts' && except !== 'header') headerControlsRef.current?.close();
    if (except !== 'sleep') sleepTimerControlsRef.current?.close();
    if (except !== 'lock') appLockSettingsRef.current?.close();
    if (except !== 'tips') setIsTipsOverlayOpen(false);
    if (except !== 'shortcuts') {
      setIsShortcutSettingsOpen(false);
      setShortcutSettingsError('');
    }
    if (except !== 'diagnostics') setIsDiagnosticsOpen(false);
    if (except !== 'looks') setIsLooksPanelOpen(false);
    if (except !== 'sleep') setIsSleepTimerMenuOpen(false);
  }, []);

  const runAfterInputPaint = useCallback((fn) => {
    if (typeof window === 'undefined') {
      startTransition(fn);
      return;
    }
    window.requestAnimationFrame(() => {
      window.setTimeout(() => startTransition(fn), 0);
    });
  }, []);

  const openLibraryOverlay = useCallback((target = null) => {
    runAfterInputPaint(() => {
      const favoriteCount = Object.keys(favoriteTracks || {}).length;
      const fallbackPlaylist = viewingPlaylist === FAVORITES_PLAYLIST_ID && favoriteCount > 0
        ? FAVORITES_PLAYLIST_ID
        : (viewingPlaylist && playlists[viewingPlaylist])
        ? viewingPlaylist
        : (favoriteCount > 0 ? FAVORITES_PLAYLIST_ID : (playlistOrder.find((name) => Array.isArray(playlists[name])) || Object.keys(playlists)[0] || null));
      if (fallbackPlaylist) setViewingPlaylist(fallbackPlaylist);
      setLibraryActionTarget(target);
      setIsLibraryOverlayOpen(true);
    });
  }, [favoriteTracks, playlistOrder, playlists, runAfterInputPaint, viewingPlaylist]);

  const openFeedbackPanel = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('feedback');
      feedbackRef.current?.open();
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);

  const openGestureLab = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('gesture');
      gestureLabRef.current?.open();
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);

  const openSignalLedger = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('ledger');
      soundCapsuleRef.current?.open();
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);

  const openTipsOverlay = useCallback(() => {
    closeHeaderSurfaces('tips');
    setTipsDontShowAgain(hideFirstRunTips);
    setIsTipsOverlayOpen(true);
  }, [closeHeaderSurfaces, hideFirstRunTips]);

  const persistHideFirstRunTips = useCallback((nextHideFirstRunTips) => {
    const nextValue = Boolean(nextHideFirstRunTips);
    try {
      if (isStandalone && window.aether?.store?.set) {
        (async () => {
          const rawExisting = await window.aether?.store?.get?.(SESSION_UI_STORAGE_KEY);
          const existing = rawExisting && typeof rawExisting === 'object' ? rawExisting : {};
          await window.aether.store.set(SESSION_UI_STORAGE_KEY, {
            ...existing,
            hideFirstRunTips: nextValue,
            savedAt: Date.now(),
          });
        })().catch((e) => {
          setUserError('Failed to save session settings.');
          console.warn('[Aether/Session] Failed to persist hideFirstRunTips (standalone)', e);
        });
        return;
      }

      let existing = {};
      try {
        const raw = localStorage.getItem(SESSION_UI_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') existing = parsed;
      } catch (e) {
        setUserError('Failed to read session settings.');
        console.warn('[Aether/Session] Failed to read session settings', e);
      }

      try {
        localStorage.setItem(SESSION_UI_STORAGE_KEY, JSON.stringify({
          ...existing,
          hideFirstRunTips: nextValue,
          savedAt: Date.now(),
        }));
      } catch (e) {
        setUserError('Failed to save session settings.');
        console.warn('[Aether/Session] Failed to persist hideFirstRunTips', e);
      }
    } catch (e) {
      setUserError('Failed to save session settings.');
      console.warn('[Aether/Session] Failed to persist hideFirstRunTips', e);
    }
  }, [isStandalone]);

  const closeTipsOverlay = useCallback(() => {
    const nextHide = Boolean(tipsDontShowAgain);
    setIsTipsOverlayOpen(false);
    setHideFirstRunTips(nextHide);
    persistHideFirstRunTips(nextHide);
  }, [persistHideFirstRunTips, tipsDontShowAgain]);

  const openShortcutSettings = useCallback(() => {
    runAfterInputPaint(() => {
      closeHeaderSurfaces('shortcuts');
      headerControlsRef.current?.openShortcutSettings();
    });
  }, [closeHeaderSurfaces, runAfterInputPaint]);

  const closeShortcutSettings = useCallback(() => {
    setIsShortcutSettingsOpen(false);
    setShortcutSettingsError('');
  }, []);

  const resetShortcutSettingsToDefaults = useCallback(() => {
    setShortcutSettingsError('');
    setShortcutDraft(sanitizeShortcutMap(DEFAULT_SHORTCUTS, isMacPlatform));
  }, [isMacPlatform]);

  const saveShortcutSettings = useCallback(async () => {
    const normalized = sanitizeShortcutMap(shortcutDraft, isMacPlatform);
    const seen = new Map();

    for (const { id, label } of SHORTCUT_FIELDS) {
      const parsed = parseShortcutCombo(normalized[id], isMacPlatform);
      if (!parsed) {
        setShortcutSettingsError(`Invalid shortcut for ${label}.`);
        return;
      }
      const key = buildCanonicalShortcutCombo(parsed, isMacPlatform);
      if (seen.has(key)) {
        setShortcutSettingsError(`Shortcut conflict: ${label} and ${seen.get(key)} both use ${toReadableShortcut(key, isMacPlatform)}.`);
        return;
      }
      seen.set(key, label);
    }

    setShortcuts(normalized);
    setShortcutSettingsError('');
    setIsShortcutSettingsOpen(false);
    setLastAdded('Shortcuts updated');
    setTimeout(() => setLastAdded(null), 1600);

    try {
      if (isStandalone && window.aether?.store?.set) {
        await window.aether.store.set(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, !!globalMediaShortcutsEnabled);
      } else {
        localStorage.setItem(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, JSON.stringify(!!globalMediaShortcutsEnabled));
      }
    } catch (e) {
      console.warn('[Aether/Shortcuts] Failed to persist global media shortcut toggle', e);
    }
  }, [globalMediaShortcutsEnabled, isMacPlatform, isStandalone, shortcutDraft]);

  const copyVaultSceneEmbed = useCallback(async () => {
    const totalDurationMs = currentTrack?.totalDurationMs || currentTrack?.duration || 0;
    const currentMs = getActivePlaybackPositionMs();
    const lyricLine = (() => {
      if (!Array.isArray(lyrics) || lyrics.length === 0) return 'No lyric locked yet';
      const line = [...lyrics].reverse().find((l) => l.time <= currentMs);
      return line?.text || 'No lyric locked yet';
    })();
    const sceneYouTubeId = currentTrack?.youtubeId || extractSceneYouTubeId(currentTrack?.actualUrl || currentTrack?.url || currentTrack?.thumbnail || '');
    const payload = {
      v: 1,
      t: String(currentTrack?.title || 'Aether Secret Session').slice(0, 120),
      a: String(currentTrack?.author || 'Unknown Artist').slice(0, 72),
      l: String(lyricLine || 'No lyric locked yet').slice(0, 140),
      y: sceneYouTubeId || '',
      th: sceneYouTubeId ? '' : String(currentTrack?.thumbnail || '').slice(0, 220),
      at: currentMs,
      to: totalDurationMs,
      s: isPlaying ? 1 : 0,
      m: visualizerMode === 'pulse' ? 1 : 0,
      p: [
        Math.round(clamp01(vaultPulse.energy) * 100),
        Math.round(clamp01(vaultPulse.bass) * 100),
        Math.round(clamp01(vaultPulse.mids) * 100),
        Math.round(clamp01(vaultPulse.highs) * 100),
      ],
      c: themeColor,
    };
    const encoded = encodeScenePayload(payload);
    if (!encoded) {
      setLastAdded('Scene link unavailable');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const sceneUrl = `${AETHER_SHARE_ORIGIN}/?scene=${encoded}`;
    setSharedScene(normalizeScenePayload(payload));
    setIsSharedSceneOpen(true);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sceneUrl);
      } else {
        const fallback = document.createElement('textarea');
        fallback.value = sceneUrl;
        fallback.style.position = 'fixed';
        fallback.style.left = '-9999px';
        document.body.appendChild(fallback);
        fallback.select();
        document.execCommand('copy');
        fallback.remove();
      }
      appendRecentEvent('scene_link', `${payload.t} @ ${formatTime(currentMs)}`, { tone: 'success', title: payload.t });
      setLastAdded('Scene link copied');
      setTimeout(() => setLastAdded(null), 2200);
    } catch (err) {
      console.warn('[Aether/Vault] Failed to copy scene embed', err);
      appendRecentEvent('scene_link_failed', err?.message || 'Scene link unavailable', { tone: 'error', title: payload.t });
      setLastAdded('Scene link unavailable');
      setTimeout(() => setLastAdded(null), 2200);
    }
  }, [appendRecentEvent, currentTrack?.actualUrl, currentTrack?.author, currentTrack?.duration, currentTrack?.thumbnail, currentTrack?.title, currentTrack?.youtubeId, formatTime, getActivePlaybackPositionMs, isPlaying, lyrics, themeColor, visualizerMode, vaultPulse.bass, vaultPulse.energy, vaultPulse.highs, vaultPulse.mids]);

  const refreshLockStatus = useCallback(async () => {
    if (!isStandalone || !window.aether?.getLockStatus) return;
    try {
      const status = await window.aether.getLockStatus();
      const normalized = {
        enabled: !!status?.enabled,
        touchIdAvailable: !!status?.touchIdAvailable,
        touchIdEnabled: !!status?.touchIdEnabled,
      };
      setLockStatus(normalized);
      setLockUseTouchId(normalized.touchIdEnabled);
      setIsAppLocked(normalized.enabled);
    } catch (e) {
      console.warn('[Aether/Lock] Failed to load lock status', e);
    }
  }, [isStandalone]);

  const handleUnlockWithPassword = useCallback(async () => {
    if (!window.aether?.verifyAppLockPassword || !unlockPasswordInput) return;
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.verifyAppLockPassword(unlockPasswordInput);
      if (res?.success) {
        setIsAppLocked(false);
        setUnlockPasswordInput('');
      } else {
        setLockError(res?.error || 'Unlock failed.');
      }
    } finally {
      setIsLockBusy(false);
    }
  }, [unlockPasswordInput]);

  const handleUnlockWithBiometric = useCallback(async () => {
    if (!window.aether?.verifyAppLockBiometric) return;
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.verifyAppLockBiometric();
      if (res?.success) {
        setIsAppLocked(false);
      } else {
        setLockError(res?.error || 'Biometric unlock failed.');
      }
    } finally {
      setIsLockBusy(false);
    }
  }, []);

  const handleEnableLock = useCallback(async () => {
    if (!window.aether?.setAppLock) return;
    if (!lockPasswordInput || lockPasswordInput.length < 4) {
      setLockError('Password must be at least 4 characters.');
      return;
    }
    if (lockPasswordInput !== lockPasswordConfirm) {
      setLockError('Passwords do not match.');
      return;
    }
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.setAppLock(lockPasswordInput, !!lockUseTouchId);
      if (!res?.success) {
        setLockError(res?.error || 'Failed to enable lock.');
        return;
      }
      setLockPasswordInput('');
      setLockPasswordConfirm('');
      await refreshLockStatus();
      setIsLockModalOpen(false);
      setLastAdded('App lock enabled');
      setTimeout(() => setLastAdded(null), 2000);
    } finally {
      setIsLockBusy(false);
    }
  }, [lockPasswordConfirm, lockPasswordInput, lockUseTouchId, refreshLockStatus]);

  const handleDisableLock = useCallback(async () => {
    if (!window.aether?.disableAppLock || !lockDisablePassword) {
      setLockError('Enter password to disable lock.');
      return;
    }
    setIsLockBusy(true);
    setLockError('');
    try {
      const res = await window.aether.disableAppLock(lockDisablePassword);
      if (!res?.success) {
        setLockError(res?.error || 'Failed to disable lock.');
        return;
      }
      setLockDisablePassword('');
      await refreshLockStatus();
      setIsAppLocked(false);
      setIsLockModalOpen(false);
      setLastAdded('App lock disabled');
      setTimeout(() => setLastAdded(null), 2000);
    } finally {
      setIsLockBusy(false);
    }
  }, [lockDisablePassword, refreshLockStatus]);

  const handleToggleTouchIdLock = useCallback(async (enabled) => {
    setLockUseTouchId(enabled);
    if (!lockStatus.enabled || !window.aether?.setAppLockTouchId) return;
    const res = await window.aether.setAppLockTouchId(enabled);
    if (res?.success) {
      await refreshLockStatus();
    }
  }, [lockStatus.enabled, refreshLockStatus]);

  const handleVerifyRecoveryPhrase = useCallback(async () => {
    if (!window.aether?.verifyRecoveryPhrase) return;
    const phrase = String(recoveryPhrase || '').trim();
    if (!phrase) return;
    setRecoveryError('');
    setRecoveryBusy(true);
    try {
      const res = await window.aether.verifyRecoveryPhrase(phrase);
      if (!res?.success) {
        setRecoveryError(res?.error || 'Verification failed.');
        return;
      }
      setRecoveryToken(String(res.token || ''));
    } catch (e) {
      setRecoveryError(e?.message || 'Verification failed.');
    } finally {
      setRecoveryBusy(false);
    }
  }, [recoveryPhrase]);

  const handleResetPasswordFromRecovery = useCallback(async () => {
    if (!window.aether?.resetAppLockPasswordWithRecovery) return;
    if (!recoveryToken) {
      setRecoveryError('Verify a recovery method first.');
      return;
    }
    if (!recoveryNewPassword || recoveryNewPassword.length < 4) {
      setRecoveryError('New password must be at least 4 characters.');
      return;
    }
    if (recoveryNewPassword !== recoveryNewPasswordConfirm) {
      setRecoveryError('Passwords do not match.');
      return;
    }
    setRecoveryError('');
    setRecoveryResetBusy(true);
    try {
      const res = await window.aether.resetAppLockPasswordWithRecovery({
        token: recoveryToken,
        newPassword: recoveryNewPassword,
        useTouchId: !!lockUseTouchId,
      });
      if (!res?.success) {
        setRecoveryError(res?.error || 'Failed to reset password.');
        return;
      }
      setIsAppLocked(false);
      setUnlockPasswordInput('');
      setIsForgotPasswordOpen(false);
      setRecoveryPhrase('');
      setRecoveryToken('');
      setRecoveryNewPassword('');
      setRecoveryNewPasswordConfirm('');
      await refreshLockStatus();
    } catch (e) {
      setRecoveryError(e?.message || 'Failed to reset password.');
    } finally {
      setRecoveryResetBusy(false);
    }
  }, [lockUseTouchId, recoveryNewPassword, recoveryNewPasswordConfirm, recoveryToken, refreshLockStatus]);

  const handleCopyPhrase = useCallback(() => {
    if (!phraseGenerated) return;
    navigator.clipboard.writeText(phraseGenerated).then(() => {
      setPhraseCopied(true);
      setTimeout(() => setPhraseCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy phrase:', err);
    });
  }, [phraseGenerated]);


  const handleGenerateRecoveryPhrase = useCallback(async () => {
    if (!window.aether?.generateRecoveryPhrase) return;
    setPhraseBusy(true);
    setRecoverySetupError('');
    try {
      const res = await window.aether.generateRecoveryPhrase();
      if (!res?.success) {
        setRecoverySetupError(res?.error || 'Failed to generate phrase.');
        return;
      }
      setPhraseGenerated(String(res.phrase || ''));
      await refreshLockRecoveryStatus();
    } catch (e) {
      setRecoverySetupError(e?.message || 'Failed to generate phrase.');
    } finally {
      setPhraseBusy(false);
    }
  }, [refreshLockRecoveryStatus]);

  useEffect(() => {
    return () => {
      if (skipReasonTimeoutRef.current) clearTimeout(skipReasonTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    refreshLockStatus();
  }, [refreshLockStatus]);

  useEffect(() => {
    if (!isLibraryOverlayOpen || !isCreatingPlaylist) return;
    const t = setTimeout(() => {
      libraryOverlayCreateInputRef.current?.focus();
      libraryOverlayCreateInputRef.current?.select?.();
    }, 0);
    return () => clearTimeout(t);
  }, [isLibraryOverlayOpen, isCreatingPlaylist]);

  useEffect(() => {
    const loadDebugAndLockPrefs = async () => {
      try {
        let savedSkipEvents = null;
        let savedLockPrefs = null;
        if (isStandalone && window.aether?.store?.get) {
          savedSkipEvents = await window.aether.store.get(SKIP_EVENTS_STORAGE_KEY);
          savedLockPrefs = await window.aether.store.get(LOCK_PREFS_STORAGE_KEY);
        } else {
          const rawSkips = localStorage.getItem(SKIP_EVENTS_STORAGE_KEY);
          const rawLockPrefs = localStorage.getItem(LOCK_PREFS_STORAGE_KEY);
          savedSkipEvents = rawSkips ? JSON.parse(rawSkips) : null;
          savedLockPrefs = rawLockPrefs ? JSON.parse(rawLockPrefs) : null;
        }

        if (Array.isArray(savedSkipEvents)) {
          setSkipEvents(savedSkipEvents.slice(-50));
        }
        if (savedLockPrefs && typeof savedLockPrefs === 'object') {
          if (typeof savedLockPrefs.idleMinutes === 'number' && isFinite(savedLockPrefs.idleMinutes)) {
            setLockIdleMinutes(Math.max(1, Math.min(120, savedLockPrefs.idleMinutes)));
          }
        }
      } catch (e) {
        console.warn('[Aether/Prefs] Failed to load skip/lock prefs', e);
      }
    };

    loadDebugAndLockPrefs();
  }, [isStandalone]);

  useEffect(() => {
    try {
      if (isStandalone && window.aether?.store?.set) {
        window.aether.store.set(SKIP_EVENTS_STORAGE_KEY, skipEvents.slice(-50));
      } else {
        localStorage.setItem(SKIP_EVENTS_STORAGE_KEY, JSON.stringify(skipEvents.slice(-50)));
      }
    } catch (e) {
      console.warn('[Aether/Prefs] Failed to persist skip events', e);
    }
  }, [isStandalone, skipEvents]);

  useEffect(() => {
    const payload = { idleMinutes: lockIdleMinutes, savedAt: Date.now() };
    try {
      if (isStandalone && window.aether?.store?.set) {
        window.aether.store.set(LOCK_PREFS_STORAGE_KEY, payload);
      } else {
        localStorage.setItem(LOCK_PREFS_STORAGE_KEY, JSON.stringify(payload));
      }
    } catch (e) {
      console.warn('[Aether/Prefs] Failed to persist lock prefs', e);
    }
  }, [isStandalone, lockIdleMinutes]);

  useEffect(() => {
    if (!isAutoplayMenuOpen) return;
    const close = () => setIsAutoplayMenuOpen(false);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
    };
  }, [isAutoplayMenuOpen]);

  useEffect(() => {
    if (!lockStatus.enabled) return;

    const lockNow = () => {
      if (!isAppLocked) setIsAppLocked(true);
    };

    let idleTimer = null;
    const idleMs = Math.max(1, lockIdleMinutes || 1) * 60 * 1000;
    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (isAppLocked) return;
      idleTimer = setTimeout(() => {
        console.log('[Aether/Lock] Idle timeout lock triggered');
        lockNow();
      }, idleMs);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetIdle, { passive: true }));
    resetIdle();

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetIdle));
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [isAppLocked, lockIdleMinutes, lockStatus.enabled]);

  const getProxyUrl = (url) => {
    if (!url) return null;
    let processed = String(url);
    if (!processed.trim()) return null;
    processed = processed.startsWith('//') ? 'https:' + processed : processed;
    try {
      const parsed = new URL(processed);
      const isYtImg = /(^|\.)ytimg\.com$/i.test(parsed.hostname);
      const isMaxRes = /\/maxresdefault\.(jpg|webp)$/i.test(parsed.pathname);
      if (isYtImg && isMaxRes) {
        parsed.pathname = parsed.pathname.replace(/maxresdefault\.(jpg|webp)$/i, 'hqdefault.jpg');
        processed = parsed.toString();
      }
    } catch {}
    if (processed.startsWith('http://localhost') || processed.startsWith('http://127.0.0.1')) return processed;
    
    if (isStandalone) {
        return `http://localhost:${streamPort}/api/proxy?url=${encodeURIComponent(processed)}`;
    }
    return `${API_BASE}/api/proxy?url=${encodeURIComponent(processed)}`;
  };

  useEffect(() => {
     if (!isStandalone) return;
     const int = setInterval(() => {
        axios.post(`http://localhost:${streamPort}/api/device/sync`, {
           isPlaying: isPlayingRef.current,
           currentTime: Math.max(0, Math.floor(currentTimeRef.current || 0)),
           track: currentTrackRef.current
        }).catch(()=>{});
     }, 1000);
     return () => clearInterval(int);
  }, [isStandalone, streamPort]);


  const getEffectiveGuildId = useCallback(() => {
    const guildId = auth?.guild_id || new URLSearchParams(window.location.search).get('guild_id');
    return guildId && guildId !== '0' ? guildId : DEFAULT_GUILD_ID;
  }, [auth]);

  const getTrackPresetKey = useCallback((track) => {
    if (!track) return '';
    if (track.youtubeId) return `yt:${track.youtubeId}`;
    if (track.id) return `id:${track.id}`;
    return `meta:${String(track.title || '').toLowerCase()}|${String(track.author || '').toLowerCase()}`;
  }, []);

  const currentTrackPresetKey = useMemo(() => getTrackPresetKey(currentTrack), [
    getTrackPresetKey,
    currentTrack?.id,
    currentTrack?.youtubeId,
    currentTrack?.title,
    currentTrack?.author,
  ]);

  const currentManualLyricsEntry = useMemo(() => {
    if (!currentTrackPresetKey) return null;
    return manualLyricsStore[currentTrackPresetKey] || null;
  }, [currentTrackPresetKey, manualLyricsStore]);

  const currentManualLyricsLines = useMemo(() => sortManualLyricsLines(currentManualLyricsEntry?.lines || []), [currentManualLyricsEntry]);

  const persistLyricPresets = useCallback(async (nextPresets) => {
    try {
      if (isStandalone && window.aether?.store?.set) {
        await window.aether.store.set('lyricOffsetPresets', nextPresets);
      } else {
        localStorage.setItem(LYRIC_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
      }
    } catch (e) {
      console.warn('[Aether/Lyrics] Failed to persist lyric presets', e);
    }
  }, [isStandalone]);

  const persistManualLyricsStore = useCallback(async (nextStore) => {
    try {
      if (isStandalone && window.aether?.store?.set) {
        await window.aether.store.set(MANUAL_LYRICS_STORAGE_KEY, nextStore);
      } else {
        localStorage.setItem(MANUAL_LYRICS_STORAGE_KEY, JSON.stringify(nextStore));
      }
    } catch (e) {
      console.warn('[Aether/Lyrics] Failed to persist manual lyrics', e);
    }
  }, [isStandalone]);

  const openManualLyricsEditor = useCallback(() => {
    const sourceLines = currentManualLyricsLines.length > 0
      ? currentManualLyricsLines
      : (Array.isArray(lyrics) ? sortManualLyricsLines(lyrics) : []);
    const draftLines = sourceLines.length > 0
      ? sourceLines.map((line, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          time: Number.isFinite(Number(line?.time)) ? Math.max(0, Math.trunc(Number(line.time))) : 0,
          timestamp: formatManualLyricsTimestamp(Number.isFinite(Number(line?.time)) ? Math.max(0, Math.trunc(Number(line.time))) : 0).slice(1, -1),
          text: String(line?.text || ''),
        }))
      : [{
          id: `${Date.now()}-0-${Math.random().toString(36).slice(2, 8)}`,
          time: Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0)),
          timestamp: formatManualLyricsTimestamp(Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0))).slice(1, -1),
          text: '',
        }];

    setManualLyricsDraft(draftLines);
    setManualLyricsRawText(manualLyricsLinesToLrc(draftLines));
    setManualLyricsDraftError('');
    setIsManualLyricsRawEditorOpen(false);
    setIsManualLyricsTapMode(false);
    setIsManualLyricsEditorOpen(true);
  }, [currentManualLyricsLines, getActivePlaybackPositionMs, lyrics]);

  const updateManualLyricsDraftLine = useCallback((index, patch) => {
    setManualLyricsDraft((prev) => {
      const next = prev.map((line, lineIndex) => (
        lineIndex === index ? { ...line, ...patch } : line
      ));
      return next;
    });
  }, []);

  const appendManualLyricsDraftLine = useCallback((timestamp = getActivePlaybackPositionMs()) => {
    setManualLyricsDraft((prev) => {
      const nextTimestamp = Math.max(0, Math.trunc(Number(timestamp) || 0));
      const next = [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: nextTimestamp,
          timestamp: formatManualLyricsTimestamp(nextTimestamp).slice(1, -1),
          text: '',
        },
      ];
      return next;
    });
  }, [getActivePlaybackPositionMs]);

  useEffect(() => {
    if (!isManualLyricsEditorOpen) return;
    if (isManualLyricsRawEditorOpen) return;
    setManualLyricsRawText(manualLyricsLinesToLrc(manualLyricsDraft));
  }, [isManualLyricsEditorOpen, isManualLyricsRawEditorOpen, manualLyricsDraft]);

  const setManualLyricsDraftAndSync = useCallback((updater) => {
    setManualLyricsDraft((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  const loadManualLyricsFromRawText = useCallback(() => {
    const parsed = parseManualLyricsLrcText(manualLyricsRawText);
    if (parsed.length === 0) {
      setManualLyricsDraftError('Paste valid LRC lines before importing.');
      return;
    }
    setManualLyricsDraftAndSync(parsed);
    setManualLyricsDraftError('');
    setIsManualLyricsRawEditorOpen(false);
  }, [manualLyricsRawText, setManualLyricsDraftAndSync]);

  const copyManualLyricsToClipboard = useCallback(async () => {
    const payload = manualLyricsLinesToLrc(manualLyricsDraft);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        setManualLyricsSavedNotice('LRC copied to clipboard');
        setTimeout(() => setManualLyricsSavedNotice(''), 1800);
      }
    } catch (error) {
      console.warn('[Aether/Lyrics] Clipboard copy failed', error);
      setManualLyricsDraftError('Could not copy lyrics to clipboard.');
    }
  }, [manualLyricsDraft]);

  const pasteCurrentLyricsIntoRawEditor = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setManualLyricsRawText(clipboardText || '');
      setIsManualLyricsRawEditorOpen(true);
      setManualLyricsDraftError('');
    } catch (error) {
      console.warn('[Aether/Lyrics] Clipboard paste failed', error);
      setManualLyricsDraftError('Could not read clipboard text.');
    }
  }, []);

  const appendStampedManualLyricsLine = useCallback(() => {
    const nextTimestamp = Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0));
    setManualLyricsDraftAndSync((prev) => ([
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: nextTimestamp,
        timestamp: formatManualLyricsTimestamp(nextTimestamp).slice(1, -1),
        text: '',
      },
    ]));
    setIsManualLyricsTapMode(true);
  }, [getActivePlaybackPositionMs, setManualLyricsDraftAndSync]);

  const appendAndStampCurrentLine = useCallback((index) => {
    const nextTimestamp = Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0));
    setManualLyricsDraftAndSync((prev) => prev.map((line, lineIndex) => (
      lineIndex === index
        ? {
            ...line,
            time: nextTimestamp,
            timestamp: formatManualLyricsTimestamp(nextTimestamp).slice(1, -1),
          }
        : line
    )));
  }, [getActivePlaybackPositionMs, setManualLyricsDraftAndSync]);

  const removeManualLyricsDraftLine = useCallback((index) => {
    setManualLyricsDraft((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  }, []);

  const stampManualLyricsDraftLine = useCallback((index) => {
    setManualLyricsDraft((prev) => {
      const nextTimestamp = Math.max(0, Math.trunc(Number(getActivePlaybackPositionMs()) || 0));
      return prev.map((line, lineIndex) => (
        lineIndex === index
          ? {
              ...line,
              time: nextTimestamp,
              timestamp: formatManualLyricsTimestamp(nextTimestamp).slice(1, -1),
            }
          : line
      ));
    });
  }, [getActivePlaybackPositionMs]);

  const handleSaveManualLyrics = useCallback(async () => {
    if (!currentTrackPresetKey) {
      setManualLyricsDraftError('No track key is available for these lyrics yet.');
      return;
    }

    const normalizedLines = sortManualLyricsLines(manualLyricsDraft.map((line) => {
      const parsedTimestamp = parseManualLyricsTimestamp(line?.timestamp);
      return {
        ...line,
        time: Number.isFinite(parsedTimestamp) ? parsedTimestamp : Math.max(0, Math.trunc(Number(line?.time) || 0)),
        text: String(line?.text || '').trim(),
      };
    })).filter((line) => String(line.text || '').trim().length > 0);

    if (normalizedLines.length === 0) {
      setManualLyricsDraftError('Add at least one timestamped lyric line before saving.');
      return;
    }

    const nextStore = {
      ...(manualLyricsStoreRef.current || {}),
      [currentTrackPresetKey]: {
        trackKey: currentTrackPresetKey,
        title: currentTrack?.title || currentTrackTitle || '',
        author: currentTrack?.author || '',
        duration: currentTrack?.totalDurationMs || currentTrack?.duration || null,
        createdAt: currentManualLyricsEntry?.createdAt || Date.now(),
        updatedAt: Date.now(),
        lines: normalizedLines,
        lrc: manualLyricsLinesToLrc(normalizedLines),
      },
    };

    setIsManualLyricsSaving(true);
    try {
      manualLyricsStoreRef.current = nextStore;
      setManualLyricsStore(nextStore);
      setLyrics(normalizedLines);
      setDiagnostics((prev) => ({
        ...prev,
        lastLyricsSource: 'manual',
        lastLyricsFetchMs: null,
        lastLyricsFetchAt: Date.now(),
        lastLyricsError: null,
      }));
      await persistManualLyricsStore(nextStore);
      setIsManualLyricsEditorOpen(false);
      setManualLyricsDraft([]);
      setManualLyricsDraftError('');
    } catch (error) {
      console.error('[Aether/Lyrics] Failed to save manual lyrics', error);
      setManualLyricsDraftError(error?.message || 'Failed to save manual lyrics.');
    } finally {
      setIsManualLyricsSaving(false);
    }
  }, [currentManualLyricsEntry?.createdAt, currentTrack?.author, currentTrack?.duration, currentTrack?.title, currentTrack?.totalDurationMs, currentTrackPresetKey, currentTrackTitle, manualLyricsDraft, persistManualLyricsStore]);

  const handleSaveLyricPreset = useCallback(async () => {
    if (!currentTrackPresetKey) return;
    const next = {
      ...lyricOffsetPresets,
      [currentTrackPresetKey]: parseLyricOffsetValue(lyricOffsetMs),
    };
    setLyricOffsetPresets(next);
    setIsLyricPresetSaved(true);
    await persistLyricPresets(next);
    appendRecentEvent('sync_saved', `${parseLyricOffsetValue(lyricOffsetMs)}ms`, { tone: 'success', title: currentTrack?.title || currentTrackTitle });
  }, [appendRecentEvent, currentTrack?.title, currentTrackPresetKey, currentTrackTitle, lyricOffsetPresets, lyricOffsetMs, persistLyricPresets]);

  const handleResetLyricPreset = useCallback(async () => {
    if (!currentTrackPresetKey) {
      setLyricOffsetMs(0);
      setIsLyricPresetSaved(false);
      return;
    }
    const next = { ...lyricOffsetPresets };
    delete next[currentTrackPresetKey];
    setLyricOffsetPresets(next);
    setLyricOffsetMs(0);
    setIsLyricPresetSaved(false);
    await persistLyricPresets(next);
    appendRecentEvent('sync_reset', 'Subtitle sync reset to 0ms', { tone: 'warning', title: currentTrack?.title || currentTrackTitle });
  }, [appendRecentEvent, currentTrack?.title, currentTrackPresetKey, currentTrackTitle, lyricOffsetPresets, persistLyricPresets]);



  const getTrackActionKey = useCallback((track) => {
    if (!track || typeof track !== 'object') return '';
    if (track.queueNonce) return `nonce:${String(track.queueNonce)}`;
    if (track.youtubeId) return `yt:${String(track.youtubeId)}`;
    if (track.id) return `id:${String(track.id)}`;
    const title = String(track.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const author = String(track.author || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return `meta:${title}|${author}`;
  }, []);

  const hasTrackInList = useCallback((list, target) => {
    const key = normalizeTrackIdentity(target);
    return (list || []).some(item => normalizeTrackIdentity(item) === key);
  }, [normalizeTrackIdentity]);

  const isPlaceholderMetadataTitle = (value) => {
    const title = String(value || '').trim().toLowerCase();
    if (!title) return true;
    return (
      title === 'videoplayback' ||
      title === 'unknown' ||
      title === 'unknown title' ||
      title === 'audio' ||
      title.startsWith('googlevideo') ||
      /^https?:\/\//.test(title)
    );
  };

  const isPlaceholderMetadataAuthor = (value) => {
    const author = String(value || '').trim().toLowerCase();
    if (!author) return true;
    return author === 'unknown' || author === 'unknown artist' || author === 'youtube';
  };

  const mergeTrackMetadata = (baseTrack, meta) => {
    if (!baseTrack || !meta || typeof meta !== 'object') return baseTrack;
    const merged = { ...baseTrack, ...meta };

    const incomingTitle = String(meta.title || '').trim();
    const incomingAuthor = String(meta.author || '').trim();
    const keepBaseTitle = isPlaceholderMetadataTitle(incomingTitle);
    const keepBaseAuthor = isPlaceholderMetadataAuthor(incomingAuthor);

    merged.title = keepBaseTitle
      ? String(baseTrack.title || '').trim()
      : incomingTitle;
    merged.author = keepBaseAuthor
      ? String(baseTrack.author || '').trim()
      : incomingAuthor;
    merged.thumbnail = meta.thumbnail || baseTrack.thumbnail || '';
    merged.id = baseTrack.id;
    merged.youtubeId = baseTrack.youtubeId || meta.youtubeId;
    merged.actualUrl = meta.actualUrl || meta.url || baseTrack.actualUrl || baseTrack.url;
    merged.url = meta.url || meta.actualUrl || baseTrack.url || baseTrack.actualUrl;

    const incomingDuration = Number(meta.totalDurationMs || meta.duration || 0);
    if (Number.isFinite(incomingDuration) && incomingDuration > 0) {
      merged.totalDurationMs = Math.trunc(incomingDuration);
      merged.duration = Math.trunc(incomingDuration);
    }

    return merged;
  };

  const formatDiagTime = useCallback((ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString();
    } catch {
      return '—';
    }
  }, []);

  useEffect(() => {
     if (isStandalone && window.aether?.getLocalIp) {
         window.aether.getLocalIp().then(setLocalIp);
     }
  }, [isStandalone]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get('scene');
      const fromHash = (url.hash || '').startsWith('#scene=') ? url.hash.slice(7) : null;
      const encoded = fromQuery || fromHash;
      if (!encoded) return;
      const decoded = decodeScenePayload(encoded);
      if (!decoded) return;
      const normalized = normalizeScenePayload(decoded);
      if (!normalized) return;
      setSharedScene(normalized);
      setIsSharedSceneOpen(true);
    } catch (e) {
      console.warn('[Aether/Share] Scene parse failed', e);
    }
  }, []);

  useEffect(() => {
    const loadLyricPresets = async () => {
      try {
        let loaded = {};
        if (isStandalone && window.aether?.store?.get) {
          loaded = await window.aether.store.get('lyricOffsetPresets');
        } else {
          const raw = localStorage.getItem(LYRIC_PRESETS_STORAGE_KEY);
          loaded = raw ? JSON.parse(raw) : {};
        }
        if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
          setLyricOffsetPresets(loaded);
        }
      } catch (e) {
        console.warn('[Aether/Lyrics] Failed to load lyric presets', e);
      }
    };
    loadLyricPresets();
  }, [isStandalone]);

  useEffect(() => {
    manualLyricsStoreRef.current = manualLyricsStore || {};
  }, [manualLyricsStore]);

  useEffect(() => {
    const loadManualLyrics = async () => {
      try {
        let loaded = {};
        if (isStandalone && window.aether?.store?.get) {
          loaded = await window.aether.store.get(MANUAL_LYRICS_STORAGE_KEY);
        } else {
          const raw = localStorage.getItem(MANUAL_LYRICS_STORAGE_KEY);
          loaded = raw ? JSON.parse(raw) : {};
        }
        if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
          const normalizedStore = Object.fromEntries(
            Object.entries(loaded).map(([trackKey, entry]) => [
              trackKey,
              {
                ...(entry && typeof entry === 'object' ? entry : {}),
                trackKey,
                lines: sortManualLyricsLines(entry?.lines || []),
              },
            ])
          );
          manualLyricsStoreRef.current = normalizedStore;
          setManualLyricsStore(normalizedStore);
        }
      } catch (error) {
        console.warn('[Aether/Lyrics] Failed to load manual lyrics', error);
      }
    };
    loadManualLyrics();
  }, [isStandalone]);

  useEffect(() => {
    if (!currentTrackPresetKey) return;
    const hasPreset = Object.prototype.hasOwnProperty.call(lyricOffsetPresets, currentTrackPresetKey);
    const presetValue = hasPreset ? parseLyricOffsetValue(lyricOffsetPresets[currentTrackPresetKey]) : 0;
    setLyricOffsetMs(presetValue);
    setIsLyricPresetSaved(hasPreset);
  }, [currentTrackPresetKey, lyricOffsetPresets]);

  useEffect(() => {
    if (!currentTrackPresetKey) {
      setIsLyricPresetSaved(false);
      return;
    }
    const hasPreset = Object.prototype.hasOwnProperty.call(lyricOffsetPresets, currentTrackPresetKey);
    if (!hasPreset) {
      setIsLyricPresetSaved(false);
      return;
    }
    const presetValue = parseLyricOffsetValue(lyricOffsetPresets[currentTrackPresetKey]);
    setIsLyricPresetSaved(parseLyricOffsetValue(lyricOffsetMs) === presetValue);
  }, [currentTrackPresetKey, lyricOffsetMs, lyricOffsetPresets]);

  useEffect(() => {
    if (isStandalone || !currentTrack?.title) {
      if (!isStandalone && localAudioRef.current) {
        localAudioRef.current.pause();
        localAudioRef.current.removeAttribute('src');
        localAudioRef.current.load();
      }
      return;
    }
    const streamStart = performance.now();

    const trackUrl = currentTrack.actualUrl || currentTrack.url;
    if (!trackUrl) {
      console.warn("[Aether/Audio] Web playback skipped: no track URL", {
        title: currentTrack.title,
        author: currentTrack.author,
        id: currentTrack.id,
      });
      return;
    }

    if (!localAudioRef.current) {
      localAudioRef.current = new Audio();
      localAudioRef.current.crossOrigin = "anonymous";
    }

    const audio = localAudioRef.current;
    const streamUrl = `${API_BASE}/stream?url=${encodeURIComponent(trackUrl)}`;

    console.log("[Aether/Audio] Web stream init", {
      title: currentTrack.title,
      author: currentTrack.author,
      trackUrl,
      streamUrl,
      isPlaying,
      volume,
      readyState: audio.readyState,
      networkState: audio.networkState,
    });

    audio.volume = volume;
    audio.onloadedmetadata = () => {
      console.log("[Aether/Audio] Web loadedmetadata", {
        currentTime: audio.currentTime,
        duration: audio.duration,
        readyState: audio.readyState,
      });
    };
    audio.oncanplay = () => {
      console.log("[Aether/Audio] Web canplay", { readyState: audio.readyState });
    };
    audio.onplaying = () => {
      console.log("[Aether/Audio] Web playing", { currentTime: audio.currentTime });
      setIsAudioBuffering(false);
      setDiagnostics(prev => ({
        ...prev,
        lastSongFetchMs: Math.round(performance.now() - streamStart),
        lastSongFetchAt: Date.now(),
        lastSongSource: 'web-stream',
      }));
    };
    audio.ontimeupdate = () => {
      setCurrentTime(Math.floor(audio.currentTime * 1000));
    };
    audio.onwaiting = () => {
      console.log("[Aether/Audio] Web waiting", { currentTime: audio.currentTime, readyState: audio.readyState });
      setIsAudioBuffering(true);
    };
    audio.onstalled = () => {
      console.log("[Aether/Audio] Web stalled", { currentTime: audio.currentTime, readyState: audio.readyState });
      setIsAudioBuffering(true);
    };
    audio.onended = () => {
      // Pass the track ID so the backend skip guard can deduplicate concurrent
      // skip calls from multiple web tabs finishing the same song simultaneously.
      const skipTrackId = currentTrack?.id || currentTrack?.youtubeId || currentTrack?.actualUrl || currentTrack?.url || '';
      console.log("[Aether/Audio] Web ended", { title: currentTrack.title, skipTrackId });
      axios.post(`${API_BASE}/api/control/${DEFAULT_GUILD_ID}`, { action: 'skip', skipTrackId })
        .then(() => fetchQueue())
        .catch((err) => console.error("[Aether/Audio] Web skip failed", err));
    };
    audio.onerror = (e) => {
      console.error("[Aether/Audio] Web error", e, {
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState,
        currentTime: audio.currentTime,
        paused: audio.paused,
      });
      setIsAudioBuffering(true);
    };

    if (audio.src !== streamUrl) {
      audio.src = streamUrl;
    }

    if (isPlaying) {
      if (!webAudioUnlocked) {
        // Browser autoplay policy: don't attempt play() before a user gesture.
        // The 'Tap to Listen' overlay will call play() once the user taps.
        console.log("[Aether/Audio] Web play() deferred — waiting for user gesture (webAudioUnlocked=false)");
      } else {
        console.log("[Aether/Audio] Web play() attempt", {
          src: audio.src,
          paused: audio.paused,
          readyState: audio.readyState,
          networkState: audio.networkState,
        });
        audio.play().catch(err => {
          console.error("[Aether/Audio] Web play() failed", err, {
            src: audio.src,
            paused: audio.paused,
            readyState: audio.readyState,
            networkState: audio.networkState,
          });
        });
      }
    } else {
      console.log("[Aether/Audio] Web paused by state", { title: currentTrack.title });
      audio.pause();
    }
  }, [isStandalone, currentTrack?.title, currentTrack?.actualUrl, currentTrack?.url, currentTrack?.id, isPlaying, volume, API_BASE, webAudioUnlocked]);


  useEffect(() => {
    if (!sessionReadyRef.current) return;
    const uiPrefs = {
      visualizerMode,
      auraPreset,
      isVerticalStack,
      isFocusedMode,
      miniPlayerInfoMode,
      isAutoplayEnabled,
      autoplayMoodMode,
      isDoodleMode,
      doodleIntensity,
      performanceMode,
      isDepthMotionEnabled,
      isGestureControlEnabled,
      hideFirstRunTips,
      savedAt: Date.now(),
    };

    try {
      if (isStandalone && window.aether?.store?.set) {
        window.aether.store.set(SESSION_UI_STORAGE_KEY, uiPrefs);
      } else {
        localStorage.setItem(SESSION_UI_STORAGE_KEY, JSON.stringify(uiPrefs));
      }
    } catch (e) {
      console.warn('[Aether/Session] Failed to persist UI prefs', e);
    }
  }, [isStandalone, visualizerMode, auraPreset, isVerticalStack, isFocusedMode, miniPlayerInfoMode, isAutoplayEnabled, autoplayMoodMode, isDoodleMode, doodleIntensity, performanceMode, isDepthMotionEnabled, isGestureControlEnabled, hideFirstRunTips]);

  useEffect(() => {
    if (!sessionReadyRef.current) return;
    try {
      if (isStandalone && window.aether?.store?.set) {
        window.aether.store.set(SHORTCUTS_STORAGE_KEY, shortcuts);
      } else {
        localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
      }
    } catch (e) {
      console.warn('[Aether/Shortcuts] Failed to persist shortcut map', e);
    }
  }, [isStandalone, shortcuts]);

  useEffect(() => {
    if (!isStandalone) return undefined;

    const persistPlayback = () => {
      if (!sessionReadyRef.current) return;
      const playback = {
        queue: queueRef.current.slice(0, 120),
        isPlaying: !!isPlayingRef.current,
        currentTime: Math.max(0, Math.floor(currentTimeRef.current || 0)),
        savedAt: Date.now(),
      };

      try {
        window.aether?.store?.set?.(SESSION_PLAYBACK_STORAGE_KEY, playback);
      } catch (e) {
        console.warn('[Aether/Session] Failed to persist playback', e);
      }
    };

    persistPlayback();
    const interval = window.setInterval(persistPlayback, 5000);
    return () => window.clearInterval(interval);
  }, [isStandalone]);

  useEffect(() => {
    let pollInterval;
    
    if (isStandalone) {
      setAuth({ guild_id: 'LOCAL', user: { id: 'Standalone', username: 'DESKTOP_USER' } });
      setLoading(false);
      setVoiceChannel('Local Speakers');

      // Load persisted state asynchronously
      const loadPersisted = async () => {
        let resolvedHideFirstRunTips = false;
        const savedUiPrefs = await window.aether?.store?.get(SESSION_UI_STORAGE_KEY);
        if (savedUiPrefs && typeof savedUiPrefs === 'object') {
          if (typeof savedUiPrefs.visualizerMode === 'string') setVisualizerMode(savedUiPrefs.visualizerMode);
          if (typeof savedUiPrefs.auraPreset === 'string' && AURA_PRESETS.some((preset) => preset.id === savedUiPrefs.auraPreset)) {
            setAuraPreset(savedUiPrefs.auraPreset);
          }
          if (typeof savedUiPrefs.isVerticalStack === 'boolean') setIsVerticalStack(savedUiPrefs.isVerticalStack);
          if (typeof savedUiPrefs.isFocusedMode === 'boolean') setIsFocusedMode(savedUiPrefs.isFocusedMode);
          if (typeof savedUiPrefs.miniPlayerInfoMode === 'string' && ['artist', 'lyric'].includes(savedUiPrefs.miniPlayerInfoMode)) {
            setMiniPlayerInfoMode(savedUiPrefs.miniPlayerInfoMode);
          }
          if (typeof savedUiPrefs.isAutoplayEnabled === 'boolean') setIsAutoplayEnabled(savedUiPrefs.isAutoplayEnabled);
          if (typeof savedUiPrefs.autoplayMoodMode === 'string' && AUTOPLAY_MOOD_MODES.some((m) => m.id === savedUiPrefs.autoplayMoodMode)) {
            setAutoplayMoodMode(savedUiPrefs.autoplayMoodMode);
          }
          if (typeof savedUiPrefs.isDoodleMode === 'boolean') setIsDoodleMode(savedUiPrefs.isDoodleMode);
          else if (typeof savedUiPrefs.isCatMode === 'boolean') setIsDoodleMode(savedUiPrefs.isCatMode);
          if (typeof savedUiPrefs.doodleIntensity === 'string' && ['subtle', 'medium', 'dreamy'].includes(savedUiPrefs.doodleIntensity)) {
            setDoodleIntensity(savedUiPrefs.doodleIntensity);
          }
          if (typeof savedUiPrefs.performanceMode === 'string' && PERFORMANCE_MODES.some((mode) => mode.id === savedUiPrefs.performanceMode)) {
            setPerformanceMode(savedUiPrefs.performanceMode);
          }
          if (typeof savedUiPrefs.isDepthMotionEnabled === 'boolean') setIsDepthMotionEnabled(savedUiPrefs.isDepthMotionEnabled);
          if (typeof savedUiPrefs.isGestureControlEnabled === 'boolean') setIsGestureControlEnabled(savedUiPrefs.isGestureControlEnabled);
          if (typeof savedUiPrefs.hideFirstRunTips === 'boolean') {
            resolvedHideFirstRunTips = savedUiPrefs.hideFirstRunTips;
            setHideFirstRunTips(savedUiPrefs.hideFirstRunTips);
            setTipsDontShowAgain(savedUiPrefs.hideFirstRunTips);
          }
        }

        try {
          const savedShortcuts = await window.aether?.store?.get(SHORTCUTS_STORAGE_KEY);
          const normalized = sanitizeShortcutMap(savedShortcuts || DEFAULT_SHORTCUTS, isMacPlatform);
          setShortcuts(normalized);
          setShortcutDraft(normalized);
        } catch (e) {
          const normalized = sanitizeShortcutMap(DEFAULT_SHORTCUTS, isMacPlatform);
          setShortcuts(normalized);
          setShortcutDraft(normalized);
        }

        try {
          const savedGlobalEnabled = await window.aether?.store?.get(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY);
          const resolved = typeof savedGlobalEnabled === 'boolean' ? savedGlobalEnabled : defaultGlobalMediaShortcutsEnabled;
          setGlobalMediaShortcutsEnabled(resolved);
        } catch {
          setGlobalMediaShortcutsEnabled(defaultGlobalMediaShortcutsEnabled);
        }

        if (!resolvedHideFirstRunTips) {
          setTimeout(() => setIsTipsOverlayOpen(true), 700);
        }

        const savedPlaylists = await window.aether?.store?.get('playlists');
        if (savedPlaylists && typeof savedPlaylists === 'object' && !Array.isArray(savedPlaylists)) {
           const normalizedPlaylists = Object.fromEntries(
             Object.entries(savedPlaylists).map(([playlistName, tracks]) => {
               const normalizedTracks = (Array.isArray(tracks) ? tracks : [])
                 .map((track) => normalizeQueueTrack(track))
                 .filter(Boolean);
               return [playlistName, normalizedTracks];
             })
           );

           setPlaylists(normalizedPlaylists);
           window.aether?.store?.set('playlists', normalizedPlaylists);
           const savedOrder = await window.aether?.store?.get(PLAYLIST_ORDER_STORAGE_KEY);
           if (Array.isArray(savedOrder)) {
             setPlaylistOrder(savedOrder.filter((name) => typeof name === 'string' && name.trim()));
           } else {
             setPlaylistOrder(Object.keys(normalizedPlaylists));
           }
        }
        const savedFavorites = await window.aether?.store?.get(FAVORITES_STORAGE_KEY);
        if (savedFavorites && typeof savedFavorites === 'object' && !Array.isArray(savedFavorites)) {
          const normalizedFavorites = Object.fromEntries(
            Object.entries(savedFavorites)
              .map(([key, track]) => [key, normalizeQueueTrack(track)])
              .filter(([, track]) => Boolean(track))
          );
          setFavoriteTracks(normalizedFavorites);
          window.aether?.store?.set(FAVORITES_STORAGE_KEY, normalizedFavorites);
        }
        playlistOrderHydratedRef.current = true;
        const savedVolume = await window.aether?.store?.get('volume');
        if (savedVolume !== undefined && savedVolume !== null) {
          const v = parseFloat(savedVolume);
          if (isFinite(v)) {
            setVolume(v);
            if (localAudioRef.current) localAudioRef.current.volume = v;
          }
        }
        const savedDownloaded = await window.aether?.getOfflineTracks();
        if (savedDownloaded) {
            console.log(`[Aether] Loaded ${savedDownloaded.length} downloaded tracks:`, savedDownloaded);
            setDownloadedTracks(savedDownloaded);
        }
        if (window.aether?.getOfflineDownloads) {
          try {
            const details = await window.aether.getOfflineDownloads();
            if (details?.success && Array.isArray(details.downloads)) {
              setOfflineDownloads(details.downloads);
            }
          } catch {}
        }

        const savedPlayback = await window.aether?.store?.get(SESSION_PLAYBACK_STORAGE_KEY);
        if (savedPlayback && typeof savedPlayback === 'object') {
          let restoredQueueCount = 0;
          let restoredWasPlaying = false;
          if (Array.isArray(savedPlayback.queue) && savedPlayback.queue.length > 0) {
            const normalizedQueue = savedPlayback.queue.map((track) => normalizeQueueTrack(track)).filter(Boolean);
            setQueue(normalizedQueue);
            restoredQueueCount = normalizedQueue.length;
            console.log(`[Aether/Session] Restored ${restoredQueueCount} tracks from session`);
          }
          if (typeof savedPlayback.isPlaying === 'boolean') {
            console.log(`[Aether/Session] Restored isPlaying: ${savedPlayback.isPlaying}`);
            restoredWasPlaying = savedPlayback.isPlaying;
            // Hardening: after cold restart, resume in a paused state to avoid rapid
            // play/buffer loops from stale stream/session state.
            setIsPlaying(false);
          }
          // Cold-launch resume position caused stale seeks and screechy recovery paths.
          // We restore the queue paused, but always start a fresh track session from 0.
          pendingResumeTimeRef.current = null;
          setPendingResumeTime(null);
          setCurrentTime(0);

          if (restoredQueueCount > 0) {
            setSessionRestoreNotice(
              restoredWasPlaying
                ? `Restored session paused • ${restoredQueueCount} track${restoredQueueCount > 1 ? 's' : ''}`
                : `Restored session • ${restoredQueueCount} track${restoredQueueCount > 1 ? 's' : ''}`
            );
            setTimeout(() => setSessionRestoreNotice(''), 3500);
          }
        }

        sessionReadyRef.current = true;
      };
      loadPersisted();
    } else {
      try {
        let resolvedHideFirstRunTips = false;
        const rawUiPrefs = localStorage.getItem(SESSION_UI_STORAGE_KEY);
        const savedUiPrefs = rawUiPrefs ? JSON.parse(rawUiPrefs) : null;
        if (savedUiPrefs && typeof savedUiPrefs === 'object') {
          if (typeof savedUiPrefs.visualizerMode === 'string') setVisualizerMode(savedUiPrefs.visualizerMode);
          if (typeof savedUiPrefs.auraPreset === 'string' && AURA_PRESETS.some((preset) => preset.id === savedUiPrefs.auraPreset)) {
            setAuraPreset(savedUiPrefs.auraPreset);
          }
          if (typeof savedUiPrefs.isVerticalStack === 'boolean') setIsVerticalStack(savedUiPrefs.isVerticalStack);
          if (typeof savedUiPrefs.isFocusedMode === 'boolean') setIsFocusedMode(savedUiPrefs.isFocusedMode);
          if (typeof savedUiPrefs.miniPlayerInfoMode === 'string' && ['artist', 'lyric'].includes(savedUiPrefs.miniPlayerInfoMode)) {
            setMiniPlayerInfoMode(savedUiPrefs.miniPlayerInfoMode);
          }
          if (typeof savedUiPrefs.isAutoplayEnabled === 'boolean') setIsAutoplayEnabled(savedUiPrefs.isAutoplayEnabled);
          if (typeof savedUiPrefs.autoplayMoodMode === 'string' && AUTOPLAY_MOOD_MODES.some((m) => m.id === savedUiPrefs.autoplayMoodMode)) {
            setAutoplayMoodMode(savedUiPrefs.autoplayMoodMode);
          }
          if (typeof savedUiPrefs.isDoodleMode === 'boolean') setIsDoodleMode(savedUiPrefs.isDoodleMode);
          else if (typeof savedUiPrefs.isCatMode === 'boolean') setIsDoodleMode(savedUiPrefs.isCatMode);
          if (typeof savedUiPrefs.doodleIntensity === 'string' && ['subtle', 'medium', 'dreamy'].includes(savedUiPrefs.doodleIntensity)) {
            setDoodleIntensity(savedUiPrefs.doodleIntensity);
          }
          if (typeof savedUiPrefs.performanceMode === 'string' && PERFORMANCE_MODES.some((mode) => mode.id === savedUiPrefs.performanceMode)) {
            setPerformanceMode(savedUiPrefs.performanceMode);
          }
          if (typeof savedUiPrefs.isDepthMotionEnabled === 'boolean') setIsDepthMotionEnabled(savedUiPrefs.isDepthMotionEnabled);
          if (typeof savedUiPrefs.isGestureControlEnabled === 'boolean') setIsGestureControlEnabled(savedUiPrefs.isGestureControlEnabled);
          if (typeof savedUiPrefs.hideFirstRunTips === 'boolean') {
            resolvedHideFirstRunTips = savedUiPrefs.hideFirstRunTips;
            setHideFirstRunTips(savedUiPrefs.hideFirstRunTips);
            setTipsDontShowAgain(savedUiPrefs.hideFirstRunTips);
          }
        }

        if (!resolvedHideFirstRunTips) {
          setTimeout(() => setIsTipsOverlayOpen(true), 700);
        }

        const rawShortcuts = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
        const savedShortcuts = rawShortcuts ? JSON.parse(rawShortcuts) : null;
        const normalized = sanitizeShortcutMap(savedShortcuts || DEFAULT_SHORTCUTS, isMacPlatform);
        setShortcuts(normalized);
        setShortcutDraft(normalized);

        const rawGlobalEnabled = localStorage.getItem(GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY);
        if (rawGlobalEnabled == null) {
          setGlobalMediaShortcutsEnabled(defaultGlobalMediaShortcutsEnabled);
        } else {
          setGlobalMediaShortcutsEnabled(Boolean(JSON.parse(rawGlobalEnabled)));
        }

        const rawFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
        const savedFavorites = rawFavorites ? JSON.parse(rawFavorites) : null;
        if (savedFavorites && typeof savedFavorites === 'object' && !Array.isArray(savedFavorites)) {
          const normalizedFavorites = Object.fromEntries(
            Object.entries(savedFavorites)
              .map(([key, track]) => [key, normalizeQueueTrack(track)])
              .filter(([, track]) => Boolean(track))
          );
          setFavoriteTracks(normalizedFavorites);
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(normalizedFavorites));
        }
      } catch (e) {
        console.warn('[Aether/Session] Failed to load web UI prefs', e);
        const normalized = sanitizeShortcutMap(DEFAULT_SHORTCUTS, isMacPlatform);
        setShortcuts(normalized);
        setShortcutDraft(normalized);
        setGlobalMediaShortcutsEnabled(defaultGlobalMediaShortcutsEnabled);
      }
      sessionReadyRef.current = true;

      const initDiscord = async () => {
        try {
          const { sdk, auth: authData } = await setupDiscordSdk();
          discordSdkRef.current = sdk;
          if (sdk) {
            if (authData) setAuth(authData);
            else setAuth({ guild_id: sdk.guildId, user: { id: 'Guest', username: 'GUEST' } });
            
            if (sdk.guildId) {
              fetchQueue(sdk.guildId);
              pollInterval = setInterval(() => fetchQueue(sdk.guildId), 5000);
            }
          }
        } catch (err) {
          setAuth({ guild_id: '0', user: { id: 'Offline', username: 'OFFLINE' } });
        } finally {
          setLoading(false);
        }
      };
      initDiscord();
    }

    // Maximized State Listener (NOVA - Fixed bridge + Height fail-safe
    if (window.aether?.onMaximized) {
      window.aether.onMaximized((state) => {
        lastWindowModeChangeRef.current = Date.now();
        setIsMaximized(!!state);
      });
    }

    // Library update listener for downloaded tracks
    if (window.aether?.onLibraryUpdate) {
      window.aether.onLibraryUpdate((data) => {
        console.log(`[Aether] Library update received:`, data);
        setDownloadedTracks(data);
        if (window.aether?.getOfflineDownloads) {
          window.aether.getOfflineDownloads().then((res) => {
            if (res?.success && Array.isArray(res.downloads)) {
              setOfflineDownloads(res.downloads);
            }
          }).catch(() => {});
        }
      });
    }

    let unsubscribeUpdateStatus = null;
    if (window.aether?.getUpdateStatus) {
      window.aether.getUpdateStatus()
        .then((state) => {
          if (state && typeof state === 'object') {
            setUpdateInfo((prev) => ({ ...prev, ...state }));
          }
        })
        .catch(() => {});
    }
    if (window.aether?.onUpdateStatus) {
      unsubscribeUpdateStatus = window.aether.onUpdateStatus((state) => {
        if (state && typeof state === 'object') {
          setUpdateInfo((prev) => ({ ...prev, ...state }));
        }
      });
    }

    let resizeRaf = 0;
    let lastTallState = null;
    const handleResize = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        const nextTallState = window.innerHeight > 820 ? true : window.innerHeight <= 800 ? false : lastTallState;
        if (typeof nextTallState === 'boolean' && nextTallState !== lastTallState) {
          lastTallState = nextTallState;
          setIsMaximized(nextTallState);
        }
      });
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => { 
      if (pollInterval) clearInterval(pollInterval); 
      if (typeof unsubscribeUpdateStatus === 'function') unsubscribeUpdateStatus();
      window.removeEventListener('resize', handleResize);
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
    };
  }, []);



  // --- AETHER: STANDALONE PLAYBACK LOOP (NOVA ---
  useEffect(() => {
    console.log("[Aether/Audio] Queue effect fired", { queueLength: queue?.length, currentTrack: queue?.[0]?.title, isPlaying, isStandalone });
    if (!isStandalone || !queue || queue.length === 0) {
      if (localAudioRef.current) {
        localAudioRef.current.pause();
        localAudioRef.current.removeAttribute('src');
        localAudioRef.current.load();
      }
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }
    const track = queue[0];
    if (!track || typeof track !== 'object') {
      setQueue(prev => (Array.isArray(prev) ? prev.filter(item => item && typeof item === 'object') : []));
      return;
    }
    const loadStartTime = Date.now();
    const trackUrl = track.actualUrl || track.url;
    const baseTrackLoadKey = track.queueNonce || track.id || track.youtubeId || `${track.title || ''}|${track.author || ''}|${trackUrl || ''}`;
    const isHeadDownloaded = downloadedTracks.includes(track.id);
    const trackLoadKey = `${baseTrackLoadKey}|p:${streamPort}|r:${playbackResetNonce}`;
    const resumeMs = Math.max(0, Math.floor(Number(pendingResumeTimeRef.current || 0)));
    const startSec = resumeMs > 0 ? (resumeMs / 1000) : 0;

    console.log("[Aether/Audio] Queue head details", {
      id: track.id,
      title: track.title,
      author: track.author,
      youtubeId: track.youtubeId,
      actualUrl: track.actualUrl,
      url: track.url,
      trackUrl,
      isPlaying,
      downloaded: isHeadDownloaded,
    });

    // Pre-warm next queue tracks
    queue.slice(0, 3).forEach((item) => {
      if (!downloadedTracks.includes(item.id) && !warmingTrackIds.has(item.id)) {
        console.log(`[Aether] Warmup pre-download for queued track: ${item.title} (${item.id})`);
        warmupTrack(item);
      }
    });

    
    if (track && standaloneTrackLoadKeyRef.current !== trackLoadKey) {
      standaloneTrackLoadKeyRef.current = trackLoadKey;
        setCurrentTrackTitle(track.title);
        setIsAudioBuffering(!!isPlaying);
        
        if (!localAudioRef.current) {
            localAudioRef.current = new Audio();
            localAudioRef.current.volume = volume;
        }

        const isLocalDownloaded = downloadedTracks.includes(track.id);
        const streamNonce = encodeURIComponent(String(track.queueNonce || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`));
        const resetQuery = `&_r=${playbackResetNonce}`;
        // Reconstruct YouTube URL if we have the ID (avoids expired direct URLs)
        const youtubeUrl = track.youtubeId
          ? `https://www.youtube.com/watch?v=${track.youtubeId}`
          : track.actualUrl || track.url;
        const streamBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
        let didOfflineFallback = false;
        const fallbackToOnlineStream = () => {
          if (!isPlaying || !isLocalDownloaded || didOfflineFallback) return;
          didOfflineFallback = true;
          const onlineUrl = `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}&_q=${streamNonce}${resetQuery}`;
          console.warn('[Aether/Audio] Offline source stalled, switching to live stream', {
            trackId: track.id,
            title: track.title,
            onlineUrl,
          });
          localAudioRef.current.src = onlineUrl;
          if (!videoModeRef.current) localAudioRef.current.play().catch(() => {});
        };

        // Neural Flow Bridge (NOVA) - High-Fidelity Signal Acquisition
        localAudioRef.current.onloadstart = () => {
            console.log(`[Aether/Audio] loadstart at ${Date.now() - loadStartTime}ms`);
        };
        localAudioRef.current.oncanplay = () => {
            if (videoModeRef.current) return; // still in video mode — stay silent
            // Apply pending resume time only once (from video exit handoff)
            if (resumeMs > 0) {
              const resumeSec = resumeMs / 1000;
              // We trust HTML5's seek capability to trigger Range headers or native fast-forward
              // dropping strict buffer limits allows continuous streaming if the backend allows it.
              localAudioRef.current.currentTime = resumeSec;
              setCurrentTime(Math.floor(resumeSec * 1000));
              currentTimeRef.current = Math.floor(resumeSec * 1000);
              pendingResumeTimeRef.current = null;
              setPendingResumeTime(null);
              setIsAudioBuffering(false);
              // Resume playback after seek
              if (isPlaying) localAudioRef.current.play().catch(() => {});
            } else {
              setIsAudioBuffering(false);
            }
        };
        localAudioRef.current.ontimeupdate = () => {
            if (videoModeRef.current) return;
            const nextMs = Math.max(0, liveStreamStartOffsetMsRef.current + Math.floor((localAudioRef.current?.currentTime || 0) * 1000));
            currentTimeRef.current = nextMs;
            setCurrentTime(nextMs);
            if (isPlayingRef.current && nextMs >= 0) {
              setIsAudioBuffering(false);
            }
        };
        localAudioRef.current.onplaying = () => {
            // In video mode the video element owns audio output — don't un-mute here
            if (videoModeRef.current) return;
            console.log(`[Aether/Audio] playing after ${Date.now() - loadStartTime}ms`);
            if (localAudioRef.current) localAudioRef.current.muted = false;
            setIsAudioBuffering(false);
            bufferingRescueRef.current = { trackKey: trackLoadKey, lastAttemptAt: 0, attempts: 0 };
            setDiagnostics(prev => ({
              ...prev,
              lastSongFetchMs: Math.max(0, Date.now() - loadStartTime),
              lastSongFetchAt: Date.now(),
              lastSongSource: downloadedTracks.includes(track.id) ? 'offline-cache' : 'local-stream',
            }));
        };
        localAudioRef.current.onwaiting = () => {
            if (videoModeRef.current) return;
            // Do NOT mute here — muting causes an oscillation loop.
            // Browser naturally outputs silence while buffering.
            if (isPlaying) setIsAudioBuffering(true);
        };
        localAudioRef.current.onstalled = () => {
            if (videoModeRef.current) return;
            if (isPlaying) {
              setIsAudioBuffering(true);
              fallbackToOnlineStream();
            }
        };
        localAudioRef.current.onended = () => {
            // In video mode the video element owns queue advance — audio ended while muted, ignore
            if (videoModeRef.current) {
              console.log('[Aether/Audio] onended suppressed — video mode active');
              return;
            }
            
            const playedMs = Math.floor((localAudioRef.current?.currentTime || 0) * 1000);
            const durationMs = Number(track.totalDurationMs || track.duration || 0);
            const completion = durationMs > 0 ? playedMs / durationMs : 1;
            
            if (completion > 0 && completion < 0.9 && !prematureEndGuardRef.current.retried) {
                prematureEndGuardRef.current = { trackId: track.id, retried: true };
                const youtubeUrl = track.youtubeId
                  ? `https://www.youtube.com/watch?v=${track.youtubeId}`
                  : track.actualUrl || track.url;
                const streamBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
                const recoveryUrl = `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}&_r=${Date.now()}`;
                console.warn('[Aether/Audio] Premature end detected, attempting recovery', {
                  title: track.title,
                  playedMs, durationMs, recoveryUrl,
                });
                setIsAudioBuffering(true);
                localAudioRef.current.src = recoveryUrl;
                if (!videoModeRef.current) localAudioRef.current.play().catch((e) => {
                  console.error('[Aether/Audio] Recovery failed', e);
                  advanceQueueRef.current('premature_recover_failed');
                });
                return;
            }
            console.log("[Aether/Audio] Terminated Naturally. Handing to Shared Advance.");
            advanceQueueRef.current('natural_end');
        };
        localAudioRef.current.onerror = (e) => {
            if (videoModeRef.current) {
              console.log('[Aether/Audio] onerror suppressed — video mode active');
              return;
            }
            // HIGH-FIDELITY FAULT TOLERANCE: Do not skip on initial connection fault
          console.error("[Aether/Audio] Signal Disturbance Detected:", e, {
            src: localAudioRef.current?.src,
            networkState: localAudioRef.current?.networkState,
            readyState: localAudioRef.current?.readyState,
            currentTime: localAudioRef.current?.currentTime,
            paused: localAudioRef.current?.paused,
          });
            console.log("[Aether/Audio] Attempting signal recovery. Skip suppressed.");
            // Maintain buffering state instead of skipping to Standby
            if (localAudioRef.current) localAudioRef.current.muted = true;
            if (isPlaying) {
              setIsAudioBuffering(true);
              fallbackToOnlineStream();
            }
        };
        
        // VIDEO MODE GUARD: If video is active, audio player MUST stay dead to prevent echo/waste
        if (videoModeRef.current) {
          console.log("[Aether/Audio] Suppression Active: Video mode driving session");
          if (localAudioRef.current) {
            localAudioRef.current.pause();
            localAudioRef.current.src = '';
          }
          return;
        }

        const streamUrl = isLocalDownloaded
          ? `${streamBase}/offline/${track.id}.m4a?_q=${streamNonce}${resetQuery}`
          : `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}&_q=${streamNonce}${resetQuery}${startSec > 0 ? `&t=${startSec}` : ''}`;
        prematureEndGuardRef.current = { trackId: track.id, retried: false };
        
        console.log("[Aether/Audio] Initializing Stream:", streamUrl, {
            isLocalDownloaded,
            startSec,
            trackId: track.id,
        });
        
        liveStreamStartOffsetMsRef.current = isLocalDownloaded ? 0 : Math.floor(startSec * 1000);
        
        localAudioRef.current.crossOrigin = "anonymous";
        localAudioRef.current.src = streamUrl;
        
        // New tracks always start clean unless an explicit handoff/session resume asked otherwise.
        if (startSec > 0 && isLocalDownloaded) {
            localAudioRef.current.currentTime = startSec;
        } else {
            try {
              localAudioRef.current.currentTime = 0;
            } catch {}
            if (startSec === 0) {
              currentTimeRef.current = 0;
              setCurrentTime(0);
            } else {
              currentTimeRef.current = Math.floor(startSec * 1000);
              setCurrentTime(Math.floor(startSec * 1000));
            }
        }
        const startupWatchdog = setTimeout(() => {
          const audio = localAudioRef.current;
          if (!audio || !isPlaying) return;
          const stuckAtStart = (audio.currentTime || 0) < 1 && audio.readyState < 2;
          if (stuckAtStart) {
            console.warn('[Aether/Audio] Startup watchdog triggered', {
              trackId: track.id,
              title: track.title,
              src: audio.src,
              readyState: audio.readyState,
              currentTime: audio.currentTime,
            });
            fallbackToOnlineStream();
          }
        }, 12000);
        
        // Trigger background download if not already cached / warming
        if (window.aether?.download && !downloadedTracks.includes(track.id) && !warmingTrackIds.has(track.id)) {
            console.log(`[Aether] Triggering background download for track ${track.id}`);
            warmupTrack(track);
        }
        
        if (isPlaying && !videoModeRef.current) {
          console.log("[Aether/Audio] Attempting play()", {
            src: localAudioRef.current?.src,
            readyState: localAudioRef.current?.readyState,
            networkState: localAudioRef.current?.networkState,
          });
            if (!videoModeRef.current) localAudioRef.current.play().catch(e => {
            if (e?.name === 'AbortError') {
              console.warn('[Aether/Audio] play() interrupted by source refresh (non-fatal)');
              return;
            }
            console.error("[Aether/Audio] Autoplay Blocked or Failed:", e, {
              src: localAudioRef.current?.src,
              readyState: localAudioRef.current?.readyState,
              networkState: localAudioRef.current?.networkState,
              paused: localAudioRef.current?.paused,
            });
                setIsAudioBuffering(true);
            });
        } else {
          setIsAudioBuffering(false);
        }
        const clearWatchdog = () => clearTimeout(startupWatchdog);
        
        // Return cleanup function to clear state before next effect run
        return () => {
          clearWatchdog();
          if (localAudioRef.current) {
            localAudioRef.current.oncanplay = null;
            localAudioRef.current.onplaying = null;
            localAudioRef.current.ontimeupdate = null;
            localAudioRef.current.onwaiting = null;
            localAudioRef.current.onstalled = null;
            localAudioRef.current.onended = null;
            localAudioRef.current.onerror = null;
            localAudioRef.current.onloadstart = null;
          }
        };
    }
  }, [queue?.[0]?.title, queue?.[0]?.id, queue?.[0]?.queueNonce, isPlaying, isStandalone, streamPort, API_BASE, pendingResumeTime, videoMode, playbackResetNonce]);

  useEffect(() => {
    if (!isStandalone || !isPlaying || !isAudioBuffering || !currentTrack || !localAudioRef.current || videoModeRef.current) return;
    // Rescue only during startup buffering. Mid-song stalls should recover naturally without forced source switch.
    if ((currentTimeRef.current || 0) > 5000) return;

    const trackKey = currentTrack.id || currentTrack.youtubeId || `${currentTrack.title || ''}|${currentTrack.author || ''}`;
    const timer = setTimeout(() => {
      const audio = localAudioRef.current;
      if (!audio || !isAudioBuffering) return;

      const now = Date.now();
      const sameTrack = bufferingRescueRef.current.trackKey === trackKey;
      const attempts = sameTrack ? (bufferingRescueRef.current.attempts || 0) : 0;
      const lastAttemptAt = sameTrack ? (bufferingRescueRef.current.lastAttemptAt || 0) : 0;

      // Backoff + cap to avoid infinite thrash while still giving enough chances to recover.
      if (attempts >= 3) {
        console.warn('[Aether/Audio] Buffering rescue exhausted; pausing playback to prevent screech loop', {
          trackId: currentTrack.id,
          title: currentTrack.title,
          attempts,
        });
        audio.pause();
        setIsPlaying(false);
        setIsAudioBuffering(false);
        if (audio && !videoModeRef.current) audio.muted = false;
        return;
      }
      if (lastAttemptAt > 0 && now - lastAttemptAt < 6000) {
        return;
      }

      bufferingRescueRef.current = { trackKey, lastAttemptAt: now, attempts: attempts + 1 };

      const sourceUrl = currentTrack.youtubeId
        ? `https://www.youtube.com/watch?v=${currentTrack.youtubeId}`
        : currentTrack.actualUrl || currentTrack.url;
      if (!sourceUrl) return;

      const rescueUrl = `http://localhost:${streamPort}/stream?url=${encodeURIComponent(sourceUrl)}&_r=${Date.now()}`;
      console.warn('[Aether/Audio] Buffering rescue triggered', {
        trackId: currentTrack.id,
        title: currentTrack.title,
        from: audio.src,
        to: rescueUrl,
        attempt: attempts + 1,
        readyState: audio.readyState,
        currentTime: audio.currentTime,
      });

      audio.muted = true;
      audio.pause();
      audio.src = rescueUrl;
      audio.load();
      audio.play().catch((e) => {
        console.error('[Aether/Audio] Buffering rescue failed; keeping current track in buffering state', e);
      });
    }, 8500);

    return () => clearTimeout(timer);
  }, [isStandalone, isPlaying, isAudioBuffering, currentTrack?.id, currentTrack?.youtubeId, currentTrack?.title, currentTrack?.author, currentTrack?.actualUrl, currentTrack?.url, streamPort]);

  useEffect(() => {
    if (!isStandalone || videoMode || !isPlaying || !isAudioBuffering) return;
    if (!localAudioRef.current) return;

    let timer = null;
    const syncHealthyPlaybackState = () => {
      const audio = localAudioRef.current;
      if (!audio || videoModeRef.current) return;

      const progressMs = Math.max(
        0,
        Math.floor((audio.currentTime || 0) * 1000),
        Math.floor(currentTimeRef.current || 0),
      );
      const healthyPlayback = !audio.paused && !audio.ended && (audio.readyState >= 3 || progressMs > 350);

      if (healthyPlayback) {
        setIsAudioBuffering(false);
        return;
      }

      timer = window.setTimeout(syncHealthyPlaybackState, 250);
    };

    syncHealthyPlaybackState();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isStandalone, videoMode, isPlaying, isAudioBuffering, currentTrack?.id, currentTrack?.queueNonce]);

  useEffect(() => {
    if (!isStandalone || videoMode || !isPlaying || !currentTrack) return;
    if (!localAudioRef.current) return;

    const interval = window.setInterval(() => {
      const audio = localAudioRef.current;
      if (!audio || videoModeRef.current) return;

      const nextMs = Math.max(0, Math.floor((audio.currentTime || 0) * 1000));
      if (Math.abs(nextMs - currentTimeRef.current) >= 500) {
        currentTimeRef.current = nextMs;
        setCurrentTime(nextMs);
      }

      const isHealthy = !audio.paused && !audio.ended && (audio.readyState >= 2 || nextMs > 0);
      if (isHealthy && isAudioBuffering) {
        setIsAudioBuffering(false);
      }
    }, 750);

    return () => window.clearInterval(interval);
  }, [isStandalone, videoMode, isPlaying, currentTrack?.id, currentTrack?.queueNonce, isAudioBuffering]);

  // --- AETHER: UNIFIED DISCORD RPC ENGINE (NOVA ---
  useEffect(() => {
    if (!isStandalone || !window.aether?.updateRPC) return;

    let cycleInterval;

    const updateRPC = () => {
        const track = queue?.[0];
      const hasValidTrack = !!(track && typeof track === 'object');
        
      if (hasValidTrack) {
            const rpcTrackId = String(track.id || track.youtubeId || `${track.title || ''}|${track.author || ''}`);
            const sameTrack = lastRPCTrackIdRef.current === rpcTrackId;
            const samePlayState = lastRPCPlayingRef.current === isPlaying;
            if (sameTrack && samePlayState) return;

            const durationMs = Number(track.totalDurationMs || track.duration || 0);
            const shouldRecalculateClock =
              !sameTrack ||
              (sameTrack && !samePlayState && isPlaying) ||
              !lastRPCStartRef.current ||
              !lastRPCEndRef.current;

            if (shouldRecalculateClock) {
              const liveCurrentTime = Math.max(0, Math.floor(currentTimeRef.current || 0));
              lastRPCStartRef.current = Date.now() - liveCurrentTime;
              const computedEnd = Date.now() + Math.max(0, durationMs - liveCurrentTime);
              lastRPCEndRef.current = Number.isFinite(durationMs) && durationMs > liveCurrentTime + 1000
                ? computedEnd
                : null;
            }

            lastRPCTrackIdRef.current = rpcTrackId;
            lastRPCPlayingRef.current = isPlaying;
            idleStartTimeRef.current = null;
            idlePhraseRef.current = null;
            
            window.aether.updateRPC({
                title: track.title,
                artist: track.author,
                thumbnail: track.thumbnail,
                isPlaying: isPlaying,
              url: track.actualUrl || track.url || '',
                startTime: lastRPCStartRef.current,
                endTime: lastRPCEndRef.current
            });
        } else {
            // Idle Lobby State
            lastRPCTrackIdRef.current = null;
            lastRPCPlayingRef.current = null;
            lastRPCStartRef.current = null;
            lastRPCEndRef.current = null;
            if (!idleStartTimeRef.current) {
                idleStartTimeRef.current = Date.now();
                idlePhraseRef.current = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)];
            }
            
            window.aether.updateRPC({
                title: "Music Lobby",
                artist: idlePhraseRef.current,
                startTime: idleStartTimeRef.current
            });

            // Start cycler if not already running
            if (!cycleInterval) {
                cycleInterval = setInterval(() => {
                    if (queue && queue.length > 0) return; // Guard for async race
                    
                    let next;
                    do { next = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)]; } while (next === idlePhraseRef.current);
                    idlePhraseRef.current = next;
                    
                    window.aether.updateRPC({
                        title: "Music Lobby",
                        artist: idlePhraseRef.current,
                        startTime: idleStartTimeRef.current
                    });
                }, 20000); 
            }
        }
    };

    updateRPC();

    return () => {
        if (cycleInterval) {
            clearInterval(cycleInterval);
            cycleInterval = null;
        }
    };
  }, [queue, isPlaying, isStandalone]);

  // Combined effect replaced the previous two RPC effects

  // Handle Play/Pause sync
  useEffect(() => {
    if (!isStandalone || !localAudioRef.current) return;
    if (isPlaying) {
       if (localAudioRef.current && !videoModeRef.current) localAudioRef.current.play().catch(() => {});
       if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    } else {
       localAudioRef.current.pause();
       setIsAudioBuffering(false);
       if (audioCtxRef.current?.state === 'running') {
        audioCtxRef.current.suspend().catch(() => {});
       }
    }
  }, [isPlaying, isStandalone, videoMode]);

  // Audio Visualizer Loop (NOVA
  useEffect(() => {
    if (!isStandalone || !localAudioRef.current) return;
    if (performanceMode === 'low') {
      if (visualizerCanvasRef.current) {
        const canvas = visualizerCanvasRef.current;
        canvas.getContext('2d', { alpha: true })?.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
      }
      if (pulseCanvasRef.current) {
        const canvas = pulseCanvasRef.current;
        canvas.getContext('2d', { alpha: true })?.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
      }
      if (document.documentElement) {
        document.documentElement.style.setProperty('--aura-beat-pulse', '0');
        document.documentElement.style.setProperty('--aura-edge-glow', '0');
        document.documentElement.style.setProperty('--aura-kick-shift', '0deg');
        document.documentElement.style.setProperty('--aura-kick-glow', '0');
      }
      return undefined;
    }
    let cancelled = false;
    let startTimer = null;

    const setupAudioAnalysis = () => {
      if (cancelled) return;
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (!analyserRef.current) {
          analyserRef.current = audioCtxRef.current.createAnalyser();
          analyserRef.current.fftSize = 256; 
          analyserRef.current.smoothingTimeConstant = 0.65;
        }
        if (!sourceRef.current && localAudioRef.current) {
          sourceRef.current = audioCtxRef.current.createMediaElementSource(localAudioRef.current);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioCtxRef.current.destination);
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (e) {
        console.error("[Aether] Audio API Error:", e.message);
      }
    };

    const runVisualizer = () => {
      if (cancelled) return;
      if (!analyserRef.current || !auraEnergyRef.current) return;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
        try {
          if (cancelled) return;
          const frameNow = performance.now();
          const frameBudget = visualizerFrameBudgetRef.current;

	          const visualizerState = visualizerStateRef.current;
	          const liveVisualizerMode = visualizerState.visualizerMode;
	          const liveThemeColor = visualizerState.themeColor;
	          const liveAuraPreset = visualizerState.auraPreset;
	          const isVaultOpen = visualizerState.isMixtapeVaultOpen;
          const livePerformanceMode = visualizerState.performanceMode || 'high';
          const minFrameGap = livePerformanceMode === 'medium' ? 66 : 0;
          if (minFrameGap > 0 && frameNow - frameBudget.lastDrawAt < minFrameGap) return;
          frameBudget.lastDrawAt = frameNow;
	          const auraModeActive = liveVisualizerMode === 'pulse';
          const canvas = liveVisualizerMode === 'bars' ? visualizerCanvasRef.current : null;
          const pulseCanvas = liveVisualizerMode === 'pulse' ? pulseCanvasRef.current : null;
          if (!canvas && !pulseCanvas && !isVaultOpen) return;

          if (canvas && frameBudget.canvas !== canvas) {
            frameBudget.canvas = canvas;
            frameBudget.ctx = canvas.getContext('2d', { alpha: true });
          } else if (!canvas) {
            frameBudget.canvas = null;
            frameBudget.ctx = null;
          }
          if (pulseCanvas && frameBudget.pulseCanvas !== pulseCanvas) {
            frameBudget.pulseCanvas = pulseCanvas;
            frameBudget.pulseCtx = pulseCanvas.getContext('2d', { alpha: true });
          } else if (!pulseCanvas) {
            frameBudget.pulseCanvas = null;
            frameBudget.pulseCtx = null;
          }
          const ctx = frameBudget.ctx;
          const pCtx = frameBudget.pulseCtx;
          if (document.documentElement && frameNow - frameBudget.lastStyleAt > 500) {
            const rootStyle = getComputedStyle(document.documentElement);
            frameBudget.brandAccent = rootStyle.getPropertyValue('--brand-accent')?.trim() || liveThemeColor || '#00ffbf';
            frameBudget.brandContrast = rootStyle.getPropertyValue('--brand-contrast')?.trim() || '#ff00ff';
            frameBudget.lastStyleAt = frameNow;
          }
          
          const width = canvas?.width || 800;
          const height = canvas?.height || 40;
          const pWidth = pulseCanvas?.width || 800;
          const pHeight = pulseCanvas?.height || 400;

        if (liveVisualizerMode === 'bars' && ctx) ctx.clearRect(0, 0, width, height);
        if (liveVisualizerMode === 'pulse' && pCtx) pCtx.clearRect(0, 0, pWidth, pHeight);

        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        const bassRaw = (dataArray[1] + dataArray[2] + dataArray[3]) / (3 * 255);
        let midsRawSum = 0;
        for (let i = 8; i < 28; i++) midsRawSum += dataArray[i];
        const midsRaw = midsRawSum / (20 * 255);

        let highsRawSum = 0;
        for (let i = 30; i < 70; i++) highsRawSum += dataArray[i];
        const highsRaw = highsRawSum / (40 * 255);

        if (!auraEnergyRef.current) return;
        auraEnergyRef.current.bass = lerp(auraEnergyRef.current.bass, bassRaw, 0.22);
        auraEnergyRef.current.mids = lerp(auraEnergyRef.current.mids, midsRaw, 0.18);
        auraEnergyRef.current.highs = lerp(auraEnergyRef.current.highs, highsRaw, 0.14);
        auraEnergyRef.current.phase += 0.01 + auraEnergyRef.current.highs * 0.05;

        const bass = auraEnergyRef.current.bass;
        const mids = auraEnergyRef.current.mids;
        const highs = auraEnergyRef.current.highs;
        const drift = Math.sin(auraEnergyRef.current.phase) * 0.03;
        const auraScale = 0.92 + bass * 0.45 + drift;
        const spinDeg = (auraEnergyRef.current.phase * 180) / Math.PI;
        const energy = clamp01((bass * 0.46) + (mids * 0.34) + (highs * 0.20));

        uiPulseRef.current = auraModeActive ? auraScale : 1;

        if (mixtapeVaultRef.current && frameNow - frameBudget.lastMixtapeCssAt > (livePerformanceMode === 'high' ? 33 : 80)) {
          mixtapeVaultRef.current.style.setProperty('--vault-bass', String(bass));
          mixtapeVaultRef.current.style.setProperty('--vault-mids', String(mids));
          mixtapeVaultRef.current.style.setProperty('--vault-highs', String(highs));
          mixtapeVaultRef.current.style.setProperty('--vault-energy', String(energy));
          mixtapeVaultRef.current.style.setProperty('--vault-scale', String(auraScale));
          mixtapeVaultRef.current.style.setProperty('--vault-spin', `${spinDeg}deg`);
          mixtapeVaultRef.current.style.setProperty('--vault-glow', String(clamp01(0.18 + bass * 0.42 + highs * 0.22)));
          frameBudget.lastMixtapeCssAt = frameNow;
        }

        // AURA MODE: Propagate beat energy to transport & lyric underline
        if (auraModeActive && document.documentElement) {
          const selectedAuraPreset = AURA_PRESETS_MAP[liveAuraPreset] || AURA_PRESETS[1];
          const kickTransient = clamp01(Math.max(0, (bassRaw - bass) * 3.8) + Math.max(0, (bass - 0.66) * 1.9));
          const auraShiftDeg = ((kickTransient * 13.5) + (energy * 1.8)) * selectedAuraPreset.hueShift;
          document.documentElement.style.setProperty('--aura-beat-pulse', String(bass * 0.8 + energy * 0.3));
          document.documentElement.style.setProperty('--aura-edge-glow', String(bass * 0.6 + mids * 0.4));
          document.documentElement.style.setProperty('--aura-kick-shift', `${auraShiftDeg.toFixed(2)}deg`);
          document.documentElement.style.setProperty('--aura-kick-glow', String(clamp01((0.22 + kickTransient * 0.78) * selectedAuraPreset.kickGlow)));

          // AURA MODE: Trigger beat rings on kick peaks (bass spikes)
          if (lastBeatRingTimeRef.current !== undefined && bass > selectedAuraPreset.ringThreshold && performance.now() - lastBeatRingTimeRef.current > selectedAuraPreset.ringCooldownMs) {
            lastBeatRingTimeRef.current = performance.now();
            if (beatRingsRef.current) {
              const ringScale = selectedAuraPreset.ringScale;
              const ringDuration = selectedAuraPreset.ringDurationMs;
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svg.setAttribute('viewBox', '0 0 100 100');
              svg.setAttribute('width', '100');
              svg.setAttribute('height', '100');
              svg.setAttribute('class', 'beat-ring');
              svg.style.position = 'absolute';
              svg.style.pointerEvents = 'none';
              svg.style.top = '50%';
              svg.style.left = '50%';
              svg.style.transform = 'translate(-50%, -50%)';
              svg.style.opacity = '0.55';

              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', '50');
              circle.setAttribute('cy', '50');
              circle.setAttribute('r', String(14 * ringScale));
              circle.style.strokeWidth = '1.1';
              svg.appendChild(circle);

              beatRingsRef.current.appendChild(svg);

              // Animate the circle
              let startTime = performance.now();
              const animateBeat = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / ringDuration, 1);
                const r = (14 * ringScale) + progress * (22 * ringScale);
                const opacity = 0.55 * (1 - progress);
                
                circle.setAttribute('r', String(r));
                circle.style.opacity = String(opacity);
                
                if (progress < 1) {
                  requestAnimationFrame(animateBeat);
                } else {
                  svg.remove();
                }
              };
              requestAnimationFrame(animateBeat);
            }
          }
        } else if (document.documentElement) {
          document.documentElement.style.setProperty('--aura-kick-shift', '0deg');
          document.documentElement.style.setProperty('--aura-kick-glow', '0');
        }

        const now = performance.now();
        if (isVaultOpen && now - vaultTelemetryRef.current.lastStateAt > 120) {
          vaultTelemetryRef.current.lastStateAt = now;
          const liveTrack = currentTrackRef.current;
          const liveTime = currentTimeRef.current;
          const sampledBars = Array.from({ length: 8 }, (_, i) => {
            const start = Math.floor((i / 8) * bufferLength);
            const end = Math.max(start + 1, Math.floor(((i + 1) / 8) * bufferLength));
            let total = 0;
            let count = 0;
            for (let b = start; b < end; b++) {
              total += dataArray[b] || 0;
              count += 1;
            }
            return clamp01((total / Math.max(count, 1)) / 255);
          });

          const pulseData = {
            bass,
            mids,
            highs,
            energy,
            spin: spinDeg,
            stamp: [
              'AETHER-PULSE',
              liveTrack?.title || 'Aether Secret Session',
              `t=${Math.floor((liveTime || 0) / 1000)}s`,
              `b=${Math.round(bass * 100)}`,
              `m=${Math.round(mids * 100)}`,
              `h=${Math.round(highs * 100)}`,
            ].join(' · '),
          };

          vaultPulseRef.current = pulseData;

          // High-frequency CSS variable updates for smooth Aura effects without React re-renders
          if (isAuraMode) {
            const root = document.documentElement;
            root.style.setProperty('--vault-bass', String(bass));
            root.style.setProperty('--vault-mids', String(mids));
            root.style.setProperty('--vault-highs', String(highs));
            root.style.setProperty('--vault-energy', String(energy));
            root.style.setProperty('--vault-scale', String(1 + energy * 0.1));
            root.style.setProperty('--vault-spin', `${spinDeg}deg`);
          }

          // Throttle React state updates; CSS variables carry the smoother beat response.
          const now = Date.now();
          const vaultUiGap = livePerformanceMode === 'high' ? 180 : 360;
          if (now - lastVaultStateUpdateRef.current > vaultUiGap) {
            setVaultPulse(pulseData);
            setVaultSpectrum((prev) => sampledBars.map((v, idx) => lerp(prev[idx] ?? 0, v, 0.45)));
            lastVaultStateUpdateRef.current = now;
          }
        }

        if (liveVisualizerMode === 'bars' && ctx) {
            const barWidth = (width / bufferLength) * 2.5;
            let x = 0;
            ctx.fillStyle = frameBudget.brandContrast || '#ff00ff';
            if (!visualizerBarsRef.current || visualizerBarsRef.current.length !== bufferLength) {
              visualizerBarsRef.current = new Float32Array(bufferLength);
            }
            const smoothedBars = visualizerBarsRef.current;
            for (let i = 0; i < bufferLength; i++) {
                const targetHeight = (dataArray[i] / 255) * height;
                smoothedBars[i] = lerp(smoothedBars[i] || 0, targetHeight, targetHeight > smoothedBars[i] ? 0.42 : 0.24);
                const barHeight = smoothedBars[i];
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                x += barWidth + 2;
            }
        } else if (liveVisualizerMode === 'pulse' && pCtx) {
          const accent = frameBudget.brandAccent || liveThemeColor || '#00ffbf';
          const contrast = frameBudget.brandContrast || '#ff00ff';

          const centerX = pWidth / 2;
          const centerY = pHeight / 2;
          const baseRadius = Math.min(pWidth, pHeight) * 0.26;

          // Layer 1: soft ambient bloom
          const outer = pCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 2.8 * auraScale);
          outer.addColorStop(0, `${accent}${alphaHex(0.22 + bass * 0.20)}`);
          outer.addColorStop(0.45, `${contrast}${alphaHex(0.10 + mids * 0.14)}`);
          outer.addColorStop(1, 'transparent');
          pCtx.fillStyle = outer;
          pCtx.beginPath();
          pCtx.arc(centerX, centerY, baseRadius * 2.7 * auraScale, 0, Math.PI * 2);
          pCtx.fill();

          // Layer 2: liquid rings
          pCtx.lineCap = 'round';
          for (let ring = 0; ring < 3; ring++) {
            const ringAlpha = 0.55 - ring * 0.15;
            const ringBoost = 1 - ring * 0.2;
            pCtx.beginPath();
            pCtx.strokeStyle = `${ring % 2 === 0 ? accent : contrast}${alphaHex(ringAlpha)}`;
            pCtx.lineWidth = 3 - ring * 0.7;
            pCtx.shadowBlur = 24 + bass * 32;
            pCtx.shadowColor = ring % 2 === 0 ? accent : contrast;

            for (let i = 0; i <= 140; i++) {
              const t = i / 140;
              const angle = t * Math.PI * 2;
              const bin = Math.floor((t * (bufferLength - 1) + ring * 13) % (bufferLength - 1));
              const val = (dataArray[bin] || 0) / 255;
              const ripple = Math.sin(angle * 3 + auraEnergyRef.current.phase * 2) * highs * 9;
              const radius = baseRadius + val * (54 * ringBoost) + ripple;
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              if (i === 0) pCtx.moveTo(x, y); else pCtx.lineTo(x, y);
            }
            pCtx.closePath();
            pCtx.stroke();
          }

          // Layer 3: perimeter ticks
          pCtx.shadowBlur = 0;
          pCtx.lineWidth = 1.6;
          for (let i = 0; i < 56; i += 2) {
            const angle = (i / 56) * Math.PI * 2;
            const val = (dataArray[(i * 2) % bufferLength] || 0) / 255;
            const len = 5 + val * (14 + highs * 10);
            const radius = baseRadius - 12;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius - len);
            const y2 = centerY + Math.sin(angle) * (radius - len);
            pCtx.strokeStyle = `${accent}${alphaHex(0.35 + val * 0.45)}`;
            pCtx.beginPath();
            pCtx.moveTo(x1, y1);
            pCtx.lineTo(x2, y2);
            pCtx.stroke();
          }
        }
        visualizerErrorCountRef.current = 0;
        } catch (e) {
          visualizerErrorCountRef.current += 1;
          const shouldLog = visualizerErrorCountRef.current <= 3 || visualizerErrorCountRef.current % 60 === 0;
          if (shouldLog) {
            console.error('[Aether/Visualizer] Frame error (likely post-restart):', e?.message || String(e));
          }
        } finally {
          if (!cancelled) {
            animationFrameRef.current = requestAnimationFrame(draw);
          }
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    startTimer = window.setTimeout(() => {
      if (cancelled) return;
      setupAudioAnalysis();
      runVisualizer();
    }, 50);

    return () => {
      cancelled = true;
      if (startTimer) window.clearTimeout(startTimer);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      visualizerErrorCountRef.current = 0;
    };
  }, [isStandalone, currentTrack?.id, currentTrack?.queueNonce, playbackResetNonce, performanceMode]);

  const handleVolumeChange = (val) => {
    const v = parseFloat(val);
    if (!isFinite(v)) return;
    const finalV = Math.max(0, Math.min(1, v));
    setVolume(finalV);
    if (localAudioRef.current) localAudioRef.current.volume = finalV;
    window.aether?.store?.set('volume', finalV);
  };

  const orderedPlaylistNames = useMemo(() => {
    const seen = new Set();
    const ordered = [];
    playlistOrder.forEach((name) => {
      if (playlists[name] && !seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    });
    Object.keys(playlists).forEach((name) => {
      if (!seen.has(name)) ordered.push(name);
    });
    return ordered;
  }, [playlists, playlistOrder]);

  const persistPlaylistOrder = useCallback((nextOrder) => {
    setPlaylistOrder(nextOrder);
    window.aether?.store?.set(PLAYLIST_ORDER_STORAGE_KEY, nextOrder);
  }, []);

  const movePlaylist = useCallback((name, direction) => {
    setPlaylistOrder((prev) => {
      const current = prev.length ? prev : Object.keys(playlists);
      const index = current.indexOf(name);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      window.aether?.store?.set(PLAYLIST_ORDER_STORAGE_KEY, next);
      return next;
    });
  }, [playlists]);

  const reorderPlaylistByDrag = useCallback((targetName, draggedNameOverride = null) => {
    const activeDraggedName = draggedNameOverride || draggedPlaylistName;
    if (!activeDraggedName || !targetName || activeDraggedName === targetName) {
      setDraggedPlaylistName(null);
      return;
    }

    const current = orderedPlaylistNames;
    const from = current.indexOf(activeDraggedName);
    const to = current.indexOf(targetName);
    if (from < 0 || to < 0) {
      setDraggedPlaylistName(null);
      return;
    }

    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistPlaylistOrder(next);
    setDraggedPlaylistName(null);
  }, [draggedPlaylistName, orderedPlaylistNames, persistPlaylistOrder]);

  const reorderQueueByDrag = useCallback((targetIndex, draggedIndexOverride = null) => {
    const from = Number(draggedIndexOverride ?? draggedQueueIndex);
    const to = Number(targetIndex);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from === to) {
      setDraggedQueueIndex(null);
      return;
    }

    setQueue((prev) => {
      if (!Array.isArray(prev) || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggedQueueIndex(null);
  }, [draggedQueueIndex]);

  useEffect(() => {
    if (!playlistOrderHydratedRef.current) return;

    const playlistNames = Object.keys(playlists);
    if (playlistNames.length === 0) return;

    const nextOrder = playlistOrder.filter((name) => playlistNames.includes(name));
    playlistNames.forEach((name) => {
      if (!nextOrder.includes(name)) nextOrder.push(name);
    });

    const differs = nextOrder.length !== playlistOrder.length || nextOrder.some((name, idx) => name !== playlistOrder[idx]);
    if (differs) {
      setPlaylistOrder(nextOrder);
      window.aether?.store?.set(PLAYLIST_ORDER_STORAGE_KEY, nextOrder);
    }
  }, [playlists, playlistOrder]);

  const handleAddToPlaylist = (name, data) => {
    if (!data) return;
    const newPlaylists = { ...playlists };
    const addedAt = new Date().toISOString();
    const markAdded = (track) => track ? { ...track, addedAt: track.addedAt || addedAt } : track;
    if (!newPlaylists[name]) newPlaylists[name] = [];
    if (!playlistOrder.includes(name)) {
      persistPlaylistOrder([...playlistOrder, name]);
    }
    
    if (Array.isArray(data)) {
        let addedCount = 0;
        data.forEach(t => {
          const normalizedTrack = markAdded(normalizeQueueTrack(t) || t);
          if (!hasTrackInList(newPlaylists[name], normalizedTrack)) {
                newPlaylists[name].push(normalizedTrack);
                addedCount++;
            }
        });
        setPlaylists(newPlaylists);
        window.aether?.store?.set('playlists', newPlaylists);
        setLastAdded(`Vaulted ${addedCount} Node(s)`);
        setTimeout(() => setLastAdded(null), 3000);
    } else {
        const normalizedTrack = markAdded(normalizeQueueTrack(data) || data);
        if (!hasTrackInList(newPlaylists[name], normalizedTrack)) {
          newPlaylists[name].push(normalizedTrack);
          setPlaylists(newPlaylists);
          window.aether?.store?.set('playlists', newPlaylists);
          setLastAdded(`Vaulted: ${normalizedTrack.title}`);
          setTimeout(() => setLastAdded(null), 3000);
        }
    }
    setActiveMenuTrack(null);
  };

  const libraryInsights = useMemo(() => {
    const allTracks = Object.values(playlists).flat();
    const seen = new Map();
    const artistCount = new Map();
    let duplicates = 0;

    allTracks.forEach((track) => {
      const key = normalizeTrackIdentity(track);
      if (seen.has(key)) duplicates += 1;
      else seen.set(key, true);

      const artist = (track?.author || 'Unknown').trim();
      artistCount.set(artist, (artistCount.get(artist) || 0) + 1);
    });

    const topArtists = [...artistCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      total: allTracks.length,
      unique: seen.size,
      duplicates,
      topArtists,
    };
  }, [playlists, normalizeTrackIdentity]);

  const smartMixTracks = useMemo(() => {
    const allTracks = Object.values(playlists).flat();
    if (allTracks.length === 0) return [];
    const unique = [];
    const used = new Set();
    for (const t of allTracks) {
      const key = normalizeTrackIdentity(t);
      if (used.has(key)) continue;
      used.add(key);
      unique.push(t);
      if (unique.length >= 18) break;
    }
    return unique;
  }, [playlists, normalizeTrackIdentity]);

  const handleGenerateSmartMix = useCallback(() => {
    if (!smartMixTracks.length) return;
    const shuffled = [...smartMixTracks].sort(() => Math.random() - 0.5);
    const pickCount = Math.min(shuffled.length, Math.max(5, Math.ceil(shuffled.length * 0.5)));
    const selected = shuffled.slice(0, pickCount);

    let added = 0;
    setQueue((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      selected.forEach((track) => {
        if (!hasTrackInList(next, track)) {
          next.push(track);
          added += 1;
        }
      });
      return next;
    });

    setLastAdded(added > 0 ? `Smart Mix queued • ${added} tracks` : 'Smart Mix already in queue');
    setTimeout(() => setLastAdded(null), 2800);
  }, [smartMixTracks, hasTrackInList]);

  const handleCleanVault = useCallback(async () => {
    if (isVaultCleaning) return;
    setIsVaultCleaning(true);
    setLastAdded('Cleaning vault…');

    try {
      const next = {};
      let removedDuplicates = 0;
      let removedUnavailable = 0;
      let normalized = 0;
      const totalTracks = Object.values(playlists).reduce((sum, tracks) => sum + (Array.isArray(tracks) ? tracks.length : 0), 0);
      let processedTracks = 0;

      const withTimeout = (promise, timeoutMs = 2500) => new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(null);
          }
        }, timeoutMs);

        Promise.resolve(promise)
          .then((value) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(value ?? null);
          })
          .catch(() => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(null);
          });
      });

      for (const [name, tracks] of Object.entries(playlists)) {
        const seen = new Set();
        const clean = [];

        for (const original of (tracks || [])) {
          processedTracks += 1;
          if (processedTracks % 18 === 0) {
            setLastAdded(`Cleaning vault… ${processedTracks}/${Math.max(totalTracks, 1)}`);
          }

          const baseUrl = original?.actualUrl || original?.url || (original?.youtubeId ? `https://www.youtube.com/watch?v=${original.youtubeId}` : '');
          let track = baseUrl
            ? {
                ...original,
                id: original?.id || original?.youtubeId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                youtubeId: original?.youtubeId || extractYouTubeId(baseUrl),
                actualUrl: original?.actualUrl || baseUrl,
                url: original?.url || baseUrl,
              }
            : null;
          if (!track) {
            removedUnavailable += 1;
            continue;
          }

          if (isStandalone && window.aether?.getMetadata) {
            const needsHydration = !original?.title || !original?.author || !original?.thumbnail || !track.youtubeId;
            if (needsHydration) {
              const meta = await withTimeout(window.aether.getMetadata(track.actualUrl || track.url), 2500);
              if (meta && (meta.title || meta.author || meta.thumbnail || meta.url || meta.actualUrl)) {
                track = mergeTrackMetadata(track, meta);
              }
            }
          }

          if (!(track.actualUrl || track.url || track.youtubeId)) {
            removedUnavailable += 1;
            continue;
          }

          const key = normalizeTrackIdentity(track);
          if (seen.has(key)) {
            removedDuplicates += 1;
            continue;
          }

          seen.add(key);

          const beforeTitle = String(original?.title || '').trim();
          const beforeAuthor = String(original?.author || '').trim();
          const beforeThumb = String(original?.thumbnail || '').trim();

          const normalizedTrack = {
            ...track,
            title: String(track.title || beforeTitle || 'Unknown Track').trim(),
            author: String(track.author || beforeAuthor || 'Unknown Artist').trim(),
            thumbnail: track.thumbnail || beforeThumb || '',
          };

          if (
            normalizedTrack.title !== beforeTitle ||
            normalizedTrack.author !== beforeAuthor ||
            (normalizedTrack.thumbnail || '') !== beforeThumb
          ) {
            normalized += 1;
          }

          clean.push(normalizedTrack);
        }

        next[name] = clean;
      }

      setPlaylists(next);
      await window.aether?.store?.set?.('playlists', next);
      persistPlaylistOrder(Object.keys(next).filter((name) => next[name]));
      setLastAdded(`Vault cleaned • deduped ${removedDuplicates}, removed ${removedUnavailable}, normalized ${normalized}`);
      setTimeout(() => setLastAdded(null), 4200);
    } finally {
      setIsVaultCleaning(false);
    }
  }, [isStandalone, isVaultCleaning, normalizeTrackIdentity, playlists]);

  const handleRemoveFromPlaylist = (name, index) => {
    if (name === FAVORITES_PLAYLIST_ID) {
      const track = favoriteTracksList[index];
      if (track) toggleFavoriteTrack(track);
      return;
    }
    const newPlaylists = { ...playlists };
    newPlaylists[name] = [...(newPlaylists[name] || [])]; 
    newPlaylists[name].splice(index, 1);
    setLastAdded(`Purged node from ${name}`);
    setTimeout(() => setLastAdded(null), 2000);
    setPlaylists(newPlaylists);
    window.aether?.store?.set('playlists', newPlaylists);
  };

  const handlePlaylistAddAll = (name) => {
    if (name === FAVORITES_PLAYLIST_ID) {
      handleFavoriteAddAll();
      return;
    }
    const tracks = playlists[name];
    if (tracks && tracks.length > 0) {
      const normalized = (tracks || []).map(normalizeQueueTrack).filter(Boolean);
      if (normalized.length === 0) {
        setLastAdded(`No playable tracks in ${name}`);
        setTimeout(() => setLastAdded(null), 2600);
        return;
      }
      setQueue(prev => {
        const next = [...prev, ...normalized];
        if (prev.length === 0) setIsPlaying(true);
        return next;
      });
      setIsManualStop(false);
      setLastAdded(`Queued Entire Vault: ${name} (${normalized.length})`);
      setTimeout(() => setLastAdded(null), 3000);
    }
  };

  const activeLyric = useMemo(() => {
    if (!lyrics || lyrics.length === 0 || activeLyricIndex < 0) return null;
    return lyrics[activeLyricIndex]?.text || null;
  }, [lyrics, activeLyricIndex]);

  const compactLyric = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return null;
    return lyrics[activeLyricIndex]?.text || activeLyric || null;
  }, [lyrics, activeLyricIndex, activeLyric]);

  const nextLyric = useMemo(() => {
    if (!Array.isArray(lyrics) || activeLyricIndex < 0) return null;
    const candidate = lyrics[activeLyricIndex + 1]?.text?.trim();
    if (!candidate || candidate === compactLyric) return null;
    return candidate;
  }, [lyrics, activeLyricIndex, compactLyric]);

  const handleRenamePlaylist = (oldName, newName) => {
    if (oldName === FAVORITES_PLAYLIST_ID) {
      setIsRenamingPlaylist(null);
      setLastAdded('Favorites is a built-in library');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const cleanName = String(newName || '').trim();
    if (!cleanName || oldName === cleanName) { setIsRenamingPlaylist(null); return; }
    if (playlists[cleanName] && cleanName !== oldName) {
      setLastAdded('Vault name already exists');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const newPlaylists = { ...playlists };
    newPlaylists[cleanName] = newPlaylists[oldName];
    delete newPlaylists[oldName];
    setPlaylists(newPlaylists);
    window.aether?.store?.set('playlists', newPlaylists);
    persistPlaylistOrder(playlistOrder.map((name) => (name === oldName ? cleanName : name)));
    setIsRenamingPlaylist(null);
    if (viewingPlaylist === oldName) setViewingPlaylist(cleanName);
    setLastAdded(`Renamed vault: ${cleanName}`);
    setTimeout(() => setLastAdded(null), 2200);
  };

  const handleDeletePlaylist = (name) => {
    if (name === FAVORITES_PLAYLIST_ID) {
      persistFavoriteTracks({});
      setViewingPlaylist(Object.keys(playlists)[0] || null);
      setLastAdded('Cleared favorites');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const newPlaylists = { ...playlists };
    delete newPlaylists[name];
    setPlaylists(newPlaylists);
    window.aether?.store?.set('playlists', newPlaylists);
    const nextOrder = playlistOrder.filter((playlistName) => playlistName !== name);
    persistPlaylistOrder(nextOrder);
    if (viewingPlaylist === name) {
      setViewingPlaylist(nextOrder.find((playlistName) => Array.isArray(newPlaylists[playlistName])) || Object.keys(newPlaylists)[0] || null);
    }
  };

  const triggerAutoplay = async (seedTrack = null) => {
    if (!isAutoplayEnabled || !isStandalone) return;
    const seed = seedTrack || currentTrack || history[0];
    if (!seed) return;

    const normalizeTitle = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizeArtist = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const seedTitleNorm = normalizeTitle(seed.title);
    const seedArtistNorm = normalizeArtist(seed.author);
    const seedDuration = Number(seed.totalDurationMs || seed.duration || 0);
    const seedId = String(seed.id || seed.youtubeId || '').trim();
    const seedUrl = String(seed.actualUrl || seed.url || '').trim();

    const recentTracks = [...queue, ...history].slice(0, 24);
    const recentTrackKeys = new Set(recentTracks.map((t) => normalizeTrackIdentity(t)).filter(Boolean));
    const recentArtistKeys = recentTracks.map((t) => normalizeArtist(t?.author)).filter(Boolean);
    const recentArtistSet = new Set(recentArtistKeys.slice(0, autoplayMoodMode === 'flow' ? 10 : autoplayMoodMode === 'safe' ? 6 : 4));

    const skipSignals = (skipEvents || []).slice(-160);
    const signalByTrack = new Map();
    const signalByArtist = new Map();
    const toSignalDelta = (reason) => {
      const r = String(reason || '').toLowerCase();
      if (r.includes('natural_end')) return 2;
      if (r.includes('manual_skip')) return -2;
      if (r.includes('premature') || r.includes('error') || r.includes('stalled')) return -1;
      return 0;
    };
    for (const event of skipSignals) {
      const titleKey = normalizeTitle(event?.title);
      const artistKey = normalizeArtist(event?.author || '');
      const delta = toSignalDelta(event?.reason);
      if (titleKey) signalByTrack.set(titleKey, (signalByTrack.get(titleKey) || 0) + delta);
      if (artistKey) signalByArtist.set(artistKey, (signalByArtist.get(artistKey) || 0) + delta);
    }

    const isSameAsSeed = (candidate) => {
      if (!candidate) return false;
      const candidateId = String(candidate.id || candidate.youtubeId || '').trim();
      const candidateTitleNorm = normalizeTitle(candidate.title);
      const candidateUrl = String(candidate.actualUrl || candidate.url || '').trim();
      return (
        (seedId && candidateId && seedId === candidateId) ||
        (seedUrl && candidateUrl && seedUrl === candidateUrl) ||
        (seedTitleNorm && candidateTitleNorm && seedTitleNorm === candidateTitleNorm)
      );
    };

    try {
      setIsAutoplaySeeking(true);
      
      // Primary Discovery Path: Recommendations
      const fetchPromise = window.aether.getRecommendations({ 
        title: seed.title, 
        author: seed.author, 
        url: seed.actualUrl || seed.url 
      });
      
      // 10s Timeout Guard
      const recs = await Promise.race([
        fetchPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
      ]);

      const queueHasTitle = (candidate) => queue.some((q) => normalizeTitle(q?.title) === normalizeTitle(candidate?.title));
      const buildScore = (candidate) => {
        const cTitle = normalizeTitle(candidate?.title);
        const cArtist = normalizeArtist(candidate?.author);
        const cDuration = Number(candidate?.totalDurationMs || candidate?.duration || 0);
        const cKey = normalizeTrackIdentity(candidate);

        // Hard-ish guards
        if (!cTitle) return -9999;
        if (isSameAsSeed(candidate)) return -5000;
        if (queueHasTitle(candidate)) return -4000;

        let score = 0;

        // (1) Session memory guardrails and no immediate repeat
        if (recentTrackKeys.has(cKey)) score -= autoplayMoodMode === 'explore' ? 18 : 35;
        if (recentArtistSet.has(cArtist)) score -= autoplayMoodMode === 'explore' ? 8 : 16;

        // (2) Context continuity scoring (artist, duration proxy)
        if (seedArtistNorm && cArtist && seedArtistNorm === cArtist) {
          score += autoplayMoodMode === 'flow' ? 9 : autoplayMoodMode === 'safe' ? 5 : 2;
        }
        if (seedDuration > 0 && cDuration > 0) {
          const ratio = Math.abs(cDuration - seedDuration) / Math.max(seedDuration, 1);
          const continuity = Math.max(0, 1 - Math.min(1, ratio));
          score += autoplayMoodMode === 'flow' ? continuity * 10 : autoplayMoodMode === 'safe' ? continuity * 7 : continuity * 4;
        }

        // (3) Skip-aware learning and (5) source reliability filter
        const trackSignal = signalByTrack.get(cTitle) || 0;
        const artistSignal = signalByArtist.get(cArtist) || 0;
        score += trackSignal * (autoplayMoodMode === 'safe' ? 2.4 : autoplayMoodMode === 'flow' ? 1.8 : 1.0);
        score += artistSignal * (autoplayMoodMode === 'safe' ? 1.4 : 1.0);

        // (4) Mood continuity / novelty bias
        if (autoplayMoodMode === 'explore') {
          if (!recentArtistSet.has(cArtist)) score += 8;
          score += Math.random() * 4;
        } else if (autoplayMoodMode === 'safe') {
          if (trackSignal < -2 || artistSignal < -4) score -= 40;
          if (trackSignal > 0) score += 6;
        } else {
          // flow
          if (!recentArtistSet.has(cArtist)) score += 2;
        }

        return score;
      };

      let pool = Array.isArray(recs) ? recs.slice() : [];

      // Fallback Path: Neural Breadth Search (by artist/title)
      if (pool.length === 0) {
        console.log("[Aether] Primary Discovery failed, broadening signal...");
        const fallbackResults = await window.aether.search(seed.author || seed.title?.split('-')?.[0] || seed.title || 'music');
        pool = Array.isArray(fallbackResults) ? fallbackResults : [];
      }

      if (pool.length > 0) {
        const ranked = pool
          .map((candidate) => ({ candidate, score: buildScore(candidate) }))
          .filter((entry) => entry.score > -3000)
          .sort((a, b) => b.score - a.score);

        if (ranked.length > 0) {
          const topN = autoplayMoodMode === 'safe' ? 2 : autoplayMoodMode === 'flow' ? 3 : Math.min(7, ranked.length);
          const finalists = ranked.slice(0, Math.max(1, topN));
          const selected = autoplayMoodMode === 'explore'
            ? finalists[Math.floor(Math.random() * finalists.length)]
            : finalists[0];

          handleAdd(selected.candidate);
          return;
        }
      }
    } catch (e) {
      console.error("[Aether] Discovery Error:", e);
    } finally {
      setIsAutoplaySeeking(false);
    }
  };

  const fetchQueueRef = useRef(null);
  useEffect(() => {
    fetchQueueRef.current = fetchQueue;
  });

  useEffect(() => {
    if (isStandalone) return undefined;
    const interval = window.setInterval(() => {
        fetchQueueRef.current?.();
        if (isPlayingRef.current) {
            // Heartbeat Sync (NOVA
            axios.post(`${API_BASE}/api/heartbeat/${DEFAULT_GUILD_ID}`, {
                currentTime: Math.max(0, Math.floor(currentTimeRef.current || 0)),
                isPlaying: true
            }).catch(() => {});
        }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [isStandalone]);

  // Autoplay Trigger Logic
  useEffect(() => {
    if (isStandalone && isAutoplayEnabled && queue.length === 0 && !isManualStop && !isAutoplaySeeking) {
        const seed = currentTrack || history[0] || prevTrackRef.current;
        if (seed) {
          console.log('[Aether/Autoplay] Queue empty, triggering autoplay', {
            seedTitle: seed.title,
            seedId: seed.id,
            from: currentTrack ? 'current' : history[0] ? 'history' : 'previous-ref',
          });
          triggerAutoplay(seed);
        }
    }
  }, [queue.length, isAutoplayEnabled, isStandalone, isManualStop, isAutoplaySeeking, currentTrack, history, autoplayMoodMode, skipEvents]);

  useEffect(() => {
    if (!isStandalone || !window.aether?.onSpotifyImportProgress) return;
    const onSpotifyImportProgress = (payload) => {
      appendSpotifyImportLog(`${payload?.stage || 'working'} ${Number.isFinite(payload?.progress) ? `${payload.progress}%` : ''} ${payload?.message || ''}`.trim());
      setSpotifyImportProgress({
        stage: payload?.stage || 'working',
        progress: Number.isFinite(payload?.progress) ? payload.progress : 0,
        message: payload?.message || '',
      });
    };
    const unsubscribe = window.aether.onSpotifyImportProgress(onSpotifyImportProgress);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [appendSpotifyImportLog, isStandalone]);

  // --- AETHER: DYNAMIC THEME SYNC (NOVA ---
  useEffect(() => {
    if (!currentTrack) return;
    let cancelled = false;
    const themeCacheKey = String(currentTrack?.youtubeId || currentTrack?.id || `${currentTrack?.title || ''}|${currentTrack?.author || ''}`);
    const themeImageUrl = String(currentTrack?.thumbnail || '');

    const applyPalette = (palette) => {
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

    const cachedPalette = trackPaletteCacheRef.current.get(themeCacheKey)
      || (themeImageUrl ? trackPaletteCacheRef.current.get(themeImageUrl) : null);
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
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: currentTrack.author,
            album: 'Aether Studio',
            artwork: [{ src: getProxyUrl(currentTrack.thumbnail), sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => { handleControl('resume'); });
        navigator.mediaSession.setActionHandler('pause', () => { handleControl('pause'); });
        navigator.mediaSession.setActionHandler('nexttrack', () => { handleControl('skip'); });
        navigator.mediaSession.setActionHandler('previoustrack', () => { handleControl('previous'); });
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {}
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (isStandalone && window.aether?.getStreamPort) {
        window.aether.getStreamPort().then(port => {
            console.log('[Aether] Neural Streamer linked to port:', port);
            setStreamPort(port);
        });
    }

    // --- NEURAL WATCHER LISTENER (NOVA ---
    if (isStandalone && window.aether?.onLibraryUpdate) {
        window.aether.onLibraryUpdate((event) => {
            console.log("[Aether] Neural Sync detected change:", event);
            // Library refresh logic...
        });
    }

    // --- UNIVERSAL CONTROL RECEIVER (NOVA ---
    if (isStandalone && window.aether?.onControl) {
        window.aether.onControl((action) => {
            console.log("[Aether/Hardware] Action Received:", action);
            if (action === 'volume-up') {
                setVolume(prev => {
                    const nextV = Math.min(1, prev + 0.1);
                    setVolumeToast(true); setTimeout(() => setVolumeToast(false), 2000);
                    if (localAudioRef.current) localAudioRef.current.volume = nextV;
                    window.aether?.store?.set('volume', nextV);
                    return nextV;
                });
            } else if (action === 'volume-down') {
                setVolume(prev => {
                    const nextV = Math.max(0, prev - 0.1);
                    if (localAudioRef.current) localAudioRef.current.volume = nextV;
                    setVolumeToast(true); setTimeout(() => setVolumeToast(false), 2000);
                    window.aether?.store?.set('volume', nextV);
                    return nextV;
                });
            } else if (action === 'mute') {
                setVolume(prev => {
                    const nextV = prev > 0 ? 0 : 0.5;
                    if (localAudioRef.current) localAudioRef.current.volume = nextV;
                    return nextV;
                });
            } else {
                handleControl(action);
            }
        });
    }
  }, [defaultGlobalMediaShortcutsEnabled, isMacPlatform, isStandalone]);

  const fetchQueue = async () => {
    const startedAt = performance.now();
    try {
      const guildId = getEffectiveGuildId();
      const resp = await axios.get(`${API_BASE}/api/queue/${guildId}`);
      
      // Only pull remote queue if acting as Discord client (Standalone manages its own state)
      if (resp.data.songs && !isStandalone) setQueue(resp.data.songs);

      const queueLength = resp.data?.songs?.length || 0;
      if (!isStandalone && queueLength === 0) {
        setIsPlaying(false);
        setCurrentTime(0);
        setCurrentTrackTitle('');
        if (localAudioRef.current) {
          localAudioRef.current.pause();
          localAudioRef.current.removeAttribute('src');
          localAudioRef.current.load();
        }
      }
      
      const serverMs = resp.data.currentMs || 0;
      const liveCurrentTime = currentTimeRef.current;
      const liveIsPlaying = isPlayingRef.current;
      if (!isStandalone && queueLength > 0 && (Math.abs(liveCurrentTime - serverMs) > 1000 || liveCurrentTime === 0)) setCurrentTime(serverMs);
      // Only adopt isPlaying=true from the server (a new song started / resumed).
      // Never let another tab's paused heartbeat silence your local audio.
      // Each tab manages its own pause/resume independently after unlock.
      if (!isStandalone && resp.data.isPlaying === true && !liveIsPlaying) {
        setIsPlaying(true);
      }

      const track = resp.data.songs && resp.data.songs[0];
      if (track && track.title !== currentTrackTitle) {
        console.log("[Aether/Queue] New head track", {
          id: track.id,
          title: track.title,
          author: track.author,
          actualUrl: track.actualUrl,
          url: track.url,
        });
        setCurrentTrackTitle(track.title);
        updateDiscordRichPresence(track, serverMs);
      }

      setDiagnostics(prev => ({
        ...prev,
        lastQueueFetchMs: Math.round(performance.now() - startedAt),
        lastQueueFetchAt: Date.now(),
        lastQueueError: null,
      }));
    } catch (err) {
      console.error("[Aether/Queue] Fetch failed", err, {
        apiBase: API_BASE,
        guildId: getEffectiveGuildId(),
      });
      setDiagnostics(prev => ({
        ...prev,
        lastQueueFetchAt: Date.now(),
        lastQueueError: err?.message || 'queue fetch failed',
      }));
    }
  };

  useEffect(() => {
    const SEQUENCE = 'mixtape';
    const handleKeyDown = (e) => {
      if (e.defaultPrevented || e.repeat || isNativeKeyboardTarget(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!e.key || e.key.length !== 1) {
        typedBufferRef.current = '';
        return;
      }

      const next = `${typedBufferRef.current}${e.key.toLowerCase()}`.slice(-SEQUENCE.length);
      typedBufferRef.current = next;
      if (next === SEQUENCE) {
        typedBufferRef.current = '';
        startTransition(() => setIsMixtapeVaultOpen(true));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const updateDiscordRichPresence = async (track, playbackMs = 0) => {
    if (!discordSdkRef.current) return;
    try {
      if (!track) {
         await discordSdkRef.current.commands.setActivity({
            activity: {
              name: "AH Music",
              type: 0,
              details: "In Music Lobby",
              state: "Searching for Nodes...",
              assets: { large_image: "https://i.imgur.com/8Q8W8Xn.png", large_text: "Aether // Studio" }
            }
         });
         return;
      }
      await discordSdkRef.current.commands.setActivity({
        activity: {
          name: "AH Music",
          type: 2,
          details: track.title.slice(0, 127),
          state: `by ${track.author}`.slice(0, 127),
          assets: {
            large_image: track.thumbnail || "https://cdn.discordapp.com/embed/avatars/0.png",
            large_text: `NOVA // Q: ${queue.length}`.slice(0, 127)
          },
          timestamps: {
            start: Date.now() - playbackMs
          }
        }
      });
    } catch (err) {
      console.warn("[Discord SDK] setActivity failed:", err.message);
    }
  };

  const fetchSystemStats = useCallback(async () => {
    const startedAt = performance.now();
    try {
      if (isStandalone) {
          const stats = await window.aether.getStats();
          setSystemStats(stats);
      } else {
          const resp = await axios.get(`${API_BASE}/api/system`);
          setSystemStats(resp.data);
      }
      setDiagnostics(prev => ({
        ...prev,
        lastSystemFetchMs: Math.round(performance.now() - startedAt),
        lastSystemFetchAt: Date.now(),
        lastSystemError: null,
      }));
    } catch (err) {
      setDiagnostics(prev => ({
        ...prev,
        lastSystemFetchAt: Date.now(),
        lastSystemError: err?.message || 'system fetch failed',
      }));
    }
  }, [isStandalone]);

  useEffect(() => {
    if (isStandalone) return undefined;
    const controller = new AbortController();
    const wakeBackend = async () => {
      const startedAt = performance.now();
      try {
        await fetch(`${API_BASE}/api/system`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        setDiagnostics(prev => ({
          ...prev,
          lastSystemFetchMs: Math.round(performance.now() - startedAt),
          lastSystemFetchAt: Date.now(),
          lastSystemError: null,
        }));
      } catch (err) {
        if (controller.signal.aborted) return;
        setDiagnostics(prev => ({
          ...prev,
          lastSystemFetchAt: Date.now(),
          lastSystemError: err?.message || 'backend wake failed',
        }));
      }
    };
    wakeBackend();
    return () => controller.abort();
  }, [isStandalone]);

  useEffect(() => {
    if (!isDiagnosticsOpen) return undefined;
    fetchSystemStats();
    const statsInterval = window.setInterval(fetchSystemStats, 10000);
    return () => window.clearInterval(statsInterval);
  }, [fetchSystemStats, isDiagnosticsOpen]);

  const refreshStorageStats = useCallback(async () => {
    if (!isStandalone || !window.aether?.getStorageStats) return;
    try {
      const res = await window.aether.getStorageStats();
      if (res?.success) {
        setStorageStats(res);
        if (res?.policy) {
          setStoragePolicy({
            cacheCapMb: res.policy.cacheCapMb || 2048,
            maxCacheAgeDays: res.policy.maxCacheAgeDays || 30,
          });
        }
      }
    } catch (e) {
      console.warn('[Aether/Storage] stats fetch failed', e);
    }
  }, [isStandalone]);

  const refreshEngineStatus = useCallback(async () => {
    if (!isStandalone || !window.aether?.getEngineStatus) return;
    try {
      const res = await window.aether.getEngineStatus();
      if (res?.success) {
        setEngineStatus(res);
      }
    } catch (e) {
      console.warn('[Aether/Diagnostics] engine status fetch failed', e);
    }
  }, [isStandalone]);

  const handleImportCookies = useCallback(async () => {
    if (!isStandalone || !window.aether?.importCookies) return;
    try {
      const res = await window.aether.importCookies();
      if (res?.canceled) return;
      await refreshEngineStatus();

      if (res?.success) {
        const audit = res?.cookieAudit;
        const message = audit?.valid
          ? `Cookies imported • ${audit.summary || 'format looks valid'}`
          : `Cookies imported • ${audit?.summary || 'please verify the file format'}`;
        appendRecentEvent('cookies_imported', audit?.summary || 'Cookie session updated', { tone: audit?.valid ? 'success' : 'warning' });
        setLastAdded(message);
        setTimeout(() => setLastAdded(null), 2800);
        if (audit?.valid) {
          setOauthPrompt(null);
        }
        return;
      }

      appendRecentEvent('cookies_failed', res?.error || 'Cookie import failed', { tone: 'error' });
      setLastAdded(`Cookie import failed${res?.error ? `: ${String(res.error).slice(0, 42)}` : ''}`);
      setTimeout(() => setLastAdded(null), 2800);
    } catch (e) {
      console.warn('[Aether/Cookies] import failed', e);
      appendRecentEvent('cookies_failed', e?.message || 'Cookie import failed', { tone: 'error' });
      setLastAdded('Cookie import failed');
      setTimeout(() => setLastAdded(null), 2500);
    }
  }, [appendRecentEvent, isStandalone, refreshEngineStatus]);

  const handleCopyDiagnosticsValue = useCallback(async (value, successLabel = 'Copied to clipboard') => {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', 'true');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setLastAdded(successLabel);
      appendRecentEvent('copied', successLabel, { tone: 'success' });
      setTimeout(() => setLastAdded(null), 1800);
    } catch (error) {
      console.warn('[Aether/Diagnostics] clipboard copy failed', error);
      appendRecentEvent('copy_failed', error?.message || 'Clipboard copy failed', { tone: 'error' });
      setLastAdded('Clipboard copy failed');
      setTimeout(() => setLastAdded(null), 1800);
    }
  }, [appendRecentEvent]);

  const applyStoragePolicy = useCallback(async (nextPolicy) => {
    if (!isStandalone || !window.aether?.updateStoragePolicy) return;
    try {
      const res = await window.aether.updateStoragePolicy(nextPolicy);
      if (res?.success && res?.policy) {
        setStoragePolicy({
          cacheCapMb: res.policy.cacheCapMb,
          maxCacheAgeDays: res.policy.maxCacheAgeDays,
        });
      }
    } catch (e) {
      console.warn('[Aether/Storage] policy update failed', e);
    }
  }, [isStandalone]);

  const refreshStorageEstimate = useCallback(async () => {
    if (!isStandalone || !window.aether?.getStorageEstimate) return;
    try {
      const [capRes, ageRes, downloadsRes] = await Promise.all([
        window.aether.getStorageEstimate({ mode: 'cap', cacheCapMb: storagePolicy.cacheCapMb }),
        window.aether.getStorageEstimate({ mode: 'age', maxCacheAgeDays: storagePolicy.maxCacheAgeDays }),
        window.aether.getStorageEstimate({ mode: 'downloads-only' }),
      ]);

      setStorageEstimate({
        cap: capRes?.success ? capRes : null,
        age: ageRes?.success ? ageRes : null,
        downloadsOnly: downloadsRes?.success ? downloadsRes : null,
      });
    } catch (e) {
      console.warn('[Aether/Storage] estimate fetch failed', e);
    }
  }, [isStandalone, storagePolicy.cacheCapMb, storagePolicy.maxCacheAgeDays]);

  const runStorageOptimize = useCallback(async (mode) => {
    if (!isStandalone || !window.aether?.optimizeStorage) return;
    setIsStorageBusy(true);
    try {
      const payload = mode === 'cap'
        ? { mode, cacheCapMb: storagePolicy.cacheCapMb }
        : mode === 'age'
          ? { mode, maxCacheAgeDays: storagePolicy.maxCacheAgeDays }
          : { mode };
      const res = await window.aether.optimizeStorage(payload);
      if (res?.success) {
        setLastAdded(`Storage optimized • ${mode}`);
        setTimeout(() => setLastAdded(null), 2200);
      }
      await refreshStorageStats();
      await refreshStorageEstimate();
    } catch (e) {
      console.warn('[Aether/Storage] optimize failed', e);
    } finally {
      setIsStorageBusy(false);
    }
  }, [isStandalone, refreshStorageEstimate, refreshStorageStats, storagePolicy.cacheCapMb, storagePolicy.maxCacheAgeDays]);

  const refreshOfflineDownloads = useCallback(async () => {
    if (!isStandalone) return;
    try {
      if (window.aether?.getOfflineDownloads) {
        const res = await window.aether.getOfflineDownloads();
        if (res?.success && Array.isArray(res.downloads)) {
          setOfflineDownloads(res.downloads);
          return;
        }
      }

      setOfflineDownloads((downloadedTracks || []).map((id) => ({
        id,
        fileName: `${id}.m4a`,
        filePath: '',
        bytes: 0,
        modifiedAt: 0,
      })));
    } catch (e) {
      console.warn('[Aether/Storage] offline downloads fetch failed', e);
    }
  }, [downloadedTracks, isStandalone]);



  useEffect(() => {
    let interval;
    if (isPlaying && currentTrack && !isAudioBuffering && !videoMode && !localAudioRef.current) {
        interval = window.setInterval(() => setCurrentTime((prev) => prev + 500), 500);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isPlaying, currentTrack, isAudioBuffering, setCurrentTime, videoMode]);

  useEffect(() => {
    if (!lyrics || lyrics.length === 0) {
      setActiveLyricIndex(-1);
      return undefined;
    }

    const offsetMs = (currentTrack?.introOffsetMs || 0) + (lyricOffsetMs || 0);
    const updateActiveLyric = () => {
      const liveMs = getActivePlaybackPositionMs();
      const idx = lyrics.findLastIndex((line) => line.time <= (liveMs - offsetMs));
      setActiveLyricIndex((prev) => (idx !== -1 && idx !== prev ? idx : prev));
    };

    updateActiveLyric();
    if (!isPlaying && !isLyricsExpanded) return undefined;

    const interval = window.setInterval(updateActiveLyric, 250);
    return () => window.clearInterval(interval);
  }, [currentTrack?.introOffsetMs, getActivePlaybackPositionMs, isLyricsExpanded, isPlaying, lyrics, lyricOffsetMs]);

  const centerCompactLyrics = useCallback((behavior = 'smooth') => {
    if (!activeLyricRef.current || !lyricsContainerRef.current) return;
    const activeLine = activeLyricRef.current;
    const container = lyricsContainerRef.current;
    const rawTop = activeLine.offsetTop - (container.offsetHeight / 2) + (activeLine.offsetHeight / 2);
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(maxTop, rawTop));
    container.scrollTo({ top: targetTop, behavior });
  }, []);

  const centerImmersiveLyrics = useCallback((behavior = 'smooth') => {
    if (!expandedActiveRef.current || !expandedContainerRef.current) return;
    const activeLine = expandedActiveRef.current;
    const container = expandedContainerRef.current;
    const rawTop = activeLine.offsetTop - (container.offsetHeight / 2) + (activeLine.offsetHeight / 2);
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(maxTop, rawTop));
    container.scrollTo({ top: targetTop, behavior });
  }, []);

  const handleResyncLyrics = useCallback(() => {
    setIsAutoScrollPaused(false);

    // Immediate lock + settle pass.
    requestAnimationFrame(() => {
      centerCompactLyrics('auto');
      centerImmersiveLyrics('auto');
      setTimeout(() => {
        centerImmersiveLyrics('smooth');
      }, 90);
    });
  }, [centerCompactLyrics, centerImmersiveLyrics]);

  useEffect(() => {
    // Immersive mode should stay locked and centered unless user explicitly pauses elsewhere.
    if (isLyricsExpanded) {
      setIsAutoScrollPaused(false);
      closeHeaderSurfaces();
    }
  }, [isLyricsExpanded, closeHeaderSurfaces]);

  useLayoutEffect(() => {
    let raf1;
    let raf2;

    // Normal Sync (Bounded Scroll)
    if (!isAutoScrollPaused && activeLyricRef.current && lyricsContainerRef.current) {
        centerCompactLyrics('smooth');
    }
    // Expanded Sync (Bounded Scroll with Header Offset)
    if ((!isAutoScrollPaused || isLyricsExpanded) && expandedActiveRef.current && expandedContainerRef.current) {
        // First pass immediately, second pass after animation settles one more frame.
        centerImmersiveLyrics(activeLyricIndex <= 1 ? 'auto' : 'smooth');
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            centerImmersiveLyrics('auto');
          });
        });
    }

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [activeLyricIndex, isAutoScrollPaused, isLyricsExpanded, centerCompactLyrics, centerImmersiveLyrics]);

  useEffect(() => {
    if (!isLyricsExpanded || !expandedActiveRef.current || activeLyricIndex < 0 || !lyrics[activeLyricIndex]) return undefined;

    let raf = 0;
    let lastPaintAt = 0;
    const lyric = lyrics[activeLyricIndex];
    const nextLyricLine = lyrics[activeLyricIndex + 1];
    const durationMs = nextLyricLine ? Math.max(100, nextLyricLine.time - lyric.time) : 4000;
    const startMs = lyric.time + (currentTrack?.introOffsetMs || 0) + (lyricOffsetMs || 0);

    const updateKaraokeFill = (now) => {
      const activeLine = expandedActiveRef.current;
      if (activeLine && now - lastPaintAt >= 16) {
        const currentMs = getActivePlaybackPositionMs();
        const fillPercent = Math.max(0, Math.min(100, ((currentMs - startMs) / durationMs) * 100));
        activeLine.style.setProperty('--karaoke-fill', `${fillPercent.toFixed(1)}%`);
        lastPaintAt = now;
      }
      raf = requestAnimationFrame(updateKaraokeFill);
    };

    raf = requestAnimationFrame(updateKaraokeFill);

    return () => {
      cancelAnimationFrame(raf);
      expandedActiveRef.current?.style.removeProperty('--karaoke-fill');
    };
  }, [activeLyricIndex, currentTrack?.introOffsetMs, getActivePlaybackPositionMs, isLyricsExpanded, lyricOffsetMs, lyrics]);

  const parseLRC = (lrcString) => {
    if (!lrcString) return [];
    const lines = lrcString.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/;
    
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const mins = parseInt(match[1]);
        const secs = parseInt(match[2]);
        const ms = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]);
        const time = (mins * 60 + secs) * 1000 + ms;
        const text = line.replace(timeRegex, '').trim();
        if (text) result.push({ time, text });
      }
    });
    setLyrics(result);
  };

  function getTrackFallbackPalette(track) {
    const seed = String(track?.thumbnail || track?.youtubeId || track?.actualUrl || track?.url || `${track?.title || ''}|${track?.author || ''}`).trim() || 'aether';
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return buildTrackPaletteFromRgb(hslToRgb(hue, 100, 58));
  }

  const fetchLyrics = async (trackTitle, trackAuthor, trackDuration, trackUrl, trackKey = '') => {
    if (!trackTitle) return;
    const manualKey = trackKey || currentTrackPresetKey;
    const requestId = ++lyricsFetchRequestRef.current;
    if (manualKey && (manualLyricsStoreRef.current?.[manualKey]?.lines || []).length > 0) {
      setIsLyricsLoading(false);
      return;
    }
    const startedAt = performance.now();
    setIsLyricsLoading(true);
    try {
      const normalizedTitle = String(trackTitle)
        .replace(/\(official[^)]*\)/gi, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\(lyrics?\)/gi, '')
        .replace(/\(audio\)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      console.log("[Aether/Lyrics] Fetch start", {
        trackTitle,
        normalizedTitle,
        trackAuthor,
        trackDuration,
        trackUrl,
        isStandalone,
      });
      if (isStandalone) {
          const results = await window.aether.getLyrics(trackTitle, trackAuthor, trackDuration, trackTitle, trackUrl);
          // Backend returns { lyrics: Array<{time, text}>, source: string } OR Array directly
          const lyricsArray = Array.isArray(results) ? results : (results?.lyrics || []);
          if (lyricsFetchRequestRef.current !== requestId) return;
          if (manualKey && (manualLyricsStoreRef.current?.[manualKey]?.lines || []).length > 0) {
            setIsLyricsLoading(false);
            return;
          }
          console.log("[Aether/Lyrics] Standalone result", {
            count: lyricsArray.length,
            source: results?.source,
          });
          setLyrics(lyricsArray);
          setDiagnostics(prev => ({
            ...prev,
            lastLyricsSource: results?.source || 'local',
            lastLyricsFetchMs: Math.round(performance.now() - startedAt),
            lastLyricsFetchAt: Date.now(),
            lastLyricsError: null,
          }));
          setIsLyricsLoading(false);
          return;
      }
      const query = `${normalizedTitle || trackTitle} ${trackAuthor || ''}`.trim();
      const resp = await fetch(`${API_BASE}/api/lyrics?track=${encodeURIComponent(normalizedTitle || trackTitle)}&artist=${encodeURIComponent(trackAuthor || '')}&duration=${(trackDuration || 0)/1000}&url=${encodeURIComponent(trackUrl || '')}&query=${encodeURIComponent(query)}&format=json`);
      const data = await resp.json();
      if (lyricsFetchRequestRef.current !== requestId) return;
      if (manualKey && (manualLyricsStoreRef.current?.[manualKey]?.lines || []).length > 0) {
        setIsLyricsLoading(false);
        return;
      }
      console.log("[Aether/Lyrics] Web result", {
        ok: resp.ok,
        status: resp.status,
        count: Array.isArray(data) ? data.length : 0,
        sample: Array.isArray(data) ? data[0] : data,
      });
      setLyrics(Array.isArray(data) ? data : []);
      setDiagnostics(prev => ({
        ...prev,
        lastLyricsSource: data?.source || 'api',
        lastLyricsFetchMs: Math.round(performance.now() - startedAt),
        lastLyricsFetchAt: Date.now(),
        lastLyricsError: null,
      }));
    } catch (err) {
      if (lyricsFetchRequestRef.current !== requestId) return;
      console.error("[Aether/Lyrics] Fetch failed", err, {
        trackTitle,
        trackAuthor,
        trackDuration,
        trackUrl,
      });
      setLyrics([]);
      setDiagnostics(prev => ({
        ...prev,
        lastLyricsFetchAt: Date.now(),
        lastLyricsError: err?.message || 'lyrics fetch failed',
      }));
    } finally {
      if (lyricsFetchRequestRef.current === requestId) {
        setIsLyricsLoading(false);
      }
    }
  };

  const closeTopmostOverlay = useCallback(() => {
    if (headerControlsRef.current?.isOpen()) {
      headerControlsRef.current.close();
      return true;
    }
    if (sleepTimerControlsRef.current?.isOpen()) {
      sleepTimerControlsRef.current.close();
      return true;
    }
    if (soundCapsuleRef.current?.isOpen()) {
      soundCapsuleRef.current.close();
      return true;
    }
    if (feedbackRef.current?.isOpen()) {
      feedbackRef.current.close();
      return true;
    }
    if (gestureLabRef.current?.isOpen()) {
      gestureLabRef.current.close();
      return true;
    }
    if (appLockSettingsRef.current?.isOpen()) {
      appLockSettingsRef.current.close();
      return true;
    }
    if (oauthPrompt) {
      setOauthPrompt(null);
      return true;
    }
    if (isShortcutSettingsOpen) {
      closeShortcutSettings();
      return true;
    }
    if (isTipsOverlayOpen) {
      closeTipsOverlay();
      return true;
    }
    if (isSharedSceneOpen) {
      setIsSharedSceneOpen(false);
      return true;
    }
    if (isFeedbackOpen) {
      setIsFeedbackOpen(false);
      return true;
    }
    if (isGestureLabOpen) {
      setIsGestureLabOpen(false);
      return true;
    }
    if (inspectTarget) {
      setInspectTarget(null);
      return true;
    }
    if (isAuraStageOpen) {
      setIsAuraStageOpen(false);
      return true;
    }
    if (isLibraryOverlayOpen) {
      setIsLibraryOverlayOpen(false);
      setLibraryActionTarget(null);
      return true;
    }
    if (isPlayerOverlayOpen) {
      setIsPlayerOverlayOpen(false);
      return true;
    }
    if (isViewingFullPlaylist) {
      setIsViewingFullPlaylist(null);
      return true;
    }
    if (isViewingFullQueue) {
      setIsViewingFullQueue(false);
      return true;
    }
    if (isViewingFullDiscovery) {
      setIsViewingFullDiscovery(false);
      return true;
    }
    if (isMixtapeVaultOpen) {
      setIsMixtapeVaultOpen(false);
      return true;
    }
    if (isManualLyricsRawEditorOpen) {
      setIsManualLyricsRawEditorOpen(false);
      return true;
    }
    if (isManualLyricsEditorOpen) {
      setIsManualLyricsEditorOpen(false);
      return true;
    }
    if (isLockModalOpen && !isLockBusy) {
      setIsLockModalOpen(false);
      return true;
    }
    if (isSpotifyImportOpen && !isSpotifyImporting) {
      setIsSpotifyImportOpen(false);
      return true;
    }
    if (isMiniQueuePeekOpen) {
      setIsMiniQueuePeekOpen(false);
      return true;
    }
    if (activeMenuTrack) {
      setActiveMenuTrack(null);
      return true;
    }
    if (isAutoplayMenuOpen) {
      setIsAutoplayMenuOpen(false);
      return true;
    }
    if (isSleepTimerMenuOpen || isLooksPanelOpen || isDiagnosticsOpen) {
      closeHeaderSurfaces();
      return true;
    }
    if (isLyricsExpanded) {
      setIsLyricsExpanded(false);
      return true;
    }
    if (videoMode === 'cinema') {
      exitVideoMode();
      return true;
    }
    return false;
  }, [
    activeMenuTrack,
    closeHeaderSurfaces,
    closeShortcutSettings,
    closeTipsOverlay,
    exitVideoMode,
    isAutoplayMenuOpen,
    inspectTarget,
    isAuraStageOpen,
    isDiagnosticsOpen,
    isFeedbackOpen,
    isGestureLabOpen,
    isLibraryOverlayOpen,
    isLockBusy,
    isLockModalOpen,
    isLooksPanelOpen,
    isLyricsExpanded,
    isManualLyricsEditorOpen,
    isManualLyricsRawEditorOpen,
    isMiniQueuePeekOpen,
    isMixtapeVaultOpen,
    isPlayerOverlayOpen,
    isSharedSceneOpen,
    isShortcutSettingsOpen,
    isSleepTimerMenuOpen,
    isSpotifyImportOpen,
    isSpotifyImporting,
    isTipsOverlayOpen,
    isViewingFullDiscovery,
    isViewingFullPlaylist,
    isViewingFullQueue,
    oauthPrompt,
    videoMode,
  ]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (!closeTopmostOverlay()) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeTopmostOverlay]);

  useEffect(() => {
    if (!isLooksPanelOpen && !isSleepTimerMenuOpen && !isQualityDropdownOpen) return;
    const onPointerDown = (event) => {
      const target = event.target;
      if (isLooksPanelOpen && looksPanelRef.current && !looksPanelRef.current.contains(target)) {
        setIsLooksPanelOpen(false);
      }
      if (isSleepTimerMenuOpen && sleepTimerMenuRef.current && !sleepTimerMenuRef.current.contains(target)) {
        setIsSleepTimerMenuOpen(false);
      }
      if (isQualityDropdownOpen && qualityDropdownRef.current && !qualityDropdownRef.current.contains(target)) {
        setIsQualityDropdownOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isLooksPanelOpen, isSleepTimerMenuOpen, isQualityDropdownOpen]);

  useEffect(() => {
    if (!isStandalone) return;
    refreshStorageStats();
    refreshStorageEstimate();
    refreshOfflineDownloads();
    refreshEngineStatus();
  }, [isStandalone, refreshEngineStatus, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats]);

  useEffect(() => {
    if (!isStandalone || !isDiagnosticsOpen) return;
    refreshStorageStats();
    refreshStorageEstimate();
    refreshOfflineDownloads();
    refreshEngineStatus();
  }, [isStandalone, isDiagnosticsOpen, refreshEngineStatus, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats]);

  useEffect(() => {
    const currentKey = getTrackActionKey(currentTrack);
    const previousKey = getTrackActionKey(prevTrackRef.current);
    if (currentKey !== previousKey) {
      if (prevTrackRef.current) {
         setHistory(prev => [prevTrackRef.current, ...prev].slice(0, 20)); // Keep last 20
      }
      setCurrentTime(0);
      setCurrentTrackTitle(currentTrack?.title || "");
      prevTrackRef.current = currentTrack || null;
      lyricsFetchRequestRef.current += 1;
    }
    const manualEntry = currentTrackPresetKey ? manualLyricsStoreRef.current?.[currentTrackPresetKey] : null;
    const manualLines = sortManualLyricsLines(manualEntry?.lines || []);
    if (manualLines.length > 0) {
      lyricsFetchRequestRef.current += 1;
      setIsLyricsLoading(false);
      setLyrics(manualLines);
      setDiagnostics((prev) => ({
        ...prev,
        lastLyricsSource: 'manual',
        lastLyricsFetchMs: null,
        lastLyricsFetchAt: manualEntry?.updatedAt || Date.now(),
        lastLyricsError: null,
      }));
    } else if (currentTrack?.syncedLyrics) {
      lyricsFetchRequestRef.current += 1;
      setIsLyricsLoading(false);
      setLyrics(currentTrack.syncedLyrics.lyrics || []);
    } else if (currentTrack?.title) {
      fetchLyrics(currentTrack.title, currentTrack.author, currentTrack.totalDurationMs || currentTrack.duration, currentTrack.actualUrl || currentTrack.url, currentTrackPresetKey);
    } else {
      lyricsFetchRequestRef.current += 1;
      setIsLyricsLoading(false);
      setLyrics([]);
    }
  }, [currentTrack?.title, currentTrack?.id, currentTrack?.youtubeId, currentTrack?.queueNonce, currentTrackPresetKey, currentManualLyricsLines, currentTrack?.syncedLyrics?.lyrics?.length, getTrackActionKey]);

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const str = String(url).trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:v=|\/vi\/|\/v\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const normalizeQueueTrack = useCallback((track) => {
    if (!track) return null;
    const idFromTrack = /^[A-Za-z0-9_-]{11}$/.test(String(track.id || '')) ? String(track.id) : null;
    const rawUrl = track.actualUrl || track.url || '';
    const youtubeId = track.youtubeId || extractYouTubeId(rawUrl) || idFromTrack || extractYouTubeId(track.thumbnail);
    const baseUrl = rawUrl || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '');
    if (!baseUrl && !youtubeId) return null;
    const canonicalUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : baseUrl;
    const stableId = youtubeId || track.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const thumbnail = track.thumbnail || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '');
    const queueNonce = String(track.queueNonce || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    return {
      ...track,
      id: stableId,
      queueNonce,
      youtubeId,
      thumbnail,
      actualUrl: canonicalUrl,
      url: canonicalUrl,
    };
  }, []);

  const favoriteTracksList = useMemo(() => Object.values(favoriteTracks || {}).filter(Boolean), [favoriteTracks]);
  const isViewingFavorites = viewingPlaylist === FAVORITES_PLAYLIST_ID;
  const focusedVaultName = isViewingFavorites ? FAVORITES_PLAYLIST_NAME : viewingPlaylist;
  const focusedVaultTracks = isViewingFavorites ? favoriteTracksList : (viewingPlaylist ? (playlists[viewingPlaylist] || []) : []);
  const librarySearchNeedle = useMemo(() => librarySearchTerm.trim().toLowerCase(), [librarySearchTerm]);
  const soundLedgerTracks = soundCapsuleData?.tracks || {};
  const parseLibraryTime = useCallback((value) => {
    if (!value) return 0;
    const parsed = typeof value === 'number' ? value : Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);
  const getTrackLedgerEntry = useCallback((track) => {
    if (!track) return null;
    const candidates = [
      track.id,
      track.youtubeId,
      normalizeTrackIdentity(track),
      track.youtubeId ? `yt:${track.youtubeId}` : '',
      track.id ? `id:${track.id}` : '',
    ].filter(Boolean);
    for (const key of candidates) {
      if (soundLedgerTracks[key]) return soundLedgerTracks[key];
    }
    return null;
  }, [normalizeTrackIdentity, soundLedgerTracks]);
  const getTrackAddedMs = useCallback((track) => Math.max(
    parseLibraryTime(track?.addedAt),
    parseLibraryTime(track?.createdAt),
    parseLibraryTime(track?.importedAt),
    parseLibraryTime(track?.savedAt),
  ), [parseLibraryTime]);
  const getTrackLastListenedMs = useCallback((track) => {
    const ledgerEntry = getTrackLedgerEntry(track);
    return Math.max(
      parseLibraryTime(track?.lastListenedAt),
      parseLibraryTime(track?.lastListened),
      parseLibraryTime(track?.lastPlayedAt),
      parseLibraryTime(track?.playedAt),
      parseLibraryTime(ledgerEntry?.lastListened),
      parseLibraryTime(ledgerEntry?.lastCompletedAt),
    );
  }, [getTrackLedgerEntry, parseLibraryTime]);
  const getTrackPlayCount = useCallback((track) => {
    const ledgerEntry = getTrackLedgerEntry(track);
    return Math.max(
      0,
      Math.floor(Number(track?.playCount) || 0),
      Math.floor(Number(track?.plays) || 0),
      Math.floor(Number(ledgerEntry?.count) || 0),
    );
  }, [getTrackLedgerEntry]);
  const getPlaylistLibraryStats = useCallback((name) => {
    const tracks = playlists[name] || [];
    let recentlyAddedMs = 0;
    let recentlyListenedMs = 0;
    let lastUpdatedMs = 0;
    let playCount = 0;
    tracks.forEach((track) => {
      const addedMs = getTrackAddedMs(track);
      const listenedMs = getTrackLastListenedMs(track);
      recentlyAddedMs = Math.max(recentlyAddedMs, addedMs);
      recentlyListenedMs = Math.max(recentlyListenedMs, listenedMs);
      lastUpdatedMs = Math.max(
        lastUpdatedMs,
        addedMs,
        listenedMs,
        parseLibraryTime(track?.updatedAt),
        parseLibraryTime(track?.modifiedAt),
      );
      playCount += getTrackPlayCount(track);
    });
    return { recentlyAddedMs, recentlyListenedMs, lastUpdatedMs, playCount };
  }, [getTrackAddedMs, getTrackLastListenedMs, getTrackPlayCount, parseLibraryTime, playlists]);
  const getLibrarySongSortValue = useCallback((entry, sortKey) => {
    const track = entry?.track || entry;
    if (sortKey === 'title') return String(track?.title || '');
    if (sortKey === 'artist') return String(track?.author || '');
    if (sortKey === 'listened-desc') return getTrackLastListenedMs(track);
    if (sortKey === 'added-desc') return getTrackAddedMs(track);
    if (sortKey === 'plays-desc') return getTrackPlayCount(track);
    if (sortKey === 'duration-desc' || sortKey === 'duration-asc') return Number(track?.totalDurationMs || track?.duration || 0);
    return '';
  }, [getTrackAddedMs, getTrackLastListenedMs, getTrackPlayCount]);
  const librarySongEntries = useMemo(() => {
    const entries = [];
    const seen = new Set();
    Object.entries(playlists || {}).forEach(([playlistName, tracks]) => {
      (Array.isArray(tracks) ? tracks : []).forEach((track, index) => {
        const key = normalizeTrackIdentity(track) || `${playlistName}-${index}`;
        const existing = entries.find((entry) => entry.key === key);
        if (existing) {
          if (!existing.playlists.includes(playlistName)) existing.playlists.push(playlistName);
          return;
        }
        seen.add(key);
        entries.push({ key, track, playlists: [playlistName], playlistName, index });
      });
    });
    favoriteTracksList.forEach((track, index) => {
      const key = normalizeTrackIdentity(track) || `${FAVORITES_PLAYLIST_ID}-${index}`;
      const existing = entries.find((entry) => entry.key === key);
      if (existing) {
        existing.isFavorite = true;
        if (!existing.playlists.includes(FAVORITES_PLAYLIST_NAME)) existing.playlists.push(FAVORITES_PLAYLIST_NAME);
        return;
      }
      if (!seen.has(key)) entries.push({ key, track, playlists: [FAVORITES_PLAYLIST_NAME], playlistName: FAVORITES_PLAYLIST_ID, index, isFavorite: true });
    });
    return entries;
  }, [favoriteTracksList, normalizeTrackIdentity, playlists]);
  const libraryVisibleSongEntries = useMemo(() => {
    const matchesSearch = (entry) => {
      if (!librarySearchNeedle) return true;
      const track = entry.track || {};
      const haystack = `${track.title || ''} ${track.author || ''} ${entry.playlists.join(' ')}`.toLowerCase();
      return haystack.includes(librarySearchNeedle);
    };
    const filtered = librarySongEntries.filter((entry) => {
      if (!matchesSearch(entry)) return false;
      if (librarySongFilter === 'favorites') return Boolean(entry.isFavorite);
      if (librarySongFilter === 'played') return getTrackPlayCount(entry.track) > 0 || getTrackLastListenedMs(entry.track) > 0;
      if (librarySongFilter === 'unplayed') return getTrackPlayCount(entry.track) === 0 && getTrackLastListenedMs(entry.track) === 0;
      return true;
    });
    const sorted = [...filtered];
    const byTitle = (a, b) => String(a.track?.title || '').localeCompare(String(b.track?.title || ''));
    if (librarySongSort === 'title') {
      sorted.sort(byTitle);
    } else if (librarySongSort === 'artist') {
      sorted.sort((a, b) => String(a.track?.author || '').localeCompare(String(b.track?.author || '')) || byTitle(a, b));
    } else if (librarySongSort === 'duration-asc') {
      sorted.sort((a, b) => getLibrarySongSortValue(a, librarySongSort) - getLibrarySongSortValue(b, librarySongSort) || byTitle(a, b));
    } else if (['listened-desc', 'added-desc', 'plays-desc', 'duration-desc'].includes(librarySongSort)) {
      sorted.sort((a, b) => getLibrarySongSortValue(b, librarySongSort) - getLibrarySongSortValue(a, librarySongSort) || byTitle(a, b));
    }
    return sorted;
  }, [getLibrarySongSortValue, getTrackLastListenedMs, getTrackPlayCount, librarySearchNeedle, librarySongEntries, librarySongFilter, librarySongSort]);
  const libraryVisiblePlaylistNames = useMemo(() => {
    const matchesSearch = (name) => {
      if (!librarySearchNeedle) return true;
      if (String(name || '').toLowerCase().includes(librarySearchNeedle)) return true;
      return (playlists[name] || []).some((track) => (
        `${track?.title || ''} ${track?.author || ''}`.toLowerCase().includes(librarySearchNeedle)
      ));
    };

    const matchesFilter = (name) => {
      const count = (playlists[name] || []).length;
      if (libraryFilter === 'filled') return count > 0;
      if (libraryFilter === 'empty') return count === 0;
      return true;
    };

    const list = orderedPlaylistNames.filter((name) => matchesSearch(name) && matchesFilter(name));
    const sorted = [...list];
    const byName = (a, b) => a.localeCompare(b);
    if (librarySort === 'name') {
      sorted.sort(byName);
    } else if (librarySort === 'tracks-desc') {
      sorted.sort((a, b) => (playlists[b] || []).length - (playlists[a] || []).length || byName(a, b));
    } else if (librarySort === 'tracks-asc') {
      sorted.sort((a, b) => (playlists[a] || []).length - (playlists[b] || []).length || byName(a, b));
    } else if (librarySort === 'listened-desc') {
      sorted.sort((a, b) => getPlaylistLibraryStats(b).recentlyListenedMs - getPlaylistLibraryStats(a).recentlyListenedMs || byName(a, b));
    } else if (librarySort === 'added-desc') {
      sorted.sort((a, b) => getPlaylistLibraryStats(b).recentlyAddedMs - getPlaylistLibraryStats(a).recentlyAddedMs || byName(a, b));
    } else if (librarySort === 'updated-desc') {
      sorted.sort((a, b) => getPlaylistLibraryStats(b).lastUpdatedMs - getPlaylistLibraryStats(a).lastUpdatedMs || byName(a, b));
    } else if (librarySort === 'plays-desc') {
      sorted.sort((a, b) => getPlaylistLibraryStats(b).playCount - getPlaylistLibraryStats(a).playCount || byName(a, b));
    }
    return sorted;
  }, [getPlaylistLibraryStats, libraryFilter, librarySearchNeedle, librarySort, orderedPlaylistNames, playlists]);
  const showFavoriteLibraryCard = useMemo(() => {
    if (libraryFilter === 'empty') return false;
    if (!librarySearchNeedle) return true;
    if (FAVORITES_PLAYLIST_NAME.toLowerCase().includes(librarySearchNeedle)) return true;
    return favoriteTracksList.some((track) => (
      `${track?.title || ''} ${track?.author || ''}`.toLowerCase().includes(librarySearchNeedle)
    ));
  }, [favoriteTracksList, libraryFilter, librarySearchNeedle]);
  const focusedVaultVisibleTracks = useMemo(() => {
    const focusedNameMatches = String(focusedVaultName || '').toLowerCase().includes(librarySearchNeedle);
    const base = !librarySearchNeedle || focusedNameMatches
      ? focusedVaultTracks
      : focusedVaultTracks.filter((track) => (
        `${track?.title || ''} ${track?.author || ''}`.toLowerCase().includes(librarySearchNeedle)
      ));
    const sorted = [...base];
    if (libraryTrackSort === 'title') {
      sorted.sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (libraryTrackSort === 'artist') {
      sorted.sort((a, b) => String(a?.author || '').localeCompare(String(b?.author || '')) || String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (libraryTrackSort === 'duration-desc') {
      sorted.sort((a, b) => Number(b?.totalDurationMs || b?.duration || 0) - Number(a?.totalDurationMs || a?.duration || 0));
    } else if (libraryTrackSort === 'duration-asc') {
      sorted.sort((a, b) => Number(a?.totalDurationMs || a?.duration || 0) - Number(b?.totalDurationMs || b?.duration || 0));
    } else if (libraryTrackSort === 'listened-desc') {
      sorted.sort((a, b) => getTrackLastListenedMs(b) - getTrackLastListenedMs(a) || String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (libraryTrackSort === 'added-desc') {
      sorted.sort((a, b) => getTrackAddedMs(b) - getTrackAddedMs(a) || String(a?.title || '').localeCompare(String(b?.title || '')));
    } else if (libraryTrackSort === 'plays-desc') {
      sorted.sort((a, b) => getTrackPlayCount(b) - getTrackPlayCount(a) || String(a?.title || '').localeCompare(String(b?.title || '')));
    }
    return sorted;
  }, [focusedVaultName, focusedVaultTracks, getTrackAddedMs, getTrackLastListenedMs, getTrackPlayCount, librarySearchNeedle, libraryTrackSort]);

  const persistFavoriteTracks = useCallback((nextFavorites) => {
    setFavoriteTracks(nextFavorites);
    if (isStandalone) {
      window.aether?.store?.set?.(FAVORITES_STORAGE_KEY, nextFavorites);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
    }
  }, [isStandalone]);

  const isTrackFavorite = useCallback((track) => {
    const key = normalizeTrackIdentity(track);
    return Boolean(key && favoriteTracks?.[key]);
  }, [favoriteTracks, normalizeTrackIdentity]);

  const toggleFavoriteTrack = useCallback((track) => {
    const normalizedTrack = normalizeQueueTrack(track);
    const key = normalizeTrackIdentity(normalizedTrack || track);
    if (!key) return;

    const next = { ...(favoriteTracks || {}) };
    const wasFavorite = Boolean(next[key]);
    if (wasFavorite) delete next[key];
    else next[key] = normalizedTrack || track;

    persistFavoriteTracks(next);
    setLastAdded(wasFavorite ? 'Removed from favorites' : `Favorited: ${(normalizedTrack || track)?.title || 'Track'}`);
    setTimeout(() => setLastAdded(null), 2200);
  }, [favoriteTracks, normalizeQueueTrack, normalizeTrackIdentity, persistFavoriteTracks]);

  const handleFavoriteAddAll = useCallback(() => {
    if (!favoriteTracksList.length) {
      setLastAdded('No favorite tracks yet');
      setTimeout(() => setLastAdded(null), 2200);
      return;
    }
    const normalized = favoriteTracksList.map(normalizeQueueTrack).filter(Boolean);
    setQueue((prev) => {
      const next = [...prev, ...normalized];
      if (prev.length === 0 && normalized.length > 0) setIsPlaying(true);
      return next;
    });
    setIsManualStop(false);
    setLastAdded(`Queued Favorites (${normalized.length})`);
    setTimeout(() => setLastAdded(null), 2600);
  }, [favoriteTracksList, normalizeQueueTrack]);

  const handleRemoveTrackFromPlaylist = useCallback((name, track, fallbackIndex = -1) => {
    if (name === FAVORITES_PLAYLIST_ID) {
      if (track) toggleFavoriteTrack(track);
      return;
    }
    const tracks = playlists[name] || [];
    const key = normalizeTrackIdentity(track);
    const resolvedIndex = key ? tracks.findIndex((item) => normalizeTrackIdentity(item) === key) : fallbackIndex;
    if (resolvedIndex < 0) return;
    handleRemoveFromPlaylist(name, resolvedIndex);
  }, [handleRemoveFromPlaylist, normalizeTrackIdentity, playlists, toggleFavoriteTrack]);

  const handleSearch = async (eventOrQuery) => {
    if (eventOrQuery?.preventDefault) eventOrQuery.preventDefault();
    const submittedQuery = typeof eventOrQuery === 'string' ? eventOrQuery : searchQuery;
    const normalizedQuery = submittedQuery.trim();
    if (!normalizedQuery) return;
    setSearchQuery(normalizedQuery);
    setIsSearching(true);
    setHasCompletedSearch(true);
    try {
      if (isStandalone) {
          const results = await window.aether.search(normalizedQuery);
          setSearchResults(Array.isArray(results) ? results : []);
      } else {
          const resp = await axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(normalizedQuery)}`);
          setSearchResults(Array.isArray(resp.data) ? resp.data : []);
      }
      if (isMobileSearchOpen) setIsMobileSearchOpen(false);
    } catch (err) {
        console.error("[Search] Failed:", err);
        if (isStandalone) {
            alert(`NEURAL SYSTEM ERROR\n- Message: ${err.message}\n- Status: Binary pathing issue or process blocked.\n- Try: Restarting Aether from Applications.`);
        }
    } finally { setIsSearching(false); }
  };

  const clearDiscoveryResults = useCallback(() => {
    setSearchResults([]);
    setHasCompletedSearch(false);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) return;
    if (searchResults.length > 0 || !hasCompletedSearch) return;
    setHasCompletedSearch(false);
  }, [searchQuery, searchResults.length, hasCompletedSearch]);

  // -- NEURAL DISCOVERY (AUTO-FETCH) --
  useEffect(() => {
    if (!currentTrack || !isStandalone || !window.aether?.search) return;
    const fetchNeural = async () => {
      try {
        const query = currentTrack.author || currentTrack.title?.split('-')?.[0] || 'music';
        const res = await window.aether.search(query);
        if (Array.isArray(res)) {
          const filtered = res.filter(t => t.id !== currentTrack.id && t.youtubeId !== currentTrack.youtubeId);
          setNeuralRecommendations(filtered.slice(0, 15));
        }
      } catch (e) {
        console.error('[Aether] Neural fetch failed', e);
      }
    };
    fetchNeural();
  }, [currentTrack?.title, currentTrack?.author, currentTrack?.id, currentTrack?.youtubeId, isStandalone]);

  const warmupTrack = async (track) => {
    if (!window.aether?.download || !track || isWarmupUnavailable) return;
    const derivedYoutubeId = track.youtubeId || extractYouTubeId(track.actualUrl || track.url || track.id);
    const idFromTrack = /^[A-Za-z0-9_-]{11}$/.test(String(track.id || '')) ? String(track.id) : null;
    const canonicalYoutubeId = derivedYoutubeId || idFromTrack;
    const id = canonicalYoutubeId || track.id;
    const sourceUrl = canonicalYoutubeId
      ? `https://www.youtube.com/watch?v=${canonicalYoutubeId}`
      : (track.actualUrl || track.url);
    const title = track.title || 'Unknown';
    if (!id || !sourceUrl) return;

    const retryGate = warmupRetryRef.current.get(id);
    if (retryGate && Date.now() < retryGate.nextTryAt) {
      return;
    }

    if (downloadedTracks.includes(id)) {
      console.log(`[Aether] Warmup skipped because already downloaded: ${title} (${id})`);
      return;
    }
    setWarmingTrackIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      console.log(`[Aether] Warmup download request for ${title} (${id})`);
      const result = await window.aether.download(sourceUrl, id);
      console.log(`[Aether] Warmup result for ${id}:`, result);
      if (result?.success) {
        warmupRetryRef.current.delete(id);
        setDownloadedTracks(prev => Array.from(new Set([...prev, id])));
      } else if (String(result?.error || '').toLowerCase().includes('yt-dlp unavailable') || String(result?.error || '').toLowerCase().includes('enoent')) {
        const prev = warmupRetryRef.current.get(id);
        const failures = (prev?.failures || 0) + 1;
        warmupRetryRef.current.set(id, { failures, nextTryAt: Date.now() + Math.min(180000, 12000 * failures) });
        setIsWarmupUnavailable(true);
        setLastAdded('Warmup unavailable: yt-dlp missing');
        setTimeout(() => setLastAdded(null), 2400);
      } else {
        const prev = warmupRetryRef.current.get(id);
        const failures = (prev?.failures || 0) + 1;
        const err = String(result?.error || '').toLowerCase();
        const baseDelay = /403|416|resolve|nodename|throttled|ffmpeg|ffprobe/.test(err) ? 20000 : 6000;
        warmupRetryRef.current.set(id, { failures, nextTryAt: Date.now() + Math.min(180000, baseDelay * failures) });
      }
    } catch (err) {
      console.error(`[Aether] Warmup download failed for ${title} (${id})`, err);
      const prev = warmupRetryRef.current.get(id);
      const failures = (prev?.failures || 0) + 1;
      warmupRetryRef.current.set(id, { failures, nextTryAt: Date.now() + Math.min(180000, 10000 * failures) });
    } finally {
      setWarmingTrackIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const resolveWarmupTrackId = useCallback((track) => {
    if (!track) return null;
    const derivedYoutubeId = track.youtubeId || extractYouTubeId(track.actualUrl || track.url || track.id);
    const idFromTrack = /^[A-Za-z0-9_-]{11}$/.test(String(track.id || '')) ? String(track.id) : null;
    return derivedYoutubeId || idFromTrack || track.id || null;
  }, []);

  const downloadLabelById = useMemo(() => {
    const map = new Map();
    const addTrack = (track) => {
      const id = resolveWarmupTrackId(track);
      if (!id || map.has(id)) return;
      map.set(id, {
        title: track?.title || id,
        author: track?.author || 'Unknown',
      });
    };

    queue.forEach(addTrack);
    Object.values(playlists || {}).forEach((tracks) => {
      (Array.isArray(tracks) ? tracks : []).forEach(addTrack);
    });

    return map;
  }, [playlists, queue, resolveWarmupTrackId]);

  const removeDownloadedById = useCallback(async (resolvedId, label = '') => {
    if (!isStandalone || !window.aether?.removeOfflineTrack || !resolvedId || isOfflineRemovalBusy) return;

    setIsOfflineRemovalBusy(true);
    setWarmingTrackIds(prev => {
      const next = new Set(prev);
      next.delete(resolvedId);
      return next;
    });

    try {
      const response = await window.aether.removeOfflineTrack(resolvedId);
      if (!response?.success) {
        throw new Error(response?.error || response?.result?.error || 'Failed to remove downloaded track');
      }

      const downloaded = Array.isArray(response?.downloaded) ? response.downloaded : [];
      setDownloadedTracks(downloaded);
      warmupRetryRef.current.delete(resolvedId);

      await refreshOfflineDownloads();
      await refreshStorageStats();
      await refreshStorageEstimate();

      setLastAdded(`Removed download • ${label || resolvedId}`);
      setTimeout(() => setLastAdded(null), 2200);
    } catch (err) {
      console.error('[Aether/Storage] Failed to remove downloaded track', err);
      setLastAdded(`Remove failed${err?.message ? `: ${String(err.message).slice(0, 42)}` : ''}`);
      setTimeout(() => setLastAdded(null), 2600);
    } finally {
      setIsOfflineRemovalBusy(false);
    }
  }, [isOfflineRemovalBusy, isStandalone, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats]);

  const clearAllDownloadedTracks = useCallback(async () => {
    if (!isStandalone || !window.aether?.clearOfflineDownloads || isOfflineRemovalBusy) return;
    setIsOfflineRemovalBusy(true);
    setIsOfflineDownloadsBusy(true);
    try {
      const response = await window.aether.clearOfflineDownloads();
      if (!response?.success) {
        throw new Error(response?.error || response?.result?.error || 'Failed to clear downloads');
      }

      const downloaded = Array.isArray(response?.downloaded) ? response.downloaded : [];
      setDownloadedTracks(downloaded);
      setWarmingTrackIds(new Set());
      warmupRetryRef.current.clear();

      await refreshOfflineDownloads();
      await refreshStorageStats();
      await refreshStorageEstimate();

      setLastAdded('Cleared all downloaded tracks');
      setTimeout(() => setLastAdded(null), 2300);
    } catch (err) {
      console.error('[Aether/Storage] Failed to clear all downloaded tracks', err);
      setLastAdded(`Clear failed${err?.message ? `: ${String(err.message).slice(0, 42)}` : ''}`);
      setTimeout(() => setLastAdded(null), 2800);
    } finally {
      setIsOfflineDownloadsBusy(false);
      setIsOfflineRemovalBusy(false);
    }
  }, [isOfflineRemovalBusy, isStandalone, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats]);

  const handleAdd = async (track) => {
    if (isStandalone) {
        const addStartTime = Date.now();
        const newTrack = normalizeQueueTrack(track);
        if (!newTrack) {
          console.warn('[Aether/Queue] Ignored add: track has no playable URL', track);
          return;
        }
        const url = newTrack.actualUrl || newTrack.url;
        const stableId = newTrack.id;
        const queueNonce = newTrack.queueNonce;
        console.log(`[Aether] Adding standalone track to queue: ${newTrack.title} (${url}) -> id=${stableId}`);
        setQueue(prev => {
            const next = [...prev, newTrack];
            if (next.length === 1) setIsPlaying(true);
            setIsManualStop(false); // Reset on manual add
            return next;
        });
        console.log(`[Aether] Track queued in ${Date.now() - addStartTime}ms`);
        setLastAdded(track.title);
        setTimeout(() => setLastAdded(null), 3000);

        warmupTrack({ ...newTrack, id: stableId, actualUrl: url, url, title: track.title });

        // --- AETHER: NEURAL METADATA SYNC (NOVA ---
        window.aether.getMetadata(newTrack.actualUrl || newTrack.url).then(fullTrack => {
            if (fullTrack) {
                setQueue(current => current.map(item => 
              item.queueNonce === queueNonce ? mergeTrackMetadata(item, fullTrack) : item
                ));
            }
        });
        return;
    }

    const effectiveGuildId = getEffectiveGuildId();
    
    setAddingIds(prev => new Set(prev).add(track.id));
    try {
      console.log("[Aether/Add] Web add request", {
        effectiveGuildId,
        trackId: track.id,
        title: track.title,
        author: track.author,
        actualUrl: track.actualUrl,
        url: track.url,
      });
      await axios.post(`${API_BASE}/api/add/${effectiveGuildId}`, { track, userId: auth?.user?.id });
      console.log("[Aether/Add] Track posted, sending resume", { effectiveGuildId });
      await axios.post(`${API_BASE}/api/control/${effectiveGuildId}`, { action: 'resume' }).catch(() => {});
      setIsPlaying(true);
      setIsManualStop(false);
      fetchQueue();
      setLastAdded(track.title);
      setTimeout(() => setLastAdded(null), 3000);
    } catch (err) {} finally {
      setAddingIds(prev => { const next = new Set(prev); next.delete(track.id); return next; });
      setIsAutoplaySeeking(false);
    }
  };
  const handleSetSleepTimer = useCallback((minutes) => {
      const nextVal = Number(minutes) || 0;
      setSleepTimerValue(nextVal);
      if (nextVal <= 0) {
        setSleepDeadline(null);
        setSleepRemainingStr('');
        if (localAudioRef.current) localAudioRef.current.volume = volume;
        setLastAdded('Sleep timer disabled');
      } else {
        setSleepDeadline(Date.now() + nextVal * 60 * 1000);
        setSleepRemainingStr(`${nextVal}:00`);
        setLastAdded(`Sleep timer set • ${nextVal}m`);
      }
      setTimeout(() => setLastAdded(null), 1800);
      setIsSleepTimerMenuOpen(false);
      setIsSleepTimerOverlayOpen(false);
    }, [volume]);

  useEffect(() => {
      if (!sleepDeadline) return;
      const int = setInterval(() => {
          const remainingMs = sleepDeadline - Date.now();
          if (remainingMs <= 0) {
              setSleepDeadline(null);
              setSleepTimerValue(0);
              setSleepRemainingStr('');
              handleControl('pause');
              if (localAudioRef.current) localAudioRef.current.volume = volume;
          } else if (sleepFadeEnabled && remainingMs <= 10000) {
              const fadeRatio = remainingMs / 10000;
              if (localAudioRef.current) localAudioRef.current.volume = volume * fadeRatio;
              setSleepRemainingStr('FADING...');
          } else {
              if (localAudioRef.current && localAudioRef.current.volume !== volume) localAudioRef.current.volume = volume;
              const m = Math.floor(remainingMs / 60000);
              const s = Math.floor((remainingMs % 60000) / 1000);
              setSleepRemainingStr(`${m}:${s.toString().padStart(2, '0')}`);
          }
      }, 1000);
      return () => clearInterval(int);
  }, [sleepDeadline, volume, sleepFadeEnabled]);

  const handleExportVault = async (playlistName, overrideTracks = null) => {
      if (!isStandalone || !window.aether?.exportVault) {
        setLastAdded('Vault export unavailable');
        setTimeout(() => setLastAdded(null), 2200);
        return;
      }
      const exportName = playlistName === FAVORITES_PLAYLIST_ID ? FAVORITES_PLAYLIST_NAME : playlistName;
      const data = Array.isArray(overrideTracks)
        ? overrideTracks
        : (playlistName === FAVORITES_PLAYLIST_ID ? favoriteTracksList : (playlists[playlistName] || []));
      const res = await window.aether.exportVault(exportName, data);
      if (res?.success) {
        setLastAdded(`Exported vault: ${exportName}`);
        setTimeout(() => setLastAdded(null), 2600);
      } else if (res?.cancel) {
        setLastAdded('Vault export cancelled');
        setTimeout(() => setLastAdded(null), 1800);
      } else {
        setLastAdded(`Export failed${res?.error ? `: ${String(res.error).slice(0, 36)}` : ''}`);
        setTimeout(() => setLastAdded(null), 3000);
      }
  };

  const handleImportVault = async () => {
      if (!isStandalone || !window.aether?.importVault) {
        setLastAdded('Vault import unavailable');
        setTimeout(() => setLastAdded(null), 2200);
        return;
      }
      const res = await window.aether.importVault();
      if (res?.success && res.data && Array.isArray(res.data)) {
          const normalized = res.data.map(normalizeQueueTrack).filter(Boolean);
          const importName = buildUniquePlaylistName(res.name || 'Imported Vault', playlists);
          const p = { ...playlists };
          p[importName] = normalized;
          setPlaylists(p);
          window.aether?.store?.set('playlists', p);
          if (!playlistOrder.includes(importName)) {
            persistPlaylistOrder([...playlistOrder, importName]);
          }
          setViewingPlaylist(importName);
          setLastAdded(`Imported vault: ${importName} (${normalized.length})`);
          setTimeout(() => setLastAdded(null), 2800);
      } else if (res?.cancel) {
          setLastAdded('Vault import cancelled');
          setTimeout(() => setLastAdded(null), 1800);
      } else {
          setLastAdded(`Import failed${res?.error ? `: ${String(res.error).slice(0, 36)}` : ''}`);
          setTimeout(() => setLastAdded(null), 3000);
      }
  };

  const handleImportSpotifyPlaylist = async () => {
      if (!isStandalone) return;
      const url = spotifyImportUrl.trim();
      const provider = musicImportProvider || (url.includes('music.apple.com') ? 'apple' : 'spotify');
      const importer = provider === 'apple' ? window.aether?.importAppleMusicPlaylist : window.aether?.importSpotifyPlaylist;
      if (!url || !importer) {
        setSpotifyImportProgress({
          stage: 'error',
          progress: 0,
          message: provider === 'apple' ? 'Apple Music import is unavailable in this desktop build.' : 'Spotify import is unavailable in this desktop build.',
        });
        return;
      }

      setIsSpotifyImporting(true);
      setSpotifyImportLogs([]);
      appendSpotifyImportLog(`start provider=${provider} name=${spotifyImportPlaylistName.trim() || 'auto'} url=${url}`);
      setSpotifyImportProgress({ stage: 'starting', progress: 1, message: `Preparing ${provider === 'apple' ? 'Apple Music' : 'Spotify'} import...` });
      try {
        const res = await importer(url.trim());
        appendSpotifyImportLog(`result success=${!!res?.success} matched=${res?.matchedTracks ?? 0} total=${res?.totalTracks ?? 0}`);
        if (res?.debug) {
          appendSpotifyImportLog(`debug ${JSON.stringify(res.debug).slice(0, 900)}`);
        }
        if (!res?.success) {
          const parserDebug = res?.debug?.parser || res?.debug || {};
          const debugParts = [
            res?.debug?.playlistId ? `id=${res.debug.playlistId}` : '',
            Number.isFinite(res?.debug?.htmlStatus) ? `status=${res.debug.htmlStatus}` : '',
            Number.isFinite(res?.debug?.htmlLength) ? `bytes=${res.debug.htmlLength}` : '',
            Number.isFinite(parserDebug.metaSongTags) ? `songTags=${parserDebug.metaSongTags}` : '',
            Number.isFinite(parserDebug.jsonLdBlocks) ? `jsonLd=${parserDebug.jsonLdBlocks}` : '',
            Number.isFinite(parserDebug.attributeBlocks) ? `attr=${parserDebug.attributeBlocks}` : '',
          ].filter(Boolean).join(' ');
          const debug = debugParts ? ` [${debugParts}]` : '';
          setSpotifyImportProgress({ stage: 'error', progress: 0, message: `${res?.error || 'Playlist import failed.'}${debug}` });
          appendSpotifyImportLog(`error ${res?.error || 'Playlist import failed.'}${debug}`);
          return;
        }

        if (!Array.isArray(res.tracks) || res.tracks.length === 0) {
          const debugHint = res?.debug
            ? ` (${res.debug.matchedTracks}/${res.debug.searchedTracks} matched${res.debug.missedSamples?.length ? ` • sample misses: ${res.debug.missedSamples.slice(0, 2).join(' | ')}` : ''})`
            : '';
          setSpotifyImportProgress({ stage: 'complete', progress: 100, message: `Imported the shell for "${res.playlistName}", but no playable matches were found${debugHint}.` });
          return;
        }

        const providerLabel = provider === 'apple' ? 'Apple Music' : 'Spotify';
        const playlistName = spotifyImportPlaylistName.trim() || res.playlistName || `${providerLabel} Playlist`;
        const uniquePlaylistName = buildUniquePlaylistName(playlistName, playlists);
        const importedTracks = res.tracks.map(normalizeQueueTrack).filter(Boolean);
        const nextPlaylists = { ...playlists, [uniquePlaylistName]: importedTracks };
        setPlaylists(nextPlaylists);
        persistPlaylistOrder([...playlistOrder.filter((name) => name !== uniquePlaylistName), uniquePlaylistName]);
        window.aether?.store?.set('playlists', nextPlaylists);
        setViewingPlaylist(uniquePlaylistName);
        setLastAdded(`Imported ${importedTracks.length}/${res.totalTracks} ${providerLabel} tracks`);
        setTimeout(() => setLastAdded(null), 3500);
        setIsSpotifyImportOpen(false);
        setSpotifyImportUrl('');
        setSpotifyImportPlaylistName('');
        setMusicImportProvider('');
        setSpotifyImportProgress({ stage: 'complete', progress: 100, message: `Imported ${importedTracks.length}/${res.totalTracks} tracks` });
      } catch (err) {
        const message = err?.message || 'Playlist import failed.';
        appendSpotifyImportLog(`exception ${message}`);
        setSpotifyImportProgress({ stage: 'error', progress: 0, message });
      } finally {
        setIsSpotifyImporting(false);
      }
  };



  const seekActivePlaybackTo = useCallback((timeMs) => {
    const clampedMs = Math.max(0, Math.floor(Number(timeMs) || 0));
    const seekSeconds = clampedMs / 1000;
    currentTimeRef.current = clampedMs;

    if (videoModeRef.current && localVideoRef.current) {
      try {
        localVideoRef.current.currentTime = seekSeconds;
        pendingResumeTimeRef.current = null;
        setPendingResumeTime(null);
      } catch {
        pendingResumeTimeRef.current = clampedMs;
        setPendingResumeTime(clampedMs);
      }
      setCurrentTime(clampedMs);
      return;
    }

    if (localAudioRef.current) {
      const track = queue?.[0];
      const isLocalDownloaded = track && downloadedTracks.includes(track.id);

      if (track && !isLocalDownloaded) {
        // Server-side seek for live streaming
        const streamNonce = encodeURIComponent(String(track.queueNonce || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`));
        const resetQuery = `&_r=${playbackResetNonce}`;
        const youtubeUrl = track.youtubeId ? `https://www.youtube.com/watch?v=${track.youtubeId}` : track.actualUrl || track.url;
        const streamBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
        const newSrc = `${streamBase}/stream?url=${encodeURIComponent(youtubeUrl)}&t=${seekSeconds}&_q=${streamNonce}${resetQuery}`;

        console.log("[Aether/Seek] Live Stream Source Re-route:", newSrc);

        liveStreamStartOffsetMsRef.current = clampedMs;
        localAudioRef.current.src = newSrc;
        if (isPlaying) {
          localAudioRef.current.play().catch(() => {});
        }
      } else {
        // Native client-side seek for downloaded/local tracks
        try {
          liveStreamStartOffsetMsRef.current = 0;
          localAudioRef.current.currentTime = seekSeconds;
          pendingResumeTimeRef.current = null;
          setPendingResumeTime(null);
        } catch {
          pendingResumeTimeRef.current = clampedMs;
          setPendingResumeTime(clampedMs);
        }
      }
    }

    setCurrentTime(clampedMs);
  }, [queue, downloadedTracks, isPlaying, API_BASE, streamPort, playbackResetNonce, isStandalone]);

  const logSoundCapsulePlayback = useCallback(async (track, options = {}) => {
    if (!track || !isStandalone || !window.aether?.store) return;
    try {
      const data = normalizePlaybackLedgerData(await window.aether.store.get(PLAYBACK_LEDGER_STORAGE_KEY));
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      const playedMs = Math.max(0, Math.floor(Number(currentTimeRef.current || 0)));
      const trackDurationMs = Math.max(0, Math.floor(Number(track.totalDurationMs || track.duration || 0)));
      const trackKey = track.id || track.youtubeId || normalizeTrackIdentity(track);
      const dateKey = getLocalDateKey(now);
      const completed = options.reason === 'natural_end' || (trackDurationMs > 0 && playedMs >= trackDurationMs * 0.92);
      const sessionState = ledgerSessionRef.current;
      const sessionId = sessionState.trackKey === trackKey && sessionState.id
        ? sessionState.id
        : `${trackKey || 'track'}-${track.queueNonce || now.getTime()}`;
      const previousLoggedMs = sessionState.trackKey === trackKey && sessionState.id === sessionId
        ? Math.max(0, Math.floor(Number(sessionState.lastLoggedMs) || 0))
        : 0;
      const deltaMs = Math.max(0, playedMs - previousLoggedMs);
      const shouldCountSession = !(sessionState.trackKey === trackKey && sessionState.id === sessionId && sessionState.counted);
      const isFinalWrite = options.reason === 'natural_end' || options.reason === 'skip' || options.reason === 'previous' || options.final;
      const hasMeaningfulProgress = playedMs >= 15000 || completed || isFinalWrite;
      const shouldPersist = hasMeaningfulProgress && (shouldCountSession || deltaMs >= 12000 || isFinalWrite);

      if (!trackKey || !shouldPersist) return;

      if (!data.tracks[trackKey]) {
        data.tracks[trackKey] = {
          count: 0,
          totalMs: 0,
          title: track.title,
          author: track.author,
          thumbnail: track.thumbnail,
          lastListened: null,
          lastCompletedAt: null,
        };
      }
      if (shouldCountSession) data.tracks[trackKey].count += 1;
      data.tracks[trackKey].totalMs = Math.max(0, Math.floor(Number(data.tracks[trackKey].totalMs) || 0)) + deltaMs;
      data.tracks[trackKey].title = track.title || data.tracks[trackKey].title;
      data.tracks[trackKey].author = track.author || data.tracks[trackKey].author;
      data.tracks[trackKey].thumbnail = track.thumbnail || data.tracks[trackKey].thumbnail;
      data.tracks[trackKey].lastListened = now.toISOString();
      if (completed) data.tracks[trackKey].lastCompletedAt = now.toISOString();

      const author = track.author?.trim();
      if (author) {
        if (!data.artists[author]) data.artists[author] = { count: 0, totalMs: 0 };
        if (shouldCountSession) data.artists[author].count += 1;
        data.artists[author].totalMs = Math.max(0, Math.floor(Number(data.artists[author].totalMs) || 0)) + deltaMs;
      }

      data.dailyMinutes[dateKey] = (data.dailyMinutes[dateKey] || 0) + deltaMs;
      if (shouldCountSession) {
        data.hourlyTrends[hour] = (data.hourlyTrends[hour] || 0) + 1;
        data.weeklyTrends[day] = (data.weeklyTrends[day] || 0) + 1;
        data.dailyPlays[dateKey] = (data.dailyPlays[dateKey] || 0) + 1;
      }

      const titleLower = track.title?.toLowerCase() || '';
      const authorLower = track.author?.toLowerCase() || '';
      const explicitGenre = String(track.genre || track.category || track.mood || '').toLowerCase().trim();
      if (shouldCountSession) {
        if (explicitGenre) {
          const genreKey = explicitGenre.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
          if (genreKey) data.genres[genreKey] = (data.genres[genreKey] || 0) + 1;
        }
        PLAYBACK_GENRE_SIGNALS.forEach((signal) => {
          if (titleLower.includes(signal) || authorLower.includes(signal) || explicitGenre.includes(signal)) {
            data.genres[signal] = (data.genres[signal] || 0) + 1;
          }
        });
      }

      data.totalMs = Math.max(0, Math.floor(Number(data.totalMs) || 0)) + deltaMs;
      data.totalMinutes = Math.round(data.totalMs / 60000);
      if (shouldCountSession) {
        data.totalPlays = Math.max(0, Math.floor(Number(data.totalPlays) || 0)) + 1;
        data.totalSessions = Math.max(0, Math.floor(Number(data.totalSessions) || 0)) + 1;
      }
      const existingSession = (Array.isArray(data.recentSessions) ? data.recentSessions : []).find((entry) => entry?.id === sessionId);
      data.recentSessions = [
        {
          id: sessionId,
          trackId: String(trackKey || ''),
          title: String(track.title || 'Unknown track'),
          author: String(track.author || 'Unknown artist'),
          thumbnail: String(track.thumbnail || ''),
          playedMs: Math.max(playedMs, Math.floor(Number(existingSession?.playedMs) || 0)),
          completed: Boolean(completed || existingSession?.completed),
          startedAt: existingSession?.startedAt || now.toISOString(),
          endedAt: now.toISOString(),
          reason: String(options.reason || 'session'),
        },
        ...(Array.isArray(data.recentSessions) ? data.recentSessions : []).filter((entry) => entry?.id !== sessionId),
      ].slice(0, 24);

      await window.aether.store.set(PLAYBACK_LEDGER_STORAGE_KEY, data);
      ledgerSessionRef.current = {
        id: sessionId,
        trackKey,
        counted: true,
        lastLoggedMs: Math.max(playedMs, previousLoggedMs),
      };
    } catch (e) { console.error('[Aether] Sound capsule write failed', e); }
  }, [isStandalone, normalizeTrackIdentity]);

  useEffect(() => {
    ledgerSessionRef.current = { id: '', trackKey: '', counted: false, lastLoggedMs: 0 };
  }, [currentTrack?.actualUrl, currentTrack?.id, currentTrack?.queueNonce, currentTrack?.url, currentTrack?.youtubeId]);

  useEffect(() => {
    if (!isStandalone || !isPlaying || !currentTrack || !window.aether?.store) return;
    const flushLiveLedger = () => {
      if (Math.max(0, Math.floor(Number(currentTimeRef.current) || 0)) < 15000) return;
      logSoundCapsulePlayback(currentTrack, { reason: 'live' });
    };
    const interval = window.setInterval(flushLiveLedger, 45000);
    const warmup = window.setTimeout(flushLiveLedger, 18000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(warmup);
    };
  }, [currentTrack, isPlaying, isStandalone, logSoundCapsulePlayback]);

  // Consolidate queue advancement logic
  const advanceQueue = useCallback((reason) => {
    const track = queue?.[0];
    if (!track) return;

    const endedTrackKey = getTrackActionKey(track);
    const transportGuard = manualTransportAdvanceRef.current;
    if (
      reason === 'natural_end' &&
      transportGuard?.action &&
      transportGuard.trackKey === endedTrackKey &&
      (Date.now() - Number(transportGuard.at || 0)) < 1500
    ) {
      console.log('[Aether/Queue] Ignoring advance event after manual transport action', {
        action: transportGuard.action,
        title: track?.title,
      });
      // Do not hard-block; if we are actually stuck at the end, we still need to clear it.
      if (Math.abs(currentTimeRef.current - (track.totalDurationMs || track.duration || 0)) < 5000) {
        console.log('[Aether/Queue] Override: Forced natural end at EOF boundary.');
      } else {
        return;
      }
    }

    console.log(`[Aether/Queue] Advancing: ${reason} for ${track.title}`);
    noteSkipReason(reason, { trackId: track.id, title: track.title });

    if (reason === 'natural_end' || currentTimeRef.current > 30000 || (track.totalDurationMs && currentTimeRef.current > track.totalDurationMs * 0.5)) {
      logSoundCapsulePlayback(track, { reason });
    }

    if (reason === 'natural_end' && stopAfterTrack) {
      setStopAfterTrack(false);
      setIsPlaying(false);
      if (localAudioRef.current) localAudioRef.current.pause();
      if (localVideoRef.current) localVideoRef.current.pause();
      setLastAdded('Sleep timer • Paused after track');
      setTimeout(() => setLastAdded(null), 2000);
      return;
    }

    if (reason === 'natural_end' && repeatMode === 'track') {
      pendingResumeTimeRef.current = null;
      setPendingResumeTime(null);
      currentTimeRef.current = 0;
      setCurrentTime(0);
      manualTransportAdvanceRef.current = null;
      if (localAudioRef.current && !videoModeRef.current) {
        try {
          localAudioRef.current.currentTime = 0;
          if (isPlaying) localAudioRef.current.play().catch(() => {});
        } catch {}
      }
      appendRecentEvent('repeat_track', track.title || 'Current track', { tone: 'neutral' });
      return;
    }

    if (reason === 'natural_end' && repeatMode === 'queue' && queue.length === 1) {
      pendingResumeTimeRef.current = null;
      setPendingResumeTime(null);
      currentTimeRef.current = 0;
      setCurrentTime(0);
      manualTransportAdvanceRef.current = null;
      if (localAudioRef.current && !videoModeRef.current) {
        try {
          localAudioRef.current.currentTime = 0;
          if (isPlaying) localAudioRef.current.play().catch(() => {});
        } catch {}
      }
      appendRecentEvent('repeat_queue', `Repeating loop: ${track.title}`, { tone: 'neutral' });
      return;
    }
    
    // Standard Queue Advancement
    setQueue(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return [];
      const removed = prev[0];
      const removedKey = getTrackActionKey(removed);
      let next = prev.slice(1);
      
      if (repeatMode === 'queue' && removed) {
        next = [...next, removed];
      }

      if (next.length === 0) {
        setIsPlaying(false);
        if (isAutoplayEnabled && removed) {
          setTimeout(() => triggerAutoplay(removed), 50);
        }
      }
      return next;
    });
    pendingResumeTimeRef.current = null;
    setPendingResumeTime(null);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    manualTransportAdvanceRef.current = null;
  }, [appendRecentEvent, getTrackActionKey, isAutoplayEnabled, isPlaying, logSoundCapsulePlayback, noteSkipReason, queue, repeatMode, triggerAutoplay]);

  const advanceQueueRef = useRef(advanceQueue);
  useEffect(() => {
    advanceQueueRef.current = advanceQueue;
  }, [advanceQueue]);

  const handleControl = useCallback(async (action) => {
    console.log("[Aether/Control] Signal Bridge Active:", action);
    if (isStandalone) {
        if (action === 'pause') setIsPlaying(false);
        if (action === 'resume') setIsPlaying(true);
        if (action === 'toggle') setIsPlaying(prev => !prev);
        if (action === 'mute') {
            setVolume(prev => {
                const nextV = prev > 0 ? 0 : 0.5;
                if (localAudioRef.current) localAudioRef.current.volume = nextV;
                return nextV;
            });
            return;
        }
        
        // PREVIOUS TRACK: If > 3s into current, restart. Otherwise go to previous track.
        if (action === 'previous') {
            if ((currentTimeRef.current || 0) > 3000) {
                // Restart current track
                console.log("[Aether/Control] Restarting current track (> 3s in)");
                seekActivePlaybackTo(0);
            } else if (history.length > 0) {
                // Go to actual previous track
                const prev = history[0];
                console.log("[Aether/Control] Restoring previous track:", prev?.title);
                manualTransportAdvanceRef.current = {
                  trackKey: getTrackActionKey(queue?.[0]),
                  at: Date.now(),
                  action: 'previous',
                };
                setHistory(h => h.slice(1));
                setQueue((q) => {
                  const normalized = Array.isArray(q) ? q.filter(item => item && typeof item === 'object') : [];
                  const prevKey = getTrackActionKey(prev);
                  if (!prevKey) return normalized;
                  const currentHeadKey = getTrackActionKey(normalized[0]);
                  if (currentHeadKey && currentHeadKey === prevKey) {
                    return normalized;
                  }
                  const deduped = normalized.filter((item) => getTrackActionKey(item) !== prevKey);
                  return [prev, ...deduped];
                });
                pendingResumeTimeRef.current = null;
                setPendingResumeTime(null);
                currentTimeRef.current = 0;
                setCurrentTime(0);
                setIsPlaying(true);
            } else {
                // No history, just restart current
                console.log("[Aether/Control] No history, restarting current");
                seekActivePlaybackTo(0);
            }
        }
        
        // SKIP: Remove current track and play next
        if (action === 'skip') {
          console.log("[Aether/Control] Skip triggered");
          manualTransportAdvanceRef.current = {
            trackKey: getTrackActionKey(queue?.[0]),
            at: Date.now(),
            action: 'skip',
          };
          advanceQueueRef.current('manual_skip');
        }
        
        // CLEAR/STOP: Empty queue and stop playback
        if (action === 'clear' || action === 'stop') {
            console.log("[Aether/Control] Queue cleared");
            setQueue([]);
            setHistory([]);
            setIsPlaying(false);
            pendingResumeTimeRef.current = null;
            setPendingResumeTime(null);
            currentTimeRef.current = 0;
            setCurrentTime(0);
            setIsManualStop(true);
            if (localAudioRef.current) {
                localAudioRef.current.currentTime = 0;
                localAudioRef.current.pause();
            }
        }
        return;
    }

    try {
      const effectiveGuildId = getEffectiveGuildId();

      // Web-mode immediate transport sync so UI/audio do not drift while waiting for polling.
      if (action === 'pause') {
        setIsPlaying(false);
        if (localAudioRef.current) localAudioRef.current.pause();
      }
      if (action === 'resume') {
        setIsPlaying(true);
        if (localAudioRef.current && !videoModeRef.current) localAudioRef.current.play().catch(() => {});
      }
      if (action === 'skip') {
        setCurrentTime(0);
        if (localAudioRef.current) {
          localAudioRef.current.pause();
        }
      }
      if (action === 'shuffle') {
          console.log("[Aether/Control] Network Shuffle triggered");
          setQueue(q => {
             if (!Array.isArray(q) || q.length <= 1) return q;
             const current = q[0];
             const rest = [...q.slice(1)].sort(() => Math.random() - 0.5);
             return [current, ...rest];
          });
      }
      if (action === 'clear' || action === 'stop') {
        setQueue([]);
        setIsPlaying(false);
        pendingResumeTimeRef.current = null;
        setPendingResumeTime(null);
        currentTimeRef.current = 0;
        setCurrentTime(0);
        if (localAudioRef.current) {
          localAudioRef.current.pause();
          localAudioRef.current.removeAttribute('src');
          localAudioRef.current.load();
        }
      }

      await axios.post(`${API_BASE}/api/control/${effectiveGuildId}`, { action });
      fetchQueue();
    } catch (err) {
      console.error("[Aether/Control] Web control failed", err, {
        action,
        guildId: getEffectiveGuildId(),
      });
    }
  }, [isStandalone, API_BASE, history, isAutoplayEnabled, getEffectiveGuildId, noteSkipReason, queue, getTrackActionKey, seekActivePlaybackTo]);

  const [accentColor, setAccentColor] = useState('#00ffbf');

  const handleSeek = useCallback(async (time) => {
    // Neural Seek Link
    const guildId = getEffectiveGuildId();
    try {
        await axios.post(`${API_BASE}/api/control/${guildId}`, { action: 'seek', time });
    } catch (e) {}

    seekActivePlaybackTo(time);
  }, [API_BASE, getEffectiveGuildId, seekActivePlaybackTo]);

  const handleLyricLineSeek = useCallback((lineTime) => {
    handleSeek(lineTime + (currentTrackRef.current?.introOffsetMs || 0) + (lyricOffsetMs || 0));
  }, [handleSeek, lyricOffsetMs]);

  const memoizedLyricsContent = useMemo(() => lyrics.map((line, idx) => {
    const distance = Math.abs(idx - activeLyricIndex);
    const bucket = distance === 0 ? 'active' : distance === 1 ? 'near' : distance === 2 ? 'mid' : 'far';
    return (
      <LyricLineIsland
        key={`${idx}-${line.time}`}
        bucket={bucket}
        index={idx}
        isActive={idx === activeLyricIndex}
        isDualWorkspaceMode={isDualWorkspaceMode}
        line={line}
        onSeek={handleLyricLineSeek}
        setActiveRef={activeLyricRef}
      />
    );
  }), [lyrics, activeLyricIndex, isDualWorkspaceMode, handleLyricLineSeek]);

  const handleRemove = useCallback(async (index) => {
    if (isStandalone) {
        setQueue(prev => {
            const next = [...prev];
            next.splice(index, 1);
            return next;
        });
        return;
    }
    const guildId = getEffectiveGuildId();
    try { await axios.post(`${API_BASE}/api/remove/${guildId}/${index}`); fetchQueue(); } catch (err) {}
  }, [isStandalone, API_BASE, getEffectiveGuildId]);

  const handleSync = async (offset) => {
      if (isStandalone) {
          setLyricOffsetMs(prev => prev + offset);
          return;
      }
        const guildId = getEffectiveGuildId();
      await axios.post(`${API_BASE}/api/sync/${guildId}`, { offset });
        fetchQueue();
  }

  const toggleMiniPlayer = useCallback(async () => {
      if (!isStandalone || !window.aether?.resizeWindow) return;
      if (isMiniPlayer) {
          await window.aether.resizeWindow(1160, 780, false);
          setIsMiniPlayer(false);
          setIsMiniQueuePeekOpen(false);
          appendRecentEvent('mini_player', 'Returned to studio layout', { tone: 'neutral' });
      } else {
          if (videoModeRef.current || localVideoRef.current) {
            switchVideoMode('dual'); // Compress into album bounding box, don't sever connection
          }
          await window.aether.resizeWindow(isMacPlatform ? 664 : 648, isMacPlatform ? 236 : 228, true);
          setIsMiniPlayer(true);
          setIsMiniQueuePeekOpen(false);
          appendRecentEvent('mini_player', 'Dock view enabled', { tone: 'neutral' });
      }
  }, [appendRecentEvent, exitVideoMode, isMacPlatform, isMiniPlayer, isStandalone]);

  const toggleFocusMode = useCallback(() => {
    if (videoMode === 'dual') return;
    setIsFocusedMode((prev) => !prev);
  }, [videoMode]);

  const toggleDiagnostics = useCallback(() => {
    const next = !isDiagnosticsOpen;
    runAfterInputPaint(() => {
      if (next) closeHeaderSurfaces('diagnostics');
      setIsDiagnosticsOpen(next);
    });
  }, [closeHeaderSurfaces, isDiagnosticsOpen, runAfterInputPaint]);

  const toggleLooksPanel = useCallback(() => {
    const next = !isLooksPanelOpen;
    runAfterInputPaint(() => {
      if (next) closeHeaderSurfaces('looks');
      setIsLooksPanelOpen(next);
    });
  }, [closeHeaderSurfaces, isLooksPanelOpen, runAfterInputPaint]);

  const toggleSleepTimerMenu = useCallback(() => {
    const next = !isSleepTimerMenuOpen;
    runAfterInputPaint(() => {
      if (next) closeHeaderSurfaces('sleep');
      setIsSleepTimerMenuOpen(next);
    });
  }, [closeHeaderSurfaces, isSleepTimerMenuOpen, runAfterInputPaint]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      const next = prev === 'off' ? 'track' : prev === 'track' ? 'queue' : 'off';
      appendRecentEvent('repeat_mode', next === 'off' ? 'Repeat disabled' : next === 'track' ? 'Repeating current track' : 'Repeating queue', { tone: 'neutral' });
      return next;
    });
  }, [appendRecentEvent]);

  useEffect(() => {
    gestureRuntimeRef.current.handleControl = handleControl;
    gestureRuntimeRef.current.appendRecentEvent = appendRecentEvent;
  }, [appendRecentEvent, handleControl]);

  useEffect(() => {
    if (!isFaceControlEnabled) {
      if (faceLoopRef.current) {
        window.clearTimeout(faceLoopRef.current);
        faceLoopRef.current = 0;
      }
      if (faceStreamRef.current) {
        faceStreamRef.current.getTracks().forEach((track) => track.stop());
        faceStreamRef.current = null;
      }
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = null;
      }
      faceActionRef.current = { lastActionAt: 0, lastZone: 'center', centeredFrames: 0 };
      cameraMotionRef.current = { prevLuma: null, active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, startAt: 0, lastSeenAt: 0, lastActionAt: 0 };
      setFaceControlStatus('Camera off');
      setFaceControlSignal({ x: 0, y: 0, confidence: 0, source: 'idle' });
      setCameraHandSignal({ x: 0, y: 0, motion: 0, last: 'idle' });
      return undefined;
    }

    let cancelled = false;
    let detector = null;
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 72;
    fallbackCanvas.height = 54;
    const fallbackCtx = fallbackCanvas.getContext('2d', { willReadFrequently: true });
    const supportStatus = typeof window !== 'undefined' && 'FaceDetector' in window
      ? 'Starting face and hand tracker...'
      : 'Starting camera face/hand fallback...';
    setFaceControlStatus(supportStatus);

    const nudgeCameraVolume = (delta) => {
      setVolume((prev) => {
        const next = clamp01(prev + delta);
        if (localAudioRef.current) localAudioRef.current.volume = next;
        window.aether?.store?.set('volume', next);
        return next;
      });
      setVolumeToast(true);
      setTimeout(() => setVolumeToast(false), 900);
    };

    const setHeadPosition = (x, y) => {
      const safeX = clamp01((x + 1) / 2) * 2 - 1;
      const safeY = clamp01((y + 1) / 2) * 2 - 1;
      document.documentElement.style.setProperty('--aether-head-x', String(safeX));
      document.documentElement.style.setProperty('--aether-head-y', String(safeY));
      return { safeX, safeY };
    };

    const runFaceAction = (zone) => {
      const now = Date.now();
      const actionState = faceActionRef.current;

      if (zone === 'center') {
        // Require 4 consecutive center frames before resetting (hysteresis)
        actionState.centeredFrames = Math.min((actionState.centeredFrames || 0) + 1, 8);
        if (actionState.centeredFrames >= 4) actionState.lastZone = 'center';
        actionState.holdFrames = 0;
        actionState.holdZone = null;
        return;
      }

      actionState.centeredFrames = 0;

      // Must hold the same zone for 3 consecutive frames to avoid jitter triggers
      if (actionState.holdZone === zone) {
        actionState.holdFrames = (actionState.holdFrames || 0) + 1;
      } else {
        actionState.holdZone = zone;
        actionState.holdFrames = 1;
      }
      if (actionState.holdFrames < 3) return;

      // Must return to center first, cooldown 1400ms
      if (actionState.lastZone !== 'center' || now - actionState.lastActionAt < 1400) return;
      actionState.lastZone = zone;
      actionState.lastActionAt = now;
      actionState.holdFrames = 0;

      if (zone === 'left') {
        gestureRuntimeRef.current.handleControl?.('previous');
        showGestureNotice('👈 Face: previous track');
        gestureRuntimeRef.current.appendRecentEvent?.('face_previous', 'Look left', { tone: 'transport' });
      } else if (zone === 'right') {
        gestureRuntimeRef.current.handleControl?.('skip');
        showGestureNotice('👉 Face: next track');
        gestureRuntimeRef.current.appendRecentEvent?.('face_next', 'Look right', { tone: 'transport' });
      } else if (zone === 'up' || zone === 'down') {
        nudgeCameraVolume(zone === 'up' ? 0.1 : -0.1);
        showGestureNotice(zone === 'up' ? '👆 Face: volume up' : '👇 Face: volume down');
        gestureRuntimeRef.current.appendRecentEvent?.('face_volume', zone === 'up' ? 'Look up' : 'Look down', { tone: 'neutral' });
      }
    };

    const runCameraHandAction = (direction) => {
      const now = Date.now();
      const motionState = cameraMotionRef.current;
      if (now - motionState.lastActionAt < 1200) return;
      motionState.lastActionAt = now;
      motionState.active = false;

      if (direction === 'left') {
        gestureRuntimeRef.current.handleControl?.('skip');
        showGestureNotice('🤚 Wave left → next track');
        gestureRuntimeRef.current.appendRecentEvent?.('hand_next', 'Camera swipe left', { tone: 'transport' });
      } else if (direction === 'right') {
        gestureRuntimeRef.current.handleControl?.('previous');
        showGestureNotice('🤚 Wave right → previous track');
        gestureRuntimeRef.current.appendRecentEvent?.('hand_previous', 'Camera swipe right', { tone: 'transport' });
      } else if (direction === 'up' || direction === 'down') {
        nudgeCameraVolume(direction === 'up' ? 0.1 : -0.1);
        showGestureNotice(direction === 'up' ? '🤚 Wave up → vol up' : '🤚 Wave down → vol down');
        gestureRuntimeRef.current.appendRecentEvent?.('hand_volume', direction === 'up' ? 'Camera swipe up' : 'Camera swipe down', { tone: 'neutral' });
      }

      setCameraHandSignal((prev) => ({ ...prev, last: `swipe ${direction}` }));
    };

    const sampleCameraFrame = (video) => {
      if (!fallbackCtx) return { frame: null, avg: 0 };
      fallbackCtx.drawImage(video, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
      const frame = fallbackCtx.getImageData(0, 0, fallbackCanvas.width, fallbackCanvas.height).data;
      let avg = 0;
      for (let i = 0; i < frame.length; i += 4) {
        avg += (frame[i] * 0.299) + (frame[i + 1] * 0.587) + (frame[i + 2] * 0.114);
      }
      avg /= Math.max(1, frame.length / 4);
      return { frame, avg };
    };

    const runCameraHandMotion = (frame) => {
      if (!frame) return;
      const width = fallbackCanvas.width;
      const height = fallbackCanvas.height;
      const motionState = cameraMotionRef.current;
      const now = Date.now();
      const luma = new Uint8Array(width * height);
      let motionSum = 0;
      let motionX = 0;
      let motionY = 0;

      for (let py = 0; py < height; py += 1) {
        for (let px = 0; px < width; px += 1) {
          const pixelIndex = (py * width) + px;
          const frameIndex = pixelIndex * 4;
          const nextLuma = Math.round((frame[frameIndex] * 0.299) + (frame[frameIndex + 1] * 0.587) + (frame[frameIndex + 2] * 0.114));
          luma[pixelIndex] = nextLuma;
          if (!motionState.prevLuma) continue;
          const diff = Math.abs(nextLuma - motionState.prevLuma[pixelIndex]);
          if (diff < 18) continue;
          const edgeBias = 1 + Math.abs((px / width) - 0.5) * 0.35;
          const weight = (diff - 12) * edgeBias;
          motionSum += weight;
          motionX += px * weight;
          motionY += py * weight;
        }
      }

      motionState.prevLuma = luma;
      const normalizedMotion = clamp01(motionSum / 22000);
      if (motionSum < 1000) {
        if (motionState.active && now - motionState.lastSeenAt > 240) {
          motionState.active = false;
        }
        setCameraHandSignal((prev) => ({ ...prev, motion: normalizedMotion, last: normalizedMotion > 0.02 ? prev.last : 'ready' }));
        return;
      }

      const x = ((motionX / motionSum / width) - 0.5) * 2;
      const y = ((motionY / motionSum / height) - 0.5) * 2;
      motionState.lastSeenAt = now;

      if (!motionState.active) {
        motionState.active = true;
        motionState.startX = x;
        motionState.startY = y;
        motionState.startAt = now;
      }

      motionState.lastX = x;
      motionState.lastY = y;
      setCameraHandSignal({ x, y, motion: normalizedMotion, last: 'tracking' });

      const dx = x - motionState.startX;
      const dy = y - motionState.startY;
      const elapsed = now - motionState.startAt;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      // Require clear axis dominance (1.8x) to avoid diagonal false positives
      const dominant = absX > absY * 1.8 ? 'h' : absY > absX * 1.8 ? 'v' : null;
      if (dominant && elapsed > 100 && elapsed < 1000 && (absX > 0.42 || absY > 0.42)) {
        const direction = dominant === 'h' ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        runCameraHandAction(direction);
      } else if (elapsed >= 1000) {
        motionState.active = false;
      }
    };

    const scheduleLoop = () => {
      if (!cancelled) {
        faceLoopRef.current = window.setTimeout(detectLoop, 120);
      }
    };

    const detectLoop = async () => {
      if (cancelled) return;
      const video = faceVideoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        scheduleLoop();
        return;
      }

      try {
        let x = 0;
        let y = 0;
        let confidence = 0;
        let source = 'camera';
        let status = 'Camera face/hand tracking active';
        const { frame, avg } = sampleCameraFrame(video);
        runCameraHandMotion(frame);

        if (detector) {
          const faces = await detector.detect(video);
          if (cancelled) return;
          const face = faces?.[0];
          if (!face?.boundingBox) {
            setFaceControlStatus('Looking for face; hand gestures active...');
            setFaceControlSignal((prev) => ({ ...prev, confidence: 0, source: 'searching' }));
            runFaceAction('center');
            return;
          }

          const box = face.boundingBox;
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          x = ((centerX / video.videoWidth) - 0.5) * 2;
          y = ((centerY / video.videoHeight) - 0.5) * 2;
          confidence = clamp01((box.width * box.height) / Math.max(1, video.videoWidth * video.videoHeight) * 7);
          source = 'face';
          status = 'Face and hand tracking active';
        } else if (fallbackCtx && frame) {
          let sum = 0;
          let sumX = 0;
          let sumY = 0;
          for (let py = 0; py < fallbackCanvas.height; py += 1) {
            for (let px = 0; px < fallbackCanvas.width; px += 1) {
              const i = ((py * fallbackCanvas.width) + px) * 4;
              const r = frame[i];
              const g = frame[i + 1];
              const b = frame[i + 2];
              const luma = (r * 0.299) + (g * 0.587) + (b * 0.114);
              const skinBias = r > 55 && g > 35 && b > 20 && r > b * 1.08 && r > g * 0.82 ? 22 : 0;
              const centerBias = 1 - (Math.abs((px / fallbackCanvas.width) - 0.5) * 0.22);
              const weight = Math.max(0, (luma - avg) + skinBias) * centerBias;
              if (weight <= 0) continue;
              sum += weight;
              sumX += px * weight;
              sumY += py * weight;
            }
          }

          if (sum < 180) {
            setFaceControlStatus('Looking for camera subject; hand gestures active...');
            setFaceControlSignal((prev) => ({ ...prev, confidence: 0, source: 'searching' }));
            runFaceAction('center');
            return;
          }

          x = ((sumX / sum / fallbackCanvas.width) - 0.5) * 2;
          y = ((sumY / sum / fallbackCanvas.height) - 0.5) * 2;
          confidence = clamp01(sum / 12000);
          status = 'Camera face/hand fallback active';
        }

        const { safeX, safeY } = setHeadPosition(x, y);
        setFaceControlSignal({ x: safeX, y: safeY, confidence, source });
        setFaceControlStatus(status);

        const absX = Math.abs(safeX);
        const absY = Math.abs(safeY);
        let zone = 'center';
        // Tighter dead-band (0.42/0.46) + axis dominance for clean zone reads
        if (absX > 0.42 || absY > 0.46) {
          if (absX > absY * 1.3) zone = safeX < 0 ? 'left' : 'right';
          else if (absY > absX * 1.3) zone = safeY < 0 ? 'up' : 'down';
        }
        runFaceAction(zone);
      } catch (error) {
        console.warn('[Aether/FaceControl] detection failed', error);
        setFaceControlStatus(`Face tracking failed: ${String(error?.message || error).slice(0, 46)}`);
      } finally {
        scheduleLoop();
      }
    };

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setFaceControlStatus('Camera API unavailable');
          return;
        }
        detector = 'FaceDetector' in window
          ? new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 })
          : null;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        faceStreamRef.current = stream;
        const video = faceVideoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        showGestureNotice(detector ? 'Camera face + hand enabled' : 'Camera hand fallback enabled');
        gestureRuntimeRef.current.appendRecentEvent?.('camera_control', detector ? 'Camera face and hand controls enabled' : 'Camera fallback controls enabled', { tone: 'neutral' });
        detectLoop();
      } catch (error) {
        console.warn('[Aether/FaceControl] camera failed', error);
        setFaceControlStatus(`Camera blocked: ${String(error?.message || error).slice(0, 54)}`);
        setIsFaceControlEnabled(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (faceLoopRef.current) {
        window.clearTimeout(faceLoopRef.current);
        faceLoopRef.current = 0;
      }
      if (faceStreamRef.current) {
        faceStreamRef.current.getTracks().forEach((track) => track.stop());
        faceStreamRef.current = null;
      }
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = null;
      }
    };
  }, [isFaceControlEnabled, showGestureNotice]);

  useEffect(() => {
    if (!isGestureControlEnabled) {
      setIsFaceControlEnabled(false);
      document.documentElement.style.setProperty('--aether-head-x', '0');
      document.documentElement.style.setProperty('--aether-head-y', '0');
      return undefined;
    }

    const isInteractiveTarget = (target) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('button, input, textarea, select, option, a, [role="button"], [contenteditable="true"], .no-drag'));
    };

    const setHeadPosition = (x, y) => {
      document.documentElement.style.setProperty('--aether-head-x', String(clamp01((x + 1) / 2) * 2 - 1));
      document.documentElement.style.setProperty('--aether-head-y', String(clamp01((y + 1) / 2) * 2 - 1));
    };

    const nudgeVolume = (delta) => {
      setVolume((prev) => {
        const next = clamp01(prev + delta);
        if (localAudioRef.current) localAudioRef.current.volume = next;
        window.aether?.store?.set('volume', next);
        return next;
      });
      setVolumeToast(true);
      setTimeout(() => setVolumeToast(false), 900);
    };

    // ── Mouse / single-pointer swipe ─────────────────────────────────
    const onPointerMove = (event) => {
      if (event.pointerType === 'touch') return; // handled by touch events
      const x = ((event.clientX / Math.max(window.innerWidth, 1)) - 0.5) * 2;
      const y = ((event.clientY / Math.max(window.innerHeight, 1)) - 0.5) * 2;
      setHeadPosition(x, y);
    };

    const onPointerDown = (event) => {
      if (event.pointerType === 'touch') return;
      if (isInteractiveTarget(event.target)) return;
      gestureStateRef.current.pointerDown = { x: event.clientX, y: event.clientY, at: Date.now() };
    };

    const onPointerUp = (event) => {
      if (event.pointerType === 'touch') return;
      const start = gestureStateRef.current.pointerDown;
      gestureStateRef.current.pointerDown = null;
      if (!start || isInteractiveTarget(event.target)) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const elapsed = Date.now() - start.at;
      const distance = Math.hypot(dx, dy);
      const now = Date.now();

      // Double-tap to toggle play/pause (< 250ms, didn't move much)
      if (distance < 20 && elapsed < 250) {
        if (now - gestureStateRef.current.lastTapAt < 380) {
          gestureStateRef.current.lastTapAt = 0;
          gestureRuntimeRef.current.handleControl?.('resume');
          showGestureNotice('Gesture: play / pause');
          gestureRuntimeRef.current.appendRecentEvent?.('gesture_tap', 'Double-tap', { tone: 'transport' });
          return;
        }
        gestureStateRef.current.lastTapAt = now;
        return;
      }

      // Directional swipe: must be fast (<700ms), long enough (>70px), cooldown
      if (elapsed > 700 || distance < 70 || now - gestureStateRef.current.lastActionAt < 700) return;
      gestureStateRef.current.lastActionAt = now;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      // Require clear dominance in one axis (ratio > 1.6)
      if (absX > absY * 1.6) {
        if (dx < 0) {
          gestureRuntimeRef.current.handleControl?.('skip');
          showGestureNotice('Swipe → next track');
          gestureRuntimeRef.current.appendRecentEvent?.('gesture_next', 'Swipe left', { tone: 'transport' });
        } else {
          gestureRuntimeRef.current.handleControl?.('previous');
          showGestureNotice('Swipe → previous track');
          gestureRuntimeRef.current.appendRecentEvent?.('gesture_previous', 'Swipe right', { tone: 'transport' });
        }
      } else if (absY > absX * 1.6) {
        const delta = dy < 0 ? 0.1 : -0.1;
        nudgeVolume(delta);
        showGestureNotice(dy < 0 ? 'Swipe → volume up' : 'Swipe → volume down');
        gestureRuntimeRef.current.appendRecentEvent?.('gesture_volume', dy < 0 ? 'Swipe up' : 'Swipe down', { tone: 'neutral' });
      }
    };

    // ── 2-finger touch gestures ───────────────────────────────────────
    const tg = touchGestureRef.current;

    const getTouchDist = (t) => {
      const ids = Object.keys(t.touches);
      if (ids.length < 2) return 0;
      const a = t.touches[ids[0]];
      const b = t.touches[ids[1]];
      return Math.hypot(b.x - a.x, b.y - a.y);
    };

    const getTouchMidpoint = (t) => {
      const ids = Object.keys(t.touches);
      if (ids.length < 2) return null;
      const a = t.touches[ids[0]];
      const b = t.touches[ids[1]];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    const onTouchStart = (e) => {
      Array.from(e.changedTouches).forEach((t) => {
        tg.touches[t.identifier] = { x: t.clientX, y: t.clientY };
      });
      if (Object.keys(tg.touches).length === 2) {
        tg.pinchStartDist = getTouchDist(tg);
        tg.twoFingerStart = getTouchMidpoint(tg);
        tg.active = true;
        tg.pinchTriggered = false;
        tg.swipeTriggered = false;
        tg.startAt = Date.now();
        // Update stage depth with midpoint
        if (tg.twoFingerStart) {
          const x = ((tg.twoFingerStart.x / Math.max(window.innerWidth, 1)) - 0.5) * 2;
          const y = ((tg.twoFingerStart.y / Math.max(window.innerHeight, 1)) - 0.5) * 2;
          setHeadPosition(x, y);
        }
      }
    };

    const onTouchMove = (e) => {
      Array.from(e.changedTouches).forEach((t) => {
        if (tg.touches[t.identifier]) tg.touches[t.identifier] = { x: t.clientX, y: t.clientY };
      });
      if (!tg.active || Object.keys(tg.touches).length < 2) return;
      // Update depth with midpoint
      const mid = getTouchMidpoint(tg);
      if (mid) {
        const x = ((mid.x / Math.max(window.innerWidth, 1)) - 0.5) * 2;
        const y = ((mid.y / Math.max(window.innerHeight, 1)) - 0.5) * 2;
        setHeadPosition(x, y);
      }

      // Pinch detection (≥ 15% dist change from start)
      if (!tg.pinchTriggered && !tg.swipeTriggered && tg.pinchStartDist > 40) {
        const curDist = getTouchDist(tg);
        const ratio = curDist / tg.pinchStartDist;
        const now = Date.now();
        if ((ratio < 0.78 || ratio > 1.28) && now - gestureStateRef.current.lastActionAt > 900) {
          gestureStateRef.current.lastActionAt = now;
          tg.pinchTriggered = true;
          if (ratio < 0.78) {
            // Pinch in → pause
            gestureRuntimeRef.current.handleControl?.('pause');
            showGestureNotice('Pinch → pause');
            gestureRuntimeRef.current.appendRecentEvent?.('gesture_pinch_pause', 'Pinch in', { tone: 'transport' });
          } else {
            // Spread → play
            gestureRuntimeRef.current.handleControl?.('resume');
            showGestureNotice('Spread → play');
            gestureRuntimeRef.current.appendRecentEvent?.('gesture_spread_play', 'Spread out', { tone: 'transport' });
          }
        }
      }
    };

    const onTouchEnd = (e) => {
      if (tg.active && Object.keys(tg.touches).length === 2 && !tg.pinchTriggered && !tg.swipeTriggered) {
        // Check for 2-finger swipe
        const mid = getTouchMidpoint(tg);
        const start = tg.twoFingerStart;
        const now = Date.now();
        const elapsed = now - (tg.startAt || now);
        if (mid && start && elapsed < 600 && elapsed > 60) {
          const dx = mid.x - start.x;
          const dy = mid.y - start.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 55 && now - gestureStateRef.current.lastActionAt > 700) {
            gestureStateRef.current.lastActionAt = now;
            tg.swipeTriggered = true;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            if (absX > absY * 1.4) {
              if (dx < 0) {
                gestureRuntimeRef.current.handleControl?.('skip');
                showGestureNotice('✌️ 2-finger → next track');
                gestureRuntimeRef.current.appendRecentEvent?.('gesture2_next', '2-finger swipe left', { tone: 'transport' });
              } else {
                gestureRuntimeRef.current.handleControl?.('previous');
                showGestureNotice('✌️ 2-finger → previous track');
                gestureRuntimeRef.current.appendRecentEvent?.('gesture2_prev', '2-finger swipe right', { tone: 'transport' });
              }
            } else if (absY > absX * 1.4) {
              const delta = dy < 0 ? 0.12 : -0.12;
              nudgeVolume(delta);
              showGestureNotice(dy < 0 ? '✌️ 2-finger → vol up' : '✌️ 2-finger → vol down');
              gestureRuntimeRef.current.appendRecentEvent?.('gesture2_vol', dy < 0 ? '2-finger swipe up' : '2-finger swipe down', { tone: 'neutral' });
            }
          }
        }
      }
      Array.from(e.changedTouches).forEach((t) => { delete tg.touches[t.identifier]; });
      if (Object.keys(tg.touches).length < 2) {
        tg.active = false;
        tg.pinchStartDist = 0;
        tg.twoFingerStart = null;
      }
    };

    const onDeviceOrientation = (event) => {
      if (!Number.isFinite(event.gamma) && !Number.isFinite(event.beta)) return;
      const x = clamp01(((Number(event.gamma) || 0) + 28) / 56) * 2 - 1;
      const y = clamp01(((Number(event.beta) || 0) + 18) / 36) * 2 - 1;
      setHeadPosition(x, y);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
    showGestureNotice('Gesture lab enabled');
    gestureRuntimeRef.current.appendRecentEvent?.('gesture_lab', 'Swipe, pinch & 2-finger controls enabled', { tone: 'neutral' });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('deviceorientation', onDeviceOrientation);
    };
  }, [isGestureControlEnabled, showGestureNotice]);

  useEffect(() => {
    if (!isMiniPlayer || !currentTrack || queue.length <= 1) {
      setIsMiniQueuePeekOpen(false);
    }
  }, [isMiniPlayer, currentTrack, queue.length]);

  const toggleWindowMaximize = useCallback(async () => {
    if (!isStandalone || !window.aether?.toggleWindowMaximize) return;
    try {
      await window.aether.toggleWindowMaximize();
    } catch (e) {
      console.warn('[Aether/Window] toggle maximize failed', e);
    }
  }, [isStandalone]);

  const handleHeaderDoubleClick = useCallback((event) => {
    if (!isStandalone) return;
    if (
      event?.target instanceof Element
      && event.target.closest('button, input, textarea, select, option, a, [role="button"], [data-no-maximize="true"]')
    ) {
      return;
    }
    toggleWindowMaximize();
  }, [isStandalone, toggleWindowMaximize]);

  const handleResetPlaybackEngine = useCallback(() => {
    const sourceUrl = currentTrack?.actualUrl || currentTrack?.url;
    if (!sourceUrl) {
      setLastAdded('No active playback to reset');
      setTimeout(() => setLastAdded(null), 1800);
      return;
    }

    const resumeAtMs = getActivePlaybackPositionMs();
    const activeMode = videoModeRef.current ? 'video' : 'audio';

    console.log('[Aether/Diagnostics] Reset playback engine', {
      title: currentTrack?.title,
      resumeAtMs,
      activeMode,
      isStandalone,
    });

    bufferingRescueRef.current = { trackKey: '', lastAttemptAt: 0, attempts: 0 };
    standaloneTrackLoadKeyRef.current = '';
    prematureEndGuardRef.current = { trackId: null, retried: false };
    currentTimeRef.current = resumeAtMs;
    pendingResumeTimeRef.current = resumeAtMs;
    setPendingResumeTime(resumeAtMs);
    setCurrentTime(resumeAtMs);
    setIsAudioBuffering(true);

    if (localAudioRef.current) {
      try {
        localAudioRef.current.oncanplay = null;
        localAudioRef.current.onplaying = null;
        localAudioRef.current.onwaiting = null;
        localAudioRef.current.onstalled = null;
        localAudioRef.current.onended = null;
        localAudioRef.current.onerror = null;
        localAudioRef.current.onloadstart = null;
        localAudioRef.current.pause();
        localAudioRef.current.removeAttribute('src');
        localAudioRef.current.load();
        localAudioRef.current.muted = !!videoModeRef.current;
      } catch {}
    }
    if (videoModeRef.current && localVideoRef.current) {
      stopVideoElement(localVideoRef.current);
      setCinemaControlsVisible(true);
    }

    setPlaybackResetNonce((prev) => prev + 1);
    appendRecentEvent('engine_reset', `${activeMode} transport`, { tone: 'warning', title: currentTrack?.title || 'Playback' });
    setLastAdded(`Engine reset • ${activeMode} transport`);
    setTimeout(() => setLastAdded(null), 2200);
  }, [appendRecentEvent, currentTrack?.actualUrl, currentTrack?.title, currentTrack?.url, getActivePlaybackPositionMs, isStandalone, stopVideoElement]);

  const handleRunRuntimeRepair = useCallback(async () => {
    if (!isStandalone) return;
    setIsRuntimeRepairing(true);
    try {
      const repairResult = await window.aether?.repairRuntime?.();
      if (currentTrack?.actualUrl || currentTrack?.url) {
        handleResetPlaybackEngine();
      }
      await refreshEngineStatus();
      await refreshStorageStats();
      await refreshStorageEstimate();
      await refreshOfflineDownloads();

      const notes = Array.isArray(repairResult?.notes) ? repairResult.notes.filter(Boolean) : [];
      const summary = notes[0] || 'Runtime repair complete';
      appendRecentEvent('runtime_repair', summary, { tone: 'success' });
      setLastAdded(summary);
      setTimeout(() => setLastAdded(null), 3200);
    } catch (e) {
      console.warn('[Aether/Diagnostics] runtime repair failed', e);
      appendRecentEvent('runtime_repair_failed', e?.message || 'Runtime repair failed', { tone: 'error' });
      setLastAdded('Runtime repair failed');
      setTimeout(() => setLastAdded(null), 2800);
    } finally {
      setIsRuntimeRepairing(false);
    }
  }, [appendRecentEvent, currentTrack?.actualUrl, currentTrack?.url, handleResetPlaybackEngine, isStandalone, refreshEngineStatus, refreshOfflineDownloads, refreshStorageEstimate, refreshStorageStats]);

  useEffect(() => {
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const onShortcut = (e) => {
      if (e.defaultPrevented || e.repeat || isNativeKeyboardTarget(e)) return;

      const hasBlockingOverlayOpen = Boolean(
        oauthPrompt
        || isTipsOverlayOpen
        || headerControlsRef.current?.isOpen()
        || feedbackRef.current?.isOpen()
        || gestureLabRef.current?.isOpen()
        || soundCapsuleRef.current?.isOpen()
        || appLockSettingsRef.current?.isOpen()
        || isShortcutSettingsOpen
        || isLockModalOpen
        || isSpotifyImportOpen
        || isFeedbackOpen
        || isGestureLabOpen
        || isAuraStageOpen
        || Boolean(inspectTarget)
        || isLibraryOverlayOpen
        || isPlayerOverlayOpen
        || isViewingFullQueue
        || isViewingFullDiscovery
        || isViewingFullPlaylist
        || isSharedSceneOpen
        || isMixtapeVaultOpen
        || isManualLyricsEditorOpen
        || isManualLyricsRawEditorOpen
      );
      if (hasBlockingOverlayOpen) {
        return;
      }

      const hasControlMods = e.metaKey || e.ctrlKey || e.altKey;
      if (isTypingTarget(document.activeElement) && !hasControlMods) return;

      if (isParsedShortcutEventMatch(e, parsedShortcuts.playPause)) {
        e.preventDefault();
        handleControl(isPlaying ? 'pause' : 'resume');
        return;
      }
      if (isParsedShortcutEventMatch(e, parsedShortcuts.previous)) {
        e.preventDefault();
        handleControl('previous');
        return;
      }
      if (isParsedShortcutEventMatch(e, parsedShortcuts.next)) {
        e.preventDefault();
        handleControl('skip');
        return;
      }
      if (isParsedShortcutEventMatch(e, parsedShortcuts.volumeUp)) {
        e.preventDefault();
        setVolume(prev => {
          const next = Math.min(1, prev + 0.08);
          if (localAudioRef.current) localAudioRef.current.volume = next;
          window.aether?.store?.set('volume', next);
          return next;
        });
        setVolumeToast(true);
        setTimeout(() => setVolumeToast(false), 1200);
        return;
      }
      if (isParsedShortcutEventMatch(e, parsedShortcuts.volumeDown)) {
        e.preventDefault();
        setVolume(prev => {
          const next = Math.max(0, prev - 0.08);
          if (localAudioRef.current) localAudioRef.current.volume = next;
          window.aether?.store?.set('volume', next);
          return next;
        });
        setVolumeToast(true);
        setTimeout(() => setVolumeToast(false), 1200);
        return;
      }
      if (isParsedShortcutEventMatch(e, parsedShortcuts.mute)) {
        e.preventDefault();
        handleControl('mute');
        return;
      }
      if (isParsedShortcutEventMatch(e, parsedShortcuts.clearQueue)) {
        e.preventDefault();
        handleControl('clear');
        return;
      }
      if (isParsedShortcutEventMatch(e, parsedShortcuts.focusMode)) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }
      if (isStandalone && isParsedShortcutEventMatch(e, parsedShortcuts.miniPlayer)) {
        e.preventDefault();
        toggleMiniPlayer();
        return;
      }
      if (isParsedShortcutEventMatch(e, parsedShortcuts.diagnostics)) {
        e.preventDefault();
        toggleDiagnostics();
      }
    };

    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [handleControl, inspectTarget, isAuraStageOpen, isFeedbackOpen, isGestureLabOpen, isLibraryOverlayOpen, isLockModalOpen, isManualLyricsEditorOpen, isManualLyricsRawEditorOpen, isMixtapeVaultOpen, isPlayerOverlayOpen, isPlaying, isShortcutSettingsOpen, isSharedSceneOpen, isSpotifyImportOpen, isStandalone, isTipsOverlayOpen, isViewingFullDiscovery, isViewingFullPlaylist, isViewingFullQueue, oauthPrompt, parsedShortcuts, toggleDiagnostics, toggleFocusMode, toggleMiniPlayer]);

  const musicImportTheme = musicImportProvider === 'apple'
    ? {
      accent: '#ff5a7d',
      accentSoft: 'rgba(255, 90, 125, 0.13)',
      accentBorder: 'rgba(255, 90, 125, 0.42)',
      accentText: '#ff9aad',
      accentShadow: 'rgba(255, 90, 125, 0.18)',
      ctaText: '#19070c',
      label: 'Apple Music',
      sourceLine: 'Public music.apple.com playlist links',
      placeholder: 'https://music.apple.com/.../playlist/...',
    }
    : musicImportProvider === 'spotify'
      ? {
        accent: '#1ed760',
        accentSoft: 'rgba(30, 215, 96, 0.12)',
        accentBorder: 'rgba(30, 215, 96, 0.42)',
        accentText: '#83f3ad',
        accentShadow: 'rgba(30, 215, 96, 0.16)',
        ctaText: '#031108',
        label: 'Spotify',
        sourceLine: 'Public open.spotify.com playlist links',
        placeholder: 'https://open.spotify.com/playlist/...',
      }
      : {
        accent: 'rgb(0, 255, 191)',
        accentSoft: 'rgba(0, 255, 191, 0.1)',
        accentBorder: 'rgba(0, 255, 191, 0.32)',
        accentText: 'rgb(125, 255, 218)',
        accentShadow: 'rgba(0, 255, 191, 0.12)',
        ctaText: '#00140f',
        label: 'Playlist',
        sourceLine: 'Choose Spotify or Apple Music first',
        placeholder: 'Choose Spotify or Apple Music first',
      };

  if (loading) return (
    <div className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="relative">
        <Loader2 className="animate-spin text-brand-accent" size={48} />
        <div className="absolute inset-0 blur-xl bg-brand-accent/20 animate-pulse" />
      </div>
      <div className="label-caps animate-pulse text-sm">Neural Link Active</div>
    </div>
  );

  if (isStandalone && lockStatus.enabled && isAppLocked) return (
    <div className="h-screen w-full bg-[#050505] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/70 backdrop-blur-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent">
            <Lock size={18} />
          </div>
          <div>
            <div className="text-sm font-black text-brand-accent uppercase tracking-[0.22em]">Aether Locked</div>
            <div className="text-[11px] text-white/45 mt-1">Unlock to access your studio.</div>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={unlockPasswordInput}
            onChange={(e) => setUnlockPasswordInput(e.target.value)}
            placeholder="Enter password"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent/50"
            onKeyDown={(e) => { if (e.key === 'Enter') handleUnlockWithPassword(); }}
          />

          {lockError && <div className="text-[11px] text-red-400">{lockError}</div>}

          <div className="flex items-center gap-2">
            <button
              onClick={handleUnlockWithPassword}
              disabled={isLockBusy || !unlockPasswordInput}
              className="flex-1 rounded-xl bg-brand-accent text-black font-black py-2.5 text-sm disabled:opacity-50"
            >
              Unlock
            </button>
            {lockStatus.touchIdAvailable && lockStatus.touchIdEnabled && (
              <button
                onClick={handleUnlockWithBiometric}
                disabled={isLockBusy}
                className="rounded-xl border border-white/15 bg-white/5 text-white px-3 py-2.5 hover:text-brand-accent transition-colors"
                title="Unlock with Touch ID"
              >
                <Fingerprint size={16} />
              </button>
            )}
          </div>

          <div className="flex justify-end mt-1">
            <button
              className="text-xs text-brand-accent hover:underline focus:underline focus:outline-none"
              type="button"
              onClick={() => {
                setIsForgotPasswordOpen(true);
                setRecoveryError('');
                setRecoveryPhrase('');
                setRecoveryToken('');
                setRecoveryNewPassword('');
                setRecoveryNewPasswordConfirm('');
                refreshLockRecoveryStatus();
              }}
            >
              Forgot password?
            </button>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {isForgotPasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-[#181818] border border-white/10 p-6 relative">
              <button
                className="absolute top-3 right-3 text-white/40 hover:text-brand-accent"
                onClick={() => setIsForgotPasswordOpen(false)}
                aria-label="Close recovery dialog"
              >
                <X size={18} />
              </button>
              <div className="text-lg font-bold text-brand-accent mb-2">Recover Access</div>
              <div className="text-xs text-white/60 mb-4">Verify your backup phrase, then set a new password.</div>

              <div className="space-y-4">
                {/* Backup Phrase Recovery — primary */}
                <div className="border border-brand-accent/25 rounded-xl p-3 bg-brand-accent/[0.04]">
                  <div className="font-semibold text-white/90 mb-1 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-accent" />
                    Backup Recovery Phrase
                    <span className="ml-1 text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent/70">Primary</span>
                  </div>
                  {lockRecoveryStatus?.phrase?.enabled ? (
                    <>
                      <input
                        type="text"
                        value={recoveryPhrase}
                        onChange={e => setRecoveryPhrase(e.target.value)}
                        placeholder="Enter backup phrase"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-brand-accent/50"
                      />
                      <button
                        className="mt-2 w-full rounded-lg bg-brand-accent text-black font-bold px-3 py-1 text-xs disabled:opacity-50"
                        disabled={!recoveryPhrase || recoveryBusy}
                        onClick={handleVerifyRecoveryPhrase}
                      >
                        {recoveryBusy ? 'Verifying…' : 'Verify Phrase'}
                      </button>
                    </>
                  ) : (
                    <div className="text-xs text-white/45">
                      No backup phrase is set. Generate one in App Lock settings while unlocked.
                    </div>
                  )}
                </div>

                {/* Reset Password */}
                <div className="border border-white/10 rounded-xl p-3 bg-white/[0.02]">
                  <div className="font-semibold text-white/80 mb-1">Set New Password</div>
                  <div className="text-xs text-white/45 mb-2">
                    {recoveryToken ? 'Recovery verified. Choose a new password.' : 'Verify backup phrase or email code first.'}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={recoveryNewPassword}
                      onChange={(e) => setRecoveryNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-brand-accent/50"
                      disabled={!recoveryToken || recoveryResetBusy}
                    />
                    <input
                      type="password"
                      value={recoveryNewPasswordConfirm}
                      onChange={(e) => setRecoveryNewPasswordConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-brand-accent/50"
                      disabled={!recoveryToken || recoveryResetBusy}
                    />
                    <button
                      className="w-full rounded-lg bg-brand-accent text-black font-bold px-3 py-1.5 text-xs disabled:opacity-50"
                      disabled={!recoveryToken || recoveryResetBusy || !recoveryNewPassword || !recoveryNewPasswordConfirm}
                      onClick={handleResetPasswordFromRecovery}
                    >
                      {recoveryResetBusy ? 'Resetting…' : 'Reset Password'}
                    </button>
                  </div>
                </div>

                {(lockRecoveryStatusError || recoveryError) && (
                  <div className="text-xs text-red-400 text-center space-y-2">
                    <div>{recoveryError || lockRecoveryStatusError}</div>
                  </div>
                )}

                {/* Fallback/help */}
                <div className="text-xs text-white/40 text-center mt-2">
                  If you can't access your backup phrase, please contact support or check your device backups.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isMiniPlayer) {
    const miniDurationMs = currentTrack?.totalDurationMs || currentTrack?.duration || 0;
    const miniTitle = currentTrack?.title || '';
    const miniArtist = currentTrack?.author || '';
    const miniTitleMarquee = miniTitle.length > 34;
    const miniUpcomingQueue = queue.slice(1, 4);
    const miniQueueCount = Math.max(0, queue.length - 1);
    const miniShowingLyric = miniPlayerInfoMode === 'lyric' && Boolean(compactLyric);
    const miniMetaEyebrow = miniShowingLyric ? 'Live lyric' : 'Artist';
    const miniMetaLine = miniShowingLyric ? compactLyric : (miniArtist || 'Unknown artist');
    const miniTrackProgressAccent = trackPalette.progressAccent || themeColor;
    const miniTrackProgressGlow = trackPalette.progressGlow || 'rgba(0, 255, 191, 0.42)';
    const miniTrackControlAccent = trackPalette.controlAccent || themeColor;
    const miniTrackControlGlow = trackPalette.controlGlow || 'rgba(0, 255, 191, 0.38)';
    const miniTrackControlSurface = trackPalette.controlSurface || 'rgba(12, 18, 22, 0.78)';

     return (
        <div className={`w-[100vw] h-[100vh] bg-[#040607] overflow-hidden drag relative ${windowChromeInsetClass}`}>
          {/* Ambient glow from album art color */}
          <div className="absolute -top-20 left-8 h-40 w-40 rounded-full blur-[78px] opacity-28 pointer-events-none" style={{ background: `${themeColor}50` }} />
          <div className="absolute -bottom-12 right-8 h-36 w-36 rounded-full blur-[72px] opacity-20 pointer-events-none" style={{ background: `${themeColor}32` }} />

          <div className="w-full h-full bg-[#090d12]/92 backdrop-blur-2xl flex flex-col relative z-10 overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3.5 py-2 no-drag">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full transition-all flex-none ${isPlaying ? 'bg-brand-accent shadow-[0_0_10px_rgba(0,255,191,0.88)]' : 'bg-white/25'}`} />
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent/80">Aether Dock</div>
                </div>
                <button
                  onClick={() => miniQueueCount > 0 && setIsMiniQueuePeekOpen((prev) => !prev)}
                  disabled={miniQueueCount === 0}
                  className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] transition-all ${miniQueueCount > 0 ? 'border-white/10 bg-white/[0.04] text-white/55 hover:border-brand-accent/40 hover:text-brand-accent' : 'border-white/6 bg-white/[0.03] text-white/25 cursor-default'}`}
                  title={miniQueueCount > 0 ? 'Peek upcoming queue' : 'No queued tracks'}
                >
                  <ListMusic size={11} />
                  <span>{miniQueueCount}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMiniPlayerInfoMode((prev) => (prev === 'artist' ? 'lyric' : 'artist'))}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all no-drag ${miniShowingLyric ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                  title={miniShowingLyric ? 'Show artist details' : 'Show live lyric line'}
                >
                  <BookOpen size={13} />
                </button>
                <button
                  onClick={toggleMiniPlayer}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 h-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/55 transition-all no-drag hover:border-brand-accent/40 hover:bg-brand-accent/8 hover:text-brand-accent"
                  title="Expand to full studio"
                >
                  <AppWindow size={12} />
                  <span>Studio</span>
                </button>
              </div>
            </div>

            <div className="relative flex-1 min-h-0">
              {currentTrack ? (
                <>
                  {isMiniQueuePeekOpen && (
                    <div className="absolute inset-x-3 top-3 z-20 rounded-[1.4rem] border border-white/10 bg-[#071015]/96 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl no-drag">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-[0.24em] text-brand-accent/75">Queue Peek</div>
                          <div className="mt-1 text-[10px] text-white/38">{miniQueueCount} track{miniQueueCount === 1 ? '' : 's'} waiting in line</div>
                        </div>
                        <button
                          onClick={() => setIsMiniQueuePeekOpen(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/45 transition-all hover:border-white/25 hover:text-white"
                          title="Close queue peek"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {miniUpcomingQueue.length > 0 ? miniUpcomingQueue.map((track, index) => (
                          <div key={`${track.id || track.title}-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-brand-accent/20 bg-brand-accent/10 text-[9px] font-black text-brand-accent">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-black uppercase tracking-tight text-white/86">{track.title}</div>
                              <div className="truncate text-[9px] uppercase tracking-[0.18em] text-brand-accent/60">{track.author || 'Unknown artist'}</div>
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-[10px] uppercase tracking-[0.2em] text-white/35">
                            Nothing queued yet
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`flex h-full flex-col justify-between px-3.5 py-3 transition-all duration-200 ${isMiniQueuePeekOpen ? 'opacity-35 blur-[2px]' : 'opacity-100'}`}>
                    <div className="flex min-h-0 items-center gap-3">
                      <button
                        onClick={toggleMiniPlayer}
                        className="relative h-[74px] w-[74px] flex-none overflow-hidden rounded-[1.3rem] border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.45)] no-drag"
                        title="Open in Studio"
                      >
                        <img
                          src={getProxyUrl(currentTrack.thumbnail)}
                          className="h-full w-full object-cover"
                          alt=""
                        />
                        {isAudioBuffering && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                            <Loader2 size={18} className="animate-spin text-brand-accent" />
                          </div>
                        )}
                      </button>

                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <button onClick={toggleMiniPlayer} className="min-w-0 text-left no-drag" title="Open in Studio">
                          {miniTitleMarquee ? (
                            <div className="overlay-marquee">
                              <div className="overlay-marquee-track text-[15px] font-black uppercase tracking-tight text-white leading-tight">
                                <span>{miniTitle}</span>
                                <span aria-hidden="true">{miniTitle}</span>
                                <span aria-hidden="true">{miniTitle}</span>
                                <span aria-hidden="true">{miniTitle}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="truncate text-[15px] font-black uppercase tracking-tight text-white leading-tight">{miniTitle}</div>
                          )}
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <span className="rounded-full border border-brand-accent/18 bg-brand-accent/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-brand-accent/76">
                              {miniMetaEyebrow}
                            </span>
                            <div className={`min-w-0 truncate text-[11px] ${miniShowingLyric ? 'text-white/58 italic' : 'text-white/46'}`}>
                              {miniMetaLine}
                            </div>
                          </div>
                        </button>

                        <div className="space-y-1.5 no-drag">
                          <PlaybackProgressIsland
                            durationMs={miniDurationMs}
                            getPositionMs={getActivePlaybackPositionMs}
                            onSeek={handleSeek}
                            accent={miniTrackProgressAccent}
                            glow={miniTrackProgressGlow}
                            barClassName={`relative h-1.5 overflow-hidden rounded-full bg-white/10 ${miniDurationMs > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                            fillClassName="absolute inset-y-0 left-0 w-full rounded-full"
                            timeRowClassName="flex items-center justify-between gap-3 text-[9px] font-mono text-white/36"
                            middleContent={<span className="truncate uppercase tracking-[0.18em] text-white/22">{miniQueueCount > 0 ? `${miniQueueCount} up next` : 'Live audio'}</span>}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-[1.45rem] border border-white/10 px-2 py-1.5 no-drag" style={{ background: miniTrackControlSurface }}>
                        <button
                          onClick={() => handleControl('previous')}
                          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent active:scale-95"
                          title="Previous"
                        >
                          <Rewind size={15} fill="currentColor" />
                        </button>
                        <button
                          onClick={() => handleControl(isPlaying ? 'pause' : 'resume')}
                          className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] text-black transition-all hover:scale-[1.03] active:scale-95"
                          style={{ background: miniTrackControlAccent, boxShadow: `0 0 22px ${miniTrackControlGlow}` }}
                          title={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                        </button>
                        <button
                          onClick={() => handleControl('skip')}
                          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent active:scale-95"
                          title="Next"
                        >
                          <FastForward size={15} fill="currentColor" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 px-0.5 no-drag">
                      <button onClick={() => handleControl('mute')} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50 transition-all hover:border-brand-accent/35 hover:text-brand-accent" title="Mute">
                        {volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      </button>
                      <input
                        type="range"
                        min="0" max="1" step="0.01"
                        value={volume}
                        onChange={(e) => {
                          const next = parseFloat(e.target.value);
                          setVolume(next);
                          if (localAudioRef.current) localAudioRef.current.volume = next;
                          if (isStandalone) window.aether?.store?.set('volume', next);
                        }}
                        className="mini-volume-slider h-1 w-full"
                        title="Volume"
                      />
                      <div className="w-10 text-right text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent/70">
                        {Math.round(volume * 100)}%
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-white/35">
                  <Music size={18} className="text-brand-accent/50" />
                  <div className="text-[10px] font-black uppercase tracking-[0.24em]">No signal</div>
                  <button
                    onClick={toggleMiniPlayer}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 transition-all hover:border-brand-accent/35 hover:text-brand-accent no-drag"
                  >
                    Open Studio
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
     );
  }


  const headerZClass = videoMode === 'cinema' ? 'z-[120]' : 'z-[220]';
  const headerInsetClass = isMacPlatform ? 'pl-20' : 'pl-4';
  const topHeaderClass = isAuraMode
    ? `h-[72px] border-b border-white/[0.12] bg-[#07090c]/72 backdrop-blur-3xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] ${headerZClass} px-4 md:px-6 ${headerInsetClass} flex flex-row items-center justify-between gap-4 drag flex-none relative`
    : `h-[72px] border-b border-white/8 bg-[#0a0f12]/86 backdrop-blur-3xl ${headerZClass} px-4 md:px-6 ${headerInsetClass} flex flex-row items-center justify-between gap-4 drag flex-none relative`;
  const headerIconButtonClass = 'no-drag flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] text-white/54 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:-translate-y-[1px] hover:border-brand-accent/38 hover:bg-brand-accent/[0.08] hover:text-brand-accent';
  const headerAccentButtonClass = 'no-drag flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/[0.08] text-brand-accent shadow-[0_0_18px_rgba(0,255,191,0.14)] transition-all hover:-translate-y-[1px] hover:border-brand-accent/55 hover:bg-brand-accent/[0.14]';
  const panelGlassClass = isAuraMode
    ? 'bg-white/[0.015] border-white/[0.12] backdrop-blur-[26px] shadow-[0_20px_80px_rgba(0,0,0,0.28)]'
    : 'bg-white/[0.03] border-white/5';
  const panelHeaderClass = isAuraMode
    ? 'bg-white/[0.03]'
    : 'bg-white/[0.02]';
  const panelInteractiveClass = isAuraMode
    ? 'hover:border-brand-accent/35 hover:shadow-[0_18px_60px_rgba(0,255,191,0.08)] hover:-translate-y-[1px]'
    : 'hover:border-brand-accent/20';

   const doodlePresetConfig = DOODLE_PRESETS.find((preset) => preset.id === doodleIntensity) || DOODLE_PRESETS[1];
  const trackProgressAccent = trackPalette.progressAccent || themeColor;
  const trackProgressGlow = trackPalette.progressGlow || 'rgba(0, 255, 191, 0.42)';
  const trackControlAccent = trackPalette.controlAccent || themeColor;
  const trackControlGlow = trackPalette.controlGlow || 'rgba(0, 255, 191, 0.38)';
  const trimmedSearchQuery = searchQuery.trim();
  const isSearchActive = trimmedSearchQuery.length > 0;
  const hasActiveSearchState = Boolean(trimmedSearchQuery || searchResults.length > 0 || hasCompletedSearch);
  const discoveryItems = isSearchActive ? searchResults : neuralRecommendations;
  const discoveryModeLabel = isSearchActive ? 'RESULT' : 'RECOMMENDATION';

  const diagnosticsApiBase = isStandalone ? `http://localhost:${streamPort}` : API_BASE;
  const queuePollDisplay = isStandalone ? 'local' : `${diagnostics.lastQueueFetchMs ?? '—'}ms`;
  const queuePollTime = isStandalone ? 'direct engine' : formatDiagTime(diagnostics.lastQueueFetchAt);
  const cookieAudit = engineStatus?.cookieAudit || null;
  const cookieStatusLabel = !engineStatus
    ? 'CHECKING'
    : !engineStatus.cookiesReady
      ? 'NO FILE'
      : cookieAudit?.readyForYoutube
        ? 'READY FOR YOUTUBE'
        : cookieAudit?.valid
          ? 'FORMAT OK'
          : 'CHECK FILE';
  const cookieStatusTone = !engineStatus
    ? 'text-white/60'
    : !engineStatus.cookiesReady
      ? 'text-white/60'
      : cookieAudit?.readyForYoutube
        ? 'text-brand-accent'
        : cookieAudit?.valid
          ? 'text-white/80'
          : 'text-yellow-400';
  const cookieSummaryLine = !engineStatus
    ? 'Checking cookie session…'
    : !engineStatus.cookiesReady
      ? 'Anonymous requests only until a Netscape cookies.txt file is imported.'
      : cookieAudit?.summary || 'Cookie file detected.';
  const cookieAssuranceLine = !engineStatus?.cookiesReady
    ? 'Used only when YouTube asks for sign-in or confirmation.'
    : cookieAudit?.note || 'Local format scan only.';
  const ytDlpStatusLabel = !engineStatus
    ? 'CHECKING'
    : engineStatus.ytDlpReady
      ? 'READY'
      : engineStatus.ytDlpPath
        ? 'FOUND, VERIFYING'
        : 'UNAVAILABLE';
  const ytDlpStatusTone = !engineStatus
    ? 'text-white/60'
    : engineStatus.ytDlpReady
      ? 'text-brand-accent'
      : engineStatus.ytDlpPath
        ? 'text-white/80'
        : 'text-yellow-400';
  const ytDlpDetailLine = !engineStatus
    ? 'Resolving yt-dlp binary…'
    : engineStatus.ytDlpReady
      ? 'Direct fetch engine answered a version check.'
      : engineStatus.ytDlpPath
        ? 'Binary is present but has not passed a health check yet.'
        : 'No working yt-dlp binary found yet.';
  const ffmpegStatusLabel = !engineStatus
    ? 'CHECKING'
    : engineStatus.ffmpegReady
      ? 'READY'
      : 'MISSING';
  const ffmpegStatusTone = !engineStatus
    ? 'text-white/60'
    : engineStatus.ffmpegReady
      ? 'text-brand-accent'
      : 'text-yellow-400';
  const ffmpegDetailLine = !engineStatus
    ? 'Resolving ffmpeg…'
    : engineStatus.ffmpegReady
      ? 'Remux and extraction pipeline is ready.'
      : 'FFmpeg is not resolved yet.';
  const showImmersiveLyricsOverlay = Boolean(isLyricsExpanded && !showVisualStage);
  const showWindowsTitleStrip = Boolean(isStandalone && isWindowsPlatform && !isMaximized && !showImmersiveLyricsOverlay);
  const showWindowsHeaderWindowControls = Boolean(isStandalone && isWindowsPlatform && isMaximized && !showImmersiveLyricsOverlay);
  const desktopTopInsetClass = showImmersiveLyricsOverlay
    ? 'pt-0'
    : windowChromeInsetClass;
  const diagnosticPathBlockClass = 'mt-2 rounded-xl border border-white/8 bg-black/25 px-2.5 py-2 text-[10px] leading-4 font-mono text-white/55 whitespace-pre-wrap break-all';
  const repairActionLabel = isRuntimeRepairing ? 'Repairing…' : 'Repair Runtime';
  const doodleIntensityScale = doodleIntensity === 'subtle' ? 0.75 : doodleIntensity === 'dreamy' ? 1.35 : 1;
  const doodleIntensityBadge = doodlePresetConfig.badge;
  const workspaceModeLabel = isFocusedMode ? 'Focus' : isVerticalStack ? 'Stack' : 'Studio';
  const playbackModeLabel = videoMode === 'cinema' ? 'Cinema' : videoMode === 'dual' ? 'Dual Stage' : isPlaying ? 'Audio Live' : 'Ready';
  const repeatModeLabel = repeatMode === 'track' ? 'Repeat Track' : repeatMode === 'queue' ? 'Repeat Queue' : 'Repeat Off';
  const repeatModeBadge = repeatMode === 'track' ? '1' : repeatMode === 'queue' ? 'Q' : null;
  const hasLyricPreset = Boolean(currentTrackPresetKey && Object.prototype.hasOwnProperty.call(lyricOffsetPresets, currentTrackPresetKey));
  const lyricPresetActionLabel = isLyricPresetSaved ? 'Saved' : hasLyricPreset ? 'Update' : 'Save';
  const chromeTopOffset = isWindowsPlatform ? (showWindowsTitleStrip ? 114 : 84) : isMacPlatform ? 96 : 86;
  const diagnosticsTopOffset = isWindowsPlatform ? (showWindowsTitleStrip ? 120 : 88) : isMacPlatform ? 102 : 92;
  const libraryModeOptions = [
    { id: 'playlists', label: 'Vaults' },
    { id: 'songs', label: 'Songs' },
  ];
  const libraryPlaylistFilterOptions = [
    { id: 'all', label: 'All' },
    { id: 'filled', label: 'With Songs' },
    { id: 'empty', label: 'Empty' },
  ];
  const libraryPlaylistSortOptions = [
    { id: 'manual', label: 'Manual' },
    { id: 'name', label: 'A-Z' },
    { id: 'listened-desc', label: 'Recent' },
    { id: 'added-desc', label: 'Added' },
    { id: 'updated-desc', label: 'Updated' },
    { id: 'plays-desc', label: 'Played' },
    { id: 'tracks-desc', label: 'Most Songs' },
    { id: 'tracks-asc', label: 'Fewest' },
  ];
  const librarySongFilterOptions = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'played', label: 'Played' },
    { id: 'unplayed', label: 'Unplayed' },
  ];
  const librarySongSortOptions = [
    { id: 'title', label: 'Title' },
    { id: 'artist', label: 'Artist' },
    { id: 'listened-desc', label: 'Recent' },
    { id: 'added-desc', label: 'Added' },
    { id: 'plays-desc', label: 'Played' },
    { id: 'duration-desc', label: 'Longest' },
    { id: 'duration-asc', label: 'Shortest' },
  ];
  const visualStageLyric = compactLyric || activeLyric || null;
  const visualStageNextLyric = nextLyric && nextLyric !== visualStageLyric ? nextLyric : null;
  const visualStageHeaderVisible = videoMode !== 'cinema' || cinemaControlsVisible || visualControlsPinned;
  const visualStageFooterVisible = videoMode !== 'cinema' || cinemaControlsVisible || visualControlsPinned;
  const dualVisualStageWidth = 'clamp(320px, 34vw, 560px)';
  const dualVisualStageZClass = videoMode === 'cinema' ? 'z-[260]' : 'z-[180]';
  const visualStageTitle = currentTrack?.title || '';
  const visualStageTitleMarquee = visualStageTitle.length > (videoMode === 'cinema' ? 42 : 24);
  const showVisualLyricOverlay = Boolean(showVisualLyrics && visualStageLyric && (videoMode === 'cinema' || videoMode === 'dual'));
  const visualLyricOverlayBottomClass = videoMode === 'cinema'
    ? (visualStageFooterVisible ? 'bottom-28 md:bottom-36' : 'bottom-0')
    : 'bottom-24';
  const leftWorkspaceClass = isVerticalStack
    ? '!w-full !max-w-full !flex-none'
    : showSecondaryColumn
      ? 'w-[66.666%] h-full'
      : isFocusedMode
        ? 'w-full px-0 max-w-[1480px] mx-auto'
        : 'w-full px-0';
  const playerCardClass = isDualWorkspaceMode
    ? 'p-5 md:p-6 gap-6 md:gap-8 min-h-[248px] lg:min-h-[266px]'
    : 'p-6 md:p-8 gap-8 md:gap-10 min-h-[300px]';
  const playerTitleClass = isDualWorkspaceMode ? 'text-xl md:text-2xl lg:text-3xl' : 'text-2xl md:text-3xl lg:text-4xl';
  const lyricsPanelHeightClass = isVerticalStack ? 'h-[400px] flex-none' : 'flex-1';
  const lyricsViewportClass = isDualWorkspaceMode
    ? 'px-6 py-8 lg:px-12 lg:py-12 overflow-x-hidden custom-scrollbar-heavy'
    : 'p-10 lg:p-20';
  const lyricsListClass = isDualWorkspaceMode
    ? 'relative z-10 flex flex-col items-center gap-14 lg:gap-20 py-[18vh] text-center w-full mx-auto'
    : 'flex flex-col gap-6 py-4 text-center';
  const lyricsHeaderEyebrow = isDualWorkspaceMode ? 'Split Immersive' : 'Subtitles';
  const sharedModalCloseButtonClass = 'w-10 h-10 rounded-xl border border-white/15 bg-white/[0.03] text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center';
  const inspectPlaylistName = isPlaylistInspect ? String(inspectTarget?.playlistName || 'Playlist') : '';
   const inspectPlaylistSourceText = inspectPlaylistSourceUrls.join('\n');
   const inspectQueueIndex = inspectTrack ? queue.findIndex((track) => normalizeTrackIdentity(track) === normalizeTrackIdentity(inspectTrack)) : -1;
   const inspectDurationMs = inspectTrack?.totalDurationMs || inspectTrack?.duration || 0;
  const playInspectPlaylist = (shuffle = false) => {
    const normalized = inspectPlaylistTracks.map(normalizeQueueTrack).filter(Boolean);
    if (normalized.length === 0) {
      setLastAdded(`No playable tracks in ${inspectPlaylistName}`);
      setTimeout(() => setLastAdded(null), 2600);
      return;
    }
    const nextQueue = shuffle ? [...normalized].sort(() => Math.random() - 0.5) : normalized;
    setQueue(nextQueue);
    seekActivePlaybackTo(0);
    setIsPlaying(true);
    setIsManualStop(false);
    setInspectTarget(null);
    setLastAdded(`${shuffle ? 'Shuffling' : 'Playing'} ${inspectPlaylistName} (${nextQueue.length})`);
    setTimeout(() => setLastAdded(null), 2600);
  };
  const queueInspectPlaylist = () => {
    const normalized = inspectPlaylistTracks.map(normalizeQueueTrack).filter(Boolean);
    if (normalized.length === 0) {
      setLastAdded(`No playable tracks in ${inspectPlaylistName}`);
      setTimeout(() => setLastAdded(null), 2600);
      return;
    }
    const shouldStart = queue.length === 0;
    setQueue((prev) => [...(Array.isArray(prev) ? prev : []), ...normalized]);
    if (shouldStart) {
      setIsPlaying(true);
      setIsManualStop(false);
    }
    setLastAdded(`Queued ${inspectPlaylistName} (${normalized.length})`);
    setTimeout(() => setLastAdded(null), 2600);
  };
  const auraStageDurationMs = currentTrack?.totalDurationMs || currentTrack?.duration || 0;
  const auraStagePulseScale = 1 + immersiveBeatIntensity * 0.12;
  const rootModeClass = [
    isVerticalStack ? 'vertical-stack-mode' : '',
    isDoodleMode ? `doodle-mode-active doodle-preset-${doodleIntensity}` : '',
    isAuraMode ? `aura-mode-active aura-preset-${auraPreset}` : '',
    isDepthMotionEnabled ? 'aether-depth-mode' : '',
    (isGestureControlEnabled || isFaceControlEnabled) ? 'gesture-lab-active' : '',
  ].filter(Boolean).join(' ');

  return (
    <MotionConfig reducedMotion={performanceMode === 'low' ? 'always' : 'never'} transition={performanceMode === 'low' ? { duration: 0 } : undefined}>
    <div className={`fixed inset-0 bg-transparent selection:bg-brand-accent selection:text-brand-dark flex flex-col h-screen overflow-hidden relative isolate ${desktopTopInsetClass} ${rootModeClass}`} style={auraFieldStyle}>
      <div className="fixed inset-0 bg-[#050505] z-[-2]" />
      {/* Background Mesh (Absolute to avoid flex interference) */}
      <div className="absolute inset-0 bg-mesh pointer-events-none z-[-1]" />

      {isFaceControlEnabled && (
        <video
          ref={faceVideoRef}
          autoPlay
          muted
          playsInline
          className={`fixed bottom-4 left-4 z-[360] h-24 w-32 rounded-2xl border border-brand-accent/25 bg-black/70 object-cover shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-opacity ${isGestureLabOpen ? 'opacity-80' : 'pointer-events-none opacity-0'}`}
        />
      )}

      {/* ── WEB AUDIO UNLOCK OVERLAY ─────────────────────────────────────────
          Browsers block audio.play() without a prior user gesture in the tab.
          This overlay captures that gesture. It only renders in web mode
          (!isStandalone) and disappears permanently once tapped.
      ───────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isStandalone && !webAudioUnlocked && (
          <motion.div
            key="web-audio-unlock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: 'rgba(5,5,5,0.88)', backdropFilter: 'blur(28px)' }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-3xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,191,0.06) inset',
                maxWidth: 360,
                width: '90vw',
              }}
            >
              {/* Glow ring */}
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute rounded-full animate-pulse"
                  style={{
                    width: 88, height: 88,
                    background: 'radial-gradient(circle, rgba(0,255,191,0.18) 0%, transparent 70%)',
                    filter: 'blur(12px)',
                  }}
                />
                <div
                  className="relative flex items-center justify-center rounded-full"
                  style={{
                    width: 72, height: 72,
                    background: 'rgba(0,255,191,0.08)',
                    border: '1px solid rgba(0,255,191,0.22)',
                    boxShadow: '0 0 28px rgba(0,255,191,0.14)',
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18V6l12-2v12" stroke="#00ffbf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="6" cy="18" r="3" stroke="#00ffbf" strokeWidth="1.5"/>
                    <circle cx="18" cy="16" r="3" stroke="#00ffbf" strokeWidth="1.5"/>
                  </svg>
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className="font-black uppercase tracking-[0.18em] text-white"
                  style={{ fontSize: 13 }}
                >
                  Aether Studio
                </div>
                <div
                  className="font-medium text-center leading-relaxed"
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.44)', maxWidth: 240 }}
                >
                  {queue?.[0]?.title
                    ? <>Ready to play <span style={{ color: 'rgba(255,255,255,0.75)' }}>{queue[0].title}</span></>
                    : 'Tap to activate your audio session'
                  }
                </div>
              </div>

              {/* CTA button */}
              <motion.button
                id="web-audio-unlock-btn"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  // This click IS the user gesture — now play() is allowed.
                  if (localAudioRef.current) {
                    // If a track is already loaded and waiting, resume it now.
                    if (localAudioRef.current.src && localAudioRef.current.paused) {
                      localAudioRef.current.play().catch(() => {});
                    }
                  }
                  setWebAudioUnlocked(true);
                  setIsPlaying(true);
                }}
                className="flex items-center gap-3 font-black uppercase tracking-widest transition-all"
                style={{
                  background: '#00ffbf',
                  color: '#050505',
                  border: 'none',
                  borderRadius: 16,
                  padding: '14px 32px',
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  boxShadow: '0 0 32px rgba(0,255,191,0.35), 0 4px 16px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#050505">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Tap to Listen
              </motion.button>

              <div
                className="font-mono uppercase tracking-widest text-center"
                style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.25em' }}
              >
                Browser Audio Policy · One-Time
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showWindowsTitleStrip && (
        <div
          className="fixed inset-x-0 top-0 z-[260] h-[34px] border-b border-white/8 bg-[#0a0f12]/92 backdrop-blur-3xl drag"
          onDoubleClick={handleHeaderDoubleClick}
          title={isStandalone ? 'Double-click header chrome to maximize or restore' : undefined}
        >
          <div className="flex h-full items-center px-4 pr-[140px] select-none">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-accent/65 shadow-[0_0_14px_rgba(0,255,191,0.4)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Aether</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-[1px] text-[7px] font-black uppercase tracking-[0.2em] text-brand-accent/70">
                Studio
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Neural Dynamic Backdrop (NOVA */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {currentTrack?.thumbnail ? (
            <motion.div 
              key={currentTrack.thumbnail}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 bg-center bg-cover scale-110 blur-[120px]"
              style={{ backgroundImage: `url(${getProxyUrl(currentTrack.thumbnail)})` }}
            />
          ) : (
            <motion.div 
              key="standby-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.05 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-brand-accent/20 via-transparent to-brand-accent/10 blur-[150px]"
            />
          )}
        </AnimatePresence>
        <div className={`absolute inset-0 ${isAuraMode ? 'bg-brand-dark/10' : 'bg-brand-dark/20'}`} />
        <div className={`absolute inset-0 ${isAuraMode ? 'bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.30)_100%)]' : 'bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,0.38)_100%)]'}`} />
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-accent/5 blur-[100px] rounded-full animate-pulse-glow" />
         <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-brand-accent/10 blur-[80px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {isDoodleMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] doodle-cloud-layer doodle-bg-layer">
          <div className="doodle-soft-blob doodle-soft-blob-a" />
          <div className="doodle-soft-blob doodle-soft-blob-b" />
          <div className="doodle-soft-blob doodle-soft-blob-c" />
          <img src={catDoodlePeek} alt="doodle" className="absolute top-[10%] left-[-16vw] w-[70px] doodle-fly doodle-glide-a" style={{ opacity: Math.min(0.38, 0.2 * doodleIntensityScale), animationDelay: '-7s' }} draggable={false} />
          <img src={catDoodlePeek} alt="doodle" className="absolute top-[26%] left-[-16vw] w-[58px] doodle-fly doodle-glide-b" style={{ opacity: Math.min(0.34, 0.18 * doodleIntensityScale), animationDelay: '-13s', transform: 'scaleX(-1)' }} draggable={false} />
          <img src={catDoodlePeek} alt="doodle" className="absolute top-[42%] left-[-16vw] w-[64px] doodle-fly doodle-glide-c" style={{ opacity: Math.min(0.36, 0.19 * doodleIntensityScale), animationDelay: '-3s' }} draggable={false} />
          <img src={catDoodlePeek} alt="doodle" className="absolute top-[58%] left-[-16vw] w-[60px] doodle-fly doodle-glide-a" style={{ opacity: Math.min(0.34, 0.17 * doodleIntensityScale), animationDelay: '-18s', transform: 'scaleX(-1)' }} draggable={false} />
          <img src={catDoodlePeek} alt="doodle" className="absolute top-[74%] left-[-16vw] w-[68px] doodle-fly doodle-glide-b" style={{ opacity: Math.min(0.36, 0.2 * doodleIntensityScale), animationDelay: '-23s' }} draggable={false} />
          <img src={catDoodlePeek} alt="doodle" className="absolute top-[88%] left-[-16vw] w-[62px] doodle-fly doodle-glide-c" style={{ opacity: Math.min(0.33, 0.17 * doodleIntensityScale), animationDelay: '-29s', transform: 'scaleX(-1)' }} draggable={false} />
        </div>
      )}

      {/* AURA MODE: Full-screen aura field */}
      {isAuraMode && (
        <div className="aura-field fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
          <div className="aura-field-tone aura-field-tone-left" style={{ opacity: 'calc(var(--aura-field-flare, 0) * 0.52)' }} />
          <div className="aura-field-tone aura-field-tone-right" style={{ opacity: 'calc(var(--aura-field-flare, 0) * 0.48)' }} />
          <div className="aura-field-core aura-field-core-a" style={{ opacity: 'var(--aura-field-boost, 0)' }} />
          <div className="aura-field-core aura-field-core-b" style={{ opacity: 'calc(var(--aura-field-boost, 0) * 0.82)' }} />
          <div className="aura-field-ribbon aura-field-ribbon-a" style={{ opacity: 'var(--aura-field-flare, 0)' }} />
          <div className="aura-field-ribbon aura-field-ribbon-b" style={{ opacity: 'calc(var(--aura-field-flare, 0) * 0.92)' }} />
          <div className="aura-field-orbits">
            {[
              ['18%', '12%', '7s', '1.2s', '16px'],
              ['72%', '16%', '9s', '3.4s', '12px'],
              ['48%', '78%', '11s', '0s', '22px'],
              ['12%', '68%', '13s', '2.2s', '10px'],
              ['86%', '58%', '10s', '4.1s', '14px'],
            ].map(([left, top, duration, delay, size], index) => (
              <span
                key={`aura-orbit-${index}`}
                className="aura-field-orbit"
                style={{ left, top, width: size, height: size, animationDuration: duration, animationDelay: delay }}
              />
            ))}
          </div>
          <div className="aura-field-particles">
            {[
              ['9%', '18%', '12s', '0s'],
              ['24%', '72%', '14s', '2.5s'],
              ['41%', '24%', '11s', '1.1s'],
              ['58%', '66%', '16s', '4s'],
              ['77%', '32%', '13s', '3.1s'],
              ['91%', '78%', '18s', '0.7s'],
            ].map(([left, top, duration, delay], index) => (
              <span
                key={`aura-particle-${index}`}
                className="aura-field-particle"
                style={{ left, top, animationDuration: duration, animationDelay: delay }}
              />
            ))}
          </div>
        </div>
      )}

      {/* APP HEADER */}
      {!showImmersiveLyricsOverlay && (
      <header className={topHeaderClass} onDoubleClick={handleHeaderDoubleClick} title={isStandalone ? 'Double-click the header background to maximize or restore' : undefined}>
        <div className="flex min-w-0 items-center gap-3 lg:min-w-[220px]">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[1.35rem] border border-brand-accent/25 bg-white/[0.04] shadow-[0_0_28px_rgba(0,255,191,0.08)]">
            <img src="aether-logo.png" alt="Aether" className="h-6 w-6 object-contain" onError={(e) => e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGZmYmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWdvbiBwb2ludHM9IjEzIDIgMyAxNCAxMiAxNCAxMSAyMiAyMSAxMCAxMiAxMCAxMyAyIj48L3BvbHlnb24+PC9zdmc+'} />
            <div className="absolute inset-0 bg-brand-accent/6 opacity-70" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.08em] text-white/92">Aether</span>
              <span className="rounded-full border border-brand-accent/30 bg-brand-accent/10 px-1.5 py-[2px] text-[7px] font-black uppercase tracking-[0.18em] text-brand-accent/80">
                {BUILD_VERSION}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-1.5 py-[2px] text-[7px] font-black uppercase tracking-[0.16em] text-white/55">
                v{APP_VERSION}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-white/38">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-white/52">{workspaceModeLabel}</span>
              <span className="truncate text-brand-accent/70">{playbackModeLabel}</span>
            </div>
          </div>
        </div>

        <HeaderVisualControls
          ref={headerControlsRef}
          headerIconButtonClass={headerIconButtonClass}
          headerAccentButtonClass={headerAccentButtonClass}
          isGestureControlEnabled={isGestureControlEnabled}
          openFeedbackPanel={openFeedbackPanel}
          openGestureLab={openGestureLab}
          openSignalLedger={openSignalLedger}
          setVisualizerMode={setVisualizerMode}
          visualizerMode={visualizerMode}
          auraPreset={auraPreset}
          setAuraPreset={setAuraPreset}
          isDepthMotionEnabled={isDepthMotionEnabled}
          setIsDepthMotionEnabled={setIsDepthMotionEnabled}
          isDoodleMode={isDoodleMode}
          setIsDoodleMode={setIsDoodleMode}
          doodleIntensity={doodleIntensity}
          setDoodleIntensity={setDoodleIntensity}
          doodleIntensityBadge={doodleIntensityBadge}
          setIsAuraStageOpen={setIsAuraStageOpen}
          toggleDiagnostics={toggleDiagnostics}
          isDiagnosticsOpen={isDiagnosticsOpen}
          setLastAdded={setLastAdded}
          shortcuts={shortcuts}
          setShortcuts={setShortcuts}
          isMacPlatform={isMacPlatform}
          isStandalone={isStandalone}
          globalMediaShortcutsEnabled={globalMediaShortcutsEnabled}
          setGlobalMediaShortcutsEnabled={setGlobalMediaShortcutsEnabled}
          performanceMode={performanceMode}
          setPerformanceMode={setPerformanceMode}
          onSurfaceOpen={(surface) => closeHeaderSurfaces(surface)}
        />
        <div className="order-3 flex w-full justify-center ultra-compact-hide no-drag md:order-2 md:flex-1 md:max-w-[900px] md:px-4 lg:px-6" data-no-maximize="true">
          <HeaderSearchBox
            searchQuery={searchQuery}
            isSearching={isSearching}
            hasActiveSearchState={hasActiveSearchState}
            isAuraMode={isAuraMode}
            disabled={videoMode === 'dual'}
            onSearch={handleSearch}
            onClear={() => {
              setSearchQuery('');
              clearDiscoveryResults();
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-2 min-w-fit order-3 no-drag" data-no-maximize="true">
          <HeaderSleepTimerControls
            ref={sleepTimerControlsRef}
            headerIconButtonClass={headerIconButtonClass}
            sleepTimerValue={sleepTimerValue}
            stopAfterTrack={stopAfterTrack}
            sleepRemainingStr={sleepRemainingStr}
            sleepDeadline={sleepDeadline}
            handleSetSleepTimer={handleSetSleepTimer}
            sleepCustomMinutes={sleepCustomMinutes}
            setSleepCustomMinutes={setSleepCustomMinutes}
            setStopAfterTrack={setStopAfterTrack}
            sleepFadeEnabled={sleepFadeEnabled}
            setSleepFadeEnabled={setSleepFadeEnabled}
            onSurfaceOpen={() => closeHeaderSurfaces('sleep')}
          />
          <div className={`hidden md:flex items-center gap-1 rounded-[1.15rem] border p-1 no-drag ${isDualLayoutLocked ? 'border-white/8 bg-white/[0.03]' : 'border-white/12 bg-white/[0.04]'}`} title={isDualLayoutLocked ? 'Layout switching is unavailable while Dual View is active' : 'Workspace layout'}>
            <button
              onClick={() => setIsVerticalStack(false)}
              disabled={isDualLayoutLocked}
              className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${!isVerticalStack ? 'bg-brand-accent text-black shadow-[0_0_16px_rgba(0,255,191,0.28)]' : isDualLayoutLocked ? 'text-white/20 cursor-not-allowed' : 'text-white/45 hover:text-brand-accent'}`}
            >
              Studio
            </button>
            <button
              onClick={() => setIsVerticalStack(true)}
              disabled={isDualLayoutLocked}
              className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${isVerticalStack ? 'bg-brand-accent text-black shadow-[0_0_16px_rgba(0,255,191,0.28)]' : isDualLayoutLocked ? 'text-white/20 cursor-not-allowed' : 'text-white/45 hover:text-brand-accent'}`}
            >
              Stack
            </button>
          </div>

          {isStandalone && (
            <button
              onClick={() => {
                runAfterInputPaint(() => {
                  closeHeaderSurfaces('lock');
                  appLockSettingsRef.current?.open();
                });
              }}
              className={`${headerIconButtonClass} ${lockStatus.enabled ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : ''}`}
              title="App Lock"
            >
              <Lock size={16} />
            </button>
          )}

          {showWindowsHeaderWindowControls && (
            <div className="ml-1 flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 no-drag">
              <button
                onClick={() => window.aether?.minimize?.()}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 transition-all hover:bg-white/10 hover:text-white"
                title="Minimize"
              >
                <span className="translate-y-[-1px] text-sm leading-none">-</span>
              </button>
              <button
                onClick={toggleWindowMaximize}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 transition-all hover:bg-white/10 hover:text-white"
                title="Restore"
              >
                <Minimize2 size={12} />
              </button>
              <button
                onClick={() => window.aether?.closeWindow?.()}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 transition-all hover:bg-red-500/20 hover:text-red-300"
                title="Close"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </header>
      )}

      <SignalLedgerIsland
        ref={soundCapsuleRef}
        getProxyUrl={getProxyUrl}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        getActivePlaybackPositionMs={getActivePlaybackPositionMs}
        setLastAdded={setLastAdded}
      />
      <GestureLabIsland
        ref={gestureLabRef}
        isGestureControlEnabled={isGestureControlEnabled}
        setIsGestureControlEnabled={setIsGestureControlEnabled}
        isFaceControlEnabled={isFaceControlEnabled}
        setIsFaceControlEnabled={setIsFaceControlEnabled}
        faceControlStatus={faceControlStatus}
        faceControlSignal={faceControlSignal}
        cameraHandSignal={cameraHandSignal}
        sharedModalCloseButtonClass={sharedModalCloseButtonClass}
      />
      <FeedbackIsland
        ref={feedbackRef}
        platform={platform}
        isStandalone={isStandalone}
        currentTrack={currentTrack}
        getActivePlaybackPositionMs={getActivePlaybackPositionMs}
        videoMode={videoMode}
        visualizerMode={visualizerMode}
        auraPreset={auraPreset}
        queueLength={queue.length}
        lyricsCount={lyrics.length}
        appendRecentEvent={appendRecentEvent}
        sharedModalCloseButtonClass={sharedModalCloseButtonClass}
      />
      <AppLockSettingsIsland
        ref={appLockSettingsRef}
        isStandalone={isStandalone}
        lockStatus={lockStatus}
        lockIdleMinutes={lockIdleMinutes}
        setLockIdleMinutes={setLockIdleMinutes}
        refreshLockStatus={refreshLockStatus}
        setIsAppLocked={setIsAppLocked}
        setLastAdded={setLastAdded}
        sharedModalCloseButtonClass={sharedModalCloseButtonClass}
      />

      <AnimatePresence>
        {isSoundCapsuleOpen && soundCapsuleData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-0 z-[350] overflow-y-auto px-4 py-5 md:px-8 md:py-8"
          >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" onClick={() => setIsSoundCapsuleOpen(false)} />
            <div className="relative z-10 mx-auto flex min-h-full w-full items-start justify-center">
              <div className="w-full max-w-[1180px] max-h-[calc(100vh-2.5rem)] glass-card bg-[#090b0f]/96 border border-brand-accent/20 rounded-[2.2rem] overflow-hidden flex flex-col shadow-[0_28px_100px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between gap-4 p-5 md:p-6 border-b border-white/8 bg-black/25 backdrop-blur-md">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-brand-accent/10 border border-brand-accent/25 flex items-center justify-center shrink-0">
                    <Signal size={18} className="text-brand-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.32em] text-white/30">PLAYBACK INTELLIGENCE</div>
                    <div className="text-xl md:text-2xl font-black uppercase tracking-tight text-brand-accent truncate">Signal Ledger</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                      {soundLedgerView.activeDays > 0 ? `${soundLedgerView.activeDays} active days • ${soundLedgerView.totalSessions} sessions captured` : 'Listening patterns appear as you play'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsSoundCapsuleOpen(false)} className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5 lg:px-7 lg:pb-7 lg:pt-6 custom-scrollbar">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                  <div className="xl:col-span-8 flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="glass-card bg-brand-accent/6 border border-brand-accent/20 rounded-[1.6rem] p-5">
                        <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/38">Listening Time</div>
                        <div className="mt-4 text-3xl md:text-4xl font-black text-brand-accent">{formatPlaybackDuration(soundLedgerView.totalMs)}</div>
                        <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/34">Across {soundLedgerView.activeDays || 0} recent active days</div>
                      </div>
                      <div className="glass-card bg-white/[0.03] border border-white/10 rounded-[1.6rem] p-5">
                        <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/38">Qualified Plays</div>
                        <div className="mt-4 text-3xl md:text-4xl font-black text-white">{soundLedgerView.totalTracksPlayed}</div>
                        <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/34">{soundLedgerView.totalSessions} playback sessions tracked</div>
                      </div>
                      <div className="glass-card bg-white/[0.03] border border-white/10 rounded-[1.6rem] p-5">
                        <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/38">Peak Windows</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {soundLedgerView.topWindow.length > 0 ? soundLedgerView.topWindow.map((entry) => (
                            <span key={entry.hour} className="rounded-full border border-brand-accent/18 bg-brand-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent">
                              {entry.label} • {entry.count}
                            </span>
                          )) : (
                            <span className="text-[10px] uppercase tracking-[0.18em] text-white/28">Collecting signal…</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="glass-card bg-white/[0.03] border border-white/10 rounded-[1.75rem] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Recent Week</div>
                            <div className="mt-1 text-[11px] text-white/34 uppercase tracking-[0.14em]">Daily listening bars + play counts</div>
                          </div>
                          <div className="text-[10px] text-white/30 uppercase tracking-[0.16em]">{Math.round(soundLedgerView.totalMs / 60000)} min total</div>
                        </div>
                        <div className="mt-5 grid grid-cols-7 gap-2">
                          {soundLedgerView.recentWeek.map((entry) => (
                            <div key={entry.key} className="rounded-[1.3rem] border border-white/8 bg-black/20 px-2 py-3 flex flex-col items-center gap-3">
                              <div className="h-28 w-full flex items-end justify-center">
                                <div
                                  className="w-full max-w-[26px] rounded-full bg-gradient-to-t from-brand-accent via-brand-accent/80 to-white shadow-[0_0_18px_rgba(0,255,191,0.18)]"
                                  style={{ height: `${entry.minutesMs > 0 ? 18 + ((entry.minutesMs / soundLedgerView.weekMaxMs) * 82) : 12}%` }}
                                />
                              </div>
                              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">{entry.label}</div>
                              <div className="text-[9px] font-mono text-brand-accent">{Math.round(entry.minutesMs / 60000)}m</div>
                              <div className="text-[8px] uppercase tracking-[0.16em] text-white/28">{entry.plays}p</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="glass-card bg-white/[0.03] border border-white/10 rounded-[1.75rem] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Hourly Pulse</div>
                            <div className="mt-1 text-[11px] text-white/34 uppercase tracking-[0.14em]">When you most often press play</div>
                          </div>
                          <Signal size={16} className="text-brand-accent/70" />
                        </div>
                        <div className="mt-5 grid grid-cols-12 gap-1.5">
                          {soundLedgerView.peakHours.map((entry) => (
                            <div key={entry.hour} className="flex flex-col items-center gap-2">
                              <div className="h-24 w-full flex items-end justify-center">
                                <div
                                  className={`w-full rounded-full ${entry.count > 0 ? 'bg-brand-accent/85 shadow-[0_0_14px_rgba(0,255,191,0.14)]' : 'bg-white/[0.06]'}`}
                                  style={{ height: `${entry.count > 0 ? 12 + ((entry.count / soundLedgerView.peakHourMax) * 88) : 10}%` }}
                                />
                              </div>
                              <div className="text-[8px] font-mono text-white/28">{entry.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="glass-card bg-white/[0.03] border border-white/10 rounded-[1.75rem] p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Recent Sessions</div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {soundLedgerView.recentSessions.length > 0 ? soundLedgerView.recentSessions.map((session) => (
                          <div key={session.id} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-3 flex items-center gap-3">
                            <img src={getProxyUrl(session.thumbnail)} className="w-14 h-14 rounded-xl object-cover bg-white/[0.03]" alt="" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent">
                                {formatPlaybackDuration(session.playedMs)} • {session.completed ? 'completed' : 'session'}
                              </div>
                              <div className="mt-1 text-sm font-black text-white truncate uppercase tracking-tight">{session.title}</div>
                              <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35 truncate">{session.author}</div>
                            </div>
                          </div>
                        )) : (
                          <div className="md:col-span-2 rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 p-5 text-[11px] uppercase tracking-[0.18em] text-white/28">
                            Finish a couple of real listens and this panel will start showing your latest sessions.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-4 flex flex-col gap-4">
                    <div className="glass-card bg-white/[0.03] border border-white/10 rounded-[1.75rem] p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Top Artists</div>
                      <div className="mt-4 flex flex-col gap-2.5">
                        {soundLedgerView.topArtists.length > 0 ? soundLedgerView.topArtists.map(([name, entry], idx) => (
                          <div key={name} className="rounded-[1.25rem] border border-white/10 bg-black/20 px-3.5 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent">#{idx + 1}</div>
                              <div className="mt-1 text-sm font-black text-white truncate uppercase tracking-tight">{name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/48">{entry.count} plays</div>
                              <div className="mt-1 text-[10px] font-mono text-white/28">{formatPlaybackDuration(entry.totalMs)}</div>
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-black/20 p-4 text-[10px] uppercase tracking-[0.18em] text-white/28">
                            Artist rankings appear after a few qualified sessions.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="glass-card bg-white/[0.03] border border-white/10 rounded-[1.75rem] p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Genre Pulse</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {soundLedgerView.genreMix.length > 0 ? soundLedgerView.genreMix.map(([genre, count]) => (
                          <span key={genre} className="rounded-full border border-brand-accent/18 bg-brand-accent/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent">
                            {genre} • {count}
                          </span>
                        )) : (
                          <span className="text-[10px] uppercase tracking-[0.18em] text-white/28">No pattern clusters yet</span>
                        )}
                      </div>
                    </div>

                    <div className="glass-card bg-white/[0.03] border border-white/10 rounded-[1.75rem] p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Most Replayed</div>
                      <div className="mt-4 flex flex-col gap-2.5">
                        {soundLedgerView.topTracks.length > 0 ? soundLedgerView.topTracks.map(([id, entry], idx) => (
                          <div key={id} className="rounded-[1.25rem] border border-white/10 bg-black/20 p-3 flex items-center gap-3">
                            <img src={getProxyUrl(entry.thumbnail)} className="w-12 h-12 rounded-xl object-cover bg-white/[0.03]" alt="" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent">#{idx + 1} • {entry.count} plays</div>
                              <div className="mt-1 text-sm font-black text-white truncate uppercase tracking-tight">{entry.title}</div>
                              <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35 truncate">{entry.author}</div>
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-black/20 p-4 text-[10px] uppercase tracking-[0.18em] text-white/28">
                            Repeats land here once a track gets replayed.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShortcutSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[340] flex items-start justify-center p-4 pt-6 md:items-center md:pt-4"
            onClick={closeShortcutSettings}
          >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.96, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="relative z-10 flex w-[min(96vw,920px)] max-h-[min(92vh,calc(100vh-2rem))] flex-col overflow-hidden rounded-[2rem] border border-brand-accent/25 bg-[#090b0f]/95 shadow-[0_0_90px_rgba(0,255,191,0.15)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/20 px-5 py-5 md:px-6 md:py-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Settings</div>
                  <div className="text-2xl md:text-3xl font-black text-brand-accent uppercase tracking-tight">Shortcut Settings</div>
                  <div className="text-white/55 mt-2 text-sm">Use formats like <span className="text-brand-accent">Mod+Alt+Space</span>, <span className="text-brand-accent">Shift+M</span>, <span className="text-brand-accent">D</span>.</div>
                </div>
                <button onClick={closeShortcutSettings} className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.03] text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close shortcut settings">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5 custom-scrollbar-heavy">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SHORTCUT_FIELDS.map((field) => (
                    <label key={field.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-white/75 text-sm">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-2">{field.label}</div>
                      <input
                        value={shortcutDraft[field.id] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setShortcutSettingsError('');
                          setShortcutDraft((prev) => ({ ...prev, [field.id]: value }));
                        }}
                        className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-brand-accent/50"
                        placeholder="Mod+Alt+Space"
                      />
                      <div className="mt-1 text-[11px] text-white/40">Current: {toReadableShortcut(shortcuts[field.id], isMacPlatform)}</div>
                    </label>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <label className="flex items-start gap-3 text-sm text-white/75">
                    <input
                      type="checkbox"
                      checked={globalMediaShortcutsEnabled}
                      onChange={(e) => setGlobalMediaShortcutsEnabled(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-brand-accent"
                    />
                    <span>
                      Enable global media shortcuts (play/pause, next, previous)
                      <span className="block text-[11px] text-white/45 mt-1">This affects system-wide key capture and may conflict with OS/app controls. Restart app after change.</span>
                    </span>
                  </label>
                </div>

                {shortcutSettingsError && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {shortcutSettingsError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap border-t border-white/10 bg-black/20 px-5 py-4 md:px-6 md:py-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={resetShortcutSettingsToDefaults}
                    className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 hover:border-brand-accent/40 hover:text-brand-accent transition-all"
                  >
                    Reset to Defaults
                  </button>
                  <button
                    onClick={() => {
                      closeShortcutSettings();
                      setTimeout(() => openTipsOverlay(), 0);
                    }}
                    className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 hover:border-brand-accent/40 hover:text-brand-accent transition-all"
                  >
                    Open Guide
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={closeShortcutSettings}
                    className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 hover:border-brand-accent/40 hover:text-brand-accent transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveShortcutSettings}
                    className="px-4 py-2 rounded-xl border border-brand-accent/35 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTipsOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[310] flex items-center justify-center p-4"
            onClick={closeTipsOverlay}
          >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.96, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="relative z-10 w-[min(94vw,860px)] max-h-[88vh] overflow-y-auto rounded-3xl border border-brand-accent/25 bg-[#090b0f]/95 p-5 md:p-7 shadow-[0_0_90px_rgba(0,255,191,0.15)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">First-run Guide</div>
                  <div className="text-2xl md:text-3xl font-black text-brand-accent uppercase tracking-tight">Welcome to Aether</div>
                  <div className="text-white/55 mt-2 text-sm">Quick controls and feature map so you can use everything in under a minute.</div>
                </div>
                <button onClick={closeTipsOverlay} className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.03] text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close tips">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Command Shortcuts</div>
                  <ul className="mt-3 space-y-2 text-white/75">
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.playPause, isMacPlatform)}</span> — Play / Pause</li>
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.previous, isMacPlatform)}</span> — Previous</li>
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.next, isMacPlatform)}</span> — Next</li>
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.volumeUp, isMacPlatform)}</span> — Volume up</li>
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.volumeDown, isMacPlatform)}</span> — Volume down</li>
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.mute, isMacPlatform)}</span> — Mute / Unmute</li>
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.clearQueue, isMacPlatform)}</span> — Clear queue</li>
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.focusMode, isMacPlatform)}</span> — Toggle focus view</li>
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.miniPlayer, isMacPlatform)}</span> — Toggle mini player</li>
                    <li><span className="text-brand-accent font-black">{toReadableShortcut(shortcuts.diagnostics, isMacPlatform)}</span> — Open diagnostics panel</li>
                  </ul>
                  <div className="mt-3 text-[11px] text-white/45">Tip: media keys may be managed by your OS. App shortcuts above always work while Aether is focused.</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Main Buttons</div>
                  <ul className="mt-3 space-y-2 text-white/75">
                    <li><span className="text-brand-accent font-black">Search bar</span> — find songs quickly</li>
                    <li><span className="text-brand-accent font-black">Studio / Stack</span> — switch workspace layout</li>
                    <li><span className="text-brand-accent font-black">Focus</span> — hide side panels for a cleaner stage</li>
                    <li><span className="text-brand-accent font-black">Diagnostics</span> — debug network/playback issues</li>
                    <li><span className="text-brand-accent font-black">Vault overlay</span> — save/import/export playlists</li>
                    <li><span className="text-brand-accent font-black">Smart Mix</span> — generate instant context playlist</li>
                    <li><span className="text-brand-accent font-black">Sleep Timer</span> — auto-stop playback later</li>
                  </ul>
                </div>
              </div>

              <label className="mt-5 flex items-center gap-3 text-sm text-white/70 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={tipsDontShowAgain}
                  onChange={(e) => setTipsDontShowAgain(e.checked)}
                  className="w-4 h-4 accent-brand-accent"
                />
                Don’t show this again on app startup
              </label>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    closeTipsOverlay();
                    openShortcutSettings();
                  }}
                  className="px-4 py-2 rounded-xl border border-brand-accent/35 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-all"
                >
                  Customize Shortcuts
                </button>
                <button
                  onClick={closeTipsOverlay}
                  className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 hover:border-brand-accent/40 hover:text-brand-accent transition-all"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDiagnosticsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="fixed right-4 md:right-6 z-[240] w-[min(92vw,420px)] overflow-y-auto custom-scrollbar glass-card bg-[#07090c]/90 border border-white/10 backdrop-blur-2xl rounded-3xl p-4 md:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            style={{ top: diagnosticsTopOffset, maxHeight: `calc(100vh - ${diagnosticsTopOffset + 16}px)` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-[0.24em] uppercase font-black text-brand-accent">Diagnostics</div>
              <button onClick={() => setIsDiagnosticsOpen(false)} className="text-white/40 hover:text-brand-accent transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleResetPlaybackEngine}
                className="px-3 py-1.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent text-[10px] font-black uppercase tracking-[0.16em] hover:bg-brand-accent/20 transition-all"
              >
                Reset Engine
              </button>
              {isStandalone && (
                <button
                  onClick={handleRunRuntimeRepair}
                  disabled={isRuntimeRepairing}
                  className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 text-[10px] font-black uppercase tracking-[0.16em] hover:border-brand-accent/35 hover:text-brand-accent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {repairActionLabel}
                </button>
              )}
              <button
                onClick={() => setSkipEvents([])}
                className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 text-[10px] font-black uppercase tracking-[0.16em] hover:border-white/30 transition-all"
              >
                Clear Events
              </button>
              {canUseUpdater && updateInfo?.enabled && (
                <button
                  onClick={handleUpdateAction}
                  disabled={isUpdateBusy || updateInfo?.status === 'checking' || updateInfo?.status === 'downloading'}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:opacity-60 disabled:cursor-not-allowed ${updateInfo?.downloaded ? 'bg-brand-accent border-brand-dark text-brand-dark shadow-neon-strong' : updateInfo?.available ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent hover:bg-brand-accent/20' : 'border-white/15 bg-white/[0.03] text-white/70 hover:border-white/30'}`}
                  title={updateInfo?.message || 'Check for updates'}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw size={11} className={`${updateInfo?.status === 'checking' || updateInfo?.status === 'downloading' ? 'animate-spin' : ''}`} />
                    {updateActionLabel}
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-white/40 uppercase mb-1">Transport</div>
                <div className={`font-black ${isAudioBuffering ? 'text-yellow-400' : isPlaying ? 'text-brand-accent' : 'text-white/70'}`}>
                  {isAudioBuffering ? 'BUFFERING' : isPlaying ? 'PLAYING' : 'PAUSED'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-white/40 uppercase mb-1">Queue</div>
                <div className="font-black text-brand-accent">{Math.max(0, queue.length - 1)} pending</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-white/40 uppercase mb-1">App CPU</div>
                <div className="font-black text-brand-accent">{systemStats?.appCpu ?? 0}%</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-white/40 uppercase mb-1">App Memory</div>
                <div className="font-black text-brand-accent">{systemStats?.appMem ?? 0}MB</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                <div className="text-white/40 uppercase mb-1">Workspace Mode</div>
                <div className="font-black text-white/80">{workspaceModeLabel} • {playbackModeLabel}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                <div className="text-white/40 uppercase mb-1">Current Node</div>
                <div className="font-black text-white/85 truncate">{currentTrack?.title || '—'}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-white/40 uppercase mb-1">Queue Poll</div>
                <div className="font-black text-brand-accent">{queuePollDisplay}</div>
                <div className="text-white/40 mt-1">{queuePollTime}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-white/40 uppercase mb-1">System Poll</div>
                <div className="font-black text-brand-accent">{diagnostics.lastSystemFetchMs ?? '—'}ms</div>
                <div className="text-white/40 mt-1">{formatDiagTime(diagnostics.lastSystemFetchAt)}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-white/40 uppercase mb-1">Lyrics Source</div>
                <div className="font-black text-brand-accent truncate">{diagnostics.lastLyricsSource || '—'}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-white/40 uppercase mb-1">Song Fetch</div>
                <div className="font-black text-brand-accent">{diagnostics.lastSongFetchMs ?? '—'}ms</div>
                <div className="text-white/40 mt-1 truncate">{diagnostics.lastSongSource || '-'}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                <div className="text-white/40 uppercase mb-1">Lyrics Fetch</div>
                <div className="font-black text-brand-accent">{diagnostics.lastLyricsFetchMs ?? '—'}ms</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                <div className="text-white/40 uppercase mb-1">Sync State</div>
                <div className="font-black text-white/80">offset {lyricOffsetMs}ms • line {activeLyricIndex >= 0 ? activeLyricIndex + 1 : 0} • {isAutoScrollPaused ? 'manual' : 'auto'}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                <div className="text-white/40 uppercase mb-1">Transport Guard</div>
                <div className="font-black text-white/80">
                  hits {diagnostics.transportGuardHits ?? 0}
                  {diagnostics.lastTransportGuardAction ? ` • last ${diagnostics.lastTransportGuardAction}` : ''}
                  {diagnostics.lastTransportGuardAt ? ` • ${formatDiagTime(diagnostics.lastTransportGuardAt)}` : ''}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                <div className="text-white/40 uppercase mb-1">API Base</div>
                <div className="font-black text-white/70">{diagnosticsApiBase}</div>
                <div className={diagnosticPathBlockClass}>{diagnosticsApiBase}</div>
                <button
                  onClick={() => handleCopyDiagnosticsValue(diagnosticsApiBase, 'API base copied')}
                  className="mt-2 inline-flex items-center rounded-lg border border-white/12 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent transition-all"
                >
                  Copy
                </button>
              </div>

              {isStandalone && (
                <>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                    <div className="text-white/40 uppercase mb-1">YT-DLP</div>
                    <div className={`font-black ${ytDlpStatusTone}`}>
                      {ytDlpStatusLabel}
                    </div>
                    <div className="text-white/45 mt-1">{ytDlpDetailLine}</div>
                    <div className={diagnosticPathBlockClass}>{engineStatus?.ytDlpPath || 'bootstrap pending'}</div>
                    {engineStatus?.ytDlpPath && (
                      <button
                        onClick={() => handleCopyDiagnosticsValue(engineStatus.ytDlpPath, 'yt-dlp path copied')}
                        className="mt-2 inline-flex items-center rounded-lg border border-white/12 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent transition-all"
                      >
                        Copy Path
                      </button>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                    <div className="text-white/40 uppercase mb-1">FFmpeg</div>
                    <div className={`font-black ${ffmpegStatusTone}`}>
                      {ffmpegStatusLabel}
                    </div>
                    <div className="text-white/45 mt-1">{ffmpegDetailLine}</div>
                    <div className={diagnosticPathBlockClass}>{engineStatus?.ffmpegPath || 'not resolved'}</div>
                    {engineStatus?.ffmpegPath && (
                      <button
                        onClick={() => handleCopyDiagnosticsValue(engineStatus.ffmpegPath, 'FFmpeg path copied')}
                        className="mt-2 inline-flex items-center rounded-lg border border-white/12 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent transition-all"
                      >
                        Copy Path
                      </button>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                    <div className="text-white/40 uppercase mb-1">Cookies Session</div>
                    <div className={`font-black ${cookieStatusTone}`}>
                      {cookieStatusLabel}
                    </div>
                    <div className="text-white/45 mt-1">{cookieSummaryLine}</div>
                    <div className="text-[10px] text-white/35 mt-1">{cookieAssuranceLine}</div>
                    {engineStatus?.cookiesPath && (
                      <div className={diagnosticPathBlockClass}>{engineStatus.cookiesPath}</div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={handleImportCookies}
                        className="px-2.5 py-1.5 rounded-lg border border-brand-accent/30 text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 transition-all"
                      >
                        Upload Cookies
                      </button>
                      {engineStatus?.cookiesPath && (
                        <button
                          onClick={() => handleCopyDiagnosticsValue(engineStatus.cookiesPath, 'Cookie path copied')}
                          className="px-2.5 py-1.5 rounded-lg border border-white/15 text-white/70 bg-white/[0.03] hover:border-brand-accent/30 hover:text-brand-accent transition-all"
                        >
                          Copy Path
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (isStandalone && window.aether?.openExternal) {
                            window.aether.openExternal('https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies');
                          } else {
                            window.open('https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies', '_blank');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-white/15 text-white/70 bg-white/[0.03] hover:border-white/30 transition-all"
                      >
                        Cookie Guide
                      </button>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                    <div className="text-white/40 uppercase mb-1">Storage</div>
                    <div className="font-black text-brand-accent">{formatBytes(storageStats?.totalBytes || 0)}</div>
                    <div className="text-white/45 mt-1">
                      downloads {formatBytes(storageStats?.downloadsBytes || 0)} • cache {formatBytes(storageStats?.cacheBytes || 0)}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 col-span-2 space-y-2">
                    <div className="text-white/40 uppercase">Storage Policy</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-white/55">
                        Cache cap (MB)
                        <input
                          type="number"
                          min={256}
                          max={16384}
                          value={storagePolicy.cacheCapMb}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value || '2048', 10);
                            setStoragePolicy(prev => ({ ...prev, cacheCapMb: Number.isFinite(parsed) ? Math.max(256, parsed) : 2048 }));
                          }}
                          className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
                        />
                      </label>
                      <label className="text-white/55">
                        Age cleanup (days)
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={storagePolicy.maxCacheAgeDays}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value || '30', 10);
                            setStoragePolicy(prev => ({ ...prev, maxCacheAgeDays: Number.isFinite(parsed) ? Math.max(1, parsed) : 30 }));
                          }}
                          className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={isStorageBusy}
                        onClick={async () => { await applyStoragePolicy(storagePolicy); await refreshStorageStats(); }}
                        className="px-2 py-1 rounded-lg border border-brand-accent/30 text-brand-accent bg-brand-accent/10 disabled:opacity-50"
                      >
                        Save Policy
                      </button>
                      <button
                        disabled={isStorageBusy}
                        onClick={() => runStorageOptimize('cap')}
                        className="px-2 py-1 rounded-lg border border-white/15 text-white/75 bg-white/[0.03] disabled:opacity-50"
                      >
                        Trim to Cap {storageEstimate.cap ? `(${formatBytes(storageEstimate.cap.estimatedBytes)})` : ''}
                      </button>
                      <button
                        disabled={isStorageBusy}
                        onClick={() => runStorageOptimize('age')}
                        className="px-2 py-1 rounded-lg border border-white/15 text-white/75 bg-white/[0.03] disabled:opacity-50"
                      >
                        Clean Old Cache {storageEstimate.age ? `(${formatBytes(storageEstimate.age.estimatedBytes)})` : ''}
                      </button>
                      <button
                        disabled={isStorageBusy}
                        onClick={() => runStorageOptimize('downloads-only')}
                        className="px-2 py-1 rounded-lg border border-yellow-500/30 text-yellow-300 bg-yellow-500/10 disabled:opacity-50"
                      >
                        Keep Downloaded Only {storageEstimate.downloadsOnly ? `(${formatBytes(storageEstimate.downloadsOnly.estimatedBytes)})` : ''}
                      </button>
                      <button
                        disabled={isStorageBusy}
                        onClick={async () => { await refreshStorageStats(); await refreshStorageEstimate(); }}
                        className="px-2 py-1 rounded-lg border border-white/15 text-white/60 bg-white/[0.02] disabled:opacity-50"
                      >
                        Refresh
                      </button>
                    </div>

                    <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="text-white/55 uppercase text-[11px]">Downloaded Tracks ({offlineDownloads.length})</div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={isOfflineRemovalBusy || isOfflineDownloadsBusy}
                            onClick={refreshOfflineDownloads}
                            className="px-2 py-1 rounded-lg border border-white/15 text-white/70 bg-white/[0.03] disabled:opacity-50"
                          >
                            Refresh List
                          </button>
                          <button
                            disabled={offlineDownloads.length === 0 || isOfflineRemovalBusy || isOfflineDownloadsBusy}
                            onClick={clearAllDownloadedTracks}
                            className="px-2 py-1 rounded-lg border border-red-500/35 text-red-300 bg-red-500/10 disabled:opacity-50"
                          >
                            Clear All Downloads
                          </button>
                        </div>
                      </div>

                      <div className="max-h-52 overflow-y-auto pr-1 space-y-1">
                        {offlineDownloads.length === 0 ? (
                          <div className="text-white/35 text-xs">No downloaded tracks stored.</div>
                        ) : offlineDownloads.map((item) => {
                          const meta = downloadLabelById.get(item.id);
                          const title = meta?.title || item.id;
                          const author = meta?.author || 'Unknown';
                          return (
                            <div key={`download-${item.id}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5">
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] text-white/85 font-black truncate">{title}</div>
                                <div className="text-[10px] text-white/45 truncate">{author} • {formatBytes(item.bytes || 0)}{item.modifiedAt ? ` • ${new Date(item.modifiedAt).toLocaleString()}` : ''}</div>
                              </div>
                              <button
                                disabled={isOfflineRemovalBusy || isOfflineDownloadsBusy}
                                onClick={() => removeDownloadedById(item.id, title)}
                                className="px-2 py-1 rounded-md border border-red-500/35 text-red-300 bg-red-500/10 disabled:opacity-50"
                                title="Delete downloaded file"
                              >
                                Delete
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(diagnostics.lastQueueError || diagnostics.lastSystemError || diagnostics.lastLyricsError) && (
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 col-span-2">
                  <div className="text-red-300 uppercase mb-1">Last Error</div>
                  <div className="font-black text-red-200/90 truncate">{diagnostics.lastQueueError || diagnostics.lastSystemError || diagnostics.lastLyricsError}</div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 col-span-2">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-white/40 uppercase">Recent Events</div>
                  <div className="text-[10px] text-white/30">{skipEvents.length} / 50</div>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-auto pr-1">
                  {skipEvents.length === 0 ? (
                    <div className="text-white/35">No recent events captured yet.</div>
                  ) : (
                    skipEvents.slice(-8).reverse().map((event, idx) => (
                      <div key={`${event.at || 0}-${idx}`} className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2 text-white/70">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-brand-accent text-[10px]">{new Date(event.at || Date.now()).toLocaleTimeString()}</span>
                          <span className={`text-[9px] uppercase tracking-[0.16em] ${event.tone === 'error' ? 'text-red-300' : event.tone === 'success' ? 'text-brand-accent' : event.tone === 'warning' ? 'text-yellow-300' : 'text-white/35'}`}>
                            {event.tone || 'event'}
                          </span>
                        </div>
                        <div className="mt-1 font-black text-white/85 break-words">{event.label || event.reason || 'event'}</div>
                        <div className="mt-1 text-white/45 break-words">{event.detail || event.title || 'No details'}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <motion.main 
        className={`aether-depth-stage flex-1 relative z-10 w-full mb-0 min-h-0 px-4 md:px-6 py-4 ${isVerticalStack ? '!flex !flex-col !gap-8 overflow-y-auto scroll-smooth pb-20 custom-scrollbar' : 'flex flex-row gap-4 overflow-hidden'}`}
        style={{
          scale: 1,
          paddingRight: isDualVisualMode && !isVerticalStack ? `calc(${dualVisualStageWidth} + 1.25rem)` : undefined,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        
        {/* PLAYER & LYRICS PILLAR */}
        <div className={`performance-island flex flex-col gap-4 min-w-0 overflow-hidden ${leftWorkspaceClass}`}>
          
          {/* PLAYER CARD */}
          {isDualWorkspaceMode ? (
            <div
              className={`performance-island glass-card relative overflow-hidden shrink-0 rounded-[2.35rem] border border-white/[0.08] px-4 py-4 md:px-5 md:py-4 transition-all duration-500 ${isAuraMode ? 'bg-white/[0.02] border-white/[0.14] backdrop-blur-[28px] shadow-[0_20px_70px_rgba(0,0,0,0.26)]' : 'bg-[#080b10]/88'}`}
              style={isAuraMode ? { boxShadow: auraPanelShadow, borderColor: auraPanelBorder } : undefined}
            >
              {currentTrack ? (
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="label-caps mb-0 text-brand-accent/75 text-[9px] tracking-[0.24em]">Dual Stage</span>
                        <span className="rounded-full border border-brand-accent/20 bg-brand-accent/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-brand-accent/80">
                          Main Player
                        </span>
                      </div>
                      <div className="mt-1 text-lg md:text-xl font-black text-white/95 leading-tight uppercase tracking-tight line-clamp-2">{currentTrack.title}</div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.26em] text-brand-accent/70 truncate">{currentTrack.author}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={cycleRepeatMode}
                        className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border transition-all active:scale-95 ${repeatMode === 'off' ? 'border-white/10 bg-white/[0.04] text-white/60 hover:border-brand-accent/30 hover:text-brand-accent' : 'border-brand-accent/30 bg-brand-accent/12 text-brand-accent shadow-[0_0_16px_rgba(0,255,191,0.16)]'}`}
                        title={repeatModeLabel}
                      >
                        <Repeat size={16} />
                        {repeatModeBadge && <span className="absolute right-1.5 top-1.5 text-[8px] font-black leading-none">{repeatModeBadge}</span>}
                      </button>
                      <button onClick={() => handleControl('previous')} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-brand-accent/30 hover:text-brand-accent active:scale-95" title="Previous">
                        <Rewind size={18} fill="currentColor" />
                      </button>
                      <button onClick={() => handleControl(isPlaying ? 'pause' : 'resume')} className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] text-black transition-all hover:scale-[1.03] active:scale-95" style={{ background: trackControlAccent, boxShadow: `0 0 22px ${trackControlGlow}` }} title={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                      </button>
                      <button onClick={() => handleControl('skip')} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-brand-accent/30 hover:text-brand-accent active:scale-95" title="Next">
                        <FastForward size={18} fill="currentColor" />
                      </button>
                    </div>
                  </div>

                  <PlaybackProgressIsland
                    durationMs={currentTrack.totalDurationMs || currentTrack.duration || 0}
                    getPositionMs={getActivePlaybackPositionMs}
                    onSeek={handleSeek}
                    accent={trackProgressAccent}
                    glow={trackProgressGlow}
	                    middleContent={<PlayerModePill videoMode={videoMode} switchVideoMode={switchVideoMode} variant="dual" />}
                  />
                </div>
              ) : (
                <div className="flex h-28 items-center justify-center text-white/25">Standby</div>
              )}
            </div>
          ) : (
          <div
            className={`performance-island glass-card flex relative overflow-hidden group shrink-0 transition-all duration-700 flex-col sm:flex-row flex-none rounded-[3.5rem] shadow-2xl transition-all ${playerCardClass} ${isAuraMode ? 'bg-white/[0.015] border-white/[0.14] backdrop-blur-[30px] shadow-[0_24px_90px_rgba(0,0,0,0.32)]' : 'border-white/5'}`}
            style={isAuraMode ? { boxShadow: auraCardShadow, borderColor: auraCardBorder, transition: 'box-shadow 80ms linear, border-color 80ms linear' } : undefined}
          >
            {isAuraMode && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(120% 85% at 50% 0%, rgba(0,255,191,${0.06 + immersiveBeatIntensity * 0.16}) 0%, rgba(0,255,191,0) 72%)`,
                  opacity: 0.85,
                }}
              />
            )}
        {/* TOP BAR / NAVIGATION */}
            {currentTrack && (
              <div className="absolute inset-0 blur-[120px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            
            {/* HIGH-FIDELITY CANVAS VISUALIZER (BTM BAR) */}
            <canvas 
               ref={visualizerCanvasRef} 
               width={800} 
               height={40} 
	               className={`aether-visualizer-canvas absolute bottom-0 left-0 right-0 w-full h-[32px] pointer-events-none z-20 transition-opacity duration-500 ${visualizerMode === 'bars' ? 'opacity-50' : 'opacity-0'}`}
            />

            {currentTrack ? (
                <>
                {/* NEURAL BUFFERING OVERLAY */}
                {isAudioBuffering && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[2.5rem]"
                  >
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-t-2 border-brand-accent rounded-full animate-spin shadow-[0_0_20px_#00ffbf]" />
                        <div className="text-brand-accent font-black text-[10px] tracking-[0.5em] uppercase animate-pulse">Neural Buffering...</div>
                    </div>
                  </motion.div>
                )}
              <div className="flex flex-col md:flex-row gap-8 lg:gap-12 flex-1 relative z-10 w-full">
                 {/* LEFT: THUMBNAIL + VOLUME */}
                 <div
                    className="flex flex-col gap-6 items-center flex-none transition-all duration-500"
                 >
                    <div className="w-48 h-48 md:w-56 md:h-56 lg:w-60 lg:h-60 relative group flex-none rounded-[2.5rem] overflow-hidden drop-shadow-2xl">
                        <img src={getProxyUrl(currentTrack.thumbnail)} className="absolute inset-0 w-full h-full object-cover shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-700" alt="" />
                        <div className="absolute inset-0 bg-brand-accent/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center">
                            <Activity className="text-brand-accent animate-pulse" size={32} />
                        </div>
                    </div>

                    {/* COMPACT VOLUME UNIT */}
                    <div className={`w-full flex flex-col gap-2 px-2 p-3 rounded-2xl border ${isAuraMode ? 'bg-white/[0.03] border-white/[0.14] backdrop-blur-xl' : 'bg-white/5 border-white/5'}`}>
                       <div className="flex items-center justify-between">
                          <button onClick={() => handleControl('mute')} className="hover:text-brand-accent transition-colors active:scale-90">
                            <Volume2 size={12} className={volume === 0 ? 'text-red-500' : 'text-brand-accent/50'} />
                          </button>
                         <span className="text-[9px] font-mono text-brand-accent font-black tracking-widest">{Math.round(volume * 100)}%</span>
                       </div>
                       <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleVolumeChange(e.target.value)} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-accent" />
                    </div>
                 </div>

                 {/* RIGHT: METADATA + SEEKER + TRANSPORT */}
                 <div className="flex flex-col flex-1 min-w-0 py-0">
                    <div className="mb-6">
                        <div className="flex items-center justify-between gap-4 mb-2">
                             <div className="label-caps mb-0 text-brand-accent/60 text-[9px] flex items-center gap-2 tracking-[0.28em] uppercase font-black">
                              <span className="w-1 h-1 rounded-full bg-brand-accent animate-pulse" />
                               {isAudioBuffering ? "Buffering" : "Now Playing"}
                           </div>
	                           <PlayerActionButtons
	                             canDownloadCurrentTrack={canDownloadCurrentTrack}
	                             canOpenCurrentSource={canOpenCurrentSource}
	                             currentTrack={currentTrack}
	                             currentTrackSourceUrl={currentTrackSourceUrl}
	                             cycleRepeatMode={cycleRepeatMode}
	                             handleControl={handleControl}
	                             handleDownloadCurrentTrack={handleDownloadCurrentTrack}
	                             isCurrentTrackFavorite={isTrackFavorite(currentTrack)}
	                             isDownloadingTrack={isDownloadingTrack}
	                             isFocusedMode={isFocusedMode}
	                             openLibraryOverlay={openLibraryOverlay}
	                             openTrackInspect={openTrackInspect}
	                             queueLength={queue.length}
	                             repeatMode={repeatMode}
	                             repeatModeBadge={repeatModeBadge}
	                             repeatModeLabel={repeatModeLabel}
	                             setIsFocusedMode={setIsFocusedMode}
	                             setIsPlayerOverlayOpen={setIsPlayerOverlayOpen}
	                             toggleFavoriteTrack={toggleFavoriteTrack}
	                           />
                        </div>
                        <h1 className={`${playerTitleClass} font-black text-white/95 leading-none uppercase tracking-tighter mb-2 line-clamp-2 transition-all duration-700`} style={{ textShadow: visualizerMode === 'pulse' ? `0 0 20px ${themeColor}44` : 'none' }}>{currentTrack.title}</h1>
                        <p className="text-brand-accent text-xs font-black uppercase tracking-[0.3em] opacity-80 transition-all duration-700" style={{ textShadow: visualizerMode === 'pulse' ? `0 0 10px ${themeColor}88` : 'none' }}>{currentTrack.author}</p>
                    </div>

                    <div className="mt-auto space-y-6">
                       <PlaybackProgressIsland
                         durationMs={currentTrack.totalDurationMs || currentTrack.duration || 0}
                         getPositionMs={getActivePlaybackPositionMs}
                         onSeek={handleSeek}
                         accent={trackProgressAccent}
                         glow={trackProgressGlow}
                         barClassName="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative group cursor-pointer"
                         fillClassName="absolute inset-0 left-0 w-full"
                         timeRowClassName="flex justify-between text-[10px] font-mono text-white/30 font-black tracking-widest uppercase"
                       />

                        {/* COMPACT TRANSPORT CLUSTER - CENTERED */}
	                        <PlayerTransportControls
	                          beatRingsRef={beatRingsRef}
	                          handleControl={handleControl}
	                          isAuraMode={isAuraMode}
	                          isPlaying={isPlaying}
	                          playButtonRef={playButtonRef}
	                          trackControlAccent={trackControlAccent}
	                          trackControlGlow={trackControlGlow}
	                        />

                         {/* VIDEO MODE TOGGLE PILL */}
                         {currentTrack && isStandalone && (
	                           <div className="flex items-center justify-center mt-4">
	                             <PlayerModePill videoMode={videoMode} switchVideoMode={switchVideoMode} />
	                           </div>
                         )}
                      </div>
                   </div>
               </div>
               </>
            ) : (
              <div className="w-full h-64 flex flex-col items-center justify-center gap-6 opacity-10">
                <Music size={80} className="text-brand-text-dim animate-pulse" strokeWidth={1} />
                <div className="label-caps text-xl tracking-[0.5em]">Network Standby</div>
              </div>
            )}
          </div>
          )}


          {/* LYRICS PANEL - FLEX-1 TO FILL GAP */}
          <div
            className={`performance-island glass-card overflow-hidden flex flex-col transition-all duration-300 min-h-0 ${panelGlassClass} ${panelInteractiveClass} ${lyricsPanelHeightClass}`}
            style={{
              ...(isAuraMode ? { boxShadow: auraPanelShadow, borderColor: auraPanelBorder, transition: 'box-shadow 80ms linear, border-color 80ms linear' } : {}),
            }}
          >
            <div className={`border-b border-white/5 ${panelHeaderClass} ${isVerticalStack ? 'px-3 py-2' : 'px-5 py-4'}`}>
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="flex items-start gap-3 min-w-0 flex-1 overflow-hidden">
                  <div className="w-9 h-9 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent flex-none shadow-[0_0_18px_rgba(0,255,191,0.15)]">
                    <BookOpen size={16} />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="label-caps mb-0 text-[9px] tracking-[0.1em] uppercase truncate shrink">{lyricsHeaderEyebrow}</span>
                      <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.18em] border ${currentManualLyricsLines.length > 0 ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent' : isLyricsLoading ? 'bg-white/5 border-white/10 text-white/50' : isPlaying ? (lyrics.length > 0 ? 'bg-white/5 border-white/10 text-white/65' : 'bg-white/5 border-white/10 text-white/45') : 'bg-white/5 border-white/10 text-white/45'}`}>
                        {currentManualLyricsLines.length > 0 ? 'Manual' : isLyricsLoading ? 'Fetching' : isPlaying ? (lyrics.length > 0 ? 'Synced' : 'Decoding') : lyrics.length > 0 ? 'Ready' : 'Idle'}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/35 truncate">
                      {currentManualLyricsLines.length > 0
                        ? `${currentManualLyricsLines.length} saved line${currentManualLyricsLines.length === 1 ? '' : 's'} for ${currentTrack?.title || currentTrackTitle || 'this track'}`
                        : currentTrack?.title
                          ? currentTrack.title
                          : 'No track selected'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 no-drag flex-none shrink-0 ml-2 flex-wrap justify-end">
                  <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1 group/sync relative overflow-hidden">
                    <button onClick={() => handleSync(-500)} className="p-2 hover:text-brand-accent" title="Shift lyrics backward 500ms"><ChevronLeft size={18} /></button>
                    <span className="text-[10px] font-mono text-brand-accent font-black w-14 text-center">{lyricOffsetMs}ms</span>
                    <button onClick={() => handleSync(500)} className="p-2 hover:text-brand-accent" title="Shift lyrics forward 500ms"><ChevronRight size={18} /></button>
                  </div>
                  <button
                    onClick={openManualLyricsEditor}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${currentManualLyricsLines.length > 0 ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent' : 'bg-white/5 border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/40'}`}
                    title={currentManualLyricsLines.length > 0 ? 'Edit saved manual lyrics' : 'Add manual lyrics for this track'}
                  >
                    <Edit3 size={10} /> {currentManualLyricsLines.length > 0 ? 'Edit' : 'Add'}
                  </button>
                  <button
                    onClick={handleSaveLyricPreset}
                    className={`hidden md:flex items-center gap-1 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${isLyricPresetSaved ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent' : 'bg-white/5 border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/40'}`}
                    title={hasLyricPreset ? 'Update saved sync offset for this track' : 'Save current sync offset for this track'}
                  >
                    <Save size={10} /> {lyricPresetActionLabel}
                  </button>
                  <button
                    onClick={handleResetLyricPreset}
                    className="hidden md:flex items-center gap-1 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all bg-white/5 border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/40"
                    title="Reset sync for this track"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                  {!isStandalone && <button onClick={() => {
                    const guildId = getEffectiveGuildId();
                    axios.post(`${API_BASE}/api/source/${guildId}`).catch(e => console.error('Rotate error:', e));
                  }} className="hidden md:flex px-5 py-2.5 glass-card text-[10px] font-black hover:border-brand-accent transition-all uppercase tracking-widest active:scale-95 border-white/10">Rotate</button>}
                  <button 
                    onClick={() => {
                      if (isImmersiveLyricsLocked) return;
                      if (!isLyricsExpanded) closeHeaderSurfaces();
                      setIsLyricsExpanded((prev) => !prev);
                    }}
                    disabled={isImmersiveLyricsLocked}
                    className={`flex items-center justify-center p-2 w-8 h-8 rounded-xl border transition-all text-brand-accent group flex-none ${isImmersiveLyricsLocked ? 'bg-brand-accent/12 border-brand-accent/30 text-brand-accent/80 cursor-default' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-brand-accent active:scale-90'}`}
                    title={isImmersiveLyricsLocked ? 'Immersive lyrics are unavailable while the visual stage is active' : 'Immersive Output'}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className={`flex-1 overflow-y-auto scroll-smooth relative ${lyricsViewportClass}`} ref={lyricsContainerRef} onWheel={() => setIsAutoScrollPaused(true)} onTouchStart={() => setIsAutoScrollPaused(true)}>
              {isDualWorkspaceMode && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  animate={{
                    opacity: 0.12 + immersiveBeatIntensity * 0.34,
                    scale: 1 + immersiveBeatIntensity * 0.22,
                  }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{
                    width: 'min(72vw, 760px)',
                    height: 'min(72vw, 760px)',
                    background: `radial-gradient(circle, ${themeColor}${alphaHex(0.18)} 0%, ${themeColor}${alphaHex(0.07)} 36%, transparent 72%)`,
                    filter: `blur(${30 + immersiveBeatIntensity * 22}px)`,
                    willChange: 'transform, opacity, filter'
                  }}
                />
              )}
              {isAutoScrollPaused && lyrics.length > 0 && (
                <button 
                  onClick={handleResyncLyrics}
                  className="sticky top-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-brand-accent text-black font-black text-[10px] uppercase tracking-widest rounded-full shadow-neon translate-y-4 animate-bounce hover:scale-105 transition-transform"
                >
                  <RotateCcw size={12} /> Resume Sync
                </button>
              )}
              {isLyricsLoading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-brand-accent" size={48} /></div>
              ) : lyrics.length > 0 ? (
                <div className={lyricsListClass}>
                  {memoizedLyricsContent}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                   <div className="grid grid-cols-4 gap-4 w-64 opacity-10 mb-12">
                      {[...Array(16)].map((_, i) => <div key={i} className="h-4 bg-brand-accent rounded-sm animate-pulse" style={{ animationDelay: `${i*0.1}s` }} />)}
                   </div>
                   <div className="flex flex-col items-center gap-4 opacity-20">
                      <Signal size={48} className="text-brand-accent animate-pulse" />
                      <div className="text-[12px] font-black uppercase tracking-[0.5em]">SIGNAL_STANDBY</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest opacity-50">awaiting incoming stream decrypt...</div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        {showSecondaryColumn && (
          <div className={`performance-island flex flex-col gap-4 min-w-0 ${isVerticalStack ? '!w-full !max-w-full !flex-none pb-20' : 'w-[33.333%] h-full overflow-hidden flex-none'}`}>
            {/* QUEUE */}
            <div
              className={`performance-island ${isVerticalStack ? 'h-[400px]' : 'h-[160px]'} flex-none glass-card flex flex-col ${isAutoplayMenuOpen ? 'overflow-visible z-[340]' : 'overflow-hidden'} transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass}`}
              style={isAuraMode ? { boxShadow: auraPanelShadow, borderColor: auraPanelBorder, transition: 'box-shadow 80ms linear, border-color 80ms linear' } : undefined}
            >
            <div className={`p-3 border-b border-white/5 flex items-center justify-between ${panelHeaderClass}`}>
               <div className="flex items-center gap-3">
                 <ListMusic size={18} className="text-brand-accent" />
                 <span className="label-caps mb-0 text-[10px]">Queue Buffer</span>
               </div>
               <div className="flex items-center gap-3">
                 <button 
                  onClick={() => { if (queue.length > 0) openLibraryOverlay({ type: 'queue', items: queue.slice() }); }}
                  className="p-1.5 rounded-lg transition-all flex items-center gap-2 bg-white/5 text-white/50 border border-white/10 hover:bg-brand-accent/20 hover:text-brand-accent"
                  title="Flash Queue to Target Vault"
                 >
                    <Save size={10} />
                 </button>
                           <button 
                            onClick={() => setIsViewingFullQueue(true)}
                            className="p-1.5 rounded-lg transition-all flex items-center gap-2 bg-white/5 text-white/50 border border-white/10 hover:bg-brand-accent/20 hover:text-brand-accent"
                            title="View Full Queue"
                            >
                              <Maximize2 size={10} />
                            </button>
                 <button
                    onClick={() => {
                        if (queue.length > 1) {
                            console.log("[Aether/Shuffle] Shuffling buffer...");
                            setQueue(prev => {
                               if (!Array.isArray(prev) || prev.length <= 1) return prev;
                               const current = prev[0];
                               const rest = [...prev.slice(1)].sort(() => Math.random() - 0.5);
                               return [current, ...rest];
                            });
                            if (!isStandalone) {
                                axios.post(`${API_BASE}/api/control/${DEFAULT_GUILD_ID}`, { action: 'shuffle' }).catch(()=>{});
                            }
                        }
                    }}
                    className="p-1.5 rounded-lg transition-all flex items-center gap-2 bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                    title="Shuffle Queue Buffer"
                 >
                    <Shuffle size={10} />
                 </button>
                 <div className="relative">
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       setIsAutoplayMenuOpen(prev => !prev);
                     }}
                     className={`p-1.5 rounded-lg transition-all flex items-center gap-2 ${isAutoplayEnabled ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30 shadow-neon' : 'bg-white/5 text-white/30 border border-white/10 opacity-70'}`}
                     title="Neural Autoplay Mode"
                   >
                     <Zap size={10} className={isAutoplayEnabled ? 'animate-pulse' : ''} />
                     <span className="text-[8px] font-black uppercase tracking-tighter">{isAutoplayEnabled ? 'AUTO_ON' : 'AUTO_OFF'}</span>
                     <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">{autoplayMoodMode}</span>
                   </button>

                   {isAutoplayMenuOpen && (
                     <div className="absolute right-0 top-full mt-2 z-[320] w-48 rounded-xl border border-white/15 bg-[#0b0f14]/95 backdrop-blur-xl p-2 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
                       <button
                         onClick={() => {
                           setIsAutoplayEnabled(prev => !prev);
                           setIsAutoplayMenuOpen(false);
                         }}
                         className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${isAutoplayEnabled ? 'text-brand-accent bg-brand-accent/10' : 'text-white/70 hover:text-brand-accent hover:bg-white/5'}`}
                       >
                         {isAutoplayEnabled ? 'Disable Autoplay' : 'Enable Autoplay'}
                       </button>
                       <div className="my-1 border-t border-white/10" />
                       {AUTOPLAY_MOOD_MODES.map((mode) => (
                         <button
                           key={`autoplay-mode-${mode.id}`}
                           onClick={() => {
                             setAutoplayMoodMode(mode.id);
                             setIsAutoplayMenuOpen(false);
                             setLastAdded(`Autoplay mood • ${mode.label}`);
                             setTimeout(() => setLastAdded(null), 1500);
                           }}
                           className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${autoplayMoodMode === mode.id ? 'text-brand-accent bg-brand-accent/10' : 'text-white/70 hover:text-brand-accent hover:bg-white/5'}`}
                         >
                           {mode.label}
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
                 <span className="text-[10px] font-mono font-black text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full">{Math.max(0, queue.length - 1)}</span>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-6">
              <AnimatePresence mode="popLayout">
                {queue.length > 1 ? queue.slice(1).map((track, idx) => {
                   const warmupId = resolveWarmupTrackId(track);
                   const isDownloaded = warmupId ? downloadedTracks.includes(warmupId) : downloadedTracks.includes(track.id);
                   return (
                   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key={`${track.id}-${idx}`} className={`performance-list-item group glass-card p-3 flex items-center gap-4 hover:border-brand-accent/30 transition-all border-white/5 ${isDownloaded ? 'bg-red-500/15 border-red-500/30 shadow-[0_0_20px_rgba(255,0,0,0.35)]' : 'bg-white/[0.01]'}`}>
                     <img src={getProxyUrl(track.thumbnail)} className="w-12 h-12 rounded-xl object-cover" alt="" />
                     <div className="flex-1 min-w-0">
                       <div className="text-[12px] font-black truncate group-hover:text-brand-accent transition-colors uppercase tracking-widest">{track.title}</div>
                       <div className="text-[10px] text-brand-text-dim truncate font-bold uppercase opacity-50 mt-1">{track.author}</div>
                     </div>
                     {isDownloaded && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-500/70 px-2 py-1 rounded-full">READY</span>
                     )}
                     <button onClick={() => openTrackInspect(track, 'queue')} className="lg:opacity-0 group-hover:opacity-100 hover:text-brand-accent p-2" title="Inspect Track">
                       <Eye size={15} />
                     </button>
                     <button onClick={() => handleRemove(idx + 1)} className="lg:opacity-0 group-hover:opacity-100 hover:text-white p-2">
                       <Trash2 size={16} className="text-red-500/50 hover:text-red-500" />
                      </button>
                    </motion.div>
                   );
                }) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 py-12 text-[10px] font-black tracking-widest uppercase">
                    Buffer Empty
                    {isDoodleMode && <img src={catDoodlePeek} alt="doodle" className="mt-3 h-10 w-auto opacity-70 select-none pointer-events-none" draggable={false} />}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* DISCOVERY */}
          <div
            className={`performance-island ${isVerticalStack ? 'h-[400px]' : 'h-[160px]'} flex-none glass-card flex flex-col overflow-hidden transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass}`}
            style={isAuraMode ? { boxShadow: auraPanelShadow, borderColor: auraPanelBorder, transition: 'box-shadow 80ms linear, border-color 80ms linear' } : undefined}
          >
            <div className={`p-3 border-b border-white/5 flex items-center justify-between ${panelHeaderClass}`}>
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-brand-accent" />
                <span className="label-caps mb-0 text-[10px]">Neural Discovery</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsViewingFullDiscovery(true)}
                  className="p-1.5 rounded-lg transition-all flex items-center gap-2 bg-white/5 text-white/50 border border-white/10 hover:bg-brand-accent/20 hover:text-brand-accent"
                  title="View Full Discovery"
                >
                  <Maximize2 size={10} />
                </button>
                {(searchResults.length > 0 || hasCompletedSearch) && <button onClick={clearDiscoveryResults} className="p-2 px-4 glass-card text-[9px] font-black text-red-500 hover:bg-red-500/10 active:scale-95 transition-all border-red-500/20">FLUSH</button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-6">
              <AnimatePresence>
                {discoveryItems.map((t) => (
                   <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} key={t.id} className="performance-list-item glass-card p-4 flex items-center gap-4 hover:border-brand-accent group overflow-hidden relative transition-all active:scale-[0.98] border-white/5">
                     <img src={getProxyUrl(t.thumbnail)} className="w-14 h-14 rounded-2xl object-cover z-10" alt="" />
                     <div className="flex-1 min-w-0 z-10">
                       <div className="text-[13px] font-black truncate group-hover:text-brand-accent transition-colors uppercase tracking-widest">{t.title}</div>
                       <div className="text-[10px] text-brand-text-dim truncate font-bold opacity-50 mt-1 uppercase leading-none">{t.author}</div>
                     </div>
                     <div className="flex items-center gap-2 z-10">
                        <button onClick={() => openTrackInspect(t, isSearchActive ? 'discovery' : 'recommendation')} className="w-10 h-10 rounded-xl bg-white/5 text-white/30 flex items-center justify-center hover:bg-brand-accent/20 hover:text-brand-accent transition-all border border-white/10" title="Inspect Track">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleAdd(t)} className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center hover:bg-brand-accent hover:text-brand-dark transition-all border border-brand-accent/20">
                          <Plus size={22} />
                        </button>
                        <button onClick={() => toggleFavoriteTrack(t)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${isTrackFavorite(t) ? 'bg-rose-400/15 text-rose-300 border-rose-300/30' : 'bg-white/5 text-white/30 hover:bg-rose-400/15 hover:text-rose-300 border-white/10 hover:border-rose-300/30'}`} title={isTrackFavorite(t) ? 'Remove from Favorites' : 'Add to Favorites'}>
                          <Heart size={17} fill={isTrackFavorite(t) ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={() => openLibraryOverlay({ type: 'track', items: [t] })} className="w-10 h-10 rounded-xl bg-white/5 text-white/30 flex items-center justify-center hover:bg-brand-accent/20 hover:text-brand-accent transition-all border border-white/10">
                          <HardDrive size={18} />
                        </button>
                     </div>
                     <div className="absolute inset-0 bg-brand-accent/[0.05] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    </motion.div>
                ))}
              </AnimatePresence>
                {!isSearching && searchResults.length === 0 && neuralRecommendations.length === 0 && !hasCompletedSearch && (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-10 text-center py-4">
                   <div className="relative">
                      <Search size={32} strokeWidth={1} />
                      <div className="absolute inset-0 blur-xl bg-brand-accent/30 animate-pulse" />
                   </div>
                   <p className="text-[8px] font-black uppercase tracking-[0.4em]">Awaiting Content</p>
                   {isDoodleMode && <img src={catDoodlePeek} alt="doodle" className="h-10 w-auto opacity-75 select-none pointer-events-none" draggable={false} />}
                </div>
              )}
                {!isSearching && searchResults.length === 0 && hasCompletedSearch && (
                 <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-4 opacity-40">
                   <div className="relative text-brand-accent/70">
                     <Search size={30} strokeWidth={1.4} />
                   </div>
                   <div>
                     <p className="text-[9px] font-black uppercase tracking-[0.35em] text-white/60">No Results Found</p>
                     <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.25em] text-white/30 max-w-[220px] mx-auto">
                      Try a different title, artist, or fewer words.
                     </p>
                   </div>
                 </div>
                )}
            </div>
          </div>

          {/* STUDIO LIBRARY */}
            <div
              className={`performance-island glass-card flex flex-col overflow-hidden studio-vault-container relative shadow-inner library-panel transition-all duration-300 ${panelGlassClass} ${panelInteractiveClass} ${isVerticalStack ? 'min-h-[500px] flex-none' : 'h-full min-h-0'}`}
              style={isAuraMode ? { boxShadow: auraPanelShadow, borderColor: auraPanelBorder, transition: 'box-shadow 80ms linear, border-color 80ms linear' } : undefined}
            >
            <div className={`px-2.5 py-2 border-b border-white/5 flex items-center justify-between gap-1.5 ${panelHeaderClass}`}>
              <div className="flex items-center gap-2 min-w-0">
                <HardDrive size={16} className="text-brand-accent shrink-0" />
                <span className="label-caps mb-0 text-[10px] tracking-widest truncate">Studio Library</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={handleGenerateSmartMix} className="w-6 h-6 rounded-md bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors flex items-center justify-center" title="Generate Smart Mix"><Zap size={10} /></button>
                <button onClick={handleCleanVault} disabled={isVaultCleaning} className="w-6 h-6 rounded-md bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors disabled:opacity-40 flex items-center justify-center" title="Clean Vault (dedupe + remove unavailable + normalize metadata)"><RefreshCw size={10} className={isVaultCleaning ? 'animate-spin' : ''} /></button>
                <button onClick={() => openLibraryOverlay(null)} className="w-6 h-6 rounded-md bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors flex items-center justify-center" title="Open Vault Overlay"><ListMusic size={10} /></button>
                {isStandalone && (
                  <>
                    <button onClick={() => { closeHeaderSurfaces(); setMusicImportProvider(''); setSpotifyImportUrl(''); setSpotifyImportPlaylistName(''); setSpotifyImportProgress({ stage: 'idle', progress: 0, message: '' }); setSpotifyImportLogs([]); setIsSpotifyImportOpen(true); }} className="w-7 h-7 rounded-lg bg-white/5 text-white/45 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors flex items-center justify-center no-drag" title="Import Music Playlist"><Music size={11} /></button>
                    <button onClick={handleImportVault} className="w-6 h-6 rounded-md bg-white/5 text-white/40 hover:text-brand-accent hover:border-brand-accent/30 border border-white/10 transition-colors flex items-center justify-center" title="Import Vault (.aether)"><Upload size={10} /></button>
                  </>
                )}
              </div>
            </div>
            <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] flex flex-col items-center">
              <div className="flex min-w-0 items-center justify-center gap-2 overflow-hidden">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Nodes</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">{libraryInsights.unique} unique</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">{libraryInsights.total} total</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">{libraryInsights.duplicates} dupes</span>
              </div>
              {libraryInsights.topArtists.length > 0 && (
                <div className="mt-1 text-[8px] font-mono text-white/40 text-center truncate w-full">Top: {libraryInsights.topArtists.map(([artist]) => artist).join(' • ')}</div>
              )}
            </div>
            {/* SAFE SCROLL WRAPPER */}
            <div className={`flex-1 min-h-0 relative ${isVerticalStack ? 'h-[500px]' : ''}`}>
               <div className="absolute inset-0 overflow-y-auto p-4 flex flex-col gap-6 pb-12 studio-vault-container custom-scrollbar">
                  <div className="vault-project-grid">
                        <div className="vault-project-card group/vault border-rose-300/20 bg-rose-400/[0.035]">
                           <div className="vault-project-art" onClick={() => setViewingPlaylist(FAVORITES_PLAYLIST_ID)}>
                              {favoriteTracksList.length > 0 ? favoriteTracksList.slice(0, 4).map((track, tidx) => (
                                <img
                                  key={`favorites-cover-${tidx}`}
                                  src={getProxyUrl(track.thumbnail)}
                                  className="vault-project-cover"
                                  alt=""
                                  style={{ '--cover-index': tidx }}
                                />
                              )) : (
                                <div className="vault-project-empty text-rose-300"><Heart size={20} /></div>
                              )}
                              <div className="vault-project-sheen" />
                              <div className="vault-project-count">{favoriteTracksList.length}</div>
                           </div>
                           <div className="min-w-0">
                              <button onClick={() => setViewingPlaylist(FAVORITES_PLAYLIST_ID)} className="w-full text-left text-[12px] font-black text-white/88 uppercase tracking-tight truncate group-hover/vault:text-rose-300 transition-colors" title={FAVORITES_PLAYLIST_NAME}>
                                {FAVORITES_PLAYLIST_NAME}
                              </button>
                              <div className="mt-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/30 truncate">
                                Built-in favorites
                              </div>
                           </div>
                           <div className="grid grid-cols-3 gap-1.5">
                              <button onClick={handleFavoriteAddAll} className="vault-project-tool" title="Queue Favorites"><Plus size={11} /></button>
                              {isStandalone && <button onClick={() => handleExportVault(FAVORITES_PLAYLIST_ID)} className="vault-project-tool" title="Export Favorites"><Download size={11} /></button>}
                              <button onClick={() => setViewingPlaylist(FAVORITES_PLAYLIST_ID)} className="vault-project-tool" title="View Favorites"><Maximize2 size={11} /></button>
                           </div>
                           {favoriteTracksList.length > 0 && (
                            <button onClick={() => openPlaylistInspect(FAVORITES_PLAYLIST_NAME, favoriteTracksList, 'vault:favorites')} className="vault-project-inspect">
                              <Eye size={11} /> Inspect favorites
                            </button>
                           )}
                        </div>
                        {orderedPlaylistNames.map(name => {
                          const vaultTracks = playlists[name] || [];
                          const previewTracks = vaultTracks.slice(0, 4);
                          const featuredTrack = previewTracks[0];
                          return (
                          <div key={name} className="vault-project-card group/vault">
                             <div className="vault-project-art" onClick={() => setViewingPlaylist(name)}>
                                {previewTracks.length > 0 ? previewTracks.map((track, tidx) => (
                                  <img
                                    key={`${name}-cover-${tidx}`}
                                    src={getProxyUrl(track.thumbnail)}
                                    className="vault-project-cover"
                                    alt=""
                                    style={{ '--cover-index': tidx }}
                                  />
                                )) : (
                                  <div className="vault-project-empty"><HardDrive size={20} /></div>
                                )}
                                <div className="vault-project-sheen" />
                                <div className="vault-project-count">{vaultTracks.length}</div>
                             </div>
                             <div className="min-w-0">
                                {isRenamingPlaylist === name ? (
                                  <input autoFocus className="w-full bg-white/5 border border-brand-accent/30 rounded-md px-2 py-1 text-[10px] font-black text-brand-accent outline-none" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={() => handleRenamePlaylist(name, renameValue)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenamePlaylist(name, renameValue); if (e.key === 'Escape') setIsRenamingPlaylist(null); }} />
                                ) : (
                                  <button onDoubleClick={() => { setIsRenamingPlaylist(name); setRenameValue(name); }} onClick={() => setViewingPlaylist(name)} className="w-full text-left text-[12px] font-black text-white/88 uppercase tracking-tight truncate group-hover/vault:text-brand-accent transition-colors" title={name}>
                                    {name}
                                  </button>
                                )}
                                <div className="mt-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/30 truncate">
                                  {featuredTrack?.author || 'Empty vault'} {featuredTrack ? 'signal' : ''}
                                </div>
                             </div>
                             <div className="grid grid-cols-6 gap-1.5">
                                <button onClick={() => movePlaylist(name, -1)} className="vault-project-tool" title={`Move ${name} up`}><ChevronLeft size={11} /></button>
                                <button onClick={() => movePlaylist(name, 1)} className="vault-project-tool" title={`Move ${name} down`}><ChevronRight size={11} /></button>
                                <button onClick={() => handlePlaylistAddAll(name)} className="vault-project-tool" title={`Inject ${name} to Queue`}><Plus size={11} /></button>
                                <button onClick={() => {
                                  const shuffled = [...vaultTracks].sort(() => Math.random() - 0.5);
                                  setQueue(shuffled);
                                  seekActivePlaybackTo(0);
                                  setIsPlaying(shuffled.length > 0);
                                  closeHeaderSurfaces();
                                }} className="vault-project-tool" title={`Shuffle & Play ${name}`}><Shuffle size={11} /></button>
                                <button onClick={() => setIsViewingFullPlaylist(name)} className="vault-project-tool" title={`View ${name} Fullscreen`}><Maximize2 size={11} /></button>
                                <button onClick={() => handleDeletePlaylist(name)} className="vault-project-tool danger" title={`Delete ${name}`}><Trash2 size={11} /></button>
                             </div>
                             {vaultTracks.length > 0 && (
                              <button onClick={() => openPlaylistInspect(name, vaultTracks, `vault:${name}`)} className="vault-project-inspect">
                                <Eye size={11} /> Inspect playlist
                              </button>
                             )}
                          </div>
                          );
                       })}
                    </div>
               </div>
            </div>
          </div>
        </div>
      )}
      </motion.main>

      <AnimatePresence>
        {isManualLyricsEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[230] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div
              className="absolute inset-0"
              onClick={() => {
                if (!isManualLyricsSaving) setIsManualLyricsEditorOpen(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative z-10 w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[2rem] border border-white/10 bg-[#07090c]/96 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 p-4 md:p-5 border-b border-white/10 bg-black/20">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                      <Edit3 size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.32em] text-brand-accent">Manual Lyrics Editor</div>
                      <div className="mt-1 text-sm md:text-base font-black text-white/90 truncate">
                        {currentTrack?.title || currentTrackTitle || 'Current track'}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/35 truncate">
                        Saved in LRC format • future plays will use this version automatically
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsManualLyricsRawEditorOpen(prev => !prev)}
                      className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${isManualLyricsRawEditorOpen ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/35'}`}
                    >
                      Raw LRC
                    </button>
                    <button
                      onClick={pasteCurrentLyricsIntoRawEditor}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 hover:text-brand-accent hover:border-brand-accent/35 transition-all"
                    >
                      Paste from clipboard
                    </button>
                    <button
                      onClick={copyManualLyricsToClipboard}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 hover:text-brand-accent hover:border-brand-accent/35 transition-all"
                    >
                      Export LRC
                    </button>
                    <button
                      onClick={appendStampedManualLyricsLine}
                      className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${isManualLyricsTapMode ? 'bg-brand-accent text-black border-brand-accent shadow-neon' : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-brand-accent hover:border-brand-accent/35'}`}
                    >
                      {isManualLyricsTapMode ? 'Tap mode on' : 'Tap to stamp'}
                    </button>
                    {manualLyricsSavedNotice && (
                      <span className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/80">{manualLyricsSavedNotice}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!isManualLyricsSaving) setIsManualLyricsEditorOpen(false);
                  }}
                  className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center"
                  title="Close editor"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 custom-scrollbar">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                    Enter one line per row. Use <span className="text-brand-accent">mm:ss.xx</span> timestamps and keep the order sorted before saving.
                  </div>
                  <button
                    onClick={() => appendManualLyricsDraftLine(getActivePlaybackPositionMs())}
                    className="flex items-center gap-1.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent hover:bg-brand-accent/20 transition-all"
                  >
                    <PlusCircle size={12} /> Add line
                  </button>
                </div>

                {isManualLyricsRawEditorOpen && (
                  <div className="rounded-[1.5rem] border border-brand-accent/25 bg-brand-accent/5 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Raw LRC import</div>
                        <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/40">Paste timestamped lines, then apply them to the editor below.</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={loadManualLyricsFromRawText}
                          className="rounded-xl border border-brand-accent/30 bg-brand-accent px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-all hover:scale-[1.01]"
                        >
                          Apply LRC
                        </button>
                        <button
                          onClick={() => setIsManualLyricsRawEditorOpen(false)}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 hover:text-brand-accent hover:border-brand-accent/35 transition-all"
                        >
                          Hide raw
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={manualLyricsRawText}
                      onChange={(event) => setManualLyricsRawText(event.target.value)}
                      placeholder="[00:00.00] Intro\n[00:12.30] First line"
                      className="w-full min-h-[180px] rounded-[1.25rem] border border-white/10 bg-black/35 px-4 py-3 text-[12px] font-mono text-white outline-none transition-colors placeholder:text-white/20 focus:border-brand-accent/40"
                    />
                  </div>
                )}

                {manualLyricsDraft.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-white/35">
                    <Sparkles size={26} className="mx-auto text-brand-accent/70" />
                    <div className="mt-3 text-[10px] font-black uppercase tracking-[0.32em]">No lines yet</div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.18em] opacity-70">Add a timestamped lyric row to start building the track.</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {manualLyricsDraft.map((line, index) => (
                      <div key={line.id} className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-start">
                        <div className="space-y-2">
                          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Timestamp</div>
                          <input
                            value={line.timestamp || ''}
                            onChange={(event) => updateManualLyricsDraftLine(index, { timestamp: event.target.value })}
                            placeholder="00:00.00"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[12px] font-mono text-white outline-none transition-colors placeholder:text-white/20 focus:border-brand-accent/40"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => stampManualLyricsDraftLine(index)}
                              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/55 hover:border-brand-accent/40 hover:text-brand-accent transition-all"
                            >
                              Use current time
                            </button>
                            <div className="text-[9px] font-mono text-white/30 truncate">
                              {formatManualLyricsTimestamp(parseManualLyricsTimestamp(line.timestamp) ?? line.time)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 min-w-0">
                          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Lyric line</div>
                          <input
                            value={line.text}
                            onChange={(event) => updateManualLyricsDraftLine(index, { text: event.target.value })}
                            placeholder="Write the lyric line here"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-brand-accent/40"
                          />
                        </div>

                        <div className="flex items-start justify-end md:pt-6">
                          <button
                            onClick={() => removeManualLyricsDraftLine(index)}
                            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/50 hover:border-red-500/40 hover:text-red-400 transition-all"
                            title="Remove line"
                          >
                            <MinusCircle size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 bg-black/25 p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                    Saved as LRC for this track
                  </div>
                  <div className={`mt-1 text-[10px] font-bold uppercase tracking-[0.18em] ${manualLyricsDraftError ? 'text-red-400' : 'text-white/30'}`}>
                    {manualLyricsDraftError || 'The app will prefer these saved lyrics the next time this song plays.'}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  <button
                    onClick={appendStampedManualLyricsLine}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/65 hover:border-brand-accent/40 hover:text-brand-accent transition-all"
                  >
                    Stamp + Row
                  </button>
                  <button
                    onClick={() => {
                      if (!isManualLyricsSaving) setIsManualLyricsEditorOpen(false);
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/65 hover:border-white/25 hover:text-white transition-all disabled:opacity-50"
                    disabled={isManualLyricsSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveManualLyrics}
                    disabled={isManualLyricsSaving}
                    className="rounded-xl border border-brand-accent/30 bg-brand-accent px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-neon transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isManualLyricsSaving ? 'Saving…' : 'Save Lyrics'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast Overlay */}
      <ToastPortal>
      <AnimatePresence>
        {sessionRestoreNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 text-white font-black rounded-2xl border border-brand-accent/30 backdrop-blur-xl z-[700] flex items-center gap-3"
          >
            <Clock size={14} className="text-brand-accent" />
            <span className="text-[10px] uppercase tracking-[0.2em]">{sessionRestoreNotice}</span>
          </motion.div>
        )}

        {updateToast && (
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="fixed top-32 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-[#06090d]/90 text-brand-accent font-black rounded-2xl border border-brand-accent/30 backdrop-blur-xl z-[700] flex items-center gap-3"
          >
            <RefreshCw size={12} className={`${updateInfo?.status === 'downloading' || updateInfo?.status === 'checking' ? 'animate-spin' : ''}`} />
            <span className="text-[9px] uppercase tracking-[0.18em]">{updateToast}</span>
          </motion.div>
        )}

        {skipReasonToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="fixed right-5 bottom-24 px-4 py-2 bg-black/70 text-brand-accent font-mono rounded-xl border border-brand-accent/30 backdrop-blur-xl z-[700]"
          >
            <span className="text-[10px] uppercase tracking-[0.16em]">skip: {skipReasonToast}</span>
          </motion.div>
        )}

        {lastAdded && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: -40 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-0 left-1/2 -translate-x-1/2 px-10 py-5 bg-brand-accent text-brand-dark font-black rounded-[2rem] shadow-neon-strong z-[700] flex items-center gap-6 whitespace-nowrap border-t-2 border-white/20">
            <Zap size={24} fill="currentColor" />
            <div className="flex flex-col leading-none">
               <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1 font-bold">Node Initialized</span>
               <span className="text-base tracking-tight truncate uppercase">{lastAdded}</span>
            </div>
           </motion.div>
        )}
      </AnimatePresence>
      </ToastPortal>
      <AnimatePresence>
        {showImmersiveLyricsOverlay && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className={`fixed inset-0 z-[280] overflow-hidden backdrop-blur-[28px] ${isAuraMode ? 'bg-[#03100d]/92' : 'bg-[#030506]/96'}`}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ animation: isAuraMode ? 'aura-liquid-spin 20s linear infinite' : 'none' }}>
              <div className={`absolute inset-0 ${isAuraMode ? 'bg-[radial-gradient(circle_at_top,rgba(0,255,191,0.16),transparent_34%)]' : 'bg-[radial-gradient(circle_at_top,rgba(0,255,191,0.08),transparent_38%)]'}`} />
              {isAuraMode && (
                <>
                  <div className="absolute left-[8%] top-[12%] h-44 w-44 rounded-full bg-brand-accent/18 blur-[90px]" />
                  <div className="absolute right-[10%] top-[18%] h-40 w-40 rounded-full bg-emerald-300/12 blur-[90px]" />
                  <div className="absolute bottom-[14%] left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-accent/12 blur-[110px]" />
                </>
              )}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-4 z-[315] flex justify-center px-5 md:top-6">
              <div className={`w-full max-w-[min(82vw,980px)] rounded-[2rem] border px-5 py-4 md:px-8 md:py-6 ${isAuraMode ? 'border-brand-accent/25 bg-[#06100d]/62 shadow-[0_18px_70px_rgba(0,255,191,0.12)]' : 'border-white/10 bg-black/20 shadow-[0_16px_40px_rgba(0,0,0,0.3)]'} backdrop-blur-2xl`}>
                <div className="w-full overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
                  <div className="overlay-marquee-track flex items-center gap-[10vw] text-base font-black uppercase tracking-[0.26em] text-white sm:text-lg md:text-2xl lg:text-3xl">
                    <span>{currentTrack?.title || 'Immersive Output'}</span>
                    <span aria-hidden="true">{currentTrack?.title || 'Immersive Output'}</span>
                    <span aria-hidden="true">{currentTrack?.title || 'Immersive Output'}</span>
                    <span aria-hidden="true">{currentTrack?.title || 'Immersive Output'}</span>
                  </div>
                </div>
                <div className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.42em] text-brand-accent/80 md:text-[11px]">
                  {currentTrack?.author || 'Unknown Artist'}
                </div>
              </div>
            </div>

            <div className="absolute right-4 top-4 z-[320] md:right-6 md:top-6">
              <button 
                onClick={() => setIsLyricsExpanded(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 text-brand-accent shadow-[0_18px_42px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:border-brand-accent/45 hover:bg-brand-accent/10 active:scale-90"
                title="Return to Studio"
              >
                <Minimize2 size={18} />
              </button>
            </div>

            <div className="relative z-10 flex h-full w-full min-h-0 flex-col">
               <div className="flex-1 overflow-y-scroll overflow-x-hidden flex flex-col px-4 pb-10 pt-32 md:px-10 md:pb-14 md:pt-36 custom-scrollbar-heavy w-full relative" ref={expandedContainerRef} style={{ minHeight: "0px", perspective: '1200px' }}>
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    animate={{
                      opacity: 0.15 + immersiveBeatIntensity * 0.4,
                      scale: 1 + immersiveBeatIntensity * 0.3,
                    }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    style={{
                      width: 'min(84vw, 980px)',
                      height: 'min(84vw, 980px)',
                      background: `radial-gradient(circle, ${themeColor}${alphaHex(0.2)} 0%, ${themeColor}${alphaHex(0.09)} 35%, transparent 70%)`,
                      filter: `blur(${40 + immersiveBeatIntensity * 30}px)`,
                    }}
                  />

	                  <div className="flex flex-col gap-16 lg:gap-24 py-[36vh] items-center justify-center text-center w-full max-w-full mx-auto cursor-default px-3 sm:px-5" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(5deg)' }}>
	                    {lyrics.map((line, idx) => {
	                      const isActive = idx === activeLyricIndex;
	                      const distance = Math.abs(idx - activeLyricIndex);
	                      const lyricText = String(line.text || '');
	                      const lyricLength = lyricText.trim().length;
	                      const lyricLineLayoutClass = 'max-w-[min(84vw,1080px)]';
	                      const lyricStateClass = isActive
	                        ? 'scale-100 opacity-100 text-[#00ffbf] drop-shadow-[0_0_34px_rgba(0,255,191,0.64)]'
	                        : distance === 1
	                          ? 'scale-100 opacity-60 text-white/58 blur-[0.1px]'
	                          : distance === 2
	                            ? 'scale-[0.995] opacity-30 text-white/28 blur-[0.75px]'
	                            : 'scale-[0.97] opacity-12 text-white/12 blur-[1.4px]';
	                      const activeLyricMax = lyricLength > 84 ? '3.35rem' : lyricLength > 64 ? '4.05rem' : lyricLength > 46 ? '4.8rem' : '5.8rem';
	                      const nearLyricMax = lyricLength > 84 ? '2.45rem' : lyricLength > 64 ? '3rem' : lyricLength > 46 ? '3.65rem' : '4.35rem';
	                      const farLyricMax = lyricLength > 84 ? '1.9rem' : lyricLength > 64 ? '2.25rem' : '3.2rem';
	                      const lyricFontSize = isActive
	                        ? `clamp(1.95rem, min(${lyricLength > 64 ? '3.8vw' : '4.8vw'}, 7.4vh), ${activeLyricMax})`
	                        : distance === 1
	                          ? `clamp(1.55rem, min(${lyricLength > 64 ? '3vw' : '3.8vw'}, 5.6vh), ${nearLyricMax})`
	                          : `clamp(1.2rem, min(${lyricLength > 64 ? '2.25vw' : '2.8vw'}, 4.2vh), ${farLyricMax})`;
	                      return (
	                        <div
	                          key={idx}
	                          ref={isActive ? expandedActiveRef : null}
	                          onClick={() => handleLyricLineSeek(line.time)}
	                          className={`${lyricLineLayoutClass} immersive-lyric-line px-2 md:px-4 font-black cursor-pointer transition-[transform,opacity,filter,text-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu origin-center leading-[1.06] w-full min-w-0 break-words whitespace-normal [overflow-wrap:anywhere] z-20 will-change-[transform,opacity,filter] ${lyricStateClass} hover:scale-[1.015]`}
	                          style={{
	                            fontSize: lyricFontSize,
	                            maxInlineSize: 'min(84vw, 1080px)',
	                            transitionDelay: `${Math.min(distance, 3) * 18}ms`
	                          }}
	                        >
	                          <span className={isActive ? 'immersive-karaoke-text immersive-karaoke-text-active' : 'immersive-karaoke-text'}>
	                            {lyricText}
	                          </span>
                        </div>
                      );
                    })}
                  </div>
               </div>

               {isAutoScrollPaused && (
                 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[250]">
                   <button 
                     onClick={handleResyncLyrics}
                     className="flex items-center gap-3 px-8 py-4 bg-brand-accent text-black font-black uppercase tracking-[0.3em] rounded-full shadow-neon scale-110 active:scale-95 transition-all"
                   >
                     <RotateCcw size={18} /> Re-Sync
                   </button>
                 </div>
               )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLockModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[245] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !isLockBusy && setIsLockModalOpen(false)} />
            <motion.div
              initial={{ y: 12, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, scale: 0.98, opacity: 0 }}
              className="relative z-10 flex w-full max-w-lg max-h-[min(88vh,760px)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-accent">App Lock</div>
                  <div className="text-[11px] text-white/45 mt-1">Secure Aether with password and optional Touch ID. Idle auto-lock stays enabled.</div>
                </div>
                <button
                  onClick={() => !isLockBusy && setIsLockModalOpen(false)}
                  className={sharedModalCloseButtonClass}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {lockStatus.enabled ? (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Status</div>
                      <div className="text-[12px] text-brand-accent font-black">Enabled</div>
                    </div>

                    {lockStatus.touchIdAvailable && (
                      <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer">
                        <span className="text-[11px] text-white/70">Use Touch ID</span>
                        <input
                          type="checkbox"
                          checked={lockUseTouchId}
                          onChange={(e) => handleToggleTouchIdLock(e.target.checked)}
                          className="accent-brand-accent"
                        />
                      </label>
                    )}

                    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-white/70">Idle auto-lock</span>
                        <span className="text-[11px] font-black text-brand-accent">{lockIdleMinutes}m</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={60}
                        step={1}
                        value={lockIdleMinutes}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value || '5', 10);
                          setLockIdleMinutes(Number.isFinite(parsed) ? Math.max(1, parsed) : 5);
                        }}
                        className="w-full accent-brand-accent"
                      />
                    </label>

                    <input
                      type="password"
                      value={lockDisablePassword}
                      onChange={(e) => setLockDisablePassword(e.target.value)}
                      placeholder="Enter password to disable lock"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50"
                    />
                    <button
                      onClick={handleDisableLock}
                      disabled={isLockBusy || !lockDisablePassword}
                      className="w-full px-5 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 font-black text-sm disabled:opacity-50"
                    >
                      Disable Lock
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="password"
                      value={lockPasswordInput}
                      onChange={(e) => setLockPasswordInput(e.target.value)}
                      placeholder="Set password"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50"
                    />
                    <input
                      type="password"
                      value={lockPasswordConfirm}
                      onChange={(e) => setLockPasswordConfirm(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand-accent/50"
                    />
                    {lockStatus.touchIdAvailable && (
                      <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer">
                        <span className="text-[11px] text-white/70">Enable Touch ID unlock</span>
                        <input
                          type="checkbox"
                          checked={lockUseTouchId}
                          onChange={(e) => setLockUseTouchId(e.target.checked)}
                          className="accent-brand-accent"
                        />
                      </label>
                    )}
                    <button
                      onClick={handleEnableLock}
                      disabled={isLockBusy || !lockPasswordInput || !lockPasswordConfirm}
                      className="w-full px-5 py-2.5 rounded-xl bg-brand-accent text-black font-black text-sm disabled:opacity-50"
                    >
                      Enable Lock
                    </button>
                  </>
                )}

                {lockStatus.enabled && (
                  <button
                    onClick={() => { setIsAppLocked(true); setIsLockModalOpen(false); }}
                    className="w-full px-5 py-2.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 text-brand-accent font-black text-sm"
                  >
                    Lock Now
                  </button>
                )}

                {isStandalone && lockStatus.enabled && window.aether?.getLockRecoveryStatus && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Recovery</div>
                        <div className="mt-1 text-[11px] text-white/55">Set up recovery now so you can reset your lock later.</div>
                      </div>
                      <button
                        type="button"
                        onClick={refreshLockRecoveryStatus}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 hover:border-brand-accent/40 hover:text-brand-accent transition-all"
                        title="Refresh recovery status"
                      >
                        Refresh
                      </button>
                    </div>

                    {lockRecoveryStatusError && (
                      <div className="mt-2 text-[11px] text-red-400">{lockRecoveryStatusError}</div>
                    )}

                    <div className="mt-3 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3">
                        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Backup Phrase</div>
                        <div className="text-[11px] text-white/55">
                          Status:{' '}
                          {lockRecoveryStatus?.phrase?.enabled ? <span className="text-white/70">Enabled</span> : <span className="text-white/45">Not set</span>}
                        </div>

                        {phraseGenerated && (
                          <div className="mt-3 rounded-2xl border border-brand-accent/20 bg-brand-accent/10 px-3 py-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/80">Save this phrase now</div>
                                <div className="mt-2 text-[12px] font-mono text-white/85 break-words select-all cursor-pointer" onClick={handleCopyPhrase} title="Click to copy">{phraseGenerated}</div>
                              </div>
                              <button
                                type="button"
                                onClick={handleCopyPhrase}
                                className={`mt-1 p-2 rounded-xl border transition-all ${phraseCopied ? 'border-brand-accent/40 bg-brand-accent/10 text-brand-accent' : 'border-white/10 bg-white/5 text-white/50 hover:text-brand-accent hover:border-brand-accent/40'}`}
                                title="Copy phrase to clipboard"
                              >
                                {phraseCopied ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                            <div className="mt-2 text-[10px] text-white/45 border-t border-white/5 pt-2">It will not be shown again after closing this dialog.</div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleGenerateRecoveryPhrase}
                            disabled={phraseBusy}
                            className="rounded-xl bg-brand-accent text-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
                            title={lockRecoveryStatus?.phrase?.enabled ? 'Generate a new phrase (replaces the old one)' : 'Generate backup phrase'}
                          >
                            {phraseBusy ? 'Generating…' : (lockRecoveryStatus?.phrase?.enabled ? 'Regenerate' : 'Generate')}
                          </button>
                          <div className="text-[10px] text-white/35">Use this if you forget your lock password.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {lockError && <div className="text-[11px] text-red-400">{lockError}</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSpotifyImportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[240] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !isSpotifyImporting && setIsSpotifyImportOpen(false)} />
            <motion.div
              initial={{ y: 16, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, scale: 0.98, opacity: 0 }}
              className="relative z-10 flex w-full max-w-xl max-h-[min(88vh,760px)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
              style={{
                '--music-import-accent': musicImportTheme.accent,
                '--music-import-accent-soft': musicImportTheme.accentSoft,
                '--music-import-accent-border': musicImportTheme.accentBorder,
                '--music-import-accent-text': musicImportTheme.accentText,
                '--music-import-accent-shadow': musicImportTheme.accentShadow,
                '--music-import-cta-text': musicImportTheme.ctaText,
              }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: 'var(--music-import-accent-text)' }}>Import a Playlist</div>
                  <div className="text-[11px] text-white/45 mt-1">Pick a source, paste a public playlist link, and Aether will match songs into your library.</div>
                </div>
                <button
                  onClick={() => !isSpotifyImporting && setIsSpotifyImportOpen(false)}
                  className={sharedModalCloseButtonClass}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['spotify', 'Spotify', 'Public open.spotify.com playlist'],
                    ['apple', 'Apple Music', 'Public music.apple.com playlist'],
                  ].map(([provider, label, detail]) => (
                    <button
                      key={provider}
                      type="button"
                      disabled={isSpotifyImporting}
                      onClick={() => {
                        setMusicImportProvider(provider);
                        setSpotifyImportUrl('');
                        setSpotifyImportPlaylistName('');
                        setSpotifyImportProgress({ stage: 'idle', progress: 0, message: `${label} selected. Paste a public playlist URL.` });
                        setSpotifyImportLogs([]);
                      }}
                      className={`no-drag rounded-2xl border px-4 py-4 text-left transition-all ${musicImportProvider === provider ? 'text-white shadow-[0_0_22px_var(--music-import-accent-shadow)]' : 'border-white/10 bg-white/[0.035] text-white/60 hover:text-white'}`}
                      style={musicImportProvider === provider ? { borderColor: 'var(--music-import-accent-border)', background: 'var(--music-import-accent-soft)' } : undefined}
                    >
                      <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.18em]">
                        <Music size={14} />
                        <span>{label}</span>
                      </div>
                      <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{detail}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">{musicImportProvider ? `${musicImportTheme.label} Playlist Link` : 'Playlist Link'}</label>
                  <input
                    value={spotifyImportUrl}
                    onChange={(e) => setSpotifyImportUrl(e.target.value)}
                    disabled={isSpotifyImporting || !musicImportProvider}
                    placeholder={musicImportTheme.placeholder}
                    className="no-drag w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all disabled:opacity-60"
                    style={{ '--tw-ring-color': 'var(--music-import-accent)', caretColor: 'var(--music-import-accent)' }}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.22em] text-white/35 mb-2">Save As</label>
                  <input
                    value={spotifyImportPlaylistName}
                    onChange={(e) => setSpotifyImportPlaylistName(e.target.value)}
                    disabled={isSpotifyImporting || !musicImportProvider}
                    placeholder={musicImportProvider ? `${musicImportTheme.label} playlist name (optional)` : 'Choose a source first'}
                    className="no-drag w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all disabled:opacity-60"
                    style={{ caretColor: 'var(--music-import-accent)' }}
                  />
                  <div className="mt-2 text-[10px] text-white/35">Leave blank to use the playlist title Aether finds.</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Progress</span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--music-import-accent-text)' }}>{Math.max(0, Math.min(100, spotifyImportProgress.progress || 0))}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(4, Math.min(100, spotifyImportProgress.progress || 0))}%`, background: spotifyImportProgress.stage === 'error' ? '#ff3b4f' : 'var(--music-import-accent)' }}
                    />
                  </div>
                  <div className="mt-3 text-[11px] text-white/60 min-h-[1.5em]">
                    {spotifyImportProgress.message || (isSpotifyImporting ? 'Preparing import…' : 'Ready to import.')}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Debug Log</div>
                    <button type="button" onClick={copySpotifyImportDebugLog} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/45 transition-colors hover:text-white">Copy</button>
                  </div>
                  <div className="custom-scrollbar-heavy max-h-28 select-text overflow-auto space-y-1 pr-1">
                    {spotifyImportLogs.length === 0 ? (
                      <div className="text-[10px] text-white/35">No logs yet.</div>
                    ) : spotifyImportLogs.map((line, idx) => (
                      <div key={`${line}-${idx}`} className="text-[10px] leading-4 font-mono text-white/55 break-words">{line}</div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    onClick={() => { if (!isSpotifyImporting) setIsSpotifyImportOpen(false); }}
                    className="no-drag px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportSpotifyPlaylist}
                    disabled={isSpotifyImporting || !musicImportProvider || !spotifyImportUrl.trim()}
                    className="no-drag px-5 py-2 rounded-xl font-black text-sm hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    style={{ background: 'var(--music-import-accent)', color: 'var(--music-import-cta-text)' }}
                  >
                    {isSpotifyImporting ? 'Matching...' : musicImportProvider ? `Match ${musicImportTheme.label} Playlist` : 'Choose a Source'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isMixtapeVaultOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[320] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setIsMixtapeVaultOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              ref={mixtapeVaultRef}
              style={{
                '--vault-bass': vaultPulse.bass,
                '--vault-mids': vaultPulse.mids,
                '--vault-highs': vaultPulse.highs,
                '--vault-energy': vaultPulse.energy,
                '--vault-scale': 1 + (vaultPulse.energy * 0.1),
                '--vault-spin': `${vaultPulse.spin}deg`,
                '--vault-glow': vaultPulse.energy,
              }}
              className="mixtape-vault-shell relative w-[min(94vw,920px)] rounded-[2rem] border border-brand-accent/25 bg-[#07090c]/96 shadow-[0_0_80px_rgba(0,255,191,0.14)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/70 to-transparent" />

              <div className="p-5 md:p-7">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 flex items-center justify-center rounded-2xl border border-brand-accent/40 bg-brand-accent/10 shadow-[0_0_24px_rgba(0,255,191,0.12)]">
                    <Music size={18} className="text-brand-accent" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-brand-accent font-black text-xl md:text-2xl tracking-[0.16em] uppercase leading-none">Mixtape Vault</h2>
                    <span className="text-white/45 text-[9px] font-mono tracking-[0.2em] uppercase">Private live scene // tape deck</span>
                    <div className="mt-2 text-[11px] font-black text-white/85 truncate">{currentTrack?.title || 'Aether Secret Session'}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-brand-accent/70 truncate">{currentTrack?.author || 'Unknown Artist'}</div>
                  </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-right">
                      <div className="text-[8px] font-black uppercase tracking-[0.22em] text-white/35">Scene Time</div>
                      <div className="mt-1 text-[11px] font-mono text-brand-accent">{formatTime(getActivePlaybackPositionMs())}</div>
                    </div>
                    <button
                      onClick={() => setIsMixtapeVaultOpen(false)}
                      className={sharedModalCloseButtonClass}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {!isMixtapeVaultContentReady ? (
                  <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-5 text-center md:p-6">
                    <Loader2 size={26} className="animate-spin text-brand-accent/70" />
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/32">Preparing Analog Scene</div>
                  </div>
                ) : (
                <div className="mixtape-console rounded-[1.75rem] border border-white/10 bg-black/30 p-4 md:p-5">
                  <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] items-stretch">
                    <div className="mixtape-deck rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4 flex flex-col items-center justify-center">
                      <div className="mixtape-record-stage">
                        <div className={`mixtape-record ${isPlaying ? 'is-playing' : ''}`}>
                          <div className="mixtape-record-grooves" />
                          <img
                            src={getProxyUrl(currentTrack?.thumbnail)}
                            className="mixtape-record-art"
                            alt=""
                            draggable={false}
                          />
                          <div className="mixtape-record-pin" />
                        </div>
                        <div className="mixtape-tonearm" />
                      </div>
                      <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl border border-white/8 bg-black/24 px-3 py-2">
                          <div className="text-[8px] uppercase tracking-[0.2em] text-white/28">Bass</div>
                          <div className="mt-1 font-mono text-[11px] text-brand-accent">{Math.round(vaultPulse.bass * 100)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/24 px-3 py-2">
                          <div className="text-[8px] uppercase tracking-[0.2em] text-white/28">Mids</div>
                          <div className="mt-1 font-mono text-[11px] text-brand-accent">{Math.round(vaultPulse.mids * 100)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/24 px-3 py-2">
                          <div className="text-[8px] uppercase tracking-[0.2em] text-white/28">Highs</div>
                          <div className="mt-1 font-mono text-[11px] text-brand-accent">{Math.round(vaultPulse.highs * 100)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/8 bg-black/24 p-4 flex flex-col justify-between min-w-0">
                      <div className="min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/28">Now Sealed In The Tape</div>
                        <div className="mt-3 text-lg md:text-xl font-black uppercase tracking-tight text-white truncate">{currentTrack?.title || 'Aether Secret Session'}</div>
                        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand-accent/70 truncate">{currentTrack?.author || 'Unknown Artist'}</div>
                      </div>

                      <div className="my-5">
                        <div className="mixtape-meter grid grid-cols-8 gap-1 items-end h-16">
                          {vaultSpectrum.map((bin, idx) => {
                            const h = 12 + (bin * 52);
                            return (
                              <div
                                key={idx}
                                className="rounded-md bg-brand-accent/75 transition-[height,opacity] duration-200 ease-out"
                                style={{ height: `${h}px`, opacity: 0.35 + (bin * 0.55) + (vaultPulse.energy * 0.1) }}
                              />
                            );
                          })}
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-brand-accent shadow-[0_0_18px_rgba(0,255,191,0.28)] transition-[width] duration-200"
                            style={{ width: `${Math.min(100, Math.max(4, vaultPulse.energy * 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 min-w-0">
                          <div className="text-[8px] font-black uppercase tracking-[0.22em] text-white/28">Summon Phrase</div>
                          <div className="mt-1 text-[10px] text-white/48 uppercase tracking-[0.22em]">Type <span className="text-brand-accent font-black">mixtape</span> anywhere in the app</div>
                          <div className="mt-2 truncate font-mono text-[9px] uppercase tracking-[0.18em] text-white/34">
                            {currentTrack?.title ? `${currentTrack.title} // ${formatTime(getActivePlaybackPositionMs())} // ${vaultPulse.stamp}` : vaultPulse.stamp}
                          </div>
                        </div>
                        <button
                          onClick={copyVaultSceneEmbed}
                          className="h-12 rounded-2xl border border-brand-accent/35 bg-brand-accent/12 px-5 text-[10px] font-black uppercase tracking-[0.22em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black active:scale-95"
                        >
                          Copy Live Scene Link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSharedSceneOpen && sharedScene && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[320] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setIsSharedSceneOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="relative w-[min(92vw,760px)] rounded-3xl border border-brand-accent/30 bg-[#07090c]/95 shadow-[0_0_70px_rgba(0,255,191,0.15)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 md:p-8 flex flex-col gap-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent mt-1">Aether Shared Scene</div>
                  <button
                    onClick={() => setIsSharedSceneOpen(false)}
                    className={sharedModalCloseButtonClass}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-5 flex flex-col md:flex-row gap-4 md:gap-5">
                  <img
                    src={sharedScene.thumbnail || (sharedScene.youtubeId ? `https://i.ytimg.com/vi/${sharedScene.youtubeId}/hqdefault.jpg` : null)}
                    alt="scene"
                    className="w-full md:w-40 h-40 rounded-2xl object-cover border border-white/10"
                    onError={(e) => {
                      const fallback = sharedScene.youtubeId ? `https://i.ytimg.com/vi/${sharedScene.youtubeId}/hqdefault.jpg` : '';
                      if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-brand-accent text-lg truncate">{sharedScene.title || 'Aether Scene'}</div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/55 mt-1 truncate">{sharedScene.author || 'Unknown Artist'}</div>
                    <div className="mt-4 text-white/80 text-sm leading-relaxed italic break-words">“{sharedScene.lyric || 'No lyric locked yet'}”</div>
                    <div className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/45">
                      {formatTime(Number(sharedScene.at || 0))} / {formatTime(Number(sharedScene.total || 0))} • {sharedScene.state || 'paused'} • {sharedScene.mode || 'bars'}
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Pulse {Number(sharedScene?.pulse?.e || 0)}% • Bass {Number(sharedScene?.pulse?.b || 0)}% • Mids {Number(sharedScene?.pulse?.m || 0)}% • Highs {Number(sharedScene?.pulse?.h || 0)}%
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAuraStageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[330] overflow-hidden bg-[#020405]/96 backdrop-blur-2xl"
          >
            <div className="absolute inset-0" onClick={() => setIsAuraStageOpen(false)} />
            {currentTrack?.thumbnail && (
              <>
                <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.18] blur-[54px] scale-110" />
                <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="aura-stage-parallax absolute left-1/2 top-1/2 h-[min(72vw,72vh)] w-[min(72vw,72vh)] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] object-cover opacity-20 shadow-[0_40px_120px_rgba(0,0,0,0.55)]" />
              </>
            )}
            <div className="aura-stage-rings pointer-events-none absolute inset-0" />
            <div className="aura-stage-grid pointer-events-none absolute inset-0" />

            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="relative z-10 flex h-full flex-col p-4 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-accent/30 bg-brand-accent/12 text-brand-accent shadow-[0_0_28px_rgba(0,255,191,0.14)]">
                    <Layers size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-accent">Aura Stage 2.0</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">Depth lyric stage // beat field</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openGestureLab}
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${isGestureControlEnabled ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/5 text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                    title="Gesture Lab"
                  >
                    <Hand size={15} />
                  </button>
                  <button
                    onClick={openFeedbackPanel}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/55 transition-all hover:border-brand-accent/35 hover:text-brand-accent"
                    title="Send Feedback"
                  >
                    <MessageSquare size={15} />
                  </button>
                  <button onClick={() => setIsAuraStageOpen(false)} className={sharedModalCloseButtonClass} title="Close">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="relative flex flex-1 items-center justify-center py-6">
                <div className="aura-stage-depth-stack w-full max-w-6xl">
                  <div className="grid min-h-[60vh] grid-cols-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="flex items-center justify-center">
                      <motion.div
                        animate={{ scale: auraStagePulseScale, rotate: immersiveBeatIntensity * 1.8 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className="aura-stage-art relative aspect-square w-[min(72vw,420px)] overflow-hidden rounded-[2.6rem] border border-white/12 bg-white/[0.03] shadow-[0_36px_110px_rgba(0,0,0,0.48)]"
                      >
                        {currentTrack?.thumbnail ? (
                          <img src={getProxyUrl(currentTrack.thumbnail)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-brand-accent/45"><Music size={72} strokeWidth={1.2} /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/8" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-brand-accent/85">Now Playing</div>
                          <div className="mt-1 truncate text-lg font-black uppercase tracking-tight text-white">{currentTrack?.title || 'No track selected'}</div>
                          <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.24em] text-white/48">{currentTrack?.author || 'Search and queue a track'}</div>
                        </div>
                      </motion.div>
                    </div>

                    <div className="min-w-0 text-center lg:text-left">
                      <div className="mb-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                        <span className="rounded-full border border-brand-accent/25 bg-brand-accent/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent">Pulse {Math.round(immersiveBeatIntensity * 100)}%</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/45">{auraPreset}</span>
                        {isGestureControlEnabled && <span className="rounded-full border border-brand-accent/20 bg-brand-accent/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/75">Gesture on</span>}
                        {isFaceControlEnabled && <span className="rounded-full border border-brand-accent/20 bg-brand-accent/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent/75">Face on</span>}
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`aura-stage-lyric-${activeLyricIndex}-${compactLyric || 'idle'}`}
                          initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
                          transition={{ duration: 0.32, ease: 'easeOut' }}
                          className="aura-stage-lyric text-4xl font-black leading-[0.98] tracking-normal text-white sm:text-6xl lg:text-7xl"
                        >
                          {compactLyric || currentTrack?.title || 'Aether is standing by'}
                        </motion.div>
                      </AnimatePresence>
                      {nextLyric && (
                        <div className="mt-5 text-base font-semibold leading-snug text-white/44 sm:text-xl">
                          {nextLyric}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-auto w-full max-w-5xl rounded-[1.6rem] border border-white/10 bg-black/36 px-4 py-4 backdrop-blur-2xl">
                <PlaybackProgressIsland
                  durationMs={auraStageDurationMs}
                  getPositionMs={getActivePlaybackPositionMs}
                  onSeek={handleSeek}
                  accent={trackProgressAccent}
                  glow={trackProgressGlow}
                  barClassName="mb-3 h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/12"
                  timeRowClassName="flex items-center justify-between gap-4 text-[10px] font-mono text-white/42"
                  middleContent={(
                  <div className="flex items-center gap-5">
                    <button onClick={() => handleControl('previous')} className="text-white/55 transition-colors hover:text-brand-accent active:scale-90" title="Previous">
                      <Rewind size={22} fill="currentColor" />
                    </button>
                    <button
                      onClick={() => handleControl(isPlaying ? 'pause' : 'resume')}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-black transition-all hover:scale-[1.03] active:scale-95"
                      style={{ background: trackControlAccent, boxShadow: `0 0 28px ${trackControlGlow}` }}
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={() => handleControl('skip')} className="text-white/55 transition-colors hover:text-brand-accent active:scale-90" title="Next">
                      <FastForward size={22} fill="currentColor" />
                    </button>
                  </div>
                  )}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(inspectTrack || isPlaylistInspect) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[340] flex items-center justify-center bg-black/82 p-4 backdrop-blur-xl"
          >
            <div className="absolute inset-0" onClick={() => setInspectTarget(null)} />
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              className="relative z-10 flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-brand-accent/20 bg-[#080c10]/96 shadow-[0_28px_100px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/22 p-5">
                <div className="flex min-w-0 items-center gap-4">
                  {isPlaylistInspect ? (
                    <div className="relative h-16 w-16 flex-none overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                      {inspectPlaylistTracks.length > 1 ? (
                        <div className="grid h-full w-full grid-cols-2">
                          {inspectPlaylistTracks.slice(0, 4).map((track, index) => (
                            track.thumbnail ? (
                              <img key={`${inspectPlaylistName}-inspect-cover-${index}`} src={getProxyUrl(track.thumbnail)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div key={`${inspectPlaylistName}-inspect-cover-${index}`} className="flex h-full w-full items-center justify-center bg-brand-accent/10 text-brand-accent"><Music size={12} /></div>
                            )
                          ))}
                        </div>
                      ) : inspectPrimaryTrack?.thumbnail ? (
                        <img src={getProxyUrl(inspectPrimaryTrack.thumbnail)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-brand-accent"><ListMusic size={18} /></div>
                      )}
                      <div className="absolute bottom-1 right-1 rounded-full border border-brand-accent/25 bg-black/76 px-1.5 py-0.5 text-[8px] font-black text-brand-accent">{inspectPlaylistTracks.length}</div>
                    </div>
                  ) : (
                    <img src={getProxyUrl(inspectTrack.thumbnail)} alt="" className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-accent">{isPlaylistInspect ? 'Inspect Playlist' : 'Inspect Track'}</div>
                    <div className="mt-1 truncate text-xl font-black uppercase tracking-tight text-white">{isPlaylistInspect ? inspectPlaylistName : (inspectTrack.title || 'Unknown Track')}</div>
                    <div className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                      {isPlaylistInspect ? `${inspectPlaylistTracks.length} tracks // ${inspectPlaylistArtistCount} artists` : (inspectTrack.author || 'Unknown Artist')}
                    </div>
                  </div>
                </div>
                <button onClick={() => setInspectTarget(null)} className={sharedModalCloseButtonClass} title="Close">
                  <X size={16} />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5 md:flex-row">
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar-heavy">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Context</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                      {isPlaylistInspect ? (
                        <>
                          <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectPlaylistTracks.length}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Tracks</div></div>
                          <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectPlaylistQueuedCount}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Queued</div></div>
                          <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{formatTime(inspectPlaylistDurationMs)}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Length</div></div>
                          <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectPlaylistArtistCount}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Artists</div></div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectQueueIndex >= 0 ? inspectQueueIndex + 1 : '-'}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Queue</div></div>
                          <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{formatTime(inspectDurationMs)}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Length</div></div>
                          <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{inspectVaultNames.length}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Vaults</div></div>
                          <div className="rounded-xl border border-white/8 bg-black/24 p-3"><div className="text-lg font-black text-brand-accent">{lyrics.length}</div><div className="text-[8px] uppercase tracking-[0.22em] text-white/30">Lyrics</div></div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    {isPlaylistInspect ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Playlist Tracks</div>
                          <button
                            disabled={!inspectPlaylistTracklistText}
                            onClick={() => handleCopyDiagnosticsValue(inspectPlaylistTracklistText, 'Tracklist copied')}
                            className="rounded-xl border border-brand-accent/20 bg-brand-accent/8 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent/80 transition-all hover:bg-brand-accent hover:text-black disabled:opacity-35 disabled:hover:bg-brand-accent/8 disabled:hover:text-brand-accent/80"
                          >
                            Copy List
                          </button>
                        </div>
                        <div className="mt-3 max-h-[38vh] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                          {inspectPlaylistTracks.map((track, index) => {
                            const rowSourceUrl = getInspectSourceUrl(track);
                            return (
                              <div key={`${normalizeTrackIdentity(track)}-${index}`} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/24 p-2">
                                <div className="w-6 text-center text-[10px] font-black text-brand-accent/75">{index + 1}</div>
                                {track.thumbnail ? (
                                  <img src={getProxyUrl(track.thumbnail)} alt="" className="h-10 w-10 flex-none rounded-lg border border-white/10 object-cover" />
                                ) : (
                                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-brand-accent"><Music size={13} /></div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[11px] font-black uppercase tracking-tight text-white/82">{track.title || 'Unknown Track'}</div>
                                  <div className="mt-0.5 truncate text-[9px] font-black uppercase tracking-[0.18em] text-white/32">{track.author || 'Unknown Artist'}</div>
                                </div>
                                <div className="flex flex-none items-center gap-1">
                                  <button onClick={() => handleAdd(track)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/50 transition-all hover:border-brand-accent/35 hover:text-brand-accent" title="Queue Track">Queue</button>
                                  <button onClick={() => openTrackInspect(track, `playlist:${inspectPlaylistName}`)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/50 transition-all hover:border-brand-accent/35 hover:text-brand-accent" title="Inspect Track">Inspect</button>
                                  <button disabled={!rowSourceUrl} onClick={() => handleCopyDiagnosticsValue(rowSourceUrl, 'Source copied')} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/50 transition-all hover:border-brand-accent/35 hover:text-brand-accent disabled:opacity-35" title="Copy Source URL">Copy</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Source</div>
                          <button
                            disabled={!inspectSourceUrl}
                            onClick={() => handleCopyDiagnosticsValue(inspectSourceUrl, 'Source copied')}
                            className="rounded-xl border border-brand-accent/20 bg-brand-accent/8 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent/80 transition-all hover:bg-brand-accent hover:text-black disabled:opacity-35 disabled:hover:bg-brand-accent/8 disabled:hover:text-brand-accent/80"
                          >
                            Copy URL
                          </button>
                        </div>
                        <div className="no-drag mt-3 select-text break-all rounded-xl border border-white/8 bg-black/28 p-3 text-[11px] font-mono leading-5 text-white/62" style={{ WebkitUserSelect: 'text', userSelect: 'text' }}>
                          {inspectSourceUrl || 'No source URL captured'}
                        </div>
                        {inspectVaultNames.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {inspectVaultNames.map((name) => (
                              <span key={`inspect-vault-${name}`} className="rounded-full border border-brand-accent/20 bg-brand-accent/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent/75">{name}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex w-full flex-shrink-0 flex-col gap-3 overflow-y-auto custom-scrollbar-heavy md:w-[320px]">
                  <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-brand-accent/8 to-white/[0.02] p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Actions</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {isPlaylistInspect ? (
                        <>
                          <button onClick={() => playInspectPlaylist(false)} className="rounded-xl border border-brand-accent/25 bg-brand-accent/12 px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black">Play Playlist</button>
                          <button onClick={queueInspectPlaylist} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Queue All</button>
                          <button onClick={() => playInspectPlaylist(true)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Shuffle Play</button>
                          <button onClick={() => openLibraryOverlay({ type: 'queue', items: inspectPlaylistTracks })} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Vault Copy</button>
                          <button disabled={!inspectPlaylistSourceText} onClick={() => handleCopyDiagnosticsValue(inspectPlaylistSourceText, 'Playlist URLs copied')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent disabled:opacity-35">Copy URLs</button>
                          <button disabled={!inspectPlaylistTracklistText} onClick={() => handleCopyDiagnosticsValue(inspectPlaylistTracklistText, 'Tracklist copied')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent disabled:opacity-35">Copy List</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setQueue((prev) => [normalizeQueueTrack(inspectTrack) || inspectTrack, ...(Array.isArray(prev) ? prev.filter((track) => normalizeTrackIdentity(track) !== normalizeTrackIdentity(inspectTrack)) : [])]); setIsManualStop(false); setIsPlaying(true); setInspectTarget(null); }} className="rounded-xl border border-brand-accent/25 bg-brand-accent/12 px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black">Play Now</button>
                          <button onClick={() => handleAdd(inspectTrack)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Queue</button>
                          <button onClick={() => toggleFavoriteTrack(inspectTrack)} className={`rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${isTrackFavorite(inspectTrack) ? 'border-rose-300/30 bg-rose-400/14 text-rose-200' : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-rose-300/35 hover:text-rose-300'}`}>{isTrackFavorite(inspectTrack) ? 'Unfavorite' : 'Favorite'}</button>
                          <button onClick={() => openLibraryOverlay({ type: 'track', items: [inspectTrack] })} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Vault</button>
                          <button disabled={!inspectSourceUrl} onClick={() => { if (inspectSourceUrl) { if (isStandalone && window.aether?.openExternal) window.aether.openExternal(inspectSourceUrl); else window.open(inspectSourceUrl, '_blank', 'noopener,noreferrer'); } }} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent disabled:opacity-35">Source</button>
                          <button disabled={!inspectSourceUrl} onClick={() => handleCopyDiagnosticsValue(inspectSourceUrl, 'Source copied')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent disabled:opacity-35">Copy URL</button>
                          <button onClick={() => handleCopyDiagnosticsValue(`${inspectTrack.title || 'Unknown Track'}\n${inspectTrack.author || 'Unknown Artist'}${inspectSourceUrl ? `\n${inspectSourceUrl}` : ''}`, 'Track info copied')} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Copy Info</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 rounded-2xl border border-white/8 bg-black/24 p-4">
                    {isPlaylistInspect ? (
                      <>
                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Playlist Signal</div>
                        <div className="mt-4 text-2xl font-black leading-tight text-white/90">
                          {inspectPlaylistTracks.length} tracks in {inspectPlaylistName}
                        </div>
                        <div className="mt-4 grid gap-2">
                          {inspectPlaylistTracks.slice(0, 4).map((track, index) => (
                            <div key={`${inspectPlaylistName}-signal-${normalizeTrackIdentity(track)}-${index}`} className="truncate rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                              {index + 1}. {track.title || 'Unknown Track'}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/32">
                          Opened from {inspectTarget?.source || 'playlist'} // {new Date(inspectTarget?.openedAt || Date.now()).toLocaleTimeString()}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Live Lyric</div>
                        <div className="mt-4 text-2xl font-black leading-tight text-white/90">
                          {compactLyric || 'No synced lyric locked right now.'}
                        </div>
                        <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/32">
                          Opened from {inspectTarget?.source || 'track'} // {new Date(inspectTarget?.openedAt || Date.now()).toLocaleTimeString()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGestureLabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[345] flex items-center justify-center bg-black/82 p-4 backdrop-blur-xl"
          >
            <div className="absolute inset-0" onClick={() => setIsGestureLabOpen(false)} />
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-brand-accent/20 bg-[#080c10]/96 shadow-[0_28px_100px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/22 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/10 text-brand-accent">
                    <Hand size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent">Gesture + Face Lab</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">Pointer, swipe, and camera face/hand controls</div>
                  </div>
                </div>
                <button onClick={() => setIsGestureLabOpen(false)} className={sharedModalCloseButtonClass} title="Close">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto p-5 custom-scrollbar">
                <button
                  onClick={() => {
                    setIsGestureControlEnabled((prev) => {
                      const next = !prev;
                      if (!next) setIsFaceControlEnabled(false);
                      return next;
                    });
                  }}
                  className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${isGestureControlEnabled ? 'border-brand-accent/35 bg-brand-accent/12 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                >
                  <span>
                    <span className="block text-[11px] font-black uppercase tracking-[0.22em]">Gesture controls</span>
                    <span className="mt-1 block text-[11px] font-semibold text-white/42">Pointer motion drives stage depth. Fast swipes control playback.</span>
                  </span>
                  <span className="rounded-full border border-current px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]">{isGestureControlEnabled ? 'On' : 'Off'}</span>
                </button>
                <button
                  onClick={() => {
                    const next = !isFaceControlEnabled;
                    if (next) setIsGestureControlEnabled(true);
                    setIsFaceControlEnabled(next);
                  }}
                  className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${isFaceControlEnabled ? 'border-brand-accent/35 bg-brand-accent/12 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                >
                  <span className="flex items-center gap-3">
                    <Camera size={18} className="shrink-0" />
                    <span>
                      <span className="block text-[11px] font-black uppercase tracking-[0.22em]">Camera controls</span>
                      <span className="mt-1 block text-[11px] font-semibold text-white/42">Camera tracks face position and hand swipes for app control.</span>
                    </span>
                  </span>
                  <span className="rounded-full border border-current px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]">{isFaceControlEnabled ? 'On' : 'Off'}</span>
                </button>
                <div className="mb-4 rounded-2xl border border-white/8 bg-black/24 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30">Camera Status</div>
                      <div className="mt-1 text-[11px] font-bold text-white/55">{faceControlStatus}</div>
                    </div>
                    <div className="text-right text-[10px] font-mono text-brand-accent/75">
                      FACE {faceControlSignal.x.toFixed(2)}, {faceControlSignal.y.toFixed(2)}<br />
                      HAND {cameraHandSignal.x.toFixed(2)}, {cameraHandSignal.y.toFixed(2)}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-brand-accent transition-all" style={{ width: `${Math.round(clamp01(faceControlSignal.confidence) * 100)}%` }} />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-brand-accent/65 transition-all" style={{ width: `${Math.round(clamp01(cameraHandSignal.motion) * 100)}%` }} />
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/28">Hand {cameraHandSignal.last}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    [MousePointer2, 'Pointer depth', 'Move pointer/finger to tilt the Aura Stage layers.'],
                    [ChevronLeft, 'Swipe left', 'Skip to the next track.'],
                    [ChevronRight, 'Swipe right', 'Restart or go to the previous track.'],
                    [Hand, '2-finger swipe L/R', 'Two fingers slide left or right to change tracks.'],
                    [Volume2, '2-finger swipe U/D', 'Two fingers slide up or down to adjust volume.'],
                    [Fingerprint, 'Pinch in', 'Two-finger pinch to pause playback.'],
                    [Fingerprint, 'Spread out', 'Two-finger spread to resume playback.'],
                    [MousePointer2, 'Double-tap', 'Quickly tap twice on empty space to toggle play/pause.'],
                    [Hand, 'Camera wave L/R', 'Wave your hand left or right for track controls.'],
                    [Volume2, 'Camera wave U/D', 'Wave your hand up or down for volume control.'],
                    [Camera, 'Look left/right', 'Turn your head left/right to change tracks (hold to confirm).'],
                    [Eye, 'Look up/down', 'Tilt your head up/down to adjust volume.'],
                  ].map(([Icon, title, detail]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <Icon size={18} className="text-brand-accent" />
                      <div className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/80">{title}</div>
                      <div className="mt-1 text-[11px] leading-5 text-white/42">{detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFeedbackOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[350] flex items-center justify-center bg-black/82 p-4 backdrop-blur-xl"
          >
            <div className="absolute inset-0" onClick={() => !isFeedbackSending && setIsFeedbackOpen(false)} />
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-brand-accent/20 bg-[#080c10]/96 shadow-[0_28px_100px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/22 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/10 text-brand-accent">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent">Send Feedback</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">Issues open on GitHub unless a feedback endpoint is configured.</div>
                  </div>
                </div>
                <button onClick={() => setIsFeedbackOpen(false)} disabled={isFeedbackSending} className={sharedModalCloseButtonClass} title="Close">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-3 gap-2">
                  {['Problem', 'Improvement', 'Idea'].map((type) => (
                    <button
                      key={type}
                      onClick={() => updateFeedbackDraft({ type })}
                      className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${feedbackDraft.type === type ? 'border-brand-accent/40 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <input
                  value={feedbackDraft.summary}
                  onChange={(e) => updateFeedbackDraft({ summary: e.target.value })}
                  placeholder="Short title"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none transition-all placeholder:text-white/24 focus:border-brand-accent/45"
                />
                <textarea
                  value={feedbackDraft.details}
                  onChange={(e) => updateFeedbackDraft({ details: e.target.value })}
                  placeholder="What happened, or what should be better?"
                  className="min-h-[150px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition-all placeholder:text-white/24 focus:border-brand-accent/45"
                />
                <input
                  value={feedbackDraft.contact}
                  onChange={(e) => updateFeedbackDraft({ contact: e.target.value })}
                  placeholder="Contact handle/email optional"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/24 focus:border-brand-accent/45"
                />
                {feedbackStatus && (
                  <div className="rounded-2xl border border-white/8 bg-black/24 px-4 py-3 text-[11px] font-semibold leading-5 text-white/58">
                    {feedbackStatus}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                    Build {BUILD_VERSION} // {platform || 'web'}
                  </div>
                  <button
                    onClick={submitFeedback}
                    disabled={isFeedbackSending || !feedbackDraft.summary.trim() || !feedbackDraft.details.trim()}
                    className="flex items-center gap-2 rounded-2xl bg-brand-accent px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-45 disabled:hover:scale-100"
                  >
                    {isFeedbackSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
          {isLibraryOverlayOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6">
              <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" onClick={() => { setIsLibraryOverlayOpen(false); setLibraryActionTarget(null); }} />
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
               <div className="absolute -top-20 left-1/3 w-80 h-80 rounded-full bg-brand-accent/10 blur-[110px]" />
               <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] rounded-full bg-fuchsia-500/10 blur-[140px]" />
              </div>
              <motion.div initial={{ scale: 0.95, y: 18 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-6xl max-h-[88vh] glass-card bg-[#090b0f]/96 border border-brand-accent/20 rounded-[2.2rem] relative z-10 overflow-hidden flex flex-col shadow-[0_28px_100px_rgba(0,0,0,0.55)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/70 to-transparent" />
                <div className="flex items-center justify-between gap-4 p-5 md:p-6 border-b border-white/8 bg-black/25 backdrop-blur-md">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-brand-accent/10 border border-brand-accent/25 flex items-center justify-center shrink-0">
                        <HardDrive size={18} className="text-brand-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-[0.32em] text-white/30">Neural Library Overlay</div>
                        <div className="text-xl md:text-2xl font-black uppercase tracking-tight text-brand-accent truncate">Studio Library</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isStandalone && <button onClick={handleImportVault} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-brand-accent hover:border-brand-accent/40 text-[10px] font-black uppercase tracking-widest transition-all" title="Import Vault (.aether)">Import</button>}
                      <button onClick={handleGenerateSmartMix} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-brand-accent hover:border-brand-accent/40 text-[10px] font-black uppercase tracking-widest transition-all" title="Generate Smart Mix">Smart Mix</button>
                      <button onClick={handleCleanVault} disabled={isVaultCleaning} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-brand-accent hover:border-brand-accent/40 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40" title="Clean Vault">Clean</button>
                      <button onClick={() => { setIsLibraryOverlayOpen(false); setLibraryActionTarget(null); }} className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close">
                        <X size={18} />
                      </button>
                    </div>
                 </div>

                 <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[0.95fr_1.3fr] gap-4 p-4 md:p-6 overflow-hidden">
                    <div className="glass-card border border-white/8 bg-gradient-to-b from-white/[0.05] to-white/[0.02] rounded-[1.75rem] overflow-hidden flex flex-col min-h-0 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
                      <div className="px-4 py-4 border-b border-white/8 flex items-center justify-between bg-black/20">
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/30">Quick Actions</div>
                          <div className="text-[12px] font-black uppercase tracking-widest text-brand-accent">Add to Vault</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIsLibraryOverlayOpen(false)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-brand-accent hover:border-brand-accent/40 transition-all" title="Close Overlay">
                            <X size={14} />
                          </button>
                          <button onClick={() => { setIsCreatingPlaylist(true); setNewPlaylistName((prev) => prev || ''); }} className="p-2 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-black transition-all shadow-[0_0_18px_rgba(0,255,191,0.14)]" title="Create New Vault">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 border-b border-white/8 space-y-3 bg-gradient-to-b from-brand-accent/5 to-transparent">
                        <div className="flex items-center gap-3 rounded-2xl bg-black/20 border border-brand-accent/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          {libraryActionTarget?.type === 'queue' ? (
                            <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-black text-[10px]">Q</div>
                          ) : (
                            <img src={getProxyUrl(libraryActionTarget?.items?.[0]?.thumbnail || currentTrack?.thumbnail)} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
                          )}
                          <div className="min-w-0">
                            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/35">Pending Context</div>
                            <div className="font-black uppercase tracking-tight text-white truncate">
                              {libraryActionTarget?.type === 'queue'
                                ? `Queue Buffer (${libraryActionTarget.items.length})`
                                : (libraryActionTarget?.items?.[0]?.title || currentTrack?.title || 'Create Empty Vault')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/30 border border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <input
                            ref={libraryOverlayCreateInputRef}
                            className="bg-transparent border-none outline-none text-[12px] font-black text-brand-accent uppercase tracking-widest placeholder:text-brand-accent/30 w-full px-2 py-2"
                            placeholder="Create New Vault..."
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newPlaylistName.trim()) {
                                handleAddToPlaylist(newPlaylistName.trim(), pendingLibraryItems);
                                setNewPlaylistName('');
                                setIsCreatingPlaylist(false);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (newPlaylistName.trim()) {
                                handleAddToPlaylist(newPlaylistName.trim(), pendingLibraryItems);
                                setNewPlaylistName('');
                                setIsCreatingPlaylist(false);
                              }
                            }}
                            disabled={!newPlaylistName.trim()}
                            className="p-2 rounded-lg bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-black transition-all shadow-neon disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        {!libraryActionTarget && !currentTrack && (
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/28 flex items-center gap-2">
                            <span>No active track context; this will create an empty vault.</span>
                            {isDoodleMode && <img src={catDoodlePeek} alt="doodle" className="h-5 w-auto opacity-70 select-none pointer-events-none" draggable={false} />}
                          </div>
                        )}
                      </div>

                      <div className="border-b border-white/8 bg-black/18 p-4 space-y-3">
                        <div className="relative">
                          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                          <input
                            value={librarySearchTerm}
                            onChange={(e) => setLibrarySearchTerm(e.target.value)}
                            placeholder={libraryBrowseMode === 'songs' ? 'Search songs, artists, vaults...' : 'Search vaults, songs, artists...'}
                            className="no-drag w-full rounded-2xl border border-white/10 bg-white/[0.035] py-2.5 pl-9 pr-9 text-[12px] font-bold text-white outline-none transition-colors placeholder:text-white/25 focus:border-brand-accent/35 focus:bg-brand-accent/[0.045]"
                          />
                          {librarySearchTerm && (
                            <button
                              onClick={() => setLibrarySearchTerm('')}
                              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-white/35 transition-colors hover:text-brand-accent"
                              title="Clear library search"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 rounded-2xl border border-white/8 bg-black/28 p-1">
                          {libraryModeOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setLibraryBrowseMode(option.id)}
                              className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${libraryBrowseMode === option.id ? 'bg-brand-accent text-black shadow-[0_0_18px_rgba(0,255,191,0.18)]' : 'text-white/42 hover:text-brand-accent'}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-[8px] font-black uppercase tracking-[0.2em] text-white/24">
                            <span>Filter</span>
                            <span>{libraryBrowseMode === 'songs' ? 'Track View' : 'Vault View'}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(libraryBrowseMode === 'songs' ? librarySongFilterOptions : libraryPlaylistFilterOptions).map((option) => {
                              const active = libraryBrowseMode === 'songs' ? librarySongFilter === option.id : libraryFilter === option.id;
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => libraryBrowseMode === 'songs' ? setLibrarySongFilter(option.id) : setLibraryFilter(option.id)}
                                  className={`rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${active ? 'border-brand-accent/45 bg-brand-accent/15 text-brand-accent' : 'border-white/8 bg-white/[0.025] text-white/42 hover:border-brand-accent/25 hover:text-brand-accent'}`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[8px] font-black uppercase tracking-[0.2em] text-white/24">
                            <span>Sort</span>
                            <span>{libraryBrowseMode === 'songs' ? libraryVisibleSongEntries.length : libraryVisiblePlaylistNames.length + (showFavoriteLibraryCard ? 1 : 0)} shown</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(libraryBrowseMode === 'songs' ? librarySongSortOptions : libraryPlaylistSortOptions).map((option) => {
                              const active = libraryBrowseMode === 'songs' ? librarySongSort === option.id : librarySort === option.id;
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => libraryBrowseMode === 'songs' ? setLibrarySongSort(option.id) : setLibrarySort(option.id)}
                                  className={`rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${active ? 'border-brand-accent/45 bg-brand-accent/15 text-brand-accent' : 'border-white/8 bg-white/[0.025] text-white/42 hover:border-brand-accent/25 hover:text-brand-accent'}`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/28">
                          <span>{libraryBrowseMode === 'songs' ? `${libraryVisibleSongEntries.length} songs` : `${libraryVisiblePlaylistNames.length + (showFavoriteLibraryCard ? 1 : 0)} vaults`}</span>
                          <span>{librarySearchNeedle ? 'Filtered' : libraryBrowseMode === 'songs' ? 'Song Index' : 'Browse'}</span>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {libraryBrowseMode === 'songs' ? (
                          <>
                            {libraryVisibleSongEntries.map((entry) => {
                              const track = entry.track;
                              return (
                                <div
                                  key={`library-song-${entry.key}`}
                                  onClick={() => openTrackInspect(track, 'studio-library')}
                                  className="performance-list-item group rounded-2xl border border-white/8 bg-black/20 p-3 transition-all cursor-pointer hover:border-brand-accent/30 hover:bg-white/[0.03]"
                                >
                                  <div className="flex items-center gap-3">
                                    <img src={getProxyUrl(track.thumbnail)} className="h-12 w-12 rounded-xl border border-white/10 object-cover bg-white/[0.03]" alt="" />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[11px] font-black uppercase tracking-widest text-white truncate group-hover:text-brand-accent transition-colors">{track.title || 'Unknown Track'}</div>
                                      <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/30 truncate">{track.author || 'Unknown Artist'}</div>
                                      <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-white/22 truncate">{entry.playlists.slice(0, 2).join(' / ')}{entry.playlists.length > 2 ? ` +${entry.playlists.length - 2}` : ''}</div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={(e) => { e.stopPropagation(); handleAdd(track); }} className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent/70 hover:text-brand-accent hover:bg-brand-accent/20 transition-all" title="Add to queue"><Plus size={12} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); toggleFavoriteTrack(track); }} className={`p-2 rounded-lg transition-all ${isTrackFavorite(track) ? 'bg-rose-400/12 text-rose-300' : 'bg-white/5 text-white/35 hover:text-rose-300'}`} title={isTrackFavorite(track) ? 'Remove from Favorites' : 'Add to Favorites'}><Heart size={12} fill={isTrackFavorite(track) ? 'currentColor' : 'none'} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); openTrackInspect(track, 'studio-library'); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title="Inspect"><Eye size={12} /></button>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-[8px] uppercase tracking-[0.18em] text-white/25">
                                    <span>{getTrackPlayCount(track)} plays</span>
                                    <span>{getTrackLastListenedMs(track) ? 'Recently played' : getTrackAddedMs(track) ? 'Added' : 'Indexed'}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {libraryVisibleSongEntries.length === 0 && (
                              <div className="rounded-2xl border border-white/8 bg-black/20 p-5 text-center">
                                <Search size={22} className="mx-auto text-white/25" />
                                <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">No songs match</div>
                                <button onClick={() => { setLibrarySearchTerm(''); setLibrarySongFilter('all'); }} className="mt-3 rounded-xl border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent transition-colors hover:bg-brand-accent hover:text-black">Reset songs</button>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                        {showFavoriteLibraryCard && (
                        <div
                          onClick={() => setViewingPlaylist(FAVORITES_PLAYLIST_ID)}
                          className={`performance-list-item group rounded-2xl border p-3 transition-all cursor-pointer ${viewingPlaylist === FAVORITES_PLAYLIST_ID ? 'border-rose-300/40 bg-rose-400/12 shadow-[0_0_18px_rgba(251,113,133,0.09)]' : 'border-rose-300/15 bg-rose-400/[0.035] hover:border-rose-300/35 hover:bg-rose-400/[0.06]'}`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <div className="text-[9px] font-black uppercase tracking-[0.26em] text-rose-200/45">Built-in Vault</div>
                              <div className="font-black uppercase tracking-tight truncate group-hover:text-rose-300 transition-colors">{FAVORITES_PLAYLIST_NAME}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              {viewingPlaylist === FAVORITES_PLAYLIST_ID && (
                                <span className="px-2 py-1 rounded-md bg-rose-400/12 border border-rose-300/25 text-rose-200 text-[8px] font-black uppercase tracking-[0.2em]">Focused</span>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleFavoriteAddAll(); }} className="p-2 rounded-lg bg-rose-400/10 text-rose-200/80 hover:text-rose-100 hover:bg-rose-400/20 transition-all" title="Queue Favorites"><Plus size={12} /></button>
                              {isStandalone && <button onClick={(e) => { e.stopPropagation(); handleExportVault(FAVORITES_PLAYLIST_ID); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-rose-200 transition-all" title="Export Favorites"><Download size={12} /></button>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/30">
                            <span>{favoriteTracksList.length} nodes</span>
                            <span>{favoriteTracksList.length > 0 ? 'Ready' : 'Empty'}</span>
                          </div>
                        </div>
                        )}
                        {libraryVisiblePlaylistNames.map((name) => (
                          <div
                            key={name}
                            draggable
                            onClick={() => setViewingPlaylist(name)}
                            onDragStart={(e) => {
                              setDraggedPlaylistName(name);
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', name);
                            }}
                            onDragEnd={() => setDraggedPlaylistName(null)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const droppedName = e.dataTransfer.getData('text/plain');
                              reorderPlaylistByDrag(name, droppedName || draggedPlaylistName);
                            }}
                            className={`performance-list-item group rounded-2xl border p-3 transition-all cursor-pointer ${draggedPlaylistName === name ? 'border-brand-accent/40 bg-brand-accent/12 shadow-[0_0_18px_rgba(0,255,191,0.08)]' : (viewingPlaylist === name ? 'border-brand-accent/35 bg-brand-accent/10 shadow-[0_0_18px_rgba(0,255,191,0.09)]' : 'border-white/8 bg-black/20 hover:border-brand-accent/30 hover:bg-white/[0.03]')}`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-[0.26em] text-white/25">Vault Node</div>
                                {isRenamingPlaylist === name ? (
                                  <input
                                    autoFocus
                                    className="no-drag w-full rounded-md border border-brand-accent/30 bg-white/5 px-2 py-1 text-[11px] font-black uppercase tracking-tight text-brand-accent outline-none"
                                    value={renameValue}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={() => handleRenamePlaylist(name, renameValue)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRenamePlaylist(name, renameValue);
                                      if (e.key === 'Escape') setIsRenamingPlaylist(null);
                                    }}
                                  />
                                ) : (
                                  <div className="font-black uppercase tracking-tight truncate group-hover:text-brand-accent transition-colors">{name}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {viewingPlaylist === name && (
                                  <span className="px-2 py-1 rounded-md bg-brand-accent/12 border border-brand-accent/25 text-brand-accent text-[8px] font-black uppercase tracking-[0.2em]">Focused</span>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handleAddToPlaylist(name, pendingLibraryItems); }} disabled={!canAddPendingToVault} className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent/70 hover:text-brand-accent hover:bg-brand-accent/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title={`Add pending context to ${name}`}><Plus size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setIsRenamingPlaylist(name); setRenameValue(name); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title={`Rename ${name}`}><Edit3 size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); movePlaylist(name, -1); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title="Move up"><ChevronLeft size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); movePlaylist(name, 1); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title="Move down"><ChevronRight size={12} /></button>
                                {isStandalone && <button onClick={(e) => { e.stopPropagation(); handleExportVault(name); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title={`Export ${name} to .aether`}><Download size={12} /></button>}
                                <button onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(name); }} className="p-2 rounded-lg bg-white/5 text-red-400/60 hover:text-red-400 transition-all" title={`Delete ${name}`}><Trash2 size={12} /></button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/30">
                              <span>{(playlists[name] || []).length} nodes</span>
                              <span>{playlists[name]?.length > 0 ? 'Ready' : 'Empty'}</span>
                            </div>
                          </div>
                        ))}
                        {!showFavoriteLibraryCard && libraryVisiblePlaylistNames.length === 0 && (
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-5 text-center">
                            <Search size={22} className="mx-auto text-white/25" />
                            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">No vault matches</div>
                            <button onClick={() => { setLibrarySearchTerm(''); setLibraryFilter('all'); }} className="mt-3 rounded-xl border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent transition-colors hover:bg-brand-accent hover:text-black">Reset filters</button>
                          </div>
                        )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="glass-card border border-white/8 bg-gradient-to-b from-white/[0.05] to-white/[0.02] rounded-[1.75rem] overflow-hidden flex flex-col min-h-0 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
                      {viewingPlaylist ? (
                        <motion.div
                          key={viewingPlaylist}
                          initial={{ opacity: 0, y: 8, scale: 0.995 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="flex flex-col min-h-0 flex-1"
                        >
                          <div className="px-4 py-4 border-b border-white/8 flex items-center justify-between bg-black/20">
                            <div className="min-w-0">
                              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/30">Focused Vault</div>
                              <div className={`text-lg font-black uppercase tracking-tight truncate ${isViewingFavorites ? 'text-rose-300' : 'text-brand-accent'}`}>{focusedVaultName}</div>
                              <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/35">{focusedVaultVisibleTracks.length}/{focusedVaultTracks.length} tracks</div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <select
                                value={libraryTrackSort}
                                onChange={(e) => setLibraryTrackSort(e.target.value)}
                                className="no-drag rounded-lg border border-white/10 bg-[#0b0f12] px-2 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/55 outline-none focus:border-brand-accent/35"
                                title="Sort tracks"
                              >
                                <option value="original">Original</option>
                                <option value="title">Title</option>
                                <option value="artist">Artist</option>
                                <option value="listened-desc">Recently Played</option>
                                <option value="added-desc">Recently Added</option>
                                <option value="plays-desc">Most Played</option>
                                <option value="duration-desc">Longest</option>
                                <option value="duration-asc">Shortest</option>
                              </select>
                              {!isViewingFavorites && (
                                <button onClick={() => { setIsRenamingPlaylist(viewingPlaylist); setRenameValue(viewingPlaylist); }} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title={`Rename ${viewingPlaylist}`}><Edit3 size={12} /></button>
                              )}
                              <button onClick={() => handlePlaylistAddAll(viewingPlaylist)} className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-black transition-all" title={`Add all tracks from ${focusedVaultName} to queue`}><Plus size={12} /></button>
                              {isStandalone && <button onClick={() => handleExportVault(viewingPlaylist)} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-brand-accent transition-all" title={`Export ${focusedVaultName} to .aether`}><Download size={12} /></button>}
                              <button onClick={() => handleDeletePlaylist(viewingPlaylist)} className="p-2 rounded-lg bg-white/5 text-red-400/60 hover:text-red-400 transition-all" title={isViewingFavorites ? 'Clear Favorites' : `Delete ${viewingPlaylist}`}><Trash2 size={12} /></button>
                              <button onClick={() => setViewingPlaylist(null)} className="p-2 rounded-lg bg-white/5 text-white/35 hover:text-red-400 transition-all" title="Back"><ChevronLeft size={12} /></button>
                            </div>
                          </div>
                          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-gradient-to-b from-brand-accent/5 to-transparent">
                            {focusedVaultVisibleTracks.map((track, tidx) => (
                              <div key={`${viewingPlaylist}-${tidx}`} className="performance-list-item group rounded-2xl border border-white/8 bg-black/20 p-3 flex items-center gap-3 hover:border-brand-accent/30 hover:bg-white/[0.03] transition-all">
                                <img src={getProxyUrl(track.thumbnail)} className="w-11 h-11 rounded-xl object-cover border border-white/10" alt="" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-black uppercase tracking-widest truncate group-hover:text-brand-accent transition-colors">{track.title}</div>
                                  <div className="text-[9px] uppercase tracking-[0.22em] text-white/30 truncate mt-1">{track.author}</div>
                                </div>
                                <button onClick={() => handleAdd(track)} className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-black transition-all" title="Add to queue"><Plus size={12} /></button>
                                <button onClick={() => toggleFavoriteTrack(track)} className={`p-2 rounded-lg transition-all ${isTrackFavorite(track) ? 'bg-rose-400/12 text-rose-300' : 'bg-white/5 text-white/35 hover:text-rose-300'}`} title={isTrackFavorite(track) ? 'Remove from Favorites' : 'Add to Favorites'}><Heart size={12} fill={isTrackFavorite(track) ? 'currentColor' : 'none'} /></button>
                                <button onClick={() => handleRemoveTrackFromPlaylist(viewingPlaylist, track, tidx)} className="p-2 rounded-lg bg-white/5 text-red-400/50 hover:text-red-400 transition-all" title="Remove"><Trash2 size={12} /></button>
                              </div>
                            ))}
                            {focusedVaultVisibleTracks.length === 0 && (
                              <div className="rounded-2xl border border-white/8 bg-black/20 p-8 text-center">
                                <Search size={24} className="mx-auto text-white/25" />
                                <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">No tracks match this search</div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3 bg-gradient-to-b from-brand-accent/5 to-transparent">
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/30">Library Stats</div>
                            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                              <div className="rounded-xl bg-white/5 border border-white/8 p-3"><div className="text-brand-accent font-black text-lg">{libraryInsights.unique}</div><div className="text-[8px] uppercase tracking-[0.24em] text-white/30">Unique</div></div>
                              <div className="rounded-xl bg-white/5 border border-white/8 p-3"><div className="text-brand-accent font-black text-lg">{libraryInsights.total}</div><div className="text-[8px] uppercase tracking-[0.24em] text-white/30">Total</div></div>
                              <div className="rounded-xl bg-white/5 border border-white/8 p-3"><div className="text-brand-accent font-black text-lg">{libraryInsights.duplicates}</div><div className="text-[8px] uppercase tracking-[0.24em] text-white/30">Dupes</div></div>
                            </div>
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 text-center">Select a vault node to focus it here.</div>
                          {isDoodleMode && (
                            <div className="flex items-center justify-center gap-2 opacity-70">
                              <img src={catDoodlePeek} alt="doodle" className="h-8 w-auto select-none pointer-events-none" draggable={false} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                 </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      
      {/* GESTURE NOTICE TOAST */}
      <ToastPortal>
      <AnimatePresence>
        {gestureNotice && (
          <motion.div
            key={gestureNotice}
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="fixed bottom-24 left-1/2 z-[700] flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-brand-accent/30 bg-[#06100d]/94 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent shadow-[0_0_28px_rgba(0,255,191,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
          >
            <span>{gestureNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>
      </ToastPortal>

      <ToastPortal>
      <AnimatePresence>
        {volumeToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[700] bg-brand-dark/95 backdrop-blur-xl border border-brand-accent/30 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(0,255,191,0.2)]"
          >
            <div className="text-brand-accent font-black text-[10px] tracking-widest uppercase">Volume</div>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-brand-accent shadow-[0_0_10px_#00ffbf]" style={{ width: `${volume * 100}%` }} />
            </div>
            <div className="text-white font-mono text-[10px] w-8">{`${Math.round(volume * 100)}%`}</div>
          </motion.div>
        )}
      </AnimatePresence>
      </ToastPortal>

      <AnimatePresence>
        {isPlayerOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[290] flex items-center justify-center p-4 md:p-6"
          >
            <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={() => setIsPlayerOverlayOpen(false)} />
            <motion.div
              initial={{ scale: 0.96, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 20 }}
              className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[2rem] border border-brand-accent/20 bg-[#090b0f]/95 shadow-[0_0_90px_rgba(0,255,191,0.14)] relative z-10 flex flex-col"
            >
              <div className="p-5 md:p-6 border-b border-white/10 relative">
                <div className="text-center px-16">
                  <div className="text-[9px] font-black uppercase tracking-[0.32em] text-white/30">Player Overlay</div>
                  {String(currentTrack?.title || 'Nothing Playing').length > 44 ? (
                    <div className="overlay-marquee mt-1 text-xl md:text-2xl font-black uppercase tracking-tight text-brand-accent">
                      <div className="overlay-marquee-track">
                        <span>{currentTrack?.title || 'Nothing Playing'}</span>
                        <span aria-hidden="true">{currentTrack?.title || 'Nothing Playing'}</span>
                        <span aria-hidden="true">{currentTrack?.title || 'Nothing Playing'}</span>
                        <span aria-hidden="true">{currentTrack?.title || 'Nothing Playing'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-xl md:text-2xl font-black uppercase tracking-tight text-brand-accent truncate">{currentTrack?.title || 'Nothing Playing'}</div>
                  )}
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 truncate mt-1">{currentTrack?.author || 'Awaiting signal'}</div>
                </div>
                <button onClick={() => setIsPlayerOverlayOpen(false)} className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-white/5 border border-white/10 text-white/45 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center" title="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 md:p-6 overflow-hidden flex-1 min-h-0">
                <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5 flex flex-col items-center justify-center gap-4 min-h-0 min-w-0 h-full">
                  <img
                    src={getProxyUrl(currentTrack?.thumbnail)}
                    className="w-full max-w-[320px] aspect-square rounded-[1.75rem] object-cover border border-white/10 shadow-[0_0_50px_rgba(0,255,191,0.12)]"
                    alt=""
                  />
                  <div className="text-center min-w-0 w-full">
                    <div className="text-[9px] uppercase tracking-[0.28em] text-white/25">Now Playing</div>
                    {String(compactLyric || 'Lyric sync loading…').length > 56 ? (
                      <div className="overlay-marquee mt-1 text-lg font-black tracking-tight text-white/95">
                        <div className="overlay-marquee-track">
                          <span>{compactLyric || 'Lyric sync loading…'}</span>
                          <span aria-hidden="true">{compactLyric || 'Lyric sync loading…'}</span>
                          <span aria-hidden="true">{compactLyric || 'Lyric sync loading…'}</span>
                          <span aria-hidden="true">{compactLyric || 'Lyric sync loading…'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-lg font-black tracking-tight text-white/95 truncate">{compactLyric || 'Lyric sync loading…'}</div>
                    )}
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 truncate mt-1">{currentTrack?.author || 'No source'}</div>
                  </div>
                  <div className="w-full">
                    <PlaybackProgressIsland
                      durationMs={currentTrack?.totalDurationMs || currentTrack?.duration || 0}
                      getPositionMs={getActivePlaybackPositionMs}
                      onSeek={handleSeek}
                      accent={trackProgressAccent}
                      glow={trackProgressGlow}
                      barClassName="h-2 rounded-full bg-white/10 overflow-hidden cursor-pointer"
                      fillClassName="h-full w-full bg-brand-accent shadow-[0_0_10px_#00ffbf]"
                      timeRowClassName="mt-2 flex items-center justify-between text-[10px] font-mono text-white/35"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    
      {/* GLOBAL BACKGROUND ELEMENTS (NOVA */}
            {/* OAUTH INTERCEPT OVERLAY */}
            <AnimatePresence>
              {oauthPrompt && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-brand-dark/95 backdrop-blur-[30px]"
                >
                  <motion.div 
                    initial={{ scale: 0.95, y: 20 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.95, y: 20 }}
                    className="w-full max-w-lg glass-card bg-brand-dark/80 border-brand-accent/40 rounded-3xl flex flex-col items-center justify-center overflow-hidden relative z-10 px-8 py-10 text-center"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50" />
                    
                    <div className="w-16 h-16 rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,255,191,0.2)]">
                      <Lock size={28} className="text-brand-accent" />
                    </div>

                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Authentication Required</h2>
                    <p className="text-brand-text-dim text-sm mb-8 leading-relaxed max-w-sm">
                      YouTube is temporarily blocking anonymous requests from your network. Please upload a valid `cookies.txt` file to verify your session and unblock downloads.
                    </p>

                    <div className="flex flex-col w-full gap-3">
                      <button 
                        onClick={handleImportCookies}
                        className="w-full py-4 rounded-xl bg-brand-accent text-brand-dark font-black tracking-[0.2em] uppercase hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                      >
                       <Upload size={18} /> Upload cookies.txt
                      </button>
                      <button 
                        onClick={() => {
                          if (isStandalone && window.aether?.openExternal) {
                            window.aether.openExternal("https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies");
                          } else {
                            window.open("https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies", '_blank');
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-transparent text-brand-accent/70 font-bold tracking-[0.1em] uppercase hover:text-brand-accent transition-all text-[11px] mb-2"
                      >
                        How to export cookies?
                      </button>
                      <button 
                        onClick={() => setOauthPrompt(null)}
                        className="w-full py-3 rounded-xl bg-transparent border border-white/10 text-white/50 font-bold tracking-[0.2em] uppercase hover:bg-white/5 hover:text-white transition-all text-sm"
                      >
                        Dismiss Overlay
                      </button>
                    </div>

                    <div className="mt-8 text-[10px] text-white/30 uppercase tracking-widest flex items-center justify-center gap-2">
                      <AlertTriangle size={12} className="text-yellow-500/50" /> Downloads are paused until authentication
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FULL DISCOVERY OVERLAY */}
            <AnimatePresence>
              {isViewingFullDiscovery && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[250] flex items-center justify-center p-4"
                >
                  <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-[20px]" onClick={() => setIsViewingFullDiscovery(false)} />
                  <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl max-h-[80vh] glass-card bg-brand-dark/60 border-brand-accent/20 rounded-3xl flex flex-col overflow-hidden relative z-10"
                  >
                    <div className="flex items-center justify-between p-6 border-b border-brand-accent/10">
                      <div className="flex items-center gap-3">
                        <Globe size={20} className="text-brand-accent" />
                        <div>
                          <h2 className="text-lg font-black uppercase tracking-tighter text-white">Neural Discovery</h2>
                          <p className="text-brand-accent text-xs font-bold tracking-widest uppercase opacity-60">{discoveryItems.length} {discoveryModeLabel}{discoveryItems.length !== 1 ? 'S' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(searchResults.length > 0 || hasCompletedSearch) && (
                          <button
                            onClick={clearDiscoveryResults}
                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-[0.22em] text-white/50 hover:text-red-400 transition-all"
                          >
                            Flush
                          </button>
                        )}
                        <button
                          onClick={() => setIsViewingFullDiscovery(false)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-all"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                      <div className="flex flex-col gap-2">
                        {!isFullDiscoveryContentReady ? (
                          <div className="h-40 flex flex-col items-center justify-center gap-3 text-center opacity-40">
                            <Loader2 size={26} className="animate-spin text-brand-accent/60" />
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">Preparing Discovery</div>
                          </div>
                        ) : discoveryItems.length > 0 ? discoveryItems.map((track, idx) => (
                          <motion.div
                            key={`discovery-full-${track.id}-${idx}`}
                            className="performance-list-item group glass-card p-4 flex items-center gap-4 rounded-xl transition-all bg-white/5 border border-white/10 hover:border-brand-accent/30 hover:bg-brand-accent/5"
                          >
                            <div className="text-brand-accent font-black text-sm w-6">{idx + 1}</div>
                            <img src={getProxyUrl(track.thumbnail)} className="w-10 h-10 rounded-lg object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-black truncate uppercase tracking-widest">{track.title}</div>
                              <div className="text-[10px] font-bold text-white/40 truncate uppercase mt-1">{track.author}</div>
                            </div>
                            <button
                              onClick={() => openTrackInspect(track, isSearchActive ? 'discovery' : 'recommendation')}
                              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/5 hover:bg-brand-accent/20 hover:text-brand-accent text-white/45 transition-all"
                              title="Inspect Track"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleAdd(track)}
                              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-accent transition-all"
                              title="Add to Queue"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              onClick={() => toggleFavoriteTrack(track)}
                              className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all ${isTrackFavorite(track) ? 'bg-rose-400/15 text-rose-300' : 'bg-white/5 hover:bg-rose-400/15 hover:text-rose-300 text-white/45'}`}
                              title={isTrackFavorite(track) ? 'Remove from Favorites' : 'Add to Favorites'}
                            >
                              <Heart size={14} fill={isTrackFavorite(track) ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={() => openLibraryOverlay({ type: 'track', items: [track] })}
                              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/5 hover:bg-brand-accent/20 hover:text-brand-accent text-white/45 transition-all"
                              title="Save to Vault"
                            >
                              <HardDrive size={14} />
                            </button>
                          </motion.div>
                        )) : hasCompletedSearch ? (
                          <div className="h-40 flex flex-col items-center justify-center gap-3 text-center">
                            <Search size={28} className="text-brand-accent/60" strokeWidth={1.4} />
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/55">No Results Found</div>
                              <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">Flush discovery to return to the default panel state.</div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-40 flex flex-col items-center justify-center gap-3 text-center opacity-40">
                            <Search size={28} className="text-white/30" strokeWidth={1.2} />
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">Awaiting Content</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FULL QUEUE OVERLAY */}
            <AnimatePresence>
              {isViewingFullQueue && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="fixed inset-0 z-[250] flex items-center justify-center p-4"
                >
                  <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-[20px]" onClick={() => setIsViewingFullQueue(false)} />
                  <motion.div 
                    initial={{ scale: 0.95, y: 20 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl max-h-[80vh] glass-card bg-brand-dark/60 border-brand-accent/20 rounded-3xl flex flex-col overflow-hidden relative z-10"
                  >
                    <div className="flex items-center justify-between p-6 border-b border-brand-accent/10">
                      <div className="flex items-center gap-3">
                        <ListMusic size={20} className="text-brand-accent" />
                        <div>
                          <h2 className="text-lg font-black uppercase tracking-tighter text-white">Queue Buffer</h2>
                          <p className="text-brand-accent text-xs font-bold tracking-widest uppercase opacity-60">{queue.length} TRACK{queue.length !== 1 ? 'S' : ''}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsViewingFullQueue(false)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                      <div className="flex flex-col gap-2">
                        {!isFullQueueContentReady ? (
                          <div className="h-40 flex flex-col items-center justify-center gap-3 text-center opacity-40">
                            <Loader2 size={26} className="animate-spin text-brand-accent/60" />
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">Preparing Queue</div>
                          </div>
                        ) : queue.map((track, idx) => {
                          const warmupId = resolveWarmupTrackId(track);
                          const isDownloaded = warmupId ? downloadedTracks.includes(warmupId) : downloadedTracks.includes(track.id);
                          return (
                          <motion.div 
                            key={`${track.id}-${idx}`}
                            draggable
                            onDragStart={(e) => {
                              setDraggedQueueIndex(idx);
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', String(idx));
                            }}
                            onDragEnd={() => setDraggedQueueIndex(null)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const droppedIndex = Number(e.dataTransfer.getData('text/plain'));
                              reorderQueueByDrag(idx, Number.isInteger(droppedIndex) ? droppedIndex : draggedQueueIndex);
                            }}
                            className={`performance-list-item group glass-card p-4 flex items-center gap-4 rounded-xl transition-all cursor-move border ${draggedQueueIndex === idx ? 'bg-brand-accent/15 border-brand-accent/45' : idx === 0 ? 'bg-brand-accent/10 border-brand-accent/30 shadow-[0_0_20px_rgba(0,255,191,0.2)]' : 'bg-white/5 border-white/10 hover:border-brand-accent/20'}`}
                          >
                            <div className="text-brand-accent font-black text-sm w-6">{idx + 1}</div>
                            <img src={getProxyUrl(track.thumbnail)} className="w-10 h-10 rounded-lg object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-black truncate uppercase tracking-widest">{track.title}</div>
                              <div className="text-[10px] font-bold text-white/40 truncate uppercase mt-1">{track.author}</div>
                            </div>
                            {isDownloaded && (
                              <span className="text-[8px] font-black uppercase tracking-widest text-red-500 border border-red-500/50 px-2 py-0.5 rounded-full">READY</span>
                            )}
                            {idx !== 0 && (
                              <button 
                                onClick={() => {
                                  const newQueue = [...queue];
                                  const [removed] = newQueue.splice(idx, 1);
                                  newQueue.splice(idx - 1, 0, removed);
                                  setQueue(newQueue);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:text-brand-accent transition-all"
                                title="Move up"
                              >
                                <ChevronLeft size={14} />
                              </button>
                            )}
                            {idx !== queue.length - 1 && (
                              <button 
                                onClick={() => {
                                  const newQueue = [...queue];
                                  const [removed] = newQueue.splice(idx, 1);
                                  newQueue.splice(idx + 1, 0, removed);
                                  setQueue(newQueue);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:text-brand-accent transition-all"
                                title="Move down"
                              >
                                <ChevronRight size={14} />
                              </button>
                            )}
                            {idx !== 0 && (
                              <button 
                                onClick={() => setQueue(queue.filter((_, i) => i !== idx))}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all"
                                title="Remove"
                              >
                                <Trash2 size={14} className="text-red-500/40 hover:text-red-500" />
                              </button>
                            )}
                          </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FULL PLAYLIST OVERLAY */}
            <AnimatePresence>
              {isViewingFullPlaylist && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="fixed inset-0 z-[250] flex items-center justify-center p-4"
                >
                  <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-[20px]" onClick={() => setIsViewingFullPlaylist(null)} />
                  <motion.div 
                    initial={{ scale: 0.95, y: 20 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl max-h-[80vh] glass-card bg-brand-dark/60 border-brand-accent/20 rounded-3xl flex flex-col overflow-hidden relative z-10"
                  >
                    <div className="flex items-center justify-between p-6 border-b border-brand-accent/10">
                      <div className="flex items-center gap-3">
                        <ListMusic size={20} className="text-brand-accent" />
                        <div>
                          <h2 className="text-lg font-black uppercase tracking-tighter text-white">Vault: {isViewingFullPlaylist}</h2>
                          <div className="flex gap-2 items-center">
                            <p className="text-brand-accent text-xs font-bold tracking-widest uppercase opacity-60">{(playlists[isViewingFullPlaylist] || []).length} TRACK{(playlists[isViewingFullPlaylist] || []).length !== 1 ? 'S' : ''}</p>
                            <button 
                              onClick={() => {
                                  const list = [...(playlists[isViewingFullPlaylist] || [])];
                                  const shuffled = list.sort(() => Math.random() - 0.5);
                                  setQueue(shuffled);
                                  seekActivePlaybackTo(0);
                                  setIsPlaying(true);
                                  setIsViewingFullPlaylist(null);
                                  closeHeaderSurfaces();
                              }}
                              className="px-2 py-0.5 rounded border border-brand-accent/30 text-brand-accent text-[9px] hover:bg-brand-accent/20 transition-all font-black uppercase flex items-center gap-1"
                            >
                              <Shuffle size={10} /> Play Shuffled
                            </button>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsViewingFullPlaylist(null)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                      <div className="flex flex-col gap-2">
                        {!isFullPlaylistContentReady ? (
                          <div className="h-40 flex flex-col items-center justify-center gap-3 text-center opacity-40">
                            <Loader2 size={26} className="animate-spin text-brand-accent/60" />
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">Preparing Vault</div>
                          </div>
                        ) : (playlists[isViewingFullPlaylist] || []).map((track, idx) => (
                          <motion.div 
                            key={`${isViewingFullPlaylist}-${track.id}-${idx}`}
                            className="performance-list-item group glass-card p-4 flex items-center gap-4 rounded-xl transition-all bg-white/5 border border-white/10 hover:border-brand-accent/30 hover:bg-brand-accent/5"
                          >
                            <div className="text-brand-accent font-black text-sm w-6">{idx + 1}</div>
                            <img src={getProxyUrl(track.thumbnail)} className="w-10 h-10 rounded-lg object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-black truncate uppercase tracking-widest">{track.title}</div>
                              <div className="text-[10px] font-bold text-white/40 truncate uppercase mt-1">{track.author}</div>
                            </div>
                            <button 
                              onClick={() => handleAdd(track)}
                              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-accent transition-all"
                              title="Add to Queue"
                            >
                              <Plus size={14} />
                            </button>
                            <button 
                              onClick={() => handleRemoveFromPlaylist(isViewingFullPlaylist, idx)}
                              className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all"
                              title="Remove from Vault"
                            >
                              <Trash2 size={14} className="text-red-500/40 hover:text-red-500" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-[-2] overflow-hidden select-none bg-black">
         {/* Baseline Neural Glow (Optimized) */}
         <div className="absolute inset-0 bg-brand-accent/5 backdrop-blur-[60px] animate-pulse" />
         
         {/* Global Neural Aura (Pulse) - NOVA Optimized */}
         <div className="absolute inset-0 flex items-center justify-center scale-150 transform-gpu will-change-transform">
            <canvas 
               ref={pulseCanvasRef} 
               width={400} 
               height={400} 
            className={`aether-visualizer-canvas w-[800px] h-[800px] transition-opacity duration-1000 ${visualizerMode === 'pulse' ? 'opacity-55' : 'opacity-0'}`}
            />
         </div>
         <div className="absolute inset-0 bg-black/60" />
            </div>




      {/* ── DUAL MODE: slide-in video panel ── */}
      <AnimatePresence>
        {showVisualStage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className={`fixed ${dualVisualStageZClass} pointer-events-none transition-all duration-500 ease-out ${videoMode === 'cinema' ? 'inset-0' : ''}`}
            style={videoMode === 'cinema'
              ? undefined
              : isVerticalStack
                ? { left: 16, right: 16, bottom: 16, height: '40vh' }
                : { top: chromeTopOffset, right: 16, bottom: 16, width: dualVisualStageWidth }}
            onMouseMove={videoMode === 'cinema' ? handleCinemaMouseMove : undefined}
            onClick={videoMode === 'cinema' ? handleCinemaMouseMove : undefined}
          >
            <div className={`absolute inset-0 transition-all duration-700 delay-100 ${videoMode === 'cinema' ? (isVideoReady ? 'bg-black/96 backdrop-blur-md' : 'bg-transparent') : 'bg-transparent'}`} />

            <div className="relative h-full w-full pointer-events-auto">
              <div
                 className={`relative flex h-full w-full overflow-hidden transition-all duration-1000 ${
                   !isVideoReady && videoMode ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
                 } ${videoMode === 'cinema' ? 'rounded-none bg-black' : 'rounded-[2.25rem] border border-white/[0.08] bg-[#06090d]/92 backdrop-blur-[28px] shadow-[0_28px_90px_rgba(0,0,0,0.5)]'}`}
              >
                <div className={`relative flex-1 min-h-0 ${videoMode === 'cinema' ? '' : 'm-3 rounded-[1.8rem] overflow-hidden border border-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]'}`}>
                  {currentTrack?.thumbnail && (
                    <img
                      src={getProxyUrl(currentTrack.thumbnail)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover scale-110 blur-[40px] opacity-35"
                    />
                  )}
                  <div className="absolute inset-0 bg-[#020406]" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(120% 120% at 50% 0%, ${themeColor}20 0%, rgba(0,0,0,0) 48%), linear-gradient(180deg, rgba(5,7,10,0.18) 0%, rgba(5,7,10,0.52) 58%, rgba(5,7,10,0.92) 100%)`,
                    }}
                  />

                  <video
                    ref={(el) => { localVideoRef.current = el; }}
                    playsInline
                    onCanPlay={() => setIsVideoReady(true)}
                    className={`absolute inset-0 h-full w-full ${visualVideoFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                  />

                  {isAudioBuffering && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm">
                      <div className="rounded-full border border-white/10 bg-black/45 p-4 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
                        <Loader2 size={videoMode === 'cinema' ? 34 : 28} className="animate-spin text-brand-accent" />
                      </div>
                    </div>
                  )}

                  <motion.div
                    animate={{ opacity: visualStageHeaderVisible ? 1 : 0, y: visualStageHeaderVisible ? 0 : -14 }}
                    transition={{ duration: 0.22 }}
                    className="absolute left-0 right-0 top-0 z-20 p-4 md:p-5"
                    style={{ pointerEvents: visualStageHeaderVisible ? 'auto' : 'none' }}
                  >
                    <div className="mx-auto flex w-full flex-col gap-3 rounded-[1.4rem] border border-white/10 bg-black/38 px-4 py-3 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
                      <div className="flex w-full items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/12 text-brand-accent shadow-[0_0_20px_rgba(0,255,191,0.15)]">
                            {videoMode === 'cinema' ? <Clapperboard size={15} /> : <Columns2 size={15} />}
                          </div>
                          
                          {videoMode === 'cinema' ? (
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em]">
                                <span className="text-brand-accent/85">Cinema Mode</span>
                              </div>
                              {visualStageTitleMarquee ? (
                                <div className="overlay-marquee mt-1 font-black uppercase tracking-tight text-white/95 text-sm md:text-lg max-w-[min(60vw,720px)]">
                                  <div className="overlay-marquee-track">
                                    <span>{visualStageTitle}</span>
                                    <span aria-hidden="true">{visualStageTitle}</span>
                                    <span aria-hidden="true">{visualStageTitle}</span>
                                    <span aria-hidden="true">{visualStageTitle}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1 font-black uppercase tracking-tight text-white/95 line-clamp-2 text-sm md:text-lg max-w-[min(60vw,720px)]">
                                  {visualStageTitle}
                                </div>
                              )}
                              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.26em] text-brand-accent/72 truncate">
                                {currentTrack.author}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] h-9">
                              <span className="text-brand-accent/85">Dual Visual</span>
                            </div>
                          )}
                        </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowVisualLyrics((prev) => !prev)}
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${showVisualLyrics ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/5 text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                          title={showVisualLyrics ? 'Hide visual lyrics' : 'Show visual lyrics'}
                        >
                          <BookOpen size={15} />
                        </button>
                        <button
                          onClick={() => setVisualVideoFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${visualVideoFit === 'cover' ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/5 text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                          title={visualVideoFit === 'cover' ? 'Show full frame' : 'Fill frame'}
                        >
                          <Monitor size={15} />
                        </button>
                        <div className="relative" ref={qualityDropdownRef}>
                          <button
                            onClick={() => setIsQualityDropdownOpen((p) => !p)}
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${isQualityDropdownOpen ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent shadow-[0_0_12px_rgba(0,255,191,0.1)]' : 'border-white/10 bg-white/5 text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                            title="Video Quality"
                          >
                            <span className="text-[9px] font-black uppercase tracking-tighter">{videoQuality}p</span>
                          </button>

                          {isQualityDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-28 rounded-2xl border border-white/12 bg-[#080c10]/95 backdrop-blur-2xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
                              {['480', '720', '1080'].map((q) => (
                                <button
                                  key={`quality-${q}`}
                                  onClick={() => {
                                    setVideoQuality(q);
                                    setIsQualityDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all ${videoQuality === q ? 'bg-brand-accent/12 text-brand-accent' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                                >
                                  <span className="text-[10px] font-black uppercase tracking-[0.1em]">{q}p</span>
                                  {videoQuality === q && <div className="h-1.5 w-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(0,255,191,0.5)]" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {videoMode === 'cinema' && (
                          <button
                            onClick={() => setVisualControlsPinned((prev) => !prev)}
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${visualControlsPinned ? 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/5 text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                            title={visualControlsPinned ? 'Unpin controls' : 'Pin controls'}
                          >
                            <Lock size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => switchVideoMode(videoMode === 'cinema' ? 'dual' : 'cinema')}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/55 transition-all hover:border-brand-accent/35 hover:text-brand-accent"
                          title={videoMode === 'cinema' ? 'Back to Dual View' : 'Expand to Cinema'}
                        >
                          {videoMode === 'cinema' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                        <button
                          onClick={exitVideoMode}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/55 transition-all hover:border-white/25 hover:text-white"
                          title={videoMode === 'cinema' ? 'Exit Cinema (Esc)' : 'Return to Audio'}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    {videoMode === 'dual' && (
                      <div className="min-w-0 w-full pl-1">
                        {visualStageTitleMarquee ? (
                          <div className="overlay-marquee font-black uppercase tracking-tight text-white/95 text-sm md:text-base">
                            <div className="overlay-marquee-track">
                              <span>{visualStageTitle}</span>
                              <span aria-hidden="true">{visualStageTitle}</span>
                              <span aria-hidden="true">{visualStageTitle}</span>
                              <span aria-hidden="true">{visualStageTitle}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="font-black uppercase tracking-tight text-white/95 line-clamp-2 text-sm md:text-base">
                            {visualStageTitle}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.26em] text-brand-accent/72 truncate">
                          {currentTrack.author}
                        </div>
                      </div>
                    )}
                  </div>
                  </motion.div>

                  <AnimatePresence>
                    {showVisualLyricOverlay && (
                      <motion.div
                        key={`visual-lyric-${activeLyricIndex}-${visualStageLyric}`}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className={`pointer-events-none absolute left-0 right-0 z-20 ${visualLyricOverlayBottomClass}`}
                      >
                        <div className={`mx-auto w-full ${videoMode === 'cinema' ? 'px-6 pb-8 md:px-10 md:pb-10' : 'px-4 pb-4'}`}>
                          <div className={`mx-auto ${videoMode === 'cinema' ? 'max-w-[min(84vw,1040px)]' : 'max-w-[92%]'}`}>
                            <div className={`rounded-[2rem] bg-gradient-to-t from-black/52 via-black/14 to-transparent px-5 py-4 ${videoMode === 'cinema' ? 'md:px-8 md:py-6' : 'md:px-6'}`}>
                              <div className={`text-center font-black leading-tight text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.72)] ${videoMode === 'cinema' ? 'text-lg md:text-4xl' : 'text-base md:text-xl'}`}>
                                {visualStageLyric}
                              </div>
                              {visualStageNextLyric && (
                                <div className={`mx-auto mt-2 max-w-3xl text-center font-semibold text-white/58 drop-shadow-[0_4px_16px_rgba(0,0,0,0.58)] line-clamp-2 ${videoMode === 'cinema' ? 'text-sm md:text-lg' : 'text-xs md:text-sm'}`}>
                                  {visualStageNextLyric}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    animate={{ opacity: visualStageFooterVisible ? 1 : 0, y: visualStageFooterVisible ? 0 : 18 }}
                    transition={{ duration: 0.22 }}
                    className="absolute bottom-0 left-0 right-0 z-20"
                    style={{ pointerEvents: visualStageFooterVisible ? 'auto' : 'none' }}
                  >
                    <div className={`mx-auto w-full ${videoMode === 'cinema' ? 'px-6 pb-8 pt-20 md:px-10 md:pb-10' : 'px-4 pb-4 pt-20'}`}>
                      <div className="rounded-[1.6rem] border border-white/10 bg-black/40 px-4 py-4 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:px-5">
                        <div>
                          <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
                            <div className="flex items-center gap-2">
                              <BookOpen size={12} className="text-brand-accent/70" />
                              <span>{showVisualLyricOverlay ? 'Lyric overlay' : (videoMode === 'dual' ? 'Lyrics on left panel' : 'Visual Stream')}</span>
                            </div>
                            <span className="font-mono tracking-[0.16em]">{videoMode === 'cinema' ? (visualControlsPinned ? 'Overlay pinned' : 'Overlay unpinned') : (visualVideoFit === 'cover' ? 'Fill frame' : 'Split view active')}</span>
                          </div>

                          <PlaybackProgressIsland
                            durationMs={currentTrack.totalDurationMs || currentTrack.duration || 0}
                            getPositionMs={getActivePlaybackPositionMs}
                            onSeek={handleSeek}
                            accent={trackProgressAccent}
                            glow={trackProgressGlow}
                            barClassName="h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/12"
                            timeRowClassName="mt-2 flex items-center justify-between text-[10px] font-mono text-white/42"
                          />
                        </div>

                        {videoMode === 'cinema' && (
                          <div className="flex items-center justify-center gap-5 pt-5">
                            <button onClick={() => handleControl('previous')} className="p-2 text-white/60 transition-colors hover:text-white active:scale-90">
                              <Rewind size={22} fill="currentColor" />
                            </button>
                            <button
                              onClick={() => handleControl(isPlaying ? 'pause' : 'resume')}
                              className="flex h-14 w-14 items-center justify-center rounded-2xl text-black transition-all active:scale-95 hover:scale-105"
                              style={{ background: trackControlAccent, boxShadow: `0 0 26px ${trackControlGlow}` }}
                            >
                              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                            </button>
                            <button onClick={() => handleControl('skip')} className="p-2 text-white/60 transition-colors hover:text-white active:scale-90">
                              <FastForward size={22} fill="currentColor" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </MotionConfig>
  );
}


export default App;
