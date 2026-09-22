import { useEffect, useRef, useState } from 'react'
import { formatTrimTime, trimVideoBlob } from '../lib/trimVideo'

export default function LiveRecordingReview({
  review,
  reviewTitle,
  onTitleChange,
  publishState,
  publishDetail,
  uploadProgress,
  onPublish,
  onDiscard,
}) {
  const videoRef = useRef(null)
  const [duration, setDuration] = useState(review?.duration || 0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(review?.duration || 0)
  const [trimBusy, setTrimBusy] = useState(false)
  const [trimDetail, setTrimDetail] = useState('')
  const [trimProgress, setTrimProgress] = useState(0)
  const [workingBlob, setWorkingBlob] = useState(review?.blob || null)
  const [workingUrl, setWorkingUrl] = useState(review?.url || '')
  const [trimmed, setTrimmed] = useState(false)

  useEffect(() => {
    setDuration(review?.duration || 0)
    setTrimStart(0)
    setTrimEnd(review?.duration || 0)
    setWorkingBlob(review?.blob || null)
    setWorkingUrl(review?.url || '')
    setTrimmed(false)
    setTrimDetail('')
    setTrimProgress(0)
  }, [review?.id, review?.blob, review?.url, review?.duration])

  useEffect(() => {
    return () => {
      if (workingUrl && workingUrl !== review?.url) {
        URL.revokeObjectURL(workingUrl)
      }
    }
  }, [workingUrl, review?.url])

  const onLoadedMeta = () => {
    const d = videoRef.current?.duration
    if (!Number.isFinite(d) || d <= 0) return
    setDuration(d)
    setTrimEnd((prev) => (prev <= 0 || prev > d ? d : prev))
  }

  const clampStart = (value) => {
    const next = Math.max(0, Math.min(value, trimEnd - 0.5))
    setTrimStart(next)
    if (videoRef.current) videoRef.current.currentTime = next
  }

  const clampEnd = (value) => {
    const cap = duration || review?.duration || value
    const next = Math.max(trimStart + 0.5, Math.min(value, cap))
    setTrimEnd(next)
  }

  const previewTrim = () => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = trimStart
    el.play().catch(() => {})
    const stopAt = trimEnd
    const onTime = () => {
      if (el.currentTime >= stopAt) {
        el.pause()
        el.removeEventListener('timeupdate', onTime)
      }
    }
    el.addEventListener('timeupdate', onTime)
  }

  const applyTrim = async () => {
    if (!workingBlob || trimBusy) return
    setTrimBusy(true)
    setTrimDetail('Rendering trimmed mix…')
    setTrimProgress(0)
    try {
      const nextBlob = await trimVideoBlob(workingBlob, {
        startSec: trimStart,
        endSec: trimEnd,
        onProgress: setTrimProgress,
      })
      if (workingUrl && workingUrl !== review?.url) {
        URL.revokeObjectURL(workingUrl)
      }
      const nextUrl = URL.createObjectURL(nextBlob)
      setWorkingBlob(nextBlob)
      setWorkingUrl(nextUrl)
      setTrimmed(true)
      setTrimDetail('Trim applied — publish this version or adjust again.')
      setDuration(trimEnd - trimStart)
      setTrimStart(0)
      setTrimEnd(trimEnd - trimStart)
    } catch (err) {
      console.error(err)
      setTrimDetail(err?.message || 'Could not trim recording')
    } finally {
      setTrimBusy(false)
      setTrimProgress(0)
    }
  }

  const publishDisabled =
    publishState === 'uploading' ||
    publishState === 'publishing' ||
    !reviewTitle.trim() ||
    trimBusy

  return (
    <div className="space-y-3 pt-2 border-t border-hairline">
      <p className="text-xs uppercase tracking-[0.24em] text-mute">Review take</p>
      <video
        ref={videoRef}
        src={workingUrl}
        controls
        playsInline
        onLoadedMetadata={onLoadedMeta}
        className="w-full aspect-video bg-black border border-hairline"
      />

      <div className="space-y-2 border border-hairline px-3 py-3 bg-black/40">
        <div className="flex items-center justify-between gap-2 text-[11px] text-mute">
          <span>Trim mix</span>
          <span className="tabular-nums text-paper/80">
            {formatTrimTime(trimStart)} – {formatTrimTime(trimEnd)}
            {duration ? ` · ${formatTrimTime(trimEnd - trimStart)} selected` : ''}
          </span>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] text-mute">Start</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, (duration || trimEnd) - 0.5)}
            step={0.1}
            value={trimStart}
            onChange={(e) => clampStart(Number(e.target.value))}
            disabled={trimBusy || publishState === 'uploading' || publishState === 'publishing'}
            className="w-full accent-paper h-1.5 bg-hairline rounded-full appearance-none cursor-pointer"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-mute">End</span>
          <input
            type="range"
            min={trimStart + 0.5}
            max={duration || review?.duration || trimEnd}
            step={0.1}
            value={trimEnd}
            onChange={(e) => clampEnd(Number(e.target.value))}
            disabled={trimBusy || publishState === 'uploading' || publishState === 'publishing'}
            className="w-full accent-paper h-1.5 bg-hairline rounded-full appearance-none cursor-pointer"
          />
        </label>
        {trimBusy && (
          <div className="h-1 bg-hairline">
            <div
              className="h-full bg-paper transition-all"
              style={{ width: `${Math.round(trimProgress * 100)}%` }}
            />
          </div>
        )}
        {trimDetail ? <p className="text-[11px] text-mute leading-relaxed">{trimDetail}</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={previewTrim}
            disabled={trimBusy}
            className="px-3 py-2 border border-hairline text-xs text-mute hover:text-paper disabled:opacity-50"
          >
            Preview selection
          </button>
          <button
            type="button"
            onClick={applyTrim}
            disabled={trimBusy || publishState === 'uploading' || publishState === 'publishing'}
            className="px-3 py-2 bg-paper text-ink text-xs font-medium disabled:opacity-50"
          >
            {trimBusy ? 'Trimming…' : trimmed ? 'Re-trim' : 'Apply trim'}
          </button>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs text-mute">Title for Videos</span>
        <input
          type="text"
          value={reviewTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-3 py-2 border border-hairline bg-black text-paper text-sm"
          disabled={publishState === 'uploading' || publishState === 'publishing'}
        />
      </label>
      {publishState === 'uploading' && (
        <div className="h-1 bg-hairline">
          <div
            className="h-full bg-paper transition-all"
            style={{ width: `${Math.round(uploadProgress * 100)}%` }}
          />
        </div>
      )}
      <p className="text-xs text-mute">{publishDetail}</p>
      <div className="flex flex-wrap gap-2">
        {publishState !== 'done' && (
          <button
            type="button"
            onClick={() => onPublish(workingBlob)}
            disabled={publishDisabled}
            className="flex-1 min-w-[8rem] px-4 py-2.5 bg-paper text-ink text-sm font-medium disabled:opacity-50"
          >
            {publishState === 'uploading' || publishState === 'publishing'
              ? 'Publishing…'
              : 'Add to Videos'}
          </button>
        )}
        <button
          type="button"
          onClick={onDiscard}
          className="px-4 py-2.5 border border-hairline text-sm text-mute hover:text-paper"
        >
          {publishState === 'done' ? 'Done' : 'Discard'}
        </button>
      </div>
    </div>
  )
}
