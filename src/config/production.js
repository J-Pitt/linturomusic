// Production configuration with obfuscated values
export const productionConfig = {
  // Obfuscated email (will be replaced at build time)
  contactEmail: process.env.VITE_CONTACT_EMAIL || 'contact@example.com',
  
  // Obfuscated S3 bucket URLs
  audioFiles: {
    set1: process.env.VITE_AUDIO_SET1 || 'https://example-bucket.s3.amazonaws.com/audio1.wav',
    set2: process.env.VITE_AUDIO_SET2 || 'https://example-bucket.s3.amazonaws.com/audio2.wav',
    set3: process.env.VITE_AUDIO_SET3 || 'https://example-bucket.s3.amazonaws.com/audio3.wav',
  },
  
  // API endpoints
  apiEndpoints: {
    contact: process.env.VITE_CONTACT_API_URL || 'https://api.example.com/contact',
  },
  
  // App metadata
  appName: 'Linturo',
  appVersion: process.env.VITE_APP_VERSION || '1.0.0',
} 