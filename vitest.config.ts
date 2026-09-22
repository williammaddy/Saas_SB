import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    fileParallelism: false,
    maxConcurrency: 1,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
