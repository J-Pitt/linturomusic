import { motion } from 'framer-motion'

const About = () => {
  const genres = [
    'House',
    'Progressive',
    'Deep House',
    'Melodic House',
    'Organic House',
    'Trance',
    'Psytrance',
    'Trap',
    'Psybass',
    'Deep Dubstep',
    'Electronica',
    'Ambient',
    'Psy-Dub',
  ]

  return (
    <section id="about" className="py-16 sm:py-20 bg-ink border-t border-hairline scroll-mt-4">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-mute mb-4">About</p>
          <h2 className="text-2xl sm:text-3xl font-medium text-paper mb-3">
            NYC / Brooklyn DJ
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <div>
            <p className="text-sm sm:text-base text-mute leading-relaxed mb-4">
              I&apos;ve been DJing for nearly a decade in San
              Francisco and London. I mix mostly house — organic, deep, minimal, progressive —
              but can cover trance, psytrance, trap, psybass, and deep dubstep when the night
              calls for it.
            </p>
            <p className="text-sm sm:text-base text-mute leading-relaxed">
              I&apos;m based in Brooklyn and working on building my presence in New York&apos;s
              venue-driven scene. Open for bookings, residencies, and collaborations — get in
              touch if you&apos;re looking for a DJ.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-paper mb-3">Musical style</h4>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 text-xs sm:text-sm text-mute border border-hairline"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default About
