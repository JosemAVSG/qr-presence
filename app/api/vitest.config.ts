import { defineConfig } from "vitest/config";

// Tests unitarios: rápidos, sin dependencias externas.
// Los tests de integración (DynamoDB Local) se corren aparte con `npm run test:integration`.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts", "**/node_modules/**", "**/dist/**"],
  },
});