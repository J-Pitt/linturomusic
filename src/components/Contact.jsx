import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  EnvelopeIcon, 
  MapPinIcon,
  PaperAirplaneIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    eventType: '',
    eventDate: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Reset form
    setFormData({ name: '', email: '', subject: '', message: '', eventType: '', eventDate: '' })
    setIsSubmitting(false)
    
    // Show success message
    alert('Thank you for your message! I\'ll get back to you soon.')
  }

  const contactInfo = [
    {
      icon: EnvelopeIcon,
      title: 'Email',
      value: 'linturomusic@gmail.com',
      link: 'mailto:linturomusic@gmail.com'
    },
    {
      icon: MapPinIcon,
      title: 'Location',
      value: 'Brooklyn, New York',
      link: '#'
    }
  ]

  const socialLinks = [
    { name: 'Spotify', url: 'https://spotify.com', icon: '🎵' },
    { name: 'SoundCloud', url: 'https://soundcloud.com', icon: '☁️' },
    { name: 'Instagram', url: 'https://instagram.com', icon: '📸' },
    { name: 'YouTube', url: 'https://youtube.com', icon: '▶️' },
    { name: 'TikTok', url: 'https://tiktok.com', icon: '🎶' }
  ]

  return (
    <section className="py-12 sm:py-20 bg-gray-800 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Get In Touch
          </h2>
          <p className="text-base sm:text-lg text-purple-300 max-w-2xl mx-auto px-4">
            Book me for your next event, collaborate on music, or just connect to discuss 
            electronic music and share our passion for sound.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8 border border-purple-500/20 order-2 lg:order-1"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">
              Book a Performance
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white transition-colors duration-200 text-sm sm:text-base"
                    placeholder="Your name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white transition-colors duration-200 text-sm sm:text-base"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label htmlFor="eventType" className="block text-sm font-medium text-gray-300 mb-2">
                    Event Type
                  </label>
                  <select
                    id="eventType"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white transition-colors duration-200 text-sm sm:text-base"
                  >
                    <option value="">Select event type</option>
                    <option value="wedding">Wedding</option>
                    <option value="corporate">Corporate Event</option>
                    <option value="festival">Festival</option>
                    <option value="club">Club Night</option>
                    <option value="private">Private Party</option>
                    <option value="collaboration">Music Collaboration</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="eventDate" className="block text-sm font-medium text-gray-300 mb-2">
                    Event Date
                  </label>
                  <input
                    type="date"
                    id="eventDate"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white transition-colors duration-200 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white transition-colors duration-200 text-sm sm:text-base"
                  placeholder="What's this about?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white transition-colors duration-200 resize-none text-sm sm:text-base"
                  placeholder="Tell me about your event or collaboration idea!"
                />
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                    Sending...
                  </div>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Send Booking Request
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6 sm:space-y-8 order-1 lg:order-2"
          >
            {/* Contact Info Cards */}
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Contact Information
              </h3>
              
              {contactInfo.map((info, index) => (
                <motion.a
                  key={info.title}
                  href={info.link}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center p-3 sm:p-4 bg-gray-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-purple-500/20"
                >
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-purple-900/50 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                    <info.icon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-white">
                      {info.title}
                    </h4>
                    <p className="text-sm sm:text-base text-gray-300">
                      {info.value}
                    </p>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                Follow the Music
              </h3>
              <div className="flex space-x-3 sm:space-x-4">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.1, y: -5 }}
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-900 rounded-lg shadow-md hover:shadow-lg flex items-center justify-center text-lg sm:text-2xl transition-all duration-300 border border-purple-500/30"
                  >
                    {social.icon}
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4 sm:p-6 text-white">
              <h4 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">
                Let's create something amazing!
              </h4>
              <p className="text-sm sm:text-base text-purple-100 mb-3 sm:mb-4">
                I'm available for bookings worldwide and always open to exciting collaborations. 
                Whether it's a massive festival or an intimate gathering, let's make it unforgettable.
              </p>
              <div className="flex items-center">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full mr-2 sm:mr-3 animate-pulse"></div>
                <span className="text-xs sm:text-sm">Available for bookings</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Contact 