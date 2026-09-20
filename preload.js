const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getActiveWin: () => ipcRenderer.invoke('get-active-win'),
    showWindow: () => ipcRenderer.send('show-window'),
    setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore)
});




contextBridge.exposeInMainWorld('tiktokGuardian', {
  onTabEvent: (callback) => {
    ipcRenderer.on('tiktok-tab-event', (_event, data) => callback(data));
  },
  requestCloseTab: (tabId) => ipcRenderer.send('tiktok-close-tab', tabId)
});

// Renderer → Main (renderer initiates, main reacts)

// Sending side: ipcRenderer.send(channel, ...) or ipcRenderer.invoke(channel, ...) (invoke expects a return value, send is fire-and-forget)
// Receiving side: ipcMain.on(channel, ...) or ipcMain.handle(channel, ...)

// Main → Renderer (main initiates, renderer reacts)

// Sending side: someWindow.webContents.send(channel, ...) — this is the only way main can push to a specific renderer window
// Receiving side: ipcRenderer.on(channel, ...)