const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const MIN_VALID_AUDIO_BYTES = 64 * 1024;
const SEARCH_TIMEOUT_MS = 15000;
const OFFLINE_MEDIA_EXTENSIONS = new Set(['.m4a', '.mp3', '.aac', '.flac', '.wav', '.ogg', '.opus', '.mp4', '.m4v', '.mov', '.webm', '.mkv']);

const { EventEmitter } = require('events');
const engineEvents = new EventEmitter();
const appendDebugLog = (text) => {
    fs.promises.appendFile(path.join(os.homedir(), 'Desktop', 'AetherDebug.log'), text).catch(() => {});
};

const handleOAuthIntercept = (text) => {
    if (text.includes('HTTP Error 429') || text.includes('Sign in to confirm')) {
        engineEvents.emit('oauth-required', { url: null, code: null });
        return true;
    }
    return false;
};

const getResolvedCookiesPath = () => {
    let cp = path.join(__dirname, '../cookies.txt');
    if (fs.existsSync(cp) && fs.statSync(cp).size > 0) return cp;
    try {
        cp = path.join(require('electron').app.getPath('userData'), 'cookies.txt');
        if (fs.existsSync(cp) && fs.statSync(cp).size > 0) return cp;
    } catch(e) {}
    return null;
};

const runYtDlpSearch = (query, ytdlpPath, extraArgs = []) => new Promise((resolve) => {
    const args = [
        query,
        '--dump-json',
        '--flat-playlist',
        '--no-check-certificates',
        '--retries', '3',
        '--fragment-retries', '3',
        '--socket-timeout', '10',
        ...extraArgs,
    ];
    
    const cookiesPath = getResolvedCookiesPath();
    if (cookiesPath) {
        args.push('--cookies', cookiesPath);
    }

    const proc = spawn(ytdlpPath || 'yt-dlp', args);
    let output = '';
    let errorOutput = '';
    let settled = false;

    const finish = (results) => {
        if (settled) return;
        settled = true;
        resolve(results);
    };

    let timeout = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
        finish([]);
    }, SEARCH_TIMEOUT_MS);

    proc.stdout.on('data', (data) => { 
        const str = data.toString();
        output += str; 
        if (handleOAuthIntercept(str)) clearTimeout(timeout);
    });
    proc.stderr.on('data', (data) => { 
        const str = data.toString();
        errorOutput += str; 
        if (handleOAuthIntercept(str)) clearTimeout(timeout);
    });
    proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
            appendDebugLog(`\n[Search Fault]\ncode: ${code}\nstderr: ${errorOutput}\n`);
            return finish([]);
        }

        try {
            const results = output.split('\n').filter(l => l.trim()).map(line => {
                const data = JSON.parse(line);
                return {
                    id: data.id,
                    title: data.title,
                    author: data.uploader || 'Unknown',
                    duration: data.duration * 1000,
                    url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
                    thumbnail: data.thumbnail || (data.thumbnails && data.thumbnails[0]?.url)
                };
            }).filter(r => r.id && r.title);
            finish(results);
        } catch (e) {
            appendDebugLog(`\n[Search Parse Fault]\nError: ${e.message}\nOutput: ${output.slice(0,200)}\n`);
            finish([]);
        }
    });

    proc.on('error', (err) => {
        clearTimeout(timeout);
        appendDebugLog(`\n[Search Spawn Fault]\nError: ${err.message}\n`);
        finish([]);
    });
});

class OfflineEngine {
    constructor(baseDir) {
        this.downloadDir = path.join(baseDir, 'downloads');
        this.inProgressDownloads = new Map();
        this.activeDownloadProcesses = new Map();
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }
    }

    _cleanupResidualArtifacts(trackId) {
        try {
            const files = fs.readdirSync(this.downloadDir);
            const preservedExt = new Set(['.m4a', '.lrc']);
            const removableExt = new Set(['.webm', '.mp4', '.mkv', '.part', '.tmp', '.ytdl', '.orig']);

            for (const file of files) {
                if (!file.startsWith(`${trackId}.`)) continue;
                const ext = path.extname(file).toLowerCase();
                if (preservedExt.has(ext)) continue;
                if (!removableExt.has(ext)) continue;
                const fullPath = path.join(this.downloadDir, file);
                try {
                    fs.unlinkSync(fullPath);
                    console.log(`[OfflineEngine] Removed residual artifact: ${file}`);
                } catch (e) {
                    console.warn(`[OfflineEngine] Failed removing residual artifact ${file}: ${e.message}`);
                }
            }
        } catch (e) {
            console.warn(`[OfflineEngine] Artifact cleanup failed for ${trackId}: ${e.message}`);
        }
    }

    async download(url, trackId, ytdlpPath, ffmpegPath) {
        const startTime = Date.now();
        const fileName = `${trackId}.m4a`;
        const filePath = path.join(this.downloadDir, fileName);

        // Prevent concurrent duplicate downloads for same trackId
        if (this.inProgressDownloads.has(trackId)) {
            console.log(`[OfflineEngine] Reusing in-flight download promise for ${trackId}`);
            return this.inProgressDownloads.get(trackId);
        }

        const downloadPromise = new Promise((resolve, reject) => {
            if (fs.existsSync(filePath)) {
                console.log(`[OfflineEngine] File already exists before spawn: ${filePath}`);
                this.inProgressDownloads.delete(trackId);
                return resolve(filePath);
            }

            console.log(`[OfflineEngine] Download check for ${trackId}: file exists? ${fs.existsSync(filePath)}`);

            console.log(`[OfflineEngine] Starting yt-dlp for ${trackId} with url ${url}`);
            const args = [
                url,
                '-f', 'bestaudio[ext=m4a]/bestaudio',
                '-o', filePath
            ];
            
            const cookiesPath = getResolvedCookiesPath();
            if (cookiesPath) {
                args.push('--cookies', cookiesPath);
            }

            // Ensure no partial file rename concurrency issues
            args.push('--no-part', '--no-continue', '--no-check-certificates', '--no-warnings');
            const proc = spawn(ytdlpPath, args);
            this.activeDownloadProcesses.set(trackId, proc);

            proc.stdout.on('data', (d) => handleOAuthIntercept(d.toString()));

            proc.on('close', (code) => {
                const duration = Date.now() - startTime;
                this.inProgressDownloads.delete(trackId);
                this.activeDownloadProcesses.delete(trackId);

                const outputInfo = {
                    code,
                    durationMs: duration,
                    filePath,
                    trackId
                };

                console.log(`[OfflineEngine] yt-dlp exited with code ${code} for ${trackId} in ${duration}ms`);

                const getFileSize = () => {
                    try {
                        return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
                    } catch {
                        return 0;
                    }
                };

                if (code === 0) {
                    const size = getFileSize();
                    if (size < MIN_VALID_AUDIO_BYTES) {
                        try { fs.unlinkSync(filePath); } catch {}
                        return reject(new Error(`warmup file too small (${size} bytes)`));
                    }
                    this._cleanupResidualArtifacts(trackId);
                    console.log(`[OfflineEngine] Download success: ${filePath}`);
                    resolve({ ...outputInfo, filePath, size });
                } else {
                    // If file exists from another race, resolve it
                    if (fs.existsSync(filePath)) {
                        const size = getFileSize();
                        if (size < MIN_VALID_AUDIO_BYTES) {
                            try { fs.unlinkSync(filePath); } catch {}
                            return reject(new Error(`warmup file too small (${size} bytes)`));
                        }
                        this._cleanupResidualArtifacts(trackId);
                        console.warn(`[OfflineEngine] yt-dlp failed but file exists for ${trackId}: ${filePath}`);
                        return resolve({ ...outputInfo, success: true, filePath, size });
                    }
                    reject(new Error(`yt-dlp exited with code ${code}`));
                }
            });

            proc.stderr.on('data', (data) => {
                const msg = data.toString();
                console.warn(`[OfflineEngine] yt-dlp stderr for ${trackId}:`, msg.trim());
            });

            proc.on('error', (err) => {
                const duration = Date.now() - startTime;
                this.inProgressDownloads.delete(trackId);
                this.activeDownloadProcesses.delete(trackId);
                console.error(`[OfflineEngine] Spawn error for ${trackId} after ${duration}ms:`, err);
                reject(err);
            });
        });

        this.inProgressDownloads.set(trackId, downloadPromise);
        return downloadPromise;
    }

    getFilePath(trackId) {
        const filePath = path.join(this.downloadDir, `${trackId}.m4a`);
        if (!fs.existsSync(filePath)) return null;
        try {
            const size = fs.statSync(filePath).size;
            if (size < MIN_VALID_AUDIO_BYTES) return null;
            return filePath;
        } catch {
            return null;
        }
    }

    async getDownloadedTracks() {
        const files = fs.readdirSync(this.downloadDir);
        const tracks = files
            .filter(f => OFFLINE_MEDIA_EXTENSIONS.has(path.extname(f).toLowerCase()))
            .filter((f) => {
                try {
                    const p = path.join(this.downloadDir, f);
                    return fs.statSync(p).size >= MIN_VALID_AUDIO_BYTES;
                } catch {
                    return false;
                }
            })
            .map(f => path.basename(f, path.extname(f)));
        console.log(`[OfflineEngine] Found ${tracks.length} downloaded tracks:`, tracks);
        return tracks;
    }

    async getDownloadedTrackDetails() {
        const files = fs.readdirSync(this.downloadDir);
        const tracks = files
            .filter((f) => OFFLINE_MEDIA_EXTENSIONS.has(path.extname(f).toLowerCase()))
            .map((f) => {
                const id = path.basename(f, path.extname(f));
                const fullPath = path.join(this.downloadDir, f);
                try {
                    const stat = fs.statSync(fullPath);
                    if ((stat.size || 0) < MIN_VALID_AUDIO_BYTES) return null;
                    return {
                        id,
                        fileName: f,
                        filePath: fullPath,
                        bytes: stat.size || 0,
                        modifiedAt: stat.mtimeMs || stat.ctimeMs || Date.now(),
                    };
                } catch {
                    return null;
                }
            })
            .filter(Boolean)
            .sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));

        return tracks;
    }

    async removeDownload(trackId, options = {}) {
        const id = String(trackId || '').trim();
        if (!id) return { success: false, error: 'Missing trackId', removedFiles: 0, removedBytes: 0, canceledInProgress: false };

        const {
            cancelInProgress = true,
            removeSidecars = true,
        } = options || {};

        let removedFiles = 0;
        let removedBytes = 0;
        let canceledInProgress = false;

        if (cancelInProgress) {
            const proc = this.activeDownloadProcesses.get(id);
            if (proc) {
                try {
                    proc.kill('SIGKILL');
                    canceledInProgress = true;
                } catch (e) {
                    console.warn(`[OfflineEngine] Failed to stop in-progress download for ${id}: ${e.message}`);
                } finally {
                    this.activeDownloadProcesses.delete(id);
                    this.inProgressDownloads.delete(id);
                }
            }
        }

        try {
            const filePath = path.join(this.downloadDir, `${id}.m4a`);
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                fs.unlinkSync(filePath);
                removedFiles += 1;
                removedBytes += stat.size || 0;
            }

            if (removeSidecars) {
                const files = fs.readdirSync(this.downloadDir);
                const sidecarExt = new Set(['.lrc', '.webm', '.mp4', '.mkv', '.part', '.tmp', '.ytdl', '.orig']);
                for (const file of files) {
                    if (!file.startsWith(`${id}.`)) continue;
                    const ext = path.extname(file).toLowerCase();
                    if (!sidecarExt.has(ext)) continue;
                    const fullPath = path.join(this.downloadDir, file);
                    try {
                        const stat = fs.statSync(fullPath);
                        fs.unlinkSync(fullPath);
                        removedFiles += 1;
                        removedBytes += stat.size || 0;
                    } catch (e) {
                        console.warn(`[OfflineEngine] Failed to remove sidecar ${file}: ${e.message}`);
                    }
                }
            }

            return {
                success: true,
                trackId: id,
                removedFiles,
                removedBytes,
                canceledInProgress,
            };
        } catch (e) {
            return {
                success: false,
                trackId: id,
                error: e.message,
                removedFiles,
                removedBytes,
                canceledInProgress,
            };
        }
    }

    async clearAllDownloads(options = {}) {
        const downloaded = await this.getDownloadedTracks();
        const inProgressIds = Array.from(this.activeDownloadProcesses.keys());
        const allIds = Array.from(new Set([...(downloaded || []), ...inProgressIds]));
        let removedTracks = 0;
        let removedFiles = 0;
        let removedBytes = 0;
        let canceledInProgress = 0;
        const failures = [];

        for (const id of allIds) {
            try {
                const result = await this.removeDownload(id, options);
                if (result?.success) {
                    removedTracks += 1;
                    removedFiles += Number(result.removedFiles || 0);
                    removedBytes += Number(result.removedBytes || 0);
                    canceledInProgress += result.canceledInProgress ? 1 : 0;
                } else {
                    failures.push({ id, error: result?.error || 'Unknown failure' });
                }
            } catch (e) {
                failures.push({ id, error: e?.message || 'Unknown failure' });
            }
        }

        const remaining = await this.getDownloadedTracks();
        return {
            success: failures.length === 0,
            removedTracks,
            removedFiles,
            removedBytes,
            canceledInProgress,
            failures,
            remaining,
        };
    }
}

// --- NEURAL ENGINE HELPERS (V6.6.4) ---
const search = async (query, ytdlpPath) => {
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) return [];

    const primary = await runYtDlpSearch(`ytsearch10:${cleanQuery}`, ytdlpPath);
    if (Array.isArray(primary) && primary.length > 0) return primary;

    const fallbackTerms = cleanQuery
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6)
        .join(' ');

    if (fallbackTerms && fallbackTerms.toLowerCase() !== cleanQuery.toLowerCase()) {
        const secondary = await runYtDlpSearch(`ytsearch10:${fallbackTerms}`, ytdlpPath);
        if (Array.isArray(secondary) && secondary.length > 0) return secondary;
    }

    const related = await getRecommendations({ title: cleanQuery, author: '' }, ytdlpPath);
    if (Array.isArray(related) && related.length > 0) return related;

    return [];
};

const getMetadata = async (url, ytdlpPath) => {
    return new Promise((resolve) => {
        const args = ['--dump-json', '--no-check-certificates'];
        const cookiesPath = getResolvedCookiesPath();
        if (cookiesPath) {
            args.push('--cookies', cookiesPath);
        }
        args.push(url);

        const proc = spawn(ytdlpPath || 'yt-dlp', args);
        let output = '';
        let errorOutput = '';
        proc.stdout.on('data', (data) => { 
            const str = data.toString();
            output += str;
            handleOAuthIntercept(str);
        });
        proc.stderr.on('data', (data) => { 
            const str = data.toString();
            errorOutput += str;
            handleOAuthIntercept(str);
        });
        proc.on('close', (code) => {
            if (code !== 0 && output.trim() === '') {
                appendDebugLog(`\n[Metadata Fault]\nUrl: ${url}\nCode: ${code}\nStderr: ${errorOutput}\n`);
            }
            try {
                const data = JSON.parse(output);
                resolve({
                    title: data.title,
                    author: data.uploader || 'Unknown',
                    totalDurationMs: data.duration * 1000,
                    thumbnail: data.thumbnail,
                    actualUrl: data.url || url
                });
            } catch (e) { 
                appendDebugLog(`\n[Metadata Parse Fault]\nError: ${e.message}\nOutput: ${output.slice(0, 500)}\nStderr: ${errorOutput}\n`);
                resolve(null); 
            }
        });
        proc.on('error', (err) => {
            appendDebugLog(`\n[Metadata Spawn Fault]\nError: ${err.message}\n`);
            resolve(null);
        });
    });
};

const getRecommendations = async (details, ytdlpPath) => {
    const { title, author, url } = details;
    return new Promise((resolve) => {
        try {
            let query = `ytsearch5:related to ${title} ${author || ''}`;
            if (url && url.includes('v=')) {
                const videoId = new URL(url).searchParams.get('v');
                if (videoId) query = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
            }

            const args = [query, '--dump-single-json', '--no-warnings', '--flat-playlist', '--playlist-items', '1-5', '--no-check-certificates'];
            const cookiesPath = getResolvedCookiesPath();
            if (cookiesPath) {
                args.push('--cookies', cookiesPath);
            }

            const proc = spawn(ytdlpPath || 'yt-dlp', args);
            let stdout = '';
            proc.stdout.on('data', (d) => { 
                const str = d.toString();
                stdout += str; 
                handleOAuthIntercept(str);
            });
            proc.stderr.on('data', (d) => handleOAuthIntercept(d.toString()));
            proc.on('close', (code) => {
                if (code !== 0) return resolve([]);
                try {
                    const output = JSON.parse(stdout);
                    const results = (output.entries || [output]).map(item => ({
                        id: item.id,
                        title: item.title,
                        author: item.uploader || 'Unknown Artist',
                        thumbnail: item.thumbnail || (item.thumbnails && item.thumbnails[0]?.url),
                        duration: (item.duration || 0) * 1000,
                        totalDurationMs: (item.duration || 0) * 1000,
                        url: `https://www.youtube.com/watch?v=${item.id}`,
                        actualUrl: `https://www.youtube.com/watch?v=${item.id}`,
                    })).filter(r => r.id && (!url || !url.includes(r.id)));
                    resolve(results);
                } catch (e) { resolve([]); }
            });
            proc.on('error', () => resolve([]));
        } catch (err) { resolve([]); }
    });
};

const getLyrics = async (details) => {
    return [];
};

module.exports = { OfflineEngine, search, getMetadata, getRecommendations, getLyrics, engineEvents };
