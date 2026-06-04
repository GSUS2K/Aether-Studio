export function AppHeaderLayer(props) {
  const {
  APP_VERSION, BUILD_VERSION, ChevronLeft, HeaderSearchBox, HeaderSleepTimerControls, Home, Layers, Minimize2, Monitor, RefreshCw,
  SlidersHorizontal, Users, X, clearDiscoveryResults, clearSearchHistoryForScope, closeHeaderSurfaces, commandPaletteShortcutLabel, discardSearchHistoryItem,
  experienceCenterInitialPage, getHeaderSearchSuggestions, handleHeaderDoubleClick, handleHeaderSuggestionPick, handleOfflineLibrarySearch, handleSetSleepTimer, hasActiveSearchState, headerAccentButtonClass,
  headerIconButtonClass, headerSearchInputRef, isAuraMode, isDualLayoutLocked, isExperienceCenterOpen, isHomeOpen, isOfflineMode, isPartyModeOpen, isSearching,
  isVerticalStack, offlineLibrarySearchTerm, openDiagnosticsPage, playbackModeLabel, runAfterInputPaint, runSuggestedSearch, searchHistoryByScope, searchQuery,
  setExperienceCenterInitialPage, setIsAuraStageOpen, setIsExperienceCenterOpen, setIsPartyModeOpen, setIsVerticalStack, setOfflineLibrarySearchTerm, setSearchQuery, setSleepCustomMinutes,
  setIsHomeOpen, setSleepFadeEnabled, setStopAfterTrack, showImmersiveLyricsOverlay, showShortcutHints, showWindowsHeaderWindowControls, sleepCustomMinutes, sleepDeadline, sleepFadeEnabled,
  sleepRemainingStr, sleepTimerControlsRef, sleepTimerValue, stopAfterTrack, toggleWindowMaximize, topHeaderClass, updateInfo, videoMode,
  workspaceModeLabel,
  } = props;

  return <>{/* APP HEADER */}{!showImmersiveLyricsOverlay && <header className={topHeaderClass} onDoubleClick={handleHeaderDoubleClick}>
            <div className="flex min-w-0 items-center gap-3 lg:min-w-[210px]">
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[1.35rem] border border-brand-accent/25 bg-white/[0.04] shadow-[0_0_28px_rgba(0,255,191,0.08)]">
                <img src="aether-logo.png" alt="Aether" className="h-6 w-6 object-contain" onError={e => e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGZmYmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWdvbiBwb2ludHM9IjEzIDIgMyAxNCAxMiAxNCAxMSAyMiAyMSAxMCAxMiAxMCAxMyAyIj48L3BvbHlnb24+PC9zdmc+'} />
                <div className="absolute inset-0 bg-brand-accent/6 opacity-70" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.08em] text-white/92">Aether</span>
                  <span className="rounded-full border border-brand-accent/30 bg-brand-accent/10 px-1.5 py-[2px] text-[7px] font-black uppercase tracking-[0.18em] text-brand-accent/80">
                    {BUILD_VERSION}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-1.5 py-[2px] text-[7px] font-black uppercase tracking-[0.16em] text-white/55">
                    v{APP_VERSION}
                  </span>
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-white/38">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-white/52">{workspaceModeLabel}</span>
                  <span className="truncate text-brand-accent/70">{playbackModeLabel}</span>
                </div>
              </div>
            </div>

            <div className="order-3 flex w-full items-center justify-center gap-2 ultra-compact-hide no-drag md:order-2 md:flex-[1_1_980px] md:max-w-[1260px] md:px-3 lg:px-5" data-no-maximize="true">
              <button onClick={() => runAfterInputPaint(() => {
        closeHeaderSurfaces('home');
        setIsHomeOpen(!isHomeOpen);
      })} className={`${headerIconButtonClass} shrink-0 ${isHomeOpen ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : ''}`} title={isHomeOpen ? 'Back to Studio' : 'Home'} aria-label={isHomeOpen ? 'Back to Studio' : 'Home'}>
                {isHomeOpen ? <ChevronLeft size={17} /> : <Home size={15} />}
              </button>
              <button onClick={() => runAfterInputPaint(() => {
        closeHeaderSurfaces();
        setExperienceCenterInitialPage('home');
        setIsExperienceCenterOpen(true);
      })} className={`${headerIconButtonClass} shrink-0 ${isExperienceCenterOpen ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : ''}`} title="Experience Center" aria-label="Experience Center">
          
                <SlidersHorizontal size={15} />
              </button>
              <button onClick={openDiagnosticsPage} className={`${headerIconButtonClass} shrink-0 ${isExperienceCenterOpen && experienceCenterInitialPage === 'diagnostics' ? 'bg-brand-accent/15 border-brand-accent/35 text-brand-accent' : ''}`} title="Diagnostics" aria-label="Diagnostics">
          
                <Monitor size={15} />
              </button>
              <button onClick={() => {
        closeHeaderSurfaces('aura-stage');
        setIsAuraStageOpen(true);
      }} className={`${headerIconButtonClass} shrink-0`} title="Aura Stage" aria-label="Aura Stage">
          
                <Layers size={15} />
              </button>
              <div className="min-w-[280px] flex-1">
                <HeaderSearchBox searchQuery={isOfflineMode ? offlineLibrarySearchTerm : searchQuery} isSearching={isOfflineMode ? false : isSearching} hasActiveSearchState={isOfflineMode ? Boolean(offlineLibrarySearchTerm) : hasActiveSearchState} isAuraMode={isAuraMode} disabled={!isOfflineMode && videoMode === 'dual'} placeholder={isOfflineMode ? 'Search downloaded tracks' : 'Search tracks, artists, or paste a YouTube link'} onSearch={isOfflineMode ? handleOfflineLibrarySearch : runSuggestedSearch} inputRef={headerSearchInputRef} commandPaletteShortcutLabel={commandPaletteShortcutLabel} showShortcutHints={showShortcutHints} searchHistory={searchHistoryByScope[isOfflineMode ? 'offline' : 'online'] || []} historyLabel={isOfflineMode ? 'Downloaded searches' : 'Recent searches'} onHistoryPick={isOfflineMode ? handleOfflineLibrarySearch : runSuggestedSearch} getSuggestions={isOfflineMode ? undefined : getHeaderSearchSuggestions} onSuggestionPick={isOfflineMode ? undefined : handleHeaderSuggestionPick} onHistoryRemove={item => discardSearchHistoryItem(isOfflineMode ? 'offline' : 'online', item)} onHistoryClear={() => clearSearchHistoryForScope(isOfflineMode ? 'offline' : 'online')} onClear={() => {
          if (isOfflineMode) {
            setOfflineLibrarySearchTerm('');
          } else {
            setSearchQuery('');
            clearDiscoveryResults();
          }
        }} />
          
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 min-w-fit order-3 no-drag" data-no-maximize="true">
              <HeaderSleepTimerControls ref={sleepTimerControlsRef} headerIconButtonClass={headerIconButtonClass} sleepTimerValue={sleepTimerValue} stopAfterTrack={stopAfterTrack} sleepRemainingStr={sleepRemainingStr} sleepDeadline={sleepDeadline} handleSetSleepTimer={handleSetSleepTimer} sleepCustomMinutes={sleepCustomMinutes} setSleepCustomMinutes={setSleepCustomMinutes} setStopAfterTrack={setStopAfterTrack} sleepFadeEnabled={sleepFadeEnabled} setSleepFadeEnabled={setSleepFadeEnabled} onSurfaceOpen={() => closeHeaderSurfaces('sleep')} />
        
              <div className={`hidden md:flex items-center gap-1 rounded-[1.15rem] border p-1 no-drag ${isDualLayoutLocked ? 'border-white/8 bg-white/[0.03]' : 'border-white/12 bg-white/[0.04]'}`} title={isDualLayoutLocked ? 'Layout switching is unavailable while Dual View is active' : 'Workspace layout'}>
                <button onClick={() => setIsVerticalStack(false)} disabled={isDualLayoutLocked} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${!isVerticalStack ? 'bg-brand-accent text-black shadow-[0_0_16px_rgba(0,255,191,0.28)]' : isDualLayoutLocked ? 'text-white/20 cursor-not-allowed' : 'text-white/45 hover:text-brand-accent'}`}>
            
                  Studio
                </button>
                <button onClick={() => setIsVerticalStack(true)} disabled={isDualLayoutLocked} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${isVerticalStack ? 'bg-brand-accent text-black shadow-[0_0_16px_rgba(0,255,191,0.28)]' : isDualLayoutLocked ? 'text-white/20 cursor-not-allowed' : 'text-white/45 hover:text-brand-accent'}`}>
            
                  Stack
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pr-2 no-drag" data-no-maximize="true">
                {updateInfo?.downloaded && <button onClick={() => window.aether?.restartApp?.()} className="flex items-center gap-2 rounded-xl border border-brand-accent/30 bg-brand-accent/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-brand-accent hover:bg-brand-accent/25 transition-all">
            
                    <RefreshCw size={12} /> Update Ready
                  </button>}

                <button className={`${headerAccentButtonClass} no-drag ${isPartyModeOpen ? 'bg-brand-accent/18 border-brand-accent/60 shadow-[0_0_18px_rgba(0,255,191,0.22)]' : ''}`} onClick={() => setIsPartyModeOpen(true)} title={isPartyModeOpen ? 'Party is open' : 'Start Party'} aria-label={isPartyModeOpen ? 'Party is open' : 'Start Party'} disabled={isOfflineMode} style={{
          opacity: isOfflineMode ? 0.3 : 1
        }}>
            
                  <Users size={16} />
                </button>

              {showWindowsHeaderWindowControls && <div className="ml-1 flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 no-drag">
                  <button onClick={() => window.aether?.minimize?.()} className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 transition-all hover:bg-white/10 hover:text-white" title="Minimize">
              
                    <span className="translate-y-[-1px] text-sm leading-none">-</span>
                  </button>
                  <button onClick={toggleWindowMaximize} className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 transition-all hover:bg-white/10 hover:text-white" title="Restore">
              
                    <Minimize2 size={12} />
                  </button>
                  <button onClick={() => window.aether?.closeWindow?.()} className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 transition-all hover:bg-red-500/20 hover:text-red-300" title="Close">
              
                    <X size={12} />
                  </button>
                </div>}
            </div>
            </div>
          </header>}</>;
}
