const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aether', {
  isStandalone: true,
  search: (query) => ipcRenderer.invoke('aether:search', query),
  getMetadata: (url) => ipcRenderer.invoke('aether:get-metadata', url),
  getRecommendations: (details) => ipcRenderer.invoke('aether:get-recommendations', details),
  getLyrics: (track, artist, duration, query, url) => ipcRenderer.invoke('aether:get-lyrics', { track, artist, duration, query, url }),
  updateRPC: (details) => ipcRenderer.invoke('aether:update-rpc', details),
  getStats: () => ipcRenderer.invoke('aether:stats'),
  store: {
    get: (key) => ipcRenderer.invoke('aether:store-get', key),
    set: (key, val) => ipcRenderer.invoke('aether:store-set', key, val)
  },
  onControl: (callback) => ipcRenderer.on('aether:control', (event, action) => callback(action)),
  resizeWindow: (width, height, alwaysOnTop) => ipcRenderer.invoke('aether:window-resize', { width, height, alwaysOnTop }),
  onMaximized: (callback) => ipcRenderer.on('aether:maximized-state', (event, state) => callback(state)),
  openExternal: (url) => ipcRenderer.invoke('aether:open-external', url),
  download: (url, trackId) => ipcRenderer.invoke('aether:download', { url, trackId }),
  getOfflineTracks: () => ipcRenderer.invoke('aether:get-offline-tracks'),
  getLocalIp: () => ipcRenderer.invoke('aether:get-local-ip'),
  saveToDisk: (url, title, author) => ipcRenderer.invoke('aether:save-to-disk', { url, title, author }),
  exportVault: (name, data) => ipcRenderer.invoke('aether:export-vault', { name, data }),
  importVault: () => ipcRenderer.invoke('aether:import-vault'),
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
