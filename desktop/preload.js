const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aether', {
  isStandalone: true,
  search: (query) => ipcRenderer.invoke('aether:search', query),
  getMetadata: (url) => ipcRenderer.invoke('aether:get-metadata', url),
  getRecommendations: (details) => ipcRenderer.invoke('aether:get-recommendations', details),
  getLyrics: (track, artist, duration, query, url) => ipcRenderer.invoke('aether:get-lyrics', { track, artist, duration, query, url }),
  updateRPC: (details) => ipcRenderer.invoke('aether:update-rpc', details),
  getStats: () => ipcRenderer.invoke('aether:stats'),
  getEngineStatus: () => ipcRenderer.invoke('aether:get-engine-status'),
  getUpdateStatus: () => ipcRenderer.invoke('aether:update-get-status'),
  checkForUpdates: () => ipcRenderer.invoke('aether:update-check'),
  downloadUpdate: () => ipcRenderer.invoke('aether:update-download'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('aether:update-quit-and-install'),
  onUpdateStatus: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on('aether:update-status', handler);
    return () => ipcRenderer.removeListener('aether:update-status', handler);
  },

  // Listen for user-facing error notifications from backend
  onUserError: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on('aether:user-error', handler);
    return () => ipcRenderer.removeListener('aether:user-error', handler);
  },
  getLockStatus: () => ipcRenderer.invoke('aether:lock-status'),
  setAppLock: (password, useTouchId) => ipcRenderer.invoke('aether:lock-set-password', { password, useTouchId }),
  verifyAppLockPassword: (password) => ipcRenderer.invoke('aether:lock-verify-password', { password }),
  disableAppLock: (password) => ipcRenderer.invoke('aether:lock-disable', { password }),
  verifyAppLockBiometric: () => ipcRenderer.invoke('aether:lock-verify-biometric'),
  setAppLockTouchId: (enabled) => ipcRenderer.invoke('aether:lock-set-touchid', { enabled }),
  store: {
    get: (key) => ipcRenderer.invoke('aether:store-get', key),
    set: (key, val) => ipcRenderer.invoke('aether:store-set', key, val)
  },
  onControl: (callback) => ipcRenderer.on('aether:control', (event, action) => callback(action)),
  resizeWindow: (width, height, alwaysOnTop) => ipcRenderer.invoke('aether:window-resize', { width, height, alwaysOnTop }),
  toggleMaximize: () => ipcRenderer.invoke('aether:window-toggle-maximize'),
  minimize: () => ipcRenderer.invoke('aether:window-minimize'),
  closeWindow: () => ipcRenderer.invoke('aether:window-close'),
  toggleWindowMaximize: () => ipcRenderer.invoke('aether:window-toggle-maximize'),
  onMaximized: (callback) => ipcRenderer.on('aether:maximized-state', (event, state) => callback(state)),
  openExternal: (url) => ipcRenderer.invoke('aether:open-external', url),
  download: (url, trackId) => ipcRenderer.invoke('aether:download', { url, trackId }),
  getOfflineTracks: () => ipcRenderer.invoke('aether:get-offline-tracks'),
  getOfflineDownloads: () => ipcRenderer.invoke('aether:get-offline-downloads'),
  removeOfflineTrack: (trackId) => ipcRenderer.invoke('aether:remove-offline-track', { trackId }),
  clearOfflineDownloads: () => ipcRenderer.invoke('aether:clear-offline-downloads'),
  getLocalIp: () => ipcRenderer.invoke('aether:get-local-ip'),
  saveToDisk: (url, title, author) => ipcRenderer.invoke('aether:save-to-disk', { url, title, author }),
  exportAudioToFile: (url, title, author) => ipcRenderer.invoke('aether:export-audio-file', { url, title, author }),
  getStorageStats: () => ipcRenderer.invoke('aether:get-storage-stats'),
  updateStoragePolicy: (payload) => ipcRenderer.invoke('aether:update-storage-policy', payload),
  getStorageEstimate: (payload) => ipcRenderer.invoke('aether:get-storage-estimate', payload),
  optimizeStorage: (payload) => ipcRenderer.invoke('aether:optimize-storage', payload),
  exportVault: (name, data) => ipcRenderer.invoke('aether:export-vault', { name, data }),
  importVault: () => ipcRenderer.invoke('aether:import-vault'),
  importCookies: () => ipcRenderer.invoke('aether:import-cookies'),
  importSpotifyPlaylist: (url) => ipcRenderer.invoke('aether:import-spotify-playlist', { url }),
  onSpotifyImportProgress: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on('aether:spotify-import-progress', handler);
    return () => ipcRenderer.removeListener('aether:spotify-import-progress', handler);
  },
  offSpotifyImportProgress: (callback) => ipcRenderer.removeListener('aether:spotify-import-progress', callback),
  onYouTubeAuthRequired: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on('aether:oauth-required', handler);
    return () => ipcRenderer.removeListener('aether:oauth-required', handler);
  },
  streamPort: 3333,
  platform: process.platform,
  getStreamPort: () => ipcRenderer.invoke('aether:get-port'),
  onLibraryUpdate: (callback) => ipcRenderer.on('aether:library-update', (event, data) => callback(data)),
  send: (channel, data) => {
    let validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
