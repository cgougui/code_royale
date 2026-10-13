import { defineConfig } from "vitest/config";

// Package and pure app tests run without a browser.
export default defineConfig({
  test: {
    include: [
      "packages/*/test/**/*.test.ts",
      "app/test/**/*.test.ts",
      "tools/test/**/*.test.mjs",
    ],
    environment: "node",
  },
});
