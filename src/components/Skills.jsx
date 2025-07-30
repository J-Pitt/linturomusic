import { motion } from 'framer-motion'
import { 
  MusicalNoteIcon,
  SpeakerWaveIcon,
  ComputerDesktopIcon,
  CogIcon
} from '@heroicons/react/24/outline'

const Skills = () => {
  const skillCategories = [
    {
      title: 'Music Production',
      icon: MusicalNoteIcon,
      skills: [
        { name: 'Ableton Live', level: 95 },
        { name: 'Logic Pro', level: 90 },
        { name: 'Sound Design', level: 92 },
        { name: 'Mixing & Mastering', level: 88 },
        { name: 'Composition', level: 90 }
      ]
    },
    {
      title: 'DJ Performance',
      icon: SpeakerWaveIcon,
      skills: [
        { name: 'Pioneer CDJ', level: 95 },
        { name: 'Serato DJ', level: 90 },
        { name: 'Beat Matching', level: 98 },
        { name: 'Track Selection', level: 92 },
        { name: 'Crowd Reading', level: 88 }
      ]
    },
    {
      title: 'Studio Equipment',
      icon: ComputerDesktopIcon,
      skills: [
        { name: 'Synthesizers', level: 85 },
        { name: 'Drum Machines', level: 80 },
        { name: 'Audio Interfaces', level: 90 },
        { name: 'Studio Monitors', level: 85 },
        { name: 'Microphones', level: 75 }
      ]
    },
    {
      title: 'Live Sound',
      icon: CogIcon,
      skills: [
        { name: 'PA Systems', level: 85 },
        { name: 'Sound Engineering', level: 80 },
        { name: 'Stage Setup', level: 90 },
        { name: 'Lighting Sync', level: 75 },
        { name: 'Backup Systems', level: 88 }
      ]
    }
  ]

  const equipment = [
    'Ableton Live 11', 'Logic Pro X', 'Serato DJ Pro', 'Pioneer CDJ-3000', 
    'Pioneer DJM-900NXS2', 'Native Instruments', 'Arturia V Collection', 
    'UAD Apollo', 'Adam A7X', 'Roland TR-8S', 'Moog Sub 37', 'Ableton Push 2'
  ]

  return (
    <section className="py-20 bg-gray-800 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Skills & Equipment
          </h2>
          <p className="text-lg text-purple-300 max-w-2xl mx-auto">
            Mastery of music production tools and performance techniques
          </p>
        </motion.div>

        {/* Skill Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {skillCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
              viewport={{ once: true }}
              className="bg-gray-900 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-purple-500/20"
            >
              <div className="flex items-center mb-6">
                <category.icon className="w-8 h-8 text-purple-400 mr-3" />
                <h3 className="text-xl font-semibold text-white">
                  {category.title}
                </h3>
              </div>
              
              <div className="space-y-4">
                {category.skills.map((skill, skillIndex) => (
                  <div key={skill.name}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-300">
                        {skill.name}
                      </span>
                      <span className="text-sm text-purple-400">
                        {skill.level}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.level}%` }}
                        transition={{ duration: 1, delay: (categoryIndex * 0.1) + (skillIndex * 0.1) }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Equipment Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h3 className="text-2xl font-bold text-white mb-8">
            Studio Equipment
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 gap-4">
            {equipment.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="bg-gray-900 p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-purple-500/20"
              >
                <div className="text-sm font-medium text-gray-300 text-center">
                  {item}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
            <h3 className="text-xl font-bold mb-4">
              Always Evolving
            </h3>
            <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
              Constantly exploring new production techniques, emerging technologies, and innovative 
              ways to create immersive musical experiences. Currently experimenting with AI-assisted 
              composition and spatial audio.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
                AI Music
              </span>
              <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
                Spatial Audio
              </span>
              <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
                Live Streaming
              </span>
              <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
                VR Experiences
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Skills 