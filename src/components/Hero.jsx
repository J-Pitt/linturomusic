import { motion } from 'framer-motion'
import { ArrowDownIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'

const Hero = () => {
  const [currentSet, setCurrentSet] = useState(null) // 'set1' or 'set2'
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const audioRef = useRef(null)

  const audioUrls = {
    set1: 'https://linturomusic.s3.us-west-2.amazonaws.com/72825.WAV',
    set2: 'https://linturomusic.s3.us-west-2.amazonaws.com/summerSessions.WAV',
    set3: 'https://linturomusic.s3.us-west-2.amazonaws.com/521_house.wav'
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
  }

  const handleAudioToggle = async (setType) => {
    // If switching to a different set, stop current audio and reset
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
      // If there was an error, try to reload the audio
      setAudioError(false)
      audioRef.current = null
    }

    if (!audioRef.current) {
      setIsLoading(true)
      try {
        // Create audio element with CORS settings
        audioRef.current = new Audio()
        audioRef.current.crossOrigin = 'anonymous'
        audioRef.current.preload = 'metadata'
        
        // Set up event listeners
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
        
        audioRef.current.addEventListener('error', (e) => {
          console.error('Audio playback error:', e)
          console.error('Audio error details:', {
            error: e.target.error,
            networkState: e.target.networkState,
            readyState: e.target.readyState,
            src: e.target.src
          })
          setIsPlaying(false)
          setIsLoading(false)
          setAudioError(true)
          setShowControls(false)
        })

        // Use the appropriate audio URL
        const audioUrl = audioUrls[setType]
        
        // Set the source after setting up listeners
        audioRef.current.src = audioUrl
        
        // Try to load the audio
        await audioRef.current.load()
      } catch (error) {
        console.error('Error loading audio:', error)
        setIsLoading(false)
        setAudioError(true)
        return
      }
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      try {
        setIsLoading(true)
        await audioRef.current.play()
        setIsPlaying(true)
        setShowControls(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Error playing audio:', error)
        setIsPlaying(false)
        setIsLoading(false)
        setAudioError(true)
        setShowControls(false)
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <section className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 relative overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 sm:w-80 sm:h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 sm:w-80 sm:h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-20 left-20 w-40 h-40 sm:w-80 sm:h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Audio waves animation - positioned halfway between arrow and bottom */}
      <div className="absolute bottom-32 sm:bottom-36 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={isPlaying ? { height: [30, 80, 30] } : { height: 30 }}
            transition={{ duration: 0.6, repeat: isPlaying ? Infinity : 0, delay: i * 0.1 }}
            className="w-3 bg-gradient-to-t from-purple-400 to-pink-400 rounded-full"
            style={{ height: '30px' }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center pt-16 sm:pt-20 lg:pt-24">
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
            className="text-lg sm:text-xl text-purple-300 mb-8 sm:mb-12 max-w-xl mx-auto px-4"
          >
            Just a music lover looking to connect with like minded individuals. Will play music anywhere, drop me a line if you like my sets.
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
              onClick={() => handleAudioToggle('set1')}
              disabled={isLoading && currentSet === 'set1'}
              className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                currentSet === 'set1' && isPlaying 
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              }`}
            >
              {isLoading && currentSet === 'set1' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : audioError && currentSet === 'set1' ? (
                <>
                  <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Try Again
                </>
              ) : currentSet === 'set1' && isPlaying ? (
                <>
                  <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Pause Set 1
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Set 1
                </>
              )}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAudioToggle('set2')}
              disabled={isLoading && currentSet === 'set2'}
              className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                currentSet === 'set2' && isPlaying 
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              }`}
            >
              {isLoading && currentSet === 'set2' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : audioError && currentSet === 'set2' ? (
                <>
                  <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Try Again
                </>
              ) : currentSet === 'set2' && isPlaying ? (
                <>
                  <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Pause Set 2
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Set 2
                </>
              )}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAudioToggle('set3')}
              disabled={isLoading && currentSet === 'set3'}
              className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                currentSet === 'set3' && isPlaying 
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              }`}
            >
              {isLoading && currentSet === 'set3' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : audioError && currentSet === 'set3' ? (
                <>
                  <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Try Again
                </>
              ) : currentSet === 'set3' && isPlaying ? (
                <>
                  <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Pause Set 3
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Set 3
                </>
              )}
            </motion.button>
          </motion.div>

          {audioError && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm mt-4"
            >
              Audio temporarily unavailable. Please try again later.
            </motion.p>
          )}

          {/* Media Controls */}
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6 max-w-md mx-auto bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30"
            >
              {/* Progress Bar */}
              <div className="mb-3">
                <div
                  className="w-full h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Time Display */}
              <div className="flex justify-between items-center text-sm text-purple-200">
                <span>{formatTime(currentTime)}</span>
                <span className="text-xs text-purple-300">Now Playing</span>
                <span>{formatTime(duration)}</span>
              </div>
            </motion.div>
          )}

          {/* Arrow button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="flex justify-center mt-4"
          >
            <motion.button
              onClick={scrollToAbout}
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-purple-400"
            >
              <ArrowDownIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-200" />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero 