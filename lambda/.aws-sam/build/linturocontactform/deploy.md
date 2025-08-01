# Deploy Lambda Function

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **SES (Simple Email Service) set up** in us-west-2 region
3. **Domain verification** in SES for sending emails

## Setup Steps

### 1. Verify Email in SES

1. Go to AWS SES Console (us-west-2 region)
2. Go to "Verified identities"
3. Click "Create identity"
4. Choose "Email address"
5. Enter: `linturomusic@gmail.com`
6. Click "Create identity"
7. Check your Gmail and click the verification link

**Note**: The Lambda code is already configured to use `linturomusic@gmail.com` as the sender address.

### 2. Create IAM Role for Lambda

```bash
# Create trust policy
cat > lambda-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
    --role-name linturo-contact-form-role \
    --assume-role-policy-document file://lambda-trust-policy.json

# Attach basic Lambda execution policy
aws iam attach-role-policy \
    --role-name linturo-contact-form-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create and attach SES policy
cat > ses-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name linturo-contact-form-role \
    --policy-name SESPolicy \
    --policy-document file://ses-policy.json
```

### 3. Package and Deploy Lambda

```bash
# Navigate to lambda directory
cd lambda

# Install dependencies
npm install

# Create deployment package
zip -r contact-form-handler.zip .

# Create Lambda function
aws lambda create-function \
    --function-name linturo-contact-form \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/linturo-contact-form-role \
    --handler contact-form-handler.handler \
    --zip-file fileb://contact-form-handler.zip

# Update function if it already exists
aws lambda update-function-code \
    --function-name linturo-contact-form \
    --zip-file fileb://contact-form-handler.zip
```

### 4. Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api \
    --name linturo-contact-api \
    --description "API for linturo contact form"

# Note the API ID from the response, then get the root resource ID
aws apigateway get-resources --rest-api-id YOUR_API_ID

# Create contact resource
aws apigateway create-resource \
    --rest-api-id YOUR_API_ID \
    --parent-id ROOT_RESOURCE_ID \
    --path-part contact

# Create POST method
aws apigateway put-method \
    --rest-api-id YOUR_API_ID \
    --resource-id CONTACT_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE

# Create OPTIONS method for CORS
aws apigateway put-method \
    --rest-api-id YOUR_API_ID \
    --resource-id CONTACT_RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE

# Integration with Lambda (replace with your Lambda ARN)
aws apigateway put-integration \
    --rest-api-id YOUR_API_ID \
    --resource-id CONTACT_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:YOUR_ACCOUNT_ID:function:linturo-contact-form/invocations

# Deploy API
aws apigateway create-deployment \
    --rest-api-id YOUR_API_ID \
    --stage-name prod
```

### 5. Your API Endpoint

After deployment, your API endpoint will be:
```
https://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/prod/contact
```

Update your React app with this URL.

## Alternative: Using AWS Console

1. **Lambda Console**: Upload the zip file manually
2. **API Gateway Console**: Create REST API with POST method
3. **SES Console**: Verify email addresses

## Testing

```bash
curl -X POST https://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/prod/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test Subject",
    "message": "Test message"
  }'
```