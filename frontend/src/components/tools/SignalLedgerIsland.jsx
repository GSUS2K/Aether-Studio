import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, AlertTriangle, Camera, Check, Copy, Download, Eye, EyeOff, Fingerprint, Keyboard, Lock, MessageSquare, Music, RefreshCw, Send, Signal, Trash2, X } from 'lucide-react';
import { API_BASE, DEFAULT_FEEDBACK_DRAFT, FEEDBACK_ISSUE_URL, FEEDBACK_STORAGE_KEY, PLAYBACK_LEDGER_STORAGE_KEY } from '../../config/aetherConfig';
import { buildCanonicalShortcutCombo, DEFAULT_SHORTCUTS, getEventKeyToken, sanitizeShortcutMap, SHORTCUT_FIELDS, toReadableShortcut } from '../../utils/shortcuts';
import { formatBytes, formatTime } from '../../utils/format';
import { createPlaybackLedgerData, formatPlaybackDuration, getLocalDateKey, normalizePlaybackLedgerData, scoreLedgerPayload } from '../../utils/playbackLedger';
import { clamp01 } from '../../utils/visualMath';

export const SignalLedgerIsland = memo(forwardRef(function SignalLedgerIsland({
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
  const [isSyncingLedger, setIsSyncingLedger] = useState(false);
  const ledgerMountedRef = useRef(true);
  const ledgerRefreshIntervalRef = useRef(0);
  const ledgerLiveIntervalRef = useRef(0);

  useEffect(() => () => {
    ledgerMountedRef.current = false;
    if (ledgerRefreshIntervalRef.current) window.clearInterval(ledgerRefreshIntervalRef.current);
    if (ledgerLiveIntervalRef.current) window.clearInterval(ledgerLiveIntervalRef.current);
    ledgerRefreshIntervalRef.current = 0;
    ledgerLiveIntervalRef.current = 0;
  }, []);

  const loadLedger = useCallback(async () => {
    try {
      setLedgerError('');
      const candidates = [];
      if (window.aether?.store?.get) {
        candidates.push(await window.aether.store.get(PLAYBACK_LEDGER_STORAGE_KEY));
      }
      if (window.aether?.getPlaybackLedger) {
        candidates.push(await window.aether.getPlaybackLedger());
      }
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(PLAYBACK_LEDGER_STORAGE_KEY);
        if (raw) candidates.push(JSON.parse(raw));
      }
      try {
        // Temporary debug logs to help trace why Sync shows empty
        // Prints raw candidate payloads before scoring
        // Visible in renderer DevTools console when clicking Sync
        // and in terminal when running the dev server
        // eslint-disable-next-line no-console
        console.debug('[Aether] Ledger candidates (raw)', candidates);
      } catch (e) {}
      const bestCandidate = candidates
        .map((payload) => scoreLedgerPayload(payload))
        .sort((left, right) => right.score - left.score)[0] || scoreLedgerPayload(null);
      try {
        // eslint-disable-next-line no-console
        console.debug('[Aether] Ledger bestCandidate', bestCandidate && { score: bestCandidate.score, dataSummary: { totalPlays: bestCandidate.data.totalPlays, totalMs: bestCandidate.data.totalMs, tracks: Object.keys(bestCandidate.data.tracks || {}).length } });
      } catch (e) {}
      const normalized = bestCandidate.data;
      if (!ledgerMountedRef.current) return normalized;
      setSoundCapsuleData(normalized);
      setLastUpdatedAt(Date.now());
      if (window.aether?.store?.set) {
        try {
          await window.aether.store.set(PLAYBACK_LEDGER_STORAGE_KEY, normalized);
        } catch (syncError) {
          console.warn('[Aether] Failed to persist Signal Ledger after refresh', syncError);
        }
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(PLAYBACK_LEDGER_STORAGE_KEY, JSON.stringify(normalized));
        } catch { }
      }
      return normalized;
    } catch (error) {
      if (!ledgerMountedRef.current) return normalizePlaybackLedgerData(null);
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
    if (isSyncingLedger) return;
    setIsSyncingLedger(true);
    try {
      const res = await loadLedger();
      const committed = normalizePlaybackLedgerData(res);
      if (ledgerMountedRef.current) {
        setSoundCapsuleData(committed);
        setLastUpdatedAt(Date.now());
      }
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
      }
      if (typeof localStorage !== 'undefined') {
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
    if (ledgerRefreshIntervalRef.current || ledgerLiveIntervalRef.current) {
      console.warn('[Aether/Perf] Signal Ledger refresh timers were already active; replacing stale timers.');
      if (ledgerRefreshIntervalRef.current) window.clearInterval(ledgerRefreshIntervalRef.current);
      if (ledgerLiveIntervalRef.current) window.clearInterval(ledgerLiveIntervalRef.current);
    }
    ledgerRefreshIntervalRef.current = window.setInterval(loadLedger, 5000);
    ledgerLiveIntervalRef.current = window.setInterval(() => setLiveTick((tick) => tick + 1), 2500);
    return () => {
      if (ledgerRefreshIntervalRef.current) window.clearInterval(ledgerRefreshIntervalRef.current);
      if (ledgerLiveIntervalRef.current) window.clearInterval(ledgerLiveIntervalRef.current);
      ledgerRefreshIntervalRef.current = 0;
      ledgerLiveIntervalRef.current = 0;
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
              <button onClick={syncLedger} disabled={isSyncingLedger} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 transition-colors hover:border-brand-accent/35 hover:text-brand-accent disabled:opacity-50" title="Refresh ledger">
                <RefreshCw size={13} className={isSyncingLedger ? 'animate-spin' : ''} /> {isSyncingLedger ? 'Syncing...' : 'Sync'}
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
                  {soundLedgerView.recentWeek.map((entry, index) => (
                    <div key={entry.key || `ledger-week-${index}`} className="performance-list-item flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-black/20 px-2 py-3">
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
                  {soundLedgerView.recentSessions.length > 0 ? soundLedgerView.recentSessions.map((session, index) => (
                    <div key={session.id || `ledger-session-${index}`} className="performance-list-item flex min-w-0 items-center gap-3 rounded-[1.25rem] border border-white/10 bg-black/20 p-3">
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
                  ['Top Artists', soundLedgerView.topArtists.map(([name, entry], idx) => ({ key: name || `ledger-artist-${idx}`, title: name || 'Unknown artist', meta: `#${idx + 1} - ${entry.count} plays`, detail: formatPlaybackDuration(entry.totalMs) }))],
                  ['Most Replayed', soundLedgerView.topTracks.map(([id, entry], idx) => ({ key: id || `ledger-track-${idx}`, title: entry.title, meta: `#${idx + 1} - ${entry.count} plays`, detail: entry.author, thumbnail: entry.thumbnail }))],
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
