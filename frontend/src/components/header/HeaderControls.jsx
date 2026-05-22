import { forwardRef, memo, startTransition, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, AppWindow, BookOpen, Clock, Eye, EyeOff, Hand, Keyboard, Loader2, Lock, MessageSquare, Music, Search, Sparkles, X, Zap } from 'lucide-react';
import { AURA_PRESETS, DOODLE_PRESETS, GLOBAL_SHORTCUTS_ENABLED_STORAGE_KEY, PERFORMANCE_MODES } from '../../config/aetherConfig';
import { ShortcutHint } from '../common/AetherUi';
import { normalizeSearchHistoryItem } from '../../utils/searchHistory';
import {
  buildCanonicalShortcutCombo,
  DEFAULT_SHORTCUTS,
  getReservedShortcutCombos,
  parseShortcutCombo,
  sanitizeShortcutMap,
  SHORTCUT_FIELDS,
  toReadableShortcut,
} from '../../utils/shortcuts';

export const HeaderVisualControls = memo(forwardRef(function HeaderVisualControls({
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
  discordPrivate,
  onToggleDiscordPrivate,
  openAppLockSettings,
  lockStatus,
  requestDestructiveConfirmation,
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
    getReservedShortcutCombos().forEach(({ label, combo }) => {
      const parsed = parseShortcutCombo(combo, isMacPlatform);
      if (parsed) seen.set(buildCanonicalShortcutCombo(parsed, isMacPlatform), label);
    });

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
        <button
          onClick={onToggleDiscordPrivate}
          className={`${headerIconButtonClass} ${discordPrivate ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' : ''}`}
          title={discordPrivate ? 'Discord Private Mode: ON — Click to show status' : 'Discord Private Mode: OFF — Click to hide status'}
        >
          {discordPrivate ? <EyeOff size={15} /> : <Eye size={15} />}
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
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[{ id: 'off', label: 'Off' }, { id: 'bars', label: 'Bars' }, { id: 'pulse', label: 'Aura' }].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setVisualizerMode(mode.id)}
                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.14em] border transition-colors ${visualizerMode === mode.id ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'bg-white/[0.03] border-white/10 text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}
                  >
                    {mode.label}
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
                <button onClick={() => { setIsAuraStageOpen(true); setIsLooksPanelOpen(false); }} className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.14em] border transition-colors bg-white/[0.03] border-white/10 text-white/65 hover:text-brand-accent hover:border-brand-accent/35`}>
                  Aura Stage
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
                <button onClick={() => { openGestureLab(); setIsLooksPanelOpen(false); }} className={`flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-colors ${isGestureControlEnabled ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'border-white/10 bg-white/[0.03] text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                  <Hand size={14} />
                  <span className="text-[8px] font-black uppercase tracking-[0.12em]">Gestures</span>
                </button>
                <button onClick={() => { openShortcutSettingsLocal(); setIsLooksPanelOpen(false); }} className={`flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-colors border-white/10 bg-white/[0.03] text-white/65 hover:text-brand-accent hover:border-brand-accent/35`}>
                  <Keyboard size={14} />
                  <span className="text-[8px] font-black uppercase tracking-[0.12em]">Shortcuts</span>
                </button>
                <button onClick={() => { openFeedbackPanel(); setIsLooksPanelOpen(false); }} className={`flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-colors border-white/10 bg-white/[0.03] text-white/65 hover:text-brand-accent hover:border-brand-accent/35`}>
                  <MessageSquare size={14} />
                  <span className="text-[8px] font-black uppercase tracking-[0.12em]">Issues</span>
                </button>
                {isStandalone && (
                  <button onClick={() => { openAppLockSettings?.(); setIsLooksPanelOpen(false); }} className={`flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-colors ${lockStatus?.enabled ? 'bg-brand-accent/20 border-brand-accent/45 text-brand-accent' : 'border-white/10 bg-white/[0.03] text-white/65 hover:text-brand-accent hover:border-brand-accent/35'}`}>
                    <Lock size={14} />
                    <span className="text-[8px] font-black uppercase tracking-[0.12em]">App Lock</span>
                  </button>
                )}
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
                  <button onClick={async () => {
                    const confirmed = requestDestructiveConfirmation ? await requestDestructiveConfirmation({
                      title: 'Reset shortcut defaults?',
                      message: 'Aether will replace your shortcut draft with the default key bindings. Nothing is saved until you press Save.',
                      confirmLabel: 'Reset Defaults',
                    }) : true;
                    if (!confirmed) return;
                    setShortcutSettingsError('');
                    setShortcutDraft(sanitizeShortcutMap(DEFAULT_SHORTCUTS, isMacPlatform));
                  }} className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.03] text-white/70 hover:border-brand-accent/40 hover:text-brand-accent transition-all">
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

export const HeaderSleepTimerControls = memo(forwardRef(function HeaderSleepTimerControls({
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

export const SearchHistoryDropdown = memo(function SearchHistoryDropdown({
  visible,
  history,
  query,
  label = 'Recent searches',
  onPick,
  onRemove,
  onClear,
}) {
  const normalizedQuery = normalizeSearchHistoryItem(query).toLowerCase();
  const matches = useMemo(() => {
    const list = Array.isArray(history) ? history : [];
    if (!normalizedQuery) return list;
    return list.filter((item) => item.toLowerCase().includes(normalizedQuery));
  }, [history, normalizedQuery]);

  if (!visible || matches.length === 0) return null;

  return (
    <div
      className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-[90] overflow-hidden rounded-2xl border border-brand-accent/18 bg-[#050908]/95 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/38">{label}</span>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-white/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/38 transition-all hover:border-red-400/35 hover:bg-red-500/10 hover:text-red-300"
        >
          Clear
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
        {matches.map((item) => (
          <div
            key={item}
            className="group flex items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all hover:bg-brand-accent/[0.08]"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => onPick(item)}
            >
              <Clock size={13} className="shrink-0 text-brand-accent/65" />
              <span className="truncate text-[12px] font-bold text-white/78 group-hover:text-white">{item}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-white/28 opacity-70 transition-all hover:border-red-400/35 hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
              title={`Remove "${item}" from search history`}
              aria-label={`Remove ${item} from search history`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

export const HeaderSearchBox = memo(function HeaderSearchBox({
  searchQuery,
  isSearching,
  hasActiveSearchState,
  isAuraMode,
  disabled,
  placeholder = 'Search tracks, artists, or paste a YouTube link',
  onSearch,
  onClear,
  inputRef,
  commandPaletteShortcutLabel = '',
  showShortcutHints = true,
  searchHistory = [],
  historyLabel = 'Recent searches',
  onHistoryPick,
  onHistoryRemove,
  onHistoryClear,
}) {
  const [draft, setDraft] = useState(searchQuery || '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    startTransition(() => setDraft(searchQuery || ''));
  }, [searchQuery]);

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

  const pickHistoryItem = useCallback((value) => {
    const normalized = normalizeSearchHistoryItem(value);
    if (!normalized) return;
    setDraft(normalized);
    setIsFocused(false);
    (onHistoryPick || onSearch)(normalized);
  }, [onHistoryPick, onSearch]);

  return (
    <form onSubmit={submitSearch} className="relative w-full group no-drag" data-no-maximize="true">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-dim group-focus-within:text-brand-accent z-10 transition-colors" size={18} />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className={`w-full rounded-full pl-12 pr-36 h-11 text-sm md:text-[14px] outline-none transition-all text-ellipsis overflow-hidden whitespace-nowrap ${isAuraMode ? 'bg-white/[0.035] border border-white/[0.14] focus:border-brand-accent/60 focus:bg-brand-accent/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.2)]' : 'bg-white/[0.04] border border-white/10 focus:border-brand-accent/50 focus:bg-brand-accent/[0.03]'} disabled:opacity-30 disabled:cursor-not-allowed`}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && hasLocalSearchState) {
            event.preventDefault();
            clearSearch();
          }
        }}
      />
      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
        {commandPaletteShortcutLabel && !hasLocalSearchState && !isSearching && (
          <ShortcutHint label={commandPaletteShortcutLabel} className="hidden sm:inline-flex" title="Open command palette" visible={showShortcutHints} />
        )}
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
      <SearchHistoryDropdown
        visible={!disabled && isFocused}
        history={searchHistory}
        query={draft}
        label={historyLabel}
        onPick={pickHistoryItem}
        onRemove={onHistoryRemove}
        onClear={onHistoryClear}
      />
    </form>
  );
});
