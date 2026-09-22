import { LIVE_API_URL, LIVE_PRESENCE_URL, LIVE_VIDEOS_MANIFEST_URL } from './liveConfig'

function pickRecorderMime() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  if (typeof MediaRecorder === 'undefined') return ''
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

/**
 * @param {MediaStream} stream
 * @param {{ onChunk?: (blob: Blob) => void }} [opts]
 */
export function createLiveRecorder(stream, opts = {}) {
  const mimeType = pickRecorderMime()
  if (!mimeType) {
    throw new Error('Recording is not supported in this browser')
  }

  const chunks = []
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
    audioBitsPerSecond: 192_000,
  })

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data)
      opts.onChunk?.(e.data)
    }
  }

  return {
    mimeType,
    start() {
      chunks.length = 0
      recorder.start(1000)
    },
    async stop() {
      if (recorder.state === 'inactive') {
        return new Blob(chunks, { type: mimeType })
      }
      await new Promise((resolve) => {
        recorder.addEventListener('stop', resolve, { once: true })
        recorder.stop()
      })
      return new Blob(chunks, { type: mimeType })
    },
    get state() {
      return recorder.state
    },
  }
}

async function api(body) {
  const res = await fetch(LIVE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Live API error (${res.status})`)
  return data
}

function withAuth({ accessToken, hostKey, ...rest }) {
  if (accessToken) return { ...rest, accessToken }
  if (hostKey) return { ...rest, hostKey }
  return rest
}

export async function presignLiveUpload({ accessToken, hostKey, id, ext }) {
  return api({ action: 'presign', ...withAuth({ accessToken, hostKey }), id, ext })
}

export async function publishLiveVideo({ accessToken, hostKey, id, key, title, subtitle }) {
  return api({
    action: 'publish',
    ...withAuth({ accessToken, hostKey }),
    id,
    key,
    title,
    subtitle,
  })
}

export async function setLivePresence({ accessToken, hostKey, live, peerId = '' }) {
  return api({
    action: 'presence-set',
    ...withAuth({ accessToken, hostKey }),
    live,
    peerId,
  })
}

export async function fetchLivePresence() {
  try {
    const res = await fetch(`${LIVE_PRESENCE_URL}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return { live: false, peerId: '' }
    const data = await res.json()
    const updatedAt = data?.updatedAt ? Date.parse(data.updatedAt) : 0
    const stale = updatedAt && Date.now() - updatedAt > 90_000
    if (!data?.live || !data?.peerId || stale) return { live: false, peerId: '' }
    return { live: true, peerId: String(data.peerId) }
  } catch {
    return { live: false, peerId: '' }
  }
}

export async function uploadRecordingBlob(blob, { accessToken, hostKey, id, onProgress }) {
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
  const { uploadUrl, key, contentType, publicUrl } = await presignLiveUpload({
    accessToken,
    hostKey,
    id,
    ext,
  })

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType || blob.type || 'video/webm')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(blob)
  })

  return { key, publicUrl, ext }
}

export async function fetchPublishedLiveVideos() {
  try {
    const res = await fetch(`${LIVE_VIDEOS_MANIFEST_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.videos) ? data.videos : []
  } catch {
    return []
  }
}
