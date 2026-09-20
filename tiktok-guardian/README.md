# TikTok Tab Guardian — extension + desktop bridge

Two pieces:

- `extension/` — the Chrome/Edge extension. Watches for TikTok tabs and
  reports them to your desktop app over a local WebSocket. Closes a tab
  when told to.
- `electron-server-example/` — a standalone Node script that plays the
  role of your Electron app's WebSocket server, so you can test the
  whole loop before wiring it into your real app.

## 1. Run the example server

```bash
cd electron-server-example
npm install
npm start
```

You should see:

```
[desktop app] listening on ws://localhost:39572
```

Leave this running.

## 2. Load the extension (unpacked, for development)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked**.
4. Select the `extension/` folder.
5. It should appear as "TikTok Tab Guardian" with no errors. Click its
   icon in the toolbar — the popup should show a green dot and
   "Connected to desktop app" (if the server from step 1 is running).

## 3. Test it

1. Open a new tab, go to `tiktok.com`.
2. Watch your server terminal — you should see:
   ```
   [desktop app] tracking new TikTok tab <id>
   ```
3. The example server's thresholds are shortened for testing convenience
   only in your head, not in code — by default it's 5 min to "notify"
   and 15 min to "close". To test quickly, temporarily edit
   `NOTIFY_THRESHOLD_MS` / `CLOSE_THRESHOLD_MS` in `server.js` down to
   e.g. `10 * 1000` (10 seconds) and restart the server.
4. After the close threshold, your terminal will log the close command,
   and the TikTok tab should actually close in the browser.

## 4. Reload after editing

Any time you change `background.js`, `manifest.json`, or the popup
files, go back to `chrome://extensions` and click the refresh icon on
the extension's card (unpacked extensions don't hot-reload).

## Wiring into your real Electron app

Move the logic from `server.js` into your Electron **main process**
(not a renderer) — `ws` works the same way there. Replace the
`console.log` calls in `checkThresholds()` with:

- your existing notification code, at the notify threshold
- nothing extra needed at the close threshold — the `ws.send(...)`
  call already tells the extension to close the tab

If you're tracking watch time cumulatively (not just "time since this
tab was first seen"), swap `watchStartedAt` for whatever accumulator
your existing timer logic already uses — the extension side doesn't
need to change at all, it's just reporting "this tab is TikTok and is
active/updated."

## Next steps for real distribution

- Test in both Chrome and Edge (same manifest works for both).
- Add real icons (`16x16`, `48x48`, `128x128` PNGs) referenced in
  `manifest.json` before submitting to a store — icons aren't required
  for unpacked/dev testing but stores expect them.
- Package as a zip and submit via the Chrome Web Store Developer
  Dashboard and Microsoft Edge Add-ons dashboard.
- Add a link/button in your Electron app that opens the store listing
  if the popup ever reports "Not connected," so users can (re)install
  it easily.
