import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "https://api.kadagamnext.com", // Updated to real backend
        changeOrigin: true,
        secure: true, // backend is HTTPS
      },
    },
  },
  optimizeDeps: {
    include: ["aws-amplify/auth", "@aws-amplify/core"],
  },
  build: {
    cssMinify: 'esbuild',
  },
});
