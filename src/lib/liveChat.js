const MAX_TEXT = 280
const MAX_NAME = 24

/** Strip to allowed chars; empty if nothing left (no Guest fallback). */
export function normalizeDisplayName(name) {
  return String(name || '')
    .replace(/[^\w\s\-_.']/g, '')
    .trim()
    .slice(0, MAX_NAME)
}

export function isValidDisplayName(name) {
  return normalizeDisplayName(name).length >= 2
}

export function sanitizeName(name) {
  return normalizeDisplayName(name) || 'Guest'
}

export function sanitizeChatText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT)
}

export function makeChatMessage({ name, text, role = 'viewer' }) {
  return {
    type: 'chat',
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: sanitizeName(name),
    text: sanitizeChatText(text),
    role,
    ts: Date.now(),
  }
}

function parseViewerEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const peerId = String(entry.peerId || '').slice(0, 80)
  const name = normalizeDisplayName(entry.name)
  if (!peerId || !isValidDisplayName(name)) return null
  return { peerId, name }
}

export function parseLivePayload(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data || typeof data !== 'object') return null

    if (data.type === 'viewers' && typeof data.count === 'number') {
      return { type: 'viewers', count: Math.max(0, Math.floor(data.count)) }
    }

    if (data.type === 'viewer-list' && Array.isArray(data.viewers)) {
      const viewers = data.viewers.map(parseViewerEntry).filter(Boolean).slice(0, 200)
      return { type: 'viewer-list', viewers }
    }

    if (data.type === 'hello') {
      const name = normalizeDisplayName(data.name)
      if (!isValidDisplayName(name)) return null
      return { type: 'hello', name }
    }

    if (data.type === 'ping') {
      return { type: 'ping' }
    }

    if (data.type === 'chat' && data.text) {
      return {
        type: 'chat',
        id: String(data.id || `${Date.now()}-${Math.random()}`),
        name: sanitizeName(data.name),
        text: sanitizeChatText(data.text),
        role: data.role === 'host' ? 'host' : 'viewer',
        ts: Number(data.ts) || Date.now(),
      }
    }

    if (data.type === 'history' && Array.isArray(data.messages)) {
      return {
        type: 'history',
        messages: data.messages
          .map((m) => parseLivePayload(m))
          .filter((m) => m?.type === 'chat'),
      }
    }

    return null
  } catch {
    return null
  }
}

export function defaultGuestName() {
  try {
    const saved = sessionStorage.getItem('linturo-live-chat-name')
    if (saved && isValidDisplayName(saved)) return normalizeDisplayName(saved)
  } catch {
    /* ignore */
  }
  return ''
}

export function saveGuestName(name) {
  const clean = normalizeDisplayName(name)
  try {
    if (isValidDisplayName(clean)) {
      sessionStorage.setItem('linturo-live-chat-name', clean)
    } else {
      sessionStorage.removeItem('linturo-live-chat-name')
    }
  } catch {
    /* ignore */
  }
  return clean
}
