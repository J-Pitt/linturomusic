/** Shared PeerJS room id — viewers call this peer when you are live. */
export const LIVE_PEER_ID = 'linturo-music-live'

/** Unlock host/broadcast controls. Override with VITE_LIVE_HOST_KEY. */
export const LIVE_HOST_KEY =
  import.meta.env.VITE_LIVE_HOST_KEY || 'linturo'

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
