const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const activeWindow = require('active-win');
const { startBridge } = require('./wsBridge');

ipcMain.handle("get-active-win", async () => {
  const result = await activeWindow();
  return result ? {
    title: result?.title,
    appName: result?.owner?.name,
    processId: result?.owner?.processId
  } : null;
});

let mainWindow = null;
let bridge = null;

// Show the mainwindow to the front
ipcMain.on('show-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();

    // Show without stealing OS focus from whatever window the user is on,
    // so active-win keeps reporting the real foreground app (e.g. Edge/TikTok).
    mainWindow.showInactive();

    // mainWindow.setAlwaysOnTop(true, 'screen-saver') and mainWindow.moveTop(), bypasses the Windows foreground lock and pushes the window in front of Chrome.
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.moveTop();
    // To get the taskbar icon to flash orange to get the user's attention
    mainWindow.flashFrame(true);

    // Turn off always-on-top so the user can still interact with other windows normally
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
      }
    }, 1000);
  }
});

// Renderer calls this once its own threshold logic decides to close a tab
ipcMain.on('tiktok-close-tab', (event, tabId) => {
  if (bridge) bridge.closeTab(tabId);
});

// The window is transparent but still captures clicks across its whole
// rectangle by default, which blocks whatever's underneath it even where
// nothing is visibly drawn. Renderer toggles this off only while a
// notification (or the swarm) is actually showing, and back on once hidden.
ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 620,
    height: 700,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow = win;

  // Click-through by default so the transparent window doesn't block
  // whatever's underneath it until a notification actually needs input.
  win.setIgnoreMouseEvents(true, { forward: true });

  // Load and display the file index.html in the renderer folder
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in a detached window so we can see console output
  win.webContents.openDevTools({ mode: 'detach' });
}

// wait for chromium to boot up then create a new window instance
app.whenReady().then(() => {

  // creates a new window instance
  createWindow();

  // start the WebSocket bridge to the browser extension, once the window exists
  // so tab events have somewhere to be forwarded to
  bridge = startBridge((tabEvent) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tiktok-tab-event', tabEvent);
    }
  });

  // opens the app in macOS if the user clicks on the dock icon
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // quit the whole app if we are not on macOS (darwin is the platform name Node/Electron uses for macOS)
  if (process.platform !== 'darwin') app.quit();
});