import { Link, useLocation } from 'react-router-dom'

const HOME_LINKS = [
  { label: 'Videos', href: '#videos' },
  { label: 'Mixes', href: '#mixes' },
  { label: 'About', href: '#about' },
  { label: 'Book', href: '#contact' },
]

/**
 * Quiet shared chrome: small tag + sentence-case section links.
 * On non-home routes, hash links go to `/#section`.
 */
export default function SiteNav({ className = '' }) {
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  const hrefFor = (hash) => (onHome ? hash : `/${hash}`)

  return (
    <header
      className={`relative z-40 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-5 ${className}`}
    >
      <Link to="/" className="shrink-0" aria-label="linturo home">
        <img
          src="/linturo-tag.png"
          alt="linturo"
          className="h-7 sm:h-8 w-auto object-contain"
        />
      </Link>
      <nav
        aria-label="Page sections"
        className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 sm:gap-x-6 text-sm text-mute"
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
    </header>
  )
}
