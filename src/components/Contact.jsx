import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPinIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const fieldClass =
  'w-full px-3 sm:px-4 py-2.5 border border-hairline bg-black text-paper placeholder:text-mute/50 focus:outline-none focus:border-paper transition-colors text-sm sm:text-base'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    eventType: '',
    eventDate: '',
    honeypot: '',
    captcha: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('success')
  const [modalMessage, setModalMessage] = useState('')

  const [captchaQuestion] = useState(() => {
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 1
    return { num1, num2, answer: num1 + num2 }
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.honeypot) {
      return
    }

    if (parseInt(formData.captcha) !== captchaQuestion.answer) {
      setModalType('error')
      setModalMessage('Incorrect answer to the math question. Please try again.')
      setShowModal(true)
      return
    }

    setIsSubmitting(true)

    try {
      const formId = import.meta.env.VITE_FORMSPREE_FORM_ID

      if (!formId) {
        throw new Error('Form ID not configured')
      }

      const response = await fetch(`https://formspree.io/f/${formId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          eventType: formData.eventType,
          eventDate: formData.eventDate,
        }),
      })

      if (response.ok) {
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          eventType: '',
          eventDate: '',
          honeypot: '',
          captcha: '',
        })
        setIsSubmitting(false)
        setModalType('success')
        setModalMessage("Thank you for your message! I'll get back to you soon.")
        setShowModal(true)
      } else {
        const errorData = await response.json()
        throw new Error(`Form submission failed: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setIsSubmitting(false)
      setModalType('error')
      setModalMessage(
        'Sorry, there was an error sending your message. Please try again in a moment.'
      )
      setShowModal(true)
    }
  }

  return (
    <section id="contact" className="py-16 sm:py-20 bg-ink border-t border-hairline scroll-mt-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-10 sm:mb-12"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-mute mb-4">Book</p>
          <h2 className="text-2xl sm:text-3xl font-medium text-paper mb-3">Get in touch</h2>
          <p className="text-sm sm:text-base text-mute max-w-2xl">
            For bookings, residencies, or collaborations — send a note below.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="border border-hairline p-6 sm:p-8 order-2 lg:order-1"
          >
            <h3 className="text-lg sm:text-xl font-medium text-paper mb-6">Booking Inquiry</h3>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm text-mute mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={fieldClass}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm text-mute mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={fieldClass}
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="eventType" className="block text-sm text-mute mb-2">
                    Event type
                  </label>
                  <select
                    id="eventType"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    className={`${fieldClass} appearance-none cursor-pointer`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem',
                    }}
                  >
                    <option value="">Select event type</option>
                    <option value="club">Club</option>
                    <option value="bar">Bar</option>
                    <option value="house-party">House Party</option>
                    <option value="festival">Festival</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="eventDate" className="block text-sm text-mute mb-2">
                    Event date
                  </label>
                  <input
                    type="date"
                    id="eventDate"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm text-mute mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className={fieldClass}
                  placeholder="What's this about?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm text-mute mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className={`${fieldClass} resize-none`}
                  placeholder="Tell me about your event or collaboration idea."
                />
              </div>

              <div className="hidden">
                <label htmlFor="honeypot">Leave this field empty</label>
                <input
                  type="text"
                  id="honeypot"
                  name="honeypot"
                  value={formData.honeypot}
                  onChange={handleChange}
                  tabIndex="-1"
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="captcha" className="block text-sm text-mute mb-2">
                  Human check: What is {captchaQuestion.num1} + {captchaQuestion.num2}?
                </label>
                <input
                  type="number"
                  id="captcha"
                  name="captcha"
                  value={formData.captcha}
                  onChange={handleChange}
                  required
                  className={fieldClass}
                  placeholder="Enter the answer"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-paper text-ink font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b border-ink" />
                    Sending...
                  </span>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Send booking request
                  </>
                )}
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="space-y-6 order-1 lg:order-2"
          >
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-paper">Location</h3>
              <div className="flex items-center gap-4 p-4 border border-hairline">
                <MapPinIcon className="w-5 h-5 text-mute shrink-0" />
                <p className="text-paper text-sm sm:text-base">Brooklyn, New York</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative max-w-md w-full p-6 border border-hairline bg-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-mute hover:text-paper transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <div className="flex justify-center mb-4">
              {modalType === 'success' ? (
                <CheckCircleIcon className="w-10 h-10 text-paper" />
              ) : (
                <XCircleIcon className="w-10 h-10 text-mute" />
              )}
            </div>

            <h3 className="text-lg font-medium text-center text-paper mb-3">
              {modalType === 'success' ? 'Message sent' : 'Something went wrong'}
            </h3>
            <p className="text-mute text-center mb-6 text-sm leading-relaxed">{modalMessage}</p>

            <div className="flex justify-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-paper text-paper hover:bg-paper hover:text-ink transition-colors text-sm font-medium"
              >
                {modalType === 'success' ? 'Close' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Contact
