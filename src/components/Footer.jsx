import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-ink border-t border-hairline">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
          <div>
            <Link to="/" aria-label="linturo home">
              <img
                src="/linturo-tag.png"
                alt="linturo"
                className="h-8 w-auto object-contain mb-3"
              />
            </Link>
            <p className="text-sm text-mute max-w-sm">
              Playing music and making friends along the way.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-mute">
            <a
              href="https://www.mixcloud.com/linturo/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-paper transition-colors"
            >
              Mixcloud
            </a>
            <a
              href="https://www.youtube.com/@linturo"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-paper transition-colors"
            >
              YouTube
            </a>
            <Link to="/clips" className="hover:text-paper transition-colors">
              Clips
            </Link>
          </nav>
        </div>

        <div className="border-t border-hairline mt-8 pt-6 text-xs text-mute">
          © {currentYear} linturo
        </div>
      </div>
    </footer>
  )
}

export default Footer
