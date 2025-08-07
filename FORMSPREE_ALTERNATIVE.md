# Formspree Alternative Setup

If EmailJS is giving you authentication issues, Formspree is often much easier to set up.

## Why Formspree?

- **No authentication issues** - just connect your email
- **Simpler setup** - no API keys or templates needed
- **Free tier** - 50 submissions per month
- **Works immediately** - no complex configuration

## Step 1: Create Formspree Account

1. Go to [https://formspree.io/](https://formspree.io/)
2. Sign up with your email (linturomusic@gmail.com)
3. Verify your email address

## Step 2: Create a Form

1. In your Formspree dashboard, click "New Form"
2. Give it a name like "Linturo Contact Form"
3. Copy the **Form ID** (looks like: xrgjqjqj)

## Step 3: Update Your Contact Component

Replace the EmailJS code with Formspree. Here's the updated `handleSubmit` function:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault()
  setIsSubmitting(true)
  
  try {
    const formId = import.meta.env.VITE_FORMSPREE_FORM_ID || 'your_form_id'
    
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
      })
    })

    if (response.ok) {
      // Reset form on success
      setFormData({ name: '', email: '', subject: '', message: '', eventType: '', eventDate: '' })
      setIsSubmitting(false)
      
      // Show success modal
      setModalType('success')
      setModalMessage('Thank you for your message! I\'ll get back to you soon.')
      setShowModal(true)
    } else {
      throw new Error('Form submission failed')
    }
    
  } catch (error) {
    console.error('Error submitting form:', error)
    setIsSubmitting(false)
    
    // Show error message
    setModalType('error')
    setModalMessage('Sorry, there was an error sending your message. Please try again or email me directly at ' + config.CONTACT_EMAIL)
    setShowModal(true)
  }
}
```

## Step 4: Update Environment Variables

In your `.env.production` file:

```env
VITE_FORMSPREE_FORM_ID=your_form_id_here
VITE_CONTACT_EMAIL=linturomusic@gmail.com
```

## Step 5: Test

1. Submit the form
2. Check your email - you should receive the form data
3. Check Formspree dashboard for submissions

## Benefits of Formspree

- ✅ **No authentication issues**
- ✅ **Works immediately**
- ✅ **Email notifications**
- ✅ **Spam protection**
- ✅ **Form analytics**
- ✅ **Easy to set up**

## Free Tier

- 50 submissions per month
- Email notifications
- Spam protection
- Basic analytics

Would you like me to implement the Formspree solution instead of EmailJS? 