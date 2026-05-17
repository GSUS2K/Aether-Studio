import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Rewind, X, Send, Crown, Users, Music2, MessageSquare, Copy, Check, SkipBack, Wifi, AlertTriangle, ChevronRight, Search, UserPlus, Loader2, Lock, Volume2, VolumeX, Mic, MicOff, ListMusic, Radio, ThumbsUp, ThumbsDown, Music, Hash, Plus, Shuffle, UserMinus, Trash2 } from 'lucide-react';
import { getSocket, connectSocket, disconnectSocket } from './partySocket';
import bs58 from 'bs58';
import './PartyMode.css';

const initials = (name) => String(name || '?').trim().slice(0, 2).toUpperCase();
const fmt = (ms) => { const s = Math.floor((ms||0)/1000); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const stored = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

export default function PartyMode({ open, onClose, hostTrack, hostLiveLyric, hostLyrics, hostLyricOffsetMs, onLyricOffsetChange, hostPositionMs, hostIsPlaying, hostIsBuffering, hostQueue, hostPlaylists, onHostUpdateQueue, onHostControl, onHostPlayTrack, onPartyStateChange }) {
  const [tab, setTab] = useState('create');
  const [displayName, setDisplayName] = useState(() => stored('aether.party.name', ''));
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [joinKey, setJoinKey] = useState('');
  const [partyState, setPartyState] = useState(null); // null = not in party
  const [role, setRole] = useState(null); // 'host' | 'member'
  const [myId] = useState(() => stored('aether.party.uid', crypto.randomUUID()));
  const [chatInput, setChatInput] = useState('');
  const [requests, setRequests] = useState([]); // host sees pending requests
  const [hostLeaving, setHostLeaving] = useState(null); // { members }
  const [idleWarn, setIdleWarn] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [volume, setVolume] = useState(100);
  const [memberAction, setMemberAction] = useState(null); // null | 'song' | 'skip'
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [sentReaction, setSentReaction] = useState(null);
  const memberSearchTimerRef = useRef(null);
  const [showLyricSync, setShowLyricSync] = useState(false);
  const searchTimerRef = useRef(null);
  const chatEndRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const lastSyncedTrackIdRef = useRef(null);
  const syncCooldownRef = useRef(false);

  const [socketUrl, setSocketUrl] = useState(null);
  const [hostLeftTab, setHostLeftTab] = useState('search'); // 'search' | 'queue' | 'playlists'

  useEffect(() => { localStorage.setItem('aether.party.uid', myId); }, [myId]);
  useEffect(() => { if (displayName) localStorage.setItem('aether.party.name', displayName); }, [displayName]);
  useEffect(() => { onPartyStateChange?.(partyState); }, [partyState, onPartyStateChange]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [partyState?.chat]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape' && !partyState) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, partyState, onClose]);

  // Socket listener setup function
  const attachSocketListeners = (s) => {
    // Clear any existing listeners to prevent duplicates
    ['party:created','party:joined','party:error','party:sync','party:message',
     'party:member-update','party:host-changed','party:request-notify',
     'party:request-result','party:host-leaving','party:closed','party:idle-warning']
      .forEach(e => s.off(e));

    s.on('party:created', ({ partyId, key, state }) => {
      setConnecting(false);
      setPartyState(prev => ({ ...prev, ...state, partyId, partyKey: key }));
      setRole('host');
      setError('');
    });
    s.on('party:joined', ({ state }) => {
      setConnecting(false);
      setPartyState(prev => ({ ...prev, ...state }));
      setRole('member');
      setError('');
    });
    s.on('party:error', ({ message }) => { setConnecting(false); setError(message); });
    s.on('party:sync', (data) => {
      setPartyState(prev => prev ? { ...prev, currentTrack: data.track, positionMs: data.positionMs, isPlaying: data.isPlaying, syncTimestamp: data.timestamp, liveLyric: data.liveLyric || null } : prev);
    });
    s.on('party:message', (msg) => {
      setPartyState(prev => {
        if (!prev) return prev;
        if (msg.userId === myId && msg.localId) {
          const localIdx = (prev.chat || []).findIndex(c => c.id === msg.localId);
          if (localIdx >= 0) {
            const newChat = [...prev.chat];
            newChat[localIdx] = { ...msg, status: 'sent' };
            return { ...prev, chat: newChat };
          }
        }
        return { ...prev, chat: [...(prev.chat || []), { ...msg, status: 'sent' }] };
      });
    });
    s.on('party:member-update', ({ members }) => {
      setPartyState(prev => prev ? { ...prev, members } : prev);
    });
    s.on('party:host-changed', ({ newHostId, members }) => {
      setPartyState(prev => prev ? { ...prev, hostId: newHostId, members } : prev);
      if (newHostId === myId) setRole('host');
      setHostLeaving(null);
    });
    s.on('party:request-notify', (req) => setRequests(prev => [...prev, req]));
    s.on('party:request-result', ({ requestId, approved, type, value, userId }) => {
      setRequests(prev => prev.filter(r => r.id !== requestId));
    });
    s.on('party:host-leaving', ({ members }) => setHostLeaving({ members }));
    s.on('party:closed', () => { leaveCleanup(); });
    s.on('party:idle-warning', () => setIdleWarn(true));
  };

  // Host sync: push playback state + live lyric every 500ms
  useEffect(() => {
    if (!partyState || role !== 'host') return;
    const s = getSocket();
    let lastEmitted = null;
    const push = (action = 'sync') => {
      const payload = {
        partyId: partyState.partyId, userId: myId, action,
        track: hostTrack, positionMs: hostPositionMs, isPlaying: hostIsPlaying,
        liveLyric: hostLiveLyric || null,
      };
      // Skip redundant syncs (same track, same play state, position within 1s)
      if (action === 'sync' && lastEmitted) {
        const sameTrack = lastEmitted.track?.id === hostTrack?.id;
        const samePlaying = lastEmitted.isPlaying === hostIsPlaying;
        const posClose = Math.abs((lastEmitted.positionMs || 0) - hostPositionMs) < 1000;
        const sameLyric = lastEmitted.liveLyric === (hostLiveLyric || null);
        if (sameTrack && samePlaying && posClose && sameLyric) return;
      }
      lastEmitted = payload;
      s.emit('party:control', payload);
    };
    push('sync');
    syncIntervalRef.current = setInterval(() => push('sync'), 500);
    return () => clearInterval(syncIntervalRef.current);
  }, [partyState?.partyId, role, hostTrack, hostIsPlaying, hostPositionMs, hostLiveLyric, myId]);

  // Apply synced state to local player for members
  useEffect(() => {
    if (!partyState || role !== 'member') return;

    const track = partyState.currentTrack;
    if (track && track.id !== lastSyncedTrackIdRef.current) {
      lastSyncedTrackIdRef.current = track.id;
      // We wrap in a cooldown so that we don't spam the player if it reconnects
      if (!syncCooldownRef.current) {
        syncCooldownRef.current = true;
        onHostPlayTrack?.(track);
        setTimeout(() => { syncCooldownRef.current = false; }, 2000);
      }
    }
    
    // Sync play/pause state
    if (partyState.isPlaying !== undefined) {
       onHostControl?.(partyState.isPlaying ? 'resume' : 'pause');
    }
    
    // Sync seek (if delta > 3s)
    if (partyState.positionMs !== undefined) {
        onHostControl?.(`seek:${partyState.positionMs}`);
    }
  }, [partyState?.currentTrack?.id, partyState?.isPlaying, partyState?.positionMs, role, onHostPlayTrack, onHostControl]);

  function leaveCleanup() {
    clearInterval(syncIntervalRef.current);
    setPartyState(null);
    setRole(null);
    setRequests([]);
    setHostLeaving(null);
    setIdleWarn(false);
    lastSyncedTrackIdRef.current = null;
    setSocketUrl(null);
    disconnectSocket();
  }

  async function handleCreate() {
    if (!displayName.trim()) return setError('Enter a display name.');
    setError(''); setConnecting(true);
    
    try {
      const res = await window.aether.startPartyServer(displayName.trim());
      if (!res.success) throw new Error(res.error || 'Failed to start tunnel');
      
      // Encode the URL to a short base58 string to use as the public-facing code
      const shortCode = bs58.encode(new TextEncoder().encode(res.url));
      
      // We set the URL so it's tracked if needed
      setSocketUrl(res.url);
      
      // Wait for socket to connect before emitting create
      const s = connectSocket(res.url);
      attachSocketListeners(s);
      
      const doCreate = () => {
        s.emit('party:create', { userId: myId, displayName: displayName.trim(), isPrivate, avatar: null });
        setPartyState(prev => prev ? { ...prev, partyCode: shortCode } : { partyCode: shortCode });
      };
      
      if (s.connected) doCreate();
      else s.once('connect', doCreate);
      
      // Timeout
      setTimeout(() => {
        if (!s.connected) {
          setConnecting(false);
          setError('Connection to tunnel timed out. Trying again usually works!');
        }
      }, 25000);

    } catch (err) {
      setError(err.message || 'Could not start server');
      setConnecting(false);
    }
  }

  async function handleJoin() {
    if (!displayName.trim()) return setError('Enter a display name.');
    if (!joinId.trim()) return setError('Enter a party ID or code.');
    setError(''); setConnecting(true);

    let targetId = joinId.trim();
    let urlToConnect = 'http://localhost:4444';

    try {
        // Try decoding base58 code back to a URL
        const decodedBytes = bs58.decode(targetId);
        const decodedUrl = new TextDecoder().decode(decodedBytes);
        if (decodedUrl.startsWith('http')) {
            urlToConnect = decodedUrl;
        }
    } catch (e) {
        try {
            const resUrl = await window.aether.partyResolveCode(targetId);
            urlToConnect = resUrl;
        } catch(err) {
            console.warn("Failed to resolve base58 code locally, maybe it is a raw ID.", err);
        }
    }

    setSocketUrl(urlToConnect);
    const s = connectSocket(urlToConnect);
    attachSocketListeners(s);
    
    const doJoin = () => {
      s.emit('party:join', { partyId: targetId, key: joinKey.trim(), userId: myId, displayName: displayName.trim(), avatar: null });
      setPartyState(prev => prev ? { ...prev, partyCode: targetId } : { partyCode: targetId });
    };
    
    if (s.connected) doJoin();
    else s.once('connect', doJoin);
    
    setTimeout(() => {
      if (!s.connected) {
        setConnecting(false);
        setError('Connection timed out.');
      }
    }, 15000);
  }

  function sendChat() {
    if (!chatInput.trim() || !partyState) return;
    const message = chatInput.trim();
    const msgId = `local_${Date.now()}`;
    const msg = { id: msgId, type: 'chat', userId: myId, displayName, message, ts: Date.now(), status: 'sending' };
    // Optimistically add to local chat immediately
    setPartyState(prev => prev ? { ...prev, chat: [...(prev.chat || []), msg] } : prev);
    getSocket().emit('party:chat', { partyId: partyState.partyId, userId: myId, displayName, message, localId: msgId });
    setChatInput('');
  }

  function sendRequest(type, value = null) {
    if (!partyState) return;
    getSocket().emit('party:request', { partyId: partyState.partyId, userId: myId, displayName, type, value });
  }

  function respondRequest(requestId, approved) {
    const req = requests.find(r => r.id === requestId);
    getSocket().emit('party:request-respond', { partyId: partyState.partyId, userId: myId, requestId, approved });
    setRequests(prev => prev.filter(r => r.id !== requestId));
    if (approved && req) {
      if (req.type === 'skip') onHostControl?.('skip');
      if (req.type === 'song' && req.value?.track) onHostPlayTrack?.(req.value.track);
    }
  }

  function transferHost(newHostId) {
    getSocket().emit('party:transfer-host', { partyId: partyState.partyId, userId: myId, newHostId });
    setHostLeaving(null);
    setRole('member');
  }

  function kickMember(targetId) {
    getSocket().emit('party:kick', { partyId: partyState.partyId, userId: myId, targetId });
  }

  function leaveParty(close = false) {
    if (partyState) getSocket().emit('party:leave', { partyId: partyState.partyId, userId: myId });
    if (role === 'host') {
      window.aether?.stopPartyServer?.();
    }
    leaveCleanup();
    if (close) onClose();
  }

  // Use same copy logic as copyVaultSceneEmbed in App.jsx
  async function copyTextToClipboard(text) {
    try {
      if (window.aether?.clipboard?.writeText) {
        await window.aether.clipboard.writeText(text);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const fallback = document.createElement('textarea');
        fallback.value = text;
        fallback.style.position = 'fixed';
        fallback.style.left = '-9999px';
        fallback.style.top = '-9999px';
        document.body.appendChild(fallback);
        fallback.focus();
        fallback.select();
        document.execCommand('copy');
        fallback.remove();
      }
    } catch (err) {
      console.error('[Party] Failed to copy text', err);
    }
  }

  function copyId() {
    const code = partyState?.partyCode || partyState?.partyId;
    copyTextToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function copyInvite() {
    const code = partyState?.partyCode || partyState?.partyId;
    const lines = [
      `Join my Aether party!`,
      `Party Code: ${code}`,
      partyState?.partyKey ? `Key: ${partyState.partyKey}` : null,
      `Open Aether > Party > Join Party`,
    ].filter(Boolean).join('\n');
    copyTextToClipboard(lines);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  function doMemberSearch(q) {
    clearTimeout(memberSearchTimerRef.current);
    if (!q.trim()) { setMemberSearchResults([]); return; }
    setMemberSearching(true);
    memberSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = window.aether?.search
          ? await window.aether.search(q)
          : await fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json());
        const tracks = Array.isArray(res) ? res : (Array.isArray(res?.songs) ? res.songs : []);
        setMemberSearchResults(tracks.slice(0, 6));
      } catch { setMemberSearchResults([]); }
      setMemberSearching(false);
    }, 450);
  }

  function sendReaction(emoji) {
    if (!partyState) return;
    setSentReaction(emoji);
    setTimeout(() => setSentReaction(null), 1500);
    const msg = { id: `react_${Date.now()}`, type: 'system', message: `${displayName} reacted ${emoji}`, ts: Date.now() };
    setPartyState(prev => prev ? { ...prev, chat: [...(prev.chat || []), msg] } : prev);
    getSocket().emit('party:chat', { partyId: partyState.partyId, userId: myId, displayName, message: `reacted ${emoji}` });
  }

  function doSearch(q) {
    clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = window.aether?.search
          ? await window.aether.search(q)
          : await fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json());
        const tracks = Array.isArray(res) ? res : (Array.isArray(res?.songs) ? res.songs : []);
        setSearchResults(tracks.slice(0, 8));
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 450);
  }

  const track = role === 'host' ? hostTrack : partyState?.currentTrack;
  const posMs = role === 'host' ? hostPositionMs : (partyState?.positionMs || 0);
  const playing = role === 'host' ? hostIsPlaying : (partyState?.isPlaying || false);
  const dur = track?.totalDurationMs || track?.duration || 0;
  const pct = dur > 0 ? Math.min(100, (posMs / dur) * 100) : 0;

  if (!open) return null;

  return (
    <div className="party-overlay">
      {/* Background */}
      <div className="party-bg">
        <div className="party-bg-mesh" />
        <div className="party-bg-blob party-bg-blob-a" />
        <div className="party-bg-blob party-bg-blob-b" />
        <div className="party-bg-blob party-bg-blob-c" />
      </div>

      <AnimatePresence>
        {/* ── Entry modal ──────────────────────────────────────────── */}
        {!partyState && (
          <motion.div key="entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center justify-center h-full px-4">
            {/* Close */}
            <button onClick={onClose} className="party-btn party-btn-icon absolute top-5 right-5">
              <X size={16} />
            </button>

            <div className="party-entry-card">
              {/* Header */}
              <div className="px-8 pt-8 pb-6 text-center">
                <div className="party-logo justify-center mb-3">
                  <Wifi size={14} />AETHER ONLINE
                </div>
                <p className="text-xs text-white/40 leading-relaxed">Listen together in real time. Host controls the music.</p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/8 mx-6">
                {['create','join'].map(t => (
                  <button key={t} className={`party-tab-btn ${tab===t?'active':''}`} onClick={() => { setTab(t); setError(''); }}>
                    {t === 'create' ? '+ Create Party' : '→ Join Party'}
                  </button>
                ))}
              </div>

              <div className="px-6 py-6 flex flex-col gap-4">
                <div>
                  <span className="party-label">Your Name</span>
                  <input className="party-input" placeholder="Enter display name…" value={displayName}
                    onChange={e => setDisplayName(e.target.value)} maxLength={28} />
                </div>

                {tab === 'create' && (
                  <div className="party-toggle-row">
                    <span className="text-sm text-white/70 font-semibold">Private party (key required)</span>
                    <label className="party-toggle">
                      <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
                      <span className="party-toggle-slider" />
                    </label>
                  </div>
                )}

                {tab === 'join' && (<>
                  <div>
                    <span className="party-label">Party ID or Code</span>
                    <input className="party-input" placeholder="Party ID or code…" value={joinId}
                      onChange={e => setJoinId(e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <span className="party-label">Party Key (if private)</span>
                    <input className="party-input" placeholder="Leave blank if public…" value={joinKey}
                      onChange={e => setJoinKey(e.target.value.toUpperCase())} maxLength={6} />
                  </div>
                </>)}

                {error && <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}

                <button className="party-btn party-btn-mint w-full justify-center py-3 text-sm gap-2" disabled={connecting}
                  onClick={tab === 'create' ? handleCreate : handleJoin}>
                  {connecting ? (
                    <><Loader2 size={14} className="animate-spin" /> Connecting…</>
                  ) : tab === 'create' ? (
                    <><Radio size={14} /> Create Party</>
                  ) : (
                    <><Wifi size={14} /> Join Party</>
                  )}
                </button>

                <p className="text-center text-xs text-white/25">Max 10 listeners • Closes after 30min idle</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Party Room ───────────────────────────────────────────── */}
        {partyState && (
          <motion.div key="room" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col h-full overflow-hidden">

            {/* Top bar */}
            <div className="party-topbar">
              <div className="flex items-center gap-4">
                <span className="party-logo"><Wifi size={14} className="text-[var(--party-mint)]" />AETHER ONLINE</span>
                <button className="party-id-chip" onClick={copyId} title="Copy Code">
                  {copied ? 'COPIED!' : (partyState?.partyCode ? String(partyState.partyCode).slice(0, 12) + '...' : partyState.partyId)} <Copy size={10} className="inline ml-1 opacity-50" />
                </button>
                {partyState.isPrivate && <span className="text-xs text-white/30 font-semibold flex items-center gap-1"><Lock size={10} /> Private</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30 font-mono">{partyState.members?.length || 1}/10</span>
                <button className="party-btn party-btn-mint party-btn-icon" onClick={() => setShowInvite(v => !v)} title="Invite">
                  <UserPlus size={14} />
                </button>
                <button className="party-btn party-btn-danger party-btn-icon" onClick={() => role === 'host' ? setHostLeaving({ members: partyState.members.filter(m => m.id !== myId) }) : leaveParty(true)} title="Leave">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Invite panel */}
            {showInvite && (
              <div className="absolute top-16 right-4 z-30 party-panel p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className="party-label mb-0">Invite to Party</span>
                  <button className="opacity-40 hover:opacity-80" onClick={() => setShowInvite(false)}><X size={13}/></button>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/8 p-3 mb-3 font-mono text-xs leading-relaxed text-white/70">
                  <div className="text-white font-black tracking-widest text-sm mb-1 truncate" title={partyState?.partyCode || partyState.partyId}>{partyState?.partyCode || partyState.partyId}</div>
                  {partyState.partyKey && <div className="text-white/50">Key: <span className="text-white/80 font-bold">{partyState.partyKey}</span></div>}
                  <div className="text-white/30 text-[10px] mt-1">Open Aether &gt; Party &gt; Join Party</div>
                </div>
                <button className="party-btn party-btn-mint w-full justify-center gap-2" onClick={copyInvite}>
                  {inviteCopied ? <><Check size={13}/>Copied!</> : <><Copy size={13}/>Copy Invite</>}
                </button>
              </div>
            )}

            {/* Idle warning */}
            {idleWarn && (
              <div className="party-idle-toast">
                <AlertTriangle size={14} /> Party closes in 5 min due to inactivity
                <button onClick={() => setIdleWarn(false)} className="ml-2 opacity-50 hover:opacity-100"><X size={12} /></button>
              </div>
            )}

            {/* ── Main Dashboard Layout ── */}
            <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.8fr) minmax(280px, 1fr)', gap: '1.5rem', padding: '1.5rem' }}>
              
              {/* ── Left Column: Search & Members ── */}
              <div className="flex flex-col gap-6 overflow-hidden">
                {/* Host Tools Widget (Top Left, Host Only) */}
                {role === 'host' && (
                  <div className="party-panel flex flex-col shrink-0 max-h-[50%] rounded-[20px] overflow-hidden">
                     {/* Tabs */}
                     <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-black/20 shrink-0">
                       <button onClick={() => setHostLeftTab('search')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors ${hostLeftTab === 'search' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}>Search</button>
                       <button onClick={() => setHostLeftTab('queue')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors ${hostLeftTab === 'queue' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}>Queue {hostQueue?.length > 0 && `(${hostQueue.length})`}</button>
                       <button onClick={() => setHostLeftTab('playlists')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors ${hostLeftTab === 'playlists' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}>Playlists</button>
                     </div>

                     {hostLeftTab === 'search' && (
                       <>
                         <div className="p-4 border-b border-white/5 flex items-center gap-2 shrink-0">
                           <Search size={14} className="text-white/50" />
                           <input
                              className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-white placeholder-white/30"
                              placeholder="Search music to play..."
                              value={searchQuery}
                              onChange={e => { setSearchQuery(e.target.value); doSearch(e.target.value); }}
                            />
                            {searching && <Loader2 size={14} className="animate-spin text-[var(--party-mint)]" />}
                         </div>
                         {searchResults.length > 0 && (
                           <div className="overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar bg-black/20 flex-1">
                              {searchResults.map((t, i) => (
                                <button key={i} className="flex items-center gap-3 text-left rounded-xl p-2 hover:bg-white/10 transition-colors group shrink-0"
                                  onClick={() => { onHostPlayTrack?.(t); setSearchQuery(''); setSearchResults([]); }}>
                                  <img src={t.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shadow-md" onError={e=>e.target.style.display='none'}/>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-bold text-white/90 truncate group-hover:text-white">{t.title}</div>
                                    <div className="text-[10px] text-white/50 truncate uppercase tracking-widest mt-0.5">{t.author}</div>
                                  </div>
                                </button>
                              ))}
                           </div>
                         )}
                       </>
                     )}

                     {hostLeftTab === 'queue' && (
                       <div className="flex flex-col flex-1 min-h-0 bg-black/20">
                         {hostQueue?.length > 0 && (
                           <div className="flex items-center justify-between p-3 border-b border-white/5 shrink-0 bg-black/40">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Up Next ({hostQueue.length})</span>
                             <button className="text-[9px] uppercase font-bold tracking-widest text-red-400 hover:text-red-300 transition-colors px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-md" onClick={() => onHostUpdateQueue?.([])}>Clear All</button>
                           </div>
                         )}
                         <div className="overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar flex-1">
                            {hostQueue?.length > 0 ? hostQueue.map((t, i) => (
                            <div key={i} className="flex items-center gap-3 text-left rounded-xl p-2 group shrink-0 hover:bg-white/5">
                              <img src={t.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover shadow-sm opacity-50 group-hover:opacity-100 transition-opacity" onError={e=>e.target.style.display='none'}/>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold text-white/70 truncate group-hover:text-white/90">{t.title}</div>
                                <div className="text-[9px] text-white/40 truncate uppercase tracking-widest mt-0.5">{t.author}</div>
                              </div>
                              <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-md text-white/50 hover:text-white transition-all" onClick={() => {
                                onHostUpdateQueue?.(prev => {
                                  const newQ = Array.isArray(prev) ? [...prev] : [];
                                  newQ.splice(i, 1);
                                  return newQ;
                                });
                              }}><X size={12}/></button>
                            </div>
                          )) : (
                            <div className="p-4 text-center text-white/30 text-xs italic">Queue is empty</div>
                          )}
                       </div>
                     </div>)}

                     {hostLeftTab === 'playlists' && (
                       <div className="overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar bg-black/20 flex-1">
                          {hostPlaylists && Object.keys(hostPlaylists).length > 0 ? Object.entries(hostPlaylists).map(([name, tracks]) => (
                            <div key={name} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 group shrink-0 border border-transparent hover:border-white/5">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-white/80 truncate group-hover:text-white">{name}</div>
                                <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{tracks.length} Tracks</div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title="Add to Queue" onClick={() => {
                                  onHostUpdateQueue?.(prev => [...(Array.isArray(prev) ? prev : []), ...tracks]);
                                }}><Plus size={12}/></button>
                                <button className="p-1.5 bg-[var(--party-mint-dim)] hover:bg-[var(--party-mint)] text-[var(--party-mint)] hover:text-black rounded-lg transition-colors" title="Shuffle & Add" onClick={() => {
                                  const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                                  onHostUpdateQueue?.(prev => [...(Array.isArray(prev) ? prev : []), ...shuffled]);
                                }}><Shuffle size={12}/></button>
                              </div>
                            </div>
                          )) : (
                            <div className="p-4 text-center text-white/30 text-xs italic">No playlists found</div>
                          )}
                       </div>
                     )}
                  </div>
                )}

                {/* Members Widget (Bottom Left) */}
                <div className="party-panel flex flex-col rounded-[20px] flex-1 min-h-0">
                   <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-2 text-white/70">
                       <Users size={14} />
                       <span className="font-bold text-xs tracking-widest uppercase">Listeners</span>
                     </div>
                     <span className="text-[10px] font-mono text-[var(--party-mint)] bg-[var(--party-mint-dim)] px-2 py-0.5 rounded-full">{partyState.members?.length || 0}/10</span>
                   </div>
                   <div className="overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar flex-1">
                      {(partyState.members || []).map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner ${m.isHost ? 'bg-[var(--party-mint-dim)] text-[var(--party-mint)] border border-[var(--party-border-accent)]' : 'bg-white/10 text-white border border-white/5'}`}>
                            {m.isHost ? <Crown size={12} /> : initials(m.displayName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold truncate ${m.isHost ? 'text-white' : 'text-white/80'}`}>{m.displayName}</div>
                            {m.isHost && <div className="text-[9px] text-[var(--party-mint)] font-bold tracking-widest uppercase">Host</div>}
                          </div>
                          {role === 'host' && !m.isHost && (
                            <button onClick={() => kickMember(m.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-500 rounded-md transition-all shrink-0" title="Kick Listener">
                              <UserMinus size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                   </div>
                   {/* Volume control */}
                   <div className="p-3 border-t border-white/5 flex items-center gap-3 shrink-0">
                     <button onClick={() => setVolume(v => v > 0 ? 0 : 80)} className="text-white/40 hover:text-white transition-colors shrink-0">
                       {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                     </button>
                     <input
                       type="range" min={0} max={100} value={volume}
                       onChange={e => { const v = Number(e.target.value); setVolume(v); onHostControl?.(`volume:${v}`); }}
                       className="flex-1 h-1 rounded-full accent-[var(--party-mint)] cursor-pointer"
                     />
                     <span className="text-[10px] font-mono text-white/30 w-7 text-right shrink-0">{volume}</span>
                   </div>
                </div>
              </div>

              {/* ── Center Column: Now Playing Card ── */}
              <div className="flex flex-col items-center justify-center overflow-hidden">
                <div className="party-panel party-panel-accent flex flex-col overflow-hidden relative z-20 transition-all shadow-[0_40px_100px_rgba(0,0,0,0.8)] w-full h-full" style={{ borderRadius: '24px' }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/90 pointer-events-none z-10" />
                  
                  {track ? (
                    <>
                      {/* Blurred background art */}
                      <img src={track.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-25" onError={e=>e.target.style.display='none'}/>

                      <div className="relative z-20 flex flex-col h-full">
                        {/* Top: Live badge */}
                        <div className="flex items-center gap-3 p-5 shrink-0">
                          <div className="bg-[var(--party-mint)] text-black px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 shadow-[0_0_15px_var(--party-mint-glow)]">
                            <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" /> Live
                          </div>
                          <span className="text-white/50 font-semibold text-xs">Aether Party</span>
                          <div className="ml-auto flex items-center gap-1.5 text-white/30 text-[10px]">
                            <Radio size={10} className="text-[var(--party-mint)]" />
                            <span className="font-mono">{partyState.members?.length || 1} listening</span>
                          </div>
                        </div>

                        {/* Live lyric block — always visible */}
                        <div className="px-5 shrink-0">
                          {(() => {
                            const lyr = role === 'host' ? hostLiveLyric : partyState?.liveLyric;
                            return lyr ? (
                              <div className="group relative">
                                <div className="text-center text-white/80 text-sm italic font-medium leading-relaxed bg-black/40 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/8 transition-all">
                                  &ldquo;{lyr}&rdquo;
                                </div>
                                {/* Lyric sync controls — host only */}
                                {role === 'host' && (
                                  <div className="mt-2 flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => setShowLyricSync(v => !v)}
                                      className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-[var(--party-mint)] transition-colors flex items-center gap-1"
                                    >
                                      <Hash size={9} /> Lyric Sync {showLyricSync ? '▴' : '▾'}
                                    </button>
                                    {showLyricSync && (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => onLyricOffsetChange?.(o => o - 500)}
                                          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-xs flex items-center justify-center text-white/50 hover:text-white transition-all"
                                        >−</button>
                                        <span className="text-[10px] font-mono text-white/30 w-16 text-center">{hostLyricOffsetMs > 0 ? '+' : ''}{((hostLyricOffsetMs||0)/1000).toFixed(1)}s</span>
                                        <button
                                          onClick={() => onLyricOffsetChange?.(o => o + 500)}
                                          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-xs flex items-center justify-center text-white/50 hover:text-white transition-all"
                                        >+</button>
                                        <button
                                          onClick={() => onLyricOffsetChange?.(0)}
                                          className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors ml-1"
                                        >Reset</button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Placeholder when no lyric is available
                              <div className="flex items-center justify-center gap-2 text-white/15 text-[11px] font-medium italic py-2">
                                <Music size={12} className="shrink-0" />
                                <span>No lyrics synced for this track</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Center: Art + Info */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-4">
                          <div className="relative group">
                            <img
                              src={track.thumbnail} alt={track.title}
                              className="w-44 h-44 rounded-2xl object-cover shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10"
                              onError={e=>e.target.style.display='none'}
                            />
                            {hostIsBuffering && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl backdrop-blur-[2px]">
                                <Loader2 size={32} className="animate-spin text-[var(--party-mint)]" />
                              </div>
                            )}
                            {role === 'host' && (
                              <button
                                onClick={() => onHostControl?.(playing ? 'pause' : 'resume')}
                                className="absolute -bottom-2 -right-2 w-10 h-10 bg-[var(--party-mint)] rounded-full flex items-center justify-center shadow-[0_0_20px_var(--party-mint-glow)] opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 text-black"
                              >
                                {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
                              </button>
                            )}
                          </div>
                          <div className="text-center max-w-full">
                            <h2 className="text-3xl font-black text-white leading-none tracking-tight truncate drop-shadow-lg">{track.title}</h2>
                            <p className="text-[var(--party-mint)] font-bold text-sm tracking-widest uppercase mt-1 truncate">{track.author}</p>
                          </div>
                        </div>

                        {/* Bottom: Controls */}
                        <div className="px-6 pb-6 shrink-0 flex flex-col gap-4">
                          {/* Progress */}
                          <div className="mt-2">
                            <div 
                              className={`party-progress-track h-1.5 bg-white/10 rounded-full overflow-hidden ${role === 'host' ? 'cursor-pointer hover:h-2 transition-all' : ''}`}
                              onClick={(e) => {
                                if (role !== 'host') return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                onHostControl?.('seek', Math.floor(pct * dur));
                              }}
                            >
                              <div className="party-progress-fill bg-[var(--party-mint)] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between mt-1.5 text-[11px] font-mono text-white/35">
                              <span>{fmt(posMs)}</span><span>{fmt(dur)}</span>
                            </div>
                          </div>

                          {/* Playback buttons */}
                          {role === 'host' ? (
                            <div className="flex items-center justify-center gap-4">
                              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all" onClick={() => onHostControl?.('previous')}>
                                <SkipBack size={16} />
                              </button>
                              <button
                                className="w-16 h-16 flex items-center justify-center rounded-full bg-[var(--party-mint)] text-black shadow-[0_0_25px_var(--party-mint-glow)] hover:scale-105 active:scale-95 transition-all"
                                onClick={() => onHostControl?.(playing ? 'pause' : 'resume')}
                              >
                                {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                              </button>
                              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all" onClick={() => onHostControl?.('skip')}>
                                <SkipForward size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--party-mint-dim)] border border-[var(--party-border-accent)] rounded-full text-[11px] text-[var(--party-mint)] font-bold uppercase tracking-widest">
                                <Wifi size={11} /> Synced to Host
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40 z-20">
                      <ListMusic size={56} className="text-white" />
                      <span className="font-semibold text-base tracking-widest uppercase">Waiting for host to play</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right Column: Chat Widget ── */}
              <div className="flex flex-col overflow-hidden">
                <div className="party-panel flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[24px] h-full">
                   <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                     <div className="flex items-center gap-2 text-[var(--party-mint)]">
                       <MessageSquare size={16} />
                       <span className="font-bold text-sm tracking-widest uppercase">Chat</span>
                     </div>
                     <span className="text-[10px] text-white/30 font-mono">Live</span>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                     {/* Pending Requests inline in chat for Host */}
                     {role === 'host' && requests.length > 0 && (
                       <div className="mb-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 shrink-0">
                         <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2 block">Requests ({requests.length})</span>
                         <div className="flex flex-col gap-2">
                           {requests.map(r => (
                             <div key={r.id} className="flex items-center justify-between gap-2">
                               <div className="flex-1 min-w-0">
                                 <div className="text-[11px] font-bold text-white/90 truncate">{r.displayName}</div>
                                 <div className="text-[10px] text-white/50 truncate">{r.type === 'skip' ? 'Skip' : r.type === 'seek' ? 'Seek' : r.value?.title}</div>
                               </div>
                               <div className="flex gap-1 shrink-0">
                                 <button className="w-6 h-6 rounded bg-[var(--party-mint-dim)] text-[var(--party-mint)] flex items-center justify-center hover:bg-[var(--party-mint)] hover:text-black transition-colors" onClick={() => respondRequest(r.id, true)}><Check size={12}/></button>
                                 <button className="w-6 h-6 rounded bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" onClick={() => respondRequest(r.id, false)}><X size={12}/></button>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {(partyState.chat || []).map(msg => (
                        msg.type === 'system' ? (
                          <div key={msg.id} className="text-center text-[10px] uppercase tracking-wider text-white/30 my-1">{msg.message}</div>
                        ) : (
                          <div key={msg.id} className={`flex flex-col shrink-0 ${msg.userId === myId ? 'items-end' : 'items-start'}`}>
                            {msg.userId !== myId && <span className="text-[10px] text-[var(--party-mint)] font-bold mb-1 ml-1 uppercase tracking-wider">{msg.displayName}</span>}
                            <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed max-w-[85%] flex items-end gap-2 ${msg.userId === myId ? 'bg-[var(--party-mint-dim)] text-white border border-[var(--party-border-accent)] rounded-tr-sm' : 'bg-white/10 text-white/90 border border-white/5 rounded-tl-sm'}`}>
                              <span>{msg.message}</span>
                              {msg.userId === myId && (
                                <div className="shrink-0 mb-[2px] opacity-70">
                                  {msg.status === 'sending' ? <Loader2 size={10} className="animate-spin text-white/50" /> : <Check size={10} className="text-[var(--party-mint)]" />}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      ))}
                      <div ref={chatEndRef} />
                   </div>
                   
                   {/* Member Actions Panel */}
                   {role === 'member' && (
                     <div className="border-t border-white/5 bg-black/20 shrink-0">
                       {/* Action tabs */}
                       <div className="flex border-b border-white/5">
                         <button
                           className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${ memberAction === 'song' ? 'text-[var(--party-mint)] border-b-2 border-[var(--party-mint)] -mb-px' : 'text-white/30 hover:text-white/60'}`}
                           onClick={() => setMemberAction(memberAction === 'song' ? null : 'song')}
                         >
                           <Music size={11} /> Request Song
                         </button>
                         <button
                           className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${ memberAction === 'skip' ? 'text-yellow-400 border-b-2 border-yellow-400 -mb-px' : 'text-white/30 hover:text-white/60'}`}
                           onClick={() => { sendRequest('skip'); setMemberAction(null); }}
                         >
                           <SkipForward size={11} /> Request Skip
                         </button>
                         <button
                           className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${ memberAction === 'react' ? 'text-pink-400 border-b-2 border-pink-400 -mb-px' : 'text-white/30 hover:text-white/60'}`}
                           onClick={() => setMemberAction(memberAction === 'react' ? null : 'react')}
                         >
                           <ThumbsUp size={11} /> React
                         </button>
                       </div>

                       {/* Request Song Panel */}
                       {memberAction === 'song' && (
                         <div className="p-3 flex flex-col gap-2">
                           <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                             <Search size={12} className="text-white/30 shrink-0" />
                             <input
                               className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30"
                               placeholder="Search a song to request..."
                               value={memberSearch}
                               onChange={e => { setMemberSearch(e.target.value); doMemberSearch(e.target.value); }}
                               autoFocus
                             />
                             {memberSearching && <Loader2 size={12} className="animate-spin text-[var(--party-mint)] shrink-0" />}
                           </div>
                           {memberSearchResults.length > 0 && (
                             <div className="flex flex-col gap-1 max-h-36 overflow-y-auto custom-scrollbar">
                               {memberSearchResults.map((t, i) => (
                                 <button
                                   key={i}
                                   className="flex items-center gap-2 text-left rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors group"
                                   onClick={() => {
                                     sendRequest('song', { title: t.title, track: t });
                                     setMemberSearch('');
                                     setMemberSearchResults([]);
                                     setMemberAction(null);
                                   }}
                                 >
                                   <img src={t.thumbnail} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" onError={e=>e.target.style.display='none'} />
                                   <div className="flex-1 min-w-0">
                                     <div className="text-[12px] font-bold text-white/90 truncate group-hover:text-white">{t.title}</div>
                                     <div className="text-[10px] text-white/40 truncate">{t.author}</div>
                                   </div>
                                   <div className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[var(--party-mint)] opacity-0 group-hover:opacity-100 transition-opacity">Request</div>
                                 </button>
                               ))}
                             </div>
                           )}
                           {memberSearch && !memberSearching && memberSearchResults.length === 0 && (
                             <div className="text-[11px] text-white/30 text-center py-2">No results. Try a different name.</div>
                           )}
                         </div>
                       )}

                       {/* React Panel */}
                       {memberAction === 'react' && (
                         <div className="p-3">
                           <div className="flex items-center justify-around">
                             {[
                               { icon: <ThumbsUp size={18} />, label: 'Fire', emit: 'love' },
                               { icon: <ThumbsDown size={18} />, label: 'Meh', emit: 'meh' },
                               { icon: <Music size={18} />, label: 'Vibe', emit: 'vibe' },
                               { icon: <Hash size={18} />, label: 'Hype', emit: 'hype' },
                             ].map(r => (
                               <button
                                 key={r.emit}
                                 onClick={() => sendReaction(r.label)}
                                 className={`flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-all active:scale-90 ${ sentReaction === r.label ? 'text-[var(--party-mint)] bg-[var(--party-mint-dim)]' : 'text-white/50 hover:text-white'}`}
                               >
                                 {r.icon}
                                 <span className="text-[9px] font-black uppercase tracking-widest">{r.label}</span>
                               </button>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   )}
                   
                   <div className="p-3 bg-black/40 border-t border-white/5 flex gap-2 shrink-0">
                      <input
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--party-mint)] transition-colors"
                        placeholder="Message..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                        maxLength={400}
                      />
                      <button className="w-10 h-10 rounded-xl bg-[var(--party-mint)] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_var(--party-mint-glow)] shrink-0" onClick={sendChat}>
                        <Send size={16} className="ml-0.5" />
                      </button>
                   </div>
                </div>
              </div>

            </div>

            {/* Host leaving modal */}
            <AnimatePresence>
              {hostLeaving && (
                <motion.div key="host-leaving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="party-modal-backdrop">
                  <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} className="party-modal-card">
                    <div className="flex items-center gap-2 mb-4">
                      <Crown size={18} className="text-yellow-400" />
                      <h3 className="font-black text-base">You're leaving</h3>
                    </div>
                    <p className="text-sm text-white/60 mb-5">Pass the host crown to keep the party going, or close it.</p>
                    {hostLeaving.members?.length > 0 && (
                      <div className="mb-4 flex flex-col gap-2">
                        <span className="party-label">Transfer host to</span>
                        {hostLeaving.members.map(m => (
                          <button key={m.id} className="party-btn w-full justify-between" onClick={() => transferHost(m.id)}>
                            <span>{m.displayName}</span><ChevronRight size={14} className="opacity-40" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button className="party-btn flex-1 justify-center" onClick={() => setHostLeaving(null)}>Cancel</button>
                      <button className="party-btn party-btn-danger flex-1 justify-center" onClick={() => leaveParty(true)}>Close Party</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
