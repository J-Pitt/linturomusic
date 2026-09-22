import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearAuthSession,
  loadAuthSession,
  loginAdmin as loginAdminRequest,
} from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadAuthSession())
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'linturo-auth-session') {
        setSession(loadAuthSession())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async (email, password) => {
    setAuthBusy(true)
    try {
      const next = await loginAdminRequest({ email, password })
      setSession(next)
      return next
    } finally {
      setAuthBusy(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearAuthSession()
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user || null,
      accessToken: session?.accessToken || '',
      isAuthenticated: Boolean(session?.accessToken),
      authBusy,
      login,
      logout,
    }),
    [session, authBusy, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
