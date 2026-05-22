/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useImportCookiesAction(props) {
  const {
    appendRecentEvent, isStandalone, refreshEngineStatus, setLastAdded, setOauthPrompt, youtubeAuthRequiredRef
  } = props;
  return useCallback(async () => {
  if (!isStandalone || !window.aether?.importCookies) return;
  try {
    const res = await window.aether.importCookies();
    if (res?.canceled) return;
    await refreshEngineStatus();
    if (res?.success) {
      const audit = res?.cookieAudit;
      const message = audit?.valid ? `Cookies imported • ${audit.summary || 'format looks valid'}` : `Cookies imported • ${audit?.summary || 'please verify the file format'}`;
      appendRecentEvent('cookies_imported', audit?.summary || 'Cookie session updated', {
        tone: audit?.valid ? 'success' : 'warning'
      });
      setLastAdded(message);
      setTimeout(() => setLastAdded(null), 2800);
      if (audit?.readyForYoutube) {
        youtubeAuthRequiredRef.current = false;
        setOauthPrompt(null);
      }
      return;
    }
    appendRecentEvent('cookies_failed', res?.error || 'Cookie import failed', {
      tone: 'error'
    });
    setLastAdded(`Cookie import failed${res?.error ? `: ${String(res.error).slice(0, 42)}` : ''}`);
    setTimeout(() => setLastAdded(null), 2800);
  } catch (e) {
    console.warn('[Aether/Cookies] import failed', e);
    appendRecentEvent('cookies_failed', e?.message || 'Cookie import failed', {
      tone: 'error'
    });
    setLastAdded('Cookie import failed');
    setTimeout(() => setLastAdded(null), 2500);
  }
}, [appendRecentEvent, isStandalone, refreshEngineStatus]);
}
