import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline'

/**
 * Compact mute + slider for HTMLMediaElement / overlay audio.
 */
export default function VolumeControl({
  volume = 1,
  muted = false,
  onVolumeChange,
  onToggleMute,
  className = '',
}) {
  const level = muted ? 0 : volume

  return (
    <div
      className={`inline-flex items-center gap-1.5 sm:gap-2 ${className}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onToggleMute}
        className="rounded-md p-1 text-purple-200/90 hover:text-white transition-colors"
        aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
      >
        {muted || volume === 0 ? (
          <SpeakerXMarkIcon className="h-5 w-5" />
        ) : (
          <SpeakerWaveIcon className="h-5 w-5" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={level}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        className="volume-slider w-16 sm:w-24 h-1.5 cursor-pointer accent-pink-400"
        aria-label="Volume"
      />
    </div>
  )
}
