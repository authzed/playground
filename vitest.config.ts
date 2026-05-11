import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from './vite.config'


export default defineConfig({
  test: {
    projects: [
      mergeConfig(viteConfig, {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          exclude: ["src/tests/browser/**"],
        },
      }),
      mergeConfig(viteConfig, {
        test: {
          name: "browser",
          include: ["src/tests/browser/**/*.test.{ts,tsx}"],
          setupFiles: ["src/tests/browser/setup.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      }),
    ],
  },
});
