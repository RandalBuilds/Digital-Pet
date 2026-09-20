// Encapsulates the "how long have you been scrolling" escalation ladder:
// a series of screen-time thresholds that each trigger a cat notification,
// topping out at a MAX threshold that also spawns the unhinged cat swarm
// and (after a short delay) asks the caller to close the tab.
import { showNotification, spawnCatSwarm } from './showNotification.js'
import catImages from '../data/catImages.json' with { type: 'json' }

const LADDER = [
    { min: 3000, max: 4000, mood: 'frownAndSweat', screenTime: 'Screen Time 30mins' },
    { min: 8000, max: 9000, mood: 'begging', screenTime: 'Screen Time 50mins' },
    { min: 12000, max: 13000, mood: 'crying', screenTime: 'Screen Time 60mins' }
]

const MAX_THRESHOLD = 17000
const CLOSE_TAB_DELAY_MS = 3000
const LOCKEDOWN_KEY = 'lockedDown'
localStorage.setItem(LOCKEDOWN_KEY, 'false')

export function isLockedDown(){
     return localStorage.getItem(LOCKEDOWN_KEY) === 'true'
}


// Call onMaxReached when the MAX threshold's close-tab delay elapses.
export function createScreenTimeLadder({ onMaxReached } = {}) {
    let tabCloseRequested = false

    function reset() {
        tabCloseRequested = false
    }

    function evaluate(playTime, isDnd) {
        if (!isDnd) {
            const rung = LADDER.find(r => playTime >= r.min && playTime < r.max)
            if (rung) {
                const catImage = catImages[rung.mood]
                showNotification(catImage.id, { caption: catImage.caption, screenTime: rung.screenTime })
                return
            }
        }

        if (!tabCloseRequested && playTime >= MAX_THRESHOLD) {
            const catImage = catImages.unhinged
            showNotification(catImage.id, { caption: catImage.caption, screenTime: 'Screen Time MAXIMUM' })
            spawnCatSwarm(catImage.id, { count: 10 })
            tabCloseRequested = true
            setTimeout(() => onMaxReached?.(), CLOSE_TAB_DELAY_MS)
            localStorage.setItem('lockedDown', "true")
        }
    
        
    }

    return { evaluate, reset}
}


// const LADDER = [
//     // { min: 3000, max: 4000, mood: 'happy', screenTime: 'Screen Time 10mins' },
//     // { min: 8000, max: 9000, mood: 'eyesWideOpen', screenTime: 'Screen Time 20mins' },
//     { min: 3000, max: 4000, mood: 'frownAndSweat', screenTime: 'Screen Time 30mins' },
//     // { min: 17000, max: 18000, mood: 'shocked', screenTime: 'Screen Time 40mins' },
//     { min: 8000, max: 9000, mood: 'begging', screenTime: 'Screen Time 50mins' },
//     { min: 12000, max: 13000, mood: 'crying', screenTime: 'Screen Time 60mins' },
// ]