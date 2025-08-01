const AWS = require('aws-sdk');

// Configure AWS SES
const ses = new AWS.SES({ region: 'us-west-2' }); // SES in us-west-2 to match Amplify hosting

// Add timeout protection
const startTime = Date.now();
const MAX_EXECUTION_TIME = 25000; // 25 seconds (Lambda timeout is typically 30s)

exports.handler = async (event) => {
    // Check execution time periodically
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.error('Function execution time exceeded limit');
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Request timeout' 
            })
        };
    }
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Max-Age': '86400'
            },
            body: ''
        };
    }

    try {
        // Parse the request body
        const formData = JSON.parse(event.body);
        const { name, email, eventType, eventDate, subject, message } = formData;

        // Add basic rate limiting using client IP (if available)
        const clientIP = event.requestContext?.identity?.sourceIp || 'unknown';
        console.log(`Request from IP: ${clientIP}`);

        // Validate request size to prevent large payload attacks
        if (event.body && event.body.length > 10000) { // 10KB limit
            return {
                statusCode: 413,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Request too large' 
                })
            };
        }

        // Validate required fields
        if (!name || !email || !subject || !message) {
                    return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Missing required fields' 
            })
        };
        }

        // Sanitize inputs to prevent injection attacks
        const sanitizeInput = (input) => {
            if (typeof input !== 'string') return '';
            return input.trim().substring(0, 1000); // Limit length
        };

        const sanitizedName = sanitizeInput(name);
        const sanitizedEmail = sanitizeInput(email);
        const sanitizedSubject = sanitizeInput(subject);
        const sanitizedMessage = sanitizeInput(message);
        const sanitizedEventType = sanitizeInput(eventType);
        const sanitizedEventDate = sanitizeInput(eventDate);

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
                    return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Invalid email format' 
            })
        };
        }

        // Create email content
        const emailSubject = `New Booking Request: ${sanitizedSubject}`;
        const emailBody = `
New booking request from your website:

Name: ${sanitizedName}
Email: ${sanitizedEmail}
Event Type: ${sanitizedEventType || 'Not specified'}
Event Date: ${sanitizedEventDate || 'Not specified'}
Subject: ${sanitizedSubject}

Message:
${sanitizedMessage}

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
            ReplyToAddresses: [sanitizedEmail] // User's email for easy reply
        };

        // Send email via SES
        await ses.sendEmail(params).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to send email',
                details: error.message 
            })
        };
    }
};