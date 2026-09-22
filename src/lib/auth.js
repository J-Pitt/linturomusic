import { LIVE_API_URL } from './liveConfig'

const STORAGE_KEY = 'linturo-auth-session'

function parseSession(raw) {
  if (!raw?.accessToken || !raw?.expiresAt) return null
  const exp = Date.parse(raw.expiresAt)
  if (!Number.isFinite(exp) || exp <= Date.now()) return null
  return {
    accessToken: String(raw.accessToken),
    expiresAt: raw.expiresAt,
    user: raw.user || null,
  }
}

export function loadAuthSession() {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return null
    return parseSession(JSON.parse(text))
  } catch {
    return null
  }
}

export function saveAuthSession(session) {
  const parsed = parseSession(session)
  if (!parsed) {
    clearAuthSession()
    return null
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    /* ignore */
  }
  return parsed
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function getAccessToken() {
  return loadAuthSession()?.accessToken || ''
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}

export async function loginAdmin({ email, password }) {
  const res = await fetch(LIVE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Login failed (${res.status})`)
  }
  const session = saveAuthSession(data)
  if (!session) throw new Error('Invalid login response')
  return session
}
