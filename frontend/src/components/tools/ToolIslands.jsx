import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, AlertTriangle, Camera, Check, ChevronLeft, ChevronRight, Copy, Download, Eye, EyeOff, Fingerprint, Hand, Keyboard, Loader2, Lock, MessageSquare, MousePointer2, Send, Signal, Trash2, Volume2, X } from 'lucide-react';
import { BUILD_VERSION, UX_VERSION } from '../../buildVersion';
import { API_BASE, DEFAULT_FEEDBACK_DRAFT, FEEDBACK_ISSUE_URL, FEEDBACK_STORAGE_KEY } from '../../config/aetherConfig';
import { buildCanonicalShortcutCombo, DEFAULT_SHORTCUTS, getEventKeyToken, sanitizeShortcutMap, SHORTCUT_FIELDS, toReadableShortcut } from '../../utils/shortcuts';
import { formatBytes, formatTime } from '../../utils/format';
import { clamp01 } from '../../utils/visualMath';

export { SignalLedgerIsland } from './SignalLedgerIsland';

export const FeedbackIsland = memo(forwardRef(function FeedbackIsland({
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
                {isFeedbackSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}));

export const GestureLabIsland = memo(forwardRef(function GestureLabIsland({
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

export const AppLockSettingsIsland = memo(forwardRef(function AppLockSettingsIsland({
  isStandalone,
  lockStatus,
  lockIdleMinutes,
  setLockIdleMinutes,
  refreshLockStatus,
  setIsAppLocked,
  setLastAdded,
  sharedModalCloseButtonClass,
  requestDestructiveConfirmation,
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
      setIsOpen(false);
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

// === DISCOVERY GRID COMPONENT (Memoized) ===
