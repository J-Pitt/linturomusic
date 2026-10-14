import { useRef, useState } from 'react'

function readHeight(key, fallback, min) {
  try {
    const saved = Number(sessionStorage.getItem(key))
    if (Number.isFinite(saved) && saved >= min) return saved
  } catch {
    /* ignore */
  }
  return fallback
}

export function useVideoHeight(storageKey, fallback, min) {
  const [height, setHeight] = useState(() => readHeight(storageKey, fallback, min))
  const heightRef = useRef(height)
  heightRef.current = height

  const commit = (next) => {
    const value = Math.max(min, Math.round(next))
    heightRef.current = value
    setHeight(value)
    try {
      sessionStorage.setItem(storageKey, String(value))
    } catch {
      /* ignore */
    }
  }

  return { height, heightRef, commit, min }
}
