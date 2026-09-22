import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { isAuthenticated, login, authBusy } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/live'
  const openHost = Boolean(location.state?.openHost || from === '/live')

  if (isAuthenticated) {
    return <Navigate to={from} replace state={openHost ? { openHost: true } : {}} />
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true, state: openHost ? { openHost: true } : {} })
    } catch (err) {
      setError(err?.message || 'Could not sign in')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-ink text-paper flex flex-col">
      <header className="px-4 sm:px-6 py-4 border-b border-hairline flex items-center justify-between">
        <Link to="/" className="text-xs uppercase tracking-[0.24em] text-mute hover:text-paper">
          linturo
        </Link>
        <Link to="/live" className="text-xs text-mute hover:text-paper">
          Live
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <form
          onSubmit={submit}
          className="w-full max-w-sm border border-hairline p-6 sm:p-8 space-y-5 bg-black/30"
        >
          <div className="space-y-2">
            <h1 className="text-xl font-medium tracking-tight">Sign in</h1>
            <p className="text-sm text-mute leading-relaxed">
              Admin access for live hosting, recordings, and future site tools.
            </p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-mute">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-hairline bg-black text-paper text-sm focus:outline-none focus:border-paper"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-mute">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-hairline bg-black text-paper text-sm focus:outline-none focus:border-paper"
            />
          </label>

          {error ? <p className="text-sm text-paper/90">{error}</p> : null}

          <button
            type="submit"
            disabled={authBusy}
            className="w-full px-4 py-3 bg-paper text-ink text-sm font-medium disabled:opacity-50"
          >
            {authBusy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
