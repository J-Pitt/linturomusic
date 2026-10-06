import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useEffect, useRef, useState } from 'react'
import { config } from '../config'
import { formatCount, loadLikedIds, loadStats, recordPlay, toggleLike } from '../lib/stats'
import VolumeControl from './VolumeControl'
import SiteNav from './SiteNav'

/** Flip to true when play numbers are worth showing again. Logging still runs either way. */
const SHOW_PLAY_COUNTS = false

const DUB_VIDEOS = [
  {
    id: 'deepDarkDub',
    /** Shareable hash: linturomusic.com/dub#deep-dark-dub */
    slug: 'deep-dark-dub',
    title: 'Deep dark dub',
    subtitle: 'DJ set · 32 min',
    src: config.VIDEO_FILES.DEEP_DARK_DUB,
    poster: config.VIDEO_FILES.DEEP_DARK_DUB_POSTER,
  },
  {
    id: 'deepDarkWubs',
    /** Shareable hash: linturomusic.com/dub#deep-dark-wubs */
    slug: 'deep-dark-wubs',
    title: 'Deep dark wubs',
    subtitle: 'DJ set · 3 min',
    src: config.VIDEO_FILES.DEEP_DARK_WUBS,
    poster: config.VIDEO_FILES.DEEP_DARK_WUBS_POSTER,
  },
]

function videoFromHash(hash) {
  const raw = (hash || '').replace(/^#/, '').trim().toLowerCase()
  if (!raw) return null
  return (
    DUB_VIDEOS.find(
      (v) =>
        v.slug === raw ||
        v.id.toLowerCase() === raw ||
        v.title.toLowerCase().replace(/\s+/g, '-') === raw
    ) || null
  )
}

const Dub = () => {
  const navigate = useNavigate()
  const [videoId, setVideoId] = useState(
    () =>
      (typeof window !== 'undefined' && videoFromHash(window.location.hash)?.id) ||
      DUB_VIDEOS[0].id
  )
  const [stats, setStats] = useState({})
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const lastVolumeRef = useRef(1)
  const videoRef = useRef(null)
  const stageRef = useRef(null)
  const playCounted = useRef({})

  const video = DUB_VIDEOS.find((v) => v.id === videoId) || DUB_VIDEOS[0]

  const applyMediaVolume = (el, v = volume, m = muted) => {
    if (!el) return
    el.volume = Math.max(0, Math.min(1, v))
    el.muted = m || v === 0
  }

  const handleVolumeChange = (next) => {
    const v = Math.max(0, Math.min(1, next))
    if (v > 0) lastVolumeRef.current = v
    setVolume(v)
    setMuted(v === 0)
    applyMediaVolume(videoRef.current, v, v === 0)
  }

  const handleToggleMute = () => {
    if (muted || volume === 0) {
      const restore = lastVolumeRef.current > 0 ? lastVolumeRef.current : 1
      setVolume(restore)
      setMuted(false)
      applyMediaVolume(videoRef.current, restore, false)
    } else {
      lastVolumeRef.current = volume > 0 ? volume : 1
      setMuted(true)
      applyMediaVolume(videoRef.current, volume, true)
    }
  }

  const selectVideo = (id, { syncHash = true } = {}) => {
    setVideoId((prev) => {
      if (prev !== id) videoRef.current?.pause()
      return id
    })
    if (syncHash) {
      const nextVideo = DUB_VIDEOS.find((v) => v.id === id)
      if (nextVideo && typeof window !== 'undefined') {
        const next = `#${nextVideo.slug}`
        if (window.location.hash !== next) {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`)
        }
      }
    }
  }

  useEffect(() => {
    setLikedIds(loadLikedIds())
    loadStats().then(setStats).catch(() => {})
    return () => videoRef.current?.pause()
  }, [])

  useEffect(() => {
    const applyHash = () => {
      const fromHash = videoFromHash(window.location.hash)
      if (!fromHash) return
      selectVideo(fromHash.id, { syncHash: false })
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    applyMediaVolume(videoRef.current, volume, muted)
  }, [videoId, volume, muted])

  const toggleFullscreen = async (event) => {
    event?.stopPropagation()
    const stage = stageRef.current
    const current = document.fullscreenElement || document.webkitFullscreenElement
    try {
      if (current) {
        if (document.exitFullscreen) await document.exitFullscreen()
        else document.webkitExitFullscreen?.()
        return
      }
      if (stage?.requestFullscreen) {
        await stage.requestFullscreen()
        return
      }
      if (stage?.webkitRequestFullscreen) {
        stage.webkitRequestFullscreen()
        return
      }
      videoRef.current?.webkitEnterFullscreen?.()
    } catch {
      videoRef.current?.webkitEnterFullscreen?.()
    }
  }

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement))
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const handleLike = async (id, event) => {
    event?.stopPropagation()
    const currentlyLiked = likedIds.has(id)
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (currentlyLiked) next.delete(id)
      else next.add(id)
      return next
    })
    setStats((prev) => ({
      ...prev,
      [id]: {
        plays: prev[id]?.plays || 0,
        likes: Math.max(0, (prev[id]?.likes || 0) + (currentlyLiked ? -1 : 1)),
      },
    }))
    const result = await toggleLike(id, currentlyLiked)
    if (result.likes != null) {
      setStats((prev) => ({
        ...prev,
        [id]: { plays: prev[id]?.plays || 0, likes: result.likes },
      }))
    }
    if (result.liked !== !currentlyLiked) {
      setLikedIds(loadLikedIds())
    }
  }

  return (
    <section className="min-h-screen bg-ink relative overflow-hidden pb-16">
      <SiteNav />

      <div className="px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-mute hover:text-paper transition-colors mb-8"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Home
        </button>

        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-mute mb-6">Dub</p>

          <div
            role="tablist"
            aria-label="Deep dark dub videos"
            className="mb-6 flex flex-wrap gap-x-5 gap-y-2"
          >
            {DUB_VIDEOS.map((item) => {
              const selected = video.id === item.id
              return (
                <button
                  key={item.id}
                  id={`tab-${item.slug}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={item.slug}
                  aria-label={item.title}
                  onClick={() => selectVideo(item.id)}
                  className={`text-sm sm:text-base pb-1 transition-colors duration-200 ${
                    selected
                      ? 'text-paper border-b border-paper'
                      : 'text-mute hover:text-paper border-b border-transparent'
                  }`}
                >
                  {item.title}
                </button>
              )
            })}
          </div>

          <div className="relative border border-hairline bg-black text-left">
            {DUB_VIDEOS.map((item) => (
              <span
                key={item.slug}
                id={item.slug}
                className="absolute top-0 left-0 h-0 w-0 overflow-hidden"
                aria-hidden="true"
              />
            ))}
            <div
              ref={stageRef}
              className={`video-stage relative bg-black ${
                isFullscreen ? 'flex h-full w-full items-center justify-center' : 'aspect-video'
              }`}
            >
              <video
                key={video.id}
                id={`player-${video.slug}`}
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                poster={video.poster}
                className="w-full h-full object-contain bg-black"
                onLoadedMetadata={(e) => applyMediaVolume(e.currentTarget, volume, muted)}
                onPlay={() => {
                  if (playCounted.current[video.id]) return
                  playCounted.current[video.id] = true
                  recordPlay(video.id).then((plays) => {
                    if (plays == null) return
                    setStats((prev) => ({
                      ...prev,
                      [video.id]: {
                        plays,
                        likes: prev[video.id]?.likes || 0,
                      },
                    }))
                  })
                }}
                onEnded={() => {
                  playCounted.current[video.id] = false
                }}
              >
                <source src={video.src} type="video/mp4" />
              </video>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute top-3 right-3 z-20 rounded bg-black/60 p-2 border border-white/15 text-white hover:bg-black/80"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="h-5 w-5" />
                ) : (
                  <ArrowsPointingOutIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="px-5 py-4 sm:px-6 border-t border-hairline flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-paper text-lg sm:text-xl font-medium tracking-wide">
                  {video.title}
                </p>
                <p className="text-mute text-sm mt-0.5">{video.subtitle}</p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <VolumeControl
                  volume={volume}
                  muted={muted}
                  onVolumeChange={handleVolumeChange}
                  onToggleMute={handleToggleMute}
                />
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-mute hover:text-paper transition-colors"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <ArrowsPointingInIcon className="w-5 h-5" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full screen'}</span>
                </button>
                {SHOW_PLAY_COUNTS && (
                  <span className="text-xs sm:text-sm text-mute tabular-nums">
                    {formatCount(stats[video.id]?.plays || 0)} plays
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleLike(video.id, e)}
                  className={`inline-flex items-center gap-1.5 text-xs sm:text-sm tabular-nums transition-colors ${
                    likedIds.has(video.id) ? 'text-paper' : 'text-mute hover:text-paper'
                  }`}
                  aria-label={
                    likedIds.has(video.id) ? `Unlike ${video.title}` : `Like ${video.title}`
                  }
                >
                  {likedIds.has(video.id) ? (
                    <HeartIconSolid className="w-5 h-5" />
                  ) : (
                    <HeartIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Dub
