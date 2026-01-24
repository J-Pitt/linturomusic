import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bars3Icon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { config } from '../config'

const Clips = () => {
  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()

  return (
    <section className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 relative overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 sm:w-80 sm:h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 sm:w-80 sm:h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-20 left-20 w-40 h-40 sm:w-80 sm:h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Hamburger Menu */}
      <div className="absolute top-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-purple-400/50 hover:bg-white/20 transition-all duration-200"
        >
          <Bars3Icon className="w-6 h-6 text-purple-200" />
        </motion.button>

        {/* Dropdown Menu */}
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-md border border-purple-500/30 rounded-lg shadow-xl overflow-hidden"
          >
            <button
              onClick={() => {
                navigate('/')
                setShowMenu(false)
              }}
              className="w-full px-4 py-3 text-left text-purple-200 hover:bg-purple-600/20 hover:text-white transition-colors duration-200 border-b border-purple-500/20"
            >
              Home
            </button>
          </motion.div>
        )}
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/')}
          className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-purple-400/50 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-5 h-5 text-purple-200" />
          <span className="text-purple-200 text-sm">Back</span>
        </motion.button>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center pt-8 sm:pt-12 lg:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl sm:text-8xl lg:text-9xl font-bold text-white mb-8 sm:mb-12"
          >
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-brand">
              linturo
            </span>
          </motion.h1>

          {/* Video Title/Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <h2 className="text-2xl sm:text-3xl text-purple-200 mb-4">
              Latest Clips
            </h2>
            <p className="text-lg text-purple-300 mb-8">
              Check out my latest performances
            </p>
          </motion.div>

          {/* Video Player 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="max-w-4xl mx-auto mb-8"
          >
            <div className="rounded-lg overflow-hidden shadow-2xl border border-purple-500/30">
              <video
                controls
                className="w-full h-auto"
                preload="metadata"
              >
                <source src={config.VIDEO_FILES.VIDEO1} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>

          {/* Video Player 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="max-w-4xl mx-auto mb-8"
          >
            <div className="rounded-lg overflow-hidden shadow-2xl border border-purple-500/30">
              <video
                controls
                className="w-full h-auto"
                preload="metadata"
              >
                <source src={config.VIDEO_FILES.VIDEO2} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>

          {/* Video Player 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="max-w-4xl mx-auto mb-8"
          >
            <div className="rounded-lg overflow-hidden shadow-2xl border border-purple-500/30">
              <video
                controls
                className="w-full h-auto"
                preload="metadata"
              >
                <source src={config.VIDEO_FILES.VIDEO3} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>

          {/* Video Player 4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="max-w-4xl mx-auto mb-8"
          >
            <div className="rounded-lg overflow-hidden shadow-2xl border border-purple-500/30">
              <video
                controls
                className="w-full h-auto"
                preload="metadata"
              >
                <source src={config.VIDEO_FILES.VIDEO4} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>

          {/* Video Player 5 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="max-w-4xl mx-auto mb-8"
          >
            <div className="rounded-lg overflow-hidden shadow-2xl border border-purple-500/30">
              <video
                controls
                className="w-full h-auto"
                preload="metadata"
              >
                <source src={config.VIDEO_FILES.VIDEO5} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Clips

