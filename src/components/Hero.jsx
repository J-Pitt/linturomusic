import { motion } from 'framer-motion'
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  Bars3Icon,
  FilmIcon,
  MusicalNoteIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { config } from '../config'

const { MIX_TITLE, MIX_URL, VIDEO_URL } = config.FEATURED

const Hero = () => {
  const [showImageModal, setShowImageModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const audioRef = useRef(null)
  const videoRef = useRef(null)
  const playerContainerRef = useRef(null)
  const navigate = useNavigate()

  const syncVideoToAudio = (audioTime = 0) => {
    const video = videoRef.current
    if (!video?.duration) return
    video.currentTime = audioTime % video.duration
  }

  const pauseVideo = () => {
    videoRef.current?.pause()
  }

  const playVideo = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      video.muted = true
      video.loop = true
      syncVideoToAudio(audioRef.current?.currentTime ?? currentTime)
      await video.play()
    } catch {
      // Autoplay may be blocked until user interacts
    }
  }

  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00'
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSeek = (e) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const newTime = clickPosition * duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
    syncVideoToAudio(newTime)
  }

  const toggleFullscreen = async () => {
    const container = playerContainerRef.current
    if (!container) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (container.requestFullscreen) {
        await container.requestFullscreen()
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen()
      }
    } catch {
      // Fullscreen not supported or denied
    }
  }

  const handlePlayToggle = async () => {
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
          setCurrentTime(0)
          pauseVideo()
          syncVideoToAudio(0)
        })

        audioRef.current.addEventListener('error', () => {
          setIsPlaying(false)
          setIsLoading(false)
          setAudioError(true)
        })

        audioRef.current.src = MIX_URL
        await audioRef.current.load()
      } catch {
        setIsLoading(false)
        setAudioError(true)
        return
      }
    }

    if (isPlaying) {
      audioRef.current.pause()
      pauseVideo()
      setIsPlaying(false)
    } else {
      try {
        setIsLoading(true)
        await playVideo()
        await audioRef.current.play()
        setIsPlaying(true)
        setIsLoading(false)
      } catch {
        setIsPlaying(false)
        setIsLoading(false)
        setAudioError(true)
        pauseVideo()
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

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
              onClick={() => { navigate('/mixes'); setShowMenu(false) }}
              className="w-full px-4 py-3 text-left text-purple-200 hover:bg-purple-600/20 hover:text-white transition-colors duration-200 border-b border-purple-500/20"
            >
              Mixes
            </button>
            <button
              onClick={() => { navigate('/clips'); setShowMenu(false) }}
              className="w-full px-4 py-3 text-left text-purple-200 hover:bg-purple-600/20 hover:text-white transition-colors duration-200"
            >
              Clips
            </button>
          </motion.div>
        )}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center pt-8 sm:pt-12 lg:pt-16">
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
            Just a music lover looking to connect with like minded individuals. If you like my style, drop me a line, looking to play venues in Brooklyn and Manhattan.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/mixes')}
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            >
              <MusicalNoteIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              Mixes
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/clips')}
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-purple-400/60 text-purple-100 hover:bg-white/20 hover:border-pink-400/60"
            >
              <FilmIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              Clips
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.05 }}
            className="mt-10 sm:mt-12 max-w-2xl mx-auto"
          >
            <motion.div
              className="relative rounded-2xl overflow-hidden border border-purple-400/30 shadow-2xl shadow-purple-900/40 bg-gray-950/60 backdrop-blur-md"
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-purple-900/30 pointer-events-none z-10" />

              <div
                ref={playerContainerRef}
                className="relative aspect-video bg-black group/player [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:justify-center [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:bg-black"
              >
                <video
                  ref={videoRef}
                  src={VIDEO_URL}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className={`w-full h-full object-cover ${isFullscreen ? 'max-h-screen max-w-screen' : ''}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-10 pointer-events-none" />

                <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover/player:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    className="p-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-black/80 transition-colors"
                  >
                    {isFullscreen ? (
                      <ArrowsPointingInIcon className="w-5 h-5" />
                    ) : (
                      <ArrowsPointingOutIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {isFullscreen && (
                  <div className="absolute bottom-0 inset-x-0 z-20 px-4 sm:px-6 py-4 bg-gradient-to-t from-black/90 to-transparent">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="text-left">
                        <p className="text-xs uppercase tracking-widest text-emerald-300/90 font-medium">
                          Featured mix
                        </p>
                        <p className="text-lg font-semibold text-white">{MIX_TITLE}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePlayToggle}
                        disabled={isLoading}
                        className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white/15 border border-white/25 text-white hover:bg-white/25 transition-colors disabled:opacity-60"
                      >
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        ) : isPlaying ? (
                          <PauseIcon className="w-6 h-6" />
                        ) : (
                          <PlayIcon className="w-6 h-6 ml-0.5" />
                        )}
                      </button>
                    </div>
                    <div
                      className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden mb-2"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-purple-400"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/80">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative z-20 px-5 sm:px-6 py-5 sm:py-6 border-t border-purple-500/20 bg-gradient-to-r from-gray-950/90 to-purple-950/80">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-widest text-emerald-300/90 font-medium mb-1">
                      Featured mix
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{MIX_TITLE}</h2>
                    <p className="text-sm text-purple-300/80 mt-1">Waterfall · ambient loop</p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handlePlayToggle}
                    disabled={isLoading}
                    className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 disabled:opacity-60 ${
                      isPlaying
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    }`}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                    ) : isPlaying ? (
                      <PauseIcon className="w-7 h-7" />
                    ) : (
                      <PlayIcon className="w-7 h-7 ml-0.5" />
                    )}
                  </motion.button>
                </div>

                <div
                  className="w-full h-2 bg-gray-700/80 rounded-full cursor-pointer overflow-hidden mb-2"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-purple-400 transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-purple-200/90">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                {audioError && (
                  <p className="text-red-400 text-sm mt-3 text-left">
                    Audio temporarily unavailable. Please try again.
                  </p>
                )}

                <button
                  onClick={() => navigate('/mixes')}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 hover:text-white transition-colors"
                >
                  Browse all mixes
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
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
                className="w-3 bg-gradient-to-t from-emerald-400 to-purple-400 rounded-full"
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
