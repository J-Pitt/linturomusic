import { motion } from 'framer-motion'
import {
  ArrowDownIcon,
  HeartIcon,
  PauseIcon,
  PlayIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useState, useRef, useEffect, useMemo } from 'react'
import { config } from '../config'
import { formatCount, loadLikedIds, loadStats, recordPlay, toggleLike } from '../lib/stats'
import { fetchPublishedLiveVideos } from '../lib/liveRecord'
import VolumeControl from './VolumeControl'
import SiteNav from './SiteNav'

const LONG_ROAD_END_SEC = 3662
const YOUTUBE_PSYCHEDELIC_ID = 'STh_PJk7mpQ'
/** Flip to true when play numbers are worth showing again. Logging still runs either way. */
const SHOW_PLAY_COUNTS = false

let youtubeApiPromise

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return youtubeApiPromise
}

const RECENT_MIXES = [
  { id: 'shadows', title: 'Shadows', url: config.AUDIO_FILES.SHADOWS },
  { id: 'downAgain', title: 'Down Again', url: config.AUDIO_FILES.DOWN_AGAIN },
  { id: 'eternity', title: 'Eternity', url: config.AUDIO_FILES.ETERNITY },
  { id: 'theLight', title: 'The Light', url: config.AUDIO_FILES.THE_LIGHT },
  { id: 'proud', title: 'Be proud of you', url: config.AUDIO_FILES.PROUD },
  { id: 'theDeepestHouse', title: 'The Deepest House', url: config.AUDIO_FILES.THE_DEEPEST_HOUSE },
  { id: 'recharge', title: 'Recharge', url: config.AUDIO_FILES.RECHARGE },
  { id: 'reflections', title: 'Reflections', url: config.AUDIO_FILES.REFLECTIONS },
]

const FEATURED_VIDEOS = [
  {
    id: 'colorsWithin',
    /** Shareable hash: linturomusic.com/#the-colors-within */
    slug: 'the-colors-within',
    title: 'The Colors Within',
    subtitle: 'Visual mix · one hour',
    src: config.VIDEO_FILES.THE_COLORS_WITHIN,
    poster: config.VIDEO_FILES.THE_COLORS_WITHIN_POSTER,
  },
  {
    id: 'septLoop',
    /** Shareable hash: linturomusic.com/#sept-loop */
    slug: 'sept-loop',
    title: 'Sept Loop',
    subtitle: 'Visual mix · one hour',
    src: config.VIDEO_FILES.REC084_SEPT_LOOP,
    poster: config.VIDEO_FILES.REC084_SEPT_LOOP_POSTER,
  },
  {
    id: 'beginning',
    /** Shareable hash: linturomusic.com/#the-beginning */
    slug: 'the-beginning',
    title: 'The Beginning',
    subtitle: 'Visual mix · one hour',
    src: config.VIDEO_FILES.ETERNAL_BEGINNING,
    poster: config.VIDEO_FILES.ETERNAL_BEGINNING_POSTER,
  },
  {
    id: 'cityStreets',
    slug: 'city-streets',
    title: 'City Streets',
    subtitle: 'Visual mix · one hour',
    src: config.VIDEO_FILES.CITY_STREETS,
    poster: config.VIDEO_FILES.CITY_STREETS_POSTER,
  },
  {
    id: 'longRoad',
    slug: 'long-road',
    title: 'Long Road',
    subtitle: 'Long Road mix · one hour',
    type: 'youtube',
    youtubeId: YOUTUBE_PSYCHEDELIC_ID,
    mixUrl: config.AUDIO_FILES.LONG_ROAD,
    poster: 'https://linturomusic.s3.us-west-2.amazonaws.com/longroad-cover.png',
  },
  {
    id: 'clubSet',
    slug: 'club-set',
    title: 'Club Set',
    subtitle: 'Live set highlight',
    src: config.VIDEO_FILES.VIDEO2,
  },
  {
    id: 'linturo',
    slug: 'linturo',
    title: 'Linturo',
    subtitle: 'Handstyle Glitch · visual mix',
    src: config.VIDEO_FILES.LINTURO_GLITCH,
    poster: config.VIDEO_FILES.LINTURO_GLITCH_POSTER,
  },
]

function featuredFromHash(hash, list = FEATURED_VIDEOS) {
  const raw = (hash || '').replace(/^#/, '').trim().toLowerCase()
  if (!raw) return null
  // `#videos` / `#mixes` are section anchors — do not treat them as featured tabs
  if (raw === 'featured') return list[0]
  return (
    list.find(
      (v) =>
        v.slug === raw ||
        v.id.toLowerCase() === raw ||
        v.title.toLowerCase().replace(/\s+/g, '-') === raw
    ) || null
  )
}

const Hero = () => {
  const [currentSet, setCurrentSet] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [liveVideos, setLiveVideos] = useState([])
  const featuredVideos = useMemo(
    () => [...FEATURED_VIDEOS, ...liveVideos],
    [liveVideos]
  )
  const [audioError, setAudioError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [stats, setStats] = useState({})
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [featuredVideoId, setFeaturedVideoId] = useState(
    () =>
      (typeof window !== 'undefined' && featuredFromHash(window.location.hash)?.id) ||
      FEATURED_VIDEOS[0].id
  )
  const audioRef = useRef(null)
  const videoRef = useRef(null)
  const ytPlayerRef = useRef(null)
  const ytHostRef = useRef(null)
  const overlayAudioRef = useRef(null)
  const videoPlayCounted = useRef({})
  const featuredStageRef = useRef(null)
  const splashLogoRef = useRef(null)
  const pendingHashScroll = useRef(
    typeof window !== 'undefined' && !!featuredFromHash(window.location.hash)
  )
  const [ytPlaying, setYtPlaying] = useState(false)
  const [ytTime, setYtTime] = useState(0)
  const [ytReady, setYtReady] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const lastVolumeRef = useRef(1)
  const featuredVideo =
    featuredVideos.find((v) => v.id === featuredVideoId) || featuredVideos[0]
  const isYoutubeFeatured = featuredVideo.type === 'youtube'
  const isSmileGlitch = featuredVideo.id === 'rec059'

  useEffect(() => {
    let cancelled = false
    fetchPublishedLiveVideos().then((videos) => {
      if (cancelled) return
      setLiveVideos(videos)
      const fromHash = featuredFromHash(window.location.hash, [
        ...FEATURED_VIDEOS,
        ...videos,
      ])
      if (fromHash) setFeaturedVideoId(fromHash.id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const applyMediaVolume = (el, v = volume, m = muted) => {
    if (!el) return
    el.volume = Math.max(0, Math.min(1, v))
    el.muted = m || v === 0
  }

  const syncAllVolumes = (v, m) => {
    applyMediaVolume(videoRef.current, v, m)
    applyMediaVolume(audioRef.current, v, m)
    applyMediaVolume(overlayAudioRef.current, v, m)
  }

  const handleVolumeChange = (next) => {
    const v = Math.max(0, Math.min(1, next))
    if (v > 0) lastVolumeRef.current = v
    setVolume(v)
    setMuted(v === 0)
    syncAllVolumes(v, v === 0)
  }

  const handleToggleMute = () => {
    if (muted || volume === 0) {
      const restore = lastVolumeRef.current > 0 ? lastVolumeRef.current : 1
      setVolume(restore)
      setMuted(false)
      syncAllVolumes(restore, false)
    } else {
      lastVolumeRef.current = volume > 0 ? volume : 1
      setMuted(true)
      syncAllVolumes(volume, true)
    }
  }

  const pauseYoutubeVisual = () => {
    try {
      ytPlayerRef.current?.pauseVideo?.()
    } catch {
      // player may not be ready
    }
    overlayAudioRef.current?.pause()
    setYtPlaying(false)
  }

  const handleFeaturedTab = (id, { syncHash = true } = {}) => {
    setFeaturedVideoId((prev) => {
      if (prev !== id) {
        videoRef.current?.pause()
        pauseYoutubeVisual()
      }
      return id
    })
    if (syncHash) {
      const video = featuredVideos.find((v) => v.id === id)
      if (video && typeof window !== 'undefined') {
        const next = `#${video.slug}`
        if (window.location.hash !== next) {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`)
        }
      }
    }
  }

  const audioUrls = Object.fromEntries(RECENT_MIXES.map((m) => [m.id, m.url]))

  const scrollToVideos = () => {
    document.getElementById('videos')?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00'
    const hours = Math.floor(timeInSeconds / 3600)
    const minutes = Math.floor((timeInSeconds % 3600) / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    const mm = hours > 0 ? minutes.toString().padStart(2, '0') : String(minutes)
    const ss = seconds.toString().padStart(2, '0')
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
  }

  const handleSeek = (e) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const newTime = clickPosition * duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleAudioToggle = async (setType) => {
    const switching = currentSet !== setType
    if (switching) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setShowControls(false)
      setAudioError(false)
      setCurrentSet(setType)
    }

    if (audioError) {
      setAudioError(false)
      audioRef.current = null
    }

    if (!audioRef.current) {
      setIsLoading(true)
      try {
        audioRef.current = new Audio()
        audioRef.current.crossOrigin = 'anonymous'
        audioRef.current.preload = 'metadata'

        audioRef.current.addEventListener('loadedmetadata', () => {
          setIsLoading(false)
          setDuration(audioRef.current.duration)
        })

        audioRef.current.addEventListener('timeupdate', () => {
          setCurrentTime(audioRef.current.currentTime)
        })

        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false)
          setShowControls(false)
          setCurrentTime(0)
        })

        audioRef.current.addEventListener('error', () => {
          setIsPlaying(false)
          setIsLoading(false)
          setAudioError(true)
          setShowControls(false)
        })

        audioRef.current.src = audioUrls[setType]
        await audioRef.current.load()
        applyMediaVolume(audioRef.current, volume, muted)
      } catch {
        setIsLoading(false)
        setAudioError(true)
        return
      }
    }

    if (!switching && isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      setShowControls(false)
    } else {
      videoRef.current?.pause()
      pauseYoutubeVisual()
      try {
        setIsLoading(true)
        await audioRef.current.play()
        setIsPlaying(true)
        setShowControls(true)
        setIsLoading(false)
        recordPlay(setType).then((plays) => {
          if (plays == null) return
          setStats((prev) => ({
            ...prev,
            [setType]: { plays, likes: prev[setType]?.likes || 0 },
          }))
        })
      } catch {
        setIsPlaying(false)
        setIsLoading(false)
        setAudioError(true)
        setShowControls(false)
      }
    }
  }

  useEffect(() => {
    setLikedIds(loadLikedIds())
    loadStats().then(setStats).catch(() => {})
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      videoRef.current?.pause()
      pauseYoutubeVisual()
      try {
        ytPlayerRef.current?.destroy?.()
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    const applyHash = () => {
      const video = featuredFromHash(window.location.hash)
      if (!video) return
      pendingHashScroll.current = true
      handleFeaturedTab(video.id, { syncHash: false })
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!pendingHashScroll.current) return
    pendingHashScroll.current = false
    const t = window.setTimeout(() => {
      document.getElementById('videos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(t)
  }, [featuredVideoId])

  useEffect(() => {
    applyMediaVolume(videoRef.current, volume, muted)
  }, [featuredVideoId, volume, muted])

  useEffect(() => {
    const logo = splashLogoRef.current
    if (!logo) return
    logo.muted = true
    logo.defaultMuted = true
    logo.volume = 0
    logo.controls = false
    logo.playsInline = true
    logo.setAttribute('playsinline', '')
    logo.setAttribute('webkit-playsinline', '')
    logo.setAttribute('disablepictureinpicture', '')
    logo.removeAttribute('controls')
    const play = () => logo.play().catch(() => {})
    play()
    logo.addEventListener('canplay', play)
    return () => logo.removeEventListener('canplay', play)
  }, [])

  const clampHour = (t) => Math.max(0, Math.min(LONG_ROAD_END_SEC, t))

  const ensureOverlayMix = () => {
    if (overlayAudioRef.current) return overlayAudioRef.current
    const mix = new Audio(featuredVideo.mixUrl)
    mix.crossOrigin = 'anonymous'
    mix.addEventListener('timeupdate', () => {
      setYtTime(mix.currentTime || 0)
    })
    mix.addEventListener('ended', () => {
      try {
        ytPlayerRef.current?.pauseVideo?.()
        ytPlayerRef.current?.seekTo?.(0, true)
      } catch {
        // ignore
      }
      mix.currentTime = 0
      setYtPlaying(false)
      setYtTime(0)
    })
    overlayAudioRef.current = mix
    applyMediaVolume(mix, volume, muted)
    return mix
  }

  const stopHourClip = () => {
    try {
      ytPlayerRef.current?.pauseVideo?.()
      ytPlayerRef.current?.seekTo?.(0, true)
    } catch {
      // ignore
    }
    if (overlayAudioRef.current) {
      overlayAudioRef.current.pause()
      overlayAudioRef.current.currentTime = 0
    }
    setYtPlaying(false)
    setYtTime(0)
  }

  const toggleLongRoadPlay = async () => {
    const player = ytPlayerRef.current
    if (!player?.playVideo) return
    if (ytPlaying) {
      pauseYoutubeVisual()
      return
    }
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setShowControls(false)
    }
    videoRef.current?.pause()
    player.mute()
    const mix = ensureOverlayMix()
    const t = clampHour(mix.currentTime || player.getCurrentTime?.() || 0)
    player.seekTo(t, true)
    mix.currentTime = t
    player.playVideo()
    try {
      await mix.play()
      setYtPlaying(true)
    } catch {
      player.pauseVideo()
      setYtPlaying(false)
    }
  }

  const handleLongRoadSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const t = clampHour(((e.clientX - rect.left) / rect.width) * LONG_ROAD_END_SEC)
    try {
      ytPlayerRef.current?.seekTo?.(t, true)
    } catch {
      // ignore
    }
    const mix = ensureOverlayMix()
    mix.currentTime = t
    setYtTime(t)
  }

  const toggleFeaturedFullscreen = async (event) => {
    event?.stopPropagation()
    const stage = featuredStageRef.current
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

  useEffect(() => {
    if (!isYoutubeFeatured) {
      pauseYoutubeVisual()
      setYtReady(false)
      setYtTime(0)
      return undefined
    }

    const host = ytHostRef.current
    if (!host) return undefined

    const mount = document.createElement('div')
    mount.className = 'h-full w-full'
    host.replaceChildren(mount)

    let cancelled = false
    const watch = setInterval(() => {
      const player = ytPlayerRef.current
      if (!player?.getCurrentTime) return
      const t = player.getCurrentTime() || 0
      if (t >= LONG_ROAD_END_SEC) {
        stopHourClip()
        return
      }
    }, 250)

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mount.isConnected) return
      ytPlayerRef.current = new YT.Player(mount, {
        videoId: featuredVideo.youtubeId,
        width: '100%',
        height: '100%',
        host: 'https://www.youtube.com',
        playerVars: {
          autoplay: 0,
          start: 0,
          end: LONG_ROAD_END_SEC,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return
            event.target.mute()
            event.target.seekTo(0, true)
            setYtReady(true)
          },
          onStateChange: (event) => {
            if (cancelled) return
            const state = event.data
            if (state === YT.PlayerState.PLAYING) {
              event.target.mute()
              const t = event.target.getCurrentTime?.() || 0
              if (t >= LONG_ROAD_END_SEC) {
                stopHourClip()
                return
              }
              if (audioRef.current) {
                audioRef.current.pause()
                setIsPlaying(false)
                setShowControls(false)
              }
              videoRef.current?.pause()
              const mix = ensureOverlayMix()
              if (Math.abs((mix.currentTime || 0) - t) > 1.25) mix.currentTime = t
              mix.play().catch(() => {})
              setYtPlaying(true)
              if (!videoPlayCounted.current[featuredVideo.id]) {
                videoPlayCounted.current[featuredVideo.id] = true
                recordPlay(featuredVideo.id).then((plays) => {
                  if (plays == null) return
                  setStats((prev) => ({
                    ...prev,
                    [featuredVideo.id]: { plays, likes: prev[featuredVideo.id]?.likes || 0 },
                  }))
                })
              }
            }
            if (state === YT.PlayerState.PAUSED) {
              overlayAudioRef.current?.pause()
              setYtPlaying(false)
            }
            if (state === YT.PlayerState.ENDED) {
              stopHourClip()
              videoPlayCounted.current[featuredVideo.id] = false
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      clearInterval(watch)
      overlayAudioRef.current?.pause()
      setYtPlaying(false)
      setYtReady(false)
      try {
        ytPlayerRef.current?.destroy?.()
      } catch {
        // ignore
      }
      ytPlayerRef.current = null
      host.replaceChildren()
    }
  }, [isYoutubeFeatured, featuredVideo.id, featuredVideo.youtubeId, featuredVideo.mixUrl])

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

  const currentMix = RECENT_MIXES.find((m) => m.id === currentSet)

  return (
    <>
      {/* Splash */}
      <section className="relative min-h-screen bg-ink overflow-hidden flex flex-col">
        <SiteNav />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-16 pt-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
            className="splash-logo w-[175vw] max-w-none sm:w-[min(96vw,1280px)]"
            role="img"
            aria-label="linturo"
          >
            <video
              ref={splashLogoRef}
              className="splash-logo-video w-full h-auto block select-none"
              src={config.VIDEO_FILES.LINTURO_GLITCH}
              poster={config.VIDEO_FILES.LINTURO_GLITCH_POSTER}
              muted
              loop
              playsInline
              autoPlay
              preload="auto"
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload nofullscreen noremoteplayback"
              tabIndex={-1}
              aria-hidden="true"
              onContextMenu={(e) => e.preventDefault()}
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 text-xs sm:text-sm uppercase tracking-[0.28em] text-mute"
          >
            NYC/Brooklyn DJ
          </motion.p>
          <motion.button
            type="button"
            onClick={scrollToVideos}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: 0.7 },
              y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="mt-12 p-2 border border-hairline text-mute hover:text-paper hover:border-mute transition-colors"
            aria-label="Scroll to videos"
          >
            <ArrowDownIcon className="h-5 w-5" />
          </motion.button>
        </div>
      </section>

      {/* Videos */}
      <section id="videos" className="bg-ink border-t border-hairline scroll-mt-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="text-xs uppercase tracking-[0.28em] text-mute mb-6">Videos</p>

          <div
            role="tablist"
            aria-label="Featured visual mixes"
            className="mb-6 flex flex-wrap gap-x-5 gap-y-2"
          >
            {featuredVideos.map((video) => {
              const selected = featuredVideoId === video.id
              return (
                <button
                  key={video.id}
                  id={`tab-${video.slug}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={video.slug}
                  aria-label={video.title}
                  onClick={() => handleFeaturedTab(video.id)}
                  className={`text-sm sm:text-base pb-1 transition-colors duration-200 ${
                    selected
                      ? 'text-paper border-b border-paper'
                      : 'text-mute hover:text-paper border-b border-transparent'
                  }`}
                >
                  {video.title}
                </button>
              )
            })}
          </div>

          <div
            id="featured"
            className="relative scroll-mt-24 border border-hairline bg-black text-left"
          >
            {featuredVideos.map((video) => (
              <span
                key={video.slug}
                id={video.slug}
                className="absolute top-0 left-0 h-0 w-0 overflow-hidden"
                aria-hidden="true"
              />
            ))}
            <div
              ref={featuredStageRef}
              className={`video-stage relative bg-black ${
                isFullscreen ? 'flex h-full w-full items-center justify-center' : 'aspect-video'
              } ${isSmileGlitch ? 'smile-stage' : ''}`}
            >
              {isYoutubeFeatured ? (
                <div className="relative h-full w-full bg-black">
                  <div
                    ref={ytHostRef}
                    className="pointer-events-none h-full w-full [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full"
                  />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-black/30">
                    <button
                      type="button"
                      onClick={toggleLongRoadPlay}
                      disabled={!ytReady}
                      className="absolute inset-x-0 top-0 bottom-14 flex items-center justify-center disabled:opacity-50"
                      aria-label={ytPlaying ? 'Pause Long Road' : 'Play Long Road'}
                    >
                      {!ytPlaying && (
                        <span className="rounded-full bg-black/70 p-4 border border-white/20">
                          <PlayIcon className="h-10 w-10 text-white" />
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={toggleFeaturedFullscreen}
                      className="absolute top-3 right-3 z-20 rounded bg-black/60 p-2 border border-white/15 text-white hover:bg-black/80"
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullscreen ? (
                        <ArrowsPointingInIcon className="h-5 w-5" />
                      ) : (
                        <ArrowsPointingOutIcon className="h-5 w-5" />
                      )}
                    </button>
                    <div className="relative z-10 px-4 pb-3 pt-2">
                      <div
                        className="h-1 w-full cursor-pointer overflow-hidden rounded-full bg-hairline"
                        onClick={handleLongRoadSeek}
                      >
                        <div
                          className="h-full bg-paper"
                          style={{ width: `${(ytTime / LONG_ROAD_END_SEC) * 100}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-mute">
                        <span>{formatTime(ytTime)}</span>
                        <VolumeControl
                          volume={volume}
                          muted={muted}
                          onVolumeChange={handleVolumeChange}
                          onToggleMute={handleToggleMute}
                        />
                        <span>{formatTime(LONG_ROAD_END_SEC)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className={isSmileGlitch ? 'smile-fx w-full h-full' : 'w-full h-full'}>
                    <video
                      key={featuredVideo.id}
                      id={`player-${featuredVideo.slug}`}
                      ref={videoRef}
                      controls
                      playsInline
                      preload="metadata"
                      poster={featuredVideo.poster}
                      className="w-full h-full object-contain bg-black"
                      onLoadedMetadata={(e) => applyMediaVolume(e.currentTarget, volume, muted)}
                      onPlay={() => {
                        if (audioRef.current) {
                          audioRef.current.pause()
                          setIsPlaying(false)
                          setShowControls(false)
                        }
                        pauseYoutubeVisual()
                        if (videoPlayCounted.current[featuredVideo.id]) return
                        videoPlayCounted.current[featuredVideo.id] = true
                        recordPlay(featuredVideo.id).then((plays) => {
                          if (plays == null) return
                          setStats((prev) => ({
                            ...prev,
                            [featuredVideo.id]: {
                              plays,
                              likes: prev[featuredVideo.id]?.likes || 0,
                            },
                          }))
                        })
                      }}
                      onEnded={() => {
                        videoPlayCounted.current[featuredVideo.id] = false
                      }}
                    >
                      <source src={featuredVideo.src} type="video/mp4" />
                    </video>
                  </div>
                  <button
                    type="button"
                    onClick={toggleFeaturedFullscreen}
                    className="absolute top-3 right-3 z-20 rounded bg-black/60 p-2 border border-white/15 text-white hover:bg-black/80"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isFullscreen ? (
                      <ArrowsPointingInIcon className="h-5 w-5" />
                    ) : (
                      <ArrowsPointingOutIcon className="h-5 w-5" />
                    )}
                  </button>
                </>
              )}
            </div>
            <div className="px-5 py-4 sm:px-6 border-t border-hairline flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-paper text-lg sm:text-xl font-medium tracking-wide">
                  {featuredVideo.title}
                </p>
                <p className="text-mute text-sm mt-0.5">{featuredVideo.subtitle}</p>
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
                  onClick={toggleFeaturedFullscreen}
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
                    {formatCount(stats[featuredVideo.id]?.plays || 0)} plays
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleLike(featuredVideo.id, e)}
                  className={`inline-flex items-center gap-1.5 text-xs sm:text-sm tabular-nums transition-colors ${
                    likedIds.has(featuredVideo.id)
                      ? 'text-paper'
                      : 'text-mute hover:text-paper'
                  }`}
                  aria-label={
                    likedIds.has(featuredVideo.id)
                      ? `Unlike ${featuredVideo.title}`
                      : `Like ${featuredVideo.title}`
                  }
                >
                  {likedIds.has(featuredVideo.id) ? (
                    <HeartIconSolid className="w-5 h-5" />
                  ) : (
                    <HeartIcon className="w-5 h-5" />
                  )}
                  {formatCount(stats[featuredVideo.id]?.likes || 0)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mixes */}
      <section id="mixes" className="bg-ink border-t border-hairline scroll-mt-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="text-xs uppercase tracking-[0.28em] text-mute mb-6">Mixes</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RECENT_MIXES.map((mix) => {
              const active = currentSet === mix.id
              const playing = active && isPlaying
              const loading = isLoading && active
              const liked = likedIds.has(mix.id)
              const mixStats = stats[mix.id] || { plays: 0, likes: 0 }

              return (
                <div
                  key={mix.id}
                  className={`flex items-center gap-3 px-3 py-3 border transition-colors ${
                    playing
                      ? 'border-paper bg-white/[0.04]'
                      : 'border-hairline hover:border-mute/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleAudioToggle(mix.id)}
                    disabled={loading}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left disabled:opacity-60"
                    aria-label={playing ? `Pause ${mix.title}` : `Play ${mix.title}`}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b border-paper shrink-0" />
                    ) : playing ? (
                      <PauseIcon className="w-4 h-4 shrink-0 text-paper" />
                    ) : (
                      <PlayIcon className="w-4 h-4 shrink-0 text-mute" />
                    )}
                    <span
                      className={`truncate text-sm sm:text-base ${
                        playing ? 'text-paper' : 'text-mute'
                      }`}
                    >
                      {mix.title}
                    </span>
                  </button>
                  {SHOW_PLAY_COUNTS && (
                    <span className="text-[11px] sm:text-xs tabular-nums text-mute shrink-0">
                      {formatCount(mixStats.plays)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleLike(mix.id, e)}
                    className={`inline-flex items-center gap-1 text-[11px] sm:text-xs tabular-nums shrink-0 transition-colors ${
                      liked ? 'text-paper' : 'text-mute hover:text-paper'
                    }`}
                    aria-label={liked ? `Unlike ${mix.title}` : `Like ${mix.title}`}
                  >
                    {liked ? (
                      <HeartIconSolid className="w-3.5 h-3.5" />
                    ) : (
                      <HeartIcon className="w-3.5 h-3.5" />
                    )}
                    {formatCount(mixStats.likes)}
                  </button>
                </div>
              )
            })}
          </div>

          {showControls && currentMix && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 border border-hairline"
            >
              <p className="text-center text-mute text-sm mb-3">{currentMix.title}</p>
              <div
                className="w-full h-1 bg-hairline rounded-full cursor-pointer overflow-hidden mb-2"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-paper transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center gap-3 text-xs text-mute">
                <span>{formatTime(currentTime)}</span>
                <VolumeControl
                  volume={volume}
                  muted={muted}
                  onVolumeChange={handleVolumeChange}
                  onToggleMute={handleToggleMute}
                />
                <span>{formatTime(duration)}</span>
              </div>
            </motion.div>
          )}

          {audioError && (
            <p className="text-mute text-sm mt-3">
              Audio temporarily unavailable. Please try again.
            </p>
          )}
        </div>
      </section>
    </>
  )
}

export default Hero
