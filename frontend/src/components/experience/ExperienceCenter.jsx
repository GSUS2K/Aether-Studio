import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { Activity, AlertTriangle, BookOpen, Camera, Check, ChevronLeft, ChevronRight, Copy, Download, Eye, EyeOff, Fingerprint, Globe, Hand, HardDrive, Keyboard, Layers, Link2, Loader2, Lock, MessageSquare, Monitor, MousePointer2, Music, Plus, RefreshCw, Search, Send, Signal, SlidersHorizontal, Sparkles, Trash2, Upload, User, Volume2, Wifi, X } from 'lucide-react';
import { APP_VERSION, BUILD_VERSION, UX_VERSION } from '../../buildVersion';
import { AETHER_PROFILE_API_BASE, AETHER_SHARE_ORIGIN, AURA_PRESETS, DEFAULT_AETHER_PROFILE, DEFAULT_FEEDBACK_DRAFT, FEEDBACK_ISSUE_URL, FEEDBACK_STORAGE_KEY, PERFORMANCE_MODES } from '../../config/aetherConfig';
import { buildCanonicalShortcutCombo, DEFAULT_SHORTCUTS, getEventKeyToken, sanitizeShortcutMap, SHORTCUT_FIELDS, toReadableShortcut } from '../../utils/shortcuts';
import { clamp01 } from '../../utils/visualMath';
import { createPublicProfileLink, getProfileLink, sanitizeAetherProfile } from '../../utils/profile';
import { createPlaybackLedgerData, formatPlaybackDuration, getLocalDateKey, normalizePlaybackLedgerData, scoreLedgerPayload } from '../../utils/playbackLedger';
import { HealthMetricCard, SecondaryNowPlayingStrip } from '../common/AetherUi';

import { ExperienceAppLockPage, ExperienceFeedbackPage, ExperienceGestureFaceLabPage, ExperiencePageIntro, ExperienceShortcutSettingsPage, ExperienceSignalLedgerPage } from './ExperiencePages';

export const ExperienceCenterShell = memo(function ExperienceCenterShell({
  open,
  onClose,
  initialPage = 'home',
  visualizerMode,
  setVisualizerMode,
  performanceMode,
  setPerformanceMode,
  auraPreset,
  setAuraPreset,
  isDepthMotionEnabled,
  setIsDepthMotionEnabled,
  isDoodleMode,
  setIsDoodleMode,
  doodleIntensityBadge,
  setIsAuraStageOpen,
  isGestureControlEnabled,
  openGestureLab,
  openSignalLedger,
  openShortcutSettings,
  openFeedbackPanel,
  openAppLockSettings,
  lockStatus,
  isStandalone,
  discordPrivate,
  onToggleDiscordPrivate,
  isOfflineMode,
  onToggleOfflineMode,
  flashLastAdded,
  getProxyUrl,
  currentTrack,
  isPlaying,
  getActivePlaybackPositionMs,
  platform,
  videoMode,
  queueLength,
  lyricsCount,
  appendRecentEvent,
  setIsGestureControlEnabled,
  isFaceControlEnabled,
  setIsFaceControlEnabled,
  faceControlStatus,
  faceControlSignal,
  cameraHandSignal,
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
  lockIdleMinutes,
  setLockIdleMinutes,
  refreshLockStatus,
  setIsAppLocked,
  requestDestructiveConfirmation,
  showShortcutHints,
  setShowShortcutHints,
  aetherProfile,
  setAetherProfile,
  profileStats,
  onCopyProfileCard,
  onSaveProfileCard,
  onCopyProfileLink,
  avatarFileInputRef,
  onAvatarFileSelected,
  onPublishProfile,
  onUnpublishProfile,
  isProfilePublishing,
  soundLedgerView,
  diagnostics,
  engineStatus,
  isRuntimeRepairing,
  handleRunRuntimeRepair,
  openMusicImport,
  openLibraryOverlay,
  diagnosticsApiBase,
  queuePollDisplay,
  queuePollTime,
  skipEvents,
  onClearDiagnosticEvents,
  handleCopyDiagnosticsValue,
}) {
  const [page, setPage] = useState('home');
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [profileSearchResults, setProfileSearchResults] = useState([]);
  const [selectedPublicProfile, setSelectedPublicProfile] = useState(null);
  const [isProfileSearching, setIsProfileSearching] = useState(false);
  const [profileUnlockPassword, setProfileUnlockPassword] = useState('');
  const [isProfileUnlocking, setIsProfileUnlocking] = useState(false);
  const [isProfileEditUnlocked, setIsProfileEditUnlocked] = useState(() => !lockStatus?.enabled);
  const pageHistoryRef = useRef([]);

  useEffect(() => {
    if (open) {
      const nextPage = initialPage === 'visuals' || initialPage === 'tools' ? 'home' : (initialPage || 'home');
      pageHistoryRef.current = [];
      startTransition(() => setPage(nextPage));
    } else {
      startTransition(() => setPage('home'));
    }
  }, [initialPage, open]);

  useEffect(() => {
    if (!open || page !== 'profile') return;
    setIsProfileEditUnlocked(!lockStatus?.enabled);
    setProfileUnlockPassword('');
  }, [lockStatus?.enabled, open, page]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const target = event.target;
      const isTypingTarget = target instanceof Element && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT'
        || target.isContentEditable
        || target.closest('[data-shortcut-recording="true"]')
      );
      if (isTypingTarget) return;
      event.preventDefault();
      onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const navigate = useCallback((nextPage) => {
    setPage((currentPage) => {
      if (currentPage !== nextPage) pageHistoryRef.current = [...pageHistoryRef.current.slice(-8), currentPage];
      return nextPage;
    });
  }, []);
  const goBack = useCallback(() => {
    setPage(() => {
      const previous = pageHistoryRef.current.pop();
      return previous || 'home';
    });
  }, []);
  const closeShell = useCallback(() => onClose?.(), [onClose]);
  const searchPublicProfiles = useCallback(async () => {
    const query = profileSearchQuery.trim();
    if (query.length < 2) {
      setProfileSearchResults([]);
      return;
    }
    setIsProfileSearching(true);
    try {
      const response = await fetch(`${AETHER_PROFILE_API_BASE}/v1/profiles/search?q=${encodeURIComponent(query)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Profile search failed.');
      setProfileSearchResults(Array.isArray(data.profiles) ? data.profiles : []);
      setSelectedPublicProfile(null);
    } catch (error) {
      flashLastAdded?.(error?.message || 'Profile search failed', 2600, 'error');
      setProfileSearchResults([]);
    } finally {
      setIsProfileSearching(false);
    }
  }, [flashLastAdded, profileSearchQuery]);

  const toolPages = useMemo(() => ({
    'signal-ledger': {
      icon: Signal,
      title: 'Signal Ledger',
      detail: 'Listening history, trends, replay stats, and protected clear controls.',
      category: 'Listening Intelligence',
    },
    profile: {
      icon: User,
      title: 'Profile',
      detail: 'Avatar, public card, shareable listening stats, and Party identity.',
      category: 'Identity',
    },
    recap: {
      icon: Activity,
      title: 'Listening Recap',
      detail: 'Weekly and monthly listening highlights from Signal Ledger.',
      category: 'Listening Intelligence',
    },
    recovery: {
      icon: AlertTriangle,
      title: 'Recovery Center',
      detail: 'Fix runtime, download, clipboard, permission, and connectivity issues.',
      category: 'Support',
    },
    diagnostics: {
      icon: Monitor,
      title: 'Diagnostics',
      detail: 'Runtime status, recent errors, helper paths, and app health signals.',
      category: 'System',
    },
    setup: {
      icon: Sparkles,
      title: 'First-Run Setup',
      detail: 'Relaunch setup for profile, import, offline, shortcuts, and runtime checks.',
      category: 'Onboarding',
    },
    'gesture-face-lab': {
      icon: Hand,
      title: 'Gesture + Face Lab',
      detail: 'Pointer, swipe, camera, and face controls for hands-free playback.',
      category: 'Control Input',
    },
    'shortcut-settings': {
      icon: Keyboard,
      title: 'Shortcut Settings',
      detail: 'Playback and command key bindings with global media shortcut options.',
      category: 'Shortcuts',
    },
    feedback: {
      icon: MessageSquare,
      title: 'Feedback',
      detail: 'Send feedback, report a bug, or open a GitHub issue draft with context.',
      category: 'Support',
    },
    'app-lock': {
      icon: Lock,
      title: 'App Lock',
      detail: lockStatus?.enabled ? 'Lock is enabled. Manage password, Touch ID, idle timeout, and recovery.' : 'Protect Aether with password, optional Touch ID, idle timeout, and recovery.',
      category: 'Security',
      hidden: !isStandalone,
    },
  }), [isStandalone, lockStatus?.enabled]);

  const visibleTools = useMemo(() => Object.entries(toolPages).filter(([, item]) => !item.hidden), [toolPages]);
  const activeTool = toolPages[page];
  const isProfileActuallyPublished = aetherProfile.publishedVisibility !== 'private' && aetherProfile.lastPublishedAt > 0;
  const profileShareLink = aetherProfile.handle && isProfileActuallyPublished ? getProfileLink(aetherProfile) : '';
  const profilePublishLabel = isProfilePublishing
    ? 'Syncing...'
    : aetherProfile.visibility === 'private'
      ? (isProfileActuallyPublished ? 'Unpublish' : 'Private Saved')
      : (isProfileActuallyPublished ? 'Publish Changes' : 'Publish');
  const profileFieldsDisabled = !!lockStatus?.enabled && !isProfileEditUnlocked;
  const profilePublishDisabled = profileFieldsDisabled || isProfilePublishing || (aetherProfile.visibility === 'private' && !isProfileActuallyPublished);
  const profileAvatarInputId = 'aether-profile-avatar-input';
  const unlockProfileEditing = useCallback(async (method = 'password') => {
    if (!lockStatus?.enabled) {
      setIsProfileEditUnlocked(true);
      return;
    }
    setIsProfileUnlocking(true);
    try {
      const result = method === 'biometric'
        ? await window.aether?.verifyAppLockBiometric?.()
        : await window.aether?.verifyAppLockPassword?.(profileUnlockPassword);
      if (result?.success) {
        setIsProfileEditUnlocked(true);
        setProfileUnlockPassword('');
        flashLastAdded?.('Profile editing unlocked', 1600, 'success');
      } else {
        flashLastAdded?.(result?.error || 'Could not unlock profile editing', 2400, 'error');
      }
    } finally {
      setIsProfileUnlocking(false);
    }
  }, [flashLastAdded, lockStatus?.enabled, profileUnlockPassword]);

  const pageMeta = {
    home: { eyebrow: 'Control Surface', title: 'Experience Center', detail: 'Modes, visuals, privacy, and tools in one control hub.' },
  }[page] || (activeTool ? { eyebrow: `Experience Center / ${activeTool.title}`, title: activeTool.title, detail: activeTool.detail } : { eyebrow: 'Experience Center / Tool', title: 'Tool', detail: 'Open a focused Aether utility.' });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[345] flex items-start justify-center p-4 pt-6 md:items-center md:pt-4"
        onClick={closeShell}
      >
        <div className="absolute inset-0 bg-black/82 backdrop-blur-xl" />
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.985 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex h-[min(92vh,860px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[2rem] border border-brand-accent/20 bg-[#070b0f]/96 shadow-[0_28px_100px_rgba(0,0,0,0.58)]"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Experience Center"
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-black/22 px-5 py-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {page !== 'home' && (
                <button
                  onClick={goBack}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-white/55 transition-all hover:border-brand-accent/35 hover:text-brand-accent"
                  title="Back"
                >
                  <ChevronLeft size={17} />
                </button>
              )}
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-accent/25 bg-brand-accent/10 text-brand-accent">
                  <Layers size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/34">{pageMeta.eyebrow}</div>
                  <div className="truncate text-2xl font-black uppercase tracking-tight text-brand-accent">{pageMeta.title}</div>
                  <div className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">{pageMeta.detail}</div>
                </div>
              </div>
            </div>
            <SecondaryNowPlayingStrip
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              getProxyUrl={getProxyUrl}
              className="hidden w-[min(32vw,320px)] lg:flex"
            />
            <button
              onClick={closeShell}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-white/45 transition-all hover:border-red-500/40 hover:text-red-300"
              title="Close Experience Center"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <aside className="custom-scrollbar-heavy flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-white/[0.018] p-3 md:w-72 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-b-0 md:border-r">
              {[
                ['home', 'Control Hub', 'Overview, visuals, modes, and tools'],
                ...visibleTools.map(([key, item]) => [key, item.title, item.detail]),
              ].map(([key, label, detail]) => (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition-all md:shrink ${page === key ? 'border-brand-accent/35 bg-brand-accent/10 text-brand-accent' : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-brand-accent/30 hover:text-brand-accent'}`}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</div>
                  <div className="mt-1 hidden text-[10px] text-white/38 md:block">{detail}</div>
                </button>
              ))}
            </aside>

            <div className="custom-scrollbar-heavy min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <AnimatePresence mode="wait">
                {page === 'home' && (
                  <motion.div
                    key="experience-home"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.16 }}
                    className="grid gap-4"
                  >
                    <section className="rounded-[1.5rem] border border-brand-accent/18 bg-brand-accent/[0.055] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Session Mode</div>
                          <div className="mt-2 text-3xl font-black uppercase tracking-tight text-white">{isOfflineMode ? 'Offline' : 'Online'}</div>
                        </div>
                        {isOfflineMode ? <Wifi size={20} className="text-white/36" /> : <Globe size={20} className="text-brand-accent" />}
                      </div>
                      <div className="mt-3 max-w-3xl text-sm leading-6 text-white/48">{isOfflineMode ? 'Downloaded tracks stay available. Internet-only discovery and party features stay quiet.' : 'Discovery, imports, visual video stages, and Party are available.'}</div>
                      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:max-w-xl">
                        <button
                          onClick={onToggleOfflineMode}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all ${isOfflineMode ? 'border-white/15 bg-white/[0.04] text-white/68 hover:border-brand-accent/35 hover:text-brand-accent' : 'border-brand-accent/35 bg-brand-accent/14 text-brand-accent hover:bg-brand-accent hover:text-black'}`}
                        >
                          {isOfflineMode ? <Wifi size={14} className="opacity-60 line-through" /> : <Globe size={14} />}
                          {isOfflineMode ? 'Go Online' : 'Go Offline'}
                        </button>
                        <button
                          onClick={onToggleDiscordPrivate}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all ${discordPrivate ? 'border-purple-300/35 bg-purple-500/12 text-purple-200' : 'border-white/12 bg-white/[0.04] text-white/62 hover:border-brand-accent/35 hover:text-brand-accent'}`}
                        >
                          {discordPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
                          {discordPrivate ? 'Private On' : 'Discord Visible'}
                        </button>
                      </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Visual Stage</div>
                          <div className="mt-1 text-xl font-black uppercase tracking-tight text-white">Presets + Performance</div>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-4 xl:grid-cols-3">
                        <div>
                          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/34">Visualizer</div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'off', label: 'Off' },
                              { id: 'bars', label: 'Bars' },
                              { id: 'pulse', label: 'Aura' },
                            ].map((mode) => (
                              <button key={mode.id} onClick={() => setVisualizerMode(mode.id)} className={`min-w-[86px] rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${visualizerMode === mode.id ? 'border-brand-accent/45 bg-brand-accent/16 text-brand-accent' : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-brand-accent/30 hover:text-brand-accent'}`}>{mode.label}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/34">Performance</div>
                          <div className="flex flex-wrap gap-2">
                            {PERFORMANCE_MODES.map((mode) => (
                              <button key={mode.id} onClick={() => { setPerformanceMode(mode.id); flashLastAdded?.(`Performance - ${mode.label}`); }} className={`min-w-[96px] rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${performanceMode === mode.id ? 'border-brand-accent/45 bg-brand-accent/16 text-brand-accent' : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-brand-accent/30 hover:text-brand-accent'}`}>{mode.label}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/34">Aura Preset</div>
                          <div className="flex flex-wrap gap-2">
                            {AURA_PRESETS.map((preset) => (
                              <button key={preset.id} onClick={() => { setAuraPreset(preset.id); flashLastAdded?.(`Aura preset - ${preset.label}`); }} className={`min-w-[116px] rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${auraPreset === preset.id ? 'border-brand-accent/45 bg-brand-accent/16 text-brand-accent' : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-brand-accent/30 hover:text-brand-accent'}`}>{preset.label}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-2 md:grid-cols-3">
                        <button onClick={() => { setIsDepthMotionEnabled((prev) => !prev); flashLastAdded?.(isDepthMotionEnabled ? 'Depth motion disabled' : 'Depth motion enabled'); }} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${isDepthMotionEnabled ? 'border-brand-accent/45 bg-brand-accent/16 text-brand-accent' : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-brand-accent/30 hover:text-brand-accent'}`}>Depth Motion {isDepthMotionEnabled ? 'On' : 'Off'}</button>
                        <button onClick={() => { setIsDoodleMode((prev) => !prev); flashLastAdded?.(isDoodleMode ? 'Doodle mode disabled' : 'Doodle mode enabled', 1600); }} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${isDoodleMode ? 'border-brand-accent/45 bg-brand-accent/16 text-brand-accent' : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-brand-accent/30 hover:text-brand-accent'}`}>{isDoodleMode ? `Doodle On - ${doodleIntensityBadge}` : 'Doodle Off'}</button>
                        <button onClick={() => { setShowShortcutHints?.((prev) => !prev); flashLastAdded?.(showShortcutHints ? 'Shortcut hints hidden' : 'Shortcut hints visible'); }} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${showShortcutHints ? 'border-brand-accent/45 bg-brand-accent/16 text-brand-accent' : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-brand-accent/30 hover:text-brand-accent'}`}>Hints {showShortcutHints ? 'On' : 'Off'}</button>
                      </div>
                    </section>

                    <section>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Tools</div>
                          <div className="mt-1 text-sm text-white/42">Open any utility inside this same Experience Center shell.</div>
                        </div>
                      </div>
                      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
                        {visibleTools.map(([key, item]) => {
                          const Icon = item.icon;
                          return (
                            <button key={key} onClick={() => navigate(key)} className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4 text-left transition-all hover:border-brand-accent/30 hover:bg-brand-accent/[0.05]">
                              <Icon size={18} className="text-brand-accent" />
                              <div className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-white">{item.title}</div>
                              <div className="mt-1 text-[10px] leading-5 text-white/38">{item.detail}</div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </motion.div>
                )}

                {page === 'signal-ledger' && (
                  <motion.div key="experience-signal-ledger" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    <ExperienceSignalLedgerPage getProxyUrl={getProxyUrl} currentTrack={currentTrack} isPlaying={isPlaying} getActivePlaybackPositionMs={getActivePlaybackPositionMs} setLastAdded={flashLastAdded} />
                  </motion.div>
                )}

                {page === 'feedback' && (
                  <motion.div key="experience-feedback" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    <ExperienceFeedbackPage platform={platform} isStandalone={isStandalone} currentTrack={currentTrack} getActivePlaybackPositionMs={getActivePlaybackPositionMs} videoMode={videoMode} visualizerMode={visualizerMode} auraPreset={auraPreset} queueLength={queueLength} lyricsCount={lyricsCount} appendRecentEvent={appendRecentEvent} />
                  </motion.div>
                )}

                {page === 'profile' && (
                  <motion.div key="experience-profile" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    {selectedPublicProfile ? (
                      <div className="grid gap-4">
                        <button
                          onClick={() => setSelectedPublicProfile(null)}
                          className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/58 transition-colors hover:border-brand-accent/30 hover:text-brand-accent"
                        >
                          <ChevronLeft size={13} />
                          Back to Public Profiles
                        </button>
                        <section className="overflow-hidden rounded-[1.75rem] border border-brand-accent/20 bg-[radial-gradient(circle_at_top_left,rgba(22,247,198,0.16),transparent_34%),rgba(22,247,198,0.045)] p-6">
                          <div className="flex flex-col gap-5 md:flex-row md:items-start">
                            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] border border-white/14 text-4xl font-black text-black shadow-[0_20px_50px_rgba(0,0,0,0.35)]" style={{ background: selectedPublicProfile.avatarColor || '#16f7c6' }}>
                              {selectedPublicProfile.avatarDataUrl ? <img src={selectedPublicProfile.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : String(selectedPublicProfile.displayName || 'A').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Public Profile</div>
                              <div className="mt-2 text-4xl font-black uppercase tracking-tight text-white">{selectedPublicProfile.displayName || 'Aether Listener'}</div>
                              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-brand-accent/80">{selectedPublicProfile.handle ? `@${selectedPublicProfile.handle}` : 'public profile'}</div>
                              <p className="mt-4 max-w-3xl text-base leading-7 text-white/58">{selectedPublicProfile.bio || 'No bio shared yet.'}</p>
                            </div>
                            {selectedPublicProfile.handle && (
                              <button
                                onClick={async () => {
                                  const link = createPublicProfileLink(selectedPublicProfile.handle);
                                  if (window.aether?.clipboard?.writeText) await window.aether.clipboard.writeText(link);
                                  else await navigator.clipboard.writeText(link);
                                  flashLastAdded?.('Profile link copied', 1600, 'success');
                                }}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-brand-accent/30 bg-brand-accent/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black"
                              >
                                <Link2 size={13} />
                                Copy Link
                              </button>
                            )}
                          </div>
                          {selectedPublicProfile.stats ? (
                            <>
                              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                  ['Vaults', selectedPublicProfile.stats.vaults],
                                  ['Tracks', selectedPublicProfile.stats.tracks],
                                  ['Favorites', selectedPublicProfile.stats.favorites],
                                  ['Artists', selectedPublicProfile.stats.artists],
                                  ['Listens', selectedPublicProfile.stats.listens],
                                  ['Sessions', selectedPublicProfile.stats.sessions],
                                  ['Minutes', selectedPublicProfile.stats.minutes],
                                ].map(([label, value]) => (
                                  <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <div className="text-2xl font-black text-white">{Number(value || 0).toLocaleString()}</div>
                                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">{label}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-accent">Top Artist</div>
                                  <div className="mt-2 truncate text-lg font-black uppercase tracking-tight text-white">{selectedPublicProfile.stats.topArtist || 'Not shared yet'}</div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-accent">Top Track</div>
                                  <div className="mt-2 truncate text-lg font-black uppercase tracking-tight text-white">{selectedPublicProfile.stats.topTrack || 'Not shared yet'}</div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/48">This listener has hidden their listening stats.</div>
                          )}
                        </section>
                      </div>
                    ) : (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Identity</div>
                            <div className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Aether Profile</div>
                            <div className="mt-1 text-sm leading-6 text-white/42">Used for Party identity, share images, and public profile discovery. Private profiles stay only on this device.</div>
                        {lockStatus?.enabled ? (
                          <div className={`mt-5 rounded-[1.25rem] border p-4 ${isProfileEditUnlocked ? 'border-brand-accent/20 bg-brand-accent/[0.055]' : 'border-yellow-300/20 bg-yellow-300/[0.055]'}`}>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/48">{isProfileEditUnlocked ? 'Editing Unlocked' : 'Profile Editing Locked'}</div>
                            <div className="mt-1 text-sm leading-6 text-white/50">{isProfileEditUnlocked ? 'Profile changes are available until you close this page.' : 'Use your App Lock password or Touch ID before changing profile identity or publishing state.'}</div>
                            {!isProfileEditUnlocked && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <input
                                  type="password"
                                  value={profileUnlockPassword}
                                  onChange={(event) => setProfileUnlockPassword(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') unlockProfileEditing('password');
                                  }}
                                  className="min-w-[220px] flex-1 rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-sm font-bold text-white outline-none transition-all focus:border-brand-accent/50"
                                  placeholder="App Lock password"
                                />
                                <button
                                  onClick={() => unlockProfileEditing('password')}
                                  disabled={isProfileUnlocking || !profileUnlockPassword}
                                  className="rounded-2xl border border-brand-accent/30 bg-brand-accent/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black disabled:opacity-45"
                                >
                                  {isProfileUnlocking ? 'Checking...' : 'Unlock'}
                                </button>
                                {lockStatus?.touchIdEnabled && window.aether?.verifyAppLockBiometric && (
                                  <button
                                    onClick={() => unlockProfileEditing('biometric')}
                                    disabled={isProfileUnlocking}
                                    className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 transition-all hover:border-brand-accent/30 hover:text-brand-accent disabled:opacity-45"
                                  >
                                    Touch ID
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Edit Protection Off</div>
                              <div className="mt-1 text-sm leading-6 text-white/44">Enable App Lock if you want password or Touch ID before profile changes.</div>
                            </div>
                            <button
                              onClick={() => (isStandalone ? navigate('app-lock') : flashLastAdded?.('App Lock is available in the desktop build', 2200, 'warning'))}
                              className="rounded-2xl border border-brand-accent/25 bg-brand-accent/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black"
                            >
                              Set App Lock
                            </button>
                          </div>
                        )}
                        <input id={profileAvatarInputId} ref={avatarFileInputRef} type="file" accept="image/*" className="sr-only" onChange={onAvatarFileSelected} disabled={profileFieldsDisabled} />
                        <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-black/18 p-4">
                          <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)]">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/14 text-2xl font-black text-black" style={{ background: aetherProfile.avatarColor }}>
                            {aetherProfile.avatarDataUrl ? (
                              <img src={aetherProfile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              String(aetherProfile.displayName || 'A').trim().slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Avatar</div>
                            <div className="mt-1 text-sm leading-6 text-white/52">Upload any picture. Aether resizes it locally before saving, so your profile stays fast.</div>
                          </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <label
                              htmlFor={profileAvatarInputId}
                              aria-disabled={profileFieldsDisabled}
                              className={`cursor-pointer rounded-2xl border border-brand-accent/30 bg-brand-accent/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black ${profileFieldsDisabled ? 'pointer-events-none opacity-45' : ''}`}
                            >
                              Upload Picture
                            </label>
                            {aetherProfile.avatarDataUrl && (
                              <button
                                onClick={() => setAetherProfile((prev) => ({ ...prev, avatarDataUrl: '' }))}
                                disabled={profileFieldsDisabled}
                                className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/52 transition-all hover:border-red-400/35 hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Display Name</span>
                            <input
                              value={aetherProfile.displayName}
                              onChange={(event) => setAetherProfile((prev) => sanitizeAetherProfile({ ...prev, displayName: event.target.value }))}
                              disabled={profileFieldsDisabled}
                              className="w-full rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-sm font-bold text-white outline-none transition-all focus:border-brand-accent/50"
                              placeholder="Your listening name"
                              maxLength={32}
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Handle</span>
                            <div className="flex items-center rounded-2xl border border-white/10 bg-black/24 px-4 py-3 focus-within:border-brand-accent/50">
                              <span className="text-white/30">@</span>
                              <input
                                value={aetherProfile.handle}
                                onChange={(event) => setAetherProfile((prev) => sanitizeAetherProfile({ ...prev, handle: event.target.value }))}
                                disabled={profileFieldsDisabled}
                                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none"
                                placeholder="handle"
                                maxLength={24}
                              />
                            </div>
                          </label>
                          <label className="block md:col-span-2">
                            <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Bio</span>
                            <textarea
                              value={aetherProfile.bio}
                              onChange={(event) => setAetherProfile((prev) => sanitizeAetherProfile({ ...prev, bio: event.target.value }))}
                              disabled={profileFieldsDisabled}
                              className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition-all focus:border-brand-accent/50"
                              placeholder="A small note for your share card"
                              maxLength={140}
                            />
                          </label>
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          {['#16f7c6', '#ff6fb1', '#8aa7ff', '#ffd166', '#a78bfa', '#67e8f9'].map((color) => (
                            <button
                              key={color}
                              onClick={() => setAetherProfile((prev) => sanitizeAetherProfile({ ...prev, avatarColor: color }))}
                              disabled={profileFieldsDisabled}
                              className={`h-11 rounded-2xl border transition-all ${aetherProfile.avatarColor === color ? 'border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.14)]' : 'border-white/10 hover:border-white/28'}`}
                              style={{ background: `linear-gradient(135deg, ${color}, rgba(255,255,255,0.08))` }}
                              title={`Use ${color}`}
                            />
                          ))}
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          {[
                            ['private', 'Private'],
                            ['unlisted', 'Unlisted'],
                            ['public', 'Public'],
                          ].map(([id, label]) => (
                            <button
                              key={id}
                              onClick={() => setAetherProfile((prev) => sanitizeAetherProfile({ ...prev, visibility: id }))}
                              disabled={profileFieldsDisabled}
                              className={`rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${aetherProfile.visibility === id ? 'border-brand-accent/45 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-brand-accent/30 hover:text-brand-accent'}`}
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            onClick={() => setAetherProfile((prev) => sanitizeAetherProfile({ ...prev, shareStats: !prev.shareStats }))}
                            disabled={profileFieldsDisabled}
                            className={`rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${aetherProfile.shareStats ? 'border-brand-accent/45 bg-brand-accent/14 text-brand-accent' : 'border-white/10 bg-white/[0.035] text-white/62 hover:border-brand-accent/30 hover:text-brand-accent'}`}
                          >
                            Stats {aetherProfile.shareStats ? 'Included' : 'Hidden'}
                          </button>
                          <button
                            onClick={() => flashLastAdded?.('Profile saved on this device', 1600, 'success')}
                            disabled={profileFieldsDisabled}
                            className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 transition-all hover:border-brand-accent/30 hover:text-brand-accent disabled:opacity-45"
                          >
                            Save Local
                          </button>
                          <button
                            onClick={aetherProfile.visibility === 'private' ? onUnpublishProfile : onPublishProfile}
                            disabled={profilePublishDisabled}
                            className="rounded-2xl border border-brand-accent/35 bg-brand-accent/14 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black disabled:opacity-45"
                          >
                            {profilePublishLabel}
                          </button>
                        </div>
                        <div className="mt-3 text-[11px] leading-5 text-white/32">
                          Changes save locally as you type. Press Publish to update the public profile. Switch to Private and press Unpublish to remove it from sharing.
                        </div>
                      </section>
                      <section className="rounded-[1.5rem] border border-brand-accent/20 bg-brand-accent/[0.055] p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/18 text-2xl font-black text-black" style={{ background: aetherProfile.avatarColor }}>
                            {aetherProfile.avatarDataUrl ? (
                              <img src={aetherProfile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              String(aetherProfile.displayName || 'A').trim().slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xl font-black uppercase tracking-tight text-white">{aetherProfile.displayName}</div>
                            <div className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent/80">{aetherProfile.handle ? `@${aetherProfile.handle}` : 'No handle yet'}</div>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-white/58">{aetherProfile.bio || 'No bio yet.'}</p>
                        {aetherProfile.shareStats && (
                          <div className="mt-5 grid grid-cols-2 gap-2">
                            {[
                              ['Vaults', profileStats.vaults],
                              ['Tracks', profileStats.tracks],
                              ['Favorites', profileStats.favorites],
                              ['Artists', profileStats.artists],
                              ['Listens', profileStats.listens],
                              ['Minutes', profileStats.minutes],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-2xl border border-white/10 bg-black/18 p-3 text-center">
                                <div className="text-lg font-black text-white">{Number(value || 0).toLocaleString()}</div>
                                <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/35">{label}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(22,247,198,0.12),rgba(255,255,255,0.035))] p-4">
                          <div className="text-[8px] font-black uppercase tracking-[0.22em] text-brand-accent/80">Share Preview</div>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-black text-black" style={{ background: aetherProfile.avatarColor }}>
                              {aetherProfile.avatarDataUrl ? <img src={aetherProfile.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : String(aetherProfile.displayName || 'A').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black uppercase tracking-tight text-white">{aetherProfile.displayName}</div>
                              <div className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent/75">{aetherProfile.handle ? `@${aetherProfile.handle}` : 'No handle yet'}</div>
                            </div>
                          </div>
                          <div className="mt-3 text-[11px] leading-5 text-white/48">{aetherProfile.bio || 'No bio yet.'}</div>
                          {aetherProfile.shareStats && (
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                              {[
                                ['Vaults', profileStats.vaults],
                                ['Tracks', profileStats.tracks],
                                ['Likes', profileStats.favorites],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-xl border border-white/10 bg-black/18 px-2 py-2">
                                  <div className="text-sm font-black text-white">{Number(value || 0).toLocaleString()}</div>
                                  <div className="text-[7px] font-black uppercase tracking-[0.14em] text-white/32">{label}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={onCopyProfileCard}
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-accent/35 bg-brand-accent/14 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black"
                        >
                          <Copy size={13} />
                          Copy Share Image
                        </button>
                        <button
                          onClick={onSaveProfileCard}
                          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 transition-all hover:border-brand-accent/30 hover:text-brand-accent"
                        >
                          <Download size={13} />
                          Save PNG
                        </button>
                        {profileShareLink && (
                          <button
                            onClick={onCopyProfileLink}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 transition-all hover:border-brand-accent/30 hover:text-brand-accent"
                          >
                            <Link2 size={13} />
                            Copy Profile Link
                          </button>
                        )}
                        {profileShareLink && (
                          <button
                            onClick={onCopyProfileLink}
                            className="mt-3 block w-full break-all rounded-2xl border border-white/10 bg-black/18 p-3 text-left text-[10px] font-mono leading-5 text-white/42 transition-colors hover:border-brand-accent/30 hover:text-brand-accent"
                            title="Copy profile link"
                          >
                            {profileShareLink}
                          </button>
                        )}
                      </section>
                      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 xl:col-span-2">
                        {selectedPublicProfile ? (
                          <div>
                            <button
                              onClick={() => setSelectedPublicProfile(null)}
                              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/58 transition-colors hover:border-brand-accent/30 hover:text-brand-accent"
                            >
                              <ChevronLeft size={13} />
                              Back to Results
                            </button>
                            <div className="rounded-[1.35rem] border border-brand-accent/18 bg-brand-accent/[0.055] p-5">
                              <div className="flex flex-wrap items-start gap-4">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl text-2xl font-black text-black" style={{ background: selectedPublicProfile.avatarColor || '#16f7c6' }}>
                                  {selectedPublicProfile.avatarDataUrl ? <img src={selectedPublicProfile.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : String(selectedPublicProfile.displayName || 'A').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-2xl font-black uppercase tracking-tight text-white">{selectedPublicProfile.displayName}</div>
                                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent/80">{selectedPublicProfile.handle ? `@${selectedPublicProfile.handle}` : 'public profile'}</div>
                                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/56">{selectedPublicProfile.bio || 'No bio shared yet.'}</p>
                                </div>
                              </div>
                              {selectedPublicProfile.stats && (
                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                  {[
                                    ['Vaults', selectedPublicProfile.stats.vaults],
                                    ['Tracks', selectedPublicProfile.stats.tracks],
                                    ['Favorites', selectedPublicProfile.stats.favorites],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-2xl border border-white/10 bg-black/18 p-4 text-center">
                                      <div className="text-2xl font-black text-white">{value}</div>
                                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">{label}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {selectedPublicProfile.handle && (
                                <button
                                  onClick={async () => {
                                    const link = `${AETHER_PROFILE_API_BASE}/v1/profile/handle/${selectedPublicProfile.handle}`;
                                    if (window.aether?.clipboard?.writeText) await window.aether.clipboard.writeText(link);
                                    else await navigator.clipboard.writeText(link);
                                    flashLastAdded?.('Profile link copied', 1600, 'success');
                                  }}
                                  className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-brand-accent/30 bg-brand-accent/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black"
                                >
                                  <Link2 size={13} />
                                  Copy Profile Link
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="min-w-[220px] flex-1">
                                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-accent">Public Profiles</div>
                                <div className="mt-1 text-sm text-white/42">Search profiles that other users marked Public. Click a result to open the profile page here.</div>
                              </div>
                              <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-black/24 px-4 py-3 focus-within:border-brand-accent/50">
                                <Search size={14} className="shrink-0 text-white/32" />
                                <input
                                  value={profileSearchQuery}
                                  onChange={(event) => setProfileSearchQuery(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      searchPublicProfiles();
                                    }
                                  }}
                                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none"
                                  placeholder="Search handles or names"
                                />
                                <button
                                  onClick={searchPublicProfiles}
                                  disabled={isProfileSearching}
                                  className="rounded-xl border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-brand-accent disabled:opacity-45"
                                >
                                  {isProfileSearching ? 'Searching...' : 'Search'}
                                </button>
                              </div>
                            </div>
                            {profileSearchResults.length > 0 && (
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {profileSearchResults.map((profile, index) => (
                                  <button key={profile.id || profile.handle || `profile-result-${index}`} onClick={() => setSelectedPublicProfile(profile)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/18 p-3 text-left transition-all hover:border-brand-accent/30 hover:bg-brand-accent/[0.05]">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-black text-black" style={{ background: profile.avatarColor || '#16f7c6' }}>
                                      {profile.avatarDataUrl ? <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" /> : String(profile.displayName || 'A').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm font-black text-white">{profile.displayName}</div>
                                      <div className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-brand-accent/70">{profile.handle ? `@${profile.handle}` : 'public profile'}</div>
                                      <div className="mt-1 truncate text-[10px] text-white/34">
                                        {profile.stats ? `${profile.stats.vaults} vaults - ${profile.stats.tracks} tracks - ${profile.stats.favorites} favorites` : 'Listening stats hidden'}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </section>
                    </div>
                    )}
                  </motion.div>
                )}

                {page === 'recap' && (
                  <motion.div key="experience-recap" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    <div className="grid gap-4">
                      <ExperiencePageIntro category="Listening Recap" title="Aether Recap" subtitle="Weekly and monthly highlights from your Signal Ledger." icon={Activity} />
                      <section className="rounded-[1.5rem] border border-brand-accent/18 bg-brand-accent/[0.055] p-5">
                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                          {[
                            ['Listens', profileStats?.listens],
                            ['Minutes', profileStats?.minutes],
                            ['Artists', profileStats?.artists],
                            ['Vaults', profileStats?.vaults],
                            ['Tracks', profileStats?.tracks],
                            ['Sessions', soundLedgerView?.totalSessions],
                          ].map(([label, value]) => <HealthMetricCard key={label} label={label} value={value} tone="good" />)}
                        </div>
                      </section>
                      <section className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-accent">Top Artists</div>
                          <div className="mt-3 space-y-2">
                            {(soundLedgerView?.topArtists || []).slice(0, 5).map(([artist, entry], index) => (
                              <div key={artist || `profile-artist-${index}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                <div className="text-sm font-black uppercase tracking-tight text-white">{index + 1}. {artist || 'Unknown artist'}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">{Math.max(0, Number(entry?.count) || 0)} plays</div>
                              </div>
                            ))}
                            {(soundLedgerView?.topArtists || []).length === 0 && <div className="text-sm text-white/40">Play a few tracks and your recap will fill in here.</div>}
                          </div>
                        </div>
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-accent">Replay Pulse</div>
                          <div className="mt-3 space-y-2">
                            {(soundLedgerView?.topTracks || []).slice(0, 5).map(([track, entry], index) => (
                              <div key={track || `profile-track-${index}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                <div className="truncate text-sm font-black uppercase tracking-tight text-white">{index + 1}. {entry?.title || track}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">{Math.max(0, Number(entry?.count) || 0)} listens</div>
                              </div>
                            ))}
                            {(soundLedgerView?.topTracks || []).length === 0 && <div className="text-sm text-white/40">No repeated tracks yet.</div>}
                          </div>
                        </div>
                      </section>
                    </div>
                  </motion.div>
                )}

                {page === 'recovery' && (
                  <motion.div key="experience-recovery" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    <div className="grid gap-4">
                      <ExperiencePageIntro category="Recovery Center" title="Fix Aether" subtitle="Repair local helpers, permissions, runtime checks, and recent app errors." icon={AlertTriangle} />
                      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <HealthMetricCard label="yt-dlp" value={engineStatus?.ytDlpReady ? 1 : 0} tone={engineStatus?.ytDlpReady ? 'good' : 'danger'} title={engineStatus?.ytDlpPath || 'yt-dlp path unavailable'} />
                          <HealthMetricCard label="FFmpeg" value={engineStatus?.ffmpegReady ? 1 : 0} tone={engineStatus?.ffmpegReady ? 'good' : 'warn'} title={engineStatus?.ffmpegPath || 'FFmpeg path unavailable'} />
                          <HealthMetricCard label="Errors" value={[diagnostics?.lastQueueError, diagnostics?.lastSystemError, diagnostics?.lastLyricsError].filter(Boolean).length} tone={[diagnostics?.lastQueueError, diagnostics?.lastSystemError, diagnostics?.lastLyricsError].some(Boolean) ? 'warn' : 'good'} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button onClick={handleRunRuntimeRepair} disabled={isRuntimeRepairing || !isStandalone} className="rounded-2xl border border-brand-accent/30 bg-brand-accent/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black disabled:opacity-45" title="Automatically repair local playback/download helpers">{isRuntimeRepairing ? 'Repairing...' : 'Repair Runtime'}</button>
                          <button onClick={() => navigate('diagnostics')} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 transition-all hover:border-brand-accent/35 hover:text-brand-accent">Open Diagnostics</button>
                        </div>
                        <div className="mt-4 rounded-2xl border border-white/8 bg-black/18 p-4 text-sm leading-6 text-white/45">
                          If downloads, playback helpers, clipboard image sharing, camera permission, or local imports fail, Aether will surface the issue here and offer the safest automatic repair it has.
                        </div>
                      </section>
                    </div>
                  </motion.div>
                )}

                {page === 'diagnostics' && (
                  <motion.div key="experience-diagnostics" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    <div className="grid gap-4">
                      <ExperiencePageIntro category="System Health" title="Diagnostics" subtitle="Runtime status, recent errors, helper paths, and app health signals." icon={Monitor} />
                      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <HealthMetricCard label="Queue Poll" value={Number.parseInt(queuePollDisplay, 10) || 0} tone={diagnostics?.lastQueueError ? 'danger' : 'good'} title={`Last queue poll: ${queuePollTime || 'local'}`} />
                          <HealthMetricCard label="System ms" value={diagnostics?.lastSystemFetchMs || 0} tone={diagnostics?.lastSystemError ? 'danger' : 'neutral'} />
                          <HealthMetricCard label="Lyrics ms" value={diagnostics?.lastLyricsFetchMs || 0} tone={diagnostics?.lastLyricsError ? 'danger' : 'neutral'} />
                          <HealthMetricCard label="Guard Hits" value={diagnostics?.transportGuardHits || 0} tone={(diagnostics?.transportGuardHits || 0) > 0 ? 'warn' : 'good'} />
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent">Runtime</div>
                            <div className="mt-3 space-y-2 text-[11px] leading-5 text-white/52">
                              <div>API: <button onClick={() => handleCopyDiagnosticsValue?.(diagnosticsApiBase, 'API base copied')} className="break-all text-left font-mono text-white/72 hover:text-brand-accent">{diagnosticsApiBase || 'local'}</button></div>
                              <div>Queue: <span className="font-mono text-white/70">{queuePollDisplay}</span> <span className="text-white/32">{queuePollTime}</span></div>
                              <div>Lyrics source: <span className="font-mono text-white/70">{diagnostics?.lastLyricsSource || 'none'}</span></div>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-accent">Helpers</div>
                            <div className="mt-3 space-y-2 text-[11px] leading-5 text-white/52">
                              <button onClick={() => engineStatus?.ytDlpPath && handleCopyDiagnosticsValue?.(engineStatus.ytDlpPath, 'yt-dlp path copied')} className="block w-full truncate text-left font-mono text-white/68 hover:text-brand-accent">yt-dlp: {engineStatus?.ytDlpPath || 'not resolved'}</button>
                              <button onClick={() => engineStatus?.ffmpegPath && handleCopyDiagnosticsValue?.(engineStatus.ffmpegPath, 'FFmpeg path copied')} className="block w-full truncate text-left font-mono text-white/68 hover:text-brand-accent">ffmpeg: {engineStatus?.ffmpegPath || 'not resolved'}</button>
                              <button onClick={handleRunRuntimeRepair} disabled={isRuntimeRepairing || !isStandalone} className="mt-2 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-brand-accent transition-all hover:bg-brand-accent hover:text-black disabled:opacity-45">{isRuntimeRepairing ? 'Repairing...' : 'Repair Runtime'}</button>
                            </div>
                          </div>
                        </div>
                        {(diagnostics?.lastQueueError || diagnostics?.lastSystemError || diagnostics?.lastLyricsError) && (
                          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-4 text-sm leading-6 text-red-100/80">
                            {diagnostics.lastQueueError || diagnostics.lastSystemError || diagnostics.lastLyricsError}
                          </div>
                        )}
                      </section>
                      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-accent">Recent Events</div>
                            <div className="mt-1 text-xs text-white/40">Useful when playback, imports, or runtime helpers misbehave.</div>
                          </div>
                          <button onClick={onClearDiagnosticEvents} className="rounded-xl border border-red-400/20 bg-red-500/[0.055] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-red-200/80 transition-all hover:border-red-400/40 hover:text-red-100">Clear Events</button>
                        </div>
                        <div className="mt-4 grid gap-2">
                          {(skipEvents || []).length === 0 ? (
                            <div className="rounded-2xl border border-white/8 bg-black/18 p-5 text-center text-sm text-white/38">No diagnostic events yet.</div>
                          ) : (skipEvents || []).slice(-10).reverse().map((event, index) => (
                            <div key={`${event.at || 0}-${index}`} className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-accent">{event.label || 'event'}</div>
                                <div className="text-[9px] font-mono text-white/34">{event.at ? new Date(event.at).toLocaleTimeString() : 'now'}</div>
                              </div>
                              <div className="mt-1 text-xs leading-5 text-white/48">{event.detail || event.title || 'No details'}</div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </motion.div>
                )}

                {page === 'setup' && (
                  <motion.div key="experience-setup" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    <div className="grid gap-4">
                      <ExperiencePageIntro category="First-Run Setup" title="Setup Checklist" subtitle="You can relaunch this anytime from Experience Center." icon={Sparkles} />
                      <section className="grid gap-3 md:grid-cols-2">
                        {[
                          ['Profile + Avatar', 'Create your Party/public identity.', User, () => navigate('profile')],
                          ['Import Music', 'Bring in local files, playlists, and lyrics.', Upload, openMusicImport],
                          ['Studio Library', 'Review vault health and offline readiness.', HardDrive, () => openLibraryOverlay?.()],
                          ['Shortcuts', 'Set playback and command keys.', Keyboard, () => navigate('shortcut-settings')],
                          ['Recovery Center', 'Check helpers and repair runtime.', AlertTriangle, () => navigate('recovery')],
                          ['App Lock', 'Protect private settings and profile edits.', Lock, () => navigate('app-lock')],
                        ].map(([title, detail, Icon, run]) => (
                          <button key={title} onClick={run} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-left transition-all hover:border-brand-accent/35 hover:bg-brand-accent/[0.055]">
                            <Icon size={18} className="text-brand-accent" />
                            <div className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-white">{title}</div>
                            <div className="mt-1 text-xs leading-5 text-white/42">{detail}</div>
                          </button>
                        ))}
                      </section>
                    </div>
                  </motion.div>
                )}

                {page === 'gesture-face-lab' && (
                  <motion.div key="experience-gesture-face-lab" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    <ExperienceGestureFaceLabPage isGestureControlEnabled={isGestureControlEnabled} setIsGestureControlEnabled={setIsGestureControlEnabled} isFaceControlEnabled={isFaceControlEnabled} setIsFaceControlEnabled={setIsFaceControlEnabled} faceControlStatus={faceControlStatus} faceControlSignal={faceControlSignal} cameraHandSignal={cameraHandSignal} setLastAdded={flashLastAdded} />
                  </motion.div>
                )}

                {page === 'app-lock' && (
                  <motion.div key="experience-app-lock" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    <ExperienceAppLockPage isStandalone={isStandalone} lockStatus={lockStatus} lockIdleMinutes={lockIdleMinutes} setLockIdleMinutes={setLockIdleMinutes} refreshLockStatus={refreshLockStatus} setIsAppLocked={setIsAppLocked} setLastAdded={flashLastAdded} requestDestructiveConfirmation={requestDestructiveConfirmation} />
                  </motion.div>
                )}

                {page === 'shortcut-settings' && (
                  <motion.div key="experience-shortcut-settings" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.16 }}>
                    <ExperienceShortcutSettingsPage shortcuts={shortcuts} shortcutDraft={shortcutDraft} setShortcutDraft={setShortcutDraft} shortcutSettingsError={shortcutSettingsError} setShortcutSettingsError={setShortcutSettingsError} globalMediaShortcutsEnabled={globalMediaShortcutsEnabled} setGlobalMediaShortcutsEnabled={setGlobalMediaShortcutsEnabled} saveShortcutSettings={saveShortcutSettings} isShortcutSettingsSaving={isShortcutSettingsSaving} resetShortcutSettingsToDefaults={resetShortcutSettingsToDefaults} isMacPlatform={isMacPlatform} openTipsOverlay={openTipsOverlay} requestDestructiveConfirmation={requestDestructiveConfirmation} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
});
