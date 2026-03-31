const axios = require('axios');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');

/**
 * Robust lyrics fetcher ported from Signal Discord Bot V5.3.13
 * Handles LRCLIB (Direct & Search) and YouTube Subtitles fallback.
 */

async function fetchSyncedLyrics(trackName, artistName, durationSec, originalQuery, videoUrl) {
    const hasDuration = typeof durationSec === 'number' && durationSec > 0;
    console.log(`[Lyrics Fetcher] V6.5.4 Search: "${trackName}" by "${artistName}" (${hasDuration ? durationSec + 's' : 'DURATION_UNKNOWN'})`);
    
    try {
        // 1. Clean Metadata
        let artist = (artistName || "").replace(/ - Topic|Official|VEVO|Music|Video|Channel/gi, '').trim();
        let track = (trackName || "").replace(/\(Official Video\)|\(Lyrics\)|\(OFFICIAL\)|\(Music Video\)|\(Video\)|\(Explicit\)|\[Official\]|\[Lyric Video\]|\[HQ\]|\|.*/gi, '').replace(/\(.*\)|\[.*\]/g, '').trim();

        if (trackName.includes(' - ')) {
            const parts = trackName.split(' - ');
            artist = parts[0].replace(/Official|VEVO|Music|Video|Channel/gi, '').trim();
            track = parts[1].replace(/\(Official Video\)|\(Lyrics\)|\(OFFICIAL\)|\(Music Video\)|\(Video\)|\(Explicit\)|\[Official\]|\[Lyric Video\]|\[HQ\]|\|.*/gi, '').replace(/\(.*\)|\[.*\]/g, '').trim();
        }

        // 2. Try Precise Match (LRCLIB /api/get)
        if (hasDuration) {
            const queryUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}&duration=${Math.floor(durationSec)}`;
            console.log(`[Lyrics Fetcher] Stage 1 (Direct): Attempting exact match...`);
            try {
                const resp = await axios.get(queryUrl, { timeout: 10000 });
                if (resp.status === 200 && resp.data.syncedLyrics) {
                    console.log(`[Lyrics Fetcher] SUCCESS: Precise match found on LRCLIB`);
                    return { lyrics: parseLRC(resp.data.syncedLyrics), source: 'lrclib-direct' };
                }
            } catch (e) {
                console.log(`[Lyrics Fetcher] Stage 1: No direct match (${e.response?.status || e.message})`);
            }
        }

        // 3. Try Search Fallback (LRCLIB /api/search)
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${track}`)}`;
        console.log(`[Lyrics Fetcher] Stage 2 (Search): Querying "${artist} ${track}"...`);
        try {
            const searchResp = await axios.get(searchUrl, { timeout: 10000 });
            if (searchResp.status === 200 && Array.isArray(searchResp.data)) {
                const results = searchResp.data;
                const best = results
                    .filter(r => r.syncedLyrics && (!hasDuration || Math.abs(r.duration - durationSec) < 60))
                    .sort((a, b) => hasDuration ? Math.abs(a.duration - durationSec) - Math.abs(b.duration - durationSec) : 0)[0];

                if (best) {
                    console.log(`[Lyrics Fetcher] SUCCESS: Search fallback found: "${best.trackName}"`);
                    return { lyrics: parseLRC(best.syncedLyrics), source: 'lrclib-search' };
                }
                console.log(`[Lyrics Fetcher] Stage 2: No suitable synced lyrics in ${results.length} results`);
            }
        } catch (e) {
            console.error('[Lyrics Fetcher] Stage 2 Error:', e.message);
        }

        // 4. Try Query Fallback (using original query if available)
        if (originalQuery && !originalQuery.startsWith('http')) {
            const qSearchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(originalQuery)}`;
            console.log(`[Lyrics Fetcher] Stage 3 (Query): Querying "${originalQuery}"...`);
            try {
                const qResp = await axios.get(qSearchUrl, { timeout: 10000 });
                if (qResp.status === 200 && Array.isArray(qResp.data)) {
                    const results = qResp.data;
                    const best = results
                        .filter(r => r.syncedLyrics && (!hasDuration || Math.abs(r.duration - durationSec) < 60))
                        .sort((a, b) => hasDuration ? Math.abs(a.duration - durationSec) - Math.abs(b.duration - durationSec) : 0)[0];

                    if (best) {
                        console.log(`[Lyrics Fetcher] SUCCESS: Query fallback found: "${best.trackName}"`);
                        return { lyrics: parseLRC(best.syncedLyrics), source: 'lrclib-query' };
                    }
                    console.log(`[Lyrics Fetcher] Stage 3: No results for query.`);
                }
            } catch (e) {
                console.log(`[Lyrics Fetcher] Stage 3 Error: ${e.message}`);
            }
        }

        // 5. Try YouTube Subtitles (Final Fallback)
        if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
            console.log(`[Lyrics Fetcher] Stage 4 (YouTube): Extracting subtitles from ${videoUrl}...`);
            const ytSubs = await fetchYouTubeSubtitles(videoUrl);
            if (ytSubs) {
                console.log(`[Lyrics Fetcher] SUCCESS: YouTube captions extracted`);
                return { lyrics: ytSubs, source: 'youtube-captions' };
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
