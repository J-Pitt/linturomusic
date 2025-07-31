import { motion } from 'framer-motion'
import { 
  MusicalNoteIcon, 
  HeartIcon 
} from '@heroicons/react/24/outline'

const About = () => {
  const stats = [
    { label: 'Years Experience', value: '8+' },
    { label: 'Live Performances', value: '200+' },
    { label: 'Original Tracks', value: '25+' },
    { label: 'Festivals Played', value: '15+' }
  ]

  const genres = [
    'House', 'Techno', 'Trance', 'Progressive', 
    'Deep House', 'Electronica', 'Ambient'
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
            About linturo
          </h2>
          <p className="text-base sm:text-lg text-purple-300 max-w-2xl mx-auto px-4">
            A passionate electronic music producer and DJ creating unforgettable sonic experiences
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-12 sm:mb-16">
          {/* Left Column - Image and Stats */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6 sm:space-y-8 order-2 lg:order-1"
          >
            {/* Profile Image Placeholder */}
            <div className="relative">
              <div className="w-60 h-60 sm:w-80 sm:h-80 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <MusicalNoteIcon className="w-24 h-24 sm:w-32 sm:h-32 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 w-16 h-16 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-lg">Live</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center p-3 sm:p-4 bg-gray-800 rounded-lg border border-purple-500/20"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-1 sm:mb-2">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6 sm:space-y-8 order-1 lg:order-2"
          >
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                The Journey
              </h3>
              <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                From bedroom producer to international DJ, my journey in electronic music has been driven by 
                a deep passion for creating immersive sonic experiences. I blend cutting-edge production 
                techniques with timeless musical elements to craft tracks that resonate with audiences worldwide.
              </p>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                My sound is characterized by powerful basslines, atmospheric textures, and driving rhythms 
                that create an electrifying atmosphere on the dance floor. Whether performing at intimate 
                clubs or massive festivals, I strive to connect with every person in the crowd through music.
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