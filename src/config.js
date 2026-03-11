// Configuration for API endpoints and sensitive data
// Uses environment variables for production builds to obfuscate sensitive information

export const config = {
  // Contact information (obfuscated in production)
  CONTACT_EMAIL: import.meta.env.VITE_CONTACT_EMAIL || 'linturomusic@gmail.com',
  
  // Audio file URLs (obfuscated in production)
  AUDIO_FILES: {
    SET1: import.meta.env.VITE_AUDIO_SET1 || 'https://linturomusic.s3.us-west-2.amazonaws.com/jan26house.WAV',
    SET2: import.meta.env.VITE_AUDIO_SET2 || 'https://linturomusic.s3.us-west-2.amazonaws.com/newnew.WAV',
    SET3: import.meta.env.VITE_AUDIO_SET3 || 'https://linturomusic.s3.us-west-2.amazonaws.com/tech_house.WAV',
  },
  
  // Video file URLs (obfuscated in production)
  VIDEO_FILES: {
    VIDEO1: import.meta.env.VITE_VIDEO_FILE_1 || 'https://linturomusic.s3.us-west-2.amazonaws.com/wourldtourradioclip.mp4',
    VIDEO2: import.meta.env.VITE_VIDEO_FILE_2 || 'https://linturomusic.s3.us-west-2.amazonaws.com/worldtourradioclip2.mp4',
    VIDEO3: import.meta.env.VITE_VIDEO_FILE_3 || 'https://linturomusic.s3.us-west-2.amazonaws.com/rooftopclip.mp4',
    VIDEO5: import.meta.env.VITE_VIDEO_FILE_5 || 'https://linturomusic.s3.us-west-2.amazonaws.com/techHouseClip.mp4',
  },
  
  // App metadata
  APP_NAME: 'Linturo',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
};