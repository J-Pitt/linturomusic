import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'

const LOGO_SRC = '/linturo-tag.png'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const [logoOpen, setLogoOpen] = useState(false)

  useEffect(() => {
    if (!logoOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLogoOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [logoOpen])

  return (
    <footer className="bg-ink border-t border-hairline">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
          <div>
            <button
              type="button"
              onClick={() => setLogoOpen(true)}
              className="mb-3 block focus-ring cursor-zoom-in"
              aria-label="View linturo logo larger"
            >
              <img
                src={LOGO_SRC}
                alt="linturo"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </button>
            <p className="text-sm text-mute max-w-sm">
              Playing music and making friends along the way.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-mute">
            <Link to="/clips" className="hover:text-paper transition-colors">
              Clips
            </Link>
          </nav>
        </div>

        <div className="border-t border-hairline mt-8 pt-6 text-xs text-mute">
          © {currentYear} linturo
        </div>
      </div>

      {logoOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLogoOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="linturo logo"
        >
          <button
            type="button"
            onClick={() => setLogoOpen(false)}
            className="absolute top-4 right-4 text-mute hover:text-paper transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-7 h-7" />
          </button>
          <img
            src={LOGO_SRC}
            alt="linturo"
            className="max-w-[min(92vw,900px)] max-h-[85vh] w-auto h-auto object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </footer>
  )
}

export default Footer
