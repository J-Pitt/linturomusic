import { Link, useLocation } from 'react-router-dom'
import { SignalIcon } from '@heroicons/react/24/outline'

const HOME_LINKS = [
  { label: 'Videos', href: '#videos' },
  { label: 'Mixes', href: '#mixes' },
  { label: 'About', href: '#about' },
  { label: 'Book', href: '#contact' },
]

/**
 * Quiet shared chrome: small tag + sentence-case section links.
 * Live sits top-right as a dedicated entry.
 * On non-home routes, hash links go to `/#section`.
 */
export default function SiteNav({ className = '' }) {
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  const hrefFor = (hash) => (onHome ? hash : `/${hash}`)

  return (
    <header
      className={`relative z-40 flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8 py-5 ${className}`}
    >
      <Link to="/" className="shrink-0" aria-label="linturo home">
        <img
          src="/linturo-tag.png"
          alt="linturo"
          className="h-14 sm:h-16 w-auto object-contain"
        />
      </Link>
      <div className="flex items-center justify-end gap-3 sm:gap-5 min-w-0">
        <nav
          aria-label="Page sections"
          className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:gap-x-5 text-sm text-mute"
        >
          {HOME_LINKS.map((link) => (
            <a
              key={link.href}
              href={hrefFor(link.href)}
              className="hover:text-paper transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <Link
          to="/live"
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-hairline text-xs sm:text-sm uppercase tracking-[0.18em] text-paper hover:border-paper transition-colors"
          aria-label="Live stream"
        >
          <SignalIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Live
        </Link>
      </div>
    </header>
  )
}
