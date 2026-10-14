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
        const startY = event.clientY
        const startHeight = heightRef.current
        const onMove = (ev) => {
          commit(startHeight + (ev.clientY - startY))
        }
        const onUp = () => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
      }}
      className="relative z-20 h-9 shrink-0 cursor-ns-resize touch-none select-none flex items-center justify-center gap-3 border-y border-hairline bg-ink"
    >
      <span className="h-px w-8 bg-mute" />
      <span className="text-[10px] uppercase tracking-[0.22em] text-mute">Drag</span>
      <span className="h-px w-8 bg-mute" />
    </div>
  )
}
