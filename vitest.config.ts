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
      // @authzed/spicedb-parser-js ships ESM that re-exports named bindings from
      // the CJS `parsimmon` package; inline it so Vitest transforms it and the
      // named imports resolve under Node.
      server: { deps: { inline: ["@authzed/spicedb-parser-js"] } },
    },
  }),
);
