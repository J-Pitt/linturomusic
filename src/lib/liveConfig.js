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

export const DEFAULT_EFFECTS = {
  intensity: 0.55,
  hueSpeed: 0.45,
  rgbSplit: 0.4,
  trails: 0.35,
  warp: 0.28,
  glitch: 0.12,
  mirror: 0,
  pulse: 0.35,
}
