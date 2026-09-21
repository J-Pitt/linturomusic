/**
 * Psychedelic canvas compositor for the live broadcast.
 * Draws camera frames with host-tunable overlays, then the canvas is captured as the outbound video track.
 */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
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

  if (mirror > 0.5) {
    // Horizontal mirror split
    const hw = w / 2
    ctx.drawImage(video, 0, 0, video.videoWidth / 2, video.videoHeight, 0, 0, hw, h)
    ctx.save()
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, video.videoWidth / 2, video.videoHeight, 0, 0, hw, h)
    ctx.restore()
  } else if (warp > 0.02) {
    const slices = Math.floor(18 + warp * 28)
    const sliceH = h / slices
    for (let s = 0; s < slices; s += 1) {
      const sy = s * sliceH
      const offset = Math.sin(t * 2.2 + s * 0.45) * warp * 28
      ctx.drawImage(video, 0, sy, w, sliceH, offset, sy, w, sliceH)
    }
  } else {
    ctx.drawImage(video, 0, 0, w, h)
  }

  ctx.filter = 'none'

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

  // Soft vignette + color wash
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
