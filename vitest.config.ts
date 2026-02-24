import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    // Exclude browser-mode tests from the regular unit test runner
    exclude: ["src/tests/browser/**", "node_modules/**"],
  },
});
