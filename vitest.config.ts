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
    // Exclude browser-mode tests from the regular unit test runner
    exclude: ["src/tests/browser/**", "node_modules/**"],
  },
});
