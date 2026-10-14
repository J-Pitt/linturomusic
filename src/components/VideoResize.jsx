export function ResizeBar({ heightRef, commit, min, label }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuemin={min}
      aria-valuenow={Math.round(heightRef.current)}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        const handle = event.currentTarget
        handle.setPointerCapture(event.pointerId)
        const startY = event.clientY
        const startHeight = heightRef.current
        const onMove = (ev) => {
          commit(startHeight + (ev.clientY - startY))
        }
        const onUp = () => {
          handle.removeEventListener('pointermove', onMove)
          handle.removeEventListener('pointerup', onUp)
        }
        handle.addEventListener('pointermove', onMove)
        handle.addEventListener('pointerup', onUp)
      }}
      className="relative z-10 h-3 shrink-0 cursor-ns-resize touch-none flex items-center justify-center bg-ink"
    >
      <span className="h-px w-12 bg-mute/80" />
    </div>
  )
}
