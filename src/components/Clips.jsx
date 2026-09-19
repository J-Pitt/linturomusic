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

const CLIPS = [
  {
    id: 'patterns-visual',
    title: 'Patterns',
    subtitle: 'Visual mix',
    src: config.VIDEO_FILES.VIDEO6,
  },
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

const toggleClipFullscreen = async (stage, video) => {
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

const Clips = () => {
  const [activeClip, setActiveClip] = useState(null)
  const [fullscreenClip, setFullscreenClip] = useState(null)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const lastVolumeRef = useRef(1)
  const navigate = useNavigate()

  const applyVolumeToAll = (v = volume, m = muted) => {
    document.querySelectorAll('[data-clip-id] video').forEach((el) => {
      el.volume = Math.max(0, Math.min(1, v))
      el.muted = m || v === 0
    })
  }

  const handleVolumeChange = (next) => {
    const v = Math.max(0, Math.min(1, next))
    if (v > 0) lastVolumeRef.current = v
    setVolume(v)
    setMuted(v === 0)
    applyVolumeToAll(v, v === 0)
  }

  const handleToggleMute = () => {
    if (muted || volume === 0) {
      const restore = lastVolumeRef.current > 0 ? lastVolumeRef.current : 1
      setVolume(restore)
      setMuted(false)
      applyVolumeToAll(restore, false)
    } else {
      lastVolumeRef.current = volume > 0 ? volume : 1
      setMuted(true)
      applyVolumeToAll(volume, true)
    }
  }

  useEffect(() => {
    const onChange = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement
      setFullscreenClip(el?.getAttribute?.('data-clip-id') || null)
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  useEffect(() => {
    const apply = () => {
      const id = window.location.hash.replace(/^#/, '')
      if (!id || !CLIPS.some((c) => c.id === id)) return
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

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
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-mute mb-3">Clips</p>
          <h1 className="text-2xl sm:text-3xl font-medium text-paper mb-10 sm:mb-14">
            Selected clips and videos
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {CLIPS.map((clip) => (
              <article
                key={clip.id}
                id={clip.id}
                className="group scroll-mt-24 border border-hairline hover:border-mute transition-colors"
                onMouseEnter={() => setActiveClip(clip.id)}
                onMouseLeave={() => setActiveClip(null)}
              >
                <div
                  className={`video-stage relative bg-black ${
                    fullscreenClip === clip.id
                      ? 'flex h-full w-full items-center justify-center'
                      : 'aspect-video'
                  }`}
                  data-clip-id={clip.id}
                >
                  <video
                    id={`player-${clip.id}`}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                    poster=""
                    onLoadedMetadata={(e) => {
                      e.currentTarget.volume = volume
                      e.currentTarget.muted = muted || volume === 0
                    }}
                    onPlay={() => setActiveClip(clip.id)}
                  >
                    <source src={clip.src} type="video/mp4" />
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
                    onClick={(e) => {
                      const stage = e.currentTarget.parentElement
                      const video = stage?.querySelector('video')
                      toggleClipFullscreen(stage, video)
                    }}
                    className="absolute top-3 right-3 z-20 rounded bg-black/60 p-2 border border-white/15 text-white hover:bg-black/80"
                    aria-label={
                      fullscreenClip === clip.id ? 'Exit fullscreen' : 'Enter fullscreen'
                    }
                  >
                    {fullscreenClip === clip.id ? (
                      <ArrowsPointingInIcon className="h-5 w-5" />
                    ) : (
                      <ArrowsPointingOutIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="px-5 py-4 border-t border-hairline">
                  <h2
                    className={`text-lg font-medium transition-colors ${
                      activeClip === clip.id ? 'text-paper' : 'text-paper'
                    }`}
                  >
                    {clip.title}
                  </h2>
                  <p className="text-sm text-mute mt-0.5">{clip.subtitle}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-paper text-paper hover:bg-paper hover:text-ink transition-colors text-sm font-medium"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to home
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Clips
