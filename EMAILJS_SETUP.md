# EmailJS Setup Guide

This guide will help you set up EmailJS to handle contact form submissions instead of AWS SNS.

## Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

## Step 2: Add Email Service (Choose One)

### Option A: Outlook/Hotmail (Recommended - Easier Setup)
1. In your EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose "Outlook" or "Hotmail"
4. Connect your email account (you can use linturomusic@gmail.com or create a new Outlook account)
5. Note down the **Service ID** (you'll need this later)

### Option B: Gmail (Alternative - More Complex)
If you want to use Gmail and get the "insufficient authentication scopes" error:
1. Make sure you're using a Gmail account (not Google Workspace)
2. Try using "App Password" instead of regular password
3. If still having issues, use Outlook option above

### Option C: Custom SMTP (Advanced)
1. Choose "Custom SMTP" service
2. Use these settings for Gmail:
   - SMTP Host: smtp.gmail.com
   - Port: 587
   - Username: your-email@gmail.com
   - Password: App Password (not regular password)
   - Security: TLS

## Step 3: Create Email Template

1. Go to "Email Templates"
2. Click "Create New Template"
3. Use this template content:

**Subject:**
```
New Booking Request from {{from_name}}
```

**Email Body:**
```
You have received a new booking request from your website:

**Contact Information:**
- Name: {{from_name}}
- Email: {{from_email}}

**Event Details:**
- Event Type: {{event_type}}
- Event Date: {{event_date}}
- Subject: {{subject}}

**Message:**
{{message}}

---
This message was sent from your website contact form.
```

4. Save the template and note down the **Template ID**

## Step 4: Get Public Key

1. Go to "Account" → "API Keys"
2. Copy your **Public Key**

## Step 5: Configure Environment Variables

1. Create a `.env.production` file in your project root (if it doesn't exist)
2. Add these variables with your actual values:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
VITE_CONTACT_EMAIL=linturomusic@gmail.com
```

## Step 6: Test the Form

1. Run your development server: `npm run dev`
2. Fill out and submit the contact form
3. Check your email to see if the message was received

## Troubleshooting

### Gmail API Issues
If you get "insufficient authentication scopes" error:
1. **Use Outlook instead** - much easier setup
2. **Create App Password** for Gmail:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate app password for "Mail"
   - Use this password in EmailJS

### Form not sending
- Check that all environment variables are set correctly
- Verify service ID, template ID, and public key are correct

### Email not received
- Check your spam folder
- Check EmailJS dashboard for errors
- Try sending a test email from EmailJS dashboard

## Free Tier Limits

- EmailJS free tier allows 200 emails per month
- If you need more, consider upgrading to a paid plan

## Security Notes

- The public key is safe to expose in frontend code
- EmailJS handles the email sending securely
- No backend server required

## Alternative Services

If EmailJS doesn't work for you, consider:
- **Formspree**: Simple form handling service
- **Netlify Forms**: If you switch to Netlify hosting
- **Google Apps Script**: Custom solution using Google Sheets 