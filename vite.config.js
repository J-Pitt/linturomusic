import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { obfuscationPlugin } from './vite-obfuscation-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), obfuscationPlugin()],
  build: {
    // Enable minification
    minify: 'terser',
    // Terser options for better minification and obfuscation
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      },
      mangle: {
        // Mangle variable names for obfuscation
        toplevel: true,
        reserved: ['React', 'ReactDOM', 'framer-motion'], // Don't mangle these
      },
      format: {
        comments: false, // Remove comments
      },
    },
    // Bundle optimization
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion'],
          icons: ['@heroicons/react'],
        },
        // Obfuscate chunk names
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
      },
    },
    // Enable source maps for debugging (optional - remove for production)
    sourcemap: false,
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'framer-motion', '@heroicons/react'],
    },
  },
  // Environment variable handling
  define: {
    // Replace sensitive strings with environment variables
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})
