import { useEffect, useRef } from 'react'

function LiveVideoTile({ stream, label, isLocal, cameraOn, audioKick }) {
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const initial = (label || '?').replace(/\s*\(You\)\s*$/, '').charAt(0).toUpperCase() || '?'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    const apply = () => {
      video.srcObject = cameraOn && stream ? stream : null
      if (cameraOn && stream) video.play().catch(() => {})
    }
    apply()
    if (!stream) return undefined
    stream.addEventListener('addtrack', apply)
    stream.addEventListener('removetrack', apply)
    return () => {
      stream.removeEventListener('addtrack', apply)
      stream.removeEventListener('removetrack', apply)
    }
  }, [stream, cameraOn])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isLocal) return undefined
    const apply = () => {
      audio.srcObject = stream || null
      if (stream) audio.play().catch(() => {})
    }
    apply()
    if (!stream) return undefined
    stream.addEventListener('addtrack', apply)
    stream.addEventListener('removetrack', apply)
    return () => {
      stream.removeEventListener('addtrack', apply)
      stream.removeEventListener('removetrack', apply)
    }
  }, [stream, isLocal, audioKick])

  return (
    <div className="relative aspect-video bg-black border border-hairline overflow-hidden">
      {cameraOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${isLocal ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-mute text-lg">
          {initial}
        </div>
      )}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline className="sr-only" />}
      <span className="absolute bottom-1 left-1 right-1 truncate text-[10px] uppercase tracking-[0.16em] bg-black/75 text-paper px-1.5 py-0.5">
        {label}
      </span>
    </div>
  )
}

export default function LiveAudienceGrid({ tiles, audioKick = 0 }) {
  return (
    <section
      className="shrink-0 border-t border-hairline bg-ink px-3 sm:px-4 py-3"
      aria-label="Everyone else"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs uppercase tracking-[0.24em] text-mute">Room</p>
        <p className="text-[11px] text-mute tabular-nums">{tiles.length}</p>
      </div>
      {tiles.length === 0 ? (
        <p className="text-xs text-mute">No one else in the room yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[32dvh] overflow-y-auto">
          {tiles.map((tile) => (
            <LiveVideoTile key={tile.key} audioKick={audioKick} {...tile} />
          ))}
        </div>
      )}
    </section>
  )
}
