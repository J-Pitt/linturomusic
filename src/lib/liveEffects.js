/**
 * Psychedelic canvas compositor for the live broadcast.
 * Draws camera frames with host-tunable overlays, then the canvas is captured as the outbound video track.
 */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

/** Reused scratch canvas so FX don't allocate every frame. */
let scratch = null
let scratchCtx = null

function ensureScratch(w, h) {
  if (!scratch) {
    scratch = document.createElement('canvas')
    scratchCtx = scratch.getContext('2d', { alpha: false })
  }
  if (scratch.width !== w || scratch.height !== h) {
    scratch.width = w
    scratch.height = h
  }
  return scratchCtx
}

/**
 * Slider 0–1 → effect amount. A power curve keeps the bottom of the dial
 * gentle, and `cap` stops the top from slamming to full strength.
 */
export function shapeAmount(v, exp = 1.65, cap = 1) {
  const x = clamp(Number(v) || 0, 0, 1)
  return Math.pow(x, exp) * cap
}

const BLANK_EFFECTS = {
  intensity: 0,
  hueSpeed: 0,
  rgbSplit: 0,
  trails: 0,
  warp: 0,
  glitch: 0,
  mirror: 0,
  pulse: 0,
  swirl: 0,
  ripple: 0,
  barrel: 0,
  tunnel: 0,
  pixelate: 0,
  motion: 'none',
  motionAmount: 0,
  glow: 0,
  vhs: 0,
  kaleido: 0,
  hue: 0,
  flash: 0,
}

/** Same looks as the visuals FX presets, mapped onto the live compositor. */
export const VIDEO_PRESETS = [
  { id: 'off', label: 'Clean', effects: { ...BLANK_EFFECTS } },
  {
    id: 'pulse',
    label: 'Pulse',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.85,
      warp: 0.08,
      rgbSplit: 0.35,
      trails: 0.2,
      pulse: 0.4,
      motion: 'heartbeat',
      motionAmount: 0.75,
      glow: 0.35,
      flash: 0.4,
    },
  },
  {
    id: 'figure8',
    label: 'Figure 8',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.85,
      rgbSplit: 0.2,
      trails: 0.55,
      hueSpeed: 0.1,
      motion: 'figure8',
      motionAmount: 0.7,
      glow: 0.25,
    },
  },
  {
    id: 'vhs',
    label: 'VHS',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.85,
      rgbSplit: 0.4,
      trails: 0.1,
      glitch: 0.2,
      motion: 'rock',
      motionAmount: 0.25,
      vhs: 0.8,
    },
  },
  {
    id: 'dream',
    label: 'Dream',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.8,
      warp: 0.2,
      rgbSplit: 0.12,
      trails: 0.5,
      hue: 320,
      hueSpeed: 0.08,
      motion: 'float',
      motionAmount: 0.7,
      glow: 0.6,
    },
  },
  {
    id: 'glitch',
    label: 'Glitch',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.92,
      warp: 0.35,
      rgbSplit: 0.78,
      trails: 0.22,
      glitch: 0.95,
      hue: 300,
      hueSpeed: 0.55,
      motion: 'shockwave',
      motionAmount: 0.5,
      flash: 0.2,
    },
  },
  {
    id: 'acid',
    label: 'Acid',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.72,
      kaleido: 0.55,
      warp: 0.4,
      rgbSplit: 0.35,
      trails: 0.42,
      tunnel: 0.12,
      swirl: 0.25,
      hue: 280,
      hueSpeed: 0.35,
      motion: 'swirl',
      motionAmount: 0.4,
    },
  },
  {
    id: 'kaleido',
    label: 'Kaleido',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.88,
      kaleido: 0.95,
      mirror: 0.35,
      warp: 0.22,
      rgbSplit: 0.25,
      trails: 0.28,
      tunnel: 0.05,
      hue: 310,
      hueSpeed: 0.25,
    },
  },
  {
    id: 'tunnel',
    label: 'Tunnel',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.9,
      kaleido: 0.2,
      warp: 0.35,
      rgbSplit: 0.45,
      trails: 0.5,
      tunnel: 0.85,
      hue: 190,
      hueSpeed: 0.5,
      motion: 'tiltzoom',
      motionAmount: 0.5,
    },
  },
  {
    id: 'trails',
    label: 'Trails',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.7,
      kaleido: 0.15,
      warp: 0.3,
      rgbSplit: 0.2,
      trails: 0.82,
      tunnel: 0.08,
      hue: 265,
      hueSpeed: 0.2,
      motion: 'bounce',
      motionAmount: 0.5,
    },
  },
  {
    id: 'mild',
    label: 'Glow',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.28,
      warp: 0.08,
      rgbSplit: 0.08,
      trails: 0.12,
      hue: 200,
      hueSpeed: 0.06,
      glow: 0.5,
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    effects: {
      ...BLANK_EFFECTS,
      intensity: 0.78,
      kaleido: 0.28,
      warp: 0.55,
      rgbSplit: 0.18,
      trails: 0.58,
      tunnel: 0.22,
      hue: 135,
      hueSpeed: 0.12,
      motion: 'wobble',
      motionAmount: 0.35,
    },
  },
]

function drawBaseVideo(ctx, video, w, h, mirror, warp, t) {
  const amp = warp * 8
  if (amp >= 0.4) {
    const slices = 28
    const sliceH = h / slices
    for (let s = 0; s < slices; s += 1) {
      const sy = s * sliceH
      const offset = Math.sin(t * 1.2 + s * 0.35) * amp
      ctx.drawImage(
        video,
        0,
        (sy / h) * video.videoHeight,
        video.videoWidth,
        (sliceH / h) * video.videoHeight,
        offset,
        sy,
        w,
        sliceH
      )
    }
  } else {
    ctx.drawImage(video, 0, 0, w, h)
  }

  if (mirror > 0.004) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(w * 0.5, 0, w * 0.5, h)
    ctx.clip()
    ctx.globalAlpha = mirror
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, video.videoWidth / 2, video.videoHeight, 0, 0, w / 2, h)
    ctx.restore()
  }
}

function motionPose(motion, amount, t, w, h) {
  const A = amount * 0.45
  const ph = t * 1.4
  let x = 0
  let y = 0
  let rot = 0
  let sc = 1
  if (motion === 'figure8') {
    x = Math.sin(ph) * w * 0.012 * A
    y = Math.sin(ph * 2) * h * 0.01 * A
    rot = Math.cos(ph) * 0.02 * A
    sc = 1 - 0.03 * A
  } else if (motion === 'heartbeat') {
    const lub = Math.pow(Math.max(Math.sin(ph * 2), 0), 8)
    const dub = Math.pow(Math.max(Math.sin(ph * 2 - 0.8), 0), 8)
    sc = 1 + A * 0.025 * (lub + 0.7 * dub)
  } else if (motion === 'wobble') {
    x = Math.sin(ph * 3) * w * 0.004 * A
    y = Math.sin(ph * 2.4) * h * 0.003 * A
    sc = 1 + 0.015 * A
  } else if (motion === 'rock') {
    rot = Math.sin(ph) * 0.04 * A
    sc = 1 - 0.02 * A
  } else if (motion === 'swirl') {
    rot = Math.sin(ph * 0.8) * 0.08 * A
    sc = 1 + 0.015 * A
  } else if (motion === 'shockwave') {
    sc = 1 + 0.02 * A * (0.5 + 0.5 * Math.sin(ph * 3))
  } else if (motion === 'tiltzoom') {
    rot = Math.sin(ph * 0.5) * 0.03 * A
    sc = 1 + A * 0.04 * (0.5 + 0.5 * Math.sin(ph * 0.5))
  } else if (motion === 'bounce') {
    const tri = (n) => Math.abs(((n % 1) + 1) % 1 * 2 - 1) * 2 - 1
    x = tri(ph * 0.15) * w * 0.015 * A
    y = tri(ph * 0.2) * h * 0.012 * A
    sc = 1 - 0.04 * A
  } else if (motion === 'float') {
    x = Math.sin(ph * 0.6) * w * 0.006 * A
    y = Math.sin(ph) * h * 0.01 * A
    rot = Math.sin(ph * 0.7) * 0.012 * A
  }
  return { x, y, rot, sc }
}

/** Concentric-ring twist — classic swirl. */
function applySwirl(ctx, amount, t) {
  if (amount < 0.004) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const cx = w * 0.5
  const cy = h * 0.5
  const maxR = Math.hypot(w, h) * 0.55
  const rings = 14
  const twist = amount * 0.55
  const spin = t * amount * 0.12

  ctx.save()
  for (let i = rings; i >= 0; i -= 1) {
    const rOuter = ((i + 1) / rings) * maxR
    const rInner = (i / rings) * maxR
    const falloff = 1 - i / rings
    const angle = twist * falloff * falloff + spin

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2)
    if (rInner > 0.5) {
      ctx.arc(cx, cy, rInner, 0, Math.PI * 2, true)
    }
    ctx.clip()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.translate(-cx, -cy)
    ctx.drawImage(scratch, 0, 0)
    ctx.restore()
  }
  ctx.restore()
}

/** Radial wave / pond-ripple displacement via slice offsets. */
function applyRipple(ctx, amount, t) {
  if (amount < 0.004) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const cx = w * 0.5
  const cy = h * 0.5
  const amp = amount * 3.5
  const freq = 0.02
  const slices = 24
  const sliceH = h / slices

  ctx.clearRect(0, 0, w, h)
  for (let s = 0; s < slices; s += 1) {
    const y = s * sliceH
    const dy = y + sliceH * 0.5 - cy
    const wave = Math.sin(dy * freq + t * 3) * amp
    const waveY = Math.cos(dy * freq * 0.7 + t * 2.2) * amp * 0.25
    ctx.drawImage(scratch, 0, y, w, sliceH, wave, y + waveY, w, sliceH)
  }

  tmp.drawImage(ctx.canvas, 0, 0)
  const cols = 16
  const sliceW = w / cols
  ctx.clearRect(0, 0, w, h)
  for (let c = 0; c < cols; c += 1) {
    const x = c * sliceW
    const dx = x + sliceW * 0.5 - cx
    const wave = Math.sin(dx * freq + t * 2.6) * amp * 0.4
    ctx.drawImage(scratch, x, 0, sliceW, h, x, wave, sliceW, h)
  }
}

/** Barrel / fish-eye stretch from center. */
function applyBarrel(ctx, amount, t) {
  if (amount < 0.004) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const cx = w * 0.5
  const cy = h * 0.5
  const breathe = 1 + Math.sin(t * 1.2) * amount * 0.008
  const rings = 10
  const maxR = Math.hypot(w, h) * 0.5

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(scratch, 0, 0)

  for (let i = 0; i < rings; i += 1) {
    const p0 = i / rings
    const p1 = (i + 1) / rings
    const zoom0 = 1 + amount * 0.08 * p0 * p0 * breathe
    const zoom1 = 1 + amount * 0.08 * p1 * p1 * breathe
    const r0 = (p0 * maxR) / zoom0
    const r1 = (p1 * maxR) / zoom1

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, Math.max(r1, 1), 0, Math.PI * 2)
    if (r0 > 0.5) ctx.arc(cx, cy, r0, 0, Math.PI * 2, true)
    ctx.clip()
    ctx.translate(cx, cy)
    ctx.scale(zoom1, zoom1)
    ctx.translate(-cx, -cy)
    ctx.drawImage(scratch, 0, 0)
    ctx.restore()
  }
}

/** Recursive zoom tunnel / feedback trail. */
function applyTunnel(ctx, amount, t) {
  if (amount < 0.004) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const layers = 3
  const spin = t * amount * 0.08
  ctx.save()
  for (let L = layers; L >= 1; L -= 1) {
    const p = L / layers
    const scale = 1 - amount * 0.08 * p
    const alpha = amount * 0.1 * (1 - p)
    ctx.globalAlpha = alpha
    ctx.translate(w / 2, h / 2)
    ctx.rotate(spin * p)
    ctx.scale(scale, scale)
    ctx.translate(-w / 2, -h / 2)
    ctx.drawImage(scratch, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

/** Blocky pixelation. */
function applyPixelate(ctx, amount) {
  if (amount < 0.004) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const blocks = Math.round(110 - amount * 36)
  const sw = Math.max(8, Math.round(w / blocks))
  const sh = Math.max(8, Math.round(h / blocks))
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(scratch, 0, 0, w, h, 0, 0, sw, sh)
  ctx.drawImage(ctx.canvas, 0, 0, sw, sh, 0, 0, w, h)
  ctx.imageSmoothingEnabled = true
  ctx.save()
  ctx.globalAlpha = 1 - amount
  ctx.drawImage(scratch, 0, 0)
  ctx.restore()
}

function applyKaleido(ctx, amount) {
  if (amount < 0.004) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)
  ctx.save()
  ctx.globalAlpha = amount * 0.4
  ctx.translate(w, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(scratch, 0, 0)
  ctx.restore()
  ctx.save()
  ctx.globalAlpha = amount * 0.22
  ctx.translate(0, h)
  ctx.scale(1, -1)
  ctx.drawImage(scratch, 0, 0)
  ctx.restore()
}

function applyGlow(ctx, amount) {
  if (amount < 0.004) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.filter = `blur(${1 + amount * 4}px)`
  tmp.drawImage(ctx.canvas, 0, 0, w, h)
  tmp.filter = 'none'
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = amount * 0.2
  ctx.drawImage(scratch, 0, 0)
  ctx.restore()
}

function applyVhs(ctx, amount, t) {
  if (amount < 0.004) return
  const { width: w, height: h } = ctx.canvas
  ctx.save()
  ctx.globalAlpha = amount * 0.16
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1)
  const band = ((t * 28) % (h + 30)) - 15
  ctx.globalAlpha = amount * 0.1
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillRect(0, band, w, 6)
  ctx.restore()
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLVideoElement} video
 * @param {object} effects
 * @param {number} t seconds
 */
export function drawPsychedelicFrame(ctx, video, effects, t) {
  const { width: w, height: h } = ctx.canvas
  if (!w || !h || !video.videoWidth) return

  // Master intensity eases every dial. Each dial is curved again so a
  // small turn stays small, instead of crossing a threshold into full FX.
  const i = shapeAmount(effects.intensity ?? 0, 1.2, 1)
  const amt = (v, exp = 1.65, cap = 1) => shapeAmount(v, exp, cap) * i
  const mirror = shapeAmount(effects.mirror ?? 0, 1.35, 1) * (0.25 + 0.75 * i)

  const trails = amt(effects.trails, 1.5, 0.85)
  const hueSpeed = amt(effects.hueSpeed, 1.5, 0.7)
  const rgbSplit = amt(effects.rgbSplit, 1.6, 0.7)
  const warp = amt(effects.warp, 1.6, 0.65)
  const glitch = amt(effects.glitch, 1.6, 0.7)
  const pulse = amt(effects.pulse, 1.5, 0.8)
  const swirl = amt(effects.swirl, 1.7, 0.7)
  const ripple = amt(effects.ripple, 1.7, 0.65)
  const barrel = amt(effects.barrel, 1.7, 0.6)
  const tunnel = amt(effects.tunnel, 1.8, 0.55)
  const pixelate = amt(effects.pixelate, 1.7, 0.75)
  const kaleido = amt(effects.kaleido, 1.7, 0.7)
  const glow = amt(effects.glow, 1.3, 0.85)
  const vhs = amt(effects.vhs, 1.3, 0.85)
  const flash = amt(effects.flash, 1.6, 0.7)
  const motionAmount = amt(effects.motionAmount, 1.35, 0.8)

  if (trails > 0.004) {
    ctx.fillStyle = `rgba(0,0,0,${1 - trails * 0.32})`
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }

  const hue = ((effects.hue || 0) * i + t * hueSpeed * 18) % 360
  const sat = 1 + i * 0.14
  const contrast = 1 + i * 0.05
  const pulseScale = 1 + Math.sin(t * (1.2 + pulse)) * pulse * 0.008
  const pose = motionPose(effects.motion, motionAmount, t, w, h)

  ctx.save()
  ctx.translate(w / 2 + pose.x, h / 2 + pose.y)
  ctx.rotate(pose.rot)
  ctx.scale(pulseScale * pose.sc, pulseScale * pose.sc)
  ctx.translate(-w / 2, -h / 2)

  ctx.filter = `hue-rotate(${hue}deg) saturate(${sat}) contrast(${contrast})`
  if (trails > 0.004) ctx.globalAlpha = 1 - trails * 0.18
  drawBaseVideo(ctx, video, w, h, mirror, warp, t)
  ctx.globalAlpha = 1
  ctx.filter = 'none'

  applySwirl(ctx, swirl, t)
  applyRipple(ctx, ripple, t)
  applyBarrel(ctx, barrel, t)
  applyTunnel(ctx, tunnel, t)
  applyPixelate(ctx, pixelate)
  applyKaleido(ctx, kaleido)

  if (rgbSplit > 0.004) {
    const ox = Math.sin(t * 1.2) * rgbSplit * 3
    const oy = Math.cos(t * 0.9) * rgbSplit * 1.5
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.06 + rgbSplit * 0.1
    ctx.drawImage(video, ox, 0, w, h)
    ctx.drawImage(video, -ox * 0.7, oy, w, h)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  if (glitch > 0.004 && Math.random() < 0.04 + glitch * 0.05) {
    const y = Math.random() * h
    const bh = 2 + Math.random() * 5 * glitch
    const dx = (Math.random() - 0.5) * 8 * glitch
    ctx.drawImage(ctx.canvas, 0, y, w, bh, dx, y, w, bh)
  }

  applyVhs(ctx, vhs, t)
  applyGlow(ctx, glow)

  if (flash > 0.004) {
    const kick = 0.5 + 0.5 * Math.sin(t * 2.2)
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.07 * kick})`
    ctx.fillRect(0, 0, w, h)
  }

  if (i > 0.004) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.15, w * 0.5, h * 0.5, h * 0.8)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${i * 0.16})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = `hsla(${hue}, 70%, 55%, ${i * 0.04})`
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }

  ctx.restore()
}

/**
 * Keep canvas resolution matched to the camera (capped for encode cost).
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLVideoElement} video
 * @param {number} [maxW=1280]
 */
export function fitCanvasToVideo(canvas, video, maxW = 1280) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return
  const scale = Math.min(1, maxW / vw)
  const w = Math.round(vw * scale)
  const h = Math.round(vh * scale)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
}
