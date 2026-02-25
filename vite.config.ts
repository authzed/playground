import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { playwright } from '@vitest/browser-playwright'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), tailwindcss()],
  build: {
    // This matches Vercel's expectations.
    outDir: "build",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          // Exclude browser-mode tests from the regular unit test runner
          exclude: ["src/tests/browser/**", "node_modules/**"],
        }
      },
      {
        extends: true,
        test: {
          name: "browser",
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            screenshotFailures: true,
          },
          include: ["src/tests/browser/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/tests/browser/setup.ts"],
          testTimeout: 60000,
          hookTimeout: 60000,
        }
      }
    ]
  }
});
