import { motion } from 'framer-motion'
import { ArrowDownIcon, Bars3Icon, FilmIcon, MusicalNoteIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Hero = () => {
  const [showImageModal, setShowImageModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()

  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
  }

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
            transition={{ duration: 0.5, delay: 1.1 }}
            className="flex justify-center space-x-3 items-end mt-12"
            style={{ height: '80px' }}
          >
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [30, 55, 30] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
                className="w-3 bg-gradient-to-t from-purple-400 to-pink-400 rounded-full opacity-60"
                style={{ height: '30px' }}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="flex justify-center mt-8"
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
