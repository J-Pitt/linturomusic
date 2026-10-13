import { getAccessToken, loadAuthSession } from './auth'
import { LIVE_API_URL } from './liveConfig'

const seen = new Set()

export async function recordSiteEvent({ kind, id, title }) {
  if (loadAuthSession()) return false
  const key = kind === 'visit' ? 'visit' : `${kind}:${id}`
  if (!id && kind !== 'visit') return false
  if (seen.has(key)) return false
  seen.add(key)
  try {
    const res = await fetch(LIVE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'stats-hit',
        kind,
        id: id || '',
        title: title || '',
      }),
    })
    if (!res.ok) {
      seen.delete(key)
      return false
    }
    return true
  } catch {
    seen.delete(key)
    return false
  }
}

/** One visit per browser per UTC day. Signed-in admin sessions are skipped. */
export function recordVisit() {
  if (loadAuthSession()) return
  const day = new Date().toISOString().slice(0, 10)
  let stored = ''
  try {
    stored = localStorage.getItem('linturo-counted-visit') || ''
  } catch {
    return
  }
  if (stored === day) return
  recordSiteEvent({ kind: 'visit', id: day }).then((ok) => {
    if (!ok) return
    try {
      localStorage.setItem('linturo-counted-visit', day)
    } catch {
      /* ignore */
    }
  })
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
