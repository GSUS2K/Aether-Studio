export const DEFAULT_SHORTCUTS = Object.freeze({
  playPause: 'Mod+Alt+Space',
  previous: 'Mod+Alt+ArrowLeft',
  next: 'Mod+Alt+ArrowRight',
  volumeUp: 'Mod+Alt+ArrowUp',
  volumeDown: 'Mod+Alt+ArrowDown',
  mute: 'Mod+Alt+M',
  clearQueue: 'Mod+Alt+Backspace',
  focusSearch: 'Mod+F',
  shortcutSettings: 'Mod+/',
  studioLibrary: 'Mod+L',
  experienceCenter: 'Mod+E',
  auraStage: 'Mod+Shift+A',
  focusMode: 'Shift+F',
  miniPlayer: 'Shift+M',
  diagnostics: 'Mod+Alt+D',
});

export const SHORTCUT_FIELDS = [
  { id: 'playPause', label: 'Play / Pause' },
  { id: 'previous', label: 'Previous Track' },
  { id: 'next', label: 'Next Track' },
  { id: 'volumeUp', label: 'Volume Up' },
  { id: 'volumeDown', label: 'Volume Down' },
  { id: 'mute', label: 'Mute / Unmute' },
  { id: 'clearQueue', label: 'Clear Queue' },
  { id: 'focusSearch', label: 'Focus Search' },
  { id: 'shortcutSettings', label: 'Shortcut Settings' },
  { id: 'studioLibrary', label: 'Open Studio Library' },
  { id: 'experienceCenter', label: 'Experience Center' },
  { id: 'auraStage', label: 'Aura Stage' },
  { id: 'focusMode', label: 'Toggle Focus View' },
  { id: 'miniPlayer', label: 'Toggle Mini Player' },
  { id: 'diagnostics', label: 'Diagnostics Page' },
];

export const getCanonicalKeyToken = (token) => {
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

export const parseShortcutCombo = (combo, isMacPlatform) => {
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

export const buildCanonicalShortcutCombo = (parsed, isMacPlatform) => {
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

export const getEventKeyToken = (e) => {
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

export const isParsedShortcutEventMatch = (e, parsed) => {
  if (!parsed?.key) return false;
  const key = getEventKeyToken(e);
  if (!key || key !== parsed.key) return false;
  if (e.ctrlKey !== parsed.ctrl) return false;
  if (e.metaKey !== parsed.meta) return false;
  if (e.altKey !== parsed.alt) return false;
  if (e.shiftKey !== parsed.shift) return false;
  return true;
};

export const isShortcutEventMatch = (e, combo, isMacPlatform) => {
  const parsed = parseShortcutCombo(combo, isMacPlatform);
  if (!parsed) return false;
  return isParsedShortcutEventMatch(e, parsed);
};

export const getKeyboardEventElement = (event) => {
  const target = event?.target || (typeof document !== 'undefined' ? document.activeElement : null);
  if (typeof Element !== 'undefined' && target instanceof Element) return target;
  return null;
};

export const isNativeKeyboardTarget = (event) => {
  const target = getKeyboardEventElement(event);
  if (!target) return false;
  return Boolean(target.closest('input, textarea, select, button, a[href], [role="button"], [contenteditable="true"], [data-aether-native-keys="true"]'));
};

export const toReadableShortcut = (combo, isMacPlatform) => {
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

export const getCommandPaletteShortcutLabel = (isMacPlatform) => (isMacPlatform ? '⌘K' : 'Ctrl+K');

export const getReservedShortcutCombos = () => ([
  { label: 'Command Palette', combo: 'Mod+K' },
]);

export const sanitizeShortcutMap = (candidate, isMacPlatform) => {
  const next = {};
  SHORTCUT_FIELDS.forEach(({ id }) => {
    const stored = candidate?.[id];
    const raw = id === 'diagnostics' && String(stored || '').trim().toUpperCase() === 'D'
      ? DEFAULT_SHORTCUTS[id]
      : (stored ?? DEFAULT_SHORTCUTS[id]);
    const parsed = parseShortcutCombo(raw, isMacPlatform);
    next[id] = parsed ? buildCanonicalShortcutCombo(parsed, isMacPlatform) : DEFAULT_SHORTCUTS[id];
  });
  return next;
};
