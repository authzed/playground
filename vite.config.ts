import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

import { configureServer } from "./dev-api/index";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), tailwindcss(), { name: "dev-share-api", configureServer }],
  build: {
    // This matches Vercel's expectations.
    outDir: "build",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["parsimmon"],
  },
});
