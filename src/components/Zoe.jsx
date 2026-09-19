import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useRef, useState } from 'react'
import { config } from '../config'
import VolumeControl from './VolumeControl'
import SiteNav from './SiteNav'

const Zoe = () => {
  const navigate = useNavigate()
  const stageRef = useRef(null)
  const videoRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const lastVolumeRef = useRef(1)

  const applyVolume = (v = volume, m = muted) => {
    const el = videoRef.current
    if (!el) return
    el.volume = Math.max(0, Math.min(1, v))
    el.muted = m || v === 0
  }

  const handleVolumeChange = (next) => {
    const v = Math.max(0, Math.min(1, next))
    if (v > 0) lastVolumeRef.current = v
    setVolume(v)
    setMuted(v === 0)
    applyVolume(v, v === 0)
  }

  const handleToggleMute = () => {
    if (muted || volume === 0) {
      const restore = lastVolumeRef.current > 0 ? lastVolumeRef.current : 1
      setVolume(restore)
      setMuted(false)
      applyVolume(restore, false)
    } else {
      lastVolumeRef.current = volume > 0 ? volume : 1
      setMuted(true)
      applyVolume(volume, true)
    }
  }

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
    <section className="min-h-screen bg-ink relative overflow-hidden pb-16">
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
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-mute mb-3">For Zoe</p>
          <h1 className="text-2xl sm:text-3xl font-medium text-paper mb-2">linturo × zoe</h1>
          <p className="text-mute mb-8">A visual mix made for you.</p>

          <div className="border border-hairline overflow-hidden">
            <div
              ref={stageRef}
              className={`video-stage relative bg-black ${
                isFullscreen ? 'flex h-full w-full items-center justify-center' : 'aspect-video'
              }`}
            >
              <video
                id="zoe"
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                poster={config.VIDEO_FILES.ZOE_POSTER}
                className="w-full h-full object-contain"
                onLoadedMetadata={(e) => {
                  e.currentTarget.volume = volume
                  e.currentTarget.muted = muted || volume === 0
                }}
              >
                <source src={config.VIDEO_FILES.ZOE} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="absolute bottom-3 left-3 z-20 rounded bg-black/60 px-2 py-1.5 border border-white/15">
                <VolumeControl
                  volume={volume}
                  muted={muted}
                  onVolumeChange={handleVolumeChange}
                  onToggleMute={handleToggleMute}
                />
              </div>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute top-3 right-3 z-20 rounded bg-black/60 p-2 border border-white/15 text-white hover:bg-black/80"
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
      </div>
    </section>
  )
}

export default Zoe
