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
        // Add comprehensive logging to debug the issue
        console.log('=== LAMBDA FUNCTION DEBUG LOG ===');
        console.log('Full event object:', JSON.stringify(event, null, 2));
        console.log('Event body:', event.body);
        console.log('Event body type:', typeof event.body);
        console.log('Event headers:', event.headers);
        console.log('Event httpMethod:', event.httpMethod);
        console.log('Event path:', event.path);
        console.log('Event queryStringParameters:', event.queryStringParameters);
        console.log('Event pathParameters:', event.pathParameters);
        console.log('Event stageVariables:', event.stageVariables);
        console.log('Event requestContext:', event.requestContext);
        console.log('=== END DEBUG LOG ===');
        
        // Check if event.body exists and is a string
        if (!event.body) {
            console.error('Event body is undefined or null');
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Request body is missing' 
                })
            };
        }
        
        // Parse the request body
        let formData;
        try {
            formData = JSON.parse(event.body);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Event body that failed to parse:', event.body);
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Invalid JSON in request body',
                    details: parseError.message
                })
            };
        }
        
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

        // Send email via SES with timeout handling
        try {
            console.log('Attempting to send email with params:', JSON.stringify(params, null, 2));
            
            // Add timeout to the SES call with retry logic
            const sendEmailWithRetry = async (attempts = 3) => {
                for (let i = 0; i < attempts; i++) {
                    try {
                        console.log(`SES attempt ${i + 1}/${attempts}`);
                        
                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error(`SES timeout after 20 seconds (attempt ${i + 1})`)), 20000);
                        });
                        
                        const sesPromise = ses.sendEmail(params).promise();
                        const result = await Promise.race([sesPromise, timeoutPromise]);
                        
                        console.log(`SES successful on attempt ${i + 1}`);
                        return result;
                    } catch (error) {
                        console.error(`SES attempt ${i + 1} failed:`, error.message);
                        
                        if (i === attempts - 1) {
                            throw error; // Last attempt failed
                        }
                        
                        // Wait before retry (exponential backoff)
                        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
                        console.log(`Waiting ${waitTime}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            };
            
            const result = await sendEmailWithRetry();
            
            console.log('Email sent successfully:', result);
        } catch (sesError) {
            console.error('SES error:', sesError);
            console.error('SES error code:', sesError.code);
            console.error('SES error message:', sesError.message);
            
            // Handle specific SES errors
            if (sesError.code === 'MessageRejected') {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        error: 'Email configuration issue - please contact support',
                        details: 'The email service is not properly configured'
                    })
                };
            }
            
            // Handle timeout errors
            if (sesError.message && sesError.message.includes('timeout')) {
                return {
                    statusCode: 408,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        error: 'Request timeout',
                        details: 'The email service is taking too long to respond. Please try again.'
                    })
                };
            }
            
            throw sesError; // Re-throw to be caught by outer catch block
        }

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