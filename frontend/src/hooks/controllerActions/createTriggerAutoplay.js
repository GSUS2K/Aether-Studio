/* eslint-disable react-hooks/preserve-manual-memoization */
export function createTriggerAutoplay(props) {
  const {
    autoplayMoodMode, currentTrack, handleAdd, history, isAutoplayEnabled, isOfflineMode, isStandalone, normalizeTrackIdentity, queue, setIsAutoplaySeeking, skipEvents
  } = props;
  return async (seedTrack = null) => {
  if (!isAutoplayEnabled || !isStandalone || isOfflineMode) return;
  const seed = seedTrack || currentTrack || history[0];
  if (!seed) return;
  const normalizeTitle = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizeArtist = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const seedTitleNorm = normalizeTitle(seed.title);
  const seedArtistNorm = normalizeArtist(seed.author);
  const seedDuration = Number(seed.totalDurationMs || seed.duration || 0);
  const seedId = String(seed.id || seed.youtubeId || '').trim();
  const seedUrl = String(seed.actualUrl || seed.url || '').trim();
  const recentTracks = [...queue, ...history].slice(0, 24);
  const recentTrackKeys = new Set(recentTracks.map(t => normalizeTrackIdentity(t)).filter(Boolean));
  const recentArtistKeys = recentTracks.map(t => normalizeArtist(t?.author)).filter(Boolean);
  const recentArtistSet = new Set(recentArtistKeys.slice(0, autoplayMoodMode === 'flow' ? 10 : autoplayMoodMode === 'safe' ? 6 : 4));
  const skipSignals = (skipEvents || []).slice(-160);
  const signalByTrack = new Map();
  const signalByArtist = new Map();
  const toSignalDelta = reason => {
    const r = String(reason || '').toLowerCase();
    if (r.includes('natural_end')) return 2;
    if (r.includes('manual_skip')) return -2;
    if (r.includes('premature') || r.includes('error') || r.includes('stalled')) return -1;
    return 0;
  };
  for (const event of skipSignals) {
    const titleKey = normalizeTitle(event?.title);
    const artistKey = normalizeArtist(event?.author || '');
    const delta = toSignalDelta(event?.reason);
    if (titleKey) signalByTrack.set(titleKey, (signalByTrack.get(titleKey) || 0) + delta);
    if (artistKey) signalByArtist.set(artistKey, (signalByArtist.get(artistKey) || 0) + delta);
  }
  const isSameAsSeed = candidate => {
    if (!candidate) return false;
    const candidateId = String(candidate.id || candidate.youtubeId || '').trim();
    const candidateTitleNorm = normalizeTitle(candidate.title);
    const candidateUrl = String(candidate.actualUrl || candidate.url || '').trim();
    return seedId && candidateId && seedId === candidateId || seedUrl && candidateUrl && seedUrl === candidateUrl || seedTitleNorm && candidateTitleNorm && seedTitleNorm === candidateTitleNorm;
  };
  try {
    setIsAutoplaySeeking(true);

    // Primary Discovery Path: Recommendations
    const fetchPromise = window.aether.getRecommendations({
      title: seed.title,
      author: seed.author,
      url: seed.actualUrl || seed.url
    });

    // 10s Timeout Guard
    const recs = await Promise.race([fetchPromise, new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))]);
    const queueHasTitle = candidate => queue.some(q => normalizeTitle(q?.title) === normalizeTitle(candidate?.title));
    const buildScore = candidate => {
      const cTitle = normalizeTitle(candidate?.title);
      const cArtist = normalizeArtist(candidate?.author);
      const cDuration = Number(candidate?.totalDurationMs || candidate?.duration || 0);
      const cKey = normalizeTrackIdentity(candidate);

      // Hard-ish guards
      if (!cTitle) return -9999;
      if (isSameAsSeed(candidate)) return -5000;
      if (queueHasTitle(candidate)) return -4000;
      let score = 0;

      // (1) Session memory guardrails and no immediate repeat
      if (recentTrackKeys.has(cKey)) score -= autoplayMoodMode === 'explore' ? 18 : 35;
      if (recentArtistSet.has(cArtist)) score -= autoplayMoodMode === 'explore' ? 8 : 16;

      // (2) Context continuity scoring (artist, duration proxy)
      if (seedArtistNorm && cArtist && seedArtistNorm === cArtist) {
        score += autoplayMoodMode === 'flow' ? 9 : autoplayMoodMode === 'safe' ? 5 : 2;
      }
      if (seedDuration > 0 && cDuration > 0) {
        const ratio = Math.abs(cDuration - seedDuration) / Math.max(seedDuration, 1);
        const continuity = Math.max(0, 1 - Math.min(1, ratio));
        score += autoplayMoodMode === 'flow' ? continuity * 10 : autoplayMoodMode === 'safe' ? continuity * 7 : continuity * 4;
      }

      // (3) Skip-aware learning and (5) source reliability filter
      const trackSignal = signalByTrack.get(cTitle) || 0;
      const artistSignal = signalByArtist.get(cArtist) || 0;
      score += trackSignal * (autoplayMoodMode === 'safe' ? 2.4 : autoplayMoodMode === 'flow' ? 1.8 : 1.0);
      score += artistSignal * (autoplayMoodMode === 'safe' ? 1.4 : 1.0);

      // (4) Mood continuity / novelty bias
      if (autoplayMoodMode === 'explore') {
        if (!recentArtistSet.has(cArtist)) score += 8;
        score += Math.random() * 4;
      } else if (autoplayMoodMode === 'safe') {
        if (trackSignal < -2 || artistSignal < -4) score -= 40;
        if (trackSignal > 0) score += 6;
      } else {
        // flow
        if (!recentArtistSet.has(cArtist)) score += 2;
      }
      return score;
    };
    let pool = Array.isArray(recs) ? recs.slice() : [];

    // Fallback Path: Neural Breadth Search (by artist/title)
    if (pool.length === 0) {
      console.log("[Aether] Primary Discovery failed, broadening signal...");
      const fallbackResults = await window.aether.search(seed.author || seed.title?.split('-')?.[0] || seed.title || 'music');
      pool = Array.isArray(fallbackResults) ? fallbackResults : [];
    }
    if (pool.length > 0) {
      const ranked = pool.map(candidate => ({
        candidate,
        score: buildScore(candidate)
      })).filter(entry => entry.score > -3000).sort((a, b) => b.score - a.score);
      if (ranked.length > 0) {
        const topN = autoplayMoodMode === 'safe' ? 2 : autoplayMoodMode === 'flow' ? 3 : Math.min(7, ranked.length);
        const finalists = ranked.slice(0, Math.max(1, topN));
        const selected = autoplayMoodMode === 'explore' ? finalists[Math.floor(Math.random() * finalists.length)] : finalists[0];
        handleAdd(selected.candidate);
        return;
      }
    }
  } catch (e) {
    console.error("[Aether] Discovery Error:", e);
  } finally {
    setIsAutoplaySeeking(false);
  }
};
}
