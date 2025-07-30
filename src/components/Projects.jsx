import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlayIcon, 
  MusicalNoteIcon, 
  CalendarIcon,
  StarIcon
} from '@heroicons/react/24/outline'

const Projects = () => {
  const [activeFilter, setActiveFilter] = useState('all')

  const filters = [
    { id: 'all', name: 'All Releases' },
    { id: 'tracks', name: 'Original Tracks' },
    { id: 'mixes', name: 'DJ Mixes' },
    { id: 'remixes', name: 'Remixes' },
    { id: 'performances', name: 'Live Sets' }
  ]

  const projects = [
    {
      id: 1,
      title: 'Neon Dreams EP',
      description: 'A 4-track EP featuring deep house and progressive elements. Charted #1 on Beatport Deep House for 3 weeks.',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      category: 'tracks',
      technologies: ['Deep House', 'Progressive', 'Ableton Live', 'Analog Synths'],
      liveUrl: '#',
      githubUrl: '#',
      featured: true,
      releaseDate: '2023',
      streams: '2.5M+'
    },
    {
      id: 2,
      title: 'Tomorrowland 2023 Set',
      description: 'Live performance from the main stage at Tomorrowland Festival. 2-hour set featuring exclusive unreleased tracks.',
      image: 'https://images.unsplash.com/photo-1470229722911-7c0e2dbbafd3?w=400&h=300&fit=crop',
      category: 'performances',
      technologies: ['Live Performance', 'Festival', 'Pioneer CDJ', 'Custom Lighting'],
      liveUrl: '#',
      githubUrl: '#',
      featured: true,
      releaseDate: '2023',
      streams: '1.8M+'
    },
    {
      id: 3,
      title: 'Midnight Grooves Mix',
      description: 'Monthly podcast featuring the latest in electronic music. Guest appearances from top international DJs.',
      image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=300&fit=crop',
      category: 'mixes',
      technologies: ['Podcast', 'Guest Mixes', 'Serato DJ', 'Live Recording'],
      liveUrl: '#',
      githubUrl: '#',
      featured: false,
      releaseDate: '2023',
      streams: '500K+'
    },
    {
      id: 4,
      title: 'Electric Soul Remix',
      description: 'Official remix for Grammy-nominated artist. Featured on major streaming platforms worldwide.',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop',
      category: 'remixes',
      technologies: ['Official Remix', 'Grammy Artist', 'Logic Pro', 'UAD Plugins'],
      liveUrl: '#',
      githubUrl: '#',
      featured: false,
      releaseDate: '2022',
      streams: '3.2M+'
    },
    {
      id: 5,
      title: 'Ibiza Sunset Sessions',
      description: 'Live recording from summer residency at Pacha Ibiza. Captures the energy of the iconic club.',
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
      category: 'performances',
      technologies: ['Live Recording', 'Pacha Ibiza', 'Residency', 'Club Set'],
      liveUrl: '#',
      githubUrl: '#',
      featured: false,
      releaseDate: '2022',
      streams: '900K+'
    },
    {
      id: 6,
      title: 'Cosmic Journey Album',
      description: 'Debut full-length album exploring ambient and downtempo electronic music. 12 tracks of sonic exploration.',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      category: 'tracks',
      technologies: ['Album', 'Ambient', 'Downtempo', 'Concept Album'],
      liveUrl: '#',
      githubUrl: '#',
      featured: false,
      releaseDate: '2021',
      streams: '4.1M+'
    }
  ]

  const filteredProjects = activeFilter === 'all' 
    ? projects 
    : projects.filter(project => project.category === activeFilter)

  return (
    <section className="py-20 bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Music & Performances
          </h2>
          <p className="text-lg text-purple-300 max-w-2xl mx-auto">
            A collection of original tracks, remixes, live performances, and DJ mixes
          </p>
        </motion.div>

        {/* Filter Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                activeFilter === filter.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-purple-500/30'
              }`}
            >
              {filter.name}
            </button>
          ))}
        </motion.div>

        {/* Projects Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className="bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-purple-500/20"
              >
                {/* Project Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                  {project.featured && (
                    <div className="absolute top-4 left-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <StarIcon className="w-4 h-4 mr-1" />
                      Featured
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 transition-opacity duration-300 flex space-x-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-3 bg-white rounded-full shadow-lg"
                      >
                        <PlayIcon className="w-5 h-5 text-gray-700" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-3 bg-white rounded-full shadow-lg"
                      >
                        <MusicalNoteIcon className="w-5 h-5 text-gray-700" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Project Content */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-white">
                      {project.title}
                    </h3>
                    <span className="text-sm text-purple-400 font-medium">
                      {project.releaseDate}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4 line-clamp-3">
                    {project.description}
                  </p>

                  {/* Technologies */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs font-medium border border-purple-500/30"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Streams */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">
                      <CalendarIcon className="w-4 h-4 inline mr-1" />
                      {project.releaseDate}
                    </span>
                    <span className="text-sm text-green-400 font-medium">
                      {project.streams} streams
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <motion.a
                      href={project.liveUrl}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-sm font-medium"
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Listen
                    </motion.a>
                    <motion.a
                      href={project.githubUrl}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 flex items-center justify-center px-4 py-2 border border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-500/20 transition-all duration-200 text-sm font-medium"
                    >
                      <MusicalNoteIcon className="w-4 h-4 mr-2" />
                      Details
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Ready to experience the music?
            </h3>
            <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
              Book me for your next event, collaborate on a track, or just connect to discuss 
              music and share our passion for electronic sounds.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              Book Now
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Projects 