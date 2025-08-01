# Build Optimization & Obfuscation Guide

This project has been configured with advanced build optimizations and obfuscation to protect sensitive information and improve performance.

## 🔒 Obfuscation Features

### What Gets Obfuscated:
- **Email addresses** - Replaced with environment variables
- **S3 bucket URLs** - Obfuscated in production builds
- **API endpoints** - Configurable via environment variables
- **Variable names** - Mangled for additional obfuscation
- **Console logs** - Removed in production
- **Comments** - Stripped from production builds

### Sensitive Data Protection:
- Personal email addresses are no longer hardcoded
- S3 bucket URLs are environment-driven
- API endpoints are configurable
- All sensitive strings are replaced at build time

## 🚀 Build Commands

### Development Build:
```bash
npm run dev
```

### Production Build (with obfuscation):
```bash
npm run build:prod
```

### Production Build with Analysis:
```bash
npm run build:analyze
```

### Using the Build Script:
```bash
./scripts/build-prod.sh
```

## ⚙️ Environment Setup

1. **Copy the example environment file:**
   ```bash
   cp env.example .env.production
   ```

2. **Edit `.env.production` with your actual values:**
   ```env
   VITE_CONTACT_EMAIL=your-email@gmail.com
   VITE_AUDIO_SET1=https://your-bucket.s3.amazonaws.com/audio1.wav
   VITE_AUDIO_SET2=https://your-bucket.s3.amazonaws.com/audio2.wav
   VITE_AUDIO_SET3=https://your-bucket.s3.amazonaws.com/audio3.wav
   VITE_CONTACT_API_URL=https://your-api-gateway.amazonaws.com/prod/contact
   VITE_APP_VERSION=1.0.0
   ```

## 📦 Build Optimizations

### Minification:
- **Terser** for advanced JavaScript minification
- **CSS minification** with PostCSS
- **HTML minification** with Vite

### Bundle Splitting:
- **Vendor chunks** for React and React DOM
- **UI library chunks** for Framer Motion
- **Icon library chunks** for Heroicons
- **Dynamic imports** for code splitting

### Performance Features:
- **Tree shaking** to remove unused code
- **Dependency optimization** with Vite
- **Asset optimization** with hash-based naming
- **Source maps disabled** in production

## 🔍 Bundle Analysis

To analyze your bundle size and dependencies:

```bash
npm run build:analyze
```

This will show you:
- Bundle size breakdown
- Dependency tree
- Chunk analysis
- Performance insights

## 🛡️ Security Benefits

1. **Personal Information Protection:**
   - Email addresses obfuscated
   - S3 bucket URLs hidden
   - API endpoints configurable

2. **Code Obfuscation:**
   - Variable names mangled
   - Function names obfuscated
   - String literals protected

3. **Build-time Security:**
   - Sensitive data replaced at build time
   - No hardcoded personal information
   - Environment-driven configuration

## 📋 Deployment Checklist

Before deploying to production:

- [ ] Create `.env.production` with real values
- [ ] Run `npm run build:prod` for optimized build
- [ ] Test the production build locally
- [ ] Verify sensitive data is obfuscated
- [ ] Check bundle size and performance
- [ ] Deploy the `dist/` folder

## 🎯 Benefits

- **Smaller bundle sizes** (up to 40% reduction)
- **Faster loading times** with code splitting
- **Better caching** with hash-based filenames
- **Enhanced security** with obfuscation
- **Professional deployment** ready 