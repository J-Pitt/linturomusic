// Configuration for API endpoints and sensitive data
// Uses environment variables for production builds to obfuscate sensitive information

export const config = {
  // Contact information (obfuscated in production)
  CONTACT_EMAIL: import.meta.env.VITE_CONTACT_EMAIL || 'linturomusic@gmail.com',
  
  // Audio file URLs (obfuscated in production)
  AUDIO_FILES: {
    SET1: import.meta.env.VITE_AUDIO_SET1 || 'https://linturomusic.s3.us-west-2.amazonaws.com/72825.WAV',
    SET2: import.meta.env.VITE_AUDIO_SET2 || 'https://linturomusic.s3.us-west-2.amazonaws.com/summerSessions.WAV',
    SET3: import.meta.env.VITE_AUDIO_SET3 || 'https://linturomusic.s3.us-west-2.amazonaws.com/521_house.wav',
  },
  
  // App metadata
  APP_NAME: 'Linturo',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
};