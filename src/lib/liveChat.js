const MAX_TEXT = 280
const MAX_NAME = 24

export function sanitizeName(name) {
  return String(name || 'Guest')
    .replace(/[^\w\s\-_.']/g, '')
    .trim()
    .slice(0, MAX_NAME) || 'Guest'
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

export function parseLivePayload(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data || typeof data !== 'object') return null
    if (data.type === 'viewers' && typeof data.count === 'number') {
      return { type: 'viewers', count: Math.max(0, Math.floor(data.count)) }
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
    if (saved) return sanitizeName(saved)
  } catch {
    /* ignore */
  }
  return `Guest ${Math.floor(1000 + Math.random() * 9000)}`
}

export function saveGuestName(name) {
  const clean = sanitizeName(name)
  try {
    sessionStorage.setItem('linturo-live-chat-name', clean)
  } catch {
    /* ignore */
  }
  return clean
}
