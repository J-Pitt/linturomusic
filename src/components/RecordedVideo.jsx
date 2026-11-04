import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import {
  discoverWebmBounds,
  formatMediaClock,
  isWebmSrc,
  mediaTimeForFraction,
  resolveMediaTimeline,
  shouldUseCustomTimeline,
} from '../lib/mediaTimeline'

function seekableList(video) {
  const ranges = []
  if (!video) return ranges
  for (let i = 0; i < video.seekable.length; i++) {
    ranges.push({ start: video.seekable.start(i), end: video.seekable.end(i) })
  }
  return ranges
}

function videoSourceType(src) {
  if (isWebmSrc(src)) return 'video/webm'
  if (/\.mov(\?|#|$)/i.test(src || '')) return 'video/quicktime'
  return 'video/mp4'
}

/**
 * Native controls for ordinary files. MediaRecorder WebM (no duration, or a
 * seekable window stuck at the end of a huge timeline) gets a bar mapped to
 * the real picture range, labeled from 0:00.
 */
const RecordedVideo = forwardRef(function RecordedVideo(
  { id, src, poster, loop, className, onPlay, onEnded, onLoadedMetadata },
  ref
) {
  const innerRef = useRef(null)
  const barRef = useRef(null)
  const draggingRef = useRef(false)
  const [tick, setTick] = useState(0)
  const [bounds, setBounds] = useState(null)
  const [dragTime, setDragTime] = useState(null)

  const setRefs = useCallback(
    (node) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  useEffect(() => {
    setBounds(null)
    setDragTime(null)
    const video = innerRef.current
    if (!video || !src) return undefined
    let cancelled = false
    const ac = new AbortController()
    const bump = () => {
      if (!cancelled) setTick((n) => n + 1)
    }
    const events = [
      'loadedmetadata',
      'durationchange',
      'timeupdate',
      'progress',
      'seeked',
      'play',
      'pause',
      'ended',
    ]
    for (const name of events) video.addEventListener(name, bump)

    const probe = () => {
      if (cancelled || !isWebmSrc(src)) return
      discoverWebmBounds(src, ac.signal)
        .then((next) => {
          if (!cancelled && next) setBounds(next)
        })
        .catch(() => {})
    }
    if (video.readyState >= 1) probe()
    else video.addEventListener('loadedmetadata', probe, { once: true })

    return () => {
      cancelled = true
      ac.abort()
      for (const name of events) video.removeEventListener(name, bump)
    }
  }, [src])

  useEffect(() => {
    const video = innerRef.current
    if (!video || !bounds || !(bounds.startSec > 0.5)) return
    if (video.currentTime + 0.05 < bounds.startSec) {
      try {
        video.currentTime = bounds.startSec
      } catch {
        /* the element may not be seekable yet */
      }
    }
  }, [bounds, src])

  useEffect(() => {
    if (dragTime == null || draggingRef.current) return
    const node = innerRef.current
    if (node && Math.abs(node.currentTime - dragTime) < 0.75) setDragTime(null)
  }, [tick, dragTime])

  const video = innerRef.current
  const seekable = seekableList(video)
  const duration = video ? video.duration : NaN
  const timeline = resolveMediaTimeline({
    duration,
    currentTime: dragTime ?? video?.currentTime ?? 0,
    seekable,
    bounds,
  })
  const custom = video
    ? shouldUseCustomTimeline({
        duration,
        seekable,
        bounds,
        src,
        readyState: video.readyState,
      })
    : isWebmSrc(src)
  void tick

  const seekToClientX = (clientX) => {
    const el = barRef.current
    const node = innerRef.current
    if (!el || !node || !timeline.known) return
    const rect = el.getBoundingClientRect()
    const fraction = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
    const next = mediaTimeForFraction(timeline, fraction)
    setDragTime(next)
    try {
      node.currentTime = next
    } catch {
      /* seek can throw before metadata exists */
    }
  }

  const toggle = () => {
    const node = innerRef.current
    if (!node) return
    if (node.paused) void node.play().catch(() => {})
    else node.pause()
  }

  const onScrubKey = (event) => {
    if (!timeline.known) return
    const step = event.shiftKey ? 30 : 5
    let next = null
    if (event.key === 'ArrowRight') next = Math.min(timeline.end, (dragTime ?? video?.currentTime ?? timeline.start) + step)
    else if (event.key === 'ArrowLeft') next = Math.max(timeline.start, (dragTime ?? video?.currentTime ?? timeline.start) - step)
    else if (event.key === 'Home') next = timeline.start
    else if (event.key === 'End') next = timeline.end
    if (next == null) return
    event.preventDefault()
    const node = innerRef.current
    setDragTime(null)
    if (node) {
      try {
        node.currentTime = next
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div
      data-media-generation={tick}
      className="relative h-full w-full"
      onClick={
        custom
          ? (event) => {
              if (event.target.closest('[data-scrubber]')) return
              toggle()
            }
          : undefined
      }
    >
      <video
        id={id}
        ref={setRefs}
        controls={!custom}
        playsInline
        loop={loop}
        preload="metadata"
        poster={poster}
        className={className}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={onPlay}
        onEnded={onEnded}
      >
        <source src={src} type={videoSourceType(src)} />
      </video>
      {custom && (
        <div
          data-scrubber
          className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2.5 pt-8"
          onClick={(event) => event.stopPropagation()}
        >
          <div
            ref={barRef}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(timeline.span || 0)}
            aria-valuenow={Math.round(timeline.displayTime || 0)}
            aria-valuetext={
              timeline.known
                ? `${formatMediaClock(timeline.displayTime)} of ${formatMediaClock(timeline.span)}`
                : 'Loading duration'
            }
            className="relative h-4 cursor-pointer touch-none"
            onPointerDown={(event) => {
              if (!timeline.known) return
              draggingRef.current = true
              event.currentTarget.setPointerCapture(event.pointerId)
              seekToClientX(event.clientX)
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              seekToClientX(event.clientX)
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                seekToClientX(event.clientX)
              }
              draggingRef.current = false
            }}
            onPointerCancel={() => {
              draggingRef.current = false
            }}
            onKeyDown={onScrubKey}
          >
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full bg-paper"
                style={{ width: `${timeline.known ? timeline.fraction * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 text-[11px] tabular-nums text-white/85">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center gap-1 text-white/90 hover:text-white"
              aria-label={video && !video.paused ? 'Pause' : 'Play'}
            >
              {video && !video.paused ? (
                <PauseIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
            </button>
            <span>
              {formatMediaClock(timeline.displayTime)}
              <span className="text-white/55">
                {' / '}
                {timeline.known ? formatMediaClock(timeline.span) : '–'}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
})

export default RecordedVideo
