import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";

import { configureServer } from "./dev-api/index";

// Load .env files into process.env so the dev-api middleware (server-side) can
// read non-VITE_ vars like OPENROUTER_API_KEY. Vite only exposes VITE_* vars to
// the browser via import.meta.env, not to this Node process. Existing shell env
// takes precedence over .env file values. Done at module scope (not in a config
// callback) so this file stays an OBJECT export that vitest's mergeConfig can
// consume — a function export breaks vitest.config.ts.
const fileEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
for (const key of Object.keys(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = fileEnv[key];
}

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
});
