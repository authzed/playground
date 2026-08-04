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
            include: ["src/**/*.test.ts", "src/**/*.test.tsx", "api/**/*.test.ts"],
            exclude: ["src/tests/browser/**"],
            server: {
              deps: {
                // @authzed/spicedb-parser-js pulls in parsimmon, a CJS module whose named
                // exports Node's ESM loader can't see. Inlining lets Vite transform it, the
                // same way it does for the browser project.
                inline: ["@authzed/spicedb-parser-js"],
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
