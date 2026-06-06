import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["**/node_modules/**", "**/legacy/**", "**/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` is a build-time RSC guard with no test-env resolution;
      // stub it so modules that import it resolve cleanly (local + CI).
      "server-only": path.resolve(__dirname, "test-stubs/server-only.ts"),
    },
  },
});
