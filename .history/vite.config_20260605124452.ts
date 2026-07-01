import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Visualize bundle sizes
    visualizer(),
    // Compress assets for production
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Output to dist directory (Render expects this)
    outDir: 'dist',
    // Asset handling for CDN optimization
    assetsDir: 'assets',
    // Enable hashing for cache busting
    assetsInlineLimit: 4096, // 4kb
    // Rollup options for better chunking
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['lucide-react', 'sonner', 'date-fns'],
        },
      },
    },
    // Minify CSS and JS
    minify: 'esbuild',
    // Generate sourcemaps for debugging (optional in production)
    sourcemap: false,
    // Brotli compression
    brotliSize: true,
    // CommonJS options
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  // Server options for development
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
})
