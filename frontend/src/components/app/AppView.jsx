import { AppMainFrame } from './AppMainFrame';

export function AppView(props) {
  const {
    AetherConfirmDialog,
    CommandPalette,
    ExperienceCenterShell,
    MotionConfig,
    PartyMode,
    aetherProfile,
    appendRecentEvent,
    auraPreset,
    avatarFileInputRef,
    cameraHandSignal,
    clearDiagnosticEvents,
    closeDestructiveConfirmation,
    commandPaletteCommands,
    commandPaletteShortcutLabel,
    copyProfileLink,
    copyProfileShareCard,
    currentTrack,
    destructiveConfirmRequest,
    diagnostics,
    diagnosticsApiBase,
    discordPrivate,
    doodleIntensityBadge,
    engineStatus,
    experienceCenterInitialPage,
    faceControlSignal,
    faceControlStatus,
    flashLastAdded,
    getActivePlaybackPositionMs,
    getProxyUrl,
    globalMediaShortcutsEnabled,
    handleAvatarFileSelected,
    handleControl,
    handleCopyDiagnosticsValue,
    handleRunRuntimeRepair,
    isAudioBuffering,
    isCommandPaletteOpen,
    isDepthMotionEnabled,
    isDoodleMode,
    isExperienceCenterOpen,
    isFaceControlEnabled,
    isGestureControlEnabled,
    isMacPlatform,
    isOfflineMode,
    isPartyModeOpen,
    isPlaying,
    isProfilePublishing,
    isRuntimeRepairing,
    isShortcutSettingsSaving,
    isStandalone,
    lockIdleMinutes,
    lockStatus,
    lyrics,
    lyricOffsetMs,
    mixtapeLiveLyric,
    normalizeQueueTrack,
    openAppLockSettings,
    openFeedbackPanel,
    openGestureLab,
    openLibraryOverlay,
    openMusicImport,
    openShortcutSettings,
    openSignalLedger,
    openTipsOverlay,
    performanceMode,
    platform,
    playlists,
    profileStats,
    publishAetherProfile,
    queue,
    queuePollDisplay,
    queuePollTime,
    requestDestructiveConfirmation,
    resetShortcutSettingsToDefaults,
    saveProfileShareCard,
    saveShortcutSettings,
    setAetherProfile,
    setAuraPreset,
    setDiscordPrivate,
    setGlobalMediaShortcutsEnabled,
    setIsAppLocked,
    setIsAuraStageOpen,
    setIsCommandPaletteOpen,
    setIsDepthMotionEnabled,
    setIsDoodleMode,
    setIsExperienceCenterOpen,
    setIsFaceControlEnabled,
    setIsGestureControlEnabled,
    setIsManualStop,
    setIsOfflineMode,
    setIsPartyModeOpen,
    setIsPlaying,
    setLockIdleMinutes,
    setLyricOffsetMs,
    setPartyInfo,
    setPerformanceMode,
    setQueue,
    setShortcutDraft,
    setShortcutSettingsError,
    setShowShortcutHints,
    setVideoMode,
    setVisualizerMode,
    shortcutDraft,
    shortcutSettingsError,
    shortcuts,
    showShortcutHints,
    skipEvents,
    soundLedgerView,
    refreshLockStatus,
    unpublishAetherProfile,
    videoMode,
    visualizerMode
  } = props;
  return <MotionConfig reducedMotion={performanceMode === 'low' ? 'always' : 'never'} transition={performanceMode === 'low' ? {
    duration: 0
  } : undefined}>
      <AppMainFrame {...props} />

      <ExperienceCenterShell open={isExperienceCenterOpen} onClose={() => setIsExperienceCenterOpen(false)} initialPage={experienceCenterInitialPage} visualizerMode={visualizerMode} setVisualizerMode={setVisualizerMode} performanceMode={performanceMode} setPerformanceMode={setPerformanceMode} auraPreset={auraPreset} setAuraPreset={setAuraPreset} isDepthMotionEnabled={isDepthMotionEnabled} setIsDepthMotionEnabled={setIsDepthMotionEnabled} isDoodleMode={isDoodleMode} setIsDoodleMode={setIsDoodleMode} doodleIntensityBadge={doodleIntensityBadge} setIsAuraStageOpen={setIsAuraStageOpen} isGestureControlEnabled={isGestureControlEnabled} openGestureLab={openGestureLab} openSignalLedger={openSignalLedger} openShortcutSettings={openShortcutSettings} openFeedbackPanel={openFeedbackPanel} openAppLockSettings={openAppLockSettings} lockStatus={lockStatus} isStandalone={isStandalone} discordPrivate={discordPrivate} onToggleDiscordPrivate={() => {
      const next = !discordPrivate;
      setDiscordPrivate(next);
      localStorage.setItem('aether.discordPrivate', JSON.stringify(next));
      window.aether?.setDiscordPrivate?.(next);
    }} isOfflineMode={isOfflineMode} onToggleOfflineMode={() => {
      const next = !isOfflineMode;
      setIsOfflineMode(next);
      localStorage.setItem('aether.offlineMode', JSON.stringify(next));
      if (next) {
        setVideoMode(null);
      }
    }} flashLastAdded={flashLastAdded} getProxyUrl={getProxyUrl} currentTrack={currentTrack} isPlaying={isPlaying} getActivePlaybackPositionMs={getActivePlaybackPositionMs} platform={platform} videoMode={videoMode} queueLength={queue.length} lyricsCount={lyrics.length} appendRecentEvent={appendRecentEvent} setIsGestureControlEnabled={setIsGestureControlEnabled} isFaceControlEnabled={isFaceControlEnabled} setIsFaceControlEnabled={setIsFaceControlEnabled} faceControlStatus={faceControlStatus} faceControlSignal={faceControlSignal} cameraHandSignal={cameraHandSignal} shortcuts={shortcuts} shortcutDraft={shortcutDraft} setShortcutDraft={setShortcutDraft} shortcutSettingsError={shortcutSettingsError} setShortcutSettingsError={setShortcutSettingsError} globalMediaShortcutsEnabled={globalMediaShortcutsEnabled} setGlobalMediaShortcutsEnabled={setGlobalMediaShortcutsEnabled} saveShortcutSettings={saveShortcutSettings} isShortcutSettingsSaving={isShortcutSettingsSaving} resetShortcutSettingsToDefaults={resetShortcutSettingsToDefaults} isMacPlatform={isMacPlatform} openTipsOverlay={openTipsOverlay} lockIdleMinutes={lockIdleMinutes} setLockIdleMinutes={setLockIdleMinutes} refreshLockStatus={refreshLockStatus} setIsAppLocked={setIsAppLocked} requestDestructiveConfirmation={requestDestructiveConfirmation} showShortcutHints={showShortcutHints} setShowShortcutHints={setShowShortcutHints} aetherProfile={aetherProfile} setAetherProfile={setAetherProfile} profileStats={profileStats} onCopyProfileCard={copyProfileShareCard} onSaveProfileCard={saveProfileShareCard} onCopyProfileLink={copyProfileLink} avatarFileInputRef={avatarFileInputRef} onAvatarFileSelected={handleAvatarFileSelected} onPublishProfile={publishAetherProfile} onUnpublishProfile={unpublishAetherProfile} isProfilePublishing={isProfilePublishing} soundLedgerView={soundLedgerView} diagnostics={diagnostics} engineStatus={engineStatus} isRuntimeRepairing={isRuntimeRepairing} handleRunRuntimeRepair={handleRunRuntimeRepair} openMusicImport={openMusicImport} openLibraryOverlay={openLibraryOverlay} diagnosticsApiBase={diagnosticsApiBase} queuePollDisplay={queuePollDisplay} queuePollTime={queuePollTime} skipEvents={skipEvents} onClearDiagnosticEvents={clearDiagnosticEvents} handleCopyDiagnosticsValue={handleCopyDiagnosticsValue} />
  

      <AetherConfirmDialog request={destructiveConfirmRequest} onCancel={() => closeDestructiveConfirmation(false)} onConfirm={dontAskAgain => closeDestructiveConfirmation(true, dontAskAgain)} />
  

      <CommandPalette open={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} commands={commandPaletteCommands} shortcutLabel={commandPaletteShortcutLabel} showShortcutHints={showShortcutHints} />
  

      <PartyMode open={isPartyModeOpen} onClose={() => setIsPartyModeOpen(false)} hostTrack={currentTrack} hostLiveLyric={mixtapeLiveLyric} hostLyrics={lyrics} hostLyricOffsetMs={lyricOffsetMs} onLyricOffsetChange={setLyricOffsetMs} hostPositionMs={getActivePlaybackPositionMs?.() || 0} hostIsPlaying={isPlaying} hostIsBuffering={isAudioBuffering} hostQueue={queue} hostPlaylists={playlists} profile={aetherProfile} onProfileChange={setAetherProfile} onHostUpdateQueue={setQueue} onHostControl={handleControl} onHostPlayTrack={track => {
      const normalized = normalizeQueueTrack(track) || track;
      setQueue(prev => {
        const currentQueue = Array.isArray(prev) ? prev : [];
        if (currentQueue.length === 0) {
          setIsManualStop(false);
          setIsPlaying(true);
        }
        return [...currentQueue, normalized];
      });
    }} onPartyStateChange={state => {
      setPartyInfo(state ? {
        partySize: state.members?.length || 1,
        partyMax: 10,
        partyId: state.partyId || 'aether_party'
      } : null);
    }} />
  
    </MotionConfig>;
}
