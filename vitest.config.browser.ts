import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react(), svgr(), tailwindcss()] as any,
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      name: "chromium",
      screenshotFailures: true,
    },
    include: ["src/tests/browser/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/tests/browser/setup.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
