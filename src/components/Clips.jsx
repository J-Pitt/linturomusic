import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  Bars3Icon,
  FilmIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { config } from '../config'

const CLIPS = [
  {
    id: 'world-tour-1',
    title: 'World Tour Radio',
    subtitle: 'Live set highlight',
    src: config.VIDEO_FILES.VIDEO1,
  },
  {
    id: 'world-tour-2',
    title: 'World Tour Radio II',
    subtitle: 'Back on the decks',
    src: config.VIDEO_FILES.VIDEO2,
  },
  {
    id: 'rooftop',
    title: 'Rooftop Session',
    subtitle: 'Open air vibes',
    src: config.VIDEO_FILES.VIDEO3,
  },
  {
    id: 'tech-house',
    title: 'Tech House Clip',
    subtitle: 'Peak-time energy',
    src: config.VIDEO_FILES.VIDEO5,
  },
]

const Clips = () => {
  const [showMenu, setShowMenu] = useState(false)
  const [activeClip, setActiveClip] = useState(null)
  const navigate = useNavigate()

  return (
    <section className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-indigo-950 relative overflow-hidden px-4 sm:px-6 lg:px-8 pb-16">
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.12),_transparent_55%)]" />
      </motion.div>

      <div className="absolute top-6 left-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-purple-400/40 hover:bg-white/15 hover:border-purple-300/60 transition-all duration-200"
        >
          <ArrowLeftIcon className="w-5 h-5 text-purple-200" />
          <span className="text-purple-100 text-sm font-medium">Home</span>
        </motion.button>
      </div>

      <motion.div
        className="absolute top-6 right-6 z-50"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
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
            className="absolute right-0 mt-2 w-52 rounded-xl bg-gray-950/95 backdrop-blur-xl border border-purple-500/30 shadow-2xl shadow-purple-900/40 overflow-hidden"
          >
            <button
              onClick={() => {
                navigate('/')
                setShowMenu(false)
              }}
              className="w-full px-4 py-3.5 text-left text-purple-200 hover:bg-purple-600/25 hover:text-white transition-colors duration-200 border-b border-purple-500/20"
            >
              Home
            </button>
            <button
              onClick={() => {
                navigate('/mixes')
                setShowMenu(false)
              }}
              className="w-full px-4 py-3.5 text-left text-purple-200 hover:bg-purple-600/25 hover:text-white transition-colors duration-200"
            >
              Mixes
            </button>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className="relative z-10 max-w-6xl mx-auto pt-24 sm:pt-28"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-sm font-medium mb-6"
          >
            <FilmIcon className="w-4 h-4" />
            Performance clips
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400 bg-clip-text text-transparent font-brand">
              linturo
            </span>
            <span className="text-white/90"> clips</span>
          </h1>

          <p className="text-lg sm:text-xl text-purple-300/90 max-w-xl mx-auto leading-relaxed">
            Live sets, rooftop sessions, and moments from the booth.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
        >
          {CLIPS.map((clip, index) => (
            <motion.article
              key={clip.id}
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0 },
              }}
              onHoverStart={() => setActiveClip(clip.id)}
              onHoverEnd={() => setActiveClip(null)}
              className="group relative"
            >
              <motion.div
                className="absolute -inset-px rounded-2xl bg-gradient-to-br from-purple-500/50 via-pink-500/30 to-blue-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
                animate={activeClip === clip.id ? { opacity: 0.7 } : { opacity: 0 }}
              />

              <motion.div
                className="relative rounded-2xl overflow-hidden bg-gray-900/60 backdrop-blur-sm border border-purple-500/25 shadow-xl shadow-black/40"
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                <motion.div
                  className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: activeClip === clip.id ? 1 : 0.85, x: 0 }}
                >
                  <PlayCircleIcon className="w-4 h-4 text-pink-300" />
                  <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                    Clip {index + 1}
                  </span>
                </motion.div>

                <div className="aspect-video bg-black/80">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                    poster=""
                  >
                    <source src={clip.src} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                <motion.div
                  className="px-5 py-4 sm:px-6 sm:py-5 border-t border-purple-500/20 bg-gradient-to-r from-purple-950/80 to-gray-950/80"
                  initial={false}
                >
                  <h2 className="text-xl sm:text-2xl font-semibold text-white mb-1 group-hover:text-purple-100 transition-colors">
                    {clip.title}
                  </h2>
                  <p className="text-sm sm:text-base text-purple-300/80">{clip.subtitle}</p>
                </motion.div>
              </motion.div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          className="mt-14 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-900/50 hover:shadow-purple-700/40 transition-shadow duration-300"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to mixes
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Clips
