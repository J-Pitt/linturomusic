#!/bin/bash

# Production build script with obfuscation
echo "🚀 Starting production build with obfuscation..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production not found. Creating from env.example..."
    cp env.example .env.production
    echo "📝 Please edit .env.production with your actual values before building"
    exit 1
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Build with production mode
echo "🔨 Building with production optimizations..."
npm run build:prod

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Production build completed successfully!"
    echo "📦 Build output: dist/"
    echo "🔒 Sensitive data has been obfuscated"
    echo "📊 Bundle size optimized"
    
    # Run path obfuscation
    echo "🔒 Running path obfuscation..."
    node scripts/obfuscate-paths.js
    
    echo "✅ Path obfuscation completed!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Optional: Show bundle analysis
if [ "$1" = "--analyze" ]; then
    echo "📊 Running bundle analysis..."
    npx vite-bundle-analyzer dist
fi

echo "🎉 Production build ready for deployment!" 