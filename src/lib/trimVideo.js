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

function waitForEvent(target, event) {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup()
      resolve()
    }
    const onErr = () => {
      cleanup()
      reject(new Error('Could not load recording for trim'))
    }
    const cleanup = () => {
      target.removeEventListener(event, onOk)
      target.removeEventListener('error', onErr)
    }
    target.addEventListener(event, onOk, { once: true })
    target.addEventListener('error', onErr, { once: true })
  })
}

/**
 * Re-encode a slice of a recording blob in the browser (video + audio).
 * @param {Blob} blob
 * @param {{ startSec: number, endSec: number, onProgress?: (ratio: number) => void }} opts
 */
export async function trimVideoBlob(blob, { startSec, endSec, onProgress }) {
  const mimeType = pickRecorderMime()
  if (!mimeType) throw new Error('Trim is not supported in this browser')

  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.src = url
  video.playsInline = true
  video.preload = 'auto'

  try {
    await waitForEvent(video, 'loadedmetadata')
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    if (!duration) throw new Error('Could not read recording length')

    const start = Math.max(0, Math.min(startSec, duration - 0.25))
    const end = Math.max(start + 0.5, Math.min(endSec, duration))
    const slice = end - start
    if (slice < 0.5) throw new Error('Trim selection is too short')

    video.currentTime = start
    await waitForEvent(video, 'seeked')

    const capture = video.captureStream?.() || video.mozCaptureStream?.()
    if (!capture?.getTracks?.().length) {
      throw new Error('Trim capture is not supported in this browser')
    }

    const chunks = []
    const recorder = new MediaRecorder(capture, {
      mimeType,
      videoBitsPerSecond: 2_500_000,
      audioBitsPerSecond: 192_000,
    })

    const trimmed = await new Promise((resolve, reject) => {
      let stopped = false
      const finish = () => {
        if (stopped) return
        stopped = true
        video.pause()
        video.removeEventListener('timeupdate', onTime)
        resolve(new Blob(chunks, { type: mimeType }))
      }

      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunks.push(e.data)
      }
      recorder.onerror = () => reject(new Error('Trim encoding failed'))
      recorder.onstop = finish

      const onTime = () => {
        const ratio = Math.min(1, Math.max(0, (video.currentTime - start) / slice))
        onProgress?.(ratio)
        if (video.currentTime >= end - 0.05) {
          try {
            recorder.stop()
          } catch {
            finish()
          }
        }
      }

      recorder.start(400)
      video.addEventListener('timeupdate', onTime)
      video.play().catch((err) => {
        reject(err)
      })
    })

    if (!trimmed.size) throw new Error('Trim produced an empty file')
    return trimmed
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

export function formatTrimTime(seconds) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}
