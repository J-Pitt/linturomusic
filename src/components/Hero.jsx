import { motion } from 'framer-motion'
import {
  ArrowDownIcon,
  Bars3Icon,
  HeartIcon,
  PauseIcon,
  PlayIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { config } from '../config'
import { formatCount, loadLikedIds, loadStats, recordPlay, toggleLike } from '../lib/stats'

const LONG_ROAD_END_SEC = 3662
const YOUTUBE_PSYCHEDELIC_ID = 'STh_PJk7mpQ'

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
  { id: 'proud', title: 'Proud', url: config.AUDIO_FILES.PROUD },
  { id: 'theDeepestHouse', title: 'The Deepest House', url: config.AUDIO_FILES.THE_DEEPEST_HOUSE },
  { id: 'recharge', title: 'Recharge', url: config.AUDIO_FILES.RECHARGE },
  { id: 'reflections', title: 'Reflections', url: config.AUDIO_FILES.REFLECTIONS },
]

const FEATURED_VIDEOS = [
  {
    id: 'beginning',
    title: 'The Beginning',
    subtitle: 'Visual mix · one hour',
    src: config.VIDEO_FILES.ETERNAL_BEGINNING,
    poster: config.VIDEO_FILES.ETERNAL_BEGINNING_POSTER,
  },
  {
    id: 'cityStreets',
    title: 'City Streets',
    subtitle: 'Visual mix · one hour',
    src: config.VIDEO_FILES.CITY_STREETS,
    poster: config.VIDEO_FILES.CITY_STREETS_POSTER,
  },
  {
    id: 'longRoad',
    title: 'Long Road',
    subtitle: 'Long Road mix · one hour',
    type: 'youtube',
    youtubeId: YOUTUBE_PSYCHEDELIC_ID,
    mixUrl: config.AUDIO_FILES.LONG_ROAD,
    poster: 'https://linturomusic.s3.us-west-2.amazonaws.com/longroad-cover.png',
  },
]

const Hero = () => {
  const [showImageModal, setShowImageModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [currentSet, setCurrentSet] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [stats, setStats] = useState({})
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [featuredVideoId, setFeaturedVideoId] = useState(FEATURED_VIDEOS[0].id)
  const audioRef = useRef(null)
  const videoRef = useRef(null)
  const ytPlayerRef = useRef(null)
  const overlayAudioRef = useRef(null)
  const videoPlayCounted = useRef({})
  const featuredStageRef = useRef(null)
  const [ytPlaying, setYtPlaying] = useState(false)
  const [ytTime, setYtTime] = useState(0)
  const [ytReady, setYtReady] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const navigate = useNavigate()
  const featuredVideo = FEATURED_VIDEOS.find((v) => v.id === featuredVideoId) || FEATURED_VIDEOS[0]
  const isYoutubeFeatured = featuredVideo.type === 'youtube'

  const pauseYoutubeVisual = () => {
    try {
      ytPlayerRef.current?.pauseVideo?.()
    } catch {
      // player may not be ready
    }
    overlayAudioRef.current?.pause()
    setYtPlaying(false)
  }

  const handleFeaturedTab = (id) => {
    if (id === featuredVideoId) return
    videoRef.current?.pause()
    pauseYoutubeVisual()
    setFeaturedVideoId(id)
  }

  const audioUrls = Object.fromEntries(RECENT_MIXES.map((m) => [m.id, m.url]))

  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
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
      try {
        ytPlayerRef.current?.destroy?.()
      } catch {
        // ignore
      }
      ytPlayerRef.current = null
      return undefined
    }

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
      if (cancelled || !document.getElementById('linturo-yt-longroad')) return
      ytPlayerRef.current = new YT.Player('linturo-yt-longroad', {
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
            event.target.mute()
            event.target.seekTo(0, true)
            setYtReady(true)
          },
          onStateChange: (event) => {
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
    <section className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 relative overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div className="absolute -top-20 -right-20 w-40 h-40 sm:w-80 sm:h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <motion.div className="absolute -bottom-20 -left-20 w-40 h-40 sm:w-80 sm:h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <motion.div className="absolute top-20 left-20 w-40 h-40 sm:w-80 sm:h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="absolute top-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-purple-400/50 hover:bg-white/20 transition-all duration-200"
        >
          <Bars3Icon className="w-6 h-6 text-purple-200" />
        </motion.button>

        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-md border border-purple-500/30 rounded-lg shadow-xl overflow-hidden"
          >
            <button
              onClick={() => { navigate('/clips'); setShowMenu(false) }}
              className="w-full px-4 py-3 text-left text-purple-200 hover:bg-purple-600/20 hover:text-white transition-colors duration-200"
            >
              Clips
            </button>
          </motion.div>
        )}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center pt-8 sm:pt-12 lg:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl sm:text-8xl lg:text-9xl font-bold text-white mb-4 sm:mb-6"
          >
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-brand">
              linturo
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-6 sm:mb-8"
          >
            <motion.img
              src="https://linturomusic.s3.us-west-2.amazonaws.com/profile.jpg"
              alt="Linturo DJ"
              onClick={() => setShowImageModal(true)}
              className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 mx-auto rounded-full object-cover shadow-2xl border-4 border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl sm:text-2xl lg:text-4xl text-purple-200 mb-6 sm:mb-8 max-w-2xl mx-auto"
          >
            Brooklyn based DJ
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-lg sm:text-xl text-purple-300 mb-8 sm:mb-10 max-w-xl mx-auto px-4"
          >
            I'm open to play at bars, clubs, or parties - really anywhere where music and people come together. If you like what you hear, don't hesitate to reach out!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.05 }}
            className="mt-8 sm:mt-10 max-w-2xl mx-auto"
          >
            <p className="text-sm uppercase tracking-widest text-purple-400/90 mb-4 font-medium">
              Recent Mixes
            </p>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {RECENT_MIXES.map((mix) => {
                const active = currentSet === mix.id
                const playing = active && isPlaying
                const loading = isLoading && active
                const liked = likedIds.has(mix.id)
                const mixStats = stats[mix.id] || { plays: 0, likes: 0 }

                return (
                  <div
                    key={mix.id}
                    className={`rounded-xl overflow-hidden transition-all duration-300 ${
                      playing
                        ? 'bg-gradient-to-r from-red-600/90 to-orange-600/90 text-white shadow-lg'
                        : 'bg-white/10 backdrop-blur-sm text-purple-100 border border-purple-500/40'
                    }`}
                  >
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleAudioToggle(mix.id)}
                      disabled={loading}
                      className="w-full flex items-center justify-between gap-2 px-3 pt-2.5 pb-1 sm:px-5 sm:pt-3.5 sm:pb-1.5 font-semibold disabled:opacity-60"
                    >
                      <span className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white shrink-0" />
                        ) : playing ? (
                          <PauseIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        ) : (
                          <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-pink-300" />
                        )}
                        <span className="truncate text-sm sm:text-base">{mix.title}</span>
                      </span>
                    </motion.button>
                    <div className="flex items-center justify-between px-3 pb-2 sm:px-5 sm:pb-2.5">
                      <span className={`text-[11px] sm:text-xs tabular-nums ${playing ? 'text-white/80' : 'text-purple-200/70'}`}>
                        {formatCount(mixStats.plays)} plays
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleLike(mix.id, e)}
                        className={`inline-flex items-center gap-1 text-[11px] sm:text-xs tabular-nums transition-colors ${
                          liked ? 'text-pink-300' : playing ? 'text-white/80 hover:text-white' : 'text-purple-200/80 hover:text-pink-300'
                        }`}
                        aria-label={liked ? `Unlike ${mix.title}` : `Like ${mix.title}`}
                      >
                        {liked ? (
                          <HeartIconSolid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        ) : (
                          <HeartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                        {formatCount(mixStats.likes)}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {showControls && currentMix && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-purple-500/30 text-left"
              >
                <p className="text-center text-purple-200 text-sm mb-3">{currentMix.title}</p>
                <div
                  className="w-full h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden mb-2"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-purple-200">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </motion.div>
            )}

            {audioError && (
              <p className="text-red-400 text-sm mt-3">
                Audio temporarily unavailable. Please try again.
              </p>
            )}

            <div className="mt-10 sm:mt-12">
              <p className="text-sm uppercase tracking-[0.28em] text-purple-400/90 mb-4 font-medium">
                Featured
              </p>
              <div
                role="tablist"
                aria-label="Featured visual mixes"
                className="mb-3 grid grid-cols-3 gap-2"
              >
                {FEATURED_VIDEOS.map((video) => {
                  const selected = featuredVideoId === video.id
                  return (
                    <button
                      key={video.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => handleFeaturedTab(video.id)}
                      className={`rounded-xl px-1.5 py-2.5 sm:px-4 sm:py-3 text-[11px] sm:text-base font-semibold leading-tight transition-all duration-200 ${
                        selected
                          ? 'bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white shadow-lg border border-transparent'
                          : 'bg-white/10 backdrop-blur-sm text-purple-100 border border-purple-500/40 hover:bg-white/15'
                      }`}
                    >
                      {video.title}
                    </button>
                  )
                })}
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-purple-400/25 bg-black/50 shadow-[0_24px_80px_rgba(76,29,149,0.35)] text-left">
                <div
                  ref={featuredStageRef}
                  className={`video-stage relative bg-black ${isFullscreen ? 'flex h-full w-full items-center justify-center' : 'aspect-video'}`}
                >
                  {isYoutubeFeatured ? (
                    <div className="relative h-full w-full bg-black">
                      <div
                        id="linturo-yt-longroad"
                        className="pointer-events-none h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-black/20">
                        <button
                          type="button"
                          onClick={toggleLongRoadPlay}
                          disabled={!ytReady}
                          className="absolute inset-x-0 top-0 bottom-14 flex items-center justify-center disabled:opacity-50"
                          aria-label={ytPlaying ? 'Pause Long Road' : 'Play Long Road'}
                        >
                          {!ytPlaying && (
                            <span className="rounded-full bg-black/55 p-4 border border-purple-400/40">
                              <PlayIcon className="h-10 w-10 text-white" />
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={toggleFeaturedFullscreen}
                          className="absolute top-3 right-3 z-20 rounded-lg bg-black/55 p-2 border border-white/15 text-white hover:bg-black/75"
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
                            className="h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-gray-700"
                            onClick={handleLongRoadSeek}
                          >
                            <div
                              className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                              style={{ width: `${(ytTime / LONG_ROAD_END_SEC) * 100}%` }}
                            />
                          </div>
                          <div className="mt-1.5 flex justify-between text-[11px] text-purple-200">
                            <span>{formatTime(ytTime)}</span>
                            <span>{formatTime(LONG_ROAD_END_SEC)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                  <>
                  <video
                    key={featuredVideo.id}
                    ref={videoRef}
                    controls
                    playsInline
                    preload="none"
                    poster={featuredVideo.poster}
                    className="w-full h-full object-contain bg-black"
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
                          [featuredVideo.id]: { plays, likes: prev[featuredVideo.id]?.likes || 0 },
                        }))
                      })
                    }}
                    onEnded={() => {
                      videoPlayCounted.current[featuredVideo.id] = false
                    }}
                  >
                    <source src={featuredVideo.src} type="video/mp4" />
                  </video>
                  <button
                    type="button"
                    onClick={toggleFeaturedFullscreen}
                    className="absolute top-3 right-3 z-20 rounded-lg bg-black/55 p-2 border border-white/15 text-white hover:bg-black/75"
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
                <div className="px-5 py-4 sm:px-6 border-t border-purple-500/20 bg-gradient-to-r from-purple-950/70 to-black/70 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-lg sm:text-xl font-semibold tracking-wide">
                      {featuredVideo.title}
                    </p>
                    <p className="text-purple-300/80 text-sm mt-0.5">
                      {featuredVideo.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      type="button"
                      onClick={toggleFeaturedFullscreen}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-purple-200/80 hover:text-white transition-colors"
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullscreen ? (
                        <ArrowsPointingInIcon className="w-5 h-5" />
                      ) : (
                        <ArrowsPointingOutIcon className="w-5 h-5" />
                      )}
                      <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full screen'}</span>
                    </button>
                    <span className="text-xs sm:text-sm text-purple-200/80 tabular-nums">
                      {formatCount(stats[featuredVideo.id]?.plays || 0)} plays
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleLike(featuredVideo.id, e)}
                      className={`inline-flex items-center gap-1.5 text-xs sm:text-sm tabular-nums transition-colors ${
                        likedIds.has(featuredVideo.id) ? 'text-pink-300' : 'text-purple-200/80 hover:text-pink-300'
                      }`}
                      aria-label={likedIds.has(featuredVideo.id) ? `Unlike ${featuredVideo.title}` : `Like ${featuredVideo.title}`}
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className={`flex justify-center space-x-3 items-end ${isPlaying ? 'mt-6' : 'mt-10'}`}
            style={{ height: '80px' }}
          >
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={isPlaying ? { height: [30, 80, 30] } : { height: 30 }}
                transition={{ duration: 0.6, repeat: isPlaying ? Infinity : 0, delay: i * 0.1 }}
                className="w-3 bg-gradient-to-t from-purple-400 to-pink-400 rounded-full"
                style={{ height: '30px' }}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className={`flex justify-center ${isPlaying ? 'mt-4' : 'mt-8'}`}
          >
            <motion.button
              onClick={scrollToAbout}
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-purple-400"
            >
              <ArrowDownIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-200" />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {showImageModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-4 -right-4 z-10 w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src="https://linturomusic.s3.us-west-2.amazonaws.com/profile.jpg"
              alt="Linturo DJ"
              className="w-full h-auto rounded-lg shadow-2xl border-4 border-purple-500/30"
            />
          </motion.div>
        </motion.div>
      )}
    </section>
  )
}

export default Hero
