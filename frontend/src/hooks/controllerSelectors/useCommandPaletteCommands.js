/* eslint-disable react-hooks/preserve-manual-memoization */
import { useMemo } from 'react';
import { Activity, AlertTriangle, AppWindow, Hand, HardDrive, Keyboard, Layers, Lock, MessageSquare, Monitor, Music, RefreshCw, Save, Search, Send, Signal, SlidersHorizontal, Sparkles, Upload, User } from 'lucide-react';

export function useCommandPaletteCommands(props) {
  const {
    cleanQueueBuffer, closeHeaderSurfaces, focusMusicSearch, handleAdd, isOfflineMode, isStandalone, librarySongEntries, lockStatus, openExperienceCenterPage, openFeedbackPanel, openLibraryOverlay, openMusicImport, playDownloadedOnly, queue, setIsAppLocked, setIsAuraStageOpen, shortcutLabel, toggleMiniPlayer
  } = props;
  return useMemo(() => [{
  id: 'search-music',
  title: 'Search music',
  detail: 'Focus the main music search box.',
  icon: Search,
  keywords: 'find track artist youtube',
  run: focusMusicSearch
}, {
  id: 'import-playlist',
  title: 'Import playlist',
  detail: 'Match a Spotify or Apple Music playlist into Aether.',
  icon: Upload,
  keywords: 'spotify apple music import',
  hidden: isOfflineMode,
  run: openMusicImport
}, {
  id: 'studio-library',
  title: 'Open Studio Library',
  detail: 'Browse vaults, playlists, and saved tracks.',
  icon: HardDrive,
  keywords: 'vault library playlist songs',
  run: () => openLibraryOverlay()
}, ...librarySongEntries.slice(0, 12).map((entry, index) => ({
  id: `song-${entry.key || index}`,
  title: entry.track?.title || 'Library Track',
  detail: `${entry.track?.author || 'Unknown Artist'} • Queue from library`,
  icon: Music,
  keywords: `song track artist library ${entry.track?.author || ''} ${(entry.playlists || []).join(' ')}`,
  run: () => handleAdd(entry.track)
})), {
  id: 'experience-center',
  title: 'Open Experience Center',
  detail: 'Modes, visuals, privacy, and tools.',
  icon: SlidersHorizontal,
  keywords: 'controls settings tools',
  run: () => openExperienceCenterPage('home')
}, {
  id: 'signal-ledger',
  title: 'Open Signal Ledger',
  detail: 'Open Signal Ledger inside Experience Center.',
  icon: Signal,
  keywords: 'history stats ledger',
  run: () => openExperienceCenterPage('signal-ledger')
}, {
  id: 'listening-recap',
  title: 'Open Listening Recap',
  detail: 'Weekly and monthly listening highlights.',
  icon: Activity,
  keywords: 'recap stats weekly monthly listening replay',
  run: () => openExperienceCenterPage('recap')
}, {
  id: 'profile',
  title: 'Open Profile',
  detail: 'Avatar, share card, public profile, and Party identity.',
  icon: User,
  keywords: 'avatar profile public share party identity',
  run: () => openExperienceCenterPage('profile')
}, {
  id: 'recovery-center',
  title: 'Open Recovery Center',
  detail: 'Repair downloads, runtime helpers, and app issues.',
  icon: AlertTriangle,
  keywords: 'repair recovery yt-dlp ffmpeg error fix diagnostics',
  run: () => openExperienceCenterPage('recovery')
}, {
  id: 'diagnostics-page',
  title: 'Open Diagnostics',
  detail: 'Runtime status and recent app health events.',
  icon: Monitor,
  keywords: 'diagnostics debug health status runtime',
  shortcut: shortcutLabel('diagnostics'),
  run: () => openExperienceCenterPage('diagnostics')
}, {
  id: 'first-run-setup',
  title: 'Open Setup Checklist',
  detail: 'Relaunch first-run setup anytime.',
  icon: Sparkles,
  keywords: 'setup onboarding first run import profile shortcuts',
  run: () => openExperienceCenterPage('setup')
}, {
  id: 'feedback',
  title: 'Open Feedback',
  detail: 'Send feedback inside Experience Center.',
  icon: MessageSquare,
  keywords: 'issue bug idea support',
  run: () => openExperienceCenterPage('feedback')
}, {
  id: 'gesture-lab',
  title: 'Open Gesture + Face Lab',
  detail: 'Camera, pointer, swipe, and face controls.',
  icon: Hand,
  keywords: 'camera gesture face hand pointer',
  run: () => openExperienceCenterPage('gesture-face-lab')
}, {
  id: 'app-lock',
  title: 'Open App Lock',
  detail: 'Password, Touch ID, idle lock, and recovery.',
  icon: Lock,
  keywords: 'security password touch id',
  hidden: !isStandalone,
  run: () => openExperienceCenterPage('app-lock')
}, {
  id: 'shortcut-settings',
  title: 'Open Shortcut Settings',
  detail: 'Customize playback and command shortcuts.',
  icon: Keyboard,
  keywords: 'keybindings hotkeys keyboard',
  run: () => openExperienceCenterPage('shortcut-settings')
}, {
  id: 'toggle-mini-player',
  title: 'Toggle Mini Player',
  detail: 'Switch between dock view and studio view.',
  icon: AppWindow,
  keywords: 'mini dock compact',
  shortcut: isStandalone ? shortcutLabel('miniPlayer') : '',
  hidden: !isStandalone,
  run: toggleMiniPlayer
}, {
  id: 'aura-stage',
  title: 'Open Aura Stage',
  detail: 'Open the full visual stage.',
  icon: Layers,
  keywords: 'visualizer stage visuals',
  run: () => {
    closeHeaderSurfaces('aura-stage');
    setIsAuraStageOpen(true);
  }
}, {
  id: 'clean-queue',
  title: 'Clean Queue',
  detail: 'Remove duplicate upcoming tracks from the queue.',
  icon: RefreshCw,
  keywords: 'queue duplicate clean remove',
  hidden: queue.length <= 1,
  run: cleanQueueBuffer
}, {
  id: 'save-queue-vault',
  title: 'Save Queue as Vault',
  detail: 'Open Studio Library with the current queue ready to save.',
  icon: Save,
  keywords: 'queue save vault playlist',
  hidden: queue.length === 0,
  run: () => openLibraryOverlay({
    type: 'queue',
    items: queue.slice()
  })
}, {
  id: 'downloaded-only-queue',
  title: 'Play Downloaded Only',
  detail: 'Remove queue items that are not ready offline.',
  icon: HardDrive,
  keywords: 'queue offline downloaded only',
  hidden: queue.length === 0,
  run: playDownloadedOnly
}, {
  id: 'lock-app',
  title: 'Lock App',
  detail: 'Lock Aether now.',
  icon: Lock,
  keywords: 'security lock now',
  hidden: !(isStandalone && lockStatus?.enabled),
  run: () => setIsAppLocked(true)
}, {
  id: 'send-feedback',
  title: 'Send Feedback',
  detail: 'Report a problem, improvement, or idea.',
  icon: Send,
  keywords: 'issue bug support',
  run: openFeedbackPanel
}], [cleanQueueBuffer, closeHeaderSurfaces, focusMusicSearch, handleAdd, isOfflineMode, isStandalone, librarySongEntries, lockStatus?.enabled, openExperienceCenterPage, openFeedbackPanel, openLibraryOverlay, openMusicImport, playDownloadedOnly, queue, shortcutLabel, toggleMiniPlayer]);
}
