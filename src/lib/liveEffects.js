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

function drawBaseVideo(ctx, video, w, h, mirror, warp, t) {
  if (mirror > 0.5) {
    const hw = w / 2
    ctx.drawImage(video, 0, 0, video.videoWidth / 2, video.videoHeight, 0, 0, hw, h)
    ctx.save()
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, video.videoWidth / 2, video.videoHeight, 0, 0, hw, h)
    ctx.restore()
    return
  }

  if (warp > 0.02) {
    const slices = Math.floor(14 + warp * 16)
    const sliceH = h / slices
    for (let s = 0; s < slices; s += 1) {
      const sy = s * sliceH
      const offset = Math.sin(t * 1.6 + s * 0.4) * warp * 10
      ctx.drawImage(video, 0, sy, video.videoWidth, (sliceH / h) * video.videoHeight, offset, sy, w, sliceH)
    }
    return
  }

  ctx.drawImage(video, 0, 0, w, h)
}

/** Concentric-ring twist — classic swirl. */
function applySwirl(ctx, amount, t) {
  if (amount < 0.02) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const cx = w * 0.5
  const cy = h * 0.5
  const maxR = Math.hypot(w, h) * 0.55
  const rings = Math.floor(10 + amount * 12)
  const twist = amount * Math.PI * 0.45
  const spin = t * amount * 0.22

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
  if (amount < 0.02) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const cx = w * 0.5
  const cy = h * 0.5
  const amp = amount * 8
  const freq = 0.022 + amount * 0.015
  const slices = Math.floor(20 + amount * 18)
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
  const cols = Math.floor(14 + amount * 12)
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
  if (amount < 0.02) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const cx = w * 0.5
  const cy = h * 0.5
  const breathe = 1 + Math.sin(t * 1.2) * amount * 0.015
  const rings = Math.floor(8 + amount * 10)
  const maxR = Math.hypot(w, h) * 0.5

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(scratch, 0, 0)

  for (let i = 0; i < rings; i += 1) {
    const p0 = i / rings
    const p1 = (i + 1) / rings
    const zoom0 = 1 + amount * 0.2 * p0 * p0 * breathe
    const zoom1 = 1 + amount * 0.2 * p1 * p1 * breathe
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
  if (amount < 0.02) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const layers = Math.floor(2 + amount * 3)
  const spin = t * amount * 0.15
  ctx.save()
  for (let L = layers; L >= 1; L -= 1) {
    const p = L / layers
    const scale = 1 - amount * 0.14 * p
    const alpha = 0.08 + amount * 0.1 * (1 - p)
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
  if (amount < 0.08) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const blocks = Math.max(16, Math.floor(64 - amount * 36))
  const sw = Math.max(16, Math.floor(w / blocks))
  const sh = Math.max(16, Math.floor(h / blocks))
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(scratch, 0, 0, w, h, 0, 0, sw, sh)
  ctx.drawImage(ctx.canvas, 0, 0, sw, sh, 0, 0, w, h)
  ctx.imageSmoothingEnabled = true
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

  // Ease master intensity so mid sliders stay subtle
  const iRaw = clamp(effects.intensity ?? 0.5, 0, 1)
  const i = iRaw * iRaw * 0.85
  const soft = (v) => clamp(v ?? 0, 0, 1) * i

  const trails = soft(effects.trails)
  const hueSpeed = soft(effects.hueSpeed)
  const rgbSplit = soft(effects.rgbSplit)
  const warp = soft(effects.warp)
  const glitch = soft(effects.glitch)
  const mirror = clamp(effects.mirror ?? 0, 0, 1)
  const pulse = soft(effects.pulse)
  const swirl = soft(effects.swirl)
  const ripple = soft(effects.ripple)
  const barrel = soft(effects.barrel)
  const tunnel = soft(effects.tunnel)
  const pixelate = soft(effects.pixelate)

  if (trails > 0.02) {
    ctx.fillStyle = `rgba(0,0,0,${0.22 + (1 - trails) * 0.45})`
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }

  const hue = (t * hueSpeed * 48) % 360
  const sat = 1 + i * 0.28
  const contrast = 1 + i * 0.08
  const pulseScale = 1 + Math.sin(t * (1.5 + pulse * 2)) * pulse * 0.015

  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(pulseScale, pulseScale)
  ctx.translate(-w / 2, -h / 2)

  ctx.filter = `hue-rotate(${hue}deg) saturate(${sat}) contrast(${contrast})`
  drawBaseVideo(ctx, video, w, h, mirror, warp, t)
  ctx.filter = 'none'

  applySwirl(ctx, swirl, t)
  applyRipple(ctx, ripple, t)
  applyBarrel(ctx, barrel, t)
  applyTunnel(ctx, tunnel, t)
  applyPixelate(ctx, pixelate)

  if (rgbSplit > 0.02) {
    const ox = Math.sin(t * 1.2) * rgbSplit * 5
    const oy = Math.cos(t * 0.9) * rgbSplit * 3
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.12 + rgbSplit * 0.18
    ctx.drawImage(video, ox, 0, w, h)
    ctx.drawImage(video, -ox * 0.7, oy, w, h)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  if (glitch > 0.02 && Math.random() < glitch * 0.12) {
    const bands = 1 + Math.floor(Math.random() * 2)
    for (let b = 0; b < bands; b += 1) {
      const y = Math.random() * h
      const bh = 3 + Math.random() * 12 * glitch
      const dx = (Math.random() - 0.5) * 28 * glitch
      ctx.drawImage(ctx.canvas, 0, y, w, bh, dx, y, w, bh)
    }
  }

  if (i > 0.08) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.15, w * 0.5, h * 0.5, h * 0.8)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${0.06 + i * 0.18})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = `hsla(${hue}, 70%, 55%, ${0.02 + i * 0.05})`
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
