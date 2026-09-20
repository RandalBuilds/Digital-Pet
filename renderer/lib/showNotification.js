import catImages from '../data/catImages.json' with { type: 'json' }

// Notification UI elements
const notificationEl = document.getElementById('top-notification')
const notificationPhotoEl = document.getElementById('notification-photo')
const notificationCaptionEl = document.getElementById('notification-caption')
const notificationScreenTimeEl = document.getElementById('notification-screentime')
const notificationCloseBtn = document.getElementById('notification-close')
const notificationDontDisturb = document.getElementById('notification-dnd')
const DND_KEY = 'companion-dnd'
let hideTimeout = null

localStorage.setItem(DND_KEY, 'false')

export function isDndEnabled() {
    return localStorage.getItem(DND_KEY) === 'true'
}

// The Electron window is transparent but click-through by default (see
// main.js), so it needs to opt back into capturing clicks only while the
// notification is actually showing, then opt back out once it's hidden.
function hideNotification() {
    notificationEl.classList.remove('show')
    window.api?.setIgnoreMouseEvents?.(true)
}

export function showNotification(mood, { caption, screenTime, durationMs = 10000 } = {}) {
    if (!notificationEl || !notificationPhotoEl || !notificationCaptionEl) return
    if (isDndEnabled()) return

    const catImage = catImages[mood]
    if (!catImage) return

    notificationPhotoEl.src = catImage.src
    notificationPhotoEl.alt = mood
    notificationCaptionEl.textContent = caption ?? catImage.caption

    if (notificationScreenTimeEl) {
        notificationScreenTimeEl.textContent = screenTime ?? ''
        notificationScreenTimeEl.style.display = screenTime ? '' : 'none'
    }

    notificationEl.classList.add('show')
    window.api?.setIgnoreMouseEvents?.(false)

    // Bring Electron window to front
    if (window.api?.showWindow) {
        window.api.showWindow()
    }

    // Auto-hide after durationMs
    if (hideTimeout) clearTimeout(hideTimeout)
    hideTimeout = setTimeout(hideNotification, durationMs)
}

if (notificationCloseBtn) {
    notificationCloseBtn.addEventListener('click', () => {
        hideNotification()
        if (hideTimeout) clearTimeout(hideTimeout)
    })
}

if (notificationDontDisturb) {
    notificationDontDisturb.addEventListener('click', () => {
        localStorage.setItem(DND_KEY, 'true')
        hideNotification()
        if (hideTimeout) clearTimeout(hideTimeout)
    })
}

// Spawns `count` copies of a cat image scattered around the screen at random
// positions/rotations, for moments (like hitting the max screen-time limit)
// that call for more than the single steady notification banner can show.
export function spawnCatSwarm(mood, { count = 5, durationMs = 4000 } = {}) {
    if (isDndEnabled()) return

    const catImage = catImages[mood]
    if (!catImage) return

    if (window.api?.showWindow) {
        window.api.showWindow()
    }

    for (let i = 0; i < count; i++) {
        const img = document.createElement('img')
        img.src = catImage.src
        img.alt = mood
        img.className = 'cat-swarm-photo'

        const top = 5 + Math.random() * 70
        const left = 5 + Math.random() * 80
        const rotate = -35 + Math.random() * 70
        const delay = Math.random() * 300

        img.style.top = `${top}%`
        img.style.left = `${left}%`
        img.style.setProperty('--rotate', `${rotate}deg`)
        img.style.animationDelay = `${delay}ms`

        document.body.appendChild(img)
        setTimeout(() => img.remove(), durationMs + delay)
    }
}
