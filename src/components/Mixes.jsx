import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { config } from '../config'
import SiteNav from './SiteNav'
import VolumeControl from './VolumeControl'

const MIXES = [
  { id: 'infinity', title: 'Infinity', url: config.AUDIO_FILES.INFINITY },
  { id: 'letsGetDown', title: "Let's Get Down", url: config.AUDIO_FILES.LETS_GET_DOWN },
  { id: 'echoes', title: 'Echoes', url: config.AUDIO_FILES.ECHOES },
  { id: 'summerHeat', title: 'Summer Heat', url: config.AUDIO_FILES.SUMMER_HEAT },
  { id: 'colors', title: 'Colors', url: config.AUDIO_FILES.COLORS },
  { id: 'takingOff', title: 'Taking Off', url: config.AUDIO_FILES.TAKING_OFF },
  { id: 'springShowers', title: 'Spring Showers', url: config.AUDIO_FILES.SET7 },
  { id: 'nightSkies', title: 'Night Skies', url: config.AUDIO_FILES.SET2 },
  { id: 'deepHaus', title: 'Deep Haus', url: config.AUDIO_FILES.SET4 },
  { id: 'minimalHaus', title: 'Minimal Haus', url: config.AUDIO_FILES.SET5 },
  { id: 'summerRays', title: 'Summer Rays', url: config.AUDIO_FILES.SET6 },
  { id: 'summerSessions', title: 'Summer Sessions', url: config.AUDIO_FILES.SUMMER_SESSIONS },
  { id: 'organicHouse', title: 'Organic House', url: config.AUDIO_FILES.ORGANIC_HOUSE },
  { id: 'lastOfPastel', title: 'Last of Pastel', url: config.AUDIO_FILES.LAST_OF_PASTEL },
  { id: 'raindrops', title: 'Raindrops Are Falling', url: config.AUDIO_FILES.RAINDROPS },
  { id: 'midsummerDepths', title: 'Midsummer Depths', url: config.AUDIO_FILES.MIDSUMMER_DEPTHS },
  { id: 'horizonLine', title: 'Horizon Line', url: config.AUDIO_FILES.HORIZON_LINE },
  { id: 'getSome3', title: 'Get Some III', url: config.AUDIO_FILES.GET_SOME_3 },
  { id: 'closedCircuit', title: 'Closed Circuit', url: config.AUDIO_FILES.CLOSED_CIRCUIT },
  { id: 'moonlitSkies', title: 'Moonlit Skies', url: config.AUDIO_FILES.MOONLIT_SKIES },
  { id: 'secondProgression', title: 'Second Progression', url: config.AUDIO_FILES.SECOND_PROGRESSION },
  { id: 'getSome', title: 'Get Some', url: config.AUDIO_FILES.GET_SOME },
  { id: 'augustBloom', title: 'August Bloom', url: config.AUDIO_FILES.AUGUST_BLOOM },
  { id: 'julyHouse', title: 'July House', url: config.AUDIO_FILES.JULY_HOUSE },
  { id: 'juneTech', title: 'June Tech', url: config.AUDIO_FILES.JUNE_TECH },
  { id: 'uptempoHouse', title: 'Uptempo House', url: config.AUDIO_FILES.UPTEMPO_HOUSE },
  { id: 'earlyMay', title: 'Early May', url: config.AUDIO_FILES.EARLY_MAY },
  { id: 'lowLight', title: 'Low Light', url: config.AUDIO_FILES.LOW_LIGHT },
  { id: 'thirdProgression', title: 'Third Progression', url: config.AUDIO_FILES.THIRD_PROGRESSION },
  { id: 'juneHouse', title: 'June House', url: config.AUDIO_FILES.JUNE_HOUSE },
  { id: 'softProgression', title: 'Soft Progression', url: config.AUDIO_FILES.SOFT_PROGRESSION },
  { id: 'slowReturn', title: 'Slow Return', url: config.AUDIO_FILES.SLOW_RETURN },
  { id: 'minimalOrganic', title: 'Minimal Organic', url: config.AUDIO_FILES.MINIMAL_ORGANIC },
  { id: 'theLongClimb', title: 'The Long Climb', url: config.AUDIO_FILES.THE_LONG_CLIMB },
  { id: 'theSkyCalls', title: 'The Sky Calls', url: config.AUDIO_FILES.THE_SKY_CALLS },
  { id: 'futureSmiles', title: 'Future Smiles', url: config.AUDIO_FILES.FUTURE_SMILES },
  { id: 'groundBeneath', title: 'The Ground Beneath You', url: config.AUDIO_FILES.GROUND_BENEATH },
  { id: 'walkingBackwards', title: 'Walking Backwards', url: config.AUDIO_FILES.WALKING_BACKWARDS },
  { id: 'firstOfJune', title: 'First of June', url: config.AUDIO_FILES.FIRST_OF_JUNE },
  { id: 'marchLight', title: 'March Light', url: config.AUDIO_FILES.MARCH_LIGHT },
]

const Mixes = () => {
  const [currentSet, setCurrentSet] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const lastVolumeRef = useRef(1)
  const audioRef = useRef(null)
  const navigate = useNavigate()

  const audioUrls = Object.fromEntries(MIXES.map((m) => [m.id, m.url]))

  const handleSeek = (e) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const newTime = clickPosition * duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const stopAudio = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    audioRef.current = null
  }

  const handleAudioToggle = async (setType) => {
    const switching = currentSet !== setType
    if (switching) {
      stopAudio()
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
        audioRef.current.preload = 'metadata'
        audioRef.current.playbackRate = 1
        audioRef.current.defaultPlaybackRate = 1
        audioRef.current.preservesPitch = true
        audioRef.current.webkitPreservesPitch = true

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
        audioRef.current.volume = muted ? 0 : volume
        audioRef.current.muted = muted
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
    if (!audioRef.current) return
    audioRef.current.volume = muted ? 0 : volume
    audioRef.current.muted = muted
  }, [volume, muted])

  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [])

  const handleVolumeChange = (v) => {
    setVolume(v)
    if (v > 0) lastVolumeRef.current = v
    setMuted(v === 0)
  }

  const handleToggleMute = () => {
    if (muted || volume === 0) {
      const restore = lastVolumeRef.current || 1
      setVolume(restore)
      setMuted(false)
    } else {
      lastVolumeRef.current = volume || 1
      setMuted(true)
    }
  }

  const currentMix = MIXES.find((m) => m.id === currentSet)

  return (
    <section className="min-h-screen bg-ink pb-16">
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
          <p className="text-xs uppercase tracking-[0.28em] text-mute mb-3">Archive</p>
          <h1 className="text-2xl sm:text-3xl font-medium text-paper mb-3">Hour-long sets</h1>
          <p className="text-sm sm:text-base text-mute max-w-xl leading-relaxed mb-10">
            Longer mixes kept off the homepage.
          </p>

          {showControls && currentMix && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 border border-hairline"
            >
              <p className="text-center text-mute text-sm mb-3">{currentMix.title}</p>
              <div
                className="w-full h-1 bg-hairline cursor-pointer overflow-hidden mb-2"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-paper transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-center items-center text-xs text-mute">
                <VolumeControl
                  volume={volume}
                  muted={muted}
                  onVolumeChange={handleVolumeChange}
                  onToggleMute={handleToggleMute}
                />
              </div>
            </motion.div>
          )}

          {audioError && (
            <p className="text-mute text-sm mb-6">
              Audio temporarily unavailable. Please try again.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MIXES.map((mix, index) => {
              const playing = currentSet === mix.id && isPlaying
              const loading = isLoading && currentSet === mix.id
              const number = String(index + 1).padStart(2, '0')

              return (
                <button
                  key={mix.id}
                  type="button"
                  onClick={() => handleAudioToggle(mix.id)}
                  disabled={loading}
                  className={`flex items-center gap-3 px-3 py-3 border text-left transition-colors disabled:opacity-60 ${
                    playing
                      ? 'border-paper bg-white/[0.04]'
                      : 'border-hairline hover:border-mute/60'
                  }`}
                  aria-label={playing ? `Pause ${mix.title}` : `Play ${mix.title}`}
                >
                  <span className="tabular-nums text-xs text-mute shrink-0 w-6">{number}</span>
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b border-paper shrink-0" />
                  ) : playing ? (
                    <PauseIcon className="w-4 h-4 shrink-0 text-paper" />
                  ) : (
                    <PlayIcon className="w-4 h-4 shrink-0 text-mute" />
                  )}
                  <span className={`truncate text-sm sm:text-base ${playing ? 'text-paper' : 'text-mute'}`}>
                    {mix.title}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Mixes
