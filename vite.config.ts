import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";

import { configureServer } from "./dev-api/index";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env files into process.env so the dev-api middleware (server-side)
  // can read non-VITE_ vars like ANTHROPIC_API_KEY. Vite only exposes VITE_*
  // vars to the browser via import.meta.env, not to this Node process.
  // Existing shell env takes precedence over .env file values.
  const fileEnv = loadEnv(mode, process.cwd(), "");
  for (const key of Object.keys(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = fileEnv[key];
  }

  return {
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
  };
});
