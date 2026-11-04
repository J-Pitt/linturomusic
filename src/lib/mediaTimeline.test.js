import assert from 'node:assert/strict'
import { closeSync, fstatSync, openSync, readSync } from 'node:fs'
import test from 'node:test'
import {
  formatMediaClock,
  insertWebmDuration,
  inspectWebmHeader,
  mediaTimeForFraction,
  readWebmBounds,
  resolveMediaTimeline,
  shouldUseCustomTimeline,
} from './mediaTimeline.js'

const RECORDING = '/Users/jpittman/Documents/LinturoStudio-live-2026-11-01-1731.webm'
const LAST_PACKET_SEC = 3607.214

function readHeadTail(path) {
  const fd = openSync(path, 'r')
  try {
    const size = fstatSync(fd).size
    const head = new Uint8Array(Math.min(size, 65536))
    readSync(fd, head, 0, head.length, 0)
    const tailLen = Math.min(size, 2 * 1024 * 1024)
    const tail = new Uint8Array(tailLen)
    readSync(fd, tail, 0, tailLen, size - tailLen)
    return { head, tail, size }
  } finally {
    closeSync(fd)
  }
}

test('normal tracks use the full duration and keep native controls', () => {
  const timeline = resolveMediaTimeline({
    duration: 180,
    currentTime: 90,
    seekable: [{ start: 0, end: 180 }],
  })
  assert.equal(timeline.known, true)
  assert.equal(timeline.span, 180)
  assert.equal(timeline.fraction, 0.5)
  assert.equal(timeline.displayTime, 90)
  assert.equal(mediaTimeForFraction(timeline, 0), 0)
  assert.equal(mediaTimeForFraction(timeline, 1), 180)
  assert.equal(
    shouldUseCustomTimeline({
      duration: 180,
      seekable: [{ start: 0, end: 180 }],
      src: 'https://linturomusic.s3.us-west-2.amazonaws.com/brooklyn.mp4',
      readyState: 4,
    }),
    false
  )
})

test('a seekable window parked at the end of a huge duration fills the bar', () => {
  const start = 96392.786
  const end = 100000
  const atStart = resolveMediaTimeline({
    duration: end,
    currentTime: start,
    seekable: [{ start, end }],
  })
  const atEnd = resolveMediaTimeline({
    duration: end,
    currentTime: end,
    seekable: [{ start, end }],
  })
  assert.ok(atStart.fraction < 0.001)
  assert.equal(atStart.displayTime, 0)
  assert.ok(Math.abs(atEnd.fraction - 1) < 0.001)
  assert.ok(Math.abs(atStart.span - (end - start)) < 0.001)
  assert.ok(atStart.span < 4000)
  assert.equal(mediaTimeForFraction(atStart, 0), start)
  assert.equal(mediaTimeForFraction(atStart, 1), end)
  assert.equal(formatMediaClock(0), '0:00')
  assert.equal(formatMediaClock(atStart.span), '60:07')
  assert.equal(
    shouldUseCustomTimeline({
      duration: end,
      seekable: [{ start, end }],
      src: 'https://example.com/set.webm',
      readyState: 4,
    }),
    true
  )
})

test('Infinity duration uses the container bounds, not an endless timeline', () => {
  const bounds = { startSec: 0, endSec: LAST_PACKET_SEC, anchored: true }
  const atStart = resolveMediaTimeline({
    duration: Infinity,
    currentTime: 0,
    seekable: [{ start: 0, end: Infinity }],
    bounds,
  })
  const atEnd = resolveMediaTimeline({
    duration: Infinity,
    currentTime: LAST_PACKET_SEC,
    seekable: [{ start: 0, end: Infinity }],
    bounds,
  })
  assert.equal(atStart.fraction, 0)
  assert.equal(atStart.displayTime, 0)
  assert.ok(Math.abs(atEnd.fraction - 1) < 1e-9)
  assert.ok(Math.abs(atStart.span - LAST_PACKET_SEC) < 0.001)
  assert.equal(formatMediaClock(atStart.span), '60:07')
  assert.equal(mediaTimeForFraction(atStart, 0), 0)
  assert.equal(mediaTimeForFraction(atEnd, 1), LAST_PACKET_SEC)
  assert.equal(
    shouldUseCustomTimeline({
      duration: Infinity,
      seekable: [{ start: 0, end: Infinity }],
      src: 'https://linturomusic.s3.us-west-2.amazonaws.com/live-recordings/set.webm',
      readyState: 4,
      bounds,
    }),
    true
  )
})

test('a normal duration wins over container bounds that match it', () => {
  const bounds = { startSec: 0, endSec: 180, anchored: true }
  const timeline = resolveMediaTimeline({
    duration: 180,
    currentTime: 0,
    seekable: [{ start: 0, end: 180 }],
    bounds,
  })
  assert.equal(timeline.span, 180)
  assert.equal(timeline.fraction, 0)
  assert.equal(
    shouldUseCustomTimeline({
      duration: 180,
      seekable: [{ start: 0, end: 180 }],
      src: 'https://example.com/set.webm',
      readyState: 4,
      bounds,
    }),
    false
  )
})

test('an inflated duration still maps a container range that starts at 0', () => {
  const bounds = { startSec: 0, endSec: LAST_PACKET_SEC, anchored: true }
  const atStart = resolveMediaTimeline({
    duration: 100000,
    currentTime: 0,
    seekable: [{ start: 0, end: Infinity }],
    bounds,
  })
  const atEnd = resolveMediaTimeline({
    duration: 100000,
    currentTime: LAST_PACKET_SEC,
    seekable: [{ start: 0, end: Infinity }],
    bounds,
  })
  assert.equal(atStart.fraction, 0)
  assert.ok(atEnd.fraction > 0.999)
  assert.ok(Math.abs(atStart.span - LAST_PACKET_SEC) < 0.001)
  assert.equal(
    shouldUseCustomTimeline({
      duration: 100000,
      seekable: [{ start: 0, end: Infinity }],
      src: 'https://example.com/set.webm',
      readyState: 4,
      bounds,
    }),
    true
  )
})

test('an unfinished mp4 does not lose its native controls', () => {
  assert.equal(
    shouldUseCustomTimeline({
      duration: NaN,
      seekable: [],
      src: 'https://example.com/clip.mp4',
      readyState: 0,
    }),
    false
  )
})

test('this live recording spans about 3607 seconds from the left edge to the right', () => {
  let head
  let tail
  try {
    ;({ head, tail } = readHeadTail(RECORDING))
  } catch {
    return
  }
  const header = inspectWebmHeader(head)
  assert.equal(header.hasDuration, false)
  assert.equal(header.scale, 1_000_000)

  const bounds = readWebmBounds(head, tail)
  assert.ok(bounds)
  assert.equal(bounds.anchored, true)
  assert.ok(bounds.startSec < 0.05, `start ${bounds.startSec}`)
  assert.ok(Math.abs(bounds.endSec - LAST_PACKET_SEC) < 1.5, `end ${bounds.endSec}`)

  const atStart = resolveMediaTimeline({
    duration: Infinity,
    currentTime: bounds.startSec,
    seekable: [{ start: 0, end: Infinity }],
    bounds,
  })
  const atEnd = resolveMediaTimeline({
    duration: Infinity,
    currentTime: bounds.endSec,
    seekable: [{ start: 0, end: Infinity }],
    bounds,
  })
  assert.ok(atStart.fraction < 0.001)
  assert.ok(atEnd.fraction > 0.999)
  assert.ok(atStart.span > 3600 && atStart.span < 3615, `span ${atStart.span}`)
  assert.equal(formatMediaClock(atStart.displayTime), '0:00')
  assert.equal(formatMediaClock(atStart.span), '60:07')

  const patched = insertWebmDuration(head, bounds.endSec - bounds.startSec)
  assert.ok(patched)
  const patchedHeader = inspectWebmHeader(patched.bytes)
  assert.equal(patchedHeader.hasDuration, true)
  const stitched = new Uint8Array(patched.bytes.length + head.length - patched.cut)
  stitched.set(patched.bytes, 0)
  stitched.set(head.subarray(patched.cut), patched.bytes.length)
  const reread = readWebmBounds(stitched, tail)
  assert.ok(reread)
  assert.ok(Math.abs(reread.endSec - bounds.endSec) < 0.05)
})
