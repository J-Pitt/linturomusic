# Formspree Setup Guide

Simple setup for your contact form using Formspree.

## Step 1: Create Formspree Account

1. Go to [https://formspree.io/](https://formspree.io/)
2. Click "Get Started" or "Sign Up"
3. Sign up with your email (linturomusic@gmail.com)
4. Verify your email address

## Step 2: Create a Form

1. In your Formspree dashboard, click "New Form"
2. Give it a name like "Linturo Contact Form"
3. Copy the **Form ID** (looks like: `xrgjqjqj`)

## Step 3: Configure Environment Variables

1. Create a `.env.production` file in your project root (if it doesn't exist)
2. Add this variable with your actual form ID:

```env
VITE_FORMSPREE_FORM_ID=your_form_id_here
VITE_CONTACT_EMAIL=linturomusic@gmail.com
```

Replace `your_form_id_here` with the actual form ID you copied from Formspree.

## Step 4: Test the Form

1. Run your development server: `npm run dev`
2. Fill out and submit the contact form
3. Check your email - you should receive the form data
4. Check Formspree dashboard for submissions

## What You'll Receive

When someone submits the form, you'll get an email with:
- Name
- Email
- Subject
- Message
- Event Type
- Event Date

## Free Tier Benefits

- ✅ 50 submissions per month
- ✅ Email notifications
- ✅ Spam protection
- ✅ Form analytics
- ✅ No setup headaches

## Troubleshooting

- **Form not sending**: Check that `VITE_FORMSPREE_FORM_ID` is set correctly
- **Email not received**: Check spam folder and Formspree dashboard
- **CORS errors**: Formspree handles CORS automatically

## Next Steps

1. Set up your Formspree account
2. Get your form ID
3. Add it to your `.env.production` file
4. Test the form
5. Deploy to production

That's it! Much simpler than EmailJS. 🎉 