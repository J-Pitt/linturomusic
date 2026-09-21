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
    const slices = Math.floor(18 + warp * 28)
    const sliceH = h / slices
    for (let s = 0; s < slices; s += 1) {
      const sy = s * sliceH
      const offset = Math.sin(t * 2.2 + s * 0.45) * warp * 28
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
  const rings = Math.floor(16 + amount * 20)
  const twist = amount * Math.PI * 1.6
  const spin = t * amount * 0.7

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
  const amp = amount * 22
  const freq = 0.035 + amount * 0.04
  const slices = Math.floor(28 + amount * 36)
  const sliceH = h / slices

  ctx.clearRect(0, 0, w, h)
  for (let s = 0; s < slices; s += 1) {
    const y = s * sliceH
    const dy = y + sliceH * 0.5 - cy
    const wave = Math.sin(dy * freq + t * 4.5) * amp
    const waveY = Math.cos(dy * freq * 0.7 + t * 3.2) * amp * 0.35
    ctx.drawImage(scratch, 0, y, w, sliceH, wave, y + waveY, w, sliceH)
  }

  // Light vertical ripple pass
  tmp.drawImage(ctx.canvas, 0, 0)
  const cols = Math.floor(20 + amount * 24)
  const sliceW = w / cols
  ctx.clearRect(0, 0, w, h)
  for (let c = 0; c < cols; c += 1) {
    const x = c * sliceW
    const dx = x + sliceW * 0.5 - cx
    const wave = Math.sin(dx * freq + t * 3.8) * amp * 0.55
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
  const breathe = 1 + Math.sin(t * 1.5) * amount * 0.04
  const rings = Math.floor(12 + amount * 16)
  const maxR = Math.hypot(w, h) * 0.5

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(scratch, 0, 0)

  for (let i = 0; i < rings; i += 1) {
    const p0 = i / rings
    const p1 = (i + 1) / rings
    // Push outer rings farther out (barrel)
    const zoom0 = 1 + amount * 0.55 * p0 * p0 * breathe
    const zoom1 = 1 + amount * 0.55 * p1 * p1 * breathe
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

  const layers = Math.floor(3 + amount * 5)
  const spin = t * amount * 0.4
  ctx.save()
  for (let L = layers; L >= 1; L -= 1) {
    const p = L / layers
    const scale = 1 - amount * 0.38 * p
    const alpha = 0.18 + amount * 0.22 * (1 - p)
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
  if (amount < 0.05) return
  const { width: w, height: h } = ctx.canvas
  const tmp = ensureScratch(w, h)
  tmp.drawImage(ctx.canvas, 0, 0)

  const blocks = Math.max(8, Math.floor(48 - amount * 40))
  const sw = Math.max(8, Math.floor(w / blocks))
  const sh = Math.max(8, Math.floor(h / blocks))
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

  const i = clamp(effects.intensity ?? 0.5, 0, 1)
  const trails = clamp(effects.trails ?? 0, 0, 1) * i
  const hueSpeed = (effects.hueSpeed ?? 0) * i
  const rgbSplit = (effects.rgbSplit ?? 0) * i
  const warp = (effects.warp ?? 0) * i
  const glitch = (effects.glitch ?? 0) * i
  const mirror = clamp(effects.mirror ?? 0, 0, 1)
  const pulse = (effects.pulse ?? 0) * i
  const swirl = (effects.swirl ?? 0) * i
  const ripple = (effects.ripple ?? 0) * i
  const barrel = (effects.barrel ?? 0) * i
  const tunnel = (effects.tunnel ?? 0) * i
  const pixelate = (effects.pixelate ?? 0) * i

  if (trails > 0.02) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + (1 - trails) * 0.35})`
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }

  const hue = (t * hueSpeed * 120) % 360
  const sat = 1 + i * 0.85
  const contrast = 1 + i * 0.25
  const pulseScale = 1 + Math.sin(t * (2 + pulse * 4)) * pulse * 0.04

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
    const ox = Math.sin(t * 1.7) * rgbSplit * 14
    const oy = Math.cos(t * 1.3) * rgbSplit * 8
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.35 + rgbSplit * 0.35
    ctx.drawImage(video, ox, 0, w, h)
    ctx.drawImage(video, -ox * 0.7, oy, w, h)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  if (glitch > 0.02 && Math.random() < glitch * 0.35) {
    const bands = 2 + Math.floor(Math.random() * 4)
    for (let b = 0; b < bands; b += 1) {
      const y = Math.random() * h
      const bh = 4 + Math.random() * 28 * glitch
      const dx = (Math.random() - 0.5) * 80 * glitch
      ctx.drawImage(ctx.canvas, 0, y, w, bh, dx, y, w, bh)
    }
  }

  if (i > 0.05) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.1, w * 0.5, h * 0.5, h * 0.75)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${0.15 + i * 0.35})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = `hsla(${hue}, 90%, 55%, ${0.06 + i * 0.12})`
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
