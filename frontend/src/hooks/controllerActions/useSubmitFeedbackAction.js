/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useSubmitFeedbackAction(props) {
  const {
    BUILD_VERSION, DEFAULT_FEEDBACK_DRAFT, FEEDBACK_ISSUE_URL, FEEDBACK_STORAGE_KEY, UX_VERSION, appendRecentEvent, auraPreset, axios, currentTrack, feedbackDraft, getActivePlaybackPositionMs, isStandalone, lyrics, platform, queue, setFeedbackDraft, setFeedbackStatus, setIsFeedbackOpen, setIsFeedbackSending, videoMode, visualizerMode
  } = props;
  return useCallback(async () => {
  const summary = feedbackDraft.summary.trim();
  const details = feedbackDraft.details.trim();
  if (!summary || !details) {
    setFeedbackStatus('Add a short title and a little detail first.');
    return;
  }
  const trackSnapshot = currentTrack ? {
    title: currentTrack.title || '',
    author: currentTrack.author || '',
    url: currentTrack.actualUrl || currentTrack.url || '',
    youtubeId: currentTrack.youtubeId || '',
    positionMs: getActivePlaybackPositionMs()
  } : null;
  const payload = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: feedbackDraft.type,
    summary,
    details,
    contact: feedbackDraft.contact.trim(),
    buildVersion: BUILD_VERSION,
    uxVersion: UX_VERSION,
    platform: platform || 'web',
    isStandalone,
    currentTrack: trackSnapshot,
    diagnostics: {
      playbackMode: videoMode || 'audio',
      visualizerMode,
      auraPreset,
      queueLength: queue.length,
      lyricsCount: lyrics.length
    },
    createdAt: new Date().toISOString()
  };
  setIsFeedbackSending(true);
  setFeedbackStatus('Preparing feedback...');
  try {
    const persistEntry = async entry => {
      if (isStandalone && window.aether?.store?.get && window.aether?.store?.set) {
        const existing = await window.aether.store.get(FEEDBACK_STORAGE_KEY);
        const list = Array.isArray(existing) ? existing : [];
        await window.aether.store.set(FEEDBACK_STORAGE_KEY, [entry, ...list].slice(0, 30));
        return;
      }
      const existingRaw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([entry, ...(Array.isArray(existing) ? existing : [])].slice(0, 30)));
    };
    const endpoint = import.meta.env.VITE_FEEDBACK_ENDPOINT?.trim();
    if (endpoint) {
      await axios.post(endpoint, payload, {
        timeout: 8000
      });
      await persistEntry({
        ...payload,
        delivery: 'endpoint'
      });
      setFeedbackStatus('Sent. Thanks for the report.');
      appendRecentEvent('feedback_sent', payload.summary, {
        tone: 'success',
        title: payload.type
      });
    } else {
      const bodyLines = [`Type: ${payload.type}`, `Build: ${payload.buildVersion} / ${payload.uxVersion}`, `Platform: ${payload.platform}${payload.isStandalone ? ' desktop' : ' web'}`, '', 'Details:', payload.details, '', payload.currentTrack ? `Track: ${payload.currentTrack.title} - ${payload.currentTrack.author}` : 'Track: none', payload.currentTrack?.url ? `Source: ${payload.currentTrack.url}` : '', `Queue: ${payload.diagnostics.queueLength}`, `Mode: ${payload.diagnostics.playbackMode} / ${payload.diagnostics.visualizerMode}`, payload.contact ? `Contact: ${payload.contact}` : ''].filter(Boolean);
      const issueUrl = `${FEEDBACK_ISSUE_URL}?title=${encodeURIComponent(`[${payload.type}] ${payload.summary}`)}&body=${encodeURIComponent(bodyLines.join('\n'))}&labels=${encodeURIComponent('feedback')}`;
      await persistEntry({
        ...payload,
        delivery: 'github-issue-draft'
      });
      if (isStandalone && window.aether?.openExternal) {
        await window.aether.openExternal(issueUrl);
      } else {
        window.open(issueUrl, '_blank', 'noopener,noreferrer');
      }
      setFeedbackStatus('Opened a GitHub issue draft. Submit it there so it lands in the maintainer inbox.');
      appendRecentEvent('feedback_issue_opened', payload.summary, {
        tone: 'success',
        title: payload.type
      });
    }
    setFeedbackDraft(DEFAULT_FEEDBACK_DRAFT);
    setTimeout(() => {
      setIsFeedbackOpen(false);
      setFeedbackStatus('');
    }, 1200);
  } catch (error) {
    console.warn('[Aether/Feedback] submit failed', error);
    setFeedbackStatus(`Feedback failed: ${String(error?.message || error).slice(0, 80)}`);
    appendRecentEvent('feedback_failed', error?.message || 'Feedback failed', {
      tone: 'error'
    });
  } finally {
    setIsFeedbackSending(false);
  }
}, [appendRecentEvent, auraPreset, currentTrack, feedbackDraft, getActivePlaybackPositionMs, isStandalone, lyrics.length, platform, queue.length, videoMode, visualizerMode]);
}
