import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  Bars3Icon,
  MusicalNoteIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import { config } from '../config'

const MIXES = [
  { id: 'echoes', title: 'Echoes', url: config.AUDIO_FILES.ECHOES },
  { id: 'summerHeat', title: 'Summer Heat', url: config.AUDIO_FILES.SUMMER_HEAT },
  { id: 'reflections', title: 'Reflections', url: config.AUDIO_FILES.REFLECTIONS },
  { id: 'recharge', title: 'Recharge', url: config.AUDIO_FILES.RECHARGE },
  { id: 'colors', title: 'Colors', url: config.AUDIO_FILES.COLORS },
  { id: 'takingOff', title: 'Taking Off', url: config.AUDIO_FILES.TAKING_OFF },
  { id: 'set7', title: 'Spring Showers', url: config.AUDIO_FILES.SET7 },
  { id: 'set1', title: 'The Space Beyond', url: config.AUDIO_FILES.SET1 },
  { id: 'set2', title: 'Night Skies', url: config.AUDIO_FILES.SET2 },
  { id: 'set3', title: 'Tech House Tuesday', url: config.AUDIO_FILES.SET3 },
  { id: 'set4', title: 'Deep Haus', url: config.AUDIO_FILES.SET4 },
  { id: 'set5', title: 'Minimal Haus', url: config.AUDIO_FILES.SET5 },
  { id: 'set6', title: 'Summer Rays', url: config.AUDIO_FILES.SET6 },
]

const Mixes = () => {
  const [currentSet, setCurrentSet] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const audioRef = useRef(null)
  const navigate = useNavigate()

  const audioUrls = Object.fromEntries(MIXES.map((m) => [m.id, m.url]))

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

  const currentMix = MIXES.find((m) => m.id === currentSet)

  return (
    <section className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-indigo-950 relative overflow-hidden px-4 sm:px-6 lg:px-8 pb-16">
      <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div
          className="absolute -top-24 -right-24 w-72 h-72 sm:w-[28rem] sm:h-[28rem] bg-purple-600/30 rounded-full blur-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 -left-24 w-72 h-72 sm:w-[28rem] sm:h-[28rem] bg-pink-600/20 rounded-full blur-3xl"
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.12),_transparent_55%)]" />
      </motion.div>

      <div className="absolute top-6 left-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-purple-400/40 hover:bg-white/15 transition-all duration-200"
        >
          <ArrowLeftIcon className="w-5 h-5 text-purple-200" />
          <span className="text-purple-100 text-sm font-medium">Home</span>
        </motion.button>
      </div>

      <div className="absolute top-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowMenu(!showMenu)}
          className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-purple-400/40 hover:bg-white/15 transition-all duration-200"
        >
          <Bars3Icon className="w-6 h-6 text-purple-200" />
        </motion.button>

        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute right-0 mt-2 w-52 rounded-xl bg-gray-950/95 backdrop-blur-xl border border-purple-500/30 shadow-2xl overflow-hidden"
          >
            <button
              onClick={() => { navigate('/'); setShowMenu(false) }}
              className="w-full px-4 py-3.5 text-left text-purple-200 hover:bg-purple-600/25 hover:text-white transition-colors border-b border-purple-500/20"
            >
              Home
            </button>
            <button
              onClick={() => { navigate('/clips'); setShowMenu(false) }}
              className="w-full px-4 py-3.5 text-left text-purple-200 hover:bg-purple-600/25 hover:text-white transition-colors"
            >
              Clips
            </button>
          </motion.div>
        )}
      </div>

      <motion.div
        className="relative z-10 max-w-3xl mx-auto pt-24 sm:pt-28"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <motion.div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-sm font-medium mb-6">
            <MusicalNoteIcon className="w-4 h-4" />
            DJ mixes
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400 bg-clip-text text-transparent font-brand">
              linturo
            </span>
            <span className="text-white/90"> mixes</span>
          </h1>
          <p className="text-lg sm:text-xl text-purple-300/90 max-w-xl mx-auto">
            House, tech house, and deep cuts from the booth.
          </p>
        </motion.div>

        {showControls && currentMix && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-2xl bg-gray-900/70 backdrop-blur-md border border-purple-500/30 shadow-xl"
          >
            <p className="text-center text-purple-200 font-medium mb-4">{currentMix.title}</p>
            <div className="mb-3">
              <div
                className="w-full h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center text-sm text-purple-200">
              <span>{formatTime(currentTime)}</span>
              <span className="text-xs text-purple-300">Now Playing</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="flex justify-center gap-1.5 mt-5 items-end h-12">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={isPlaying ? { height: [12, 40, 12] } : { height: 12 }}
                  transition={{ duration: 0.6, repeat: isPlaying ? Infinity : 0, delay: i * 0.08 }}
                  className="w-2 bg-gradient-to-t from-purple-400 to-pink-400 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        )}

        {audioError && (
          <p className="text-center text-red-400 text-sm mb-6">
            Audio temporarily unavailable. Please try again.
          </p>
        )}

        <motion.div
          className="flex flex-col gap-3 sm:gap-4"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {MIXES.map((mix) => {
            const active = currentSet === mix.id
            const playing = active && isPlaying
            const loading = isLoading && active

            return (
              <motion.button
                key={mix.id}
                variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
                whileHover={{ scale: 1.01, x: 4 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleAudioToggle(mix.id)}
                disabled={loading}
                className={`group w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 rounded-2xl font-semibold text-left transition-all duration-300 disabled:opacity-60 ${
                  playing
                    ? 'bg-gradient-to-r from-red-600/90 to-orange-600/90 text-white border border-orange-400/40 shadow-lg shadow-orange-900/30'
                    : active
                      ? 'bg-purple-900/60 text-white border border-purple-400/50'
                      : 'bg-gray-900/50 backdrop-blur-sm text-purple-100 border border-purple-500/25 hover:border-purple-400/50 hover:bg-purple-900/30'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white shrink-0" />
                  ) : playing ? (
                    <PauseIcon className="w-6 h-6 shrink-0" />
                  ) : (
                    <PlayIcon className="w-6 h-6 shrink-0 text-pink-300 group-hover:text-pink-200" />
                  )}
                  <span className="truncate text-base sm:text-lg">{mix.title}</span>
                </span>
                {playing && (
                  <span className="text-xs uppercase tracking-wider text-white/80 shrink-0">Playing</span>
                )}
              </motion.button>
            )
          })}
        </motion.div>

        <motion.div className="mt-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to home
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Mixes
