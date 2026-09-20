// Minimal standalone example of the desktop-side server.
// In your real app, this logic lives inside your Electron main process,
// and the notify/close hooks call your existing notification code.

const { WebSocketServer } = require("ws");

const PORT = 39572;
const NOTIFY_THRESHOLD_MS = 5 * 60 * 1000; // show "please stop" notification
const CLOSE_THRESHOLD_MS = 5000; // force-close the tab

// Bind to loopback only so other devices on the network can't connect.
const wss = new WebSocketServer({ port: PORT, host: "127.0.0.1" });
console.log(`[desktop app] listening on ws://localhost:${PORT}`);

// tabId -> { watchStartedAt, notified, closed }
const tracked = new Map();

wss.on("connection", (ws) => {
  console.log("[desktop app] extension connected");

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "tab_status") {
      if (!tracked.has(msg.tabId)) {
        tracked.set(msg.tabId, { watchStartedAt: Date.now(), notified: false, closed: false });
        console.log(`[desktop app] tracking new TikTok tab ${msg.tabId}`);
      }
      checkThresholds(ws, msg.tabId);
    }

    if (msg.type === "tab_closed") {
      tracked.delete(msg.tabId);
    }
  });

  ws.on("close", () => {
    console.log("[desktop app] extension disconnected");
  });

  // Re-check on an interval in case a tab sits open with no new browser events
  const interval = setInterval(() => {
    for (const tabId of tracked.keys()) checkThresholds(ws, tabId);
  }, 5000);

  ws.on("close", () => clearInterval(interval));
});

function checkThresholds(ws, tabId) {
  const entry = tracked.get(tabId);
  if (!entry || entry.closed) return;

  const elapsed = Date.now() - entry.watchStartedAt;

  if (!entry.notified && elapsed >= NOTIFY_THRESHOLD_MS) {
    entry.notified = true;
    // Hook into your existing Electron notification here, e.g.:
    // new Notification({ title: "Time check", body: "You've been scrolling a while..." }).show();
    console.log(`[desktop app] tab ${tabId}: NOTIFY threshold reached`);
  }

  if (elapsed >= CLOSE_THRESHOLD_MS) {
    entry.closed = true;
    console.log(`[desktop app] tab ${tabId}: CLOSE threshold reached, sending close command`);
    ws.send(JSON.stringify({ type: "close_tab", tabId }));
    tracked.delete(tabId);
  }
}
