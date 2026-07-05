import { defineConfig } from "vitest/config";

// Separate config for the live decision-quality eval suite (Phase 1 design,
// Decision 8). Deliberately excluded from vitest.config.ts's include glob so
// `npm test` / CI never picks these up and never spends real API calls or
// depends on ANTHROPIC_API_KEY. Run explicitly via `npm run test:evals`.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/evals/**/*.evalsuite.ts"],
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
