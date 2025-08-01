# AWS Setup Checklist for Contact Form Emails

## Step 1: SES Email Verification ✅

### Verify Sender Email:
1. Go to AWS SES Console (us-west-2 region)
2. Click "Verified identities"
3. Check if `linturomusic@gmail.com` is verified
4. If not verified:
   - Click "Create identity"
   - Choose "Email address"
   - Enter: `linturomusic@gmail.com`
   - Click "Create identity"
   - Check your Gmail and click the verification link

### Check SES Status:
- Go to SES Console → "Account dashboard"
- Check if you're in "Sandbox mode" or "Production access"
- If in Sandbox: You can only send to verified emails
- If in Production: You can send to any email

## Step 2: Lambda Function Configuration ✅

### Check Lambda Function:
1. Go to AWS Lambda Console
2. Find function: `linturo-contact-form`
3. Check:
   - **Runtime**: Node.js 18.x
   - **Handler**: `contact-form-handler.handler`
   - **Timeout**: 30 seconds
   - **Memory**: 128 MB

### Check IAM Role:
1. In Lambda function → "Configuration" → "Permissions"
2. Click on the execution role
3. Verify it has these policies:
   - `AWSLambdaBasicExecutionRole`
   - Custom SES policy with `ses:SendEmail` and `ses:SendRawEmail` permissions

## Step 3: API Gateway Configuration ✅

### Check API Gateway:
1. Go to API Gateway Console
2. Find your API: `linturo-contact-api`
3. Check:
   - **Resource**: `/contact`
   - **Method**: POST
   - **Integration**: Lambda function
   - **CORS**: Enabled

### Test API Endpoint:
```bash
curl -X POST https://3ceog0x8e2.execute-api.us-west-2.amazonaws.com/prod/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test Subject",
    "message": "Test message"
  }'
```

## Step 4: CloudWatch Logs ✅

### Check Lambda Logs:
1. Go to CloudWatch Console
2. Click "Log groups"
3. Find: `/aws/lambda/linturo-contact-form`
4. Click on the latest log stream
5. Look for:
   - Error messages
   - SES errors
   - Function execution details

### Common Error Messages:
- `Email address not verified`: SES sender not verified
- `MessageRejected`: Email content issues
- `AccessDenied`: IAM permissions issue
- `InvalidParameterValue`: Email format issues

## Step 5: SES Sending Statistics ✅

### Check SES Metrics:
1. Go to SES Console → "Sending statistics"
2. Check:
   - **Sends**: Number of emails sent
   - **Bounces**: Failed deliveries
   - **Complaints**: Spam reports
   - **Rejects**: SES rejections

## Step 6: Test the Complete Flow ✅

### Manual Test:
1. Submit the contact form on your website
2. Check the modal response
3. Check CloudWatch logs immediately
4. Check your Gmail inbox
5. Check Gmail spam folder

### Debug Steps:
1. **If modal shows success but no email**:
   - Check CloudWatch logs for SES errors
   - Verify SES sender email
   - Check SES sending limits

2. **If modal shows error**:
   - Check API Gateway logs
   - Verify Lambda function is deployed
   - Check CORS configuration

3. **If form doesn't submit**:
   - Check browser console for CORS errors
   - Verify API Gateway endpoint
   - Check network tab for failed requests

## Step 7: Common Issues & Solutions ✅

### Issue: "Email address not verified"
**Solution**: Verify `linturomusic@gmail.com` in SES

### Issue: "MessageRejected"
**Solution**: Check email content for spam triggers

### Issue: "AccessDenied"
**Solution**: Add SES permissions to Lambda role

### Issue: "InvalidParameterValue"
**Solution**: Check email format and SES configuration

### Issue: CORS errors
**Solution**: Enable CORS in API Gateway

## Step 8: Production Access (Optional) ✅

### Request Production Access:
1. Go to SES Console → "Account dashboard"
2. Click "Request production access"
3. Fill out the form:
   - Use case: Contact form emails
   - Monthly volume: Low (under 1000)
   - Email content: Professional business communication
4. Submit and wait for approval (usually 24-48 hours)

## Quick Fix Commands:

### Redeploy Lambda:
```bash
cd lambda
zip -r contact-form-handler.zip .
aws lambda update-function-code --function-name linturo-contact-form --zip-file fileb://contact-form-handler.zip
```

### Check SES Status:
```bash
aws ses get-send-quota --region us-west-2
aws ses list-verified-email-addresses --region us-west-2
```

### Test Lambda:
```bash
aws lambda invoke --function-name linturo-contact-form --payload '{"body":"{\"name\":\"Test\",\"email\":\"test@example.com\",\"subject\":\"Test\",\"message\":\"Test\"}"}' response.json
```

## Next Steps:
1. Check CloudWatch logs for specific error messages
2. Verify SES email verification
3. Test with a simple email first
4. Check if you're in SES sandbox mode 