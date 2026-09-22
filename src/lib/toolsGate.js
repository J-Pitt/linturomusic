export const TOOLS_PASSWORD = 'linturooo'
export const TOOLS_UNLOCK_KEY = 'linturo-tools-unlocked'

export function toolsUnlocked() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(TOOLS_UNLOCK_KEY) === '1'
}

export function unlockTools(password) {
  if (password !== TOOLS_PASSWORD) return false
  window.localStorage.setItem(TOOLS_UNLOCK_KEY, '1')
  return true
}
