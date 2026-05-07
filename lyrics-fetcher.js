const axios = require('axios');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

let electronNet;
let userDataPath;
try {
    const electron = require('electron');
    electronNet = electron.net;
    userDataPath = electron.app ? electron.app.getPath('userData') : '';
} catch (e) {
    // not in electron
}

// Smart fetch wrapper that uses Chromium's network stack to bypass Cloudflare/bot protections
async function smartFetchJson(url) {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    if (electronNet && electronNet.fetch) {
        const res = await electronNet.fetch(url, { headers: { 'User-Agent': userAgent } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }
    const res = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': userAgent } });
    return res.data;
}

/**
 * Robust lyrics fetcher ported from Signal Discord Bot V5.3.13
 * Handles LRCLIB (Direct & Search) and YouTube Subtitles fallback.
 */

async function fetchSyncedLyrics(trackName, artistName, durationSec, originalQuery, videoUrl) {
    const hasDuration = typeof durationSec === 'number' && durationSec > 0;
    console.log(`[Lyrics Fetcher] V6.5.4 Search: "${trackName}" by "${artistName}" (${hasDuration ? durationSec + 's' : 'DURATION_UNKNOWN'})`);
    
    try {
        let trackId = null;
        if (videoUrl) {
            const ytMatch = String(videoUrl).match(/[?&](v|id)=([A-Za-z0-9_-]{11})/i) || 
                            String(videoUrl).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})/i);
            if (ytMatch) {
                trackId = ytMatch[2] || ytMatch[1];
            }
        }
        
        // Fallback: Deterministic filename hash of title and artist
        if (!trackId) {
            const cleanArtist = String(artistName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanTrack = String(trackName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanArtist || cleanTrack) {
                trackId = `hash_${cleanArtist}_${cleanTrack}`;
            }
        }
        
        let lyricsCachePath = null;
        if (trackId && userDataPath) {
            const lyricsDir = path.join(userDataPath, 'lyrics');
            if (!fs.existsSync(lyricsDir)) fs.mkdirSync(lyricsDir, { recursive: true });
            lyricsCachePath = path.join(lyricsDir, `${trackId}.json`);
            
            if (fs.existsSync(lyricsCachePath)) {
                try {
                    const cached = JSON.parse(fs.readFileSync(lyricsCachePath));
                    if (Array.isArray(cached) && cached.length > 0) {
                        console.log(`[Lyrics Fetcher] SUCCESS: Loaded from local cache (${trackId})`);
                        return { lyrics: cached, source: 'local-cache' };
                    }
                } catch(e) {}
            }
        }

        const saveAndReturn = (result) => {
            if (result && result.lyrics && result.lyrics.length > 0 && lyricsCachePath) {
                try { fs.writeFileSync(lyricsCachePath, JSON.stringify(result.lyrics)); } catch(e) {}
            }
            return result;
        };
        let artist = (artistName || "").replace(/ - Topic|Official|VEVO|Music|Video|Channel/gi, '').trim();
        let track = (trackName || "").replace(/\(Official Video\)|\(Lyrics\)|\(OFFICIAL\)|\(Music Video\)|\(Video\)|\(Explicit\)|\[Official\]|\[Lyric Video\]|\[HQ\]|\|.*/gi, '').replace(/\(.*\)|\[.*\]/g, '').trim();

        if (trackName.includes(' - ')) {
            const parts = trackName.split(' - ');
            artist = parts[0].replace(/Official|VEVO|Music|Video|Channel/gi, '').trim();
            track = parts[1].replace(/\(Official Video\)|\(Lyrics\)|\(OFFICIAL\)|\(Music Video\)|\(Video\)|\(Explicit\)|\[Official\]|\[Lyric Video\]|\[HQ\]|\|.*/gi, '').replace(/\(.*\)|\[.*\]/g, '').trim();
        }

        // Start YouTube fetch concurrently if videoUrl is provided
        let ytPromise = null;
        if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
            ytPromise = fetchYouTubeSubtitles(videoUrl).catch(() => null);
        }

        // 1. Try Precise Match (LRCLIB /api/get)
        if (hasDuration) {
            const queryUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}&duration=${Math.floor(durationSec)}`;
            console.log(`[Lyrics Fetcher] Stage 1 (Direct): Attempting exact match...`);
            try {
                const data = await Promise.race([
                    smartFetchJson(queryUrl),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
                ]);
                if (data && data.syncedLyrics) {
                    console.log(`[Lyrics Fetcher] SUCCESS: Precise match found on LRCLIB`);
                    return saveAndReturn({ lyrics: parseLRC(data.syncedLyrics), source: 'lrclib-direct' });
                }
            } catch (e) {
                console.log(`[Lyrics Fetcher] Stage 1: No direct match (${e.message})`);
            }
        }

        // 2. Try Search Fallback (LRCLIB /api/search)
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${track}`)}`;
        console.log(`[Lyrics Fetcher] Stage 2 (Search): Querying "${artist} ${track}"...`);
        try {
            const data = await Promise.race([
                smartFetchJson(searchUrl),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);
            if (Array.isArray(data)) {
                const best = data
                    .filter(r => r.syncedLyrics && (!hasDuration || Math.abs(r.duration - durationSec) < 60))
                    .sort((a, b) => hasDuration ? Math.abs(a.duration - durationSec) - Math.abs(b.duration - durationSec) : 0)[0];

                if (best) {
                    console.log(`[Lyrics Fetcher] SUCCESS: Search fallback found: "${best.trackName}"`);
                    return saveAndReturn({ lyrics: parseLRC(best.syncedLyrics), source: 'lrclib-search' });
                }
                console.log(`[Lyrics Fetcher] Stage 2: No suitable synced lyrics found.`);
            }
        } catch (e) {
            console.log(`[Lyrics Fetcher] Stage 2 Error: ${e.message}`);
        }

        // 3. Try Query Fallback
        if (originalQuery && !originalQuery.startsWith('http')) {
            const qSearchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(originalQuery)}`;
            console.log(`[Lyrics Fetcher] Stage 3 (Query): Querying "${originalQuery}"...`);
            try {
                const data = await Promise.race([
                    smartFetchJson(qSearchUrl),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
                ]);
                if (Array.isArray(data)) {
                    const best = data
                        .filter(r => r.syncedLyrics && (!hasDuration || Math.abs(r.duration - durationSec) < 60))
                        .sort((a, b) => hasDuration ? Math.abs(a.duration - durationSec) - Math.abs(b.duration - durationSec) : 0)[0];

                    if (best) {
                        console.log(`[Lyrics Fetcher] SUCCESS: Query fallback found: "${best.trackName}"`);
                        return saveAndReturn({ lyrics: parseLRC(best.syncedLyrics), source: 'lrclib-query' });
                    }
                    console.log(`[Lyrics Fetcher] Stage 3: No results for query.`);
                }
            } catch (e) {
                console.log(`[Lyrics Fetcher] Stage 3 Error: ${e.message}`);
            }
        }

        // 4. Try YouTube Subtitles (Final Fallback)
        if (ytPromise) {
            console.log(`[Lyrics Fetcher] Stage 4 (YouTube): Awaiting concurrent YouTube subtitle extraction...`);
            const ytSubs = await ytPromise;
            if (ytSubs) {
                console.log(`[Lyrics Fetcher] SUCCESS: YouTube captions extracted`);
                return saveAndReturn({ lyrics: ytSubs, source: 'youtube-captions' });
            }
            console.log(`[Lyrics Fetcher] Stage 4: No subtitles found on YouTube`);
        }

        console.log(`[Lyrics Fetcher] FAILURE: No lyrics found through any stage.`);
        return null;
    } catch (err) {
        console.error('[Lyrics Fetcher] CRITICAL ERROR:', err.stack);
        return null;
    }
}

async function fetchYouTubeSubtitles(url) {
    try {
        const json = await youtubedl(url, {
            dumpSingleJson: true,
            writeAutoSubs: true,
            noCheckCertificates: true,
            noWarnings: true,
            cookies: fs.existsSync('./cookies.txt') ? './cookies.txt' : undefined
        }).catch(() => null);

        if (!json) return null;

        const subs = json.subtitles || {};
        const autoSubs = json.automatic_captions || {};
        
        // Find best English track (manual preferred over auto)
        const enKey = Object.keys(subs).find(k => k.startsWith('en')) || 
                     Object.keys(autoSubs).find(k => k.startsWith('en'));
        
        if (!enKey) return null;

        const formats = subs[enKey] || autoSubs[enKey];
        const vttFormat = formats.find(f => f.ext === 'vtt');
        if (!vttFormat) return null;

        const response = await axios.get(vttFormat.url, { timeout: 10000 });
        if (response.status !== 200) return null;
        
        const lyrics = parseVTT(response.data);
        if (lyrics.length > 0) {
            console.log(`[Lyrics Fetcher] YouTube captions extracted successfully`);
            return lyrics;
        }
    } catch (err) {
        console.error(`[Lyrics Fetcher] YouTube subtitle error:`, err.message);
    }
    return null;
}

function parseVTT(vtt) {
    if (!vtt || typeof vtt !== 'string') return [];
    const lines = vtt.split('\n');
    const lyrics = [];
    const timeRegex = /(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = timeRegex.exec(line);
        if (match) {
            const startStr = match[1];
            const parts = startStr.split(':');
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            const seconds = parseFloat(parts[2]);
            const timeMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
            
            let text = "";
            let j = i + 1;
            while (j < lines.length && lines[j].trim() !== "" && !timeRegex.test(lines[j])) {
                text += (text ? " " : "") + lines[j].trim();
                j++;
            }
            if (text) {
                const cleanText = (text || "")
                    .replace(/<[^>]*>/g, '') // Remove HTML
                    .replace(/\[[^\]]*\]/g, '') // Remove [Music], [Applause]
                    .replace(/\([^\)]*\)/g, '') // Remove (Laughter)
                    .replace(/♪/g, '') // Remove music notes
                    .replace(/^- /g, '') // Remove leading dashes
                    .trim();
                if (cleanText) lyrics.push({ time: timeMs, text: cleanText });
            }
            i = j - 1;
        }
    }
    return lyrics;
}

function parseLRC(lrc) {
    if (!lrc || typeof lrc !== 'string') return [];
    const lines = lrc.split('\n');
    const lyrics = [];
    const timeRegex = /\[(\d+):(\d+\.\d+)\]/;

    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseFloat(match[2]);
            const timeMs = (minutes * 60 + seconds) * 1000;
            const text = line.split(']').slice(1).join(']').trim();
            if (text) {
                lyrics.push({ time: timeMs, text });
            }
        }
    }
    return lyrics;
}

module.exports = {
    fetchSyncedLyrics
};
