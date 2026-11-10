import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SignalIcon } from '@heroicons/react/24/outline'

const HOME_LINKS = [
  { label: 'Videos', href: '#videos' },
  { label: 'Mixes', href: '#mixes' },
  { label: 'About', href: '#about' },
  { label: 'Book', href: '#contact' },
]

/**
 * Quiet shared chrome: small tag + sentence-case section links.
 * Live and Shop sit top-right as dedicated entries.
 * On non-home routes, hash links go to `/#section`.
 */
export default function SiteNav({ className = '' }) {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuth()
  const onHome = pathname === '/'

  const hrefFor = (hash) => (onHome ? hash : `/${hash}`)

  return (
    <header className={`relative z-40 px-4 sm:px-6 lg:px-8 py-4 ${className}`}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 md:flex md:items-center md:justify-between md:gap-4">
          <Link to="/" className="shrink-0 justify-self-start" aria-label="linturo home">
            <img
              src="/linturo-tag.png"
              alt="linturo"
              className="h-28 w-auto object-contain md:h-32"
            />
          </Link>
          <div className="shrink-0 justify-self-end md:order-last inline-flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/stats"
                className="text-xs uppercase tracking-[0.18em] text-mute hover:text-paper transition-colors"
              >
                Stats
              </Link>
            ) : null}
            <a
              href="https://linturodesigns.com"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-hairline text-xs sm:text-sm uppercase tracking-[0.18em] text-paper hover:border-paper transition-colors"
            >
              Shop
            </a>
            <Link
              to="/live"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-hairline text-xs sm:text-sm uppercase tracking-[0.18em] text-paper hover:border-paper transition-colors"
              aria-label="Live stream"
            >
              <SignalIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Live
            </Link>
          </div>
          <nav
            aria-label="Page sections"
            className="col-span-2 grid grid-cols-4 items-center gap-x-2 text-sm text-mute md:flex md:flex-wrap md:justify-end md:gap-x-5 md:ml-auto"
          >
            {HOME_LINKS.map((link) => (
              <a
                key={link.href}
                href={hrefFor(link.href)}
                className="text-center md:text-left hover:text-paper transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
    </header>
  )
}
