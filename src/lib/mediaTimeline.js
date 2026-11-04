/**
 * MediaRecorder WebM often has no Duration element. Browsers then report
 * duration Infinity (or the absolute last timestamp) while the pictures only
 * occupy a short seekable window, so a one-hour set looks like a sliver at
 * the end of the scrub bar. These helpers map that window across the full bar
 * and read the real start/end from the container when the element will not.
 */

const CLUSTER_ID = 0x1f43b675
const INFO_ID = 0x1549a966
const TIMESTAMP_SCALE_ID = 0x2ad7b1
const DURATION_ID = 0x4489
const TIMESTAMP_ID = 0xe7
const SIMPLE_BLOCK_ID = 0xa3
const BLOCK_GROUP_ID = 0xa0
const BLOCK_ID = 0xa1

const DEFAULT_SCALE = 1_000_000

export function isWebmSrc(src) {
  return /\.webm(\?|#|$)/i.test(src || '')
}

export function formatMediaClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const total = Math.floor(seconds + 1e-6)
  const s = total % 60
  const m = Math.floor(total / 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function finiteRanges(seekable) {
  return (seekable || []).filter(
    (range) =>
      Number.isFinite(range.start) &&
      Number.isFinite(range.end) &&
      range.end > range.start + 0.05
  )
}

/** Seekable media parked at the end of a much longer reported duration. */
export function isEndSliver(duration, ranges) {
  if (!Number.isFinite(duration) || duration <= 0 || !ranges?.length) return false
  const start = ranges[0].start
  const end = ranges[ranges.length - 1].end
  const span = end - start
  return start > 1 && span > 0.5 && span < duration * 0.9 && end >= duration - 1
}

export function shouldUseCustomTimeline({ duration, seekable, bounds, src, readyState = 0 }) {
  const timeline = resolveMediaTimeline({ duration, currentTime: 0, seekable, bounds })
  const finiteDuration = Number.isFinite(duration) && duration > 0
  if (timeline.known && finiteDuration) {
    return timeline.span < duration * 0.9 && duration - timeline.span > 0.75
  }
  if (timeline.known) return true
  if (!isWebmSrc(src)) return false
  if (duration === Infinity) return true
  return readyState >= 1 && Number.isNaN(duration)
}

function pack(start, end, current) {
  const span = end - start
  if (!(span > 0) || !Number.isFinite(span)) {
    return { start: 0, end: 0, span: 0, displayTime: 0, fraction: 0, known: false }
  }
  const mediaTime = Math.min(end, Math.max(start, Number.isFinite(current) ? current : start))
  const displayTime = mediaTime - start
  return {
    start,
    end,
    span,
    displayTime,
    fraction: displayTime / span,
    known: true,
  }
}

/**
 * Timeline the scrub bar should draw.
 * `start`/`end` are media currentTime values. `displayTime` is 0 at `start`.
 */
function boundsWindow(bounds) {
  if (!bounds?.anchored) return null
  const start = Number.isFinite(bounds.startSec) ? Math.max(0, bounds.startSec) : 0
  const end = bounds.endSec
  if (!Number.isFinite(end) || !(end > start)) return null
  return { start, end, span: end - start }
}

export function resolveMediaTimeline({ duration, currentTime, seekable, bounds }) {
  const current = Number.isFinite(currentTime) ? currentTime : 0
  const ranges = finiteRanges(seekable)
  const finiteDuration = Number.isFinite(duration) && duration > 0
  const window = boundsWindow(bounds)

  // Container timestamps are the real picture range. Prefer them when the
  // element duration is missing or much longer than that range.
  if (window && (!finiteDuration || window.span < duration * 0.9)) {
    return pack(window.start, window.end, current)
  }

  if (finiteDuration && isEndSliver(duration, ranges)) {
    return pack(ranges[0].start, ranges[ranges.length - 1].end, current)
  }

  if (finiteDuration) return pack(0, duration, current)

  if (ranges.length) {
    return pack(ranges[0].start, ranges[ranges.length - 1].end, current)
  }

  return pack(0, 0, current)
}

export function mediaTimeForFraction(timeline, fraction) {
  if (!timeline?.known || !(timeline.span > 0)) return 0
  const clamped = Math.min(1, Math.max(0, fraction))
  return timeline.start + clamped * timeline.span
}

export function fractionForClientX(timeline, rect, clientX) {
  if (!rect || !(rect.width > 0)) return 0
  return mediaTimeForFraction(timeline, (clientX - rect.left) / rect.width)
}

function readId(bytes, i) {
  if (i >= bytes.length) return null
  const b0 = bytes[i]
  if (!b0) return null
  let mask = 0x80
  let width = 1
  while (width <= 4 && (b0 & mask) === 0) {
    mask >>= 1
    width += 1
  }
  if (i + width > bytes.length) return null
  let id = 0
  for (let n = 0; n < width; n++) id = id * 256 + bytes[i + n]
  return { id, next: i + width }
}

function readVint(bytes, i) {
  if (i >= bytes.length) return null
  const b0 = bytes[i]
  if (!b0) return null
  let mask = 0x80
  let width = 1
  while (width <= 8 && (b0 & mask) === 0) {
    mask >>= 1
    width += 1
  }
  if (i + width > bytes.length) return null
  let raw = 0n
  for (let n = 0; n < width; n++) raw = (raw << 8n) | BigInt(bytes[i + n])
  const valueMask = (1n << BigInt(7 * width)) - 1n
  const value = raw & valueMask
  const unknown = value === valueMask
  const num = value > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(value)
  return { value: num, next: i + width, unknown }
}

function readUint(bytes, i, length) {
  let n = 0
  for (let k = 0; k < length; k++) n = n * 256 + bytes[i + k]
  return n
}

function readSigned16(bytes, i) {
  const n = (bytes[i] << 8) | bytes[i + 1]
  return n > 0x7fff ? n - 0x10000 : n
}

function encodeVint(value) {
  for (let width = 1; width <= 8; width++) {
    if (value < 2 ** (7 * width) - 1) {
      const out = new Uint8Array(width)
      let v = value
      for (let i = width - 1; i >= 0; i--) {
        out[i] = v & 0xff
        v = Math.floor(v / 256)
      }
      out[0] |= 1 << (8 - width)
      return out
    }
  }
  throw new Error('WebM size is too large to encode')
}

function concatBytes(parts) {
  const len = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(len)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function unitsToSeconds(units, scale) {
  return (units * scale) / 1e9
}

function blockDelta(bytes, payload, end) {
  const track = readVint(bytes, payload)
  if (!track || track.next + 2 > end) return null
  return readSigned16(bytes, track.next)
}

function walkBlocks(bytes, start, end, clusterUnits) {
  let maxUnits = clusterUnits
  let i = start
  let guard = 0
  while (i + 2 < end && guard < 200000) {
    guard += 1
    const id = readId(bytes, i)
    if (!id) break
    const size = readVint(bytes, id.next)
    if (!size || size.unknown) break
    const payload = size.next
    const payloadEnd = payload + size.value
    if (payloadEnd > end) break
    if (id.id === SIMPLE_BLOCK_ID || id.id === BLOCK_ID) {
      const delta = blockDelta(bytes, payload, payloadEnd)
      if (delta != null) maxUnits = Math.max(maxUnits, clusterUnits + delta)
    } else if (id.id === BLOCK_GROUP_ID) {
      maxUnits = Math.max(maxUnits, walkBlocks(bytes, payload, payloadEnd, clusterUnits))
    }
    i = payloadEnd
  }
  return maxUnits
}

function parseClusterAt(bytes, index) {
  if (index + 4 >= bytes.length) return null
  const id = readId(bytes, index)
  if (!id || id.id !== CLUSTER_ID) return null
  const size = readVint(bytes, id.next)
  if (!size) return null
  const payload = size.next
  const tsId = readId(bytes, payload)
  if (!tsId || tsId.id !== TIMESTAMP_ID) return null
  const tsSize = readVint(bytes, tsId.next)
  if (!tsSize || tsSize.unknown || tsSize.value < 1 || tsSize.value > 8) return null
  const tsEnd = tsSize.next + tsSize.value
  if (tsEnd > bytes.length) return null
  const tsUnits = readUint(bytes, tsSize.next, tsSize.value)
  const payloadEnd = size.unknown ? null : payload + size.value
  return { index, tsUnits, afterTimestamp: tsEnd, payloadEnd }
}

export function scanClusterRange(bytes, scale = DEFAULT_SCALE) {
  const found = []
  const limit = bytes.length - 4
  for (let i = 0; i < limit; i++) {
    if (
      bytes[i] !== 0x1f ||
      bytes[i + 1] !== 0x43 ||
      bytes[i + 2] !== 0xb6 ||
      bytes[i + 3] !== 0x75
    ) {
      continue
    }
    const cluster = parseClusterAt(bytes, i)
    if (cluster) found.push(cluster)
  }
  return found.map((cluster, n) => {
    const next = found[n + 1]?.index ?? bytes.length
    const end = cluster.payloadEnd == null ? next : Math.min(cluster.payloadEnd, bytes.length)
    const maxUnits = walkBlocks(bytes, cluster.afterTimestamp, end, cluster.tsUnits)
    return {
      startSec: unitsToSeconds(cluster.tsUnits, scale),
      endSec: unitsToSeconds(maxUnits, scale),
    }
  })
}

function walkElements(bytes, start, end, visit) {
  let i = start
  while (i + 2 < end) {
    const id = readId(bytes, i)
    if (!id) return
    const size = readVint(bytes, id.next)
    if (!size) return
    if (size.unknown) {
      visit({ id: id.id, start: i, headerEnd: size.next, payloadEnd: end, unknown: true, bytes })
      return
    }
    const payloadEnd = size.next + size.value
    if (payloadEnd > end) return
    const stop = visit({
      id: id.id,
      start: i,
      headerEnd: size.next,
      payloadEnd,
      unknown: false,
      bytes,
    })
    if (stop) return
    i = payloadEnd
  }
}

export function inspectWebmHeader(bytes) {
  let scale = DEFAULT_SCALE
  let hasDuration = false
  let info = null
  walkElements(bytes, 0, bytes.length, (el) => {
    if (el.id !== 0x1a45dfa3 && el.id !== 0x18538067) return false
    if (el.id === 0x18538067) {
      walkElements(bytes, el.headerEnd, el.payloadEnd, (child) => {
        if (child.id !== INFO_ID) return false
        info = {
          start: child.start,
          headerEnd: child.headerEnd,
          payloadEnd: child.payloadEnd,
        }
        walkElements(bytes, child.headerEnd, child.payloadEnd, (field) => {
          if (field.id === TIMESTAMP_SCALE_ID && field.payloadEnd - field.headerEnd <= 8) {
            scale = readUint(bytes, field.headerEnd, field.payloadEnd - field.headerEnd) || scale
          }
          if (field.id === DURATION_ID) hasDuration = true
          return false
        })
        return true
      })
      return true
    }
    return false
  })
  return { scale, hasDuration, info }
}

/**
 * Earliest and latest timestamps in a WebM, in seconds.
 * `head` must include the Info element. `tail` should include the last cluster.
 */
export function readWebmBounds(head, tail) {
  const header = inspectWebmHeader(head)
  const scale = header.scale || DEFAULT_SCALE
  const tailClusters = scanClusterRange(tail || head, scale)
  const headClusters = scanClusterRange(head, scale)
  const clusters = [...headClusters, ...tailClusters]
  if (!clusters.length) return null
  let startSec = clusters[0].startSec
  let endSec = clusters[0].endSec
  for (const cluster of clusters) {
    if (cluster.startSec < startSec) startSec = cluster.startSec
    if (cluster.endSec > endSec) endSec = cluster.endSec
  }
  if (!(endSec > startSec)) return null
  // A cluster in the tail is within a couple of seconds of the real end.
  // Head-only timestamps are just the opening of the file.
  return {
    startSec,
    endSec,
    hasDuration: header.hasDuration,
    scale,
    anchored: tailClusters.length > 0,
  }
}

function durationElement(durationSec, scale) {
  const units = (durationSec * 1e9) / scale
  const payload = new Uint8Array(8)
  new DataView(payload.buffer).setFloat64(0, units, false)
  return concatBytes([new Uint8Array([0x44, 0x89, 0x88]), payload])
}

/**
 * Insert a Segment Duration so browsers report a finite length.
 * Returns null when the header already has one or cannot be patched.
 * `cut` is the original offset where the unchanged remainder begins.
 */
export function insertWebmDuration(bytes, durationSec) {
  if (!(durationSec > 0) || !Number.isFinite(durationSec)) return null
  const header = inspectWebmHeader(bytes)
  if (!header.info || header.hasDuration) return null
  const { start, headerEnd, payloadEnd } = header.info
  const id = readId(bytes, start)
  if (!id) return null
  const payload = bytes.subarray(headerEnd, payloadEnd)
  const nextPayload = concatBytes([durationElement(durationSec, header.scale), payload])
  const patchedInfo = concatBytes([bytes.subarray(start, id.next), encodeVint(nextPayload.length), nextPayload])
  return {
    bytes: concatBytes([bytes.subarray(0, start), patchedInfo]),
    cut: payloadEnd,
  }
}

export async function discoverWebmBounds(url, signal) {
  const headRes = await fetch(url, { headers: { Range: 'bytes=0-65535' }, signal })
  if (!headRes.ok && headRes.status !== 206) throw new Error('Could not read video header')
  const head = new Uint8Array(await headRes.arrayBuffer())
  const tailRes = await fetch(url, { headers: { Range: 'bytes=-2097152' }, signal })
  if (!tailRes.ok && tailRes.status !== 206) throw new Error('Could not read video end')
  const tail = new Uint8Array(await tailRes.arrayBuffer())
  return readWebmBounds(head, tail)
}

/** Give a MediaRecorder WebM a real duration without rewriting the clusters. */
export async function stampWebmBlob(blob) {
  const type = blob.type || ''
  if (type && !/webm|matroska/i.test(type)) return blob
  const headLen = Math.min(blob.size, 65536)
  const tailLen = Math.min(blob.size, 2 * 1024 * 1024)
  const head = new Uint8Array(await blob.slice(0, headLen).arrayBuffer())
  const tail = new Uint8Array(await blob.slice(Math.max(0, blob.size - tailLen)).arrayBuffer())
  const bounds = readWebmBounds(head, tail)
  if (!bounds?.anchored || bounds.hasDuration) return blob
  // A non-zero start still plays at the end of a 0..end clock. Leave those for
  // the player, which maps the real window, instead of writing a misleading length.
  if (bounds.startSec > 0.5) return blob
  const patched = insertWebmDuration(head, bounds.endSec - bounds.startSec)
  if (!patched) return blob
  return new Blob([patched.bytes, blob.slice(patched.cut)], { type: type || 'video/webm' })
}
