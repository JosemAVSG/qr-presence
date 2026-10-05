import { defineConfig } from "vitest/config";

// Tests de integración: requieren DynamoDB Local en localhost:8000.
export default defineConfig({
  test: {
    include: ["tests/**/*.integration.test.ts"],
  },
});