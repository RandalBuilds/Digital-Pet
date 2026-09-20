// Renderer process entry point.
import { isDndEnabled } from "./lib/showNotification.js"
import { createScreenTimeLadder, isLockedDown } from "./lib/screenTimeLadder.js"
 import { showNotification } from "./lib/showNotification.js"

import catImages from './data/catImages.json' with { type: 'json' }
 
const TARGET_WIN = 'tiktok'
let startTime = null
let currentWinId = null

const DND_KEY = 'companion-dnd'

let lockDownImage = 'showingAss'

// Tracks the most recent active TikTok tab reported by the browser extension
// (via wsBridge.js -> main.js -> preload.js), so we have a real tabId to
// pass to requestCloseTab when the screen-time ladder hits its MAX threshold.
let currentTabId = null

// Subscribes to tab events coming from the browser extension and keeps a single variable, currentTabId, in sync with "whichever TikTok tab is currently active"
window.tiktokGuardian?.onTabEvent((data) => {
    if (data.type === 'tab_status' && data.active) {
        currentTabId = data.tabId
    } else if (data.type === 'tab_closed' && data.tabId === currentTabId) {
        currentTabId = null
    }
})

const screenTimeLadder = createScreenTimeLadder({
    onMaxReached: () => {
        if (currentTabId != null) {
            window.tiktokGuardian?.requestCloseTab(currentTabId)
        }
    }
})


setInterval(async () => {
    const DND_Key = localStorage.getItem(DND_KEY)
    const result = await window.api.getActiveWin()
    console.log('active window result:', result)
    console.log('DNDkey', DND_Key)
    console.log('lockedDownKey', isLockedDown())
    if (!result) return null

    const { title, appName, processId } = result

    const windowIdentifier = `${title}-${processId}`
    const isTargetWindow = windowIdentifier.toLocaleLowerCase().includes(TARGET_WIN)
    if (isTargetWindow) {

        let playTime = Date.now() - startTime

        if (currentWinId !== windowIdentifier) {
            //Start tracking
            currentWinId = windowIdentifier
            console.log('Window Id',currentWinId)
            startTime = Date.now()
            screenTimeLadder.reset()

            // If the unhinged cat already closed a TikTok tab this session,
            // shut down any freshly (re)opened tab immediately instead of
            // letting the ladder run again.
            if (isLockedDown()) {
                if (lockDownImage === "showingAss"){
                        showNotification(catImages.showingAss.id, { caption: catImages.showingAss.caption, screenTime: 'You Are Banned From TikTok For 1Hour' })
                        lockDownImage = "stickingOutTongue"
                }
                else if (lockDownImage === "stickingOutTongue"){
                        showNotification(catImages.stickingOutTongue.id, { caption: catImages.stickingOutTongue.caption, screenTime: 'You Are Banned From TikTok For 1Hour' })
                        lockDownImage = "showingAss"
                }
                
                setTimeout(() => window.tiktokGuardian?.requestCloseTab(currentTabId), 500)
                console.log(currentTabId)
            }

        }
        else {
            screenTimeLadder.evaluate(playTime, isDndEnabled(DND_Key))

        }

    }
    else {
        startTime = null
        currentWinId = null

    }


}, 1000)
