#!/bin/bash

echo "Building Lambda deployment package..."
rm -f contact-form-handler.zip
zip -r contact-form-handler.zip index.js package.json package-lock.json node_modules/

echo "Deploying with SAM..."
sam build
sam deploy --guided

echo "Deployment complete!"
echo "Note: Make sure to update your frontend config with the new API endpoint URL" 