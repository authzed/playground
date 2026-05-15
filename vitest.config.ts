import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
            exclude: ["src/tests/browser/**"],
            server: {
              deps: {
                inline: ["@authzed/spicedb-parser-js", "parsimmon"],
              },
            },
          },
        },
        {
          extends: true,
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
        },
      ],
    },
  }),
);
