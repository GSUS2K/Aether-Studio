/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback } from 'react';

export function useCloseTopmostOverlay(props) {
  const {
    activeMenuTrack, appLockSettingsRef, closeHeaderSurfaces, closeShortcutSettings, closeTipsOverlay, exitVideoMode, feedbackRef, gestureLabRef, headerControlsRef, inspectTarget, isAuraStageOpen, isAutoplayMenuOpen, isCommandPaletteOpen, isDiagnosticsOpen, isExperienceCenterOpen, isFeedbackOpen, isGestureLabOpen, isLibraryOverlayOpen, isLocalMediaImporting, isLockBusy, isLockModalOpen, isLooksPanelOpen, isLyricsExpanded, isManualLyricsEditorOpen, isManualLyricsRawEditorOpen, isMiniQueuePeekOpen, isMixtapeVaultOpen, isPlayerOverlayOpen, isSharedSceneOpen, isShortcutSettingsOpen, isSleepTimerMenuOpen, isSpotifyImportOpen, isSpotifyImporting, isTipsOverlayOpen, isViewingFullDiscovery, isViewingFullPlaylist, isViewingFullQueue, oauthPrompt, setActiveMenuTrack, setInspectTarget, setIsAuraStageOpen, setIsAutoplayMenuOpen, setIsCommandPaletteOpen, setIsExperienceCenterOpen, setIsFeedbackOpen, setIsGestureLabOpen, setIsLibraryOverlayOpen, setIsLockModalOpen, setIsLyricsExpanded, setIsManualLyricsEditorOpen, setIsManualLyricsRawEditorOpen, setIsMiniQueuePeekOpen, setIsMixtapeVaultOpen, setIsPlayerOverlayOpen, setIsSharedSceneOpen, setIsSpotifyImportOpen, setIsViewingFullDiscovery, setIsViewingFullPlaylist, setIsViewingFullQueue, setLibraryActionTarget, setOauthPrompt, sleepTimerControlsRef, soundCapsuleRef, videoMode, youtubeAuthRequiredRef
  } = props;
  return useCallback(() => {
  if (isCommandPaletteOpen) {
    setIsCommandPaletteOpen(false);
    return true;
  }
  if (headerControlsRef.current?.isOpen()) {
    headerControlsRef.current.close();
    return true;
  }
  if (sleepTimerControlsRef.current?.isOpen()) {
    sleepTimerControlsRef.current.close();
    return true;
  }
  if (soundCapsuleRef.current?.isOpen()) {
    soundCapsuleRef.current.close();
    return true;
  }
  if (feedbackRef.current?.isOpen()) {
    feedbackRef.current.close();
    return true;
  }
  if (gestureLabRef.current?.isOpen()) {
    gestureLabRef.current.close();
    return true;
  }
  if (appLockSettingsRef.current?.isOpen()) {
    appLockSettingsRef.current.close();
    return true;
  }
  if (oauthPrompt) {
    youtubeAuthRequiredRef.current = false;
    setOauthPrompt(null);
    return true;
  }
  if (isShortcutSettingsOpen) {
    closeShortcutSettings();
    return true;
  }
  if (isTipsOverlayOpen) {
    closeTipsOverlay();
    return true;
  }
  if (isSharedSceneOpen) {
    setIsSharedSceneOpen(false);
    return true;
  }
  if (isFeedbackOpen) {
    setIsFeedbackOpen(false);
    return true;
  }
  if (isGestureLabOpen) {
    setIsGestureLabOpen(false);
    return true;
  }
  if (isExperienceCenterOpen) {
    setIsExperienceCenterOpen(false);
    return true;
  }
  if (inspectTarget) {
    setInspectTarget(null);
    return true;
  }
  if (isAuraStageOpen) {
    setIsAuraStageOpen(false);
    return true;
  }
  if (isLibraryOverlayOpen) {
    setIsLibraryOverlayOpen(false);
    setLibraryActionTarget(null);
    return true;
  }
  if (isPlayerOverlayOpen) {
    setIsPlayerOverlayOpen(false);
    return true;
  }
  if (isViewingFullPlaylist) {
    setIsViewingFullPlaylist(null);
    return true;
  }
  if (isViewingFullQueue) {
    setIsViewingFullQueue(false);
    return true;
  }
  if (isViewingFullDiscovery) {
    setIsViewingFullDiscovery(false);
    return true;
  }
  if (isMixtapeVaultOpen) {
    setIsMixtapeVaultOpen(false);
    return true;
  }
  if (isManualLyricsRawEditorOpen) {
    setIsManualLyricsRawEditorOpen(false);
    return true;
  }
  if (isManualLyricsEditorOpen) {
    setIsManualLyricsEditorOpen(false);
    return true;
  }
  if (isLockModalOpen && !isLockBusy) {
    setIsLockModalOpen(false);
    return true;
  }
  if (isSpotifyImportOpen && !(isSpotifyImporting || isLocalMediaImporting)) {
    setIsSpotifyImportOpen(false);
    return true;
  }
  if (isMiniQueuePeekOpen) {
    setIsMiniQueuePeekOpen(false);
    return true;
  }
  if (activeMenuTrack) {
    setActiveMenuTrack(null);
    return true;
  }
  if (isAutoplayMenuOpen) {
    setIsAutoplayMenuOpen(false);
    return true;
  }
  if (isSleepTimerMenuOpen || isLooksPanelOpen || isDiagnosticsOpen) {
    closeHeaderSurfaces();
    return true;
  }
  if (isLyricsExpanded) {
    setIsLyricsExpanded(false);
    return true;
  }
  if (videoMode === 'cinema') {
    exitVideoMode({
      reason: 'escape_from_cinema'
    });
    return true;
  }
  return false;
}, [activeMenuTrack, closeHeaderSurfaces, closeShortcutSettings, closeTipsOverlay, exitVideoMode, isAutoplayMenuOpen, isCommandPaletteOpen, inspectTarget, isAuraStageOpen, isDiagnosticsOpen, isFeedbackOpen, isGestureLabOpen, isExperienceCenterOpen, isLibraryOverlayOpen, isLockBusy, isLockModalOpen, isLooksPanelOpen, isLocalMediaImporting, isLyricsExpanded, isManualLyricsEditorOpen, isManualLyricsRawEditorOpen, isMiniQueuePeekOpen, isMixtapeVaultOpen, isPlayerOverlayOpen, isSharedSceneOpen, isShortcutSettingsOpen, isSleepTimerMenuOpen, isSpotifyImportOpen, isSpotifyImporting, isTipsOverlayOpen, isViewingFullDiscovery, isViewingFullPlaylist, isViewingFullQueue, oauthPrompt, videoMode]);
}
