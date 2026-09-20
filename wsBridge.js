const { WebSocketServer } = require('ws');

function startBridge(onTabEvent) {
  // Bind to loopback only so the server can't be reached from other devices
  // on the same network (or the internet) — only processes on this machine
  // (i.e. the browser extension) can connect.
  const wss = new WebSocketServer({ port: 39572, host: '127.0.0.1' });
  let activeSocket = null;

  wss.on('connection', (ws) => {
    activeSocket = ws;
    console.log('[wsBridge] extension connected');

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      onTabEvent(msg);
    });

    ws.on('close', () => {
      activeSocket = null;
      console.log('[wsBridge] extension disconnected');
    });
  });

  return {
    closeTab(tabId) {
      if (activeSocket && activeSocket.readyState === activeSocket.OPEN) {
        activeSocket.send(JSON.stringify({ type: 'close_tab', tabId }));
      }
    },
    isConnected() {
      return !!(activeSocket && activeSocket.readyState === activeSocket.OPEN);
    }
  };
}

module.exports = { startBridge };