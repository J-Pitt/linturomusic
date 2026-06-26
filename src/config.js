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
    SET4: import.meta.env.VITE_AUDIO_SET4 || 'https://linturomusic.s3.us-west-2.amazonaws.com/deepHaus.WAV',
    SET5: import.meta.env.VITE_AUDIO_SET5 || 'https://linturomusic.s3.us-west-2.amazonaws.com/minimalHaus.WAV',
    SET6: import.meta.env.VITE_AUDIO_SET6 || 'https://linturomusic.s3.us-west-2.amazonaws.com/summerRays.WAV',
    SET7: import.meta.env.VITE_AUDIO_SET7 || 'https://linturomusic.s3.us-west-2.amazonaws.com/springShowers.WAV',
    COLORS: import.meta.env.VITE_AUDIO_COLORS || 'https://linturomusic.s3.us-west-2.amazonaws.com/colors.WAV',
    TAKING_OFF: import.meta.env.VITE_AUDIO_TAKING_OFF || 'https://linturomusic.s3.us-west-2.amazonaws.com/takingOff.WAV',
    REFLECTIONS: import.meta.env.VITE_AUDIO_REFLECTIONS || 'https://linturomusic.s3.us-west-2.amazonaws.com/reflections.WAV',
    RECHARGE: import.meta.env.VITE_AUDIO_RECHARGE || 'https://linturomusic.s3.us-west-2.amazonaws.com/recharge.WAV',
    ECHOES: import.meta.env.VITE_AUDIO_ECHOES || 'https://linturomusic.s3.us-west-2.amazonaws.com/echoes.WAV',
    SUMMER_HEAT: import.meta.env.VITE_AUDIO_SUMMER_HEAT || 'https://linturomusic.s3.us-west-2.amazonaws.com/summerHeat.WAV',
    LETS_GET_DOWN: import.meta.env.VITE_AUDIO_LETS_GET_DOWN || 'https://linturomusic.s3.us-west-2.amazonaws.com/letsGetDown.WAV',
    INFINITY: import.meta.env.VITE_AUDIO_INFINITY || 'https://linturomusic.s3.us-west-2.amazonaws.com/infinity.WAV',
  },
  
  // Featured homepage visual (loops while featured mix plays)
  FEATURED: {
    MIX_ID: 'echoes',
    MIX_TITLE: 'Echoes',
    MIX_URL: import.meta.env.VITE_AUDIO_ECHOES || 'https://linturomusic.s3.us-west-2.amazonaws.com/echoes.WAV',
    VIDEO_URL: import.meta.env.VITE_FEATURED_VIDEO || 'https://linturomusic.s3.us-west-2.amazonaws.com/echoesNatureLoop.mp4',
  },

  // Video file URLs (obfuscated in production)
  VIDEO_FILES: {
    VIDEO1: import.meta.env.VITE_VIDEO_FILE_1 || 'https://linturomusic.s3.us-west-2.amazonaws.com/wourldtourradioclip.mp4',
    VIDEO2: import.meta.env.VITE_VIDEO_FILE_2 || 'https://linturomusic.s3.us-west-2.amazonaws.com/worldtourradioclip2.mp4',
    VIDEO3: import.meta.env.VITE_VIDEO_FILE_3 || 'https://linturomusic.s3.us-west-2.amazonaws.com/rooftopclip.mp4',
    VIDEO5: import.meta.env.VITE_VIDEO_FILE_5 || 'https://linturomusic.s3.us-west-2.amazonaws.com/techHouseClip.mp4',
    VIDEO6: import.meta.env.VITE_VIDEO_FILE_6 || 'https://linturomusic.s3.us-west-2.amazonaws.com/patternsVisualMix.mp4',
  },
  
  // App metadata
  APP_NAME: 'Linturo',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
};