import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  EnvelopeIcon, 
  MapPinIcon,
  PaperAirplaneIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { config } from '../config'

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
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('success') // 'success' or 'error'
  const [modalMessage, setModalMessage] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Use the API endpoint from config
      const API_ENDPOINT = config.CONTACT_API_URL
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Reset form on success
      setFormData({ name: '', email: '', subject: '', message: '', eventType: '', eventDate: '' })
      setIsSubmitting(false)
      
      // Show success modal
      setModalType('success')
      setModalMessage('Thank you for your message! I\'ll get back to you soon.')
      setShowModal(true)
      
    } catch (error) {
      console.error('Error submitting form:', error)
      setIsSubmitting(false)
      
      // Check if it's a CORS error and provide specific guidance
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        setModalType('error')
        setModalMessage('CORS error detected. This is likely a configuration issue with the API Gateway. Please email me directly at linturomusic@gmail.com for now.')
      } else {
        // Show general error message
        setModalType('error')
        setModalMessage('Sorry, there was an error sending your message. Please try again or email me directly at linturomusic@gmail.com')
      }
      setShowModal(true)
    }
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
    { name: 'SoundCloud', url: 'https://soundcloud.com/linturo', icon: '☁️' },
    { name: 'Instagram', url: 'https://www.instagram.com/_linturo_/', icon: '📸' },
    { name: 'YouTube', url: 'https://youtube.com', icon: '▶️' }
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
            If you are also an avid lover of music, need a DJ for an event, or want to collaborate on an event, let's connect!
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
              Book <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-brand text-2xl sm:text-3xl">linturo</span>
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white transition-colors duration-200 text-sm sm:text-base appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="" className="bg-gray-800 text-white">Select event type</option>
                    <option value="club" className="bg-gray-800 text-white">Club</option>
                    <option value="bar" className="bg-gray-800 text-white">Bar</option>
                    <option value="house-party" className="bg-gray-800 text-white">House Party</option>
                    <option value="festival" className="bg-gray-800 text-white">Festival</option>
                    <option value="renegade" className="bg-gray-800 text-white">Renegade</option>
                    <option value="other" className="bg-gray-800 text-white">Other</option>
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
                Let's have some fun!
              </h4>
              <p className="text-sm sm:text-base text-purple-100 mb-3 sm:mb-4">
                I'm available for bookings worldwide and always open to exciting music adventures. 
                Whether it's a club, bar, or just an intimate gathering, let's boogie!
              </p>
              <div className="flex items-center">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full mr-2 sm:mr-3 animate-pulse"></div>
                <span className="text-xs sm:text-sm">Available for bookings</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Success/Error Modal */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`relative max-w-md w-full p-6 rounded-lg shadow-xl border ${
              modalType === 'success' 
                ? 'bg-gradient-to-br from-purple-900 to-pink-900 border-purple-500/30' 
                : 'bg-gradient-to-br from-red-900 to-orange-900 border-red-500/30'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              {modalType === 'success' ? (
                <CheckCircleIcon className="w-12 h-12 text-green-400" />
              ) : (
                <XCircleIcon className="w-12 h-12 text-red-400" />
              )}
            </div>

            {/* Title */}
            <h3 className={`text-xl font-bold text-center mb-3 ${
              modalType === 'success' ? 'text-white' : 'text-white'
            }`}>
              {modalType === 'success' ? 'Message Sent!' : 'Oops!'}
            </h3>

            {/* Message */}
            <p className="text-gray-200 text-center mb-6 leading-relaxed">
              {modalMessage}
            </p>

            {/* Action Button */}
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(false)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  modalType === 'success'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700'
                }`}
              >
                {modalType === 'success' ? 'Awesome!' : 'Got it'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </section>
  )
}

export default Contact 