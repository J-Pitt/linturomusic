const AWS = require('aws-sdk');

// Configure AWS SES
const ses = new AWS.SES({ region: 'us-west-2' }); // SES in us-west-2 to match Amplify hosting

exports.handler = async (event) => {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    try {
        // Parse the request body
        const formData = JSON.parse(event.body);
        const { name, email, eventType, eventDate, subject, message } = formData;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Missing required fields' 
                })
            };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Invalid email format' 
                })
            };
        }

        // Create email content
        const emailSubject = `New Booking Request: ${subject}`;
        const emailBody = `
New booking request from your website:

Name: ${name}
Email: ${email}
Event Type: ${eventType || 'Not specified'}
Event Date: ${eventDate || 'Not specified'}
Subject: ${subject}

Message:
${message}

---
This email was sent from the contact form on your linturo website.
        `.trim();

        // Email parameters
        const params = {
            Destination: {
                ToAddresses: ['linturomusic@gmail.com'] // Your email
            },
            Message: {
                Body: {
                    Text: {
                        Data: emailBody,
                        Charset: 'UTF-8'
                    }
                },
                Subject: {
                    Data: emailSubject,
                    Charset: 'UTF-8'
                }
            },
            Source: 'linturomusic@gmail.com', // Verify this email in SES first
            ReplyToAddresses: [email] // User's email for easy reply
        };

        // Send email via SES
        await ses.sendEmail(params).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: 'Email sent successfully' 
            })
        };

    } catch (error) {
        console.error('Error sending email:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to send email',
                details: error.message 
            })
        };
    }
};