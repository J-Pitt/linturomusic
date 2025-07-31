import { motion } from 'framer-motion'
import { ArrowDownIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'

const Hero = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef(null)

  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleAudioToggle = async () => {
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
        })
        
        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false)
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
        })

        // Use S3 URL with CORS configured
        const audioUrl = 'https://linturomusic.s3.us-west-2.amazonaws.com/72825.WAV'
        
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
        setIsLoading(false)
      } catch (error) {
        console.error('Error playing audio:', error)
        setIsPlaying(false)
        setIsLoading(false)
        setAudioError(true)
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

      {/* Audio waves animation */}
      <div className="absolute bottom-8 sm:bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-1">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ height: [15, 40, 15] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
            className="w-1 bg-gradient-to-t from-purple-400 to-pink-400 rounded-full"
          />
        ))}
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
            className="text-5xl sm:text-7xl lg:text-9xl font-bold text-white mb-4 sm:mb-6"
          >
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-brand">
              linturo
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-lg sm:text-xl lg:text-3xl text-purple-200 mb-6 sm:mb-8 max-w-2xl mx-auto"
          >
            Brooklyn based house DJ
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-base sm:text-lg text-purple-300 mb-8 sm:mb-12 max-w-xl mx-auto px-4"
          >
            Just a music lover looking to connect with like minded individuals. Will play music anywhere, shoot me a note if you like my sets.
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
              onClick={handleAudioToggle}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : audioError ? (
                <>
                  <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Try Again
                </>
              ) : isPlaying ? (
                <>
                  <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Listen Now
                </>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToAbout}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-purple-400 text-purple-200 font-semibold rounded-lg hover:bg-purple-400 hover:text-white transition-all duration-300"
            >
              Learn More
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

          {/* Social stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-8 mb-8"
          >
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">50K+</div>
              <div className="text-purple-300 text-sm">Monthly Listeners</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">200+</div>
              <div className="text-purple-300 text-sm">Live Shows</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">25+</div>
              <div className="text-purple-300 text-sm">Original Tracks</div>
            </div>
          </motion.div>

          {/* Arrow button positioned between stats and audio waves */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="flex justify-center"
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