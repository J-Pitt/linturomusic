import { LIVE_API_URL, LIVE_VIDEOS_MANIFEST_URL } from './liveConfig'

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

export async function presignLiveUpload({ hostKey, id, ext }) {
  return api({ action: 'presign', hostKey, id, ext })
}

export async function publishLiveVideo({ hostKey, id, key, title, subtitle }) {
  return api({ action: 'publish', hostKey, id, key, title, subtitle })
}

export async function uploadRecordingBlob(blob, { hostKey, id, onProgress }) {
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
  const { uploadUrl, key, contentType, publicUrl } = await presignLiveUpload({
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
