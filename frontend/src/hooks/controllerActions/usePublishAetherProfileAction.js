/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function usePublishAetherProfileAction(props) {
  const {
    AETHER_PROFILE_API_BASE, aetherProfile, ensureAetherProfileCredentials, flashLastAdded, isProfilePublishing, profileStats, setAetherProfile, setIsProfilePublishing
  } = props;
  return useCallback(async () => {
  if (isProfilePublishing) return;
  const withCredentials = ensureAetherProfileCredentials(aetherProfile);
  if (!withCredentials.handle) {
    flashLastAdded('Add a handle before publishing', 2400, 'warning');
    setAetherProfile(withCredentials);
    return;
  }
  if (withCredentials.visibility === 'private') {
    flashLastAdded('Switch profile to Public or Unlisted first', 2600, 'warning');
    setAetherProfile(withCredentials);
    return;
  }
  setIsProfilePublishing(true);
  try {
    const payload = {
      displayName: withCredentials.displayName,
      handle: withCredentials.handle,
      bio: withCredentials.bio,
      avatarColor: withCredentials.avatarColor,
      avatarDataUrl: withCredentials.avatarDataUrl,
      visibility: withCredentials.visibility,
      shareStats: withCredentials.shareStats,
      stats: profileStats
    };
    const response = await fetch(`${AETHER_PROFILE_API_BASE}/v1/profile/${encodeURIComponent(withCredentials.profileId)}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${withCredentials.profileSecret}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not publish profile.');
    setAetherProfile({
      ...withCredentials,
      publishedVisibility: withCredentials.visibility,
      lastPublishedAt: Date.now()
    });
    flashLastAdded('Profile published', 2200, 'success');
  } catch (error) {
    flashLastAdded(error?.message || 'Profile publish failed', 3200, 'error');
  } finally {
    setIsProfilePublishing(false);
  }
}, [aetherProfile, flashLastAdded, isProfilePublishing, profileStats, setAetherProfile]);
}
