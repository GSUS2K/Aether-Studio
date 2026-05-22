import { useEffect } from 'react';

export function useKeyboardShortcutLayer(props) {
  const {
    appLockSettingsRef, closeHeaderSurfaces, destructiveConfirmRequest, feedbackRef, focusMusicSearch, gestureLabRef, handleControl, headerControlsRef,
    inspectTarget, isAuraStageOpen, isCommandPaletteOpen, isExperienceCenterOpen, isFeedbackOpen, isGestureLabOpen, isLibraryOverlayOpen, isLockModalOpen,
    isManualLyricsEditorOpen, isManualLyricsRawEditorOpen, isMixtapeVaultOpen, isNativeKeyboardTarget, isParsedShortcutEventMatch, isPlayerOverlayOpen, isPlaying, isSharedSceneOpen,
    isShortcutSettingsOpen, isSpotifyImportOpen, isStandalone, isTipsOverlayOpen, isViewingFullDiscovery, isViewingFullPlaylist, isViewingFullQueue, localAudioRef,
    oauthPrompt, openDiagnosticsPage, openExperienceCenterPage, openLibraryOverlay, openShortcutSettings, parsedShortcuts, setIsAuraStageOpen, setVolume,
    setVolumeToast, soundCapsuleRef, toggleFocusMode, toggleMiniPlayer,
  } = props;

  useEffect(() => {
  const isTypingTarget = el => {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
  };
  const onShortcut = e => {
    if (e.defaultPrevented || e.repeat || isNativeKeyboardTarget(e)) return;
    const hasBlockingOverlayOpen = Boolean(oauthPrompt || destructiveConfirmRequest || isTipsOverlayOpen || headerControlsRef.current?.isOpen() || feedbackRef.current?.isOpen() || gestureLabRef.current?.isOpen() || soundCapsuleRef.current?.isOpen() || appLockSettingsRef.current?.isOpen() || isShortcutSettingsOpen || isExperienceCenterOpen || isLockModalOpen || isSpotifyImportOpen || isFeedbackOpen || isGestureLabOpen || isAuraStageOpen || Boolean(inspectTarget) || isLibraryOverlayOpen || isPlayerOverlayOpen || isViewingFullQueue || isViewingFullDiscovery || isViewingFullPlaylist || isSharedSceneOpen || isMixtapeVaultOpen || isManualLyricsEditorOpen || isManualLyricsRawEditorOpen || isCommandPaletteOpen);
    if (hasBlockingOverlayOpen) {
      return;
    }
    const hasControlMods = e.metaKey || e.ctrlKey || e.altKey;
    if (isTypingTarget(document.activeElement) && !hasControlMods) return;
    if (isParsedShortcutEventMatch(e, parsedShortcuts.playPause)) {
      e.preventDefault();
      handleControl(isPlaying ? 'pause' : 'resume');
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.previous)) {
      e.preventDefault();
      handleControl('previous');
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.next)) {
      e.preventDefault();
      handleControl('skip');
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.volumeUp)) {
      e.preventDefault();
      setVolume(prev => {
        const next = Math.min(1, prev + 0.08);
        if (localAudioRef.current) localAudioRef.current.volume = next;
        window.aether?.store?.set('volume', next);
        return next;
      });
      setVolumeToast(true);
      setTimeout(() => setVolumeToast(false), 1200);
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.volumeDown)) {
      e.preventDefault();
      setVolume(prev => {
        const next = Math.max(0, prev - 0.08);
        if (localAudioRef.current) localAudioRef.current.volume = next;
        window.aether?.store?.set('volume', next);
        return next;
      });
      setVolumeToast(true);
      setTimeout(() => setVolumeToast(false), 1200);
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.mute)) {
      e.preventDefault();
      handleControl('mute');
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.clearQueue)) {
      e.preventDefault();
      handleControl('clear');
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.focusSearch)) {
      e.preventDefault();
      focusMusicSearch();
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.shortcutSettings)) {
      e.preventDefault();
      openShortcutSettings();
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.studioLibrary)) {
      e.preventDefault();
      openLibraryOverlay();
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.experienceCenter)) {
      e.preventDefault();
      openExperienceCenterPage('home');
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.auraStage)) {
      e.preventDefault();
      closeHeaderSurfaces('aura-stage');
      setIsAuraStageOpen(true);
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.focusMode)) {
      e.preventDefault();
      toggleFocusMode();
      return;
    }
    if (isStandalone && isParsedShortcutEventMatch(e, parsedShortcuts.miniPlayer)) {
      e.preventDefault();
      toggleMiniPlayer();
      return;
    }
    if (isParsedShortcutEventMatch(e, parsedShortcuts.diagnostics)) {
      e.preventDefault();
      openDiagnosticsPage();
    }
  };
  window.addEventListener('keydown', onShortcut);
  return () => window.removeEventListener('keydown', onShortcut);
}, [closeHeaderSurfaces, destructiveConfirmRequest, focusMusicSearch, handleControl, inspectTarget, isAuraStageOpen, isCommandPaletteOpen, isExperienceCenterOpen, isFeedbackOpen, isGestureLabOpen, isLibraryOverlayOpen, isLockModalOpen, isManualLyricsEditorOpen, isManualLyricsRawEditorOpen, isMixtapeVaultOpen, isPlayerOverlayOpen, isPlaying, isShortcutSettingsOpen, isSharedSceneOpen, isSpotifyImportOpen, isStandalone, isTipsOverlayOpen, isViewingFullDiscovery, isViewingFullPlaylist, isViewingFullQueue, oauthPrompt, openDiagnosticsPage, openExperienceCenterPage, openLibraryOverlay, openShortcutSettings, parsedShortcuts, toggleFocusMode, toggleMiniPlayer]);
}
