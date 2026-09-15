// Standalone vitest config — deliberately NOT reusing vite.config.ts, which loads the
// TanStack Start / nitro / Lovable plugins that have no business in a unit-test run.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
