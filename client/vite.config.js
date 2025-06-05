import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "https://kadagam-next.onrender.com", // Your backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: ["aws-amplify/auth", "@aws-amplify/core"],
  },

  // Force Vite to use esbuild for all CSS transformations
  css: {
    transformer: 'esbuild'
  },

  build: {
    // And also for CSS minification
    cssMinify: 'esbuild',
  },
});
