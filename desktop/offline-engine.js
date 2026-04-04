const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const MIN_VALID_AUDIO_BYTES = 64 * 1024;

class OfflineEngine {
    constructor(baseDir) {
        this.downloadDir = path.join(baseDir, 'downloads');
        this.inProgressDownloads = new Map();
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
            // Ensure no partial file rename concurrency issues
            args.push('--no-part', '--no-continue', '--no-check-certificates', '--no-warnings', '--quiet');
            const proc = spawn(ytdlpPath, args);

            proc.on('close', (code) => {
                const duration = Date.now() - startTime;
                this.inProgressDownloads.delete(trackId);

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
            .filter(f => f.endsWith('.m4a'))
            .filter((f) => {
                try {
                    const p = path.join(this.downloadDir, f);
                    return fs.statSync(p).size >= MIN_VALID_AUDIO_BYTES;
                } catch {
                    return false;
                }
            })
            .map(f => f.replace('.m4a', ''));
        console.log(`[OfflineEngine] Found ${tracks.length} downloaded tracks:`, tracks);
        return tracks;
    }
}

// --- NEURAL ENGINE HELPERS (V6.6.4) ---
const search = async (query, ytdlpPath) => {
    return new Promise((resolve, reject) => {
        const cookiesPath = path.join(__dirname, '../cookies.txt');
        const args = [
            'ytsearch10:' + query,
            '--dump-json',
            '--flat-playlist',
            '--no-check-certificates'
        ];
        if (fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 0) args.push('--cookies', cookiesPath);

        const proc = spawn(ytdlpPath || 'yt-dlp', args);

        let output = '';
        let errorOutput = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { errorOutput += data.toString(); });
        proc.on('close', (code) => {
            if (code !== 0) {
                const fs = require('fs');
                const os = require('os');
                try { fs.appendFileSync(path.join(os.homedir(), 'Desktop', 'AetherDebug.log'), `\n[Search Fault]\ncode: ${code}\nstderr: ${errorOutput}\n`); } catch(e){}
                return resolve([]);
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
                });
                resolve(results);
            } catch (e) {
                const fs = require('fs');
                const os = require('os');
                try { fs.appendFileSync(path.join(os.homedir(), 'Desktop', 'AetherDebug.log'), `\n[Search Parse Fault]\nError: ${e.message}\nOutput: ${output.slice(0,200)}\n`); } catch(err){}
                resolve([]); 
            }
        });
        proc.on('error', (err) => {
            const fs = require('fs');
            const os = require('os');
            try { fs.appendFileSync(path.join(os.homedir(), 'Desktop', 'AetherDebug.log'), `\n[Search Spawn Fault]\nError: ${err.message}\n`); } catch(e){}
            resolve([]);
        });
    });
};

const getMetadata = async (url, ytdlpPath) => {
    return new Promise((resolve) => {
        const cookiesPath = path.join(__dirname, '../cookies.txt');
        const args = ['--dump-json', '--no-check-certificates'];
        if (fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 0) {
            args.push('--cookies', cookiesPath);
        }
        args.push(url);

        const proc = spawn(ytdlpPath || 'yt-dlp', args);
        let output = '';
        let errorOutput = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { errorOutput += data.toString(); });
        proc.on('close', (code) => {
            if (code !== 0 && output.trim() === '') {
                const fs = require('fs');
                const os = require('os');
                try { fs.appendFileSync(path.join(os.homedir(), 'Desktop', 'AetherDebug.log'), `\n[Metadata Fault]\nUrl: ${url}\nCode: ${code}\nStderr: ${errorOutput}\n`); } catch(e){}
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
                const fs = require('fs');
                const os = require('os');
                try { fs.appendFileSync(path.join(os.homedir(), 'Desktop', 'AetherDebug.log'), `\n[Metadata Parse Fault]\nError: ${e.message}\nOutput: ${output.slice(0, 500)}\nStderr: ${errorOutput}\n`); } catch(err){}
                resolve(null); 
            }
        });
        proc.on('error', (err) => {
            const fs = require('fs');
            const os = require('os');
            try { fs.appendFileSync(path.join(os.homedir(), 'Desktop', 'AetherDebug.log'), `\n[Metadata Spawn Fault]\nError: ${err.message}\n`); } catch(e){}
            resolve(null);
        });
    });
};

const getRecommendations = async (details, ytdlpPath) => {
    const { title, author, url } = details;
    return new Promise((resolve) => {
        try {
            const cookiesPath = path.join(__dirname, '../cookies.txt');
            let query = `ytsearch5:related to ${title} ${author || ''}`;
            if (url && url.includes('v=')) {
                const videoId = new URL(url).searchParams.get('v');
                if (videoId) query = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
            }

            const args = [query, '--dump-single-json', '--no-warnings', '--flat-playlist', '--playlist-items', '1-5', '--no-check-certificates'];
            if (fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 0) args.push('--cookies', cookiesPath);

            const proc = spawn(ytdlpPath || 'yt-dlp', args);
            let stdout = '';
            proc.stdout.on('data', (d) => { stdout += d; });
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

module.exports = { OfflineEngine, search, getMetadata, getRecommendations, getLyrics };
