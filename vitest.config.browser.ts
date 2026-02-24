import path from "path";
import { playwright } from '@vitest/browser-playwright'

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
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
  },
});
