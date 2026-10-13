import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loadSiteStats } from '../lib/siteStats'

function CountTable({ title, empty, rows }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-[0.22em] text-mute">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-mute">{empty}</p>
      ) : (
        <div className="border border-hairline divide-y divide-hairline">
          {rows.map((row) => (
            <div key={row.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <span className="text-sm text-paper">{row.title}</span>
              <span className="text-sm tabular-nums text-mute">{row.plays}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function Stats() {
  const { isAuthenticated, user, logout } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    loadSiteStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load stats')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/stats' } }} />
  }

  return (
    <div className="min-h-[100dvh] bg-ink text-paper">
      <header className="px-4 sm:px-6 py-4 border-b border-hairline flex items-center justify-between gap-4">
        <Link to="/" className="text-xs uppercase tracking-[0.24em] text-mute hover:text-paper">
          linturo
        </Link>
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.18em]">
          <Link to="/live" state={{ openHost: true }} className="text-mute hover:text-paper">
            Live
          </Link>
          <button type="button" onClick={logout} className="text-mute hover:text-paper">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div className="space-y-2">
          <h1 className="text-xl font-medium tracking-tight">Site stats</h1>
          <p className="text-sm text-mute leading-relaxed">
            Signed in as {user?.email}. A visit is one browser each day. A play is the first time
            that browser starts a mix or video. Your signed-in sessions are not counted.
          </p>
        </div>

        {loading ? <p className="text-sm text-mute">Loading…</p> : null}
        {error ? <p className="text-sm text-paper/90">{error}</p> : null}

        {stats ? (
          <>
            <section className="border border-hairline px-4 py-5">
              <p className="text-xs uppercase tracking-[0.22em] text-mute">Visits</p>
              <p className="mt-2 text-4xl font-medium tabular-nums">{stats.visits}</p>
              {stats.days?.length ? (
                <ul className="mt-4 space-y-1">
                  {stats.days.map((day) => (
                    <li key={day.date} className="flex justify-between text-sm text-mute">
                      <span>{day.date}</span>
                      <span className="tabular-nums">{day.count}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <CountTable
              title="Videos"
              empty="No video plays yet."
              rows={stats.videos || []}
            />
            <CountTable title="Mixes" empty="No mix plays yet." rows={stats.mixes || []} />
          </>
        ) : null}
      </div>
    </div>
  )
}
