const { app, BrowserWindow, ipcMain, globalShortcut, Menu, dialog } = require('electron');
const ffmpeg = require('ffmpeg-static');
const Store = require('electron-store');
const store = new Store();
const DiscordRPC = require('discord-rpc');
const path = require('path');
const os = require('os');
const fs = require('fs');
const chokidar = require('chokidar');
const { fetchSyncedLyrics } = require('../lyrics-fetcher');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const { OfflineEngine, search, getMetadata, getRecommendations, getLyrics } = require('./offline-engine');
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
    return found || 'yt-dlp';
};

const ytdlpPath = resolveYtDlpPath();
const ffmpegPath = process.env.FFMPEG_PATH || (process.platform === 'win32' ? getBinaryPath('ffmpeg-static/ffmpeg.exe') : getBinaryPath('ffmpeg-static/ffmpeg'));
console.log(`[Aether] ytdlpPath: ${ytdlpPath}, ffmpegPath: ${ffmpegPath}`);

const offlineEngine = new OfflineEngine(app.getPath('userData'));
let mainWindow;

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

streamApp.get('/stream', (req, res) => {
    const startTime = Date.now();
    const videoUrl = req.query.url;
    const seekTime = req.query.time ? parseInt(req.query.time, 10) : 0;
    
    if (!videoUrl) return res.status(400).send('No URL provided');

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
        // Stream from cached file
        console.log(`[Aether] Cache hit for ${trackId}: ${cachedFile}`);
        const stat = fs.statSync(cachedFile);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', stat.size);
        const stream = fs.createReadStream(cachedFile);
        stream.pipe(res);
        res.on('finish', () => {
            console.log(`[Aether] Cached stream for ${trackId} took ${Date.now() - startTime}ms`);
        });
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
    
    if (seekTime > 0) {
        args.push('--download-sections', `*${seekTime}-inf`);
    }

    if (ffmpegPath) {
        args.push('--ffmpeg-location', ffmpegPath);
    }

    if (fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 0) {
        args.push('--cookies', cookiesPath);
    }

    const proc = spawn(ytdlpPath, args);

    proc.stdout.on('data', () => {
        if (!firstChunkTime) {
            firstChunkTime = Date.now();
            console.log(`[Aether] First streaming chunk after ${firstChunkTime - startTime}ms for ${trackId}`);
        }
    });

    proc.on('error', (err) => {
        fs.appendFileSync(path.join(app.getPath('desktop'), 'AetherDebug.log'), `\n[Stream Spawn Fault]\nytdlpPath: ${ytdlpPath}\nerr: ${err.message}\nstack: ${err.stack}\n`);
        console.error(`[Aether] Engine launch error: ${err.message}`);
        if (!res.headersSent) res.status(500).send(`Neural Engine failed: ${err.message}`);
    });

    res.setHeader('Content-Type', 'audio/mpeg');
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
        const streamTotal = Date.now() - startTime;
        const ytdlpTotal = Date.now() - ytdlpStart;
        const remuxDur = remuxStart ? Date.now() - remuxStart : null;
        const suffix = isYouTubeLink ? ` ytdlp=${ytdlpTotal}ms remux=${remuxDur != null ? remuxDur + 'ms' : 'unknown'}` : '';
        console.log(`[Aether] yt-dlp stream closed ${trackId || 'direct'} code=${code} total=${streamTotal}ms${suffix}`);
    });

    req.on('close', () => {
        console.log(`[Aether] Stream request closed for ${trackId} after ${Date.now() - startTime}ms`);
        proc.kill('SIGKILL');
    });
});

const https = require('https');
streamApp.get('/api/proxy', (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('No URL');
    try {
        const fullUrl = url.startsWith('//') ? 'https:' + url : url;
        https.get(fullUrl, (response) => {
            res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
            response.pipe(res);
        }).on('error', () => res.status(500).send('Proxy Error'));
    } catch (e) {
        res.status(500).send('Proxy Error');
    }
});

// --- NEURAL ENGINE HANDLERS (CONVERGED V9.0.0) ---
streamApp.use(express.json());

// 1. QUEUE STATUS
streamApp.get('/api/queue/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    res.json(queue);
});

// 2. SEARCH (Direct Integration)
streamApp.get('/api/search', async (req, res) => {
    try {
        const results = await search(req.query.q, ytdlpPath);
        res.json(results);
    } catch (e) { res.json([]); }
});

// 3. ADD TRACK
streamApp.post('/api/add/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    const { track } = req.body;
    queue.songs.push(track);
    res.json({ success: true, position: queue.songs.length - 1 });
});

// 4. CONTROL (Pause/Skip/Seek)
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
    queue.currentMs = currentTime;
    queue.isPlaying = isPlaying;
    res.json({ success: true });
});

// 6. LYRICS (Converged Sync)
streamApp.get('/api/lyrics', async (req, res) => {
    const { track, artist, duration, url, query } = req.query;
    try {
        const results = await fetchSyncedLyrics(track, artist, (duration || 0) / 1000, query, url);
        res.json(results?.lyrics || []);
    } catch (e) {
        res.json([]);
    }
});

// 7. METADATA (Converged Sync)
streamApp.get('/api/metadata', async (req, res) => {
    try {
        const meta = await getMetadata(req.query.url, ytdlpPath);
        res.json(meta);
    } catch (e) { res.status(500).end(); }
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
        const results = await search(req.query.q, ytdlpPath);
        res.json(results);
    } catch (e) { res.json([]); }
});

// 3. ADD TRACK
streamApp.post('/api/add/:id', (req, res) => {
    const queue = getQueue(req.params.id);
    const { track } = req.body;
    queue.songs.push(track);
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
        const results = await fetchSyncedLyrics(track, artist, (duration || 0) / 1000, query, url);
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

async function initRPC() {
  if (rpcClient && rpcClient.user) return; // Already connected
  
  // RPC Silence
  if (!rpcClient) rpcClient = new DiscordRPC.Client({ transport: 'ipc' });
  
  rpcClient.on('ready', () => {
    // Discord Silence
    // Initial status on connect
    const IDLE_PHRASES = [
      "Exploring the Neural Vault",
      "Calibrating Sonic Synapses",
      "Organizing the Vibe Buffer",
      "Hunting for Rare Nodes",
      "Defragmenting the Studio",
      "Awaiting the Next Drop",
      "Lost in the Music Nexus",
      "Optimizing Aura Sync",
      "Neural Network Standby",
      "Refining Studio Echoes",
      "Calculating Bass Velocity",
      "Feeding the Rhythm Hamsters",
      "Searching for Perfect Snares",
      "Overclocking the Speakers",
      "Untangling Virtual Cables",
      "Wait, where did the kick go?",
      "Stealing hearts, one beat at a time",
      "Looking hot in the studio spotlight",
      "Is it hot in here or just the bass?",
      "Aether's got a crush on your vibe",
      "Neural connection... established? 😉",
      "Synchronizing heartbeats...",
      "Midnight studio sessions > Anything",
      "Caught in your sonic orbit"
    ];
    const initialPhrase = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)];

    setRPCActivity({
        title: "Music Lobby",
        artist: initialPhrase,
        startTime: Date.now()
    });
  });

  try {
    await rpcClient.login({ clientId });
  } catch (e) {
    console.warn('[Aether] Discord RPC: Discord client not detected. Social status disabled.');
    rpcClient = null; // Reset to allow retry on next track
  }
}

async function setRPCActivity(details) {
    if (!rpcClient) await initRPC();
    if (!rpcClient) return;

    // RPC Silent
    try {
        const cleanUrl = details.url?.split('&')[0] || 'https://github.com/GSUS2K'; // Strip tracking
        const finalUrl = cleanUrl.length > 511 ? cleanUrl.slice(0, 511) : cleanUrl;

        const activity = {
            details: details.title?.slice(0, 127) || 'Exploring Aether',
            state: details.isPlaying === false ? `(Paused) ${details.artist}`.slice(0, 127) : (details.artist?.slice(0, 127) || 'Aura Sync'),
            largeImageKey: details.thumbnail || 'cover',
            largeImageText: details.title?.slice(0, 127) || 'Aether Studio',
            smallImageKey: 'icon',
            smallImageText: `V${app.getVersion()} // Aether`,
            instance: false,
            buttons: [
                { label: '🎧 Listen on Source', url: finalUrl },
                { label: '🧿 Open Aether', url: 'https://github.com/GSUS2K' }
            ]
        };

        // Note: Removing party/secrets as they conflict with buttons in IPC RPC
        if (details.isPlaying !== false) {
            activity.startTimestamp = details.startTime;
            activity.endTimestamp = details.endTime;
        }
        
        // Presence Silent
        
        try {
            await rpcClient.setActivity(activity);
        } catch (err) {
            console.error(`[Aether] setActivity FAULT: ${err.message}`);
            if (err.message.includes('buttons') || err.message.includes('FIELD_INVALID')) {
                delete activity.buttons;
                await rpcClient.setActivity(activity);
            }
        }
    } catch (e) {
        console.error(`[Aether] Neural Presence Trace Log: ${e.message}`);
    }
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

    // --- UNIVERSAL MEDIA BRIDGE (V7.0.0) ---
    const registerShortcut = (keys, command) => {
        try {
            globalShortcut.register(keys, () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('aether:control', command);
                }
            });
        } catch (e) {}
    };

    // Standard Media Keys
    registerShortcut('MediaPlayPause', 'toggle');
    registerShortcut('MediaNextTrack', 'skip');
    registerShortcut('MediaPreviousTrack', 'previous');

    // MacOS Literal F-Keys (For different FN configurations)
    registerShortcut('F7', 'previous');
    registerShortcut('F8', 'toggle');
    registerShortcut('F9', 'skip');
    
    // Volume & Mute Integration (V7.0.0)
    registerShortcut('F10', 'mute');
    registerShortcut('F11', 'volume-down');
    registerShortcut('F12', 'volume-up');
    registerShortcut('VolumeMute', 'mute');
    registerShortcut('VolumeDown', 'volume-down');
    registerShortcut('VolumeUp', 'volume-up');

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
    ipcMain.handle('aether:store-set', (event, key, val) => store.set(key, val));
    ipcMain.handle('aether:get-port', () => actualPort);


    ipcMain.handle('aether:window-resize', (event, { width, height, alwaysOnTop }) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (alwaysOnTop) {
                mainWindow.setMinimumSize(300, 120);
            } else {
                mainWindow.setMinimumSize(1000, 700);
            }
            mainWindow.setSize(width || 1280, height || 800, true);
            mainWindow.setAlwaysOnTop(!!alwaysOnTop);
        }
    });

    ipcMain.handle('aether:open-external', async (event, url) => {
        const { shell } = require('electron');
        await shell.openExternal(url);
    });

    ipcMain.handle('aether:download', async (event, { url, trackId }) => {
        console.log(`[Aether] Starting download for trackId: ${trackId}, url: ${url}`);
        try {
            const filePath = await offlineEngine.download(url, trackId, ytdlpPath, ffmpegPath);
            console.log(`[Aether] Download successful for ${trackId}: ${filePath}`);
            // Emit library update
            const downloaded = await offlineEngine.getDownloadedTracks();
            console.log(`[Aether] Emitting library update with ${downloaded.length} tracks`);
            mainWindow.webContents.send('aether:library-update', downloaded);
            return { success: true, filePath };
        } catch (e) {
            console.error(`[Aether] Download failed for ${trackId}: ${e.message}`);
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

    ipcMain.handle('aether:get-offline-tracks', async () => {
        return await offlineEngine.getDownloadedTracks();
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

    ipcMain.handle('aether:search', async (event, query) => {
        try {
            return await search(query, ytdlpPath);
        } catch (err) { return []; }
    });

    ipcMain.handle('aether:get-metadata', async (event, url) => {
        try {
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
            return await getRecommendations(details, ytdlpPath);
        } catch (err) { return []; }
    });

  ipcMain.handle('aether:stats', async () => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    return {
      appMem: Math.round(memUsage.heapUsed / 1024 / 1024),
      appCpu: ((cpuUsage.user + cpuUsage.system) / 1000000).toFixed(1)
    };
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
