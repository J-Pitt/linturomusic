import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useRef, useState } from 'react'
import { config } from '../config'

const Zoe = () => {
  const navigate = useNavigate()
  const stageRef = useRef(null)
  const videoRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement
      setIsFullscreen(Boolean(el))
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    const stage = stageRef.current
    const video = videoRef.current
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
      video?.webkitEnterFullscreen?.()
    } catch {
      video?.webkitEnterFullscreen?.()
    }
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-indigo-950 relative overflow-hidden px-4 sm:px-6 lg:px-8 pb-16">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-72 h-72 sm:w-[28rem] sm:h-[28rem] bg-purple-600/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-24 w-72 h-72 sm:w-[28rem] sm:h-[28rem] bg-pink-600/20 rounded-full blur-3xl" />
      </div>

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
        className="relative z-10 max-w-4xl mx-auto pt-24 sm:pt-28"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-sm uppercase tracking-[0.28em] text-purple-400/90 mb-4 font-medium">
            For Zoe
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400 bg-clip-text text-transparent font-brand">
              linturo
            </span>
            <span className="text-white/90"> × zoe</span>
          </h1>
          <p className="text-lg text-purple-300/90 max-w-xl mx-auto leading-relaxed">
            A visual mix made for you.
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-purple-400/25 bg-black/50 shadow-[0_24px_80px_rgba(76,29,149,0.35)]">
          <div
            ref={stageRef}
            className={`video-stage relative bg-black ${isFullscreen ? 'flex h-full w-full items-center justify-center' : 'aspect-video'}`}
          >
            <video
              id="zoe"
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster={config.VIDEO_FILES.ZOE_POSTER}
              className="w-full h-full object-contain"
            >
              <source src={config.VIDEO_FILES.ZOE} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="absolute top-3 right-3 z-20 rounded-lg bg-black/55 p-2 border border-white/15 text-white hover:bg-black/75"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="h-5 w-5" />
              ) : (
                <ArrowsPointingOutIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

export default Zoe
