import { mergeConfig, defineConfig } from "vitest/config";
import { playwright } from '@vitest/browser-playwright'
import config from './vite.config'

export default mergeConfig(config, defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          // Exclude browser-mode tests from the regular unit test runner
          exclude: ["src/tests/browser/**", "node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            screenshotFailures: true,
          },
          include: ["src/tests/browser/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/tests/browser/setup.ts"],
        }
      }
    ]
  },
}));
