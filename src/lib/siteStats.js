import { getAccessToken, loadAuthSession } from './auth'
import { LIVE_API_URL } from './liveConfig'

const seen = new Set()
const MAX_DAY_SEC = 2 * 60 * 60

async function postStat(payload, onceKey) {
  if (loadAuthSession()) return false
  if (onceKey) {
    if (seen.has(onceKey)) return false
    seen.add(onceKey)
  }
  try {
    const res = await fetch(LIVE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stats-hit', ...payload }),
    })
    if (!res.ok) {
      if (onceKey) seen.delete(onceKey)
      return false
    }
    return true
  } catch {
    if (onceKey) seen.delete(onceKey)
    return false
  }
}

export async function recordSiteEvent({ kind, id, title, newBrowser }) {
  if (!id && kind !== 'visit') return false
  const onceKey = kind === 'visit' ? 'visit' : `${kind}:${id}`
  return postStat(
    {
      kind,
      id: id || '',
      title: title || '',
      newBrowser: Boolean(newBrowser),
    },
    onceKey
  )
}

/** One visit per browser per UTC day. The first day for a browser also counts as unique. */
export function recordVisit() {
  if (loadAuthSession()) return
  const day = new Date().toISOString().slice(0, 10)
  let stored = ''
  let seenBefore = false
  try {
    stored = localStorage.getItem('linturo-counted-visit') || ''
    seenBefore = localStorage.getItem('linturo-browser-seen') === '1'
  } catch {
    return
  }
  if (stored === day) return
  recordSiteEvent({ kind: 'visit', id: day, newBrowser: !seenBefore }).then((ok) => {
    if (!ok) return
    try {
      localStorage.setItem('linturo-counted-visit', day)
      localStorage.setItem('linturo-browser-seen', '1')
    } catch {
      /* ignore */
    }
  })
}

function timeSentToday() {
  const day = new Date().toISOString().slice(0, 10)
  try {
    const [storedDay, sec] = (localStorage.getItem('linturo-time-sent') || '').split(':')
    if (storedDay === day) return Number(sec) || 0
  } catch {
    /* ignore */
  }
  return 0
}

function rememberTimeSent(seconds) {
  const day = new Date().toISOString().slice(0, 10)
  try {
    localStorage.setItem('linturo-time-sent', `${day}:${seconds}`)
  } catch {
    /* ignore */
  }
}

/** Active time while the tab is visible, capped at two hours per browser per day. */
export function watchTimeOnSite() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}
  if (loadAuthSession()) return () => {}

  let visibleAt = document.visibilityState === 'visible' ? Date.now() : 0
  let pending = 0
  let sentToday = timeSentToday()
  let flushing = false

  const accumulate = () => {
    if (!visibleAt) return
    pending += Date.now() - visibleAt
    visibleAt = Date.now()
  }

  const flush = (force) => {
    accumulate()
    const room = MAX_DAY_SEC - sentToday
    if (room <= 0) {
      pending = 0
      return
    }
    let seconds = Math.min(room, Math.floor(pending / 1000))
    if (!force && seconds < 15) return
    if (seconds <= 0 || flushing) return
    pending -= seconds * 1000
    flushing = true
    postStat({ kind: 'time', seconds }).then((ok) => {
      flushing = false
      if (!ok) {
        pending += seconds * 1000
        return
      }
      sentToday += seconds
      rememberTimeSent(sentToday)
    })
  }

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      visibleAt = visibleAt || Date.now()
      flush(true)
      visibleAt = 0
      return
    }
    if (!visibleAt) visibleAt = Date.now()
  }

  const timer = window.setInterval(() => flush(false), 30000)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', () => flush(true))

  return () => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

export async function loadSiteStats() {
  const accessToken = getAccessToken()
  const res = await fetch(LIVE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'stats', accessToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not load stats')
  return data
}
