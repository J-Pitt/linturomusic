import { motion } from 'framer-motion'
import { HeartIcon } from '@heroicons/react/24/outline'

const About = () => {
  const genres = [
    'House', 'Progressive', 
    'Deep House', 'Melodic House', 'Organic House', 'Electronica', 'Ambient', 'Psy-Dub', 'Deep Dubstep'
  ]

  return (
    <section id="about" className="py-12 sm:py-20 bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Learn more about <span className="text-3xl sm:text-4xl lg:text-5xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-brand">Linturo</span>
          </h2>
          <p className="text-base sm:text-lg text-purple-300 max-w-2xl mx-auto px-4">
            A passionate electronic music lover and DJ.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto mb-12 sm:mb-16">
          {/* About Text and Genres */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6 sm:space-y-8"
          >
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                My Journey
              </h3>
              <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                I began my DJ journey at an intimate festival inside Mt. Rainier National Park with some close friends where I learned the basics. Since then, 
                I've worked to perfect my craft while living and playing in cities around the world - from San Francisco to London to New York. 
                My specialties are organic house and melodic house, though I also enjoy playing psytrance, psydub, 
                tech house, and deep dubstep.
              </p>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                I'm happy to play music anywhere people will enjoy it. For me, music, and the connection it encourages, is therapeutic. As lifelong music lover, I aim 
                to curate not only a great vibe, but a unique journey through sound. I'm Brooklyn based, so if you're in the area and want to jam, or you need a DJ for an event, please drop me a line, I'm always more than happy to connect.
              </p>
            </div>

            {/* Genres */}
            <div>
              <div className="flex items-center mb-3 sm:mb-4">
                <HeartIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mr-2 sm:mr-3" />
                <h4 className="text-base sm:text-lg font-semibold text-white">
                  Musical Style
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre, index) => (
                  <motion.span
                    key={genre}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="px-2 sm:px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-xs sm:text-sm font-medium border border-purple-500/30"
                  >
                    {genre}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default About 