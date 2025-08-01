// Vite plugin for obfuscating sensitive strings
export function obfuscationPlugin() {
  const obfuscationMap = {
    '/Users/jpittman/': '/home/user/',
    'jpittman': 'user',
    // Keep linturo and linturomusic as DJ alias - only obfuscate file paths
    '/Users/jpittman/linturomusic/': '/home/user/music-app/',
    'linturomusic/src/': 'music-app/src/',
    'linturomusic/dist/': 'music-app/dist/'
  };

  return {
    name: 'obfuscation-plugin',
    
    // Transform code during build
    transform(code, id) {
      if (id.includes('node_modules')) return null;
      
      let transformed = code;
      Object.entries(obfuscationMap).forEach(([original, replacement]) => {
        transformed = transformed.replace(new RegExp(original, 'g'), replacement);
      });
      
      return transformed !== code ? transformed : null;
    },
    
    // Handle CSS files
    load(id) {
      if (id.includes('node_modules')) return null;
      
      // This will be called for CSS files and other assets
      return null;
    },
    
    // Generate bundle - enhanced to handle all file types
    generateBundle(options, bundle) {
      Object.keys(bundle).forEach(fileName => {
        const file = bundle[fileName];
        
        // Handle JavaScript chunks
        if (file.type === 'chunk' && file.code) {
          let transformed = file.code;
          Object.entries(obfuscationMap).forEach(([original, replacement]) => {
            transformed = transformed.replace(new RegExp(original, 'g'), replacement);
          });
          file.code = transformed;
        }
        
        // Handle CSS assets
        if (file.type === 'asset' && file.source) {
          let transformed = file.source;
          Object.entries(obfuscationMap).forEach(([original, replacement]) => {
            transformed = transformed.replace(new RegExp(original, 'g'), replacement);
          });
          file.source = transformed;
        }
      });
    },
    
    // Handle Vite's internal CSS processing
    renderChunk(code, chunk, options) {
      let transformed = code;
      Object.entries(obfuscationMap).forEach(([original, replacement]) => {
        transformed = transformed.replace(new RegExp(original, 'g'), replacement);
      });
      return transformed !== code ? transformed : null;
    },
    
    // Handle CSS modules and style processing
    transformIndexHtml(html) {
      let transformed = html;
      Object.entries(obfuscationMap).forEach(([original, replacement]) => {
        transformed = transformed.replace(new RegExp(original, 'g'), replacement);
      });
      return transformed !== html ? transformed : null;
    }
  };
} 