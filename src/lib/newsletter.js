import { LIVE_API_URL } from './liveConfig'

async function post(body) {
  const res = await fetch(LIVE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not update the list')
  return data
}

export function subscribeList({ email, phone, company }) {
  return post({ action: 'subscribe', email, phone, company })
}

export function unsubscribeList({ email, phone }) {
  return post({ action: 'unsubscribe', email, phone })
}

export function announceList({ accessToken, kind, title, url }) {
  return post({ action: 'announce', accessToken, kind, title, url })
}

export function notifyLiveList({ accessToken }) {
  return post({ action: 'notify-live', accessToken })
}
