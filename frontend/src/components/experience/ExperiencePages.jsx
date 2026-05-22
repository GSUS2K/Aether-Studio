import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { Activity, AlertTriangle, BookOpen, Camera, Check, ChevronLeft, ChevronRight, Copy, Download, Eye, EyeOff, Fingerprint, Globe, Hand, HardDrive, Keyboard, Link2, Loader2, Lock, MessageSquare, Monitor, MousePointer2, Music, Plus, RefreshCw, Search, Send, Signal, SlidersHorizontal, Sparkles, Trash2, Upload, User, Volume2, X } from 'lucide-react';
import { APP_VERSION, BUILD_VERSION, UX_VERSION } from '../../buildVersion';
import { AETHER_PROFILE_API_BASE, AETHER_SHARE_ORIGIN, DEFAULT_AETHER_PROFILE, DEFAULT_FEEDBACK_DRAFT, FEEDBACK_ISSUE_URL, FEEDBACK_STORAGE_KEY, PLAYBACK_LEDGER_STORAGE_KEY } from '../../config/aetherConfig';
import { buildCanonicalShortcutCombo, DEFAULT_SHORTCUTS, getEventKeyToken, sanitizeShortcutMap, SHORTCUT_FIELDS, toReadableShortcut } from '../../utils/shortcuts';
import { clamp01 } from '../../utils/visualMath';
import { formatTime } from '../../utils/format';
import { createPublicProfileLink, getProfileLink, sanitizeAetherProfile } from '../../utils/profile';
import { createPlaybackLedgerData, formatPlaybackDuration, getLocalDateKey, normalizePlaybackLedgerData, scoreLedgerPayload } from '../../utils/playbackLedger';
import { HealthMetricCard, SecondaryNowPlayingStrip } from '../common/AetherUi';

export const ExperiencePageIntro = memo(function ExperiencePageIntro({ category, title, subtitle, icon: Icon }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {Icon && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/10 text-brand-accent">
          <Icon size={18} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">{category}</div>
        <div className="mt-1 text-2xl font-black uppercase tracking-tight text-white">{title}</div>
        <div className="mt-1 max-w-3xl text-sm leading-6 text-white/48">{subtitle}</div>
      </div>
    </div>
  );
});

export const ExperienceFeedbackPage = memo(function ExperienceFeedbackPage({
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
}) {
  const [feedbackDraft, setFeedbackDraft] = useState(DEFAULT_FEEDBACK_DRAFT);
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [isFeedbackSending, setIsFeedbackSending] = useState(false);

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
      positionMs: getActivePlaybackPositionMs?.() || 0,
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

      const endpoint = import.meta.env.VITE_FEEDBACK_ENDPOINT?.trim();
      if (endpoint) {
        await axios.post(endpoint, payload, { timeout: 8000 });
        setFeedbackStatus(saved ? 'Sent privately. Thanks for helping improve Aether.' : 'Sent privately.');
      } else {
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
        setFeedbackStatus(saved ? 'Saved locally and opened a GitHub issue draft.' : 'Opened a GitHub issue draft.');
      }
      appendRecentEvent?.('feedback', summary, { tone: 'success' });
      setFeedbackDraft(DEFAULT_FEEDBACK_DRAFT);
    } catch (error) {
      console.warn('[Aether/Feedback] Failed to submit feedback', error);
      setFeedbackStatus(error?.message || 'Feedback failed. Copy details and try again.');
      appendRecentEvent?.('feedback_failed', error?.message || 'Feedback failed', { tone: 'error' });
    } finally {
      setIsFeedbackSending(false);
    }
  }, [appendRecentEvent, auraPreset, currentTrack, feedbackDraft, getActivePlaybackPositionMs, isStandalone, lyricsCount, platform, queueLength, videoMode, visualizerMode]);

  return (
    <div>
      <ExperiencePageIntro category="Support" title="Send Feedback" subtitle="Report problems, suggest improvements, or share new ideas." icon={MessageSquare} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="grid grid-cols-3 gap-2">
            {['Problem', 'Improvement', 'Idea'].map((type) => (
              <button key={type} onClick={() => updateFeedbackDraft({ type })} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${feedbackDraft.type === type ? 'border-brand-accent/40 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-brand-accent/35 hover:text-brand-accent'}`}>
                {type}
              </button>
            ))}
          </div>
          <input value={feedbackDraft.summary} onChange={(e) => updateFeedbackDraft({ summary: e.target.value })} placeholder="Short title" className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none transition-all placeholder:text-white/24 focus:border-brand-accent/45" />
          <textarea value={feedbackDraft.details} onChange={(e) => updateFeedbackDraft({ details: e.target.value })} placeholder="What happened, or what should be better?" className="mt-3 min-h-[180px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition-all placeholder:text-white/24 focus:border-brand-accent/45" />
          <input value={feedbackDraft.contact} onChange={(e) => updateFeedbackDraft({ contact: e.target.value })} placeholder="Contact handle/email optional" className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/24 focus:border-brand-accent/45" />
          {feedbackStatus && <div className="mt-4 rounded-2xl border border-white/8 bg-black/24 px-4 py-3 text-[11px] font-semibold leading-5 text-white/58">{feedbackStatus}</div>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Build {BUILD_VERSION} // {platform || 'web'}</div>
            <button onClick={submitFeedback} disabled={isFeedbackSending || !feedbackDraft.summary.trim() || !feedbackDraft.details.trim()} className="flex items-center gap-2 rounded-2xl bg-brand-accent px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-45 disabled:hover:scale-100">
              {isFeedbackSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {isFeedbackSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </section>
        <aside className="rounded-[1.5rem] border border-brand-accent/20 bg-brand-accent/[0.06] p-5 text-sm leading-6 text-white/55">
          Feedback is sent privately when available. Otherwise Aether prepares a GitHub issue draft so you can review it before submitting.
        </aside>
      </div>
    </div>
  );
});

export const ExperienceGestureFaceLabPage = memo(function ExperienceGestureFaceLabPage({
  isGestureControlEnabled,
  setIsGestureControlEnabled,
  isFaceControlEnabled,
  setIsFaceControlEnabled,
  faceControlStatus,
  faceControlSignal,
  cameraHandSignal,
  setLastAdded,
}) {
  const cameraStatusLabel = isFaceControlEnabled ? (faceControlStatus || 'Camera active') : 'Camera off';
  return (
    <div>
      <ExperiencePageIntro category="Control Input" title="Gesture + Face Lab" subtitle="Configure pointer, swipe, face, and camera controls." icon={Hand} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <button onClick={() => setIsGestureControlEnabled((prev) => { const next = !prev; if (!next) setIsFaceControlEnabled(false); setLastAdded?.(next ? 'Gesture controls enabled' : 'Gesture controls disabled'); window.setTimeout(() => setLastAdded?.(null), 1800); return next; })} className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${isGestureControlEnabled ? 'border-brand-accent/35 bg-brand-accent/12 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-brand-accent/35 hover:text-brand-accent'}`}>
            <span><span className="block text-[11px] font-black uppercase tracking-[0.22em]">Gesture controls</span><span className="mt-1 block text-[11px] font-semibold text-white/42">Pointer motion drives stage depth. Fast swipes control playback.</span></span>
            <span className="rounded-full border border-current px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]">{isGestureControlEnabled ? 'On' : 'Off'}</span>
          </button>
          <button onClick={() => setIsFaceControlEnabled((prev) => { const next = !prev; setLastAdded?.(next ? 'Camera controls enabled' : 'Camera controls disabled'); window.setTimeout(() => setLastAdded?.(null), 1800); return next; })} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${isFaceControlEnabled ? 'border-brand-accent/35 bg-brand-accent/12 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-brand-accent/35 hover:text-brand-accent'}`}>
            <span className="flex items-center gap-3"><Camera size={18} className="shrink-0" /><span><span className="block text-[11px] font-black uppercase tracking-[0.22em]">Camera controls</span><span className="mt-1 block text-[11px] font-semibold text-white/42">Camera tracks face position and hand swipes independently of gesture controls.</span></span></span>
            <span className="rounded-full border border-current px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]">{isFaceControlEnabled ? 'On' : 'Off'}</span>
          </button>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              [MousePointer2, 'Pointer depth', 'Move pointer/finger to tilt the Aura Stage layers.'],
              [ChevronLeft, 'Swipe left', 'Skip to the next track.'],
              [ChevronRight, 'Swipe right', 'Restart or go to the previous track.'],
              [Volume2, '2-finger swipe U/D', 'Two fingers slide up or down to adjust volume.'],
              [Fingerprint, 'Pinch in', 'Two-finger pinch to pause playback.'],
              [Camera, 'Camera wave', 'Wave your hand or look around for playback controls.'],
            ].map(([Icon, title, detail]) => (
              <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <Icon size={18} className="text-brand-accent" />
                <div className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/80">{title}</div>
                <div className="mt-1 text-[11px] leading-5 text-white/42">{detail}</div>
              </div>
            ))}
          </div>
        </section>
        <aside className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Input Status</div>
              <div className="mt-2 text-sm font-bold text-white/65">{cameraStatusLabel}</div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${isGestureControlEnabled ? 'border-brand-accent/35 bg-brand-accent/10 text-brand-accent' : 'border-white/10 bg-white/[0.04] text-white/40'}`}>{isGestureControlEnabled ? 'Gestures on' : 'Gestures off'}</span>
          </div>
          <div className="mt-4 rounded-2xl border border-brand-accent/15 bg-brand-accent/[0.05] p-3 text-xs leading-5 text-white/48">
            Swipes are active across the player when Gesture controls are on. Buttons, inputs, and this control panel ignore gestures so normal clicks still feel reliable.
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/8 bg-black/24 p-3 text-[10px] font-mono text-brand-accent/75">FACE {faceControlSignal.x.toFixed(2)}, {faceControlSignal.y.toFixed(2)}</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-accent" style={{ width: `${Math.round(clamp01(faceControlSignal.confidence) * 100)}%` }} /></div>
            <div className="rounded-2xl border border-white/8 bg-black/24 p-3 text-[10px] font-mono text-brand-accent/75">HAND {cameraHandSignal.x.toFixed(2)}, {cameraHandSignal.y.toFixed(2)}</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-accent/65" style={{ width: `${Math.round(clamp01(cameraHandSignal.motion) * 100)}%` }} /></div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/28">Last hand signal: {cameraHandSignal.last}</div>
          </div>
        </aside>
      </div>
    </div>
  );
});

export const ExperienceShortcutSettingsPage = memo(function ExperienceShortcutSettingsPage({
  shortcuts,
  shortcutDraft,
  setShortcutDraft,
  shortcutSettingsError,
  setShortcutSettingsError,
  globalMediaShortcutsEnabled,
  setGlobalMediaShortcutsEnabled,
  saveShortcutSettings,
  isShortcutSettingsSaving,
  resetShortcutSettingsToDefaults,
  isMacPlatform,
  openTipsOverlay,
  requestDestructiveConfirmation,
}) {
  const [recordingId, setRecordingId] = useState(null);
  const handleReset = useCallback(async () => {
    const confirmed = requestDestructiveConfirmation ? await requestDestructiveConfirmation({
      title: 'Reset shortcut defaults?',
      message: 'Aether will replace your shortcut draft with the default key bindings. Nothing is saved until you press Save Shortcuts.',
      confirmLabel: 'Reset Defaults',
    }) : true;
    if (confirmed) resetShortcutSettingsToDefaults();
  }, [requestDestructiveConfirmation, resetShortcutSettingsToDefaults]);

  return (
    <div>
      <ExperiencePageIntro category="Shortcuts" title="Shortcut Settings" subtitle="Customize playback and command shortcuts." icon={Keyboard} />
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SHORTCUT_FIELDS.map((field) => (
            <label key={field.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/75">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">{field.label}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent/70">{recordingId === field.id ? 'Recording shortcut...' : 'Click and press keys'}</span>
              </div>
              <input
                value={shortcutDraft[field.id] || ''}
                onFocus={() => setRecordingId(field.id)}
                onBlur={() => setRecordingId(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Tab') return;
                  event.preventDefault();
                  event.stopPropagation();
                  const key = getEventKeyToken(event);
                  if (!key || key === 'Escape') {
                    if (key === 'Escape') setRecordingId(null);
                    return;
                  }
                  const parsed = {
                    ctrl: event.ctrlKey,
                    meta: event.metaKey,
                    alt: event.altKey,
                    shift: event.shiftKey,
                    key,
                  };
                  const combo = buildCanonicalShortcutCombo(parsed, isMacPlatform);
                  if (!combo) return;
                  setShortcutSettingsError('');
                  setShortcutDraft((prev) => ({ ...prev, [field.id]: combo }));
                }}
                onChange={(e) => {
                  setShortcutSettingsError('');
                  setShortcutDraft((prev) => ({ ...prev, [field.id]: e.target.value }));
                }}
                data-shortcut-recording={recordingId === field.id ? 'true' : undefined}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-white outline-none transition-colors focus:border-brand-accent/50"
                placeholder="Mod+Alt+Space"
              />
              <div className="mt-1 text-[11px] text-white/40">Current: {toReadableShortcut(shortcuts[field.id], isMacPlatform)}</div>
            </label>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <label className="flex items-start gap-3 text-sm text-white/75">
            <input type="checkbox" checked={globalMediaShortcutsEnabled} onChange={(e) => setGlobalMediaShortcutsEnabled(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-accent" />
            <span>
              Enable global media shortcuts
              <span className="mt-1 block text-[11px] text-white/45">This affects system-wide key capture and may conflict with OS/app controls. Restart app after change.</span>
            </span>
          </label>
        </div>
        {shortcutSettingsError && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{shortcutSettingsError}</div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleReset} className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-white/70 transition-all hover:border-brand-accent/40 hover:text-brand-accent">Reset to Defaults</button>
            <button onClick={openTipsOverlay} className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-white/70 transition-all hover:border-brand-accent/40 hover:text-brand-accent">Open Guide</button>
          </div>
          <button onClick={saveShortcutSettings} disabled={isShortcutSettingsSaving} className="rounded-xl border border-brand-accent/35 bg-brand-accent/10 px-4 py-2 text-brand-accent transition-all hover:bg-brand-accent/20 disabled:opacity-50">{isShortcutSettingsSaving ? 'Saving...' : 'Save Shortcuts'}</button>
        </div>
      </section>
    </div>
  );
});

export const ExperienceAppLockPage = memo(function ExperienceAppLockPage({
  isStandalone,
  lockStatus,
  lockIdleMinutes,
  setLockIdleMinutes,
  refreshLockStatus,
  setIsAppLocked,
  setLastAdded,
  requestDestructiveConfirmation,
}) {
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [lockPasswordConfirm, setLockPasswordConfirm] = useState('');
  const [lockDisablePassword, setLockDisablePassword] = useState('');
  const [lockUseTouchId, setLockUseTouchId] = useState(false);
  const [lockError, setLockError] = useState('');
  const [isLockBusy, setIsLockBusy] = useState(false);
  const [lockRecoveryStatus, setLockRecoveryStatus] = useState({ phrase: { enabled: false, createdAt: null } });
  const [recoverySetupError, setRecoverySetupError] = useState('');
  const [phraseBusy, setPhraseBusy] = useState(false);
  const [phraseGenerated, setPhraseGenerated] = useState('');
  const [phraseCopied, setPhraseCopied] = useState(false);

  const refreshLockRecoveryStatusLocal = useCallback(async () => {
    if (!window.aether?.getLockRecoveryStatus) return;
    try {
      const res = await window.aether.getLockRecoveryStatus();
      if (res?.success) setLockRecoveryStatus({ phrase: res.phrase || { enabled: false, createdAt: null } });
    } catch { }
  }, []);

  useEffect(() => {
    setLockUseTouchId(!!lockStatus.touchIdEnabled);
    refreshLockRecoveryStatusLocal();
  }, [lockStatus.touchIdEnabled, refreshLockRecoveryStatusLocal]);

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
      setLastAdded('App lock enabled');
      setTimeout(() => setLastAdded(null), 2000);
    } finally {
      setIsLockBusy(false);
    }
  }, [lockPasswordConfirm, lockPasswordInput, lockUseTouchId, refreshLockStatus, setLastAdded]);

  const handleDisableLock = useCallback(async () => {
    if (!window.aether?.disableAppLock || !lockDisablePassword) {
      setLockError('Enter your password to disable App Lock.');
      return;
    }
    const confirmed = requestDestructiveConfirmation ? await requestDestructiveConfirmation({
      title: 'Disable App Lock?',
      message: 'Aether will remove the password gate and idle lock protection from this device.',
      detail: 'You can turn App Lock back on later from Security.',
      confirmLabel: 'Disable Lock',
    }) : true;
    if (!confirmed) return;
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
      setLastAdded('App lock disabled');
      setTimeout(() => setLastAdded(null), 2000);
    } finally {
      setIsLockBusy(false);
    }
  }, [lockDisablePassword, refreshLockStatus, requestDestructiveConfirmation, setIsAppLocked, setLastAdded]);

  const handleToggleTouchIdLock = useCallback(async (enabled) => {
    setLockUseTouchId(enabled);
    if (!lockStatus.enabled || !window.aether?.setAppLockTouchId) return;
    const res = await window.aether.setAppLockTouchId(enabled);
    if (res?.success) await refreshLockStatus();
  }, [lockStatus.enabled, refreshLockStatus]);

  const handleLockNow = useCallback(() => {
    if (!lockStatus.enabled) return;
    setIsAppLocked(true);
    setLastAdded('Aether locked');
    setTimeout(() => setLastAdded(null), 1600);
  }, [lockStatus.enabled, setIsAppLocked, setLastAdded]);

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

  const handleCopyPhrase = useCallback(() => {
    if (!phraseGenerated) return;
    navigator.clipboard.writeText(phraseGenerated).then(() => {
      setPhraseCopied(true);
      setTimeout(() => setPhraseCopied(false), 2000);
    }).catch(() => setRecoverySetupError('Could not copy phrase.'));
  }, [phraseGenerated]);

  if (!isStandalone) {
    return (
      <div>
        <ExperiencePageIntro category="Security" title="App Lock" subtitle="Protect Aether with password, Touch ID, and idle locking." icon={Lock} />
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">App Lock is available in the desktop build.</div>
      </div>
    );
  }

  return (
    <div>
      <ExperiencePageIntro category="Security" title="App Lock" subtitle="Protect Aether with password, Touch ID, and idle locking." icon={Lock} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-accent">{lockStatus.enabled ? 'Enabled' : 'Setup'}</div>
          {lockStatus.enabled ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-brand-accent/20 bg-brand-accent/[0.07] px-4 py-3 text-sm text-white/60">App Lock is enabled. Enter your password to disable App Lock.</div>
              <input type="password" value={lockDisablePassword} onChange={(event) => { setLockDisablePassword(event.target.value); setLockError(''); }} placeholder="Password required to disable" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-accent/45" disabled={isLockBusy} />
              <div className="flex flex-wrap gap-2">
                <button onClick={handleLockNow} className="rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-4 py-2 text-sm font-black text-brand-accent transition-colors hover:bg-brand-accent/15">Lock Now</button>
                <button onClick={handleDisableLock} disabled={isLockBusy || !lockDisablePassword} className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200 transition-colors disabled:opacity-45">Disable Lock</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <input type="password" value={lockPasswordInput} onChange={(event) => { setLockPasswordInput(event.target.value); setLockError(''); }} placeholder="New App Lock password" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-accent/45" disabled={isLockBusy} />
              <input type="password" value={lockPasswordConfirm} onChange={(event) => { setLockPasswordConfirm(event.target.value); setLockError(''); }} placeholder="Confirm password" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-accent/45" disabled={isLockBusy} />
              <button onClick={handleEnableLock} disabled={isLockBusy} className="rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-4 py-2 text-sm font-black text-brand-accent transition-colors hover:bg-brand-accent/15 disabled:opacity-45">{isLockBusy ? 'Saving...' : 'Enable App Lock'}</button>
            </div>
          )}
          {lockError && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{lockError}</div>}
        </section>
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-accent">Options</div>
          <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
            <span>Touch ID unlock</span>
            <input type="checkbox" checked={!!lockUseTouchId} onChange={(event) => handleToggleTouchIdLock(event.target.checked)} className="h-4 w-4 accent-brand-accent" />
          </label>
          <label className="mt-3 block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
            <div className="flex items-center justify-between gap-3"><span>Idle auto-lock</span><span className="font-mono text-brand-accent">{lockIdleMinutes}m</span></div>
            <input type="range" min="1" max="120" value={lockIdleMinutes} onChange={(event) => setLockIdleMinutes(Number(event.target.value) || 15)} className="mt-3 w-full accent-brand-accent" />
          </label>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Recovery</div>
            <div className="mt-2 text-xs leading-5 text-white/45">{lockRecoveryStatus?.phrase?.enabled ? 'Recovery phrase is enabled.' : 'Generate a recovery phrase so you can recover access later.'}</div>
            {phraseGenerated && <div className="mt-3 rounded-xl border border-brand-accent/25 bg-brand-accent/10 p-3 font-mono text-xs text-brand-accent">{phraseGenerated}</div>}
            {recoverySetupError && <div className="mt-3 text-xs text-red-300">{recoverySetupError}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleGenerateRecoveryPhrase} disabled={phraseBusy} className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/65 hover:border-brand-accent/35 hover:text-brand-accent">{phraseBusy ? 'Generating...' : 'Generate Phrase'}</button>
              {phraseGenerated && <button onClick={handleCopyPhrase} className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/65 hover:border-brand-accent/35 hover:text-brand-accent">{phraseCopied ? 'Copied' : 'Copy'}</button>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
});

export const ExperienceSignalLedgerPage = memo(function ExperienceSignalLedgerPage({
  getProxyUrl,
  currentTrack,
  isPlaying,
  getActivePlaybackPositionMs,
  setLastAdded,
}) {
  const [ledgerData, setLedgerData] = useState(() => createPlaybackLedgerData());
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0);
  const [ledgerError, setLedgerError] = useState('');
  const [liveTick, setLiveTick] = useState(0);
  const [isClearLedgerOpen, setIsClearLedgerOpen] = useState(false);
  const [ledgerClearPassword, setLedgerClearPassword] = useState('');
  const [ledgerClearError, setLedgerClearError] = useState('');
  const [isClearingLedger, setIsClearingLedger] = useState(false);
  const [isSyncingLedger, setIsSyncingLedger] = useState(false);
  const ledgerMountedRef = useRef(true);

  useEffect(() => () => {
    ledgerMountedRef.current = false;
  }, []);

  const loadLedger = useCallback(async () => {
    try {
      setLedgerError('');
      const candidates = [];
      if (window.aether?.store?.get) candidates.push(await window.aether.store.get(PLAYBACK_LEDGER_STORAGE_KEY));
      if (window.aether?.getPlaybackLedger) candidates.push(await window.aether.getPlaybackLedger());
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(PLAYBACK_LEDGER_STORAGE_KEY);
        if (raw) candidates.push(JSON.parse(raw));
      }
      const bestCandidate = candidates.map((payload) => scoreLedgerPayload(payload)).sort((left, right) => right.score - left.score)[0] || scoreLedgerPayload(null);
      const normalized = bestCandidate.data;
      if (!ledgerMountedRef.current) return normalized;
      setLedgerData(normalized);
      setLastUpdatedAt(Date.now());
      if (window.aether?.store?.set) {
        try { await window.aether.store.set(PLAYBACK_LEDGER_STORAGE_KEY, normalized); } catch (syncError) { console.warn('[Aether] Failed to persist Signal Ledger after refresh', syncError); }
      }
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(PLAYBACK_LEDGER_STORAGE_KEY, JSON.stringify(normalized)); } catch { }
      }
      return normalized;
    } catch (error) {
      const fallback = createPlaybackLedgerData();
      if (ledgerMountedRef.current) {
        setLedgerError(error?.message || 'Ledger refresh failed');
        setLedgerData(fallback);
      }
      return fallback;
    }
  }, []);

  useEffect(() => {
    loadLedger();
    const liveInterval = window.setInterval(() => setLiveTick((tick) => tick + 1), 2500);
    return () => window.clearInterval(liveInterval);
  }, [loadLedger]);

  const view = useMemo(() => {
    const data = normalizePlaybackLedgerData(ledgerData);
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
    const peakHours = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, '0')}:00`, count: Math.max(0, Number(data.hourlyTrends?.[hour] || 0)) }));
    const peakHourMax = Math.max(1, ...peakHours.map((entry) => entry.count));
    const topTracks = Object.entries(data.tracks || {}).sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0)).slice(0, 5);
    const topArtists = Object.entries(data.artists || {}).sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0)).slice(0, 5);
    const recentSessions = Array.isArray(data.recentSessions) ? data.recentSessions.slice(0, 6) : [];
    const totalSessions = Math.max(0, Math.floor(Number(data.totalSessions) || totalTracksPlayed));
    const todayMs = Math.max(0, Math.floor(Number(data.dailyMinutes?.[todayKey]) || 0));
    const todayPlays = Math.max(0, Math.floor(Number(data.dailyPlays?.[todayKey]) || 0));
    const activeDays = recentWeek.filter((entry) => entry.minutesMs > 0 || entry.plays > 0).length;
    return { ...data, totalTracksPlayed, totalMs, recentWeek, weekMaxMs, peakHours, peakHourMax, topTracks, topArtists, recentSessions, totalSessions, todayMs, todayPlays, activeDays };
  }, [ledgerData]);

  const syncLedger = useCallback(async () => {
    if (isSyncingLedger) return;
    setIsSyncingLedger(true);
    try {
      await loadLedger();
      setLastAdded?.('Signal Ledger synced');
      window.setTimeout(() => setLastAdded?.(null), 2200);
    } catch (error) {
      setLedgerError(error?.message || 'Could not sync Signal Ledger.');
      setLastAdded?.('Signal Ledger sync failed');
      window.setTimeout(() => setLastAdded?.(null), 2400);
    } finally {
      setIsSyncingLedger(false);
    }
  }, [isSyncingLedger, loadLedger, setLastAdded]);

  const requestClearLedger = useCallback(async () => {
    setLedgerClearPassword('');
    setLedgerClearError('');
    try {
      const status = await window.aether?.getLockStatus?.();
      if (!status?.enabled) setLedgerClearError('Set up App Lock first, then Signal Ledger can be cleared safely.');
    } catch (error) {
      setLedgerClearError(error?.message || 'Could not check App Lock.');
    }
    setIsClearLedgerOpen(true);
  }, []);

  const clearLedgerAfterAuth = useCallback(async (method = 'password') => {
    if (isClearingLedger) return;
    setIsClearingLedger(true);
    setLedgerClearError('');
    try {
      const status = await window.aether?.getLockStatus?.();
      if (!status?.enabled) throw new Error('Set up App Lock first, then Signal Ledger can be cleared safely.');
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
      if (window.aether?.store?.set) await window.aether.store.set(PLAYBACK_LEDGER_STORAGE_KEY, emptyLedger);
      if (typeof localStorage !== 'undefined') localStorage.setItem(PLAYBACK_LEDGER_STORAGE_KEY, JSON.stringify(emptyLedger));
      setLedgerData(emptyLedger);
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

  const livePositionMs = currentTrack && isPlaying ? Math.max(0, Math.floor(Number(getActivePlaybackPositionMs?.() || liveTick * 0) || 0)) : 0;
  const liveDurationMs = Math.max(0, Math.floor(Number(currentTrack?.totalDurationMs || currentTrack?.duration || 0)));
  const liveProgressPct = liveDurationMs > 0 ? clamp01(livePositionMs / liveDurationMs) * 100 : 0;
  const updatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'fresh';
  const isEmpty = view.totalTracksPlayed <= 0 && view.totalMs <= 0 && view.recentSessions.length === 0;

  return (
    <div>
      <ExperiencePageIntro category="Listening Intelligence" title="Signal Ledger" subtitle="Track your listening history, replay pulse, and recent activity." icon={Signal} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Live refresh - {updatedLabel}{ledgerError ? ` - ${ledgerError}` : ''}</div>
        <div className="flex gap-2">
          <button onClick={requestClearLedger} className="flex h-10 items-center gap-2 rounded-xl border border-red-500/18 bg-red-500/[0.06] px-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-200/70 transition-colors hover:border-red-400/40 hover:text-red-200"><Trash2 size={13} /> Clear</button>
          <button onClick={syncLedger} disabled={isSyncingLedger} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 transition-colors hover:border-brand-accent/35 hover:text-brand-accent disabled:opacity-50"><RefreshCw size={13} className={isSyncingLedger ? 'animate-spin' : ''} /> {isSyncingLedger ? 'Syncing...' : 'Sync'}</button>
        </div>
      </div>
      {isEmpty && <div className="mb-4 rounded-[1.5rem] border border-dashed border-brand-accent/20 bg-brand-accent/[0.05] p-5 text-sm text-white/55">No listening history yet. Play a few tracks and Aether will build your signal ledger.</div>}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="rounded-[1.5rem] border border-brand-accent/22 bg-brand-accent/[0.075] p-5 xl:col-span-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Live Now</div>
              <div className="mt-2 truncate text-xl font-black text-white">{currentTrack?.title || 'No active track'}</div>
              <div className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-white/42">{currentTrack?.author || (isPlaying ? 'Resolving signal' : 'Playback paused')}</div>
            </div>
            {currentTrack?.thumbnail ? <img src={getProxyUrl(currentTrack.thumbnail)} loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 object-cover" alt="" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-brand-accent"><Music size={20} /></div>}
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/35"><div className="h-full rounded-full bg-brand-accent" style={{ width: `${liveProgressPct}%` }} /></div>
          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-white/40"><span>{formatTime(livePositionMs)}</span><span>{liveDurationMs > 0 ? formatTime(liveDurationMs) : isPlaying ? 'live' : '--:--'}</span></div>
        </section>
        <section className="grid grid-cols-2 gap-3 xl:col-span-7 md:grid-cols-4">
          {[
            ['Listening', formatPlaybackDuration(view.totalMs), `${view.activeDays} active days`],
            ['Today', formatPlaybackDuration(view.todayMs), `${view.todayPlays} plays`],
            ['Plays', String(view.totalTracksPlayed), `${view.totalSessions} sessions`],
            ['Artists', String(view.topArtists.length), 'ranked signals'],
          ].map(([label, value, detail]) => (
            <div key={label} className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/34">{label}</div>
              <div className="mt-3 text-2xl font-black text-white">{value}</div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/34">{detail}</div>
            </div>
          ))}
        </section>
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 xl:col-span-5">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Recent Week</div>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {view.recentWeek.map((entry, index) => (
              <div key={entry.key || `week-${index}`} className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-black/20 px-2 py-3">
                <div className="flex h-24 w-full items-end justify-center"><div className="w-full max-w-[24px] rounded-full bg-gradient-to-t from-brand-accent via-brand-accent/80 to-white" style={{ height: `${entry.minutesMs > 0 ? 16 + ((entry.minutesMs / view.weekMaxMs) * 84) : 10}%` }} /></div>
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/48">{entry.label}</div>
                <div className="text-[9px] font-mono text-brand-accent">{Math.round(entry.minutesMs / 60000)}m</div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 xl:col-span-7">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Hourly Pulse</div>
          <div className="mt-5 grid grid-cols-12 gap-1.5 md:grid-cols-[repeat(24,minmax(0,1fr))]">
            {view.peakHours.map((entry) => (
              <div key={entry.hour} className="flex min-w-0 flex-col items-center gap-2">
                <div className="flex h-24 w-full items-end justify-center"><div className={`w-full rounded-full ${entry.count > 0 ? 'bg-brand-accent/85' : 'bg-white/[0.06]'}`} style={{ height: `${entry.count > 0 ? 12 + ((entry.count / view.peakHourMax) * 88) : 10}%` }} /></div>
                <div className="text-[8px] font-mono text-white/26">{entry.hour % 3 === 0 ? String(entry.hour).padStart(2, '0') : ''}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 xl:col-span-8">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Recent Sessions</div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {view.recentSessions.length > 0 ? view.recentSessions.map((session, index) => (
              <div key={session.id || `recent-session-${index}`} className="flex min-w-0 items-center gap-3 rounded-[1.25rem] border border-white/10 bg-black/20 p-3">
                <img src={getProxyUrl(session.thumbnail)} loading="lazy" decoding="async" className="h-14 w-14 rounded-xl bg-white/[0.03] object-cover" alt="" />
                <div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent">{formatPlaybackDuration(session.playedMs)} - {session.completed ? 'completed' : session.reason}</div><div className="mt-1 truncate text-sm font-black uppercase tracking-tight text-white">{session.title}</div><div className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-white/35">{session.author}</div></div>
              </div>
            )) : <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-black/20 p-5 text-[11px] uppercase tracking-[0.18em] text-white/28 md:col-span-2">Play for at least 15 seconds and the live ledger will start filling in.</div>}
          </div>
        </section>
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 xl:col-span-4">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Top Artists</div>
          <div className="mt-4 flex flex-col gap-2.5">
            {view.topArtists.length > 0 ? view.topArtists.map(([name, entry], idx) => (
              <div key={name || `top-artist-${idx}`} className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-accent">#{idx + 1} - {entry.count} plays</div><div className="mt-1 truncate text-sm font-black uppercase tracking-tight text-white">{name || 'Unknown artist'}</div><div className="mt-1 text-[10px] font-mono text-white/35">{formatPlaybackDuration(entry.totalMs)}</div></div>
            )) : <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-black/20 p-4 text-[10px] uppercase tracking-[0.18em] text-white/28">Signals appear after a few qualified sessions.</div>}
          </div>
        </section>
      </div>
      <AnimatePresence>
        {isClearLedgerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[360] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, scale: 0.98 }} className="w-full max-w-md rounded-[1.6rem] border border-red-500/20 bg-[#0b0d10] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Protected Clear</div>
              <div className="mt-2 text-xl font-black text-white">Clear Signal Ledger?</div>
              <div className="mt-2 text-sm leading-6 text-white/52">This removes listening sessions, play counts, history windows, and genre signals from this device. App Lock verification is required.</div>
              <input value={ledgerClearPassword} onChange={(event) => setLedgerClearPassword(event.target.value)} type="password" placeholder="App Lock password" className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-red-300/45" disabled={isClearingLedger} />
              {ledgerClearError && <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100/80">{ledgerClearError}</div>}
              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <button onClick={() => { setIsClearLedgerOpen(false); setLedgerClearError(''); setLedgerClearPassword(''); }} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/60 transition-colors hover:text-white" disabled={isClearingLedger}>Keep Data</button>
                {window.aether?.verifyAppLockBiometric && <button onClick={() => clearLedgerAfterAuth('biometric')} className="rounded-xl border border-brand-accent/20 bg-brand-accent/10 px-4 py-2 text-sm font-black text-brand-accent transition-colors hover:bg-brand-accent/15" disabled={isClearingLedger}>Use Touch ID</button>}
                <button onClick={() => clearLedgerAfterAuth('password')} className="rounded-xl bg-red-400 px-4 py-2 text-sm font-black text-black transition-transform active:scale-95 disabled:opacity-50" disabled={isClearingLedger}>{isClearingLedger ? 'Clearing...' : 'Clear Ledger'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
