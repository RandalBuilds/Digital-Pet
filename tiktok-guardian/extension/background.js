// ---- Config ----
const WS_URL = "ws://localhost:39572";
const RECONNECT_DELAY_MS = 3000;
const KEEP_ALIVE_ALARM = "keepAlive";

// ---- State ----
let socket = null;
let isConnecting = false;

// ---- Connection handling ----
function connect() {
  if (isConnecting || (socket && socket.readyState === WebSocket.OPEN)) return;
  isConnecting = true;

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    isConnecting = false;
    console.log("[TikTok Guardian] connected to desktop app");
    reportAllTikTokTabs();
  };

  socket.onmessage = (event) => {
    try {
      handleMessage(JSON.parse(event.data));
    } catch (err) {
      console.error("[TikTok Guardian] bad message from desktop app", err);
    }
  };

  socket.onerror = () => {
    isConnecting = false;
  };

  socket.onclose = () => {
    isConnecting = false;
    socket = null;
    setTimeout(connect, RECONNECT_DELAY_MS);
  };
}

function handleMessage(msg) {
  if (msg.type === "close_tab" && typeof msg.tabId === "number") {
    chrome.tabs.remove(msg.tabId).catch((err) => {
      console.warn("[TikTok Guardian] could not close tab", msg.tabId, err);
    });
  }
}

function send(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function isTikTok(url) {
  return typeof url === "string" && url.includes("tiktok.com");
}

// ---- Tab tracking ----
async function reportAllTikTokTabs() {
  const tabs = await chrome.tabs.query({ url: "*://*.tiktok.com/*" });
  for (const tab of tabs) {
    send({ type: "tab_status", tabId: tab.id, url: tab.url, active: tab.active, ts: Date.now() });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && isTikTok(tab.url)) {
    send({ type: "tab_status", tabId, url: tab.url, active: tab.active, ts: Date.now() });
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (isTikTok(tab.url)) {
      send({ type: "tab_status", tabId, url: tab.url, active: true, ts: Date.now() });
    }
  } catch {
    // tab may already be gone
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  send({ type: "tab_closed", tabId, ts: Date.now() });
});

// ---- Popup status query ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "get_status") {
    sendResponse({ connected: !!(socket && socket.readyState === WebSocket.OPEN) });
  }
});

// ---- Keep-alive ----
// MV3 service workers get killed after ~30s idle, which drops the socket.
// This alarm wakes the worker periodically so it can reconnect if needed.
chrome.alarms.create(KEEP_ALIVE_ALARM, { periodInMinutes: 0.4 }); // ~24s

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEP_ALIVE_ALARM) connect();
});

chrome.runtime.onStartup.addListener(connect);
chrome.runtime.onInstalled.addListener(connect);

connect();
