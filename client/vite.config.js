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
  build: {
    // Use esbuild for CSS minification instead of LightningCSS
    cssMinify: 'esbuild',
  },
});
