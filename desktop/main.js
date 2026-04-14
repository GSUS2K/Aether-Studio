// --- YT-DLP HEALTH CHECK & ERROR DIALOG ---
function showYtDlpErrorDialog(error) {
    const { dialog } = require('electron');
    const os = require('os');
    const path = require('path');
    const appData = (process.platform === 'win32')
        ? path.join(os.homedir(), 'AppData', 'Roaming', 'Aether', 'bin')
        : process.platform === 'darwin'
            ? path.join(os.homedir(), 'Library', 'Application Support', 'Aether', 'bin')
            : path.join(os.homedir(), '.config', 'Aether', 'bin');
    let binaryName = 'yt-dlp';
    if (process.platform === 'win32') binaryName = 'yt-dlp.exe';
    if (process.platform === 'darwin') binaryName = 'yt-dlp_macos';
    const expectedPath = path.join(appData, binaryName);

    let message = 'yt-dlp (media engine) is missing, blocked, or not executable.\n\n';
    message += 'Possible reasons and solutions:\n';
    message += '- Antivirus or Windows Defender blocked yt-dlp.\n';
    message += '- File is in use by another app.\n';
    message += '- Wrong binary for your OS/CPU.\n';
    message += '- Lacking execute permissions.\n';
    message += '\nHow to fix:\n';
    message += '1. Check your antivirus/Defender quarantine for yt-dlp and restore/allow it.\n';
    message += '2. Close other Aether/yt-dlp processes.\n';
    message += '3. Re-download yt-dlp from the official site.\n';
    message += '4. Place the yt-dlp binary here (replace if exists):\n';
    message += `   ${expectedPath}\n`;
    if (process.platform === 'darwin' || process.platform === 'linux') {
        message += '5. On Mac/Linux, run: chmod +x ' + expectedPath + '\n';
    }
    message += '6. Restart the app as administrator.\n';
    if (error) message += `\nError: ${error.message || error}`;
    dialog.showErrorBox('yt-dlp Error', message);
}

async function checkYtDlpHealth() {
    try {
        const ready = await ensureYtDlpPathWithTimeout(5000);
        if (!ready || !ytdlpPath || !isSpawnableCommand(ytdlpPath)) {
            showYtDlpErrorDialog('yt-dlp not found or not executable');
            return false;
        }
        return true;
    } catch (e) {
        showYtDlpErrorDialog(e);
        return false;
    }
}
    // Check yt-dlp health at startup
    await checkYtDlpHealth();
        // Check yt-dlp health before streaming
        const healthy = await checkYtDlpHealth();
        if (!healthy) {
            if (!res.headersSent) res.status(503).send('yt-dlp unavailable. See error dialog.');
            return;
        }
    try {
        proc = spawn(ytdlpPath, args);
    } catch (err) {
        if ([ 'EBUSY', 'EPERM', 'ENOENT' ].includes(err.code)) {
            showYtDlpErrorDialog(err);
            if (!res.headersSent) res.status(503).send('yt-dlp error. See error dialog.');
            return;
        } else {
            throw err;
        }
    }
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
const https = require('https');
const chokidar = require('chokidar');
const { fetchSyncedLyrics } = require('../lyrics-fetcher');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { spawn, spawnSync } = require('child_process');
const { OfflineEngine, search, getMetadata, getRecommendations, getLyrics } = require('./offline-engine');
const getDebugLogPath = () => {
    try {
        if (app?.isReady?.()) {
            return path.join(app.getPath('userData'), 'AetherDebug.log');
        }
    } catch {}
    return path.join(os.homedir(), 'Desktop', 'AetherDebug.log');
};
const logDebug = (message, meta = null) => {
    try {
        const logPath = getDebugLogPath();
        const dir = path.dirname(logPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const line = `[${new Date().toISOString()}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}\n`;
        fs.appendFileSync(logPath, line);
    } catch {}
};
const decodeHtmlEntities = (value) => String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

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
    } catch {}
};

const setUpdateState = (patch = {}) => {
    Object.assign(updateState, patch);
    emitUpdateState();
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
    } catch {
        return false;
    }
};
const hashLockPassword = (password, salt) => crypto.scryptSync(String(password || ''), String(salt || ''), 64).toString('hex');
const verifyLockPassword = (password, record) => {
    if (!record?.hash || !record?.salt) return false;
    const computed = hashLockPassword(password, record.salt);
    const a = Buffer.from(record.hash, 'hex');
    const b = Buffer.from(computed, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
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
        return await new Promise((resolve) => {
            https.get(url, { headers }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode || 0, text: data });
                });
            }).on('error', (err) => {
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

// --- BULLETPROOF NATIVE BINARY EXTRACTOR ---
// Sidesteps read-only /Applications restrictions and Python deprecations
const unpackNativeEngine = (binaryName) => {
    const sourcePath = path.join(__dirname, '..', `desktop/bin/${binaryName}`);
    const userData = app.getPath('userData');
    const targetExecutable = path.join(userData, binaryName);
    
    try {
        if (fs.existsSync(sourcePath)) {
            // Read from compiled ASAR, inject into user space, force execute
            const asm = fs.readFileSync(sourcePath);
            fs.writeFileSync(targetExecutable, asm);
            try { fs.chmodSync(targetExecutable, 0o755); } catch (e) {
                fs.appendFileSync(path.join(app.getPath('desktop'), 'AetherDebug.log'), `\n[Chmod Fault]\n${e.message}\n`);
            }
            return targetExecutable;
        } else {
            fs.appendFileSync(path.join(app.getPath('desktop'), 'AetherDebug.log'), `\n[Unpack Missing]\nsourcePath does not exist: ${sourcePath}\n`);
        }
    } catch (e) {
        fs.appendFileSync(path.join(app.getPath('desktop'), 'AetherDebug.log'), `\n[Engine Unpack Fault]\n${e.message}\n`);
        console.error(`[Aether] Execution unpack fault: ${e.message}`);
    }
    return getBundledPath(`desktop/bin/${binaryName}`);
};

const resolveYtDlpPath = () => {
    const envPath = process.env.YOUTUBE_DL_PATH;
    if (envPath && fs.existsSync(envPath)) return envPath;

    const candidates = [];

    if (process.platform === 'win32') {
        candidates.push(getBundledPath('desktop/bin/yt-dlp.exe'));
        candidates.push(getBinaryPath('@distube/yt-dlp/bin/yt-dlp.exe'));
    } else if (process.platform === 'darwin') {
        const bundledMacSource = path.join(__dirname, '..', 'desktop/bin/yt-dlp_macos');
        if (fs.existsSync(bundledMacSource)) {
            candidates.push(unpackNativeEngine('yt-dlp_macos'));
        }
        candidates.push(getBundledPath('desktop/bin/yt-dlp_macos'));
        candidates.push(getBundledPath('desktop/bin/yt-dlp'));
        candidates.push(getBinaryPath('@distube/yt-dlp/bin/yt-dlp'));
    } else {
        candidates.push(getBundledPath('desktop/bin/yt-dlp'));
        candidates.push(getBinaryPath('@distube/yt-dlp/bin/yt-dlp'));
    }

    const found = candidates.find(p => p && fs.existsSync(p));
    return found || null;
};

let ytdlpPath = resolveYtDlpPath();
let ensureYtDlpInFlight = null;
const isSpawnableCommand = (commandPath) => {
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
};

const resolveSystemYtDlp = () => {
    const explicit = process.env.YOUTUBE_DL_PATH;
    const candidates = [
        explicit,
        '/opt/homebrew/bin/yt-dlp',
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        'yt-dlp',
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (candidate === 'yt-dlp') {
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
        const systemYtDlp = resolveSystemYtDlp();
        if (systemYtDlp) {
            ytdlpPath = systemYtDlp;
            logDebug('yt-dlp resolved from system', { ytdlpPath });
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

            if (fs.existsSync(target)) {
                if (process.platform !== 'win32') {
                    try { fs.chmodSync(target, 0o755); } catch {}
                }
                if (isSpawnableCommand(target)) {
                    ytdlpPath = target;
                    logDebug('yt-dlp resolved from userData bin', { target });
                    return true;
                }
            }

            const downloadUrl = process.platform === 'win32'
                ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
                : process.platform === 'darwin'
                    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
                    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

            logDebug('yt-dlp bootstrap download starting', { downloadUrl });
            await downloadFileWithRedirects(downloadUrl, target);
            if (process.platform !== 'win32') {
                try { fs.chmodSync(target, 0o755); } catch {}
            }

            if (isSpawnableCommand(target)) {
                ytdlpPath = target;
                console.log(`[Aether] yt-dlp bootstrapped at ${target}`);
                logDebug('yt-dlp bootstrapped', { target });
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
const ffmpegPath = process.env.FFMPEG_PATH || (process.platform === 'win32' ? getBinaryPath('ffmpeg-static/ffmpeg.exe') : getBinaryPath('ffmpeg-static/ffmpeg'));
console.log(`[Aether] ytdlpPath: ${ytdlpPath}, ffmpegPath: ${ffmpegPath}`);

const offlineEngine = new OfflineEngine(app.getPath('userData'));
const downloadBackoffByTrack = new Map();
let mainWindow;

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
    } catch {}

    // Clear persisted playback session queue/time so reopen starts clean.
    try {
        store.delete(SESSION_PLAYBACK_STORE_KEY);
    } catch {}

    // Clear transient cache files (keeps downloaded library intact except warmup-orphan cleanup above).
    try {
        keepDownloadedOnlyCleanup();
    } catch {}

    // Hard-stop active stream workers to avoid stale pipes on next launch.
    try {
        for (const proc of activeStreamProcesses) {
            try { proc.kill('SIGKILL'); } catch {}
        }
        activeStreamProcesses.clear();
    } catch {}
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

streamApp.get('/stream', async (req, res) => {
    const startTime = Date.now();
    const videoUrl = req.query.url;
            const ready = await ensureYtDlpPathWithTimeout(12000);
            if (!ready) {
                logDebug('search proceeding without confirmed yt-dlp readiness', { query: String(query || '').slice(0, 60) });
            }
            const searchPath = ytdlpPath || resolveYtDlpPath() || resolveSystemYtDlp();
            const results = await search(query, searchPath);

    // Extract track ID only from YouTube share links (youtube.com?v=XXXXX)
    const trackIdMatch = videoUrl.match(/(?:youtube\.com|youtu\.be).*[?&]v=([A-Za-z0-9_-]{11})/);
    const trackId = trackIdMatch ? trackIdMatch[1] : null;
    const isYouTubeLink = !!trackId;
    
    console.log(`[Aether] Stream request for url: ${videoUrl}, isYouTubeLink: ${isYouTubeLink}, trackId: ${trackId || 'direct-stream'}`);

    let cachedFile = null;
    if (isYouTubeLink) {
        cachedFile = offlineEngine.getFilePath(trackId);
        if (cachedFile) console.log(`[Aether] Cache hit for ${trackId}: ${cachedFile}`);
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
        res.setHeader('Cache-Control', 'no-cache');

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
            console.log(`[Aether] Cached stream for ${trackId} took ${Date.now() - startTime}ms`);
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

    console.log(`[Aether] Cache miss for ${trackId || 'direct-stream'}, streaming from yt-dlp`);
    // Fallback to yt-dlp streaming
    const cookiesPath = path.join(__dirname, '../cookies.txt');
    
    console.log(`[Aether] Streaming: ${videoUrl} @ ${seekTime}s`);

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

    if (fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 0) {
        args.push('--cookies', cookiesPath);
    }

    const proc = spawn(ytdlpPath, args);
    activeStreamProcesses.add(proc);

    proc.stdout.on('data', () => {
        if (!firstChunkTime) {
            firstChunkTime = Date.now();
            console.log(`[Aether] First streaming chunk after ${firstChunkTime - startTime}ms for ${trackId}`);
        }
    });

    proc.on('error', (err) => {
    activeStreamProcesses.delete(proc);
    fs.appendFileSync(path.join(app.getPath('desktop'), 'AetherDebug.log'), `\n[Stream Spawn Fault]\nytdlpPath: ${ytdlpPath}\nerr: ${err.message}\nstack: ${err.stack}\n`);
    console.error(`[Aether] Engine launch error: ${err.message}`);
    if ([ 'EBUSY', 'EPERM', 'ENOENT' ].includes(err.code)) {
        showYtDlpErrorDialog(err);
        if (!res.headersSent) res.status(503).send('yt-dlp error. See error dialog.');
    } else {
        if (!res.headersSent) res.status(500).send(`Neural Engine failed: ${err.message}`);
    }
    });

    // yt-dlp primary format is m4a, so expose mp4 audio MIME for browser compatibility.
    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    proc.stdout.pipe(res);
    res.on('finish', () => {
        console.log(`[Aether] yt-dlp stream for ${trackId} took ${Date.now() - startTime}ms`);
    });

    proc.stderr.on('data', (d) => {
        const msg = d.toString().trim();
        if (msg.length > 5 && !msg.includes('frag')) {
            console.log(`[Aether/Engine] ${msg}`);
            logRemuxIfDetected(msg);
        }
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
        console.log(`[Aether] yt-dlp stream closed ${trackId || 'direct'} code=${code} total=${streamTotal}ms${suffix}`);
    });

    req.on('close', () => {
        console.log(`[Aether] Stream request closed for ${trackId} after ${Date.now() - startTime}ms`);
        activeStreamProcesses.delete(proc);
        proc.kill('SIGKILL');
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
            const isMaxRes = /\/maxresdefault\.(jpg|webp)$/i.test(parsed.pathname);
            if (isYtImg && isMaxRes) {
                const fallback = new URL(parsed.toString());
                fallback.pathname = fallback.pathname.replace(/maxresdefault\.(jpg|webp)$/i, 'hqdefault.jpg');
                out.push(fallback.toString());
            }
        } catch {}
        return [...new Set(out.filter(Boolean))];
    };

    try {
        const candidates = buildCandidateUrls(url);
        let lastStatus = 500;

        for (const candidateUrl of candidates) {
            try {
                const response = await fetch(candidateUrl, {
                    redirect: 'follow',
                    headers: {
                        'user-agent': 'Mozilla/5.0 (Aether Proxy)',
                        'accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                    },
                });

                lastStatus = response.status || lastStatus;
                if (!response.ok) continue;

                const arrayBuf = await response.arrayBuffer();
                const buf = Buffer.from(arrayBuf);
                res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                return res.status(200).send(buf);
            } catch (e) {
                continue;
            }
        }

        return res.status(lastStatus === 404 ? 404 : 502).send('Proxy Error');
    } catch (e) {
        res.status(502).send('Proxy Error');
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
    // Check yt-dlp health before searching
    const healthy = await checkYtDlpHealth();
    if (!healthy) {
        if (!res.headersSent) res.status(503).send('yt-dlp unavailable. See error dialog.');
        return;
    }
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
        if ([ 'EBUSY', 'EPERM', 'ENOENT' ].includes(e.code)) {
            showYtDlpErrorDialog(e);
        }
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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    title: "Aether",
    icon: path.join(__dirname, '../icon.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#050505',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
  });

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
    mainWindow.webContents.send('aether:maximized-state', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('aether:maximized-state', false);
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('aether:maximized-state', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('aether:maximized-state', false);
  });

  mainWindow.on('closed', () => {
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
    ipcMain.handle('aether:get-port', () => actualPort);

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
        };
    });

    ipcMain.handle('aether:lock-set-password', (event, { password, useTouchId }) => {
        const pass = String(password || '');
        if (pass.length < 4) return { success: false, error: 'Password must be at least 4 characters.' };
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashLockPassword(pass, salt);
        store.set(APP_LOCK_STORE_KEY, {
            enabled: true,
            salt,
            hash,
            touchIdEnabled: !!useTouchId && canPromptTouchId(),
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
        try {
            const ready = await ensureYtDlpPathWithTimeout(7000);
            if (!ready) return [];
            return await getRecommendations(details, ytdlpPath);
        } catch (err) { return []; }
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
