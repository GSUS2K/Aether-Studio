export const getApiBase = () => {
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

export const API_BASE = getApiBase();
export const DEFAULT_GUILD_ID = 'local_studio';
export const AETHER_SHARE_ORIGIN = 'https://aetherstudio.me';
export const AETHER_PROFILE_API_BASE = (import.meta.env.VITE_AETHER_PROFILE_API_URL || 'https://aetherstudio.me').replace(/\/+$/, '');
export const FEEDBACK_ISSUE_URL = 'https://github.com/GSUS2K/Aether-Studio/issues/new';

export const LYRIC_PRESETS_STORAGE_KEY = 'aether.lyricOffsetPresets.v1';
export const SESSION_UI_STORAGE_KEY = 'aether.sessionUi.v1';
export const SESSION_PLAYBACK_STORAGE_KEY = 'aether.sessionPlayback.v1';
export const PLAYLIST_ORDER_STORAGE_KEY = 'aether.playlistOrder.v1';
export const FAVORITES_STORAGE_KEY = 'aether.favoriteTracks.v1';
export const SKIP_EVENTS_STORAGE_KEY = 'aether.skipEvents.v1';
export const MANUAL_LYRICS_STORAGE_KEY = 'aether.manualLyrics.v1';
export const LOCK_PREFS_STORAGE_KEY = 'aether.lockPrefs.v1';
export const SHORTCUTS_STORAGE_KEY = 'aether.shortcuts.v1';
export const GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY = 'aether.globalMediaShortcuts.enabled';
export const FEEDBACK_STORAGE_KEY = 'aether.feedbackOutbox.v1';
export const SEARCH_HISTORY_STORAGE_KEY = 'aether.searchHistory.v1';
export const AETHER_PROFILE_STORAGE_KEY = 'aether.profile.v1';
export const PLAYBACK_LEDGER_STORAGE_KEY = 'sound-capsule';

export const FAVORITES_PLAYLIST_ID = '__aether_favorites__';
export const FAVORITES_PLAYLIST_NAME = 'Favorite Songs';
export const SEARCH_HISTORY_LIMIT = 12;

export const DEFAULT_FEEDBACK_DRAFT = Object.freeze({
  type: 'Problem',
  summary: '',
  details: '',
  contact: '',
});

export const DEFAULT_AETHER_PROFILE = Object.freeze({
  displayName: 'Aether Listener',
  handle: '',
  bio: '',
  avatarColor: '#16f7c6',
  avatarDataUrl: '',
  visibility: 'private',
  publishedVisibility: 'private',
  shareStats: true,
  profileId: '',
  profileSecret: '',
  lastPublishedAt: 0,
});

export const AUTOPLAY_MOOD_MODES = Object.freeze([
  { id: 'flow', label: 'Flow' },
  { id: 'safe', label: 'Safe' },
  { id: 'explore', label: 'Explore' },
]);

export const AURA_PRESETS = Object.freeze([
  { id: 'calm', label: 'Calm', fieldBoost: 0.72, fieldFlare: 0.62, hueShift: 0.65, kickGlow: 0.62, ringCooldownMs: 380, ringThreshold: 0.82, ringScale: 0.72, ringDurationMs: 460 },
  { id: 'balanced', label: 'Balanced', fieldBoost: 1, fieldFlare: 1, hueShift: 1, kickGlow: 1, ringCooldownMs: 300, ringThreshold: 0.78, ringScale: 0.6, ringDurationMs: 420 },
  { id: 'cinematic', label: 'Cinematic', fieldBoost: 1.26, fieldFlare: 1.2, hueShift: 1.2, kickGlow: 1.15, ringCooldownMs: 260, ringThreshold: 0.74, ringScale: 0.66, ringDurationMs: 380 },
]);

export const AURA_PRESETS_MAP = Object.freeze(
  AURA_PRESETS.reduce((acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  }, {})
);

export const DOODLE_PRESETS = Object.freeze([
  { id: 'subtle', label: 'Cozy', badge: 'CZ' },
  { id: 'medium', label: 'Floaty', badge: 'FL' },
  { id: 'dreamy', label: 'Playful', badge: 'PL' },
]);

export const PERFORMANCE_MODES = Object.freeze([
  { id: 'low', label: 'Low', detail: 'Playback first, no motion' },
  { id: 'medium', label: 'Medium', detail: 'Soft motion, capped visuals' },
  { id: 'high', label: 'High', detail: 'Full visuals and effects' },
]);

export const IDLE_PHRASES = [
  'Waiting for the next chorus',
  'Keeping the speakers warm',
  'Sorting the vibe shelf',
  'Polishing the queue',
  'Checking the bass pressure',
  'Saving a seat in the lobby',
  'Looking for a perfect loop',
  'Standing by for a good intro',
  'Warming up the waveform',
  'Counting beats quietly',
  'Holding the drop hostage',
  'Reading the room',
  'Tuning the imaginary antenna',
  'Finding the soft part',
  'Keeping the lobby alive',
  'Waiting for one more song',
  'Practicing dramatic silence',
  'Dusting off the mixtape',
  'Measuring the mood',
  'Scanning for replay energy',
  'Looking busy in the studio',
  'Guarding the play button',
  'Keeping the lights low',
  'Saving the good headphones',
  'Preparing a clean transition',
  'Pretending this is a radio station',
  'Holding the aux with respect',
  'Looking for the hook',
  'Letting the room breathe',
  'Waiting for the beat to text back',
  'Keeping the signal cozy',
  'Checking if the chorus still hits',
  'Making space for a banger',
  'Standing near the subwoofer',
  'Saving the loud part for later',
  'Watching the queue blink',
  'Finding a better next track',
  'Keeping the waveform calm',
  'Running a vibe inspection',
  'Waiting for the intro skip debate',
  'Holding the stage lights',
  'Checking the replay forecast',
  'Keeping the library awake',
  'Waiting for a midnight song',
  'Looking for a clean fade',
  'Doing nothing, professionally',
  'Protecting the good part',
  'Saving energy for the drop',
  'Keeping the lobby in tune',
  'Thinking about the next repeat',
  'Waiting for the right noise',
  'Checking if the speakers agree',
  'Keeping the session parked',
  'Looking for a song with main character energy',
  'Waiting for the queue to make a move',
  'Keeping the room on standby',
  'Saving the chorus from overuse',
  'Looking for the perfect restart',
  'Holding the vibe at room temperature',
  'Waiting for a track worth the volume',
];

export const PLAYBACK_GENRE_SIGNALS = [
  'lofi', 'jazz', 'rock', 'pop', 'synthwave', 'techno', 'ambient', 'classic', 'metal',
  'rap', 'hiphop', 'trap', 'house', 'dubstep', 'relax', 'study', 'indie', 'phonk', 'folk',
];
