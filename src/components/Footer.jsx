import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    music: [
      { name: 'Spotify', href: 'https://spotify.com' },
      { name: 'SoundCloud', href: 'https://soundcloud.com' },
      { name: 'Beatport', href: 'https://beatport.com' },
      { name: 'Apple Music', href: 'https://music.apple.com' }
    ],
    social: [
      { name: 'Instagram', href: 'https://instagram.com' },
      { name: 'YouTube', href: 'https://youtube.com' },
      { name: 'TikTok', href: 'https://tiktok.com' },
      { name: 'Twitter', href: 'https://twitter.com' }
    ]
  }

  return (
    <footer className="bg-gray-900 dark:bg-gray-900 border-t border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-sprayer">linturo</span>
              </h3>
              <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6 max-w-md">
                Creating unforgettable electronic music experiences through innovative sound design 
                and electrifying performances that move the crowd.
              </p>
              
              {/* Newsletter Signup */}
              <div className="mb-4 sm:mb-6">
                <h4 className="text-white font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Stay Updated</h4>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-3 sm:px-4 py-2 bg-gray-800 border border-gray-600 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 text-sm sm:text-base"
                  />
                  <button className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-r-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-sm sm:text-base">
                    Subscribe
                  </button>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex space-x-3 sm:space-x-4">
                {footerLinks.social.map((social) => (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-purple-400 hover:bg-gray-700 transition-all duration-200 border border-purple-500/30"
                  >
                    <span className="text-sm sm:text-lg">
                      {social.name === 'Instagram' && '📸'}
                      {social.name === 'YouTube' && '▶️'}
                      {social.name === 'TikTok' && '🎶'}
                      {social.name === 'Twitter' && '🐦'}
                    </span>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Music Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Music</h4>
            <ul className="space-y-1 sm:space-y-2">
              {footerLinks.music.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-purple-400 transition-colors duration-200 text-sm sm:text-base"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center"
        >
          <div className="text-gray-400 text-xs sm:text-sm mb-4 md:mb-0">
            © {currentYear} linturo. All rights reserved.
          </div>
          <div className="flex space-x-4 sm:space-x-6 text-xs sm:text-sm">
            <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-200">
              Cookie Policy
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}

export default Footer 