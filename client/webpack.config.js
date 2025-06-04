import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src", // Optional alias for cleaner imports
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"], // Ensures JSX & TSX files resolve
  },
  esbuild: {
    loader: "tsx", // Ensures TypeScript & JSX are properly handled
    jsxInject: `import React from 'react'`, // Injects React automatically in JSX files
  },
});
