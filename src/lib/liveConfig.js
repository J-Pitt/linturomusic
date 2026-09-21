/** Unlock host/broadcast controls. Override with VITE_LIVE_HOST_KEY. */
export const LIVE_HOST_KEY =
  import.meta.env.VITE_LIVE_HOST_KEY || 'linturo'

/** Live record/publish API (Lambda Function URL). */
export const LIVE_API_URL =
  import.meta.env.VITE_LIVE_API_URL ||
  'https://kyjdji4gaqvitwcydedoatsnle0rauwy.lambda-url.us-west-2.on.aws/'

/** Public manifest of host-approved live recordings. */
export const LIVE_VIDEOS_MANIFEST_URL =
  import.meta.env.VITE_LIVE_VIDEOS_MANIFEST_URL ||
  'https://linturomusic.s3.us-west-2.amazonaws.com/live-videos.json'

/** Public live presence (peer id while host is broadcasting). */
export const LIVE_PRESENCE_URL =
  import.meta.env.VITE_LIVE_PRESENCE_URL ||
  'https://linturomusic.s3.us-west-2.amazonaws.com/live-presence.json'

/** STUN + public TURN so phone (cellular) can reach laptop (Wi‑Fi). */
export const LIVE_PEER_OPTIONS = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:80?transport=tcp',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceTransportPolicy: 'all',
    sdpSemantics: 'unified-plan',
  },
}

/** Tiny canvas video track — works on iOS (no AudioContext needed). */
export function createHandshakeStream() {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  let raf = 0
  let alive = true

  const paint = () => {
    if (!alive || !ctx) return
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 16, 16)
    raf = requestAnimationFrame(paint)
  }
  paint()

  const stream = canvas.captureStream(5)
  stream.getVideoTracks().forEach((t) => {
    t.enabled = true
    try {
      t.contentHint = 'motion'
    } catch {
      /* ignore */
    }
  })

  return {
    stream,
    dispose: () => {
      alive = false
      cancelAnimationFrame(raf)
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}

export function makeHostPeerId() {
  return `linturo-${Math.random().toString(36).slice(2, 10)}`
}

export const DEFAULT_EFFECTS = {
  intensity: 0.28,
  hueSpeed: 0.18,
  rgbSplit: 0.12,
  trails: 0.1,
  warp: 0.08,
  glitch: 0.05,
  mirror: 0,
  pulse: 0.12,
  swirl: 0.08,
  ripple: 0.06,
  barrel: 0,
  tunnel: 0.04,
  pixelate: 0,
}
