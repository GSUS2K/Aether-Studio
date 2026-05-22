/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useCopyProfileShareCardAction(props) {
  const {
    aetherProfile, blobToDataUrl, createProfileShareCardBlob, downloadBlob, flashLastAdded, profileStats
  } = props;
  return useCallback(async () => {
  try {
    const blob = await createProfileShareCardBlob(aetherProfile, profileStats);
    if (window.aether?.clipboard?.writeImage) {
      const dataUrl = await blobToDataUrl(blob);
      const result = await window.aether.clipboard.writeImage(dataUrl);
      if (result?.success !== false) {
        flashLastAdded('Profile image copied', 1800, 'success');
        return;
      }
    }
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          'image/png': blob
        })]);
        flashLastAdded('Profile image copied', 1800, 'success');
        return;
      } catch (imageError) {
        console.warn('[Aether/Profile] Image clipboard unavailable, saving share image instead.', imageError);
      }
    }
    downloadBlob(blob, `aether-profile-${aetherProfile.handle || 'share'}.png`);
    flashLastAdded('Image clipboard blocked - PNG saved', 2400, 'warning');
  } catch (error) {
    console.error('[Aether/Profile] Failed to copy profile card', error);
    flashLastAdded('Could not copy profile card', 2200, 'error');
  }
}, [aetherProfile, flashLastAdded, profileStats]);
}
