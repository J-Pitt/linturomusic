// Configuration for API endpoints and sensitive data
// Uses environment variables for production builds to obfuscate sensitive information

export const config = {
  // Contact information (obfuscated in production)
  CONTACT_EMAIL: import.meta.env.VITE_CONTACT_EMAIL || 'linturomusic@gmail.com',
  
  // Audio file URLs (obfuscated in production)
  AUDIO_FILES: {
    SHADOWS: import.meta.env.VITE_AUDIO_SHADOWS || 'https://linturomusic.s3.us-west-2.amazonaws.com/shadows.WAV',
    DOWN_AGAIN: import.meta.env.VITE_AUDIO_DOWN_AGAIN || 'https://linturomusic.s3.us-west-2.amazonaws.com/downAgain.WAV',
    ETERNITY: import.meta.env.VITE_AUDIO_ETERNITY || 'https://linturomusic.s3.us-west-2.amazonaws.com/eternity.WAV',
    THE_LIGHT: import.meta.env.VITE_AUDIO_THE_LIGHT || 'https://linturomusic.s3.us-west-2.amazonaws.com/theLight.WAV',
    PROUD: import.meta.env.VITE_AUDIO_PROUD || 'https://linturomusic.s3.us-west-2.amazonaws.com/proud.WAV',
    THE_DEEPEST_HOUSE: import.meta.env.VITE_AUDIO_THE_DEEPEST_HOUSE || 'https://linturomusic.s3.us-west-2.amazonaws.com/theDeepestHouse.WAV',
    RECHARGE: import.meta.env.VITE_AUDIO_RECHARGE || 'https://linturomusic.s3.us-west-2.amazonaws.com/recharge.WAV',
    REFLECTIONS: import.meta.env.VITE_AUDIO_REFLECTIONS || 'https://linturomusic.s3.us-west-2.amazonaws.com/reflections.WAV',
  },

  // Video file URLs (obfuscated in production)
  VIDEO_FILES: {
    VIDEO1: import.meta.env.VITE_VIDEO_FILE_1 || 'https://linturomusic.s3.us-west-2.amazonaws.com/wourldtourradioclip.mp4',
    VIDEO2: import.meta.env.VITE_VIDEO_FILE_2 || 'https://linturomusic.s3.us-west-2.amazonaws.com/worldtourradioclip2.mp4',
    VIDEO3: import.meta.env.VITE_VIDEO_FILE_3 || 'https://linturomusic.s3.us-west-2.amazonaws.com/rooftopclip.mp4',
    VIDEO5: import.meta.env.VITE_VIDEO_FILE_5 || 'https://linturomusic.s3.us-west-2.amazonaws.com/techHouseClip.mp4',
    VIDEO6: import.meta.env.VITE_VIDEO_FILE_6 || 'https://linturomusic.s3.us-west-2.amazonaws.com/patternsVisualMix.mp4',
    ETERNAL_BEGINNING: import.meta.env.VITE_VIDEO_ETERNAL_BEGINNING || 'https://linturomusic.s3.us-west-2.amazonaws.com/eternal1-thsbeginning.mp4',
    ETERNAL_BEGINNING_POSTER: import.meta.env.VITE_VIDEO_ETERNAL_BEGINNING_POSTER || 'https://linturomusic.s3.us-west-2.amazonaws.com/eternal1-thsbeginning.jpg',
    CITY_STREETS: import.meta.env.VITE_VIDEO_CITY_STREETS || 'https://linturomusic.s3.us-west-2.amazonaws.com/citystreets.mp4',
    CITY_STREETS_POSTER: import.meta.env.VITE_VIDEO_CITY_STREETS_POSTER || 'https://linturomusic.s3.us-west-2.amazonaws.com/citystreets.jpg',
  },
  
  // App metadata
  APP_NAME: 'Linturo',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
};