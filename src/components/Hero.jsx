import { motion } from 'framer-motion'
import {
  ArrowDownIcon,
  Bars3Icon,
  FilmIcon,
  MusicalNoteIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { config } from '../config'

const FEATURED_RECENT = [
  { id: 'echoes', title: 'Echoes', url: config.AUDIO_FILES.ECHOES },
  { id: 'summerHeat', title: 'Summer Heat', url: config.AUDIO_FILES.SUMMER_HEAT },
  { id: 'reflections', title: 'Reflections', url: config.AUDIO_FILES.REFLECTIONS },
  { id: 'recharge', title: 'Recharge', url: config.AUDIO_FILES.RECHARGE },
  { id: 'colors', title: 'Colors', url: config.AUDIO_FILES.COLORS },
  { id: 'takingOff', title: 'Taking Off', url: config.AUDIO_FILES.TAKING_OFF },
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
  const audioRef = useRef(null)
  const navigate = useNavigate()

  const audioUrls = Object.fromEntries(FEATURED_RECENT.map((m) => [m.id, m.url]))

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
  }

  const handleAudioToggle = async (setType) => {
    if (currentSet !== setType) {
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

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      setShowControls(false)
    } else {
      try {
        setIsLoading(true)
        await audioRef.current.play()
        setIsPlaying(true)
        setShowControls(true)
        setIsLoading(false)
      } catch {
        setIsPlaying(false)
        setIsLoading(false)
        setAudioError(true)
        setShowControls(false)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const currentMix = FEATURED_RECENT.find((m) => m.id === currentSet)

  return (
    <section className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 relative overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden">
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.05 }}
            className="mt-8 sm:mt-10 max-w-md mx-auto"
          >
            <p className="text-sm uppercase tracking-widest text-purple-400/90 mb-4 font-medium">
              Most Recent
            </p>

            <div className="flex flex-col gap-3">
              {FEATURED_RECENT.map((mix) => {
                const active = currentSet === mix.id
                const playing = active && isPlaying
                const loading = isLoading && active

                return (
                  <motion.button
                    key={mix.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAudioToggle(mix.id)}
                    disabled={loading}
                    className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 disabled:opacity-60 ${
                      playing
                        ? 'bg-gradient-to-r from-red-600/90 to-orange-600/90 text-white shadow-lg'
                        : 'bg-white/10 backdrop-blur-sm text-purple-100 border border-purple-500/40 hover:border-purple-400/60 hover:bg-white/15'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white shrink-0" />
                      ) : playing ? (
                        <PauseIcon className="w-5 h-5 shrink-0" />
                      ) : (
                        <PlayIcon className="w-5 h-5 shrink-0 text-pink-300" />
                      )}
                      {mix.title}
                    </span>
                  </motion.button>
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
