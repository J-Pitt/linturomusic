import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SignalIcon, XMarkIcon } from '@heroicons/react/24/outline'

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
  const [specialOpen, setSpecialOpen] = useState(false)

  const hrefFor = (hash) => (onHome ? hash : `/${hash}`)

  useEffect(() => {
    if (!specialOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setSpecialOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [specialOpen])

  return (
    <>
      <header
        className={`relative z-40 px-4 sm:px-6 lg:px-8 py-4 ${className}`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 md:flex md:items-center md:justify-between md:gap-4">
          <Link to="/" className="shrink-0 justify-self-start" aria-label="linturo home">
            <img
              src="/linturo-tag.png"
              alt="linturo"
              className="h-28 w-auto object-contain md:h-32"
            />
          </Link>
          <Link
            to="/live"
            className="shrink-0 justify-self-end md:order-last inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-hairline text-xs sm:text-sm uppercase tracking-[0.18em] text-paper hover:border-paper transition-colors"
            aria-label="Live stream"
          >
            <SignalIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Live
          </Link>
          <button
            type="button"
            onClick={() => setSpecialOpen(true)}
            className="fall-special col-span-2 justify-self-start"
          >
            Click for Fall Special
          </button>
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

      {specialOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setSpecialOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fall-special-title"
        >
          <div
            className="relative w-full max-w-md border border-hairline bg-ink px-6 py-8 sm:px-8 sm:py-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSpecialOpen(false)}
              className="absolute top-3 right-3 text-mute hover:text-paper transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <p
              id="fall-special-title"
              className="text-xs uppercase tracking-[0.22em] text-paper mb-6"
            >
              Fall Special
            </p>
            <div className="space-y-4 text-sm text-mute leading-relaxed">
              <p>
                Thursday and Friday bookings before 1am free for first time
                venues! (1 hour slot — equipment must be provided). After that
                it&apos;s $150/hr. I would appreciate 30 mins to get familiar
                with the equipment before I play. If I need to bring my own
                deck I charge $300/hr.
              </p>
              <p>
                House parties/rooftops/basements are free for first time
                bookings as well, just pay for my transport (I have to uber my
                equipment) and we&apos;re good, up to a 2 hour set, unless
                it&apos;s banging, then who knows 🫠 I love a good house
                party..
              </p>
              <p>Brooklyn/Manhattan area only</p>
            </div>
            <a
              href={hrefFor('#contact')}
              onClick={() => setSpecialOpen(false)}
              className="inline-block mt-8 text-sm text-paper border-b border-paper pb-0.5 hover:text-mute hover:border-mute transition-colors"
            >
              Book
            </a>
          </div>
        </div>
      )}
    </>
  )
}
