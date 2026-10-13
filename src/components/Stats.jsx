import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loadSiteStats } from '../lib/siteStats'

function formatDuration(sec) {
  const total = Math.max(0, Math.round(Number(sec) || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours) return `${hours}h ${minutes}m`
  if (minutes) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function CountTable({ title, total, empty, rows }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xs uppercase tracking-[0.22em] text-mute">{title}</h2>
        <span className="text-sm tabular-nums text-paper">{total}</span>
      </div>
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
            Signed in as {user?.email}. A unique browser is counted once. A visit is that browser
            coming back on a new day. Time is counted while the tab is open and visible. A play is
            the first time that browser starts a mix or video. Your signed-in sessions are not
            counted.
          </p>
        </div>

        {loading ? <p className="text-sm text-mute">Loading…</p> : null}
        {error ? <p className="text-sm text-paper/90">{error}</p> : null}

        {stats ? (
          <>
            <section className="grid grid-cols-2 gap-px border border-hairline bg-hairline">
              {[
                ['Unique browsers', stats.uniques || 0],
                ['Visits', stats.visits || 0],
                ['Avg time on site', formatDuration(stats.avgTimeSec)],
                ['Time on site', formatDuration(stats.timeSec)],
              ].map(([label, value]) => (
                <div key={label} className="bg-ink px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-mute">{label}</p>
                  <p className="mt-2 text-2xl font-medium tabular-nums">{value}</p>
                </div>
              ))}
            </section>

            {stats.days?.length ? (
              <ul className="space-y-1">
                {stats.days.map((day) => (
                  <li key={day.date} className="flex justify-between text-sm text-mute">
                    <span>{day.date}</span>
                    <span className="tabular-nums">{day.count}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <CountTable
              title="Videos played"
              total={stats.videoPlays || 0}
              empty="No video plays yet."
              rows={stats.videos || []}
            />
            <CountTable
              title="Mixes played"
              total={stats.mixPlays || 0}
              empty="No mix plays yet."
              rows={stats.mixes || []}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
