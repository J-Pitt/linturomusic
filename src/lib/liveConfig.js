/** Shared PeerJS room id — viewers call this peer when you are live. */
export const LIVE_PEER_ID = 'linturo-music-live'

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

/** STUN + public TURN so phone (cellular) can reach laptop (Wi‑Fi). */
export const LIVE_PEER_OPTIONS = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    sdpSemantics: 'unified-plan',
  },
}

/** Quiet outbound track so PeerJS calls aren't empty (empty streams drop on mobile). */
export function createHandshakeStream() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return { stream: new MediaStream(), dispose: () => {} }

  const ctx = new AudioCtx()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  gain.gain.value = 0.0001
  const dest = ctx.createMediaStreamDestination()
  oscillator.connect(gain)
  gain.connect(dest)
  oscillator.start()

  return {
    stream: dest.stream,
    dispose: () => {
      try {
        oscillator.stop()
      } catch {
        /* ignore */
      }
      ctx.close().catch(() => {})
    },
  }
}

export const DEFAULT_EFFECTS = {
  intensity: 0.55,
  hueSpeed: 0.45,
  rgbSplit: 0.4,
  trails: 0.35,
  warp: 0.28,
  glitch: 0.12,
  mirror: 0,
  pulse: 0.35,
  swirl: 0.2,
  ripple: 0.15,
  barrel: 0,
  tunnel: 0.1,
  pixelate: 0,
}
