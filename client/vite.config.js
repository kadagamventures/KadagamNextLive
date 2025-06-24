// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  esbuild: {
    loader: "tsx",
    jsxInject: `import React from 'react'`,
  },
  server: {
    proxy: {
      "/api": {
        target: "https://api.kadagamnext.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  optimizeDeps: {
    include: ["aws-amplify/auth", "@aws-amplify/core"],
  },
  build: {
    cssMinify: "esbuild",
  },
});
