const { app, BrowserWindow, ipcMain, globalShortcut, Menu, dialog, systemPreferences, screen } = require('electron');
app.setName('Aether');
app.name = 'Aether';
const ffmpeg = require('ffmpeg-static');
const Store = require('electron-store');
const store = new Store();
const DiscordRPC = require('discord-rpc');
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const https = require('https');
const chokidar = require('chokidar');
const { fetchSyncedLyrics } = require('../lyrics-fetcher');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { spawn, spawnSync } = require('child_process');
const { OfflineEngine, search, getMetadata, getRecommendations, getLyrics, engineEvents } = require('./offline-engine');
const getDebugLogPath = () => {
    try {
        if (app?.isReady?.()) {
            return path.join(app.getPath('userData'), 'AetherDebug.log');
        }
    } catch (e) {
        console.error('[Aether] getDebugLogPath error', e?.message || e);
    }
    return path.join(os.homedir(), 'Desktop', 'AetherDebug.log');
};
let debugLogBuffer = [];
let debugLogFlushTimer = null;
let debugLogWritePromise = null;
const DEBUG_LOG_FLUSH_INTERVAL_MS = 250;
const DEBUG_LOG_MAX_BUFFER_LINES = 24;
const ensureDebugLogDirSync = (logPath) => {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
const ensureDebugLogDir = async (logPath) => {
    await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
};
const flushDebugLogBuffer = async () => {
    if (debugLogFlushTimer) {
        clearTimeout(debugLogFlushTimer);
        debugLogFlushTimer = null;
    }
    if (debugLogWritePromise) return debugLogWritePromise;
    if (debugLogBuffer.length === 0) return true;

    const logPath = getDebugLogPath();
    const lines = debugLogBuffer.join('');
    debugLogBuffer = [];

    debugLogWritePromise = (async () => {
        await ensureDebugLogDir(logPath);
        await fs.promises.appendFile(logPath, lines);
        return true;
    })().catch((e) => {
        console.error('[Aether] logDebug async flush error', e?.message || e);
        return false;
    }).finally(() => {
        debugLogWritePromise = null;
        if (debugLogBuffer.length > 0) {
            if (debugLogBuffer.length >= DEBUG_LOG_MAX_BUFFER_LINES) {
                void flushDebugLogBuffer();
            } else if (!debugLogFlushTimer) {
                debugLogFlushTimer = setTimeout(() => {
                    debugLogFlushTimer = null;
                    void flushDebugLogBuffer();
                }, DEBUG_LOG_FLUSH_INTERVAL_MS);
            }
        }
    });

    return debugLogWritePromise;
};
const flushDebugLogBufferSync = () => {
    try {
        if (debugLogFlushTimer) {
            clearTimeout(debugLogFlushTimer);
            debugLogFlushTimer = null;
        }
        if (debugLogBuffer.length === 0) return;
        const logPath = getDebugLogPath();
        ensureDebugLogDirSync(logPath);
        fs.appendFileSync(logPath, debugLogBuffer.join(''));
        debugLogBuffer = [];
    } catch (e) {
        console.error('[Aether] logDebug sync flush error', e?.message || e);
    }
};
const logDebug = (message, meta = null) => {
    try {
        const line = `[${new Date().toISOString()}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}\n`;
        debugLogBuffer.push(line);
        if (debugLogBuffer.length >= DEBUG_LOG_MAX_BUFFER_LINES) {
            void flushDebugLogBuffer();
        } else if (!debugLogFlushTimer) {
            debugLogFlushTimer = setTimeout(() => {
                debugLogFlushTimer = null;
                void flushDebugLogBuffer();
            }, DEBUG_LOG_FLUSH_INTERVAL_MS);
        }
    } catch (e) {
        console.error('[Aether] logDebug error', e?.message || e);
    }
};
const decodeHtmlEntities = (value) => String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

const handleOAuthIntercept = (text) => {
    const normalized = String(text || '');
    if (normalized.includes('HTTP Error 429') || normalized.includes('Sign in to confirm')) {
        engineEvents.emit('oauth-required', { url: null, code: null });
        return true;
    }
    return false;
};

const getResolvedCookiesPath = () => {
    const candidates = [];
    try {
        candidates.push(path.join(app.getPath('userData'), 'cookies.txt'));
    } catch (e) {}
    candidates.push(path.join(__dirname, '../cookies.txt'));

    for (const candidate of candidates) {
        try {
            if (candidate && fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
                return candidate;
            }
        } catch (e) {}
    }

    return null;
};

const auditCookiesFile = (filePath) => {
    const baseAudit = {
        valid: false,
        readyForYoutube: false,
        format: 'missing',
        cookieCount: 0,
        youtubeEntryCount: 0,
        pathLooksLikeYouTube: false,
        summary: 'No cookie file loaded.',
        note: 'Import a Netscape cookies.txt export when YouTube asks for sign-in confirmation.',
    };

    if (!filePath) return baseAudit;

    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const trimmed = String(raw || '').trim();
        if (!trimmed) {
            return {
                ...baseAudit,
                format: 'empty',
                summary: 'Cookie file is empty.',
                note: 'Export a non-empty cookies.txt file and import it again.',
            };
        }

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return {
                ...baseAudit,
                format: 'json',
                summary: 'This looks like JSON cookies, not Netscape cookies.txt.',
                note: 'yt-dlp expects a Netscape cookies.txt export for YouTube requests.',
            };
        }

        const lines = trimmed.split(/\r?\n/);
        const cookieRows = lines
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'))
            .map((line) => line.split('\t'))
            .filter((parts) => parts.length >= 7);

        const youtubeEntryCount = cookieRows.reduce((count, parts) => {
            const domain = String(parts[0] || '');
            return /youtube|google/i.test(domain) ? count + 1 : count;
        }, 0);

        const valid = cookieRows.length > 0;
        const readyForYoutube = valid && youtubeEntryCount > 0;

        return {
            valid,
            readyForYoutube,
            format: valid ? 'netscape' : 'unknown',
            cookieCount: cookieRows.length,
            youtubeEntryCount,
            pathLooksLikeYouTube: youtubeEntryCount > 0,
            summary: valid
                ? readyForYoutube
                    ? `${cookieRows.length} cookie rows • ${youtubeEntryCount} YouTube/Google`
                    : `${cookieRows.length} cookie rows • no YouTube/Google domains detected`
                : 'Could not parse Netscape cookie rows.',
            note: valid
                ? readyForYoutube
                    ? 'Local format check passed. Account ownership still cannot be proven in-app.'
                    : 'The file format looks usable, but no YouTube/Google domains were detected.'
                : 'Import a Netscape cookies.txt export from your browser or yt-dlp companion extension.',
        };
    } catch (error) {
        return {
            ...baseAudit,
            format: 'error',
            summary: 'Cookie file could not be read.',
            note: error?.message || 'Read failure',
        };
    }
};

const WINDOWS_TITLEBAR_OVERLAY = Object.freeze({
    color: '#0a0f12',
    symbolColor: '#d9fff5bb',
    height: 34,
});

let windowsTitleBarForceCompact = false;

const shouldCompactWindowsTitleBar = (win, compactHint = null) => {
    if (process.platform !== 'win32' || !win || win.isDestroyed()) return false;
    if (typeof compactHint === 'boolean') {
        return compactHint || windowsTitleBarForceCompact;
    }
    return windowsTitleBarForceCompact || win.isFullScreen() || win.isMaximized();
};

const applyWindowsTitleBarOverlay = (win, compactHint = null) => {
    if (process.platform !== 'win32' || !win || win.isDestroyed()) return;
    try {
        const compact = shouldCompactWindowsTitleBar(win, compactHint);
        win.setTitleBarOverlay({
            ...WINDOWS_TITLEBAR_OVERLAY,
            height: compact ? 0 : WINDOWS_TITLEBAR_OVERLAY.height,
        });
    } catch (error) {
        logDebug('setTitleBarOverlay failed', { error: error?.message || String(error), compactHint });
    }
};

const APP_LOCK_STORE_KEY = 'appLock';
const SESSION_PLAYBACK_STORE_KEY = 'aether.sessionPlayback.v1';
let autoUpdater = null;
const updateState = {
    enabled: false,
    status: 'idle',
    message: '',
    available: false,
    downloaded: false,
    version: null,
    progress: 0,
    checkedAt: null,
};

const emitUpdateState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        mainWindow.webContents.send('aether:update-status', { ...updateState });
    } catch (e) {
        logDebug('emitUpdateState error', { error: e?.message || String(e) });
    }
};

const setUpdateState = (patch = {}) => {
    Object.assign(updateState, patch);
    emitUpdateState();
    // User-facing notification for update errors
    if (updateState.status === 'error' && mainWindow && !mainWindow.isDestroyed()) {
        try {
            mainWindow.webContents.send('aether:user-error', {
                type: 'update',
                message: updateState.message || 'Update error occurred.'
            });
        } catch (e) {
            logDebug('user-error notification failed', { error: e?.message || String(e) });
        }
    }
};

const initAutoUpdater = () => {
    if (!app.isPackaged) {
        setUpdateState({ enabled: false, status: 'unsupported', message: 'Updates are available in packaged builds only.' });
        return;
    }

    try {
        ({ autoUpdater } = require('electron-updater'));
    } catch (e) {
        setUpdateState({ enabled: false, status: 'unsupported', message: 'Updater module unavailable.' });
        logDebug('autoUpdater unavailable', { error: e?.message || String(e) });
        // User-facing notification for updater failure
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('aether:user-error', {
                    type: 'update',
                    message: 'Updater module unavailable.'
                });
            } catch (err) {
                logDebug('user-error notification failed', { error: err?.message || String(err) });
            }
        }
        return;
    }

    if (!autoUpdater) {
        setUpdateState({ enabled: false, status: 'unsupported', message: 'Updater not initialized.' });
        return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;

    setUpdateState({ enabled: true, status: 'idle', message: 'Updater ready.' });

    autoUpdater.on('checking-for-update', () => {
        setUpdateState({ status: 'checking', message: 'Checking for updates…', checkedAt: Date.now(), progress: 0 });
    });

    autoUpdater.on('update-available', (info) => {
        setUpdateState({
            status: 'available',
            message: 'Update available.',
            available: true,
            downloaded: false,
            version: info?.version || null,
            progress: 0,
            checkedAt: Date.now(),
        });
    });

    autoUpdater.on('update-not-available', () => {
        setUpdateState({
            status: 'up-to-date',
            message: 'You are on the latest version.',
            available: false,
            downloaded: false,
            version: null,
            progress: 0,
            checkedAt: Date.now(),
        });
    });

    autoUpdater.on('download-progress', (progress) => {
        setUpdateState({
            status: 'downloading',
            message: 'Downloading update…',
            progress: Number.isFinite(progress?.percent) ? Math.max(0, Math.min(100, progress.percent)) : 0,
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        setUpdateState({
            status: 'downloaded',
            message: 'Update ready. Restart to install.',
            available: true,
            downloaded: true,
            version: info?.version || updateState.version || null,
            progress: 100,
        });
    });

    autoUpdater.on('error', (err) => {
        const msg = err?.message || 'Update check failed.';
        setUpdateState({ status: 'error', message: msg });
        logDebug('autoUpdater error', { error: msg });
    });

    setTimeout(() => {
        autoUpdater.checkForUpdates().catch((e) => {
            const msg = e?.message || 'Initial update check failed.';
            setUpdateState({ status: 'error', message: msg });
            logDebug('initial autoUpdater check failed', { error: msg });
        });
    }, 12000);
};

let isAppQuitting = false;
let quitCleanupInProgress = false;
let quitCleanupCompleted = false;
let finalTeardownCompleted = false;
let quitFallbackTimer = null;
const activeStreamProcesses = new Set();
const getLockRecord = () => store.get(APP_LOCK_STORE_KEY) || null;
const canPromptTouchId = () => {
    try {
        return process.platform === 'darwin' && typeof systemPreferences?.canPromptTouchID === 'function' && systemPreferences.canPromptTouchID();
    } catch (e) {
        logDebug('canPromptTouchId error', { error: e?.message || String(e) });
        return false;
    }
};
const hashLockPassword = (password, salt) => crypto.scryptSync(String(password || ''), String(salt || ''), 64).toString('hex');
const verifyLockPassword = (password, record) => {
    if (!record?.hash || !record?.salt) return false;
    // Ensure salt is random and unique per user
    // (Consider: store a UUID or random string as salt at lock creation)
    const computed = hashLockPassword(password, record.salt);
    const a = Buffer.from(record.hash, 'hex');
    const b = Buffer.from(computed, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
};
const RECOVERY_OTP_ISSUER = 'Aether Studio';
const RECOVERY_OTP_PERIOD_SECONDS = 30;
const RECOVERY_OTP_DIGITS = 6;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const sanitizeRecoveryOtpSecret = (value) => String(value || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
const encodeBase32 = (buffer) => {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
};
const decodeBase32 = (input) => {
    const normalized = sanitizeRecoveryOtpSecret(input);
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (const char of normalized) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) throw new Error('Invalid authenticator secret.');
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
};
const createRecoveryOtpProfile = () => {
    const secret = encodeBase32(crypto.randomBytes(20));
    const issuer = RECOVERY_OTP_ISSUER;
    const label = `${app.getName()} (${os.hostname()})`;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(`${issuer}:${label}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${RECOVERY_OTP_DIGITS}&period=${RECOVERY_OTP_PERIOD_SECONDS}`;
    return { secret, issuer, label, otpauthUrl };
};
const computeRecoveryOtpToken = (secret, counter) => {
    const key = decodeBase32(secret);
    const buffer = Buffer.alloc(8);
    const safeCounter = Math.max(0, Number(counter) || 0);
    const high = Math.floor(safeCounter / 0x100000000);
    const low = safeCounter >>> 0;
    buffer.writeUInt32BE(high >>> 0, 0);
    buffer.writeUInt32BE(low, 4);
    const digest = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const code = (
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff)
    ) % (10 ** RECOVERY_OTP_DIGITS);
    return String(code).padStart(RECOVERY_OTP_DIGITS, '0');
};
const verifyRecoveryOtp = (code, secret) => {
    const normalizedCode = String(code || '').replace(/\D/g, '');
    const normalizedSecret = sanitizeRecoveryOtpSecret(secret);
    if (normalizedCode.length !== RECOVERY_OTP_DIGITS || normalizedSecret.length < 16) return false;
    try {
        const currentCounter = Math.floor(Date.now() / 1000 / RECOVERY_OTP_PERIOD_SECONDS);
        for (let offset = -1; offset <= 1; offset += 1) {
            if (computeRecoveryOtpToken(normalizedSecret, currentCounter + offset) === normalizedCode) {
                return true;
            }
        }
    } catch (e) {
        logDebug('verifyRecoveryOtp failed', { error: e?.message || String(e) });
    }
    return false;
};

const extractSpotifyPlaylistId = (input) => {
    if (!input) return null;
    const value = String(input).trim();
    const patterns = [
        /open\.spotify\.com\/playlist\/([A-Za-z0-9]{22})/i,
        /spotify:playlist:([A-Za-z0-9]{22})/i,
        /playlist\/([A-Za-z0-9]{22})/i,
    ];
    for (const pattern of patterns) {
        const match = value.match(pattern);
        if (match) return match[1];
    }
    return null;
};

const getSpotifyWebAccessToken = async () => {
    const tokenResp = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
        headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'accept-language': 'en-US,en;q=0.9',
        },
    });
    if (!tokenResp.ok) throw new Error(`Spotify token fetch failed (${tokenResp.status})`);
    const tokenJson = await tokenResp.json();
    if (!tokenJson?.accessToken) throw new Error('Spotify token missing');
    return tokenJson.accessToken;
};

const getSpotifyPlaylistViaApi = async (playlistId, accessToken) => {
    const baseHeaders = {
        Authorization: `Bearer ${accessToken}`,
        'accept': 'application/json',
    };

    const metaResp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name`, { headers: baseHeaders });
    if (!metaResp.ok) throw new Error(`Spotify playlist metadata failed (${metaResp.status})`);
    const meta = await metaResp.json();

    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(id,name,artists(name)))`;
    const tracks = [];

    while (nextUrl && tracks.length < 200) {
        const resp = await fetch(nextUrl, { headers: baseHeaders });
        if (!resp.ok) throw new Error(`Spotify playlist tracks failed (${resp.status})`);
        const data = await resp.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        for (const item of items) {
            const t = item?.track;
            if (!t?.name || !t?.id) continue;
            const artist = (Array.isArray(t.artists) ? t.artists.map(a => a?.name).filter(Boolean).join(', ') : '').trim();
            tracks.push({
                spotifyId: t.id,
                title: t.name,
                artist,
            });
            if (tracks.length >= 200) break;
        }
        nextUrl = data?.next || null;
    }

    return {
        playlistName: decodeHtmlEntities(meta?.name || 'Spotify Playlist'),
        tracks,
    };
};

const getSpotifyPlaylistViaHtml = (html) => {
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
    const title = decodeHtmlEntities(titleMatch?.[1] || 'Spotify Playlist');
    const uniqueTrackIds = extractSpotifyTrackIdsFromHtml(html).slice(0, 100);
    const labelMatches = [...html.matchAll(/aria-label="([^"]+)"/g)]
        .map(match => decodeHtmlEntities(match[1]).trim())
        .filter(label => label && !['Save to Your Library', 'Share', 'More', 'Play', 'Explicit', 'Liked by you'].includes(label));
    const titles = labelMatches.slice(0, uniqueTrackIds.length);
    const tracks = uniqueTrackIds.map((id, idx) => ({
        spotifyId: id,
        title: titles[idx] || '',
        artist: '',
    })).filter(t => t.spotifyId);
    return { playlistName: title, tracks };
};

const extractSpotifyTrackIdsFromHtml = (html) => {
    const ids = new Set();
    for (const match of html.matchAll(/track\/([A-Za-z0-9]{22})/g)) ids.add(match[1]);
    for (const match of html.matchAll(/spotify:track:([A-Za-z0-9]{22})/g)) ids.add(match[1]);
    return [...ids];
};

const fetchSpotifyHtml = async (url) => {
    const headers = {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
    };

    try {
        const response = await fetch(url, { headers });
        const text = await response.text();
        return { ok: response.ok, status: response.status, text };
    } catch (fetchErr) {
        logDebug('fetchSpotifyHtml fallback error', { error: fetchErr?.message || String(fetchErr) });
        return await new Promise((resolve) => {
            https.get(url, { headers }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode || 0, text: data });
                });
            }).on('error', (err) => {
                logDebug('https.get error in fetchSpotifyHtml', { error: err?.message || String(err) });
                resolve({ ok: false, status: 0, text: '', error: err?.message || String(err) });
            });
        });
    }
};

const normalizeMatchText = (value) => String(value || '')
    .toLowerCase()
    .replace(/\(feat\.?[^)]*\)/gi, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const scoreSearchCandidate = (candidate, targetTitle, targetArtist) => {
    const candTitle = normalizeMatchText(candidate?.title);
    const candArtist = normalizeMatchText(candidate?.author);
    const title = normalizeMatchText(targetTitle);
    const artist = normalizeMatchText(targetArtist);

    if (!candTitle || !title) return 0;

    const titleTokens = new Set(title.split(' ').filter(Boolean));
    const candTokens = new Set(candTitle.split(' ').filter(Boolean));
    let overlap = 0;
    for (const tok of titleTokens) {
        if (candTokens.has(tok)) overlap += 1;
    }

    let score = overlap;
    if (candTitle === title) score += 8;
    if (candTitle.includes(title) || title.includes(candTitle)) score += 4;

    if (artist) {
        if (candArtist === artist) score += 4;
        else if (candArtist.includes(artist) || artist.includes(candArtist)) score += 2;
        else {
            const artistLead = artist.split(' ')[0];
            if (artistLead && candArtist.includes(artistLead)) score += 1;
        }
    }

    return score;
};

const parseSpotifyOEmbedTitle = (value) => {
    const raw = decodeHtmlEntities(value || '').trim();
    if (!raw) return { title: '', artist: '' };
    const match = raw.match(/^(.*?)\s+by\s+(.+)$/i);
    if (!match) return { title: raw, artist: '' };
    return { title: match[1].trim(), artist: match[2].trim() };
};

const enrichSpotifyTrackViaOEmbed = async (spotifyId) => {
    const resp = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${spotifyId}`)}`, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'accept-language': 'en-US,en;q=0.9',
        },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const parsed = parseSpotifyOEmbedTitle(data?.title || '');
    const fallbackArtist = decodeHtmlEntities(data?.author_name || '').trim();
    return {
        title: parsed.title,
        artist: parsed.artist || fallbackArtist || '',
    };
};

const enrichSpotifyPlaylistNameViaOEmbed = async (playlistId) => {
    const resp = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/playlist/${playlistId}`)}`, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'accept-language': 'en-US,en;q=0.9',
        },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const raw = decodeHtmlEntities(data?.title || '').trim();
    if (!raw) return null;
    const parsed = parseSpotifyOEmbedTitle(raw);
    return parsed.title || raw;
};

const buildSpotifyQueries = (title, artist = '') => {
    const normalizedTitle = String(title || '')
        .replace(/\(feat\.?[^)]*\)/gi, '')
        .replace(/\(from[^)]*\)/gi, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const compactTitle = normalizedTitle.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    const artistLead = String(artist || '').split(',')[0].trim();

    const queries = [
        `${normalizedTitle} ${artist}`.trim(),
        `${normalizedTitle} ${artistLead}`.trim(),
        normalizedTitle,
        compactTitle,
        compactTitle.split(' ').slice(0, 5).join(' ').trim(),
    ].filter(Boolean);

    return [...new Set(queries)];
};
const getBinaryPath = (relPath) => {
    // 1. Check System Paths First (Homebrew/Mac)
    const baseName = path.basename(relPath);
    const systemPaths = ['/opt/homebrew/bin/', '/usr/local/bin/', '/usr/bin/'];
    for (const p of systemPaths) {
        const full = path.join(p, baseName);
        if (fs.existsSync(full)) return full;
    }

    // 2. Fallback to Bundled Paths
    const localPath = path.join(__dirname, '..', 'node_modules', relPath);
    const unpackedPath = localPath.replace('app.asar', 'app.asar.unpacked');
    const finalPath = fs.existsSync(unpackedPath) ? unpackedPath : localPath;
    
    if (process.platform !== 'win32' && fs.existsSync(finalPath)) {
        try { fs.chmodSync(finalPath, 0o755); } catch (e) {}
    }
    return finalPath;
};

const getBundledPath = (relPath) => {
    const localPath = path.join(__dirname, '..', relPath);
    const unpackedPath = localPath.replace('app.asar', 'app.asar.unpacked');
    const finalPath = fs.existsSync(unpackedPath) ? unpackedPath : localPath;
    if (process.platform !== 'win32' && fs.existsSync(finalPath)) {
        try { fs.chmodSync(finalPath, 0o755); } catch (e) {}
    }
    return finalPath;
};

const getUserDataBinaryPath = (binaryName) => path.join(app.getPath('userData'), 'bin', binaryName);
const dedupePaths = (paths = []) => [...new Set(paths.filter(Boolean))];
const ensureExecutablePermissions = (filePath) => {
    if (!filePath || process.platform === 'win32' || !fs.existsSync(filePath)) return filePath;
    try {
        fs.chmodSync(filePath, 0o755);
    } catch (e) {
        logDebug('chmod failed', { filePath, error: e?.message || String(e) });
    }
    return filePath;
};
const getBinaryStat = (filePath) => {
    try {
        return filePath ? fs.statSync(filePath) : null;
    } catch {
        return null;
    }
};
const getBundledBinaryCandidates = (binaryNames = []) => dedupePaths(
    binaryNames.map((binaryName) => getBundledPath(`desktop/bin/${binaryName}`)),
);
const getUserDataBinaryCandidates = (binaryNames = []) => dedupePaths(
    binaryNames.map((binaryName) => getUserDataBinaryPath(binaryName)),
);
const findExistingBinary = (candidates = []) => candidates.find((candidate) => {
    const stat = getBinaryStat(candidate);
    if (!stat?.isFile?.()) return false;
    ensureExecutablePermissions(candidate);
    return true;
}) || null;
const getFfmpegBinaryNames = () => {
    if (process.platform === 'win32') return ['ffmpeg.exe'];
    if (process.platform === 'darwin') {
        return [process.arch === 'arm64' ? 'ffmpeg_darwin_arm64' : 'ffmpeg_darwin_x64', 'ffmpeg'];
    }
    return ['ffmpeg'];
};
const getYtDlpBinaryNames = () => {
    if (process.platform === 'win32') return ['yt-dlp.exe'];
    if (process.platform === 'darwin') return ['yt-dlp_macos', 'yt-dlp'];
    return ['yt-dlp'];
};

// --- BULLETPROOF NATIVE BINARY EXTRACTOR ---
// Sidesteps read-only /Applications restrictions and Python deprecations
const unpackNativeEngine = (binaryName, options = {}) => {
    const { force = false } = options;
    const sourcePath = getBundledPath(`desktop/bin/${binaryName}`);
    const targetExecutable = getUserDataBinaryPath(binaryName);
    const sourceStat = getBinaryStat(sourcePath);

    if (!sourceStat?.isFile?.()) {
        logDebug('bundled binary missing for unpack', { binaryName, sourcePath });
        return null;
    }

    try {
        const targetStat = getBinaryStat(targetExecutable);
        if (!force && targetStat?.isFile?.() && targetStat.size > 0) {
            return ensureExecutablePermissions(targetExecutable);
        }

        fs.mkdirSync(path.dirname(targetExecutable), { recursive: true });
        const tmpTarget = `${targetExecutable}.${process.pid}.${Date.now()}.tmp`;
        fs.copyFileSync(sourcePath, tmpTarget);
        ensureExecutablePermissions(tmpTarget);

        try {
            if (force && fs.existsSync(targetExecutable)) {
                try { fs.rmSync(targetExecutable, { force: true }); } catch {}
            }
            if (!fs.existsSync(targetExecutable)) {
                fs.renameSync(tmpTarget, targetExecutable);
            } else {
                try { fs.unlinkSync(tmpTarget); } catch {}
            }
        } catch (renameError) {
            logDebug('binary unpack rename failed', {
                binaryName,
                sourcePath,
                targetExecutable,
                error: renameError?.message || String(renameError),
            });
            return ensureExecutablePermissions(tmpTarget);
        }

        if (process.platform === 'win32') {
            try {
                fs.utimesSync(targetExecutable, new Date(), new Date());
            } catch {}
        }
        return ensureExecutablePermissions(targetExecutable);
    } catch (e) {
        logDebug('binary unpack failed', { binaryName, sourcePath, targetExecutable, error: e?.message || String(e) });
        console.error(`[Aether] Execution unpack fault: ${e.message}`);
    }
    return null;
};

const resolveFfmpegPath = () => {
    const envPath = process.env.FFMPEG_PATH;
    if (envPath && fs.existsSync(envPath)) return envPath;

    const binaryNames = getFfmpegBinaryNames();
    const candidates = dedupePaths([
        ...getBundledBinaryCandidates(binaryNames),
        ...getUserDataBinaryCandidates(binaryNames),
        process.platform === 'win32'
            ? getBinaryPath('ffmpeg-static/ffmpeg.exe')
            : getBinaryPath('ffmpeg-static/ffmpeg'),
    ]);
    const found = findExistingBinary(candidates);
    return found || (process.platform === 'win32' ? null : 'ffmpeg');
};

function isSpawnableCommand(commandPath) {
    try {
        const result = spawnSync(commandPath, ['--version'], {
            stdio: 'ignore',
            timeout: 2500,
            shell: false,
        });
        return !result.error && result.status === 0;
    } catch {
        return false;
    }
}

const resolveYtDlpPath = () => {
    const envPath = process.env.YOUTUBE_DL_PATH;
    if (envPath && fs.existsSync(envPath)) return envPath;

    const binaryNames = getYtDlpBinaryNames();
    const candidates = dedupePaths([
        ...getBundledBinaryCandidates(binaryNames),
        ...getUserDataBinaryCandidates(binaryNames),
        process.platform === 'win32'
            ? getBinaryPath('@distube/yt-dlp/bin/yt-dlp.exe')
            : getBinaryPath('@distube/yt-dlp/bin/yt-dlp'),
    ]);

    const spawnable = candidates.find((candidate) => candidate && fs.existsSync(candidate) && isSpawnableCommand(candidate));
    if (spawnable) return spawnable;

    const found = findExistingBinary(candidates);
    return found || null;
};

let ytdlpPath = resolveYtDlpPath();
let ensureYtDlpInFlight = null;
let lastLoggedYtDlpResolution = '';
const streamTelemetryGate = new Map();

const logYtDlpResolution = (eventName, resolvedPath) => {
    const nextKey = `${eventName}:${resolvedPath || ''}`;
    if (!resolvedPath || lastLoggedYtDlpResolution === nextKey) return;
    lastLoggedYtDlpResolution = nextKey;
    logDebug(eventName, { ytdlpPath: resolvedPath });
};

const shouldLogStreamEvent = (key, windowMs = 4000) => {
    const now = Date.now();
    const prev = streamTelemetryGate.get(key) || 0;
    streamTelemetryGate.set(key, now);
    if (streamTelemetryGate.size > 320) {
        for (const [entryKey, entryTime] of streamTelemetryGate.entries()) {
            if ((now - entryTime) > 300000) {
                streamTelemetryGate.delete(entryKey);
            }
        }
    }
    return (now - prev) >= windowMs;
};
const THUMBNAIL_PROXY_SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const THUMBNAIL_PROXY_FAILURE_TTL_MS = 90 * 1000;
const THUMBNAIL_PROXY_MAX_CACHE_ENTRIES = 256;
const DIRECT_MEDIA_URL_TTL_MS = 10 * 60 * 1000;
const thumbnailProxyCache = new Map();
const thumbnailProxyFailureCache = new Map();
const thumbnailProxyInflight = new Map();
const directMediaUrlCache = new Map();
const directMediaUrlInflight = new Map();
const thumbnailProxyHttpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 12,
    maxFreeSockets: 4,
});
const thumbnailProxyHttpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 12,
    maxFreeSockets: 4,
});
const directMediaHttpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 16,
    maxFreeSockets: 8,
});
const directMediaHttpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 16,
    maxFreeSockets: 8,
});
const THUMBNAIL_PROXY_PLACEHOLDER_BUFFER = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480" role="img" aria-label="Thumbnail unavailable">
        <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#081018" />
                <stop offset="100%" stop-color="#0d1f1b" />
            </linearGradient>
            <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#00ffbf" stop-opacity="0.95" />
                <stop offset="100%" stop-color="#68ffe1" stop-opacity="0.28" />
            </linearGradient>
        </defs>
        <rect width="480" height="480" rx="48" fill="url(#bg)" />
        <circle cx="240" cy="194" r="72" fill="none" stroke="url(#ring)" stroke-width="10" opacity="0.8" />
        <circle cx="240" cy="194" r="22" fill="#00ffbf" opacity="0.78" />
        <path d="M178 314h124" stroke="#00ffbf" stroke-width="12" stroke-linecap="round" opacity="0.72" />
        <path d="M202 350h76" stroke="#d9fff7" stroke-width="10" stroke-linecap="round" opacity="0.34" />
        <text x="240" y="410" text-anchor="middle" fill="#a5fff0" font-family="Arial, sans-serif" font-size="28" letter-spacing="4">AETHER</text>
    </svg>`,
    'utf8',
);
const trimThumbnailProxyCache = (map, maxEntries = THUMBNAIL_PROXY_MAX_CACHE_ENTRIES) => {
    if (map.size <= maxEntries) return;
    const excess = map.size - maxEntries;
    let removed = 0;
    for (const key of map.keys()) {
        map.delete(key);
        removed += 1;
        if (removed >= excess) break;
    }
};
const readThumbnailProxyCache = (map, key) => {
    const entry = map.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        map.delete(key);
        return null;
    }
    return entry.value;
};
const writeThumbnailProxyCache = (map, key, value, ttlMs) => {
    map.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
    });
    trimThumbnailProxyCache(map);
};

const resolveSystemYtDlp = () => {
    const explicit = process.env.YOUTUBE_DL_PATH;
    const candidates = [explicit];

    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        const chocolateyRoot = process.env.ChocolateyInstall || path.join(process.env.ProgramData || 'C:\\ProgramData', 'chocolatey');
        const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
        candidates.push(
            path.join(localAppData, 'Microsoft', 'WindowsApps', 'yt-dlp.exe'),
            path.join(chocolateyRoot, 'bin', 'yt-dlp.exe'),
            path.join(programFiles, 'yt-dlp', 'yt-dlp.exe'),
            'yt-dlp.exe',
            'yt-dlp',
        );
    } else {
        candidates.push(
            '/opt/homebrew/bin/yt-dlp',
            '/usr/local/bin/yt-dlp',
            '/usr/bin/yt-dlp',
            'yt-dlp',
        );
    }

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (candidate === 'yt-dlp') {
            if (isSpawnableCommand(candidate)) return candidate;
            continue;
        }
        if (candidate === 'yt-dlp.exe') {
            if (isSpawnableCommand(candidate)) return candidate;
            continue;
        }
        try {
            if (fs.existsSync(candidate) && isSpawnableCommand(candidate)) {
                return candidate;
            }
        } catch {}
    }
    return null;
};

const downloadFileWithRedirects = (url, destination, redirects = 0) => {
    return new Promise((resolve, reject) => {
        if (redirects > 5) return reject(new Error('Too many redirects downloading yt-dlp'));
        const file = fs.createWriteStream(destination);
        const req = https.get(url, (res) => {
            const status = res.statusCode || 0;
            const location = res.headers?.location;

            if (status >= 300 && status < 400 && location) {
                file.close();
                try { fs.unlinkSync(destination); } catch {}
                const nextUrl = location.startsWith('http') ? location : new URL(location, url).toString();
                return resolve(downloadFileWithRedirects(nextUrl, destination, redirects + 1));
            }

            if (status < 200 || status >= 300) {
                file.close();
                try { fs.unlinkSync(destination); } catch {}
                return reject(new Error(`yt-dlp download failed (${status})`));
            }

            res.pipe(file);
            file.on('finish', () => file.close(() => resolve(destination)));
        });

        req.setTimeout(12000, () => {
            req.destroy(new Error('yt-dlp download timeout'));
        });

        req.on('error', (err) => {
            file.close();
            try { fs.unlinkSync(destination); } catch {}
            reject(err);
        });
    });
};

const ensureYtDlpPath = async () => {
    if (ensureYtDlpInFlight) return ensureYtDlpInFlight;
    ensureYtDlpInFlight = (async () => {
        const resolvedCandidate = resolveYtDlpPath();
        if (resolvedCandidate && fs.existsSync(resolvedCandidate) && isSpawnableCommand(resolvedCandidate)) {
            ytdlpPath = resolvedCandidate;
            logYtDlpResolution('yt-dlp resolved from bundled/runtime path', ytdlpPath);
            return true;
        }

        const systemYtDlp = resolveSystemYtDlp();
        if (systemYtDlp) {
            ytdlpPath = systemYtDlp;
            logYtDlpResolution('yt-dlp resolved from system', ytdlpPath);
            return true;
        }

        if (ytdlpPath && fs.existsSync(ytdlpPath) && isSpawnableCommand(ytdlpPath)) {
            return true;
        }

        try {
            const binDir = path.join(app.getPath('userData'), 'bin');
            fs.mkdirSync(binDir, { recursive: true });

            const binaryName = process.platform === 'win32'
                ? 'yt-dlp.exe'
                : process.platform === 'darwin'
                    ? 'yt-dlp_macos'
                    : 'yt-dlp';
            const target = path.join(binDir, binaryName);
            const parsedBinaryName = path.parse(binaryName);
            const tempTarget = path.join(
                binDir,
                `${parsedBinaryName.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${parsedBinaryName.ext}`,
            );

            if (fs.existsSync(target)) {
                if (process.platform !== 'win32') {
                    try { fs.chmodSync(target, 0o755); } catch {}
                }
                if (isSpawnableCommand(target)) {
                    ytdlpPath = target;
                    logYtDlpResolution('yt-dlp resolved from userData bin', ytdlpPath);
                    return true;
                }
            }

            const downloadUrl = process.platform === 'win32'
                ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
                    : process.platform === 'darwin'
                        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
                        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

            logDebug('yt-dlp bootstrap download starting', { downloadUrl });
            await downloadFileWithRedirects(downloadUrl, tempTarget);
            if (process.platform !== 'win32') {
                try { fs.chmodSync(tempTarget, 0o755); } catch {}
            }

            let selectedTarget = tempTarget;
            if (isSpawnableCommand(tempTarget)) {
                try {
                    if (fs.existsSync(target)) {
                        try { fs.rmSync(target, { force: true }); } catch {}
                    }
                    fs.renameSync(tempTarget, target);
                    selectedTarget = target;
                } catch (renameError) {
                    logDebug('yt-dlp bootstrap rename skipped', {
                        target,
                        tempTarget,
                        error: renameError?.message || String(renameError),
                    });
                }

                ytdlpPath = selectedTarget;
                console.log(`[Aether] yt-dlp bootstrapped at ${selectedTarget}`);
                logDebug('yt-dlp bootstrapped', { target: selectedTarget });
                return true;
            }
        } catch (e) {
            console.warn('[Aether] yt-dlp bootstrap failed:', e?.message || e);
            logDebug('yt-dlp bootstrap failed', { error: e?.message || String(e) });
        }

        return false;
    })();

    try {
        return await ensureYtDlpInFlight;
    } finally {
        ensureYtDlpInFlight = null;
    }
};
const ensureYtDlpPathWithTimeout = async (timeoutMs = 8000) => {
    const startedAt = Date.now();
    const ready = await Promise.race([
        ensureYtDlpPath(),
        new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs)),
    ]);
    if (!ready) {
        logDebug('yt-dlp ensure timeout/unavailable', { timeoutMs, elapsedMs: Date.now() - startedAt });
    }
    return !!ready;
};
let ffmpegPath = resolveFfmpegPath();
console.log(`[Aether] ytdlpPath: ${ytdlpPath}, ffmpegPath: ${ffmpegPath}`);

const offlineEngine = new OfflineEngine(app.getPath('userData'));
const downloadBackoffByTrack = new Map();
let mainWindow;

engineEvents.on('oauth-required', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('aether:oauth-required', data);
    }
});

const STORAGE_POLICY_STORE_KEY = 'storagePolicy';
const DEFAULT_STORAGE_POLICY = {
    cacheCapMb: 2048,
    maxCacheAgeDays: 30,
};

const getStoragePolicy = () => {
    const saved = store.get(STORAGE_POLICY_STORE_KEY);
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_STORAGE_POLICY };
    return {
        cacheCapMb: Number.isFinite(saved.cacheCapMb) ? Math.max(256, Math.min(16384, saved.cacheCapMb)) : DEFAULT_STORAGE_POLICY.cacheCapMb,
        maxCacheAgeDays: Number.isFinite(saved.maxCacheAgeDays) ? Math.max(1, Math.min(365, saved.maxCacheAgeDays)) : DEFAULT_STORAGE_POLICY.maxCacheAgeDays,
    };
};

const getUserDataCacheDirs = () => {
    const userDataDir = app.getPath('userData');
    return [
        path.join(userDataDir, 'Cache'),
        path.join(userDataDir, 'Code Cache'),
        path.join(userDataDir, 'GPUCache'),
        path.join(userDataDir, 'DawnGraphiteCache'),
        path.join(userDataDir, 'DawnWebGPUCache'),
    ];
};

const walkFiles = (dirPath) => {
    if (!dirPath || !fs.existsSync(dirPath)) return [];
    const out = [];
    const stack = [dirPath];
    while (stack.length > 0) {
        const current = stack.pop();
        let entries = [];
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) stack.push(full);
            else if (entry.isFile()) out.push(full);
        }
    }
    return out;
};

const sumFileSizes = (filePaths = []) => {
    let total = 0;
    for (const filePath of filePaths) {
        try {
            total += fs.statSync(filePath).size;
        } catch {}
    }
    return total;
};

const getStorageStats = () => {
    const userDataDir = app.getPath('userData');
    const downloadsDir = offlineEngine.downloadDir;
    const cacheDirs = getUserDataCacheDirs();

    const downloadFiles = walkFiles(downloadsDir);
    const cacheFiles = cacheDirs.flatMap(walkFiles);

    const downloadsBytes = sumFileSizes(downloadFiles);
    const cacheBytes = sumFileSizes(cacheFiles);
    const totalBytes = downloadsBytes + cacheBytes;

    return {
        userDataDir,
        downloadsDir,
        downloadsBytes,
        cacheBytes,
        totalBytes,
        policy: getStoragePolicy(),
    };
};

const pruneOldCacheFiles = (maxAgeDays = 30) => {
    const cutoff = Date.now() - Math.max(1, maxAgeDays) * 24 * 60 * 60 * 1000;
    let removedFiles = 0;
    let removedBytes = 0;

    const targetDirs = getUserDataCacheDirs();
    const allFiles = targetDirs.flatMap(walkFiles);
    for (const filePath of allFiles) {
        try {
            const stat = fs.statSync(filePath);
            const ageRef = Math.max(stat.mtimeMs || 0, stat.atimeMs || 0);
            if (ageRef > cutoff) continue;
            fs.unlinkSync(filePath);
            removedFiles += 1;
            removedBytes += stat.size;
        } catch {}
    }

    return { removedFiles, removedBytes };
};

const enforceCacheCap = (cacheCapMb = 2048) => {
    const capBytes = Math.max(256, cacheCapMb) * 1024 * 1024;
    const cacheFiles = getUserDataCacheDirs().flatMap(walkFiles)
        .map((filePath) => {
            try {
                const stat = fs.statSync(filePath);
                return { filePath, size: stat.size, touched: Math.max(stat.atimeMs || 0, stat.mtimeMs || 0) };
            } catch {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => a.touched - b.touched);

    let total = cacheFiles.reduce((sum, f) => sum + f.size, 0);
    let removedFiles = 0;
    let removedBytes = 0;

    for (const file of cacheFiles) {
        if (total <= capBytes) break;
        try {
            fs.unlinkSync(file.filePath);
            total -= file.size;
            removedFiles += 1;
            removedBytes += file.size;
        } catch {}
    }

    return { removedFiles, removedBytes, capBytes, remainingBytes: Math.max(0, total) };
};

const keepDownloadedOnlyCleanup = () => {
    let removedFiles = 0;
    let removedBytes = 0;
    for (const dirPath of getUserDataCacheDirs()) {
        const files = walkFiles(dirPath);
        for (const filePath of files) {
            try {
                const stat = fs.statSync(filePath);
                fs.unlinkSync(filePath);
                removedFiles += 1;
                removedBytes += stat.size;
            } catch {}
        }
    }
    return { removedFiles, removedBytes };
};

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const extractPossibleYouTubeId = (value) => {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;
    if (YOUTUBE_ID_PATTERN.test(text)) return text;
    const match = text.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/v\/)([A-Za-z0-9_-]{11})/i);
    return match ? match[1] : null;
};

const collectPinnedDownloadIdsFromPlaylists = () => {
    const pinned = new Set();
    const playlists = store.get('playlists');
    if (!playlists || typeof playlists !== 'object') return pinned;

    for (const tracks of Object.values(playlists)) {
        if (!Array.isArray(tracks)) continue;
        for (const track of tracks) {
            if (!track || typeof track !== 'object') continue;

            const rawId = String(track.id || '').trim();
            if (rawId) pinned.add(rawId);

            const ytFromId = extractPossibleYouTubeId(rawId);
            if (ytFromId) pinned.add(ytFromId);

            const ytFromExplicit = extractPossibleYouTubeId(track.youtubeId);
            if (ytFromExplicit) pinned.add(ytFromExplicit);

            const ytFromUrl = extractPossibleYouTubeId(track.actualUrl || track.url);
            if (ytFromUrl) pinned.add(ytFromUrl);
        }
    }

    return pinned;
};

const cleanupWarmupDownloadsOnQuit = async () => {
    try {
        const downloaded = await offlineEngine.getDownloadedTracks();
        if (!Array.isArray(downloaded) || downloaded.length === 0) {
            return { scanned: 0, removed: 0, kept: 0, failed: 0 };
        }

        const pinned = collectPinnedDownloadIdsFromPlaylists();
        const warmupOnly = downloaded.filter((id) => YOUTUBE_ID_PATTERN.test(String(id || '').trim()));
        const candidates = warmupOnly.filter((id) => !pinned.has(id));

        let removed = 0;
        let failed = 0;

        for (const id of candidates) {
            try {
                const result = await offlineEngine.removeDownload(id, { cancelInProgress: true, removeSidecars: true });
                if (result?.success) removed += 1;
                else failed += 1;
            } catch {
                failed += 1;
            }
        }

        return {
            scanned: warmupOnly.length,
            removed,
            kept: Math.max(0, warmupOnly.length - removed - failed),
            failed,
        };
    } catch (e) {
        console.warn('[Aether/Storage] Quit warmup cleanup failed', e?.message || e);
        return { scanned: 0, removed: 0, kept: 0, failed: 0, error: e?.message || String(e) };
    }
};

const runFinalTeardown = () => {
    if (finalTeardownCompleted) return;
    finalTeardownCompleted = true;

    isAppQuitting = true;

    // Clear in-memory queues so no playback state survives process teardown.
    try {
        studioQueues.clear();
    } catch (e) {
        logDebug('studioQueues.clear error', { error: e?.message || String(e) });
    }

    // Clear persisted playback session queue/time so reopen starts clean.
    try {
        store.delete(SESSION_PLAYBACK_STORE_KEY);
    } catch (e) {
        logDebug('store.delete SESSION_PLAYBACK_STORE_KEY error', { error: e?.message || String(e) });
    }

    // Clear transient cache files (keeps downloaded library intact except warmup-orphan cleanup above).
    try {
        keepDownloadedOnlyCleanup();
    } catch (e) {
        logDebug('keepDownloadedOnlyCleanup error', { error: e?.message || String(e) });
    }

    // Hard-stop active stream workers to avoid stale pipes on next launch.
    try {
        for (const proc of activeStreamProcesses) {
            try { proc.kill('SIGKILL'); } catch (e) {
                logDebug('proc.kill SIGKILL error', { error: e?.message || String(e) });
            }
        }
        activeStreamProcesses.clear();
    } catch (e) {
        logDebug('activeStreamProcesses.clear error', { error: e?.message || String(e) });
    }

    flushDebugLogBufferSync();
};

const estimateStorageReclaim = (mode = 'cap', payload = {}) => {
    const policy = getStoragePolicy();
    const cacheFiles = getUserDataCacheDirs().flatMap(walkFiles)
        .map((filePath) => {
            try {
                const stat = fs.statSync(filePath);
                return {
                    filePath,
                    size: stat.size,
                    touched: Math.max(stat.atimeMs || 0, stat.mtimeMs || 0),
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean);

    const cacheBytes = cacheFiles.reduce((sum, f) => sum + f.size, 0);

    if (mode === 'downloads-only') {
        return {
            mode,
            estimatedBytes: cacheBytes,
            estimatedFiles: cacheFiles.length,
        };
    }

    if (mode === 'age') {
        const maxCacheAgeDays = Number.isFinite(payload.maxCacheAgeDays) ? payload.maxCacheAgeDays : policy.maxCacheAgeDays;
        const cutoff = Date.now() - Math.max(1, maxCacheAgeDays) * 24 * 60 * 60 * 1000;
        let estimatedBytes = 0;
        let estimatedFiles = 0;
        for (const file of cacheFiles) {
            if (file.touched <= cutoff) {
                estimatedBytes += file.size;
                estimatedFiles += 1;
            }
        }
        return {
            mode,
            estimatedBytes,
            estimatedFiles,
            maxCacheAgeDays,
        };
    }

    const cacheCapMb = Number.isFinite(payload.cacheCapMb) ? payload.cacheCapMb : policy.cacheCapMb;
    const capBytes = Math.max(256, cacheCapMb) * 1024 * 1024;
    const sorted = cacheFiles.slice().sort((a, b) => a.touched - b.touched);
    let running = cacheBytes;
    let estimatedBytes = 0;
    let estimatedFiles = 0;
    for (const file of sorted) {
        if (running <= capBytes) break;
        running -= file.size;
        estimatedBytes += file.size;
        estimatedFiles += 1;
    }
    return {
        mode: 'cap',
        estimatedBytes,
        estimatedFiles,
        cacheCapMb,
    };
};

// --- NEURAL CONVERGENCE: STANDALONE ENGINE (V9.0.0) ---
// NOTE: Many async operations and state changes below may be subject to race conditions if triggered rapidly.
// Consider debouncing or locking for critical flows (e.g., downloads, updates, queue changes).
const studioQueues = new Map();
const DEFAULT_STUDIO_ID = 'local_studio';

// Helper to get or create a local queue
function getQueue(id = DEFAULT_STUDIO_ID) {
    if (!studioQueues.has(id)) {
        studioQueues.set(id, {
            songs: [],
            isPlaying: false,
            currentMs: 0,
            seekOffset: 0,
            lyricOffsetMs: 0
        });
    }
    return studioQueues.get(id);
}

// Force App Name for macOS/Linux (V6.5.9)
app.setName('Aether');
app.name = 'Aether';
if (process.platform === 'darwin') {
    app.setAboutPanelOptions({
        applicationName: 'Aether',
        applicationVersion: '6.6.2',
        copyright: 'Aether Sound Studio // GSUS_2K',
        credits: 'Neural Engine by Aether'
    });
    try {
        const iconPath = path.join(__dirname, '../icon.png');
        if (fs.existsSync(iconPath)) app.dock.setIcon(iconPath);
    } catch (e) {}
}

// --- AETHER STREAMING SERVER ---
const streamApp = express();
streamApp.use(cors());
streamApp.use('/offline', express.static(offlineEngine.downloadDir));
streamApp.use(express.json());

let remoteState = { isPlaying: false, currentTime: 0, track: null };

streamApp.post('/api/device/sync', (req, res) => {
    remoteState = req.body;
    res.json({ success: true });
});

streamApp.get('/api/system', (req, res) => {
    res.json({ status: 'ok', version: app.getVersion() });
});

streamApp.get('/api/device/state', (req, res) => {
    res.json(remoteState);
});

streamApp.post('/api/device/control', (req, res) => {
    const { action } = req.body;
    if (mainWindow && action) {
        mainWindow.webContents.send('aether:control', action);
    }
    res.json({ success: true });
});

streamApp.get('/', (req, res) => {
    res.send(`
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Aether Remote</title>
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          body { background: #050505; color: #fff; font-family: 'Inter', sans-serif; margin: 0; padding: 20px; text-align: center; height: 100vh; display: flex; flex-direction: column; justify-content: center; }
          .neo { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 30px; padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
          .neo::before { content: ''; position: absolute; top:0; left:0; right:0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,255,191,0.5), transparent); }
          img { width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 20px; margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); opacity: 0.9; }
          h2 { margin: 0 0 8px 0; font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
          p { margin: 0; color: #00ffbf; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 3px; }
          .controls { display: flex; justify-content: center; gap: 25px; align-items: center; margin-top: 35px; }
          .btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; width: 60px; height: 60px; border-radius: 20px; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s all; }
          .btn:active { transform: scale(0.9); background: rgba(255,255,255,0.1); }
          .btn.play { background: #00ffbf; color: #000; box-shadow: 0 0 20px rgba(0,255,191,0.3); width: 80px; height: 80px; border-radius: 25px; font-size: 30px; }
          .btn.play:active { box-shadow: 0 0 30px rgba(0,255,191,0.6); }
        </style>
      </head>
      <body>
        <div class="neo">
           <img id="art" src="https://via.placeholder.com/300" />
           <h2 id="title">AETHER LINK</h2>
           <p id="author">AWAITING STANDBY</p>
           
           <div class="controls">
              <div class="btn" onclick="send('previous')">⏮</div>
              <div class="btn play" onclick="send('play')" id="playBtn">▶</div>
              <div class="btn" onclick="send('skip')">⏭</div>
           </div>
        </div>
        <script>
           function send(action) { fetch('/api/device/control', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action }) }); }
           setInterval(async () => {
              try {
                const r = await fetch('/api/device/state');
                const { isPlaying, track } = await r.json();
                document.getElementById('playBtn').innerHTML = isPlaying ? '⏸' : '▶';
                if (track) {
                   document.getElementById('title').innerText = track.title;
                   document.getElementById('author').innerText = track.author;
                   if (track.thumbnail) document.getElementById('art').src = track.thumbnail.replace('http:', 'https:');
                }
              } catch(e) {}
           }, 1000);
        </script>
      </body>
    </html>
    `);
});

const extractDirectMediaUrl = async (videoUrl, {
    cacheKey = null,
    format = '140/bestaudio[ext=m4a]/bestaudio/best',
    logKey = 'direct-media',
} = {}) => {
    const normalizedKey = cacheKey || `${logKey}:${videoUrl}`;
    const cached = readThumbnailProxyCache(directMediaUrlCache, normalizedKey);
    if (cached) {
        return cached;
    }

    let inflight = directMediaUrlInflight.get(normalizedKey);
    if (!inflight) {
        inflight = new Promise((resolve, reject) => {
            const args = [
                videoUrl,
                '--get-url',
                '--format', format,
                '--no-check-certificates',
                '--no-warnings',
                '--quiet',
            ];

            const cookiesPath = getResolvedCookiesPath();
            if (cookiesPath) {
                args.push('--cookies', cookiesPath);
            }

            const proc = spawn(ytdlpPath, args);
            let output = '';
            let errOutput = '';

            proc.stdout.on('data', (d) => { output += d.toString(); });
            proc.stderr.on('data', (d) => {
                const msg = d.toString().trim();
                errOutput += `${msg}\n`;
                handleOAuthIntercept(msg);
                if (msg.length > 5 && shouldLogStreamEvent(`direct-media-stderr:${logKey}`, 5000)) {
                    console.log(`[Aether/Media] ${msg}`);
                }
            });

            proc.on('error', (err) => {
                reject(err);
            });

            proc.on('close', (code) => {
                if (code !== 0 || !output.trim()) {
                    reject(new Error(errOutput.trim() || `yt-dlp exited with code ${code}`));
                    return;
                }
                const directUrl = output.trim().split('\n')[0].trim();
                writeThumbnailProxyCache(directMediaUrlCache, normalizedKey, directUrl, DIRECT_MEDIA_URL_TTL_MS);
                resolve(directUrl);
            });
        });

        directMediaUrlInflight.set(normalizedKey, inflight);
        inflight.finally(() => {
            if (directMediaUrlInflight.get(normalizedKey) === inflight) {
                directMediaUrlInflight.delete(normalizedKey);
            }
        });
    }

    return inflight;
};

const pipeRemoteMediaToResponse = (targetUrl, req, res, {
    streamLabel = 'direct-stream',
    startTime = Date.now(),
    hop = 0,
} = {}) => new Promise((resolve, reject) => {
    if (hop > 4) {
        reject(new Error('Too many redirects'));
        return;
    }

    const isHttpsTarget = String(targetUrl || '').startsWith('https');
    const client = isHttpsTarget ? https : http;
    const upstreamReq = client.get(targetUrl, {
        agent: isHttpsTarget ? directMediaHttpsAgent : directMediaHttpAgent,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            ...(req.headers.range ? { Range: req.headers.range } : {}),
        },
        timeout: 20000,
    }, (upstreamRes) => {
        if (upstreamRes.statusCode >= 300 && upstreamRes.statusCode < 400 && upstreamRes.headers.location) {
            const redirectUrl = upstreamRes.headers.location.startsWith('http')
                ? upstreamRes.headers.location
                : new URL(upstreamRes.headers.location, targetUrl).href;
            upstreamRes.resume();
            resolve(pipeRemoteMediaToResponse(redirectUrl, req, res, {
                streamLabel,
                startTime,
                hop: hop + 1,
            }));
            return;
        }

        if (upstreamRes.statusCode < 200 || upstreamRes.statusCode >= 400) {
            upstreamRes.resume();
            reject(new Error(`Direct media status ${upstreamRes.statusCode}`));
            return;
        }

        let firstChunkLogged = false;
        upstreamRes.on('data', () => {
            if (!firstChunkLogged) {
                firstChunkLogged = true;
                if (shouldLogStreamEvent(`stream-first-chunk:${streamLabel}`, 3500)) {
                    console.log(`[Aether] First streaming chunk after ${Date.now() - startTime}ms for ${streamLabel}`);
                }
            }
        });

        res.status(upstreamRes.statusCode === 206 ? 206 : 200);
        const passHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
        for (const headerName of passHeaders) {
            if (upstreamRes.headers[headerName]) {
                res.setHeader(headerName, upstreamRes.headers[headerName]);
            }
        }
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Aether-Stream-Cache', 'miss');
        res.setHeader('X-Aether-Stream-Source', 'direct-cdn');

        upstreamRes.pipe(res);
        resolve(true);
    });

    const closeUpstream = () => {
        try { upstreamReq.destroy(); } catch {}
    };

    req.on('close', closeUpstream);
    upstreamReq.on('timeout', () => {
        upstreamReq.destroy(new Error('Timeout'));
    });
    upstreamReq.on('error', (err) => {
        closeUpstream();
        reject(err);
    });
});

streamApp.get('/stream', async (req, res) => {
    const startTime = Date.now();
    const videoUrl = req.query.url;
    if (!videoUrl) {
        res.status(400).send('No URL');
        return;
    }
    const seekTime = parseFloat(req.query.t || '0');

    // Extract track ID only from YouTube share links (youtube.com?v=XXXXX)
    const trackIdMatch = videoUrl.match(/(?:youtube\.com|youtu\.be).*[?&]v=([A-Za-z0-9_-]{11})/);
    const trackId = trackIdMatch ? trackIdMatch[1] : null;
    const isYouTubeLink = !!trackId;
    const streamLabel = trackId || 'direct-stream';
    if (shouldLogStreamEvent(`stream-request:${streamLabel}`, 3500)) {
        console.log(`[Aether] Stream request for url: ${videoUrl}, isYouTubeLink: ${isYouTubeLink}, trackId: ${streamLabel}`);
    }

    let cachedFile = null;
    if (isYouTubeLink) {
        cachedFile = offlineEngine.getFilePath(trackId);
        if (cachedFile && shouldLogStreamEvent(`stream-cache-hit:${trackId}`, 3500)) {
            console.log(`[Aether] Cache hit for ${trackId}: ${cachedFile}`);
        }
    }

    if (cachedFile) {
        // Stream from cached file with proper byte-range support (critical for seek/resume stability)
        const stat = fs.statSync(cachedFile);
        const ext = path.extname(cachedFile).toLowerCase();
        const contentType = ext === '.m4a' || ext === '.mp4' ? 'audio/mp4' : 'audio/mpeg';
        const fileSize = stat.size;
        const range = req.headers.range;

        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        res.setHeader('X-Aether-Stream-Cache', 'hit');

        if (range) {
            const match = String(range).match(/bytes=(\d*)-(\d*)/i);
            if (!match) {
                res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
                return;
            }

            let start = match[1] ? parseInt(match[1], 10) : 0;
            let end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
            if (Number.isNaN(start)) start = 0;
            if (Number.isNaN(end) || end >= fileSize) end = fileSize - 1;

            if (start > end || start >= fileSize) {
                res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
                return;
            }

            const chunkSize = end - start + 1;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunkSize);

            fs.createReadStream(cachedFile, { start, end }).pipe(res);
        } else {
            res.setHeader('Content-Length', fileSize);
            fs.createReadStream(cachedFile).pipe(res);
        }

        res.on('finish', () => {
            if (shouldLogStreamEvent(`stream-cache-finish:${trackId}`, 5000)) {
                console.log(`[Aether] Cached stream for ${trackId} took ${Date.now() - startTime}ms`);
            }
        });
        return;
    }

    const readyForStream = await ensureYtDlpPathWithTimeout(7000);
    if (!readyForStream || !ytdlpPath) {
        if (!res.headersSent) {
            res.status(503).send('Streaming backend unavailable (yt-dlp missing)');
        }
        return;
    }

    if (shouldLogStreamEvent(`stream-cache-miss:${streamLabel}`, 3500)) {
        console.log(`[Aether] Cache miss for ${streamLabel}, streaming from yt-dlp`);
    }

    if (shouldLogStreamEvent(`stream-live-start:${streamLabel}`, 3500)) {
        console.log(`[Aether] Streaming: ${videoUrl} @ ${seekTime}s`);
    }

    if (isYouTubeLink) {
        const directResolveStart = Date.now();
        try {
            const directUrl = await extractDirectMediaUrl(videoUrl, {
                cacheKey: `audio:${trackId}`,
                format: '140/bestaudio[ext=m4a]/bestaudio/best',
                logKey: `audio:${trackId}`,
            });
            if (shouldLogStreamEvent(`stream-direct-url:${streamLabel}`, 5000)) {
                console.log(`[Aether] Direct audio URL resolved for ${streamLabel} in ${Date.now() - directResolveStart}ms`);
            }
            await pipeRemoteMediaToResponse(directUrl, req, res, {
                streamLabel,
                startTime,
            });
            res.on('finish', () => {
                if (shouldLogStreamEvent(`stream-live-finish:${streamLabel}`, 5000)) {
                    console.log(`[Aether] Direct CDN audio stream for ${streamLabel} took ${Date.now() - startTime}ms`);
                }
            });
            return;
        } catch (err) {
            directMediaUrlCache.delete(`audio:${trackId}`);
            if (shouldLogStreamEvent(`stream-direct-fallback:${streamLabel}`, 5000)) {
                console.warn(`[Aether] Direct audio proxy failed for ${streamLabel}, falling back to yt-dlp stdout: ${err?.message || err}`);
            }
        }
    }

    // Fallback to yt-dlp stdout streaming when direct resolution fails.
    const cookiesPath = getResolvedCookiesPath();

    const args = [
        videoUrl,
        '--output', '-',
        '--format', 'bestaudio[ext=m4a]/bestaudio/best',
        '--no-check-certificates',
        '--no-warnings',
        '--quiet'
    ];

    const ytdlpStart = Date.now();
    let remuxStart = null;
    let firstChunkTime = null;

    const logRemuxIfDetected = (msg) => {
        if (!remuxStart && isYouTubeLink && /(Merging formats|remuxing|Destination|Writing audio)/i.test(msg)) {
            remuxStart = Date.now();
            console.log(`[Aether] Remux stage detected for ${trackId} at ${remuxStart - ytdlpStart}ms`);
        }
    };
    
    // IMPORTANT: avoid server-side section slicing for live stdout streaming.
    // It can create unstable decode/buffer loops on app resume. Seeking is
    // handled client-side only when the media element reports seekable ranges.

    if (ffmpegPath) {
        args.push('--ffmpeg-location', ffmpegPath);
    }

    if (cookiesPath) {
        args.push('--cookies', cookiesPath);
    }

    const proc = spawn(ytdlpPath, args);
    activeStreamProcesses.add(proc);

    proc.stdout.on('data', () => {
        if (!firstChunkTime) {
            firstChunkTime = Date.now();
            if (shouldLogStreamEvent(`stream-first-chunk:${streamLabel}`, 3500)) {
                console.log(`[Aether] First streaming chunk after ${firstChunkTime - startTime}ms for ${streamLabel}`);
            }
        }
    });

    proc.on('error', (err) => {
        activeStreamProcesses.delete(proc);
        logDebug('stream spawn fault', {
            ytdlpPath,
            error: err?.message || String(err),
            stack: err?.stack || null,
        });
        console.error(`[Aether] Engine launch error: ${err.message}`);
        if (!res.headersSent) res.status(500).send(`Neural Engine failed: ${err.message}`);
    });

    // yt-dlp primary format is m4a, so expose mp4 audio MIME for browser compatibility.
    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Aether-Stream-Cache', 'miss');
    proc.stdout.pipe(res);
    res.on('finish', () => {
        if (shouldLogStreamEvent(`stream-live-finish:${streamLabel}`, 5000)) {
            console.log(`[Aether] yt-dlp stream for ${streamLabel} took ${Date.now() - startTime}ms`);
        }
    });

    proc.stderr.on('data', (d) => {
        const msg = d.toString().trim();
        if (msg.length > 5 && !msg.includes('frag')) {
            console.log(`[Aether/Engine] ${msg}`);
            logRemuxIfDetected(msg);
        }
        handleOAuthIntercept(msg);
    });

    proc.stderr.on('data', (data) => {
        console.error(`[Aether Stream Error] ${data}`);
    });

    proc.on('close', (code) => {
        activeStreamProcesses.delete(proc);
        const streamTotal = Date.now() - startTime;
        const ytdlpTotal = Date.now() - ytdlpStart;
        const remuxDur = remuxStart ? Date.now() - remuxStart : null;
        const suffix = isYouTubeLink ? ` ytdlp=${ytdlpTotal}ms remux=${remuxDur != null ? remuxDur + 'ms' : 'unknown'}` : '';
        if (code !== 0 || shouldLogStreamEvent(`stream-live-close:${streamLabel}`, 5000)) {
            console.log(`[Aether] yt-dlp stream closed ${trackId || 'direct'} code=${code} total=${streamTotal}ms${suffix}`);
        }
    });

    req.on('close', () => {
        if (shouldLogStreamEvent(`stream-request-close:${streamLabel}`, 5000)) {
            console.log(`[Aether] Stream request closed for ${streamLabel} after ${Date.now() - startTime}ms`);
        }
        activeStreamProcesses.delete(proc);
        proc.kill('SIGKILL');
    });
});

// ─── VIDEO STREAM ENDPOINT ───────────────────────────────────────────────────
// We do NOT pipe bytes through Node — that causes the 9s browser timeout
// because progressive MP4 has moov atom at end (browser can't play without it).
// Instead: extract the direct YouTube CDN URL via --get-url and 302-redirect.
// Chromium plays directly from CDN: instant start, full seek, no timeout.
streamApp.get('/videostream', async (req, res) => {
    const startTime = Date.now();
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('No URL');

    const readyForStream = await ensureYtDlpPathWithTimeout(7000);
    if (!readyForStream || !ytdlpPath) {
        if (!res.headersSent) res.status(503).send('yt-dlp unavailable');
        return;
    }

    const trackIdMatch = videoUrl.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    const trackId = trackIdMatch ? trackIdMatch[1] : 'direct';

    // Extract direct CDN URL — this is fast (~1-3s), no download
    const args = [
        videoUrl,
        '--get-url',
        // 22 = 720p combined, 18 = 360p combined. Prioritize these for audio inclusion.
        '--format', '22/18/best[height<=720][ext=mp4]/best',
        '--no-check-certificates',
        '--no-warnings',
        '--quiet',
    ];

    if (ffmpegPath) args.push('--ffmpeg-location', ffmpegPath);

    const cookiesPath = getResolvedCookiesPath();
    if (cookiesPath) {
        args.push('--cookies', cookiesPath);
    }

    console.log(`[Aether/Video] Extracting CDN URL for ${trackId}...`);
    const proc = spawn(ytdlpPath, args);
    let output = '';
    let errOutput = '';

    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => {
        const msg = d.toString().trim();
        errOutput += msg + '\n';
        if (msg.length > 5) console.log(`[Aether/Video] ${msg}`);
        handleOAuthIntercept(msg);
    });

    proc.on('error', (err) => {
        console.error(`[Aether/Video] Spawn error: ${err.message}`);
        if (!res.headersSent) res.status(500).send('Video engine error');
    });

    proc.on('close', (code) => {
        const elapsed = Date.now() - startTime;
        if (res.headersSent) return;
        if (code !== 0 || !output.trim()) {
            console.error(`[Aether/Video] URL extraction failed for ${trackId} (code=${code}) in ${elapsed}ms`);
            return res.status(500).send('Failed to extract video URL');
        }

        // yt-dlp may return multiple lines (video + audio URLs for merged formats)
        // The first URL is the video stream — redirect Chromium to it directly
        const cdnUrl = output.trim().split('\n')[0].trim();
        console.log(`[Aether/Video] CDN redirect for ${trackId} in ${elapsed}ms → ${cdnUrl.substring(0, 80)}...`);
        res.redirect(302, cdnUrl);
    });
});


streamApp.get('/api/proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('No URL');

    const buildCandidateUrls = (raw) => {
        const initial = String(raw || '').startsWith('//') ? `https:${raw}` : String(raw || '');
        const out = [initial];
        try {
            const parsed = new URL(initial);
            const isYtImg = /(^|\.)ytimg\.com$/i.test(parsed.hostname);
            if (isYtImg) {
                const seenPaths = new Set([parsed.pathname]);
                const fallbacks = [];
                const pushFallback = (nextPath) => {
                    if (!nextPath || seenPaths.has(nextPath)) return;
                    seenPaths.add(nextPath);
                    const fallback = new URL(parsed.toString());
                    fallback.pathname = nextPath;
                    fallbacks.push(fallback.toString());
                };
                if (/\/maxresdefault\.(jpg|webp)$/i.test(parsed.pathname)) {
                    pushFallback(parsed.pathname.replace(/maxresdefault\.(jpg|webp)$/i, 'sddefault.jpg'));
                    pushFallback(parsed.pathname.replace(/maxresdefault\.(jpg|webp)$/i, 'hqdefault.jpg'));
                    pushFallback(parsed.pathname.replace(/maxresdefault\.(jpg|webp)$/i, 'mqdefault.jpg'));
                } else if (/\/sddefault\.(jpg|webp)$/i.test(parsed.pathname)) {
                    pushFallback(parsed.pathname.replace(/sddefault\.(jpg|webp)$/i, 'hqdefault.jpg'));
                    pushFallback(parsed.pathname.replace(/sddefault\.(jpg|webp)$/i, 'mqdefault.jpg'));
                } else if (/\/hqdefault\.(jpg|webp)$/i.test(parsed.pathname)) {
                    pushFallback(parsed.pathname.replace(/hqdefault\.(jpg|webp)$/i, 'mqdefault.jpg'));
                    pushFallback(parsed.pathname.replace(/hqdefault\.(jpg|webp)$/i, 'default.jpg'));
                }
                out.push(...fallbacks);
            }
        } catch {}
        return [...new Set(out.filter(Boolean))];
    };

    const candidates = buildCandidateUrls(url);
    const primaryKey = candidates[0] || String(url || '');

    const sendImageResult = (payload, cacheSeconds = 86400) => {
        res.setHeader('Content-Type', payload.contentType || 'image/jpeg');
        res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}`);
        res.setHeader('Content-Length', payload.buffer.length);
        return res.status(200).send(payload.buffer);
    };

    const sendFallbackImage = () => {
        res.setHeader('X-Aether-Thumbnail-Fallback', '1');
        return sendImageResult({
            buffer: THUMBNAIL_PROXY_PLACEHOLDER_BUFFER,
            contentType: 'image/svg+xml',
        }, Math.max(30, Math.floor(THUMBNAIL_PROXY_FAILURE_TTL_MS / 1000)));
    };

    const cachedSuccess = readThumbnailProxyCache(thumbnailProxyCache, primaryKey);
    if (cachedSuccess) {
        return sendImageResult(cachedSuccess);
    }

    if (readThumbnailProxyCache(thumbnailProxyFailureCache, primaryKey)) {
        return sendFallbackImage();
    }

    const fetchUrl = (candidateUrl, redirectDepth = 0) => {
        return new Promise((resolve, reject) => {
            if (redirectDepth > 4) {
                reject(new Error('Too many redirects'));
                return;
            }
            const isHttps = candidateUrl.startsWith('https');
            const client = isHttps ? https : http;
            const req = client.get(candidateUrl, {
                agent: isHttps ? thumbnailProxyHttpsAgent : thumbnailProxyHttpAgent,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                },
                timeout: 3500,
            }, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    // Handle redirect
                    const redirectUrl = response.headers.location.startsWith('http')
                        ? response.headers.location
                        : new URL(response.headers.location, candidateUrl).href;
                    response.resume();
                    resolve(fetchUrl(redirectUrl, redirectDepth + 1));
                    return;
                }
                
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    response.resume(); // consume response data to free up memory
                    return reject(new Error(`Status ${response.statusCode}`));
                }

                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    resolve({
                        buffer: Buffer.concat(chunks),
                        contentType: response.headers['content-type'] || 'image/jpeg'
                    });
                });
            });

            req.on('error', (err) => reject(err));
            req.on('timeout', () => {
                req.destroy(new Error('Timeout'));
            });
        });
    };

    try {
        let inflight = thumbnailProxyInflight.get(primaryKey);
        if (!inflight) {
            inflight = (async () => {
                let lastError = null;
                for (const candidateUrl of candidates) {
                    try {
                        const result = await fetchUrl(candidateUrl);
                        writeThumbnailProxyCache(thumbnailProxyCache, primaryKey, result, THUMBNAIL_PROXY_SUCCESS_TTL_MS);
                        thumbnailProxyFailureCache.delete(primaryKey);
                        return result;
                    } catch (e) {
                        lastError = e;
                        if (shouldLogStreamEvent(`proxy-thumb-error:${candidateUrl}`, 30000)) {
                            console.error('[Aether Proxy] Fetch error:', candidateUrl, e.message);
                        }
                    }
                }
                throw lastError || new Error('Proxy Error');
            })();
            thumbnailProxyInflight.set(primaryKey, inflight);
            inflight.finally(() => {
                if (thumbnailProxyInflight.get(primaryKey) === inflight) {
                    thumbnailProxyInflight.delete(primaryKey);
                }
            });
        }

        try {
            const result = await inflight;
            return sendImageResult(result);
        } catch (e) {
            writeThumbnailProxyCache(thumbnailProxyFailureCache, primaryKey, {
                message: e?.message || 'Proxy Error',
            }, THUMBNAIL_PROXY_FAILURE_TTL_MS);
            if (shouldLogStreamEvent(`proxy-thumb-fallback:${primaryKey}`, 30000)) {
                console.warn('[Aether Proxy] Serving fallback thumbnail for', primaryKey, e?.message || 'Proxy Error');
            }
            return sendFallbackImage();
        }
    } catch (e) {
        return sendFallbackImage();
    }
});

// --- NEURAL ENGINE HANDLERS (CONVERGED V9.0.0) ---
streamApp.use(express.json());

// 1. QUEUE STATUS
streamApp.get('/api/queue/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    console.log('[Aether/API] GET /api/queue', {
        id: req.params.id,
        songs: queue.songs?.length || 0,
        isPlaying: queue.isPlaying,
        currentMs: queue.currentMs,
    });
    res.json(queue);
});

// 2. SEARCH (Direct Integration)
streamApp.get('/api/search', async (req, res) => {
    try {
        console.log('[Aether/API] GET /api/search', { q: req.query.q });
        const results = await search(req.query.q, ytdlpPath);
        const count = results?.length || 0;
        console.log('[Aether/API] GET /api/search result', { q: req.query.q, count });
        logDebug('api search completed', { query: String(req.query.q || '').slice(0, 60), count, searchPath: ytdlpPath || 'unresolved' });
        if (count === 0) {
            logDebug('api search returned no results', { query: String(req.query.q || '').slice(0, 60), searchPath: ytdlpPath || 'unresolved' });
        }
        res.json(results);
    } catch (e) {
        console.error('[Aether/API] GET /api/search failed', e.message);
        logDebug('api search failed', { query: String(req.query.q || '').slice(0, 60), error: e?.message || String(e) });
        res.json([]);
    }
});

// 3. ADD TRACK
streamApp.post('/api/add/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    const { track } = req.body;
    console.log('[Aether/API] POST /api/add', {
        id: req.params.id,
        title: track?.title,
        author: track?.author,
        url: track?.actualUrl || track?.url,
    });
    queue.songs.push(track);
    if (queue.songs.length === 1) {
        queue.currentMs = 0;
    }
    res.json({ success: true, position: queue.songs.length - 1 });
});

// 4. CONTROL (Pause/Skip/Seek)
streamApp.post('/api/control/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    const { action, time } = req.body;
    console.log('[Aether/API] POST /api/control', { id: req.params.id, action, time });
    
    switch (action) {
        case 'pause': queue.isPlaying = false; break;
        case 'resume': queue.isPlaying = true; break;
        case 'seek': queue.seekOffset = time; break;
        case 'skip': 
            queue.songs.shift(); 
            queue.seekOffset = 0;
            if (queue.songs.length === 0) {
                queue.isPlaying = false;
                queue.currentMs = 0;
            }
            break;
        case 'shuffle':
            if (queue.songs.length > 1) {
                const q = queue.songs;
                for (let i = q.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [q[i], q[j]] = [q[j], q[i]];
                }
                queue.seekOffset = 0;
            }
            break;
    }
    
    // Broadcast to Frontend
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('aether:control', action);
    }
    res.json({ success: true });
});

// 5. HEARTBEAT (Frontend State Sync)
streamApp.post('/api/heartbeat/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    const { currentTime, isPlaying } = req.body;
    console.log('[Aether/API] POST /api/heartbeat', { id: req.params.id, currentTime, isPlaying });
    queue.currentMs = currentTime;
    queue.isPlaying = isPlaying;
    res.json({ success: true });
});

// 6. LYRICS (Converged Sync)
streamApp.get('/api/lyrics', async (req, res) => {
    const { track, artist, duration, url, query } = req.query;
    try {
        console.log('[Aether/API] GET /api/lyrics', { track, artist, duration, url, query });
        const durationSec = Number.isFinite(Number(duration)) ? Number(duration) : 0;
        const results = await fetchSyncedLyrics(track, artist, durationSec, query, url);
        console.log('[Aether/API] GET /api/lyrics result', { track, artist, hasLyrics: !!results?.lyrics?.length, count: results?.lyrics?.length || 0, source: results?.source });
        res.json(results?.lyrics || []);
    } catch (e) {
        console.error('[Aether/API] GET /api/lyrics failed', e.message);
        res.json([]);
    }
});

// 7. METADATA (Converged Sync)
streamApp.get('/api/metadata', async (req, res) => {
    try {
        console.log('[Aether/API] GET /api/metadata', { url: req.query.url });
        const meta = await getMetadata(req.query.url, ytdlpPath);
        res.json(meta);
    } catch (e) {
        console.error('[Aether/API] GET /api/metadata failed', e.message);
        res.status(500).end();
    }
});

const SERVER_PORT = 3333;
let actualPort = SERVER_PORT;

const startServer = (port) => {
    streamApp.listen(port, () => {
        actualPort = port;
        console.log(`[Aether] Neural Convergence Engine running on port ${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`[Aether] Port ${port} busy, trying ${port + 1}...`);
            startServer(port + 1);
        }
    });
};

// --- NEURAL ENGINE ROUTES (Converged V9.1.5) ---
streamApp.use(express.json());

// 1. QUEUE STATUS
streamApp.get('/api/queue/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    res.json(queue);
});

// 2. SEARCH
streamApp.get('/api/search', async (req, res) => {
    try {
        const ready = await ensureYtDlpPathWithTimeout(12000);
        if (!ready) {
            console.log('[Aether/API] /api/search proceeding without confirmed yt-dlp readiness');
        }
        const searchPath = ytdlpPath || resolveYtDlpPath() || resolveSystemYtDlp();
        const results = await search(req.query.q, searchPath);
        res.json(results);
    } catch (e) { res.json([]); }
});

// 3. ADD TRACK
streamApp.post('/api/add/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    const { track } = req.body;
    queue.songs.push(track);
    if (queue.songs.length === 1) {
        queue.currentMs = 0;
    }
    res.json({ success: true, position: queue.songs.length - 1 });
});

// 4. CONTROL
streamApp.post('/api/control/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    const { action, time } = req.body;
    switch (action) {
        case 'pause': queue.isPlaying = false; break;
        case 'resume': queue.isPlaying = true; break;
        case 'seek': queue.seekOffset = time; break;
        case 'skip': 
            queue.songs.shift(); 
            queue.seekOffset = 0;
            if (queue.songs.length === 0) {
                queue.isPlaying = false;
                queue.currentMs = 0;
            }
            break;
        case 'shuffle':
            if (queue.songs.length > 1) {
                const q = queue.songs;
                for (let i = q.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [q[i], q[j]] = [q[j], q[i]];
                }
                queue.seekOffset = 0;
            }
            break;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('aether:control', action);
    }
    res.json({ success: true });
});

// 5. HEARTBEAT
streamApp.post('/api/heartbeat/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    const { currentTime, isPlaying } = req.body;
    queue.currentMs = currentTime;
    queue.isPlaying = isPlaying;
    res.json({ success: true });
});

// 6. LYRICS
streamApp.get('/api/lyrics', async (req, res) => {
    const { track, artist, duration, url, query } = req.query;
    try {
        const durationSec = Number.isFinite(Number(duration)) ? Number(duration) : 0;
        const results = await fetchSyncedLyrics(track, artist, durationSec, query, url);
        res.json(results?.lyrics || []);
    } catch (e) { res.json([]); }
});

// 7. METADATA
streamApp.get('/api/metadata', async (req, res) => {
    try {
        const meta = await getMetadata(req.query.url, ytdlpPath);
        res.json(meta);
    } catch (e) { res.status(500).end(); }
});

startServer(SERVER_PORT);

// --- DISCORD RPC (V6.6.2) ---
const clientId = process.env.VITE_DISCORD_CLIENT_ID || '1486690205346824342';
let rpcClient;
let rpcLoginInFlight = false;
let rpcRetryTimer = null;
let rpcLastDetails = null;

const scheduleRPCReconnect = (delayMs = 12000) => {
    if (rpcRetryTimer) return;
    rpcRetryTimer = setTimeout(async () => {
        rpcRetryTimer = null;
        await initRPC();
    }, Math.max(2000, delayMs));
};

const buildRPCActivity = (details = {}) => {
    const title = String(details.title || '').trim();
    const artist = String(details.artist || '').trim();
    const isPlaying = details.isPlaying !== false;
    const activity = {
        type: isPlaying ? 2 : 0,
        details: (title || 'Music Lobby').slice(0, 127),
        state: isPlaying
            ? (artist ? `by ${artist}`.slice(0, 127) : 'Listening on Aether')
            : (artist ? `Paused • ${artist}`.slice(0, 127) : 'Paused'),
        largeImageKey: details.thumbnail || 'cover',
        largeImageText: (title || 'Aether').slice(0, 127),
        smallImageKey: 'icon',
        smallImageText: 'Aether',
        instance: false
    };
    if (isPlaying) {
        activity.startTimestamp = details.startTime;
        activity.endTimestamp = details.endTime;
    }
    return activity;
};

const pushRPCActivity = async (details = {}) => {
    if (!rpcClient || !rpcClient.user) return false;
    const activity = buildRPCActivity(details);
    try {
        await rpcClient.setActivity(activity);
        return true;
    } catch (err) {
        console.error(`[Aether] setActivity FAULT: ${err.message}`);
        return false;
    }
};

async function initRPC() {
    if (rpcClient && rpcClient.user) return true;
    if (rpcLoginInFlight) return false;

    if (!rpcClient) {
        rpcClient = new DiscordRPC.Client({ transport: 'ipc' });
        rpcClient.on('ready', async () => {
            if (rpcLastDetails) {
                await pushRPCActivity(rpcLastDetails);
            } else {
                await pushRPCActivity({ title: 'Music Lobby', artist: 'Organizing the Vibe Buffer', isPlaying: false, startTime: Date.now() });
            }
        });
        rpcClient.on('disconnected', () => {
            rpcClient = null;
            scheduleRPCReconnect(10000);
        });
        rpcClient.on('error', () => {
            rpcClient = null;
            scheduleRPCReconnect(10000);
        });
    }

    rpcLoginInFlight = true;
    try {
        await rpcClient.login({ clientId });
        return true;
    } catch (e) {
        rpcClient = null;
        scheduleRPCReconnect(12000);
        return false;
    } finally {
        rpcLoginInFlight = false;
    }
}

async function setRPCActivity(details) {
        rpcLastDetails = details || null;
        const connected = await initRPC();
        if (!connected) return;
        const ok = await pushRPCActivity(rpcLastDetails || {});
        if (!ok) scheduleRPCReconnect(8000);
}

// --- ELECTRON LIFECYCLE ---
function createWindow() {
  const isWin = process.platform === 'win32';
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    title: "Aether",
    icon: path.join(__dirname, '../icon.png'),
    frame: !isWin,
    titleBarStyle: isWin ? 'hidden' : 'hiddenInset',
    titleBarOverlay: isWin ? WINDOWS_TITLEBAR_OVERLAY : undefined,
    backgroundColor: '#050505',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
  });

  if (isWin) {
    applyWindowsTitleBarOverlay(mainWindow);
  }

  if (!app.isPackaged && process.env.NODE_ENV !== 'production' && !process.argv.includes('--prod')) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
        console.warn('[Aether] Dev server not found, falling back to local bundle.');
        mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  // --- CUSTOM APP MENU (V6.6.2) ---
  if (process.platform === 'darwin') {
    const template = [
      {
        label: 'Aether',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forcereload' },
          { role: 'toggledevtools' },
          { type: 'separator' },
          { role: 'resetzoom' },
          { role: 'zoomin' },
          { role: 'zoomout' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        role: 'window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    } else {
        // Hide default app menu on non-macOS platforms.
        Menu.setApplicationMenu(null);
  }

  mainWindow.on('maximize', () => {
    applyWindowsTitleBarOverlay(mainWindow);
    mainWindow.webContents.send('aether:maximized-state', true);
  });

  mainWindow.on('unmaximize', () => {
    applyWindowsTitleBarOverlay(mainWindow);
    mainWindow.webContents.send('aether:maximized-state', false);
  });

  mainWindow.on('enter-full-screen', () => {
    applyWindowsTitleBarOverlay(mainWindow);
    mainWindow.webContents.send('aether:maximized-state', true);
  });

  mainWindow.on('leave-full-screen', () => {
    applyWindowsTitleBarOverlay(mainWindow);
    mainWindow.webContents.send('aether:maximized-state', false);
  });

  mainWindow.on('closed', () => {
    windowsTitleBarForceCompact = false;
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
    await initRPC();
    createWindow();
    initAutoUpdater();
    ensureYtDlpPath().catch(() => {});

    try {
        const policy = getStoragePolicy();
        const oldResult = pruneOldCacheFiles(policy.maxCacheAgeDays);
        const capResult = enforceCacheCap(policy.cacheCapMb);
        console.log('[Aether/Storage] Startup maintenance complete', {
            maxCacheAgeDays: policy.maxCacheAgeDays,
            cacheCapMb: policy.cacheCapMb,
            oldRemovedFiles: oldResult.removedFiles,
            oldRemovedBytes: oldResult.removedBytes,
            capRemovedFiles: capResult.removedFiles,
            capRemovedBytes: capResult.removedBytes,
        });
    } catch (e) {
        console.warn('[Aether/Storage] Startup maintenance failed', e?.message || e);
    }

    // --- UNIVERSAL MEDIA BRIDGE (V7.1.0) ---
    const failedShortcuts = [];
    let registeredShortcutCount = 0;
    const isMac = process.platform === 'darwin';
    const GLOBAL_MEDIA_SHORTCUTS_KEY = 'aether.globalMediaShortcuts.enabled';
    const defaultGlobalMediaShortcutsEnabled = isMac;
    const globalMediaShortcutsEnabled = Boolean(store.get(GLOBAL_MEDIA_SHORTCUTS_KEY, defaultGlobalMediaShortcutsEnabled));
    const isLikelySystemMediaKey = (keys) => /^Media|^Volume/.test(String(keys || ''));

    const registerShortcut = (keys, command) => {
        try {
            const ok = globalShortcut.register(keys, () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('aether:control', command);
                }
            });
            if (!ok) {
                failedShortcuts.push({ keys, command });
                if (isMac && isLikelySystemMediaKey(keys)) {
                    console.log(`[Aether/Shortcuts] Media key unavailable (likely owned by macOS): ${keys} -> ${command}`);
                } else {
                    console.warn(`[Aether/Shortcuts] Failed to register ${keys} -> ${command}`);
                }
            } else {
                registeredShortcutCount += 1;
            }
        } catch (e) {
            failedShortcuts.push({ keys, command });
            console.warn(`[Aether/Shortcuts] Error registering ${keys}: ${e.message}`);
        }
    };

    if (globalMediaShortcutsEnabled) {
        // Conservative global shortcuts only: playback media keys.
        // Avoid volume/F-key/chord grabs that can conflict with OS and other apps.
        registerShortcut('MediaPlayPause', 'toggle');
        registerShortcut('MediaNextTrack', 'skip');
        registerShortcut('MediaPreviousTrack', 'previous');
    } else {
        console.log('[Aether/Shortcuts] Global media shortcuts disabled for this platform/profile.');
    }

    if (failedShortcuts.length > 0) {
        const failedKeys = failedShortcuts.map(item => item.keys).join(', ');
        console.log(`[Aether/Shortcuts] Registered ${registeredShortcutCount} shortcut(s). Failed ${failedShortcuts.length}: ${failedKeys}`);
        if (isMac) {
            console.log('[Aether/Shortcuts] Tip: macOS may reserve media keys for system apps.');
        }
    } else {
        console.log(`[Aether/Shortcuts] Registered ${registeredShortcutCount} shortcut(s).`);
    }

    // --- NEURAL WATCHER (V6.9.0) ---
    const musicDir = process.env.LOCAL_MUSIC_PATH || path.join(app.getPath('music'), 'Aether Studio');
    if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });

    const watcher = chokidar.watch(musicDir, { ignored: /(^|[\/\\])\../, persistent: true });
    watcher.on('add', (f) => {
        if (f.match(/\.(mp3|m4a|wav|flac)$/i)) {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('aether:library-update', { type: 'add', path: f });
        }
    });

  // --- STANDALONE IPC HANDLERS ---
    ipcMain.handle('aether:update-rpc', async (event, details) => {
        try {
            await setRPCActivity(details);
            return { success: true };
        } catch (e) {
            console.error(`[Aether] RPC Internal Error: ${e.message}`);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('aether:store-get', (event, key) => store.get(key));
    ipcMain.handle('aether:store-set', (event, key, val) => {
        // During shutdown, ignore playback session rewrites and keep queue cleared.
        if (isAppQuitting && key === SESSION_PLAYBACK_STORE_KEY) return true;
        store.set(key, val);
        return true;
    });
    ipcMain.handle('aether:debug-log', async (event, payload = {}) => {
        const message = String(payload?.message || '').trim();
        if (!message) return false;
        logDebug(`renderer:${message}`, payload?.meta && typeof payload.meta === 'object' ? payload.meta : null);
        return true;
    });
    ipcMain.handle('aether:get-port', () => actualPort);
    ipcMain.handle('aether:get-engine-status', async () => {
        const resolvedYtDlp = resolveYtDlpPath();
        if (resolvedYtDlp) {
            ytdlpPath = resolvedYtDlp;
        }
        const resolvedFfmpeg = resolveFfmpegPath();
        if (resolvedFfmpeg) {
            ffmpegPath = resolvedFfmpeg;
        }
        const ytDlpReady = await ensureYtDlpPathWithTimeout(process.platform === 'win32' ? 5000 : 2500);
        const cookiesPath = getResolvedCookiesPath();
        const cookieAudit = auditCookiesFile(cookiesPath);
        const ffmpegReady = !!ffmpegPath && (ffmpegPath === 'ffmpeg' || fs.existsSync(ffmpegPath));
        return {
            success: true,
            ytDlpReady: !!ytDlpReady && !!ytdlpPath,
            ytDlpPath: ytdlpPath || null,
            ffmpegReady,
            ffmpegPath: ffmpegPath || null,
            cookiesReady: !!cookiesPath,
            cookiesPath: cookiesPath || null,
            cookieAudit,
            streamPort: actualPort,
            platform: process.platform,
        };
    });
    ipcMain.handle('aether:repair-runtime', async () => {
        const notes = [];

        const resolvedFfmpeg = resolveFfmpegPath() || unpackNativeEngine(getFfmpegBinaryNames()[0], { force: true });
        if (resolvedFfmpeg) {
            ffmpegPath = resolvedFfmpeg;
            notes.push(`FFmpeg ready • ${path.basename(resolvedFfmpeg)}`);
        } else {
            notes.push('FFmpeg still unavailable');
        }

        const bundledYtDlp = resolveYtDlpPath();
        if (bundledYtDlp && isSpawnableCommand(bundledYtDlp)) {
            ytdlpPath = bundledYtDlp;
            notes.push(`yt-dlp ready • ${path.basename(bundledYtDlp)}`);
        } else {
            const ytReady = await ensureYtDlpPathWithTimeout(process.platform === 'win32' ? 18000 : 12000);
            if (ytReady && ytdlpPath) {
                notes.push(`yt-dlp ready • ${path.basename(ytdlpPath)}`);
            } else {
                notes.push('yt-dlp still unavailable');
            }
        }

        logDebug('runtime repair completed', { notes, ytdlpPath, ffmpegPath });
        return {
            success: true,
            notes,
            ytDlpPath: ytdlpPath || null,
            ffmpegPath: ffmpegPath || null,
        };
    });

    ipcMain.handle('aether:update-get-status', () => ({ ...updateState }));

    ipcMain.handle('aether:update-check', async () => {
        if (!autoUpdater || !updateState.enabled) {
            return { success: false, error: 'Updater unavailable in this build.', state: { ...updateState } };
        }
        try {
            await autoUpdater.checkForUpdates();
            return { success: true, state: { ...updateState } };
        } catch (e) {
            const msg = e?.message || 'Update check failed.';
            setUpdateState({ status: 'error', message: msg });
            return { success: false, error: msg, state: { ...updateState } };
        }
    });

    ipcMain.handle('aether:update-download', async () => {
        if (!autoUpdater || !updateState.enabled) {
            return { success: false, error: 'Updater unavailable in this build.', state: { ...updateState } };
        }
        if (!updateState.available) {
            return { success: false, error: 'No available update to download.', state: { ...updateState } };
        }
        try {
            await autoUpdater.downloadUpdate();
            return { success: true, state: { ...updateState } };
        } catch (e) {
            const msg = e?.message || 'Update download failed.';
            setUpdateState({ status: 'error', message: msg });
            return { success: false, error: msg, state: { ...updateState } };
        }
    });

    ipcMain.handle('aether:update-quit-and-install', async () => {
        if (!autoUpdater || !updateState.enabled) {
            return { success: false, error: 'Updater unavailable in this build.' };
        }
        if (!updateState.downloaded) {
            return { success: false, error: 'No downloaded update ready to install.' };
        }
        try {
            setTimeout(() => {
                try {
                    autoUpdater.quitAndInstall(false, true);
                } catch {}
            }, 60);
            return { success: true };
        } catch (e) {
            return { success: false, error: e?.message || 'Failed to restart for update.' };
        }
    });

    ipcMain.handle('aether:lock-status', () => {
        const record = getLockRecord();
        return {
            enabled: !!record?.enabled,
            touchIdAvailable: canPromptTouchId(),
            touchIdEnabled: !!record?.touchIdEnabled,
            recoveryOtpEnabled: !!record?.recoveryOtpSecret,
        };
    });

    ipcMain.handle('aether:lock-generate-otp', () => {
        try {
            return { success: true, ...createRecoveryOtpProfile() };
        } catch (e) {
            return { success: false, error: e?.message || 'Could not generate authenticator setup.' };
        }
    });

    ipcMain.handle('aether:lock-set-password', (event, { password, useTouchId, recoveryKey, recoveryOtpSecret }) => {
        const pass = String(password || '');
        if (pass.length < 4) return { success: false, error: 'Password must be at least 4 characters.' };
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashLockPassword(pass, salt);
        
        let recoveryHash = null;
        let recoverySalt = null;
        if (recoveryKey) {
            recoverySalt = crypto.randomBytes(16).toString('hex');
            recoveryHash = hashLockPassword(recoveryKey, recoverySalt);
        }
        const normalizedRecoveryOtpSecret = sanitizeRecoveryOtpSecret(recoveryOtpSecret);

        store.set(APP_LOCK_STORE_KEY, {
            enabled: true,
            salt,
            hash,
            touchIdEnabled: !!useTouchId && canPromptTouchId(),
            recoveryHash,
            recoverySalt,
            recoveryOtpSecret: normalizedRecoveryOtpSecret.length >= 16 ? normalizedRecoveryOtpSecret : null,
            updatedAt: Date.now(),
        });
        return { success: true };
    });

    ipcMain.handle('aether:lock-verify-password', (event, { password }) => {
        const record = getLockRecord();
        if (!record?.enabled) return { success: true };
        const ok = verifyLockPassword(password, record);
        return ok ? { success: true } : { success: false, error: 'Incorrect password.' };
    });

    ipcMain.handle('aether:lock-disable', (event, { password }) => {
        const record = getLockRecord();
        if (!record?.enabled) return { success: true };
        const ok = verifyLockPassword(password, record);
        if (!ok) return { success: false, error: 'Incorrect password.' };
        store.delete(APP_LOCK_STORE_KEY);
        return { success: true };
    });

    ipcMain.handle('aether:lock-disable-recovery', (event, { recoveryKey }) => {
        const record = getLockRecord();
        if (!record?.enabled) return { success: true };
        if (!record.recoveryHash || !record.recoverySalt) return { success: false, error: 'No recovery key set for this lock.' };
        const ok = verifyLockPassword(recoveryKey, { hash: record.recoveryHash, salt: record.recoverySalt });
        if (!ok) return { success: false, error: 'Incorrect recovery key.' };
        store.delete(APP_LOCK_STORE_KEY);
        return { success: true };
    });

    ipcMain.handle('aether:lock-disable-otp', (event, { code }) => {
        const record = getLockRecord();
        if (!record?.enabled) return { success: true };
        if (!record.recoveryOtpSecret) return { success: false, error: 'No mobile OTP recovery is set for this lock.' };
        const ok = verifyRecoveryOtp(code, record.recoveryOtpSecret);
        if (!ok) return { success: false, error: 'Incorrect or expired authenticator code.' };
        store.delete(APP_LOCK_STORE_KEY);
        return { success: true };
    });

    ipcMain.handle('aether:lock-verify-biometric', async () => {
        if (!canPromptTouchId()) return { success: false, error: 'Touch ID not available.' };
        try {
            await systemPreferences.promptTouchID('Unlock Aether');
            return { success: true };
        } catch (e) {
            return { success: false, error: e?.message || 'Biometric authentication failed.' };
        }
    });

    ipcMain.handle('aether:lock-set-touchid', (event, { enabled }) => {
        const record = getLockRecord();
        if (!record?.enabled) return { success: false, error: 'Lock is not enabled.' };
        const next = {
            ...record,
            touchIdEnabled: !!enabled && canPromptTouchId(),
            updatedAt: Date.now(),
        };
        store.set(APP_LOCK_STORE_KEY, next);
        return { success: true, touchIdEnabled: next.touchIdEnabled };
    });


    ipcMain.handle('aether:window-resize', (event, { width, height, alwaysOnTop }) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const miniMode = !!alwaysOnTop;
            const workArea = screen?.getDisplayMatching?.(mainWindow.getBounds())?.workAreaSize || screen?.getPrimaryDisplay?.()?.workAreaSize || { width: 1440, height: 900 };
            const maxW = Math.max(900, Number(workArea.width || 1440));
            const maxH = Math.max(620, Number(workArea.height || 900));
            const normalMinW = Math.min(1000, Math.max(760, maxW - 120));
            const normalMinH = Math.min(700, Math.max(560, maxH - 120));

            // Normalize window state before changing size constraints.
            // This avoids stale maximize/fullscreen state causing disabled native controls.
            if (mainWindow.isFullScreen()) {
                mainWindow.setFullScreen(false);
            }
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            }

            if (miniMode) {
                mainWindow.setResizable(false);
                if (typeof mainWindow.setMaximizable === 'function') mainWindow.setMaximizable(false);
                if (typeof mainWindow.setFullScreenable === 'function') mainWindow.setFullScreenable(false);
                if (typeof mainWindow.setMinimizable === 'function') mainWindow.setMinimizable(true);
                if (process.platform === 'darwin' && typeof mainWindow.setWindowButtonVisibility === 'function') {
                    // Keep controls visible in mini mode but with maximize disabled.
                    mainWindow.setWindowButtonVisibility(true);
                }
                mainWindow.setMinimumSize(width || 420, height || 190);
                mainWindow.setMaximumSize(width || 420, height || 190);
            } else {
                mainWindow.setResizable(true);
                if (typeof mainWindow.setMaximizable === 'function') mainWindow.setMaximizable(true);
                if (typeof mainWindow.setFullScreenable === 'function') mainWindow.setFullScreenable(true);
                if (typeof mainWindow.setMinimizable === 'function') mainWindow.setMinimizable(true);
                if (process.platform === 'darwin' && typeof mainWindow.setWindowButtonVisibility === 'function') {
                    mainWindow.setWindowButtonVisibility(true);
                }
                mainWindow.setMinimumSize(normalMinW, normalMinH);
                // Keep cap bounded to active display to avoid non-maximizable edge cases.
                mainWindow.setMaximumSize(maxW, maxH);
            }
            const targetW = Math.max(miniMode ? 300 : normalMinW, Math.min(Number(width || 1280), maxW));
            const targetH = Math.max(miniMode ? 160 : normalMinH, Math.min(Number(height || 800), maxH));
            mainWindow.setSize(targetW, targetH, true);
            mainWindow.center();
            mainWindow.setAlwaysOnTop(miniMode);

            // macOS sometimes keeps stale disabled traffic lights after constraint flips.
            // Re-apply window capabilities on next tick to ensure green maximize returns.
            if (!miniMode && process.platform === 'darwin') {
                setTimeout(() => {
                    try {
                        if (!mainWindow || mainWindow.isDestroyed()) return;
                        mainWindow.setResizable(true);
                        if (typeof mainWindow.setMaximizable === 'function') mainWindow.setMaximizable(true);
                        if (typeof mainWindow.setFullScreenable === 'function') mainWindow.setFullScreenable(true);
                        if (typeof mainWindow.setWindowButtonVisibility === 'function') mainWindow.setWindowButtonVisibility(true);
                    } catch {}
                }, 40);
            }
        }
    });

    ipcMain.handle('aether:window-toggle-maximize', () => {
        if (!mainWindow || mainWindow.isDestroyed()) return { success: false };
        if (mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(false);
            return { success: true, state: 'windowed' };
        }
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
            return { success: true, state: 'windowed' };
        }
        mainWindow.maximize();
        return { success: true, state: 'maximized' };
    });

    ipcMain.handle('aether:window-set-titlebar-compact', (event, { compact }) => {
        if (!mainWindow || mainWindow.isDestroyed()) return { success: false, compact: false };
        windowsTitleBarForceCompact = !!compact;
        applyWindowsTitleBarOverlay(mainWindow);
        return {
            success: true,
            compact: shouldCompactWindowsTitleBar(mainWindow),
        };
    });

    ipcMain.handle('aether:window-minimize', () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.minimize();
    });

    ipcMain.handle('aether:window-close', () => {
        if (!mainWindow || mainWindow.isDestroyed()) return { success: false };
        mainWindow.close();
        return { success: true };
    });

    ipcMain.handle('aether:open-external', async (event, url) => {
        const { shell } = require('electron');
        await shell.openExternal(url);
    });

    ipcMain.handle('aether:download', async (event, { url, trackId }) => {
        console.log(`[Aether] Starting download for trackId: ${trackId}, url: ${url}`);
        try {
            const now = Date.now();
            const gate = downloadBackoffByTrack.get(trackId);
            if (gate && now < gate.retryAfter) {
                const waitMs = Math.max(0, gate.retryAfter - now);
                return { success: false, error: `warmup throttled (${Math.ceil(waitMs / 1000)}s)` };
            }

            const ready = await ensureYtDlpPathWithTimeout(8000);
            if (!ready) {
                const prev = downloadBackoffByTrack.get(trackId);
                const failures = (prev?.failures || 0) + 1;
                const retryAfter = now + Math.min(120000, 5000 * failures);
                downloadBackoffByTrack.set(trackId, { failures, retryAfter, reason: 'yt-dlp unavailable' });
                return { success: false, error: 'yt-dlp unavailable' };
            }

            const filePath = await offlineEngine.download(url, trackId, ytdlpPath, ffmpegPath);
            downloadBackoffByTrack.delete(trackId);
            const policy = getStoragePolicy();
            enforceCacheCap(policy.cacheCapMb);
            console.log(`[Aether] Download successful for ${trackId}: ${filePath}`);
            // Emit library update
            const downloaded = await offlineEngine.getDownloadedTracks();
            console.log(`[Aether] Emitting library update with ${downloaded.length} tracks`);
            mainWindow.webContents.send('aether:library-update', downloaded);
            return { success: true, filePath };
        } catch (e) {
            console.error(`[Aether] Download failed for ${trackId}: ${e.message}`);
            const prev = downloadBackoffByTrack.get(trackId);
            const failures = (prev?.failures || 0) + 1;
            const msg = String(e?.message || '').toLowerCase();
            const baseDelay = /403|416|resolve|nodename|ffmpeg|ffprobe/.test(msg) ? 20000 : 6000;
            const retryAfter = Date.now() + Math.min(180000, baseDelay * failures);
            downloadBackoffByTrack.set(trackId, { failures, retryAfter, reason: e.message || 'download failed' });
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('aether:save-to-disk', async (event, { url, title, author }) => {
        try {
            if (!url) return { success: false, error: 'Missing URL' };

            const match = String(url).match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
            const youtubeId = match ? match[1] : null;
            const baseName = `${title || 'track'}-${author || 'unknown'}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 48) || 'track';
            const trackId = youtubeId || `${baseName}-${Date.now().toString(36)}`;

            const result = await offlineEngine.download(url, trackId, ytdlpPath, ffmpegPath);
            const policy = getStoragePolicy();
            enforceCacheCap(policy.cacheCapMb);
            const downloaded = await offlineEngine.getDownloadedTracks();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('aether:library-update', downloaded);
            }

            return {
                success: true,
                trackId,
                filePath: result?.filePath || result
            };
        } catch (e) {
            console.error(`[Aether] save-to-disk failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('aether:export-audio-file', async (event, { url, title, author }) => {
        try {
            if (!url) return { success: false, error: 'Missing URL' };

            const ready = await ensureYtDlpPathWithTimeout(8000);
            if (!ready) return { success: false, error: 'yt-dlp unavailable' };

            const safeBase = `${title || 'track'}-${author || 'unknown'}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 64) || 'track';

            const suggestedPath = path.join(app.getPath('downloads'), `${safeBase}.m4a`);
            const pick = await dialog.showSaveDialog(mainWindow, {
                title: 'Export Audio File',
                defaultPath: suggestedPath,
                filters: [
                    { name: 'Audio (M4A)', extensions: ['m4a'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });

            if (pick?.canceled || !pick?.filePath) return { success: false, cancel: true };

            let targetPath = pick.filePath;
            if (!/\.[A-Za-z0-9]+$/.test(path.basename(targetPath))) {
                targetPath = `${targetPath}.m4a`;
            }

            await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

            const MIN_VALID_AUDIO_BYTES = 64 * 1024;
            const args = [
                url,
                '-f', 'bestaudio[ext=m4a]/bestaudio',
                '-o', targetPath,
                '--no-part',
                '--no-continue',
                '--no-check-certificates',
                '--no-warnings',
                '--quiet',
            ];

            await new Promise((resolve, reject) => {
                const proc = spawn(ytdlpPath, args);
                let stderr = '';

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('error', (err) => reject(err));

                proc.on('close', (code) => {
                    try {
                        const size = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : 0;
                        if (code === 0 && size >= MIN_VALID_AUDIO_BYTES) {
                            return resolve();
                        }
                        if (fs.existsSync(targetPath) && size < MIN_VALID_AUDIO_BYTES) {
                            try { fs.unlinkSync(targetPath); } catch {}
                        }
                        return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
                    } catch (e) {
                        return reject(e);
                    }
                });
            });

            return { success: true, filePath: targetPath };
        } catch (e) {
            console.error(`[Aether] export-audio-file failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('aether:get-offline-tracks', async () => {
        return await offlineEngine.getDownloadedTracks();
    });

    ipcMain.handle('aether:get-offline-downloads', async () => {
        try {
            const downloads = await offlineEngine.getDownloadedTrackDetails();
            return { success: true, downloads };
        } catch (e) {
            return { success: false, error: e?.message || 'Failed to list downloaded tracks.', downloads: [] };
        }
    });

    ipcMain.handle('aether:remove-offline-track', async (event, { trackId } = {}) => {
        try {
            const id = String(trackId || '').trim();
            if (!id) return { success: false, error: 'Missing trackId' };

            const result = await offlineEngine.removeDownload(id, { cancelInProgress: true, removeSidecars: true });
            downloadBackoffByTrack.delete(id);

            const downloaded = await offlineEngine.getDownloadedTracks();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('aether:library-update', downloaded);
            }

            return { success: !!result?.success, result, downloaded };
        } catch (e) {
            return { success: false, error: e?.message || 'Failed to remove offline track.' };
        }
    });

    ipcMain.handle('aether:clear-offline-downloads', async () => {
        try {
            const result = await offlineEngine.clearAllDownloads({ cancelInProgress: true, removeSidecars: true });
            downloadBackoffByTrack.clear();

            const downloaded = await offlineEngine.getDownloadedTracks();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('aether:library-update', downloaded);
            }

            return { success: !!result?.success, result, downloaded };
        } catch (e) {
            return { success: false, error: e?.message || 'Failed to clear offline downloads.' };
        }
    });

    ipcMain.handle('aether:get-storage-stats', async () => {
        try {
            return { success: true, ...getStorageStats() };
        } catch (e) {
            return { success: false, error: e?.message || 'Failed to compute storage stats.' };
        }
    });

    ipcMain.handle('aether:update-storage-policy', async (event, payload = {}) => {
        try {
            const current = getStoragePolicy();
            const next = {
                cacheCapMb: Number.isFinite(payload.cacheCapMb) ? Math.max(256, Math.min(16384, Math.floor(payload.cacheCapMb))) : current.cacheCapMb,
                maxCacheAgeDays: Number.isFinite(payload.maxCacheAgeDays) ? Math.max(1, Math.min(365, Math.floor(payload.maxCacheAgeDays))) : current.maxCacheAgeDays,
            };
            store.set(STORAGE_POLICY_STORE_KEY, next);
            return { success: true, policy: next };
        } catch (e) {
            return { success: false, error: e?.message || 'Failed to update policy.' };
        }
    });

    ipcMain.handle('aether:get-storage-estimate', async (event, payload = {}) => {
        try {
            const mode = String(payload.mode || 'cap');
            const estimate = estimateStorageReclaim(mode, payload);
            return { success: true, ...estimate };
        } catch (e) {
            return { success: false, error: e?.message || 'Failed to estimate storage reclaim.' };
        }
    });

    ipcMain.handle('aether:optimize-storage', async (event, payload = {}) => {
        try {
            const mode = String(payload.mode || 'cap');
            if (mode === 'cap') {
                const policy = getStoragePolicy();
                const cacheCapMb = Number.isFinite(payload.cacheCapMb) ? payload.cacheCapMb : policy.cacheCapMb;
                const result = enforceCacheCap(cacheCapMb);
                return { success: true, mode, result, stats: getStorageStats() };
            }
            if (mode === 'age') {
                const policy = getStoragePolicy();
                const maxCacheAgeDays = Number.isFinite(payload.maxCacheAgeDays) ? payload.maxCacheAgeDays : policy.maxCacheAgeDays;
                const result = pruneOldCacheFiles(maxCacheAgeDays);
                return { success: true, mode, result, stats: getStorageStats() };
            }
            if (mode === 'downloads-only') {
                const result = keepDownloadedOnlyCleanup();
                return { success: true, mode, result, stats: getStorageStats() };
            }
            return { success: false, error: `Unknown optimize mode: ${mode}` };
        } catch (e) {
            return { success: false, error: e?.message || 'Storage optimization failed.' };
        }
    });

    ipcMain.handle('aether:export-vault', async (event, { name, data }) => {
        try {
            const { filePath } = await dialog.showSaveDialog(mainWindow, {
                title: 'Export Aether Vault',
                defaultPath: `${name}.aether`,
                filters: [{ name: 'Aether Vault', extensions: ['aether'] }]
            });
            if (filePath) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                return { success: true };
            }
            return { success: false, cancel: true };
        } catch (e) { return { success: false, error: e.message }; }
    });

    ipcMain.handle('aether:import-cookies', async () => {
        try {
            if (!mainWindow) return { success: false, error: 'No main window' };
            const result = await dialog.showOpenDialog(mainWindow, {
                title: 'Select cookies.txt',
                properties: ['openFile'],
                filters: [{ name: 'Text Files', extensions: ['txt'] }]
            });
            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                return { success: false, canceled: true };
            }
            const srcPath = result.filePaths[0];
            const sourceAudit = auditCookiesFile(srcPath);
            if (!sourceAudit.valid) {
                return {
                    success: false,
                    error: sourceAudit.note || sourceAudit.summary || 'Cookies file format is not usable.',
                    cookieAudit: sourceAudit,
                };
            }
            const destPath = require('path').join(app.getPath('userData'), 'cookies.txt');
            require('fs').copyFileSync(srcPath, destPath);
            const cookieAudit = auditCookiesFile(destPath);
            return { success: true, cookieAudit };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('aether:import-vault', async () => {
        try {
            const { filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: 'Import Aether Vault',
                properties: ['openFile'],
                filters: [{ name: 'Aether Vault', extensions: ['aether'] }]
            });
            if (filePaths && filePaths.length > 0) {
                const content = fs.readFileSync(filePaths[0], 'utf-8');
                const parsed = JSON.parse(content);
                const name = require('path').parse(filePaths[0]).name;
                return { success: true, name, data: parsed };
            }
            return { success: false, cancel: true };
        } catch (e) { return { success: false, error: e.message }; }
    });

    ipcMain.handle('aether:import-spotify-playlist', async (event, { url }) => {
        try {
            const playlistId = extractSpotifyPlaylistId(url);
            if (!playlistId) {
                return { success: false, error: 'Invalid Spotify playlist URL' };
            }

            const importDebug = {
                playlistId,
                apiError: null,
                htmlStatus: null,
                htmlTrackIdCount: 0,
                htmlLabelCount: 0,
            };

            const sendProgress = (payload) => {
                console.log('[Aether/SpotifyImport]', payload);
                try { event.sender.send('aether:spotify-import-progress', payload); } catch (error) {}
            };

            sendProgress({ stage: 'fetching', progress: 5, message: 'Loading Spotify playlist…' });

            let playlistName = 'Spotify Playlist';
            let sourceTracks = [];

            try {
                sendProgress({ stage: 'fetching', progress: 8, message: 'Connecting to Spotify catalog…' });
                const token = await getSpotifyWebAccessToken();
                const apiPayload = await getSpotifyPlaylistViaApi(playlistId, token);
                playlistName = apiPayload.playlistName;
                sourceTracks = apiPayload.tracks;
            } catch (apiErr) {
                importDebug.apiError = apiErr?.message || String(apiErr);
                const htmlSources = [
                    `https://open.spotify.com/playlist/${playlistId}`,
                    `https://open.spotify.com/playlist/${playlistId}?nd=1`,
                    `https://open.spotify.com/embed/playlist/${playlistId}`,
                ];

                const htmlDiagnostics = [];
                let bestPayload = null;

                for (const sourceUrl of htmlSources) {
                    sendProgress({ stage: 'fetching', progress: 9, message: `Trying HTML source: ${sourceUrl.includes('/embed/') ? 'embed' : 'playlist'}…` });
                    const response = await fetchSpotifyHtml(sourceUrl);
                    const html = response?.text || '';
                    const idCount = extractSpotifyTrackIdsFromHtml(html).length;
                    const labelCount = [...html.matchAll(/aria-label="([^"]+)"/g)].length;
                    htmlDiagnostics.push({
                        source: sourceUrl,
                        status: response?.status || 0,
                        ok: !!response?.ok,
                        idCount,
                        labelCount,
                        length: html.length,
                        error: response?.error || null,
                    });

                    if (!response?.ok || !html) continue;

                    const htmlPayload = getSpotifyPlaylistViaHtml(html);
                    if (!bestPayload || (htmlPayload?.tracks?.length || 0) > (bestPayload?.tracks?.length || 0)) {
                        bestPayload = htmlPayload;
                    }
                }

                importDebug.htmlSources = htmlDiagnostics;
                const bestSource = htmlDiagnostics.slice().sort((a, b) => (b.idCount + b.labelCount) - (a.idCount + a.labelCount))[0] || null;
                importDebug.htmlStatus = bestSource?.status || 0;
                importDebug.htmlTrackIdCount = bestSource?.idCount || 0;
                importDebug.htmlLabelCount = bestSource?.labelCount || 0;

                if (!bestPayload || !Array.isArray(bestPayload.tracks)) {
                    return { success: false, error: 'Spotify page fetch failed (no parseable HTML sources)', debug: importDebug };
                }

                playlistName = bestPayload.playlistName;
                sourceTracks = bestPayload.tracks;
            }

            if (!Array.isArray(sourceTracks) || sourceTracks.length === 0) {
                return { success: false, error: 'No tracks found in Spotify playlist.', debug: importDebug };
            }

            sourceTracks = [...new Map(sourceTracks
                .filter(t => t?.spotifyId)
                .map(t => [t.spotifyId, {
                    spotifyId: t.spotifyId,
                    title: decodeHtmlEntities(t.title || '').trim(),
                    artist: decodeHtmlEntities(t.artist || '').trim(),
                }])).values()];

            if (!playlistName || /^spotify playlist$/i.test(String(playlistName).trim())) {
                try {
                    const betterName = await enrichSpotifyPlaylistNameViaOEmbed(playlistId);
                    if (betterName) playlistName = betterName;
                } catch (e) {}
            }

            const hydrationLimit = Math.min(sourceTracks.length, 80);
            let hydratedCount = 0;
            for (let i = 0; i < hydrationLimit; i += 1) {
                const row = sourceTracks[i];
                if (!row?.spotifyId) continue;
                const shouldHydrate = !row.title || !row.artist || row.title.length < 4;
                if (!shouldHydrate) continue;
                sendProgress({
                    stage: 'enriching',
                    progress: 12 + Math.round(((i + 1) / Math.max(hydrationLimit, 1)) * 16),
                    message: `Resolving Spotify track metadata ${i + 1}/${hydrationLimit}…`,
                });
                try {
                    const meta = await enrichSpotifyTrackViaOEmbed(row.spotifyId);
                    if (meta?.title) row.title = meta.title;
                    if (meta?.artist) row.artist = meta.artist;
                    if (meta?.title) hydratedCount += 1;
                } catch (e) {}
            }

            sourceTracks = sourceTracks.filter(t => t.title);
            if (sourceTracks.length === 0) {
                return { success: false, error: 'Could not resolve Spotify track names from this playlist.' };
            }

            const resolvedTracks = [];
            const searchLimit = Math.min(sourceTracks.length, 80);
            const missedSamples = [];
            const seenResolvedKeys = new Set();

            for (let index = 0; index < searchLimit; index += 1) {
                const item = sourceTracks[index];
                const trackTitle = item?.title;
                const trackId = item?.spotifyId;
                const trackArtist = item?.artist || '';
                if (!trackTitle || !trackId) continue;

                sendProgress({
                    stage: 'matching',
                    progress: 30 + Math.round(((index + 1) / Math.max(searchLimit, 1)) * 62),
                    message: `Matching ${index + 1}/${searchLimit}…`,
                });

                try {
                    const queries = buildSpotifyQueries(trackTitle, trackArtist);
                    let best = null;
                    let bestScore = -1;
                    for (const query of queries) {
                        const results = await search(query, ytdlpPath);
                        if (!Array.isArray(results) || results.length === 0) continue;

                        const candidates = results.slice(0, 6);
                        for (const candidate of candidates) {
                            const key = candidate?.youtubeId || candidate?.id || `${candidate?.title || ''}|${candidate?.author || ''}`;
                            if (!key || seenResolvedKeys.has(key)) continue;
                            const score = scoreSearchCandidate(candidate, trackTitle, trackArtist);
                            if (score > bestScore) {
                                bestScore = score;
                                best = candidate;
                            }
                        }
                    }
                    if (best && bestScore >= 3) {
                        const resolvedKey = best?.youtubeId || best?.id || `${best?.title || ''}|${best?.author || ''}`;
                        if (resolvedKey) seenResolvedKeys.add(resolvedKey);
                        resolvedTracks.push({
                            ...best,
                            id: best.id || trackId,
                            spotifyId: trackId,
                            spotifyTitle: trackTitle,
                            spotifyArtist: trackArtist,
                            spotifyPlaylistId: playlistId,
                        });
                    } else if (missedSamples.length < 6) {
                        missedSamples.push(`${trackTitle}${trackArtist ? ` — ${trackArtist}` : ''}`);
                    }
                } catch (e) {}
            }

            sendProgress({
                stage: 'finalizing',
                progress: 95,
                message: 'Saving imported playlist…',
            });

            return {
                success: true,
                playlistName,
                totalTracks: sourceTracks.length,
                matchedTracks: resolvedTracks.length,
                tracks: resolvedTracks,
                debug: {
                    playlistId,
                    apiError: importDebug.apiError,
                    htmlStatus: importDebug.htmlStatus,
                    htmlTrackIdCount: importDebug.htmlTrackIdCount,
                    htmlLabelCount: importDebug.htmlLabelCount,
                    hydratedCount,
                    searchedTracks: searchLimit,
                    matchedTracks: resolvedTracks.length,
                    missedTracks: Math.max(0, searchLimit - resolvedTracks.length),
                    missedSamples,
                },
            };
        } catch (e) {
            try { event.sender.send('aether:spotify-import-progress', { stage: 'error', progress: 0, message: e.message }); } catch (error) {}
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('aether:search', async (event, query) => {
        const started = Date.now();
        try {
            const ready = await ensureYtDlpPathWithTimeout(12000);
            if (!ready) {
                logDebug('search proceeding without confirmed yt-dlp readiness', { query: String(query || '').slice(0, 60) });
            }
            const searchPath = ytdlpPath || resolveYtDlpPath() || resolveSystemYtDlp();
            const results = await search(query, searchPath);
            const count = Array.isArray(results) ? results.length : 0;
            logDebug('search completed', { query: String(query || '').slice(0, 60), count, ms: Date.now() - started, searchPath: searchPath || 'unresolved' });
            if (count === 0) {
                logDebug('search returned no results', { query: String(query || '').slice(0, 60), ms: Date.now() - started, searchPath: searchPath || 'unresolved' });
            }
            return results;
        } catch (err) {
            logDebug('search failed', { error: err?.message || String(err), ms: Date.now() - started });
            return [];
        }
    });

    ipcMain.handle('aether:get-metadata', async (event, url) => {
        try {
            const ready = await ensureYtDlpPathWithTimeout(7000);
            if (!ready) return null;
            return await getMetadata(url, ytdlpPath);
        } catch (err) { return null; }
    });

  ipcMain.handle('aether:get-lyrics', async (event, { track, artist, duration, query, url }) => {
    try {
        // --- LOCAL LRC BYPASS (V6.9.5) ---
        if (url && url.startsWith('file://')) {
            const trackPath = decodeURIComponent(url.replace('file://', ''));
            const lrcPath = trackPath.replace(/\.[^/.]+$/, "") + ".lrc";
            if (fs.existsSync(lrcPath)) {
                console.log(`[Aether] Neural Sync: Found local LRC at ${lrcPath}`);
                const content = fs.readFileSync(lrcPath, 'utf8');
                return { lyrics: parseLRCToArray(content), source: 'local' };
            }
        }

        const durationSec = (duration || 0) / 1000;
        const results = await fetchSyncedLyrics(track, artist, durationSec, query, url);
        return results?.lyrics || [];
    } catch (e) {
        console.error("[Aether] Lyrics IPC Error:", e.message);
        return [];
    }
  });

  function parseLRCToArray(lrc) {
    const lines = lrc.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/;
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const mins = parseInt(match[1]);
        const secs = parseInt(match[2]);
        const msStr = match[3];
        const ms = parseInt(msStr.length === 2 ? msStr + '0' : msStr);
        const time = (mins * 60 + secs) * 1000 + ms;
        const text = line.replace(timeRegex, '').trim();
        if (text) result.push({ time, text });
      }
    });
    return result;
  }

    ipcMain.handle('aether:get-stream-port', async () => actualPort);

    ipcMain.handle('aether:get-recommendations', async (event, details) => {
        const started = Date.now();
        try {
            const ready = await ensureYtDlpPathWithTimeout(9000);
            const searchPath = ytdlpPath || resolveYtDlpPath() || resolveSystemYtDlp();
            if (!ready && !searchPath) {
                logDebug('recommendations unavailable: yt-dlp unresolved', {
                    title: String(details?.title || '').slice(0, 80),
                    author: String(details?.author || '').slice(0, 80),
                });
                return [];
            }

            let results = await getRecommendations(details, searchPath);
            let fallbackSearchUsed = false;

            if ((!Array.isArray(results) || results.length === 0) && (details?.title || details?.author)) {
                const fallbackQuery = [details?.author, details?.title].filter(Boolean).join(' ').trim();
                if (fallbackQuery) {
                    fallbackSearchUsed = true;
                    results = await search(fallbackQuery, searchPath);
                }
            }

            const count = Array.isArray(results) ? results.length : 0;
            logDebug('recommendations completed', {
                title: String(details?.title || '').slice(0, 80),
                author: String(details?.author || '').slice(0, 80),
                count,
                fallbackSearchUsed,
                ms: Date.now() - started,
                searchPath: searchPath || 'unresolved',
            });
            return Array.isArray(results) ? results : [];
        } catch (err) {
            logDebug('recommendations failed', {
                error: err?.message || String(err),
                ms: Date.now() - started,
            });
            return [];
        }
    });

  // Store previous CPU usage for percentage calculation
  let prevCpuUsage = process.cpuUsage();
  let prevTime = Date.now();

  ipcMain.handle('aether:stats', async () => {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const now = Date.now();
      
      // Total app memory: Node backend + Chromium renderer (MB)
      let totalMem = Math.round(memUsage.heapUsed / 1024 / 1024);
      try {
        if (mainWindow && mainWindow.webContents) {
          const rendererInfo = mainWindow.webContents.getProcessMemoryInfo();
          const rendererMem = Math.round((rendererInfo.workingSetSize || 0) / 1024 / 1024);
          totalMem += rendererMem;
        }
      } catch (e) {
        // Fallback silently if renderer info unavailable
      }
      
      // App CPU percentage (main process + renderer estimate)
      const userDiff = cpuUsage.user - prevCpuUsage.user;
      const systemDiff = cpuUsage.system - prevCpuUsage.system;
      const timeDiff = (now - prevTime) * 1000; // convert ms to microseconds
      
      let cpuPercent = 0;
      if (timeDiff > 0) {
        cpuPercent = Math.min(100, Math.round(((userDiff + systemDiff) / timeDiff) * 100));
      }
      
      prevCpuUsage = cpuUsage;
      prevTime = now;
      
      return {
        appMem: totalMem,    // Total MB used by Aether
        appCpu: cpuPercent   // Percentage of CPU (0-100)
      };
    } catch (err) {
      console.warn('[Aether/Stats] Error calculating stats', err);
      return {
        appMem: 0,
        appCpu: 0
      };
    }
  });

  ipcMain.handle('aether:get-local-ip', () => {
      const os = require('os');
      const ifaces = os.networkInterfaces();
      for (const name of Object.keys(ifaces)) {
          for (const iface of ifaces[name]) {
              if (iface.family === 'IPv4' && !iface.internal) {
                  return iface.address;
              }
          }
      }
      return '127.0.0.1';
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
    if (quitCleanupCompleted) {
        runFinalTeardown();
        return;
    }

    event.preventDefault();
    if (quitCleanupInProgress) {
        // User pressed Cmd+Q again while async cleanup is still running.
        // Finalize immediately instead of waiting for another lifecycle round-trip.
        runFinalTeardown();
        if (quitFallbackTimer) {
            clearTimeout(quitFallbackTimer);
            quitFallbackTimer = null;
        }
        app.exit(0);
        return;
    }

    quitCleanupInProgress = true;
    isAppQuitting = true;

    // Safety fallback: don't leave the app hanging in the dock if cleanup stalls.
    if (quitFallbackTimer) clearTimeout(quitFallbackTimer);
    quitFallbackTimer = setTimeout(() => {
        try {
            runFinalTeardown();
        } catch {}
        app.exit(0);
    }, 4500);

    (async () => {
        const summary = await cleanupWarmupDownloadsOnQuit();
        console.log('[Aether/Storage] Quit warmup cleanup summary', summary);

        runFinalTeardown();

        quitCleanupCompleted = true;
        quitCleanupInProgress = false;
        if (quitFallbackTimer) {
            clearTimeout(quitFallbackTimer);
            quitFallbackTimer = null;
        }
        app.exit(0);
    })().catch((e) => {
        console.warn('[Aether/Storage] Quit cleanup fatal error', e?.message || e);
        runFinalTeardown();
        quitCleanupCompleted = true;
        quitCleanupInProgress = false;
        if (quitFallbackTimer) {
            clearTimeout(quitFallbackTimer);
            quitFallbackTimer = null;
        }
        app.exit(0);
    });
});

app.on('will-quit', () => {
    try {
        globalShortcut.unregisterAll();
    } catch {}
});
