import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toolsUnlocked, unlockTools } from '../lib/toolsGate'

export default function FriendsGate({ title, children }) {
  const [unlocked, setUnlocked] = useState(() => toolsUnlocked())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (unlockTools(password.trim())) {
      setError('')
      setUnlocked(true)
      return
    }
    setError('Wrong password')
  }

  if (unlocked) return children

  return (
    <div className="min-h-[100dvh] bg-ink text-paper flex flex-col">
      <header className="px-4 sm:px-6 py-4 border-b border-hairline flex items-center justify-between">
        <Link to="/" className="text-xs uppercase tracking-[0.24em] text-mute hover:text-paper">
          linturo
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <form
          onSubmit={submit}
          className="w-full max-w-sm border border-hairline p-6 sm:p-8 space-y-5 bg-black/30"
        >
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-mute">Friends</p>
            <h1 className="text-xl font-medium tracking-tight">{title}</h1>
            <p className="text-sm text-mute leading-relaxed">
              This page is unlisted. Enter the password you were given.
            </p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-mute">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 border border-hairline bg-black text-paper text-sm focus:outline-none focus:border-paper"
            />
          </label>

          {error ? <p className="text-sm text-paper/90">{error}</p> : null}

          <button type="submit" className="w-full px-4 py-3 bg-paper text-ink text-sm font-medium">
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
